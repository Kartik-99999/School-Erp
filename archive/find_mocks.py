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
            if file.endswith(".tsx") or file.endswith(".ts"):
                file_path = os.path.join(root, file)
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                    
                # We can check for patterns like "useState([" or "useState<any[]>([{"
                if "useState([" in content or "useState<" in content and "([{" in content.replace(" ", ""):
                    print(f"Match found in: {file_path}")
                elif "const mock" in content.lower() or "const fake" in content.lower():
                    print(f"Mock variable found in: {file_path}")
                elif re.search(r"=\s*\[\s*\{", content): # array with objects
                    print(f"Array of objects found in: {file_path}")
