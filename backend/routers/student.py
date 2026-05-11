from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlmodel import Session, select
from typing import List, Annotated, Optional
import re

from database import engine
from models import User, Course, CourseAccess, Question, Result, StudentLecturesView
from schemas import UserResponse
from dependencies import get_current_user, get_session, log_action
from auth import get_password_hash

router = APIRouter(prefix="/api", tags=["Student"])

@router.get("/topics")
@router.get("/courses") # Same as topics in old logic
def get_courses(current_user: Annotated[User, Depends(get_current_user)], session: Session = Depends(get_session)):
    user_id = current_user.id
    if current_user.role == "admin":
        statement = select(Course)
    elif current_user.role == "teacher":
        statement = select(Course).where(Course.author_id == user_id)
    else:
        # Students see public courses (author_id = 1) or courses they have access to
        statement = select(Course).join(CourseAccess, isouter=True).where(
            (Course.author_id == 1) | (CourseAccess.student_id == user_id)
        )
    
    courses = session.exec(statement).unique().all()
    return courses

@router.get("/questions")
def get_questions(topic: Optional[str] = None, include_answers: bool = False, session: Session = Depends(get_session)):
    statement = select(Question)
    if topic and topic != "all":
        statement = statement.where(Question.topic == topic)
        
    questions = session.exec(statement).all()
    
    if include_answers:
        return questions
        
    # Format questions to exclude answers
    formatted = []
    for q in questions:
        formatted.append({
            "id": q.id,
            "topic": q.topic,
            "type": q.type or "choice",
            "question": q.question_text,
            "options": q.options
        })
    return formatted

from pydantic import BaseModel
class CheckAnswerRequest(BaseModel):
    questionId: int
    userAnswer: str

@router.post("/check_answer")
def check_answer(req: CheckAnswerRequest, session: Session = Depends(get_session)):
    q = session.get(Question, req.questionId)
    if not q:
        raise HTTPException(status_code=404, detail="Вопрос не найден")
        
    is_correct = False
    correct_string = ""
    
    if q.type == "text":
        db_answer = (q.correct_text or "").strip()
        student_answer = (req.userAnswer or "").strip()
        
        is_correct = (db_answer.lower() == student_answer.lower())
        correct_string = q.correct_text
    else:
        # Choice
        try:
            is_correct = (q.correct_index == int(req.userAnswer))
        except ValueError:
            is_correct = False
        opts = q.options or []
        correct_string = opts[q.correct_index] if q.correct_index is not None and q.correct_index < len(opts) else ""
        
    return {
        "correct": is_correct,
        "correctText": correct_string,
        "correctIndex": q.correct_index,
        "explanation": q.explanation
    }

class ResultSubmit(BaseModel):
    topic: str
    score: int
    total: int
    passed: int
    violations: int = 0
    details: list = []

@router.post("/results")
def submit_result(data: ResultSubmit, current_user: Annotated[User, Depends(get_current_user)], session: Session = Depends(get_session)):
    result = Result(
        student_id=current_user.id,
        student_name=current_user.full_name or current_user.username,
        topic=data.topic,
        score=data.score,
        total_questions=data.total,
        passed=data.passed,
        violations=data.violations,
        details=data.details
    )
    session.add(result)
    session.commit()
    return {"status": "saved"}

@router.get("/results")
def get_student_results(current_user: Annotated[User, Depends(get_current_user)], session: Session = Depends(get_session)):
    statement = select(Result).where(
        (Result.student_id == current_user.id) | (Result.student_name == (current_user.full_name or current_user.username))
    ).order_by(Result.date.desc())
    return session.exec(statement).all()

@router.get("/leaderboard")
def get_leaderboard(session: Session = Depends(get_session)):
    # Simple leaderboard based on results and views
    users = session.exec(select(User).where(User.role == "student")).all()
    
    leaderboard = []
    for user in users:
        # Score from exams
        results = session.exec(select(Result).where(
            (Result.student_id == user.id) | (Result.student_name == (user.full_name or user.username))
        )).all()
        score = sum([r.score for r in results if r.score])
        
        # Add points for lecture views
        views = session.exec(select(StudentLecturesView).where(StudentLecturesView.student_id == user.id)).all()
        score += len(views) * 10  # 10 points per lecture
        
        if score > 0:
            leaderboard.append({"username": user.username, "score": score})
            
    # Sort by score descending
    leaderboard.sort(key=lambda x: x["score"], reverse=True)
    return leaderboard[:50] # top 50

@router.get("/users/me")
def get_users_me(current_user: Annotated[User, Depends(get_current_user)], session: Session = Depends(get_session)):
    statement = select(StudentLecturesView).where(StudentLecturesView.student_id == current_user.id)
    views = session.exec(statement).all()
    view_count = len(views)
    
    return {
        "id": current_user.id,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role,
        "avatar": current_user.avatar,
        "view_count": view_count
    }

class MarkViewed(BaseModel):
    courseId: int
    studentId: int

@router.post("/mark-lecture-viewed")
def mark_lecture_viewed(data: MarkViewed, session: Session = Depends(get_session)):
    from sqlmodel import select
    from models import moscow_now
    
    existing = session.exec(select(StudentLecturesView).where(
        StudentLecturesView.student_id == data.studentId,
        StudentLecturesView.course_id == data.courseId
    )).first()
    
    if existing:
        existing.viewed_at = moscow_now()
        session.add(existing)
    else:
        new_view = StudentLecturesView(student_id=data.studentId, course_id=data.courseId)
        session.add(new_view)
        
    session.commit()
    return {"success": True, "message": "View recorded"}

class UpdateProfile(BaseModel):
    id: int
    fullName: str
    email: str
    password: Optional[str] = None
    avatar: Optional[str] = None

@router.post("/student/update_profile")
def update_profile(data: UpdateProfile, current_user: Annotated[User, Depends(get_current_user)], session: Session = Depends(get_session)):
    if current_user.id != data.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Нет прав")
        
    user = session.get(User, data.id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
        
    user.full_name = data.fullName
    user.email = data.email
    if data.password and data.password.strip() != "":
        user.password = get_password_hash(data.password)
        
    if data.avatar is not None:
        user.avatar = data.avatar
        
    session.add(user)
    session.commit()
    session.refresh(user)
    
    return {
        "success": True,
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "fullName": user.full_name,
            "email": user.email,
            "avatar": user.avatar
        }
    }

@router.post("/upload_avatar")
def upload_avatar(avatar: UploadFile = File(...), current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    import os
    import uuid
    import shutil
    try:
        BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        upload_dir = os.path.join(BASE_DIR, "uploads", "avatars")
        os.makedirs(upload_dir, exist_ok=True)
        ext = os.path.splitext(avatar.filename)[1]
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(avatar.file, buffer)
            
        url = f"/uploads/avatars/{unique_filename}"
        
        current_user.avatar = url
        session.add(current_user)
        session.commit()
        
        return {"success": True, "avatar_url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
