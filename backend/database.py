from sqlmodel import SQLModel, create_engine
import os
from dotenv import load_dotenv

# Загрузка переменных окружения из файла .env
# Это стандартный подход для разделения конфигурации и кода (Twelve-Factor App).
load_dotenv()

# Строка подключения к базе данных PostgreSQL.
# Формируется из переменных окружения для гибкости деплоя. 
# Содержит fallback-значение для локальной разработки.
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:1234@localhost:5432/cyber_trainer")

# Инициализация движка SQLAlchemy (ядра SQLModel).
# Флаг echo=True включает логирование всех SQL-запросов в консоль,
# что необходимо для профилирования и отладки ORM на этапе разработки.
engine = create_engine(DATABASE_URL, echo=True)

# Функция для генерации схемы базы данных.
# Вызывается при старте приложения для проверки и создания недостающих таблиц,
# определенных в моделях (SQLModel), обеспечивая синхронизацию кода и БД.
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

