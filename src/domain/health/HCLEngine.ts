// src/domain/health/HCLEngine.ts

export const HCLEngine = {
    /**
     * Avalia o impacto biológico da luz com base no ciclo circadiano e na neurociência.
     * @param visualLux Nível de iluminância visual no plano do olho (Lux)
     * @param mRatio Razão Melanópica (M/P) da fonte de luz
     * @param useType Tipo de ambiente (office, hospital, residential)
     * @param timeOfDay Horário de exposição (morning, afternoon, night)
     */
    evaluateCircadianImpact: (visualLux: number, mRatio: number, useType: string, timeOfDay: string) => {
        // Cálculo da métrica oficial m-EDI (Melanopic Equivalent Daylight Illuminance)
        const medi = visualLux * mRatio;
        
        let isOptimal = false;
        let isWarning = false;
        let isCritical = false;
        let message = "";

        if (timeOfDay === 'night') {
            if (mRatio >= 0.68 || medi > 100) { 
                // Ex: 4000K ou superior à noite, ou excesso absoluto de luz
                isCritical = true;
                message = `Risco Biológico Severo: O uso de espectros frios (M/P: ${mRatio.toFixed(2)}) ou alta intensidade à noite causa supressão drástica de melatonina, induzindo insônia e disrupção do ciclo circadiano. Mude para 2700K ou reduza os Lux.`;
            } else if (medi > 50) {
                isWarning = true;
                message = `Alerta de Sono: m-EDI de ${Math.round(medi)} à noite ultrapassa o limite saudável (máx. 50). Reduza a intensidade para preparar o corpo para o repouso.`;
            } else {
                isOptimal = true;
                message = `Conforto Noturno Ideal: m-EDI baixo (${Math.round(medi)}) respeita a fisiologia e não interfere no ciclo do sono.`;
            }
        } else {
            // Período Diurno (Manhã/Tarde)
            if (useType === 'office' || useType === 'hospital') {
                if (medi >= 250) {
                    isOptimal = true;
                    message = `Alta Performance: m-EDI de ${Math.round(medi)} atende à certificação WELL v2 (≥ 250). O ambiente estimula ativamente o estado de alerta, foco e produtividade.`;
                } else {
                    isWarning = true;
                    message = `Ambiente "Adormecido": m-EDI de ${Math.round(medi)} é insuficiente para estimular o cérebro durante o dia (meta WELL: ≥ 250). Aumente a iluminância vertical ou utilize LEDs mais frios (4000K/5000K).`;
                }
            } else {
                isOptimal = true;
                message = `Estímulo Diurno Adequado: Nível de ${Math.round(medi)} m-EDI atende confortavelmente a uma rotina residencial.`;
            }
        }

        return { medi, isOptimal, isWarning, isCritical, message };
    }
};