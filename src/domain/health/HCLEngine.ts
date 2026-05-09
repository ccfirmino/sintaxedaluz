// src/domain/health/HCLEngine.ts

export const HCLEngine = {
    /**
     * Curva de Sensibilidade Melanópica (V'λ mel) - Normalizada no pico de 480nm.
     * Representa o "Fantasma do Ciano" para sobreposição no SPD.
     */
    getMelanopicActionCurve: () => {
        return [
            { nm: 380, val: 0.0000 }, { nm: 400, val: 0.0020 }, { nm: 420, val: 0.0180 },
            { nm: 440, val: 0.1150 }, { nm: 460, val: 0.6490 }, { nm: 480, val: 1.0000 },
            { nm: 500, val: 0.7640 }, { nm: 520, val: 0.2860 }, { nm: 540, val: 0.0710 },
            { nm: 560, val: 0.0150 }, { nm: 580, val: 0.0030 }, { nm: 600, val: 0.0010 },
            { nm: 620, val: 0.0000 }, { nm: 640, val: 0.0000 }, { nm: 660, val: 0.0000 },
            { nm: 680, val: 0.0000 }, { nm: 700, val: 0.0000 }, { nm: 720, val: 0.0000 },
            { nm: 740, val: 0.0000 }, { nm: 760, val: 0.0000 }, { nm: 780, val: 0.0000 }
        ];
    },

    getPhotopicCurve: () => {
        return [
            { nm: 380, val: 0.0000 }, { nm: 400, val: 0.0004 }, { nm: 420, val: 0.0040 },
            { nm: 440, val: 0.0230 }, { nm: 460, val: 0.0600 }, { nm: 480, val: 0.1390 },
            { nm: 500, val: 0.3230 }, { nm: 520, val: 0.7100 }, { nm: 540, val: 0.9540 },
            { nm: 560, val: 0.9950 }, { nm: 580, val: 0.8700 }, { nm: 600, val: 0.6310 },
            { nm: 620, val: 0.3810 }, { nm: 640, val: 0.1750 }, { nm: 660, val: 0.0610 },
            { nm: 680, val: 0.0170 }, { nm: 700, val: 0.0041 }, { nm: 720, val: 0.0010 },
            { nm: 740, val: 0.0003 }, { nm: 760, val: 0.0001 }, { nm: 780, val: 0.0000 }
        ];
    },

    /**
     * Integração Numérica Riemanniana: Calcula o Melanopic Ratio (M/P) a partir de um SPD bruto.
     * @param spd Array de coordenadas {nm, val} representando a distribuição espectral de potência (W/nm).
     */
    /**
     * Integração Numérica com Interpolação Linear de Alta Precisão.
     * Retorna o M/P Ratio e o polígono de intersecção biológica para renderização didática.
     */
    calculateMelanopicMetrics: (spd: Array<{nm: number, val: number}>) => {
        const melCurve = HCLEngine.getMelanopicActionCurve();
        const photCurve = HCLEngine.getPhotopicCurve();
        
        let melIntegral = 0;
        let photIntegral = 0;
        const intersectionCurve: Array<{nm: number, spdVal: number, melVal: number, activeArea: number}> = [];

        const safeSpd = spd.filter(p => p.nm >= 380 && p.nm <= 780).sort((a, b) => a.nm - b.nm);
        if (safeSpd.length < 2) return { ratio: 0.52, intersection: [] };

        const interpolate = (curve: Array<{nm: number, val: number}>, targetNm: number) => {
            const exact = curve.find(p => p.nm === targetNm);
            if (exact) return exact.val;
            const lower = curve.slice().reverse().find(p => p.nm < targetNm);
            const upper = curve.find(p => p.nm > targetNm);
            if (!lower || !upper) return 0;
            const t = (targetNm - lower.nm) / (upper.nm - lower.nm);
            return lower.val + t * (upper.val - lower.val);
        };

        for (let i = 0; i < safeSpd.length - 1; i++) {
            const wl1 = safeSpd[i].nm;
            const wl2 = safeSpd[i+1].nm;
            const deltaWl = wl2 - wl1;

            const avgVal = (safeSpd[i].val + safeSpd[i+1].val) / 2;
            const avgMel = (interpolate(melCurve, wl1) + interpolate(melCurve, wl2)) / 2;
            const avgPhot = (interpolate(photCurve, wl1) + interpolate(photCurve, wl2)) / 2;

            melIntegral += avgVal * avgMel * deltaWl;
            photIntegral += avgVal * avgPhot * deltaWl;

            intersectionCurve.push({
                nm: wl1,
                spdVal: safeSpd[i].val,
                melVal: interpolate(melCurve, wl1),
                activeArea: safeSpd[i].val * interpolate(melCurve, wl1)
            });
        }

        const CIE_SCALAR = 1.104;
        return {
            ratio: photIntegral === 0 ? 0 : (melIntegral / photIntegral) * CIE_SCALAR,
            intersection: intersectionCurve
        };
    },

    /**
     * Fator de Transmitância do Cristalino (Modelo Pokorny/Sagawa corrigido)
     */
    calculateLensTransmission: (age: number) => {
        if (age <= 20) return 1.0;
        const loss = Math.pow(0.988, age - 20);
        return Math.max(0.35, loss);
    },

    /**
     * O Índice de Produtividade WELL (Score de Performance Humana)
     */
    calculateHumanPerformanceScore: (medi: number, cs: number, rf: number, flickerLow: boolean) => {
        const stimulusScore = Math.min(medi / 250, 1.0) * 40;
        const colorScore = Math.min(rf / 90, 1.0) * 30;
        const stabilityScore = flickerLow ? 30 : 5;
        return Math.round(stimulusScore + colorScore + stabilityScore) / 10;
    },

    calculateCircadianStimulus: (medi: number) => {
        let cs = 0.7 * (1 - Math.pow(1 + Math.pow(medi / 300, 1.2), -1));
        return Math.min(Math.max(cs, 0), 0.7);
    },

    evaluateCircadianImpact: (visualLux: number, mRatio: number, useType: string, timeOfDay: string, age: number = 30) => {
        const lensFactor = HCLEngine.calculateLensTransmission(age);
        const medi = visualLux * mRatio * lensFactor;
        const cs = HCLEngine.calculateCircadianStimulus(medi);
        
        let isOptimal = false; let isWarning = false; let isCritical = false;
        let statusTag = "NEUTRO"; let message = "";

        if (timeOfDay === 'night') {
            if (mRatio >= 0.68 || medi > 100) { 
                isCritical = true; statusTag = "CONFLITO SEVERO";
                message = `Risco Biológico: Luz fria (M/P: ${mRatio.toFixed(2)}) à noite detectada. Supressão de melatonina iminente para usuário de ${age} anos.`;
            } else if (medi > 50) {
                isWarning = true; statusTag = "ALERTA FADIGA";
                message = `Higiene do Sono: m-EDI (${Math.round(medi)}) acima do limite noturno.`;
            } else {
                isOptimal = true; statusTag = "ZONA DE REPOUSO";
                message = `Ideal: Espectro seguro para relaxamento e regeneração.`;
            }
        } else {
            if (medi >= 250 && cs >= 0.3) {
                isOptimal = true; statusTag = "ALTA PERFORMANCE";
                message = `Sincronia WELL: Estímulo melanópico robusto para foco e vigor.`;
            } else {
                isWarning = true; statusTag = "ESTÍMULO BAIXO";
                message = `Ambiente Hiponímico: Risco de sonolência diurna (Meta: 250 m-EDI).`;
            }
        }

        return { medi, cs, lensFactor, isOptimal, isWarning, isCritical, statusTag, message };
    },

    simulateCircadianJourney: (baseVisualLux: number, mRatio: number, age: number, shiftType: string = 'diurnal') => {
        const journey = [];
        const lensFactor = HCLEngine.calculateLensTransmission(age);
        
        for (let hour = 0; hour < 24; hour++) {
            let activeLux = 0; let idealCS = 0; let zoneLabel = "Sono";

            if (shiftType === 'diurnal') {
                if (hour >= 8 && hour < 18) { activeLux = baseVisualLux; idealCS = 0.3; zoneLabel = "Janela de Alerta"; } 
                else if (hour >= 18 && hour < 22) { activeLux = baseVisualLux * 0.15; idealCS = 0.1; zoneLabel = "Preparação"; }
            } else {
                if (hour >= 19 || hour < 7) { activeLux = baseVisualLux; idealCS = 0.3; zoneLabel = "Plantão"; }
            }

            const medi = activeLux * mRatio * lensFactor;
            const actualCS = activeLux > 0 ? HCLEngine.calculateCircadianStimulus(medi) : 0;
            const isConflict = (hour >= 21 || hour < 6) && actualCS > 0.1;

            journey.push({ hour, activeLux, actualCS, idealCS, zoneLabel, isConflict });
        }
        return journey;
    }
};