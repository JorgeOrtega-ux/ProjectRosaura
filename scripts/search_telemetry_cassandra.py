#!/usr/bin/env python3
import os
import sys
import json
import csv
import re
import argparse
from datetime import datetime, timedelta
from cassandra.cluster import Cluster
from cassandra.query import SimpleStatement
from dotenv import load_dotenv

# Configurar directorio base para cargar .env
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(BASE_DIR, '.env')
load_dotenv(dotenv_path=ENV_PATH)

# Configuración por defecto
CASSANDRA_HOST = os.getenv("CASSANDRA_HOST") or "cassandra"
CASSANDRA_PORT = int(os.getenv("CASSANDRA_PORT") or 9042)
CASSANDRA_KEYSPACE = "db_telemetry_nosql"

ALL_TABLES = [
    'api_latency',
    'pageviews',
    'auth_events',
    'websocket_events',
    'system_metrics',
    'slow_queries',
    'client_events',
    'user_actions'
]

def get_dates_range(start_str, end_str):
    try:
        start = datetime.strptime(start_str, "%Y-%m-%d")
        end = datetime.strptime(end_str, "%Y-%m-%d")
    except ValueError as e:
        print(f"[-] Formato de fecha inválido. Utilice YYYY-MM-DD: {e}", file=sys.stderr)
        sys.exit(1)
        
    dates = []
    curr = start
    while curr <= end:
        dates.append(curr.strftime("%Y-%m-%d"))
        curr += timedelta(days=1)
    return dates

def print_text_table(headers, rows):
    if not rows:
        print("Sin resultados.")
        return
        
    # Convertir todo a string y truncar textos extremadamente largos
    str_rows = []
    for r in rows:
        str_rows.append([str(val)[:40] + ('...' if len(str(val)) > 40 else '') for val in r])
        
    # Calcular el ancho de cada columna
    widths = [len(h) for h in headers]
    for r in str_rows:
        for i, val in enumerate(r):
            widths[i] = max(widths[i], len(val))
            
    # Formatear línea separadora y filas
    sep = "+" + "+".join(["-" * (w + 2) for w in widths]) + "+"
    
    print(sep)
    header_str = "|" + "|".join([f" {h:<{widths[i]}} " for i, h in enumerate(headers)]) + "|"
    print(header_str)
    print(sep)
    
    for r in str_rows:
        row_str = "|" + "|".join([f" {val:<{widths[i]}} " for i, val in enumerate(r)]) + "|"
        print(row_str)
    print(sep)

def search_table(session, table, dates, filters):
    print(f"[*] Escaneando tabla '{table}' para {len(dates)} particiones de fecha...")
    
    # Preparar el query
    # En Cassandra, la consulta óptima para este modelo es por partición de fecha date_only
    query = f"SELECT * FROM {table} WHERE date_only = ?"
    try:
        stmt = session.prepare(query)
    except Exception as e:
        print(f"[-] Error preparando query para la tabla {table}: {e}. ¿Está creada?", file=sys.stderr)
        return []

    # Ejecución asíncrona para maximizar velocidad de lectura masiva
    futures = []
    for d in dates:
        future = session.execute_async(stmt, [d])
        futures.append((d, future))
        
    raw_results = []
    for d, future in futures:
        try:
            rows = future.result()
            for r in rows:
                raw_results.append(dict(r._asdict() if hasattr(r, '_asdict') else r))
        except Exception as e:
            print(f"[-] Falló lectura de partición {d} en {table}: {e}", file=sys.stderr)

    print(f"[+] Total de filas extraídas en crudo para '{table}': {len(raw_results)}")
    
    # Filtrado dinámico en memoria (Post-processing)
    filtered = []
    for row in raw_results:
        keep = True
        
        # Filtro de IP
        if filters.get('ip_address') and row.get('ip_address') != filters['ip_address']:
            keep = False
            
        # Filtro de User UUID
        if filters.get('user_uuid'):
            user_uuid_val = row.get('user_uuid')
            if user_uuid_val:
                if str(user_uuid_val).lower() != filters['user_uuid'].lower():
                    keep = False
            else:
                keep = False
                
        # Filtro de Latencia mínima (ms)
        if filters.get('min_latency') is not None:
            lat = row.get('latency_ms') or row.get('load_time_ms') or row.get('execution_time_ms')
            if lat is None or float(lat) < float(filters['min_latency']):
                keep = False
                
        # Filtro de consulta de texto libre / Regex (Búsqueda inteligente sobre columnas comunes)
        if filters.get('search_query'):
            search_regex = re.compile(filters['search_query'], re.IGNORECASE)
            searchable_fields = [
                row.get('endpoint'),
                row.get('path'),
                row.get('query_text'),
                row.get('url'),
                row.get('error_message'),
                row.get('stack_trace'),
                row.get('event_type'),
                row.get('target_element'),
                row.get('action_category'),
                row.get('action_name'),
                row.get('metadata')
            ]
            # Si ninguno de los campos tiene la cadena de búsqueda, descartamos
            match = False
            for field in searchable_fields:
                if field and search_regex.search(str(field)):
                    match = True
                    break
            if not match:
                keep = False
                
        if keep:
            filtered.append(row)
            
    # Ordenar por fecha de creación descendente
    filtered.sort(key=lambda x: x.get('created_at') or '', reverse=True)
    return filtered

def format_output(results, table_name, fmt, output_file, limit):
    if limit:
        results = results[:limit]
        
    if not results:
        print(f"\n--- Resultados de {table_name} ---")
        print("No se encontraron registros que cumplan con los filtros especificados.")
        return

    # Definir campos a extraer según la tabla
    headers = list(results[0].keys())
    # Reordenar para poner created_at primero si existe
    if 'created_at' in headers:
        headers.remove('created_at')
        headers.insert(0, 'created_at')
    if 'uuid' in headers:
        headers.remove('uuid')
        headers.append('uuid')
        
    rows = []
    for r in results:
        rows.append([r.get(h) for h in headers])

    if fmt == 'table':
        print(f"\n--- Resultados para {table_name} ({len(results)} registros) ---")
        print_text_table(headers, rows)
        
    elif fmt == 'csv':
        if output_file:
            # Si se especificó archivo, guardamos
            filename = output_file if len(ALL_TABLES) == 1 or output_file.endswith('.csv') else f"{table_name}_{output_file}"
            if not filename.endswith('.csv'):
                filename += '.csv'
            try:
                with open(filename, 'w', newline='', encoding='utf-8') as f:
                    writer = csv.writer(f)
                    writer.writerow(headers)
                    writer.writerows(rows)
                print(f"[+] Resultados guardados en archivo CSV: {filename}")
            except Exception as e:
                print(f"[-] Error guardando archivo CSV: {e}", file=sys.stderr)
        else:
            # Imprimir CSV a consola
            writer = csv.writer(sys.stdout)
            writer.writerow(headers)
            writer.writerows(rows)
            
    elif fmt == 'json':
        # Serializar fechas para JSON
        def json_serial(obj):
            if isinstance(obj, (datetime)):
                return obj.isoformat()
            return str(obj)
            
        json_data = json.dumps(results, default=json_serial, indent=2)
        if output_file:
            filename = output_file if len(ALL_TABLES) == 1 or output_file.endswith('.json') else f"{table_name}_{output_file}"
            if not filename.endswith('.json'):
                filename += '.json'
            try:
                with open(filename, 'w', encoding='utf-8') as f:
                    f.write(json_data)
                print(f"[+] Resultados guardados en archivo JSON: {filename}")
            except Exception as e:
                print(f"[-] Error guardando archivo JSON: {e}", file=sys.stderr)
        else:
            print(json_data)

def main():
    parser = argparse.ArgumentParser(description="Script de Búsqueda Masiva de Telemetría en Cassandra")
    parser.add_argument('--table', '-t', choices=ALL_TABLES + ['all'], default='all',
                        help="Tabla de telemetría a buscar (por defecto: all)")
    parser.add_argument('--start-date', '-s', default=datetime.now().strftime("%Y-%m-%d"),
                        help="Fecha de inicio (YYYY-MM-DD), por defecto hoy")
    parser.add_argument('--end-date', '-e', default=datetime.now().strftime("%Y-%m-%d"),
                        help="Fecha de fin (YYYY-MM-DD), por defecto hoy")
    parser.add_argument('--user-uuid', '-u', help="Filtrar por User UUID")
    parser.add_argument('--ip', help="Filtrar por dirección IP")
    parser.add_argument('--query', '-q', help="Búsqueda Regex/Texto sobre campos de texto (endpoint, path, query, error, etc.)")
    parser.add_argument('--min-latency', type=float, help="Filtrar por latencia/tiempo de carga mínimo (ms)")
    parser.add_argument('--format', '-f', choices=['table', 'csv', 'json'], default='table',
                        help="Formato de salida (por defecto: table)")
    parser.add_argument('--output', '-o', help="Ruta de archivo para guardar resultados (ej: resultados.csv)")
    parser.add_argument('--limit', '-l', type=int, default=100, help="Límite de registros a retornar por tabla (por defecto 100)")
    parser.add_argument('--host', default=CASSANDRA_HOST, help="Host de Cassandra")
    parser.add_argument('--port', type=int, default=CASSANDRA_PORT, help="Puerto de Cassandra")

    args = parser.parse_args()

    dates = get_dates_range(args.start_date, args.end_date)
    
    # Conectarse a Cassandra con fallback para ejecución local/host
    hosts_to_try = [args.host]
    if args.host not in ['127.0.0.1', 'localhost']:
        hosts_to_try.append('127.0.0.1')

    session = None
    cluster = None
    connected = False
    
    for host in hosts_to_try:
        print(f"[*] Intentando conectar a Cassandra en {host}:{args.port}...")
        try:
            cluster = Cluster([host], port=args.port, connect_timeout=5)
            session = cluster.connect(CASSANDRA_KEYSPACE)
            print(f"[+] Conexión establecida con éxito a Cassandra en {host}.")
            connected = True
            break
        except Exception as e:
            print(f"[-] No se pudo conectar a {host}:{args.port}: {e}")

    if not connected:
        print("[!] Error fatal: No se pudo establecer conexión con ninguna de las direcciones de Cassandra configuradas.", file=sys.stderr)
        sys.exit(1)

    # Definir tablas a buscar
    tables_to_search = ALL_TABLES if args.table == 'all' else [args.table]
    
    filters = {
        'ip_address': args.ip,
        'user_uuid': args.user_uuid,
        'min_latency': args.min_latency,
        'search_query': args.query
    }

    try:
        for t in tables_to_search:
            results = search_table(session, t, dates, filters)
            format_output(results, t, args.format, args.output, args.limit)
    finally:
        cluster.shutdown()
        print("[*] Conexión a Cassandra cerrada.")

if __name__ == "__main__":
    main()
