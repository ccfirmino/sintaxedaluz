// src/domain/health/HCLEngine.ts

export const HCLEngine = {
    /**
     * Fator de Transmitância do Cristalino (Correção por Idade)
     * O cristalino humano atua como um filtro amarelo que se intensifica com a idade,
     * bloqueando especificamente os comprimentos de onda curtos (azul/ciano - 480nm).
     */
    calculateLensTransmission: (age: number) => {
        if (age <= 20) return 1.0;
        // Queda aproximada de 1.2% ao ano após os 20 anos na região melanópica.
        return Math.max(0.3, 1.0 - (age - 20) * 0.012);
    },

    /**
     * Modelo LRC (Lighting Research Center) - Estímulo Circadiano
     * Curva não-linear de saturação biológica humana.
     */
    calculateCircadianStimulus: (medi: number) => {
        // Aproximação do CS baseada no m-EDI. 
        // A biologia humana satura a supressão de melatonina em um CS de 0.7.
        let cs = 0.7 * (1 - Math.pow(1 + Math.pow(medi / 300, 1.2), -1));
        return Math.min(Math.max(cs, 0), 0.7);
    },

    /**
     * Avalia o impacto biológico da luz com base no ciclo circadiano e na neurociência.
     * @param visualLux Nível de iluminância visual no plano do olho (Lux)
     * @param mRatio Razão Melanópica (M/P) da fonte de luz
     * @param useType Tipo de ambiente (office, hospital, residential)
     * @param timeOfDay Horário de exposição (morning, afternoon, night)
     * @param age Idade do observador (para correção de transmitância da lente)
     */
    evaluateCircadianImpact: (visualLux: number, mRatio: number, useType: string, timeOfDay: string, age: number = 30) => {
        // 1. Correção Etária (A Lente Biológica)
        const lensFactor = HCLEngine.calculateLensTransmission(age);
        
        // 2. Cálculo da métrica oficial m-EDI corrigida pela idade
        const medi = visualLux * mRatio * lensFactor;

        // 3. Estímulo Circadiano (CS) derivado da dose
        const cs = HCLEngine.calculateCircadianStimulus(medi);
        
        let isOptimal = false;
        let isWarning = false;
        let isCritical = false;
        let message = "";

        if (timeOfDay === 'night') {
            if (mRatio >= 0.68 || medi > 100) { 
                isCritical = true;
                message = `Risco Biológico Severo: O uso de espectros frios (M/P: ${mRatio.toFixed(2)}) à noite causa supressão drástica de melatonina. (Lente biológica ajustada para ${age} anos: ${Math.round(lensFactor*100)}% de passagem visual).`;
            } else if (medi > 50) {
                isWarning = true;
                message = `Alerta de Sono: m-EDI biológico de ${Math.round(medi)} à noite ultrapassa o limite (máx. 50). Risco de atraso no pico do hormônio do sono.`;
            } else {
                isOptimal = true;
                message = `Conforto Noturno Ideal: Nível melanópico (${Math.round(medi)}) respeita a fisiologia. (Estímulo CS seguro: ${cs.toFixed(2)})`;
            }
        } else {
            // Período Diurno (Manhã/Tarde)
            if (useType === 'office' || useType === 'hospital') {
                if (medi >= 250 && cs >= 0.3) {
                    isOptimal = true;
                    message = `Alta Performance: m-EDI de ${Math.round(medi)} e CS de ${cs.toFixed(2)} atende à certificação WELL v2. O ambiente estimula ativamente o foco, compensando a barreira ocular de ${age} anos.`;
                } else {
                    isWarning = true;
                    message = `Ambiente "Adormecido": m-EDI de ${Math.round(medi)} (CS: ${cs.toFixed(2)}) é insuficiente para o estado de alerta de um usuário de ${age} anos (Meta: ≥ 250). Aumente a iluminância no plano visual.`;
                }
            } else {
                isOptimal = true;
                message = `Estímulo Diurno Adequado: Nível de ${Math.round(medi)} m-EDI atende a uma rotina residencial saudável para a faixa etária selecionada.`;
            }
        }

        return { medi, cs, lensFactor, isOptimal, isWarning, isCritical, message };
    },

    /**
     * LUXSINTAX: Crono-Simulação da Jornada Circadiana (Gêmeo Digital Biológico)
     * Simula a exposição do usuário à fonte de luz ao longo de 24h para traçar a curva de Estímulo Circadiano.
     * @param baseVisualLux Nível de iluminância padrão do projeto.
     * @param mRatio Espectro da luminária escolhida.
     * @param age Idade do usuário (Filtro do Cristalino).
     * @param shiftType Turno de trabalho ('diurnal' para escritório comercial, 'nocturnal' para plantões/hospitais).
     */
    simulateCircadianJourney: (baseVisualLux: number, mRatio: number, age: number, shiftType: string = 'diurnal') => {
        const journey = [];
        const lensFactor = HCLEngine.calculateLensTransmission(age);
        
        // Simulação hora a hora (0h às 23h)
        for (let hour = 0; hour < 24; hour++) {
            let activeLux = 0;
            let idealCS = 0;

            if (shiftType === 'diurnal') {
                // Cenário: Escritório Comercial Padrão (Trabalho das 08h às 18h)
                if (hour >= 8 && hour < 18) {
                    activeLux = baseVisualLux;
                    idealCS = 0.3; // Meta WELL v2: CS >= 0.3 durante o dia para promover o alerta
                } else if (hour >= 18 && hour < 22) {
                    activeLux = baseVisualLux * 0.15; // Estimativa de luz residual / residencial
                    idealCS = 0.1; // Meta de transição: CS deve cair para não inibir melatonina
                } else {
                    activeLux = 0; // Dormindo
                    idealCS = 0.0;
                }
            } else if (shiftType === 'nocturnal') {
                // Cenário: Enfermaria / Call Center (Plantão Noturno das 19h às 07h)
                if (hour >= 19 || hour < 7) {
                    activeLux = baseVisualLux;
                    idealCS = 0.3; // Exige supressão de melatonina para evitar erro humano por fadiga
                } else if (hour >= 8 && hour < 14) {
                    activeLux = 0; // Período de sono diurno obrigatório
                    idealCS = 0.0;
                } else {
                    activeLux = baseVisualLux * 0.2; // Transição
                    idealCS = 0.1;
                }
            }

            // A matemática física do impacto
            const medi = activeLux * mRatio * lensFactor;
            const actualCS = activeLux > 0 ? HCLEngine.calculateCircadianStimulus(medi) : 0;

            // Tolerância: O CS real pode ser maior que o ideal no período de alerta, 
            // mas não deve passar do limite (0.1) no período de sono/preparação.
            const isCompliant = actualCS >= idealCS && (idealCS > 0.1 || actualCS <= 0.1);

            journey.push({
                hour,
                activeLux,
                actualCS,
                idealCS,
                isCompliant
            });
        }
        return journey;
    }
};