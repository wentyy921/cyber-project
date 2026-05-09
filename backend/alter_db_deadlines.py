from sqlalchemy import create_engine, text

from database import DATABASE_URL
engine = create_engine(DATABASE_URL)

with engine.begin() as conn:
    try:
        conn.execute(text("ALTER TABLE courses ADD COLUMN available_from TIMESTAMP WITHOUT TIME ZONE;"))
        print("Added available_from to courses")
    except Exception as e:
        print(e)
    
    try:
        conn.execute(text("ALTER TABLE courses ADD COLUMN available_until TIMESTAMP WITHOUT TIME ZONE;"))
        print("Added available_until to courses")
    except Exception as e:
        print(e)

print("Migration completed.")
