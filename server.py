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
import urllib.parse
import urllib.request
import urllib.error
from urllib.parse import urlparse, parse_qs

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

SHAREPOINT_CACHE = {
    'url': None,
    'timestamp': 0,
    'detected_name': None,
    'headers': [],
    'rows': [],
    'lot': 'batiment'
}

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

def download_sharepoint_url_to_file(url, target_path, timeout=35):
    """Télécharge un fichier SharePoint, OneDrive ou HTTP direct avec gestion complète des cookies de session"""
    from http.cookiejar import CookieJar
    
    clean_url = url.strip()
    if ('sharepoint.com' in clean_url.lower() or '1drv.ms' in clean_url.lower() or 'onedrive.live.com' in clean_url.lower()):
        if 'download=1' not in clean_url:
            clean_url = clean_url + ('&download=1' if '?' in clean_url else '?download=1')
            
    cj = CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr,fr-FR;q=0.9,en;q=0.8',
    }
    req = urllib.request.Request(clean_url, headers=headers)
    with opener.open(req, timeout=timeout) as res, open(target_path, 'wb') as out_f:
        final_url = res.geturl()
        headers_dict = dict(res.headers)
        shutil.copyfileobj(res, out_f)
        
    return final_url, headers_dict

def parse_excel_to_rows(filepath):
    """Lit un fichier Excel (.xlsx, .xlsm, .xls) et retourne (headers, rows)"""
    try:
        import openpyxl
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
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
        # Supprimer une éventuelle colonne marge vide au début
        if headers and headers[0] == '':
            if all(not r or r[0] == '' for r in data_rows[:30]):
                headers = headers[1:]
                data_rows = [r[1:] if len(r) > 1 else [] for r in data_rows]
        return headers, data_rows
    except Exception as e:
        raise Exception(f"Erreur lors de la lecture du classeur Excel : {e}")

# ==============================================================================
# CONNECTEUR COMPTE MICROSOFT 365 / SHAREPOINT (DEVICE CODE FLOW & GRAPH API)
# ==============================================================================

DEFAULT_CLIENT_ID = 'd3590ed6-52b3-4102-aeff-aad2292ab01c'  # Microsoft Office Universal Client ID
SESSION_FILE = os.path.join(CURRENT_DIR, 'sharepoint_session.json')

def load_sharepoint_session():
    if os.path.exists(SESSION_FILE):
        try:
            with open(SESSION_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return None

def save_sharepoint_session(session_data):
    try:
        with open(SESSION_FILE, 'w', encoding='utf-8') as f:
            json.dump(session_data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"Erreur sauvegarde session SharePoint: {e}")
        return False

def clear_sharepoint_session():
    if os.path.exists(SESSION_FILE):
        try:
            os.remove(SESSION_FILE)
            return True
        except Exception:
            pass
    return False

def get_valid_sharepoint_token():
    """Vérifie le jeton d'accès et le rafraîchit automatiquement avec le refresh_token si nécessaire"""
    session = load_sharepoint_session()
    if not session or not session.get('access_token'):
        return None
        
    expires_at = session.get('expires_at', 0)
    # Si le jeton est encore valide (avec marge de 120s)
    if time.time() < expires_at - 120:
        return session.get('access_token')
        
    # Sinon, renouveler avec le refresh_token
    refresh_token = session.get('refresh_token')
    if not refresh_token:
        return None
        
    client_id = session.get('client_id') or DEFAULT_CLIENT_ID
    tenant_id = session.get('tenant_id') or 'common'
    token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    
    data = urllib.parse.urlencode({
        'client_id': client_id,
        'grant_type': 'refresh_token',
        'refresh_token': refresh_token,
        'scope': 'User.Read Files.Read.All Sites.Read.All offline_access'
    }).encode('utf-8')
    
    try:
        req = urllib.request.Request(token_url, data=data, method='POST')
        with urllib.request.urlopen(req, timeout=15) as res:
            res_data = json.loads(res.read().decode('utf-8'))
            session['access_token'] = res_data.get('access_token')
            if res_data.get('refresh_token'):
                session['refresh_token'] = res_data.get('refresh_token')
            session['expires_at'] = time.time() + res_data.get('expires_in', 3600)
            save_sharepoint_session(session)
            return session.get('access_token')
    except Exception as e:
        print(f"Erreur lors du renouvellement du jeton Microsoft: {e}")
        return None

def start_device_auth(client_id=None, tenant_id=None):
    """Démarre le flux Device Code Microsoft universel"""
    cid = client_id.strip() if client_id and client_id.strip() else DEFAULT_CLIENT_ID
    tid = tenant_id.strip() if tenant_id and tenant_id.strip() else 'common'
    
    device_url = f"https://login.microsoftonline.com/{tid}/oauth2/v2.0/devicecode"
    data = urllib.parse.urlencode({
        'client_id': cid,
        'scope': 'User.Read Files.Read.All Sites.Read.All offline_access'
    }).encode('utf-8')
    
    req = urllib.request.Request(device_url, data=data, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            resp = json.loads(res.read().decode('utf-8'))
            resp['client_id'] = cid
            resp['tenant_id'] = tid
            return True, resp
    except Exception as e:
        return False, str(e)

def poll_device_auth(device_code, client_id=None, tenant_id=None):
    """Interroge Microsoft pour vérifier si l'utilisateur s'est connecté sur device login"""
    cid = client_id.strip() if client_id and client_id.strip() else DEFAULT_CLIENT_ID
    tid = tenant_id.strip() if tenant_id and tenant_id.strip() else 'common'
    
    token_url = f"https://login.microsoftonline.com/{tid}/oauth2/v2.0/token"
    data = urllib.parse.urlencode({
        'client_id': cid,
        'grant_type': 'urn:ietf:params:oauth:grant-type:device_code',
        'device_code': device_code
    }).encode('utf-8')
    
    req = urllib.request.Request(token_url, data=data, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            token_resp = json.loads(res.read().decode('utf-8'))
            access_token = token_resp.get('access_token')
            refresh_token = token_resp.get('refresh_token')
            expires_in = token_resp.get('expires_in', 3600)
            
            # Récupérer les informations de profil de l'utilisateur
            user_info = {
                'displayName': 'Utilisateur Microsoft 365',
                'mail': '',
                'userPrincipalName': '',
                'jobTitle': '',
                'connected_at': datetime.datetime.now().strftime('%d/%m/%Y %H:%M:%S')
            }
            try:
                me_req = urllib.request.Request('https://graph.microsoft.com/v1.0/me', headers={
                    'Authorization': f"Bearer {access_token}",
                    'Accept': 'application/json'
                })
                with urllib.request.urlopen(me_req, timeout=10) as me_res:
                    me_data = json.loads(me_res.read().decode('utf-8'))
                    user_info['displayName'] = me_data.get('displayName') or user_info['displayName']
                    user_info['mail'] = me_data.get('mail') or me_data.get('userPrincipalName') or ''
                    user_info['userPrincipalName'] = me_data.get('userPrincipalName') or ''
                    user_info['jobTitle'] = me_data.get('jobTitle') or ''
            except Exception as e:
                print(f"Notice: Profil /me incomplet: {e}")
                
            session = {
                'access_token': access_token,
                'refresh_token': refresh_token,
                'expires_at': time.time() + expires_in,
                'client_id': cid,
                'tenant_id': tid,
                'user': user_info
            }
            save_sharepoint_session(session)
            return True, {'status': 'connected', 'user': user_info}
            
    except urllib.error.HTTPError as he:
        try:
            err_body = json.loads(he.read().decode('utf-8'))
            err_code = err_body.get('error')
            if err_code == 'authorization_pending':
                return True, {'status': 'pending'}
            elif err_code == 'authorization_declined':
                return False, {'status': 'declined', 'error': 'Connexion refusée par l\'utilisateur sur le portail Microsoft.'}
            elif err_code == 'expired_token':
                return False, {'status': 'expired', 'error': 'Le code temporaire a expiré. Veuillez relancer la connexion.'}
            else:
                return False, {'status': 'error', 'error': err_body.get('error_description', str(he))}
        except Exception:
            return False, {'status': 'error', 'error': f"Erreur HTTP {he.code}: {he.reason}"}
    except Exception as e:
        return False, {'status': 'error', 'error': str(e)}

def list_cloud_sharepoint_files():
    """Interroge Microsoft Graph pour lister les fichiers récents et bibliothèques SharePoint"""
    token = get_valid_sharepoint_token()
    if not token:
        return False, "Compte SharePoint non connecté ou session expirée. Veuillez vous connecter.", []
        
    headers = {
        'Authorization': f"Bearer {token}",
        'Accept': 'application/json'
    }
    
    collected_files = []
    seen_ids = set()
    
    # 1. Fichiers récents
    try:
        req = urllib.request.Request('https://graph.microsoft.com/v1.0/me/drive/recent?$top=50', headers=headers)
        with urllib.request.urlopen(req, timeout=12) as res:
            data = json.loads(res.read().decode('utf-8'))
            for item in data.get('value', []):
                remote = item.get('remoteItem', {})
                name = remote.get('name') or item.get('name') or ''
                item_id = remote.get('id') or item.get('id')
                if not name or item_id in seen_ids:
                    continue
                    
                ext = os.path.splitext(name)[1].lower()
                if ext in ['.xlsx', '.xlsm', '.xls', '.csv']:
                    seen_ids.add(item_id)
                    parent_ref = remote.get('parentReference') or item.get('parentReference') or {}
                    drive_id = parent_ref.get('driveId') or ''
                    
                    n_up = name.upper()
                    lot = 'batiment'
                    if 'SRM' in n_up or 'VRD' in n_up or 'RESEAU' in n_up:
                        lot = 'vrd'
                    elif 'LPEE' in n_up or 'CID' in n_up or 'QUALITE' in n_up:
                        lot = 'lpee'
                    elif 'EQUIP' in n_up:
                        lot = 'equipements'
                    elif 'AMI' in n_up:
                        lot = 'ami'
                    elif 'PLANIF' in n_up:
                        lot = 'planif'
                    elif 'CHECK' in n_up:
                        lot = 'checklist'
                        
                    mod_dt = remote.get('lastModifiedDateTime') or item.get('lastModifiedDateTime') or ''
                    formatted_date = ''
                    if mod_dt:
                        try:
                            formatted_date = datetime.datetime.fromisoformat(mod_dt.replace('Z', '+00:00')).strftime('%d/%m/%Y %H:%M')
                        except Exception:
                            formatted_date = mod_dt[:16].replace('T', ' ')
                            
                    collected_files.append({
                        'id': item_id,
                        'name': name,
                        'drive_id': drive_id,
                        'size': remote.get('size') or item.get('size') or 0,
                        'modified': formatted_date,
                        'web_url': remote.get('webUrl') or item.get('webUrl') or '',
                        'suggested_lot': lot,
                        'source_type': 'Fichier Récent SharePoint / OneDrive',
                        'ext': ext.replace('.', '').upper()
                    })
    except Exception as e:
        print(f"Notice /me/drive/recent: {e}")
        
    # 2. Racine OneDrive Entreprise
    try:
        req = urllib.request.Request('https://graph.microsoft.com/v1.0/me/drive/root/children?$top=50', headers=headers)
        with urllib.request.urlopen(req, timeout=12) as res:
            data = json.loads(res.read().decode('utf-8'))
            for item in data.get('value', []):
                name = item.get('name') or ''
                item_id = item.get('id')
                if not name or item_id in seen_ids:
                    continue
                ext = os.path.splitext(name)[1].lower()
                if ext in ['.xlsx', '.xlsm', '.xls', '.csv']:
                    seen_ids.add(item_id)
                    parent_ref = item.get('parentReference') or {}
                    drive_id = parent_ref.get('driveId') or ''
                    
                    n_up = name.upper()
                    lot = 'batiment'
                    if 'SRM' in n_up or 'VRD' in n_up: lot = 'vrd'
                    elif 'LPEE' in n_up or 'CID' in n_up: lot = 'lpee'
                    elif 'EQUIP' in n_up: lot = 'equipements'
                    elif 'AMI' in n_up: lot = 'ami'
                    elif 'PLANIF' in n_up: lot = 'planif'
                    elif 'CHECK' in n_up: lot = 'checklist'
                    
                    mod_dt = item.get('lastModifiedDateTime') or ''
                    formatted_date = ''
                    if mod_dt:
                        try:
                            formatted_date = datetime.datetime.fromisoformat(mod_dt.replace('Z', '+00:00')).strftime('%d/%m/%Y %H:%M')
                        except Exception:
                            formatted_date = mod_dt[:16].replace('T', ' ')
                            
                    collected_files.append({
                        'id': item_id,
                        'name': name,
                        'drive_id': drive_id,
                        'size': item.get('size') or 0,
                        'modified': formatted_date,
                        'web_url': item.get('webUrl') or '',
                        'suggested_lot': lot,
                        'source_type': 'OneDrive Entreprise',
                        'ext': ext.replace('.', '').upper()
                    })
    except Exception as e:
        print(f"Notice /me/drive/root/children: {e}")
        
    return True, f"{len(collected_files)} fichier(s) détecté(s) sur votre compte Microsoft 365 / SharePoint.", collected_files

def sync_cloud_sharepoint_file(item_id, drive_id=None, file_name=None, lot='batiment', target_filename=None):
    """Télécharge un fichier depuis Microsoft Graph et met à jour le fichier source local"""
    token = get_valid_sharepoint_token()
    if not token:
        return False, "Session Microsoft 365 expirée. Veuillez reconnecter votre compte."
        
    if not target_filename:
        target_filename = LOT_SOURCE_FILES.get(lot, 'AVANCEMENT TEST CSV.csv')
        
    target_parent = os.path.join(PARENT_DIR, target_filename)
    target_web = os.path.join(CURRENT_DIR, target_filename)
    
    headers = {
        'Authorization': f"Bearer {token}",
        'Accept': 'application/json'
    }
    
    item_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{item_id}" if drive_id else f"https://graph.microsoft.com/v1.0/me/drive/items/{item_id}"
    
    download_url = None
    real_name = file_name or 'fichier_sharepoint.xlsx'
    try:
        req = urllib.request.Request(item_url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as res:
            item_meta = json.loads(res.read().decode('utf-8'))
            download_url = item_meta.get('@microsoft.graph.downloadUrl')
            real_name = item_meta.get('name') or real_name
    except Exception as e:
        print(f"Notice item metadata: {e}")
        
    temp_download = os.path.join(CURRENT_DIR, 'tmp_graph_download')
    try:
        if download_url:
            # SAS Direct URL
            dl_req = urllib.request.Request(download_url, headers={
                'User-Agent': 'VSB-Monitor/2.5'
            })
            with urllib.request.urlopen(dl_req, timeout=45) as res, open(temp_download, 'wb') as out_f:
                shutil.copyfileobj(res, out_f)
        else:
            # Graph Content Stream with Bearer Token
            content_url = f"{item_url}/content"
            dl_req = urllib.request.Request(content_url, headers={
                'Authorization': f"Bearer {token}",
                'User-Agent': 'VSB-Monitor/2.5'
            })
            with urllib.request.urlopen(dl_req, timeout=45) as res, open(temp_download, 'wb') as out_f:
                shutil.copyfileobj(res, out_f)
                
        # Parse content
        ext = os.path.splitext(real_name)[1].lower()
        if ext in ['.xlsx', '.xlsm', '.xls']:
            headers_list, rows_list = parse_excel_to_rows(temp_download)
        elif ext == '.csv':
            with open(temp_download, 'r', encoding='latin-1', errors='replace') as f:
                sample = f.read(4096)
                f.seek(0)
                delimiter = ';' if ';' in sample else (',' if ',' in sample else '\t')
                reader = list(csv.reader(f, delimiter=delimiter))
                if reader:
                    headers_list = reader[0]
                    rows_list = reader[1:]
                else:
                    headers_list, rows_list = [], []
        else:
            return False, f"Format de fichier non pris en charge ({ext}). Veuillez choisir un fichier .XLSX ou .CSV."
            
        if not rows_list:
            return False, f"Aucune ligne de données trouvée dans le fichier {real_name}."
            
        # Backup
        previous_rows = 0
        if os.path.exists(target_parent):
            try:
                with open(target_parent, 'r', encoding='latin-1', errors='replace') as f:
                    previous_rows = max(0, sum(1 for l in f if l.strip()) - 1)
                create_backup(target_parent)
            except Exception:
                pass
                
        # Write CSV
        for p in [target_parent, target_web]:
            with open(p, 'w', encoding='utf-8-sig', newline='') as f:
                writer = csv.writer(f, delimiter=';')
                if headers_list:
                    writer.writerow(headers_list)
                writer.writerows(rows_list)
                
        # Rebuild data.js
        rebuild_ok, rebuild_msg = run_data_rebuild()
        
        current_rows = len(rows_list)
        new_rows = current_rows - previous_rows
        
        return True, {
            'filename': target_filename,
            'source_cloud_name': real_name,
            'lot': lot,
            'rows_count': current_rows,
            'previous_rows': previous_rows,
            'new_rows_detected': new_rows,
            'cols_count': len(headers_list),
            'rebuild_success': rebuild_ok
        }
        
    except Exception as e:
        return False, f"Erreur lors de la synchronisation de {real_name}: {e}"
    finally:
        try:
            if os.path.exists(temp_download):
                os.remove(temp_download)
        except Exception:
            pass

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

            temp_test = os.path.join(CURRENT_DIR, 'tmp_sharepoint_test')
            try:
                try:
                    final_url, headers_dict = download_sharepoint_url_to_file(url, temp_test, timeout=25)
                except urllib.error.HTTPError as he:
                    if he.code == 429:
                        return False, (
                            "Microsoft SharePoint applique une protection anti-robot (Erreur 429) sur les liens interrogés par des scripts externes.\n\n"
                            "C'est pourquoi le lien s'ouvre normalement dans votre navigateur (qui exécute le JavaScript Microsoft), mais bloque les requêtes directes de serveurs ou scripts automatisés.\n\n"
                            "Deux solutions simples et immédiates pour importer vos données :\n"
                            "1. Option 1 (Immédiate) : Dans votre navigateur où le fichier est ouvert, cliquez sur 'Fichier > Enregistrer sous > Télécharger une copie' (.xlsx), puis glissez-le dans l'onglet 'Synchronisation par Lot' (Lot 1 Bâtiment) du tableau de bord.\n"
                            "2. Option 2 : Utilisez le 'Mode Dossier Local Synchronisé' (votre application OneDrive synchronise vos fichiers SharePoint directement sur votre PC sans passer par le pare-feu web)."
                        ), []
                    return False, f"Erreur HTTP {he.code} lors de l'accès à SharePoint : {he.reason}", []
                except Exception as ex:
                    return False, f"Impossible de joindre le lien SharePoint : {ex}", []
                
                # Check if redirected to Microsoft 365 login
                if 'login.microsoftonline.com' in final_url or '/_forms/default.aspx' in final_url:
                    return False, (
                        "Ce lien SharePoint est restreint à votre organisation et requiert une authentification Microsoft 365.\n\n"
                        "Solutions recommandées :\n"
                        "1. (Immédiat) Utilisez le 'Mode Dossier Local Synchronisé' : votre OneDrive synchronise déjà vos fichiers SharePoint en local dans 'C:\\Users\\Hp\\OneDrive\\' sans mot de passe requis !\n"
                        "2. Ou dans SharePoint : Cliquez sur Partager > sélectionnez 'Toute personne disposant du lien' (Anyone with the link) pour autoriser le téléchargement direct."
                    ), []

                # Check downloaded content
                file_size = os.path.getsize(temp_test)
                is_excel = False
                is_csv = False
                with open(temp_test, 'rb') as tf:
                    magic = tf.read(256)
                    if magic.startswith(b'PK\x03\x04') or b'xl/' in magic:
                        is_excel = True
                    elif b'<html' in magic.lower() or b'<!doctype' in magic.lower():
                        return False, "Le lien fourni a retourné une page web au lieu d'un fichier Excel/CSV.", []
                    else:
                        is_csv = True

                # Extract filename
                detected_name = None
                path_part = urlparse(final_url).path
                base_name = urllib.parse.unquote(os.path.basename(path_part))
                if base_name and ('.' in base_name) and not base_name.endswith('.aspx'):
                    detected_name = base_name

                if not detected_name:
                    cd = headers_dict.get('Content-Disposition', '')
                    if 'filename=' in cd:
                        detected_name = cd.split('filename=')[1].split(';')[0].strip(' "\'')

                if not detected_name:
                    if is_excel or ':x:' in url:
                        detected_name = 'AV VS TS CIE 10 2026.xlsx' if 'AV%20VS' in final_url else 'Classeur_SharePoint.xlsx'
                    else:
                        detected_name = 'Fichier_SharePoint.csv'

                suggested_lot = 'batiment'
                fn_up = detected_name.upper()
                if 'SRM' in fn_up or 'VRD' in fn_up: suggested_lot = 'vrd'
                elif 'LPEE' in fn_up or 'CID' in fn_up: suggested_lot = 'lpee'
                elif 'EQUIP' in fn_up: suggested_lot = 'equipements'
                elif 'CHECK' in fn_up or 'PH' in fn_up: suggested_lot = 'checklist'

                # Cache the downloaded file and parsed data for fast sync without re-downloading
                parsed_headers, parsed_rows = [], []
                if is_excel:
                    try:
                        parsed_headers, parsed_rows = parse_excel_to_rows(temp_test)
                    except Exception:
                        pass
                elif is_csv:
                    try:
                        with open(temp_test, 'r', encoding='latin-1', errors='replace') as f:
                            sample = f.read(4096)
                            f.seek(0)
                            delim = ';' if ';' in sample else (',' if ',' in sample else '\t')
                            r = list(csv.reader(f, delimiter=delim))
                            if r:
                                parsed_headers = r[0]
                                parsed_rows = r[1:]
                    except Exception:
                        pass

                SHAREPOINT_CACHE['url'] = url
                SHAREPOINT_CACHE['timestamp'] = time.time()
                SHAREPOINT_CACHE['detected_name'] = detected_name
                SHAREPOINT_CACHE['headers'] = parsed_headers
                SHAREPOINT_CACHE['rows'] = parsed_rows
                SHAREPOINT_CACHE['lot'] = suggested_lot

                return True, f"Fichier SharePoint détecté avec succès : {detected_name} ({file_size/1024:.1f} KB, {len(parsed_rows)} lignes) !", [{
                    'name': detected_name,
                    'path': url,
                    'size': f"{file_size/1024:.1f} KB",
                    'modified': datetime.datetime.now().strftime('%d/%m/%Y %H:%M:%S'),
                    'type': 'XLSX' if is_excel else ('CSV' if is_csv else 'FICHIER'),
                    'suggested_lot': suggested_lot
                }]
            finally:
                try:
                    if os.path.exists(temp_test):
                        os.remove(temp_test)
                except Exception:
                    pass

        elif mode == 'graph_api':
            # Microsoft Graph API OAuth Test
            if not tenant_id or not client_id or not client_secret:
                return False, "Paramètres Azure AD / Entra ID incomplets (Tenant ID, Client ID et Client Secret requis)", []
                
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
            # If recently tested, reuse cached parsed rows to avoid network calls and rate limiting
            if SHAREPOINT_CACHE.get('url') == url and (time.time() - SHAREPOINT_CACHE.get('timestamp', 0) < 600) and SHAREPOINT_CACHE.get('rows'):
                headers = SHAREPOINT_CACHE['headers']
                rows = SHAREPOINT_CACHE['rows']
            else:
                temp_path = os.path.join(CURRENT_DIR, 'tmp_sharepoint_download')
                try:
                    final_url, headers_dict = download_sharepoint_url_to_file(url, temp_path, timeout=35)
                except urllib.error.HTTPError as e:
                    if e.code == 429:
                        return False, "Microsoft SharePoint a temporairement limité les requêtes (Erreur 429 - Trop de requêtes). Veuillez patienter une minute ou utiliser le Mode Dossier Local OneDrive."
                    return False, f"Erreur HTTP {e.code} lors du téléchargement SharePoint : {e.reason}"
                except Exception as e:
                    return False, f"Impossible de télécharger le fichier depuis SharePoint : {e}"
                
                if 'login.microsoftonline.com' in final_url or '/_forms/default.aspx' in final_url:
                    try: os.remove(temp_path)
                    except Exception: pass
                    return False, "Ce lien SharePoint nécessite une authentification Microsoft 365. Veuillez utiliser le Mode Dossier Local Synchronisé (OneDrive) ou générer un lien 'Toute personne disposant du lien'."
                    
                # Check file type
                is_excel = False
                with open(temp_path, 'rb') as tf:
                    magic = tf.read(256)
                    if magic.startswith(b'PK\x03\x04') or b'xl/' in magic:
                        is_excel = True
                    elif b'<html' in magic.lower() or b'<!doctype' in magic.lower():
                        try: os.remove(temp_path)
                        except Exception: pass
                        return False, "Le lien fourni a retourné une page web HTML au lieu d'un fichier Excel ou CSV. Pour les fichiers protégés par Microsoft 365, utilisez le Mode Dossier Local OneDrive."
                        
                if is_excel:
                    headers, rows = parse_excel_to_rows(temp_path)
                else:
                    with open(temp_path, 'r', encoding='latin-1', errors='replace') as f:
                        sample = f.read(4096)
                        f.seek(0)
                        delimiter = ';' if ';' in sample else (',' if ',' in sample else '\t')
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

    def send_json(self, data, code=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

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

        elif parsed.path == '/api/sharepoint/status':
            session = load_sharepoint_session()
            connected = False
            user_info = {}
            if session and session.get('access_token'):
                token = get_valid_sharepoint_token()
                if token:
                    connected = True
                    user_info = session.get('user', {})
            self.send_json({
                'connected': connected,
                'user': user_info
            })
            return

        elif parsed.path == '/api/sharepoint/files':
            ok, msg, files = list_cloud_sharepoint_files()
            self.send_json({
                'success': ok,
                'message': msg,
                'files': files
            })
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

            self.send_json({
                'success': success,
                'message': message,
                'files': files
            })
            return

        elif parsed.path == '/api/sharepoint-sync':
            mode = data.get('mode', 'local_folder')
            source_path = data.get('source_path', '')
            lot = data.get('lot', 'batiment')
            target_filename = data.get('target_filename', '')

            success, result = sync_sharepoint_file(mode, source_path, lot, target_filename)

            if success:
                self.send_json({
                    'success': True,
                    'data': result
                })
            else:
                self.send_json({
                    'success': False,
                    'error': str(result)
                })
            return

        elif parsed.path == '/api/sharepoint/auth-start':
            client_id = data.get('client_id')
            tenant_id = data.get('tenant_id')
            ok, result = start_device_auth(client_id, tenant_id)
            if ok:
                self.send_json({'success': True, 'data': result})
            else:
                self.send_json({'success': False, 'error': str(result)})
            return

        elif parsed.path == '/api/sharepoint/auth-poll':
            device_code = data.get('device_code', '').strip()
            client_id = data.get('client_id')
            tenant_id = data.get('tenant_id')
            if not device_code:
                self.send_json({'success': False, 'error': "device_code manquant"})
                return
            ok, result = poll_device_auth(device_code, client_id, tenant_id)
            if ok:
                self.send_json({'success': True, 'data': result})
            else:
                err_msg = result.get('error', 'Erreur d\'authentification') if isinstance(result, dict) else str(result)
                self.send_json({'success': False, 'error': err_msg})
            return

        elif parsed.path == '/api/sharepoint/disconnect':
            clear_sharepoint_session()
            self.send_json({'success': True, 'message': 'Compte SharePoint déconnecté avec succès.'})
            return

        elif parsed.path == '/api/sharepoint/sync-cloud-file':
            item_id = data.get('item_id', '').strip()
            drive_id = data.get('drive_id', '').strip() or None
            file_name = data.get('file_name', '').strip()
            lot = data.get('lot', 'batiment')
            target_filename = data.get('target_filename', '').strip() or None

            ok, result = sync_cloud_sharepoint_file(item_id, drive_id, file_name, lot, target_filename)
            if ok:
                self.send_json({'success': True, 'data': result})
            else:
                self.send_json({'success': False, 'error': str(result)})
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
