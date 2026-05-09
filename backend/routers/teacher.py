from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlmodel import Session, select, delete
from typing import Annotated, Optional, List
import string
import random
import os
import shutil
import uuid
from datetime import datetime

from database import engine
from models import User, Course, CourseAccess, Question, StudentLecturesView, Result
from schemas import UserResponse
from dependencies import get_current_user, get_session, log_action
from pydantic import BaseModel

router = APIRouter(prefix="/api/teacher", tags=["Teacher"])

def get_teacher(current_user: Annotated[User, Depends(get_current_user)]):
    if current_user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Доступ только для преподавателей")
    return current_user

def generate_short_id(prefix: str = 'id') -> str:
    chars = string.ascii_lowercase + string.digits
    rand_str = ''.join(random.choice(chars) for _ in range(6))
    return f"{prefix}-{rand_str}"

@router.get("/my_courses")
def get_my_courses(teacher: Annotated[User, Depends(get_teacher)], session: Session = Depends(get_session)):
    statement = select(Course).where(Course.author_id == teacher.id)
    return session.exec(statement).all()

@router.get("/lecture_stats")
def get_lecture_stats(courseId: int, teacher: Annotated[User, Depends(get_teacher)], session: Session = Depends(get_session)):
    # Check if teacher owns the course
    course = session.get(Course, courseId)
    if not course or (course.author_id != teacher.id and teacher.role != "admin"):
        raise HTTPException(status_code=403, detail="Нет прав")
        
    statement = select(StudentLecturesView, User).join(User, StudentLecturesView.student_id == User.id).where(StudentLecturesView.course_id == courseId).order_by(StudentLecturesView.viewed_at.desc())
    results = session.exec(statement).all()
    
    formatted = []
    for view, user in results:
        formatted.append({
            "username": user.username,
            "full_name": user.full_name,
            "viewed_at": view.viewed_at
        })
    return formatted

@router.get("/results")
def get_teacher_results(teacher: Annotated[User, Depends(get_teacher)], session: Session = Depends(get_session)):
    # Optional: filter by courses this teacher owns, but for simplicity we return all or 100 recent
    statement = select(Result).order_by(Result.date.desc()).limit(100)
    return session.exec(statement).all()

class CreateCourseReq(BaseModel):
    title: str
    description: str
    content: str
    type: str = "lesson"
    time_limit: Optional[int] = 10
    max_errors: Optional[int] = None
    available_from: Optional[datetime] = None
    available_until: Optional[datetime] = None

@router.post("/create_course")
def create_course(data: CreateCourseReq, teacher: Annotated[User, Depends(get_teacher)], session: Session = Depends(get_session)):
    prefix = 'ex' if data.type == 'exam' else 'lec'
    slug = generate_short_id(prefix)
    icon = '⏱' if data.type == 'exam' else '📚'
    
    course = Course(
        slug=slug,
        title=data.title,
        description=data.description,
        icon=icon,
        content=data.content,
        author_id=teacher.id,
        type=data.type,
        time_limit=data.time_limit,
        max_errors=data.max_errors if data.type == 'exam' else None,
        available_from=data.available_from,
        available_until=data.available_until
    )
    session.add(course)
    session.commit()
    return {"success": True, "slug": slug}

class AddQuestionReq(BaseModel):
    topic: str
    type: str = "choice"
    question: str
    options: Optional[list] = None
    correctIndex: Optional[int] = None
    correctText: Optional[str] = None
    explanation: Optional[str] = None

@router.post("/add_question")
def add_question(data: AddQuestionReq, teacher: Annotated[User, Depends(get_teacher)], session: Session = Depends(get_session)):
    # Assuming the teacher has rights to add to this topic/course
    q = Question(
        topic=data.topic,
        type=data.type,
        question_text=data.question,
        options=data.options,
        correct_index=data.correctIndex,
        correct_text=data.correctText,
        explanation=data.explanation
    )
    session.add(q)
    session.commit()
    return {"success": True}

class EditQuestionReq(AddQuestionReq):
    id: int

@router.post("/edit_question")
def edit_question(data: EditQuestionReq, teacher: Annotated[User, Depends(get_teacher)], session: Session = Depends(get_session)):
    q = session.get(Question, data.id)
    if not q:
        raise HTTPException(status_code=404, detail="Вопрос не найден")
        
    q.question_text = data.question
    q.type = data.type
    q.options = data.options
    q.correct_index = data.correctIndex
    q.correct_text = data.correctText
    q.explanation = data.explanation
    
    session.add(q)
    session.commit()
    return {"success": True}

class DeleteCourseReq(BaseModel):
    id: int

@router.post("/delete_course")
def delete_course(data: DeleteCourseReq, teacher: Annotated[User, Depends(get_teacher)], session: Session = Depends(get_session)):
    course = session.get(Course, data.id)
    if not course or (course.author_id != teacher.id and teacher.role != "admin"):
        raise HTTPException(status_code=403, detail="Ошибка: курс не найден или нет прав")
        
    # Delete related records
    session.exec(delete(CourseAccess).where(CourseAccess.course_id == course.id))
    session.exec(delete(StudentLecturesView).where(StudentLecturesView.course_id == course.id))
    session.exec(delete(Question).where(Question.topic == course.slug))
    session.exec(delete(Result).where(Result.topic == course.slug))
    
    session.delete(course)
    session.commit()
    return {"success": True}

@router.get("/search_students")
def search_students(teacher: Annotated[User, Depends(get_teacher)], q: str = "", session: Session = Depends(get_session)):
    statement = select(User).where(User.role == "student")
    if q:
        search_pattern = f"%{q}%"
        statement = statement.where(
            (User.username.ilike(search_pattern)) | 
            (User.full_name.ilike(search_pattern)) | 
            (User.email.ilike(search_pattern))
        )
    users = session.exec(statement).all()
    return [{"id": u.id, "username": u.username, "full_name": u.full_name, "email": u.email} for u in users]

class UpdateCourseReq(BaseModel):
    courseId: int
    content: Optional[str] = None
    time_limit: Optional[int] = None
    max_errors: Optional[int] = None
    available_from: Optional[datetime] = None
    available_until: Optional[datetime] = None

@router.post("/update_course")
def update_course(data: UpdateCourseReq, teacher: Annotated[User, Depends(get_teacher)], session: Session = Depends(get_session)):
    course = session.get(Course, data.courseId)
    if not course or (course.author_id != teacher.id and teacher.role != "admin"):
        raise HTTPException(status_code=403, detail="Ошибка: курс не найден или нет прав")
        
    if data.content is not None:
        course.content = data.content
    if data.time_limit is not None:
        course.time_limit = data.time_limit
    
    # We allow max_errors to be None (unlimited)
    course.max_errors = data.max_errors
    
    if data.available_from is not None:
        course.available_from = data.available_from
    if data.available_until is not None:
        course.available_until = data.available_until
        
    session.add(course)
    session.commit()
    return {"success": True}

class AssignStudentReq(BaseModel):
    studentLogin: str
    courseId: int

@router.post("/assign_student")
def assign_student(data: AssignStudentReq, teacher: Annotated[User, Depends(get_teacher)], session: Session = Depends(get_session)):
    student = session.exec(select(User).where((User.username == data.studentLogin) | (User.email == data.studentLogin))).first()
    if not student:
        raise HTTPException(status_code=404, detail="Студент с таким логином/email не найден")
        
    access = session.exec(select(CourseAccess).where(CourseAccess.student_id == student.id, CourseAccess.course_id == data.courseId)).first()
    if access:
        raise HTTPException(status_code=409, detail="Студент уже на курсе")
        
    new_access = CourseAccess(student_id=student.id, course_id=data.courseId, granted_by=teacher.id)
    session.add(new_access)
    session.commit()
    return {"success": True, "message": "Студент успешно добавлен!"}

@router.get("/course_students")
def get_course_students(courseId: int, teacher: Annotated[User, Depends(get_teacher)], session: Session = Depends(get_session)):
    statement = select(CourseAccess, User).join(User, CourseAccess.student_id == User.id).where(CourseAccess.course_id == courseId).order_by(CourseAccess.granted_at.desc())
    results = session.exec(statement).all()
    
    formatted = []
    for access, user in results:
        formatted.append({
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "granted_at": access.granted_at
        })
    return formatted

@router.get("/course_questions")
def get_course_questions(topic: str, teacher: Annotated[User, Depends(get_teacher)], session: Session = Depends(get_session)):
    statement = select(Question).where(Question.topic == topic).order_by(Question.id.asc())
    return session.exec(statement).all()

class DeleteQuestionReq(BaseModel):
    id: int

@router.post("/delete_question")
def delete_question(data: DeleteQuestionReq, teacher: Annotated[User, Depends(get_teacher)], session: Session = Depends(get_session)):
    q = session.get(Question, data.id)
    if not q:
        raise HTTPException(status_code=404, detail="Вопрос не найден")
    session.delete(q)
    session.commit()
    return {"success": True}

class UnassignStudentReq(BaseModel):
    studentId: int
    courseId: int

@router.post("/unassign_student")
def unassign_student(data: UnassignStudentReq, teacher: Annotated[User, Depends(get_teacher)], session: Session = Depends(get_session)):
    access = session.exec(select(CourseAccess).where(CourseAccess.student_id == data.studentId, CourseAccess.course_id == data.courseId)).first()
    if not access:
        raise HTTPException(status_code=404, detail="Доступ не найден")
    session.delete(access)
    session.commit()
    return {"success": True}

@router.get("/search_students")
def search_students(q: str, teacher: Annotated[User, Depends(get_teacher)], session: Session = Depends(get_session)):
    if not q or len(q) < 2:
        return []
    statement = select(User).where(User.role == "student", (User.username.contains(q)) | (User.email.contains(q)) | (User.full_name.contains(q))).limit(10)
    users = session.exec(statement).all()
    return [{"id": u.id, "username": u.username, "full_name": u.full_name, "email": u.email} for u in users]

@router.post("/upload_image")
def upload_image(image: UploadFile = File(...), teacher: User = Depends(get_teacher)):
    try:
        # Create uploads directory if not exists
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        ext = os.path.splitext(image.filename)[1]
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
            
        url = f"http://127.0.0.1:8000/uploads/{unique_filename}"
        return {
            "success": 1,
            "file": {
                "url": url
            }
        }
    except Exception as e:
        return {
            "success": 0,
            "message": str(e)
        }
