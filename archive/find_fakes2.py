import os
import re

for root, dirs, files in os.walk('frontend/src/app'):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()
            
            # Find const data = [{...}]
            matches1 = re.findall(r'const\s+\w+\s*=\s*\[\s*\{', content)
            if matches1:
                print(f"Found const array in {path}")
            
            # Find {[ { ... } ]
            matches2 = re.findall(r'\{\s*\[\s*\{', content)
            if matches2:
                print(f"Found inline array in {path}")

