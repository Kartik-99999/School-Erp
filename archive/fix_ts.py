import os
import re

for root, dirs, files in os.walk('frontend/src/app'):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()
            
            # fix att, i
            content = re.sub(r'\.map\(\(att, i\)', '.map((att: any, i: number)', content)
            # fix img, i
            content = re.sub(r'\.map\(\(img, i\)', '.map((img: string, i: number)', content)
            # fix colSpan="4"
            content = content.replace('colSpan="4"', 'colSpan={4}')
            
            with open(path, 'w') as f:
                f.write(content)
print("done")
