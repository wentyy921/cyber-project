from typing import Optional, List, Any
from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime, timedelta

def moscow_now():
    return datetime.utcnow() + timedelta(hours=3)

class User(SQLModel, table=True):
    __tablename__ = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    password: str
    full_name: str = Field(default="")
    email: str = Field(default="")
    role: str = Field(default="student")
    is_blocked: int = Field(default=0)
    avatar: Optional[str] = Field(default=None)
    created_at: Optional[datetime] = Field(default_factory=moscow_now)
    last_seen: Optional[datetime] = Field(default_factory=moscow_now)

class Course(SQLModel, table=True):
    __tablename__ = "courses"
    id: Optional[int] = Field(default=None, primary_key=True)
    slug: Optional[str] = Field(default=None, unique=True)
    title: Optional[str] = Field(default=None)
    description: Optional[str] = Field(default=None)
    icon: Optional[str] = Field(default=None)
    content: Optional[str] = Field(default=None)
    author_id: Optional[int] = Field(default=None, foreign_key="users.id")
    type: str = Field(default="lesson")
    time_limit: Optional[int] = Field(default=10)
    max_errors: Optional[int] = Field(default=None)
    available_from: Optional[datetime] = Field(default=None)
    available_until: Optional[datetime] = Field(default=None)

class CourseAccess(SQLModel, table=True):
    __tablename__ = "course_access"
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: Optional[int] = Field(default=None, foreign_key="users.id")
    course_id: Optional[int] = Field(default=None, foreign_key="courses.id")
    granted_by: Optional[int] = Field(default=None)
    granted_at: Optional[datetime] = Field(default_factory=moscow_now)

class Question(SQLModel, table=True):
    __tablename__ = "questions"
    id: Optional[int] = Field(default=None, primary_key=True)
    topic: str
    type: str = Field(default="choice")
    question_text: str
    options: Optional[List[Any]] = Field(default=None, sa_column=Column(JSONB))
    correct_index: Optional[int] = Field(default=None)
    correct_text: Optional[str] = Field(default=None)
    explanation: Optional[str] = Field(default=None)

class Result(SQLModel, table=True):
    __tablename__ = "results"
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: Optional[int] = Field(default=None, foreign_key="users.id")
    student_name: str = Field(default="Курсант")
    topic: Optional[str] = Field(default=None)
    score: Optional[int] = Field(default=None)
    total_questions: Optional[int] = Field(default=None)
    passed: Optional[int] = Field(default=None)
    date: Optional[datetime] = Field(default_factory=moscow_now)
    violations: Optional[int] = Field(default=0)
    details: Optional[List[Any]] = Field(default=None, sa_column=Column(JSONB))

class StudentLecturesView(SQLModel, table=True):
    __tablename__ = "student_lectures_view"
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="users.id")
    course_id: int = Field(foreign_key="courses.id")
    viewed_at: Optional[datetime] = Field(default_factory=moscow_now)

class SystemLog(SQLModel, table=True):
    __tablename__ = "system_logs"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None)
    username: Optional[str] = Field(default=None)
    action: str
    details: Optional[str] = Field(default=None)
    ip_address: Optional[str] = Field(default=None)
    created_at: Optional[datetime] = Field(default_factory=moscow_now)
class KnowledgeCategory(SQLModel, table=True):
    __tablename__ = "knowledge_categories"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    description: Optional[str] = Field(default=None)

class KnowledgeArticle(SQLModel, table=True):
    __tablename__ = "knowledge_articles"
    id: Optional[int] = Field(default=None, primary_key=True)
    category_id: Optional[int] = Field(default=None, foreign_key="knowledge_categories.id")
    title: str
    content: str
    is_published: int = Field(default=1)
    author_id: Optional[int] = Field(default=None, foreign_key="users.id")
    created_at: Optional[datetime] = Field(default_factory=moscow_now)
