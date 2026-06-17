import os
import re

for root, dirs, files in os.walk('frontend/src/app'):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()
            
            # Simple regex to find arrays of objects directly mapped over
            matches = re.findall(r'\{\[\s*\{.*?\s*\].map', content, re.DOTALL)
            if matches:
                print(f"Found in {path}")
