from dotenv import load_dotenv
import os
import psycopg

load_dotenv()
url = os.environ["DATABASE_URL"]
with psycopg.connect(url) as conn:
    result = conn.execute("SELECT 1").fetchone()
    print(result)

