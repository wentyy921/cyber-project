import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional

# Настройки безопасности и криптографии.
# В реальной продакшен-среде SECRET_KEY должен загружаться из переменных окружения.
# ALGORITHM HS256 (HMAC с SHA-256) является стандартом для подписи JWT-токенов.
SECRET_KEY = "super-secret-key-for-cyber-trainer-please-change-in-prod"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # Срок жизни токена установлен в 24 часа для баланса безопасности и удобства пользователя

# Функция верификации пароля при входе пользователя (login).
# Использует алгоритм bcrypt для сравнения сырого пароля с хэшем из базы данных.
# Возвращает True, если пароли совпадают, и False в противном случае.
def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except ValueError:
        return False

# Функция хэширования нового пароля (при регистрации или сбросе).
# Bcrypt автоматически генерирует уникальную 'соль' (salt) для каждого пароля,
# что защищает базу данных от атак с использованием "радужных таблиц".
def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

# Функция генерации JWT-токена доступа (Access Token).
# Токен включает в себя 'payload' (полезную нагрузку) и время истечения 'exp'.
# Благодаря 'exp', токен автоматически станет недействительным по истечении заданного времени,
# что является ключевым механизмом защиты в stateless (без сохранения состояния) архитектуре.
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

