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
import { lpdBaselines } from './domain/standards/AshraeDatabase';
import { AuthManager } from './auth/AuthManager';
import { Canvas2DEngine } from './infrastructure/canvas/Canvas2DEngine';

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
        updateCalcMode: (mode: string) => void;
        toggleTheme: () => void;
        toggleLanguage: () => void;
        [key: string]: any; // Permite chamadas dinâmicas do HTML
    }
}

// 2. INICIALIZAÇÃO DE ESTADO GLOBAL
window.state = {
    ponto: { viewMode: 'single', spacing: 2.0, height: 3.0, plane: 0.75, beam: 30, tilt: 0, spin: 0, intensity: 3000, flux: 1500, cdklm: 2000, iesData: null, iesFileName: null, mRatio: 0.52, showGlareZone: false, falseColor: false },
    vertical: { viewMode: 'section', height: 3.0, hq: 1.6, dist: 1.0, frameW: 1.2, frameH: 0.8, qty: 1, spacing: 1.0, beam: 30, tilt: 30, spin: 180, intensity: 3000, flux: 1500, cdklm: 2000, iesData: null, iesFileName: null, mRatio: 0.52, showGlareZone: false, falseColor: false },
    homog: { height: 3.0, plane: 0.75, spacing: 2.0, beam: 30, intensity: 3000, flux: 1500, cdklm: 2000, iesData: null, iesFileName: null },
    grid: { calcMethod: 'target', manualCols: 4, manualRows: 3, height: 3.0, plane: 0.75, viewLevel: 'HP', beam: 60, cct: 3000, flux: 3000, watts: 30, utilFactor: 0.60, maintFactor: 0.80, targetLux: 500, roomW: 6.0, roomL: 4.0, falseColor: false, iesData: null, iesFileName: null, projectName: 'Projeto LuxSintax', roomName: 'Ambiente Teste', authorName: 'Lux Designer' },
    driver: { mode: 'CV', power: 14.4, qty: 5, current: 350 },
    leedProject: { name: "Novo Projeto LEED", target: "baseline", rooms: [] },
    showIsolines: true,
    showPolar: true,
    showHCL: false
};

// 3. PONTE DE INFRAESTRUTURA
window.i18n = i18nDictionary;
window.normsDatabase = normsDatabase;
window.lpdBaselines = lpdBaselines;
window.AuthManager = AuthManager;
window.FalseColorEngine = FalseColorEngine;
window.Canvas2DEngine = Canvas2DEngine;
window.Photometric3DEngine = Photometric3DEngine;
window.StandardsEngine = StandardsEngine;
window.ReportExporter = ReportExporter;
window.LumenMethod = LumenMethod;
window.Photometrics = Photometrics; // FUNDAMENTAL: Atribui o motor de física ao window
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
        window.switchTool('grid');
        window.updateCalcMode('direct');

    } catch (err) {
        console.error("[LuxSintax] Falha Crítica no Boot:", err);
    }
}

// Inicia a aplicação
document.addEventListener('DOMContentLoaded', initializeApp);

/**
 * REGRAS DE NEGÓCIO TÉCNICAS (HCL / GLARE)
 */
window.HCLEngine = {
    spds: {
        "0.45":[0.01, 0.02, 0.05, 0.15, 0.20, 0.10, 0.15, 0.40, 0.70, 0.95, 1.00, 0.85, 0.60, 0.30, 0.10, 0.05, 0.02],
        "0.52":[0.01, 0.02, 0.08, 0.25, 0.35, 0.15, 0.20, 0.50, 0.80, 1.00, 0.95, 0.75, 0.50, 0.20, 0.08, 0.03, 0.01],
        "0.68":[0.02, 0.05, 0.15, 0.50, 0.70, 0.30, 0.35, 0.60, 0.90, 1.00, 0.85, 0.60, 0.35, 0.15, 0.05, 0.02, 0.01],
        "0.92":[0.03, 0.08, 0.25, 0.70, 0.95, 0.50, 0.50, 0.70, 0.90, 1.00, 0.75, 0.50, 0.25, 0.10, 0.03, 0.01, 0.00],
        "1.10":[0.05, 0.10, 0.40, 0.85, 1.00, 0.65, 0.65, 0.75, 0.85, 0.85, 0.60, 0.40, 0.20, 0.08, 0.02, 0.01, 0.00]
    }
};

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
// --- COLE ISTO NO FINAL DO SEU src/main.ts ---

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
    window.updateInputsForLanguage();
    window.updateCalculations(); 
};

window.switchTool = function(toolId: string) {
    window.currentTool = toolId;
    document.querySelectorAll('.mode-tab-btn').forEach(btn => {
        btn.classList.remove('tab-active', 'text-luminous-gold');
        btn.classList.add('tab-inactive');
    });
    const activeBtn = document.getElementById('tab-' + toolId);
    if (activeBtn) {
        activeBtn.classList.remove('tab-inactive');
        activeBtn.classList.add('tab-active', 'text-luminous-gold');
    }

    document.getElementById('visual-tools')?.classList.toggle('hidden', toolId === 'query' || toolId === 'leedProj');
    document.getElementById('query-tool')?.classList.toggle('hidden', toolId !== 'query');
    document.getElementById('leedProj-tool')?.classList.toggle('hidden', toolId !== 'leedProj');
    
    const modeSelector = document.getElementById('calc-mode-selector');
    if(modeSelector) modeSelector.classList.toggle('hidden', toolId === 'driver' || toolId === 'grid' || toolId === 'leedProj');

    if (toolId !== 'query' && toolId !== 'leedProj') {
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
        document.getElementById('hcl-toggle-wrapper')?.classList.toggle('hidden', toolId !== 'ponto' && toolId !== 'vertical');

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
                statusIds.forEach(id => { const el = document.getElementById(id); if(el) { el.innerText = "Processando fotometria na nuvem..."; el.classList.remove('text-red-500'); }});

                const response = await fetch('/api/parse', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content, extension })
                });
                
                if (!response.ok) throw new Error("Erro no servidor");
                parsed = await response.json();
            } catch (err) {
                const statusIds =['p-ies-status', 'v-ies-status', 'g-ies-status'];
                statusIds.forEach(id => { const el = document.getElementById(id); if(el) { el.innerText = "Erro na leitura do arquivo."; el.classList.add('text-red-500'); }});
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
                
                // Primeiro mudamos o modo (isso limpa estados antigos com segurança)
                window.calcMode = 'ies';
                window.updateCalcMode('ies');

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
                    statusEl.innerText = `Carregado: ${file.name}`;
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
                    ['p-mRatio', 'v-mRatio'].forEach(id => {
                        const dropdown = document.getElementById(id) as HTMLSelectElement;
                        if (dropdown) dropdown.value = String(detectedRatio);
                    });
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

    const blob = await window.ReportExporter.createGridPdf(PDFLib, reportData, images);

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

            // LUXSINTAX: Fase 4 - Blindagem Legal (Disclaimer PDF)
            summary.disclaimer = "Nota Técnica: Os cálculos apresentados possuem caráter preliminar (Concept Design). Este relatório não substitui o projeto executivo luminotécnico assinado por um profissional habilitado (ART/RRT) e não deve ser utilizado como base única para submissão a órgãos oficiais sem validação em softwares de cálculo de inter-reflexão global.";

            const blob = await window.ReportExporter.createLeedPdf(PDFLib, s, summary, targetLabel);

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
    
    catSelect.innerHTML = '<option value="" disabled selected>Selecione a Categoria (Ex: Escritório)...</option>';
    if (roomSelect) {
        roomSelect.innerHTML = '<option value="" disabled selected>Selecione a Tarefa / Ambiente...</option>';
        roomSelect.disabled = true;
    }

    const uniqueCats = [...new Set(window.normsDatabase.map((n: any) => n.cat))].sort() as string[];
    uniqueCats.forEach((cat: string) => {
        const option = document.createElement('option');
        option.value = cat;
        option.text = cat;
        catSelect.appendChild(option);
    });
};

window.updateNbrRooms = function() {
    const catSelect = document.getElementById('nbr-cat-select') as HTMLSelectElement;
    const roomSelect = document.getElementById('nbr-room-select') as HTMLSelectElement;
    const selectedCat = catSelect.value;
    
    if (!selectedCat) return;

    roomSelect.innerHTML = '<option value="" disabled selected>Selecione a Tarefa / Ambiente...</option>';
    roomSelect.disabled = false;

    const rooms = window.normsDatabase.filter((n: any) => n.cat === selectedCat);
    rooms.forEach((n: any) => {
        const opt = document.createElement('option');
        opt.value = n.room;
        opt.dataset.lux = n.lux;
        opt.dataset.ugr = n.ugr === '-' ? '99' : String(n.ugr);
        opt.dataset.plane = n.plane || 'HP';
        opt.innerText = n.room;
        roomSelect.appendChild(opt);
    });
};

window.applyNbrRules = function() {
    const roomSelect = document.getElementById('nbr-room-select') as HTMLSelectElement;
    if (!roomSelect || roomSelect.selectedIndex < 0) return;
    
    const selectedOption = roomSelect.options[roomSelect.selectedIndex];
    if (!selectedOption || !selectedOption.value) return;

    const tLux = parseFloat(selectedOption.dataset.lux!);
    const tUgr = parseFloat(selectedOption.dataset.ugr!);
    const tPlane = selectedOption.dataset.plane || 'HP';

    window.currentNbrTarget = { lux: tLux, ugr: tUgr, plane: tPlane };

    document.getElementById('nbr-target-lux-display')!.innerText = `${tLux} lx`;
    document.getElementById('nbr-target-ugr-display')!.innerText = tUgr === 99 ? 'N/A' : String(tUgr);

    const gridTargetLuxInput = document.getElementById('g-targetLux') as HTMLInputElement;
    const gridRangeTargetLux = document.getElementById('range-g-targetLux') as HTMLInputElement;
    if (gridTargetLuxInput && gridRangeTargetLux && window.state && window.state.grid) {
        gridTargetLuxInput.value = String(tLux);
        gridRangeTargetLux.value = String(tLux);
        window.state.grid.targetLux = tLux;
    }

    window.updateCalculations();
};

window.populateCategoryFilter = function() {
    const sel = document.getElementById('category-filter') as HTMLSelectElement;
    if(!sel || sel.options.length > 1) return;
    const uniqueCats = [...new Set(window.normsDatabase.map((n: any) => n.cat))].sort() as string[];
    uniqueCats.forEach((c: string) => { const o = document.createElement('option'); o.value=c; o.innerText=c; sel.appendChild(o); });
};

window.filterNorms = function() {
    const cat = (document.getElementById('category-filter') as HTMLSelectElement).value;
    const searchInput = document.getElementById('search-filter') as HTMLInputElement;
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    const filtered = window.normsDatabase.filter((n: any) => {
        const matchCat = cat === 'all' || n.cat === cat;
        const matchSearch = n.room.toLowerCase().includes(searchTerm) || n.cat.toLowerCase().includes(searchTerm);
        return matchCat && matchSearch;
    });
    
    document.getElementById('nbr8995-tbody')!.innerHTML = filtered.map((n: any) => `<tr class="hover:bg-slate-50 transition-colors border-b border-slate-100"><td class="p-4 font-black text-luminous-gold text-xs uppercase">${n.cat}</td><td class="p-4 text-slate-500 font-bold">${n.room}</td><td class="p-4 text-center font-black text-starlight bg-slate-50">${n.lux}</td><td class="p-4 text-center text-slate-400">${n.ugr}</td><td class="p-4 text-center text-slate-400">${n.ra}</td></tr>`).join('');
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
        name: "Novo Ambiente", 
        area: 50, 
        baseLpd: 0, 
        typology: "", 
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
        if (field === 'name' || field === 'typology') room[field] = value;
        else room[field] = parseFloat(value) || 0;
        
        if (field === 'typology') {
            const baseline = window.lpdBaselines.find((b: any) => b.type === value);
            if (baseline) room.baseLpd = baseline.base;
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
    const roomLpd = room.area > 0 ? roomTotalWatts / room.area : 0;
    const isOverLimit = room.baseLpd > 0 && roomLpd > room.baseLpd;
    
    const wEl = document.getElementById(`room-w-${roomId}`);
    const lpdEl = document.getElementById(`room-lpd-${roomId}`);
    const cardEl = document.getElementById(`room-card-${roomId}`);
    const nameEl = document.getElementById(`room-name-${roomId}`);
    
    if (wEl) wEl.innerText = roomTotalWatts.toFixed(1);
    if (lpdEl) lpdEl.innerText = roomLpd.toFixed(2);
    
    if (cardEl) {
        if (isOverLimit) {
            cardEl.classList.add('border-red-500', 'dark:border-red-500', 'shadow-[0_0_15px_rgba(239,68,68,0.15)]');
            cardEl.classList.remove('border-slate-200', 'dark:border-slate-700');
        } else {
            cardEl.classList.remove('border-red-500', 'dark:border-red-500', 'shadow-[0_0_15px_rgba(239,68,68,0.15)]');
            cardEl.classList.add('border-slate-200', 'dark:border-slate-700');
        }
    }
    
    if (isOverLimit) {
        wEl?.classList.add('text-red-500'); wEl?.classList.remove('text-starlight', 'dark:text-white');
        lpdEl?.classList.add('text-red-500'); lpdEl?.classList.remove('text-starlight', 'dark:text-white');
        nameEl?.classList.add('text-red-500', 'dark:text-red-500'); nameEl?.classList.remove('text-starlight', 'dark:text-white');
    } else {
        wEl?.classList.remove('text-red-500'); wEl?.classList.add('text-starlight', 'dark:text-white');
        lpdEl?.classList.remove('text-red-500'); lpdEl?.classList.add('text-starlight', 'dark:text-white');
        nameEl?.classList.remove('text-red-500', 'dark:text-red-500'); nameEl?.classList.add('text-starlight', 'dark:text-white');
    }
};

window.updateGlobalLeedSummary = () => {
    const s = window.state.leedProject;
    const summary = window.StandardsEngine.calculateLeedCompliance(s);
    document.getElementById('global-leed-watts')!.innerHTML = `${summary.totalWatts.toFixed(1)} <span class="text-lg font-light text-slate-400">/ ${summary.allowedWatts.toFixed(1)} W Permitidos</span>`;
    document.getElementById('global-leed-lpd')!.innerHTML = `${summary.currentLpd.toFixed(2)} <span class="text-lg font-light text-slate-400">W/m²</span>`;
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
        <div class="bg-slate-900 p-6 rounded-2xl mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 shadow-lg">
            <div class="flex-grow w-full lg:w-auto">
                <label class="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Nome do Projeto</label>
                <input type="text" value="${s.name}" oninput="window.state.leedProject.name = this.value" class="bg-transparent border-b border-slate-700 text-white font-black text-lg w-full focus:border-luminous-gold outline-none py-1">
            </div>
            
            <div class="w-full lg:w-auto flex items-center gap-2">
                <select id="load-leed-select" class="bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-3 py-2.5 font-bold text-[10px] uppercase outline-none w-full lg:w-48 cursor-pointer focus:border-luminous-gold">
                    <option value="" disabled selected>Projetos Salvos...</option>
                    ${savedOptions}
                </select>
                <button onclick="window.loadSpecificLeedProject()" class="bg-slate-800 hover:bg-slate-700 text-white w-9 h-9 flex items-center justify-center rounded-lg transition-colors border border-slate-700" title="Carregar"><i class="fas fa-folder-open"></i></button>
                <button onclick="window.deleteSpecificLeedProject()" class="bg-slate-800 hover:bg-red-500 text-white w-9 h-9 flex items-center justify-center rounded-lg transition-colors border border-slate-700" title="Excluir"><i class="fas fa-trash"></i></button>
            </div>

            <div class="w-full lg:w-auto border-l border-slate-700 pl-6 hidden lg:flex items-end gap-2">
                <div>
                    <label class="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Meta ASHRAE 90.1</label>
                    <select onchange="window.updateLeedTargetMode(this.value)" class="bg-slate-800 text-luminous-gold border border-slate-700 rounded-lg px-4 py-2.5 font-bold text-[10px] uppercase outline-none w-full cursor-pointer focus:border-luminous-gold">
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
                        <input type="number" value="${s.customReduction || 15}" oninput="window.updateCustomLeedReduction(parseFloat(this.value) || 0)" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2.5 text-[10px] text-tech-cyan font-black outline-none focus:border-luminous-gold text-right pr-6">
                        <span class="absolute right-2 top-2.5 text-[10px] text-slate-400 font-bold">%</span>
                    </div>
                </div>
                ` : ''}
            </div>
            
            <div class="flex gap-2 w-full lg:w-auto">
                <button onclick="window.saveLeedProject()" id="btn-save-leed" class="flex-1 lg:flex-none bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-slate-600"><i class="fas fa-save mr-2"></i> Salvar</button>
                <button onclick="window.generateLeedReport()" class="flex-1 lg:flex-none bg-luminous-gold hover:bg-amber-600 text-white px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg"><i class="fas fa-file-pdf mr-2"></i> Relatório</button>
            </div>
        </div>
    `;

    html += s.rooms.map((room: any) => {
        const roomTotalWatts = room.fixtures.reduce((sum: number, f: any) => sum + (f.power * f.qty), 0);
        const roomLpd = room.area > 0 ? roomTotalWatts / room.area : 0;
        const isOverLimit = room.baseLpd > 0 && roomLpd > room.baseLpd;
        const borderClass = isOverLimit ? 'border-red-500 dark:border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 'border-slate-200 dark:border-slate-700';
        const titleColor = isOverLimit ? 'text-red-500 dark:text-red-500' : 'text-starlight dark:text-white';
        const expanded = room.expanded !== false;
        
        let roomHtml = `
            <div id="room-card-${room.id}" class="bg-slate-50 dark:bg-slate-800/30 p-3 lg:p-4 rounded-xl border ${borderClass} animate-fade-in-up mb-4 transition-all">
                <div class="flex flex-wrap items-center gap-3 w-full">
                    
                    <div class="flex items-center gap-3 flex-grow min-w-[200px]">
                        <button onclick="window.toggleLeedRoom(${room.id})" class="text-slate-400 hover:text-luminous-gold w-6 h-6 flex-shrink-0 flex items-center justify-center rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-sm transition-colors" title="Expandir/Recolher">
                            <i id="icon-toggle-${room.id}" class="fas ${expanded ? 'fa-minus' : 'fa-plus'} text-[10px]"></i>
                        </button>
                        <input type="text" id="room-name-${room.id}" value="${room.name}" oninput="window.updateLeedRoomData(${room.id}, 'name', this.value)" class="text-xs font-black ${titleColor} bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-luminous-gold transition-colors w-full min-w-0 pb-1 uppercase outline-none truncate">
                    </div>
                    
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <div class="flex items-center gap-1.5 bg-white dark:bg-slate-700 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-600 shadow-sm">
                            <label class="text-[9px] font-black text-slate-500 uppercase tracking-widest hidden sm:block">ÁREA (m²):</label>
                            <input type="number" value="${room.area}" oninput="window.updateLeedRoomData(${room.id}, 'area', this.value)" class="w-12 text-right bg-transparent text-[11px] font-black text-starlight dark:text-white outline-none focus:text-luminous-gold">
                        </div>
                        
                        <div class="flex items-center gap-1.5 bg-white dark:bg-slate-700 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-600 shadow-sm">
                            <select onchange="window.updateLeedRoomData(${room.id}, 'typology', this.value)" class="custom-select w-[130px] md:w-[180px] truncate text-[10px] bg-transparent font-bold text-starlight dark:text-white outline-none cursor-pointer focus:text-luminous-gold uppercase">
                                <option value="" disabled ${!room.typology ? 'selected' : ''}>TIPOLOGIA ASHRAE...</option>
                                ${window.lpdBaselines.map((b: any) => `<option value="${b.type}" ${room.typology === b.type ? 'selected' : ''}>${b.type} (${b.base} W/m²)</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-2 flex-shrink-0 ml-0 xl:ml-auto w-full xl:w-auto justify-end mt-2 xl:mt-0">
                        <div class="flex items-center gap-2 bg-white dark:bg-slate-700 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-600 shadow-sm">
                            <div class="text-[10px] font-bold"><span class="text-slate-400">W:</span> <span id="room-w-${room.id}" class="${titleColor} font-black">${roomTotalWatts.toFixed(1)}</span></div>
                            <div class="w-px h-4 bg-slate-300 dark:bg-slate-600"></div>
                            <div class="text-[10px] font-bold"><span class="text-slate-400">LPD:</span> <span id="room-lpd-${room.id}" class="${titleColor} font-black">${roomLpd.toFixed(2)}</span></div>
                        </div>
                        <button onclick="window.duplicateLeedRoom(${room.id})" class="text-slate-400 hover:text-tech-cyan transition-colors w-7 h-7 flex items-center justify-center rounded hover:bg-cyan-50 dark:hover:bg-cyan-900/20" title="Duplicar Ambiente"><i class="fas fa-copy text-[12px]"></i></button>
                        <button onclick="window.removeLeedRoom(${room.id})" class="text-slate-400 hover:text-red-500 transition-colors w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 dark:hover:bg-red-900/20" title="Excluir Ambiente"><i class="fas fa-trash text-[12px]"></i></button>
                    </div>
                </div>

                <div id="room-details-${room.id}" class="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 transition-all" style="display: ${expanded ? 'block' : 'none'};">
                    <table class="w-full text-xs mb-4">
                        <thead class="text-slate-400 uppercase font-black border-b border-slate-200 dark:border-slate-700 text-[9px] tracking-widest">
                            <tr><th class="text-left pb-2">Luminária</th><th class="text-center pb-2">Watts (W)</th><th class="text-center pb-2">Qtd</th><th class="text-right pb-2">Subtotal</th><th class="pb-2"></th></tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                            ${room.fixtures.map((f: any) => `
                                <tr class="group/fix hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                                    <td class="py-2 px-1"><input type="text" value="${f.label}" oninput="window.updateLeedFixtureData(${room.id}, ${f.id}, 'label', this.value)" class="bg-transparent font-bold w-full text-slate-600 dark:text-slate-300 outline-none focus:text-luminous-gold border-b border-transparent focus:border-luminous-gold transition-colors"></td>
                                    <td class="py-2 text-center"><input type="number" value="${f.power}" oninput="window.updateLeedFixtureData(${room.id}, ${f.id}, 'power', this.value)" class="w-16 text-center bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 outline-none focus:border-luminous-gold transition-colors"></td>
                                    <td class="py-2 text-center"><input type="number" value="${f.qty}" oninput="window.updateLeedFixtureData(${room.id}, ${f.id}, 'qty', this.value)" class="w-16 text-center bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 outline-none focus:border-luminous-gold transition-colors"></td>
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

window.loadSpecificLeedProject = () => {
    const select = document.getElementById('load-leed-select') as HTMLSelectElement;
    if (!select || !select.value) return;
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
    if (!select || !select.value) return alert("Por favor, selecione um projeto na lista primeiro para deletar.");
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

// 12. CONTROLO DE CÁLCULOS
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
                    s[key] = (isEn && isDist) ? finalVal / 3.28084 : finalVal;
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
        if (sumPlane) sumPlane.innerText = targetPlane === 'LP' ? 'NÍVEL PISO (0.00m)' : 'NÍVEL MESA (0.75m)';
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
                if (status === 'APPROVED') {
                    nbrPanel.style.borderColor = '#10b981';
                    nbrIconContainer.className = 'w-12 h-12 rounded-full flex items-center justify-center bg-green-100 text-green-600';
                    nbrIcon.className = 'fas fa-check-circle';
                    nbrStatusText.innerText = `Auditoria NBR: Conforme a norma`;
                    nbrBadge.innerText = 'APROVADO';
                    nbrBadge.className = 'px-4 py-1.5 rounded-full text-[10px] font-black bg-green-100 text-green-700 border-green-200';
                } else if (status === 'WARNING') {
                    nbrPanel.style.borderColor = '#f59e0b';
                    nbrIconContainer.className = 'w-12 h-12 rounded-full flex items-center justify-center bg-amber-100 text-amber-600';
                    nbrIcon.className = 'fas fa-exclamation-triangle';
                    nbrStatusText.innerText = `Auditoria NBR: Nível Marginal / Tolerável`;
                    nbrBadge.innerText = 'AVISO';
                    nbrBadge.className = 'px-4 py-1.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 border-amber-200';
                } else {
                    nbrPanel.style.borderColor = '#ef4444';
                    nbrIconContainer.className = 'w-12 h-12 rounded-full flex items-center justify-center bg-red-100 text-red-600';
                    nbrIcon.className = 'fas fa-times-circle';
                    nbrStatusText.innerText = `Auditoria NBR: Fora dos Requisitos`;
                    nbrBadge.innerText = 'REPROVADO';
                    nbrBadge.className = 'px-4 py-1.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 border-red-200';
                }
            }
        }
    }
};

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