import os
import re

files_to_clean = [
    "frontend/src/app/admin/transport/page.tsx",
    "frontend/src/app/admin/fees/page.tsx",
    "frontend/src/app/admin/library/page.tsx",
    "frontend/src/app/admin/exams/page.tsx",
    "frontend/src/app/parent/notices/page.tsx"
]

for filepath in files_to_clean:
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r') as f:
        content = f.read()

    # Replace usages of fallback variables with []
    content = re.sub(r'setRoutes\(fallbackRoutes\);', 'setRoutes([]);', content)
    content = re.sub(r'setInvoices\(fallbackInvoices\);', 'setInvoices([]);', content)
    content = re.sub(r'setBooks\(fallbackBooks\);', 'setBooks([]);', content)
    content = re.sub(r'setIssues\(fallbackIssues\);', 'setIssues([]);', content)
    content = re.sub(r'setExams\(fallbackExams\);', 'setExams([]);', content)
    content = re.sub(r'setFeedItems\(fallbackItems\);', 'setFeedItems([]);', content)

    # We can also just leave the fallback constants there but unused, or remove them.
    # To be perfectly clean, let's remove the const fallbackX = [ ... ]; blocks
    content = re.sub(r'const fallback[A-Za-z]+ = \[.*?\];', '', content, flags=re.DOTALL)

    with open(filepath, 'w') as f:
        f.write(content)

# Parent dashboard pending fees
pd_path = "frontend/src/app/parent/dashboard/page.tsx"
if os.path.exists(pd_path):
    with open(pd_path, 'r') as f:
        content = f.read()
    content = re.sub(r'pendingFees:\s*\d+,\s*// Hardcoded for mockup fallback', 'pendingFees: 0,', content)
    with open(pd_path, 'w') as f:
        f.write(content)

print("Mock data removed from frontend UI files.")
