import sqlite3
import psycopg2
import os
from dotenv import load_dotenv

# Load env variables
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(dotenv_path)

db_url = os.getenv("DATABASE_URL")
sqlite_db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "contacts.db")

def migrate():
    if not db_url:
        print("ERROR: DATABASE_URL is not set in your .env file!")
        print("Please add DATABASE_URL=postgresql://... to your Backend/.env file first.")
        return

    if not os.path.exists(sqlite_db_path):
        print(f"ERROR: Local SQLite database contacts.db not found at {sqlite_db_path}")
        return

    print("Connecting to local SQLite database...")
    sqlite_conn = sqlite3.connect(sqlite_db_path)
    sqlite_cursor = sqlite_conn.cursor()

    print("Connecting to Neon PostgreSQL database...")
    try:
        pg_conn = psycopg2.connect(db_url)
        pg_cursor = pg_conn.cursor()
    except Exception as e:
        print(f"ERROR connecting to Neon DB: {e}")
        sqlite_conn.close()
        return

    # 1. Create tables in PostgreSQL (Neon)
    print("Creating tables in Neon DB...")
    pg_cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL
    );
    """)

    pg_cursor.execute("""
    CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        UNIQUE(user_id, phone)
    );
    """)

    pg_cursor.execute("""
    CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expiry INTEGER NOT NULL
    );
    """)
    pg_conn.commit()

    # 2. Migrate users
    print("Migrating 'users' table...")
    sqlite_cursor.execute("SELECT id, email, password_hash FROM users")
    users = sqlite_cursor.fetchall()
    for user in users:
        pg_cursor.execute(
            "INSERT INTO users (id, email, password_hash) VALUES (%s, %s, %s) ON CONFLICT (id) DO NOTHING",
            user
        )
    
    # 3. Migrate contacts
    print("Migrating 'contacts' table...")
    sqlite_cursor.execute("SELECT id, user_id, name, phone FROM contacts")
    contacts = sqlite_cursor.fetchall()
    for contact in contacts:
        pg_cursor.execute(
            "INSERT INTO contacts (id, user_id, name, phone) VALUES (%s, %s, %s, %s) ON CONFLICT (user_id, phone) DO NOTHING",
            contact
        )

    # 4. Migrate password_resets
    print("Migrating 'password_resets' table...")
    sqlite_cursor.execute("SELECT id, email, token, expiry FROM password_resets")
    resets = sqlite_cursor.fetchall()
    for reset in resets:
        pg_cursor.execute(
            "INSERT INTO password_resets (id, email, token, expiry) VALUES (%s, %s, %s, %s) ON CONFLICT (token) DO NOTHING",
            reset
        )

    # Reset identity sequences so new records get correct auto-incremented IDs
    print("Updating database ID sequences...")
    pg_cursor.execute("SELECT setval('users_id_seq', COALESCE((SELECT MAX(id)+1 FROM users), 1), false);")
    pg_cursor.execute("SELECT setval('contacts_id_seq', COALESCE((SELECT MAX(id)+1 FROM contacts), 1), false);")
    pg_cursor.execute("SELECT setval('password_resets_id_seq', COALESCE((SELECT MAX(id)+1 FROM password_resets), 1), false);")

    pg_conn.commit()
    
    sqlite_conn.close()
    pg_conn.close()
    
    print("\nSUCCESS: All data successfully migrated from SQLite to Neon DB!")

if __name__ == "__main__":
    migrate()
