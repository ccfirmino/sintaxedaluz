// src/domain/electrical/ElectricalEngine.ts

export const ElectricalEngine = {
    /**
     * Calcula a queda de tensão em cabos de cobre (Corrente Contínua)
     * @param distance Comprimento do cabo entre driver e fita (m)
     * @param gauge Seção nominal do cabo (mm²)
     * @param totalPower Potência total da carga na fita (W)
     * @param voltage Tensão da fonte (12V ou 24V)
     * @returns Objeto com a queda em Volts, Porcentagem e mensagens didáticas de alerta.
     */
    calculateVoltageDrop: (distance: number, gauge: number, totalPower: number, voltage: number) => {
        // Proteção contra divisão por zero
        if (gauge <= 0 || voltage <= 0) return { dropV: 0, dropPercentage: 0, isWarning: false, isCritical: false, message: "Parâmetros inválidos." };

        const rho = 0.0172; // Resistividade do Cobre em ohm * mm²/m (temperatura ambiente)
        const current = totalPower / voltage; // I = P / V
        
        // O fator 2 representa o circuito de ida (positivo) e volta (negativo)
        const dropV = (2 * distance * current * rho) / gauge;
        const dropPercentage = (dropV / voltage) * 100;
        
        let isWarning = false;
        let isCritical = false;
        let message = "Operação Otimizada. Queda de tensão dentro dos limites ideais (< 3%).";

        if (dropPercentage > 5) {
            isCritical = true;
            message = `Risco Severo: A queda de ${dropPercentage.toFixed(1)}% causará perda drástica de fluxo luminoso e alterará o CCT (Temperatura de Cor) no final da fita. Aumente a bitola ou utilize alimentação bilateral.`;
        } else if (dropPercentage > 3) {
            isWarning = true;
            message = `Alerta de Performance: Queda de ${dropPercentage.toFixed(1)}%. Pode haver leve variação de brilho no fim do circuito. Recomenda-se centralizar o driver ou engrossar o cabo.`;
        }

        return { dropV, dropPercentage, isWarning, isCritical, message };
    }
};