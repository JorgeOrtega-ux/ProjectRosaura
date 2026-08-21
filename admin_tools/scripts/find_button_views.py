import os
import re
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

script_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.abspath(os.path.join(script_dir, '../../'))

target_dirs = [
    os.path.join(project_dir, 'includes', 'views'),
    os.path.join(project_dir, 'includes', 'modules'),
    os.path.join(project_dir, 'includes', 'layouts'),
    os.path.join(project_dir, 'public', 'assets', 'js')
]

valid_extensions = ('.php', '.html', '.phtml', '.js')
excluded_dirs = {'vendor', 'node_modules', '.git', 'storage', 'css', 'vendor_assets', 'sounds', 'dist'}

def scan_buttons():
    results = {}
    button_types_count = {}
    
    # Regex para extraer cualquier variante de component-button
    btn_variant_regex = re.compile(r'component-button(?:--[a-zA-Z0-9_-]+)?')

    scanned_files = set()

    for target in target_dirs:
        if not os.path.exists(target):
            continue
        
        for root, dirs, files in os.walk(target):
            dirs[:] = [d for d in dirs if d not in excluded_dirs and not d.startswith('.')]
            
            for f in files:
                if f.endswith(valid_extensions):
                    filepath = os.path.join(root, f)
                    if filepath in scanned_files:
                        continue
                    scanned_files.add(filepath)
                    
                    rel_path = os.path.relpath(filepath, project_dir).replace('\\', '/')
                    
                    try:
                        with open(filepath, 'r', encoding='utf-8', errors='ignore') as fh:
                            for line_idx, line in enumerate(fh, 1):
                                if 'component-button--primary' in line or 'button--primary' in line:
                                    if rel_path not in results:
                                        results[rel_path] = []
                                    results[rel_path].append((line_idx, line.strip()))
                                
                                # Conteo general de variantes
                                for match in btn_variant_regex.findall(line):
                                    button_types_count[match] = button_types_count.get(match, 0) + 1
                    except Exception as e:
                        print(f"Error leyendo {rel_path}: {e}", file=sys.stderr)

    return results, button_types_count

if __name__ == '__main__':
    print("=" * 90)
    print(" REPORTE DE USO: 'component-button--primary' EN VISTAS Y PLANTILLAS")
    print("=" * 90)
    
    results, variants_count = scan_buttons()
    
    # Categorización
    cat_php_views = {}
    cat_php_modules = {}
    cat_js_templates = {}
    cat_others = {}
    
    for file_path, items in sorted(results.items()):
        if file_path.startswith("includes/views/"):
            cat_php_views[file_path] = items
        elif file_path.startswith("includes/modules/") or file_path.startswith("includes/layouts/"):
            cat_php_modules[file_path] = items
        elif "Templates.js" in file_path or file_path.startswith("public/assets/js/core/components/"):
            cat_js_templates[file_path] = items
        else:
            cat_others[file_path] = items

    def print_section(title, data_dict):
        print(f"\n[+] {title} ({len(data_dict)} archivos):")
        print("-" * 90)
        for fpath, lines in data_dict.items():
            print(f"\n📁 {fpath} ({len(lines)} usos):")
            for lno, text in lines:
                trimmed = text if len(text) <= 130 else text[:127] + "..."
                print(f"   L{lno:<4d}: {trimmed}")

    if cat_php_views:
        print_section("1. VISTAS PHP (includes/views/)", cat_php_views)
    if cat_php_modules:
        print_section("2. MODULOS / LAYOUTS PHP (includes/modules/ & layouts/)", cat_php_modules)
    if cat_js_templates:
        print_section("3. PLANTILLAS DE VISTA / MODALES JS (Templates)", cat_js_templates)
    if cat_others:
        print_section("4. CONTROLADORES / LOGICA JS ASOCIADA A VISTAS", cat_others)

    print("\n" + "=" * 90)
    print(" RESUMEN GENERAL")
    print("=" * 90)
    print(f"Total de archivos que usan 'component-button--primary': {len(results)}")
    print(f"Total de ocurrencias encontradas: {sum(len(v) for v in results.values())}")
    print("\nOtras clases de botones detectadas en el proyecto:")
    for variant, count in sorted(variants_count.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f" - {variant:<30}: {count} veces")
    print("=" * 90)
