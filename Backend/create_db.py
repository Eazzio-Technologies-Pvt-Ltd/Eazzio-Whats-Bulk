print("SCRIPT STARTED")

import sqlite3
import os

# Define database path relative to this script
db_dir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(db_dir, "contacts.db")
print("Database path:", db_path)

# Create database file
conn = sqlite3.connect(db_path)

# Create cursor
cursor = conn.cursor()

# Create contacts table
cursor.execute("""
CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE
)
""")

# Create users table
cursor.execute("""
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
)
""")

conn.commit()
conn.close()

print("Database and tables created successfully!")