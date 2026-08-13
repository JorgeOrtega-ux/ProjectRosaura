import os
import re

script_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.abspath(os.path.join(script_dir, '../../'))
views_dir = os.path.join(project_dir, 'includes', 'views')

id_pattern = re.compile(r'\sid\s*=\s*["\']([^"\']+)["\']', re.IGNORECASE)
hidden_pattern = re.compile(r'<input[^>]*type\s*=\s*["\']hidden["\']', re.IGNORECASE)

print("=== ESCANEO DE ATRIBUTOS ID EN VISTAS ===")
id_count = 0
for root, dirs, files in os.walk(views_dir):
    for f in files:
        if f.endswith('.php'):
            p = os.path.join(root, f)
            rel = os.path.relpath(p, project_dir)
            with open(p, 'r', encoding='utf-8', errors='ignore') as file:
                for idx, line in enumerate(file, 1):
                    matches = id_pattern.findall(line)
                    if matches:
                        id_count += len(matches)
                        print(f"{rel}:{idx} -> IDs: {matches}")

print(f"\nTotal atributos ID encontrados: {id_count}")

print("\n=== ESCANEO DE INPUTS HIDDEN EN VISTAS ===")
hidden_count = 0
for root, dirs, files in os.walk(views_dir):
    for f in files:
        if f.endswith('.php'):
            p = os.path.join(root, f)
            rel = os.path.relpath(p, project_dir)
            with open(p, 'r', encoding='utf-8', errors='ignore') as file:
                for idx, line in enumerate(file, 1):
                    if hidden_pattern.search(line):
                        hidden_count += 1
                        print(f"{rel}:{idx} -> {line.strip()[:100]}")

print(f"\nTotal inputs hidden encontrados: {hidden_count}")
