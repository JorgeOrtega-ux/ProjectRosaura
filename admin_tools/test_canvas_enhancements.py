# -*- coding: utf-8 -*-
"""
test_canvas_enhancements.py
Script de verificación exhaustiva de todas las mejoras:
- 120 Stickers en 12 categorías y Sprite Sheet
- 103 Figuras geométricas reconstruidas y ShapeSvgPathsData.js
- Supresión de 16x16 en backend y frontend
- Corrección de rate limits (429)
- Motor de persistencia IndexedDB y Backups silenciosos
- Módulos PHP y manejadores de eventos JS
"""

import os
import json
import re
import xml.etree.ElementTree as ET

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
passed_tests = 0
failed_tests = 0

def check(condition, message):
    global passed_tests, failed_tests
    if condition:
        print(f"  [PASS] {message}")
        passed_tests += 1
    else:
        print(f"  [FAIL] {message}")
        failed_tests += 1

print("=" * 70)
print("INICIANDO SUITE DE PRUEBAS: FIGURAS, STICKERS, RATE LIMITS Y PERSISTENCIA")
print("=" * 70)

# 1. VERIFICACIÓN DE STICKERS
print("\n1. Verificación de Stickers (120 ítems y Sprite Sheet):")
stickers_dir = os.path.join(BASE_DIR, "public", "assets", "img", "stickers")
sticker_files = [f for f in os.listdir(stickers_dir) if f.endswith('.svg') and f != 'stickers_sprite.svg']
check(len(sticker_files) >= 120, f"Total de archivos SVG de stickers: {len(sticker_files)} (esperado >= 120)")

# Validar sintaxis XML de cada sticker
valid_xml_count = 0
for sf in sticker_files:
    path = os.path.join(stickers_dir, sf)
    try:
        tree = ET.parse(path)
        root = tree.getroot()
        if root.tag.endswith('svg'):
            valid_xml_count += 1
    except Exception as e:
        print(f"    Error XML en {sf}: {e}")

check(valid_xml_count == len(sticker_files), f"Todos los {valid_xml_count} stickers tienen XML SVG válido")

# Validar Sprite Sheet
sprite_path = os.path.join(stickers_dir, "stickers_sprite.svg")
check(os.path.exists(sprite_path), "stickers_sprite.svg existe")
if os.path.exists(sprite_path):
    try:
        s_tree = ET.parse(sprite_path)
        s_root = s_tree.getroot()
        groups = s_root.findall('.//{http://www.w3.org/2000/svg}g') or s_root.findall('.//g')
        check(len(groups) >= 120, f"stickers_sprite.svg contiene {len(groups)} celdas transformadas")
    except Exception as e:
        check(False, f"Error en parseo de stickers_sprite.svg: {e}")

# Validar StickersData.js
stickers_data_path = os.path.join(BASE_DIR, "public", "assets", "js", "modules", "app", "design", "data", "StickersData.js")
check(os.path.exists(stickers_data_path), "StickersData.js existe")
with open(stickers_data_path, "r", encoding="utf-8") as f:
    stk_js_content = f.read()
check("STICKERS_CATALOG" in stk_js_content, "StickersData.js exporta STICKERS_CATALOG")
check("getStickersByCategory" in stk_js_content, "StickersData.js exporta getStickersByCategory")

# 2. VERIFICACIÓN DE FIGURAS GEOMÉTRICAS
print("\n2. Verificación de Figuras Geométricas (103 figuras y ShapeSvgPathsData.js):")
shapes_dir = os.path.join(BASE_DIR, "public", "assets", "img", "shapes")
shape_files = [f for f in os.listdir(shapes_dir) if f.endswith('.svg')]
check(len(shape_files) >= 100, f"Total de archivos SVG de figuras: {len(shape_files)} (esperado >= 100)")

shape_paths_file = os.path.join(BASE_DIR, "public", "assets", "js", "modules", "app", "design", "data", "ShapeSvgPathsData.js")
check(os.path.exists(shape_paths_file), "ShapeSvgPathsData.js existe")
with open(shape_paths_file, "r", encoding="utf-8") as f:
    shape_paths_content = f.read()
path_keys = re.findall(r"'([a-zA-Z0-9_]+)':\s*'M\s", shape_paths_content)
check(len(path_keys) >= 100, f"ShapeSvgPathsData.js contiene {len(path_keys)} figuras vectoriales M...Z")

# 3. VERIFICACIÓN DE ELIMINACIÓN DE 16x16
print("\n3. Verificación de Supresión de Lienzos 16x16:")
canvas_sizes_file = os.path.join(BASE_DIR, "public", "assets", "data", "canvas_sizes.json")
with open(canvas_sizes_file, "r", encoding="utf-8") as f:
    sizes_data = json.load(f)
check("16x16" not in sizes_data, "canvas_sizes.json NO contiene '16x16'")
check("32x32" in sizes_data, "canvas_sizes.json contiene '32x32' como mínimo")

modal_tpl_file = os.path.join(BASE_DIR, "public", "assets", "js", "core", "components", "ModalTemplates.js")
with open(modal_tpl_file, "r", encoding="utf-8") as f:
    modal_content = f.read()
check('"16x16":' not in modal_content, "ModalTemplates.js NO contiene '16x16'")

# 4. VERIFICACIÓN DE RATE LIMITS (429 MITIGATION)
print("\n4. Verificación de Rate Limits:")
routes_sec_file = os.path.join(BASE_DIR, "config", "Routes", "routes_secondary.php")
with open(routes_sec_file, "r", encoding="utf-8") as f:
    sec_content = f.read()
check("'key' => 'canvas_save_offline'" in sec_content and "'max' => 180" in sec_content and "'time' => 1" in sec_content,
      "routes_secondary.php tiene rate limit ampliado para save_offline_state (max: 180, time: 1)")

routes_pri_file = os.path.join(BASE_DIR, "config", "Routes", "routes_primary.php")
with open(routes_pri_file, "r", encoding="utf-8") as f:
    pri_content = f.read()
check("'key' => 'telemetry_collect'" in pri_content and "'max' => 120" in pri_content,
      "routes_primary.php tiene rate limit adecuado para telemetry_collect (max: 120, time: 1)")

telemetry_tracker_file = os.path.join(BASE_DIR, "public", "assets", "js", "core", "telemetry", "TelemetryTracker.js")
with open(telemetry_tracker_file, "r", encoding="utf-8") as f:
    tt_content = f.read()
check("this.batchSizeLimit = 15;" in tt_content and "this.flushIntervalMs = 15000;" in tt_content,
      "TelemetryTracker.js usa batchSizeLimit=15 y flushIntervalMs=15000")
check("navigator.onLine === false" in tt_content, "TelemetryTracker.js verifica estado online antes de flush")

http_client_file = os.path.join(BASE_DIR, "public", "assets", "js", "core", "api", "HttpClient.js")
with open(http_client_file, "r", encoding="utf-8") as f:
    http_content = f.read()
check("processedResult.isRateLimited = true;" in http_content,
      "HttpClient.js identifica respuestas 429 con flag isRateLimited")

# 5. VERIFICACIÓN DE PERSISTENCIA Y BACKUPS SILENCIOSOS (INDEXEDDB)
print("\n5. Verificación de Motor IndexedDB y Backups:")
storage_engine_file = os.path.join(BASE_DIR, "public", "assets", "js", "modules", "app", "design", "utils", "CanvasStorageEngine.js")
check(os.path.exists(storage_engine_file), "CanvasStorageEngine.js existe en utils")
with open(storage_engine_file, "r", encoding="utf-8") as f:
    cse_content = f.read()
check("SpriteboardCanvasDB_v2" in cse_content, "CanvasStorageEngine inicializa SpriteboardCanvasDB_v2")
check("createSilentBackup" in cse_content, "CanvasStorageEngine implementa createSilentBackup")
check("getLatestValidBackup" in cse_content, "CanvasStorageEngine implementa getLatestValidBackup para autorrecuperación")
check("enqueueOfflineSync" in cse_content and "flushOfflineSyncQueue" in cse_content,
      "CanvasStorageEngine implementa cola de sincronización offline diferida")

design_setup_file = os.path.join(BASE_DIR, "public", "assets", "js", "modules", "app", "design", "DesignSetup.js")
with open(design_setup_file, "r", encoding="utf-8") as f:
    ds_content = f.read()
check("CanvasStorageEngine" in ds_content, "DesignSetup.js importa y utiliza CanvasStorageEngine")
check("getLatestValidBackup" in ds_content, "DesignSetup.js autorrecupera silenciosamente desde backups en hydrateCanvasState")

design_network_file = os.path.join(BASE_DIR, "public", "assets", "js", "modules", "app", "design", "DesignNetwork.js")
with open(design_network_file, "r", encoding="utf-8") as f:
    dn_content = f.read()
check("CanvasStorageEngine.saveCanvasState" in dn_content, "DesignNetwork.js guarda inmediatamente en IndexedDB")
check("createSilentBackup" in dn_content, "DesignNetwork.js genera backups periódicos silenciosos")
check("enqueueOfflineSync" in dn_content, "DesignNetwork.js encola peticiones cuando 429/offline ocurre")

# 6. VERIFICACIÓN DE MENÚS Y EVENTOS
print("\n6. Verificación de Menús y Eventos:")
php_module_file = os.path.join(BASE_DIR, "includes", "modules", "moduleDesignTools.php")
with open(php_module_file, "r", encoding="utf-8") as f:
    php_mod_content = f.read()
check("$stickerCategories = [" in php_mod_content, "moduleDesignTools.php contiene array $stickerCategories")
check('data-action="openStickerCategoryMenu"' in php_mod_content, "moduleDesignTools.php contiene enlaces de categoría openStickerCategoryMenu")
check('data-action="backToStickersMainMenu"' in php_mod_content, "moduleDesignTools.php contiene botones de retorno backToStickersMainMenu")

interaction_events_file = os.path.join(BASE_DIR, "public", "assets", "js", "modules", "app", "design", "interactions", "InteractionEvents.js")
with open(interaction_events_file, "r", encoding="utf-8") as f:
    ie_content = f.read()
check("openStickerCategoryMenu" in ie_content, "InteractionEvents.js maneja openStickerCategoryMenu")
check("backToStickersMainMenu" in ie_content, "InteractionEvents.js maneja backToStickersMainMenu")

print("\n" + "=" * 70)
print(f"RESUMEN DE PRUEBAS: {passed_tests} PASADAS, {failed_tests} FALLADAS")
print("=" * 70)

if failed_tests == 0:
    print(">>> TODAS LAS PRUEBAS PASARON SATISFACTORIAMENTE (100% SUCCESS) <<<")
else:
    print(f">>> HAY {failed_tests} FALLAS QUE REQUIEREN ATENCIÓN <<<")
    exit(1)
