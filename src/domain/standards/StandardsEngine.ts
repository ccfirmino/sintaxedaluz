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
    area: number;
    baseLpd: number;
    fixtures: LeedFixture[];
}

export interface LeedProject {
    target: string;
    customReduction?: number;
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

        project.rooms.forEach(r => {
            totalArea += r.area;
            const roomAllowedLpd = (r.baseLpd || 0) * targetFactor;
            allowedWatts += (roomAllowedLpd * r.area);
            r.fixtures.forEach(f => totalWatts += (f.power * f.qty));
        });

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
            isCompliant: totalWatts <= allowedWatts,
            esg: {
                savingsKwh,
                co2ReductionKg,
                treesEquivalent
            }
        };
    }
}