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
    }
};