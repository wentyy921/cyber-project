import bcrypt
from sqlmodel import Session, create_engine, select
from models import User
from database import DATABASE_URL

engine = create_engine(DATABASE_URL)

new_password = "1234"
salt = bcrypt.gensalt()
hashed = bcrypt.hashpw(new_password.encode('utf-8'), salt).decode('utf-8')

with Session(engine) as session:
    users = session.exec(select(User)).all()
    for user in users:
        user.password = hashed
        session.add(user)
    session.commit()
    print("All passwords reset to '1234'")
