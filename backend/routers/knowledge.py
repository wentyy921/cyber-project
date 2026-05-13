from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Annotated, Optional
from pydantic import BaseModel

from database import engine
from models import User, KnowledgeCategory, KnowledgeArticle
from dependencies import get_current_user, get_session

# Модуль Базы Знаний (Knowledge Base).
# Представляет собой встроенную Wiki-систему для платформы.
router = APIRouter(prefix="/api/knowledge", tags=["Knowledge Base"])

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None

# Получение списка всех категорий базы знаний.
# Открытый эндпоинт, доступный всем авторизованным пользователям системы.
@router.get("/categories")
def get_categories(session: Session = Depends(get_session)):
    return session.exec(select(KnowledgeCategory)).all()

# Создание новой категории.
# Доступно только администраторам и преподавателям для поддержания порядка в структуре знаний.
@router.post("/categories")
def create_category(data: CategoryCreate, current_user: Annotated[User, Depends(get_current_user)], session: Session = Depends(get_session)):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Нет прав")
    cat = KnowledgeCategory(name=data.name, description=data.description)
    session.add(cat)
    session.commit()
    session.refresh(cat)
    return cat

class ArticleCreate(BaseModel):
    category_id: int
    title: str
    content: str
    is_published: int = 1

# Получение списка опубликованных статей (для студентов).
# Поддерживает фильтрацию по ID категории. Запрашивает только статьи с флагом is_published=1,
# скрывая черновики от обычных пользователей.
@router.get("/articles")
def get_articles(category_id: Optional[int] = None, session: Session = Depends(get_session)):
    statement = select(KnowledgeArticle).where(KnowledgeArticle.is_published == 1)
    if category_id is not None:
        statement = statement.where(KnowledgeArticle.category_id == category_id)
    return session.exec(statement).all()

# Режим редактирования: получение всех статей, включая скрытые черновики.
# Используется в административной/преподавательской панели управления контентом.
@router.get("/articles/all")
def get_all_articles(current_user: Annotated[User, Depends(get_current_user)], session: Session = Depends(get_session)):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Нет прав")
    return session.exec(select(KnowledgeArticle)).all()

# Получение конкретной статьи по её уникальному идентификатору (ID).
@router.get("/articles/{article_id}")
def get_article(article_id: int, session: Session = Depends(get_session)):
    article = session.get(KnowledgeArticle, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Статья не найдена")
    return article

# Создание новой статьи в базе знаний.
# Автоматически фиксирует ID создателя (author_id) для обеспечения Accountability (подотчетности).
@router.post("/articles")
def create_article(data: ArticleCreate, current_user: Annotated[User, Depends(get_current_user)], session: Session = Depends(get_session)):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Нет прав")
    article = KnowledgeArticle(
        category_id=data.category_id,
        title=data.title,
        content=data.content,
        is_published=data.is_published,
        author_id=current_user.id
    )
    session.add(article)
    session.commit()
    session.refresh(article)
    return article

# Обновление существующей статьи (PUT-запрос).
# Полностью заменяет переданные поля в записи базы данных.
@router.put("/articles/{article_id}")
def update_article(article_id: int, data: ArticleCreate, current_user: Annotated[User, Depends(get_current_user)], session: Session = Depends(get_session)):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Нет прав")
    article = session.get(KnowledgeArticle, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Статья не найдена")
    
    article.category_id = data.category_id
    article.title = data.title
    article.content = data.content
    article.is_published = data.is_published
    
    session.add(article)
    session.commit()
    session.refresh(article)
    return article

# Удаление статьи из базы знаний. Доступно только авторам контента (преподавателям и админам).
@router.delete("/articles/{article_id}")
def delete_article(article_id: int, current_user: Annotated[User, Depends(get_current_user)], session: Session = Depends(get_session)):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Нет прав")
    article = session.get(KnowledgeArticle, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Статья не найдена")
    session.delete(article)
    session.commit()
    return {"success": True}

