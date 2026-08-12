import zipfile
import xml.etree.ElementTree as ET
import re

with open(r'd:\Hospital MYSQL Databse\project_report.md', 'r', encoding='utf-8') as f:
    md_text = f.read()

with zipfile.ZipFile(r'd:\Hospital MYSQL Databse\Hospital_Management_System_Report.docx') as z:
    xml_content = z.read('word/document.xml')
    tree = ET.fromstring(xml_content)
    docx_text = ''.join(tree.itertext())

# Check bracketed placeholders like [TODO], [FIXME], [Your Name], [Insert ...], [TBD]
brackets_md = re.findall(r'\[(?:TODO|FIXME|TBD|Insert|Your Name|Replace|Pending|Draft)[^\]]*\]', md_text, re.I)
brackets_docx = re.findall(r'\[(?:TODO|FIXME|TBD|Insert|Your Name|Replace|Pending|Draft)[^\]]*\]', docx_text, re.I)

print('Bracket placeholders in MD:', brackets_md)
print('Bracket placeholders in DOCX:', brackets_docx)

# Check for terms like lorem, ipsum, mock, dummy, placeholder, facade
suspicious = ['lorem', 'ipsum', 'todo', 'fixme', 'tbd', 'placeholder', 'dummy', 'fake']
for s in suspicious:
    m_md = re.findall(rf'\b{s}\b', md_text, re.I)
    m_docx = re.findall(rf'\b{s}\b', docx_text, re.I)
    if m_md or m_docx:
        print(f'Suspicious word "{s}": MD={len(m_md)}, DOCX={len(m_docx)}')

