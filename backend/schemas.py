from pydantic import BaseModel, Field
from typing import Optional

class UserLogin(BaseModel):
    username: str
    password: str

class UserRegister(BaseModel):
    username: str
    password: str
    fullName: Optional[str] = ""
    email: Optional[str] = ""

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    fullName: str = Field(validation_alias="full_name")
    email: str
    
    class Config:
        from_attributes = True
        populate_by_name = True

