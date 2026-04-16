// src/main.ts
import { createClient, SupabaseClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// 1. IMPORTS DA CLEAN ARCHITECTURE (Caminhos relativos ao src/)
import { Photometrics } from './domain/photometry/Photometrics';
import { LumenMethod } from './domain/photometry/LumenMethod';
// @ts-ignore - Ignorando tipos para engines ainda em JS ou sem declaração global
import { RadiosityEngine } from './domain/photometry/RadiosityEngine';
import { FalseColorEngine } from './domain/photometry/FalseColorEngine';
import { StandardsEngine } from './domain/standards/StandardsEngine';
import { ReportExporter } from './infrastructure/export/ReportExporter';
import { Photometric3DEngine } from './infrastructure/three/Photometric3DEngine';
import { i18nDictionary } from './presentation/i18n/Dictionary';
import { normsDatabase } from './domain/standards/Nbr8995Database';
import { lpdBaselines, exteriorLpdBaselines } from './domain/standards/AshraeDatabase';
import { AuthManager } from './auth/AuthManager';
import { Canvas2DEngine } from './infrastructure/canvas/Canvas2DEngine';
import { ElectricalEngine } from './domain/electrical/ElectricalEngine';
import { HCLEngine } from './domain/health/HCLEngine';
import { ESGEngine } from './domain/standards/ESGEngine';
import { ExcelParser } from './infrastructure/services/ExcelParser';

/**
 * Interface de Extensão do Objeto Window para TypeScript estrito
 */
declare global {
    interface Window {
        supabase: SupabaseClient;
        AuthManager: any;
        i18n: any;
        normsDatabase: any;
        lpdBaselines: any;
        FalseColorEngine: any;
        Canvas2DEngine: any;
        Photometric3DEngine: any;
        StandardsEngine: any;
        ReportExporter: any;
        LumenMethod: any;
        state: any;
        currentLang: string;
        calcMode: string;
        currentTool: string;
        currentNbrTarget: any;
        currentLeedTarget: string;
        userLeedProjects: any[];
        HCLEngine: any;
        GlareEngine: any;
        leedTargets: any;
        updateCalculations: () => void;
        switchTool: (toolId: string) => void;
        setHCLViewMode: (mode: 'clock' | 'spd') => void;
        redrawAllCanvases: () => void;
        updateCalcMode: (mode: string) => void;
        toggleTheme: () => void;
        toggleLanguage: () => void;
        installPWA: () => void;
        [key: string]: any; // Permite chamadas dinâmicas do HTML
    }
}

// 2. INICIALIZAÇÃO DE ESTADO GLOBAL
window.state = {
    hclViewMode: 'clock', // LUXSINTAX: Estado do Segmented Control HCL
    ponto: { viewMode: 'single', spacing: 2.0, height: 3.0, plane: 0.75, beam: 30, tilt: 0, spin: 0, intensity: 3000, flux: 1500, cdklm: 2000, iesData: null, iesFileName: null, mRatio: 0.52, showGlareZone: false, falseColor: false },
    vertical: { viewMode: 'section', height: 3.0, hq: 1.6, dist: 1.0, frameW: 1.2, frameH: 0.8, qty: 1, spacing: 1.0, beam: 30, tilt: 30, spin: 180, intensity: 3000, flux: 1500, cdklm: 2000, iesData: null, iesFileName: null, mRatio: 0.52, showGlareZone: false, falseColor: false },
    homog: { height: 3.0, plane: 0.75, spacing: 2.0, beam: 30, intensity: 3000, flux: 1500, cdklm: 2000, iesData: null, iesFileName: null },
    grid: { calcMethod: 'target', manualCols: 4, manualRows: 3, height: 3.0, plane: 0.75, viewLevel: 'HP', beam: 60, cct: 3000, flux: 3000, watts: 30, utilFactor: 0.60, maintFactor: 0.80, targetLux: 500, roomW: 6.0, roomL: 4.0, falseColor: false, iesData: null, iesFileName: null, projectName: 'Projeto LuxSintax', roomName: 'Ambiente Teste', authorName: 'Lux Designer' },
    driver: { mode: 'CV', power: 14.4, qty: 5, current: 350 },
    leedProject: { name: "Novo Projeto LEED", target: "baseline", rooms: [] },
        audit: { wireLength: 5, wireGauge: 1.5, voltage: 12, useType: 'office', timeOfDay: 'morning', mRatio: 0.52, visualLux: 500, age: 30, tm30: 'cri80', flicker: 'low', baselineWatts: 1500, kwhCost: 0.85, dailyHours: 10, daysPerYear: 260 },
	esg: { proposedWatts: 300, baselineWatts: 1500, kwhCost: 0.85, dailyHours: 10, daysPerYear: 260, hasAC: true, maintSavings: 0, capex: 5000 },
        showIsolines: true,
    showPolar: true,
    showHCL: false
};

// 3. PONTE DE INFRAESTRUTURA
window.i18n = i18nDictionary;

// LUXSINTAX: Injeção de Dicionário Dinâmico para a Tríade Biológica e Tooltips
if (window.i18n) {
    if (!window.i18n.pt) window.i18n.pt = {};
    if (!window.i18n.en) window.i18n.en = {};
    Object.assign(window.i18n.pt, {
        hdr_audit: "Auditoria Circadiana", audit_sub: "Laboratório de Neurociência: Avaliação do ciclo de melatonina e certificação WELL v2.",
        bio_vars: "Variáveis Biológicas", lux_vert: "Lux Vertical (Ev)", age_yrs: "Idade (Anos)", spec_cct: "Espectro da Fonte (CCT)",
        qual_tm30: "Qualidade (TM-30)", mod_tlm: "Modulação (TLM)", hcl_status: "Status Circadiano", hcl_score: "WELL Performance Score", 
        hcl_fatigue: "Mapa de Fadiga", hcl_ghost: "Fantasma do Ciano", hud_opt_sim: "Simulação Óptica", lens: "Lente", trans: "Transmissão", lbl_load_ies_opt: "OU EXTRAIR DE IES/LDT",
        opt_tm30_80: "Padrão (Rf 78)", opt_tm30_90: "Alta Fid. (Rf 90)", opt_tm30_sun: "SunLike (Rf 96)",
        opt_tlm_low: "Flicker Free", opt_tlm_med: "Aceitável", opt_tlm_high: "Risco / Baixo",
        tip_lux_vert: "Lux medido na altura do olho (E_vert).", tip_age: "A opacidade do cristalino afeta a absorção de luz azul.",
        tip_tm30: "Capacidade do LED de reproduzir cores reais.", tip_tlm: "O flicker invisível anula os ganhos de concentração (SVM)."
    });
    Object.assign(window.i18n.en, {
        hdr_audit: "Circadian Audit", audit_sub: "Neuroscience Lab: Melatonin cycle evaluation and WELL v2 certification.",
        bio_vars: "Biological Variables", lux_vert: "Vertical Lux (Ev)", age_yrs: "Age (Years)", spec_cct: "Source Spectrum (CCT)",
        qual_tm30: "Quality (TM-30)", mod_tlm: "Modulation (TLM)", hcl_status: "Circadian Status", hcl_score: "WELL Performance Score",
        hcl_fatigue: "Fatigue Map", hcl_ghost: "Cyan Phantom", hud_opt_sim: "Optical Simulation", lens: "Lens", trans: "Transmission", lbl_load_ies_opt: "OR EXTRACT FROM IES/LDT",
        opt_tm30_80: "Standard (Rf 78)", opt_tm30_90: "High Fid. (Rf 90)", opt_tm30_sun: "SunLike (Rf 96)",
        opt_tlm_low: "Flicker Free", opt_tlm_med: "Acceptable", opt_tlm_high: "Risk / Low",
        tip_lux_vert: "Lux measured at eye level (E_vert).", tip_age: "Lens opacity affects blue light absorption.",
        tip_tm30: "LED's ability to reproduce real colors.", tip_tlm: "Invisible flicker negates concentration gains (SVM)."
    });
}

window.normsDatabase = normsDatabase;
window.lpdBaselines = lpdBaselines;
window.exteriorLpdBaselines = exteriorLpdBaselines;
window.AuthManager = AuthManager;
window.FalseColorEngine = FalseColorEngine;
window.Canvas2DEngine = Canvas2DEngine;
window.Photometric3DEngine = Photometric3DEngine;
window.StandardsEngine = StandardsEngine;
window.ReportExporter = ReportExporter;
window.LumenMethod = LumenMethod;
window.Photometrics = Photometrics; // FUNDAMENTAL: Atribui o motor de física ao window
window.ElectricalEngine = ElectricalEngine; // Módulo de Auditoria Elétrica
window.HCLEngine = HCLEngine; // Módulo de Saúde Circadiana
window.ESGEngine = ESGEngine; // Módulo de Finanças e ESG
window.RadiosityEngine = RadiosityEngine; // Atribui o motor de cálculo em background
window.currentLang = 'pt';
window.calcMode = 'direct';

// 4. MÉTODOS DE INICIALIZAÇÃO
async function initializeApp() {
    try {
        let env;
        const hostname = window.location.hostname;
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.endsWith('.local');

        if (isLocal) {
            env = {
                url: 'https://ozytwdhuxsdefnunzinm.supabase.co',
                key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96eXR3ZGh1eHNkZWZudW56aW5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NjM2MjEsImV4cCI6MjA4NjIzOTYyMX0.G6d564WnaaUQVSjTjpCDEA4d6zaVMvB_NQpo1KtE24s'
            };
        } else {
            const envResponse = await fetch('/api/get-env');
            if (!envResponse.ok) throw new Error("Erro ao buscar chaves na API");
            env = await envResponse.json();
        }
        
        window.supabase = createClient(env.url, env.key);
        if (window.AuthManager) await window.AuthManager.init(window.supabase);
        
        // Boot UI
        window.initNbrSelector();
        window.setupInputBindings();
        
        // Infraestrutura PWA (Service Worker)
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('[LuxSintax] Infraestrutura PWA armada.', reg.scope))
                .catch(err => console.warn('[LuxSintax] SW falhou:', err));
        }

        window.switchTool('grid');

    } catch (err) {
        console.error("[LuxSintax] Falha Crítica no Boot:", err);
    }
}

// Inicia a aplicação
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    
    // LUXSINTAX: Observador de Tema (Reatividade do Canvas)
    const themeObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class' && window.redrawAllCanvases) {
                window.redrawAllCanvases();
            }
        });
    });
    themeObserver.observe(document.documentElement, { attributes: true });
});

// LUXSINTAX: Repintura Global
window.redrawAllCanvases = () => {
    if (window.currentTool === 'audit' && window.updateAuditUI) {
        window.updateAuditUI(); // Engatilha o redesenho com o tema correto
    }
};

// LUXSINTAX: Controlador do Super Canvas HCL
window.setHCLViewMode = function(mode: 'clock' | 'spd') {
    window.state.hclViewMode = mode;
    const btnClock = document.getElementById('btn-hcl-clock');
    const btnSpd = document.getElementById('btn-hcl-spd');
    
    if (btnClock && btnSpd) {
        if (mode === 'clock') {
            btnClock.className = 'flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md bg-white dark:bg-white/20 text-starlight dark:text-white shadow-sm transition-all';
            btnSpd.className = 'flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all';
        } else {
            btnSpd.className = 'flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md bg-white dark:bg-white/20 text-starlight dark:text-white shadow-sm transition-all';
            btnClock.className = 'flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all';
        }
    }
    window.updateCalculations();
};

// LUXSINTAX: Orquestração do Switch e Limpeza do IES (Aba Auditoria)
window.setAuditMode = function(mode: 'manual' | 'ies') {
    const btnManual = document.getElementById('btn-audit-manual');
    const btnIes = document.getElementById('btn-audit-ies');
    const iesBlock = document.getElementById('audit-ies-block');
    const cctBlock = document.getElementById('audit-cct-block');
    
    if (btnManual && btnIes && iesBlock && cctBlock) {
        const activeClass = 'px-3 py-1 text-[9px] font-black uppercase rounded-md bg-luminous-gold text-white shadow-sm transition-all';
        const inactiveClass = 'px-3 py-1 text-[9px] font-black uppercase rounded-md text-slate-500 dark:text-slate-500 hover:text-luminous-gold dark:hover:text-luminous-gold transition-all';

        if (mode === 'manual') {
            btnManual.className = activeClass;
            btnIes.className = inactiveClass;
            iesBlock.classList.add('hidden');
            cctBlock.classList.remove('hidden');
        } else {
            btnIes.className = activeClass;
            btnManual.className = inactiveClass;
            iesBlock.classList.remove('hidden');
            
            // Trava CCT apenas se houver IES com Ratio detectado
            if (window.state.audit.mRatio !== 0.52 && window.state.audit.iesFileName) {
                cctBlock.classList.add('hidden');
            } else {
                cctBlock.classList.remove('hidden');
            }
        }
    }
};

window.clearAuditIES = function() {
    window.state.audit.iesData = null;
    window.state.audit.iesFileName = '';
    window.state.audit.mRatio = 0.52; // Retorno ao padrão
    
    const statusA = document.getElementById('a-ies-status');
    const btnClear = document.getElementById('a-ies-clear');
    const cctBlock = document.getElementById('audit-cct-block');
    const selectRatio = document.getElementById('audit-mratio') as HTMLSelectElement;
    
    if (statusA) {
        statusA.innerText = 'Nenhum arquivo.';
        statusA.classList.remove('text-luminous-gold', 'text-amber-500');
    }
    if (btnClear) btnClear.classList.add('hidden');
    if (cctBlock) cctBlock.classList.remove('hidden');
    if (selectRatio) selectRatio.value = '0.52';
    
    window.updateCalculations();
};

/**
 * REGRAS DE NEGÓCIO TÉCNICAS (GLARE)
 */
window.GlareEngine = {
    calculateGuthIndex: (distX: number, distY: number, hEye: number) => {
        const d = Math.sqrt(distX**2 + distY**2);
        if (d === 0) return 1;
        const s = hEye / d;
        return Math.exp(s * (0.8 + 0.12 * s));
    }
};

// ... Restante das funções auxiliares devem ser exportadas/atribuídas aqui
// (SwitchTool, UpdateCalculations, etc, conforme definido anteriormente)

// 5. UTILITÁRIOS DE UI
window.formatDist = function(m: number) {
    if (window.currentLang === 'en') {
        const totalInches = m * 39.3701;
        const feet = Math.floor(totalInches / 12);
        const inches = Math.round(totalInches % 12);
        if (feet === 0) return `${inches}"`;
        return `${feet}' ${inches}"`;
    }
    return m.toFixed(2) + 'm';
};

window.formatIllum = function(lux: number) {
    if (window.currentLang === 'en') return Math.round(lux * 0.092903) + ' fc';
    return Math.round(lux) + ' Lux';
};

window.toggleTheme = function() {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('luxsintax_theme', isDark ? 'dark' : 'light');
    if (window.Photometric3DEngine && window.Photometric3DEngine.scene) {
        window.Photometric3DEngine.scene.background = new (window as any).THREE.Color(isDark ? 0x111827 : 0xf8fafc);
    }
    if (window.updateCalculations) window.updateCalculations();
};

if (localStorage.getItem('luxsintax_theme') === 'dark' || (!('luxsintax_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
} else {
    document.documentElement.classList.remove('dark');
}

window.togglePassword = function(id: string) {
    const input = document.getElementById(id) as HTMLInputElement;
    const icon = document.getElementById('icon-' + id);
    if (input && icon) {
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }
};

window.toggleMobileMenu = function() { document.getElementById('mobile-menu')?.classList.toggle('hidden'); };
window.openTerms = function() { document.getElementById('terms-modal')?.classList.remove('hidden'); };
window.closeTerms = function() { document.getElementById('terms-modal')?.classList.add('hidden'); };

window.updateInputsForLanguage = function() {
    const isEn = window.currentLang === 'en';
    document.querySelectorAll('.unit-m-ft').forEach(el => (el as HTMLElement).innerText = isEn ? 'FT' : 'M');
    const distParams =['height', 'plane', 'dist', 'spacing', 'hq', 'roomW', 'roomL', 'frameW', 'frameH'];
    ['ponto', 'vertical', 'homog', 'grid'].forEach(key => {
        distParams.forEach(param => {
            const numInput = document.getElementById(`${key[0]}-${param}`) as HTMLInputElement;
            const rangeInput = document.getElementById(`range-${key[0]}-${param}`) as HTMLInputElement;
            if (numInput && rangeInput && window.state[key]) {
                const valMeters = window.state[key][param];
                if (valMeters !== undefined) {
                    if (isEn) {
                        const valFt = valMeters * 3.28084;
                        numInput.value = valFt.toFixed(2);
                        rangeInput.value = valFt.toFixed(2);
                    } else {
                        numInput.value = valMeters.toFixed(2);
                        rangeInput.value = valMeters.toFixed(2);
                    }
                }
            }
        });
    });
};

window.toggleLanguage = function() { 
    window.currentLang = window.currentLang === 'pt' ? 'en' : 'pt'; 
    document.querySelectorAll('.lang-display').forEach(e => (e as HTMLElement).innerText = window.currentLang === 'pt' ? 'PT / EN' : 'EN / PT');
    document.querySelectorAll('[data-i18n]').forEach(el => { 
        const key = el.getAttribute('data-i18n'); 
        if (key && window.i18n[window.currentLang] && window.i18n[window.currentLang][key]) { 
            el.innerHTML = window.i18n[window.currentLang][key]; 
        } 
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { 
        const key = el.getAttribute('data-i18n-placeholder'); 
        if (key && window.i18n[window.currentLang] && window.i18n[window.currentLang][key]) { 
            (el as HTMLInputElement).placeholder = window.i18n[window.currentLang][key]; 
        } 
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => { 
            const key = el.getAttribute('data-i18n-title'); 
            if (key && window.i18n[window.currentLang] && window.i18n[window.currentLang][key]) { 
                (el as HTMLElement).title = window.i18n[window.currentLang][key]; 
            } 
        });
        window.updateInputsForLanguage();
        
        // LUXSINTAX: Sincroniza dinamicamente as dropdowns da NBR 8995-1 sem perder o valor selecionado
        const catSelect = document.getElementById('nbr-cat-select') as HTMLSelectElement;
        const roomSelect = document.getElementById('nbr-room-select') as HTMLSelectElement;
        const catFilter = document.getElementById('category-filter') as HTMLSelectElement;
        
        const oldCat = catSelect ? catSelect.value : null;
        const oldRoom = roomSelect ? roomSelect.value : null;
        const oldFilter = catFilter ? catFilter.value : null;
        
        if (window.initNbrSelector) window.initNbrSelector();
        if (oldCat && catSelect) {
            catSelect.value = oldCat;
            if (window.updateNbrRooms) window.updateNbrRooms();
            if (oldRoom && roomSelect) roomSelect.value = oldRoom;
        }

        if (catFilter && window.populateCategoryFilter) {
            const msgAll = window.i18n[window.currentLang]?.filter_all || (window.currentLang === 'en' ? 'All Categories' : 'Todas as Categorias');
            catFilter.innerHTML = `<option value="all" data-i18n="filter_all">${msgAll}</option>`;
            window.populateCategoryFilter();
            if (oldFilter) catFilter.value = oldFilter;
        }
        if (window.filterNorms) window.filterNorms();

        window.updateCalculations(); 
    };

window.switchTool = function(toolId: string) {
    window.currentTool = toolId;
    
    // LUXSINTAX: Analytics - Rastreamento de Tela Virtual (SPA/PWA)
    if (typeof (window as any).gtag === 'function') {
        (window as any).gtag('event', 'page_view', {
            page_title: 'Módulo: ' + toolId.toUpperCase(),
            page_location: window.location.href + '#' + toolId,
            page_path: '/' + toolId
        });
    }

    document.querySelectorAll('.mode-tab-btn').forEach(btn => {
        btn.classList.remove('tab-active', 'text-luminous-gold');
        btn.classList.add('tab-inactive');
    });
    const activeBtn = document.getElementById('tab-' + toolId);
    if (activeBtn) {
        activeBtn.classList.remove('tab-inactive');
        activeBtn.classList.add('tab-active', 'text-luminous-gold');
    }

    document.getElementById('visual-tools')?.classList.toggle('hidden', toolId === 'query' || toolId === 'leedProj' || toolId === 'audit' || toolId === 'driver' || toolId === 'esg');
        document.getElementById('query-tool')?.classList.toggle('hidden', toolId !== 'query');
        document.getElementById('leedProj-tool')?.classList.toggle('hidden', toolId !== 'leedProj');
        document.getElementById('audit-tool')?.classList.toggle('hidden', toolId !== 'audit');
        document.getElementById('driver-tool')?.classList.toggle('hidden', toolId !== 'driver');
        document.getElementById('esg-tool')?.classList.toggle('hidden', toolId !== 'esg');
    
    const modeSelector = document.getElementById('calc-mode-selector');
    if(modeSelector) modeSelector.classList.toggle('hidden', toolId === 'driver' || toolId === 'grid' || toolId === 'leedProj');

    if (toolId !== 'query' && toolId !== 'leedProj' && toolId !== 'audit' && toolId !== 'driver') {
        ['inputs-ponto', 'inputs-vertical', 'inputs-homog', 'inputs-grid', 'inputs-driver'].forEach(id => { 
            const el = document.getElementById(id); 
            if(el) el.classList.add('hidden'); 
        });
        const selectedInput = document.getElementById('inputs-' + toolId);
        if (selectedInput) selectedInput.classList.remove('hidden');
        
        document.getElementById('surface-selector')?.classList.toggle('hidden', toolId !== 'ponto');
        document.getElementById('vertical-selector')?.classList.toggle('hidden', toolId !== 'vertical');
        document.getElementById('grid-selector')?.classList.toggle('hidden', toolId !== 'grid');
        
        document.getElementById('heatmap-toggle-wrapper')?.classList.toggle('hidden', toolId !== 'grid');
        document.getElementById('hcl-toggle-wrapper')?.classList.toggle('hidden', toolId !== 'vertical');

        if (toolId === 'ponto') window.setSurfaceMode('single');
        if (toolId === 'vertical') window.toggleVerticalView('section');
        if (toolId === 'grid') window.toggleGridMode('HP');

        // LUXSINTAX: Controle de Visibilidade dos Painéis de Engenharia e Auditoria
        const isGrid = toolId === 'grid';
        document.getElementById('nbr-selector-section')?.classList.toggle('hidden', !isGrid);
        document.getElementById('nbr-status-panel')?.classList.toggle('hidden', !isGrid);
        document.getElementById('report-export-panel')?.classList.toggle('hidden', !isGrid);

        if (window.updatePhotometricHUD) window.updatePhotometricHUD();
        
        const legendOverlay = document.getElementById('heatmap-legend-overlay');
        if (legendOverlay) {
            const is3DActive = !document.getElementById('stage-3d')?.classList.contains('hidden');
            const isGridHeatmap = toolId === 'grid' && window.state.grid.falseColor;
            const isPontoHeatmap = toolId === 'ponto' && window.state.ponto.falseColor && is3DActive;
            const isVertHeatmap = toolId === 'vertical' && window.state.vertical.falseColor && is3DActive;
            legendOverlay.classList.toggle('hidden', !(isGridHeatmap || isPontoHeatmap || isVertHeatmap));
        }
        
        const glareWrapper = document.getElementById('glare-toggle-wrapper');
        if (glareWrapper) {
            glareWrapper.classList.toggle('hidden', (toolId !== 'vertical' && toolId !== 'ponto') || (toolId === 'vertical' && window.state.vertical.viewMode === 'elevation'));
        }

        window.updateCalculations();
    } else if (toolId === 'query') {
        window.switchQueryTab('nbr8995');
    } else if (toolId === 'leedProj') {
        window.renderLeedProject();
    }
};

window.setGridCalcMethod = function(method: string) {
    window.state.grid.calcMethod = method;
    const btnTarget = document.getElementById('btn-grid-target');
    const btnManual = document.getElementById('btn-grid-manual');
    const act = "flex-1 px-2 py-2 text-[9px] font-black uppercase rounded-lg bg-luminous-gold text-white transition-all shadow-sm";
    const inact = "flex-1 px-2 py-2 text-[9px] font-black uppercase rounded-lg text-slate-400 hover:text-luminous-gold transition-all";
    
    if (btnTarget) btnTarget.className = method === 'target' ? act : inact;
    if (btnManual) btnManual.className = method === 'manual' ? act : inact;

    document.getElementById('grid-mode-target')?.classList.toggle('hidden', method !== 'target');
    document.getElementById('grid-mode-manual')?.classList.toggle('hidden', method !== 'manual');

    if (method === 'manual') {
        (document.getElementById('g-manualCols') as HTMLInputElement).value = window.state.grid.cols || 4;
        (document.getElementById('range-g-manualCols') as HTMLInputElement).value = window.state.grid.cols || 4;
        window.state.grid.manualCols = window.state.grid.cols || 4;
        
        (document.getElementById('g-manualRows') as HTMLInputElement).value = window.state.grid.rows || 3;
        (document.getElementById('range-g-manualRows') as HTMLInputElement).value = window.state.grid.rows || 3;
        window.state.grid.manualRows = window.state.grid.rows || 3;
    }
    window.updateCalculations();
};

window.updateCalcMode = function(mode: string) {
    const oldMode = window.calcMode;
    window.calcMode = mode;
    
    // LUXSINTAX: Limpeza inteligente. Só limpa se estivermos explicitamente a sair do modo IES para Direct
    if (oldMode === 'ies' && mode === 'direct' && window.currentTool && window.state[window.currentTool]) {
        window.state[window.currentTool].iesData = null;
        window.state[window.currentTool].iesFileName = null;
        const fileInput = document.getElementById(window.currentTool[0] + '-ies-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        const statusEl = document.getElementById(window.currentTool[0] + '-ies-status');
        if (statusEl) {
            statusEl.innerText = "Nenhum arquivo carregado.";
            statusEl.classList.remove('text-luminous-gold', 'text-red-500');
            statusEl.classList.add('text-dim-gray');
        }
        if (window.updatePhotometricHUD) window.updatePhotometricHUD();
    }

    const act = "flex-1 px-2 py-2 text-[9px] font-black uppercase rounded-lg bg-luminous-gold text-white transition-all shadow-sm";
    const inact = "flex-1 px-2 py-2 text-[9px] font-black uppercase rounded-lg text-slate-400 hover:text-luminous-gold transition-all";
    
    ['direct', 'photo', 'ies'].forEach(id => {
        const btn = document.getElementById('btn-mode-' + id);
        if (btn) btn.className = inact;
    });
    const btnPonto = document.getElementById(mode === 'photometric' ? 'btn-mode-photo' : (mode === 'ies' ? 'btn-mode-ies' : 'btn-mode-direct'));
    if(btnPonto) btnPonto.className = act;

    ['direct', 'ies'].forEach(id => {
        const btn = document.getElementById('btn-grid-' + id);
        if (btn) btn.className = inact;
    });
    const gridId = mode === 'ies' ? 'btn-grid-ies' : 'btn-grid-direct';
    const btnGrid = document.getElementById(gridId);
    if(btnGrid) btnGrid.className = act;

    document.querySelectorAll('.mode-direct-group').forEach(el => el.classList.toggle('hidden', mode !== 'direct'));
    document.querySelectorAll('.mode-photo-group').forEach(el => el.classList.toggle('hidden', mode !== 'photometric'));
    document.querySelectorAll('.mode-ies-group').forEach(el => el.classList.toggle('hidden', mode !== 'ies'));
    document.querySelectorAll('.mode-standard-only').forEach(el => el.classList.toggle('hidden', mode === 'ies'));
    
    const btnSurf3D = document.getElementById('btn-surf-3d');
    if (btnSurf3D) btnSurf3D.style.display = mode === 'ies' ? 'block' : 'none';
    const btnV3D = document.getElementById('btn-v-3d');
    if (btnV3D) btnV3D.style.display = mode === 'ies' ? 'block' : 'none';

    // LUXSINTAX: Travar edição de CCT/Espectro se for arquivo IES (Garantia SSOT)
    const pRatio = document.getElementById('p-mRatio') as HTMLSelectElement;
    const vRatio = document.getElementById('v-mRatio') as HTMLSelectElement;
    if (pRatio) { pRatio.disabled = (mode === 'ies'); pRatio.style.opacity = (mode === 'ies') ? '0.5' : '1'; }
    if (vRatio) { vRatio.disabled = (mode === 'ies'); vRatio.style.opacity = (mode === 'ies') ? '0.5' : '1'; }
    
    if (mode !== 'ies') {
        if (window.state.ponto && window.state.ponto.viewMode === '3D') window.setSurfaceMode('single');
        if (window.state.vertical && window.state.vertical.viewMode === '3D') window.toggleVerticalView('section');
    }
    window.updateCalculations();
};

window.toggleRenderMode = function(mode: string) {
    const stage2D = document.getElementById('stage-2d');
    const stage3D = document.getElementById('stage-3d');
    if (!stage2D || !stage3D) return;

    const glareWrapper = document.getElementById('glare-toggle-wrapper');
    const hclWrapper = document.getElementById('hcl-toggle-wrapper');

    if (mode === '3D') {
        stage2D.classList.add('hidden');
        stage3D.classList.remove('hidden');
        if (glareWrapper) glareWrapper.classList.add('hidden');
        if (hclWrapper) hclWrapper.classList.add('hidden');
        if (window.Photometric3DEngine) window.Photometric3DEngine.init();
    } else {
        stage3D.classList.add('hidden');
        stage2D.classList.remove('hidden');
        if (window.currentTool === 'vertical' || window.currentTool === 'ponto') {
            if (hclWrapper) hclWrapper.classList.remove('hidden');
            if (glareWrapper && !(window.currentTool === 'vertical' && window.state.vertical.viewMode === 'elevation')) {
                glareWrapper.classList.remove('hidden');
            }
        }
    }
};

window.setSurfaceMode = function(mode: string) {
    const btnS = document.getElementById('btn-surf-single');
    const btnA = document.getElementById('btn-surf-array');
    const btn3D = document.getElementById('btn-surf-3d');
    const lblIsolines = document.getElementById('lbl-toggle-isolines');
    const lblPolar = document.getElementById('lbl-toggle-polar');
    const act = "px-3 py-1.5 text-[9px] font-black uppercase rounded-lg bg-luminous-gold text-white shadow-sm";
    const inact = "px-3 py-1.5 text-[9px] font-black uppercase rounded-lg text-slate-400 hover:text-luminous-gold transition-all";

    if (mode === '3D') {
        window.toggleRenderMode('3D');
        if(btnS) btnS.className = inact;
        if(btnA) btnA.className = inact;
        if(btn3D) btn3D.className = act;
        if(lblIsolines) lblIsolines.classList.add('hidden');
        if(lblPolar) lblPolar.classList.remove('hidden');
    } else {
        window.toggleRenderMode('2D');
        window.state.ponto.viewMode = mode;
        if(btnS) btnS.className = mode === 'single' ? act : inact;
        if(btnA) btnA.className = mode === 'array' ? act : inact;
        if(btn3D) btn3D.className = inact;
        if(lblIsolines) lblIsolines.classList.remove('hidden');
        if(lblPolar) lblPolar.classList.add('hidden');
    }
    
    const isArray = (mode === 'array') || (mode === '3D');
    const tiltModeGrp = document.getElementById('p-tilt-mode-group');
    if (tiltModeGrp) tiltModeGrp.style.display = isArray ? 'block' : 'none';
    const spacingGrp = document.getElementById('group-spacing');
    if (spacingGrp) {
        if (isArray) spacingGrp.classList.remove('hidden');
        else spacingGrp.classList.add('hidden');
    }

    const heatmapWrapper = document.getElementById('heatmap-toggle-wrapper');
    if (heatmapWrapper && window.currentTool === 'ponto') {
        heatmapWrapper.classList.toggle('hidden', mode !== '3D');
    }

    if (window.toggleHeatmap) window.toggleHeatmap(window.state.ponto.falseColor);
    window.updateCalculations();
};

window.toggleVerticalView = function(mode: string) {
    const btnS = document.getElementById('btn-v-section');
    const btnE = document.getElementById('btn-v-elevation');
    const btn3D = document.getElementById('btn-v-3d');
    const lblIsolines = document.getElementById('lbl-toggle-isolines');
    const lblPolar = document.getElementById('lbl-toggle-polar');
    const activeClass = "px-3 py-1.5 text-[9px] font-black uppercase rounded-lg bg-luminous-gold text-white transition-all";
    const inactiveClass = "px-3 py-1.5 text-[9px] font-black uppercase rounded-lg text-slate-400 hover:text-luminous-gold transition-all";
    
    if (mode === '3D') {
        window.toggleRenderMode('3D');
        if(btnS) btnS.className = inactiveClass;
        if(btnE) btnE.className = inactiveClass;
        if(btn3D) btn3D.className = activeClass;
        if(lblIsolines) lblIsolines.classList.add('hidden');
        if(lblPolar) lblPolar.classList.remove('hidden');
    } else {
        window.toggleRenderMode('2D');
        window.state.vertical.viewMode = mode;
        if(btnS) btnS.className = mode === 'section' ? activeClass : inactiveClass;
        if(btnE) btnE.className = mode === 'elevation' ? activeClass : inactiveClass;
        if(btn3D) btn3D.className = inactiveClass;
        if(lblIsolines) lblIsolines.classList.add('hidden');
        if(lblPolar) lblPolar.classList.add('hidden');
    }

    const elevationGroups = document.getElementById('v-elevation-groups');
    const isElevation = (mode === 'elevation') || (mode === '3D');
    if (elevationGroups) elevationGroups.style.display = isElevation ? 'block' : 'none';

    const heatmapWrapper = document.getElementById('heatmap-toggle-wrapper');
    if (heatmapWrapper && window.currentTool === 'vertical') {
        heatmapWrapper.classList.toggle('hidden', mode !== '3D');
    }

    if (window.toggleHeatmap) window.toggleHeatmap(window.state.vertical.falseColor);
    window.updateCalculations();
};

window.toggleGridMode = function(mode: string) {
    const btnHP = document.getElementById('btn-grid-hp');
    const btnLP = document.getElementById('btn-grid-lp');
    const btn3D = document.getElementById('btn-grid-3d');
    const lblIsolines = document.getElementById('lbl-toggle-isolines');
    const lblPolar = document.getElementById('lbl-toggle-polar');
    
    const activeClass = "px-3 py-1.5 text-[9px] font-black uppercase rounded-lg bg-luminous-gold text-white transition-all shadow-sm";
    const inactiveClass = "px-3 py-1.5 text-[9px] font-black uppercase rounded-lg text-slate-400 hover:text-luminous-gold transition-all";
    
    if (mode === '3D') {
        window.toggleRenderMode('3D');
        if(btnHP) btnHP.className = inactiveClass;
        if(btnLP) btnLP.className = inactiveClass;
        if(btn3D) btn3D.className = activeClass;
        if (lblIsolines) lblIsolines.classList.add('hidden');
        if (lblPolar) lblPolar.classList.remove('hidden');
    } else {
        window.toggleRenderMode('2D');
        window.state.grid.viewLevel = mode;
        if(btnHP) btnHP.className = mode === 'HP' ? activeClass : inactiveClass;
        if(btnLP) btnLP.className = mode === 'LP' ? activeClass : inactiveClass;
        if(btn3D) btn3D.className = inactiveClass;
        if (lblIsolines) lblIsolines.classList.remove('hidden');
        if (lblPolar) lblPolar.classList.add('hidden');
    }

    if (window.toggleHeatmap) window.toggleHeatmap(window.state.grid.falseColor);
    window.updateCalculations();
};

window.toggleHCL = function(isChecked: boolean) {
    window.state.showHCL = isChecked;
    const bgToggle = document.getElementById('hcl-toggle-bg');
    const dotToggle = document.getElementById('hcl-toggle-dot');
    if (bgToggle && dotToggle) {
        if (isChecked) {
            bgToggle.classList.add('bg-purple-500'); bgToggle.classList.remove('bg-slate-200', 'dark:bg-slate-600');
            dotToggle.classList.add('translate-x-3');
        } else {
            bgToggle.classList.remove('bg-purple-500'); bgToggle.classList.add('bg-slate-200', 'dark:bg-slate-600');
            dotToggle.classList.remove('translate-x-3');
        }
    }
    window.updateCalculations();
};

window.toggleGlareZone = function(isChecked: boolean) {
    if(window.state[window.currentTool]) window.state[window.currentTool].showGlareZone = isChecked;
    const bgToggle = document.getElementById('glare-toggle-bg');
    const dotToggle = document.getElementById('glare-toggle-dot');
    if (bgToggle && dotToggle) {
        if (isChecked) {
            bgToggle.classList.add('bg-red-500'); bgToggle.classList.remove('bg-slate-200', 'dark:bg-slate-600');
            dotToggle.classList.add('translate-x-3');
        } else {
            bgToggle.classList.remove('bg-red-500'); bgToggle.classList.add('bg-slate-200', 'dark:bg-slate-600');
            dotToggle.classList.remove('translate-x-3');
        }
    }
    window.updateCalculations();
};

window.toggleIsolines = function(isChecked: boolean) {
    window.state.showIsolines = isChecked;
    const bgToggle = document.getElementById('iso-toggle-bg');
    const dotToggle = document.getElementById('iso-toggle-dot');
    if (bgToggle && dotToggle) {
        if (isChecked) {
            bgToggle.classList.add('bg-tech-cyan'); bgToggle.classList.remove('bg-slate-200', 'dark:bg-slate-600');
            dotToggle.classList.add('translate-x-3');
        } else {
            bgToggle.classList.remove('bg-tech-cyan'); bgToggle.classList.add('bg-slate-200', 'dark:bg-slate-600');
            dotToggle.classList.remove('translate-x-3');
        }
    }
    window.updateCalculations();
};

window.toggleHeatmap = function(isChecked: boolean) {
    if(window.currentTool === 'grid') window.state.grid.falseColor = isChecked;
    if(window.currentTool === 'ponto') window.state.ponto.falseColor = isChecked;
    if(window.currentTool === 'vertical') window.state.vertical.falseColor = isChecked;
    
    const bgToggle = document.getElementById('fc-toggle-bg');
    const dotToggle = document.getElementById('fc-toggle-dot');
    if (bgToggle && dotToggle) {
        if (isChecked) {
            bgToggle.classList.add('bg-tech-cyan'); bgToggle.classList.remove('bg-slate-200', 'dark:bg-slate-600');
            dotToggle.classList.add('translate-x-3');
        } else {
            bgToggle.classList.remove('bg-tech-cyan'); bgToggle.classList.add('bg-slate-200', 'dark:bg-slate-600');
            dotToggle.classList.remove('translate-x-3');
        }
    }

    const legend = document.getElementById('heatmap-legend-overlay');
    if (legend) {
        const is3DActive = !document.getElementById('stage-3d')?.classList.contains('hidden');
        const isValidGrid = isChecked && window.currentTool === 'grid';
        const isValidPonto = isChecked && window.currentTool === 'ponto' && is3DActive;
        const isValidVert = isChecked && window.currentTool === 'vertical' && is3DActive;
        
        if (isValidGrid || isValidPonto || isValidVert) {
            legend.classList.remove('hidden');
            if (!legend.dataset.initialized) {
                const bar = document.getElementById('heatmap-gradient-bar');
                const ticksContainer = document.getElementById('heatmap-ticks');
                if (bar && ticksContainer) {
                    const scale = window.FalseColorEngine.colorScale;
                    const maxLux = scale[scale.length - 1].lux;
                    
                    let stops = scale.map((c: any) => `rgb(${c.r},${c.g},${c.b}) ${(c.lux / maxLux) * 100}%`).join(', ');
                    bar.style.background = `linear-gradient(to right, ${stops})`;
                    
                    let ticksHTML = '';
                    scale.forEach((c: any, idx: number) => {
                        if ([0, 100, 300, 500, 750].includes(c.lux) || idx === scale.length - 1) {
                            const leftPct = (c.lux / maxLux) * 100;
                            let transform = 'translateX(-50%)';
                            if (leftPct === 0) transform = 'translateX(0)';
                            if (leftPct === 100) transform = 'translateX(-100%)';
                            const label = idx === scale.length - 1 ? `${c.lux}+` : c.lux;
                            ticksHTML += `<span class="absolute top-0 transition-colors dark:text-slate-300" style="left: ${leftPct}%; transform: ${transform};">${label}</span>`;
                        }
                    });
                    ticksContainer.innerHTML = ticksHTML;
                    legend.dataset.initialized = 'true';
                }
            }
        } else {
            legend.classList.add('hidden');
        }
    }
    window.updateCalculations();
};

window.togglePolar = function(isChecked: boolean) {
    window.state.showPolar = isChecked;
    const bgToggle = document.getElementById('polar-toggle-bg');
    const dotToggle = document.getElementById('polar-toggle-dot');
    if (bgToggle && dotToggle) {
        if (isChecked) {
            bgToggle.classList.add('bg-luminous-gold'); bgToggle.classList.remove('bg-slate-200', 'dark:bg-slate-600');
            dotToggle.classList.add('translate-x-3');
        } else {
            bgToggle.classList.remove('bg-luminous-gold'); bgToggle.classList.add('bg-slate-200', 'dark:bg-slate-600');
            dotToggle.classList.remove('translate-x-3');
        }
    }
    window.updateCalculations();
};

window.PhotometricAnalyzer = {
    extractZonalMetrics: (data: any) => window.Photometrics.extractZonalMetrics(data)
};

window.getIESIntensity = function(state: any, vAngleDeg: number, hAngleDeg = 0) {
    return window.Photometrics.getIESIntensity(state.iesData, vAngleDeg, hAngleDeg);
};

window.getIntensity = function(s: any) {
    if (window.calcMode === 'direct') return s.intensity;
    if (window.calcMode === 'ies') return window.Photometrics.getIESIntensity(s.iesData, 0, 0); 
    return (s.cdklm * s.flux) / 1000;
};

window.getEffectiveBeam = function(s: any) {
    if (window.calcMode === 'ies' && s.iesData) {
        return window.Photometrics.getEffectiveBeam(s.iesData, s.beam);
    }
    return { c0: s.beam, c90: s.beam, isOval: false };
};

window.updatePhotometricHUD = function() {
    const dash = document.getElementById('photometric-dashboard');
    if (!dash) return;
    const toolId = window.currentTool;
    const state = window.state[toolId];
    
    // LUXSINTAX: HUD Visível se houver dados e modo IES ativo
    const isIES = (window.calcMode === 'ies');
    const hasData = state && state.iesData;

    if (!isIES || !hasData) {
        dash.classList.add('hidden');
        return;
    }
    
    dash.classList.remove('hidden');
    document.getElementById('pd-filename')!.innerText = state.iesFileName || "arquivo.ies";
    
    // Uso do módulo importado localmente (Photometrics)
    const metrics = Photometrics.extractZonalMetrics(state.iesData);
    
    let pWatts = state.iesData.wattage;
    if (!pWatts) {
        const wattInput = document.getElementById(toolId[0] + '-watts') as HTMLInputElement;
        if (wattInput) pWatts = parseFloat(wattInput.value);
    }
    
    document.getElementById('pd-watts')!.innerText = pWatts ? pWatts.toFixed(1) : 'N/D';
    
    let finalFlux = metrics.calculatedFlux;
    let nominalFlux = state.iesData.totalFlux;
    if (!nominalFlux || nominalFlux <= 0) {
        nominalFlux = finalFlux; 
    }
    
    document.getElementById('pd-lumens-nom')!.innerText = nominalFlux > 0 ? String(Math.round(nominalFlux)) : 'N/D';
    document.getElementById('pd-lumens-fin')!.innerText = finalFlux > 0 ? String(Math.round(finalFlux)) : 'N/D';
    
    if (pWatts > 0 && finalFlux > 0) {
        document.getElementById('pd-efficacy')!.innerText = String(Math.round(finalFlux / pWatts));
    } else {
        document.getElementById('pd-efficacy')!.innerText = 'N/D';
    }

    document.getElementById('pd-uplight')!.innerText = metrics.uplightRatio.toFixed(1);
};

window.handleIESUpload = async function(input: HTMLInputElement) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const extension = file.name.split('.').pop()!.toLowerCase();
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            const content = e.target!.result as string;
            let parsed = null;

            try {
                const statusIds =['p-ies-status', 'v-ies-status', 'g-ies-status'];
                const msgProc = window.i18n[window.currentLang]?.msg_processing || "Processando fotometria na nuvem...";
                statusIds.forEach(id => { const el = document.getElementById(id); if(el) { el.innerText = msgProc; el.classList.remove('text-red-500'); }});

                const response = await fetch('/api/parse', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content, extension })
                });
                
                if (!response.ok) throw new Error("Erro no servidor");
                parsed = await response.json();
            } catch (err) {
                const statusIds =['p-ies-status', 'v-ies-status', 'g-ies-status'];
                const msgErr = window.i18n[window.currentLang]?.msg_file_error || "Erro na leitura do arquivo.";
                statusIds.forEach(id => { const el = document.getElementById(id); if(el) { el.innerText = msgErr; el.classList.add('text-red-500'); }});
                return alert("Erro ao processar o arquivo. Formato inválido ou ilegível.");
            }
            
            if (parsed && !parsed.error) {
                if (extension === 'ies') {
                    const lines = content.split('\n');
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].startsWith('TILT=')) {
                            for (let j = i + 1; j < i + 5; j++) {
                                const l = lines[j] ? lines[j].trim() : '';
                                if (l !== '') {
                                    const parts = l.split(/\s+/);
                                    if (parts.length >= 3) {
                                        const nLamps = parseFloat(parts[0]);
                                        const lmpFlux = parseFloat(parts[1]);
                                        if (!isNaN(nLamps) && !isNaN(lmpFlux) && lmpFlux > 0) {
                                            parsed.totalFlux = nLamps * lmpFlux;
                                        }
                                    }
                                    break;
                                }
                            }
                            break;
                        }
                    }
                }

                const targetKey = window.currentTool;
                
                // LUXSINTAX: Se for a ferramenta de Auditoria, não ativamos o fluxo 3D fotométrico global
                if (targetKey !== 'audit') {
                    window.calcMode = 'ies';
                    window.updateCalcMode('ies');
                }

                // Depois injetamos os dados novos
                window.state[targetKey].iesData = parsed;
                window.state[targetKey].iesFileName = file.name;

                if (window.updatePhotometricHUD) window.updatePhotometricHUD();

                const cctMatch = file.name.match(/(\d{3,4})K/i) || content.match(/(\d{3,4})K/i);
                if (targetKey === 'grid') {
                    window.state.grid.cct = cctMatch ? parseInt(cctMatch[1]) : null;
                    const cctInput = document.getElementById('g-cct') as HTMLInputElement;
                    const cctRange = document.getElementById('range-g-cct') as HTMLInputElement;
                    if (cctInput) cctInput.value = window.state.grid.cct || '';
                    if (cctRange) cctRange.value = window.state.grid.cct || '3000';
                }

                let statusId = 'p-ies-status';
                if(window.currentTool === 'vertical') statusId = 'v-ies-status';
                if(window.currentTool === 'homog') statusId = 'h-ies-status';
                if(window.currentTool === 'grid') statusId = 'g-ies-status';

                const statusEl = document.getElementById(statusId);
                if(statusEl) {
                    const msgLoaded = window.i18n[window.currentLang]?.msg_file_loaded || "Carregado:";
                    statusEl.innerText = `${msgLoaded} ${file.name}`;
                    statusEl.classList.add('text-luminous-gold');
                }

                const upperName = file.name.toUpperCase();
                const upperContent = content.toUpperCase();
                let detectedRatio = null;

                if (upperName.includes("2700") || upperContent.includes("2700")) detectedRatio = 0.45;
                else if (upperName.includes("3000") || upperContent.includes("3000")) detectedRatio = 0.52;
                else if (upperName.includes("4000") || upperContent.includes("4000")) detectedRatio = 0.68;
                else if (upperName.includes("5000") || upperContent.includes("5000") || upperName.includes("5700")) detectedRatio = 0.92;
                else if (upperName.includes("6500") || upperContent.includes("6500")) detectedRatio = 1.10;
                
                if (!detectedRatio) {
                    if (upperName.match(/[-_ ]2K/)) detectedRatio = 0.45;
                    else if (upperName.match(/[-_ ]3K/)) detectedRatio = 0.52;
                    else if (upperName.match(/[-_ ]4K/)) detectedRatio = 0.68;
                    else if (upperName.match(/[-_ ]5K/)) detectedRatio = 0.92;
                    else if (upperName.match(/[-_ ]6K/)) detectedRatio = 1.10;
                }

                if (detectedRatio) {
                    window.state[targetKey].mRatio = detectedRatio;
                    ['p-mRatio', 'v-mRatio', 'audit-mratio'].forEach(id => {
                        const dropdown = document.getElementById(id) as HTMLSelectElement;
                        if (dropdown) dropdown.value = String(detectedRatio);
                    });
                }
                
                // LUXSINTAX: Interceptação visual e Trava de Segurança CCT para a Aba de Auditoria
                if (targetKey === 'audit') {
                    const statusA = document.getElementById('a-ies-status');
                    const btnClear = document.getElementById('a-ies-clear');
                    const cctBlock = document.getElementById('audit-cct-block');
                    
                    if (statusA) {
                        statusA.innerText = `Lido: ${file.name} (M/P: ${detectedRatio || 'N/D'})`;
                        statusA.classList.add('text-luminous-gold');
                        statusA.classList.remove('text-amber-500');
                    }
                    if (btnClear) {
                        btnClear.classList.remove('hidden');
                    }
                    if (cctBlock) {
                        if (detectedRatio) {
                            cctBlock.classList.add('hidden'); // Oculta e trava o CCT manual
                        } else {
                            cctBlock.classList.remove('hidden'); // Destrava pedindo ajuda ao usuário
                            if (statusA) {
                                statusA.innerText = `Lido: ${file.name} (Sem CCT. Preencha abaixo)`;
                                statusA.classList.add('text-amber-500');
                                statusA.classList.remove('text-luminous-gold');
                            }
                        }
                    }
                    
                    window.updateCalculations();
                    return; // Retorno antecipado (Não avança pro motor 3D/Grid das outras abas)
                }

                let targetFlux = parsed.totalFlux || 0;
                if (targetFlux > 0) {
                     window.state[targetKey].flux = targetFlux;
                     const fluxInput = document.getElementById(targetKey[0] + '-flux') as HTMLInputElement;
                     if(fluxInput) fluxInput.value = String(Math.round(targetFlux));
                     const rangeFlux = document.getElementById('range-' + targetKey[0] + '-flux') as HTMLInputElement;
                     if(rangeFlux) rangeFlux.value = String(Math.round(targetFlux));
                }

                if (window.updatePhotometricHUD) window.updatePhotometricHUD();
                
                const toggleBtn = document.getElementById('view-mode-toggle');
                if (toggleBtn) toggleBtn.classList.remove('hidden');
                
                if (window.Photometric3DEngine && window.Photometric3DEngine.isInitialized && !document.getElementById('stage-3d')?.classList.contains('hidden')) {
                     window.Photometric3DEngine.renderPhotometricSolid(parsed, targetKey, window.state[targetKey]);
                }

                window.updateCalculations();
            } else {
                alert("Erro ao ler arquivo " + file.name + ". Verifique se não está corrompido.");
            }
        };
        reader.readAsText(file);
    }
};

window.BimIfcAdapter = {
    mapGridToBim: (gridState: any) => {
        const fixtures = [];
        const spacingX = gridState.roomW / gridState.cols;
        const spacingY = gridState.roomL / gridState.rows;
        for (let i = 0; i < gridState.cols; i++) {
            for (let j = 0; j < gridState.rows; j++) {
                fixtures.push({
                    ifcType: 'IfcLightFixture',
                    coordinates: { x: (i + 0.5) * spacingX, y: (j + 0.5) * spacingY, z: gridState.height },
                    properties: { luminousFlux: gridState.flux, beamAngle: gridState.beam, label: `LUX-TYPE-${i}${j}` }
                });
            }
        }
        return fixtures;
    }
};

window.handleBimExport = () => {
    const data = window.BimIfcAdapter.mapGridToBim(window.state.grid);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `luxsintax_bim_${Date.now()}.json`; link.click();
};

window.handleGenerateReport = async (event: any) => {
    const PDFLib = (window as any).PDFLib;
    if (!PDFLib) return alert('Inicializando Motor de PDF-Lib...');

    const s = window.state.grid;
    const catSelect = document.getElementById('nbr-cat-select') as HTMLSelectElement;
    const roomSelect = document.getElementById('nbr-room-select') as HTMLSelectElement;
    const isNbrActive = catSelect && roomSelect && catSelect.value && roomSelect.value;
    const targetLux = isNbrActive && window.currentNbrTarget ? window.currentNbrTarget.lux : s.targetLux;

    const avgLux = parseInt(document.getElementById('result-lux')?.innerText || '0') || 0;
    const ugrStr = document.getElementById('result-ugr')?.innerText || "--";
    const isOk = avgLux >= targetLux;

    const area = s.roomW * s.roomL;
    const totalFixtures = s.cols * s.rows;

    let pWatts = s.watts || 30;
    let fNominal = s.flux;
    let fFinal = s.flux;
    let upRatio = 0;

    if (s.iesData) {
        // Uso direto do motor Photometrics importado via Clean Architecture
        const metrics = Photometrics.extractZonalMetrics(s.iesData);
        fFinal = metrics.calculatedFlux;
        fNominal = (s.iesData.totalFlux && s.iesData.totalFlux > 0) ? s.iesData.totalFlux : fFinal;
        pWatts = s.iesData.wattage || s.watts || 0;
        upRatio = metrics.uplightRatio;
    }

    const totalWatts = totalFixtures * pWatts;
    const lpd = totalWatts / area;
    const eff = pWatts > 0 ? Math.round(fFinal / pWatts) : 0;

    const effectiveBeamObj = window.getEffectiveBeam(s);
    const lumName = s.iesFileName || "Fonte Paramétrica Genérica";
    const beamText = effectiveBeamObj.isOval ? `${Math.round(effectiveBeamObj.c0)}° x ${Math.round(effectiveBeamObj.c90)}°` : `${Math.round(effectiveBeamObj.c0)}°`;

    const targetLevel = (isNbrActive && window.currentNbrTarget && window.currentNbrTarget.plane) 
        ? window.currentNbrTarget.plane 
        : (s.viewLevel || 'HP');

    const captureState = async (level: string) => {
        const oldLevel = s.viewLevel;
        const oldFC = s.falseColor;
        const oldIsolines = window.state.showIsolines;
        s.viewLevel = level;
        s.falseColor = true;
        window.state.showIsolines = true;
        
        // AWAIT obriga a câmera a esperar a Promessa do Worker do Canvas2DEngine terminar de pintar
        await window.Canvas2DEngine.render(); 
        
        return new Promise((resolve) => {
            // Um leve delay para garantir que o GPU do Canvas descarregou o buffer na tela
            setTimeout(() => {
                const dataUrl = (document.getElementById('beamCanvas') as HTMLCanvasElement).toDataURL('image/png');
                s.viewLevel = oldLevel; s.falseColor = oldFC; window.state.showIsolines = oldIsolines;
                window.Canvas2DEngine.render(); // Restaura sem precisar de await
                resolve(dataUrl);
            }, 100);
        });
    };

    const btn = event ? event.currentTarget : null;
    const originalBtnHTML = btn ? btn.innerHTML : null;
    if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> GERANDO...';

    const imgTopografia = await captureState(targetLevel);

    const reportData = {
        projectName: s.projectName,
        roomName: s.roomName,
        authorName: s.authorName,
        roomW: s.roomW,
        roomL: s.roomL,
        area,
        height: s.height,
        plane: s.plane,
        utilFactor: s.utilFactor,
        maintFactor: s.maintFactor,
        cols: s.cols,
        rows: s.rows,
        totalFixtures,
        lumName,
        cct: s.cct,
        pWatts,
        beamText,
        fNominal,
        eff,
        fFinal,
        upRatio,
        targetLevel,
        isNbrActive,
        avgLux,
        targetLux,
        targetUgr: isNbrActive && window.currentNbrTarget ? window.currentNbrTarget.ugr : 19,
        totalWatts,
        lpd,
        ugrStr,
        isOk
    };

    const images = {
        topografia: imgTopografia,
        legend: window.ReportExporter.getLegendPNG(window.FalseColorEngine.colorScale),
        polar: s.iesData ? window.ReportExporter.getPolarPNG(s.iesData, fNominal, fFinal) : null
    };

    // LUXSINTAX: Busca a Logo customizada salva localmente para o PDF do Método Lúmens
    const userLogoBase64 = localStorage.getItem('luxsintax_user_logo') || null;

    const blob = await window.ReportExporter.createGridPdf(PDFLib, reportData, images, userLogoBase64);

    // LUXSINTAX: Analytics - Rastreamento de Conversão (Geração de Relatório)
    if (typeof (window as any).gtag === 'function') {
        (window as any).gtag('event', 'generate_report', {
            report_type: 'Metodo_Lumens',
            is_nbr_active: isNbrActive
        });
    }

    const link = document.createElement('a');
    const safeProjectName = s.projectName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    link.download = `Estudo_LuxSintax_${safeProjectName}.pdf`;
    link.href = URL.createObjectURL(blob);
    link.click();

    if (btn) btn.innerHTML = originalBtnHTML;
};

window.generateLeedReport = async () => {
    try {
        const PDFLib = (window as any).PDFLib;
        if (!PDFLib) return alert('Biblioteca PDF não carregada. Aguarde alguns segundos.');

        const s = window.state.leedProject;
        if (s.rooms.length === 0) return alert('Adicione ao menos um ambiente ao projeto.');

        const summary = window.StandardsEngine.calculateLeedCompliance(s);
        
        const targetLabels: any = {
                baseline: 'ASHRAE Base (0%)',
                certified: 'Certified (-5%)',
                silver: 'Silver (-10%)',
                gold: 'Gold (-20%)',
                platinum: 'Platinum (-30%)',
                custom: `Customizado (-${s.customReduction || 0}%)`
            };
            const targetLabel = targetLabels[s.target] || 'ASHRAE Base (0%)';

            // LUXSINTAX: Blindagem Legal e Injeção de Logo (White-Label)
            summary.disclaimer = "Nota Técnica de Isenção de Responsabilidade: Os cálculos e métricas apresentados neste relatório baseiam-se em modelos matemáticos ideais e possuem caráter exclusivamente preliminar (Concept Design). Este documento destina-se ao estudo de viabilidade, orçamentação e pré-certificação (LEED/ASHRAE). Ele não substitui o projeto executivo luminotécnico assinado por um profissional legalmente habilitado (ART/RRT). A conformidade final e a segurança da instalação devem ser validadas in loco e submetidas a softwares de cálculo de inter-reflexão global para aprovação em órgãos oficiais.";

            // LUXSINTAX: Busca a Logo customizada salva localmente no perfil do usuário
            const userLogoBase64 = localStorage.getItem('luxsintax_user_logo') || null;

            const blob = await window.ReportExporter.createLeedPdf(PDFLib, s, summary, targetLabel, userLogoBase64);

            // LUXSINTAX: Analytics - Rastreamento de Conversão (Geração de Relatório)
            if (typeof (window as any).gtag === 'function') {
                (window as any).gtag('event', 'generate_report', {
                    report_type: 'Projeto_LEED',
                    leed_target: s.target
                });
            }

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const safeName = s.name ? s.name.replace(/\s+/g, '_') : 'Projeto';
        link.download = `LuxSintax_LEED_${safeName}.pdf`;
        link.click();
    } catch (err: any) {
        console.error("[LuxSintax] Erro no PDF LEED:", err);
        alert("Erro ao gerar o relatório LEED: " + err.message);
    }
};

window.initNbrSelector = function() {
    const catSelect = document.getElementById('nbr-cat-select') as HTMLSelectElement;
    const roomSelect = document.getElementById('nbr-room-select') as HTMLSelectElement;
    
    if (!catSelect || !window.normsDatabase) return;
    
    const msgCat = window.i18n[window.currentLang]?.opt_cat_def || "Selecione a Categoria (Ex: Escritório)...";
    const msgRoom = window.i18n[window.currentLang]?.opt_room_def || "Selecione a Tarefa / Ambiente...";

    catSelect.innerHTML = `<option value="" disabled selected data-i18n="opt_cat_def">${msgCat}</option>`;
    if (roomSelect) {
        roomSelect.innerHTML = `<option value="" disabled selected data-i18n="opt_room_def">${msgRoom}</option>`;
        roomSelect.disabled = true;
    }

    const isEn = window.currentLang === 'en';
    const uniqueCatsMap = new Map();
    
    window.normsDatabase.forEach((n: any) => {
        if (!uniqueCatsMap.has(n.cat)) {
            uniqueCatsMap.set(n.cat, (isEn && n.cat_en) ? n.cat_en : n.cat);
        }
    });

    const uniqueCats = Array.from(uniqueCatsMap.keys()).sort();
    uniqueCats.forEach((cat: string) => {
        const option = document.createElement('option');
        option.value = cat; // O Value continua em PT como chave única primária (SSOT)
        option.text = uniqueCatsMap.get(cat);
        catSelect.appendChild(option);
    });
};

window.updateNbrRooms = function() {
    const catSelect = document.getElementById('nbr-cat-select') as HTMLSelectElement;
    const roomSelect = document.getElementById('nbr-room-select') as HTMLSelectElement;
    
    if (!catSelect || !roomSelect) return;
    
    const selectedCat = catSelect.value;
    if (!selectedCat) return;

    const msgRoom = window.i18n[window.currentLang]?.opt_room_def || "Selecione a Tarefa / Ambiente...";
    roomSelect.innerHTML = `<option value="" disabled selected data-i18n="opt_room_def">${msgRoom}</option>`;
    roomSelect.disabled = false;
    roomSelect.classList.remove('opacity-50', 'cursor-not-allowed');

    const isEn = window.currentLang === 'en';
    const rooms = window.normsDatabase.filter((n: any) => n.cat === selectedCat);
    
    rooms.forEach((n: any) => {
        const opt = document.createElement('option');
        opt.value = n.room;
        // LUXSINTAX: Blindagem contra valores null/undefined usando setAttribute
        opt.setAttribute('data-lux', String(n.lux || 0));
        opt.setAttribute('data-ugr', n.ugr === '-' ? '99' : String(n.ugr || 99));
        opt.setAttribute('data-plane', n.plane || 'HP');
        opt.innerText = (isEn && n.room_en) ? n.room_en : n.room;
        roomSelect.appendChild(opt);
    });
};

window.applyNbrRules = function() {
    const roomSelect = document.getElementById('nbr-room-select') as HTMLSelectElement;
    if (!roomSelect || roomSelect.selectedIndex < 0) return;

    const selectedOption = roomSelect.options[roomSelect.selectedIndex];
    if (!selectedOption || !selectedOption.value) return;

    // LUXSINTAX: Extração segura dos atributos de dados (Fail-fast prevention)
    const tLux = parseFloat(selectedOption.getAttribute('data-lux') || '0');
    const tUgr = parseFloat(selectedOption.getAttribute('data-ugr') || '99');
    const tPlane = selectedOption.getAttribute('data-plane') || 'HP';

    window.currentNbrTarget = { lux: tLux, ugr: tUgr, plane: tPlane };

    const luxDisplay = document.getElementById('nbr-target-lux-display');
    const ugrDisplay = document.getElementById('nbr-target-ugr-display');
    
    if (luxDisplay) luxDisplay.innerText = `${tLux} lx`;
    if (ugrDisplay) ugrDisplay.innerText = tUgr === 99 ? 'N/A' : String(tUgr);

    const gridTargetLuxInput = document.getElementById('g-targetLux') as HTMLInputElement;
    const gridRangeTargetLux = document.getElementById('range-g-targetLux') as HTMLInputElement;
    
    if (gridTargetLuxInput && gridRangeTargetLux && window.state && window.state.grid) {
        gridTargetLuxInput.value = String(tLux);
        gridRangeTargetLux.value = String(tLux);
        window.state.grid.targetLux = tLux;
        
        // LUXSINTAX: Força o motor para o modo "Alvo Lux" garantindo que a norma seja calculada
        if (window.setGridCalcMethod) {
            window.setGridCalcMethod('target');
        }
    }

    window.updateCalculations();
};

window.populateCategoryFilter = function() {
    const sel = document.getElementById('category-filter') as HTMLSelectElement;
    if(!sel || sel.options.length > 1) return;
    
    const isEn = window.currentLang === 'en';
    const uniqueCatsMap = new Map();
    window.normsDatabase.forEach((n: any) => {
        if (!uniqueCatsMap.has(n.cat)) {
            uniqueCatsMap.set(n.cat, (isEn && n.cat_en) ? n.cat_en : n.cat);
        }
    });
    
    const uniqueCats = Array.from(uniqueCatsMap.keys()).sort();
    uniqueCats.forEach((c: string) => { 
        const o = document.createElement('option'); 
        o.value = c; 
        o.innerText = uniqueCatsMap.get(c); 
        sel.appendChild(o); 
    });
};

window.filterNorms = function() {
    const cat = (document.getElementById('category-filter') as HTMLSelectElement).value;
    const searchInput = document.getElementById('search-filter') as HTMLInputElement;
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const isEn = window.currentLang === 'en';
    
    const filtered = window.normsDatabase.filter((n: any) => {
        const matchCat = cat === 'all' || n.cat === cat;
        const searchSource = isEn ? `${n.cat_en} ${n.room_en}`.toLowerCase() : `${n.cat} ${n.room}`.toLowerCase();
        const matchSearch = searchSource.includes(searchTerm);
        return matchCat && matchSearch;
    });
    
    document.getElementById('nbr8995-tbody')!.innerHTML = filtered.map((n: any) => {
        const catLabel = (isEn && n.cat_en) ? n.cat_en : n.cat;
        const roomLabel = (isEn && n.room_en) ? n.room_en : n.room;
        return `<tr class="hover:bg-slate-50 transition-colors border-b border-slate-100"><td class="p-4 font-black text-luminous-gold text-xs uppercase">${catLabel}</td><td class="p-4 text-slate-500 font-bold">${roomLabel}</td><td class="p-4 text-center font-black text-starlight bg-slate-50">${n.lux}</td><td class="p-4 text-center text-slate-400">${n.ugr}</td><td class="p-4 text-center text-slate-400">${n.ra}</td></tr>`;
    }).join('');
};

window.switchQueryTab = function(t: string) {
    ['nbr8995','nbr5101','leed'].forEach(k => {
        document.getElementById('content-'+k)?.classList.toggle('hidden', k!==t);
        document.getElementById('btn-q-'+k)!.className = `query-tab-btn ${k===t ? 'query-tab-active' : ''}`;
    });
    const searchContainer = document.getElementById('search-container');
    if(searchContainer) searchContainer.classList.toggle('hidden', t !== 'nbr8995');

    if(t==='nbr8995') window.filterNorms();
    if(t==='nbr5101') window.calc5101();
    if(t==='leed') window.updateLeedTargets();
};

window.calc5101 = function() {
    const params = {
        speed: parseInt((document.getElementById('m-speed') as HTMLSelectElement).value),
        volume: parseInt((document.getElementById('m-volume') as HTMLSelectElement).value),
        separation: parseInt((document.getElementById('m-separation') as HTMLSelectElement).value),
        density: parseInt((document.getElementById('m-density') as HTMLSelectElement).value),
        complexity: parseInt((document.getElementById('m-complexity') as HTMLSelectElement).value),
        ambient: parseInt((document.getElementById('m-ambient') as HTMLSelectElement).value)
    };
    const res = window.StandardsEngine.calculateNbr5101(params);
    document.getElementById('m-result-class')!.innerText = res.className;
    document.getElementById('m-result-desc')!.innerText = res.desc;
    document.getElementById('res-lmed-val')!.innerText = res.lmed.toFixed(1); document.getElementById('bar-lmed')!.style.width = (res.lmed/2.0*100)+'%';
    document.getElementById('res-emed-val')!.innerText = String(res.emed); document.getElementById('bar-emed')!.style.width = (res.emed/30*100)+'%';
    document.getElementById('res-u0-val')!.innerText = res.u0.toFixed(2); document.getElementById('bar-u0')!.style.width = (res.u0/0.4*100)+'%';
    document.getElementById('res-ti-val')!.innerText = String(res.ti); document.getElementById('bar-ti')!.style.width = (res.ti/20*100)+'%';
};

window.switchCertTab = function(t: string) {
    ['leed','well'].forEach(k => { document.getElementById('pane-'+k)?.classList.toggle('hidden', k!==t); document.getElementById('cert-tab-'+k)!.className = `cert-tab ${k===t?'active':'inactive'}`; }); 
};

window.updateLeedTargets = function() {
    const area = parseFloat((document.getElementById('leed-area-input') as HTMLInputElement).value) || 0;
    const red = window.currentLeedTarget === 'gold' ? 0.20 : (window.currentLeedTarget === 'platinum' ? 0.30 : (window.currentLeedTarget === 'silver' ? 0.10 : 0.05));
    document.getElementById('leed-reduction-display')!.innerText = (red*100).toFixed(0)+'%';
    document.getElementById('leed-lpd-body')!.innerHTML = window.lpdBaselines.map((b: any) => `<tr class="border-b border-slate-100"><td class="p-3 text-starlight font-bold">${b.type}</td><td class="p-3 text-center text-slate-500 font-mono">${b.base}</td><td class="p-3 text-center text-luminous-gold font-black">${(b.base*(1-red)).toFixed(2)}</td><td class="p-3 text-right text-tech-cyan font-black">${(b.base*(1-red)*area).toFixed(0)} W</td></tr>`).join('');
};

window.setLeedTarget = function(t: string) { window.currentLeedTarget = t; document.querySelectorAll('.leed-level-box').forEach(b => b.classList.remove('active')); document.getElementById('lvl-'+t)?.classList.add('active'); window.updateLeedTargets(); };

window.toggleWellFeature = function(el: HTMLElement, pts: number) { el.classList.toggle('active'); let total=0; document.querySelectorAll('.well-toggle-group.active').forEach(i => total += parseInt(i.getAttribute('data-points')!)); document.getElementById('well-total-score')!.innerHTML = `${total} <span class="text-xs text-slate-400 font-normal">/ 8</span>`; document.getElementById('well-progress-bar')!.style.width = (total/8*100)+'%'; document.getElementById('well-progress-text')!.innerText = (total/8*100).toFixed(0)+'%'; const icon = el.querySelector('.fa-check')!; if(el.classList.contains('active')) icon.classList.remove('opacity-0'); else icon.classList.add('opacity-0'); };

window.addLeedRoom = function() {
    const room = { 
        id: Date.now(),
        floor: "GERAL", 
        name: "Novo Ambiente", 
        area: 50, 
        baseLpd: 0, 
        typology: "", 
        leedCategory: "interior", // LUXSINTAX: Nova diretiva de zona LEED
        expanded: true,
        fixtures: [{ id: Date.now() + 1, label: "Luminária Genérica", power: 0, qty: 1 }]
    };
    window.state.leedProject.rooms.unshift(room);
    window.renderLeedProject();
};

window.duplicateLeedRoom = function(roomId: number) {
    const roomToCopy = window.state.leedProject.rooms.find((r: any) => r.id === roomId);
    if (roomToCopy) {
        const clonedRoom = JSON.parse(JSON.stringify(roomToCopy));
        clonedRoom.id = Date.now();
        clonedRoom.name = clonedRoom.name + " (Cópia)";
        clonedRoom.expanded = true;
        clonedRoom.fixtures.forEach((f: any, idx: number) => { f.id = Date.now() + 100 + idx; });
        window.state.leedProject.rooms.unshift(clonedRoom);
        window.renderLeedProject();
    }
};

window.toggleLeedRoom = function(roomId: number) {
    const room = window.state.leedProject.rooms.find((r: any) => r.id === roomId);
    if (room) {
        room.expanded = !room.expanded;
        const detailsDiv = document.getElementById(`room-details-${roomId}`);
        const btnIcon = document.getElementById(`icon-toggle-${roomId}`);
        if (detailsDiv) detailsDiv.style.display = room.expanded ? 'block' : 'none';
        if (btnIcon) btnIcon.className = `fas ${room.expanded ? 'fa-minus' : 'fa-plus'} text-[8px]`;
    }
};

window.updateLeedTargetMode = function(val: string) {
    window.state.leedProject.target = val;
    window.updateGlobalLeedSummary();
    window.renderLeedProject();
};

window.updateCustomLeedReduction = function(val: number) {
    window.state.leedProject.customReduction = val;
    window.updateGlobalLeedSummary();
};

window.removeLeedRoom = function(roomId: number) {
    window.state.leedProject.rooms = window.state.leedProject.rooms.filter((r: any) => r.id !== roomId);
    window.renderLeedProject();
};

window.updateLeedRoomData = function(roomId: number, field: string, value: any) {
    const room = window.state.leedProject.rooms.find((r: any) => r.id === roomId);
    if (room) {
        if (['name', 'typology', 'floor', 'leedCategory', 'unit'].includes(field)) {
            room[field] = value;
        } else if (field === 'measurement') {
            if (room.unit === 'W/m') room.length = parseFloat(value) || 0;
            else room.area = parseFloat(value) || 0;
        } else {
            room[field] = parseFloat(value) || 0;
        }
        
        if (field === 'unit') {
            if (value === 'W/m') { room.length = room.area || 0; delete room.area; }
            else { room.area = room.length || 0; delete room.length; }
            window.renderLeedProject();
            return;
        }
        
        if (field === 'typology') {
            const baseline = window.lpdBaselines.find((b: any) => b.type === value);
            const extBaseline = window.exteriorLpdBaselines ? window.exteriorLpdBaselines.find((b: any) => b.type === value) : null;
            
            if (baseline) {
                room.baseLpd = baseline.base;
                room.unit = 'W/m²';
            } else if (extBaseline) {
                const z = window.state.leedProject.lightingZone || 'LZ3';
                room.baseLpd = extBaseline.zoneAllowances[z] || 0;
                room.unit = extBaseline.unit;
            }
            window.renderLeedProject();
            return;
        }
        
        // LUXSINTAX: Atualização Visual Silenciosa em Tempo Real
        window.updateGlobalLeedSummary();
        window.updateLeedRoomUI(roomId);
    }
};

window.addLeedFixture = function(roomId: number) {
    const room = window.state.leedProject.rooms.find((r: any) => r.id === roomId);
    if (room) {
        room.fixtures.push({ id: Date.now(), label: "Luminária Nova", power: 15, qty: 1 });
        window.renderLeedProject(); // Mudança estrutural exige recriar o HTML
    }
};

window.removeLeedFixture = function(roomId: number, fixtureId: number) {
    const room = window.state.leedProject.rooms.find((r: any) => r.id === roomId);
    if (room) {
        room.fixtures = room.fixtures.filter((f: any) => f.id !== fixtureId);
        window.renderLeedProject();
    }
};

window.updateLeedFixtureData = function(roomId: number, fixtureId: number, field: string, value: any) {
    const room = window.state.leedProject.rooms.find((r: any) => r.id === roomId);
    if (room) {
        const fixture = room.fixtures.find((f: any) => f.id === fixtureId);
        if (fixture) {
            fixture[field] = field === 'label' ? value : parseFloat(value) || 0;
            
            const subtotalEl = document.getElementById(`subtotal-${roomId}-${fixtureId}`);
            if (subtotalEl) subtotalEl.innerText = `${(fixture.power * fixture.qty).toFixed(1)} W`;
            
            // LUXSINTAX: Atualização Visual Silenciosa em Tempo Real
            window.updateGlobalLeedSummary();
            window.updateLeedRoomUI(roomId);
        }
    }
};

window.updateLeedRoomUI = function(roomId: number) {
    const room = window.state.leedProject.rooms.find((r: any) => r.id === roomId);
    if (!room) return;
    
    const roomTotalWatts = room.fixtures.reduce((sum: number, f: any) => sum + (f.power * f.qty), 0);
    const measurement = room.unit === 'W/m' ? (room.length || 0) : (room.area || 0);
    const roomLpd = measurement > 0 ? roomTotalWatts / measurement : 0;
    
    // LUXSINTAX: Semaforização de Estado (Traffic Light)
    const isMissingData = measurement === 0 || room.typology === "" || room.fixtures.length === 0 || room.fixtures.some((f:any) => f.power === 0 || f.qty === 0);
    const isOverLimit = !isMissingData && room.baseLpd > 0 && roomLpd > room.baseLpd;
    
    const wEl = document.getElementById(`room-w-${roomId}`);
    const lpdEl = document.getElementById(`room-lpd-${roomId}`);
    const cardEl = document.getElementById(`room-card-${roomId}`);
    const nameEl = document.getElementById(`room-name-${roomId}`);
    
    if (wEl) wEl.innerText = roomTotalWatts.toFixed(1);
    if (lpdEl) lpdEl.innerText = roomLpd.toFixed(2);
    
    if (cardEl) {
        cardEl.classList.remove('border-l-red-500', 'border-l-amber-400', 'border-l-green-500', 'border-slate-200', 'dark:border-slate-700', 'shadow-[0_0_15px_rgba(239,68,68,0.15)]');
        
        if (isMissingData) {
            cardEl.classList.add('border-l-4', 'border-l-amber-400', 'border-slate-200', 'dark:border-slate-700');
            if(nameEl) { nameEl.classList.remove('text-red-500', 'text-starlight', 'dark:text-white'); nameEl.classList.add('text-amber-500'); }
        } else if (isOverLimit) {
            cardEl.classList.add('border-l-4', 'border-l-red-500', 'border-slate-200', 'dark:border-slate-700', 'shadow-[0_0_15px_rgba(239,68,68,0.15)]');
            if(nameEl) { nameEl.classList.remove('text-amber-500', 'text-starlight', 'dark:text-white'); nameEl.classList.add('text-red-500'); }
        } else {
            cardEl.classList.add('border-l-4', 'border-l-green-500', 'border-slate-200', 'dark:border-slate-700');
            if(nameEl) { nameEl.classList.remove('text-red-500', 'text-amber-500'); nameEl.classList.add('text-starlight', 'dark:text-white'); }
        }
    }
    
    if (isOverLimit) {
        wEl?.classList.add('text-red-500'); wEl?.classList.remove('text-starlight', 'dark:text-white', 'text-amber-500');
        lpdEl?.classList.add('text-red-500'); lpdEl?.classList.remove('text-starlight', 'dark:text-white', 'text-amber-500');
    } else if (isMissingData) {
        wEl?.classList.add('text-amber-500'); wEl?.classList.remove('text-starlight', 'dark:text-white', 'text-red-500');
        lpdEl?.classList.add('text-amber-500'); lpdEl?.classList.remove('text-starlight', 'dark:text-white', 'text-red-500');
    } else {
        wEl?.classList.remove('text-red-500', 'text-amber-500'); wEl?.classList.add('text-starlight', 'dark:text-white');
        lpdEl?.classList.remove('text-red-500', 'text-amber-500'); lpdEl?.classList.add('text-starlight', 'dark:text-white');
    }
};

window.updateGlobalLeedSummary = () => {
    const s = window.state.leedProject;
    const summary = window.StandardsEngine.calculateLeedCompliance(s);
    document.getElementById('global-leed-watts')!.innerHTML = `${summary.totalWatts.toFixed(1)} <span class="text-lg font-light text-slate-500 dark:text-slate-400">/ ${summary.allowedWatts.toFixed(1)} W Permitidos</span>`;
    document.getElementById('global-leed-lpd')!.innerHTML = `${summary.currentLpd.toFixed(2)} <span class="text-lg font-light text-slate-500 dark:text-slate-400">W/m²</span>`;
    const statusBox = document.getElementById('global-leed-status');
    if (statusBox && summary.totalArea > 0) {
        statusBox.classList.remove('animate-pulse');
        statusBox.innerText = summary.isCompliant ? "COMPLIANCE ATINGIDO (APROVADO)" : "ALERTA: CARGA EXCEDE LIMITE ASHRAE";
        statusBox.className = summary.isCompliant 
            ? "bg-leed-green/20 border border-leed-green px-8 py-4 rounded-2xl text-leed-green font-black text-sm tracking-widest text-center" 
            : "bg-red-500/20 border border-red-500 px-8 py-4 rounded-2xl text-red-500 font-black text-sm tracking-widest text-center";
    }
};

window.renderLeedProject = function() {
    const container = document.getElementById('leed-project-container');
    if(!container) return;
    const s = window.state.leedProject;
    
    const savedOptions = (window.userLeedProjects || []).map((p: any) => `<option value="${p.id}" ${s.db_id === p.id ? 'selected' : ''}>${p.project_name}</option>`).join('');
    
    let html = `
            <div class="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 shadow-lg border border-slate-200 dark:border-slate-800 transition-colors">
                <div class="flex-grow w-full lg:w-auto">
                    <label class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest block mb-1">Nome do Projeto</label>
                    <input type="text" value="${s.name}" oninput="window.state.leedProject.name = this.value" class="bg-transparent border-b border-slate-300 dark:border-slate-700 text-starlight dark:text-white font-black text-lg w-full focus:border-luminous-gold outline-none py-1 transition-colors">
                </div>
                
                <div class="w-full lg:w-auto">
                    <label class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest block mb-1">PROJETO SALVO</label>
                    <div class="flex items-center gap-2">
                        <select id="load-leed-select" onchange="if(this.value === 'NEW') window.createNewLeedProject();" class="bg-white dark:bg-slate-800 text-starlight dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 font-bold text-[10px] uppercase outline-none w-full lg:w-48 cursor-pointer focus:border-luminous-gold transition-colors">
                            <option value="" disabled selected>Selecionar...</option>
                            <option value="NEW" class="text-luminous-gold font-black">+ NOVO PROJETO</option>
                            ${savedOptions}
                        </select>
                        <button onclick="window.loadSpecificLeedProject()" class="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-starlight dark:text-white w-9 h-9 flex items-center justify-center rounded-lg transition-colors border border-slate-200 dark:border-slate-700" title="Carregar"><i class="fas fa-folder-open"></i></button>
                        <button onclick="window.deleteSpecificLeedProject()" class="bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/50 text-slate-500 hover:text-red-500 dark:text-slate-400 w-9 h-9 flex items-center justify-center rounded-lg transition-colors border border-slate-200 dark:border-slate-700" title="Excluir"><i class="fas fa-trash"></i></button>
                    </div>
                </div>

                <div class="w-full lg:w-auto border-l border-slate-300 dark:border-slate-700 pl-6 hidden lg:flex items-end gap-2 transition-colors">
                    <div>
                        <label class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest block mb-1">Lighting Zone</label>
                        <select onchange="window.state.leedProject.lightingZone = this.value; window.updateGlobalLeedSummary(); window.renderLeedProject();" class="bg-white dark:bg-slate-800 text-starlight dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 font-bold text-[10px] uppercase outline-none w-full cursor-pointer focus:border-luminous-gold transition-colors">
                            <option value="LZ0" ${s.lightingZone === 'LZ0' ? 'selected' : ''}>LZ0 (Natural)</option>
                            <option value="LZ1" ${s.lightingZone === 'LZ1' ? 'selected' : ''}>LZ1 (Rural)</option>
                            <option value="LZ2" ${s.lightingZone === 'LZ2' ? 'selected' : ''}>LZ2 (Residencial)</option>
                            <option value="LZ3" ${s.lightingZone === 'LZ3' || !s.lightingZone ? 'selected' : ''}>LZ3 (Comercial)</option>
                            <option value="LZ4" ${s.lightingZone === 'LZ4' ? 'selected' : ''}>LZ4 (Urbano)</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest block mb-1">Meta ASHRAE 90.1</label>
                        <select onchange="window.updateLeedTargetMode(this.value)" class="bg-white dark:bg-slate-800 text-luminous-gold border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 font-bold text-[10px] uppercase outline-none w-full cursor-pointer focus:border-luminous-gold transition-colors">
                            <option value="baseline" ${s.target === 'baseline' ? 'selected' : ''}>ASHRAE Base (0%)</option>
                            <option value="certified" ${s.target === 'certified' ? 'selected' : ''}>Certified (-5%)</option>
                            <option value="silver" ${s.target === 'silver' ? 'selected' : ''}>Silver (-10%)</option>
                            <option value="gold" ${s.target === 'gold' ? 'selected' : ''}>Gold (-20%)</option>
                            <option value="platinum" ${s.target === 'platinum' ? 'selected' : ''}>Platinum (-30%)</option>
                            <option value="custom" ${s.target === 'custom' ? 'selected' : ''}>Customizado (Manual)</option>
                        </select>
                    </div>
                    ${s.target === 'custom' ? `
                    <div class="w-20 animate-fade-in">
                        <label class="text-[10px] text-tech-cyan font-bold uppercase tracking-widest block mb-1">Redução</label>
                        <div class="relative">
                            <input type="number" value="${s.customReduction || 15}" oninput="window.updateCustomLeedReduction(parseFloat(this.value) || 0)" class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2.5 text-[10px] text-tech-cyan font-black outline-none focus:border-luminous-gold text-right pr-6 transition-colors">
                            <span class="absolute right-2 top-2.5 text-[10px] text-slate-500 dark:text-slate-400 font-bold">%</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <div class="flex gap-2 w-full lg:w-auto">
                    <button onclick="window.saveLeedProject()" id="btn-save-leed" class="flex-1 lg:flex-none bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-white px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-slate-200 dark:border-slate-600"><i class="fas fa-save mr-2"></i> Salvar</button>
                    <button onclick="window.generateLeedReport()" class="flex-1 lg:flex-none bg-luminous-gold hover:bg-amber-600 text-white px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg"><i class="fas fa-file-pdf mr-2"></i> Relatório</button>
                </div>
            </div>
        `;

    // LUXSINTAX: Agrupamento por Pavimento e Semaforização
    const groupedRooms = s.rooms.reduce((acc: any, room: any) => {
        const floor = (room.floor || 'GERAL').trim().toUpperCase();
        if (!acc[floor]) acc[floor] = [];
        acc[floor].push(room);
        return acc;
    }, {});

    Object.keys(groupedRooms).sort().forEach((floorName) => {
        const floorRooms = groupedRooms[floorName];
        
        let floorWatts = 0;
        let floorArea = 0;
        let hasYellow = false;
        let hasRed = false;

        floorRooms.forEach((r: any) => {
            const measurement = r.unit === 'W/m' ? (r.length || 0) : (r.area || 0);
            const rWatts = r.fixtures.reduce((s:number, f:any) => s + (f.power * f.qty), 0);
            const rLpd = measurement > 0 ? rWatts / measurement : 0;
            
            const isMissingData = measurement === 0 || r.typology === "" || r.fixtures.length === 0 || r.fixtures.some((f:any) => f.power === 0 || f.qty === 0);
            const isOverLimit = !isMissingData && r.baseLpd > 0 && rLpd > r.baseLpd;
            
            if (isMissingData) hasYellow = true;
            if (isOverLimit) hasRed = true;
            
            floorWatts += rWatts;
            if (r.unit !== 'W/m') floorArea += measurement;
        });
        
        const floorLpd = floorArea > 0 ? (floorWatts / floorArea).toFixed(2) : '0.00';
        
        let floorStatusColor = 'text-starlight dark:text-white border-slate-200 dark:border-slate-700';
        let floorBgColor = 'bg-white dark:bg-slate-800';
        if (hasRed) { floorStatusColor = 'text-red-500 border-red-300'; floorBgColor = 'bg-red-50 dark:bg-red-900/10'; }
        else if (hasYellow) { floorStatusColor = 'text-amber-500 border-amber-300'; floorBgColor = 'bg-amber-50 dark:bg-amber-900/10'; }
        else { floorStatusColor = 'text-leed-green border-green-300'; floorBgColor = 'bg-green-50 dark:bg-green-900/10'; }

        // LUXSINTAX: Persistência de Estado Estrutural do Acordeão
        if (!window.state.leedProject.collapsedFloors) window.state.leedProject.collapsedFloors = {};
        const isCollapsed = window.state.leedProject.collapsedFloors[floorName] === true;
        const safeFloorId = floorName.replace(/[^a-zA-Z0-9]/g, '_');

        html += `
        <div class="mb-6 animate-fade-in-up">
            <div onclick="window.state.leedProject.collapsedFloors['${floorName}'] = !window.state.leedProject.collapsedFloors['${floorName}']; document.getElementById('floor-content-${safeFloorId}').classList.toggle('hidden'); document.getElementById('floor-icon-${safeFloorId}').classList.toggle('rotate-180');" class="flex justify-between items-center cursor-pointer p-4 rounded-xl border ${floorStatusColor} ${floorBgColor} shadow-sm transition-colors mb-4">
                <div class="flex items-center gap-3">
                    <i class="fas fa-layer-group opacity-50"></i>
                    <h3 class="font-black tracking-widest uppercase text-sm">PAVIMENTO: ${floorName} <span class="ml-2 text-[10px] bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full font-bold opacity-70">${floorRooms.length} ambientes</span></h3>
                </div>
                <div class="flex items-center gap-6">
                    <div class="text-right hidden sm:block">
                        <div class="text-[9px] uppercase font-bold opacity-60 tracking-widest">Carga Parcial</div>
                        <div class="font-black text-sm">${floorWatts.toFixed(1)} W</div>
                    </div>
                    <div class="text-right hidden sm:block">
                        <div class="text-[9px] uppercase font-bold opacity-60 tracking-widest">LPD Médio</div>
                        <div class="font-black text-sm">${floorLpd} W/m²</div>
                    </div>
                    <i id="floor-icon-${safeFloorId}" class="fas fa-chevron-up transition-transform opacity-50 ${isCollapsed ? 'rotate-180' : ''}"></i>
                </div>
            </div>
            <div id="floor-content-${safeFloorId}" class="space-y-4 pl-0 md:pl-4 border-l-2 border-transparent md:border-slate-200 dark:md:border-slate-700 transition-all ${isCollapsed ? 'hidden' : ''}">
        `;

        html += floorRooms.map((room: any) => {
            const roomTotalWatts = room.fixtures.reduce((sum: number, f: any) => sum + (f.power * f.qty), 0);
            const measurement = room.unit === 'W/m' ? (room.length || 0) : (room.area || 0);
            const roomLpd = measurement > 0 ? roomTotalWatts / measurement : 0;
            
            const isMissingData = measurement === 0 || room.typology === "" || room.fixtures.length === 0 || room.fixtures.some((f:any) => f.power === 0 || f.qty === 0);
            const isOverLimit = !isMissingData && room.baseLpd > 0 && roomLpd > room.baseLpd;
            
            let borderClass = 'border-l-4 border-l-green-500 border-slate-200 dark:border-slate-700';
            let titleColor = 'text-starlight dark:text-white';
            let statusIcon = '<i class="fas fa-check-circle text-green-500" title="OK"></i>';
            
            if (isMissingData) {
                borderClass = 'border-l-4 border-l-amber-400 border-slate-200 dark:border-slate-700';
                titleColor = 'text-amber-500';
                statusIcon = '<i class="fas fa-exclamation-circle text-amber-400" title="Dados Incompletos"></i>';
            } else if (isOverLimit) {
                borderClass = 'border-l-4 border-l-red-500 border-slate-200 dark:border-slate-700 shadow-[0_0_15px_rgba(239,68,68,0.15)]';
                titleColor = 'text-red-500 dark:text-red-500';
                statusIcon = '<i class="fas fa-times-circle text-red-500" title="Limite Excedido"></i>';
            }
            
            const expanded = room.expanded !== false;
            
            let roomHtml = `
                <div id="room-card-${room.id}" class="bg-slate-50 dark:bg-slate-800/30 p-3 lg:p-4 rounded-xl border ${borderClass} transition-all">
                    <div class="flex flex-wrap items-center gap-3 w-full">
                        
                        <div class="flex items-center gap-3 flex-grow min-w-[200px]">
                            <button onclick="window.toggleLeedRoom(${room.id})" class="text-slate-400 hover:text-luminous-gold w-6 h-6 flex-shrink-0 flex items-center justify-center rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-sm transition-colors" title="Expandir/Recolher">
                                <i id="icon-toggle-${room.id}" class="fas ${expanded ? 'fa-minus' : 'fa-plus'} text-[10px]"></i>
                            </button>
                            <div class="flex flex-col w-full max-w-[400px]">
                                <div class="flex items-center gap-2">
                                    ${statusIcon}
                                    <input type="text" value="${room.floor || ''}" placeholder="PAVIMENTO" oninput="window.updateLeedRoomData(${room.id}, 'floor', this.value)" class="text-[9px] font-bold text-slate-400 dark:text-slate-500 bg-transparent border-none outline-none uppercase truncate w-full">
                                </div>
                                <input type="text" id="room-name-${room.id}" value="${room.name}" oninput="window.updateLeedRoomData(${room.id}, 'name', this.value)" class="text-xs font-black ${titleColor} bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-luminous-gold transition-colors w-full pb-1 uppercase outline-none truncate mt-[-2px]">
                            </div>
                        </div>
                        
                        <div class="flex items-center gap-2 flex-shrink-0">
                            <div class="flex items-center gap-1.5 bg-white dark:bg-slate-700 px-2 h-[34px] rounded border border-slate-200 dark:border-slate-600 shadow-sm">
                                <select onchange="window.updateLeedRoomData(${room.id}, 'unit', this.value)" class="text-[9px] font-black text-slate-500 bg-transparent outline-none cursor-pointer uppercase tracking-widest pl-1">
                                    <option value="W/m²" ${room.unit !== 'W/m' ? 'selected' : ''}>ÁREA (m²)</option>
                                    <option value="W/m" ${room.unit === 'W/m' ? 'selected' : ''}>COMPR. (m)</option>
                                </select>
                                <input type="number" value="${room.unit === 'W/m' ? (room.length || 0) : (room.area || 0)}" oninput="window.updateLeedRoomData(${room.id}, 'measurement', this.value)" class="w-12 text-right bg-transparent text-[11px] font-black text-starlight dark:text-white outline-none focus:text-luminous-gold">
                            </div>
                            
                            <div class="flex items-center gap-1.5 bg-white dark:bg-slate-700 px-2 h-[34px] rounded border border-slate-200 dark:border-slate-600 shadow-sm">
                                <select onchange="window.updateLeedRoomData(${room.id}, 'leedCategory', this.value)" class="custom-select w-[90px] md:w-[120px] truncate text-[10px] bg-transparent font-bold text-starlight dark:text-white outline-none cursor-pointer focus:text-luminous-gold uppercase border-r border-slate-200 dark:border-slate-600 pr-2 mr-2">
                                    <option value="interior" ${room.leedCategory === 'interior' || !room.leedCategory ? 'selected' : ''}>${window.currentLang === 'en' ? 'INTERIOR' : 'INTERIOR'}</option>
                                    <option value="facade" ${room.leedCategory === 'facade' ? 'selected' : ''}>${window.currentLang === 'en' ? 'FACADE' : 'FACHADA'}</option>
                                    <option value="exterior" ${room.leedCategory === 'exterior' ? 'selected' : ''}>${window.currentLang === 'en' ? 'OUTDOOR' : 'EXTERNA'}</option>
                                </select>
                                <select onchange="window.updateLeedRoomData(${room.id}, 'typology', this.value)" class="custom-select w-[140px] md:w-[220px] truncate text-[10px] bg-transparent font-bold text-starlight dark:text-white outline-none cursor-pointer focus:text-luminous-gold uppercase">
                                    <option value="" disabled ${!room.typology ? 'selected' : ''}>TIPOLOGIA ASHRAE...</option>
                                    <optgroup label="Interiores (W/m²)">
                                        ${[...window.lpdBaselines].sort((a: any, b: any) => a.type.localeCompare(b.type)).map((b: any) => `<option value="${b.type}" ${room.typology === b.type ? 'selected' : ''}>${b.type} (${b.base} W/m²)</option>`).join('')}
                                    </optgroup>
                                    <optgroup label="Exteriores & Fachadas">
                                        ${window.exteriorLpdBaselines ? [...window.exteriorLpdBaselines].sort((a: any, b: any) => a.type.localeCompare(b.type)).map((b: any) => {
                                            const z = window.state.leedProject.lightingZone || 'LZ3';
                                            const limit = b.zoneAllowances ? b.zoneAllowances[z] : 0;
                                            return `<option value="${b.type}" ${room.typology === b.type ? 'selected' : ''}>${b.type} (${limit} ${b.unit})</option>`;
                                        }).join('') : ''}
                                    </optgroup>
                                </select>
                            </div>
                        </div>
                        
                        <div class="flex items-center gap-2 flex-shrink-0 ml-0 xl:ml-auto w-full xl:w-auto justify-end mt-2 xl:mt-0">
                            <div class="flex items-center gap-2 bg-white dark:bg-slate-700 px-3 h-[34px] rounded border border-slate-200 dark:border-slate-600 shadow-sm">
                                <div class="text-[10px] font-bold"><span class="text-slate-400">W:</span> <span id="room-w-${room.id}" class="${titleColor} font-black">${roomTotalWatts.toFixed(1)}</span></div>
                                <div class="w-px h-4 bg-slate-300 dark:bg-slate-600"></div>
                                <div class="text-[10px] font-bold"><span class="text-slate-400">LPD:</span> <span id="room-lpd-${room.id}" class="${titleColor} font-black">${roomLpd.toFixed(2)}</span></div>
                            </div>
                            <button onclick="window.duplicateLeedRoom(${room.id})" class="text-slate-400 hover:text-tech-cyan transition-colors w-8 h-[34px] flex items-center justify-center rounded hover:bg-cyan-50 dark:hover:bg-cyan-900/20 border border-transparent hover:border-cyan-200 dark:hover:border-cyan-800" title="Duplicar Ambiente"><i class="fas fa-copy text-[12px]"></i></button>
                            <button onclick="window.removeLeedRoom(${room.id})" class="text-slate-400 hover:text-red-500 transition-colors w-8 h-[34px] flex items-center justify-center rounded hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 dark:hover:border-red-800" title="Excluir Ambiente"><i class="fas fa-trash text-[12px]"></i></button>
                        </div>
                    </div>

                    <div id="room-details-${room.id}" class="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 transition-all" style="display: ${expanded ? 'block' : 'none'};">
                        <table class="w-full text-xs mb-4">
                            <thead class="text-slate-400 uppercase font-black border-b border-slate-200 dark:border-slate-700 text-[9px] tracking-widest">
                                <tr><th class="text-left pb-2">Luminária</th><th class="text-center pb-2">Watts (W)</th><th class="text-center pb-2">Qtd</th><th class="text-right pb-2">Subtotal</th><th class="pb-2"></th></tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                                ${room.fixtures.map((f: any) => `
                                    <tr class="group/fix hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors ${f.power === 0 || f.qty === 0 ? 'bg-amber-50 dark:bg-amber-900/10' : ''}">
                                        <td class="py-2 px-1"><input type="text" value="${f.label}" oninput="window.updateLeedFixtureData(${room.id}, ${f.id}, 'label', this.value)" class="bg-transparent font-bold w-full text-slate-600 dark:text-slate-300 outline-none focus:text-luminous-gold border-b border-transparent focus:border-luminous-gold transition-colors"></td>
                                        <td class="py-2 text-center"><input type="number" value="${f.power}" oninput="window.updateLeedFixtureData(${room.id}, ${f.id}, 'power', this.value)" class="w-16 text-center bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 outline-none focus:border-luminous-gold transition-colors ${f.power === 0 ? 'text-amber-500 font-black border-amber-400' : ''}"></td>
                                        <td class="py-2 text-center"><input type="number" value="${f.qty}" oninput="window.updateLeedFixtureData(${room.id}, ${f.id}, 'qty', this.value)" class="w-16 text-center bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 outline-none focus:border-luminous-gold transition-colors ${f.qty === 0 ? 'text-amber-500 font-black border-amber-400' : ''}"></td>
                                        <td class="py-2 text-right font-black text-starlight dark:text-white px-1" id="subtotal-${room.id}-${f.id}">${(f.power * f.qty).toFixed(1)} W</td>
                                        <td class="py-2 text-right"><button onclick="window.removeLeedFixture(${room.id}, ${f.id})" class="text-slate-300 hover:text-red-400 opacity-0 group-hover/fix:opacity-100 transition-all px-2"><i class="fas fa-times"></i></button></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <button onclick="window.addLeedFixture(${room.id})" class="text-[9px] font-black text-luminous-gold hover:text-amber-700 uppercase tracking-widest transition-colors inline-flex items-center gap-1 py-1 px-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded"><i class="fas fa-plus-circle"></i> Adicionar Luminária</button>
                    </div>
                </div>`;
                
            return roomHtml;
        }).join('');
        
        html += `</div></div>`; // Fecha accordion e a seção do pavimento
    });

    container.innerHTML = html;
    window.updateGlobalLeedSummary();
};

window.userLeedProjects = [];

// ==========================================
// LUXSINTAX: FUNÇÕES DE BASE DE DADOS SEGURAS
// ==========================================

window.saveLeedProject = async () => {
    try {
        let tenant;
        try {
            tenant = window.AuthManager.getTenantContext();
        } catch (securityError) {
            console.error(securityError);
            return alert("Acesso Negado: Você precisa estar logado e com sessão válida para salvar o projeto.");
        }

        const btn = document.getElementById('btn-save-leed');
        const originalText = btn ? btn.innerHTML : '';
        if(btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Salvando...';

        const cleanData = JSON.parse(JSON.stringify(window.state.leedProject));

        const payload: any = {
            user_id: tenant.userId, // Uso do ID criptograficamente validado pela nossa regra de negócio Zod
            project_name: window.state.leedProject.name,
            project_data: cleanData,
            updated_at: new Date()
        };

        if (window.state.leedProject.db_id) {
            payload.id = window.state.leedProject.db_id;
        }

        const { data, error } = await window.supabase.from('leed_projects').upsert(payload).select().single(); 
        
        if (error) throw error;
        
        if(data) window.state.leedProject.db_id = data.id;
        await window.fetchUserLeedProjects(); 

        if(btn) {
            btn.innerHTML = '<i class="fas fa-check mr-2"></i> Salvo!';
            setTimeout(() => btn.innerHTML = originalText, 2000);
        }

    } catch (err) {
        console.error("[LuxSintax] Erro de persistência:", err);
        alert("Falha ao salvar o projeto.");
    }
};

window.fetchUserLeedProjects = async () => {
    try {
        // Busca de dados amarrada exclusivamente ao contexto do utilizador ativo
        const tenant = window.AuthManager.getTenantContext();
        
        const { data, error } = await window.supabase
            .from('leed_projects')
            .select('id, project_name, project_data')
            .eq('user_id', tenant.userId) // Garantia Multi-tenant via Aplicação
            .order('updated_at', { ascending: false });
            
        if (!error && data) {
            window.userLeedProjects = data;
            if (window.currentTool === 'leedProj') window.renderLeedProject();
        }
    } catch (err: any) {
        // Silencioso: Se não há TenantContext (ex: utilizador anónimo), não executa a busca
        console.warn("[LuxSintax] Leitura abortada. Aguardando login do utilizador.");
    }
};

// LUXSINTAX: Criar novo projeto do zero
window.createNewLeedProject = () => {
    if (window.state.leedProject.rooms.length > 0) {
        if (!confirm("Tem certeza que deseja iniciar um novo projeto? As alterações não salvas no atual serão perdidas.")) {
            window.renderLeedProject(); // Reseta o seletor visualmente
            return;
        }
    }
    window.state.leedProject = { name: "Novo Projeto LEED", target: "baseline", rooms: [] };
    window.renderLeedProject();
};

window.loadSpecificLeedProject = () => {
    const select = document.getElementById('load-leed-select') as HTMLSelectElement;
    if (!select || !select.value || select.value === 'NEW') return;
    const proj = window.userLeedProjects.find((p: any) => p.id === select.value);
    if (proj) {
        try {
            let rawData = proj.project_data;
            if (typeof rawData === 'string') rawData = JSON.parse(rawData);
            if (!rawData.rooms || !Array.isArray(rawData.rooms)) rawData.rooms = [];
            if (!rawData.target) rawData.target = 'baseline';
            if (!rawData.name) rawData.name = proj.project_name;
            window.state.leedProject = JSON.parse(JSON.stringify(rawData));
            window.state.leedProject.db_id = proj.id;
            window.renderLeedProject();
            const btn = document.getElementById('btn-save-leed');
            if (btn) {
                const orig = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Carregado!';
                btn.classList.remove('bg-slate-800');
                btn.classList.add('bg-leed-green');
                setTimeout(() => {
                    btn.innerHTML = orig;
                    btn.classList.add('bg-slate-800');
                    btn.classList.remove('bg-leed-green');
                }, 2500);
            }
        } catch (err) {
            console.error("[LuxSintax] Erro ao processar dados salvos:", err);
            alert("Falha ao ler as informações do projeto. Os dados podem estar corrompidos.");
        }
    }
};

window.deleteSpecificLeedProject = async () => {
    const select = document.getElementById('load-leed-select') as HTMLSelectElement;
    if (!select || !select.value || select.value === 'NEW') return alert("Por favor, selecione um projeto salvo na lista primeiro para deletar.");
    const proj = window.userLeedProjects.find((p: any) => p.id === select.value);
    if (!proj) return;
    if (!confirm(`TEM CERTEZA? O projeto "${proj.project_name}" será apagado permanentemente da nuvem.`)) return;
    try {
        const btn = select.nextElementSibling as HTMLElement;
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        const { error } = await window.supabase.from('leed_projects').delete().eq('id', proj.id);
        if (error) throw error;
        window.userLeedProjects = window.userLeedProjects.filter((p: any) => p.id !== proj.id);
        if (window.state.leedProject.db_id === proj.id) {
            window.state.leedProject = { name: "Novo Projeto LEED", target: "baseline", rooms:[] };
        }
        window.renderLeedProject();
    } catch (err) {
        console.error("[LuxSintax] Erro ao deletar:", err);
        alert("Falha ao deletar o projeto. Verifique sua conexão.");
        window.renderLeedProject();
    }
};

// 12. CONTROLO DE CÁLCULOS E AUDITORIA
window.updateAuditUI = function() {
    const s = window.state.audit;
    const driverState = window.state.driver;
    const totalPower = driverState.power * driverState.qty; // Puxa a potência
    
    // Captura de Elementos UI
    const lenInput = document.getElementById('audit-wire-length') as HTMLInputElement;
    const gaugeSelect = document.getElementById('audit-wire-gauge') as HTMLSelectElement;
    const voltSelect = document.getElementById('audit-voltage') as HTMLSelectElement;
    const useSelect = document.getElementById('audit-use-type') as HTMLSelectElement;
    const timeSelect = document.getElementById('audit-time') as HTMLSelectElement;
    const mRatioSelect = document.getElementById('audit-mratio') as HTMLSelectElement;
    const luxInput = document.getElementById('audit-visual-lux') as HTMLInputElement;
    const ageInput = document.getElementById('audit-age') as HTMLInputElement;
    const tm30Select = document.getElementById('audit-tm30') as HTMLSelectElement;
    const flickerSelect = document.getElementById('audit-flicker') as HTMLSelectElement;
    const baseWattsInput = document.getElementById('audit-baseline-watts') as HTMLInputElement;
    const kwhCostInput = document.getElementById('audit-kwh-cost') as HTMLInputElement;
    const hoursInput = document.getElementById('audit-daily-hours') as HTMLInputElement;

    // Atualização de Estado
    if (lenInput) s.wireLength = parseFloat(lenInput.value) || 5;
    if (gaugeSelect) s.wireGauge = parseFloat(gaugeSelect.value) || 1.5;
    if (voltSelect) s.voltage = parseFloat(voltSelect.value) || 24;
    if (useSelect) s.useType = useSelect.value || 'office';
    if (timeSelect) s.timeOfDay = timeSelect.value || 'morning';
    if (mRatioSelect) s.mRatio = parseFloat(mRatioSelect.value) || 0.52;
    if (ageInput) s.age = parseInt(ageInput.value) || 30;
    if (tm30Select) s.tm30 = tm30Select.value || 'cri80';
    if (flickerSelect) s.flicker = flickerSelect.value || 'low';
    if (baseWattsInput) s.baselineWatts = parseFloat(baseWattsInput.value) || 1500;
    
    const fallbackLux = window.state.grid?.targetLux || 500;
    if (luxInput) s.visualLux = parseFloat(luxInput.value) || fallbackLux;

    // ==========================================
    // 1. MÓDULOS DO DRIVER HUB
    // ==========================================
    
    // Atualiza Card 1 (Carga e Fonte)
    const totalWattsEl = document.getElementById('driver-total-watts');
    const recSourceEl = document.getElementById('driver-recommended-source');
    if (totalWattsEl && recSourceEl) {
        totalWattsEl.innerText = `${totalPower.toFixed(1)} W`;
        recSourceEl.innerText = `${(totalPower * 1.2).toFixed(1)} W`; // Aplica regra dos 20%
    }

    // Atualiza Card 2 (Guardião) e Card 3 (Topologia)
    if (window.ElectricalEngine) {
        // Envia todos os parâmetros de fita e cabo para análise integrada
        const result = window.ElectricalEngine.evaluateSystem(s.wireLength, s.wireGauge, driverState.power, driverState.qty, s.voltage);
        
        const dropEl = document.getElementById('audit-drop-val');
        const pctEl = document.getElementById('audit-drop-pct');
        const barEl = document.getElementById('audit-drop-bar');
        const alertEl = document.getElementById('audit-alert-msg');
        const alertBox = document.getElementById('audit-alert-box');
        
        if (dropEl) dropEl.innerText = result.dropV.toFixed(2);
        if (pctEl) pctEl.innerText = result.dropPercentage.toFixed(1);
        if (barEl) {
            const pct = Math.min(result.dropPercentage, 100);
            barEl.style.width = pct + '%';
            barEl.className = `h-full rounded-full transition-all duration-500 ${result.isCritical ? 'bg-red-500' : (result.isWarning ? 'bg-amber-500' : 'bg-leed-green')}`;
        }
        
        if (alertBox && alertEl) {
            if (result.isCritical || result.isWarning) {
                alertBox.classList.remove('hidden');
                alertBox.className = `mt-3 p-2 rounded-lg text-[9px] font-bold ${result.isCritical ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`;
                alertEl.innerHTML = `<i class="fas fa-exclamation-triangle mr-1"></i> ${result.message}`;
            } else {
                alertBox.classList.remove('hidden');
                alertBox.className = `mt-3 p-2 rounded-lg text-[9px] font-bold bg-green-50 text-green-700 border border-green-200`;
                alertEl.innerHTML = `<i class="fas fa-check-circle mr-1"></i> ${result.message}`;
            }
        }

        // Lógica de Reação do Card 3 (Topologia Sugerida)
        const topIcon = document.getElementById('topology-icon');
        const topName = document.getElementById('topology-name');
        const topDesc = document.getElementById('topology-desc');
        
        if (topIcon && topName && topDesc) {
            topIcon.innerHTML = `<i class="fas ${result.topologyIcon}"></i>`;
            topIcon.className = `text-4xl mb-4 ${result.isTopologyCritical ? 'text-red-500 animate-pulse' : 'text-leed-green'}`;
            topName.innerText = result.topologyTitle;
            topDesc.innerText = result.topologyDesc;
        }
    }

    // ==========================================
    // 2. MÓDULOS DE AUDITORIA & PERFORMANCE (HCL/ESG)
    // ==========================================
    if (window.HCLEngine && window.HCLEngine.evaluateCircadianImpact) {
        // LUXSINTAX: Passando a nova "Tríade Não-Visual" para o motor físico
        const bioResult = window.HCLEngine.evaluateCircadianImpact(s.visualLux, s.mRatio, s.useType, s.timeOfDay, s.age);
        const mediEl = document.getElementById('audit-medi-val');
        const barEl = document.getElementById('audit-hcl-bar');
        const alertEl = document.getElementById('audit-hcl-msg');
        const alertBox = document.getElementById('audit-hcl-box');

        // LUXSINTAX: Atualização do Score de Performance Humana (UI Base)
        const tm30ScoreEl = document.getElementById('audit-tm30-score');
        const tm30StatusEl = document.getElementById('audit-tm30-status');
        let rfValue = 78;
        if (tm30ScoreEl && tm30StatusEl) {
            if (s.tm30 === 'cri80') { tm30ScoreEl.innerText = 'Rf 78 / Rg 95'; tm30StatusEl.innerText = 'Básico'; tm30StatusEl.className = 'text-[9px] text-amber-400 font-bold uppercase mt-1'; rfValue = 78; }
            else if (s.tm30 === 'cri90') { tm30ScoreEl.innerText = 'Rf 90 / Rg 100'; tm30StatusEl.innerText = 'Excelente'; tm30StatusEl.className = 'text-[9px] text-leed-green font-bold uppercase mt-1'; rfValue = 90; }
            else { tm30ScoreEl.innerText = 'Rf 96 / Rg 100'; tm30StatusEl.innerText = 'SunLike / Premium'; tm30StatusEl.className = 'text-[9px] text-tech-cyan font-bold uppercase mt-1'; rfValue = 96; }
        }

        const tlmScoreEl = document.getElementById('audit-tlm-score');
        const tlmStatusEl = document.getElementById('audit-tlm-status');
        let isFlickerLow = false;
        if (tlmScoreEl && tlmStatusEl) {
            if (s.flicker === 'low') { tlmScoreEl.innerText = 'SVM < 0.4'; tlmStatusEl.innerText = 'Seguro / Foco'; tlmStatusEl.className = 'text-[9px] text-tech-cyan font-bold uppercase mt-1'; isFlickerLow = true; }
            else if (s.flicker === 'medium') { tlmScoreEl.innerText = 'SVM < 1.0'; tlmStatusEl.innerText = 'Aceitável'; tlmStatusEl.className = 'text-[9px] text-amber-400 font-bold uppercase mt-1'; isFlickerLow = false; }
            else { tlmScoreEl.innerText = 'SVM > 1.0'; tlmStatusEl.innerText = 'Risco Enxaqueca'; tlmStatusEl.className = 'text-[9px] text-red-500 font-bold uppercase mt-1 animate-pulse'; isFlickerLow = false; }
        }

        // --- LUXSINTAX: Injeção do WELL Performance Score e Raio-X Breakdown ---
        const stimulusScore = Math.min(bioResult.medi / 250, 1.0) * 40;
        const colorScore = Math.min(rfValue / 90, 1.0) * 30;
        const stabilityScore = isFlickerLow ? 30 : 5;
        const wellScore = Math.round(stimulusScore + colorScore + stabilityScore) / 10;
        
        const wellScoreEl = document.getElementById('audit-well-score');
        const wellScoreBar = document.getElementById('well-score-bar');
        const statusBadge = document.getElementById('audit-status-badge');
        const wellScoreCard = document.getElementById('well-score-card');
        
        if (wellScoreCard) {
            wellScoreCard.title = `💡 Raio-X da Nota WELL:\n• Estímulo (m-EDI): ${(stimulusScore/10).toFixed(1)} / 4.0\n• Cor (TM-30): ${(colorScore/10).toFixed(1)} / 3.0\n• Estabilidade Neural (TLM): ${(stabilityScore/10).toFixed(1)} / 3.0`;
        }

        if (wellScoreEl) {
            wellScoreEl.innerText = wellScore.toFixed(1);
            if (wellScore >= 8) wellScoreEl.className = 'text-4xl font-black text-leed-green';
            else if (wellScore >= 5) wellScoreEl.className = 'text-4xl font-black text-amber-500';
            else wellScoreEl.className = 'text-4xl font-black text-red-500';
        }
        
        if (wellScoreBar) {
            wellScoreBar.style.width = `${(wellScore / 10) * 100}%`;
            if (wellScore >= 8) wellScoreBar.className = 'h-full bg-leed-green transition-all duration-1000';
            else if (wellScore >= 5) wellScoreBar.className = 'h-full bg-amber-500 transition-all duration-1000';
            else wellScoreBar.className = 'h-full bg-red-500 transition-all duration-1000';
        }

        if (statusBadge) {
            statusBadge.innerText = bioResult.statusTag || 'AVALIANDO...';
            if (bioResult.isCritical) statusBadge.className = 'inline-block px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded text-[10px] font-black tracking-widest uppercase mb-3 animate-pulse border border-red-200 dark:border-red-800';
            else if (bioResult.isWarning) statusBadge.className = 'inline-block px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded text-[10px] font-black tracking-widest uppercase mb-3 border border-amber-200 dark:border-amber-800';
            else statusBadge.className = 'inline-block px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded text-[10px] font-black tracking-widest uppercase mb-3 border border-green-200 dark:border-green-800';
        }

        // --- LUXSINTAX: HUD de Envelhecimento e Transmissão Ótica ---
        const ageScoreEl = document.getElementById('audit-age-score');
        const ageStatusEl = document.getElementById('audit-age-status');
        const hudOverlay = document.getElementById('age-hud-overlay');
        const hudAgeVal = document.getElementById('hud-age-val');
        const hudTransVal = document.getElementById('hud-trans-val');

        const transPct = Math.round(bioResult.lensFactor * 100);

        if (ageScoreEl && ageStatusEl) {
            ageScoreEl.innerText = `${transPct}% Transmissão`;
            ageStatusEl.innerText = s.age > 45 ? 'Cristalino Amarelado' : 'Lente Transparente';
            ageStatusEl.className = s.age > 45 ? 'text-[9px] text-luminous-gold font-bold uppercase mt-1' : 'text-[9px] text-slate-300 font-bold uppercase mt-1';
        }

        if (hudOverlay && hudAgeVal && hudTransVal) {
            hudAgeVal.innerText = `${s.age}a`;
            hudTransVal.innerText = `${transPct}%`;
            
            if (s.age > 45) {
                hudTransVal.className = 'text-xs font-bold text-amber-400';
                hudOverlay.style.opacity = '1';
            } else {
                hudTransVal.className = 'text-xs font-bold text-tech-cyan';
                hudOverlay.style.opacity = '1'; 
            }
        }

        if (mediEl) mediEl.innerText = Math.round(bioResult.medi).toString();
        if (barEl) {
            const pct = Math.min((bioResult.medi / 350) * 100, 100);
            barEl.style.width = pct + '%';
            // LUXSINTAX: Injeção do estado Crítico (Vermelho)
            barEl.className = `h-full rounded-full transition-all duration-500 ${bioResult.isCritical ? 'bg-red-500' : (bioResult.isWarning ? 'bg-amber-500' : 'bg-tech-cyan')}`;
        }
// LUXSINTAX: O CS agora é calculado isoladamente no Domínio Físico (HCLEngine)
        const csEl = document.getElementById('audit-cs-val');
        if (csEl) csEl.innerText = bioResult.cs.toFixed(2);

        if (window.Canvas2DEngine && window.Canvas2DEngine.drawCircadianChart) {
            // LUXSINTAX: Delegação estrita para a infraestrutura de Canvas (Clean Architecture)
            window.Canvas2DEngine.drawCircadianChart(bioResult, s);
        }
        if (alertBox && alertEl) {
            alertBox.classList.remove('hidden');
            if (bioResult.isCritical) {
                alertBox.className = 'mt-4 p-3 rounded-lg text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/50';
                alertEl.innerHTML = `<i class="fas fa-exclamation-triangle mr-1"></i> ${bioResult.message}`;
            } else if (bioResult.isWarning) {
                alertBox.className = 'mt-4 p-3 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50';
                alertEl.innerHTML = `<i class="fas fa-exclamation-triangle mr-1"></i> ${bioResult.message}`;
            } else {
                alertBox.className = 'mt-4 p-3 rounded-lg text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/50';
                alertEl.innerHTML = `<i class="fas fa-brain mr-1"></i> ${bioResult.message}`;
            }
        }
    }

    if (window.ESGEngine && window.ESGEngine.calculateESGImpact) {
        let systemWatts = 0;
        if (window.currentTool === 'grid' && window.state.grid) {
            systemWatts = (window.state.grid.watts || 0) * (window.state.grid.cols || 1) * (window.state.grid.rows || 1);
        } else if (window.currentTool === 'driver' && window.state.driver) {
            systemWatts = totalPower;
        } else {
            systemWatts = 300; 
        }

        const hasAC = (document.getElementById('audit-has-ac') as HTMLInputElement)?.checked || false;
        const maintSavings = parseFloat((document.getElementById('audit-opex-savings') as HTMLInputElement)?.value) || 0;

        const esgResult = window.ESGEngine.calculateESGImpact(systemWatts, s.baselineWatts, s.kwhCost, s.dailyHours, s.daysPerYear, hasAC, maintSavings);
        
        const moneyEl = document.getElementById('audit-money-val');
        const treesEl = document.getElementById('audit-trees-val');
        const alertEl = document.getElementById('audit-esg-msg');
        const alertBox = document.getElementById('audit-esg-box');

        if (moneyEl) moneyEl.innerText = esgResult.savingsMoney.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        if (treesEl) treesEl.innerText = esgResult.treesPlanted.toFixed(1);

        if (alertBox && alertEl) {
            if (!esgResult.isProfitable) {
                alertBox.classList.remove('hidden');
                alertBox.className = `mt-4 p-3 rounded-lg text-[10px] font-bold bg-red-50 text-red-700 border border-red-200`;
                alertEl.innerHTML = `<i class="fas fa-exclamation-triangle mr-1"></i> ${esgResult.message}`;
            } else {
                alertBox.classList.remove('hidden');
                alertBox.className = `mt-4 p-3 rounded-lg text-[10px] font-bold bg-green-50 text-green-700 border border-green-200`;
                alertEl.innerHTML = `<i class="fas fa-leaf mr-1"></i> ${esgResult.message}`;
            }
        }
    }
};

window._isRenderPending = false;

window.updateCalculations = function() {
    if (!window._isRenderPending) {
        window._isRenderPending = true;
        requestAnimationFrame(() => {
            try {
                const tool = window.currentTool;
                if (!tool || !window.state[tool]) return;

                const s = window.state[tool];
                let prefix = tool[0] + '-';
                if (tool === 'driver') prefix = 'dr-';

                const inputs = document.querySelectorAll(`input[id^="${prefix}"]`);
                inputs.forEach(el => {
                    const inputEl = el as HTMLInputElement;
                    if (inputEl.type !== 'number') return;
                    
                    const key = inputEl.id.replace(prefix, '');
                    const range = document.getElementById(`range-${prefix}${key}`) as HTMLInputElement;
                    
                    let uiVal = 0;
                    if (document.activeElement === inputEl) {
                        uiVal = parseFloat(inputEl.value) || 0;
                        if (range) range.value = String(uiVal);
                    } else if (range && document.activeElement === range) {
                        uiVal = parseFloat(range.value) || 0;
                        inputEl.value = String(uiVal);
                    } else {
                        uiVal = parseFloat(inputEl.value) || 0;
                        if (range) range.value = String(uiVal);
                    }

                    const isEn = window.currentLang === 'en';
                    const isDist =['height', 'plane', 'dist', 'spacing', 'hq', 'roomW', 'roomL', 'frameW', 'frameH'].includes(key);
                    
                    // LUXSINTAX: Validação de entrada para evitar Canvas quebrado (NaN)
                    const finalVal = isNaN(uiVal) ? 0.1 : uiVal;
                    let newMeters = (isEn && isDist) ? finalVal / 3.28084 : finalVal;
                    
                    // LUXSINTAX: Prevenir loop de arredondamento que quebra o algoritmo de malha
                    if (isEn && isDist && s[key] !== undefined) {
                        const oldFt = parseFloat((s[key] * 3.28084).toFixed(2));
                        if (oldFt === finalVal) {
                            newMeters = s[key]; // Mantém a precisão matemática original
                        }
                    }
                    s[key] = newMeters;
                });

                if (tool === 'grid') {
                    // Fator U travado nos bastidores para manter o Motor Lúmens automático inteligente
                    s.utilFactor = 0.60; 
                    
                    // Nova leitura de Cor do Ambiente (Refletância/Bounce)
                    const refSelect = document.getElementById('g-reflectance') as HTMLSelectElement;
                    if (refSelect) s.reflectance = parseFloat(refSelect.value);
                    
                    const maintSelect = document.getElementById('g-maintFactor') as HTMLSelectElement;
                    if (maintSelect) s.maintFactor = parseFloat(maintSelect.value);

                    if(window.LumenMethod && window.LumenMethod.calculateGrid) {
                        const gridResult = window.LumenMethod.calculateGrid(s);
                        // LUXSINTAX: Blindagem contra valores nulos ou zero que quebram a renderização
                        s.cols = Math.max(1, gridResult.cols || 1);
                        s.rows = Math.max(1, gridResult.rows || 1);
                        s.targetLux = gridResult.targetLux || 100;
                    }

                    const area = s.roomW * s.roomL;
                    const qty = s.cols * s.rows;
                    const totalLux = Math.round((qty * (s.flux || 0) * s.utilFactor * s.maintFactor) / area);
                    const totalWatts = qty * (s.watts || 0);
                    const luxPiso = totalLux * 0.85; 
                    
                    let totalUgr = "16.0"; 
                    if (window.GlareEngine && window.GlareEngine.calculateUGR) {
                        totalUgr = window.GlareEngine.calculateUGR(s, { observerHeight: 1.2, luminaireArea: 0.36, backgroundLuminance: 12 });
                    }

                    window.updateResultsUI(totalLux, totalUgr, totalWatts, luxPiso);
                }

                const stage3D = document.getElementById('stage-3d');
                if (stage3D && !stage3D.classList.contains('hidden')) {
                    if (window.Photometric3DEngine) {
                        window.Photometric3DEngine.renderPhotometricSolid(s.iesData, tool, s);
                    }
                }
                
                if (window.Canvas2DEngine && window.Canvas2DEngine.render) {
                    window.Canvas2DEngine.render();
                }

                if (window.updatePhotometricHUD) window.updatePhotometricHUD();

                // LUXSINTAX: Atualiza a interface de Auditoria tanto na aba HCL/ESG quanto no Driver Hub
                if ((tool === 'audit' || tool === 'driver') && window.updateAuditUI) {
                    window.updateAuditUI();
                }

            } catch (erro) {
                console.error("[LuxSintax] Erro interno de desenho:", erro);
            } finally {
                window._isRenderPending = false;
            }
        });
    }
};

window.updateResultsUI = function(lux: number, ugr: string | number, watts: number, luxPiso: number) {
    let targetPlane = 'HP';
    if (window.currentNbrTarget && window.currentNbrTarget.plane) {
        targetPlane = window.currentNbrTarget.plane;
    } else if (window.state && window.state.grid && window.state.grid.viewLevel) {
        targetPlane = window.state.grid.viewLevel;
    }

    let displayLux = targetPlane === 'LP' ? (luxPiso || lux * 0.85) : lux;

    // LUXSINTAX: Ponte Silenciosa (Data Bridge) para o Módulo de Saúde (HCL)
    // Sincroniza o esforço de engenharia diretamente para a neurociência, mantendo a independência das abas.
    if (window.state && window.state.audit) {
        let evEstimate = displayLux;
        
        // Se a origem do cálculo for a Grade (Método Lúmens - Lux Horizontal na Mesa),
        // aplicamos a proporção física de Cilíndrica/Vertical (aprox. 50% do horizontal em reflexões padrão).
        if (window.currentTool === 'grid') {
            evEstimate = displayLux * 0.5;
        }

        const finalEv = Math.round(evEstimate);
        
        // Só atualizamos se o valor for válido e não zerar o input acidentalmente em uma transição de tela
        if (finalEv > 0) {
            window.state.audit.visualLux = finalEv;
            
            // Sincroniza o Input visual na aba Circadiana caso ele já exista no DOM
            const luxInputAudit = document.getElementById('audit-visual-lux') as HTMLInputElement;
            if (luxInputAudit && document.activeElement !== luxInputAudit) {
                luxInputAudit.value = String(finalEv);
            }
        }
    }

    const resLux = document.getElementById('result-lux');
    const resUgr = document.getElementById('result-ugr');
    const resEff = document.getElementById('result-eff');
    
    if (resLux) resLux.innerText = String(Math.round(displayLux));
    if (resUgr) resUgr.innerText = String(ugr);

    // Atualização do novo Resumo Compacto da Auditoria
    const nbrSummaryRow = document.getElementById('nbr-summary-row');
    if (nbrSummaryRow) {
        nbrSummaryRow.classList.remove('hidden');
        nbrSummaryRow.classList.add('flex');
        const sumLux = document.getElementById('nbr-sum-lux');
        const sumUgr = document.getElementById('nbr-sum-ugr');
        const sumPlane = document.getElementById('nbr-sum-plane');
        if (sumLux) sumLux.innerText = String(Math.round(displayLux));
        if (sumUgr) sumUgr.innerText = String(ugr);
        if (sumPlane) {
            const isEn = window.currentLang === 'en';
            sumPlane.innerText = targetPlane === 'LP' 
                ? (isEn ? 'FLOOR LEVEL (0.00m)' : 'NÍVEL PISO (0.00m)') 
                : (isEn ? 'DESK LEVEL (0.75m)' : 'NÍVEL MESA (0.75m)');
        }
    }

    const flux = window.state?.grid?.flux || 0;
    const inputWatts = window.state?.grid?.watts || 0;
    if (resEff) {
        resEff.innerText = (inputWatts > 0) ? String(Math.round(flux / inputWatts)) : "0";
    }

    const hudLayout = document.getElementById('hud-layout');
    const hudEmHp = document.getElementById('hud-em-hp');
    const hudEmLp = document.getElementById('hud-em-lp');
    
    if (hudLayout && window.state && window.state.grid) {
        hudLayout.innerText = `${window.state.grid.cols}x${window.state.grid.rows}`;
    }
    if (hudEmHp) hudEmHp.innerText = Math.round(lux) + ' lx';
    if (hudEmLp) hudEmLp.innerText = Math.round(luxPiso || (lux * 0.85)) + ' lx';

    if (window.currentNbrTarget) {
        const nbrPanel = document.getElementById('nbr-status-panel');
        if (nbrPanel) {
            const targetLux = window.currentNbrTarget.lux;
            const maxUgrLimit = window.currentNbrTarget.ugr;
            const parsedUgr = parseFloat(String(ugr));
            
            let status = 'APPROVED';
            if (Math.round(displayLux) < targetLux * 0.9) status = 'REJECTED';
            else if (parsedUgr > maxUgrLimit) status = 'REJECTED';
            else if (Math.round(displayLux) < targetLux) status = 'WARNING';

            const nbrBadge = document.getElementById('nbr-badge');
            const nbrStatusText = document.getElementById('nbr-status-text');
            const nbrIconContainer = document.getElementById('nbr-icon-container');
            const nbrIcon = document.getElementById('nbr-icon');

            if(nbrBadge && nbrStatusText && nbrIconContainer && nbrIcon) {
                const isEn = window.currentLang === 'en';
                if (status === 'APPROVED') {
                    nbrPanel.style.borderColor = '#10b981';
                    nbrIconContainer.className = 'w-12 h-12 rounded-full flex items-center justify-center bg-green-100 text-green-600 flex-shrink-0';
                    nbrIcon.className = 'fas fa-check-circle';
                    nbrStatusText.innerText = isEn ? 'Standard Audit: Compliant' : 'Auditoria NBR: Conforme a norma';
                    nbrBadge.innerText = isEn ? 'APPROVED' : 'APROVADO';
                    nbrBadge.className = 'px-6 py-2 rounded-full text-[12px] font-black bg-green-100 text-green-700 border-green-200 flex-shrink-0 text-center w-full md:w-48';
                } else if (status === 'WARNING') {
                    nbrPanel.style.borderColor = '#f59e0b';
                    nbrIconContainer.className = 'w-12 h-12 rounded-full flex items-center justify-center bg-amber-100 text-amber-600 flex-shrink-0';
                    nbrIcon.className = 'fas fa-exclamation-triangle';
                    nbrStatusText.innerText = isEn ? 'Standard Audit: Marginal / Tolerable' : 'Auditoria NBR: Nível Marginal / Tolerável';
                    nbrBadge.innerText = isEn ? 'WARNING' : 'AVISO';
                    nbrBadge.className = 'px-6 py-2 rounded-full text-[12px] font-black bg-amber-100 text-amber-700 border-amber-200 flex-shrink-0 text-center w-full md:w-48';
                } else {
                    nbrPanel.style.borderColor = '#ef4444';
                    nbrIconContainer.className = 'w-12 h-12 rounded-full flex items-center justify-center bg-red-100 text-red-600 flex-shrink-0';
                    nbrIcon.className = 'fas fa-times-circle';
                    nbrStatusText.innerText = isEn ? 'Standard Audit: Non-Compliant' : 'Auditoria NBR: Fora dos Requisitos';
                    nbrBadge.innerText = isEn ? 'REJECTED' : 'REPROVADO';
                    nbrBadge.className = 'px-6 py-2 rounded-full text-[12px] font-black bg-red-100 text-red-700 border-red-200 flex-shrink-0 text-center w-full md:w-48';
                }
            }
        }
    }
};

// LUXSINTAX: Sistema de White-Label (Upload e Persistência de Logo)
window.handleLogoUpload = function(input: HTMLInputElement) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        // Proteção Arquitetural: Bloqueia imagens gigantes que travam o PDFLib
        if (file.size > 2 * 1024 * 1024) {
            return alert("A imagem é muito pesada. Por favor, escolha uma logo com menos de 2MB.");
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const base64 = e.target!.result as string;
            
            // Salva no LocalStorage (SSOT temporário do Frontend)
            localStorage.setItem('luxsintax_user_logo', base64);
            
            // Atualiza a UI imediatamente
            window.updateProfileLogoUI();
        };
        reader.readAsDataURL(file);
    }
};

window.updateProfileLogoUI = function() {
    const preview = document.getElementById('profile-logo-preview') as HTMLImageElement;
    const placeholder = document.getElementById('profile-logo-placeholder');
    const removeBtn = document.getElementById('btn-remove-logo');
    const base64 = localStorage.getItem('luxsintax_user_logo');
    
    if (preview && placeholder) {
        if (base64) {
            preview.src = base64;
            preview.classList.remove('hidden');
            placeholder.classList.add('hidden');
            if (removeBtn) removeBtn.classList.remove('hidden');
        } else {
            preview.src = '';
            preview.classList.add('hidden');
            placeholder.classList.remove('hidden');
            if (removeBtn) removeBtn.classList.add('hidden');
        }
    }
};

window.removeProfileLogo = function() {
    // Apaga a logo da memória local
    localStorage.removeItem('luxsintax_user_logo');
    // Atualiza a interface instantaneamente
    window.updateProfileLogoUI();
};

// Garante que a imagem apareça preenchida se o usuário recarregar a página
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(window.updateProfileLogoUI, 1000);
});

let trackingTimeout: any;
window.setupInputBindings = function() {
    const inputs = document.querySelectorAll('input[type="number"], input[type="range"]');
    
    inputs.forEach(input => {
        if (input.hasAttribute('oninput') || input.hasAttribute('onchange')) return;
        
        input.addEventListener('input', (e) => {
            const tool = window.currentTool;
            let prefix = tool[0] + '-';
            if (tool === 'driver') prefix = 'dr-';
            
            const key = input.id.replace('range-', '').replace(prefix, '');
            
            if (window.updateCalculations) window.updateCalculations();

            clearTimeout(trackingTimeout);
            trackingTimeout = setTimeout(() => {
                const gtag = (window as any).gtag;
                if (typeof gtag === 'function' && window.state[tool] && window.state[tool][key] !== undefined) {
                    gtag('event', 'calc_adjustment', {
                        'tool': tool,
                        'parameter': key,
                        'value': window.state[tool][key].toFixed(2),
                        'mode': window.calcMode
                    });
                }
            }, 1500);
        });
    });
};

// ==========================================
// LUXSINTAX: PWA & INSTALAÇÃO DESKTOP (INFRASTRUCTURE)
// ==========================================
window.installPWA = async () => {
    if (!window.deferredPrompt) return;
    
    // Mostra o pop-up nativo de instalação do sistema operacional
    deferredPrompt.prompt();
    
    // Aguarda a resposta do usuário
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        console.log('[LuxSintax] Usuário promoveu a plataforma para Desktop.');
        // Esconde o botão, pois o software já foi instalado
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) {
            installBtn.classList.remove('flex');
            installBtn.classList.add('hidden');
        }
    }
    
    // Limpa a memória
    window.deferredPrompt = null;
};

window.addEventListener('appinstalled', () => {
    console.log('[LuxSintax] Instalação PWA confirmada pelo SO.');
    window.deferredPrompt = null;
});
// LUXSINTAX: A Nova Máquina de Vendas
window.updateEsgUI = function() {
    const s = window.state.esg;
    
    // 1. Captura as entradas principais e avançadas
    const wBase = document.getElementById('esg-baseline-watts') as HTMLInputElement;
    const wProp = document.getElementById('esg-proposed-watts') as HTMLInputElement;
    const cost = document.getElementById('esg-kwh-cost') as HTMLInputElement;
    const hrs = document.getElementById('esg-daily-hours') as HTMLInputElement;
    const dys = document.getElementById('esg-days-year') as HTMLInputElement;
    const capex = document.getElementById('esg-capex') as HTMLInputElement;
    const hasAC = document.getElementById('esg-has-ac') as HTMLInputElement;
    
    // LUXSINTAX: Captura das Premissas Financeiras (Smart Defaults)
    const inflationInput = document.getElementById('esg-inflation') as HTMLInputElement;
    const discountInput = document.getElementById('esg-discount-rate') as HTMLInputElement;
    const yearsInput = document.getElementById('esg-analysis-years') as HTMLInputElement;

    if(wBase) s.baselineWatts = parseFloat(wBase.value) || 1500;
    if(wProp) s.proposedWatts = parseFloat(wProp.value) || 300;
    if(cost) s.kwhCost = parseFloat(cost.value) || 0.85;
    if(hrs) s.dailyHours = parseFloat(hrs.value) || 10;
    if(dys) s.daysPerYear = parseFloat(dys.value) || 260;
    if(capex) s.capex = parseFloat(capex.value) || 0;
    if(hasAC) s.hasAC = hasAC.checked;

    // Converte de porcentagem (UI) para decimal (Motor) ou assume padrão
    s.energyInflation = inflationInput ? (parseFloat(inflationInput.value) / 100) : 0.05;
    s.discountRate = discountInput ? (parseFloat(discountInput.value) / 100) : 0.10;
    s.analysisYears = yearsInput ? parseInt(yearsInput.value) : 5;

    // 2. Aciona o Motor ESG Enterprise (LCC e VPL)
    if (window.ESGEngine) {
        const res = window.ESGEngine.calculateESGImpact(s.proposedWatts, s.baselineWatts, s.kwhCost, s.dailyHours, s.daysPerYear, s.hasAC, 0, s.capex, s.energyInflation, s.discountRate, s.analysisYears);
        
        // 3. Atualiza UI
        const moneyEl = document.getElementById('esg-money-val');
        const kwhEl = document.getElementById('esg-kwh-val');
        const treesEl = document.getElementById('esg-trees-val');
        const pbEl = document.getElementById('esg-payback-val');
        const roiEl = document.getElementById('esg-roi-val');
        const alertEl = document.getElementById('esg-alert-msg');
        const alertBox = document.getElementById('esg-alert-box');

        if(moneyEl) moneyEl.innerText = res.totalSavingsYearly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        if(kwhEl) kwhEl.innerText = Math.round(res.savedKwh).toLocaleString('pt-BR');
        if(treesEl) treesEl.innerText = res.treesPlanted.toFixed(1);
        if(pbEl) pbEl.innerText = res.isProfitable && s.capex > 0 ? res.paybackMonths.toFixed(1) : '--';
        if(roiEl) roiEl.innerText = res.isProfitable && s.capex > 0 ? res.roi5Years.toFixed(0) : '--';

        if (alertBox && alertEl) {
            alertBox.className = `relative z-10 mt-8 mx-4 p-4 rounded-xl text-xs font-bold text-center border transition-colors ${res.isProfitable ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-500/30' : 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-500/30'}`;
            alertEl.innerHTML = res.isProfitable ? `<i class="fas fa-check-circle mr-2"></i> ${res.message}` : `<i class="fas fa-exclamation-triangle mr-2"></i> ${res.message}`;
        }
    }
};

// Injetar chamada na função updateCalculations existente:
const oldUpdate = window.updateCalculations;
window.updateCalculations = function() {
    oldUpdate();
    if (window.currentTool === 'esg' && window.updateEsgUI) window.updateEsgUI();
};
// LUXSINTAX: Super Canvas HCL movido para Canvas2DEngine.ts (Clean Architecture)

// ==========================================
// LUXSINTAX: Engine de Importação Excel (Clean Architecture)
// ==========================================
window.handleExcelUpload = async function(input: HTMLInputElement) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    
    // LUXSINTAX: Proteção de Estado (Confirmação de Sobreposição vs Mesclagem)
    let shouldMerge = true;
    if (window.state.leedProject.rooms && window.state.leedProject.rooms.length > 0) {
        shouldMerge = confirm("Projeto atual detectado.\n\nClique em [OK] para MESCLAR a nova planilha (preservando suas edições manuais atuais).\nClique em [CANCELAR] para SOBREPOR tudo (começar um projeto novo do zero com esta planilha).");
        if (!shouldMerge) {
            // Limpa o projeto atual caso o usuário escolha sobrepor
            window.state.leedProject = { name: "Novo Projeto LEED", target: "baseline", rooms: [] };
        }
    }

    const btnLabel = document.getElementById('lbl-excel-upload');
    if (btnLabel) btnLabel.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> PROCESSANDO...';

    try {
        // Delegação limpa para a camada de Infraestrutura
        const parsedRooms = await ExcelParser.parseLeedRooms(file);
        
        // LUXSINTAX: Algoritmo de Reconciliação de Estado (Smart Merge / Upsert)
        const existingRooms = window.state.leedProject.rooms || [];
        
        parsedRooms.forEach((newRoom: any) => {
            // Cria uma assinatura única para comparar (Ex: "ss1_estacionamento")
            const matchKey = (newRoom.floor + "_" + newRoom.name).toLowerCase().trim();
            
            const existingIndex = existingRooms.findIndex((r: any) => 
                (r.floor + "_" + r.name).toLowerCase().trim() === matchKey
            );
            
            if (existingIndex >= 0) {
                // AMBIENTE EXISTE (UPDATE): Preserva inteligência humana, atualiza a física
                const oldRoom = existingRooms[existingIndex];
                existingRooms[existingIndex] = {
                    ...newRoom, // Puxa área atualizada e novas luminárias do Excel
                    id: oldRoom.id, // Protege o ID interno para não quebrar o DOM
                    leedCategory: oldRoom.leedCategory, // Preserva escolha LEED
                    typology: oldRoom.typology, // Preserva Tipologia ASHRAE
                    baseLpd: oldRoom.baseLpd, // Preserva o budget normativo
                    unit: oldRoom.unit, // Preserva métrica (W/m² ou W/m)
                    expanded: oldRoom.expanded // Preserva estado visual do acordeão
                };
            } else {
                // NOVO AMBIENTE (INSERT): Adiciona no topo da lista
                existingRooms.unshift(newRoom);
            }
        });
        
        // Atualiza a Fonte da Verdade (SSOT)
        window.state.leedProject.rooms = [...existingRooms];
        window.renderLeedProject();
        
        if (btnLabel) btnLabel.innerHTML = '<i class="fas fa-file-excel mr-2"></i> IMPORTAR EXCEL';
        input.value = ""; 

    } catch (err: any) {
        alert(err.message);
        if (btnLabel) btnLabel.innerHTML = '<i class="fas fa-file-excel mr-2"></i> IMPORTAR EXCEL';
    }
};