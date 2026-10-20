import csv
import json
import os
import re

def clean_str(s):
    if not s:
        return ''
    # Replace non-breaking spaces and fix weird chars
    s = s.strip().replace('\xa0', ' ').replace('\ufeff', '')
    s = re.sub(r'\s+', ' ', s)
    return s

def clean_pct(s):
    if not s:
        return 0.0
    s = str(s).strip().replace('%', '').replace(',', '.').strip()
    try:
        val = float(s)
        return round(val, 1)
    except:
        return 0.0

def clean_int(s):
    if not s:
        return 0
    s = str(s).strip().replace(' ', '').replace('\xa0', '')
    try:
        return int(float(s))
    except:
        return 0

def parse_avancement():
    path = os.path.join('..', 'AVANCEMENT TEST CSV.csv')
    if not os.path.exists(path):
        return []
    records = []
    with open(path, 'r', encoding='latin-1', errors='replace') as f:
        reader = list(csv.reader(f, delimiter=';'))
        for idx, r in enumerate(reader[1:], start=1):
            if len(r) < 15 or not any(clean_str(x) for x in r):
                continue
            
            prov = clean_str(r[0])
            # Normalize province names
            if prov == 'HAY_HASSANI':
                prov = 'HAY HASSANI'
            elif prov == 'CASABLANCA':
                prov = 'CASABLANCA'
            
            proj = clean_str(r[1])
            prom = clean_str(r[2])
            appts_conv = clean_int(r[3])
            tranche = clean_str(r[4])
            gh = clean_str(r[5])
            appts_gh = clean_int(r[6])
            imm = clean_str(r[7])
            if not imm:
                continue
            typ = clean_str(r[8])
            appts_imm = clean_int(r[9]) if len(r) > 9 else 0
            affecte = clean_str(r[10]) if len(r) > 10 else ''
            plan_archi = clean_str(r[11]) if len(r) > 11 else ''
            plan_archi_fourni = clean_str(r[12]) if len(r) > 12 else ''
            plan_beton = clean_str(r[13]) if len(r) > 13 else ''
            plan_beton_fourni = clean_str(r[14]) if len(r) > 14 else ''
            
            ph_raw = clean_str(r[15]) if len(r) > 15 else 'NON OBTENU'
            ph_status = 'OBTENU' if ('OBTENU' in ph_raw.upper() and 'NON' not in ph_raw.upper()) else 'NON OBTENU'
            
            av_50 = clean_str(r[16]) if len(r) > 16 else ''
            av_go = clean_pct(r[17]) if len(r) > 17 else 0.0
            av_ls = clean_pct(r[18]) if len(r) > 18 else 0.0
            av_gen = clean_pct(r[19]) if len(r) > 19 else 0.0
            
            # VRD details
            vrd = {
                'assainissement': clean_pct(r[20]) if len(r) > 20 else 0,
                'bassin_orage': clean_pct(r[21]) if len(r) > 21 else 0,
                'eau_potable': clean_pct(r[22]) if len(r) > 22 else 0,
                'eaux_usees': clean_pct(r[23]) if len(r) > 23 else 0,
                'eaux_pluviales': clean_pct(r[24]) if len(r) > 24 else 0,
                'elec_bt_mt': clean_pct(r[25]) if len(r) > 25 else 0,
                'postes_transfo': clean_pct(r[26]) if len(r) > 26 else 0,
                'telecom': clean_pct(r[27]) if len(r) > 27 else 0,
                'eclairage_public': clean_pct(r[28]) if len(r) > 28 else 0,
                'voirie_corps': clean_pct(r[29]) if len(r) > 29 else 0,
                'voirie_enrobee': clean_pct(r[30]) if len(r) > 30 else 0,
                'raccordement_hors_site': clean_pct(r[31]) if len(r) > 31 else 0,
            }
            
            # Gros Oeuvre details
            go = {
                'terrassement': clean_pct(r[32]) if len(r) > 32 else 0,
                'semelles_longrines': clean_pct(r[33]) if len(r) > 33 else 0,
                'poteaux_voiles': clean_pct(r[34]) if len(r) > 34 else 0,
                'mise_a_terre': clean_pct(r[35]) if len(r) > 35 else 0,
                'dallage': clean_pct(r[36]) if len(r) > 36 else 0,
                'rdc_poteaux': clean_pct(r[37]) if len(r) > 37 else 0,
                'rdc_plancher': clean_pct(r[38]) if len(r) > 38 else 0,
                'etage1_poteaux': clean_pct(r[39]) if len(r) > 39 else 0,
                'etage1_plancher': clean_pct(r[40]) if len(r) > 40 else 0,
                'etage2_poteaux': clean_pct(r[41]) if len(r) > 41 else 0,
                'etage2_plancher': clean_pct(r[42]) if len(r) > 42 else 0,
                'etage3_poteaux': clean_pct(r[43]) if len(r) > 43 else 0,
                'etage3_plancher': clean_pct(r[44]) if len(r) > 44 else 0,
                'etage4_poteaux': clean_pct(r[45]) if len(r) > 45 else 0,
                'etage4_plancher': clean_pct(r[46]) if len(r) > 46 else 0,
                'etage5_poteaux': clean_pct(r[47]) if len(r) > 47 else 0,
                'etage5_plancher': clean_pct(r[48]) if len(r) > 48 else 0,
                'toiture_terrasse': clean_pct(r[51]) if len(r) > 51 else 0,
            }
            
            # Lots Secondaires details
            ls = {
                'cloisons_rdc': clean_pct(r[52]) if len(r) > 52 else 0,
                'cloisons_1': clean_pct(r[53]) if len(r) > 53 else 0,
                'cloisons_2': clean_pct(r[54]) if len(r) > 54 else 0,
                'cloisons_3': clean_pct(r[55]) if len(r) > 55 else 0,
                'cloisons_4': clean_pct(r[56]) if len(r) > 56 else 0,
                'enduits_int_rdc': clean_pct(r[61]) if len(r) > 61 else 0,
                'enduits_int_1': clean_pct(r[63]) if len(r) > 63 else 0,
                'enduits_int_2': clean_pct(r[65]) if len(r) > 65 else 0,
                'enduits_ext': clean_pct(r[75]) if len(r) > 75 else 0,
                'etancheite_terrasse': clean_pct(r[76]) if len(r) > 76 else 0,
                'etancheite_sdb': clean_pct(r[77]) if len(r) > 77 else 0,
                'plafonds': clean_pct(r[78]) if len(r) > 78 else 0,
                'electricite': clean_pct(r[79]) if len(r) > 79 else 0,
                'plomberie': clean_pct(r[80]) if len(r) > 80 else 0,
                'sanitaire': clean_pct(r[83]) if len(r) > 83 else 0,
                'revetement': clean_pct(r[85]) if len(r) > 85 else 0,
                'menuiserie_bois': clean_pct(r[86]) if len(r) > 86 else 0,
                'menuiserie_alu': clean_pct(r[87]) if len(r) > 87 else 0,
                'peinture_int': clean_pct(r[89]) if len(r) > 89 else 0,
                'peinture_ext': clean_pct(r[90]) if len(r) > 90 else 0,
            }
            
            qualite = {
                'rapport_lpee': clean_str(r[91]) if len(r) > 91 else '',
                'reserves_lpee': clean_str(r[92]) if len(r) > 92 else '',
                'situation_srm': clean_str(r[93]) if len(r) > 93 else '',
                'reception_srm': clean_str(r[94]) if len(r) > 94 else '',
                'reserves_srm': clean_str(r[95]) if len(r) > 95 else '',
                'ecl_comun': clean_str(r[96]) if len(r) > 96 else '',
            }
            
            records.append({
                'id': idx,
                'province': prov,
                'projet': proj,
                'promoteur': prom,
                'appts_conv': appts_conv,
                'tranche': tranche,
                'gh': gh,
                'appts_gh': appts_gh,
                'imm': imm,
                'type': typ,
                'appts_imm': appts_imm,
                'affecte': affecte,
                'plan_archi': plan_archi,
                'plan_archi_fourni': plan_archi_fourni,
                'plan_beton': plan_beton,
                'plan_beton_fourni': plan_beton_fourni,
                'ph_raw': ph_raw,
                'ph_status': ph_status,
                'av_50': av_50,
                'av_go': av_go,
                'av_ls': av_ls,
                'av_gen': av_gen,
                'vrd': vrd,
                'go': go,
                'ls': ls,
                'qualite': qualite
            })
    return records

def parse_equipements():
    path = os.path.join('..', 'EQUIPEMENT PUBLIC.csv')
    if not os.path.exists(path):
        return []
    records = []
    with open(path, 'r', encoding='latin-1', errors='replace') as f:
        reader = list(csv.reader(f, delimiter=';'))
        for idx, r in enumerate(reader[1:], start=1):
            if len(r) < 4 or not clean_str(r[2]):
                continue
            prov = clean_str(r[0])
            prom = clean_str(r[1])
            proj = clean_str(r[2])
            equip = clean_str(r[3])
            tranche = clean_str(r[4]) if len(r) > 4 else ''
            statut_raw = clean_str(r[5]) if len(r) > 5 else ''
            av = clean_pct(r[6]) if len(r) > 6 else 0.0
            date_cible = clean_str(r[7]) if len(r) > 7 else ''
            obs = clean_str(r[8]) if len(r) > 8 else ''
            
            # Normalize status
            statut_norm = 'En cours'
            s_up = statut_raw.upper()
            if 'NON DEMARRE' in s_up:
                statut_norm = 'Non démarré'
            elif 'ACHEVE' in s_up or 'LIVRE' in s_up:
                statut_norm = 'Achevé / Livré'
            elif 'EN COURS' in s_up:
                statut_norm = 'En cours'
            
            records.append({
                'id': idx,
                'province': prov,
                'promoteur': prom,
                'projet': proj,
                'equipement': equip,
                'tranche': tranche,
                'statut_raw': statut_raw,
                'statut': statut_norm,
                'avancement': av,
                'date_cible': date_cible,
                'observations': obs
            })
    return records

def parse_srm():
    path = os.path.join('..', 'SUIVI_SRM_CSV.csv')
    if not os.path.exists(path):
        return []
    records = []
    with open(path, 'r', encoding='latin-1', errors='replace') as f:
        reader = list(csv.reader(f, delimiter=';'))
        # Row 5 is header, rows 6+ are data
        for idx, r in enumerate(reader[6:], start=1):
            if len(r) < 4 or not clean_str(r[2]):
                continue
            prov = clean_str(r[0])
            prom = clean_str(r[1])
            proj = clean_str(r[2])
            gh = clean_str(r[3]) if len(r) > 3 else ''
            unites = clean_int(r[4]) if len(r) > 4 else 0
            ref_dossier = clean_str(r[5]) if len(r) > 5 else ''
            elec_statut = clean_str(r[6]) if len(r) > 6 else ''
            elec_date = clean_str(r[7]) if len(r) > 7 else ''
            elec_blocage = clean_str(r[8]) if len(r) > 8 else ''
            eau_statut = clean_str(r[9]) if len(r) > 9 else ''
            eau_date = clean_str(r[10]) if len(r) > 10 else ''
            eau_blocage = clean_str(r[11]) if len(r) > 11 else ''
            assain_pluvial = clean_str(r[12]) if len(r) > 12 else ''
            assain_usees = clean_str(r[13]) if len(r) > 13 else ''
            assain_date = clean_str(r[14]) if len(r) > 14 else ''
            assain_blocage = clean_str(r[15]) if len(r) > 15 else ''
            dependance = clean_str(r[16]) if len(r) > 16 else ''
            date_dispo = clean_str(r[17]) if len(r) > 17 else ''
            commentaire = clean_str(r[18]) if len(r) > 18 else ''
            
            records.append({
                'id': idx,
                'province': prov,
                'promoteur': prom,
                'projet': proj,
                'gh': gh,
                'unites': unites,
                'ref_dossier': ref_dossier,
                'elec_statut': elec_statut,
                'elec_date': elec_date,
                'elec_blocage': elec_blocage,
                'eau_statut': eau_statut,
                'eau_date': eau_date,
                'eau_blocage': eau_blocage,
                'assain_pluvial': assain_pluvial,
                'assain_usees': assain_usees,
                'assain_date': assain_date,
                'assain_blocage': assain_blocage,
                'dependance': dependance,
                'date_dispo': date_dispo,
                'commentaire': commentaire
            })
    return records

def parse_lpee():
    path = os.path.join('..', 'LPEE CSV.csv')
    if not os.path.exists(path):
        return []
    records = []
    with open(path, 'r', encoding='latin-1', errors='replace') as f:
        reader = list(csv.reader(f, delimiter=';'))
        # Row 2+ are records
        for idx, r in enumerate(reader[2:], start=1):
            if len(r) < 5 or not clean_str(r[3]):
                continue
            prov = clean_str(r[0])
            gerant = clean_str(r[1])
            prom = clean_str(r[2])
            proj = clean_str(r[3])
            gh = clean_str(r[4])
            unites_aut = clean_int(r[5]) if len(r) > 5 else 0
            unites_liv = clean_int(r[6]) if len(r) > 6 else 0
            date_ph = clean_str(r[7]) if len(r) > 7 else ''
            completude = clean_str(r[10]) if len(r) > 10 else ''
            
            records.append({
                'id': idx,
                'province': prov,
                'gerant': gerant,
                'promoteur': prom,
                'projet': proj,
                'gh': gh,
                'unites_aut': unites_aut,
                'unites_liv': unites_liv,
                'date_ph': date_ph,
                'completude': completude,
                'go_lpee': clean_str(r[12]) if len(r) > 12 else '',
                'go_lpee_res': clean_str(r[14]) if len(r) > 14 else '',
                'etancheite': clean_str(r[20]) if len(r) > 20 else '',
                'electricite': clean_str(r[24]) if len(r) > 24 else '',
                'plomberie': clean_str(r[28]) if len(r) > 28 else '',
                'revetement': clean_str(r[36]) if len(r) > 36 else '',
                'peinture': clean_str(r[40]) if len(r) > 40 else '',
            })
    return records

def parse_ami():
    path = os.path.join('..', 'AMI VSB VF.csv')
    if not os.path.exists(path):
        return []
    records = []
    with open(path, 'r', encoding='latin-1', errors='replace') as f:
        reader = list(csv.reader(f, delimiter=';'))
        last_ami = ''
        last_prov = ''
        for idx, r in enumerate(reader[1:], start=1):
            if len(r) < 3: continue
            ami = clean_str(r[0]) or last_ami
            prov = clean_str(r[1]) or last_prov
            soc = clean_str(r[2])
            if not soc: continue
            last_ami = ami
            last_prov = prov
            sit = clean_str(r[3]) if len(r) > 3 else ''
            appts = clean_int(r[4]) if len(r) > 4 else 0
            records.append({
                'id': idx,
                'ami': ami,
                'province': prov,
                'societe': soc,
                'situation': sit,
                'appts': appts
            })
    return records

def parse_checklist_ph():
    candidates = [
        os.path.join('..', 'CHECK LISTE ph CSV.csv'),
        os.path.join('.', 'CHECK LISTE ph CSV.csv'),
        os.path.join('..', 'CHECK LISTE CSV.csv'),
        os.path.join('.', 'CHECK LISTE CSV.csv')
    ]
    path = None
    for c in candidates:
        if os.path.exists(c):
            path = c
            break

    if not path:
        return {'rows': [], 'summary': {}}

    raw_lines = []
    for enc in ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']:
        try:
            with open(path, 'r', encoding=enc) as f:
                reader = list(csv.reader(f, delimiter=';'))
                if len(reader) >= 2:
                    raw_lines = reader
                    break
        except Exception:
            continue

    if len(raw_lines) < 2:
        return {'rows': [], 'summary': {}}

    def clean_cell_str(s):
        if not s:
            return ''
        s = s.strip().replace('\xa0', ' ').replace('\ufeff', '')
        s = re.sub(r'\s+', ' ', s)
        return s

    def inspect_element(val):
        v = clean_cell_str(val)
        if not v or v == '-' or v.lower() == 'non':
            return {
                'status': 'Non',
                'filled': False,
                'has_link': False,
                'link': '',
                'label': 'Non fourni'
            }
        has_link = v.startswith('http://') or v.startswith('https://') or 'sharepoint.com' in v or v.startswith('//')
        return {
            'status': 'Oui',
            'filled': True,
            'has_link': has_link,
            'link': v if has_link else '',
            'label': 'Oui'
        }

    items = []
    stat_rokhas = 0
    stat_archi = 0
    stat_bet = 0
    stat_bct = 0
    stat_etancheite = 0
    stat_labo = 0
    total_docs_filled = 0
    total_docs_possible = 0
    projets_set = set()

    for idx, r in enumerate(raw_lines[1:], start=1):
        if not r or not any(clean_cell_str(x) for x in r):
            continue

        num_ami = clean_cell_str(r[0]) if len(r) > 0 else ''
        projet = clean_cell_str(r[1]) if len(r) > 1 else ''
        if not projet and len(r) > 2 and clean_cell_str(r[2]):
            projet = 'Projet ' + str(idx)
        if not projet:
            continue

        gh = clean_cell_str(r[2]) if len(r) > 2 else ''
        if not gh:
            gh = 'Général'

        projets_set.add(projet)

        # 6 elements requested by user:
        # Permis_d_habiter_via_rokhas (col 5)
        # Attestation_d_achèvement_Archi (col 6)
        # Attestation_de_stabilité_et_de_conformité_BET (col 7)
        # Attestation_de_stabilité_et_de_conformité_BCT (col 8)
        # Attestation_de_conformité_de_lot_Etanchéité_BCT (col 9)
        # Rapport_de_synthèse_de_laboratoire (col 10)
        rokhas = inspect_element(r[5] if len(r) > 5 else '')
        archi = inspect_element(r[6] if len(r) > 6 else '')
        bet = inspect_element(r[7] if len(r) > 7 else '')
        bct = inspect_element(r[8] if len(r) > 8 else '')
        etancheite = inspect_element(r[9] if len(r) > 9 else '')
        labo = inspect_element(r[10] if len(r) > 10 else '')

        filled_count = sum(1 for d in [rokhas, archi, bet, bct, etancheite, labo] if d['filled'])
        total_docs_filled += filled_count
        total_docs_possible += 6

        if rokhas['filled']: stat_rokhas += 1
        if archi['filled']: stat_archi += 1
        if bet['filled']: stat_bet += 1
        if bct['filled']: stat_bct += 1
        if etancheite['filled']: stat_etancheite += 1
        if labo['filled']: stat_labo += 1

        pct = round((filled_count / 6.0) * 100, 1)

        items.append({
            'id': idx,
            'num_ami': num_ami,
            'projet': projet,
            'gh': gh,
            'Permis_d_habiter_via_rokhas': rokhas,
            'Attestation_d_achèvement_Archi': archi,
            'Attestation_de_stabilité_et_de_conformité_BET': bet,
            'Attestation_de_stabilité_et_de_conformité_BCT': bct,
            'Attestation_de_conformité_de_lot_Etanchéité_BCT': etancheite,
            'Rapport_de_synthèse_de_laboratoire': labo,
            'total_docs_dispos': filled_count,
            'total_docs_requis': 6,
            'completude_pct': pct,
            'is_complete': (filled_count == 6)
        })

    taux_global = round((total_docs_filled / total_docs_possible * 100), 1) if total_docs_possible > 0 else 0.0

    summary = {
        'total_lignes': len(items),
        'total_projets': len(projets_set),
        'total_docs_dispos': total_docs_filled,
        'total_docs_requis': total_docs_possible,
        'taux_global_completude': taux_global,
        'stat_rokhas': stat_rokhas,
        'stat_archi': stat_archi,
        'stat_bet': stat_bet,
        'stat_bct': stat_bct,
        'stat_etancheite': stat_etancheite,
        'stat_labo': stat_labo,
        'dossiers_complets': sum(1 for it in items if it['is_complete']),
        'dossiers_partiels': sum(1 for it in items if 0 < it['total_docs_dispos'] < 6),
        'dossiers_vides': sum(1 for it in items if it['total_docs_dispos'] == 0)
    }

    return {
        'rows': items,
        'summary': summary
    }

def compute_summaries(avancement, equipements, srm, lpee, ami, checklist_ph=None):
    # Total calculations
    total_appts = sum(x['appts_imm'] for x in avancement)
    total_imm = len(avancement)
    provinces = sorted(list(set(x['province'] for x in avancement if x['province'])))
    promoteurs = sorted(list(set(x['promoteur'] for x in avancement if x['promoteur'])))
    projets = sorted(list(set(x['projet'] for x in avancement if x['projet'])))
    
    avg_gen = round(sum(x['av_gen'] for x in avancement) / max(total_imm, 1), 1)
    avg_go = round(sum(x['av_go'] for x in avancement) / max(total_imm, 1), 1)
    avg_ls = round(sum(x['av_ls'] for x in avancement) / max(total_imm, 1), 1)
    
    ph_obtenu = sum(1 for x in avancement if x['ph_status'] == 'OBTENU')
    ph_non = total_imm - ph_obtenu
    
    # Progress distribution brackets
    brackets = {
        '0-25%': sum(1 for x in avancement if x['av_gen'] <= 25),
        '25-50%': sum(1 for x in avancement if 25 < x['av_gen'] <= 50),
        '50-75%': sum(1 for x in avancement if 50 < x['av_gen'] <= 75),
        '75-99%': sum(1 for x in avancement if 75 < x['av_gen'] < 100),
        '100%': sum(1 for x in avancement if x['av_gen'] >= 100)
    }
    
    # By Province
    prov_dict = {}
    for prov in provinces:
        items = [x for x in avancement if x['province'] == prov]
        cnt = len(items)
        if cnt == 0: continue
        prov_dict[prov] = {
            'immeubles': cnt,
            'appts': sum(x['appts_imm'] for x in items),
            'avg_gen': round(sum(x['av_gen'] for x in items) / cnt, 1),
            'avg_go': round(sum(x['av_go'] for x in items) / cnt, 1),
            'avg_ls': round(sum(x['av_ls'] for x in items) / cnt, 1),
            'ph_obtenu': sum(1 for x in items if x['ph_status'] == 'OBTENU'),
            'ph_non': sum(1 for x in items if x['ph_status'] != 'OBTENU'),
            'projets': sorted(list(set(x['projet'] for x in items))),
            'promoteurs': sorted(list(set(x['promoteur'] for x in items)))
        }
        
    # By Project
    proj_dict = {}
    for p in projets:
        items = [x for x in avancement if x['projet'] == p]
        cnt = len(items)
        if cnt == 0: continue
        proj_dict[p] = {
            'province': items[0]['province'],
            'promoteur': items[0]['promoteur'],
            'immeubles': cnt,
            'appts': sum(x['appts_imm'] for x in items),
            'appts_conv': items[0]['appts_conv'],
            'avg_gen': round(sum(x['av_gen'] for x in items) / cnt, 1),
            'avg_go': round(sum(x['av_go'] for x in items) / cnt, 1),
            'avg_ls': round(sum(x['av_ls'] for x in items) / cnt, 1),
            'ph_obtenu': sum(1 for x in items if x['ph_status'] == 'OBTENU'),
            'ph_non': sum(1 for x in items if x['ph_status'] != 'OBTENU'),
            'tranches': sorted(list(set(x['tranche'] for x in items if x['tranche']))),
            'ghs': sorted(list(set(x['gh'] for x in items if x['gh'])))
        }
        
    # By Promoteur
    prom_dict = {}
    for p in promoteurs:
        items = [x for x in avancement if x['promoteur'] == p]
        cnt = len(items)
        if cnt == 0: continue
        prom_dict[p] = {
            'immeubles': cnt,
            'appts': sum(x['appts_imm'] for x in items),
            'avg_gen': round(sum(x['av_gen'] for x in items) / cnt, 1),
            'projets': sorted(list(set(x['projet'] for x in items)))
        }

    # Equipements summary
    eq_summary = {
        'total': len(equipements),
        'acheves': sum(1 for x in equipements if x['statut'] == 'Achevé / Livré'),
        'en_cours': sum(1 for x in equipements if x['statut'] == 'En cours'),
        'non_demarre': sum(1 for x in equipements if x['statut'] == 'Non démarré'),
    }

    # SRM summary
    srm_summary = {
        'total_operations': len(srm),
        'total_unites': sum(x['unites'] for x in srm),
        'elec_en_cours': sum(1 for x in srm if 'cours' in x['elec_statut'].lower()),
        'eau_en_cours': sum(1 for x in srm if 'cours' in x['eau_statut'].lower()),
        'assain_en_cours': sum(1 for x in srm if 'cours' in x['assain_pluvial'].lower() or 'cours' in x['assain_usees'].lower()),
    }

    # LPEE summary
    lpee_summary = {
        'total_dossiers': len(lpee),
        'complets': sum(1 for x in lpee if 'complet' in x['completude'].lower() and 'incomplet' not in x['completude'].lower()),
        'incomplets': sum(1 for x in lpee if 'incomplet' in x['completude'].lower()),
    }

    return {
        'generated_at': '2026-10-13',
        'total_appts': total_appts,
        'total_immeubles': total_imm,
        'total_projets': len(projets),
        'total_promoteurs': len(promoteurs),
        'total_provinces': len(provinces),
        'avg_general': avg_gen,
        'avg_go': avg_go,
        'avg_ls': avg_ls,
        'ph_obtenu': ph_obtenu,
        'ph_non_obtenu': ph_non,
        'brackets': brackets,
        'provinces': provinces,
        'promoteurs': promoteurs,
        'projets': projets,
        'provinces_summary': prov_dict,
        'projets_summary': proj_dict,
        'promoteurs_summary': prom_dict,
        'equipements_summary': eq_summary,
        'srm_summary': srm_summary,
        'lpee_summary': lpee_summary,
        'checklist_ph_summary': checklist_ph['summary'] if checklist_ph else {}
    }

def build_files_registry():
    def clean_cell(val):
        if not val: return ''
        return val.strip().replace('\xa0', ' ').replace('\ufeff', '')

    def load_csv_data(path, sep=';'):
        for enc in ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']:
            try:
                with open(path, 'r', encoding=enc) as f:
                    reader = csv.reader(f, delimiter=sep)
                    rows = [[clean_cell(c) for c in r] for r in reader if any(c.strip() for c in r)]
                    if rows:
                        return rows
            except UnicodeDecodeError:
                continue
        return []

    meta = [
        ('file-avancement', 'AVANCEMENT TEST CSV.csv', 'Chantiers & Bâtiments', '29/09/2026', True),
        ('file-equipement', 'EQUIPEMENT PUBLIC.csv', 'Équipements Publics', '02/10/2026', False),
        ('file-srm', 'SUIVI_SRM_CSV.csv', 'Réseaux & Raccordements SRM', '01/10/2026', False),
        ('file-lpee', 'LPEE CSV.csv', 'Contrôle Qualité LPEE / CID', '02/10/2026', False),
        ('file-ami', 'AMI VSB VF.csv', 'Manifestation d\'Intérêt (AMI)', '08/10/2026', False),
        ('file-planif', 'PLANIF DG LIV.csv', 'Planification des Livraisons', '30/09/2026', False),
        ('file-checklist-ph', 'CHECK LISTE ph CSV.csv', "Check-liste Permis d'Habiter (PH)", '16/10/2026', False),
    ]

    reg = {}
    for fid, fname, cat, dt, is_main in meta:
        # Check parent or current directory
        p = os.path.join('..', fname)
        if not os.path.exists(p):
            p = os.path.join('.', fname)
        if os.path.exists(p):
            raw_rows = load_csv_data(p)
            if not raw_rows: continue
            
            h_idx = 5 if 'SUIVI_SRM' in fname and len(raw_rows) > 5 else 0
            raw_header = raw_rows[h_idx]
            data_rows = raw_rows[h_idx+1:]
            
            header = [c if c else f'Col_{i+1}' for i, c in enumerate(raw_header)]
            clean_rows = []
            for r in data_rows:
                padded = [(r[i] if i < len(r) else '') for i in range(len(header))]
                if any(padded):
                    clean_rows.append(padded)
                    
            reg[fid] = {
                'id': fid,
                'name': fname,
                'category': cat,
                'date': dt,
                'size': f'{os.path.getsize(p)/1024:.1f} KB',
                'is_main': is_main,
                'headers': header,
                'rows_count': len(clean_rows),
                'cols_count': len(header),
                'rows': clean_rows
            }
    return reg

def main():
    print('Parsing datasets...')
    avancement = parse_avancement()
    equipements = parse_equipements()
    srm = parse_srm()
    lpee = parse_lpee()
    ami = parse_ami()
    checklist_ph = parse_checklist_ph()
    summary = compute_summaries(avancement, equipements, srm, lpee, ami, checklist_ph)
    files_registry = build_files_registry()
    
    data = {
        'summary': summary,
        'avancement': avancement,
        'equipements': equipements,
        'srm': srm,
        'lpee': lpee,
        'ami': ami,
        'checklist_ph': checklist_ph,
        'files_registry': files_registry
    }
    
    js_content = 'window.VSB_DATA = ' + json.dumps(data, ensure_ascii=False, indent=None) + ';\n'
    with open('data.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
        
    print(f'Successfully generated data.js! Size: {os.path.getsize("data.js") / 1024:.1f} KB')
    print(f"Summary: {summary['total_immeubles']} immeubles, {summary['total_appts']} appartements, {summary['total_projets']} projets.")
    print(f"Checklist PH: {len(checklist_ph['rows'])} tranches auditées ({checklist_ph['summary'].get('total_docs_dispos', 0)}/108 documents disponibles, Taux: {checklist_ph['summary'].get('taux_global_completude', 0)}%).")
    print(f"Files Registry: {len(files_registry)} fichiers enregistrés.")

if __name__ == '__main__':
    main()
