from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import Annotated

from database import engine
from models import User, SystemLog
from dependencies import get_current_user, get_session, log_action
from auth import get_password_hash
from pydantic import BaseModel

# Роутер администратора. Изолирует все функции управления системой в отдельном пространстве имен.
# Префикс /api/admin гарантирует, что эти маршруты не пересекутся с клиентскими.
router = APIRouter(prefix="/api/admin", tags=["Admin"])

# Зависимость (Dependency) для жесткой проверки роли пользователя.
# Архитектурно она внедряется во все эндпоинты этого файла, образуя
# "охранник маршрута" (Route Guard). Любой не-админ получит ошибку 403.
def get_admin(current_user: Annotated[User, Depends(get_current_user)]):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Доступ только для администраторов")
    return current_user

# Получение списка всех пользователей системы.
# Для безопасности пароли удаляются из ответа перед отправкой клиенту,
# так как передача хэшей может стать вектором атаки (offline cracking).
@router.get("/users")
def get_all_users(admin: Annotated[User, Depends(get_admin)], session: Session = Depends(get_session)):
    users = session.exec(select(User)).all()
    # Фильтрация конфиденциальных данных. Формирование DTO (Data Transfer Object) вручную.
    safe_users = []
    for u in users:
        safe_users.append({
            "id": u.id,
            "username": u.username,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role,
            "is_blocked": u.is_blocked,
            "created_at": u.created_at,
            "last_seen": u.last_seen
        })
    return safe_users

# Модель запроса для операции изменения статуса блокировки (legacy маршрут, дублирует ban_user).
class BlockUserReq(BaseModel):
    userId: int
    blockAction: int

@router.post("/block_user")
def block_user(data: BlockUserReq, admin: Annotated[User, Depends(get_admin)], session: Session = Depends(get_session)):
    user = session.get(User, data.userId)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
        
    user.is_blocked = data.blockAction
    session.add(user)
    
    # Системное логирование изменения статуса пользователя для аудита
    action = "USER_BLOCKED" if data.blockAction == 1 else "USER_UNBLOCKED"
    log_action(session, action, f"Пользователь {user.username} (ID: {user.id}) был {'заблокирован' if data.blockAction == 1 else 'разблокирован'}", admin)
    
    session.commit()
    return {"success": True}

# Получение последних 100 записей системного аудита (из базы данных).
# Запрос сортируется по убыванию времени создания, чтобы отображать самые свежие события.
@router.get("/logs")
def get_system_logs(admin: Annotated[User, Depends(get_admin)], session: Session = Depends(get_session)):
    statement = select(SystemLog).order_by(SystemLog.created_at.desc()).limit(100)
    return session.exec(statement).all()

import os

# Прямое чтение файла server.log для админской панели.
# Это позволяет администратору анализировать ошибки, падения FastAPI и трассировки стека
# непосредственно через графический интерфейс, без необходимости подключаться к серверу по SSH.
@router.get("/server_logs")
def get_server_logs(admin: Annotated[User, Depends(get_admin)]):
    log_file = "server.log"
    if not os.path.exists(log_file):
        return {"logs": "Файл логов не найден. Ожидание записи..."}
    
    with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
        return {"logs": "".join(lines[-500:])}

# Схема для ручного создания пользователя администратором (включая преподавателей).
class CreateUserReq(BaseModel):
    username: str
    password: str
    full_name: str
    email: str
    role: str

# Эндпоинт ручного создания учетной записи.
# Важная бизнес-логика: проверка уникальности логина перед вставкой,
# чтобы избежать исключений ограничения уникальности (UniqueConstraint) базы данных.
@router.post("/create_user")
def create_user(data: CreateUserReq, admin: Annotated[User, Depends(get_admin)], session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.username == data.username)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Логин уже занят")
        
    hashed_password = get_password_hash(data.password)
    user = User(
        username=data.username,
        password=hashed_password,
        full_name=data.full_name,
        email=data.email,
        role=data.role
    )
    session.add(user)
    session.commit()
    # Запись события в системный лог
    log_action(session, "USER_CREATED", f"Создан пользователь {user.username} с ролью {user.role}", admin)
    return {"success": True}

# Схема для операции бана (более современная версия block_user).
class BanUserReq(BaseModel):
    userId: int
    is_blocked: int

# Блокировка или разблокировка доступа в систему.
# Содержит защитный механизм (self-ban prevention), не позволяющий администратору
# случайно заблокировать собственный аккаунт.
@router.post("/ban_user")
def ban_user(data: BanUserReq, admin: Annotated[User, Depends(get_admin)], session: Session = Depends(get_session)):
    user = session.get(User, data.userId)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
        
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Нельзя заблокировать самого себя")
        
    user.is_blocked = data.is_blocked
    session.add(user)
    session.commit()
    
    action = "USER_BANNED" if data.is_blocked else "USER_UNBANNED"
    action_text = "Заблокирован" if data.is_blocked else "Разблокирован"
    log_action(session, action, f"Администратор @{admin.username} {action_text.lower()} пользователя @{user.username}", admin)
    
    return {"success": True}

# Схема редактирования профиля пользователя (используется в модальном окне веб-панели).
class EditUserReq(BaseModel):
    userId: int
    username: str
    full_name: str
    email: str
    role: str
    password: str | None = None

# Изменение данных пользователя администратором.
# Включает сложную проверку: если администратор меняет логин (username),
# необходимо убедиться, что новый логин не принадлежит другому пользователю.
@router.post("/edit_user")
def edit_user(data: EditUserReq, admin: Annotated[User, Depends(get_admin)], session: Session = Depends(get_session)):
    user = session.get(User, data.userId)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
        
    if data.username != user.username:
        existing = session.exec(select(User).where(User.username == data.username)).first()
        if existing:
            raise HTTPException(status_code=400, detail="Логин уже занят")
            
    user.username = data.username
    user.full_name = data.full_name
    user.email = data.email
    user.role = data.role
    
    # Смена пароля происходит только в том случае, если поле password передано (не None).
    # Иначе старый хэш пароля сохраняется в базе без изменений.
    if data.password:
        user.password = get_password_hash(data.password)
        
    session.add(user)
    session.commit()
    
    log_action(session, "USER_EDITED", f"Администратор @{admin.username} изменил данные пользователя @{user.username}", admin)
    
    return {"success": True}

class DeleteUserReq(BaseModel):
    userId: int

# Эндпоинт жесткого удаления (Hard Delete) пользователя из базы данных.
# Также включает защиту от удаления собственного профиля.
@router.post("/delete_user")
def delete_user(data: DeleteUserReq, admin: Annotated[User, Depends(get_admin)], session: Session = Depends(get_session)):
    user = session.get(User, data.userId)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
        
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Нельзя удалить самого себя")
        
    session.delete(user)
    log_action(session, "USER_DELETED", f"Удален пользователь {user.username} (ID: {user.id})", admin)
    session.commit()
    return {"success": True}
