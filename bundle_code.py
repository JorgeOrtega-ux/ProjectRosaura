import os

# Carpeta donde se guardarán los TXT
OUTPUT_DIR = "contexto_gemini"

# Carpetas a ignorar
IGNORE_DIRS = {
    ".git",
    "node_modules",
    "vendor",
    ".docker",
    "storage",
    "cache",
    "__pycache__",
    ".pytest_cache",
}

# Relación extensión -> archivo de salida
LANGUAGE_FILES = {
    ".php": "php.txt",
    ".js": "javascript.txt",
    ".css": "css.txt",
    ".py": "python.txt",
    ".sql": "sql.txt",
    ".json": "json.txt",
    ".html": "html.txt",
    ".md": "markdown.txt",
}


def build_context():
    print("Generando archivos de contexto...")

    # Crear carpeta de salida
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Abrir un archivo por lenguaje
    output_files = {}

    try:
        for filename in set(LANGUAGE_FILES.values()):
            path = os.path.join(OUTPUT_DIR, filename)
            output_files[filename] = open(path, "w", encoding="utf-8")

        total_files = 0

        for root, dirs, files in os.walk("."):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

            for file in files:
                ext = os.path.splitext(file)[1].lower()

                if ext not in LANGUAGE_FILES:
                    continue

                file_path = os.path.join(root, file)
                clean_path = file_path.replace("\\", "/")

                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as infile:
                        content = infile.read()

                    out = output_files[LANGUAGE_FILES[ext]]

                    out.write(f"\n--- START OF FILE: {clean_path} ---\n")
                    out.write(content)
                    out.write(f"\n--- END OF FILE: {clean_path} ---\n\n")

                    total_files += 1
                    print(f"Incluido: {clean_path}")

                except Exception as e:
                    print(f"Error al leer {clean_path}: {e}")

    finally:
        for f in output_files.values():
            f.close()

    print(f"\n¡Listo! Se procesaron {total_files} archivos.")
    print(f"Los archivos fueron guardados en la carpeta '{OUTPUT_DIR}'.")


if __name__ == "__main__":
    build_context()