import sqlite3

conn = sqlite3.connect("contacts.db")
cursor = conn.cursor()

phone = input("Enter phone number to delete: ")

cursor.execute(
    "DELETE FROM contacts WHERE phone = ?",
    (phone,)
)

conn.commit()
conn.close()

print("Contact deleted.") 