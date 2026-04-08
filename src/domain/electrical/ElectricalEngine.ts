// src/domain/electrical/ElectricalEngine.ts

export const ElectricalEngine = {
    /**
     * Avalia o sistema elétrico completo: Queda de Tensão no cabo e Topologia da Fita LED
     */
    evaluateSystem: (wireDistance: number, wireGauge: number, powerPerMeter: number, stripLength: number, voltage: number) => {
        if (wireGauge <= 0 || voltage <= 0 || stripLength <= 0) {
            return { dropV: 0, dropPercentage: 0, isWarning: false, isCritical: false, message: "Parâmetros inválidos.", topologyTitle: "--", topologyDesc: "--", topologyIcon: "fa-ban", isTopologyCritical: false };
        }

        const totalPower = powerPerMeter * stripLength;
        const rho = 0.0172; // Resistividade do cobre
        const current = totalPower / voltage; 
        
        // Fator 2 (cabo de ida e volta)
        const dropV = (2 * wireDistance * current * rho) / wireGauge;
        const dropPercentage = (dropV / voltage) * 100;
        
        let isWarning = false;
        let isCritical = false;
        let message = "Operação Otimizada. Queda de tensão no cabo dentro dos limites ideais (< 3%).";

        if (dropPercentage > 5) {
            isCritical = true;
            message = `Risco Severo (Cabo): A queda de ${dropPercentage.toFixed(1)}% causará perda drástica de fluxo luminoso. Engrosse a bitola do cabo ou aproxime a fonte da fita.`;
        } else if (dropPercentage > 3) {
            isWarning = true;
            message = `Alerta de Performance (Cabo): Queda de ${dropPercentage.toFixed(1)}%. Pode haver leve variação de brilho no início do circuito.`;
        }

        // ==========================================
        // AVALIAÇÃO DE TOPOLOGIA FÍSICA DA FITA LED
        // ==========================================
        const maxContinuousRun = voltage === 12 ? 5 : 10;
        
        let topologyTitle = "Alimentação Unilateral";
        let topologyDesc = `Padrão Seguro: Conecte a fonte em apenas uma extremidade. A trilha da fita de ${voltage}V suporta até ${maxContinuousRun}m sem atenuação visível.`;
        let topologyIcon = "fa-arrow-right";
        let isTopologyCritical = false;

        if (stripLength > maxContinuousRun * 1.5) {
            topologyTitle = "Divisão de Circuito (Paralelo)";
            topologyDesc = `RISCO DE QUEIMA: Fitas de ${voltage}V não suportam mais que ${maxContinuousRun}m contínuos. Divida obrigatoriamente a fita em ${Math.ceil(stripLength / maxContinuousRun)} trechos ligados em paralelo à mesma fonte principal.`;
            topologyIcon = "fa-project-diagram";
            isTopologyCritical = true;
        } else if (stripLength > maxContinuousRun) {
            topologyTitle = "Alimentação Bilateral";
            topologyDesc = `ATENÇÃO: A metragem excede o limite ideal contínuo (${maxContinuousRun}m). É altamente recomendado levar o cabo da fonte para AS DUAS pontas da fita para equalizar a tensão e evitar perda de luz no meio.`;
            topologyIcon = "fa-arrows-alt-h";
            isTopologyCritical = true;
        }

        return { dropV, dropPercentage, isWarning, isCritical, message, topologyTitle, topologyDesc, topologyIcon, isTopologyCritical };
    }
};