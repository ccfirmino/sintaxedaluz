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

        const avgLumen = (actualFixtureFlux * params.fixtures.length * params.utilFactor * params.maintFactor) / (params.roomW * params.roomL);
        const ambientLux = avgLumen * 0.08;

        let minLux_LP = Infinity; let sumLux_LP = 0;
        let minLux_HP = Infinity; let sumLux_HP = 0;
        let cellCount = 0;

        const hEff_LP = params.height;
        const hEff_HP = params.height - (params.plane || 0.75);

        const luxMatrix: number[][] = [];
        const offsets =[-0.125, 0.125];
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
                            const distPlane = Math.sqrt(dx * dx + dy * dy);
                            const azimuthDeg = (Math.atan2(dy, dx) * 180 / Math.PI) + 90;

                            // Nível do Piso (LP)
                            const angleRad_LP = Math.atan2(distPlane, hEff_LP);
                            let I_LP = 0;
                            if (params.calcMode === 'ies' && params.iesData) {
                                I_LP = Photometrics.getIESIntensity(params.iesData, angleRad_LP * 180 / Math.PI, azimuthDeg);
                            } else if (angleRad_LP < Math.PI / 2) {
                                I_LP = maxI * Math.pow(Math.cos(angleRad_LP), n_power);
                            }
                            if (I_LP > 0) directLux_LP += ((I_LP * Math.pow(Math.cos(angleRad_LP), 3)) / (hEff_LP * hEff_LP)) / 4;

                            // Plano de Trabalho (HP)
                            if (hEff_HP > 0) {
                                const angleRad_HP = Math.atan2(distPlane, hEff_HP);
                                let I_HP = 0;
                                if (params.calcMode === 'ies' && params.iesData) {
                                    I_HP = Photometrics.getIESIntensity(params.iesData, angleRad_HP * 180 / Math.PI, azimuthDeg);
                                } else if (angleRad_HP < Math.PI / 2) {
                                    I_HP = maxI * Math.pow(Math.cos(angleRad_HP), n_power);
                                }
                                if (I_HP > 0) directLux_HP += ((I_HP * Math.pow(Math.cos(angleRad_HP), 3)) / (hEff_HP * hEff_HP)) / 4;
                            }
                        }
                    }
                }

                const totalLux_LP = Math.round(directLux_LP * params.maintFactor + ambientLux);
                const totalLux_HP = hEff_HP > 0 ? Math.round(directLux_HP * params.maintFactor + ambientLux) : 0;

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