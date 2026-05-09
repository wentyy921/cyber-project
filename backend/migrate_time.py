from sqlmodel import Session
from sqlalchemy import text
from database import engine

print("Starting migration...")
with Session(engine) as session:
    try:
        session.exec(text("UPDATE users SET created_at = created_at + interval '3 hours' WHERE created_at IS NOT NULL"))
        session.exec(text("UPDATE users SET last_seen = last_seen + interval '3 hours' WHERE last_seen IS NOT NULL"))
        session.exec(text("UPDATE system_logs SET created_at = created_at + interval '3 hours' WHERE created_at IS NOT NULL"))
        session.exec(text("UPDATE results SET date = date + interval '3 hours' WHERE date IS NOT NULL"))
        session.exec(text("UPDATE course_access SET granted_at = granted_at + interval '3 hours' WHERE granted_at IS NOT NULL"))
        session.exec(text("UPDATE student_lectures_view SET viewed_at = viewed_at + interval '3 hours' WHERE viewed_at IS NOT NULL"))
        session.commit()
        print("Migration complete!")
    except Exception as e:
        session.rollback()
        print("Migration failed:", e)
