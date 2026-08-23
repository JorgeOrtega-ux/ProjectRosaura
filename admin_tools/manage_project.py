import uuid
import pymysql
import redis
from datetime import timedelta
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
import uuid
from datetime import datetime, timedelta
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
            "  -webkit-mask-image: url('../../icons/sprite.svg');",
            "  mask-image: url('../../icons/sprite.svg');",
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
        base_css_dir = os.path.join(css_dir, 'base')
        os.makedirs(icons_dir, exist_ok=True)
        os.makedirs(base_css_dir, exist_ok=True)

        sprite_path = os.path.join(icons_dir, 'sprite.svg')
        css_path = os.path.join(base_css_dir, 'icons.css')

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


# ==============================================================================
# SECCIÓN: ESCÁNER DE CLAVES DE TRADUCCIÓN (i18n SCANNER)
# ==============================================================================

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

def run_i18n_scanner(project_root, script_dir):
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
    today_folder = datetime.now().strftime('%Y-%m-%d')
    reports_dir = os.path.join(script_dir, 'reports', today_folder)
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

# ==============================================================================
# SECCIÓN: ASIGNAR SUPERADMINISTRADOR Y PURGAR REDIS
# ==============================================================================


def run_set_superadmin(project_root):
    env_path = os.path.join(project_root, '.env')
    env_vars = {}
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    env_vars[k.strip()] = v.strip().strip("'").strip('"')

    db_host = '127.0.0.1'
    db_port = int(env_vars.get('DB_PORT', 3306))
    db_user = env_vars.get('DB_ROOT_USER', 'root')
    db_pass = env_vars.get('DB_ROOT_PASSWORD', 'c7a91e4d5b2f8a0c3d6e9f1b4a7c0d2e5f8b1c4a9d6e3f0b7c2a5d8e1f4b9c6a')

    conn = pymysql.connect(
        host=db_host,
        port=db_port,
        user=db_user,
        password=db_pass,
        database='db_identity',
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

    with conn.cursor() as cur:
        # Ver roles
        cur.execute("SELECT * FROM roles")
        roles = cur.fetchall()
        print("Roles disponibles en db_identity:", roles)

        # Ver usuario 1
        cur.execute("SELECT id, username, email FROM users WHERE id = 1")
        user = cur.fetchone()
        print("Usuario objetivo:", user)

        if user:
            # Asignar rol 4 (SuperAdministrator) a usuario 1
            cur.execute("""
                INSERT INTO user_roles (user_id, role_id) 
                VALUES (1, 4) 
                ON DUPLICATE KEY UPDATE role_id = 4
            """)
            conn.commit()
            print(f"[+] Rol SuperAdministrator (ID 4) asignado a {user['username']} (ID {user['id']})")

            # Verificar roles asignados a usuario 1
            cur.execute("""
                SELECT ur.user_id, ur.role_id, r.name as role_name, r.weight 
                FROM user_roles ur 
                JOIN roles r ON ur.role_id = r.id 
                WHERE ur.user_id = 1
            """)
            assigned = cur.fetchall()
            print("Roles asignados actualmente:", assigned)

    conn.close()

    # Limpiar TODA la caché en Redis
    redis_host = env_vars.get('REDIS_HOST', '127.0.0.1')
    if redis_host in ('redis', 'localhost'):
        redis_host = '127.0.0.1'
    redis_port = int(env_vars.get('REDIS_PORT', 6379))
    redis_pass = env_vars.get('REDIS_PASS', None)

    try:
        r = redis.Redis(host=redis_host, port=redis_port, password=redis_pass, decode_responses=True)
        r.flushdb()
        print("[+] Redis FLUSHDB ejecutado: Toda la caché y sesiones cacheadas han sido limpiadas.")
    except Exception as e:
        print(f"[-] Error en Redis: {e}")


# ==============================================================================
# SECCIÓN: ESCÁNER DE INTEGRIDAD DE VISTAS (IDs E INPUTS HIDDEN)
# ==============================================================================

def run_scan_views_integrity(project_root):
    
    views_dir = os.path.join(project_root, "includes", "views")
    
    id_pattern = re.compile(r'\sid\s*=\s*["\']([^"\']+)["\']', re.IGNORECASE)
    hidden_pattern = re.compile(r'<input[^>]*type\s*=\s*["\']hidden["\']', re.IGNORECASE)
    
    print("=== ESCANEO DE ATRIBUTOS ID EN VISTAS ===")
    id_count = 0
    for root, dirs, files in os.walk(views_dir):
        for f in files:
            if f.endswith('.php'):
                p = os.path.join(root, f)
                rel = os.path.relpath(p, project_root)
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
                rel = os.path.relpath(p, project_root)
                with open(p, 'r', encoding='utf-8', errors='ignore') as file:
                    for idx, line in enumerate(file, 1):
                        if hidden_pattern.search(line):
                            hidden_count += 1
                            print(f"{rel}:{idx} -> {line.strip()[:100]}")
    
    print(f"\nTotal inputs hidden encontrados: {hidden_count}")
# ==============================================================================
# SECCIÓN: POBLADOR DE BASES DE DATOS (DB SEEDER)
# ==============================================================================

"""
Módulo de Población y Reinicialización de Bases de Datos para ProjectRosaura.
Puebla ~10,000 registros por tabla en db_identity, db_canvases, db_support y db_telemetry.
"""

DEFAULT_PASSWORD_HASH = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' # "password"
BATCH_SIZE = 2000

FIRST_NAMES = ['Alex', 'Carlos', 'Maria', 'Sofia', 'Juan', 'Lucia', 'Mateo', 'Elena', 'David', 'Laura', 
               'Diego', 'Paula', 'Gabriel', 'Valentina', 'Andres', 'Camila', 'Javier', 'Isabella', 'Daniel', 'Emma']
LAST_NAMES = ['Garcia', 'Rodriguez', 'Gonzalez', 'Fernandez', 'Lopez', 'Martinez', 'Sanchez', 'Perez', 
              'Gomez', 'Martin', 'Jimenez', 'Ruiz', 'Hernandez', 'Diaz', 'Moreno', 'Muñoz', 'Alvarez', 'Romero']
CANVAS_THEMES = ['PixelArt', 'Cyberpunk', 'Fantasy', 'Retro', 'Galaxy', 'Neon', 'Medieval', 'Futuristic', 
                 'Isometric', 'Chibi', 'Anime', 'Landscape', 'Dungeon', 'Space', 'Synthwave', 'Vaporwave']
CATEGORIES = ['technical', 'billing', 'account', 'policy', 'general', 'other']
TICKET_SUBJECTS = [
    'Problema al cargar canvas en tiempo real',
    'Error en la confirmación del pago Stripe',
    'Consulta sobre actualización de suscripción Pro',
    'Fallo al exportar snapshot en formato PNG',
    'Duda respecto a roles de canvas y permisos',
    'Problema de autenticación de dos factores (2FA)',
    'Solicitud de cambio de nombre de usuario',
    'Reporte de comportamiento inadecuado en chat de lienzo',
    'Sugerencia de nueva paleta de colores personalizada',
    'Lentitud de conexión al WebSocket de canvas'
]
CHAT_MESSAGES_SAMPLES = [
    'Hola, necesito asistencia con una transacción reciente.',
    'Estoy revisando los detalles de tu cuenta en este momento.',
    '¿Podrías proporcionarme el identificador de tu compra o factura?',
    'Listo, he actualizado los permisos de tu perfil.',
    'Gracias por contactar al soporte técnico de ProjectRosaura.',
    'El problema ha quedado solucionado satisfactoriamente.',
    'Te transferiré al equipo de nivel 2 para investigar el inconveniente a fondo.',
    '¿Hay algo más en lo que pueda ayudarte el día de hoy?'
]

def load_db_config(project_root):
    env_path = os.path.join(project_root, '.env')
    config = {
        'host': '127.0.0.1',
        'port': 3306,
        'user': 'root',
        'password': 'c7a91e4d5b2f8a0c3d6e9f1b4a7c0d2e5f8b1c4a9d6e3f0b7c2a5d8e1f4b9c6a',
        'app_user': 'system_web_executor',
        'app_password': 'e4b3c2d1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3'
    }
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    k = k.strip()
                    v = v.strip().strip("'").strip('"')
                    if k == 'DB_HOST' and v:
                        config['host'] = '127.0.0.1' if v in ('mysql', 'db_mysql', 'localhost') else v
                    elif k == 'DB_PORT' and v:
                        config['port'] = int(v)
                    elif k == 'DB_ROOT_PASSWORD' and v:
                        config['password'] = v
                    elif k == 'DB_USER' and v:
                        config['app_user'] = v
                    elif k == 'DB_PASS' and v:
                        config['app_password'] = v
    return config

def execute_sql_file(cursor, file_path):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"No se encontró el archivo SQL: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        sql_content = f.read()

    # Dividir sentencias por punto y coma ignorando comentarios
    statements = []
    current_stmt = []
    for line in sql_content.splitlines():
        trimmed = line.strip()
        if not trimmed or trimmed.startswith('--') or trimmed.startswith('/*'):
            continue
        current_stmt.append(line)
        if trimmed.endswith(';'):
            stmt = '\n'.join(current_stmt).strip()
            if stmt:
                statements.append(stmt)
            current_stmt = []

    for stmt in statements:
        try:
            cursor.execute(stmt)
        except Exception as e:
            # Ignorar errores de advertencias o tablas existentes
            pass

def random_date(start_days_ago=365):
    seconds = random.randint(0, start_days_ago * 86400)
    dt = datetime.now() - timedelta(seconds=seconds)
    return dt.strftime('%Y-%m-%d %H:%M:%S')

def seed_database(project_root, target_records=10000):
    start_total_time = time.time()
    config = load_db_config(project_root)
    init_dir = os.path.join(project_root, 'docker', 'mysql', 'init')

    print(f"\n{Colors.HEADER}{Colors.BOLD}======================================================================{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}   INICIANDO PROCESO DE POBLACIÓN MASIVA DE BASES DE DATOS           {Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}======================================================================{Colors.ENDC}")
    print(f"Conectando al servidor MySQL en {Colors.CYAN}{config['host']}:{config['port']}{Colors.ENDC} como {Colors.CYAN}{config['user']}{Colors.ENDC}...")

    conn = pymysql.connect(
        host=config['host'],
        port=config['port'],
        user=config['user'],
        password=config['password'],
        charset='utf8mb4',
        autocommit=False
    )
    cursor = conn.cursor()

    try:
        # 1. Reiniciar esquemas
        print(f"\n{Colors.WARNING}1/4 Recreando esquemas limpios desde docker/mysql/init/...{Colors.ENDC}")
        schema_files = [
            'db_identity.sql',
            'db_canvases.sql',
            'db_telemetry.sql'
        ]

        cursor.execute("DROP DATABASE IF EXISTS db_identity;")
        cursor.execute("DROP DATABASE IF EXISTS db_canvases;")
        cursor.execute("DROP DATABASE IF EXISTS db_telemetry;")
        conn.commit()

        for sf in schema_files:
            file_p = os.path.join(init_dir, sf)
            print(f"  -> Ejecutando esquema: {Colors.BLUE}{sf}{Colors.ENDC}")
            execute_sql_file(cursor, file_p)
            conn.commit()

        # Otorgar permisos a system_web_executor
        grant_sql = f"""
        GRANT ALL PRIVILEGES ON db_identity.* TO '{config['app_user']}'@'%';
        GRANT ALL PRIVILEGES ON db_canvases.* TO '{config['app_user']}'@'%';
        GRANT ALL PRIVILEGES ON db_telemetry.* TO '{config['app_user']}'@'%';
        FLUSH PRIVILEGES;
        """
        for g_stmt in grant_sql.strip().split(';'):
            if g_stmt.strip():
                cursor.execute(g_stmt)
        conn.commit()
        print(f"{Colors.GREEN}✓ Esquemas recreados y permisos asignados con éxito.{Colors.ENDC}")

        # Desactivar restricciones temporales para inserción ultrarrápida
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
        cursor.execute("SET UNIQUE_CHECKS = 0;")

        # -------------------------------------------------------------
        # 2. POBLAR DB_IDENTITY (~10k por tabla)
        # -------------------------------------------------------------
        print(f"\n{Colors.WARNING}2/5 Poblando 'db_identity' (~{target_records:,} por tabla)...{Colors.ENDC}")
        cursor.execute("USE db_identity;")

        # Tabla: users
        print("  -> Generando tabla: `users`...")
        user_rows = []
        # Usuario 1: Administrador del sistema
        user_rows.append((
            1,
            '00000000-0000-0000-0000-000000000001',
            'admin',
            'admin@example.com',
            DEFAULT_PASSWORD_HASH,
            3, # Ultra
            'cus_admin_stripe_001',
            None,
            0,
            None,
            None,
            '/public/assets/img/fallbacks/avatar-default.png',
            None,
            '2025-01-01 00:00:00',
            1048576,
            0,
            None
        ))

        for i in range(2, target_records + 1):
            fn = random.choice(FIRST_NAMES)
            ln = random.choice(LAST_NAMES)
            u_name = f"{fn.lower()}_{ln.lower()}_{i}"
            u_email = f"{fn.lower()}.{ln.lower()}.{i}@example.com"
            tier = random.choices([0, 1, 2, 3], weights=[70, 15, 10, 5])[0]
            u_uuid = str(uuid.uuid4())
            created = random_date(365)
            storage = random.randint(0, 15 * 1024 * 1024)
            user_rows.append((
                i,
                u_uuid,
                u_name,
                u_email,
                DEFAULT_PASSWORD_HASH,
                tier,
                f'cus_stripe_{u_uuid[:8]}',
                None,
                0,
                None,
                None,
                '/public/assets/img/fallbacks/avatar-default.png',
                None,
                created,
                storage,
                0,
                None
            ))

        sql_users = """
        INSERT INTO `users` (id, uuid, username, email, password, subscription_tier, stripe_customer_id,
                            two_factor_secret, two_factor_enabled, two_factor_recovery_codes,
                            deletion_scheduled_at, profile_picture, google_id, created_at, storage_used_bytes,
                            template_tokens_used, template_tokens_reset_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        for i in range(0, len(user_rows), BATCH_SIZE):
            cursor.executemany(sql_users, user_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: user_preferences
        print("  -> Generando tabla: `user_preferences`...")
        pref_rows = []
        for i in range(1, target_records + 1):
            lang = random.choice(['es-419', 'en-US', 'es-ES', 'pt-BR', 'fr-FR', 'de-DE'])
            theme = random.choice(['system', 'dark', 'light'])
            pref_rows.append((i, lang, 1, theme, 0, 1, random_date(300)))

        sql_prefs = """
        INSERT INTO `user_preferences` (user_id, language, open_links_new_tab, theme, extended_alerts, allow_telemetry, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        for i in range(0, len(pref_rows), BATCH_SIZE):
            cursor.executemany(sql_prefs, pref_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: user_roles
        print("  -> Generando tabla: `user_roles`...")
        role_rows = [(1, 4)] # SuperAdmin
        for i in range(2, target_records + 1):
            if i <= 10:
                role_rows.append((i, 3)) # Admin
            elif i <= 30:
                role_rows.append((i, 2)) # Moderator
            else:
                role_rows.append((i, 1)) # User

        sql_roles = "INSERT IGNORE INTO `user_roles` (user_id, role_id) VALUES (%s, %s)"
        for i in range(0, len(role_rows), BATCH_SIZE):
            cursor.executemany(sql_roles, role_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: subscriptions
        print("  -> Generando tabla: `subscriptions`...")
        sub_rows = []
        for i in range(1, target_records + 1):
            u_id = i
            tier = random.choice([1, 2, 3])
            period = random.choice(['monthly', 'yearly'])
            status = random.choices(['active', 'canceled', 'past_due'], weights=[80, 15, 5])[0]
            st_date = random_date(180)
            sub_rows.append((
                u_id,
                f'cus_stripe_{u_id}',
                f'sub_stripe_{u_id}_{uuid.uuid4().hex[:6]}',
                f'cs_stripe_{uuid.uuid4().hex[:8]}',
                tier,
                period,
                status,
                st_date,
                datetime.now() + timedelta(days=30),
                None,
                st_date
            ))
        sql_subs = """
        INSERT INTO `subscriptions` (user_id, stripe_customer_id, stripe_subscription_id, stripe_checkout_session_id,
                                     tier, billing_period, status, current_period_start, current_period_end, canceled_at, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        for i in range(0, len(sub_rows), BATCH_SIZE):
            cursor.executemany(sql_subs, sub_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: payment_history
        print("  -> Generando tabla: `payment_history`...")
        pay_rows = []
        for i in range(1, target_records + 1):
            u_id = random.randint(1, target_records)
            amount = random.choice([499, 999, 1999, 2499, 4999])
            desc = f"Pago de suscripción mensual Nivel {random.choice(['Plus', 'Pro', 'Ultra'])}"
            pay_rows.append((
                u_id,
                f'pi_{uuid.uuid4().hex[:16]}',
                f'in_{uuid.uuid4().hex[:14]}',
                amount,
                'usd',
                desc,
                'succeeded',
                random_date(180)
            ))
        sql_pay = """
        INSERT INTO `payment_history` (user_id, stripe_payment_intent_id, stripe_invoice_id, amount_cents, currency, description, status, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        for i in range(0, len(pay_rows), BATCH_SIZE):
            cursor.executemany(sql_pay, pay_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: custom_palettes
        print("  -> Generando tabla: `custom_palettes`...")
        pal_rows = []
        palette_colors_json = '[{"hex":"#FF5733","name":"Coral"},{"hex":"#33FF57","name":"Mint"},{"hex":"#3357FF","name":"Blue"},{"hex":"#F3FF33","name":"Yellow"}]'
        for i in range(1, target_records + 1):
            pal_rows.append((
                random.randint(1, target_records),
                f'palette_usr_{i}',
                f'Paleta Artística {i}',
                palette_colors_json,
                random_date(200)
            ))
        sql_pals = "INSERT INTO `custom_palettes` (user_id, palette_key, name, colors, created_at) VALUES (%s, %s, %s, %s, %s)"
        for i in range(0, len(pal_rows), BATCH_SIZE):
            cursor.executemany(sql_pals, pal_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: moderation_logs
        print("  -> Generando tabla: `moderation_logs`...")
        mod_rows = []
        for i in range(1, target_records + 1):
            mod_rows.append((
                random.randint(2, target_records),
                1, # Admin ID
                random.choice(['warn', 'mute', 'suspend_temp', 'edit_avatar', 'reset_username']),
                'Infracción de normas comunitarias de pixel art',
                datetime.now() + timedelta(days=7),
                'Nota interna del moderador',
                random_date(150)
            ))
        sql_mod = "INSERT INTO `moderation_logs` (user_id, admin_id, action_type, reason, end_date, admin_notes, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s)"
        for i in range(0, len(mod_rows), BATCH_SIZE):
            cursor.executemany(sql_mod, mod_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: profile_changes_log
        print("  -> Generando tabla: `profile_changes_log`...")
        pfl_rows = []
        for i in range(1, target_records + 1):
            pfl_rows.append((
                random.randint(1, target_records),
                random.choice(['avatar', 'username', 'email', 'password', '2fa']),
                'old_val_sample',
                'new_val_sample',
                f"192.168.{random.randint(1,254)}.{random.randint(1,254)}",
                'AS15169 Google LLC',
                random_date(200)
            ))
        sql_pfl = "INSERT INTO `profile_changes_log` (user_id, change_type, old_value, new_value, ip_address, asn, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s)"
        for i in range(0, len(pfl_rows), BATCH_SIZE):
            cursor.executemany(sql_pfl, pfl_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: user_flags
        print("  -> Generando tabla: `user_flags`...")
        flags_rows = []
        for i in range(1, target_records + 1):
            flags_rows.append((
                i,
                random.choice(['beta_access', 'trusted_creator', 'verified_artist', 'early_supporter', 'premium_badge']),
                random_date(250)
            ))
        sql_flags = "INSERT IGNORE INTO `user_flags` (user_id, flag_key, created_at) VALUES (%s, %s, %s)"
        for i in range(0, len(flags_rows), BATCH_SIZE):
            cursor.executemany(sql_flags, flags_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: auth_tokens
        print("  -> Generando tabla: `auth_tokens`...")
        tokens_rows = []
        for i in range(1, target_records + 1):
            tokens_rows.append((
                random.randint(1, target_records),
                uuid.uuid4().hex,
                uuid.uuid4().hex + uuid.uuid4().hex,
                datetime.now() + timedelta(days=30),
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
                f"10.0.{random.randint(1,254)}.{random.randint(1,254)}",
                'CDMX, MX',
                'AS8151 Totalplay'
            ))
        sql_tokens = "INSERT INTO `auth_tokens` (user_id, selector, hashed_validator, expires_at, user_agent, ip_address, location, asn) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
        for i in range(0, len(tokens_rows), BATCH_SIZE):
            cursor.executemany(sql_tokens, tokens_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Se removieron las tablas del sistema de monedas

        # Tabla: user_restrictions
        print("  -> Generando tabla: `user_restrictions`...")
        ur_rows = []
        for i in range(1, target_records + 1):
            is_susp = 1 if i <= 100 else 0
            ur_rows.append((
                i,
                is_susp,
                'temporary' if is_susp else None,
                'Suspensión preventiva por análisis de actividad' if is_susp else None,
                datetime.now() + timedelta(days=7) if is_susp else None,
                None,
                None,
                None
            ))
        sql_ur = """
        INSERT INTO `user_restrictions` (user_id, is_suspended, suspension_type, suspension_reason, suspension_end_date, deleted_by, deleted_reason, admin_notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        for i in range(0, len(ur_rows), BATCH_SIZE):
            cursor.executemany(sql_ur, ur_rows[i:i+BATCH_SIZE])
        conn.commit()

        print(f"{Colors.GREEN}✓ db_identity poblada exitosamente con ~150,000 registros.{Colors.ENDC}")

        # -------------------------------------------------------------
        # 3. POBLAR DB_CANVASES (~10k por tabla)
        # -------------------------------------------------------------
        print(f"\n{Colors.WARNING}3/5 Poblando 'db_canvases' (~{target_records:,} por tabla)...{Colors.ENDC}")
        cursor.execute("USE db_canvases;")

        # Tabla: canvases
        print("  -> Generando tabla: `canvases`...")
        canvas_rows = []
        for i in range(1, target_records + 1):
            c_uuid = str(uuid.uuid4())
            theme = random.choice(CANVAS_THEMES)
            c_name = f"{theme} Canvas #{i}"
            tags_json = f'["{theme.lower()}", "art", "pixel_{i}"]'
            privacy = random.choice(['public', 'private'])
            size = random.choice(['64', '128', '256', '512'])
            fav_cnt = random.randint(0, 500)
            mem_cnt = random.randint(1, 100)
            px_cnt = random.randint(100, 50000)
            msg_cnt = random.randint(0, 1000)
            owner_id = random.randint(1, target_records)
            canvas_rows.append((
                i,
                c_uuid,
                owner_id,
                c_name,
                tags_json,
                privacy,
                0, # requires_approval
                1, # allow_chat
                0, # is_subscription_locked
                None,
                size,
                'default',
                100, # max_participants
                5,
                10,
                fav_cnt,
                mem_cnt,
                px_cnt,
                msg_cnt,
                0, # is_frozen
                random_date(300)
            ))

        sql_canvases = """
        INSERT INTO `canvases` (id, uuid, owner_id, name, tags, privacy, requires_approval,
                               allow_chat, is_subscription_locked, locked_reasons, size, palette_id, max_participants,
                               cooldown_pixels_batch, cooldown_seconds, favorites_count, members_count, total_pixels,
                               total_messages, is_frozen, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        for i in range(0, len(canvas_rows), BATCH_SIZE):
            cursor.executemany(sql_canvases, canvas_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: canvas_members
        print("  -> Generando tabla: `canvas_members`...")
        cm_rows = []
        for i in range(1, target_records + 1):
            cm_rows.append((i, random.randint(1, target_records), random_date(180)))
        sql_cm = "INSERT IGNORE INTO `canvas_members` (canvas_id, user_id, joined_at) VALUES (%s, %s, %s)"
        for i in range(0, len(cm_rows), BATCH_SIZE):
            cursor.executemany(sql_cm, cm_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: canvas_favorites
        print("  -> Generando tabla: `canvas_favorites`...")
        cf_rows = []
        for i in range(1, target_records + 1):
            cf_rows.append((i, random.randint(1, target_records), random_date(150)))
        sql_cf = "INSERT IGNORE INTO `canvas_favorites` (canvas_id, user_id, created_at) VALUES (%s, %s, %s)"
        for i in range(0, len(cf_rows), BATCH_SIZE):
            cursor.executemany(sql_cf, cf_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: canvas_access_requests
        print("  -> Generando tabla: `canvas_access_requests`...")
        car_rows = []
        for i in range(1, target_records + 1):
            car_rows.append((
                i,
                random.randint(1, target_records),
                random.choice(['pending', 'approved', 'rejected']),
                random_date(100)
            ))
        sql_car = "INSERT IGNORE INTO `canvas_access_requests` (canvas_id, user_id, status, created_at) VALUES (%s, %s, %s, %s)"
        for i in range(0, len(car_rows), BATCH_SIZE):
            cursor.executemany(sql_car, car_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: canvas_snapshots
        print("  -> Generando tabla: `canvas_snapshots`...")
        cs_rows = []
        for i in range(1, target_records + 1):
            cs_rows.append((i, f"snapshots/canvas_{i}_main.png", None))
        sql_cs = "INSERT IGNORE INTO `canvas_snapshots` (canvas_id, s3_key, snapshot_data) VALUES (%s, %s, %s)"
        for i in range(0, len(cs_rows), BATCH_SIZE):
            cursor.executemany(sql_cs, cs_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: canvas_snapshots_history
        print("  -> Generando tabla: `canvas_snapshots_history`...")
        csh_rows = []
        for i in range(1, target_records + 1):
            csh_rows.append((
                i,
                random.randint(1, target_records),
                str(uuid.uuid4()),
                f"/storage/snapshots/snap_hist_{i}.png",
                random.choice(['public', 'private']),
                random_date(200)
            ))
        sql_csh = "INSERT INTO `canvas_snapshots_history` (id, canvas_id, snapshot_uuid, file_path, privacy, created_at) VALUES (%s, %s, %s, %s, %s, %s)"
        for i in range(0, len(csh_rows), BATCH_SIZE):
            cursor.executemany(sql_csh, csh_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: canvas_snapshots_likes
        print("  -> Generando tabla: `canvas_snapshots_likes`...")
        csl_rows = []
        for i in range(1, target_records + 1):
            csl_rows.append((i, random.randint(1, target_records), random_date(120)))
        sql_csl = "INSERT IGNORE INTO `canvas_snapshots_likes` (snapshot_id, user_id, created_at) VALUES (%s, %s, %s)"
        for i in range(0, len(csl_rows), BATCH_SIZE):
            cursor.executemany(sql_csl, csl_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: canvas_invites
        print("  -> Generando tabla: `canvas_invites`...")
        ci_rows = []
        for i in range(1, target_records + 1):
            code = f"INV{i:05d}{random.choice('ABCDEF')}"
            ci_rows.append((
                random.randint(1, target_records),
                code,
                'Usuario',
                100,
                random.randint(0, 50),
                datetime.now() + timedelta(days=30),
                random.randint(1, target_records),
                random_date(100)
            ))
        sql_ci = "INSERT IGNORE INTO `canvas_invites` (canvas_id, code, role, max_uses, uses_count, expires_at, created_by, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
        for i in range(0, len(ci_rows), BATCH_SIZE):
            cursor.executemany(sql_ci, ci_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: canvas_chat_messages
        print("  -> Generando tabla: `canvas_chat_messages`...")
        ccm_rows = []
        for i in range(1, target_records + 1):
            ccm_rows.append((
                str(uuid.uuid4()),
                random.randint(1, target_records),
                random.randint(1, target_records),
                f"Mensaje de chat en lienzo {random.choice(CHAT_MESSAGES_SAMPLES)}",
                None,
                0,
                'visible',
                None,
                None,
                random_date(90)
            ))
        sql_ccm = """
        INSERT INTO `canvas_chat_messages` (uuid, canvas_id, user_id, message, attachments, file_size, visibility, deleted_by, delete_reason, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        for i in range(0, len(ccm_rows), BATCH_SIZE):
            cursor.executemany(sql_ccm, ccm_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: canvas_chat_reports
        print("  -> Generando tabla: `canvas_chat_reports`...")
        ccr_rows = []
        for i in range(1, target_records + 1):
            ccr_rows.append((
                str(uuid.uuid4()),
                random.randint(1, target_records),
                random.choice(['spam', 'offensive', 'harassment', 'inappropriate_art']),
                'Detalles del reporte generado automáticamente',
                random.choice(['pending', 'reviewed', 'dismissed']),
                random_date(60)
            ))
        sql_ccr = "INSERT INTO `canvas_chat_reports` (message_id, reporter_user_id, reason_key, details, status, created_at) VALUES (%s, %s, %s, %s, %s, %s)"
        for i in range(0, len(ccr_rows), BATCH_SIZE):
            cursor.executemany(sql_ccr, ccr_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: canvas_sanctions
        print("  -> Generando tabla: `canvas_sanctions`...")
        csanc_rows = []
        for i in range(1, target_records + 1):
            csanc_rows.append((
                str(uuid.uuid4()),
                str(uuid.uuid4()),
                '00000000-0000-0000-0000-000000000001',
                'chat_mute',
                'temporary',
                'Conducta no permitida en chat',
                'Sanción automática',
                datetime.now() + timedelta(days=3),
                random_date(40)
            ))
        sql_csanc = "INSERT INTO `canvas_sanctions` (canvas_id, user_id, restricted_by, sanction_scope, suspension_type, suspension_reason, custom_reason, end_date, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"
        for i in range(0, len(csanc_rows), BATCH_SIZE):
            cursor.executemany(sql_csanc, csanc_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: canvas_protections
        print("  -> Generando tabla: `canvas_protections`...")
        cp_rows = []
        for i in range(1, target_records + 1):
            cp_rows.append((
                i,
                random.randint(0, 32),
                random.randint(0, 32),
                random.randint(33, 64),
                random.randint(33, 64),
                1,
                datetime.now() + timedelta(days=14),
                random_date(50)
            ))
        sql_cp = "INSERT INTO `canvas_protections` (canvas_id, x1, y1, x2, y2, protected_by, expires_at, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
        for i in range(0, len(cp_rows), BATCH_SIZE):
            cursor.executemany(sql_cp, cp_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: canvas_reset_settings
        print("  -> Generando tabla: `canvas_reset_settings`...")
        crs_rows = []
        for i in range(1, target_records + 1):
            crs_rows.append((i, 0, None, 1, random_date(100)))
        sql_crs = "INSERT IGNORE INTO `canvas_reset_settings` (canvas_id, is_active, next_reset_at, take_snapshot, created_at) VALUES (%s, %s, %s, %s, %s)"
        for i in range(0, len(crs_rows), BATCH_SIZE):
            cursor.executemany(sql_crs, crs_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: canvas_resize_settings
        print("  -> Generando tabla: `canvas_resize_settings`...")
        cres_rows = []
        for i in range(1, target_records + 1):
            cres_rows.append((i, 0, None, '128', random_date(100)))
        sql_cres = "INSERT IGNORE INTO `canvas_resize_settings` (canvas_id, is_active, next_resize_at, target_size, created_at) VALUES (%s, %s, %s, %s, %s)"
        for i in range(0, len(cres_rows), BATCH_SIZE):
            cursor.executemany(sql_cres, cres_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: user_templates
        print("  -> Generando tabla: `user_templates`...")
        ut_rows = []
        for i in range(1, target_records + 1):
            ut_rows.append((
                random.randint(1, target_records),
                f"/storage/templates/template_{i}.json",
                random.randint(1024, 65536),
                random_date(120)
            ))
        sql_ut = "INSERT INTO `user_templates` (user_id, file_path, file_size, created_at) VALUES (%s, %s, %s, %s)"
        for i in range(0, len(ut_rows), BATCH_SIZE):
            cursor.executemany(sql_ut, ut_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: canvas_user_roles
        print("  -> Generando tabla: `canvas_user_roles`...")
        cur_rows = []
        for i in range(1, target_records + 1):
            cur_rows.append((
                i,
                random.randint(1, target_records),
                random.choice([1, 2, 3])
            ))
        sql_cur = "INSERT IGNORE INTO `canvas_user_roles` (canvas_id, user_id, role_id) VALUES (%s, %s, %s)"
        for i in range(0, len(cur_rows), BATCH_SIZE):
            cursor.executemany(sql_cur, cur_rows[i:i+BATCH_SIZE])
        conn.commit()

        print(f"{Colors.GREEN}✓ db_canvases poblada exitosamente con ~160,000 registros.{Colors.ENDC}")

        # -------------------------------------------------------------
        # 4. POBLAR DB_TELEMETRY (~10k por tabla)
        # -------------------------------------------------------------
        print(f"\n{Colors.WARNING}4/4 Poblando 'db_telemetry' (~{target_records:,} por tabla)...{Colors.ENDC}")
        cursor.execute("USE db_telemetry;")

        # Tabla: api_latency
        print("  -> Generando tabla: `api_latency`...")
        endpoints = ['/api/v1/auth/login', '/api/v1/canvas/get',
                     '/api/v1/profile/update', '/api/v1/canvas/pixels', '/api/v1/store/packages']
        al_rows = []
        for i in range(1, target_records + 1):
            al_rows.append((
                random.choice(endpoints),
                random.choice(['GET', 'POST', 'PUT']),
                random.choices([200, 201, 400, 404, 500], weights=[85, 5, 5, 4, 1])[0],
                round(random.uniform(12.5, 380.0), 2),
                str(uuid.uuid4()),
                f"192.168.{random.randint(1,254)}.{random.randint(1,254)}",
                'AS15169 Google LLC',
                random_date(180)
            ))
        sql_al = "INSERT INTO `api_latency` (endpoint, method, status_code, latency_ms, user_uuid, ip_address, asn, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
        for i in range(0, len(al_rows), BATCH_SIZE):
            cursor.executemany(sql_al, al_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: pageviews
        print("  -> Generando tabla: `pageviews`...")
        paths = ['/', '/canvas', '/pricing', '/profile', '/admin/dashboard']
        pv_rows = []
        for i in range(1, target_records + 1):
            pv_rows.append((
                random.choice(paths),
                round(random.uniform(45.0, 950.0), 2),
                str(uuid.uuid4()),
                uuid.uuid4().hex,
                random.choice(['desktop', 'mobile', 'tablet']),
                random.choice(['dark', 'light', 'system']),
                random.choice(['es-419', 'en-US', 'es-ES']),
                random_date(180)
            ))
        sql_pv = "INSERT INTO `pageviews` (path, load_time_ms, user_uuid, session_id, device_type, theme_preference, locale, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
        for i in range(0, len(pv_rows), BATCH_SIZE):
            cursor.executemany(sql_pv, pv_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: auth_events
        print("  -> Generando tabla: `auth_events`...")
        auth_types = ['login_success', 'login_failed', 'logout', 'session_switch', '2fa_prompt', 'password_change']
        ae_rows = []
        for i in range(1, target_records + 1):
            ae_rows.append((
                random.choice(auth_types),
                str(uuid.uuid4()),
                f"10.0.{random.randint(1,254)}.{random.randint(1,254)}",
                'AS8151 Totalplay',
                random_date(180)
            ))
        sql_ae = "INSERT INTO `auth_events` (event_type, user_uuid, ip_address, asn, created_at) VALUES (%s, %s, %s, %s, %s)"
        for i in range(0, len(ae_rows), BATCH_SIZE):
            cursor.executemany(sql_ae, ae_rows[i:i+BATCH_SIZE])
        conn.commit()

        print(f"{Colors.GREEN}✓ db_telemetry poblada exitosamente con ~30,000 registros.{Colors.ENDC}")

        # Restaurar restricciones
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
        cursor.execute("SET UNIQUE_CHECKS = 1;")
        conn.commit()

        elapsed = round(time.time() - start_total_time, 2)
        total_inserted = target_records * 27 # ~27 tablas pobladas

        print(f"\n{Colors.GREEN}{Colors.BOLD}======================================================================{Colors.ENDC}")
        print(f"{Colors.GREEN}{Colors.BOLD}   ¡REPOBLACIÓN COMPLETADA CON ÉXITO EN {elapsed} SEGUNDOS!           {Colors.ENDC}")
        print(f"{Colors.GREEN}{Colors.BOLD}======================================================================{Colors.ENDC}")
        print(f"📊 {Colors.BOLD}Total de registros generados:{Colors.ENDC} ~{total_inserted:,} filas")
        print(f"👤 {Colors.BOLD}Usuario Administrador creado:{Colors.ENDC} admin / admin@example.com (Password: {Colors.CYAN}password{Colors.ENDC})")
        print(f"{Colors.GREEN}======================================================================{Colors.ENDC}\n")

    except Exception as e:
        conn.rollback()
        print(f"\n{Colors.FAIL}{Colors.BOLD}❌ Error durante el proceso de población: {str(e)}{Colors.ENDC}")
        import traceback
        traceback.print_exc()
    finally:
        cursor.close()
        conn.close()

def run_seeder(project_root, script_dir):
    print(f"\n{Colors.FAIL}{Colors.BOLD}======================================================================{Colors.ENDC}")
    print(f"{Colors.FAIL}{Colors.BOLD}             ¡ADVERTENCIA CRÍTICA: BORRADO TOTAL DE BD!               {Colors.ENDC}")
    print(f"{Colors.FAIL}{Colors.BOLD}======================================================================{Colors.ENDC}")
    print(f"{Colors.WARNING}Esta acción ELIMINARÁ Y REINICIALIZARÁ COMPLETAMENTE toda la información{Colors.ENDC}")
    print(f"{Colors.WARNING}existente en las 3 bases de datos del proyecto:{Colors.ENDC}")
    print(f"  • {Colors.CYAN}db_identity{Colors.ENDC}  (Usuarios, Roles, Suscripciones, Pagos, etc.)")
    print(f"  • {Colors.CYAN}db_canvases{Colors.ENDC}  (Lienzos, Miembros, Snapshots, Chats, etc.)")
    print(f"  • {Colors.CYAN}db_telemetry{Colors.ENDC} (Latencias de API, Pageviews, Eventos Auth)")
    print(f"\n{Colors.BOLD}Se poblarán aproximadamente 10,000 registros por tabla de prueba.{Colors.ENDC}")
    print(f"{Colors.FAIL}TODOS LOS DATOS ACTUALES SE PERDERÁN DE FORMA IRREVERSIBLE.{Colors.ENDC}")
    print(f"{Colors.FAIL}{Colors.BOLD}======================================================================{Colors.ENDC}")
    
    confirm = input(f"\n{Colors.WARNING}Para confirmar y continuar, escribe {Colors.BOLD}'CONFIRMAR'{Colors.ENDC}{Colors.WARNING} o presiona Enter para cancelar: {Colors.ENDC}").strip()
    
    if confirm.upper() not in ('CONFIRMAR', 'SI', 'S'):
        print(f"\n{Colors.GREEN}Operación cancelada de forma segura. No se modificó ninguna base de datos.{Colors.ENDC}\n")
        return

    seed_database(project_root, target_records=10000)



def main():
    print(f"{Colors.HEADER}{Colors.BOLD}=============================================================={Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}   Herramienta Integral de Gestión y Análisis: Project Rosaura{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}=============================================================={Colors.ENDC}")
    print("Selecciona una opción:")
    print("1 - Identificar textos hardcodeados (Internacionalización con word.txt)")
    print("2 - Identificar estilos inline (style=\"...\") en archivos PHP y JS")
    print("3 - Identificar código de depuración (console.log, var_dump, etc.)")
    print("4 - Generar Sprite de Iconos SVG y CSS")
    print("5 - Escanear claves de traducción (_t y __) y comprobar JSONs")
    print("6 - Poblar bases de datos con datos de prueba (~10k registros por tabla)")
    print("7 - Asignar rol SuperAdministrador a usuario ID 1 y purgar caché Redis")
    print("8 - Escanear integridad de vistas (atributos ID e inputs hidden)")
    print("0 - Salir")
    choice = input(f"\n{Colors.WARNING}Ingresa una opción (0-8): {Colors.ENDC}").strip()

    if choice in ('0', 'q', 'exit', ''):
        print(f"{Colors.GREEN}Saliendo.{Colors.ENDC}")
        return

    if choice not in ('1', '2', '3', '4', '5', '6', '7', '8'):
        print(f"{Colors.FAIL}Opción no válida. Saliendo.{Colors.ENDC}")
        return

    start_time = time.time()
    script_dir = os.path.dirname(os.path.abspath(__file__))
    target_path = os.path.abspath(os.path.join(script_dir, TARGET_DIR))

    if choice == '4':
        generate_svg_icons(target_path)
        return

    if choice == '5':
        run_i18n_scanner(target_path, script_dir)
        return

    if choice == '6':
        run_seeder(target_path, script_dir)
        return

    if choice == '7':
        run_set_superadmin(target_path)
        return

    if choice == '8':
        run_scan_views_integrity(target_path)
        return

    if choice == '1':
        words_path = os.path.join(script_dir, WORDS_FILE)
        if not os.path.exists(words_path):
            print(f"{Colors.FAIL}Error: No se encontró el archivo {WORDS_FILE}{Colors.ENDC}")
            return
        words_to_search = load_words(words_path)
        search_pattern = words_to_search
        print(f"{Colors.HEADER}{Colors.BOLD}Iniciando escaneo i18n...{Colors.ENDC}")
        print(f"Buscando {Colors.BLUE}{len(words_to_search)}{Colors.ENDC} palabras clave.")
        report_title = "Internationalization Scan Report"
    elif choice == '2':
        search_pattern = re.compile(r'\sstyle\s*=\s*["\'][^"\']*["\']', re.IGNORECASE)
        print(f"{Colors.HEADER}{Colors.BOLD}Iniciando búsqueda de estilos inline en archivos PHP y JS...{Colors.ENDC}")
        report_title = "Inline Styles Report"
    else:
        debug_funcs = [r'console\.log\(', r'print_r\(', r'var_dump\(', r'die\(', r'exit\(']
        search_pattern = re.compile('(' + '|'.join(debug_funcs) + ')', re.IGNORECASE)
        print(f"{Colors.HEADER}{Colors.BOLD}Iniciando búsqueda de funciones de depuración...{Colors.ENDC}")
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

    print(f"Archivos a escanear: {Colors.BLUE}{len(files_to_scan)}{Colors.ENDC} en {target_path}\n")

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

    today_folder = datetime.now().strftime('%Y-%m-%d')
    reports_dir = os.path.join(script_dir, 'reports', today_folder)
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
