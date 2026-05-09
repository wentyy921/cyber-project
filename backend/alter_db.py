from sqlmodel import create_engine, text
from sqlalchemy.exc import ProgrammingError

engine = create_engine('postgresql://postgres:1234@localhost:5432/cyber_trainer')
with engine.begin() as conn:
    try:
        conn.execute(text("ALTER TABLE results ADD COLUMN student_id INTEGER REFERENCES users(id);"))
        print("Column added successfully!")
    except ProgrammingError as e:
        if "already exists" in str(e) or "DuplicateColumn" in str(e) or "42701" in str(e):
            print("Column already exists, ignoring.")
        else:
            raise e
