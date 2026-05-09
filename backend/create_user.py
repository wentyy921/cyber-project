import sys
from sqlmodel import Session, select
import bcrypt
from database import engine
from models import User

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def create_or_update_user(username, password, full_name, email, role):
    with Session(engine) as session:
        statement = select(User).where(User.username == username)
        user = session.exec(statement).first()
        
        hashed_password = get_password_hash(password)
        
        if user:
            print(f"Updating existing user: {username}")
            user.password = hashed_password
            user.full_name = full_name
            user.email = email
            user.role = role
        else:
            print(f"Creating new user: {username}")
            user = User(username=username, password=hashed_password, full_name=full_name, email=email, role=role)
            
        session.add(user)
        session.commit()
        session.refresh(user)
        print(f"Success! User ID: {user.id}")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python create_user.py <username> <password> <role> [full_name] [email]")
        sys.exit(1)
        
    username = sys.argv[1]
    password = sys.argv[2]
    role = sys.argv[3]
    full_name = sys.argv[4] if len(sys.argv) > 4 else ""
    email = sys.argv[5] if len(sys.argv) > 5 else ""
    
    create_or_update_user(username, password, full_name, email, role)
