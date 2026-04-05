// src/domain/photometry/Photometrics.ts

export interface IesData {
    hAngles: number[];
    vAngles: number[];
    candelas: number[][];
    multiplier: number;
    totalFlux?: number;
    wattage?: number;
}

export interface ZonalMetrics {
    uplightRatio: number;
    maxCandela: number;
    calculatedFlux: number;
}

export interface BeamMetrics {
    c0: number;
    c90: number;
    isOval: boolean;
}

export class Photometrics {
    /**
     * Extrai métricas zonais (Fluxo, Max Candela, Uplight) via integração por ângulo sólido.
     */
    public static extractZonalMetrics(data: IesData | null | undefined): ZonalMetrics {
        if (!data || !data.vAngles || !data.candelas) {
            return { uplightRatio: 0, maxCandela: 0, calculatedFlux: 0 };
        }

        let maxI = 0;
        const numV = data.vAngles.length;
        const numH = data.hAngles.length;
        const avgPolar = new Array(numV).fill(0);

        // 1. Encontra a Curva Polar Média (Simetrização para Integração)
        for (let v = 0; v < numV; v++) {
            let sumI = 0;
            for (let h = 0; h < numH; h++) {
                const intensity = data.candelas[h][v] * data.multiplier;
                if (intensity > maxI) maxI = intensity;
                sumI += intensity;
            }
            avgPolar[v] = sumI / numH;
        }

        // 2. Integração por Ângulo Sólido (Cálculo do Fluxo Final Absoluto)
        let absoluteFlux = 0;
        let upFlux = 0;

        for (let v = 1; v < numV; v++) {
            const v1 = data.vAngles[v - 1] * Math.PI / 180;
            const v2 = data.vAngles[v] * Math.PI / 180;
            
            const I1 = avgPolar[v - 1];
            const I2 = avgPolar[v];
            const I_avg = (I1 + I2) / 2;
            
            // Fórmula: Phi = 2 * PI * I_avg * (cos(v1) - cos(v2))
            const zonalFlux = 2 * Math.PI * I_avg * (Math.cos(v1) - Math.cos(v2));
            absoluteFlux += zonalFlux;

            if (data.vAngles[v] > 90) {
                upFlux += zonalFlux;
            }
        }

        const uplightRatio = absoluteFlux > 0 ? (upFlux / absoluteFlux) * 100 : 0;
        
        return { 
            uplightRatio, 
            maxCandela: maxI, 
            calculatedFlux: absoluteFlux 
        };
    }

    /**
     * Interpolação Bilinear Fotométrica para obter a intensidade exata em qualquer ângulo.
     */
    public static getIESIntensity(data: IesData | null | undefined, vAngleDeg: number, hAngleDeg: number = 0): number {
        if (!data) return 0;
        
        const { vAngles, hAngles, multiplier, candelas } = data;

        // Normaliza o Ângulo Azimutal (0 a 360)
        let h = hAngleDeg % 360;
        if (h < 0) h += 360;

        let hIdx1 = 0, hIdx2 = 0;
        for (let i = 0; i < hAngles.length - 1; i++) {
            if (h >= hAngles[i] && h <= hAngles[i + 1]) { 
                hIdx1 = i; 
                hIdx2 = i + 1; 
                break; 
            }
        }
        
        let vIdx1 = 0, vIdx2 = 0;
        if (vAngleDeg <= vAngles[0]) { 
            vIdx1 = 0; vIdx2 = 0; 
        } else if (vAngleDeg >= vAngles[vAngles.length - 1]) { 
            vIdx1 = vAngles.length - 1; vIdx2 = vAngles.length - 1; 
        } else {
            for (let i = 0; i < vAngles.length - 1; i++) {
                if (vAngleDeg >= vAngles[i] && vAngleDeg <= vAngles[i + 1]) { 
                    vIdx1 = i; 
                    vIdx2 = i + 1; 
                    break; 
                }
            }
        }

        const c11 = candelas[hIdx1][vIdx1];
        const c21 = candelas[hIdx2][vIdx1];
        const c12 = candelas[hIdx1][vIdx2];
        const c22 = candelas[hIdx2][vIdx2];

        const hWeight = (hAngles[hIdx1] === hAngles[hIdx2]) ? 0 : (h - hAngles[hIdx1]) / (hAngles[hIdx2] - hAngles[hIdx1]);
        const vWeight = (vAngles[vIdx1] === vAngles[vIdx2]) ? 0 : (vAngleDeg - vAngles[vIdx1]) / (vAngles[vIdx2] - vAngles[vIdx1]);

        const i1 = c11 * (1 - hWeight) + c21 * hWeight;
        const i2 = c12 * (1 - hWeight) + c22 * hWeight;
        const finalI = i1 * (1 - vWeight) + i2 * vWeight;
        
        return finalI * multiplier;
    }

    /**
     * Calcula o ângulo de facho efetivo (FWHM - Full Width at Half Maximum).
     */
    public static getEffectiveBeam(data: IesData | null | undefined, fallbackBeam: number): BeamMetrics {
        if (!data) {
            return { c0: fallbackBeam, c90: fallbackBeam, isOval: false };
        }

        const { vAngles, hAngles, candelas } = data;

        const calcHalfAngle = (row: number[]) => {
            const maxI = Math.max(...row);
            if (maxI <= 0) return fallbackBeam / 2; 
            
            const targetI = maxI / 2;
            let halfAngle = 0;
            
            for (let i = 0; i < vAngles.length - 1; i++) {
                if ((row[i] >= targetI && row[i + 1] <= targetI) || (row[i] <= targetI && row[i + 1] >= targetI)) {
                    if (row[i + 1] === row[i]) {
                        halfAngle = vAngles[i];
                    } else {
                        const t = (targetI - row[i]) / (row[i + 1] - row[i]);
                        halfAngle = vAngles[i] + t * (vAngles[i + 1] - vAngles[i]);
                    }
                    break;
                }
            }
            
            if (halfAngle === 0 && row[row.length - 1] > targetI) {
                halfAngle = vAngles[vAngles.length - 1];
            }
            
            if (isNaN(halfAngle) || halfAngle <= 0) return fallbackBeam / 2;
            return halfAngle;
        };

        const rowC0 = candelas[0];
        let c90Idx = 0, minDiff = 999;
        
        for (let i = 0; i < hAngles.length; i++) {
            if (Math.abs(hAngles[i] - 90) < minDiff) { 
                minDiff = Math.abs(hAngles[i] - 90); 
                c90Idx = i; 
            }
        }
        
        const rowC90 = candelas[c90Idx];

        const bC0 = calcHalfAngle(rowC0) * 2;
        const bC90 = calcHalfAngle(rowC90) * 2;

        return { 
            c0: bC0, 
            c90: bC90, 
            isOval: Math.abs(bC0 - bC90) > 2 
        };
    }

    /**
     * Calcula a iluminância em um ponto específico usando a Lei do Cosseno Cúbico.
     * Fórmula: E = (I * cos³θ) / h²
     * * @param data Dados fotométricos IES
     * @param x Distância horizontal X do ponto à fonte (m)
     * @param y Distância horizontal Y do ponto à fonte (m)
     * @param h Altura da fonte acima do plano de cálculo (m)
     * @param tilt Inclinação da luminária (graus)
     */
    public static calculatePointIlluminance(
        data: IesData | null | undefined, 
        x: number, 
        y: number, 
        h: number,
        tilt: number = 0
    ): { lux: number; angleV: number } {
        if (!data || h <= 0) return { lux: 0, angleV: 0 };

        // 1. Calcular a distância radial e o ângulo zenital (θ)
        const d = Math.sqrt(x * x + y * y);
        const angleVRad = Math.atan2(d, h);
        const angleVDeg = angleVRad * (180 / Math.PI);

        // 2. Compensação de inclinação (Tilt) - Simplificada para o eixo principal
        const effectiveAngleV = Math.abs(angleVDeg - tilt);

        // 3. Obter Intensidade Luminous (I) para o ângulo calculado
        // Nota: Para precisão total em 3D, x e y determinariam o ângulo H (azimutal)
        const angleHDeg = Math.atan2(y, x) * (180 / Math.PI);
        const intensity = this.getIESIntensity(data, effectiveAngleV, angleHDeg);

        // 4. Aplicação da Lei do Cosseno Cúbico
        // E = (I(θ) * cos³(θ)) / h²
        const cosTheta = Math.cos(angleVRad);
        const lux = (intensity * Math.pow(cosTheta, 3)) / (h * h);

        return { 
            lux: Math.max(0, lux), 
            angleV: angleVDeg 
        };
    }

    /**
     * Calcula a iluminância vertical (E_vert) para superfícies como quadros ou fachadas.
     * Fórmula: E_vert = (I * sinθ * cos²θ) / d²_horizontal
     */
    public static calculateVerticalIlluminance(
        data: IesData | null | undefined,
        distParede: number,
        deltaH: number, // Altura da fonte - Altura do ponto no quadro
        tilt: number = 0
    ): number {
        if (!data || distParede <= 0) return 0;

        const angleVRad = Math.atan2(distParede, deltaH);
        const angleVDeg = angleVRad * (180 / Math.PI);
        
        const intensity = this.getIESIntensity(data, Math.abs(angleVDeg - tilt), 0);

        // Fórmula de Iluminância Vertical: (I * sinθ * cos²θ) / h²
        // onde h é a altura relativa (deltaH)
        const sinTheta = Math.sin(angleVRad);
        const cosTheta = Math.cos(angleVRad);
        
        const lux = (intensity * sinTheta * Math.pow(cosTheta, 2)) / (deltaH * deltaH);

        return Math.max(0, lux);
    }
}