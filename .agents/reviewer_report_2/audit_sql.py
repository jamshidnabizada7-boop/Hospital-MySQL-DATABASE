import re

sql_path = r"d:\Hospital MYSQL Databse\Hospital_Management_System.sql"
with open(sql_path, 'r', encoding='utf-8') as f:
    sql_text = f.read()

tables = re.findall(r'CREATE TABLE\s+(?:IF NOT EXISTS\s+)?`?(\w+)`?', sql_text, re.IGNORECASE)
views = re.findall(r'CREATE\s+(?:OR REPLACE\s+)?VIEW\s+`?(\w+)`?', sql_text, re.IGNORECASE)
procedures = re.findall(r'CREATE PROCEDURE\s+`?(\w+)`?', sql_text, re.IGNORECASE)
functions = re.findall(r'CREATE FUNCTION\s+`?(\w+)`?', sql_text, re.IGNORECASE)
triggers = re.findall(r'CREATE TRIGGER\s+`?(\w+)`?', sql_text, re.IGNORECASE)

print(f"SQL File Analysis:")
print(f"  Tables ({len(tables)}): {tables}")
print(f"  Views ({len(views)}): {views}")
print(f"  Procedures ({len(procedures)}): {procedures}")
print(f"  Functions ({len(functions)}): {functions}")
print(f"  Triggers ({len(triggers)}): {triggers}")
