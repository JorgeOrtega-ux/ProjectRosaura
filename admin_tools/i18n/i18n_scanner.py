import os
import re
import json
import time
from datetime import datetime

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def load_json_keys(json_dir):
    keys = set()
    for root, _, files in os.walk(json_dir):
        for file in files:
            if file.endswith('.json'):
                try:
                    with open(os.path.join(root, file), 'r', encoding='utf-8-sig') as f:
                        data = json.load(f)
                        def extract_keys(d, prefix=''):
                            for k, v in d.items():
                                if isinstance(v, dict):
                                    extract_keys(v, prefix + k + '.')
                                else:
                                    keys.add(prefix + k)
                                keys.add(k)
                        extract_keys(data)
                except Exception as e:
                    print(f"{Colors.FAIL}Error reading {file}: {e}{Colors.ENDC}")
    return keys

def run_scanner(project_root, script_dir):
    print(f"\n{Colors.HEADER}{Colors.BOLD}--- Escáner de Traducciones (i18n) ---{Colors.ENDC}")
    
    # 1. Cargar claves de los JSONs
    translations_dir = os.path.join(project_root, 'translations')
    if not os.path.exists(translations_dir):
        print(f"{Colors.FAIL}Directorio de traducciones no encontrado: {translations_dir}{Colors.ENDC}")
        return

    print(f"[*] Analizando archivos JSON en {translations_dir}...")
    existing_keys = load_json_keys(translations_dir)
    print(f"{Colors.GREEN}[+] Se encontraron {len(existing_keys)} claves únicas en los archivos JSON.{Colors.ENDC}\n")

    # 2. Escanear código fuente
    ignore_dirs = {'.git', 'vendor', 'node_modules', 'docker', 'storage', 'admin_tools', 'translations'}
    target_exts = ('.php', '.js')
    
    # Regex for PHP __("key") and JS _t("key")
    pattern = re.compile(r'(?:__|_\s*t)\(\s*[\'"]([a-zA-Z0-9_\-\.]+)[\'"]')
    
    found_keys = set()
    files_scanned = 0
    
    print(f"[*] Escaneando archivos fuente (.php, .js) en {project_root}...")
    for root, dirs, files in os.walk(project_root):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        for file in files:
            if file.endswith(target_exts):
                filepath = os.path.join(root, file)
                files_scanned += 1
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                        matches = pattern.findall(content)
                        for match in matches:
                            found_keys.add(match)
                except Exception:
                    pass

    print(f"{Colors.GREEN}[+] Se escanearon {files_scanned} archivos.{Colors.ENDC}")
    print(f"{Colors.GREEN}[+] Se encontraron {len(found_keys)} claves de traducción en el código.{Colors.ENDC}\n")

    # 3. Comparar
    missing_keys = found_keys - existing_keys
    
    if not missing_keys:
        print(f"{Colors.GREEN}{Colors.BOLD}¡Excelente! Todas las claves encontradas en el código existen en los archivos JSON.{Colors.ENDC}")
    else:
        print(f"{Colors.WARNING}Se encontraron {len(missing_keys)} claves en el código que NO ESTÁN en los JSONs.{Colors.ENDC}")
        
    # 4. Guardar reporte
    reports_dir = os.path.join(script_dir, 'reports')
    os.makedirs(reports_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    report_file = os.path.join(reports_dir, f'missing_translations_{timestamp}.txt')
    
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write("=== REPORTE DE TRADUCCIONES FALTANTES ===\n")
        f.write(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Archivos escaneados: {files_scanned}\n")
        f.write(f"Claves en código: {len(found_keys)}\n")
        f.write(f"Claves en JSON: {len(existing_keys)}\n")
        f.write(f"Claves faltantes: {len(missing_keys)}\n\n")
        
        if missing_keys:
            f.write("=== LISTA DE CLAVES FALTANTES ===\n")
            for key in sorted(missing_keys):
                f.write(f"{key}\n")
        else:
            f.write("No faltan traducciones. ¡Todo está en orden!\n")
            
    print(f"📄 Reporte generado y guardado en: {Colors.BLUE}{report_file}{Colors.ENDC}\n")
