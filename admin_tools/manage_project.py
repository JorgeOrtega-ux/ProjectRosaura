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
import io
import zlib
import base64
import math
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image, ImageDraw
import pymysql
import redis

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
    CYAN = '\033[96m'
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
Módulo de Población y Reinicialización de Bases de Datos para Spriteboard.
Puebla 25 usuarios con perfiles completos (incluyendo la cuenta de superadmin al20328051890088@gmail.com),
~25 lienzos por usuario (625 lienzos con capas, frames de animación, snapshots PNG reales y dibujos procedurales),
publicaciones, comentarios, likes, red de seguidores, notificaciones, publicidad y telemetría.
"""

DEFAULT_PASSWORD_HASH = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' # "password"
BATCH_SIZE = 500

SEED_USERS_DATA = [
    {
        "id": 1,
        "uuid": "00000000-0000-0000-0000-000000000001",
        "username": "admin",
        "identifier": "admin",
        "email": "admin@example.com",
        "tier": 3,
        "role_id": 4,
        "avatar": "/public/assets/img/fallbacks/avatar-default.png",
        "banner": "assets/img/banners/banner_1.svg",
        "bio": "Administrador Oficial del Sistema Spriteboard 🛡️⚡",
        "flags": ["admin_verified", "early_supporter", "system_staff"]
    },
    {
        "id": 2,
        "uuid": "00000000-0000-0000-0000-000000000002",
        "username": "jorge",
        "identifier": "jorge_ortega",
        "email": "al20328051890088@gmail.com",
        "tier": 3,
        "role_id": 4,
        "avatar": "/public/assets/img/fallbacks/avatar-default.png",
        "banner": "assets/img/banners/banner_2.svg",
        "bio": "Creador y Desarrollador Principal de Spriteboard 🎨✨🚀",
        "flags": ["admin_verified", "verified_artist", "beta_access", "early_supporter"]
    },
    {
        "id": 3,
        "uuid": "00000000-0000-0000-0000-000000000003",
        "username": "pixel_queen",
        "identifier": "pixel_queen",
        "email": "elena.art@example.com",
        "tier": 3,
        "role_id": 3,
        "avatar": "/public/assets/img/fallbacks/avatar-default.png",
        "banner": "assets/img/banners/banner_3.svg",
        "bio": "Ilustradora 2D y pixel artist apasionada por los tonos pastel y fantasía 🌸✨",
        "flags": ["verified_artist", "trusted_creator"]
    },
    {
        "id": 4,
        "uuid": "00000000-0000-0000-0000-000000000004",
        "username": "retro_coder",
        "identifier": "retro_coder",
        "email": "david.dev@example.com",
        "tier": 2,
        "role_id": 2,
        "avatar": "/public/assets/img/fallbacks/avatar-default.png",
        "banner": "assets/img/banners/banner_4.svg",
        "bio": "Game dev retro y creador de spritesheets 8-bit / 16-bit 🕹️👾",
        "flags": ["verified_artist", "beta_access"]
    },
    {
        "id": 5,
        "uuid": "00000000-0000-0000-0000-000000000005",
        "username": "cyber_samurai",
        "identifier": "cyber_samurai",
        "email": "mateo.cyber@example.com",
        "tier": 2,
        "role_id": 2,
        "avatar": "/public/assets/img/fallbacks/avatar-default.png",
        "banner": "assets/img/banners/banner_5.svg",
        "bio": "Explorando mundos distópicos cyberpunk y luces de neón ⚔️🌆",
        "flags": ["verified_artist"]
    },
    {
        "id": 6,
        "uuid": "00000000-0000-0000-0000-000000000006",
        "username": "neon_fox",
        "identifier": "neon_fox",
        "email": "sofia.neon@example.com",
        "tier": 3,
        "role_id": 1,
        "avatar": "/public/assets/img/fallbacks/avatar-default.png",
        "banner": "assets/img/banners/banner_1.svg",
        "bio": "Amante del synthwave, las auroras boreales y los zorros de neón 🦊✨",
        "flags": ["early_supporter", "trusted_creator"]
    },
    {
        "id": 7,
        "uuid": "00000000-0000-0000-0000-000000000007",
        "username": "synth_wave",
        "identifier": "synth_wave",
        "email": "carlos.wave@example.com",
        "tier": 2,
        "role_id": 1,
        "avatar": "/public/assets/img/fallbacks/avatar-default.png",
        "banner": "assets/img/banners/banner_2.svg",
        "bio": "Música synthwave y paisajes ochenteros en cuadrícula 🌅📼",
        "flags": ["verified_artist"]
    },
    {
        "id": 8,
        "uuid": "00000000-0000-0000-0000-000000000008",
        "username": "isometric_pro",
        "identifier": "isometric_pro",
        "email": "lucia.iso@example.com",
        "tier": 3,
        "role_id": 1,
        "avatar": "/public/assets/img/fallbacks/avatar-default.png",
        "banner": "assets/img/banners/banner_3.svg",
        "bio": "Construyendo ciudades e interiores isométricos píxel a píxel 🏙️📐",
        "flags": ["trusted_creator", "verified_artist"]
    },
    {
        "id": 9,
        "uuid": "00000000-0000-0000-0000-000000000009",
        "username": "chibi_master",
        "identifier": "chibi_master",
        "email": "gabriel.chibi@example.com",
        "tier": 1,
        "role_id": 1,
        "avatar": "/public/assets/img/fallbacks/avatar-default.png",
        "banner": "assets/img/banners/banner_4.svg",
        "bio": "Creando personajes chibi, avatares y stickers kawaii 🐱🍙",
        "flags": ["beta_access"]
    },
    {
        "id": 10,
        "uuid": "00000000-0000-0000-0000-000000000010",
        "username": "galaxy_dreamer",
        "identifier": "galaxy_dreamer",
        "email": "valentina.space@example.com",
        "tier": 2,
        "role_id": 1,
        "avatar": "/public/assets/img/fallbacks/avatar-default.png",
        "banner": "assets/img/banners/banner_5.svg",
        "bio": "Nebulosas, constelaciones y universos pixelados infinitos 🌌🪐",
        "flags": ["early_supporter"]
    },
    {
        "id": 11,
        "uuid": "00000000-0000-0000-0000-000000000011",
        "username": "pixel_knight",
        "identifier": "pixel_knight",
        "email": "andres.knight@example.com",
        "tier": 2,
        "role_id": 1,
        "avatar": "/public/assets/img/fallbacks/avatar-default.png",
        "banner": "assets/img/banners/banner_1.svg",
        "bio": "Paladín del pixel art medieval, castillos y mazmorras RPG 🛡️🏰",
        "flags": ["trusted_creator"]
    },
    {
        "id": 12,
        "uuid": "00000000-0000-0000-0000-000000000012",
        "username": "voxel_wizard",
        "identifier": "voxel_wizard",
        "email": "camila.voxel@example.com",
        "tier": 1,
        "role_id": 1,
        "avatar": "/public/assets/img/fallbacks/avatar-default.png",
        "banner": "assets/img/banners/banner_2.svg",
        "bio": "Magia de píxeles, efectos de partículas y animaciones fluidas ✨🧙‍♀️",
        "flags": []
    },
    {
        "id": 13,
        "uuid": "00000000-0000-0000-0000-000000000013",
        "username": "dungeon_crawler",
        "identifier": "dungeon_crawler",
        "email": "javier.dungeon@example.com",
        "tier": 1,
        "role_id": 1,
        "avatar": "/public/assets/img/fallbacks/avatar-default.png",
        "banner": "assets/img/banners/banner_3.svg",
        "bio": "Tilesets de mazmorras oscuras, trampas y monstruos clásicos 🐉🗝️",
        "flags": []
    },
    {
        "id": 14,
        "uuid": "00000000-0000-0000-0000-000000000014",
        "username": "vapor_vibes",
        "identifier": "vapor_vibes",
        "email": "isabella.vapor@example.com",
        "tier": 2,
        "role_id": 1,
        "avatar": "/public/assets/img/fallbacks/avatar-default.png",
        "banner": "assets/img/banners/banner_4.svg",
        "bio": "Estética vaporwave, estatuas clásicas y nostalgia 90s 🏛️🌴",
        "flags": ["verified_artist"]
    },
    {
        "id": 15,
        "uuid": "00000000-0000-0000-0000-000000000015",
        "username": "arcade_legend",
        "identifier": "arcade_legend",
        "email": "daniel.arcade@example.com",
        "tier": 1,
        "role_id": 1,
        "avatar": "/public/assets/img/fallbacks/avatar-default.png",
        "banner": "assets/img/banners/banner_5.svg",
        "bio": "Reviviendo la era dorada de las máquinas recreativas arcade 👾🪙",
        "flags": []
    },
    {
        "id": 16,
        "uuid": "00000000-0000-0000-0000-000000000016",
        "username": "flora_fauna",
        "identifier": "flora_fauna",
        "email": "emma.flora@example.com",
        "tier": 2,
        "role_id": 1,
        "avatar": "/public/assets/img/fallbacks/avatar-default.png",
        "banner": "assets/img/banners/banner_1.svg",
        "bio": "Flores, bosques encantados y animales mágicos en pixel art 🌿🦊",
        "flags": ["trusted_creator"]
    },
    {
        "id": 17,
        "uuid": "00000000-0000-0000-0000-000000000017",
        "username": "mecha_builder",
        "identifier": "mecha_builder",
        "email": "diego.mecha@example.com",
        "tier": 1,
        "role_id": 1,
        "avatar": "/public/assets/img/fallbacks/avatar-default.png",
        "banner": "assets/img/banners/banner_2.svg",
        "bio": "Robots gigantes, naves espaciales y maquinaria futurista 🤖⚙️",
        "flags": []
    },
    {
        "id": 18,
        "uuid": "00000000-0000-0000-0000-000000000018",
        "username": "cosmic_voyager",
        "identifier": "cosmic_voyager",
        "email": "paula.cosmic@example.com",
        "tier": 3,
        "role_id": 1,
        "avatar": "/public/assets/img/fallbacks/avatar-default.png",
        "banner": "assets/img/banners/banner_3.svg",
        "bio": "Viajando por agujeros de gusano y planetas alienígenas 🚀⭐",
        "flags": ["early_supporter", "verified_artist"]
    },
    {
        "id": 19,
        "uuid": "00000000-0000-0000-0000-000000000019",
        "username": "fantasy_artisan",
        "identifier": "fantasy_artisan",
        "email": "alberto.fantasy@example.com",
        "tier": 0,
        "role_id": 1,
        "avatar": "/public/assets/img/fallbacks/avatar-default.png",
        "banner": "assets/img/banners/banner_4.svg",
        "bio": "Armas legendarias, pociones y reliquias arcanas 🗡️🧪",
        "flags": []
    },
    {
        "id": 20,
        "uuid": "00000000-0000-0000-0000-000000000020",
        "username": "glitch_master",
        "identifier": "glitch_master",
        "email": "mariana.glitch@example.com",
        "tier": 1,
        "role_id": 1,
        "avatar": "/public/assets/img/fallbacks/avatar-default.png",
        "banner": "assets/img/banners/banner_5.svg",
        "bio": "Arte glitch analógico, aberración cromática y distorsiones CRT 📺⚡",
        "flags": []
    },
    {
        "id": 21,
        "uuid": "00000000-0000-0000-0000-000000000021",
        "username": "speed_painter",
        "identifier": "speed_painter",
        "email": "rodrigo.speed@example.com",
        "tier": 0,
        "role_id": 1,
        "avatar": "/public/assets/img/fallbacks/avatar-default.png",
        "banner": "assets/img/banners/banner_1.svg",
        "bio": "Desafíos de dibujo rápido y paletas de 4 colores ⏱️🎨",
        "flags": []
    },
    {
        "id": 22,
        "uuid": "00000000-0000-0000-0000-000000000022",
        "username": "sprite_animator",
        "identifier": "sprite_animator",
        "email": "natalia.anim@example.com",
        "tier": 2,
        "role_id": 1,
        "avatar": "/public/assets/img/fallbacks/avatar-default.png",
        "banner": "assets/img/banners/banner_2.svg",
        "bio": "Animadora de ciclos de caminata, ataques y efectos de combate 🏃‍♀️✨",
        "flags": ["trusted_creator"]
    },
    {
        "id": 23,
        "uuid": "00000000-0000-0000-0000-000000000023",
        "username": "zen_gardener",
        "identifier": "zen_gardener",
        "email": "fernando.zen@example.com",
        "tier": 0,
        "role_id": 1,
        "avatar": "/public/assets/img/fallbacks/avatar-default.png",
        "banner": "assets/img/banners/banner_3.svg",
        "bio": "Jardines zen, bonsáis y templos tranquilos en miniatura ⛩️🎋",
        "flags": []
    },
    {
        "id": 24,
        "uuid": "00000000-0000-0000-0000-000000000024",
        "username": "street_artist",
        "identifier": "street_artist",
        "email": "valeria.street@example.com",
        "tier": 1,
        "role_id": 1,
        "avatar": "/public/assets/img/fallbacks/avatar-default.png",
        "banner": "assets/img/banners/banner_4.svg",
        "bio": "Graffitis digitales, murales y cultura urbana en píxeles 🎨🏙️",
        "flags": []
    },
    {
        "id": 25,
        "uuid": "00000000-0000-0000-0000-000000000025",
        "username": "mythic_tales",
        "identifier": "mythic_tales",
        "email": "hector.myth@example.com",
        "tier": 2,
        "role_id": 1,
        "avatar": "/public/assets/img/fallbacks/avatar-default.png",
        "banner": "assets/img/banners/banner_5.svg",
        "bio": "Criaturas mitológicas, dragones ancestrales y bestias épicas 🐲🔥",
        "flags": ["verified_artist"]
    }
]

CANVAS_THEMES = [
    'PixelArt', 'Cyberpunk', 'Galaxy', 'Synthwave', 'Vaporwave',
    'Fantasy', 'Medieval', 'Retro', 'Isometric', 'Landscape',
    'Dungeon', 'Space', 'Chibi', 'Anime', 'Arcade', 'Forest', 'Mecha'
]

THEME_PALETTES = {
    'PixelArt': [
        (34, 32, 52), (69, 40, 60), (102, 57, 49), (143, 86, 59), (223, 113, 38),
        (217, 160, 102), (238, 195, 154), (251, 242, 54), (153, 229, 80), (106, 190, 48),
        (55, 148, 110), (75, 105, 47), (82, 75, 36), (50, 60, 57), (63, 63, 116),
        (48, 96, 130), (91, 110, 225), (99, 155, 255), (95, 205, 228), (203, 219, 252), (255, 255, 255)
    ],
    'Cyberpunk': [
        (13, 2, 33), (15, 8, 75), (38, 64, 139), (5, 217, 232), (0, 86, 112),
        (255, 42, 109), (209, 247, 255), (1, 1, 43), (243, 230, 0), (255, 0, 128)
    ],
    'Galaxy': [
        (5, 5, 16), (21, 0, 80), (63, 0, 113), (97, 0, 148), (0, 0, 0),
        (255, 250, 101), (0, 245, 212), (123, 44, 191), (224, 170, 255), (255, 255, 255)
    ],
    'Synthwave': [
        (18, 4, 88), (255, 0, 127), (0, 240, 255), (255, 230, 0), (121, 40, 202),
        (43, 9, 56), (255, 128, 191), (255, 255, 255), (74, 0, 114), (255, 107, 107)
    ],
    'Vaporwave': [
        (255, 113, 206), (1, 205, 254), (5, 255, 161), (185, 103, 255), (255, 251, 150),
        (36, 27, 47), (47, 33, 68), (134, 93, 255), (255, 255, 255)
    ],
    'Fantasy': [
        (27, 38, 44), (15, 76, 117), (50, 130, 184), (187, 225, 250), (199, 162, 82),
        (139, 90, 43), (74, 124, 89), (54, 83, 20), (247, 215, 148), (120, 111, 166)
    ],
    'Medieval': [
        (44, 62, 80), (189, 195, 199), (127, 140, 141), (241, 196, 15), (230, 126, 34),
        (231, 76, 60), (52, 73, 94), (149, 165, 166), (121, 85, 72), (46, 204, 113)
    ],
    'Retro': [
        (155, 188, 15), (139, 172, 15), (48, 98, 48), (15, 56, 15), (240, 246, 240),
        (34, 34, 34), (230, 77, 60), (41, 128, 185), (241, 196, 15), (39, 174, 96)
    ],
    'Isometric': [
        (45, 52, 54), (99, 110, 114), (178, 190, 195), (223, 230, 233), (9, 132, 227),
        (116, 185, 255), (0, 206, 201), (129, 236, 236), (250, 177, 160), (255, 118, 117)
    ],
    'Landscape': [
        (30, 60, 114), (42, 82, 152), (109, 213, 237), (33, 147, 176), (120, 255, 214),
        (168, 255, 120), (248, 87, 166), (255, 88, 88), (255, 255, 255), (255, 195, 18)
    ],
    'Dungeon': [
        (20, 20, 25), (45, 45, 55), (80, 80, 95), (140, 135, 130), (200, 70, 50),
        (240, 160, 40), (255, 220, 100), (40, 120, 80), (160, 40, 160), (220, 220, 230)
    ],
    'Space': [
        (2, 2, 10), (15, 12, 40), (40, 25, 80), (90, 45, 140), (200, 80, 190),
        (255, 180, 220), (255, 255, 255), (50, 200, 255), (255, 220, 80), (20, 240, 160)
    ]
}

CHAT_SAMPLES = [
    "¡Increíble composición de color! Me encanta cómo manejas la iluminación.",
    "¿Qué paleta de colores usaste para los reflejos?",
    "Trabajando en la capa de fondo, voy a agregar sombras.",
    "El contraste en esta sección quedó genial.",
    "¿Alguien disponible para colaborar en el área central?",
    "Me encanta este proyecto, guardado en mis favoritos ⭐",
    "Agregué un nuevo frame de animación para probar el efecto de parpadeo.",
    "Quedó excelente el degradado del cielo.",
    "Subí un snapshot a publicaciones para que la comunidad vote.",
    "¡Buen trabajo en equipo!"
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
        except Exception:
            pass

def random_date(start_days_ago=180):
    seconds = random.randint(0, start_days_ago * 86400)
    dt = datetime.now() - timedelta(seconds=seconds)
    return dt.strftime('%Y-%m-%d %H:%M:%S')

def generate_procedural_pixel_art(w, h, theme, canvas_id):
    """
    Generates procedural multi-frame and multi-layer pixel art with binary PNG snapshot.
    Returns: (png_bytes, layers_gz_bytes, palette_hex_list, preview_img)
    """
    palette = THEME_PALETTES.get(theme, THEME_PALETTES['PixelArt'])
    palette_hex = ['#{:02x}{:02x}{:02x}'.format(*c) for c in palette[:8]]
    
    # Layer 1: Background
    img_bg = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw_bg = ImageDraw.Draw(img_bg)
    bg_color = palette[0] + (255,)
    draw_bg.rectangle([0, 0, w, h], fill=bg_color)
    
    step = max(4, w // 8)
    bg_accent = palette[1 % len(palette)] + (200,)
    for gx in range(0, w, step):
        draw_bg.line([(gx, 0), (gx, h)], fill=bg_accent, width=1)
    for gy in range(0, h, step):
        draw_bg.line([(0, gy), (w, gy)], fill=bg_accent, width=1)
        
    bg_b64 = base64.b64encode(img_bg.tobytes()).decode('ascii')
    
    # Layer 2: Main Subject (Frame 1)
    img_art1 = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw_art1 = ImageDraw.Draw(img_art1)
    
    cx, cy = w // 2, h // 2
    r_main = min(w, h) // 3
    c_main = palette[2 % len(palette)] + (255,)
    c_sub = palette[3 % len(palette)] + (255,)
    c_hi = palette[4 % len(palette)] + (255,)
    
    pattern_type = canvas_id % 5
    if pattern_type == 0:
        for dr in range(r_main, 2, -max(2, r_main // 4)):
            col = palette[(dr + canvas_id) % len(palette)] + (255,)
            draw_art1.polygon([(cx, cy - dr), (cx + dr, cy), (cx, cy + dr), (cx - dr, cy)], fill=col)
    elif pattern_type == 1:
        sun_col = palette[7 % len(palette)] + (255,)
        draw_art1.ellipse([cx - r_main//2, cy - r_main - 2, cx + r_main//2, cy - 2], fill=sun_col)
        draw_art1.polygon([(0, h), (cx - 4, cy - 2), (cx + r_main, h)], fill=c_main)
        draw_art1.polygon([(cx - r_main, h), (cx + 6, cy + 4), (w, h)], fill=c_sub)
    elif pattern_type == 2:
        for px in range(-r_main, r_main + 1, max(1, w // 16)):
            py_max = int(math.sqrt(max(0, r_main**2 - px**2)))
            for py in range(-py_max, py_max + 1, max(1, h // 16)):
                if (px * py + canvas_id) % 3 == 0:
                    draw_art1.rectangle([cx + px, cy + py, cx + px + max(1, w//32), cy + py + max(1, h//32)], fill=c_main)
                elif (px + py) % 2 == 0:
                    draw_art1.rectangle([cx + px, cy + py, cx + px + max(1, w//32), cy + py + max(1, h//32)], fill=c_sub)
    elif pattern_type == 3:
        cube_size = max(4, r_main // 2)
        top_col = palette[5 % len(palette)] + (255,)
        left_col = palette[2 % len(palette)] + (255,)
        right_col = palette[3 % len(palette)] + (255,)
        draw_art1.polygon([(cx, cy - cube_size), (cx + cube_size, cy - cube_size//2), (cx, cy), (cx - cube_size, cy - cube_size//2)], fill=top_col)
        draw_art1.polygon([(cx - cube_size, cy - cube_size//2), (cx, cy), (cx, cy + cube_size), (cx - cube_size, cy + cube_size//2)], fill=left_col)
        draw_art1.polygon([(cx, cy), (cx + cube_size, cy - cube_size//2), (cx + cube_size, cy + cube_size//2), (cx, cy + cube_size)], fill=right_col)
    else:
        bar_w = max(2, w // 8)
        for bx in range(0, w, bar_w + 2):
            bh = ((bx * 7 + canvas_id * 13) % (h // 2)) + h // 4
            col = palette[(bx // bar_w + canvas_id) % len(palette)] + (255,)
            draw_art1.rectangle([bx, h - bh, bx + bar_w, h], fill=col)
            for wy in range(h - bh + 4, h - 2, 6):
                draw_art1.rectangle([bx + 1, wy, bx + bar_w - 1, wy + 2], fill=c_hi)

    art1_b64 = base64.b64encode(img_art1.tobytes()).decode('ascii')
    
    # Layer 2 for Frame 2
    img_art2 = img_art1.copy()
    draw_art2 = ImageDraw.Draw(img_art2)
    sparkle_col = palette[6 % len(palette)] + (255,)
    draw_art2.rectangle([cx - 3, cy - r_main - 4, cx + 3, cy - r_main + 2], fill=sparkle_col)
    draw_art2.rectangle([cx + r_main - 2, cy + 4, cx + r_main + 4, cy + 10], fill=sparkle_col)
    art2_b64 = base64.b64encode(img_art2.tobytes()).decode('ascii')
    
    # Compose Frame 1 as master snapshot
    master_img = Image.alpha_composite(img_bg, img_art1)
    png_bio = io.BytesIO()
    master_img.save(png_bio, format='PNG', optimize=True)
    png_bytes = png_bio.getvalue()
    
    layers_struct = {
        "activeFrameId": "frame-1",
        "activeLayerId": "layer-2",
        "frames": [
            {
                "id": "frame-1",
                "durationMs": 150,
                "layers": [
                    {
                        "id": "layer-1",
                        "name": "Fondo",
                        "visible": True,
                        "locked": True,
                        "opacity": 1.0,
                        "bufferBase64": bg_b64
                    },
                    {
                        "id": "layer-2",
                        "name": f"Arte {theme}",
                        "visible": True,
                        "locked": False,
                        "opacity": 1.0,
                        "bufferBase64": art1_b64
                    }
                ]
            },
            {
                "id": "frame-2",
                "durationMs": 150,
                "layers": [
                    {
                        "id": "layer-1",
                        "name": "Fondo",
                        "visible": True,
                        "locked": True,
                        "opacity": 1.0,
                        "bufferBase64": bg_b64
                    },
                    {
                        "id": "layer-2",
                        "name": f"Arte {theme}",
                        "visible": True,
                        "locked": False,
                        "opacity": 1.0,
                        "bufferBase64": art2_b64
                    }
                ]
            }
        ],
        "layers": [
            {
                "id": "layer-1",
                "name": "Fondo",
                "visible": True,
                "locked": True,
                "opacity": 1.0,
                "bufferBase64": bg_b64
            },
            {
                "id": "layer-2",
                "name": f"Arte {theme}",
                "visible": True,
                "locked": False,
                "opacity": 1.0,
                "bufferBase64": art1_b64
            }
        ],
        "recent_colors": palette_hex
    }
    
    layers_json = json.dumps(layers_struct, ensure_ascii=False)
    layers_gz_bytes = zlib.compress(layers_json.encode('utf-8'))
    
    return png_bytes, layers_gz_bytes, palette_hex, master_img


def seed_database(project_root, num_users=25, canvases_per_user=25):
    start_total_time = time.time()
    config = load_db_config(project_root)
    init_dir = os.path.join(project_root, 'docker', 'mysql', 'init')

    print(f"\n{Colors.HEADER}{Colors.BOLD}======================================================================{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}   INICIANDO POBLACIÓN INTEGRAL Y COMPLETA DE BASE DE DATOS         {Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}======================================================================{Colors.ENDC}")
    print(f"Conectando a MySQL en {Colors.BLUE}{config['host']}:{config['port']}{Colors.ENDC} como {Colors.BLUE}{config['user']}{Colors.ENDC}...")

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
        # 1. Recrear esquemas limpios desde docker/mysql/init/
        print(f"\n{Colors.WARNING}1/5 Recreando esquemas limpios desde docker/mysql/init/...{Colors.ENDC}")
        schema_files = [
            'db_identity.sql',
            'db_canvases.sql',
            'db_telemetry.sql',
            'db_advertisements.sql',
            'db_publications_and_profiles.sql'
        ]

        cursor.execute("DROP DATABASE IF EXISTS db_identity;")
        cursor.execute("DROP DATABASE IF EXISTS db_canvases;")
        cursor.execute("DROP DATABASE IF EXISTS db_telemetry;")
        cursor.execute("DROP DATABASE IF EXISTS db_advertisements;")
        conn.commit()

        for sf in schema_files:
            file_p = os.path.join(init_dir, sf)
            if os.path.exists(file_p):
                print(f"  -> Ejecutando esquema: {Colors.BLUE}{sf}{Colors.ENDC}")
                execute_sql_file(cursor, file_p)
                conn.commit()

        # Otorgar permisos globales al ejecutor
        grant_sql = f"""
        GRANT ALL PRIVILEGES ON db_identity.* TO '{config['app_user']}'@'%';
        GRANT ALL PRIVILEGES ON db_canvases.* TO '{config['app_user']}'@'%';
        GRANT ALL PRIVILEGES ON db_telemetry.* TO '{config['app_user']}'@'%';
        GRANT ALL PRIVILEGES ON db_advertisements.* TO '{config['app_user']}'@'%';
        FLUSH PRIVILEGES;
        """
        for g_stmt in grant_sql.strip().split(';'):
            if g_stmt.strip():
                cursor.execute(g_stmt)
        conn.commit()
        print(f"{Colors.GREEN}✓ Esquemas recreados y permisos asignados con éxito.{Colors.ENDC}")

        cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
        cursor.execute("SET UNIQUE_CHECKS = 0;")

        # -------------------------------------------------------------
        # 2. POBLAR DB_IDENTITY (25 Usuarios de Calidad)
        # -------------------------------------------------------------
        print(f"\n{Colors.WARNING}2/5 Poblando 'db_identity' ({num_users} usuarios completos)...{Colors.ENDC}")
        cursor.execute("USE db_identity;")

        # Inserción de usuarios
        print("  -> Generando tabla: `users`...")
        user_rows = []
        for u in SEED_USERS_DATA[:num_users]:
            user_rows.append((
                u["id"],
                u["uuid"],
                u["username"],
                u["identifier"],
                random_date(120), # identifier_updated_at
                u["email"],
                DEFAULT_PASSWORD_HASH,
                u["tier"],
                f'cus_stripe_{u["uuid"][:8]}',
                None, # two_factor_secret
                0,    # two_factor_enabled
                None, # two_factor_recovery_codes
                None, # deletion_scheduled_at
                u["avatar"],
                u["banner"],
                u["bio"],
                None, # google_id
                random_date(300),
                random.randint(1048576, 50 * 1024 * 1024),
                random.randint(0, 50),
                None
            ))

        sql_users = """
        INSERT INTO `users` (id, uuid, username, identifier, identifier_updated_at, email, password, subscription_tier,
                            stripe_customer_id, two_factor_secret, two_factor_enabled, two_factor_recovery_codes,
                            deletion_scheduled_at, profile_picture, banner_picture, bio, google_id, created_at,
                            storage_used_bytes, template_tokens_used, template_tokens_reset_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.executemany(sql_users, user_rows)
        conn.commit()

        # Roles de usuario
        print("  -> Generando tabla: `user_roles`...")
        role_rows = [(u["id"], u["role_id"]) for u in SEED_USERS_DATA[:num_users]]
        cursor.executemany("INSERT IGNORE INTO `user_roles` (user_id, role_id) VALUES (%s, %s)", role_rows)
        conn.commit()

        # Preferencias de usuario
        print("  -> Generando tabla: `user_preferences`...")
        pref_rows = []
        for u in SEED_USERS_DATA[:num_users]:
            lang = random.choice(['es-419', 'en-US', 'es-ES'])
            theme = random.choice(['dark', 'system', 'light'])
            pref_rows.append((u["id"], lang, 1, theme, 0, 1, random_date(200)))
        cursor.executemany("INSERT INTO `user_preferences` (user_id, language, open_links_new_tab, theme, extended_alerts, allow_telemetry, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s)", pref_rows)
        conn.commit()

        # Flags de usuario
        print("  -> Generando tabla: `user_flags`...")
        flag_rows = []
        for u in SEED_USERS_DATA[:num_users]:
            for f in u.get("flags", []):
                flag_rows.append((u["id"], f, random_date(180)))
        if flag_rows:
            cursor.executemany("INSERT IGNORE INTO `user_flags` (user_id, flag_key, created_at) VALUES (%s, %s, %s)", flag_rows)
            conn.commit()

        # Suscripciones y Pagos
        print("  -> Generando tablas: `subscriptions` y `payment_history`...")
        sub_rows = []
        pay_rows = []
        for u in SEED_USERS_DATA[:num_users]:
            if u["tier"] > 0:
                s_date = random_date(90)
                sub_rows.append((
                    u["id"],
                    f'cus_stripe_{u["id"]}',
                    f'sub_stripe_{u["id"]}_{uuid.uuid4().hex[:6]}',
                    f'cs_stripe_{uuid.uuid4().hex[:8]}',
                    u["tier"],
                    'monthly',
                    'active',
                    s_date,
                    datetime.now() + timedelta(days=30),
                    None,
                    s_date
                ))
                pay_rows.append((
                    u["id"],
                    f'pi_{uuid.uuid4().hex[:16]}',
                    f'in_{uuid.uuid4().hex[:14]}',
                    999 if u["tier"] == 2 else 1999,
                    'usd',
                    f'Pago de suscripción mensual Nivel {u["tier"]}',
                    'succeeded',
                    s_date
                ))
        if sub_rows:
            cursor.executemany("""
                INSERT INTO `subscriptions` (user_id, stripe_customer_id, stripe_subscription_id, stripe_checkout_session_id,
                                             tier, billing_period, status, current_period_start, current_period_end, canceled_at, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, sub_rows)
        if pay_rows:
            cursor.executemany("""
                INSERT INTO `payment_history` (user_id, stripe_payment_intent_id, stripe_invoice_id, amount_cents, currency, description, status, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, pay_rows)
        conn.commit()

        # Paletas personalizadas
        print("  -> Generando tabla: `custom_palettes`...")
        pal_rows = []
        for u in SEED_USERS_DATA[:num_users]:
            pal_colors_json = json.dumps([
                {"hex": "#FF5733", "name": "Coral Sunset"},
                {"hex": "#33FF57", "name": "Mint Glade"},
                {"hex": "#3357FF", "name": "Neon Cyan"},
                {"hex": "#F3FF33", "name": "Solar Flare"},
                {"hex": "#8E44AD", "name": "Deep Arcane"}
            ])
            pal_rows.append((u["id"], f"custom_palette_{u['id']}", f"Paleta Artística @{u['identifier']}", pal_colors_json, random_date(100)))
        cursor.executemany("INSERT INTO `custom_palettes` (user_id, palette_key, name, colors, created_at) VALUES (%s, %s, %s, %s, %s)", pal_rows)
        conn.commit()

        # Red de Seguidores (user_follows)
        print("  -> Generando tabla: `user_follows` (Grafo Social Activo)...")
        follow_rows = []
        for u in SEED_USERS_DATA[:num_users]:
            u_id = u["id"]
            # User 2 (Jorge) es seguido por todos
            if u_id != 2:
                follow_rows.append((u_id, 2, random_date(150)))
            # Seguir aleatoriamente a 6-12 otros creadores
            other_ids = [o["id"] for o in SEED_USERS_DATA[:num_users] if o["id"] != u_id and o["id"] != 2]
            for target_id in random.sample(other_ids, min(len(other_ids), random.randint(6, 12))):
                follow_rows.append((u_id, target_id, random_date(120)))
        cursor.executemany("INSERT IGNORE INTO `user_follows` (follower_id, following_id, created_at) VALUES (%s, %s, %s)", follow_rows)
        conn.commit()

        # Notificaciones de usuario
        print("  -> Generando tabla: `notifications`...")
        notif_rows = []
        notif_types = ['follow', 'publication_like', 'publication_comment', 'canvas_invite']
        for u in SEED_USERS_DATA[:num_users]:
            u_id = u["id"]
            for _ in range(random.randint(8, 20)):
                actor_id = random.choice([o["id"] for o in SEED_USERS_DATA[:num_users] if o["id"] != u_id])
                n_type = random.choice(notif_types)
                data_json = json.dumps({"action": n_type, "message": f"Nueva interacción de usuario en la plataforma"})
                notif_rows.append((
                    u_id,
                    actor_id,
                    n_type,
                    random.randint(1, 50),
                    str(uuid.uuid4()),
                    data_json,
                    random.choice([0, 1]),
                    random_date(60)
                ))
        cursor.executemany("INSERT INTO `notifications` (user_id, actor_id, type, target_id, target_uuid, data, is_read, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)", notif_rows)
        conn.commit()

        # Registros de moderación y restricciones
        print("  -> Generando restricciones y logs de seguridad...")
        rest_rows = [(u["id"], 0, None, None, None, None, None, None) for u in SEED_USERS_DATA[:num_users]]
        cursor.executemany("INSERT INTO `user_restrictions` (user_id, is_suspended, suspension_type, suspension_reason, suspension_end_date, deleted_by, deleted_reason, admin_notes) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)", rest_rows)
        conn.commit()

        print(f"{Colors.GREEN}✓ db_identity poblada con éxito.{Colors.ENDC}")

        # -------------------------------------------------------------
        # 3. POBLAR DB_CANVASES (625 Canvases con Dibujos, Capas y Frames)
        # -------------------------------------------------------------
        total_canvases = num_users * canvases_per_user
        print(f"\n{Colors.WARNING}3/5 Poblando 'db_canvases' ({total_canvases} lienzos con dibujos, capas y frames)...{Colors.ENDC}")
        cursor.execute("USE db_canvases;")

        canvas_rows = []
        snapshot_rows = []
        layers_rows = []
        recent_colors_rows = []
        members_rows = []
        canvas_user_roles_rows = []
        favorites_rows = []
        snapshots_history_rows = []
        snapshots_likes_rows = []
        chat_rows = []
        reset_rows = []
        resize_rows = []
        invite_rows = []
        publications_rows = []
        publication_likes_rows = []
        publication_comments_rows = []
        minio_canvas_items = []
        minio_pub_items = []

        pub_counter = 1
        canvas_counter = 1

        for u in SEED_USERS_DATA[:num_users]:
            u_id = u["id"]
            u_name = u["username"]

            for c_idx in range(1, canvases_per_user + 1):
                c_id = canvas_counter
                canvas_counter += 1

                c_uuid = str(uuid.uuid4())
                theme = random.choice(CANVAS_THEMES)
                size_str = random.choice(['32', '64', '128'])
                size_int = int(size_str)
                
                # Distribución de modos: ~60% offline, ~40% online
                mode = 'offline' if c_idx <= 15 else 'online'
                is_online_active = 1 if (mode == 'online' and c_idx in (16, 20)) else 0
                last_online = datetime.now().strftime('%Y-%m-%d %H:%M:%S') if mode == 'online' else None
                privacy = 'public' if c_idx <= 20 else 'private'
                
                c_name = f"{theme} Studio #{c_idx} (@{u['identifier']})"
                tags_json = json.dumps([theme.lower(), "pixelart", f"art_{c_idx}", "spriteboard"])
                
                fav_cnt = random.randint(3, 45)
                mem_cnt = random.randint(2, 10)
                px_cnt = random.randint(150, 25000)
                msg_cnt = random.randint(3, 20)

                canvas_rows.append((
                    c_id,
                    c_uuid,
                    u_id,
                    c_name,
                    tags_json,
                    privacy,
                    0, # requires_approval
                    1, # allow_chat
                    0, # is_subscription_locked
                    None,
                    size_str,
                    'default',
                    50, # max_participants
                    5,
                    10,
                    fav_cnt,
                    mem_cnt,
                    px_cnt,
                    msg_cnt,
                    0, # is_frozen
                    mode,
                    is_online_active,
                    random.randint(10240, 524288),
                    last_online,
                    random_date(180),
                    None,
                    None
                ))

                # Generar arte procedural, capas gzip y snapshot PNG
                png_bytes, layers_gz, pal_hex, master_pil = generate_procedural_pixel_art(size_int, size_int, theme, c_id)

                minio_canvas_items.append((c_id, c_uuid, png_bytes, layers_gz, master_pil))
                snapshot_rows.append((c_id, f"snapshots/canvas_{c_id}_main.png", png_bytes))
                layers_rows.append((c_id, f"layers/canvas_{c_id}.json.gz", layers_gz))
                recent_colors_rows.append((u_id, c_id, json.dumps(pal_hex)))

                # Historial de snapshots
                hist_uuid = str(uuid.uuid4())
                snapshots_history_rows.append((c_id, hist_uuid, f"snapshots/history_canvas_{c_id}_{hist_uuid[:8]}.png", None, 'public', random_date(60)))

                # Miembros y favoritos
                c_created_at_val = random_date(180)
                members_rows.append((c_id, u_id, c_created_at_val))
                canvas_user_roles_rows.append((c_id, u_id, 4)) # SuperAdmin / Owner

                other_user_ids = [o["id"] for o in SEED_USERS_DATA[:num_users] if o["id"] != u_id]
                for mem_id in random.sample(other_user_ids, min(len(other_user_ids), random.randint(2, 6))):
                    members_rows.append((c_id, mem_id, random_date(90)))
                    canvas_user_roles_rows.append((c_id, mem_id, 1)) # Usuario
                for fav_id in random.sample(other_user_ids, min(len(other_user_ids), random.randint(3, 8))):
                    favorites_rows.append((c_id, fav_id, random_date(90)))

                # Mensajes de Chat en lienzo
                for msg_i in range(random.randint(2, 6)):
                    chat_sender = random.choice([u_id] + other_user_ids)
                    chat_rows.append((
                        str(uuid.uuid4()),
                        c_id,
                        chat_sender,
                        random.choice(CHAT_SAMPLES),
                        None,
                        0,
                        'visible',
                        None,
                        None,
                        None,
                        None,
                        None,
                        random_date(30)
                    ))

                # Settings
                reset_rows.append((c_id, 0, None, 1, random_date(100)))
                resize_rows.append((c_id, 0, None, size_str, random_date(100)))
                invite_rows.append((c_id, f"INV{c_id:04d}{random.choice('XYZW')}", 'Usuario', 50, random.randint(0, 10), datetime.now() + timedelta(days=30), u_id, random_date(50)))

                # Publicaciones sociales (~150 publicaciones seleccionadas)
                if c_idx <= 6:
                    pub_id = pub_counter
                    pub_counter += 1
                    pub_uuid = str(uuid.uuid4())
                    pub_title = f"{theme} Showcase #{c_idx}"
                    pub_desc = f"Obra artística inspirada en {theme}. Lienzo de {size_str}x{size_str} con capas y animación."
                    pub_likes = random.randint(5, 50)
                    pub_views = random.randint(30, 400)
                    pub_comments = random.randint(2, 8)
                    publications_rows.append((
                        pub_id,
                        pub_uuid,
                        u_id,
                        c_id,
                        pub_title,
                        pub_desc,
                        tags_json,
                        f"storage/publications/pub_{pub_uuid}.png",
                        size_int,
                        size_int,
                        'default',
                        pub_likes,
                        pub_views,
                        pub_comments,
                        1 if c_idx == 1 else 0,
                        'public',
                        random_date(90)
                    ))
                    minio_pub_items.append((pub_uuid, png_bytes))

                    # Likes y comentarios de publicaciones
                    for like_uid in random.sample(other_user_ids, min(len(other_user_ids), random.randint(3, 10))):
                        publication_likes_rows.append((pub_id, like_uid, random_date(45)))
                    for com_uid in random.sample(other_user_ids, min(len(other_user_ids), random.randint(2, 5))):
                        publication_comments_rows.append((
                            str(uuid.uuid4()),
                            pub_id,
                            com_uid,
                            random.choice(CHAT_SAMPLES),
                            random_date(30)
                        ))

        # Inserciones por lotes en MySQL
        print("  -> Insertando tabla: `canvases`...")
        sql_canvases = """
        INSERT INTO `canvases` (id, uuid, owner_id, name, tags, privacy, requires_approval,
                               allow_chat, is_subscription_locked, locked_reasons, size, palette_id, max_participants,
                               cooldown_pixels_batch, cooldown_seconds, favorites_count, members_count, total_pixels,
                               total_messages, is_frozen, mode, is_online_active, storage_bytes, last_online_at,
                               created_at, deleted_at, deleted_by_user_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        for i in range(0, len(canvas_rows), BATCH_SIZE):
            cursor.executemany(sql_canvases, canvas_rows[i:i+BATCH_SIZE])
        conn.commit()

        print("  -> Insertando tabla: `canvas_snapshots` (PNG binarios)...")
        sql_snapshots = "INSERT INTO `canvas_snapshots` (canvas_id, s3_key, snapshot_data) VALUES (%s, %s, %s)"
        for i in range(0, len(snapshot_rows), BATCH_SIZE):
            cursor.executemany(sql_snapshots, snapshot_rows[i:i+BATCH_SIZE])
        conn.commit()

        print("  -> Insertando tabla: `canvas_layers` (Capas y Frames Gzip)...")
        sql_layers = "INSERT INTO `canvas_layers` (canvas_id, s3_key, layers_data) VALUES (%s, %s, %s)"
        for i in range(0, len(layers_rows), BATCH_SIZE):
            cursor.executemany(sql_layers, layers_rows[i:i+BATCH_SIZE])
        conn.commit()

        print("  -> Insertando tabla: `canvas_recent_colors`...")
        sql_recent = "INSERT INTO `canvas_recent_colors` (user_id, canvas_id, colors) VALUES (%s, %s, %s)"
        for i in range(0, len(recent_colors_rows), BATCH_SIZE):
            cursor.executemany(sql_recent, recent_colors_rows[i:i+BATCH_SIZE])
        conn.commit()

        print("  -> Insertando miembros, roles, favoritos y snapshots históricos...")
        for i in range(0, len(members_rows), BATCH_SIZE):
            cursor.executemany("INSERT IGNORE INTO `canvas_members` (canvas_id, user_id, joined_at) VALUES (%s, %s, %s)", members_rows[i:i+BATCH_SIZE])
        for i in range(0, len(canvas_user_roles_rows), BATCH_SIZE):
            cursor.executemany("INSERT IGNORE INTO `canvas_user_roles` (canvas_id, user_id, role_id) VALUES (%s, %s, %s)", canvas_user_roles_rows[i:i+BATCH_SIZE])
        for i in range(0, len(favorites_rows), BATCH_SIZE):
            cursor.executemany("INSERT IGNORE INTO `canvas_favorites` (canvas_id, user_id, created_at) VALUES (%s, %s, %s)", favorites_rows[i:i+BATCH_SIZE])
        for i in range(0, len(snapshots_history_rows), BATCH_SIZE):
            cursor.executemany("INSERT INTO `canvas_snapshots_history` (canvas_id, snapshot_uuid, file_path, timelapse_path, privacy, created_at) VALUES (%s, %s, %s, %s, %s, %s)", snapshots_history_rows[i:i+BATCH_SIZE])
        conn.commit()

        print("  -> Insertando tabla: `canvas_chat_messages`...")
        sql_chat = """
        INSERT INTO `canvas_chat_messages` (uuid, canvas_id, user_id, message, attachments, file_size, visibility, deleted_by, delete_reason, reply_to, reply_to_username, reply_to_message, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        for i in range(0, len(chat_rows), BATCH_SIZE):
            cursor.executemany(sql_chat, chat_rows[i:i+BATCH_SIZE])
        conn.commit()

        print("  -> Insertando configuración de resets, resizes e invitaciones...")
        cursor.executemany("INSERT IGNORE INTO `canvas_reset_settings` (canvas_id, is_active, next_reset_at, take_snapshot, created_at) VALUES (%s, %s, %s, %s, %s)", reset_rows)
        cursor.executemany("INSERT IGNORE INTO `canvas_resize_settings` (canvas_id, is_active, next_resize_at, target_size, created_at) VALUES (%s, %s, %s, %s, %s)", resize_rows)
        cursor.executemany("INSERT IGNORE INTO `canvas_invites` (canvas_id, code, role, max_uses, uses_count, expires_at, created_by, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)", invite_rows)
        conn.commit()

        # Inserción de Publicaciones
        print(f"  -> Insertando tabla: `publications` ({len(publications_rows)} obras publicadas)...")
        sql_pubs = """
        INSERT INTO `publications` (id, uuid, user_id, canvas_id, title, description, tags, image_path, width, height, palette_id, likes_count, views_count, comments_count, is_pinned, privacy, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.executemany(sql_pubs, publications_rows)
        cursor.executemany("INSERT IGNORE INTO `publication_likes` (publication_id, user_id, created_at) VALUES (%s, %s, %s)", publication_likes_rows)
        cursor.executemany("INSERT INTO `publication_comments` (uuid, publication_id, user_id, content, created_at) VALUES (%s, %s, %s, %s, %s)", publication_comments_rows)
        conn.commit()

        print(f"{Colors.GREEN}✓ db_canvases poblada exitosamente.{Colors.ENDC}")

        # -------------------------------------------------------------
        # 4. POBLAR DB_TELEMETRY Y ADVERTISEMENTS
        # -------------------------------------------------------------
        print(f"\n{Colors.WARNING}4/5 Poblando 'db_telemetry' y 'db_advertisements'...{Colors.ENDC}")
        cursor.execute("USE db_telemetry;")

        endpoints = ['/api/v1/auth/login', '/api/v1/canvas/get', '/api/v1/publications/feed', '/api/v1/profile/view', '/api/v1/canvas/pixels']
        lat_rows = []
        for _ in range(250):
            lat_rows.append((
                random.choice(endpoints),
                random.choice(['GET', 'POST']),
                200,
                round(random.uniform(15.0, 180.0), 2),
                str(uuid.uuid4()),
                f"192.168.1.{random.randint(10, 200)}",
                'AS15169 Google LLC',
                random_date(60)
            ))
        cursor.executemany("INSERT INTO `api_latency` (endpoint, method, status_code, latency_ms, user_uuid, ip_address, asn, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)", lat_rows)

        pv_rows = []
        for _ in range(300):
            pv_rows.append((
                random.choice(['/', '/canvas', '/publications', '/profile', '/pricing']),
                round(random.uniform(40.0, 450.0), 2),
                str(uuid.uuid4()),
                uuid.uuid4().hex,
                random.choice(['desktop', 'mobile']),
                'dark',
                'es-419',
                random_date(60)
            ))
        cursor.executemany("INSERT INTO `pageviews` (path, load_time_ms, user_uuid, session_id, device_type, theme_preference, locale, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)", pv_rows)

        auth_e_rows = []
        for _ in range(100):
            auth_e_rows.append((
                random.choice(['login_success', 'logout', 'session_switch']),
                str(uuid.uuid4()),
                '127.0.0.1',
                'Localhost',
                random_date(30)
            ))
        cursor.executemany("INSERT INTO `auth_events` (event_type, user_uuid, ip_address, asn, created_at) VALUES (%s, %s, %s, %s, %s)", auth_e_rows)
        conn.commit()

        # Publicidad (db_advertisements)
        cursor.execute("USE db_advertisements;")
        ad_metrics_rows = []
        for _ in range(200):
            ad_metrics_rows.append((
                random.randint(1, 6),
                random.randint(1, 5),
                random.choice(['impression', 'impression', 'impression', 'click']),
                str(uuid.uuid4()),
                '127.0.0.1',
                'Mozilla/5.0 SpriteboardBrowser',
                random_date(30)
            ))
        cursor.executemany("INSERT INTO `ad_metrics` (ad_id, provider_id, event_type, user_uuid, ip_address, user_agent, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s)", ad_metrics_rows)
        conn.commit()

        # -------------------------------------------------------------
        # 5. SINCRONIZAR MINIO S3 (Miniaturas WebP, Snapshots PNG, Capas)
        # -------------------------------------------------------------
        print(f"\n{Colors.WARNING}5/5 Sincronizando miniaturas y snapshots en MinIO S3 y purgando Redis...{Colors.ENDC}")
        try:
            import boto3
            import botocore
            s3 = boto3.client(
                's3',
                endpoint_url='http://127.0.0.1:9000',
                aws_access_key_id='admin',
                aws_secret_access_key='password',
                config=botocore.config.Config(signature_version='s3v4')
            )
            try:
                s3.head_bucket(Bucket='spriteboard-storage')
            except Exception:
                s3.create_bucket(Bucket='spriteboard-storage')

            policy = {
                'Version': '2012-10-17',
                'Statement': [
                    {
                        'Sid': 'PublicRead',
                        'Effect': 'Allow',
                        'Principal': '*',
                        'Action': ['s3:GetObject'],
                        'Resource': ['arn:aws:s3:::spriteboard-storage/*']
                    }
                ]
            }
            s3.put_bucket_policy(Bucket='spriteboard-storage', Policy=json.dumps(policy))

            for c_id, c_uuid, png_bytes, layers_gz, master_pil in minio_canvas_items:
                webp_io = io.BytesIO()
                master_pil.save(webp_io, format='WEBP', quality=90)
                webp_bytes = webp_io.getvalue()

                # Miniaturas WebP (por UUID y por ID)
                s3.put_object(Bucket='spriteboard-storage', Key=f"thumbnails/canvas_{c_uuid}.webp", Body=webp_bytes, ContentType='image/webp')
                s3.put_object(Bucket='spriteboard-storage', Key=f"thumbnails/canvas_{c_id}.webp", Body=webp_bytes, ContentType='image/webp')

                # Snapshots PNG (por ID y por UUID)
                s3.put_object(Bucket='spriteboard-storage', Key=f"snapshots/canvas_{c_id}_main.png", Body=png_bytes, ContentType='image/png')
                s3.put_object(Bucket='spriteboard-storage', Key=f"snapshots/canvas_{c_uuid}_main.png", Body=png_bytes, ContentType='image/png')

                # Capas Gzip
                s3.put_object(Bucket='spriteboard-storage', Key=f"layers/canvas_{c_id}.json.gz", Body=layers_gz, ContentType='application/gzip')
                s3.put_object(Bucket='spriteboard-storage', Key=f"layers/canvas_{c_uuid}.json.gz", Body=layers_gz, ContentType='application/gzip')

            for pub_uuid, png_bytes in minio_pub_items:
                s3.put_object(Bucket='spriteboard-storage', Key=f"storage/publications/pub_{pub_uuid}.png", Body=png_bytes, ContentType='image/png')
                s3.put_object(Bucket='spriteboard-storage', Key=f"publications/pub_{pub_uuid}.png", Body=png_bytes, ContentType='image/png')

            print(f"{Colors.GREEN}✓ Miniaturas WebP y snapshots subidos a MinIO exitosamente.{Colors.ENDC}")
        except Exception as e:
            print(f"{Colors.WARNING}⚠ Advertencia en sincronización MinIO: {e}{Colors.ENDC}")

        # Purgar claves de caché en Redis
        try:
            r = redis.Redis(host='127.0.0.1', port=6379, password='8f4e2d1c9b7a5f6e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e')
            for key in r.scan_iter('canvases:*'):
                r.delete(key)
            print(f"{Colors.GREEN}✓ Cachés de Redis purgadas con éxito.{Colors.ENDC}")
        except Exception as e:
            print(f"{Colors.WARNING}⚠ Advertencia al limpiar Redis: {e}{Colors.ENDC}")

        # Restaurar restricciones
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
        cursor.execute("SET UNIQUE_CHECKS = 1;")
        conn.commit()

        elapsed = round(time.time() - start_total_time, 2)

        print(f"\n{Colors.GREEN}{Colors.BOLD}======================================================================{Colors.ENDC}")
        print(f"{Colors.GREEN}{Colors.BOLD}   ¡POBLACIÓN INTEGRAL COMPLETADA CON ÉXITO EN {elapsed}s!           {Colors.ENDC}")
        print(f"{Colors.GREEN}{Colors.BOLD}======================================================================{Colors.ENDC}")
        print(f"👥 {Colors.BOLD}Usuarios Creados:{Colors.ENDC} {num_users} cuentas completas (con avatares, banners, bios y seguidores)")
        print(f"👑 {Colors.BOLD}Tu Cuenta Personal:{Colors.ENDC} {Colors.CYAN}al20328051890088@gmail.com{Colors.ENDC} / usuario: {Colors.CYAN}jorge{Colors.ENDC} (SuperAdministrator)")
        print(f"🔑 {Colors.BOLD}Contraseña de prueba para todas las cuentas:{Colors.ENDC} {Colors.CYAN}password{Colors.ENDC}")
        print(f"🎨 {Colors.BOLD}Lienzos creados:{Colors.ENDC} {total_canvases} lienzos con dibujos procedurales, capas y frames")
        print(f"🖼️  {Colors.BOLD}Publicaciones creadas:{Colors.ENDC} {len(publications_rows)} obras con comentarios y likes")
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
    print(f"{Colors.FAIL}{Colors.BOLD}             ¡ADVERTENCIA: REINICIALIZACIÓN DE BD!                    {Colors.ENDC}")
    print(f"{Colors.FAIL}{Colors.BOLD}======================================================================{Colors.ENDC}")
    print(f"{Colors.WARNING}Esta acción REINICIALIZARÁ Y POBLARÁ las bases de datos con:{Colors.ENDC}")
    print(f"  • {Colors.CYAN}25 Usuarios de alta calidad{Colors.ENDC} (incluyendo al20328051890088@gmail.com como SuperAdmin)")
    print(f"  • {Colors.CYAN}625 Lienzos (~25 por usuario){Colors.ENDC} con dibujos reales, capas, frames, snapshots y chats")
    print(f"  • {Colors.CYAN}Red social completa{Colors.ENDC} (Publicaciones, Comentarios, Likes, Seguidores, Notificaciones)")
    print(f"{Colors.FAIL}======================================================================{Colors.ENDC}")
    
    if '--auto-confirm' not in sys.argv:
        confirm = input(f"\n{Colors.WARNING}Para confirmar y continuar, escribe {Colors.BOLD}'CONFIRMAR'{Colors.ENDC}{Colors.WARNING} o presiona Enter para cancelar: {Colors.ENDC}").strip()
        if confirm.upper() not in ('CONFIRMAR', 'SI', 'S'):
            print(f"\n{Colors.GREEN}Operación cancelada de forma segura.{Colors.ENDC}\n")
            return

    seed_database(project_root, num_users=25, canvases_per_user=25)


def run_project_cleanup(project_root):
    print(f"\n{Colors.HEADER}{Colors.BOLD}=============================================================={Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}   Limpieza Completa y Segura del Proyecto - Spriteboard   {Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}=============================================================={Colors.ENDC}")
    print(f"{Colors.WARNING}Esta opción eliminará de forma segura:{Colors.ENDC}")
    print("  • Todos los directorios __pycache__ y archivos compilados (*.pyc, *.pyo)")
    print("  • Todos los logs existentes (*.log, storage/logs/)")
    print("  • Todo el contenido de la carpeta /scratch/ en la raíz del proyecto")
    print("  • Backups temporales (*.bak, *.backup, *~) y temporales del SO (.DS_Store, Thumbs.db)")
    print("  • Archivos temporales no esenciales (.tmp, reportes de análisis previos)")
    
    confirm = input(f"\n{Colors.FAIL}{Colors.BOLD}¿Deseas proceder con la limpieza? (S/N): {Colors.ENDC}").strip().upper()
    if confirm not in ('S', 'SI', 'Y', 'YES'):
        print(f"\n{Colors.GREEN}Limpieza cancelada. No se eliminó ningún archivo.{Colors.ENDC}\n")
        return

    print(f"\n{Colors.BLUE}Iniciando limpieza...{Colors.ENDC}\n")
    deleted_files = 0
    deleted_dirs = 0
    bytes_freed = 0
    errors = 0

    excluded_dirs = {'.git', 'vendor', 'node_modules', '.idea', '.vscode'}

    # 1. Limpieza de __pycache__ y archivos .pyc/.pyo
    for root, dirs, files in os.walk(project_root, topdown=False):
        dirs[:] = [d for d in dirs if d not in excluded_dirs]
        
        for file in files:
            file_lower = file.lower()
            file_path = os.path.join(root, file)
            
            # Chequear si es un archivo de log, temporal, backup o compilado de python
            is_pycache_file = file_lower.endswith(('.pyc', '.pyo', '.pyd'))
            is_log_file = file_lower.endswith('.log')
            is_temp_file = file_lower.endswith(('.tmp', '.bak', '.backup', '~')) or file in ('.DS_Store', 'Thumbs.db', 'syntax_out.html')
            
            if is_pycache_file or is_log_file or is_temp_file:
                try:
                    fsize = os.path.getsize(file_path)
                    os.remove(file_path)
                    deleted_files += 1
                    bytes_freed += fsize
                    rel_p = os.path.relpath(file_path, project_root)
                    print(f"  {Colors.GREEN}✔ Eliminado:{Colors.ENDC} {rel_p}")
                except Exception as e:
                    errors += 1
                    print(f"  {Colors.FAIL}✘ Error eliminando {file_path}: {e}{Colors.ENDC}")

        for d in dirs:
            if d == '__pycache__':
                d_path = os.path.join(root, d)
                try:
                    shutil.rmtree(d_path, ignore_errors=True)
                    deleted_dirs += 1
                    rel_p = os.path.relpath(d_path, project_root)
                    print(f"  {Colors.GREEN}✔ Directorio eliminado:{Colors.ENDC} {rel_p}")
                except Exception as e:
                    errors += 1
                    print(f"  {Colors.FAIL}✘ Error eliminando dir {d_path}: {e}{Colors.ENDC}")

    # 2. Limpieza del contenido de /scratch/ en la raíz del proyecto
    scratch_dir = os.path.join(project_root, 'scratch')
    if os.path.exists(scratch_dir) and os.path.isdir(scratch_dir):
        for item in os.listdir(scratch_dir):
            item_path = os.path.join(scratch_dir, item)
            try:
                if os.path.isdir(item_path):
                    shutil.rmtree(item_path, ignore_errors=True)
                    deleted_dirs += 1
                else:
                    fsize = os.path.getsize(item_path)
                    os.remove(item_path)
                    bytes_freed += fsize
                    deleted_files += 1
                print(f"  {Colors.GREEN}✔ Scratch eliminado:{Colors.ENDC} scratch/{item}")
            except Exception as e:
                errors += 1
                print(f"  {Colors.FAIL}✘ Error eliminando scratch/{item}: {e}{Colors.ENDC}")

    # 3. Limpieza de storage/logs si existe
    logs_dir = os.path.join(project_root, 'storage', 'logs')
    if os.path.exists(logs_dir) and os.path.isdir(logs_dir):
        for item in os.listdir(logs_dir):
            if item == '.gitkeep':
                continue
            item_path = os.path.join(logs_dir, item)
            try:
                if os.path.isdir(item_path):
                    shutil.rmtree(item_path, ignore_errors=True)
                    deleted_dirs += 1
                else:
                    fsize = os.path.getsize(item_path)
                    os.remove(item_path)
                    bytes_freed += fsize
                    deleted_files += 1
                print(f"  {Colors.GREEN}✔ Log eliminado:{Colors.ENDC} storage/logs/{item}")
            except Exception as e:
                errors += 1
                print(f"  {Colors.FAIL}✘ Error eliminando storage/logs/{item}: {e}{Colors.ENDC}")

    # Formatear bytes liberados
    if bytes_freed >= 1024 * 1024:
        freed_str = f"{bytes_freed / (1024 * 1024):.2f} MB"
    elif bytes_freed >= 1024:
        freed_str = f"{bytes_freed / 1024:.2f} KB"
    else:
        freed_str = f"{bytes_freed} bytes"

    print(f"\n{Colors.GREEN}{Colors.BOLD}=============================================================={Colors.ENDC}")
    print(f"{Colors.GREEN}{Colors.BOLD}   ✅ Limpieza Completada con Éxito                          {Colors.ENDC}")
    print(f"{Colors.GREEN}{Colors.BOLD}=============================================================={Colors.ENDC}")
    print(f"  • Archivos eliminados: {Colors.BLUE}{deleted_files}{Colors.ENDC}")
    print(f"  • Directorios eliminados: {Colors.BLUE}{deleted_dirs}{Colors.ENDC}")
    print(f"  • Espacio liberado: {Colors.GREEN}{freed_str}{Colors.ENDC}")
    if errors > 0:
        print(f"  • Errores/Omitidos: {Colors.FAIL}{errors}{Colors.ENDC}")
    print()


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    target_path = os.path.abspath(os.path.join(script_dir, TARGET_DIR))

    if '--seed' in sys.argv:
        run_seeder(target_path, script_dir)
        return

    if '--heal-db' in sys.argv:
        from db_healer import run_database_healer
        run_database_healer(target_path)
        return

    print(f"{Colors.HEADER}{Colors.BOLD}=============================================================={Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}   Herramienta Integral de Gestión y Análisis: Spriteboard{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}=============================================================={Colors.ENDC}")
    print("Selecciona una opción:")
    print("1 - Identificar textos hardcodeados (Internacionalización con word.txt)")
    print("2 - Identificar estilos inline (style=\"...\") en archivos PHP y JS")
    print("3 - Identificar código de depuración (console.log, var_dump, etc.)")
    print("4 - Generar Sprite de Iconos SVG y CSS")
    print("5 - Escanear claves de traducción (_t y __) y comprobar JSONs")
    print("6 - Poblar bases de datos con datos completos (25 usuarios, 625 lienzos con capas/frames)")
    print("7 - Asignar rol SuperAdministrador a usuario ID 1 y purgar caché Redis")
    print("8 - Escanear integridad de vistas (atributos ID e inputs hidden)")
    print("9 - Limpieza completa del proyecto (logs, __pycache__, scratch, temporales)")
    print("10 - Saneamiento y Autorecuperación Integral de Base de Datos (Healer Engine)")
    print("0 - Salir")
    choice = input(f"\n{Colors.WARNING}Ingresa una opción (0-10): {Colors.ENDC}").strip()

    if choice in ('0', 'q', 'exit', ''):
        print(f"{Colors.GREEN}Saliendo.{Colors.ENDC}")
        return

    if choice not in ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10'):
        print(f"{Colors.FAIL}Opción no válida. Saliendo.{Colors.ENDC}")
        return

    start_time = time.time()

    if choice == '10':
        from db_healer import run_database_healer
        run_database_healer(target_path)
        return

    if choice == '9':
        run_project_cleanup(target_path)
        return

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
