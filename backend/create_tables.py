from sqlmodel import SQLModel, create_engine
import models

engine = create_engine('postgresql://postgres:1234@localhost:5432/cyber_trainer')
SQLModel.metadata.create_all(engine)
print("Tables created")
