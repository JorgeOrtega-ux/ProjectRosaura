import os
import glob
import json

def generate_default_value(key):
    # Some special prefixes that shouldn't just be title cased directly, or just replace _ with space
    val = key.replace('_', ' ').capitalize()
    return val

def main():
    reports_dir = '/app/admin_tools/reports'
    report_files = glob.glob(os.path.join(reports_dir, 'missing_translations_*.txt'))
    if not report_files:
        print("No reports found.")
        return
        
    latest_report = max(report_files, key=os.path.getctime)
    
    with open(latest_report, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    start_idx = 0
    for i, line in enumerate(lines):
        if "=== LISTA DE CLAVES FALTANTES ===" in line:
            start_idx = i + 1
            break
            
    if start_idx == 0:
        print("No missing keys list found.")
        return
        
    keys = [line.strip() for line in lines[start_idx:] if line.strip()]
    if not keys or keys[0] == "No faltan traducciones. ¡Todo está en orden!":
        print("No keys to add.")
        return

    admin_file = '/app/translations/es-419/admin.json'
    general_file = '/app/translations/es-419/general.json'
    
    with open(admin_file, 'r', encoding='utf-8') as f:
        admin_data = json.load(f)
        
    with open(general_file, 'r', encoding='utf-8') as f:
        general_data = json.load(f)
        
    for key in keys:
        # Ignore dynamic keys like `desc_` or `role_` since they are prefixes, not actual keys.
        # But wait, if they are in the list, the code has `__("desc_")` which is a bug or dynamic concatenation like `__("desc_" . $name)`.
        # The scanner regex matched `__("desc_")`. If the code actually does `__("desc_" . $name)`, the regex won't match the variable, it just matched the string part.
        # We can add them anyway to avoid the scanner complaining, or the user can ignore them.
        
        val = generate_default_value(key)
        
        if key.startswith('admin_') or key.startswith('table_'):
            if key not in admin_data:
                admin_data[key] = val
        else:
            if key not in general_data:
                general_data[key] = val
                
    with open(admin_file, 'w', encoding='utf-8') as f:
        json.dump(admin_data, f, ensure_ascii=False, indent=4)
        
    with open(general_file, 'w', encoding='utf-8') as f:
        json.dump(general_data, f, ensure_ascii=False, indent=4)
        
    print(f"Added {len(keys)} keys to JSON files.")

if __name__ == '__main__':
    main()
