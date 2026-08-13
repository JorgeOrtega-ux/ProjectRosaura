import os
import sys
import re
import time
import json
import random
import string
import subprocess
import urllib.request
import urllib.parse
from http.cookiejar import CookieJar
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# --- CONFIGURACIÓN ---
WORDS_FILE = 'data/word.txt'
TARGET_DIR = '../' 

IGNORE_DIRS = {
    '.git', 'vendor', 'node_modules', 'docker', 'storage', 
    'public/assets/img', 'translations', 'admin_tools', 'i18scanner'
}

IGNORE_EXTENSIONS = {
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp', '.tiff',
    '.pdf', '.zip', '.rar', '.tar', '.gz', '.7z',
    '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flac',
    '.ttf', '.otf', '.woff', '.woff2', '.eot',
    '.exe', '.dll', '.so', '.dylib', '.bin', '.db', '.sqlite', '.mo', '.po'
}

# Extensiones válidas para el escaneo i18n (solo vistas y lógica de frontend/backend)
I18N_TARGET_EXTENSIONS = {'.php', '.js'}

# Palabras de programación en inglés que colisionan con palabras en español.
# Estas son identificadores de código legítimos, no texto de usuario hardcodeado.
PROGRAMMING_KEYWORDS = {
    'use', 'catch', 'false', 'true', 'input', 'data', 'set', 'role', 'roles',
    'error', 'file', 'files', 'active', 'date', 'response', 'prepare', 'time',
    'cancel', 'invite', 'invites', 'bonus', 'color', 'colors', 'base', 'id',
    'no', 're', 'as', 'are', 'has', 'not', 'var', 'let', 'do', 'in', 'if',
    'else', 'for', 'new', 'null', 'return', 'this', 'class', 'function',
    'import', 'export', 'from', 'const', 'static', 'public', 'private',
    'protected', 'abstract', 'interface', 'namespace', 'try', 'throw',
    'extends', 'implements', 'echo', 'print', 'list', 'array', 'object',
    'string', 'int', 'float', 'bool', 'void', 'type', 'enum', 'struct',
    'match', 'mod', 'move', 'ref', 'self', 'super', 'trait', 'where', 'with',
    'async', 'await', 'break', 'continue', 'loop', 'while', 'map', 'ok',
    'some', 'none', 'option', 'result', 'value', 'key', 'name', 'mode',
    'api', 'spa', 'url', 'uri', 'http', 'https', 'html', 'css', 'json',
    'null', 'true', 'false', 'undefined', 'nan', 'number', 'boolean',
    'constructor', 'prototype', 'event', 'target', 'source', 'node',
    'global', 'local', 'module', 'default', 'index', 'root', 'path',
    'host', 'port', 'user', 'pass', 'token', 'hash', 'salt', 'code',
    'test', 'spec', 'mock', 'stub', 'assert', 'expect', 'describe', 'it',
    'error', 'warning', 'info', 'debug', 'log', 'trace', 'fatal',
    'get', 'set', 'post', 'put', 'delete', 'patch', 'head', 'options',
    'request', 'response', 'header', 'body', 'query', 'param', 'form',
    'status', 'code', 'message', 'data', 'result', 'success', 'error',
    'start', 'stop', 'run', 'init', 'load', 'save', 'open', 'close',
    'read', 'write', 'send', 'receive', 'connect', 'disconnect', 'join',
    'split', 'trim', 'replace', 'match', 'search', 'find', 'filter',
    'map', 'reduce', 'sort', 'reverse', 'slice', 'splice', 'push', 'pop',
    'shift', 'unshift', 'concat', 'join', 'keys', 'values', 'entries',
    'has', 'get', 'set', 'add', 'delete', 'clear', 'size', 'length',
    'top', 'bottom', 'left', 'right', 'center', 'width', 'height',
    'position', 'display', 'flex', 'grid', 'block', 'inline', 'hidden',
    'visible', 'absolute', 'relative', 'fixed', 'auto', 'none', 'normal',
    'bold', 'italic', 'regular', 'light', 'dark', 'white', 'black', 'gray',
    'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'brown',
    'alpha', 'beta', 'delta', 'gamma', 'sigma', 'omega', 'lambda',
    'canvas', 'context', 'buffer', 'stream', 'channel', 'socket', 'proxy',
    'session', 'cookie', 'cache', 'store', 'queue', 'stack', 'list',
    'tree', 'graph', 'node', 'edge', 'vertex', 'root', 'leaf', 'branch',
    'idea', 'archive', 'data', 'web', 'net', 'app', 'server', 'client',
    'email', 'avatar', 'image', 'icon', 'logo', 'banner', 'badge', 'label',
    'input', 'output', 'log', 'alias', 'container', 'wrapper', 'slot',
    'central', 'business', 'modal', 'tab', 'panel', 'sidebar', 'menu',
    'header', 'footer', 'content', 'section', 'row', 'col', 'column',
    'plus', 'minus', 'times', 'divide', 'equal', 'less', 'greater',
    'and', 'or', 'not', 'xor', 'bit', 'byte', 'char', 'text', 'hex',
    'base', 'offset', 'index', 'limit', 'max', 'min', 'sum', 'avg',
    'count', 'total', 'used', 'free', 'busy', 'idle', 'ready', 'done',
    'ok', 'fail', 'pass', 'skip', 'next', 'prev', 'first', 'last',
    'version', 'release', 'build', 'tag', 'ref', 'commit', 'branch', 'fork',
    'rules', 'uses', 'note', 'feedback', 'rule', 'action', 'handler',
    'worker', 'job', 'task', 'process', 'thread', 'fiber', 'coroutine',
    'suspend', 'resume', 'abort', 'reset', 'flush', 'drain', 'pause',
    'play', 'seek', 'mute', 'volume', 'rate', 'speed', 'frame', 'tick',
    'event', 'trigger', 'emit', 'on', 'off', 'once', 'listener', 'callback',
    'promise', 'resolve', 'reject', 'then', 'catch', 'finally', 'async',
    'file', 'dir', 'path', 'name', 'ext', 'size', 'type', 'mode', 'perm',
    'link', 'symlink', 'mount', 'unmount', 'drive', 'volume', 'disk',
    'cpu', 'ram', 'gpu', 'io', 'net', 'mem', 'sys', 'os', 'env',
    'date', 'time', 'now', 'today', 'year', 'month', 'day', 'hour',
    'minute', 'second', 'ms', 'ns', 'us', 'timestamp', 'interval',
    'timeout', 'delay', 'sleep', 'wait', 'poll', 'retry', 'backoff',
    'error', 'exception', 'panic', 'fatal', 'critical', 'alert', 'notice',
    'active', 'inactive', 'enabled', 'disabled', 'locked', 'unlocked',
    'pending', 'running', 'stopped', 'failed', 'completed', 'cancelled',
    'public', 'private', 'protected', 'internal', 'external', 'open', 'closed',
    'raw', 'encoded', 'decoded', 'encrypted', 'decrypted', 'signed', 'verified',
    'fa', 'i', 'j', 'k', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'z',
    'has', 'is', 'to', 'be', 'of', 'in', 'on', 'at', 'by', 'up', 'go',
    'la', 'de', 'al', 'tu', 'el', 'un', 'y', 'a', 'o', 'lo', 'le', 'me',
    'si', 'ya', 'mi', 'su', 'te', 'se', 'no', 'en', 'es', 'ha', 'he',
    'api', 'db', 'sql', 'orm', 'mvc', 'spa', 'ssr', 'csr', 'jwt', 'oauth',
    'id', 'uuid', 'guid', 'md5', 'sha', 'aes', 'rsa', 'ssl', 'tls',
    'png', 'jpg', 'gif', 'svg', 'mp3', 'mp4', 'pdf', 'zip', 'csv', 'xml',
    'prepare', 'execute', 'fetch', 'query', 'bind', 'commit', 'rollback',
    'true', 'false', 'null', 'undefined', 'nan', 'infinity',
    'prototype', 'constructor', 'arguments', 'caller', 'callee',
    'abstract', 'boolean', 'byte', 'char', 'double', 'final', 'float',
    'goto', 'implements', 'instanceof', 'interface', 'long', 'native',
    'package', 'short', 'strictfp', 'super', 'synchronized', 'throws',
    'transient', 'volatile', 'assert', 'override', 'virtual', 'sealed',
    'record', 'yield', 'match', 'when', 'unless', 'until', 'repeat',
    'color', 'colour', 'role', 'file', 'style', 'class', 'item', 'view',
    'modal', 'dialog', 'popup', 'toast', 'alert', 'confirm', 'prompt',
    'form', 'field', 'label', 'input', 'button', 'link', 'image', 'video',
    'table', 'row', 'cell', 'column', 'grid', 'list', 'item', 'card',
    'nav', 'tabs', 'steps', 'wizard', 'drawer', 'dropdown', 'select',
    'check', 'radio', 'toggle', 'switch', 'slider', 'range', 'spinner',
    'loader', 'skeleton', 'placeholder', 'empty', 'blank', 'void',
    'roles', 'rules', 'files', 'errors', 'items', 'nodes', 'links', 'pages',
    'active', 'inactive', 'open', 'closed', 'visible', 'hidden', 'disabled',
    'valid', 'invalid', 'required', 'optional', 'readonly', 'editable',
    'sorted', 'filtered', 'grouped', 'paginated', 'cached', 'expired',
    'suspend', 'suspended', 'blocked', 'banned', 'muted', 'reported',
    'invite', 'invites', 'invited', 'inviting', 'join', 'joined', 'joining',
    'leave', 'left', 'leaving', 'kick', 'kicked', 'kicking', 'ban', 'banned',
    'post', 'posted', 'posting', 'comment', 'reply', 'replied', 'replying',
    'like', 'liked', 'liking', 'share', 'shared', 'sharing', 'follow',
    'followed', 'following', 'unfollow', 'unfollowed', 'unfollowing',
    'block', 'blocked', 'blocking', 'unblock', 'unblocked', 'unblocking',
    'report', 'reported', 'reporting', 'flag', 'flagged', 'flagging',
    'approve', 'approved', 'approving', 'reject', 'rejected', 'rejecting',
    'merge', 'merged', 'merging', 'split', 'archive', 'archived', 'archiving',
    'restore', 'restored', 'restoring', 'delete', 'deleted', 'deleting',
    'create', 'created', 'creating', 'update', 'updated', 'updating',
    'insert', 'inserted', 'inserting', 'select', 'selected', 'selecting',
    'load', 'loaded', 'loading', 'save', 'saved', 'saving', 'export',
    'exported', 'exporting', 'import', 'imported', 'importing', 'upload',
    'uploaded', 'uploading', 'download', 'downloaded', 'downloading',
    'start', 'started', 'starting', 'stop', 'stopped', 'stopping',
    'pause', 'paused', 'pausing', 'resume', 'resumed', 'resuming',
    'cancel', 'cancelled', 'cancelling', 'abort', 'aborted', 'aborting',
    'retry', 'retried', 'retrying', 'reset', 'resetting', 'refresh',
    'refreshing', 'reload', 'reloaded', 'reloading', 'redirect', 'redirecting',
    'scroll', 'scrolled', 'scrolling', 'click', 'clicked', 'clicking',
    'hover', 'hovered', 'hovering', 'focus', 'focused', 'focusing',
    'blur', 'blurred', 'blurring', 'resize', 'resized', 'resizing',
    'drag', 'dragged', 'dragging', 'drop', 'dropped', 'dropping',
    'submit', 'submitted', 'submitting', 'validate', 'validated', 'validating',
    'parse', 'parsed', 'parsing', 'compile', 'compiled', 'compiling',
    'render', 'rendered', 'rendering', 'mount', 'mounted', 'mounting',
    'unmount', 'unmounted', 'unmounting', 'destroy', 'destroyed', 'destroying',
}

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def load_env():
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    k = k.strip()
                    v = v.strip().strip("'").strip('"')
                    if k not in os.environ:
                        os.environ[k] = v

load_env()

def random_string(length=10):
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for _ in range(length))

def generate_svg_icons(target_path):
    import urllib.request
    import re
    import os
    import math

    print(f"\n{Colors.HEADER}{Colors.BOLD}Generando Sprite de Iconos SVG...{Colors.ENDC}")
    url = "https://raw.githubusercontent.com/google/material-design-icons/master/variablefont/MaterialSymbolsRounded%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints"
    
    print("Descargando lista oficial de iconos...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        response = urllib.request.urlopen(req)
        data = response.read().decode('utf-8')
        valid_icons = set([line.split()[0] for line in data.split('\n') if line.strip()])
        print(f"Se encontraron {len(valid_icons)} símbolos válidos de Material.")
        
        word_pattern = re.compile(r'\b([a-z0-9_]+)\b', re.IGNORECASE)
        found_icons = set()
        
        files_to_scan = get_files_to_scan(target_path)
        files_to_scan = [f for f in files_to_scan if f.lower().endswith(('.php', '.html', '.js', '.vue'))]
        
        for filepath in files_to_scan:
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    c = f.read()
                    words = set(word_pattern.findall(c))
                    found_icons.update(words.intersection(valid_icons))
            except Exception:
                pass
                
        print(f"Se encontraron {len(found_icons)} iconos usados en el proyecto.")
        if not found_icons:
            print("No hay iconos que generar.")
            return

        print("Descargando SVGs de los iconos...")
        icons_list = sorted(list(found_icons))
        svgs = []
        for icon in icons_list:
            svg_url = f"https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsrounded/{icon}/default/24px.svg"
            try:
                r = urllib.request.urlopen(svg_url)
                svg_data = r.read().decode('utf-8')
                match = re.search(r'(<path[^>]+>)', svg_data)
                if match:
                    svgs.append(match.group(1))
                else:
                    svgs.append("")
            except Exception as e:
                print(f"Error descargando {icon}: {e}")
                svgs.append("")

        print("Generando Sprite SVG y CSS...")
        COLS = 10
        ROWS = math.ceil(len(icons_list) / COLS)
        if ROWS == 0:
            ROWS = 1

        svg_content = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {COLS * 960} {ROWS * 960}">']
        css_content = [
            ".material-symbols-rounded, .msr {",
            "  display: inline-block;",
            "  font-size: 24px;",
            "  line-height: 1;",
            "  width: 1em;",
            "  height: 1em;",
            "  background-color: currentColor;",
            "  -webkit-mask-image: url('../icons/sprite.svg');",
            "  mask-image: url('../icons/sprite.svg');",
            f"  -webkit-mask-size: {COLS * 100}% {ROWS * 100}%;",
            f"  mask-size: {COLS * 100}% {ROWS * 100}%;",
            "  -webkit-mask-repeat: no-repeat;",
            "  mask-repeat: no-repeat;",
            "  vertical-align: -0.125em;",
            "  overflow: hidden;",
            "  white-space: nowrap;",
            "  text-indent: 100%;",
            "}"
        ]

        for idx, (icon, path) in enumerate(zip(icons_list, svgs)):
            if not path:
                continue
            col = idx % COLS
            row = idx // COLS
            
            transform = f"translate({col * 960}, {row * 960 + 960})"
            svg_content.append(f'  <g transform="{transform}">{path}</g>')
            
            x_pos = 0 if COLS == 1 else (col / (COLS - 1)) * 100
            y_pos = 0 if ROWS == 1 else (row / (ROWS - 1)) * 100
            
            css_content.append(f".msr-{icon} {{")
            css_content.append(f"  -webkit-mask-position: {x_pos:.4f}% {y_pos:.4f}%;")
            css_content.append(f"  mask-position: {x_pos:.4f}% {y_pos:.4f}%;")
            css_content.append("}")

        svg_content.append('</svg>')

        public_dir = os.path.join(target_path, 'public')
        icons_dir = os.path.join(public_dir, 'assets', 'icons')
        css_dir = os.path.join(public_dir, 'assets', 'css')
        os.makedirs(icons_dir, exist_ok=True)
        os.makedirs(css_dir, exist_ok=True)

        sprite_path = os.path.join(icons_dir, 'sprite.svg')
        css_path = os.path.join(css_dir, 'icons.css')

        with open(sprite_path, 'w', encoding='utf-8') as f:
            f.write("\n".join(svg_content))

        with open(css_path, 'w', encoding='utf-8') as f:
            f.write("\n".join(css_content))

        print(f"{Colors.GREEN}✅ Sprite guardado en {sprite_path}{Colors.ENDC}")
        print(f"{Colors.GREEN}✅ CSS guardado en {css_path}{Colors.ENDC}")

    except Exception as e:
        print(f"{Colors.FAIL}Error: {e}{Colors.ENDC}")

def load_words(filepath):
    """Carga las palabras del archivo txt"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return set([line.strip().lower() for line in f if line.strip()])

# Patrones de líneas de código puro que no pueden contener texto hardcodeado de usuario.
# Se excluyen del escaneo i18n para eliminar falsos positivos.
_CODE_LINE_PATTERNS = re.compile(
    r'^\s*('
    r'(import|use|from|require|include|namespace)\s'  # imports/namespaces
    r'|(?:public|private|protected|static|abstract|async|fn|func|def|pub|async\s+fn)\s+\w+'  # function/method decl
    r'|(?:class|interface|trait|enum|struct|type|record)\s+\w+'  # class/type decl
    r'|(?:const|let|var|this\.\w+\s*=\s*new)\s'  # var declarations with no strings
    r'|(?:\$this->|self::|static::)'  # PHP method chains
    r'|(?:catch\s*\()'  # catch blocks
    r'|(?:\/\/|\/\*|\*|#).*$'  # comments (entire comment lines)
    r')',
    re.IGNORECASE
)

# Patrón para detectar si una palabra aparece DENTRO de una cadena de texto,
# lo cual es más probable que sea texto hardcodeado real.
_STRING_CONTEXT_PATTERN = re.compile(r'["\']([^"\']*)["\']]')

def search_in_file(filepath, search_target):
    """Busca las palabras en un archivo usando un set de palabras con filtros anti-falsos-positivos"""
    results = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            if isinstance(search_target, set):
                word_pattern = re.compile(r'[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]+')
                # Patron para encontrar contenido dentro de strings
                string_content_re = re.compile(r'["\']([^"\'\n]*?)["\']')
                for line_num, line in enumerate(f, 1):
                    stripped = line.strip()
                    if not stripped:
                        continue
                    # Saltar líneas que son solo código puro (sin strings)
                    if _CODE_LINE_PATTERNS.match(stripped):
                        continue
                    # Saltar líneas sin ningun string literal entre comillas
                    string_matches = string_content_re.findall(stripped)
                    if not string_matches:
                        continue
                    # Solo buscar palabras dentro del contenido de los strings
                    already_reported = set()
                    for string_content in string_matches:
                        words_found = word_pattern.findall(string_content)
                        for w in words_found:
                            if len(w) <= 2:
                                continue
                            w_lower = w.lower()
                            if w_lower in PROGRAMMING_KEYWORDS:
                                continue
                            if w_lower in search_target and w_lower not in already_reported:
                                already_reported.add(w_lower)
                                results.append((line_num, w, line.strip()))
            else:
                for line_num, line in enumerate(f, 1):
                    matches = search_target.findall(line.lower())
                    for match in matches:
                        results.append((line_num, match, line.strip()))
    except (UnicodeDecodeError, OSError):
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
    print(f"{Colors.HEADER}{Colors.BOLD}Herramienta de Análisis del Proyecto{Colors.ENDC}")
    print("Selecciona el tipo de análisis:")
    print("1 - Identificar textos hardcodeados (Internacionalización)")
    print("2 - Identificar estilos inline (style=\"...\") en archivos PHP y JS")
    print("3 - Identificar código de depuración (console.log, var_dump, etc.)")
    print("4 - Generar Sprite de Iconos SVG")
    print("5 - Escanear claves de traducción (_t y __) y comprobar JSONs")
    choice = input(f"{Colors.WARNING}Ingresa 1, 2, 3, 4 o 5: {Colors.ENDC}").strip()

    if choice not in ('1', '2', '3', '4', '5'):
        print(f"{Colors.FAIL}Opción no válida. Saliendo.{Colors.ENDC}")
        return

    start_time = time.time()
    script_dir = os.path.dirname(os.path.abspath(__file__))
    target_path = os.path.abspath(os.path.join(script_dir, TARGET_DIR))

    if choice == '4':
        generate_svg_icons(target_path)
        return

    if choice == '5':
        from i18n import i18n_scanner
        i18n_scanner.run_scanner(target_path, script_dir)
        return

    if choice == '1':
        words_path = os.path.join(script_dir, WORDS_FILE)
        if not os.path.exists(words_path):
            print(f"{Colors.FAIL}Error: No se encontró el archivo {WORDS_FILE}{Colors.ENDC}")
            return
        words_to_search = load_words(words_path)
        search_pattern = words_to_search
        print(f"{Colors.HEADER}{Colors.BOLD}Starting advanced i18n scan...{Colors.ENDC}")
        print(f"Searching for {Colors.BLUE}{len(words_to_search)}{Colors.ENDC} keywords.")
        report_title = "Internationalization Scan Report"
    elif choice == '2':
        search_pattern = re.compile(r'\sstyle\s*=\s*["\'][^"\']*["\']', re.IGNORECASE)
        print(f"{Colors.HEADER}{Colors.BOLD}Starting inline style search in PHP and JS files...{Colors.ENDC}")
        report_title = "Inline Styles Report"
    else:
        debug_funcs = [r'console\.log\(', r'print_r\(', r'var_dump\(', r'die\(', r'exit\(']
        search_pattern = re.compile('(' + '|'.join(debug_funcs) + ')', re.IGNORECASE)
        print(f"{Colors.HEADER}{Colors.BOLD}Starting debug functions search...{Colors.ENDC}")
        report_title = "Debug Code Report"

    files_to_scan = get_files_to_scan(target_path)
    if choice == '1':
        files_to_scan = [
            f for f in files_to_scan
            if os.path.splitext(f)[1].lower() in I18N_TARGET_EXTENSIONS
            and not os.path.basename(f).startswith('.')
            and '.min.' not in os.path.basename(f)
            and 'emailtemplates.php' not in f.lower()
        ]
    elif choice == '2':
        files_to_scan = [f for f in files_to_scan if f.lower().endswith(('.php', '.js')) and 'emailtemplates.php' not in f.lower()]
    elif choice == '3':
        files_to_scan = [f for f in files_to_scan if f.lower().endswith(('.php', '.js', '.ts', '.vue'))]

    print(f"Files to scan: {Colors.BLUE}{len(files_to_scan)}{Colors.ENDC} in {target_path}\n")

    found_issues = 0
    results_by_file = {}

    with ThreadPoolExecutor(max_workers=8) as executor:
        future_to_file = {executor.submit(search_in_file, filepath, search_pattern): filepath for filepath in files_to_scan}
        
        for future in as_completed(future_to_file):
            filepath = future_to_file[future]
            matches = future.result()
            
            if matches:
                rel_path = os.path.relpath(filepath, target_path)
                results_by_file[rel_path] = matches
                found_issues += len(matches)
                
                print(f"{Colors.WARNING}📁 Encontrado en: {rel_path}{Colors.ENDC} ({len(matches)} coincidencias)")

    reports_dir = os.path.join(script_dir, 'reports')
    os.makedirs(reports_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    report_file = os.path.join(reports_dir, f'scan_report_{timestamp}.md')

    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(f"# {report_title}\n\n")
        f.write(f"**Fecha:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"**Archivos escaneados:** {len(files_to_scan)}\n")
        if choice == '1':
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
            
        if choice == '1':
            f.write(f"\n✅ **Búsqueda completada.** Se encontraron **{found_issues}** posibles textos hardcodeados.\n")
        elif choice == '2':
            f.write(f"\n✅ **Búsqueda completada.** Se encontraron **{found_issues}** atributos style inline.\n")
        else:
            f.write(f"\n✅ **Búsqueda completada.** Se encontraron **{found_issues}** funciones de depuración.\n")

    time_taken = round(time.time() - start_time, 2)
    print(f"\n{Colors.GREEN}{Colors.BOLD}✅ Búsqueda completada en {time_taken}s.{Colors.ENDC}")
    print(f"Se encontraron {Colors.FAIL}{found_issues}{Colors.ENDC} coincidencias en {Colors.WARNING}{len(results_by_file)}{Colors.ENDC} archivos.")
    print(f"📄 Reporte detallado generado en: {Colors.BLUE}{report_file}{Colors.ENDC}")

if __name__ == '__main__':
    main()