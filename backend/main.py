import sys
import os
from fastapi import FastAPI, Depends, HTTPException, Request, Response
from sqlmodel import Session, select, func
from typing import Annotated
from datetime import datetime

# Класс DualLogger предназначен для дублирования потоков вывода (stdout/stderr).
# Архитектурно это решает проблему отслеживания ошибок и системных логов 
# одновременно в консоли разработчика и в персистентном файле server.log.
class DualLogger:
    def __init__(self, filename):
        self.file = open(filename, "a", encoding="utf-8")
        self.stdout = sys.stdout

    def write(self, data):
        self.file.write(data)
        self.file.flush()
        self.stdout.write(data)

    def flush(self):
        self.file.flush()
        self.stdout.flush()

# Перенаправление стандартных потоков вывода на наш логгер.
sys.stdout = DualLogger("server.log")
sys.stderr = sys.stdout

from database import create_db_and_tables
from models import User, SystemLog, Course, CourseAccess, Question, Result, moscow_now
from schemas import UserLogin, UserRegister, UserResponse
from auth import verify_password, get_password_hash, create_access_token
from dependencies import get_current_user, get_session, log_action

import models  # Убеждаемся, что модели загружены до вызова create_db_and_tables

from routers import student, teacher, admin, knowledge
from fastapi.middleware.cors import CORSMiddleware

# Инициализация основного инстанса FastAPI.
# Это точка входа бэкенда, которая управляет жизненным циклом всего API.
app = FastAPI(title="Cyber Trainer API", description="API для учебной платформы")

# Настройка CORS (Cross-Origin Resource Sharing).
# Критически важный middleware для веб-приложений (React SPA), 
# позволяющий браузеру выполнять запросы к нашему API с других доменов/портов.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # В продакшене следует указать конкретные домены для безопасности
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение разделенных роутеров (модулей API).
# Это обеспечивает модульность архитектуры, разделяя зоны ответственности
# между админской, преподавательской и студенческой бизнес-логикой.
app.include_router(student.router)
app.include_router(teacher.router)
app.include_router(admin.router)
app.include_router(knowledge.router)

# Хук жизненного цикла 'startup'. Срабатывает при запуске сервера.
# Здесь мы синхронизируем ORM с базой данных и готовим структуру директорий для файлов.
@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    import os
    os.makedirs("uploads", exist_ok=True)

from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os

DIST_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

# Монтирование статических файлов веб-приложения (Vite build).
# Папка assets монтируется явно, чтобы избежать конфликтов с API роутами.
if os.path.exists(os.path.join(DIST_DIR, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")

import os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Монтирование директории загрузок (аватары, обложки курсов).
# Открывает доступ к медиа-файлам по прямому URL, например /uploads/avatar.png
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# Обработчик отдачи SVG-иконки для Vite (требуется PWA-манифестам и браузерам).
@app.get("/vite.svg")
def serve_vite_logo():
    return FileResponse(os.path.join(DIST_DIR, "vite.svg"))

from sqlmodel import Session, select, func

# Эндпоинт регистрации новых студентов.
# Бизнес-логика проверяет уникальность логина с помощью SQL-функции lower(),
# хэширует пароль и фиксирует успешную регистрацию в системном аудите.
@app.post("/api/register")
def register_user(user_data: UserRegister, session: Session = Depends(get_session)):
    existing_user = session.exec(select(User).where(func.lower(User.username) == user_data.username.lower())).first()
    if existing_user:
        log_action(session, "REGISTER_FAIL", f"Попытка занять логин: {user_data.username}")
        raise HTTPException(status_code=409, detail="Этот логин уже занят. Выберите другой.")
        
    hashed_pwd = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        password=hashed_pwd,
        full_name=user_data.fullName,
        email=user_data.email,
        role="student"
    )
    session.add(new_user)
    session.commit()
    log_action(session, "REGISTER_NEW", f"Новый пользователь: {new_user.username}")
    return {"success": True}

# Проверка доступности логина в реальном времени (используется фронтендом при вводе в форму).
@app.get("/api/check_login")
def check_login(username: str, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(func.lower(User.username) == username.lower())).first()
    return {"available": user is None}

# Эндпоинт авторизации (Login).
# Архитектурно проверяет сразу несколько слоев: существование аккаунта,
# совпадение хэшей паролей, статус блокировки (is_blocked).
@app.post("/api/login")
def login_user(user_data: UserLogin, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.username == user_data.username)).first()
    if not user:
        log_action(session, "ACCESS_DENIED", f"Попытка входа под несуществующим логином: {user_data.username}")
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
        
    if not verify_password(user_data.password, user.password):
        log_action(session, "LOGIN_FAILED", f"Неверный пароль для: {user_data.username}", user)
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
        
    if user.is_blocked:
        log_action(session, "LOGIN_BLOCKED", f"Вход забаненного: {user.username}")
        raise HTTPException(status_code=403, detail="⛔ Ваш аккаунт заблокирован администратором.")

    # Обновляем таймстемп активности для аналитики онлайна
    user.last_seen = moscow_now()
    session.add(user)
    
    log_action(session, "LOGIN_SUCCESS", "Успешный вход", user)
    session.commit()

    # Генерация JWT, который клиент будет использовать для всех последующих запросов
    access_token = create_access_token(data={"username": user.username, "role": user.role})
    
    return {
        "success": True,
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "fullName": user.full_name,
            "email": user.email,
            "avatar": user.avatar
        },
        "token": access_token
    }

# Получение данных текущего авторизованного пользователя через токен.
@app.get("/api/users/me", response_model=UserResponse)
def read_users_me(current_user: Annotated[User, Depends(get_current_user)]):
    return current_user

# Catch-all маршрут (Fallback Route).
# Необходим для корректной работы React Router (SPA). Если клиент запрашивает
# любую страницу, кроме API-маршрутов, сервер отдает index.html, делегируя роутинг фронтенду.
@app.get("/{full_path:path}")
def catch_all(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not Found")
    
    file_path = os.path.join(DIST_DIR, full_path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
        
    response = FileResponse(os.path.join(DIST_DIR, "index.html"))
    # Заголовки для предотвращения жесткого кэширования HTML-оболочки браузером
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

