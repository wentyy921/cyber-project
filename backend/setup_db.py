import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# 1. Connect to default database 'postgres' to create 'cyber_trainer'
try:
    conn = psycopg2.connect(dbname='postgres', user='postgres', password='1234', host='localhost')
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    cursor.execute("CREATE DATABASE cyber_trainer;")
    cursor.close()
    conn.close()
    print("Database cyber_trainer created successfully.")
except psycopg2.errors.DuplicateDatabase:
    print("Database cyber_trainer already exists.")
except Exception as e:
    print("Error creating database:", e)

# 2. Connect to the new database and execute the dump
try:
    conn = psycopg2.connect(dbname='cyber_trainer', user='postgres', password='1234', host='localhost')
    cursor = conn.cursor()
    with open('../cyber-trainer-pg.sql', 'r', encoding='utf-8') as f:
        sql = f.read()
    cursor.execute(sql)
    conn.commit()
    cursor.close()
    conn.close()
    print("Dump executed successfully.")
except Exception as e:
    print("Error executing dump:", e)
