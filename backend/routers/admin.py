from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import Annotated

from database import engine
from models import User, SystemLog
from dependencies import get_current_user, get_session, log_action
from auth import get_password_hash
from pydantic import BaseModel

router = APIRouter(prefix="/api/admin", tags=["Admin"])

def get_admin(current_user: Annotated[User, Depends(get_current_user)]):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Доступ только для администраторов")
    return current_user

@router.get("/users")
def get_all_users(admin: Annotated[User, Depends(get_admin)], session: Session = Depends(get_session)):
    users = session.exec(select(User)).all()
    # Remove passwords from response for security
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
    
    action = "USER_BLOCKED" if data.blockAction == 1 else "USER_UNBLOCKED"
    log_action(session, action, f"Пользователь {user.username} (ID: {user.id}) был {'заблокирован' if data.blockAction == 1 else 'разблокирован'}", admin)
    
    session.commit()
    return {"success": True}

@router.get("/logs")
def get_system_logs(admin: Annotated[User, Depends(get_admin)], session: Session = Depends(get_session)):
    statement = select(SystemLog).order_by(SystemLog.created_at.desc()).limit(100)
    return session.exec(statement).all()

import os

@router.get("/server_logs")
def get_server_logs(admin: Annotated[User, Depends(get_admin)]):
    log_file = "server.log"
    if not os.path.exists(log_file):
        return {"logs": "Файл логов не найден. Ожидание записи..."}
    
    with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
        return {"logs": "".join(lines[-500:])}

class CreateUserReq(BaseModel):
    username: str
    password: str
    full_name: str
    email: str
    role: str

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
    log_action(session, "USER_CREATED", f"Создан пользователь {user.username} с ролью {user.role}", admin)
    return {"success": True}

class BanUserReq(BaseModel):
    userId: int
    is_blocked: int

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

class EditUserReq(BaseModel):
    userId: int
    username: str
    full_name: str
    email: str
    role: str
    password: str | None = None

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
    
    if data.password:
        user.password = get_password_hash(data.password)
        
    session.add(user)
    session.commit()
    
    log_action(session, "USER_EDITED", f"Администратор @{admin.username} изменил данные пользователя @{user.username}", admin)
    
    return {"success": True}

class DeleteUserReq(BaseModel):
    userId: int

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
