// src/domain/health/HCLEngine.ts

export const HCLEngine = {
    /**
     * Avalia o impacto biológico da luz com base no ciclo circadiano.
     * @param visualLux Nível de iluminância visual no plano do olho (Lux)
     * @param mRatio Razão Melanópica (M/P) da fonte de luz
     * @param useType Tipo de ambiente (office, hospital, residential)
     * @param timeOfDay Horário de exposição (morning, afternoon, night)
     */
    evaluateCircadianImpact: (visualLux: number, mRatio: number, useType: string, timeOfDay: string) => {
        // Cálculo da métrica oficial m-EDI (Melanopic Lux)
        const medi = visualLux * mRatio;
        
        let isOptimal = false;
        let isWarning = false;
        let message = "";

        if (timeOfDay === 'night') {
            if (medi > 50) {
                isWarning = true;
                message = `Risco de Insônia: m-EDI de ${Math.round(medi)} à noite suprime a melatonina. A norma recomenda m-EDI < 50. Reduza a intensidade ou use espectros mais quentes (ex: 2700K).`;
            } else {
                isOptimal = true;
                message = `Conforto Noturno: m-EDI baixo (${Math.round(medi)}) prepara o corpo para o repouso e não interfere no ciclo do sono.`;
            }
        } else {
            // Período Diurno (Manhã/Tarde)
            if (useType === 'office' || useType === 'hospital') {
                if (medi >= 250) {
                    isOptimal = true;
                    message = `Alta Performance: m-EDI de ${Math.round(medi)} atende à certificação WELL v2 (≥ 250). Ideal para máximo estado de alerta e produtividade.`;
                } else {
                    isWarning = true;
                    message = `Baixo Estímulo: m-EDI de ${Math.round(medi)} é insuficiente para manter os usuários alertas (meta ≥ 250). Considere aumentar os Lux ou usar 4000K/5000K.`;
                }
            } else {
                isOptimal = true;
                message = `Luz de Qualidade: Nível de ${Math.round(medi)} m-EDI adequado para rotina diurna residencial.`;
            }
        }

        return { medi, isOptimal, isWarning, message };
    }
};