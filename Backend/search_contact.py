import sqlite3

conn = sqlite3.connect("contacts.db")
cursor = conn.cursor()

name = input("Enter name to search: ")

cursor.execute(
    "SELECT * FROM contacts WHERE name = ?",
    (name,)
)

result = cursor.fetchall()

for row in result:
    print(row)

conn.close()