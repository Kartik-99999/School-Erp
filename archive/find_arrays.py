import os
import re

directories = [
    "frontend/src/app/admin/communication",
    "frontend/src/app/admin/reports",
    "frontend/src/app/admin/staff",
    "frontend/src/app/admin/students",
    "frontend/src/app/admin/dashboard",
    "frontend/src/app/admin/admissions",
    "frontend/src/app/admin/leaves"
]

base_dir = "/Users/kartikbhardwaj/school-erp"

for d in directories:
    dir_path = os.path.join(base_dir, d)
    if not os.path.exists(dir_path):
        continue
    for root, _, files in os.walk(dir_path):
        for file in files:
            if file.endswith(".tsx"):
                file_path = os.path.join(root, file)
                with open(file_path, "r", encoding="utf-8") as f:
                    lines = f.readlines()
                
                for i, line in enumerate(lines):
                    if "useState([" in line or "useState<" in line and "([" in line:
                        print(f"useState Array: {file_path}:{i+1} -> {line.strip()}")
                    if "||" in line and re.search(r"\|\|\s*\d+", line):
                        print(f"Fallback number: {file_path}:{i+1} -> {line.strip()}")
                    if "Array.from(" in line:
                        print(f"Array.from: {file_path}:{i+1} -> {line.strip()}")
                    if re.search(r"=\s*\[\s*\{", line):
                        print(f"Const array objects: {file_path}:{i+1} -> {line.strip()}")

