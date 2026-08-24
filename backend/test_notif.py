import sys
sys.path.insert(0, '.')
from database import engine
from sqlalchemy import text
import requests

# Get admin user from database
with engine.connect() as conn:
    row = conn.execute(text("SELECT id, email, name, role FROM users WHERE role='admin'")).fetchone()
    print("Admins in DB:", row)

# Let's inspect notifications in the database
with engine.connect() as conn:
    rows = conn.execute(text("SELECT * FROM notifications")).fetchall()
    print("Notifications in DB:")
    for r in rows:
        print(r)
