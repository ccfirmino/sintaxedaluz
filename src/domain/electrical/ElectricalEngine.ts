// src/domain/electrical/ElectricalEngine.ts

export const ElectricalEngine = {
    /**
     * Avalia o sistema elétrico completo: Queda de Tensão no cabo e Topologia da Fita LED
     */
    evaluateSystem: (wireDistance: number, wireGauge: number, powerPerMeter: number, stripLength: number, voltage: number) => {
        if (wireGauge <= 0 || voltage <= 0 || stripLength <= 0) {
            return { dropV: 0, dropPercentage: 0, isWarning: false, isCritical: false, message: "Invalid parameters.", topologyTitle: "--", topologyDesc: "--", topologyIcon: "fa-ban", isTopologyCritical: false, maxContinuousRun: 5 };
        }

        const totalPower = powerPerMeter * stripLength;
        const rho = 0.0172; // Resistividade do cobre
        const current = totalPower / voltage; 
        
        // Fator 2 (cabo de ida e volta)
        const dropV = (2 * wireDistance * current * rho) / wireGauge;
        const dropPercentage = (dropV / voltage) * 100;
        
        let isWarning = false;
        let isCritical = false;
        let message = "Optimized Operation. Voltage drop within ideal limits (< 3%).";

        if (dropPercentage > 5) {
            isCritical = true;
            message = `Severe Risk (Cable): A ${dropPercentage.toFixed(1)}% drop will cause drastic light loss. Thicken the wire gauge or move the supply closer.`;
        } else if (dropPercentage > 3) {
            isWarning = true;
            message = `Performance Alert (Cable): ${dropPercentage.toFixed(1)}% drop. Minor brightness variation may occur at the start of the circuit.`;
        }

        // ==========================================
        // AVALIAÇÃO DE TOPOLOGIA FÍSICA DA FITA LED
        // ==========================================
        const maxContinuousRun = voltage === 12 ? 5 : 10;
        
        let topologyTitle = "SINGLE-ENDED FEED";
        let topologyDesc = `Safe Standard: Connect the power supply to one end only. The ${voltage}V track supports up to ${maxContinuousRun}m without visible attenuation.`;
        let topologyIcon = "fa-arrow-right";
        let isTopologyCritical = false;

        if (stripLength > maxContinuousRun * 1.5) {
            topologyTitle = "CIRCUIT DIVISION (PARALLEL)";
            topologyDesc = `OVERHEATING RISK: ${voltage}V strips cannot exceed ${maxContinuousRun}m continuously. You MUST divide the strip into ${Math.ceil(stripLength / maxContinuousRun)} sections wired in parallel.`;
            topologyIcon = "fa-project-diagram";
            isTopologyCritical = true;
        } else if (stripLength > maxContinuousRun) {
            topologyTitle = "DOUBLE-ENDED FEED";
            topologyDesc = `WARNING: Length exceeds the ideal continuous limit (${maxContinuousRun}m). It is highly recommended to feed power to BOTH ends to equalize voltage.`;
            topologyIcon = "fa-arrows-alt-h";
            isTopologyCritical = true;
        }

        return { dropV, dropPercentage, isWarning, isCritical, message, topologyTitle, topologyDesc, topologyIcon, isTopologyCritical, maxContinuousRun };
    },

    /**
     * Calcula a quantidade de drivers e retorna o status de Inteligência Física
     */
    calculateDriverQuantity: (recommendedPower: number, driverCapacity: number, isTopologyCritical: boolean, requiredSplits: number) => {
        if (driverCapacity <= 0) return { units: 0, alertType: "none" };
        
        let units = Math.ceil(recommendedPower / driverCapacity);
        let alertType = "none";

        if (units === 1 && isTopologyCritical && requiredSplits > 1) {
            alertType = "physical_limit";
        } else if (units > 1) {
            alertType = "load_division";
        }

        return { units, alertType };
    }
};