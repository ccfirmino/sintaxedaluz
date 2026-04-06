// src/domain/photometry/RadiosityEngine.ts
import { Photometrics, IesData } from './Photometrics';

export interface FixturePosition {
    x: number;
    y: number;
}

export interface RadiosityParams {
    roomW: number;
    roomL: number;
    height: number;
    plane: number;
    fixtures: FixturePosition[];
    calcMode: string;
    iesData?: IesData | null;
    flux: number;
    beam: number;
    maintFactor: number;
    utilFactor: number;
    reflectance?: number;
    viewLevel?: string;
    cellSizeM?: number;
}

export interface RadiosityMetrics {
    minLux: number;
    avgLux: number;
    sumLux: number;
}

export interface RadiosityResult {
    luxMatrix: number[][];
    metricsLP: RadiosityMetrics;
    metricsHP: RadiosityMetrics;
    cellCols: number;
    cellRows: number;
    cellCount: number;
}

export class RadiosityEngine {
    /**
     * Executa o cálculo de radiosidade em uma Thread de Background (Web Worker).
     * Padrão Enterprise para evitar travamento (freeze) da Interface de Utilizador.
     */
    public static calculateGridMatrixAsync(params: RadiosityParams): Promise<RadiosityResult> {
        return new Promise((resolve, reject) => {
            // O Vite resolve nativamente as URLs dos Workers
            const worker = new Worker(new URL('../../infrastructure/workers/RadiosityWorker.ts', import.meta.url), { type: 'module' });
            
            worker.onmessage = (e) => {
                if (e.data.error) {
                    reject(new Error(e.data.error));
                } else {
                    resolve(e.data);
                }
                worker.terminate(); // Liberta a memória (Garbage Collection)
            };
            
            worker.onerror = (error) => {
                reject(error);
                worker.terminate();
            };
            
            worker.postMessage(params);
        });
    }

    /**
     * Calcula a matriz topográfica de iluminância (Lux) usando a Lei do Cosseno Cúbico
     * e Multi-Sampling Vetorial para evitar picos matemáticos irreais.
     */
    public static calculateGridMatrix(params: RadiosityParams): RadiosityResult {
        const cellSizeM = params.cellSizeM || 0.5;
        const cellCols = Math.ceil(params.roomW / cellSizeM);
        const cellRows = Math.ceil(params.roomL / cellSizeM);
        const cellMW = params.roomW / cellCols;
        const cellMH = params.roomL / cellRows;

        let maxI = 0;
        let n_power = 1;
        let actualFixtureFlux = params.flux;

        if (params.calcMode === 'ies' && params.iesData) {
            const metrics = Photometrics.extractZonalMetrics(params.iesData);
            actualFixtureFlux = metrics.calculatedFlux;
            maxI = metrics.maxCandela;

            const eBeam = Photometrics.getEffectiveBeam(params.iesData, params.beam).c0 || 120;
            const halfBeamRad = (eBeam / 2) * Math.PI / 180;
            if (halfBeamRad > 0 && halfBeamRad < Math.PI / 2) {
                n_power = Math.log(0.5) / Math.log(Math.cos(halfBeamRad));
            }
        } else {
            const halfBeamRad = (params.beam / 2) * Math.PI / 180;
            if (halfBeamRad > 0 && halfBeamRad < Math.PI / 2) {
                n_power = Math.log(0.5) / Math.log(Math.cos(halfBeamRad));
            }
            maxI = (actualFixtureFlux * (n_power + 1)) / (2 * Math.PI);
        }

        // LUXSINTAX: Simulação de Iluminação Global (GI) Otimizada
        // Calcula a componente indireta baseada na Refletância (Cor das Paredes).
        const totalRoomFlux = actualFixtureFlux * params.fixtures.length;
        const roomArea = params.roomW * params.roomL;
        const baseRoomE = totalRoomFlux / roomArea;
        const indirectLuxEstimate = baseRoomE * (params.reflectance !== undefined ? params.reflectance : 0.08);
        
        let minLux_LP = Infinity; let sumLux_LP = 0;
        let minLux_HP = Infinity; let sumLux_HP = 0;
        let cellCount = 0;

        const hEff_LP = params.height;
        const hEff_HP = params.height - (params.plane || 0.75);

        const luxMatrix: number[][] = [];
        const offsets = [-0.125, 0.125];
        const currentLevel = params.viewLevel || 'HP';

        for (let i = 0; i < cellCols; i++) {
            luxMatrix[i] =[];
            for (let j = 0; j < cellRows; j++) {
                const ptX = (i + 0.5) * cellMW;
                const ptY = (j + 0.5) * cellMH;

                let directLux_LP = 0;
                let directLux_HP = 0;

                for (let ox of offsets) {
                    for (let oy of offsets) {
                        const subX = ptX + ox;
                        const subY = ptY + oy;

                        for (const fix of params.fixtures) {
                            const dx = subX - fix.x;
                            const dy = subY - fix.y;

                            // LUXSINTAX: Delegação para o Domínio Físico Unificado (Photometrics)
                            if (params.calcMode === 'ies' && params.iesData) {
                                // Piso (LP)
                                const resLP = Photometrics.calculatePointIlluminance(params.iesData, dx, dy, hEff_LP, 0);
                                directLux_LP += (resLP.lux / 4);

                                // Plano de Trabalho (HP)
                                if (hEff_HP > 0) {
                                    const resHP = Photometrics.calculatePointIlluminance(params.iesData, dx, dy, hEff_HP, 0);
                                    directLux_HP += (resHP.lux / 4);
                                }
                            } else {
                                // Modo Paramétrico Direto (Fallback Otimizado)
                                const distPlane = Math.sqrt(dx * dx + dy * dy);
                                
                                // Piso (LP)
                                const angleRad_LP = Math.atan2(distPlane, hEff_LP);
                                if (angleRad_LP < Math.PI / 2) {
                                    const I_LP = maxI * Math.pow(Math.cos(angleRad_LP), n_power);
                                    directLux_LP += ((I_LP * Math.pow(Math.cos(angleRad_LP), 3)) / (hEff_LP * hEff_LP)) / 4;
                                }

                                // Plano de Trabalho (HP)
                                if (hEff_HP > 0) {
                                    const angleRad_HP = Math.atan2(distPlane, hEff_HP);
                                    if (angleRad_HP < Math.PI / 2) {
                                        const I_HP = maxI * Math.pow(Math.cos(angleRad_HP), n_power);
                                        directLux_HP += ((I_HP * Math.pow(Math.cos(angleRad_HP), 3)) / (hEff_HP * hEff_HP)) / 4;
                                    }
                                }
                            }
                        }
                    }
                }

                // Soma a Luz Direta com a Componente Indireta (Rebatimento das Paredes) e aplica o FM
                const totalLux_LP = Math.round((directLux_LP + indirectLuxEstimate) * params.maintFactor);
                const totalLux_HP = hEff_HP > 0 ? Math.round((directLux_HP + indirectLuxEstimate) * params.maintFactor) : 0;

                if (totalLux_LP < minLux_LP) minLux_LP = totalLux_LP;
                sumLux_LP += totalLux_LP;

                if (totalLux_HP < minLux_HP) minLux_HP = totalLux_HP;
                sumLux_HP += totalLux_HP;

                cellCount++;

                luxMatrix[i][j] = currentLevel === 'LP' ? totalLux_LP : totalLux_HP;
            }
        }

        return {
            luxMatrix,
            metricsLP: { minLux: minLux_LP, avgLux: cellCount > 0 ? Math.round(sumLux_LP / cellCount) : 0, sumLux: sumLux_LP },
            metricsHP: { minLux: minLux_HP, avgLux: cellCount > 0 ? Math.round(sumLux_HP / cellCount) : 0, sumLux: sumLux_HP },
            cellCols,
            cellRows,
            cellCount
        };
    }
}