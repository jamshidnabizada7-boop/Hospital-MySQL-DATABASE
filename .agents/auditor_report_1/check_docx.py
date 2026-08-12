import zipfile
import xml.etree.ElementTree as ET
import re
import os

md_path = r'd:\Hospital MYSQL Databse\project_report.md'
docx_path = r'd:\Hospital MYSQL Databse\Hospital_Management_System_Report.docx'

with open(md_path, 'r', encoding='utf-8') as f:
    md_text = f.read()

with zipfile.ZipFile(docx_path) as z:
    xml_content = z.read('word/document.xml')
    tree = ET.fromstring(xml_content)
    docx_text = ''.join(tree.itertext())

placeholders = ['lorem', 'ipsum', 'todo', 'tbd', 'insert', 'placeholder', 'xxx', 'sample text', 'your name', 'foo', 'bar']

print('=== 1. Searching Placeholders in project_report.md ===')
for p in placeholders:
    matches = re.findall(rf'\b{p}\b', md_text, re.IGNORECASE)
    if matches:
        print(f'Found placeholder "{p}": {len(matches)} times in md')

print('\n=== 2. Searching Placeholders in docx ===')
for p in placeholders:
    matches = re.findall(rf'\b{p}\b', docx_text, re.IGNORECASE)
    if matches:
        print(f'Found placeholder "{p}": {len(matches)} times in docx')

print('\n=== 3. Checking required sections in MD and DOCX ===')
required_sections = [
    'Abstract',
    'System Architecture',
    'Database Schema',
    'Access Control',
    'Frontend UI Flow',
    'Future Enhancements'
]

for sec in required_sections:
    in_md = sec.lower() in md_text.lower()
    in_docx = sec.lower() in docx_text.lower()
    print(f'Section "{sec}" -> MD: {in_md}, DOCX: {in_docx}')

print('\n=== 4. Checking docx conversion fidelity ===')
print('MD text length:', len(md_text))
print('DOCX text length:', len(docx_text))
ratio = len(docx_text) / len(md_text)
print(f'Length ratio (DOCX / MD): {ratio:.2f}')
