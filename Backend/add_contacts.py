import sqlite3

conn = sqlite3.connect("contacts.db")
cursor = conn.cursor()

name = input("Enter name: ")
phone = input("Enter phone number: ")

cursor.execute(
    "INSERT INTO contacts (name, phone) VALUES (?, ?)",
    (name, phone)
)

conn.commit()
conn.close()

print("Contact added successfully!")