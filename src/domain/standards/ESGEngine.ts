// src/domain/standards/ESGEngine.ts

export const ESGEngine = {
    /**
     * Calcula o Impacto ESG e Financeiro Avançado (ROI Enterprise)
     */
    calculateESGImpact: (systemWatts: number, baselineWatts: number, kwhCost: number, dailyHours: number, daysPerYear: number, hasAC: boolean = false, maintenanceSavings: number = 0) => {
        if (systemWatts <= 0 || baselineWatts <= 0) return { savingsMoney: 0, treesPlanted: 0, paybackMonths: 0, isProfitable: false, message: "Parâmetros inválidos." };

        let deltaWatts = baselineWatts - systemWatts;
        
        // Fator HVAC: Se houver ar-condicionado, cada 3W de luz removida economiza ~1W de refrigeração
        const hvacBonus = hasAC ? (deltaWatts / 3) : 0;
        const totalEffectiveSavingsWatts = deltaWatts + hvacBonus;

        const annualHours = dailyHours * daysPerYear;
        const annualKWhSaved = (totalEffectiveSavingsWatts * annualHours) / 1000;
        
        // Economia Financeira = Energia + Manutenção Evitada
        const energySavingsMoney = annualKWhSaved * kwhCost;
        const totalAnnualSavings = energySavingsMoney + maintenanceSavings;

        // Ambiental: 0.25kg CO2/kWh evitado
        const carbonAvoidedKg = annualKWhSaved * 0.25;
        const treesPlanted = carbonAvoidedKg / 20;

        let message = `Performance ESG: Economia de ${annualKWhSaved.toFixed(0)} kWh/ano. `;
        if (hasAC) message += `(Incluindo redução de carga térmica no Ar-Condicionado). `;
        message += `Impacto equivalente a ${treesPlanted.toFixed(1)} árvores/ano.`;

        return { 
            savingsMoney: totalAnnualSavings, 
            treesPlanted, 
            isProfitable: deltaWatts > 0, 
            message,
            hvacContribution: (hvacBonus * annualHours / 1000) * kwhCost
        };
    }
};