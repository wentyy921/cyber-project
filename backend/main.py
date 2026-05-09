import sys
import os
from fastapi import FastAPI, Depends, HTTPException, Request, Response
from sqlmodel import Session, select, func
from typing import Annotated
from datetime import datetime

# Capture all stdout and stderr to server.log
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

sys.stdout = DualLogger("server.log")
sys.stderr = sys.stdout

from database import create_db_and_tables
from models import User, SystemLog, Course, CourseAccess, Question, Result, moscow_now
from schemas import UserLogin, UserRegister, UserResponse
from auth import verify_password, get_password_hash, create_access_token
from dependencies import get_current_user, get_session, log_action

import models  # Ensure models are loaded before create_db_and_tables

from routers import student, teacher, admin, knowledge
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Cyber Trainer API", description="API для учебной платформы")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development allow all, in prod should be restricted
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(student.router)
app.include_router(teacher.router)
app.include_router(admin.router)
app.include_router(knowledge.router)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    import os
    os.makedirs("uploads", exist_ok=True)

from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os

DIST_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

# Mount assets specifically to avoid matching API routes
if os.path.exists(os.path.join(DIST_DIR, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")

import os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# Also serve vite.svg if it exists
@app.get("/vite.svg")
def serve_vite_logo():
    return FileResponse(os.path.join(DIST_DIR, "vite.svg"))

from sqlmodel import Session, select, func

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

@app.get("/api/check_login")
def check_login(username: str, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(func.lower(User.username) == username.lower())).first()
    return {"available": user is None}

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

    # Update last_seen
    user.last_seen = moscow_now()
    session.add(user)
    
    log_action(session, "LOGIN_SUCCESS", "Успешный вход", user)
    session.commit()

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

@app.get("/api/users/me", response_model=UserResponse)
def read_users_me(current_user: Annotated[User, Depends(get_current_user)]):
    return current_user

# Catch-all route to serve the React SPA for any non-API routes
@app.get("/{full_path:path}")
def catch_all(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not Found")
    
    file_path = os.path.join(DIST_DIR, full_path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
        
    response = FileResponse(os.path.join(DIST_DIR, "index.html"))
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response
