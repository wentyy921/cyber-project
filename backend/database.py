from sqlmodel import SQLModel, create_engine

DATABASE_URL = "postgresql://postgres:1234@localhost:5432/cyber_trainer"

engine = create_engine(DATABASE_URL, echo=True)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
