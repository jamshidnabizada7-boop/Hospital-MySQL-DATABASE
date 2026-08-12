import re

def parse_inline_markdown(text):
    """
    Parses a string containing inline markdown (**bold**, *italic*, `code`, ***bold-italic***)
    and returns a list of dicts: [{'text': str, 'bold': bool, 'italic': bool, 'code': bool}]
    """
    if not text:
        return []
    
    # Tokenizer pattern for inline elements
    # Groups:
    # 1: Code span (`...`)
    # 2: Bold-Italic (***...***)
    # 3: Bold (**...**)
    # 4: Bold (__...__)
    # 5: Italic (*...*)
    # 6: Italic (_..._)
    pattern = re.compile(
        r'`([^`]+)`|'
        r'\*\*\*([^*]+)\*\*\*|'
        r'\*\*([^*]+)\*\*|'
        r'__([^_]+)__|'
        r'\*([^*]+)\*|'
        r'_([^_]+)_'
    )
    
    runs = []
    last_idx = 0
    
    for match in pattern.finditer(text):
        start, end = match.span()
        if start > last_idx:
            runs.append({
                'text': text[last_idx:start],
                'bold': False,
                'italic': False,
                'code': False
            })
        
        code_text = match.group(1)
        bold_italic_text = match.group(2)
        bold_text1 = match.group(3)
        bold_text2 = match.group(4)
        italic_text1 = match.group(5)
        italic_text2 = match.group(6)
        
        if code_text is not None:
            runs.append({'text': code_text, 'bold': False, 'italic': False, 'code': True})
        elif bold_italic_text is not None:
            runs.append({'text': bold_italic_text, 'bold': True, 'italic': True, 'code': False})
        elif bold_text1 is not None or bold_text2 is not None:
            t = bold_text1 if bold_text1 is not None else bold_text2
            runs.append({'text': t, 'bold': True, 'italic': False, 'code': False})
        elif italic_text1 is not None or italic_text2 is not None:
            t = italic_text1 if italic_text1 is not None else italic_text2
            runs.append({'text': t, 'bold': False, 'italic': True, 'code': False})
            
        last_idx = end
        
    if last_idx < len(text):
        runs.append({
            'text': text[last_idx:],
            'bold': False,
            'italic': False,
            'code': False
        })
        
    return runs

# Test cases
samples = [
    "The **Hospital Management System (HMS)** is an `enterprise-grade`, multi-tenant *digital healthcare* solution.",
    "`App_User.Role_ID` references `Role.Role_ID` (`ON DELETE RESTRICT ON UPDATE CASCADE`).",
    "1. **Security & Identity**",
    "***Bold and italic text*** and regular text."
]

for s in samples:
    print("ORIGINAL:", s)
    res = parse_inline_markdown(s)
    for r in res:
        print("  ", r)
    print()
