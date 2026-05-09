from sqlmodel import Session, select
from database import engine
from models import User, Course, CourseAccess, Question, Result, KnowledgeCategory, KnowledgeArticle, StudentLecturesView
from auth import get_password_hash
from datetime import datetime, timedelta
import json
import random

def seed_users(session: Session):
    pwd = get_password_hash("1234")
    
    users = [
        # Students
        User(username="student1", password=pwd, full_name="Иван Иванов", role="student", email="ivan@example.com"),
        User(username="student2", password=pwd, full_name="Анна Смирнова", role="student", email="anna@example.com"),
        User(username="student3", password=pwd, full_name="Петр Сидоров", role="student", email="petr@example.com"),
        User(username="student4", password=pwd, full_name="Елена Волкова", role="student", email="elena@example.com"),
        User(username="student5", password=pwd, full_name="Дмитрий Соколов", role="student", email="dmitry@example.com"),
        # Teachers
        User(username="teacher1", password=pwd, full_name="Сергей Петрович", role="teacher", email="sergey@example.com"),
        User(username="teacher2", password=pwd, full_name="Мария Ивановна", role="teacher", email="maria@example.com"),
        # Admins
        User(username="admin1", password=pwd, full_name="Главный Админ", role="admin", email="admin1@example.com"),
        User(username="admin2", password=pwd, full_name="Запасной Админ", role="admin", email="admin2@example.com"),
    ]
    
    for u in users:
        existing = session.exec(select(User).where(User.username == u.username)).first()
        if not existing:
            session.add(u)
    
    session.commit()
    print("Users seeded.")

def seed_courses(session: Session):
    teacher = session.exec(select(User).where(User.role == "teacher")).first()
    t_id = teacher.id if teacher else 1

    content1 = json.dumps({
        "time": 1700000000,
        "blocks": [
            {"type": "header", "data": {"text": "Введение", "level": 2}},
            {"type": "paragraph", "data": {"text": "Добро пожаловать в основы кибербезопасности."}},
            {"type": "list", "data": {"style": "unordered", "items": ["Конфиденциальность", "Целостность", "Доступность"]}}
        ]
    })

    content2 = json.dumps({
        "time": 1700000000,
        "blocks": [
            {"type": "header", "data": {"text": "Основы Python", "level": 2}},
            {"type": "paragraph", "data": {"text": "Python - отличный язык."}},
            {"type": "code", "data": {"code": "print('Hello World')\nx = 5"}}
        ]
    })

    content3 = json.dumps({
        "time": 1700000000,
        "blocks": [
            {"type": "header", "data": {"text": "Социальная инженерия", "level": 2}},
            {"type": "quote", "data": {"text": "Самая слабая часть системы - человек.", "caption": "Кевин Митник", "alignment": "left"}},
            {"type": "paragraph", "data": {"text": "Основные методы атак:"}},
            {"type": "list", "data": {"style": "unordered", "items": ["Фишинг", "Претекстинг", "Baiting"]}}
        ]
    })

    courses = [
        Course(slug="cyber-basics", title="Основы кибербезопасности", description="Базовые понятия", type="lesson", author_id=t_id, content=content1),
        Course(slug="python-intro", title="Введение в Python", description="Программирование для начинающих", type="lesson", author_id=t_id, content=content2),
        Course(slug="soc-eng", title="Социальная инженерия", description="Атаки на человека", type="lesson", author_id=t_id, content=content3),
        
        Course(slug="exam-net", title="Экзамен: Сети и протоколы", description="Проверка знаний по сетям", type="exam", author_id=t_id, time_limit=15),
        Course(slug="exam-phish", title="Экзамен: Phishing", description="Распознавание фишинга", type="exam", author_id=t_id, time_limit=5, available_until=datetime.utcnow() + timedelta(days=7)),
        Course(slug="exam-py", title="Итоговый тест по Python", description="Программирование", type="exam", author_id=t_id, time_limit=20, available_until=datetime.utcnow() + timedelta(days=30)),
    ]

    for c in courses:
        existing = session.exec(select(Course).where(Course.slug == c.slug)).first()
        if not existing:
            session.add(c)
    
    session.commit()
    print("Courses seeded.")

def seed_questions(session: Session):
    exam1 = session.exec(select(Course).where(Course.slug == "exam-net")).first()
    exam2 = session.exec(select(Course).where(Course.slug == "exam-phish")).first()
    exam3 = session.exec(select(Course).where(Course.slug == "exam-py")).first()

    questions = []

    if exam1:
        for i in range(1, 11):
            questions.append(Question(
                topic="exam-net",
                question_text=f"Вопрос {i} по сетям",
                options=["Ответ 1", "Ответ 2 (верный)", "Ответ 3", "Ответ 4"],
                correct_index=1,
                explanation="Потому что это базовый принцип."
            ))

    if exam2:
        for i in range(1, 6):
            questions.append(Question(
                topic="exam-phish",
                question_text=f"Вопрос {i} по фишингу",
                options=["Ответ 1 (верный)", "Ответ 2", "Ответ 3"],
                correct_index=0,
                explanation="Здесь очевиден правильный ответ."
            ))

    if exam3:
        for i in range(1, 8):
            questions.append(Question(
                topic="exam-py",
                question_text=f"Вопрос {i} по Python",
                options=["Ответ 1", "Ответ 2", "Ответ 3 (верный)"],
                correct_index=2,
                explanation="Именно так работает Python."
            ))

    for q in questions:
        session.add(q)
    session.commit()
    print("Questions seeded.")

def seed_knowledge(session: Session):
    cat_names = ["Гайды для новичков", "Сетевая безопасность", "Языки программирования", "FAQ", "Правила платформы"]
    author = session.exec(select(User).where(User.role == "teacher")).first()
    a_id = author.id if author else 1
    
    for cname in cat_names:
        cat = session.exec(select(KnowledgeCategory).where(KnowledgeCategory.name == cname)).first()
        if not cat:
            cat = KnowledgeCategory(name=cname, description=f"Описание категории {cname}")
            session.add(cat)
            session.commit()
            session.refresh(cat)
        
        # Add articles
        for i in range(1, 6):
            # Verify if article already exists
            existing = session.exec(select(KnowledgeArticle).where(KnowledgeArticle.title == f"Статья {i}: {cname}")).first()
            if not existing:
                art_content = json.dumps({
                    "time": 1700000000,
                    "blocks": [
                        {"type": "header", "data": {"text": f"Статья {i} в {cname}", "level": 2}},
                        {"type": "paragraph", "data": {"text": "Здесь содержится полезный текст статьи. Разнообразная информация для изучения студентами."}}
                    ]
                })
                art = KnowledgeArticle(category_id=cat.id, title=f"Статья {i}: {cname}", content=art_content, is_published=1, author_id=a_id)
                session.add(art)
    session.commit()
    print("Knowledge seeded.")

def seed_analytics(session: Session):
    students = session.exec(select(User).where(User.role == "student")).all()
    courses = session.exec(select(Course).where(Course.type == "lesson")).all()
    exams = session.exec(select(Course).where(Course.type == "exam")).all()

    # Views
    for s in students:
        for c in courses:
            if random.choice([True, False]):
                session.add(StudentLecturesView(student_id=s.id, course_id=c.id, viewed_at=datetime.utcnow() - timedelta(days=random.randint(0, 10))))
                
            # Grant access to all courses
            acc = session.exec(select(CourseAccess).where((CourseAccess.student_id == s.id) & (CourseAccess.course_id == c.id))).first()
            if not acc:
                session.add(CourseAccess(student_id=s.id, course_id=c.id, granted_by=1))
        
        for e in exams:
            acc = session.exec(select(CourseAccess).where((CourseAccess.student_id == s.id) & (CourseAccess.course_id == e.id))).first()
            if not acc:
                session.add(CourseAccess(student_id=s.id, course_id=e.id, granted_by=1))
            
            # Results
            for _ in range(random.randint(1, 3)):
                passed = random.choice([0, 1])
                score = random.randint(50, 100) if passed else random.randint(10, 40)
                
                # Check if it exists to avoid infinite duplication on multiple runs
                # But it's random, so we might just insert it
                session.add(Result(
                    student_id=s.id,
                    student_name=s.full_name,
                    topic=e.title,
                    score=score,
                    total_questions=10,
                    passed=passed,
                    date=datetime.utcnow() - timedelta(days=random.randint(0, 5)),
                    violations=random.randint(0, 2)
                ))

    session.commit()
    print("Analytics seeded.")

def main():
    with Session(engine) as session:
        seed_users(session)
        seed_courses(session)
        seed_questions(session)
        seed_knowledge(session)
        seed_analytics(session)
        print("Database seeded completely!")

if __name__ == "__main__":
    main()
