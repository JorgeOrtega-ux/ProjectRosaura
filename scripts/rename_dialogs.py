import os

def rename_files_and_references():
    js_dir = os.path.join("public", "assets", "js")
    
    # 1. Renombrar los archivos físicos si existen
    dialog_system_path = os.path.join(js_dir, "core", "components", "DialogSystem.js")
    modal_system_path = os.path.join(js_dir, "core", "components", "ModalSystem.js")
    dialog_templates_path = os.path.join(js_dir, "core", "components", "DialogTemplates.js")
    modal_templates_path = os.path.join(js_dir, "core", "components", "ModalTemplates.js")

    renamed_files = []
    
    if os.path.exists(dialog_system_path):
        os.rename(dialog_system_path, modal_system_path)
        renamed_files.append((dialog_system_path, modal_system_path))
        print(f"Renombrado: {dialog_system_path} -> {modal_system_path}")
    else:
        print(f"No se encontró: {dialog_system_path} o ya fue renombrado")

    if os.path.exists(dialog_templates_path):
        os.rename(dialog_templates_path, modal_templates_path)
        renamed_files.append((dialog_templates_path, modal_templates_path))
        print(f"Renombrado: {dialog_templates_path} -> {modal_templates_path}")
    else:
        print(f"No se encontró: {dialog_templates_path} o ya fue renombrado")

    # 2. Definir los reemplazos ordenados de mayor especificidad a menor
    replacements = [
        ("DialogSystem.js", "ModalSystem.js"),
        ("DialogTemplates.js", "ModalTemplates.js"),
        ("DialogSystem", "ModalSystem"),
        ("DialogTemplates", "ModalTemplates"),
        ("dialogSystem", "modalSystem")
    ]

    modified_files_count = 0
    total_replacements = 0

    # 3. Escanear todos los archivos JS en public/assets/js
    for root, dirs, files in os.walk(js_dir):
        for file in files:
            if file.endswith(".js"):
                file_path = os.path.join(root, file)
                
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                except UnicodeDecodeError:
                    # En caso de que no sea UTF-8 puro
                    try:
                        with open(file_path, "r", encoding="latin-1") as f:
                            content = f.read()
                    except Exception as e:
                        print(f"Error leyendo {file_path}: {e}")
                        continue
                
                new_content = content
                file_replaced_count = 0
                
                for old, new in replacements:
                    occurrences = new_content.count(old)
                    if occurrences > 0:
                        new_content = new_content.replace(old, new)
                        file_replaced_count += occurrences
                
                if file_replaced_count > 0:
                    try:
                        with open(file_path, "w", encoding="utf-8") as f:
                            f.write(new_content)
                        modified_files_count += 1
                        total_replacements += file_replaced_count
                        print(f"Modificado: {file_path} ({file_replaced_count} reemplazos)")
                    except Exception as e:
                        print(f"Error escribiendo {file_path}: {e}")

    print("\n--- Resumen de la Migración ---")
    print(f"Archivos renombrados físicamente: {len(renamed_files)}")
    print(f"Archivos JS modificados: {modified_files_count}")
    print(f"Total de reemplazos de texto realizados: {total_replacements}")

if __name__ == "__main__":
    rename_files_and_references()
