/**
 * VSB Dashboard Application
 * Programme Villes Sans Bidonvilles (Maroc)
 * Interactive Single Page Dashboard Engine
 */

(function () {
  'use strict';

  // State Management
  const state = {
    activeTab: 'overview',
    theme: localStorage.getItem('vsb_theme') || 'light',
    data: window.VSB_DATA || null,
    filesRegistry: (window.VSB_DATA && window.VSB_DATA.files_registry) ? JSON.parse(JSON.stringify(window.VSB_DATA.files_registry)) : {},
    activeViewerFileId: 'file-avancement',
    viewerPagination: {
      page: 1,
      pageSize: 25,
      search: '',
    },
    filters: {
      province: '',
      promoteur: '',
      projet: '',
      gh: '',
      ph_status: '',
      avancement: '',
      search: '',
      tableSubFilter: 'all',
    },
    pagination: {
      page: 1,
      pageSize: 25,
      sortCol: 'imm',
      sortDir: 'asc',
    },
    equipements: {
      statusFilter: 'all',
      search: '',
    },
    currentModalImmIndex: -1,
    currentFilteredList: [],
    charts: {
      provinces: null,
      brackets: null,
      topProjets: null,
      goVsLs: null,
    }
  };

  // Safe fallback if data.js didn't load
  if (!state.data) {
    console.warn('VSB_DATA not found, initializing empty structure');
    state.data = {
      summary: {
        total_appts: 0,
        total_immeubles: 0,
        total_projets: 0,
        total_promoteurs: 0,
        avg_general: 0,
        avg_go: 0,
        avg_ls: 0,
        ph_obtenu: 0,
        ph_non_obtenu: 0,
        provinces: [],
        promoteurs: [],
        projets: [],
        provinces_summary: {},
        projets_summary: {},
        brackets: { '0-25%': 0, '25-50%': 0, '50-75%': 0, '75-99%': 0, '100%': 0 }
      },
      avancement: [],
      equipements: [],
      srm: [],
      lpee: [],
      ami: []
    };
  }

  // DOM Elements Cache
  const elements = {};

  function cacheDomElements() {
    elements.html = document.documentElement;
    elements.themeToggleBtn = document.getElementById('themeToggleBtn');
    elements.themeIcon = document.getElementById('themeIcon');
    elements.pageTitle = document.getElementById('pageTitle');
    elements.pageSubtitle = document.getElementById('pageSubtitle');
    elements.quickSearchInput = document.getElementById('quickSearchInput');
    elements.printReportBtn = document.getElementById('printReportBtn');
    elements.exportExcelBtn = document.getElementById('exportExcelBtn');
    
    // Sidebar
    elements.sidebar = document.getElementById('sidebar');
    elements.openSidebarBtn = document.getElementById('openSidebarBtn');
    elements.closeSidebarBtn = document.getElementById('closeSidebarBtn');
    elements.mobileOverlay = document.getElementById('mobileOverlay');
    elements.navItems = document.querySelectorAll('.nav-item');

    // Global Filters
    elements.filterProvince = document.getElementById('filterProvince');
    elements.filterPromoteur = document.getElementById('filterPromoteur');
    elements.filterProjet = document.getElementById('filterProjet');
    elements.filterGH = document.getElementById('filterGH');
    elements.filterGHContainer = document.getElementById('filterGHContainer');
    elements.filterPH = document.getElementById('filterPH');
    elements.filterAvancement = document.getElementById('filterAvancement');
    elements.resetFiltersBtn = document.getElementById('resetFiltersBtn');
    elements.filteredCountBadge = document.getElementById('filteredCountBadge');

    // Views
    elements.views = {
      overview: document.getElementById('view-overview'),
      chantiers: document.getElementById('view-chantiers'),
      equipements: document.getElementById('view-equipements'),
      srm: document.getElementById('view-srm'),
      lpee: document.getElementById('view-lpee'),
      'checklist-ph': document.getElementById('view-checklist-ph'),
      'import-export': document.getElementById('view-import-export'),
    };

    // Overview KPIs
    elements.kpiTotalAppts = document.getElementById('kpiTotalAppts');
    elements.kpiTotalImm = document.getElementById('kpiTotalImm');
    elements.kpiAvancementGen = document.getElementById('kpiAvancementGen');
    elements.kpiAvancementGO = document.getElementById('kpiAvancementGO');
    elements.kpiAvancementLS = document.getElementById('kpiAvancementLS');
    elements.kpiPHObtenu = document.getElementById('kpiPHObtenu');
    elements.kpiPHSub = document.getElementById('kpiPHSub');
    elements.overviewProvincesTbody = document.getElementById('overviewProvincesTbody');

    // Chantiers Table & Pagination
    elements.chantiersTableBody = document.getElementById('chantiersTableBody');
    elements.pageSizeSelect = document.getElementById('pageSizeSelect');
    elements.paginationSummary = document.getElementById('paginationSummary');
    elements.paginationNumbers = document.getElementById('paginationNumbers');
    elements.prevPageBtn = document.getElementById('prevPageBtn');
    elements.nextPageBtn = document.getElementById('nextPageBtn');
    elements.tableTabBtns = document.querySelectorAll('.table-tab-btn');

    // Counters
    elements.countAllImm = document.getElementById('countAllImm');
    elements.countPHOk = document.getElementById('countPHOk');
    elements.count100 = document.getElementById('count100');
    elements.countOver50 = document.getElementById('countOver50');
    elements.countUnder50 = document.getElementById('countUnder50');

    // Equipements
    elements.equipementsGrid = document.getElementById('equipementsGrid');
    elements.searchEquipement = document.getElementById('searchEquipement');

    // SRM & LPEE
    elements.srmTableBody = document.getElementById('srmTableBody');
    elements.lpeeTableBody = document.getElementById('lpeeTableBody');

    // Modal
    elements.modalImmeuble = document.getElementById('modalImmeuble');
    elements.closeModalBtn = document.getElementById('closeModalBtn');
    elements.modalPrevImmBtn = document.getElementById('modalPrevImmBtn');
    elements.modalNextImmBtn = document.getElementById('modalNextImmBtn');
    elements.modalSubtabBtns = document.querySelectorAll('.modal-subtab-btn');

    // Import & Files Registry
    elements.dropZone = document.getElementById('dropZone');
    elements.csvFileInput = document.getElementById('csvFileInput');
    elements.uploadFeedback = document.getElementById('uploadFeedback');
    elements.importedFilesGrid = document.getElementById('importedFilesGrid');
    elements.filesCountBadge = document.getElementById('filesCountBadge');

    // Data Viewer
    elements.viewerFileName = document.getElementById('viewerFileName');
    elements.viewerFileCategoryBadge = document.getElementById('viewerFileCategoryBadge');
    elements.viewerFileDateBadge = document.getElementById('viewerFileDateBadge');
    elements.viewerFileMeta = document.getElementById('viewerFileMeta');
    elements.viewerSearchInput = document.getElementById('viewerSearchInput');
    elements.viewerPageSizeSelect = document.getElementById('viewerPageSizeSelect');
    elements.viewerSyncDashboardBtn = document.getElementById('viewerSyncDashboardBtn');
    elements.viewerTableHead = document.getElementById('viewerTableHead');
    elements.viewerTableBody = document.getElementById('viewerTableBody');
    elements.viewerPaginationSummary = document.getElementById('viewerPaginationSummary');
    elements.viewerPaginationNumbers = document.getElementById('viewerPaginationNumbers');
    elements.viewerPrevPageBtn = document.getElementById('viewerPrevPageBtn');
    elements.viewerNextPageBtn = document.getElementById('viewerNextPageBtn');
  }

  // Theme Management
  function applyTheme(theme) {
    state.theme = theme;
    localStorage.setItem('vsb_theme', theme);
    if (theme === 'dark') {
      elements.html.classList.add('dark');
      if (elements.themeIcon) elements.themeIcon.setAttribute('data-lucide', 'sun');
    } else {
      elements.html.classList.remove('dark');
      if (elements.themeIcon) elements.themeIcon.setAttribute('data-lucide', 'moon');
    }
    refreshLucide();
    updateChartsTheme();
  }

  function toggleTheme() {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  }

  function refreshLucide() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  // ==========================================
  // UNIVERSAL MULTI-DATASET MATCHING HELPERS
  // ==========================================
  function extractProjectNumber(s) {
    if (!s) return null;
    const m = s.toString().match(/\b\d{3,5}\b/);
    return m ? m[0] : null;
  }

  function normalizeProjectName(p) {
    if (!p) return '';
    return p.toString().toUpperCase()
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getProjectCoreName(p) {
    let norm = normalizeProjectName(p);
    norm = norm.replace(/\b\d{3,5}\b/g, '').replace(/\s+/g, ' ').trim();
    return norm;
  }

  function matchesProject(itemProj, filterProj) {
    if (!filterProj) return true;
    if (!itemProj) return false;
    const p1 = normalizeProjectName(itemProj);
    const p2 = normalizeProjectName(filterProj);
    if (p1 === p2) return true;

    const n1 = extractProjectNumber(itemProj);
    const n2 = extractProjectNumber(filterProj);
    if (n1 && n2 && n1 !== n2) return false;

    const c1 = getProjectCoreName(itemProj);
    const c2 = getProjectCoreName(filterProj);
    if (c1 && c2 && (c1 === c2 || c1.includes(c2) || c2.includes(c1))) return true;
    return false;
  }

  function normalizeGHToken(g) {
    if (!g) return '';
    return g.toString().trim().toUpperCase()
      .replace(/\s+/g, '')
      .replace(/GH0*(\d+)/g, function(m, p1) { return 'GH' + parseInt(p1, 10); });
  }

  function extractGHTokens(ghStr) {
    if (!ghStr) return [];
    const cleaned = ghStr.toString().replace(/GH\s+(\d)/gi, 'GH$1');
    return cleaned
      .split(/[;,\/\s]+/)
      .flatMap(function(part) { return part.split(/(?<=GH\w*)-(?=GH|\d)/i); })
      .map(function(t) { return normalizeGHToken(t); })
      .filter(Boolean);
  }

  function matchesGH(itemGh, filterGh) {
    if (!filterGh) return true;
    if (!itemGh) return false;
    const fNorm = normalizeGHToken(filterGh);
    const iNorm = normalizeGHToken(itemGh);
    if (iNorm === fNorm) return true;

    const itemTokens = extractGHTokens(itemGh);
    const filterTokens = extractGHTokens(filterGh);

    if (filterTokens.length === 1) {
      const target = filterTokens[0];
      return itemTokens.includes(target) || iNorm.includes(target);
    }
    return filterTokens.some(function(ft) { return itemTokens.includes(ft) || iNorm.includes(ft); });
  }

  function matchesProvince(itemProv, filterProv) {
    if (!filterProv) return true;
    if (!itemProv) return false;
    const p1 = itemProv.toString().toUpperCase().replace(/[_\s-]+/g, ' ').trim();
    const p2 = filterProv.toString().toUpperCase().replace(/[_\s-]+/g, ' ').trim();
    return p1 === p2 || p1.includes(p2) || p2.includes(p1);
  }

  function matchesPromoteur(itemProm, filterProm) {
    if (!filterProm) return true;
    if (!itemProm) return false;
    const p1 = itemProm.toString().toUpperCase().replace(/[_\s-]+/g, ' ').trim();
    const p2 = filterProm.toString().toUpperCase().replace(/[_\s-]+/g, ' ').trim();
    return p1 === p2 || p1.includes(p2) || p2.includes(p1);
  }

  // Populate Dropdown Filters across all available datasets
  function populateFilterDropdowns() {
    const summary = state.data.summary || {};

    // Provinces: collect across avancement, srm, lpee, equipements
    const provincesSet = new Set(summary.provinces || []);
    ['srm', 'lpee', 'equipements'].forEach(dsKey => {
      (state.data[dsKey] || []).forEach(x => { if (x.province && x.province.trim()) provincesSet.add(x.province.trim()); });
    });
    const allProvinces = Array.from(provincesSet).filter(Boolean).sort();
    elements.filterProvince.innerHTML = '<option value="">Toutes les Provinces (' + allProvinces.length + ')</option>' +
      allProvinces.map(p => `<option value="${p}">${p}</option>`).join('');

    // Promoteurs: collect across avancement, srm, lpee, equipements
    const promoteursSet = new Set(summary.promoteurs || []);
    ['srm', 'lpee', 'equipements'].forEach(dsKey => {
      (state.data[dsKey] || []).forEach(x => { if (x.promoteur && x.promoteur.trim()) promoteursSet.add(x.promoteur.trim()); });
    });
    const allPromoteurs = Array.from(promoteursSet).filter(Boolean).sort();
    elements.filterPromoteur.innerHTML = '<option value="">Tous les Promoteurs (' + allPromoteurs.length + ')</option>' +
      allPromoteurs.map(p => `<option value="${p}">${p}</option>`).join('');

    // Projets: collect across avancement, srm, lpee, checklist_ph, equipements
    const projetsSet = new Set(summary.projets || []);
    (state.data.avancement || []).forEach(x => { if (x.projet && x.projet.trim()) projetsSet.add(x.projet.trim()); });
    (state.data.srm || []).forEach(x => { if (x.projet && x.projet.trim()) projetsSet.add(x.projet.trim()); });
    (state.data.lpee || []).forEach(x => { if (x.projet && x.projet.trim()) projetsSet.add(x.projet.trim()); });
    (state.data.equipements || []).forEach(x => { if (x.projet && x.projet.trim()) projetsSet.add(x.projet.trim()); });
    if (state.data.checklist_ph && state.data.checklist_ph.rows) {
      state.data.checklist_ph.rows.forEach(x => { if (x.projet && x.projet.trim()) projetsSet.add(x.projet.trim()); });
    }
    const allProjets = Array.from(projetsSet).filter(Boolean).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    elements.filterProjet.innerHTML = '<option value="">Tous les Projets (' + allProjets.length + ')</option>' +
      allProjets.map(p => `<option value="${p}">${p}</option>`).join('');

    // Met à jour le filtre GH selon le projet sélectionné
    updateGHFilter();
  }

  // Update GH Filter dropdown dynamically when a project is selected
  function updateGHFilter() {
    const selectedProjet = state.filters.projet;
    if (!elements.filterGHContainer || !elements.filterGH) return;

    if (!selectedProjet) {
      // Aucun projet sélectionné : réinitialise et masque le filtre GH
      state.filters.gh = '';
      elements.filterGH.innerHTML = '<option value="">Tous les GH</option>';
      elements.filterGH.value = '';
      elements.filterGHContainer.classList.add('hidden');
      elements.filterGHContainer.classList.remove('flex');
      return;
    }

    // Extraire les identifiants GH uniques pour ce projet à travers TOUS les datasets
    const ghSet = new Set();
    const datasets = [
      state.data.avancement || [],
      state.data.srm || [],
      state.data.lpee || [],
      (state.data.checklist_ph ? state.data.checklist_ph.rows : []) || [],
      state.data.equipements || []
    ];

    datasets.forEach(ds => {
      ds.forEach(item => {
        const pName = item.projet;
        const ghVal = item.gh || item.tranche;
        if (pName && ghVal && matchesProject(pName, selectedProjet)) {
          const rawStr = String(ghVal).trim();
          if (rawStr && rawStr !== '-' && rawStr.toLowerCase() !== 'général') {
            const tokens = extractGHTokens(rawStr);
            tokens.forEach(t => ghSet.add(t));
            if (rawStr.length <= 25 && !ghSet.has(rawStr)) {
              ghSet.add(rawStr);
            }
          }
        }
      });
    });

    const ghs = Array.from(ghSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    if (ghs.length === 0) {
      // Si ce projet n'a pas de découpage en GH
      state.filters.gh = '';
      elements.filterGH.innerHTML = '<option value="">Aucun GH spécifique</option>';
      elements.filterGH.value = '';
      elements.filterGHContainer.classList.add('hidden');
      elements.filterGHContainer.classList.remove('flex');
      return;
    }

    // Remplir le select avec les GH du projet
    elements.filterGH.innerHTML = `<option value="">Tous les GH (${ghs.length})</option>` +
      ghs.map(gh => `<option value="${gh}">${gh}</option>`).join('');

    // Conserver la sélection si elle existe toujours pour ce projet, sinon réinitialiser
    if (state.filters.gh && (ghs.includes(state.filters.gh) || ghs.some(g => matchesGH(g, state.filters.gh)))) {
      const match = ghs.find(g => matchesGH(g, state.filters.gh)) || state.filters.gh;
      elements.filterGH.value = match;
      state.filters.gh = match;
    } else {
      state.filters.gh = '';
      elements.filterGH.value = '';
    }

    // Afficher le conteneur du filtre GH
    elements.filterGHContainer.classList.remove('hidden');
    elements.filterGHContainer.classList.add('flex');
  }

  // Filter Data for Avancement & Overview
  function getFilteredAvancement() {
    const { province, promoteur, projet, gh, ph_status, avancement, search, tableSubFilter } = state.filters;
    const q = search.toLowerCase().trim();

    return state.data.avancement.filter(item => {
      // Province
      if (province && !matchesProvince(item.province, province)) return false;
      // Promoteur
      if (promoteur && !matchesPromoteur(item.promoteur, promoteur)) return false;
      // Projet
      if (projet && !matchesProject(item.projet, projet)) return false;
      // GH
      if (gh && !matchesGH(item.gh, gh)) return false;
      // PH
      if (ph_status && item.ph_status !== ph_status) return false;

      // Avancement bracket
      if (avancement) {
        if (avancement === '100' && item.av_gen < 100) return false;
        if (avancement === '75-99' && (item.av_gen < 75 || item.av_gen >= 100)) return false;
        if (avancement === '50-75' && (item.av_gen < 50 || item.av_gen >= 75)) return false;
        if (avancement === '25-50' && (item.av_gen < 25 || item.av_gen >= 50)) return false;
        if (avancement === '0-25' && item.av_gen >= 25) return false;
      }

      // Table Subfilter
      if (tableSubFilter === 'ph-ok' && item.ph_status !== 'OBTENU') return false;
      if (tableSubFilter === 'acheve' && item.av_gen < 100) return false;
      if (tableSubFilter === 'en-cours' && item.av_gen <= 50) return false;
      if (tableSubFilter === 'demarrage' && item.av_gen > 50) return false;

      // Text search
      if (q) {
        const text = `${item.province} ${item.projet} ${item.promoteur} ${item.imm} ${item.gh} ${item.tranche}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      return true;
    });
  }

  // Update Overview KPIs & UI
  function updateOverview(filtered) {
    const totalImm = filtered.length;
    const totalAppts = filtered.reduce((acc, cur) => acc + cur.appts_imm, 0);

    let avgGen = 0;
    let avgGO = 0;
    let avgLS = 0;
    let phCount = 0;

    if (totalImm > 0) {
      avgGen = (filtered.reduce((acc, cur) => acc + cur.av_gen, 0) / totalImm).toFixed(1);
      avgGO = (filtered.reduce((acc, cur) => acc + cur.av_go, 0) / totalImm).toFixed(1);
      avgLS = (filtered.reduce((acc, cur) => acc + cur.av_ls, 0) / totalImm).toFixed(1);
      phCount = filtered.filter(x => x.ph_status === 'OBTENU').length;
    }

    const phPct = totalImm > 0 ? ((phCount / totalImm) * 100).toFixed(1) : 0;

    elements.kpiTotalAppts.textContent = totalAppts.toLocaleString('fr-FR');
    elements.kpiTotalImm.textContent = totalImm.toLocaleString('fr-FR');
    elements.kpiAvancementGen.textContent = `${avgGen}%`;
    elements.kpiAvancementGO.textContent = `${avgGO}%`;
    elements.kpiAvancementLS.textContent = `${avgLS}%`;
    elements.kpiPHObtenu.textContent = phCount.toLocaleString('fr-FR');
    elements.kpiPHSub.textContent = `Délivrés (${phPct}%)`;

    elements.filteredCountBadge.textContent = `${totalImm.toLocaleString('fr-FR')} immeubles`;

    // Overview Table by Province
    renderOverviewProvincesTable(filtered);

    // Update Overview Charts
    renderOverviewCharts(filtered);
  }

  // Overview Table
  function renderOverviewProvincesTable(filtered) {
    const provincesMap = {};

    filtered.forEach(item => {
      const p = item.province || 'Non défini';
      if (!provincesMap[p]) {
        provincesMap[p] = {
          name: p,
          imm: 0,
          appts: 0,
          sumGen: 0,
          sumGO: 0,
          sumLS: 0,
          ph: 0
        };
      }
      provincesMap[p].imm++;
      provincesMap[p].appts += item.appts_imm;
      provincesMap[p].sumGen += item.av_gen;
      provincesMap[p].sumGO += item.av_go;
      provincesMap[p].sumLS += item.av_ls;
      if (item.ph_status === 'OBTENU') provincesMap[p].ph++;
    });

    const rows = Object.values(provincesMap).map(p => {
      const avgGen = (p.sumGen / p.imm).toFixed(1);
      const avgGO = (p.sumGO / p.imm).toFixed(1);
      const avgLS = (p.sumLS / p.imm).toFixed(1);
      const phPct = ((p.ph / p.imm) * 100).toFixed(0);

      return `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
          <td class="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">
            <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2"></span>
            ${p.name}
          </td>
          <td class="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">${p.appts.toLocaleString('fr-FR')}</td>
          <td class="px-5 py-3.5 text-slate-600 dark:text-slate-400">${p.imm.toLocaleString('fr-FR')}</td>
          <td class="px-5 py-3.5">
            <div class="flex items-center space-x-2">
              <span class="w-10 text-right font-medium text-amber-600 dark:text-amber-400">${avgGO}%</span>
              <div class="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                <div class="bg-amber-500 h-1.5 rounded-full" style="width: ${avgGO}%"></div>
              </div>
            </div>
          </td>
          <td class="px-5 py-3.5">
            <div class="flex items-center space-x-2">
              <span class="w-10 text-right font-medium text-indigo-600 dark:text-indigo-400">${avgLS}%</span>
              <div class="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                <div class="bg-indigo-500 h-1.5 rounded-full" style="width: ${avgLS}%"></div>
              </div>
            </div>
          </td>
          <td class="px-5 py-3.5">
            <div class="flex items-center space-x-2">
              <span class="w-10 text-right font-bold text-emerald-600 dark:text-emerald-400">${avgGen}%</span>
              <div class="w-20 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div class="bg-emerald-500 h-2 rounded-full" style="width: ${avgGen}%"></div>
              </div>
            </div>
          </td>
          <td class="px-5 py-3.5">
            <span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${p.ph > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}">
              ${p.ph} (${phPct}%)
            </span>
          </td>
          <td class="px-5 py-3.5 text-right">
            <button onclick="window.applyProvinceFilter('${p.name}')" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-600 hover:text-white dark:bg-slate-800 dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-200 text-xs font-semibold transition">
              Filtrer
            </button>
          </td>
        </tr>
      `;
    }).join('');

    elements.overviewProvincesTbody.innerHTML = rows || `
      <tr>
        <td colspan="8" class="px-5 py-8 text-center text-slate-400">Aucune province correspondant aux filtres.</td>
      </tr>
    `;
  }

  // Chart Rendering
  function getChartColor(isDark) {
    return {
      text: isDark ? '#94a3b8' : '#475569',
      grid: isDark ? 'rgba(51, 65, 85, 0.35)' : 'rgba(226, 232, 240, 0.8)',
    };
  }

  function renderOverviewCharts(filtered) {
    if (typeof Chart === 'undefined') return;

    const isDark = state.theme === 'dark';
    const colors = getChartColor(isDark);

    // 1. Chart Provinces (Bar)
    const provStats = {};
    filtered.forEach(x => {
      const p = x.province || 'Autre';
      if (!provStats[p]) provStats[p] = { sum: 0, count: 0 };
      provStats[p].sum += x.av_gen;
      provStats[p].count++;
    });

    const provLabels = Object.keys(provStats);
    const provData = provLabels.map(p => (provStats[p].sum / provStats[p].count).toFixed(1));

    if (state.charts.provinces) state.charts.provinces.destroy();
    const ctxProv = document.getElementById('chartProvinces');
    if (ctxProv) {
      state.charts.provinces = new Chart(ctxProv, {
        type: 'bar',
        data: {
          labels: provLabels,
          datasets: [{
            label: 'Avancement Moyen (%)',
            data: provData,
            backgroundColor: '#10b981',
            borderRadius: 6,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => ` ${ctx.parsed.y}% avancement moyen`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              grid: { color: colors.grid },
              ticks: { color: colors.text }
            },
            x: {
              grid: { display: false },
              ticks: { color: colors.text, font: { size: 10 } }
            }
          }
        }
      });
    }

    // 2. Chart Brackets (Doughnut)
    const brackets = {
      'Achevé (100%)': filtered.filter(x => x.av_gen >= 100).length,
      'Avancé (75-99%)': filtered.filter(x => x.av_gen >= 75 && x.av_gen < 100).length,
      'Intermédiaire (50-75%)': filtered.filter(x => x.av_gen >= 50 && x.av_gen < 75).length,
      'En cours (25-50%)': filtered.filter(x => x.av_gen >= 25 && x.av_gen < 50).length,
      'Démarrage (0-25%)': filtered.filter(x => x.av_gen < 25).length,
    };

    if (state.charts.brackets) state.charts.brackets.destroy();
    const ctxBrackets = document.getElementById('chartBrackets');
    if (ctxBrackets) {
      state.charts.brackets = new Chart(ctxBrackets, {
        type: 'doughnut',
        data: {
          labels: Object.keys(brackets),
          datasets: [{
            data: Object.values(brackets),
            backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#6366f1', '#ef4444'],
            borderWidth: 0,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { color: colors.text, boxWidth: 12, font: { size: 11 } }
            }
          },
          cutout: '68%'
        }
      });
    }

    // 3. Chart Top Projets (Horizontal Bar)
    const projStats = {};
    filtered.forEach(x => {
      const p = x.projet || 'Autre';
      if (!projStats[p]) projStats[p] = { appts: 0, sumGen: 0, count: 0 };
      projStats[p].appts += x.appts_imm;
      projStats[p].sumGen += x.av_gen;
      projStats[p].count++;
    });

    const topProjets = Object.entries(projStats)
      .sort((a, b) => b[1].appts - a[1].appts)
      .slice(0, 7);

    const topLabels = topProjets.map(x => x[0].length > 22 ? x[0].substring(0, 22) + '...' : x[0]);
    const topAppts = topProjets.map(x => x[1].appts);
    const topAvgGen = topProjets.map(x => (x[1].sumGen / x[1].count).toFixed(0));

    if (state.charts.topProjets) state.charts.topProjets.destroy();
    const ctxTop = document.getElementById('chartTopProjets');
    if (ctxTop) {
      state.charts.topProjets = new Chart(ctxTop, {
        type: 'bar',
        data: {
          labels: topLabels,
          datasets: [{
            label: 'Logements',
            data: topAppts,
            backgroundColor: '#3b82f6',
            borderRadius: 6,
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                afterLabel: ctx => ` Avancement: ${topAvgGen[ctx.dataIndex]}%`
              }
            }
          },
          scales: {
            x: {
              grid: { color: colors.grid },
              ticks: { color: colors.text }
            },
            y: {
              grid: { display: false },
              ticks: { color: colors.text, font: { size: 10 } }
            }
          }
        }
      });
    }

    // 4. Chart GO vs LS (Grouped Bar)
    const provComp = {};
    filtered.forEach(x => {
      const p = x.province || 'Autre';
      if (!provComp[p]) provComp[p] = { sumGO: 0, sumLS: 0, count: 0 };
      provComp[p].sumGO += x.av_go;
      provComp[p].sumLS += x.av_ls;
      provComp[p].count++;
    });

    const compLabels = Object.keys(provComp);
    const compGO = compLabels.map(p => (provComp[p].sumGO / provComp[p].count).toFixed(1));
    const compLS = compLabels.map(p => (provComp[p].sumLS / provComp[p].count).toFixed(1));

    if (state.charts.goVsLs) state.charts.goVsLs.destroy();
    const ctxGoVsLs = document.getElementById('chartGoVsLs');
    if (ctxGoVsLs) {
      state.charts.goVsLs = new Chart(ctxGoVsLs, {
        type: 'bar',
        data: {
          labels: compLabels,
          datasets: [
            {
              label: 'Gros Œuvre (%)',
              data: compGO,
              backgroundColor: '#f59e0b',
              borderRadius: 4,
            },
            {
              label: 'Lots Secondaires (%)',
              data: compLS,
              backgroundColor: '#6366f1',
              borderRadius: 4,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { color: colors.text, boxWidth: 12, font: { size: 11 } }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              grid: { color: colors.grid },
              ticks: { color: colors.text }
            },
            x: {
              grid: { display: false },
              ticks: { color: colors.text, font: { size: 10 } }
            }
          }
        }
      });
    }
  }

  function updateChartsTheme() {
    renderOverviewCharts(state.currentFilteredList);
  }

  // Chantiers Table Render
  function renderChantiersTable() {
    const filtered = state.currentFilteredList;
    const { page, pageSize, sortCol, sortDir } = state.pagination;

    // Update Subfilter Counts
    const allCount = filtered.length;
    const phOkCount = filtered.filter(x => x.ph_status === 'OBTENU').length;
    const acheveCount = filtered.filter(x => x.av_gen >= 100).length;
    const over50Count = filtered.filter(x => x.av_gen > 50).length;
    const under50Count = filtered.filter(x => x.av_gen <= 50).length;

    elements.countAllImm.textContent = allCount.toLocaleString('fr-FR');
    elements.countPHOk.textContent = phOkCount.toLocaleString('fr-FR');
    elements.count100.textContent = acheveCount.toLocaleString('fr-FR');
    elements.countOver50.textContent = over50Count.toLocaleString('fr-FR');
    elements.countUnder50.textContent = under50Count.toLocaleString('fr-FR');

    // Sorting
    const sorted = [...filtered].sort((a, b) => {
      let va = a[sortCol];
      let vb = b[sortCol];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    // Pagination
    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    state.pagination.page = currentPage;

    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, sorted.length);
    const paginated = sorted.slice(startIdx, endIdx);

    // Render Table Rows
    const rows = paginated.map((item, index) => {
      const globalIndex = startIdx + index;
      const isPH = item.ph_status === 'OBTENU';
      const badgePH = isPH
        ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">OBTENU</span>'
        : '<span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">NON OBTENU</span>';

      return `
        <tr class="table-row-hover hover:bg-slate-50 dark:hover:bg-slate-800/40">
          <td class="px-4 py-3">
            <span class="font-bold text-slate-900 dark:text-white block">${item.projet}</span>
            <span class="text-[11px] text-slate-500">${item.province}</span>
          </td>
          <td class="px-4 py-3 font-medium text-slate-700 dark:text-slate-300 text-[11px]">
            ${item.promoteur}
          </td>
          <td class="px-4 py-3 text-slate-600 dark:text-slate-400 text-[11px]">
            <span class="font-semibold">${item.tranche || '-'}</span> / ${item.gh || '-'}
          </td>
          <td class="px-4 py-3 font-bold text-slate-900 dark:text-white">
            ${item.imm}
            ${item.type ? `<span class="text-[10px] text-slate-400 font-normal">(${item.type})</span>` : ''}
          </td>
          <td class="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
            ${item.appts_imm} appts
          </td>
          <td class="px-4 py-3">
            ${badgePH}
          </td>
          <td class="px-4 py-3">
            <div class="flex items-center space-x-2">
              <span class="w-8 text-right font-medium text-amber-600 dark:text-amber-400">${item.av_go}%</span>
              <div class="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                <div class="bg-amber-500 h-1.5 rounded-full" style="width: ${item.av_go}%"></div>
              </div>
            </div>
          </td>
          <td class="px-4 py-3">
            <div class="flex items-center space-x-2">
              <span class="w-8 text-right font-medium text-indigo-600 dark:text-indigo-400">${item.av_ls}%</span>
              <div class="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                <div class="bg-indigo-500 h-1.5 rounded-full" style="width: ${item.av_ls}%"></div>
              </div>
            </div>
          </td>
          <td class="px-4 py-3">
            <div class="flex items-center space-x-2">
              <span class="w-9 text-right font-bold text-emerald-600 dark:text-emerald-400">${item.av_gen}%</span>
              <div class="w-20 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div class="bg-emerald-500 h-2 rounded-full" style="width: ${item.av_gen}%"></div>
              </div>
            </div>
          </td>
          <td class="px-4 py-3 text-center">
            <button onclick="window.openModalImmeuble(${globalIndex})" class="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-600 hover:text-white dark:bg-slate-800 dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-200 font-semibold transition text-xs flex items-center space-x-1 mx-auto">
              <i data-lucide="eye" class="w-3.5 h-3.5"></i>
              <span>Détails</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    elements.chantiersTableBody.innerHTML = rows || `
      <tr>
        <td colspan="10" class="px-5 py-12 text-center text-slate-400">
          <i data-lucide="inbox" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
          Aucun immeuble ne correspond aux critères de recherche.
        </td>
      </tr>
    `;

    // Pagination Summary
    elements.paginationSummary.textContent = sorted.length > 0
      ? `Affichage ${startIdx + 1} à ${endIdx} sur ${sorted.length.toLocaleString('fr-FR')} résultats`
      : '0 résultat';

    elements.prevPageBtn.disabled = currentPage <= 1;
    elements.nextPageBtn.disabled = currentPage >= totalPages;

    // Pagination page numbers (show max 5 pages)
    let pageNumbersHtml = '';
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    for (let p = startPage; p <= endPage; p++) {
      const activeClass = p === currentPage
        ? 'bg-emerald-600 text-white font-bold'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';
      pageNumbersHtml += `
        <button onclick="window.goToPage(${p})" class="w-7 h-7 rounded-lg text-xs font-semibold ${activeClass} transition">
          ${p}
        </button>
      `;
    }
    elements.paginationNumbers.innerHTML = pageNumbersHtml;

    refreshLucide();
  }

  // Immeuble Modal
  function openModalImmeuble(index) {
    const list = state.currentFilteredList;
    if (index < 0 || index >= list.length) return;

    state.currentModalImmIndex = index;
    const item = list[index];

    // Header info
    document.getElementById('modalProvinceBadge').textContent = item.province;
    const isPH = item.ph_status === 'OBTENU';
    const modalPHBadge = document.getElementById('modalPHBadge');
    modalPHBadge.textContent = isPH ? 'PH OBTENU' : 'PH NON OBTENU';
    modalPHBadge.className = isPH
      ? 'px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800'
      : 'px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800';

    document.getElementById('modalTitle').textContent = `${item.projet} - ${item.imm}`;
    document.getElementById('modalSubtitle').textContent = `Promoteur: ${item.promoteur} | Tranche: ${item.tranche || '-'} | GH: ${item.gh || '-'}`;
    document.getElementById('modalApptsCount').textContent = `${item.appts_imm} appartements`;

    // Gauges
    document.getElementById('modalGaugeTotal').textContent = `${item.av_gen}%`;
    document.getElementById('modalBarTotal').style.width = `${item.av_gen}%`;

    document.getElementById('modalGaugeGO').textContent = `${item.av_go}%`;
    document.getElementById('modalBarGO').style.width = `${item.av_go}%`;

    document.getElementById('modalGaugeLS').textContent = `${item.av_ls}%`;
    document.getElementById('modalBarLS').style.width = `${item.av_ls}%`;

    // Gros Oeuvre Sublots
    const goLabels = {
      terrassement: 'Terrassement',
      semelles_longrines: 'Semelles & Longrines',
      poteaux_voiles: 'Poteaux & Voiles',
      mise_a_terre: 'Mise à la terre',
      dallage: 'Dallage RdC',
      rdc_poteaux: 'Poteaux RdC',
      rdc_plancher: 'Plancher haut RdC',
      etage1_poteaux: 'Poteaux 1er Étage',
      etage1_plancher: 'Plancher 1er Étage',
      etage2_poteaux: 'Poteaux 2ème Étage',
      etage2_plancher: 'Plancher 2ème Étage',
      etage3_poteaux: 'Poteaux 3ème Étage',
      etage3_plancher: 'Plancher 3ème Étage',
      etage4_poteaux: 'Poteaux 4ème Étage',
      etage4_plancher: 'Plancher 4ème Étage',
      toiture_terrasse: 'Toiture Terrasse'
    };

    let goHtml = '';
    for (const [key, label] of Object.entries(goLabels)) {
      const val = item.go && item.go[key] !== undefined ? item.go[key] : 0;
      goHtml += `
        <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
          <div class="flex items-center justify-between text-slate-600 dark:text-slate-300 font-medium mb-1">
            <span>${label}</span>
            <span class="font-bold text-slate-800 dark:text-slate-100">${val}%</span>
          </div>
          <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
            <div class="bg-amber-500 h-1.5 rounded-full" style="width: ${val}%"></div>
          </div>
        </div>
      `;
    }
    document.getElementById('modalGOGrid').innerHTML = goHtml;

    // Lots Secondaires Sublots
    const lsLabels = {
      cloisons_rdc: 'Cloisons RdC',
      cloisons_1: 'Cloisons 1er',
      cloisons_2: 'Cloisons 2ème',
      enduits_int_rdc: 'Enduits int. RdC',
      enduits_int_1: 'Enduits int. 1er',
      enduits_ext: 'Enduits extérieurs',
      etancheite_terrasse: 'Étanchéité terrasse',
      etancheite_sdb: 'Étanchéité SDB',
      electricite: 'Électricité',
      plomberie: 'Plomberie',
      sanitaire: 'Sanitaires',
      revetement: 'Revêtement carrelage',
      menuiserie_bois: 'Menuiserie bois',
      menuiserie_alu: 'Menuiserie alu',
      peinture_int: 'Peinture intérieure',
      peinture_ext: 'Peinture extérieure'
    };

    let lsHtml = '';
    for (const [key, label] of Object.entries(lsLabels)) {
      const val = item.ls && item.ls[key] !== undefined ? item.ls[key] : 0;
      lsHtml += `
        <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
          <div class="flex items-center justify-between text-slate-600 dark:text-slate-300 font-medium mb-1">
            <span>${label}</span>
            <span class="font-bold text-slate-800 dark:text-slate-100">${val}%</span>
          </div>
          <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
            <div class="bg-indigo-500 h-1.5 rounded-full" style="width: ${val}%"></div>
          </div>
        </div>
      `;
    }
    document.getElementById('modalLSGrid').innerHTML = lsHtml;

    // VRD Sublots
    const vrdLabels = {
      assainissement: 'Assainissement général',
      bassin_orage: "Bassin d'orage",
      eau_potable: 'Eau Potable',
      eaux_usees: 'Réseau Eaux Usées',
      eaux_pluviales: 'Réseau Eaux Pluviales',
      elec_bt_mt: 'Électricité BT / MT',
      postes_transfo: 'Postes Transformateurs',
      eclairage_public: 'Éclairage Public',
      voirie_corps: 'Voirie Corps de chaussée',
      voirie_enrobee: 'Voirie Enrobée',
      raccordement_hors_site: 'Raccordement Hors-site'
    };

    let vrdHtml = '';
    for (const [key, label] of Object.entries(vrdLabels)) {
      const val = item.vrd && item.vrd[key] !== undefined ? item.vrd[key] : 0;
      vrdHtml += `
        <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
          <div class="flex items-center justify-between text-slate-600 dark:text-slate-300 font-medium mb-1">
            <span>${label}</span>
            <span class="font-bold text-slate-800 dark:text-slate-100">${val}%</span>
          </div>
          <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
            <div class="bg-blue-500 h-1.5 rounded-full" style="width: ${val}%"></div>
          </div>
        </div>
      `;
    }
    document.getElementById('modalVRDGrid').innerHTML = vrdHtml;

    // Qualite & Reception
    const q = item.qualite || {};
    document.getElementById('modalQualiteGrid').innerHTML = `
      <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
        <span class="font-bold text-slate-900 dark:text-white block">Laboratoire LPEE</span>
        <div class="flex items-center justify-between">
          <span class="text-slate-500">Rapport LPEE :</span>
          <span class="font-semibold">${q.rapport_lpee || 'Disponible'}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-slate-500">Levée de réserves :</span>
          <span class="font-semibold">${q.reserves_lpee || 'Sans réserve'}</span>
        </div>
      </div>
      <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
        <span class="font-bold text-slate-900 dark:text-white block">Raccordements SRM</span>
        <div class="flex items-center justify-between">
          <span class="text-slate-500">Situation SRM :</span>
          <span class="font-semibold">${q.situation_srm || 'En cours'}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-slate-500">Réception SRM :</span>
          <span class="font-semibold">${q.reception_srm || 'Non réalisée'}</span>
        </div>
      </div>
    `;

    // Modal navigation buttons
    elements.modalPrevImmBtn.disabled = index <= 0;
    elements.modalNextImmBtn.disabled = index >= list.length - 1;

    // Show modal
    elements.modalImmeuble.classList.remove('hidden');
    refreshLucide();
  }

  function closeModal() {
    elements.modalImmeuble.classList.add('hidden');
  }

  // Equipements Publics Render
  function renderEquipements() {
    const list = state.data.equipements || [];
    const statusFilter = state.equipements.statusFilter;
    const { province, promoteur, projet, gh, search } = state.filters;
    const qLocal = state.equipements.search.toLowerCase().trim();
    const qGlobal = (search || '').toLowerCase().trim();

    const filtered = list.filter(item => {
      // Global filters
      if (province && !matchesProvince(item.province, province)) return false;
      if (promoteur && !matchesPromoteur(item.promoteur, promoteur)) return false;
      if (projet && !matchesProject(item.projet, projet)) return false;
      if (gh && !matchesGH(item.tranche, gh)) return false;

      // Status filter
      if (statusFilter !== 'all' && item.statut !== statusFilter) return false;

      // Search (local toolbar or global header)
      const q = qLocal || qGlobal;
      if (q) {
        const text = `${item.province} ${item.projet} ${item.promoteur} ${item.equipement} ${item.tranche}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });

    // Counts for filtered selection
    const acheves = filtered.filter(x => x.statut === 'Achevé / Livré').length;
    const enCours = filtered.filter(x => x.statut === 'En cours').length;
    const nonDem = filtered.filter(x => x.statut === 'Non démarré').length;

    document.getElementById('eqAchevesCount').textContent = acheves;
    document.getElementById('eqEnCoursCount').textContent = enCours;
    document.getElementById('eqNonDemarreCount').textContent = nonDem;

    // Cards
    const cards = filtered.map(item => {
      let badgeColor = 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
      if (item.statut === 'Achevé / Livré') {
        badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
      } else if (item.statut === 'Non démarré') {
        badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
      }

      const hasAlert = item.observations && item.observations.toLowerCase().includes('impacter');

      return `
        <div class="glass-panel p-5 rounded-2xl border ${hasAlert ? 'border-amber-300 dark:border-amber-700 bg-amber-50/20' : 'border-slate-200 dark:border-slate-800'} shadow-sm space-y-3">
          <div class="flex items-start justify-between">
            <div>
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">${item.province}</span>
              <h4 class="font-extrabold text-sm text-slate-900 dark:text-white">${item.equipement}</h4>
              <p class="text-xs text-slate-500 font-medium">${item.projet} (${item.promoteur})</p>
            </div>
            <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${badgeColor}">
              ${item.statut}
            </span>
          </div>

          <div class="space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500">Avancement :</span>
              <span class="font-extrabold text-slate-800 dark:text-slate-200">${item.avancement}%</span>
            </div>
            <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div class="bg-emerald-500 h-2 rounded-full" style="width: ${item.avancement}%"></div>
            </div>
          </div>

          <div class="text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Échéance cible :</span>
            <span class="font-semibold text-slate-700 dark:text-slate-300">${item.date_cible || 'À préciser'}</span>
          </div>

          ${item.observations ? `
            <div class="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
              <i data-lucide="info" class="w-3.5 h-3.5 shrink-0 text-amber-500 mt-0.5"></i>
              <span>${item.observations}</span>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    elements.equipementsGrid.innerHTML = cards || `
      <div class="col-span-full py-12 text-center text-slate-400">
        Aucun équipement public ne correspond à la recherche.
      </div>
    `;

    refreshLucide();
  }

  // SRM Render
  function renderSRM() {
    const list = state.data.srm || [];
    const { province, promoteur, projet, gh, search } = state.filters;
    const q = (search || '').toLowerCase().trim();

    const filtered = list.filter(item => {
      // Province
      if (province && !matchesProvince(item.province, province)) return false;
      // Promoteur
      if (promoteur && !matchesPromoteur(item.promoteur, promoteur)) return false;
      // Projet
      if (projet && !matchesProject(item.projet, projet)) return false;
      // GH
      if (gh && !matchesGH(item.gh, gh)) return false;
      // Search
      if (q) {
        const text = `${item.province} ${item.projet} ${item.promoteur} ${item.gh} ${item.elec_statut} ${item.eau_statut} ${item.assain_pluvial}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });

    const srmCountBadge = document.getElementById('srmCountBadge');
    if (srmCountBadge) {
      srmCountBadge.textContent = `${filtered.length} sur ${list.length} Opérations SRM`;
    }

    if (filtered.length === 0) {
      elements.srmTableBody.innerHTML = `
        <tr><td colspan="8" class="px-4 py-8 text-center text-slate-400">Aucune opération SRM ne correspond aux critères de filtre sélectionnés.</td></tr>
      `;
      return;
    }

    const rows = filtered.map(item => `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
        <td class="px-4 py-3.5">
          <span class="font-bold text-slate-900 dark:text-white block">${item.projet}</span>
          <span class="text-[11px] text-slate-500">${item.province}</span>
        </td>
        <td class="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
          ${item.promoteur}
        </td>
        <td class="px-4 py-3.5 text-slate-600 dark:text-slate-400 font-semibold">
          <span class="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">${item.gh || '-'}</span>
        </td>
        <td class="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-200">
          ${item.unites}
        </td>
        <td class="px-4 py-3.5 text-[11px]">
          <span class="font-semibold text-amber-600 dark:text-amber-400">${item.elec_statut || 'En cours'}</span>
          ${item.elec_date ? `<div class="text-slate-400 text-[10px]">${item.elec_date}</div>` : ''}
        </td>
        <td class="px-4 py-3.5 text-[11px]">
          <span class="font-semibold text-blue-600 dark:text-blue-400">${item.eau_statut || 'En cours'}</span>
          ${item.eau_date ? `<div class="text-slate-400 text-[10px]">${item.eau_date}</div>` : ''}
        </td>
        <td class="px-4 py-3.5 text-[11px]">
          <span class="font-semibold text-teal-600 dark:text-teal-400">${item.assain_pluvial || 'En cours'}</span>
        </td>
        <td class="px-4 py-3.5 text-[11px] text-slate-600 dark:text-slate-300">
          ${item.elec_blocage || item.assain_blocage || item.commentaire || 'Conforme'}
        </td>
      </tr>
    `).join('');

    elements.srmTableBody.innerHTML = rows;
  }

  // LPEE Render
  function renderLPEE() {
    const list = state.data.lpee || [];
    const { province, promoteur, projet, gh, search } = state.filters;
    const q = (search || '').toLowerCase().trim();

    const filtered = list.filter(item => {
      // Province
      if (province && !matchesProvince(item.province, province)) return false;
      // Promoteur
      if (promoteur && !matchesPromoteur(item.promoteur, promoteur)) return false;
      // Projet
      if (projet && !matchesProject(item.projet, projet)) return false;
      // GH
      if (gh && !matchesGH(item.gh, gh)) return false;
      // Search
      if (q) {
        const text = `${item.province} ${item.projet} ${item.promoteur} ${item.gh} ${item.completude}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });

    const complets = filtered.filter(x => x.completude && x.completude.toLowerCase().includes('complet') && !x.completude.toLowerCase().includes('incomplet')).length;
    const incomplets = filtered.length - complets;

    const elTotal = document.getElementById('lpeeTotalCount');
    const elComplets = document.getElementById('lpeeCompletsCount');
    const elIncomplets = document.getElementById('lpeeIncompletsCount');
    const elTableBadge = document.getElementById('lpeeTableCountBadge');

    if (elTotal) elTotal.textContent = `${filtered.length} Dossiers`;
    if (elComplets) elComplets.textContent = complets;
    if (elIncomplets) elIncomplets.textContent = incomplets;
    if (elTableBadge) elTableBadge.textContent = `${filtered.length} sur ${list.length} Dossiers LPEE`;

    if (filtered.length === 0) {
      elements.lpeeTableBody.innerHTML = `
        <tr><td colspan="9" class="px-4 py-8 text-center text-slate-400">Aucun dossier laboratoire LPEE ne correspond aux critères de filtre sélectionnés.</td></tr>
      `;
      return;
    }

    const rows = filtered.map(item => {
      const isComplet = item.completude && item.completude.toLowerCase().includes('complet') && !item.completude.toLowerCase().includes('incomplet');
      const badge = isComplet
        ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">COMPLET</span>'
        : '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">INCOMPLET</span>';

      return `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
          <td class="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
            ${item.province}
          </td>
          <td class="px-4 py-3.5">
            <span class="font-semibold text-slate-800 dark:text-slate-200 block">${item.projet}</span>
            <span class="text-[11px] text-slate-500">${item.promoteur}</span>
          </td>
          <td class="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-300">
            <span class="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">${item.gh || '-'}</span>
          </td>
          <td class="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-200">
            ${item.unites_aut}
          </td>
          <td class="px-4 py-3.5 text-slate-600 dark:text-slate-400">
            ${item.date_ph || '-'}
          </td>
          <td class="px-4 py-3.5">
            ${badge}
          </td>
          <td class="px-4 py-3.5 text-[11px] text-slate-600 dark:text-slate-300">
            ${item.go_lpee || item.go_lpee_res || 'Réalisé'}
          </td>
          <td class="px-4 py-3.5 text-[11px] text-slate-600 dark:text-slate-300">
            ${item.etancheite || '-'}
          </td>
          <td class="px-4 py-3.5 text-[11px] text-slate-600 dark:text-slate-300">
            ${item.electricite || item.plomberie || '-'}
          </td>
        </tr>
      `;
    }).join('');

    elements.lpeeTableBody.innerHTML = rows;
  }

  // ==========================================
  // CHECK-LISTE PERMIS D'HABITER (PH) RENDER & FILTERS
  // ==========================================
  function populateChecklistPhFilterProjets(rows) {
    const projSelect = document.getElementById('checklistPhFilterProjet');
    if (!projSelect) return;

    const currentVal = projSelect.value || 'all';
    const projets = Array.from(new Set(rows.map(r => (r.projet || '').trim()).filter(Boolean))).sort();

    let html = `<option value="all">🏢 Tous les Projets (${projets.length})</option>`;
    projets.forEach(p => {
      const count = rows.filter(r => (r.projet || '').trim() === p).length;
      html += `<option value="${p}">${p} (${count} tranche${count > 1 ? 's' : ''})</option>`;
    });

    projSelect.innerHTML = html;
    if (projets.includes(currentVal)) {
      projSelect.value = currentVal;
    } else {
      projSelect.value = 'all';
    }
  }

  function updateChecklistPhFilterGH(rows, selectedProjet) {
    const ghSelect = document.getElementById('checklistPhFilterGH');
    if (!ghSelect) return;

    const currentVal = ghSelect.value || 'all';
    const relevantRows = (selectedProjet && selectedProjet !== 'all')
      ? rows.filter(r => (r.projet || '').trim().toLowerCase() === selectedProjet.trim().toLowerCase())
      : rows;

    const ghSet = new Set();
    relevantRows.forEach(r => {
      if (!r.gh) return;
      const tokens = r.gh.split(/[;,]/).map(t => t.trim()).filter(Boolean);
      tokens.forEach(t => ghSet.add(t));
      if (r.gh.length <= 30) ghSet.add(r.gh.trim());
    });

    const ghs = Array.from(ghSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    let html = `<option value="all">📑 Toutes les Tranches / GH (${ghs.length})</option>`;
    ghs.forEach(g => {
      html += `<option value="${g}">${g}</option>`;
    });

    ghSelect.innerHTML = html;
    if (ghSet.has(currentVal)) {
      ghSelect.value = currentVal;
    } else {
      ghSelect.value = 'all';
    }
  }

  function handleChecklistPhProjetChange() {
    const dataPh = (state.data && state.data.checklist_ph) ? state.data.checklist_ph : { rows: [] };
    const allRows = dataPh.rows || [];
    const projSelect = document.getElementById('checklistPhFilterProjet');
    const selectedProjet = projSelect ? projSelect.value : 'all';

    // Synchronize with global filter bar so switching views maintains the selected project
    if (selectedProjet !== 'all') {
      state.filters.projet = selectedProjet;
      if (elements.filterProjet) elements.filterProjet.value = selectedProjet;
      updateGHFilter();
    } else {
      state.filters.projet = '';
      if (elements.filterProjet) elements.filterProjet.value = '';
      updateGHFilter();
    }

    updateChecklistPhFilterGH(allRows, selectedProjet);
    renderChecklistPh();
  }

  function resetChecklistPhFilters() {
    const searchEl = document.getElementById('checklistPhSearch');
    const projEl = document.getElementById('checklistPhFilterProjet');
    const ghEl = document.getElementById('checklistPhFilterGH');
    const statusEl = document.getElementById('checklistPhFilterStatus');
    const docEl = document.getElementById('checklistPhFilterDoc');

    if (searchEl) searchEl.value = '';
    if (projEl) projEl.value = 'all';
    if (statusEl) statusEl.value = 'all';
    if (docEl) docEl.value = 'all';

    const dataPh = (state.data && state.data.checklist_ph) ? state.data.checklist_ph : { rows: [] };
    updateChecklistPhFilterGH(dataPh.rows || [], 'all');

    renderChecklistPh();
  }

  function renderChecklistPh() {
    const dataPh = (state.data && state.data.checklist_ph) ? state.data.checklist_ph : { rows: [], summary: {} };
    const allRows = dataPh.rows || [];
    const summary = dataPh.summary || {};

    const projSelect = document.getElementById('checklistPhFilterProjet');
    const ghSelect = document.getElementById('checklistPhFilterGH');

    // Ensure dropdowns are populated
    if (projSelect && (projSelect.options.length <= 1 || projSelect.dataset.populatedCount != allRows.length)) {
      populateChecklistPhFilterProjets(allRows);
      updateChecklistPhFilterGH(allRows, projSelect.value);
      projSelect.dataset.populatedCount = allRows.length;
    }

    // Sync with global header filters if active
    if (state.filters && state.filters.projet && projSelect) {
      const matchOpt = Array.from(projSelect.options).find(o => o.value !== 'all' && matchesProject(o.value, state.filters.projet));
      if (matchOpt && projSelect.value !== matchOpt.value) {
        projSelect.value = matchOpt.value;
        updateChecklistPhFilterGH(allRows, matchOpt.value);
      }
    }
    if (state.filters && state.filters.gh && ghSelect) {
      const matchGhOpt = Array.from(ghSelect.options).find(o => o.value !== 'all' && matchesGH(o.value, state.filters.gh));
      if (matchGhOpt && ghSelect.value !== matchGhOpt.value) {
        ghSelect.value = matchGhOpt.value;
      }
    }

    // Filter controls
    const searchVal = (document.getElementById('checklistPhSearch') ? document.getElementById('checklistPhSearch').value : '').toLowerCase().trim();
    const globalSearch = (state.filters.search || '').toLowerCase().trim();
    let filterProjet = projSelect ? projSelect.value : 'all';
    let filterGH = ghSelect ? ghSelect.value : 'all';
    const filterStatus = document.getElementById('checklistPhFilterStatus') ? document.getElementById('checklistPhFilterStatus').value : 'all';
    const filterDoc = document.getElementById('checklistPhFilterDoc') ? document.getElementById('checklistPhFilterDoc').value : 'all';

    // Global filter linkage
    if (filterProjet === 'all' && state.filters && state.filters.projet) {
      filterProjet = state.filters.projet;
    }
    if (filterGH === 'all' && state.filters && state.filters.gh) {
      filterGH = state.filters.gh;
    }

    const filtered = allRows.filter(row => {
      // Projet filter
      if (filterProjet && filterProjet !== 'all') {
        if (!matchesProject(row.projet, filterProjet)) return false;
      }

      // GH filter
      if (filterGH && filterGH !== 'all') {
        if (!matchesGH(row.gh, filterGH)) return false;
      }

      // Search (local toolbar or global search)
      const q = searchVal || globalSearch;
      if (q) {
        const pMatch = (row.projet || '').toLowerCase().includes(q);
        const ghMatch = (row.gh || '').toLowerCase().includes(q);
        const amiMatch = (row.num_ami || '').toLowerCase().includes(q);
        if (!pMatch && !ghMatch && !amiMatch) return false;
      }

      // Status
      if (filterStatus === 'complete' && !(row.is_complete || row.total_docs_dispos === 6 || row.completude_pct === 100)) return false;
      if (filterStatus === 'with_rokhas' && (!row.Permis_d_habiter_via_rokhas || !row.Permis_d_habiter_via_rokhas.filled)) return false;
      if (filterStatus === 'without_rokhas' && (row.Permis_d_habiter_via_rokhas && row.Permis_d_habiter_via_rokhas.filled)) return false;
      if (filterStatus === 'with_docs' && row.total_docs_dispos === 0) return false;
      if (filterStatus === 'empty' && row.total_docs_dispos > 0) return false;

      // Document specific
      if (filterDoc && filterDoc !== 'all') {
        const targetDoc = row[filterDoc];
        if (!targetDoc || !targetDoc.filled) return false;
      }

      return true;
    });

    // Dynamically update KPI counters for filtered selection
    const elTotalGh = document.getElementById('phTotalGhCount');
    const elTotalProjets = document.getElementById('phTotalProjetsCount');
    const elRokhasCount = document.getElementById('phRokhasCount');
    const elRokhasPct = document.getElementById('phRokhasPct');
    const elTauxCompletude = document.getElementById('phTauxCompletude');
    const elDocsRatio = document.getElementById('phDocsRatio');
    const elAttestationsCount = document.getElementById('phAttestationsCount');
    const badgeSidebar = document.getElementById('badgeChecklistPh');

    const totalFiltered = filtered.length;
    const uniqueProjets = new Set(filtered.map(r => (r.projet || '').trim()).filter(Boolean)).size;
    const countRokhas = filtered.filter(r => r.Permis_d_habiter_via_rokhas && r.Permis_d_habiter_via_rokhas.filled).length;
    const pctRokhas = totalFiltered > 0 ? ((countRokhas / totalFiltered) * 100).toFixed(1) : '0';

    let sumDocsDispos = 0;
    let sumAttestations = 0;
    filtered.forEach(r => {
      sumDocsDispos += (r.total_docs_dispos || 0);
      ['Attestation_d_achèvement_Archi', 'Attestation_de_stabilité_et_de_conformité_BET', 'Attestation_de_stabilité_et_de_conformité_BCT', 'Attestation_de_conformité_de_lot_Etanchéité_BCT', 'Rapport_de_synthèse_de_laboratoire'].forEach(k => {
        if (r[k] && r[k].filled) sumAttestations++;
      });
    });
    const maxDocs = totalFiltered * 6;
    const pctCompletude = maxDocs > 0 ? ((sumDocsDispos / maxDocs) * 100).toFixed(1) : '0';

    if (elTotalGh) elTotalGh.textContent = totalFiltered;
    if (elTotalProjets) elTotalProjets.textContent = `${uniqueProjets} Projet${uniqueProjets > 1 ? 's' : ''} audité${uniqueProjets > 1 ? 's' : ''}`;
    if (elRokhasCount) elRokhasCount.textContent = countRokhas;
    if (elRokhasPct) elRokhasPct.textContent = `${pctRokhas}% des tranches`;
    if (elTauxCompletude) elTauxCompletude.textContent = `${pctCompletude}%`;
    if (elDocsRatio) elDocsRatio.textContent = `${sumDocsDispos} / ${maxDocs} pièces renseignées`;
    if (elAttestationsCount) elAttestationsCount.textContent = sumAttestations;
    if (badgeSidebar) badgeSidebar.textContent = `${allRows.length} tranches`;

    const summaryCountEl = document.getElementById('checklistPhSummaryCount');
    if (summaryCountEl) {
      summaryCountEl.textContent = `Affichage de ${filtered.length} sur ${allRows.length} tranches`;
    }

    const tbody = document.getElementById('checklistPhTableBody');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="px-6 py-12 text-center text-slate-400">
            <i data-lucide="file-question" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
            <p class="font-bold text-sm">Aucune tranche ne correspond aux critères de filtre sélectionnés.</p>
            <button onclick="window.resetChecklistPhFilters()" class="mt-3 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-300">
              Réinitialiser les filtres
            </button>
          </td>
        </tr>
      `;
      refreshLucide();
      return;
    }

    function renderDocBadge(doc) {
      if (doc && doc.filled) {
        if (doc.has_link && doc.link) {
          return `
            <div class="flex flex-col items-center gap-1">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs">
                <i data-lucide="check" class="w-3 h-3 text-emerald-600"></i>
                <span>Oui</span>
              </span>
              <a href="${doc.link}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-200 text-[10px] font-bold transition border border-teal-200 dark:border-teal-800 shadow-2xs group" title="Ouvrir le document dans un nouvel onglet">
                <span>Voir le fichier</span>
                <i data-lucide="external-link" class="w-3 h-3 group-hover:translate-x-0.5 transition-transform text-teal-600 dark:text-teal-400"></i>
              </a>
            </div>
          `;
        } else {
          return `
            <div class="flex flex-col items-center gap-0.5">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                <i data-lucide="check" class="w-3 h-3 text-emerald-600"></i>
                <span>Oui</span>
              </span>
              <span class="text-[9px] text-slate-400 truncate max-w-[110px]" title="${doc.label || 'Document fourni'}">${doc.label || 'Fourni'}</span>
            </div>
          `;
        }
      } else {
        return `
          <div class="flex justify-center">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
              Non
            </span>
          </div>
        `;
      }
    }

    const htmlRows = filtered.map(row => {
      let progColor = 'bg-slate-200 dark:bg-slate-700 text-slate-600';
      let progBarColor = 'bg-slate-400';
      if (row.completude_pct === 100) {
        progColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300';
        progBarColor = 'bg-emerald-500';
      } else if (row.completude_pct >= 50) {
        progColor = 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-300';
        progBarColor = 'bg-teal-500';
      } else if (row.completude_pct > 0) {
        progColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300';
        progBarColor = 'bg-amber-500';
      }

      return `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
          <td class="px-4 py-3.5">
            <div class="flex items-start gap-2">
              <div>
                <span class="font-extrabold text-xs text-slate-900 dark:text-white block">${row.projet}</span>
                ${row.num_ami ? `<span class="inline-block mt-0.5 text-[9px] font-semibold text-blue-600 dark:text-blue-400">AMI: ${row.num_ami}</span>` : ''}
              </div>
            </div>
          </td>
          <td class="px-3 py-3.5">
            <span class="inline-block px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              ${row.gh || '-'}
            </span>
          </td>
          <td class="px-3 py-3 text-center">
            ${renderDocBadge(row.Permis_d_habiter_via_rokhas)}
          </td>
          <td class="px-3 py-3 text-center">
            ${renderDocBadge(row.Attestation_d_achèvement_Archi)}
          </td>
          <td class="px-3 py-3 text-center">
            ${renderDocBadge(row.Attestation_de_stabilité_et_de_conformité_BET)}
          </td>
          <td class="px-3 py-3 text-center">
            ${renderDocBadge(row.Attestation_de_stabilité_et_de_conformité_BCT)}
          </td>
          <td class="px-3 py-3 text-center">
            ${renderDocBadge(row.Attestation_de_conformité_de_lot_Etanchéité_BCT)}
          </td>
          <td class="px-3 py-3 text-center">
            ${renderDocBadge(row.Rapport_de_synthèse_de_laboratoire)}
          </td>
          <td class="px-3 py-3 text-center">
            <div class="flex flex-col items-center gap-1">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${progColor}">
                ${row.total_docs_dispos} / 6
              </span>
              <div class="w-16 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div class="${progBarColor} h-full rounded-full transition-all duration-300" style="width: ${row.completude_pct}%"></div>
              </div>
              <span class="text-[9px] text-slate-400 font-semibold">${row.completude_pct}%</span>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = htmlRows;
    refreshLucide();
  }

  function exportChecklistPhToExcel() {
    const dataPh = (state.data && state.data.checklist_ph) ? state.data.checklist_ph : { rows: [] };
    const rows = dataPh.rows || [];
    if (rows.length === 0) {
      alert("Aucune donnée de check-liste PH à exporter.");
      return;
    }

    const headers = [
      'N° AMI', 'PROJET', 'GH',
      'Permis d\'habiter (via rokhas)', 'Lien Rokhas',
      'Attestation d\'achèvement Archi', 'Lien Archi',
      'Attestation de stabilité BET', 'Lien BET',
      'Attestation de stabilité BCT', 'Lien BCT',
      'Attestation étanchéité BCT', 'Lien Étanchéité',
      'Rapport synthèse laboratoire', 'Lien Labo',
      'Complétude Docs', 'Pourcentage'
    ];

    const csvRows = [headers.join(';')];
    rows.forEach(r => {
      const line = [
        `"${(r.num_ami || '').replace(/"/g, '""')}"`,
        `"${(r.projet || '').replace(/"/g, '""')}"`,
        `"${(r.gh || '').replace(/"/g, '""')}"`,
        `"${(r.Permis_d_habiter_via_rokhas && r.Permis_d_habiter_via_rokhas.status) || 'Non'}"`,
        `"${(r.Permis_d_habiter_via_rokhas && r.Permis_d_habiter_via_rokhas.link || '').replace(/"/g, '""')}"`,
        `"${(r.Attestation_d_achèvement_Archi && r.Attestation_d_achèvement_Archi.status) || 'Non'}"`,
        `"${(r.Attestation_d_achèvement_Archi && r.Attestation_d_achèvement_Archi.link || '').replace(/"/g, '""')}"`,
        `"${(r.Attestation_de_stabilité_et_de_conformité_BET && r.Attestation_de_stabilité_et_de_conformité_BET.status) || 'Non'}"`,
        `"${(r.Attestation_de_stabilité_et_de_conformité_BET && r.Attestation_de_stabilité_et_de_conformité_BET.link || '').replace(/"/g, '""')}"`,
        `"${(r.Attestation_de_stabilité_et_de_conformité_BCT && r.Attestation_de_stabilité_et_de_conformité_BCT.status) || 'Non'}"`,
        `"${(r.Attestation_de_stabilité_et_de_conformité_BCT && r.Attestation_de_stabilité_et_de_conformité_BCT.link || '').replace(/"/g, '""')}"`,
        `"${(r.Attestation_de_conformité_de_lot_Etanchéité_BCT && r.Attestation_de_conformité_de_lot_Etanchéité_BCT.status) || 'Non'}"`,
        `"${(r.Attestation_de_conformité_de_lot_Etanchéité_BCT && r.Attestation_de_conformité_de_lot_Etanchéité_BCT.link || '').replace(/"/g, '""')}"`,
        `"${(r.Rapport_de_synthèse_de_laboratoire && r.Rapport_de_synthèse_de_laboratoire.status) || 'Non'}"`,
        `"${(r.Rapport_de_synthèse_de_laboratoire && r.Rapport_de_synthèse_de_laboratoire.link || '').replace(/"/g, '""')}"`,
        `"${r.total_docs_dispos}/6"`,
        `"${r.completude_pct}%"`
      ];
      csvRows.push(line.join(';'));
    });

    const blob = new Blob(["\ufeff" + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CHECK_LISTE_PH_EXPORT_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (typeof showToastNotification === 'function') {
      showToastNotification("Check-liste PH exportée en CSV avec succès !", "success");
    }
  }

  function refreshChecklistPhData() {
    if (typeof refreshSourceData === 'function') {
      refreshSourceData();
    }
    setTimeout(() => {
      renderChecklistPh();
    }, 1200);
  }

  // Switch Active Tab
  function switchTab(tabId, customFilters = {}) {
    state.activeTab = tabId;

    // Update Nav Buttons
    elements.navItems.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('bg-slate-100', 'dark:bg-slate-800', 'text-slate-900', 'dark:text-white', 'font-bold');
      } else {
        btn.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-slate-900', 'dark:text-white', 'font-bold');
      }
    });

    // Update Titles
    const titles = {
      overview: ['Vue d\'Ensemble Stratégique', 'Indicateurs clés du Programme VSB (Villes Sans Bidonvilles)'],
      chantiers: ['Suivi Détaillé des Chantiers', 'Avancement des 1 965 immeubles et Permis d\'Habiter'],
      equipements: ['Suivi des Équipements Publics', 'Mosquées, écoles, lycées et équipements d\'accompagnement'],
      srm: ['Suivi des Raccordements & SRM', 'Réseaux électricité, eau potable et assainissement'],
      lpee: ['Contrôle Qualité & Laboratoire LPEE / CID', 'Conformité technique des lots et levée des réserves'],
      'checklist-ph': ['Check-liste Permis d\'Habiter (PH)', 'Vérification documentaire, attestations techniques et pièces justificatives'],
      'import-export': ['Import & Export des Données', 'Synchronisation CSV et exportations vers Excel / PDF'],
    };

    if (titles[tabId]) {
      elements.pageTitle.textContent = titles[tabId][0];
      elements.pageSubtitle.textContent = titles[tabId][1];
    }

    // Toggle View Panels
    Object.keys(elements.views).forEach(key => {
      if (elements.views[key]) {
        if (key === tabId) {
          elements.views[key].classList.remove('hidden');
        } else {
          elements.views[key].classList.add('hidden');
        }
      }
    });

    // Apply custom filters if any (e.g. from alert banner)
    if (customFilters.ph) {
      state.filters.ph_status = customFilters.ph;
      elements.filterPH.value = customFilters.ph;
    }

    // Close Mobile Sidebar
    elements.sidebar.classList.add('-translate-x-full');
    elements.mobileOverlay.classList.add('hidden');

    // Trigger re-render of current view
    applyFilters();
  }

  // Apply Global Filters
  function applyFilters() {
    state.currentFilteredList = getFilteredAvancement();

    updateOverview(state.currentFilteredList);
    renderChantiersTable();

    if (state.activeTab === 'equipements') renderEquipements();
    if (state.activeTab === 'srm') renderSRM();
    if (state.activeTab === 'lpee') renderLPEE();
    if (state.activeTab === 'checklist-ph') renderChecklistPh();
    if (state.activeTab === 'import-export') {
      renderImportedFilesGrid();
      renderFileDataViewer();
    }

    // Update Active Filter Badge dynamically depending on active tab
    if (elements.filteredCountBadge) {
      if (state.activeTab === 'srm') {
        const srmList = state.data.srm || [];
        const count = srmList.filter(x => matchesProject(x.projet, state.filters.projet) && matchesGH(x.gh, state.filters.gh) && matchesProvince(x.province, state.filters.province)).length;
        elements.filteredCountBadge.textContent = `${count} opérations SRM`;
      } else if (state.activeTab === 'lpee') {
        const lpeeList = state.data.lpee || [];
        const count = lpeeList.filter(x => matchesProject(x.projet, state.filters.projet) && matchesGH(x.gh, state.filters.gh) && matchesProvince(x.province, state.filters.province)).length;
        elements.filteredCountBadge.textContent = `${count} dossiers LPEE`;
      } else if (state.activeTab === 'checklist-ph') {
        const clList = (state.data.checklist_ph ? state.data.checklist_ph.rows : []) || [];
        const count = clList.filter(x => matchesProject(x.projet, state.filters.projet) && matchesGH(x.gh, state.filters.gh)).length;
        elements.filteredCountBadge.textContent = `${count} tranches PH`;
      } else if (state.activeTab === 'equipements') {
        const eqList = state.data.equipements || [];
        const count = eqList.filter(x => matchesProject(x.projet, state.filters.projet) && matchesGH(x.tranche, state.filters.gh)).length;
        elements.filteredCountBadge.textContent = `${count} équipements`;
      } else {
        elements.filteredCountBadge.textContent = `${state.currentFilteredList.length.toLocaleString('fr-FR')} immeubles`;
      }
    }

    refreshLucide();
  }

  // Reset Filters
  function resetFilters() {
    state.filters.province = '';
    state.filters.promoteur = '';
    state.filters.projet = '';
    state.filters.gh = '';
    state.filters.ph_status = '';
    state.filters.avancement = '';
    state.filters.search = '';
    state.filters.tableSubFilter = 'all';

    elements.filterProvince.value = '';
    elements.filterPromoteur.value = '';
    elements.filterProjet.value = '';
    if (elements.filterGH) {
      elements.filterGH.innerHTML = '<option value="">Tous les GH</option>';
      elements.filterGH.value = '';
    }
    if (elements.filterGHContainer) {
      elements.filterGHContainer.classList.add('hidden');
      elements.filterGHContainer.classList.remove('flex');
    }
    elements.filterPH.value = '';
    elements.filterAvancement.value = '';
    elements.quickSearchInput.value = '';

    // Also reset local toolbar controls for checklist-ph & equipements
    const clSearch = document.getElementById('checklistPhSearch');
    const clProj = document.getElementById('checklistPhFilterProjet');
    const clGh = document.getElementById('checklistPhFilterGH');
    const clStatus = document.getElementById('checklistPhFilterStatus');
    const clDoc = document.getElementById('checklistPhFilterDoc');
    if (clSearch) clSearch.value = '';
    if (clProj) clProj.value = 'all';
    if (clGh) clGh.value = 'all';
    if (clStatus) clStatus.value = 'all';
    if (clDoc) clDoc.value = 'all';
    state.equipements.search = '';
    state.equipements.statusFilter = 'all';

    elements.tableTabBtns.forEach(btn => {
      if (btn.getAttribute('data-table-filter') === 'all') {
        btn.className = 'table-tab-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 transition';
      } else {
        btn.className = 'table-tab-btn px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition';
      }
    });

    state.pagination.page = 1;
    applyFilters();
  }

  // ==========================================
  // SECTION: GESTION DES FICHIERS & EXPLORATEUR
  // ==========================================

  // Render Imported & Available Files Grid
  function renderImportedFilesGrid() {
    if (!elements.importedFilesGrid) return;
    const reg = state.filesRegistry || {};
    const keys = Object.keys(reg);

    if (elements.filesCountBadge) {
      elements.filesCountBadge.textContent = `${keys.length} Fichiers disponibles`;
    }

    if (keys.length === 0) {
      elements.importedFilesGrid.innerHTML = `
        <div class="col-span-full py-8 text-center text-slate-400">
          Aucun fichier enregistré pour le moment.
        </div>
      `;
      return;
    }

    const cards = keys.map(key => {
      const file = reg[key];
      const isSelected = file.id === state.activeViewerFileId;

      let catBg = 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
      let icon = 'file-spreadsheet';
      if (file.category.includes('Chantiers')) {
        catBg = 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
        icon = 'building-2';
      } else if (file.category.includes('Équipement')) {
        catBg = 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
        icon = 'school';
      } else if (file.category.includes('SRM')) {
        catBg = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400';
        icon = 'zap';
      } else if (file.category.includes('LPEE')) {
        catBg = 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300';
        icon = 'check-check';
      } else if (file.category.includes('AMI')) {
        catBg = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
        icon = 'file-text';
      } else if (file.category.includes('Planif')) {
        catBg = 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300';
        icon = 'calendar';
      } else if (file.category.includes('Utilisateur')) {
        catBg = 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
        icon = 'file-up';
      }

      return `
        <div onclick="window.selectViewerFile('${file.id}')" class="p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'}">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${catBg}">
                ${file.category}
              </span>
              <div class="flex items-center gap-1">
                ${file.is_main ? '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white" title="Actif sur le Dashboard">Dashboard</span>' : ''}
                ${isSelected ? '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900">Affiché</span>' : ''}
              </div>
            </div>

            <div class="flex items-start space-x-2.5">
              <div class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                <i data-lucide="${icon}" class="w-4 h-4"></i>
              </div>
              <div class="min-w-0 flex-1">
                <h4 class="font-extrabold text-xs text-slate-900 dark:text-white truncate" title="${file.name}">
                  ${file.name}
                </h4>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  <span class="font-semibold text-slate-700 dark:text-slate-200">${file.rows_count.toLocaleString('fr-FR')} lignes</span> • ${file.cols_count} colonnes
                </p>
              </div>
            </div>
          </div>

          <div class="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
            <span class="text-slate-400">${file.date || 'Auto-chargé'}</span>
            <span class="font-bold ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'} flex items-center gap-1">
              <span>${isSelected ? 'Données actives' : 'Afficher'}</span>
              <i data-lucide="chevron-right" class="w-3 h-3"></i>
            </span>
          </div>
        </div>
      `;
    }).join('');

    elements.importedFilesGrid.innerHTML = cards;
    refreshLucide();
  }

  // Select File to view its data
  function selectViewerFile(fileId) {
    if (!state.filesRegistry[fileId]) return;
    state.activeViewerFileId = fileId;
    state.viewerPagination.page = 1;
    state.viewerPagination.search = '';
    if (elements.viewerSearchInput) elements.viewerSearchInput.value = '';

    renderImportedFilesGrid();
    renderFileDataViewer();

    // Scroll to viewer card smoothly if not visible
    const viewerCard = document.getElementById('fileDataViewerCard');
    if (viewerCard) {
      viewerCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // Render Live Data Table Viewer
  function renderFileDataViewer() {
    if (!elements.viewerFileName) return;
    const file = state.filesRegistry[state.activeViewerFileId];
    if (!file) {
      const firstKey = Object.keys(state.filesRegistry)[0];
      if (firstKey) {
        state.activeViewerFileId = firstKey;
        return renderFileDataViewer();
      }
      return;
    }

    elements.viewerFileName.textContent = file.name;
    elements.viewerFileCategoryBadge.textContent = file.category;
    elements.viewerFileDateBadge.textContent = `Importé : ${file.date || 'Région Casablanca-Settat'}`;
    elements.viewerFileMeta.textContent = `${file.rows_count.toLocaleString('fr-FR')} enregistrements • ${file.cols_count} colonnes • Taille : ${file.size}`;

    // Show/hide sync button if avancement
    const isAvancement = file.name.toLowerCase().includes('avancement') || file.headers.some(h => h.toLowerCase().includes('imm'));
    if (elements.viewerSyncDashboardBtn) {
      if (isAvancement) {
        elements.viewerSyncDashboardBtn.classList.remove('hidden');
      } else {
        elements.viewerSyncDashboardBtn.classList.add('hidden');
      }
    }

    // Filter rows by viewer search
    const q = (state.viewerPagination.search || '').toLowerCase().trim();
    const rows = file.rows || [];
    const filteredRows = q
      ? rows.filter(r => r.some(c => String(c).toLowerCase().includes(q)))
      : rows;

    const pageSize = state.viewerPagination.pageSize;
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const currentPage = Math.min(state.viewerPagination.page, totalPages);
    state.viewerPagination.page = currentPage;

    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, filteredRows.length);
    const paginatedRows = filteredRows.slice(startIdx, endIdx);

    // Build Table Head
    const headers = file.headers || [];
    elements.viewerTableHead.innerHTML = `
      <tr>
        <th class="px-3.5 py-3 w-12 text-center text-slate-400 bg-slate-100 dark:bg-slate-800">#</th>
        ${headers.map(h => `<th class="px-3.5 py-3 font-bold">${h}</th>`).join('')}
      </tr>
    `;

    // Build Table Body
    if (paginatedRows.length === 0) {
      elements.viewerTableBody.innerHTML = `
        <tr>
          <td colspan="${headers.length + 1}" class="px-5 py-12 text-center text-slate-400">
            Aucun enregistrement ne correspond à la recherche "${q}".
          </td>
        </tr>
      `;
    } else {
      elements.viewerTableBody.innerHTML = paginatedRows.map((r, rIdx) => {
        const rowNum = startIdx + rIdx + 1;
        const cells = headers.map((h, cIdx) => {
          const val = r[cIdx] !== undefined ? String(r[cIdx]) : '';
          let formatted = val;

          // Special highlight for status
          const valUp = val.toUpperCase();
          if (valUp === 'OBTENU' || valUp === 'LIVRE' || valUp === 'ACHEVE' || valUp === 'COMPLET' || valUp === 'VRAI' || valUp === 'CONFORME') {
            formatted = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">${val}</span>`;
          } else if (valUp === 'NON OBTENU' || valUp === 'INCOMPLET' || valUp === 'NON DEMARRE' || valUp === 'FAUX' || valUp.includes('NON CONFORME')) {
            formatted = `<span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">${val}</span>`;
          } else if (val.endsWith('%')) {
            const num = parseFloat(val.replace('%', '').replace(',', '.'));
            if (!isNaN(num)) {
              formatted = `<span class="font-bold text-emerald-600 dark:text-emerald-400">${val}</span>`;
            }
          }

          return `<td class="px-3.5 py-2.5 max-w-xs truncate text-[11px]" title="${val.replace(/"/g, '&quot;')}">${formatted}</td>`;
        }).join('');

        return `
          <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
            <td class="px-3 py-2.5 text-center text-slate-400 font-semibold text-[10px] bg-slate-50/50 dark:bg-slate-900/50">${rowNum}</td>
            ${cells}
          </tr>
        `;
      }).join('');
    }

    // Pagination Summary
    elements.viewerPaginationSummary.textContent = filteredRows.length > 0
      ? `Affichage ${startIdx + 1} à ${endIdx} sur ${filteredRows.length.toLocaleString('fr-FR')} enregistrements`
      : '0 enregistrement trouvé';

    elements.viewerPrevPageBtn.disabled = currentPage <= 1;
    elements.viewerNextPageBtn.disabled = currentPage >= totalPages;

    // Pagination numbers
    let pageBtns = '';
    const maxBtns = 5;
    let sPage = Math.max(1, currentPage - 2);
    let ePage = Math.min(totalPages, sPage + maxBtns - 1);
    if (ePage - sPage < maxBtns - 1) {
      sPage = Math.max(1, ePage - maxBtns + 1);
    }

    for (let p = sPage; p <= ePage; p++) {
      const activeClass = p === currentPage
        ? 'bg-emerald-600 text-white font-bold'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';
      pageBtns += `
        <button onclick="window.goToViewerPage(${p})" class="w-7 h-7 rounded-lg text-xs font-semibold ${activeClass} transition">
          ${p}
        </button>
      `;
    }
    elements.viewerPaginationNumbers.innerHTML = pageBtns;
    refreshLucide();
  }

  // Synchronize Selected File with Main Dashboard
  function syncSelectedFileWithDashboard() {
    const file = state.filesRegistry[state.activeViewerFileId];
    if (!file) return;

    const headers = file.headers || [];
    const rows = file.rows || [];

    // Map column indices
    const findIdx = (names) => headers.findIndex(h => names.some(n => h.toLowerCase().includes(n.toLowerCase())));
    const provIdx = findIdx(['Province', 'Prefecture']);
    const projIdx = findIdx(['Projet']);
    const promIdx = findIdx(['Promoteur']);
    const immIdx = findIdx(['Imm']);
    const apptsIdx = findIdx(['Appt_Imm', 'Nmbr_Appt', 'Unite']);
    const phIdx = findIdx(['PERMIS_D_HABITER', 'PH']);
    const goIdx = findIdx(['Total_Avancement_A_50', 'Gros', 'GO']);
    const lsIdx = findIdx(['Total_Avancement_Lots_Secondaires', 'Secondaire', 'LS']);
    const genIdx = findIdx(['Total_Général', 'General', 'Global']);

    const parsed = [];
    rows.forEach((r, idx) => {
      const imm = immIdx >= 0 ? String(r[immIdx] || '').trim() : `IMM-${idx+1}`;
      if (!imm) return;

      const prov = provIdx >= 0 ? String(r[provIdx] || '').trim() : 'CASABLANCA';
      const proj = projIdx >= 0 ? String(r[projIdx] || '').trim() : file.name;
      const prom = promIdx >= 0 ? String(r[promIdx] || '').trim() : 'PROMOTEUR';
      const ph = phIdx >= 0 ? String(r[phIdx] || '').trim().toUpperCase() : 'NON OBTENU';

      const av_go = goIdx >= 0 ? parseFloat(String(r[goIdx] || '0').replace('%', '').replace(',', '.')) || 0 : 0;
      const av_ls = lsIdx >= 0 ? parseFloat(String(r[lsIdx] || '0').replace('%', '').replace(',', '.')) || 0 : 0;
      const av_gen = genIdx >= 0 ? parseFloat(String(r[genIdx] || '0').replace('%', '').replace(',', '.')) || 0 : 0;
      const appts = apptsIdx >= 0 ? parseInt(String(r[apptsIdx] || '0').replace(/[^0-9]/g, ''), 10) || 0 : 0;

      parsed.push({
        id: idx + 1,
        province: prov === 'HAY_HASSANI' ? 'HAY HASSANI' : prov,
        projet: proj,
        promoteur: prom,
        tranche: '',
        gh: '',
        imm: imm,
        type: '',
        appts_imm: appts,
        ph_status: (ph.includes('OBTENU') && !ph.includes('NON')) ? 'OBTENU' : 'NON OBTENU',
        av_go: Math.round(av_go),
        av_ls: Math.round(av_ls),
        av_gen: Math.round(av_gen),
        go: {},
        ls: {},
        vrd: {},
        qualite: {}
      });
    });

    if (parsed.length > 0) {
      state.data.avancement = parsed;
      // Mark as main
      Object.keys(state.filesRegistry).forEach(k => {
        state.filesRegistry[k].is_main = (k === state.activeViewerFileId);
      });
      applyFilters();
      renderImportedFilesGrid();
      alert(`Le fichier "${file.name}" (${parsed.length} enregistrements) a été synchronisé avec succès avec le Tableau de Bord !`);
    } else {
      alert(`Impossible d'extraire les indicateurs d'immeubles depuis ce fichier.`);
    }
  }

  // Export Active Viewer File
  function exportActiveViewerFile(format) {
    const file = state.filesRegistry[state.activeViewerFileId];
    if (!file) return;

    if (format === 'xlsx') {
      if (typeof XLSX === 'undefined') {
        alert("La bibliothèque Excel n'est pas encore chargée.");
        return;
      }
      const data = [file.headers, ...file.rows];
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Donnees');
      const filename = `${file.name.replace(/\.[^/.]+$/, "")}_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, filename);
    } else {
      // CSV
      const csvContent = [
        file.headers.join(';'),
        ...file.rows.map(r => r.join(';'))
      ].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${file.name.replace(/\.[^/.]+$/, "")}_Export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // Register New Imported File in Memory
  function registerNewImportedFile(fileName, headers, rows, fileSize) {
    const fileId = 'file-user-' + Date.now();
    const isAvancement = headers.some(h => h.toLowerCase().includes('imm')) || fileName.toLowerCase().includes('avancement');

    state.filesRegistry[fileId] = {
      id: fileId,
      name: fileName,
      category: isAvancement ? 'Chantiers (Importé)' : 'Fichier Utilisateur Importé',
      date: new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      size: `${(fileSize / 1024).toFixed(1)} KB`,
      is_main: isAvancement,
      headers: headers,
      rows_count: rows.length,
      cols_count: headers.length,
      rows: rows
    };

    state.activeViewerFileId = fileId;
    state.viewerPagination.page = 1;
    state.viewerPagination.search = '';

    renderImportedFilesGrid();
    renderFileDataViewer();

    if (isAvancement) {
      syncSelectedFileWithDashboard();
    }

    elements.uploadFeedback.className = 'mt-4 p-3 rounded-xl text-xs font-medium bg-emerald-100 text-emerald-800 block';
    elements.uploadFeedback.textContent = `Succès ! Le fichier "${fileName}" a été importé (${rows.length} lignes, ${headers.length} colonnes) et affiché ci-dessous.`;
  }

  // Enhanced CSV / Excel File Uploader
  function handleCsvFile(file) {
    if (!file) return;

    elements.uploadFeedback.className = 'mt-4 p-3 rounded-xl text-xs font-medium bg-blue-100 text-blue-800 block';
    elements.uploadFeedback.textContent = `Lecture et analyse de ${file.name}...`;

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel && window.XLSX) {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

          if (!jsonRows || jsonRows.length < 2) {
            elements.uploadFeedback.className = 'mt-4 p-3 rounded-xl text-xs font-medium bg-rose-100 text-rose-800 block';
            elements.uploadFeedback.textContent = 'Erreur : Feuille Excel vide ou sans données.';
            return;
          }

          const rawHeader = jsonRows[0].map((c, i) => String(c).trim() || `Col_${i+1}`);
          const cleanDataRows = jsonRows.slice(1).filter(r => r.some(c => String(c).trim() !== ''));

          registerNewImportedFile(file.name, rawHeader, cleanDataRows, file.size);
        } catch (err) {
          elements.uploadFeedback.className = 'mt-4 p-3 rounded-xl text-xs font-medium bg-rose-100 text-rose-800 block';
          elements.uploadFeedback.textContent = 'Erreur lors de la lecture Excel : ' + err.message;
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    // CSV parsing via PapaParse
    Papa.parse(file, {
      delimiter: '',
      skipEmptyLines: true,
      encoding: 'latin-1',
      complete: function(results) {
        if (!results.data || results.data.length < 2) {
          elements.uploadFeedback.className = 'mt-4 p-3 rounded-xl text-xs font-medium bg-rose-100 text-rose-800 block';
          elements.uploadFeedback.textContent = 'Erreur : Le fichier CSV est vide ou sans enregistrements.';
          return;
        }

        const rawHeader = results.data[0].map((c, i) => String(c).trim() || `Col_${i+1}`);
        const cleanDataRows = results.data.slice(1).filter(r => r.some(c => String(c).trim() !== ''));

        registerNewImportedFile(file.name, rawHeader, cleanDataRows, file.size);
      },
      error: function(err) {
        elements.uploadFeedback.className = 'mt-4 p-3 rounded-xl text-xs font-medium bg-rose-100 text-rose-800 block';
        elements.uploadFeedback.textContent = 'Erreur de lecture CSV : ' + err.message;
      }
    });
  }

  // Export to Excel (.xlsx) using SheetJS
  function exportToExcel(mode) {
    if (typeof XLSX === 'undefined') {
      alert('La bibliothèque d\'export Excel n\'est pas encore chargée.');
      return;
    }

    const source = mode === 'filtered' ? state.currentFilteredList : state.data.avancement;
    const exportData = source.map(x => ({
      'Province / Préfecture': x.province,
      'Projet': x.projet,
      'Promoteur': x.promoteur,
      'Tranche': x.tranche,
      'Groupe d Habitations (GH)': x.gh,
      'Immeuble': x.imm,
      'Type': x.type,
      'Nb Appartements': x.appts_imm,
      'Permis d Habiter': x.ph_status,
      'Avancement Gros Oeuvre (%)': x.av_go,
      'Avancement Lots Secondaires (%)': x.av_ls,
      'Avancement Total General (%)': x.av_gen
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Suivi VSB');

    const filename = `Tableau_Bord_VSB_${mode === 'filtered' ? 'Filtre' : 'Complet'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  // Event Listeners Registration
  function registerEvents() {
    // Theme toggle
    elements.themeToggleBtn.addEventListener('click', toggleTheme);

    // Sidebar Mobile
    elements.openSidebarBtn.addEventListener('click', () => {
      elements.sidebar.classList.remove('-translate-x-full');
      elements.mobileOverlay.classList.remove('hidden');
    });
    elements.closeSidebarBtn.addEventListener('click', () => {
      elements.sidebar.classList.add('-translate-x-full');
      elements.mobileOverlay.classList.add('hidden');
    });
    elements.mobileOverlay.addEventListener('click', () => {
      elements.sidebar.classList.add('-translate-x-full');
      elements.mobileOverlay.classList.add('hidden');
    });

    // Nav Item Click
    elements.navItems.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        switchTab(tab);
      });
    });

    // Filters
    elements.filterProvince.addEventListener('change', e => {
      state.filters.province = e.target.value;
      state.pagination.page = 1;
      applyFilters();
    });
    elements.filterPromoteur.addEventListener('change', e => {
      state.filters.promoteur = e.target.value;
      state.pagination.page = 1;
      applyFilters();
    });
    elements.filterProjet.addEventListener('change', e => {
      state.filters.projet = e.target.value;
      updateGHFilter();
      state.pagination.page = 1;
      applyFilters();
    });
    if (elements.filterGH) {
      elements.filterGH.addEventListener('change', e => {
        state.filters.gh = e.target.value;
        state.pagination.page = 1;
        applyFilters();
      });
    }
    elements.filterPH.addEventListener('change', e => {
      state.filters.ph_status = e.target.value;
      state.pagination.page = 1;
      applyFilters();
    });
    elements.filterAvancement.addEventListener('change', e => {
      state.filters.avancement = e.target.value;
      state.pagination.page = 1;
      applyFilters();
    });
    elements.resetFiltersBtn.addEventListener('click', resetFilters);

    // Live search
    elements.quickSearchInput.addEventListener('input', e => {
      state.filters.search = e.target.value;
      state.pagination.page = 1;
      applyFilters();
    });

    // Chantiers Subfilters (Tabs)
    elements.tableTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.tableTabBtns.forEach(b => {
          b.className = 'table-tab-btn px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition';
        });
        btn.className = 'table-tab-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 transition';
        state.filters.tableSubFilter = btn.getAttribute('data-table-filter');
        state.pagination.page = 1;
        applyFilters();
      });
    });

    // Page size
    elements.pageSizeSelect.addEventListener('change', e => {
      state.pagination.pageSize = parseInt(e.target.value, 10);
      state.pagination.page = 1;
      renderChantiersTable();
    });

    // Prev / Next Page
    elements.prevPageBtn.addEventListener('click', () => {
      if (state.pagination.page > 1) {
        state.pagination.page--;
        renderChantiersTable();
      }
    });
    elements.nextPageBtn.addEventListener('click', () => {
      state.pagination.page++;
      renderChantiersTable();
    });

    // Modal
    elements.closeModalBtn.addEventListener('click', closeModal);
    elements.modalImmeuble.addEventListener('click', e => {
      if (e.target === elements.modalImmeuble) closeModal();
    });
    elements.modalPrevImmBtn.addEventListener('click', () => {
      if (state.currentModalImmIndex > 0) {
        openModalImmeuble(state.currentModalImmIndex - 1);
      }
    });
    elements.modalNextImmBtn.addEventListener('click', () => {
      if (state.currentModalImmIndex < state.currentFilteredList.length - 1) {
        openModalImmeuble(state.currentModalImmIndex + 1);
      }
    });

    // Modal Subtabs
    elements.modalSubtabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.modalSubtabBtns.forEach(b => {
          b.className = 'modal-subtab-btn pb-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200';
        });
        btn.className = 'modal-subtab-btn pb-2 text-xs font-bold border-b-2 border-emerald-600 text-emerald-600 dark:text-emerald-400';

        const subtab = btn.getAttribute('data-modal-tab');
        document.querySelectorAll('.modal-subtab-content').forEach(c => c.classList.add('hidden'));

        if (subtab === 'go') document.getElementById('modalContentGO').classList.remove('hidden');
        if (subtab === 'ls') document.getElementById('modalContentLS').classList.remove('hidden');
        if (subtab === 'vrd') document.getElementById('modalContentVRD').classList.remove('hidden');
        if (subtab === 'qualite') document.getElementById('modalContentQualite').classList.remove('hidden');
      });
    });

    // Equipements search
    if (elements.searchEquipement) {
      elements.searchEquipement.addEventListener('input', e => {
        state.equipements.search = e.target.value;
        renderEquipements();
      });
    }

    // Export & Print Buttons
    elements.printReportBtn.addEventListener('click', () => window.print());
    elements.exportExcelBtn.addEventListener('click', () => exportToExcel('filtered'));

    // Drag and drop CSV
    if (elements.dropZone) {
      elements.dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        elements.dropZone.classList.add('border-emerald-500', 'bg-emerald-50/20');
      });
      elements.dropZone.addEventListener('dragleave', e => {
        e.preventDefault();
        elements.dropZone.classList.remove('border-emerald-500', 'bg-emerald-50/20');
      });
      elements.dropZone.addEventListener('drop', e => {
        e.preventDefault();
        elements.dropZone.classList.remove('border-emerald-500', 'bg-emerald-50/20');
        if (e.dataTransfer.files.length > 0) {
          handleCsvFile(e.dataTransfer.files[0]);
        }
      });
      elements.csvFileInput.addEventListener('change', e => {
        if (e.target.files.length > 0) {
          handleCsvFile(e.target.files[0]);
        }
      });
    }

    // Data Viewer Events
    if (elements.viewerSearchInput) {
      elements.viewerSearchInput.addEventListener('input', e => {
        state.viewerPagination.search = e.target.value;
        state.viewerPagination.page = 1;
        renderFileDataViewer();
      });
    }

    if (elements.viewerPageSizeSelect) {
      elements.viewerPageSizeSelect.addEventListener('change', e => {
        state.viewerPagination.pageSize = parseInt(e.target.value, 10);
        state.viewerPagination.page = 1;
        renderFileDataViewer();
      });
    }

    if (elements.viewerPrevPageBtn) {
      elements.viewerPrevPageBtn.addEventListener('click', () => {
        if (state.viewerPagination.page > 1) {
          state.viewerPagination.page--;
          renderFileDataViewer();
        }
      });
    }

    if (elements.viewerNextPageBtn) {
      elements.viewerNextPageBtn.addEventListener('click', () => {
        state.viewerPagination.page++;
        renderFileDataViewer();
      });
    }
  }

  // ==========================================
  // SECTION: LOTS SPÉCIFIQUES & AZURE SQL SYNC
  // ==========================================

  state.importSubTab = 'sync-lot';
  state.linkedLots = {
    batiment: 'AVANCEMENT TEST CSV.csv',
    vrd: 'SUIVI_SRM_CSV.csv',
    lpee: 'LPEE CSV.csv',
    equipements: 'EQUIPEMENT PUBLIC.csv',
    checklist: 'CHECK LISTE ph CSV.csv'
  };

  // Switch Subtabs inside Import View
  function switchImportSubTab(subTabId) {
    state.importSubTab = subTabId;
    
    const btnSyncLot = document.getElementById('tabBtnSyncLot');
    const btnSyncAzure = document.getElementById('tabBtnSyncAzure');
    const btnSyncSharePoint = document.getElementById('tabBtnSyncSharePoint');
    const btnGlobalExports = document.getElementById('tabBtnGlobalExports');

    const panelSyncLot = document.getElementById('panelSyncLot');
    const panelSyncAzure = document.getElementById('panelSyncAzure');
    const panelSyncSharePoint = document.getElementById('panelSyncSharePoint');
    const panelGlobalExports = document.getElementById('panelGlobalExports');

    [btnSyncLot, btnSyncAzure, btnSyncSharePoint, btnGlobalExports].forEach(btn => {
      if (btn) {
        btn.className = 'import-subtab-btn px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center space-x-2';
      }
    });

    if (panelSyncLot) panelSyncLot.classList.add('hidden');
    if (panelSyncAzure) panelSyncAzure.classList.add('hidden');
    if (panelSyncSharePoint) panelSyncSharePoint.classList.add('hidden');
    if (panelGlobalExports) panelGlobalExports.classList.add('hidden');

    if (subTabId === 'sync-lot') {
      if (btnSyncLot) btnSyncLot.className = 'import-subtab-btn px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 transition flex items-center space-x-2';
      if (panelSyncLot) panelSyncLot.classList.remove('hidden');
    } else if (subTabId === 'sync-azure') {
      if (btnSyncAzure) btnSyncAzure.className = 'import-subtab-btn px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 transition flex items-center space-x-2';
      if (panelSyncAzure) panelSyncAzure.classList.remove('hidden');
      loadSavedAzureProfile();
      handleAzureLotChange();
      checkServerStatus();
    } else if (subTabId === 'sync-sharepoint') {
      if (btnSyncSharePoint) btnSyncSharePoint.className = 'import-subtab-btn px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 transition flex items-center space-x-2';
      if (panelSyncSharePoint) panelSyncSharePoint.classList.remove('hidden');
      loadSavedSharePointProfile();
      checkServerStatus();
    } else if (subTabId === 'global-exports') {
      if (btnGlobalExports) btnGlobalExports.className = 'import-subtab-btn px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 transition flex items-center space-x-2';
      if (panelGlobalExports) panelGlobalExports.classList.remove('hidden');
    }

    refreshLucide();
  }

  // Toast Notifications
  function showToastNotification(message, type = 'success', duration = 4000) {
    const toast = document.getElementById('toastNotification');
    if (!toast) return;

    let bg = 'bg-slate-900 text-white border-slate-700';
    let iconName = 'info';

    if (type === 'success') {
      bg = 'bg-emerald-950 text-emerald-100 border-emerald-600 shadow-emerald-950/40';
      iconName = 'check-circle-2';
    } else if (type === 'error') {
      bg = 'bg-rose-950 text-rose-100 border-rose-600 shadow-rose-950/40';
      iconName = 'alert-circle';
    } else if (type === 'info') {
      bg = 'bg-blue-950 text-blue-100 border-blue-600 shadow-blue-950/40';
      iconName = 'info';
    }

    toast.className = `fixed bottom-6 right-6 z-50 transform transition-all duration-300 translate-y-0 opacity-100 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold border ${bg}`;
    toast.innerHTML = `<i data-lucide="${iconName}" class="w-4 h-4 shrink-0"></i><span>${message}</span>`;
    refreshLucide();

    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => {
      toast.className = 'fixed bottom-6 right-6 z-50 transform transition-all duration-300 translate-y-20 opacity-0 pointer-events-none flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold border';
    }, duration);
  }

  // Refresh Source Data & Check for Updates
  function refreshSourceData() {
    const icon = document.getElementById('refreshDataIcon');
    if (icon) icon.classList.add('animate-spin');

    const apiBase = window.location.protocol.startsWith('http') ? window.location.origin : 'http://localhost:8080';

    fetch(`${apiBase}/api/refresh-sources`, { method: 'POST' })
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          reloadDatasetScript(() => {
            if (window.VSB_DATA) {
              state.data = window.VSB_DATA;
              if (window.VSB_DATA.files_registry) {
                state.filesRegistry = JSON.parse(JSON.stringify(window.VSB_DATA.files_registry));
              }
              populateFilterDropdowns();
              applyFilters();
              showToastNotification(`Données sources vérifiées et actualisées ! (${(res.total_immeubles || state.data.summary.total_immeubles).toLocaleString('fr-FR')} immeubles analysés)`, 'success');
            }
            if (icon) icon.classList.remove('animate-spin');
          });
        } else {
          reloadDatasetScript(() => {
            applyFilters();
            showToastNotification(res.message || "Tableau de bord rechargé", 'info');
            if (icon) icon.classList.remove('animate-spin');
          });
        }
      })
      .catch(() => {
        // Fallback if local API server is not running
        reloadDatasetScript(() => {
          if (window.VSB_DATA) {
            state.data = window.VSB_DATA;
            applyFilters();
          }
          showToastNotification("Données rechargées (Serveur API en veille)", 'info');
          if (icon) icon.classList.remove('animate-spin');
        });
      });
  }

  // Helper to re-inject data.js dynamically with cache busting
  function reloadDatasetScript(callback) {
    const oldScript = document.getElementById('vsbDataScript') || document.querySelector('script[src*="data.js"]');
    const newScript = document.createElement('script');
    newScript.id = 'vsbDataScript';
    newScript.src = 'data.js?t=' + Date.now();
    newScript.onload = () => {
      if (typeof callback === 'function') callback();
    };
    newScript.onerror = () => {
      if (typeof callback === 'function') callback();
    };
    if (oldScript && oldScript.parentNode) {
      oldScript.parentNode.replaceChild(newScript, oldScript);
    } else {
      document.head.appendChild(newScript);
    }
  }

  // Check Local Python Server Status
  function checkServerStatus() {
    const badge = document.getElementById('serverStatusBadge');
    if (!badge) return;

    const apiBase = window.location.protocol.startsWith('http') ? window.location.origin : 'http://localhost:8080';

    fetch(`${apiBase}/api/status`, { method: 'GET' })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'online') {
          badge.className = 'flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800';
          badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Serveur Local API Connecté (Port 8080) • ${data.odbc_driver}`;
          state.detectedOneDriveFolders = data.onedrive_folders || [];
        }
      })
      .catch(() => {
        badge.className = 'flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800';
        badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500"></span> Serveur Local en veille (Lancez start_dashboard.bat)`;
      });
  }

  // View lot data in data explorer table
  function viewLotData(lotName) {
    const targetFileName = state.linkedLots[lotName] || '';
    const reg = state.filesRegistry || {};
    let matchedId = null;

    for (const [id, f] of Object.entries(reg)) {
      if (f.name.toLowerCase() === targetFileName.toLowerCase()) {
        matchedId = id;
        break;
      }
    }

    if (matchedId) {
      selectViewerFile(matchedId);
    } else {
      if (lotName === 'batiment') selectViewerFile('file-avancement');
      else if (lotName === 'vrd') selectViewerFile('file-srm');
      else if (lotName === 'lpee') selectViewerFile('file-lpee');
      else if (lotName === 'equipements') selectViewerFile('file-equipement');
      else if (lotName === 'checklist') selectViewerFile('file-checklist-ph');
    }

    const card = document.getElementById('fileDataViewerCard');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Handle Lot file upload from local machine
  function handleLotFileSelected(event, lotName) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const feedback = document.getElementById('uploadFeedback');
    if (feedback) {
      feedback.className = 'p-3 rounded-xl text-xs font-medium bg-blue-100 text-blue-800 block';
      feedback.textContent = `Lecture et synchronisation du Lot [${lotName.toUpperCase()}] avec ${file.name}...`;
    }

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    const processData = (headers, rows) => {
      const fileId = 'file-' + lotName + '-' + Date.now();
      const lotTitles = {
        batiment: 'Chantiers (Lot Bâtiment)',
        vrd: 'Réseaux & VRD (Lot SRM)',
        lpee: 'Qualité (Lot LPEE/CID)',
        equipements: 'Équipements Publics',
        checklist: "Check-liste Permis d'Habiter (PH)"
      };

      // Register file
      state.filesRegistry[fileId] = {
        id: fileId,
        name: file.name,
        category: lotTitles[lotName] || 'Lot Métier Synchronisé',
        date: new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        size: `${(file.size / 1024).toFixed(1)} KB`,
        is_main: (lotName === 'batiment'),
        headers: headers,
        rows_count: rows.length,
        cols_count: headers.length,
        rows: rows
      };

      // Update linked lot state
      state.linkedLots[lotName] = file.name;
      const fnEl = document.getElementById(`lotFileName-${lotName}`);
      if (fnEl) fnEl.textContent = file.name;
      const bdEl = document.getElementById(`lotActiveBadge-${lotName}`);
      if (bdEl) bdEl.textContent = `${rows.length} enr.`;

      // Synchronize in-memory dataset for this lot
      if (lotName === 'batiment') {
        syncBatimentFromRows(headers, rows);
      } else if (lotName === 'vrd') {
        syncVrdFromRows(headers, rows);
      } else if (lotName === 'lpee') {
        syncLpeeFromRows(headers, rows);
      } else if (lotName === 'equipements') {
        syncEquipementsFromRows(headers, rows);
      } else if (lotName === 'checklist') {
        syncChecklistFromRows(headers, rows);
      }

      // If local server is running, also persist file to disk
      fetch('http://localhost:8080/api/save-lot-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lot: lotName,
          filename: file.name,
          headers: headers,
          rows: rows
        })
      }).catch(() => {});

      // Refresh UI
      renderImportedFilesGrid();
      selectViewerFile(fileId);
      applyFilters();

      if (feedback) {
        feedback.className = 'p-3 rounded-xl text-xs font-medium bg-emerald-100 text-emerald-800 block';
        feedback.textContent = `Succès ! Le Lot [${lotName.toUpperCase()}] a été synchronisé avec ${file.name} (${rows.length} lignes).`;
      }
    };

    if (isExcel && window.XLSX) {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: 'array' });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          if (!json || json.length < 2) return;
          const headers = json[0].map((c, i) => String(c).trim() || `Col_${i+1}`);
          const rows = json.slice(1).filter(r => r.some(c => String(c).trim() !== ''));
          processData(headers, rows);
        } catch (err) {
          console.error(err);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse(file, {
        delimiter: '',
        skipEmptyLines: true,
        encoding: 'latin-1',
        complete: function(res) {
          if (!res.data || res.data.length < 2) return;
          const headers = res.data[0].map((c, i) => String(c).trim() || `Col_${i+1}`);
          const rows = res.data.slice(1).filter(r => r.some(c => String(c).trim() !== ''));
          processData(headers, rows);
        }
      });
    }
  }

  // Lot-specific in-memory parsers
  function syncBatimentFromRows(headers, rows) {
    const findIdx = (names) => headers.findIndex(h => names.some(n => h.toLowerCase().includes(n.toLowerCase())));
    const provIdx = findIdx(['Province', 'Prefecture']);
    const projIdx = findIdx(['Projet']);
    const promIdx = findIdx(['Promoteur']);
    const immIdx = findIdx(['Imm']);
    const apptsIdx = findIdx(['Appt_Imm', 'Nmbr_Appt', 'Unite']);
    const phIdx = findIdx(['PERMIS_D_HABITER', 'PH']);
    const goIdx = findIdx(['Total_Avancement_A_50', 'Gros', 'GO']);
    const lsIdx = findIdx(['Total_Avancement_Lots_Secondaires', 'Secondaire', 'LS']);
    const genIdx = findIdx(['Total_Général', 'General', 'Global']);

    const parsed = [];
    rows.forEach((r, idx) => {
      const imm = immIdx >= 0 ? String(r[immIdx] || '').trim() : `IMM-${idx+1}`;
      if (!imm) return;
      const prov = provIdx >= 0 ? String(r[provIdx] || '').trim() : 'CASABLANCA';
      const proj = projIdx >= 0 ? String(r[projIdx] || '').trim() : 'PROJET VSB';
      const prom = promIdx >= 0 ? String(r[promIdx] || '').trim() : 'PROMOTEUR';
      const ph = phIdx >= 0 ? String(r[phIdx] || '').trim().toUpperCase() : 'NON OBTENU';
      const av_go = goIdx >= 0 ? parseFloat(String(r[goIdx] || '0').replace('%', '').replace(',', '.')) || 0 : 0;
      const av_ls = lsIdx >= 0 ? parseFloat(String(r[lsIdx] || '0').replace('%', '').replace(',', '.')) || 0 : 0;
      const av_gen = genIdx >= 0 ? parseFloat(String(r[genIdx] || '0').replace('%', '').replace(',', '.')) || 0 : 0;
      const appts = apptsIdx >= 0 ? parseInt(String(r[apptsIdx] || '0').replace(/[^0-9]/g, ''), 10) || 0 : 0;

      parsed.push({
        id: idx + 1,
        province: prov === 'HAY_HASSANI' ? 'HAY HASSANI' : prov,
        projet: proj,
        promoteur: prom,
        tranche: '',
        gh: '',
        imm: imm,
        type: '',
        appts_imm: appts,
        ph_status: (ph.includes('OBTENU') && !ph.includes('NON')) ? 'OBTENU' : 'NON OBTENU',
        av_go: Math.round(av_go),
        av_ls: Math.round(av_ls),
        av_gen: Math.round(av_gen),
        go: {},
        ls: {},
        vrd: {},
        qualite: {}
      });
    });

    if (parsed.length > 0) {
      state.data.avancement = parsed;
    }
  }

  function syncVrdFromRows(headers, rows) {
    const list = rows.map((r, idx) => ({
      id: idx + 1,
      province: String(r[0] || '').trim(),
      promoteur: String(r[1] || '').trim(),
      projet: String(r[2] || '').trim(),
      gh: String(r[3] || '').trim(),
      unites: parseInt(String(r[4] || '0').replace(/[^0-9]/g, ''), 10) || 0,
      ref_dossier: String(r[5] || '').trim(),
      elec_statut: String(r[6] || '').trim(),
      elec_date: String(r[7] || '').trim(),
      elec_blocage: String(r[8] || '').trim(),
      eau_statut: String(r[9] || '').trim(),
      eau_date: String(r[10] || '').trim(),
      eau_blocage: String(r[11] || '').trim(),
      assain_pluvial: String(r[12] || '').trim(),
      assain_usees: String(r[13] || '').trim(),
      assain_date: String(r[14] || '').trim(),
      assain_blocage: String(r[15] || '').trim(),
      dependance: String(r[16] || '').trim(),
      date_dispo: String(r[17] || '').trim(),
      commentaire: String(r[18] || '').trim(),
    }));
    state.data.srm = list;
  }

  function syncLpeeFromRows(headers, rows) {
    const list = rows.map((r, idx) => ({
      id: idx + 1,
      province: String(r[0] || '').trim(),
      gerant: String(r[1] || '').trim(),
      promoteur: String(r[2] || '').trim(),
      projet: String(r[3] || '').trim(),
      gh: String(r[4] || '').trim(),
      unites_aut: parseInt(String(r[5] || '0').replace(/[^0-9]/g, ''), 10) || 0,
      unites_liv: parseInt(String(r[6] || '0').replace(/[^0-9]/g, ''), 10) || 0,
      date_ph: String(r[7] || '').trim(),
      completude: String(r[10] || 'Complet').trim(),
      go_lpee: String(r[12] || 'Réalisé').trim(),
      go_lpee_res: String(r[14] || '').trim(),
      etancheite: String(r[20] || '').trim(),
      electricite: String(r[24] || '').trim(),
      plomberie: String(r[28] || '').trim(),
      revetement: String(r[36] || '').trim(),
      peinture: String(r[40] || '').trim(),
    }));
    state.data.lpee = list;
  }

  function syncEquipementsFromRows(headers, rows) {
    const list = rows.map((r, idx) => {
      const stRaw = String(r[5] || '').trim();
      let stNorm = 'En cours';
      if (stRaw.toUpperCase().includes('NON DEMARRE')) stNorm = 'Non démarré';
      else if (stRaw.toUpperCase().includes('ACHEVE') || stRaw.toUpperCase().includes('LIVRE')) stNorm = 'Achevé / Livré';

      return {
        id: idx + 1,
        province: String(r[0] || '').trim(),
        promoteur: String(r[1] || '').trim(),
        projet: String(r[2] || '').trim(),
        equipement: String(r[3] || '').trim(),
        tranche: String(r[4] || '').trim(),
        statut_raw: stRaw,
        statut: stNorm,
        avancement: parseFloat(String(r[6] || '0').replace('%', '').replace(',', '.')) || 0,
        date_cible: String(r[7] || '').trim(),
        observations: String(r[8] || '').trim(),
      };
    });
    state.data.equipements = list;
  }

  function syncChecklistFromRows(headers, rows) {
    if (!rows || rows.length === 0) return;

    const findIdx = (names) => headers.findIndex(h => names.some(n => String(h).toLowerCase().includes(n.toLowerCase())));
    const amiIdx = findIdx(['num_ami', 'n° ami', 'ami']);
    const projIdx = findIdx(['projet']);
    const ghIdx = findIdx(['gh', 'tranche']);
    const rokhasIdx = findIdx(['permis_d_habiter', 'rokhas', 'permis']);
    const archiIdx = findIdx(['attestation_d_achèvement_archi', 'achèvement', 'archi']);
    const betIdx = findIdx(['attestation_de_stabilité_et_de_conformité_bet', 'stabilité_bet', 'bet']);
    const bctIdx = findIdx(['attestation_de_stabilité_et_de_conformité_bct', 'stabilité_bct', 'bct']);
    const etanchIdx = findIdx(['etanchéité', 'etancheite', 'lot_etanchéité']);
    const laboIdx = findIdx(['laboratoire', 'labo', 'rapport_de_synthèse']);

    function inspectCell(val) {
      const v = (val || '').toString().trim();
      if (!v || v === '-' || v.toLowerCase() === 'non') {
        return { status: 'Non', filled: false, has_link: false, link: '', label: 'Non fourni' };
      }
      const hasLink = v.startsWith('http://') || v.startsWith('https://') || v.includes('sharepoint.com') || v.startsWith('//');
      return { status: 'Oui', filled: true, has_link: hasLink, link: hasLink ? v : '', label: 'Oui' };
    }

    const items = [];
    let stat_rokhas = 0;
    let stat_archi = 0;
    let stat_bet = 0;
    let stat_bct = 0;
    let stat_etancheite = 0;
    let stat_labo = 0;
    let total_docs_filled = 0;
    const projetsSet = new Set();

    rows.forEach((r, idx) => {
      const num_ami = (amiIdx >= 0 && r[amiIdx]) ? String(r[amiIdx]).trim() : (r[0] ? String(r[0]).trim() : '');
      let projet = (projIdx >= 0 && r[projIdx]) ? String(r[projIdx]).trim() : (r[1] ? String(r[1]).trim() : '');
      if (!projet) projet = `Projet ${idx + 1}`;
      const gh = (ghIdx >= 0 && r[ghIdx]) ? String(r[ghIdx]).trim() : (r[2] ? String(r[2]).trim() : 'Général');

      projetsSet.add(projet);

      const rokhasVal = rokhasIdx >= 0 ? r[rokhasIdx] : (r.length > 5 ? r[5] : '');
      const archiVal = archiIdx >= 0 ? r[archiIdx] : (r.length > 6 ? r[6] : '');
      const betVal = betIdx >= 0 ? r[betIdx] : (r.length > 7 ? r[7] : '');
      const bctVal = bctIdx >= 0 ? r[bctIdx] : (r.length > 8 ? r[8] : '');
      const etanchVal = etanchIdx >= 0 ? r[etanchIdx] : (r.length > 9 ? r[9] : '');
      const laboVal = laboIdx >= 0 ? r[laboIdx] : (r.length > 10 ? r[10] : '');

      const rokhas = inspectCell(rokhasVal);
      const archi = inspectCell(archiVal);
      const bet = inspectCell(betVal);
      const bct = inspectCell(bctVal);
      const etancheite = inspectCell(etanchVal);
      const labo = inspectCell(laboVal);

      let filledCount = 0;
      if (rokhas.filled) { filledCount++; stat_rokhas++; }
      if (archi.filled) { filledCount++; stat_archi++; }
      if (bet.filled) { filledCount++; stat_bet++; }
      if (bct.filled) { filledCount++; stat_bct++; }
      if (etancheite.filled) { filledCount++; stat_etancheite++; }
      if (labo.filled) { filledCount++; stat_labo++; }

      total_docs_filled += filledCount;
      const pct = Math.round((filledCount / 6.0) * 1000) / 10;

      items.push({
        id: idx + 1,
        num_ami: num_ami,
        projet: projet,
        gh: gh,
        Permis_d_habiter_via_rokhas: rokhas,
        Attestation_d_achèvement_Archi: archi,
        Attestation_de_stabilité_et_de_conformité_BET: bet,
        Attestation_de_stabilité_et_de_conformité_BCT: bct,
        Attestation_de_conformité_de_lot_Etanchéité_BCT: etancheite,
        Rapport_de_synthèse_de_laboratoire: labo,
        total_docs_dispos: filledCount,
        total_docs_requis: 6,
        completude_pct: pct,
        is_complete: (filledCount === 6)
      });
    });

    const totalPossible = items.length * 6;
    const tauxGlobal = totalPossible > 0 ? (Math.round((total_docs_filled / totalPossible * 100) * 10) / 10) : 0;

    const summary = {
      total_lignes: items.length,
      total_projets: projetsSet.size,
      total_docs_requis: totalPossible,
      total_docs_dispos: total_docs_filled,
      taux_global_completude: tauxGlobal,
      stat_rokhas: stat_rokhas,
      stat_archi: stat_archi,
      stat_bet: stat_bet,
      stat_bct: stat_bct,
      stat_etancheite: stat_etancheite,
      stat_labo: stat_labo
    };

    if (!state.data) state.data = {};
    state.data.checklist_ph = {
      rows: items,
      summary: summary
    };

    // Update UI badges
    const badgeSidebar = document.getElementById('badgeChecklistPh');
    if (badgeSidebar) badgeSidebar.textContent = `${items.length} tranches`;
    const lotBadge = document.getElementById('lotActiveBadge-checklist');
    if (lotBadge) lotBadge.textContent = `${items.length} tranches`;

    // Force repopulation of project dropdown
    const projSelect = document.getElementById('checklistPhFilterProjet');
    if (projSelect) delete projSelect.dataset.populatedCount;
    populateChecklistPhFilterProjets(items);
    updateChecklistPhFilterGH(items, 'all');

    renderChecklistPh();
  }

  // Azure SQL Database Functions
  function testAzureConnection() {
    const server = document.getElementById('azureServer').value.trim();
    const database = document.getElementById('azureDatabase').value.trim();
    const username = document.getElementById('azureUsername').value.trim();
    const password = document.getElementById('azurePassword').value;
    const encrypt = document.getElementById('azureEncrypt').checked;
    const trust_cert = document.getElementById('azureTrustCert').checked;
    const fb = document.getElementById('azureFeedback');

    if (!server || !database || !username || !password) {
      alert("Veuillez renseigner le serveur, la base de données, l'identifiant et le mot de passe Azure SQL.");
      return;
    }

    fb.className = 'p-4 rounded-xl text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 block border border-blue-200 dark:border-blue-800';
    fb.innerHTML = `
      <div class="flex items-center space-x-2">
        <span class="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
        <span class="font-bold">Connexion en cours à Azure SQL Database (${server})...</span>
      </div>
    `;

    fetch('http://localhost:8080/api/azure-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ server, database, username, password, encrypt, trust_cert })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        fb.className = 'p-4 rounded-xl text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 block border border-emerald-300 dark:border-emerald-800';
        let tableList = '';
        if (data.tables && data.tables.length > 0) {
          const selectEl = document.getElementById('azureTableSelect');
          const selectContainer = document.getElementById('azureTableSelectContainer');
          if (selectEl && selectContainer) {
            selectEl.innerHTML = '<option value="">-- Choisir une table détectée dans Azure SQL --</option>';
            data.tables.forEach(t => {
              const val = typeof t === 'object' ? (t.escaped || t.name) : t;
              const label = typeof t === 'object' ? (t.display || t.name) : t;
              const opt = document.createElement('option');
              opt.value = val;
              opt.textContent = label;
              selectEl.appendChild(opt);
            });
            selectContainer.classList.remove('hidden');
          }

          tableList = `
            <div class="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-800 text-[11px]">
              <div class="flex items-center justify-between mb-1.5">
                <strong class="text-emerald-900 dark:text-emerald-200">Tables & Vues disponibles dans Azure (${data.tables.length}) :</strong>
                <span class="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">(Cliquez pour sélectionner)</span>
              </div>
              <div class="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-white/70 dark:bg-slate-900/70 rounded-xl border border-emerald-200 dark:border-emerald-700/60">
                ${data.tables.map(t => {
                  const val = typeof t === 'object' ? (t.escaped || t.name) : t;
                  const label = typeof t === 'object' ? t.name : t;
                  const schema = typeof t === 'object' && t.schema ? t.schema : '';
                  const safeVal = String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                  return `<button type="button" onclick="window.selectAzureTable('${safeVal}')" class="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 text-slate-800 dark:text-slate-200 font-mono text-[11px] font-semibold transition hover:scale-105 active:scale-95 text-left cursor-pointer shadow-xs">
                    ${schema ? `<span class="text-slate-400 text-[10px] mr-1">${schema}.</span>` : ''}${label}
                  </button>`;
                }).join('')}
              </div>
            </div>
          `;
        }
        fb.innerHTML = `
          <div class="flex items-center space-x-2 font-bold text-sm">
            <span>✅ Connexion réussie à Azure SQL Database !</span>
          </div>
          <p class="mt-1">Le serveur répond correctement sur le port 1433 via le pilote ODBC SQL Server.</p>
          ${tableList}
        `;
        refreshLucide();
      } else {
        fb.className = 'p-4 rounded-xl text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 block border border-rose-300 dark:border-rose-800';
        fb.innerHTML = `
          <div class="font-bold text-sm">❌ Échec de la connexion à Azure SQL Database</div>
          <p class="mt-1 font-mono">${data.message || data.error}</p>
          <div class="mt-2 text-[11px] text-slate-600 dark:text-slate-400">
            <strong>Points de vérification :</strong>
            <ul class="list-disc list-inside mt-0.5 space-y-0.5">
              <li>Vérifiez dans le portail Azure que le <em>Pare-feu Azure SQL</em> autorise votre adresse IP client.</li>
              <li>Vérifiez l'orthographe du nom du serveur (terminé par <code>.database.windows.net</code>).</li>
              <li>Cochez l'option <em>TrustServerCertificate</em> si nécessaire.</li>
            </ul>
          </div>
        `;
      }
    })
    .catch(err => {
      fb.className = 'p-4 rounded-xl text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 block border border-amber-300 dark:border-amber-800';
      fb.innerHTML = `
        <div class="font-bold text-sm">⚠️ Impossible de joindre l'API locale du serveur</div>
        <p class="mt-1">Assurez-vous que le serveur local est actif. Lancez <code>start_dashboard.bat</code> ou tapez <code>python server.py</code> dans le terminal.</p>
      `;
    });
  }

  // Azure SQL Helpers
  function handleAzureLotChange() {
    const lot = document.getElementById('azureLotSelect') ? document.getElementById('azureLotSelect').value : 'batiment';
    const lotFiles = {
      batiment: 'AVANCEMENT TEST CSV.csv',
      vrd: 'SUIVI_SRM_CSV.csv',
      lpee: 'LPEE CSV.csv',
      equipements: 'EQUIPEMENT PUBLIC.csv',
      checklist: 'CHECK LISTE ph CSV.csv'
    };
    const targetName = lotFiles[lot] || 'AVANCEMENT TEST CSV.csv';
    const targetEl = document.getElementById('azureTargetFileName');
    if (targetEl) targetEl.textContent = targetName;
  }

  function toggleAzureDestMode() {
    const destSourceRadio = document.getElementById('azureDestModeSource');
    const isCustom = destSourceRadio ? !destSourceRadio.checked : false;
    const customContainer = document.getElementById('azureCustomFileContainer');
    const sourceInfo = document.getElementById('azureSourceFileInfo');
    if (customContainer) customContainer.classList.toggle('hidden', !isCustom);
    if (sourceInfo) sourceInfo.classList.toggle('hidden', isCustom);
  }

  function selectAzureTable(tableName) {
    if (!tableName) return;
    const input = document.getElementById('azureQuery');
    if (input) {
      input.value = tableName;
      input.classList.add('ring-2', 'ring-emerald-500', 'bg-emerald-50', 'dark:bg-emerald-950/40');
      setTimeout(() => {
        input.classList.remove('ring-2', 'ring-emerald-500', 'bg-emerald-50', 'dark:bg-emerald-950/40');
      }, 1500);
    }
    const selectEl = document.getElementById('azureTableSelect');
    if (selectEl && selectEl.value !== tableName) {
      selectEl.value = tableName;
    }

    // Auto-detect corresponding lot if identifiable
    const lower = tableName.toLowerCase();
    const lotSelect = document.getElementById('azureLotSelect');
    if (lotSelect) {
      if (lower.includes('avancement') || lower.includes('batiment')) {
        lotSelect.value = 'batiment';
      } else if (lower.includes('srm') || lower.includes('vrd')) {
        lotSelect.value = 'vrd';
      } else if (lower.includes('lpee') || lower.includes('cid')) {
        lotSelect.value = 'lpee';
      } else if (lower.includes('equipement') || lower.includes('public')) {
        lotSelect.value = 'equipements';
      }
      handleAzureLotChange();
    }
  }

  function syncAzureDatabase() {
    const server = document.getElementById('azureServer').value.trim();
    const database = document.getElementById('azureDatabase').value.trim();
    const username = document.getElementById('azureUsername').value.trim();
    const password = document.getElementById('azurePassword').value;
    const query = document.getElementById('azureQuery').value.trim();
    const lot = document.getElementById('azureLotSelect').value;
    const encrypt = document.getElementById('azureEncrypt').checked;
    const trust_cert = document.getElementById('azureTrustCert').checked;
    const destSourceRadio = document.getElementById('azureDestModeSource');
    const target_mode = (destSourceRadio && destSourceRadio.checked) ? 'existing_source' : 'custom_file';
    let filename = document.getElementById('azureFilename').value.trim() || 'AVANCEMENT_AZURE_SYNC.csv';
    const fb = document.getElementById('azureFeedback');

    if (!server || !database || !username || !password || !query) {
      alert("Veuillez remplir tous les champs obligatoires (Serveur, Base, Utilisateur, Mot de passe, Table/Requête).");
      return;
    }

    if (!filename.endsWith('.csv')) filename += '.csv';

    fb.className = 'p-4 rounded-xl text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 block border border-blue-200 dark:border-blue-800';
    fb.innerHTML = `
      <div class="flex items-center space-x-2">
        <span class="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
        <span class="font-bold">Connexion à Azure SQL et vérification des nouvelles données en cours...</span>
      </div>
    `;

    const apiBase = window.location.protocol.startsWith('http') ? window.location.origin : 'http://localhost:8080';

    fetch(`${apiBase}/api/azure-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        server, database, username, password,
        table_or_query: query,
        filename, lot, target_mode, encrypt, trust_cert
      })
    })
    .then(res => res.json())
    .then(res => {
      if (res.success && res.data) {
        const d = res.data;
        const newRowsText = d.new_rows_detected > 0 
          ? `<span class="px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 font-bold">+${d.new_rows_detected} nouvelles données ajoutées</span>`
          : `<span class="text-slate-500">Données à jour (aucune ligne manquante)</span>`;

        fb.className = 'p-4 rounded-xl text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 block border border-emerald-300 dark:border-emerald-800';
        fb.innerHTML = `
          <div class="flex items-center justify-between font-bold text-sm">
            <span class="flex items-center gap-1.5"><i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-600"></i> Synchronisation Azure SQL Réussie !</span>
            ${newRowsText}
          </div>
          <div class="mt-2 space-y-1 text-[11px]">
            <p><strong>Fichier source mis à jour :</strong> <code class="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded text-emerald-700 dark:text-emerald-300">${d.filename}</code></p>
            <p><strong>Total enregistrements SQL :</strong> ${d.rows_count.toLocaleString('fr-FR')} lignes • ${d.cols_count} colonnes (auparavant ${d.previous_rows.toLocaleString('fr-FR')} lignes)</p>
            <p><strong>Lot associé :</strong> Lot ${d.lot.toUpperCase()} mis à jour dans le tableau de bord.</p>
          </div>
        `;

        saveAzureProfile();
        // Refresh dataset and re-render dashboard
        refreshSourceData();
        showToastNotification(`Azure SQL : ${d.rows_count} lignes synchronisées vers ${d.filename} (${d.new_rows_detected >= 0 ? '+' : ''}${d.new_rows_detected} nouvelles données)`, 'success');
      } else {
        fb.className = 'p-4 rounded-xl text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 block border border-rose-300 dark:border-rose-800';
        fb.innerHTML = `
          <div class="font-bold text-sm">❌ Erreur lors de l'importation Azure SQL</div>
          <p class="mt-1 font-mono">${res.error || 'Erreur inconnue'}</p>
        `;
      }
      refreshLucide();
    })
    .catch(err => {
      fb.className = 'p-4 rounded-xl text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 block border border-amber-300 dark:border-amber-800';
      fb.innerHTML = `
        <div class="font-bold text-sm">⚠️ Erreur de communication avec l'API locale</div>
        <p class="mt-1">${err.message}. Vérifiez que le serveur <code>python server.py</code> est lancé.</p>
      `;
      refreshLucide();
    });
  }

  function saveAzureProfile() {
    const profile = {
      server: document.getElementById('azureServer').value.trim(),
      database: document.getElementById('azureDatabase').value.trim(),
      username: document.getElementById('azureUsername').value.trim(),
      query: document.getElementById('azureQuery').value.trim(),
      filename: document.getElementById('azureFilename').value.trim(),
      lot: document.getElementById('azureLotSelect').value
    };
    localStorage.setItem('vsb_azure_profile', JSON.stringify(profile));
  }

  function loadSavedAzureProfile() {
    try {
      const saved = localStorage.getItem('vsb_azure_profile');
      if (saved) {
        const p = JSON.parse(saved);
        if (p.server) document.getElementById('azureServer').value = p.server;
        if (p.database) document.getElementById('azureDatabase').value = p.database;
        if (p.username) document.getElementById('azureUsername').value = p.username;
        if (p.query) document.getElementById('azureQuery').value = p.query;
        if (p.filename) document.getElementById('azureFilename').value = p.filename;
        if (p.lot) document.getElementById('azureLotSelect').value = p.lot;
      }
    } catch (e) {}
  }

  function loadDemoAzureProfile() {
    document.getElementById('azureServer').value = 'vsb-server.database.windows.net';
    document.getElementById('azureDatabase').value = 'VSB_DATABASE_PROD';
    document.getElementById('azureUsername').value = 'vsb_admin';
    document.getElementById('azurePassword').value = 'DemoP@ssw0rd2026';
    document.getElementById('azureQuery').value = 'VW_SUIVI_CHANTIERS_VSB';
    document.getElementById('azureFilename').value = 'AVANCEMENT_AZURE_CHANTIERS.csv';
    document.getElementById('azureLotSelect').value = 'batiment';
    handleAzureLotChange();
  }

  // ==========================================
  // SECTION: CONNECTEUR MICROSOFT SHAREPOINT
  // ==========================================
  state.sharePointMode = 'local_folder';

  function switchSharePointMode(mode) {
    state.sharePointMode = mode;
    const btnLocal = document.getElementById('spModeBtnLocal');
    const btnUrl = document.getElementById('spModeBtnUrl');
    const btnGraph = document.getElementById('spModeBtnGraph');

    const panelLocal = document.getElementById('spModePanelLocal');
    const panelUrl = document.getElementById('spModePanelUrl');
    const panelGraph = document.getElementById('spModePanelGraph');

    [btnLocal, btnUrl, btnGraph].forEach(b => {
      if (b) b.className = 'sp-mode-btn px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1.5';
    });

    if (panelLocal) panelLocal.classList.add('hidden');
    if (panelUrl) panelUrl.classList.add('hidden');
    if (panelGraph) panelGraph.classList.add('hidden');

    if (mode === 'local_folder') {
      if (btnLocal) btnLocal.className = 'sp-mode-btn px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white font-bold transition flex items-center gap-1.5';
      if (panelLocal) panelLocal.classList.remove('hidden');
    } else if (mode === 'direct_url') {
      if (btnUrl) btnUrl.className = 'sp-mode-btn px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white font-bold transition flex items-center gap-1.5';
      if (panelUrl) panelUrl.classList.remove('hidden');
    } else if (mode === 'graph_api') {
      if (btnGraph) btnGraph.className = 'sp-mode-btn px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white font-bold transition flex items-center gap-1.5';
      if (panelGraph) panelGraph.classList.remove('hidden');
    }

    refreshLucide();
  }

  function loadDetectedOneDriveFolder() {
    const folders = state.detectedOneDriveFolders || [];
    const input = document.getElementById('spFolderPath');
    if (folders.length > 0 && input) {
      // Prioritize specific project subfolders like CIE VS PR 26
      const best = folders.find(f => f.includes('CIE') || f.includes('VSB') || f.includes('PR')) || folders[0];
      input.value = best;
      scanSharePointFolder();
    } else {
      // Query server status
      const apiBase = window.location.protocol.startsWith('http') ? window.location.origin : 'http://localhost:8080';
      fetch(`${apiBase}/api/status`)
        .then(r => r.json())
        .then(d => {
          if (d.onedrive_folders && d.onedrive_folders.length > 0) {
            state.detectedOneDriveFolders = d.onedrive_folders;
            const best = d.onedrive_folders.find(f => f.includes('CIE') || f.includes('VSB')) || d.onedrive_folders[0];
            if (input) input.value = best;
            scanSharePointFolder();
          } else {
            alert("Aucun dossier OneDrive synchronisé n'a été automatiquement détecté sur votre session.");
          }
        })
        .catch(() => alert("Le serveur local n'est pas actif pour détecter le dossier OneDrive."));
    }
  }

  function saveSharePointProfile() {
    const profile = {
      mode: state.sharePointMode || 'local_folder',
      folderPath: document.getElementById('spFolderPath') ? document.getElementById('spFolderPath').value.trim() : '',
      directUrl: document.getElementById('spDirectUrl') ? document.getElementById('spDirectUrl').value.trim() : '',
      tenantId: document.getElementById('spTenantId') ? document.getElementById('spTenantId').value.trim() : '',
      clientId: document.getElementById('spClientId') ? document.getElementById('spClientId').value.trim() : '',
      lot: document.getElementById('spLotSelect') ? document.getElementById('spLotSelect').value : 'batiment'
    };
    localStorage.setItem('vsb_sharepoint_profile', JSON.stringify(profile));
    showToastNotification("Profil SharePoint sauvegardé dans le navigateur !", 'success');
  }

  function loadSavedSharePointProfile() {
    try {
      const saved = localStorage.getItem('vsb_sharepoint_profile');
      if (saved) {
        const p = JSON.parse(saved);
        if (p.mode) switchSharePointMode(p.mode);
        if (p.folderPath && document.getElementById('spFolderPath')) document.getElementById('spFolderPath').value = p.folderPath;
        if (p.directUrl && document.getElementById('spDirectUrl')) document.getElementById('spDirectUrl').value = p.directUrl;
        if (p.tenantId && document.getElementById('spTenantId')) document.getElementById('spTenantId').value = p.tenantId;
        if (p.clientId && document.getElementById('spClientId')) document.getElementById('spClientId').value = p.clientId;
        if (p.lot && document.getElementById('spLotSelect')) document.getElementById('spLotSelect').value = p.lot;
      } else {
        // Default to detected folder if available
        if (state.detectedOneDriveFolders && state.detectedOneDriveFolders.length > 0) {
          const input = document.getElementById('spFolderPath');
          if (input && !input.value) {
            input.value = state.detectedOneDriveFolders.find(f => f.includes('CIE')) || state.detectedOneDriveFolders[0];
          }
        }
      }
    } catch (e) {}
  }

  function scanSharePointFolder() {
    testSharePointConnection();
  }

  function testSharePointConnection() {
    const mode = state.sharePointMode || 'local_folder';
    const folder_path = document.getElementById('spFolderPath') ? document.getElementById('spFolderPath').value.trim() : '';
    const file_url = document.getElementById('spDirectUrl') ? document.getElementById('spDirectUrl').value.trim() : '';
    const tenant_id = document.getElementById('spTenantId') ? document.getElementById('spTenantId').value.trim() : '';
    const client_id = document.getElementById('spClientId') ? document.getElementById('spClientId').value.trim() : '';
    const client_secret = document.getElementById('spClientSecret') ? document.getElementById('spClientSecret').value : '';
    const fb = document.getElementById('sharePointFeedback');
    const tbody = document.getElementById('spFilesTableBody');
    const countBadge = document.getElementById('spFilesCountBadge');

    if (fb) {
      fb.className = 'p-4 rounded-xl text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 block border border-indigo-200 dark:border-indigo-800';
      fb.innerHTML = `
        <div class="flex items-center space-x-2">
          <span class="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></span>
          <span class="font-bold">Connexion à SharePoint et scan des fichiers en cours...</span>
        </div>
      `;
    }

    const apiBase = window.location.protocol.startsWith('http') ? window.location.origin : 'http://localhost:8080';

    fetch(`${apiBase}/api/sharepoint-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, folder_path, file_url, tenant_id, client_id, client_secret })
    })
    .then(r => r.json())
    .then(res => {
      if (res.success) {
        if (fb) {
          fb.className = 'p-4 rounded-xl text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 block border border-emerald-300 dark:border-emerald-800';
          fb.innerHTML = `
            <div class="font-bold text-sm">🎉 Connexion SharePoint Réussie !</div>
            <p class="mt-1">${res.message}</p>
          `;
        }

        const files = res.files || [];
        if (countBadge) countBadge.textContent = `${files.length} fichier(s) détecté(s)`;

        if (tbody) {
          if (files.length === 0) {
            tbody.innerHTML = `
              <tr>
                <td colspan="6" class="px-3 py-4 text-center text-slate-400">
                  Aucun fichier compatible (.csv, .xlsx, .xlsm, .pdf) trouvé dans cet emplacement.
                </td>
              </tr>
            `;
          } else {
            tbody.innerHTML = files.map(f => {
              const safePath = encodeURIComponent(f.path);
              const isExcel = f.type.includes('XLS');
              const typeBadge = isExcel
                ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">EXCEL</span>`
                : (f.type.includes('CSV') 
                  ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">CSV</span>`
                  : `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">${f.type}</span>`);

              return `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <td class="px-3 py-2 font-semibold text-slate-800 dark:text-slate-200">
                    <div class="flex items-center gap-1.5">
                      <i data-lucide="file-spreadsheet" class="w-3.5 h-3.5 text-indigo-500 shrink-0"></i>
                      <span class="truncate max-w-xs" title="${f.name}">${f.name}</span>
                    </div>
                  </td>
                  <td class="px-3 py-2">${typeBadge}</td>
                  <td class="px-3 py-2 text-slate-500">${f.size}</td>
                  <td class="px-3 py-2 text-slate-500">${f.modified}</td>
                  <td class="px-3 py-2">
                    <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      ${f.suggested_lot ? f.suggested_lot.toUpperCase() : 'GÉNÉRAL'}
                    </span>
                  </td>
                  <td class="px-3 py-2 text-right">
                    <button type="button" onclick="window.syncSpecificSharePointFile('${safePath}', '${f.suggested_lot}')" class="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shadow transition">
                      Synchroniser
                    </button>
                  </td>
                </tr>
              `;
            }).join('');
          }
        }
        refreshLucide();
      } else {
        if (fb) {
          fb.className = 'p-4 rounded-xl text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 block border border-rose-300 dark:border-rose-800';
          fb.innerHTML = `
            <div class="font-bold text-sm">❌ Erreur de Connexion SharePoint</div>
            <p class="mt-1">${res.message || 'Impossible d\'accéder à cet emplacement SharePoint.'}</p>
          `;
        }
      }
    })
    .catch(err => {
      if (fb) {
        fb.className = 'p-4 rounded-xl text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 block border border-amber-300 dark:border-amber-800';
        fb.innerHTML = `
          <div class="font-bold text-sm">⚠️ Erreur API locale</div>
          <p class="mt-1">${err.message}. Lancez <code>start_dashboard.bat</code> pour activer le serveur local.</p>
        `;
      }
    });
  }

  function syncSharePointData() {
    const mode = state.sharePointMode || 'local_folder';
    let source_path = '';
    if (mode === 'local_folder') {
      source_path = document.getElementById('spFolderPath') ? document.getElementById('spFolderPath').value.trim() : '';
    } else if (mode === 'direct_url') {
      source_path = document.getElementById('spDirectUrl') ? document.getElementById('spDirectUrl').value.trim() : '';
    }

    if (!source_path) {
      alert("Veuillez d'abord spécifier un chemin de dossier ou une URL SharePoint valide.");
      return;
    }

    const lot = document.getElementById('spLotSelect') ? document.getElementById('spLotSelect').value : 'batiment';
    syncSpecificSharePointFile(encodeURIComponent(source_path), lot);
  }

  function syncSpecificSharePointFile(encodedPath, lot) {
    const decodedPath = decodeURIComponent(encodedPath);
    const targetLot = lot || (document.getElementById('spLotSelect') ? document.getElementById('spLotSelect').value : 'batiment');
    const fb = document.getElementById('sharePointFeedback');

    if (fb) {
      fb.className = 'p-4 rounded-xl text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 block border border-indigo-200 dark:border-indigo-800';
      fb.innerHTML = `
        <div class="flex items-center space-x-2">
          <span class="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></span>
          <span class="font-bold">Téléchargement et conversion des données SharePoint pour le Lot ${targetLot.toUpperCase()}...</span>
        </div>
      `;
    }

    const apiBase = window.location.protocol.startsWith('http') ? window.location.origin : 'http://localhost:8080';

    fetch(`${apiBase}/api/sharepoint-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: state.sharePointMode || 'local_folder',
        source_path: decodedPath,
        lot: targetLot
      })
    })
    .then(r => r.json())
    .then(res => {
      if (res.success && res.data) {
        const d = res.data;
        if (fb) {
          fb.className = 'p-4 rounded-xl text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 block border border-emerald-300 dark:border-emerald-800';
          fb.innerHTML = `
            <div class="font-bold text-sm">🎉 Fichier SharePoint Synchronisé avec Succès !</div>
            <div class="mt-2 space-y-1 text-[11px]">
              <p><strong>Fichier source mis à jour :</strong> <code class="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded text-emerald-700 dark:text-emerald-300">${d.filename}</code></p>
              <p><strong>Données importées :</strong> ${d.rows_count.toLocaleString('fr-FR')} lignes • ${d.cols_count} colonnes (${d.new_rows_detected >= 0 ? '+' : ''}${d.new_rows_detected} lignes)</p>
              <p><strong>Lot associé :</strong> Lot ${d.lot.toUpperCase()} synchronisé avec le tableau de bord.</p>
            </div>
          `;
        }

        refreshSourceData();
        showToastNotification(`SharePoint : ${d.rows_count} lignes synchronisées vers ${d.filename} !`, 'success');
      } else {
        if (fb) {
          fb.className = 'p-4 rounded-xl text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 block border border-rose-300 dark:border-rose-800';
          fb.innerHTML = `
            <div class="font-bold text-sm">❌ Erreur lors de la synchronisation SharePoint</div>
            <p class="mt-1">${res.error || 'Erreur inconnue'}</p>
          `;
        }
      }
      refreshLucide();
    })
    .catch(err => {
      if (fb) {
        fb.className = 'p-4 rounded-xl text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 block border border-amber-300 dark:border-amber-800';
        fb.innerHTML = `
          <div class="font-bold text-sm">⚠️ Erreur de communication API</div>
          <p class="mt-1">${err.message}</p>
        `;
      }
    });
  }

  // Global exposed helpers
  window.switchTab = switchTab;
  window.openModalImmeuble = openModalImmeuble;
  window.closeModal = closeModal;
  window.exportToExcel = exportToExcel;
  window.printReport = () => window.print();

  window.switchImportSubTab = switchImportSubTab;
  window.handleLotFileSelected = handleLotFileSelected;
  window.viewLotData = viewLotData;
  window.testAzureConnection = testAzureConnection;
  window.syncAzureDatabase = syncAzureDatabase;
  window.saveAzureProfile = saveAzureProfile;
  window.loadDemoAzureProfile = loadDemoAzureProfile;
  window.handleAzureLotChange = handleAzureLotChange;
  window.toggleAzureDestMode = toggleAzureDestMode;
  window.selectAzureTable = selectAzureTable;

  window.switchSharePointMode = switchSharePointMode;
  window.loadDetectedOneDriveFolder = loadDetectedOneDriveFolder;
  window.saveSharePointProfile = saveSharePointProfile;
  window.scanSharePointFolder = scanSharePointFolder;
  window.testSharePointConnection = testSharePointConnection;
  window.syncSharePointData = syncSharePointData;
  window.syncSpecificSharePointFile = syncSpecificSharePointFile;

  window.refreshSourceData = refreshSourceData;
  window.showToastNotification = showToastNotification;

  window.renderChecklistPh = renderChecklistPh;
  window.handleChecklistPhFilter = renderChecklistPh;
  window.handleChecklistPhProjetChange = handleChecklistPhProjetChange;
  window.resetChecklistPhFilters = resetChecklistPhFilters;
  window.exportChecklistPhToExcel = exportChecklistPhToExcel;
  window.refreshChecklistPhData = refreshChecklistPhData;

  window.selectViewerFile = selectViewerFile;
  window.goToViewerPage = function (p) {
    state.viewerPagination.page = p;
    renderFileDataViewer();
  };
  window.syncSelectedFileWithDashboard = syncSelectedFileWithDashboard;
  window.exportActiveViewerFile = exportActiveViewerFile;

  window.goToPage = function (p) {
    state.pagination.page = p;
    renderChantiersTable();
  };

  window.sortTable = function (col) {
    if (state.pagination.sortCol === col) {
      state.pagination.sortDir = state.pagination.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      state.pagination.sortCol = col;
      state.pagination.sortDir = 'asc';
    }
    renderChantiersTable();
  };

  window.applyProvinceFilter = function (provName) {
    state.filters.province = provName;
    elements.filterProvince.value = provName;
    switchTab('chantiers');
  };

  window.filterEquipementsStatus = function (status) {
    state.equipements.statusFilter = status;
    document.querySelectorAll('.eq-filter-btn').forEach(btn => {
      btn.className = 'eq-filter-btn px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition';
    });
    if (event && event.target) {
      event.target.className = 'eq-filter-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 transition';
    }
    renderEquipements();
  };

  // Init
  function init() {
    cacheDomElements();
    applyTheme(state.theme);
    populateFilterDropdowns();
    registerEvents();
    applyFilters();
    checkServerStatus();
    refreshLucide();
  }

  document.addEventListener('DOMContentLoaded', init);
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    init();
  }
})();
