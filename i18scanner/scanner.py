import os
import re
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

# --- CONFIGURACIÓN ---
WORDS_FILE = 'word.txt'
# Directorio raíz del proyecto
TARGET_DIR = '../' 

# Carpetas que el buscador va a ignorar para no dar falsos positivos
IGNORE_DIRS = {
    '.git', 'vendor', 'node_modules', 'docker', 'storage', 
    'public/assets/img', 'translations', 'i18scanner'
}

# Extensiones de archivos que queremos ignorar (imágenes, fuentes, binarios, media, etc.)
# Permitirá buscar en .yml, .json, .lock, .php, .js y cualquier otro archivo de texto
IGNORE_EXTENSIONS = {
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp', '.tiff',
    '.pdf', '.zip', '.rar', '.tar', '.gz', '.7z',
    '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flac',
    '.ttf', '.otf', '.woff', '.woff2', '.eot',
    '.exe', '.dll', '.so', '.dylib', '.bin', '.db', '.sqlite', '.mo', '.po'
}

# Códigos de colores ANSI para la consola
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def load_words(filepath):
    """Carga las palabras del archivo txt"""
    with open(filepath, 'r', encoding='utf-8') as f:
        # Usar set para evitar duplicados
        return set([line.strip().lower() for line in f if line.strip()])

def search_in_file(filepath, words_pattern):
    """Busca las palabras en un archivo usando una expresión regular compilada"""
    results = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                # Buscamos coincidencias
                matches = words_pattern.findall(line.lower())
                for match in matches:
                    results.append((line_num, match, line.strip()))
    except (UnicodeDecodeError, OSError):
        # Ignora archivos binarios, accesos directos rotos o con mala codificación
        pass
    return results

def get_files_to_scan(target_path):
    """Genera una lista de todos los archivos válidos para escanear"""
    files_to_scan = []
    for root, dirs, files in os.walk(target_path):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext not in IGNORE_EXTENSIONS:
                filepath = os.path.join(root, file)
                if os.path.isfile(filepath):
                    files_to_scan.append(filepath)
    return files_to_scan

def main():
    start_time = time.time()
    script_dir = os.path.dirname(os.path.abspath(__file__))
    words_path = os.path.join(script_dir, WORDS_FILE)
    target_path = os.path.abspath(os.path.join(script_dir, TARGET_DIR))

    if not os.path.exists(words_path):
        print(f"{Colors.FAIL}Error: No se encontró el archivo {WORDS_FILE}{Colors.ENDC}")
        return

    words_to_search = load_words(words_path)
    # Crear un solo regex gigantesco (es mucho más eficiente que un bucle interno)
    escaped_words = [re.escape(w) for w in words_to_search]
    pattern_string = r'\b(' + '|'.join(escaped_words) + r')\b'
    words_pattern = re.compile(pattern_string, re.IGNORECASE)

    print(f"{Colors.HEADER}{Colors.BOLD}Iniciando escaneo avanzado de Internacionalización...{Colors.ENDC}")
    print(f"Buscando {Colors.BLUE}{len(words_to_search)}{Colors.ENDC} palabras clave.")
    
    files_to_scan = get_files_to_scan(target_path)
    print(f"Archivos a escanear: {Colors.BLUE}{len(files_to_scan)}{Colors.ENDC} en {target_path}\n")

    found_issues = 0
    results_by_file = {}

    # Escaneo paralelo usando hilos para mayor velocidad
    with ThreadPoolExecutor(max_workers=8) as executor:
        future_to_file = {executor.submit(search_in_file, filepath, words_pattern): filepath for filepath in files_to_scan}
        
        for future in as_completed(future_to_file):
            filepath = future_to_file[future]
            matches = future.result()
            
            if matches:
                rel_path = os.path.relpath(filepath, target_path)
                results_by_file[rel_path] = matches
                found_issues += len(matches)
                
                print(f"{Colors.WARNING}📁 Encontrado en: {rel_path}{Colors.ENDC} ({len(matches)} coincidencias)")

    # Generar Reporte Markdown
    reports_dir = os.path.join(script_dir, 'reports')
    os.makedirs(reports_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    report_file = os.path.join(reports_dir, f'scan_report_{timestamp}.md')

    with open(report_file, 'w', encoding='utf-8') as f:
        f.write("# Reporte de Escaneo de Internacionalización\n\n")
        f.write(f"**Fecha:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"**Archivos escaneados:** {len(files_to_scan)}\n")
        f.write(f"**Palabras buscadas:** {len(words_to_search)}\n")
        f.write(f"**Tiempo de ejecución:** {round(time.time() - start_time, 2)} segundos\n\n")
        
        for rel_path, matches in sorted(results_by_file.items()):
            f.write(f"## 📁 Archivo: `{rel_path}`\n\n")
            f.write("| Línea | Palabra | Código |\n")
            f.write("|---|---|---|\n")
            
            processed_lines = set()
            for line_num, word, line_content in matches:
                if line_num not in processed_lines:
                    preview = line_content[:120] + "..." if len(line_content) > 120 else line_content
                    preview = preview.replace('|', '\\|').replace('`', '\\`').replace('<', '&lt;').replace('>', '&gt;')
                    f.write(f"| {line_num} | **{word}** | `{preview}` |\n")
                    processed_lines.add(line_num)
            f.write("\n")
            
        f.write(f"\n✅ **Búsqueda completada.** Se encontraron **{found_issues}** posibles textos hardcodeados.\n")

    time_taken = round(time.time() - start_time, 2)
    print(f"\n{Colors.GREEN}{Colors.BOLD}✅ Búsqueda completada en {time_taken}s.{Colors.ENDC}")
    print(f"Se encontraron {Colors.FAIL}{found_issues}{Colors.ENDC} coincidencias en {Colors.WARNING}{len(results_by_file)}{Colors.ENDC} archivos.")
    print(f"📄 Reporte detallado generado en: {Colors.BLUE}{report_file}{Colors.ENDC}")

if __name__ == '__main__':
    main()