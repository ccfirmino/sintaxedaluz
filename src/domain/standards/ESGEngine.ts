// src/domain/standards/ESGEngine.ts

export const ESGEngine = {
    /**
     * Calcula o impacto financeiro (LCC - Life Cycle Costing) e ambiental de um projeto luminotécnico.
     * Incorpora VPL (Valor Presente Líquido) e Projeção Inflacionária.
     */
    calculateESGImpact: (proposedWatts: number, baselineWatts: number, kwhCost: number, dailyHours: number, daysPerYear: number, hasAC: boolean, maintSavingsYearly: number, capex: number, energyInflation: number = 0.05, discountRate: number = 0.10, analysisYears: number = 5) => {
        
        const currentKwh = (baselineWatts * dailyHours * daysPerYear) / 1000;
        const newKwh = (proposedWatts * dailyHours * daysPerYear) / 1000;
        
        let savedKwh = currentKwh - newKwh;
        if (savedKwh < 0) savedKwh = 0; 
        
        // Bônus Térmico: Menos calor da iluminação = Menos esforço do Ar Condicionado
        if (hasAC) savedKwh *= 1.33;

        const baseEnergySavings = savedKwh * kwhCost;

        // LUXSINTAX: Cálculo de VPL (Valor Presente Líquido) para o Ciclo de Vida
        let vpl = -capex;
        let accumulatedSavings = 0;

        for (let year = 1; year <= analysisYears; year++) {
            // Inflação na energia aumenta a economia bruta ano a ano
            const yearlyEnergySavings = baseEnergySavings * Math.pow(1 + energyInflation, year);
            const totalYearlyCashFlow = yearlyEnergySavings + maintSavingsYearly;
            accumulatedSavings += totalYearlyCashFlow;

            // Desconto do fluxo de caixa projetado para o valor presente (Custo de Capital)
            vpl += totalYearlyCashFlow / Math.pow(1 + discountRate, year);
        }

        const co2ReductionKg = savedKwh * 0.085; // Mix energético BR (aprox)
        const treesPlanted = co2ReductionKg / 20;

        let paybackMonths = 0;
        let roi5Years = 0;
        // O projeto só é viável se o VPL for maior que zero (gera riqueza real)
        let isProfitable = vpl > 0 || (accumulatedSavings > capex && capex === 0);
        let message = "";

        if (baseEnergySavings + maintSavingsYearly > 0) {
            if (capex > 0) {
                // Cálculo de Payback Simples (apenas para métrica tradicional)
                paybackMonths = (capex / (baseEnergySavings + maintSavingsYearly)) * 12;
                roi5Years = ((accumulatedSavings - capex) / capex) * 100;
                
                if (vpl > 0) {
                    message = `Projeto Altamente Viável! VPL positivo de ${vpl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em ${analysisYears} anos, superando o custo de capital.`;
                } else {
                    message = `Alerta de Risco: Apesar da economia nominal, o VPL é negativo (${vpl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}). O investimento não supera o custo de oportunidade (SELIC/WACC).`;
                }
            } else {
                message = "Economia comprovada! Insira o CAPEX (Custo de Implantação) para calcularmos o VPL e ROI real ajustado pela inflação.";
            }
        } else {
            message = "A carga proposta excede a atual. Sem viabilidade financeira baseada em eficiência energética.";
        }

        return {
            savedKwh, 
            energySavingsMoney: baseEnergySavings, 
            totalSavingsYearly: baseEnergySavings + maintSavingsYearly, 
            accumulatedSavings,
            vpl,
            co2ReductionKg,
            treesPlanted, 
            paybackMonths, 
            roi5Years, 
            isProfitable, 
            message
        };
    }
};