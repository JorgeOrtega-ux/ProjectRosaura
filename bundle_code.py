import os

# Configuración
OUTPUT_FILE = "proyecto_contexto_gemini.txt"
# Carpetas que NO queremos meter en el archivo de texto
IGNORE_DIRS = {
    '.git', 'node_modules', 'vendor', '.docker', 
    'storage', 'cache', '__pycache__', '.pytest_cache'
}
# Extensiones de código legibles que te interesa que Gemini analice
ALLOWED_EXTENSIONS = {
    '.php', '.js', '.css', '.py', '.sql', '.json', '.html', '.md'
}

def build_context():
    print("Generando archivo de contexto para Gemini...")
    total_files = 0
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as outfile:
        # Recorrer todo el directorio actual
        for root, dirs, files in os.walk('.'):
            # Modificar dirs in-place para que os.walk ignore las carpetas prohibidas
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in ALLOWED_EXTENSIONS:
                    file_path = os.path.join(root, file)
                    # Normalizar la ruta para que se vea limpia (ej: ./src/AdminController.php)
                    clean_path = file_path.replace('\\', '/')
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as infile:
                            content = infile.read()
                            
                            # Escribir el delimitador que Gemini entiende perfectamente
                            outfile.write(f"\n--- START OF FILE: {clean_path} ---\n")
                            outfile.write(content)
                            outfile.write(f"\n--- END OF FILE: {clean_path} ---\n")
                            
                            total_files += 1
                            print(f"Incluido: {clean_path}")
                    except Exception as e:
                        print(f"Error al leer {clean_path}: {e}")
                        
    print(f"\n¡Listo! Se unificaron {total_files} archivos en '{OUTPUT_FILE}'.")

if __name__ == "__main__":
    build_context()