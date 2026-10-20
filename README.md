# 🇲🇦 Tableau de Bord VSB - Programme Villes Sans Bidonvilles

Application Web moderne et réactive dédiée au suivi opérationnel, technique et réglementaire des chantiers du programme national **Villes Sans Bidonvilles (VSB)** dans la Région Casablanca-Settat.

---

## 🚀 Démarrage Rapide

### Option 1 : Ouverture Directe (Sans installation)
- Double-cliquez simplement sur le fichier **[`start_dashboard.bat`](./start_dashboard.bat)** ou ouvrez directement **[`index.html`](./index.html)** dans votre navigateur web (Google Chrome, Microsoft Edge, Firefox, Brave, etc.).

### Option 2 : Serveur HTTP Local (Optionnel)
Si vous préférez exécuter un serveur HTTP local :
```powershell
python -m http.server 8080
```
Puis accédez à l'adresse : **http://localhost:8080**

---

## 📊 Modules & Fonctionnalités

### 1. 📈 Vue d'Ensemble Stratégique (Executive Overview)
- **6 Cartes KPIs Clés :**
  - **41 538** Logements conventionnés
  - **1 965** Immeubles suivis
  - **64.9%** Taux d'avancement général moyen
  - **75.5%** Gros Œuvre (GO)
  - **53.6%** Lots Secondaires & Finitions
  - **258** Permis d'Habiter (PH) délivrés (13.1%)
- **4 Graphiques Interactifs (Chart.js) :**
  - Avancement moyen par Province / Préfecture
  - Répartition des immeubles par tranche d'avancement (<25%, 25-50%, 50-75%, 75-99%, 100%)
  - Top projets par volume de logements et avancement
  - Comparatif Gros Œuvre vs Lots Secondaires
- **Tableau de synthèse régional** par Province avec jauges visuelles et bouton de filtrage rapide.

### 2. 🏗️ Suivi des Chantiers & Immeubles (1 965 Immeubles)
- Filtrage instantané multi-critères : Province, Promoteur, Projet, Groupe d'Habitations (GH contextuel dynamique dès sélection du projet), Statut PH, Tranche d'avancement.
- Recherche textuelle en direct (Projet, Tranche, GH, Immeuble...).
- Tri dynamique par colonne et pagination configurable (15, 25, 50, 100 lignes).
- **Inspecteur Technique d'Immeuble (Modal Drill-down) :**
  - Détail des **97 indicateurs chantiers** :
    - **Gros Œuvre** : Terrassement, Semelles/Longrines, Dallage, Poteaux et Planchers par étage (RdC à 6ème), Toiture terrasse.
    - **Lots Secondaires** : Cloisonnement, Faux cadres, Enduits intérieurs/extérieurs, Étanchéité terrasse/SDB, Plomberie, Sanitaires, Électricité, Revêtements, Peinture.
    - **VRD** : Voirie, Assainissement, Eau potable, Électricité BT/MT, Éclairage public, Bassins d'orage.
    - **Qualité & Réception** : Rapports LPEE, levée de réserves, réceptions SRM.
  - Navigation Précédent / Suivant directement depuis la fiche de l'immeuble.

### 3. 🏫 Suivi des Équipements Publics (59 Sites)
- Supervision des mosquées, lycées, collèges, écoles, centres culturels et dispensaires.
- Indicateurs d'avancement, échéances prévisionnelles et détection des observations à risque (ex: impact sur délivrance de Permis d'Habiter).

### 4. ⚡ Réseaux & Société Régionale Multiservices (SRM)
- Suivi des 47 opérations de viabilisation : Électricité (BT/MT, postes), Eau Potable, Assainissement pluvial et eaux usées.
- Suivi des travaux hors-site et bassins de rétention.

### 5. 🔬 Contrôle Qualité LPEE / CID
- 33 dossiers de contrôle technique laboratoire.
- Suivi de complétude des rapports, PV d'essais et levée des réserves.

### 6. 📁 Multi-Sources, Connecteurs Cloud & Synchronisation des Données
- **Bouton d'Actualisation Rapide :**
  - Bouton **« Actualiser Données »** accessible depuis l'en-tête et le module d'importation.
  - Vérifie automatiquement les fichiers sources CSV dans le dossier local, détecte les nouvelles lignes et rafraîchit l'intégralité du tableau de bord sans perte de filtres.
- **Connecteur Microsoft Azure SQL Database :**
  - Permet d'importer directement depuis Azure SQL (`pyodbc` avec ODBC Driver 18/17).
  - Mode **« Mettre à jour le fichier source officiel »** : vérifie les nouvelles lignes dans SQL et les injecte directement dans `AVANCEMENT TEST CSV.csv`, `SUIVI_SRM_CSV.csv`, etc., avec rapport comparatif du nombre de nouvelles données ajoutées.
  - Mode **« Fichier personnalisé »** pour sauvegarder dans un CSV dédié.
- **Connecteur Microsoft SharePoint & OneDrive Entreprise :**
  - **Mode Compte Microsoft 365 Universel (Recommandé) :** Connexion directe et sécurisée du compte professionnel via Microsoft Device Login & Microsoft Graph API. Élimine les erreurs 429 et 403, explore les bibliothèques SharePoint en direct et synchronise les classeurs chantiers en 1 clic.
  - **Mode Dossier Synchronisé :** Détection automatique des dossiers SharePoint / OneDrive locaux sous Windows (ex: `C:\Users\Hp\OneDrive\...`).
  - **Mode Lien Direct / URL Web :** Téléchargement direct depuis lien de partage.
  - **Mode Microsoft Graph API Manuel :** Authentification via Application Azure AD / Entra ID (Client Secret).
  - **Conversion automatique :** Convertit nativement les classeurs Excel (`.xlsx`, `.xlsm`) vers le format CSV normalisé et met à jour le lot ciblé.
- **Explorateur & Visualiseur de Données en Direct :**
  - Cliquez sur n'importe quel fichier de la liste pour afficher instantanément son tableau de données complet.
  - Recherche instantanée multi-colonnes dans le fichier sélectionné.
  - Pagination configurable (15, 25, 50, 100 lignes) avec défilement horizontal et vertical fluide.
  - Bouton **Synchroniser avec le Tableau de Bord** pour appliquer le fichier d'avancement actif aux KPIs et graphiques globaux.
- **Exportations Multi-Formats :**
  - Téléchargement Excel (`.xlsx`) ou CSV dédié au fichier actif ou global.
  - Impression et génération PDF optimisée pour compte-rendu exécutif.

---

## 🎨 Design & Ergonomie
- **Thème Sombre / Clair (Dark Mode)** avec mémorisation automatique du choix utilisateur.
- **Typographie moderne :** Police *Plus Jakarta Sans*.
- **Design Adaptatif (Responsive) :** Optimisé pour écrans 4K, ordinateurs portables, tablettes et smartphones.

---

## 🔄 Mise à Jour des Données Sources

Pour régénérer la base `data.js` à partir des fichiers CSV situés dans le dossier parent :
```powershell
python build_data.py
```
Le script nettoie automatiquement les encodages, recalcule les agrégats et prépare la structure prête à l'emploi.
