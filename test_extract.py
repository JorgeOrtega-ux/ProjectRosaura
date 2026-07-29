import urllib.request
import re
import os

url = "https://raw.githubusercontent.com/google/material-design-icons/master/variablefont/MaterialSymbolsRounded%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints"

print("Downloading official icon list...")
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    response = urllib.request.urlopen(req)
    data = response.read().decode('utf-8')
    valid_icons = set([line.split()[0] for line in data.split('\n') if line.strip()])
    print(f"Found {len(valid_icons)} valid material symbols.")
    
    # Now scan all files in ProjectRosaura for ANY of these words
    PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    IGNORE_DIRS = {'.git', 'vendor', 'node_modules', 'storage', 'docker', 'scripts'}
    TARGET_EXTS = {'.php', '.html', '.js'}
    
    word_pattern = re.compile(r'\b([a-z0-9_]+)\b', re.IGNORECASE)
    
    found_icons = set()
    for root, dirs, files in os.walk(PROJECT_ROOT):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in TARGET_EXTS:
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                        # Optimization: we can just find all words and intersect
                        words = set(word_pattern.findall(content))
                        found_icons.update(words.intersection(valid_icons))
                        
                except Exception as e:
                    pass
                    
    print(f"Found {len(found_icons)} icons used in the project!")
    
    # Let's see if the dynamic ones are included
    print("Contains 'groups'? ", 'groups' in found_icons)
    print("Contains 'rocket_launch'? ", 'rocket_launch' in found_icons)
    
except Exception as e:
    print("Error:", e)
