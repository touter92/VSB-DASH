#!/usr/bin/env python3
"""
Serveur Local de Synchronisation, Azure SQL & Microsoft SharePoint
Programme Villes Sans Bidonvilles (VSB Monitor)
"""

import http.server
import socketserver
import json
import os
import sys
import csv
import glob
import time
import datetime
import traceback
import shutil
from urllib.parse import urlparse, parse_qs
import urllib.request

PORT = 8080
PARENT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CURRENT_DIR = os.path.abspath(os.path.dirname(__file__))

LOT_SOURCE_FILES = {
    'batiment': 'AVANCEMENT TEST CSV.csv',
    'vrd': 'SUIVI_SRM_CSV.csv',
    'lpee': 'LPEE CSV.csv',
    'equipements': 'EQUIPEMENT PUBLIC.csv',
    'ami': 'AMI VSB VF.csv',
    'planif': 'PLANIF DG LIV.csv',
    'checklist': 'CHECK LISTE ph CSV.csv'
}

LOT_TITLES = {
    'batiment': 'Lot 1 - Bâtiment & Chantiers',
    'vrd': 'Lot 2 - Réseaux & VRD (SRM)',
    'lpee': 'Lot 3 - Contrôle Qualité LPEE / CID',
    'equipements': 'Lot 4 - Équipements Publics',
    'ami': 'Appels à Manifestation d\'Intérêt',
    'planif': 'Planification Livraisons',
    'checklist': 'Check-liste PH (Permis d\'Habiter)'
}

BACKUPS_DIR = os.path.join(PARENT_DIR, 'backups')
try:
    os.makedirs(BACKUPS_DIR, exist_ok=True)
except Exception:
    pass

def create_backup(filepath):
    """Crée une copie de sécurité .bak immédiate ainsi qu'une archive horodatée dans backups/"""
    if not filepath or not os.path.exists(filepath):
        return None
    try:
        # 1. Sauvegarde rapide .bak de secours direct
        shutil.copy2(filepath, filepath + '.bak')
        
        # 2. Sauvegarde horodatée dans le dossier backups/
        os.makedirs(BACKUPS_DIR, exist_ok=True)
        fname = os.path.basename(filepath)
        name, ext = os.path.splitext(fname)
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        archive_name = f"{name}_{timestamp}{ext}"
        archive_path = os.path.join(BACKUPS_DIR, archive_name)
        shutil.copy2(filepath, archive_path)
        return archive_path
    except Exception as e:
        print(f"Erreur création backup: {e}")
        return None

def get_odbc_driver():
    try:
        import pyodbc
        available = pyodbc.drivers()
        for preferred in ['ODBC Driver 18 for SQL Server', 'ODBC Driver 17 for SQL Server', 'SQL Server']:
            if preferred in available:
                return preferred
        if available:
            return available[0]
    except Exception:
        pass
    return 'ODBC Driver 18 for SQL Server'

def detect_onedrive_folders():
    """Détecte les dossiers OneDrive / SharePoint synchronisés localement sur la machine"""
    candidates = []
    user_home = os.path.expanduser('~')
    
    # 1. Standard OneDrive directories
    for name in ['OneDrive', 'OneDrive - Personal', 'SharePoint']:
        p = os.path.join(user_home, name)
        if os.path.exists(p) and os.path.isdir(p):
            candidates.append(p)
            try:
                for sub in os.listdir(p):
                    sub_p = os.path.join(p, sub)
                    if os.path.isdir(sub_p):
                        candidates.append(sub_p)
            except Exception:
                pass
                
    # 2. Parent directory of project
    if os.path.exists(PARENT_DIR):
        candidates.append(PARENT_DIR)
        
    # Return unique paths
    seen = set()
    unique_candidates = []
    for c in candidates:
        norm = os.path.normpath(c)
        if norm.lower() not in seen and os.path.exists(norm):
            seen.add(norm.lower())
            unique_candidates.append(norm)
    return unique_candidates

def run_data_rebuild():
    """Exécute build_data.py pour reconstruire data.js"""
    try:
        import subprocess
        proc = subprocess.run(
            [sys.executable, os.path.join(CURRENT_DIR, 'build_data.py')],
            capture_output=True,
            text=True,
            cwd=CURRENT_DIR,
            timeout=30
        )
        return proc.returncode == 0, proc.stdout + proc.stderr
    except Exception as e:
        return False, str(e)

def scan_source_files_stats():
    """Scanne les fichiers sources dans le dossier parent et calcule leurs statistiques actuelles"""
    files_stats = []
    total_rows = 0
    
    for lot_id, fname in LOT_SOURCE_FILES.items():
        p = os.path.join(PARENT_DIR, fname)
        exists = os.path.exists(p)
        rows_count = 0
        size_str = '0 KB'
        modified_str = '-'
        
        if exists:
            try:
                size_bytes = os.path.getsize(p)
                size_str = f"{size_bytes / 1024:.1f} KB"
                mtime = os.path.getmtime(p)
                modified_str = datetime.datetime.fromtimestamp(mtime).strftime('%d/%m/%Y %H:%M:%S')
                
                with open(p, 'r', encoding='latin-1', errors='replace') as f:
                    # Count non-empty rows
                    rows_count = sum(1 for line in f if line.strip()) - 1
                    rows_count = max(0, rows_count)
            except Exception:
                pass
                
        files_stats.append({
            'lot': lot_id,
            'title': LOT_TITLES.get(lot_id, lot_id),
            'filename': fname,
            'exists': exists,
            'rows_count': rows_count,
            'size': size_str,
            'modified': modified_str,
            'path': p
        })
        if lot_id == 'batiment':
            total_rows = rows_count
            
    return files_stats, total_rows

def test_azure_connection(server, database, username, password, encrypt=True, trust_cert=False):
    try:
        import pyodbc
        driver = get_odbc_driver()
        conn_str = (
            f"DRIVER={{{driver}}};"
            f"SERVER={server};"
            f"DATABASE={database};"
            f"UID={username};"
            f"PWD={password};"
            f"Encrypt={'yes' if encrypt else 'no'};"
            f"TrustServerCertificate={'yes' if trust_cert else 'no'};"
            f"Connection Timeout=15;"
        )
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        # Retrieve list of tables and views with schema and type
        tables = []
        try:
            cursor.execute("SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE FROM INFORMATION_SCHEMA.TABLES ORDER BY TABLE_SCHEMA, TABLE_NAME")
            for row in cursor.fetchall()[:60]:
                schema = str(row[0]) if row[0] else 'dbo'
                tname = str(row[1]) if row[1] else ''
                ttype = str(row[2]) if row[2] else 'BASE TABLE'
                if tname:
                    tables.append({
                        'schema': schema,
                        'name': tname,
                        'type': ttype,
                        'escaped': f"[{schema}].[{tname}]",
                        'display': f"[{schema}].[{tname}] ({ttype})"
                    })
        except Exception:
            pass
            
        cursor.close()
        conn.close()
        return True, "Connexion réussie à Azure SQL Database !", tables
    except Exception as e:
        return False, str(e), []

def sync_azure_data(server, database, username, password, table_or_query, filename=None, lot='batiment', target_mode='existing_source', encrypt=True, trust_cert=False):
    try:
        import pyodbc
        driver = get_odbc_driver()
        conn_str = (
            f"DRIVER={{{driver}}};"
            f"SERVER={server};"
            f"DATABASE={database};"
            f"UID={username};"
            f"PWD={password};"
            f"Encrypt={'yes' if encrypt else 'no'};"
            f"TrustServerCertificate={'yes' if trust_cert else 'no'};"
            f"Connection Timeout=35;"
        )
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()

        # Build SQL Query securely (prevents syntax error near spaces/dots)
        clean_input = table_or_query.strip()
        if not clean_input:
            cursor.close()
            conn.close()
            return False, "Veuillez renseigner le nom de la table ou la requête SQL."

        upper_input = clean_input.upper()
        if upper_input.startswith('SELECT') or upper_input.startswith('WITH') or upper_input.startswith('EXEC'):
            sql_query = clean_input
        else:
            # Query existing tables from database to resolve exact match
            db_tables = []
            try:
                cursor.execute("SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES")
                db_tables = cursor.fetchall()
            except Exception:
                pass

            matched_query = None
            raw = clean_input.strip('[]" \t')
            candidates = [raw]
            if raw.lower().endswith('.csv'):
                candidates.append(raw[:-4].strip('[]" \t'))
            candidates.append(raw.replace(' ', '_'))
            candidates.append(raw.replace('_', ' '))

            # 1. Match against database tables
            for schema, tname in db_tables:
                tname_clean = tname.strip()
                cand_lower = [c.lower() for c in candidates]
                if tname_clean.lower() in cand_lower or f"{schema}.{tname_clean}".lower() in cand_lower:
                    matched_query = f"SELECT * FROM [{schema}].[{tname_clean}]"
                    break

            if matched_query:
                sql_query = matched_query
            else:
                # 2. Escape cleanly with brackets to prevent syntax errors on spaces
                parts = [p.strip('[]" \t') for p in clean_input.split('.') if p.strip('[]" \t')]
                if len(parts) >= 2:
                    escaped = ".".join(f"[{p}]" for p in parts)
                elif len(parts) == 1:
                    escaped = f"[{parts[0]}]"
                else:
                    escaped = f"[{clean_input}]"
                sql_query = f"SELECT * FROM {escaped}"

        try:
            cursor.execute(sql_query)
        except Exception as pe:
            err_str = str(pe)
            # If invalid object name, enrich error with available tables
            if "Invalid object name" in err_str or "102" in err_str:
                avail = []
                try:
                    cursor.execute("SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES")
                    avail = [f"[{r[0]}].[{r[1]}]" for r in cursor.fetchall()[:15]]
                except Exception:
                    pass
                if avail:
                    err_str += f" | Tables disponibles dans votre base Azure SQL : {', '.join(avail)}"
            cursor.close()
            conn.close()
            return False, err_str

        headers = [column[0] for column in cursor.description]
        raw_rows = cursor.fetchall()
        
        # Convert rows to string lists
        clean_rows = []
        for row in raw_rows:
            clean_rows.append([str(col) if col is not None else '' for col in row])

        cursor.close()
        conn.close()

        # Determine target file name
        if target_mode == 'existing_source' or not filename:
            filename = LOT_SOURCE_FILES.get(lot, 'AVANCEMENT TEST CSV.csv')
        else:
            if not filename.endswith('.csv'):
                filename += '.csv'
            filename = os.path.basename(filename)

        local_parent_path = os.path.join(PARENT_DIR, filename)
        local_web_path = os.path.join(CURRENT_DIR, filename)

        # Count previous rows if file exists
        previous_rows = 0
        if os.path.exists(local_parent_path):
            try:
                with open(local_parent_path, 'r', encoding='latin-1', errors='replace') as f:
                    previous_rows = max(0, sum(1 for line in f if line.strip()) - 1)
                # Create backup
                create_backup(local_parent_path)
            except Exception:
                pass

        # Save CSV locally in parent directory and web directory with semicolon separator
        for path in [local_parent_path, local_web_path]:
            with open(path, 'w', encoding='utf-8-sig', newline='') as f:
                writer = csv.writer(f, delimiter=';')
                writer.writerow(headers)
                writer.writerows(clean_rows)

        # Trigger data rebuild
        run_data_rebuild()

        current_rows = len(clean_rows)
        new_rows_detected = current_rows - previous_rows

        return True, {
            'filename': filename,
            'local_path': local_parent_path,
            'rows_count': current_rows,
            'previous_rows': previous_rows,
            'new_rows_detected': new_rows_detected,
            'cols_count': len(headers),
            'headers': headers,
            'sample_rows': clean_rows[:500],
            'lot': lot,
            'target_mode': target_mode,
            'sql_query': sql_query
        }
    except Exception as e:
        return False, str(e)

def parse_excel_to_rows(filepath):
    """Lit un fichier Excel (.xlsx, .xlsm, .xls) et retourne (headers, rows)"""
    try:
        import openpyxl
        wb = openpyxl.load_workbook(filepath, data_only=True, read_only=True)
        sheet = wb.active
        all_rows = []
        for r in sheet.iter_rows(values_only=True):
            if any(c is not None and str(c).strip() != '' for c in r):
                all_rows.append([str(c).strip() if c is not None else '' for c in r])
        wb.close()
        if not all_rows:
            return [], []
        headers = all_rows[0]
        data_rows = all_rows[1:]
        return headers, data_rows
    except Exception as e:
        raise Exception(f"Erreur lors de la lecture du classeur Excel : {e}")

def test_sharepoint_connection(mode, folder_path=None, file_url=None, tenant_id=None, client_id=None, client_secret=None, site_url=None):
    """Teste l'accès à SharePoint via dossier local synchronisé, URL web directe ou Graph API"""
    try:
        if mode == 'local_folder':
            path = folder_path.strip() if folder_path else ''
            if not path:
                detected = detect_onedrive_folders()
                path = detected[0] if detected else PARENT_DIR
                
            if not os.path.exists(path):
                return False, f"Le chemin du dossier SharePoint spécifié est introuvable : {path}", []
                
            # Scan files in directory
            valid_exts = ('.csv', '.xlsx', '.xlsm', '.xls', '.pdf')
            files = []
            for root, dirs, filenames in os.walk(path):
                for f in filenames:
                    if f.lower().endswith(valid_exts) and not f.startswith('~$'):
                        full = os.path.join(root, f)
                        try:
                            st = os.stat(full)
                            # Suggest lot
                            f_upper = f.upper()
                            suggested_lot = 'batiment'
                            if 'SRM' in f_upper or 'VRD' in f_upper: suggested_lot = 'vrd'
                            elif 'LPEE' in f_upper or 'CID' in f_upper or 'QUALITE' in f_upper: suggested_lot = 'lpee'
                            elif 'EQUIP' in f_upper: suggested_lot = 'equipements'
                            elif 'AMI' in f_upper: suggested_lot = 'ami'
                            elif 'PLANIF' in f_upper: suggested_lot = 'planif'
                            elif 'CHECK' in f_upper: suggested_lot = 'checklist'

                            files.append({
                                'name': f,
                                'path': full,
                                'size': f"{st.st_size / 1024:.1f} KB",
                                'modified': datetime.datetime.fromtimestamp(st.st_mtime).strftime('%d/%m/%Y %H:%M:%S'),
                                'type': os.path.splitext(f)[1].upper().replace('.', ''),
                                'suggested_lot': suggested_lot
                            })
                        except Exception:
                            pass
                # Limit scan depth to avoid hanging
                if root != path:
                    break
                    
            files.sort(key=lambda x: x['name'])
            return True, f"Dossier SharePoint accessible ({len(files)} fichiers détectés) : {path}", files

        elif mode == 'direct_url':
            url = (file_url or '').strip()
            if not url or not (url.startswith('http://') or url.startswith('https://')):
                return False, "Veuillez fournir une URL SharePoint / OneDrive valide (commençant par https://)", []
                
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=12) as response:
                status = response.status
                headers_dict = dict(response.headers)
                cl = headers_dict.get('Content-Length', '0')
                ct = headers_dict.get('Content-Type', '')
                
            return True, f"Lien SharePoint accessible avec succès (Statut HTTP {status}, Type: {ct}) !", [{
                'name': os.path.basename(urlparse(url).path) or 'Fichier_SharePoint.csv',
                'path': url,
                'size': f"{int(cl)/1024:.1f} KB" if cl.isdigit() and int(cl) > 0 else 'Inconnue',
                'modified': datetime.datetime.now().strftime('%d/%m/%Y %H:%M:%S'),
                'type': 'WEB_URL',
                'suggested_lot': 'batiment'
            }]

        elif mode == 'graph_api':
            # Microsoft Graph API OAuth Test
            if not tenant_id or not client_id or not client_secret:
                return False, "Paramètres Azure AD / Entra ID incomplets (Tenant ID, Client ID et Client Secret requis)", []
                
            import urllib.parse
            token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
            data = urllib.parse.urlencode({
                'client_id': client_id,
                'scope': 'https://graph.microsoft.com/.default',
                'client_secret': client_secret,
                'grant_type': 'client_credentials'
            }).encode('utf-8')
            
            req = urllib.request.Request(token_url, data=data, method='POST')
            with urllib.request.urlopen(req, timeout=15) as res:
                resp_data = json.loads(res.read().decode('utf-8'))
                access_token = resp_data.get('access_token')
                
            if access_token:
                return True, "Authentification réussie avec Microsoft Graph API (Token valide) !", []
            else:
                return False, "Impossible d'obtenir le jeton d'accès Microsoft Graph", []

        return False, "Mode SharePoint non reconnu", []
    except Exception as e:
        return False, str(e), []

def sync_sharepoint_file(mode, source_path_or_url, lot='batiment', target_filename=None):
    """Télécharge ou extrait un fichier SharePoint/OneDrive et met à jour le fichier source local"""
    try:
        if not target_filename:
            target_filename = LOT_SOURCE_FILES.get(lot, 'AVANCEMENT TEST CSV.csv')
            
        target_parent = os.path.join(PARENT_DIR, target_filename)
        target_web = os.path.join(CURRENT_DIR, target_filename)
        
        # Previous rows
        previous_rows = 0
        if os.path.exists(target_parent):
            try:
                with open(target_parent, 'r', encoding='latin-1', errors='replace') as f:
                    previous_rows = max(0, sum(1 for l in f if l.strip()) - 1)
                create_backup(target_parent)
            except Exception:
                pass

        headers = []
        rows = []

        if mode == 'local_folder':
            src = source_path_or_url.strip()
            if not os.path.exists(src):
                return False, f"Fichier source SharePoint introuvable : {src}"

            ext = os.path.splitext(src)[1].lower()
            if ext in ['.xlsx', '.xlsm', '.xls']:
                headers, rows = parse_excel_to_rows(src)
            elif ext == '.csv':
                with open(src, 'r', encoding='latin-1', errors='replace') as f:
                    # Detect delimiter
                    sample = f.read(4096)
                    f.seek(0)
                    delimiter = ';' if ';' in sample else (',' if ',' in sample else '\t')
                    reader = list(csv.reader(f, delimiter=delimiter))
                    if reader:
                        headers = reader[0]
                        rows = reader[1:]
            else:
                return False, f"Format non supporté pour la synchronisation de données : {ext}"

        elif mode == 'direct_url':
            url = source_path_or_url.strip()
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            temp_path = os.path.join(CURRENT_DIR, 'tmp_sharepoint_download')
            with urllib.request.urlopen(req, timeout=25) as response, open(temp_path, 'wb') as out_file:
                shutil.copyfileobj(response, out_file)
                
            # Check file type
            is_excel = False
            with open(temp_path, 'rb') as tf:
                magic = tf.read(4)
                if magic.startswith(b'PK\x03\x04'):  # Zip / xlsx
                    is_excel = True
                    
            if is_excel:
                headers, rows = parse_excel_to_rows(temp_path)
            else:
                with open(temp_path, 'r', encoding='latin-1', errors='replace') as f:
                    sample = f.read(4096)
                    f.seek(0)
                    delimiter = ';' if ';' in sample else ','
                    reader = list(csv.reader(f, delimiter=delimiter))
                    if reader:
                        headers = reader[0]
                        rows = reader[1:]
            try:
                os.remove(temp_path)
            except Exception:
                pass

        if not rows:
            return False, "Aucune donnée n'a pu être extraite du fichier SharePoint sélectionné."

        # Write to target local files with standard semicolon delimiter
        for p in [target_parent, target_web]:
            with open(p, 'w', encoding='utf-8-sig', newline='') as f:
                writer = csv.writer(f, delimiter=';')
                if headers:
                    writer.writerow(headers)
                writer.writerows(rows)

        # Trigger data rebuild
        run_data_rebuild()

        current_rows = len(rows)
        new_rows = current_rows - previous_rows

        return True, {
            'filename': target_filename,
            'local_path': target_parent,
            'lot': lot,
            'rows_count': current_rows,
            'previous_rows': previous_rows,
            'new_rows_detected': new_rows,
            'cols_count': len(headers)
        }
    except Exception as e:
        return False, str(e)


class VsbRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS and no-cache headers for API
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        
        if parsed.path == '/api/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            
            has_pyodbc = False
            driver = 'Inconnu'
            try:
                import pyodbc
                has_pyodbc = True
                driver = get_odbc_driver()
            except Exception:
                pass
                
            resp = {
                'status': 'online',
                'pyodbc_available': has_pyodbc,
                'odbc_driver': driver,
                'parent_dir': PARENT_DIR,
                'current_dir': CURRENT_DIR,
                'backups_dir': BACKUPS_DIR,
                'backups_count': len([f for f in os.listdir(BACKUPS_DIR) if os.path.isfile(os.path.join(BACKUPS_DIR, f))]) if os.path.exists(BACKUPS_DIR) else 0,
                'onedrive_folders': detect_onedrive_folders()
            }
            self.wfile.write(json.dumps(resp, ensure_ascii=False).encode('utf-8'))
            return

        elif parsed.path == '/api/refresh-sources':
            # Scan files, run rebuild and return updated statistics
            rebuild_ok, rebuild_msg = run_data_rebuild()
            files_stats, total_rows = scan_source_files_stats()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            
            self.wfile.write(json.dumps({
                'success': rebuild_ok,
                'timestamp': datetime.datetime.now().strftime('%d/%m/%Y %H:%M:%S'),
                'message': "Les données sources CSV ont été vérifiées et le tableau de bord a été régénéré avec succès." if rebuild_ok else f"Erreur lors de la reconstruction : {rebuild_msg}",
                'files': files_stats,
                'total_immeubles': total_rows
            }, ensure_ascii=False).encode('utf-8'))
            return

        # Serve static files from CURRENT_DIR
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)

        try:
            data = json.loads(body.decode('utf-8')) if body else {}
        except Exception:
            data = {}

        if parsed.path == '/api/refresh-sources':
            rebuild_ok, rebuild_msg = run_data_rebuild()
            files_stats, total_rows = scan_source_files_stats()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            
            self.wfile.write(json.dumps({
                'success': rebuild_ok,
                'timestamp': datetime.datetime.now().strftime('%d/%m/%Y %H:%M:%S'),
                'message': "Données sources CSV vérifiées et actualisées avec succès.",
                'files': files_stats,
                'total_immeubles': total_rows
            }, ensure_ascii=False).encode('utf-8'))
            return

        elif parsed.path == '/api/azure-test':
            server = data.get('server', '').strip()
            database = data.get('database', '').strip()
            username = data.get('username', '').strip()
            password = data.get('password', '').strip()
            encrypt = data.get('encrypt', True)
            trust_cert = data.get('trust_cert', False)

            success, message, tables = test_azure_connection(server, database, username, password, encrypt, trust_cert)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({
                'success': success,
                'message': message,
                'tables': tables
            }, ensure_ascii=False).encode('utf-8'))
            return

        elif parsed.path == '/api/azure-sync':
            server = data.get('server', '').strip()
            database = data.get('database', '').strip()
            username = data.get('username', '').strip()
            password = data.get('password', '').strip()
            table_or_query = data.get('table_or_query', '').strip()
            filename = data.get('filename', '').strip()
            lot = data.get('lot', 'batiment')
            target_mode = data.get('target_mode', 'existing_source')
            encrypt = data.get('encrypt', True)
            trust_cert = data.get('trust_cert', False)

            success, result = sync_azure_data(server, database, username, password, table_or_query, filename, lot, target_mode, encrypt, trust_cert)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()

            if success:
                self.wfile.write(json.dumps({
                    'success': True,
                    'data': result
                }, ensure_ascii=False).encode('utf-8'))
            else:
                self.wfile.write(json.dumps({
                    'success': False,
                    'error': str(result)
                }, ensure_ascii=False).encode('utf-8'))
            return

        elif parsed.path == '/api/sharepoint-test':
            mode = data.get('mode', 'local_folder')
            folder_path = data.get('folder_path', '')
            file_url = data.get('file_url', '')
            tenant_id = data.get('tenant_id', '')
            client_id = data.get('client_id', '')
            client_secret = data.get('client_secret', '')
            site_url = data.get('site_url', '')

            success, message, files = test_sharepoint_connection(mode, folder_path, file_url, tenant_id, client_id, client_secret, site_url)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({
                'success': success,
                'message': message,
                'files': files
            }, ensure_ascii=False).encode('utf-8'))
            return

        elif parsed.path == '/api/sharepoint-sync':
            mode = data.get('mode', 'local_folder')
            source_path = data.get('source_path', '')
            lot = data.get('lot', 'batiment')
            target_filename = data.get('target_filename', '')

            success, result = sync_sharepoint_file(mode, source_path, lot, target_filename)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()

            if success:
                self.wfile.write(json.dumps({
                    'success': True,
                    'data': result
                }, ensure_ascii=False).encode('utf-8'))
            else:
                self.wfile.write(json.dumps({
                    'success': False,
                    'error': str(result)
                }, ensure_ascii=False).encode('utf-8'))
            return

        elif parsed.path == '/api/save-lot-file':
            lot = data.get('lot', 'batiment')
            filename = data.get('filename', 'DATA.csv').strip()
            headers = data.get('headers', [])
            rows = data.get('rows', [])

            filename = os.path.basename(filename)
            parent_path = os.path.join(PARENT_DIR, filename)
            web_path = os.path.join(CURRENT_DIR, filename)

            try:
                if os.path.exists(parent_path):
                    create_backup(parent_path)

                for p in [parent_path, web_path]:
                    with open(p, 'w', encoding='utf-8-sig', newline='') as f:
                        writer = csv.writer(f, delimiter=';')
                        if headers:
                            writer.writerow(headers)
                        if rows:
                            writer.writerows(rows)

                # Rebuild
                run_data_rebuild()

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'success': True,
                    'message': f"Fichier {filename} sauvegardé en local dans {parent_path} et synchronisé avec succès !",
                    'path': parent_path
                }, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'success': False,
                    'error': str(e)
                }, ensure_ascii=False).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

def main():
    os.chdir(CURRENT_DIR)
    port = PORT
    socketserver.TCPServer.allow_reuse_address = True
    for attempt in range(5):
        try:
            handler = VsbRequestHandler
            with socketserver.TCPServer(("", port), handler) as httpd:
                print("="*65)
                print(f"  SERVEUR VSB MONITOR & SYNCHRONISATION MULTI-SOURCES")
                print(f"  URL Locale : http://localhost:{port}")
                print(f"  Pilote ODBC SQL Server : {get_odbc_driver()}")
                print(f"  Dossier Local : {CURRENT_DIR}")
                print(f"  Dossier Sources : {PARENT_DIR}")
                print("="*65)
                print("Appuyez sur Ctrl+C pour arreter le serveur.")
                httpd.serve_forever()
                break
        except OSError as e:
            if "address already in use" in str(e).lower() or "winerror 10048" in str(e).lower():
                port += 1
            else:
                raise e

if __name__ == '__main__':
    main()
