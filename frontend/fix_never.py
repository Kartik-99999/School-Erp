import os
import re

files_to_fix = [
    'frontend/src/app/student/attendance/page.tsx',
    'frontend/src/app/student/dashboard/page.tsx',
    'frontend/src/app/accountant/dashboard/page.tsx'
]

for path in files_to_fix:
    if os.path.exists(path):
        with open(path, 'r') as f:
            content = f.read()
        
        # fix missing types in .map arguments
        content = re.sub(r'\.map\(\(txn,\s*idx\)', '.map((txn: any, idx: number)', content)
        content = re.sub(r'\.map\(\(cls,\s*idx\)', '.map((cls: any, idx: number)', content)
        content = re.sub(r'\.map\(\(att,\s*idx\)', '.map((att: any, idx: number)', content)
        content = re.sub(r'\.map\(\(row,\s*idx\)', '.map((row: any, idx: number)', content)
        content = re.sub(r'\.map\(\(record,\s*idx\)', '.map((record: any, idx: number)', content)
        content = re.sub(r'\.map\(\(payment,\s*idx\)', '.map((payment: any, idx: number)', content)
        content = re.sub(r'\.map\(\(item,\s*idx\)', '.map((item: any, idx: number)', content)
        content = re.sub(r'\.map\(\(day,\s*idx\)', '.map((day: any, idx: number)', content)
        
        with open(path, 'w') as f:
            f.write(content)
