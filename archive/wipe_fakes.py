import os
import re

files_to_fix = [
    'frontend/src/app/student/attendance/page.tsx',
    'frontend/src/app/student/dashboard/page.tsx',
    'frontend/src/app/accountant/dashboard/page.tsx'
]

for path in files_to_fix:
    with open(path, 'r') as f:
        content = f.read()
    
    # Replace all inline arrays of objects that are immediately mapped over
    new_content = re.sub(r'\{\[\s*\{.*?\s*\].map\(', '{[].map(', content, flags=re.DOTALL)
    
    with open(path, 'w') as f:
        f.write(new_content)
    print(f"Wiped {path}")

