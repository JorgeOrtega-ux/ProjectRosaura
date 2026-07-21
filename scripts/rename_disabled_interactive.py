import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

EXCLUDE_DIRS = {'.git', 'node_modules', 'vendor', '__pycache__', '.idea', '.vscode', 'storage'}
BINARY_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.tar', '.gz', '.7z', '.pyc', '.exe', '.dll', '.so', '.db', '.sqlite', '.tff', '.woff', '.woff2', '.eot', '.enc'}

def is_text_file(filepath):
    ext = os.path.splitext(filepath)[1].lower()
    if ext in BINARY_EXTENSIONS:
        return False
    return True

def main():
    target_str = 'disabled-interaction'
    replacement_str = 'disabled-interaction'
    
    modified_count = 0
    replacement_total = 0

    for root, dirs, files in os.walk(PROJECT_ROOT):
        # Filter out excluded directories
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

        for file in files:
            filepath = os.path.join(root, file)
            if not is_text_file(filepath):
                continue

            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()

                if target_str in content:
                    occurrences = content.count(target_str)
                    new_content = content.replace(target_str, replacement_str)

                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)

                    modified_count += 1
                    replacement_total += occurrences
                    rel_path = os.path.relpath(filepath, PROJECT_ROOT)
                    print(f"[+] Replaced {occurrences} occurrence(s) in: {rel_path}")

            except Exception as e:
                print(f"[!] Error processing {filepath}: {e}")

    print(f"\n[*] Complete! Replaced {replacement_total} occurrence(s) across {modified_count} file(s).")

if __name__ == '__main__':
    main()
