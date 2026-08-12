import re

with open(r'd:\Hospital MYSQL Databse\project_report.md', 'r', encoding='utf-8') as f:
    md_text = f.read()

lines = md_text.splitlines()
for i, line in enumerate(lines, 1):
    if re.search(r'\binsert\b', line, re.IGNORECASE):
        print(f'Line {i}: {line[:120]}')
