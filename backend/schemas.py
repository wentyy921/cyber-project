from pydantic import BaseModel, Field
from typing import Optional

# Pydantic-модели (схемы) используются для валидации входящих данных (Request)
# и формирования структуры исходящих ответов (Response). Это отделяет логику
# работы с HTTP-запросами от бизнес-логики работы с базой данных (SQLModel).

# Схема для входа (логина) в систему.
# Ожидает строгие типы данных: логин и пароль в виде строк.
class UserLogin(BaseModel):
    username: str
    password: str

# Схема для регистрации нового пользователя.
# Поля fullName и email опциональны, так как они могут быть заполнены
# позже через личный профиль (ProfileScreen).
class UserRegister(BaseModel):
    username: str
    password: str
    fullName: Optional[str] = ""
    email: Optional[str] = ""

# Схема ответа при успешной аутентификации.
# Содержит сам токен и его тип (Bearer), что является стандартом OAuth2.
class Token(BaseModel):
    access_token: str
    token_type: str

# Схема полезной нагрузки (payload), зашитой внутрь JWT.
class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

# Схема ответа с данными пользователя.
# Архитектурно важна: она скрывает пароль и другие чувствительные данные,
# передавая клиенту только то, что необходимо для UI.
class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    # validation_alias: Pydantic будет мапить поле 'full_name' из базы в 'fullName' для фронтенда (camelCase)
    fullName: str = Field(validation_alias="full_name")
    email: str
    
    # Настройки конфига: from_attributes=True позволяет Pydantic автоматически
    # преобразовывать объекты ORM (SQLAlchemy/SQLModel) в словари/JSON.
    class Config:
        from_attributes = True
        populate_by_name = True


