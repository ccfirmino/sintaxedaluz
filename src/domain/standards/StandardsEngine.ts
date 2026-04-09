// src/domain/standards/StandardsEngine.ts

export interface RoadwayParams {
    speed: number;
    volume: number;
    separation: number;
    density: number;
    complexity: number;
    ambient: number;
}

export interface LeedFixture {
    power: number;
    qty: number;
}

export interface LeedRoom {
    area?: number; // Opcional, pois áreas lineares usam 'length'
    length?: number; // Novo: para cálculos lineares de fachada/exterior
    unit?: 'W/m²' | 'W/m'; // Novo: Define a métrica física
    baseLpd: number;
    leedCategory?: string; // LUXSINTAX: Discriminador de Zona (Interior/Fachada/Exterior)
    fixtures: LeedFixture[];
}

export interface LeedProject {
    target: string;
    customReduction?: number;
    lightingZone?: 'LZ0' | 'LZ1' | 'LZ2' | 'LZ3' | 'LZ4'; // Novo: Zona de Iluminação Externa
    rooms: LeedRoom[];
}

export class StandardsEngine {
    private static readonly mClassTable: Record<string, any> = {
        M1: { desc: "Vias Expressas / Alta Vel.", lmed: 2.0, emed: 30, u0: 0.40, ul: 0.70, ti: 10, eir: 0.35 },
        M2: { desc: "Avenidas Principais", lmed: 1.5, emed: 20, u0: 0.40, ul: 0.60, ti: 10, eir: 0.35 },
        M3: { desc: "Vias Arteriais", lmed: 1.0, emed: 15, u0: 0.40, ul: 0.60, ti: 15, eir: 0.30 },
        M4: { desc: "Vias Coletoras", lmed: 0.75, emed: 10, u0: 0.40, ul: 0.50, ti: 15, eir: 0.30 },
        M5: { desc: "Vias Locais", lmed: 0.50, emed: 7.5, u0: 0.35, ul: 0.40, ti: 15, eir: 0.30 },
        M6: { desc: "Vias Residenciais Leves", lmed: 0.30, emed: 5, u0: 0.35, ul: 0.40, ti: 20, eir: 0.30 }
    };

    private static readonly leedTargets: Record<string, number> = {
        baseline: 1.0,
        certified: 0.95,
        silver: 0.90,
        gold: 0.80,
        platinum: 0.70
    };

    public static calculateNbr5101(params: RoadwayParams) {
        const score = params.speed + params.volume + params.separation + params.density + params.complexity + params.ambient;
        let m = 6 - score;
        if (m < 1) m = 1;
        if (m > 6) m = 6;
        const className = "M" + m;
        return { className, ...this.mClassTable[className] };
    }

    public static calculateLeedCompliance(project: LeedProject) {
        let totalWatts = 0;
        let totalArea = 0;
        let allowedWatts = 0;
        
        let targetFactor = this.leedTargets[project.target] || 1.0;
        if (project.target === 'custom' && project.customReduction !== undefined) {
            targetFactor = Math.max(0, 1 - (project.customReduction / 100));
        }

        // LUXSINTAX: Isolamento de Contexto (Context Grouping)
        const categories: Record<string, { watts: number, allowed: number, area: number }> = {
            interior: { watts: 0, allowed: 0, area: 0 },
            facade: { watts: 0, allowed: 0, area: 0 },
            exterior: { watts: 0, allowed: 0, area: 0 }
        };

        // LUXSINTAX: Injeção da Potência Base Externa (Base Allowance ASHRAE 90.1)
        if (project.lightingZone && project.lightingZone !== 'LZ0') {
            const baseAllowances: Record<string, number> = { LZ1: 400, LZ2: 600, LZ3: 750, LZ4: 1300 };
            const baseW = baseAllowances[project.lightingZone] || 0;
            categories.exterior.allowed += baseW;
            allowedWatts += baseW;
        }

        project.rooms.forEach(r => {
            const cat = r.leedCategory || 'interior';
            
            // LUXSINTAX: Matemática Híbrida (Área vs Linear)
            let measurement = 0;
            if (r.unit === 'W/m' && r.length) {
                measurement = r.length;
            } else if (r.area) {
                measurement = r.area;
            }

            const roomAllowedWatts = (r.baseLpd || 0) * targetFactor * measurement;
            let roomWatts = 0;
            
            r.fixtures.forEach(f => roomWatts += (f.power * f.qty));

            if (categories[cat]) {
                categories[cat].watts += roomWatts;
                categories[cat].allowed += roomAllowedWatts;
                if (r.unit !== 'W/m') {
                    categories[cat].area += (r.area || 0); // Só soma m² real
                }
            }

            if (r.unit !== 'W/m') {
                totalArea += (r.area || 0);
            }
            allowedWatts += roomAllowedWatts;
            totalWatts += roomWatts;
        });

        // LUXSINTAX: A conformidade global exige que NENHUMA categoria extrapole seu limite (Anti-Trade-off)
        let isCompliant = true;
        Object.keys(categories).forEach(k => {
            const cat = categories[k];
            // Se a categoria tem meta definida e ultrapassou, o projeto INTEIRO reprova.
            if (cat.allowed > 0 && cat.watts > cat.allowed) {
                isCompliant = false;
            }
        });
        
        // Se a carga global estourar, falha também (Redundância de Segurança)
        if (totalWatts > allowedWatts) isCompliant = false;

        // LUXSINTAX: Cálculo de Impacto ESG (Estimativa Anual Comercial Padrão)
        const savingsWatts = Math.max(0, allowedWatts - totalWatts);
        const hoursPerYear = 3000; // Padrão comercial: 12h/dia x 250 dias úteis
        const savingsKwh = (savingsWatts / 1000) * hoursPerYear;
        const co2ReductionKg = savingsKwh * 0.43; // Fator médio de emissão global (kgCO2/kWh)
        const treesEquivalent = co2ReductionKg / 22; // Capacidade de absorção de uma árvore adulta (~22kg/ano)

        return {
            totalWatts,
            allowedWatts,
            totalArea,
            currentLpd: totalArea > 0 ? (totalWatts / totalArea) : 0,
            isCompliant, // LUXSINTAX: Validação rigorosa e anti-trade-off
            categories,  // LUXSINTAX: Exposto para o ReportExporter gerar seções separadas
            esg: {
                savingsKwh,
                co2ReductionKg,
                treesEquivalent
            }
        };
    }
}