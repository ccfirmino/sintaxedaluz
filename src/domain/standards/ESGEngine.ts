// src/domain/standards/ESGEngine.ts

export const ESGEngine = {
    /**
     * Calcula o impacto financeiro (ROI/Payback) e ambiental de um projeto luminotécnico.
     */
    calculateESGImpact: (proposedWatts: number, baselineWatts: number, kwhCost: number, dailyHours: number, daysPerYear: number, hasAC: boolean, maintSavingsYearly: number, capex: number) => {
        
        const currentKwh = (baselineWatts * dailyHours * daysPerYear) / 1000;
        const newKwh = (proposedWatts * dailyHours * daysPerYear) / 1000;
        
        let savedKwh = currentKwh - newKwh;
        if (savedKwh < 0) savedKwh = 0; 
        
        // Bônus Térmico: Menos calor da iluminação = Menos esforço do Ar Condicionado
        if (hasAC) savedKwh *= 1.33;

        const energySavingsMoney = savedKwh * kwhCost;
        const totalSavingsYearly = energySavingsMoney + maintSavingsYearly;

        const co2ReductionKg = savedKwh * 0.085; // Mix energético BR (aprox)
        const treesPlanted = co2ReductionKg / 20;

        let paybackMonths = 0;
        let roi5Years = 0;
        let isProfitable = totalSavingsYearly > 0;
        let message = "";

        if (isProfitable) {
            if (capex > 0) {
                paybackMonths = (capex / totalSavingsYearly) * 12;
                roi5Years = (((totalSavingsYearly * 5) - capex) / capex) * 100;
                
                if (paybackMonths <= 24) {
                    message = `Projeto Altamente Viável! Payback ultra-rápido em ${paybackMonths.toFixed(1)} meses e ROI de ${roi5Years.toFixed(0)}% em 5 anos.`;
                } else {
                    message = `Projeto Sustentável. O investimento se paga em ${paybackMonths.toFixed(1)} meses.`;
                }
            } else {
                message = "Economia comprovada! Insira o Custo de Implantação (R$) para calcularmos os meses de Payback.";
            }
        } else {
            message = "A carga proposta excede a atual. Sem viabilidade financeira baseada em eficiência energética.";
        }

        return {
            savedKwh, energySavingsMoney, totalSavingsYearly, co2ReductionKg,
            treesPlanted, paybackMonths, roi5Years, isProfitable, message
        };
    }
};