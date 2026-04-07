// src/domain/standards/ESGEngine.ts

export const ESGEngine = {
    /**
     * Calcula o Retorno sobre Investimento (ROI) e a Pegada de Carbono.
     * @param systemWatts Potência total do novo projeto (W)
     * @param baselineWatts Potência do sistema antigo ou convencional (W)
     * @param kwhCost Tarifa de energia (R$/kWh)
     * @param dailyHours Horas de uso por dia
     * @param daysPerYear Dias de uso por ano (ex: 260 para comercial)
     * @param investment Custo estimado das novas luminárias (R$)
     */
    calculateESGImpact: (systemWatts: number, baselineWatts: number, kwhCost: number, dailyHours: number, daysPerYear: number, investment: number = 0) => {
        // Validações básicas
        if (systemWatts <= 0 || baselineWatts <= 0) return { savingsMoney: 0, treesPlanted: 0, paybackMonths: 0, isProfitable: false, message: "Parâmetros de potência inválidos." };

        const savingsWatts = baselineWatts - systemWatts;
        
        // Se o novo projeto consome mais, não há economia
        if (savingsWatts <= 0) {
            return { savingsMoney: 0, treesPlanted: 0, paybackMonths: 0, isProfitable: false, message: "O projeto atual consome mais energia que o sistema base (Baseline)." };
        }

        const annualHours = dailyHours * daysPerYear;
        const savingsKWh = (savingsWatts * annualHours) / 1000;
        const savingsMoney = savingsKWh * kwhCost;

        // Fator de emissão médio: 0.1 kg CO2 por kWh (matriz limpa) a 0.4 kg CO2 (matriz fóssil).
        // Usaremos 0.25 kg CO2/kWh como média global aceitável para cálculo de impacto básico.
        const carbonAvoidedKg = savingsKWh * 0.25; 
        
        // 1 árvore adulta absorve em média 20kg de CO2 por ano.
        const treesPlanted = carbonAvoidedKg / 20;

        let paybackMonths = 0;
        if (investment > 0 && savingsMoney > 0) {
            paybackMonths = (investment / savingsMoney) * 12;
        }

        const isProfitable = true;
        let message = `Impacto Positivo: Economia de ${savingsKWh.toFixed(0)} kWh/ano. O equivalente ambiental a plantar ${treesPlanted.toFixed(0)} árvores anualmente.`;

        if (paybackMonths > 0) {
            message += ` O investimento se pagará em aproximadamente ${paybackMonths.toFixed(1)} meses.`;
        }

        return { savingsMoney, treesPlanted, paybackMonths, isProfitable, message };
    }
};