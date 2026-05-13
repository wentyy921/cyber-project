from typing import Optional, List, Any
from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime, timedelta

# Вспомогательная функция для генерации текущего времени по Москве (UTC+3).
# Использование единого стандарта времени критически важно для корректной работы 
# таймеров экзаменов, дедлайнов и фиксации логов в распределенной системе.
def moscow_now():
    return datetime.utcnow() + timedelta(hours=3)

# Основная модель данных пользователя. Описывает профили администраторов, преподавателей и студентов.
# Архитектурно объединена в одну сущность с полем role для упрощения связей в базе данных
# и обеспечения единого механизма JWT-аутентификации.
class User(SQLModel, table=True):
    __tablename__ = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    password: str # Хэшированный пароль для защиты аутентификационных данных
    full_name: str = Field(default="")
    email: str = Field(default="")
    role: str = Field(default="student") # Ролевая модель доступа: admin | teacher | student
    is_blocked: int = Field(default=0) # Флаг блокировки для ограничения доступа нарушителей
    avatar: Optional[str] = Field(default=None)
    created_at: Optional[datetime] = Field(default_factory=moscow_now)
    last_seen: Optional[datetime] = Field(default_factory=moscow_now)

# Сущность учебного курса (собирательный термин для лекций и экзаменов).
# Поле type определяет, как клиентские приложения должны рендерить этот ресурс.
# Параметры time_limit и дедлайны (available_from/until) используются для контроля выполнения.
class Course(SQLModel, table=True):
    __tablename__ = "courses"
    id: Optional[int] = Field(default=None, primary_key=True)
    slug: Optional[str] = Field(default=None, unique=True) # Человекочитаемый идентификатор для маршрутизации
    title: Optional[str] = Field(default=None)
    description: Optional[str] = Field(default=None)
    icon: Optional[str] = Field(default=None)
    content: Optional[str] = Field(default=None)
    author_id: Optional[int] = Field(default=None, foreign_key="users.id")
    type: str = Field(default="lesson") # Тип: 'lesson' (лекция) или 'exam' (экзамен)
    time_limit: Optional[int] = Field(default=10) # Ограничение времени прохождения экзамена в минутах
    max_errors: Optional[int] = Field(default=None)
    available_from: Optional[datetime] = Field(default=None)
    available_until: Optional[datetime] = Field(default=None)

# Ассоциативная таблица (Many-to-Many) для связи между студентами и закрытыми курсами.
# Позволяет преподавателям избирательно предоставлять доступ к определенным экзаменам.
class CourseAccess(SQLModel, table=True):
    __tablename__ = "course_access"
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: Optional[int] = Field(default=None, foreign_key="users.id")
    course_id: Optional[int] = Field(default=None, foreign_key="courses.id")
    granted_by: Optional[int] = Field(default=None) # Идентификатор преподавателя, выдавшего доступ
    granted_at: Optional[datetime] = Field(default_factory=moscow_now)

# Модель тестового вопроса. Поддерживает два типа бизнес-логики: 
# выбор из вариантов ('choice') и свободный текстовый ввод ('text').
# Поле options использует JSONB (PostgreSQL) для гибкого хранения массивов строк.
class Question(SQLModel, table=True):
    __tablename__ = "questions"
    id: Optional[int] = Field(default=None, primary_key=True)
    topic: str # Привязка к курсу/экзамену через slug
    type: str = Field(default="choice")
    question_text: str
    options: Optional[List[Any]] = Field(default=None, sa_column=Column(JSONB))
    correct_index: Optional[int] = Field(default=None)
    correct_text: Optional[str] = Field(default=None)
    explanation: Optional[str] = Field(default=None) # Пояснение правильного ответа (отдается после проверки)

# Запись о результатах прохождения тестирования.
# Используется для расчета рейтинга (Leaderboard) и отображения статистики в профиле.
# Фиксирует не только балл, но и количество нарушений (violations) при прохождении.
class Result(SQLModel, table=True):
    __tablename__ = "results"
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: Optional[int] = Field(default=None, foreign_key="users.id")
    student_name: str = Field(default="Курсант")
    topic: Optional[str] = Field(default=None)
    score: Optional[int] = Field(default=None) # Набранный балл
    total_questions: Optional[int] = Field(default=None)
    passed: Optional[int] = Field(default=None) # Флаг успешного прохождения (обычно >70% правильных ответов)
    date: Optional[datetime] = Field(default_factory=moscow_now)
    violations: Optional[int] = Field(default=0)
    details: Optional[List[Any]] = Field(default=None, sa_column=Column(JSONB))

# Таблица для отслеживания факта просмотра лекций студентами.
# Отделена от результатов экзаменов (Result), так как чтение лекции не подразумевает оценки.
class StudentLecturesView(SQLModel, table=True):
    __tablename__ = "student_lectures_view"
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="users.id")
    course_id: int = Field(foreign_key="courses.id")
    viewed_at: Optional[datetime] = Field(default_factory=moscow_now)

# Таблица системного аудита (логов). Записывает критические бизнес-события:
# вход в систему, провал авторизации, блокировка пользователей, изменение данных.
class SystemLog(SQLModel, table=True):
    __tablename__ = "system_logs"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None)
    username: Optional[str] = Field(default=None)
    action: str
    details: Optional[str] = Field(default=None)
    ip_address: Optional[str] = Field(default=None) # Логирование IP для безопасности и расследований
    created_at: Optional[datetime] = Field(default_factory=moscow_now)

# Структура базы знаний (Knowledge Base). 
# Категории служат верхнеуровневым контейнером для организации статей.
class KnowledgeCategory(SQLModel, table=True):
    __tablename__ = "knowledge_categories"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    description: Optional[str] = Field(default=None)

# Статья базы знаний с привязкой к категории.
# Флаг is_published позволяет модераторам создавать черновики без их публикации клиентам.
class KnowledgeArticle(SQLModel, table=True):
    __tablename__ = "knowledge_articles"
    id: Optional[int] = Field(default=None, primary_key=True)
    category_id: Optional[int] = Field(default=None, foreign_key="knowledge_categories.id")
    title: str
    content: str
    is_published: int = Field(default=1)
    author_id: Optional[int] = Field(default=None, foreign_key="users.id")
    created_at: Optional[datetime] = Field(default_factory=moscow_now)
