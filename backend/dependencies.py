from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select
from typing import Annotated
import jwt

from database import engine
from models import User, SystemLog, moscow_now
from auth import SECRET_KEY, ALGORITHM
from datetime import datetime, timedelta

# Генератор сессий базы данных для внедрения зависимостей (Dependency Injection).
# Обеспечивает паттерн "Session per request", гарантируя, что каждая транзакция
# имеет изолированное подключение к БД, которое корректно закрывается после ответа.
def get_session():
    with Session(engine) as session:
        yield session

# Схема OAuth2 для извлечения Bearer токена из заголовков запроса (Authorization: Bearer <token>).
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login_form")

# Ключевая функция проверки авторизации для защиты эндпоинтов.
# Декодирует JWT, находит пользователя в базе данных и проверяет статус блокировки.
# Если токен невалиден или просрочен, возвращает 401 Unauthorized.
def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], session: Session = Depends(get_session)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Валидация подписи токена с использованием секретного ключа
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("username")
        if username is None:
            raise credentials_exception
    except jwt.InvalidTokenError:
        raise credentials_exception
        
    # Извлечение актуальных данных пользователя из базы для проверки блокировки (is_blocked)
    user = session.exec(select(User).where(User.username == username)).first()
    if user is None:
        raise credentials_exception
    if user.is_blocked:
        raise HTTPException(status_code=403, detail="⛔ Ваш аккаунт заблокирован администратором.")
        
    # Механизм обновления статуса активности (online).
    # Ограничение в 10 секунд (throttling) предотвращает излишнюю нагрузку на БД
    # при множественных конкурентных запросах от одного клиента.
    now = moscow_now()
    if user.last_seen is None or now - user.last_seen > timedelta(seconds=10):
        user.last_seen = now
        session.add(user)
        session.commit()
        
    return user

# Утилита для системного аудита (асинхронное/синхронное логирование).
# Фиксирует критические бизнес-операции (вход, создание курса, удаление данных) 
# для последующего анализа безопасности и мониторинга системы.
def log_action(session: Session, action: str, details: str, user: User = None, ip: str = None):
    log = SystemLog(
        user_id=user.id if user else None,
        username=user.username if user else "Guest",
        action=action,
        details=details,
        ip_address=ip
    )
    session.add(log)
    session.commit()
