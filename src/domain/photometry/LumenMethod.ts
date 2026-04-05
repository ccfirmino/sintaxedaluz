// src/domain/photometry/LumenMethod.ts

export interface GridParameters {
    roomW: number;
    roomL: number;
    flux: number;
    utilFactor: number;
    maintFactor: number;
    targetLux?: number;
    manualCols?: number;
    manualRows?: number;
    calcMethod: 'target' | 'manual';
}

export interface GridResult {
    cols: number;
    rows: number;
    targetLux: number;
}

export class LumenMethod {
    /**
     * Calcula a malha ideal de luminárias (Colunas x Linhas) ou a iluminância resultante.
     */
    public static calculateGrid(params: GridParameters): GridResult {
        const area = params.roomW * params.roomL;
        
        if (params.calcMethod === 'manual') {
            // Modo Manual: O usuário define a matriz, o sistema calcula os Lux resultantes
            const cols = Math.max(1, params.manualCols || 4);
            const rows = Math.max(1, params.manualRows || 3);
            
            const targetLux = Math.round(
                (cols * rows * params.flux * params.utilFactor * params.maintFactor) / area
            );
            
            return { cols, rows, targetLux };
        } else {
            // Modo Alvo: O sistema calcula a matriz para atingir os Lux desejados
            const targetLux = params.targetLux || 500;
            const targetN = (targetLux * area) / (params.flux * params.utilFactor * params.maintFactor);
            const N = Math.max(1, Math.ceil(targetN));
            
            const ratio = params.roomW / params.roomL;
            let calcCols = Math.round(Math.sqrt(N * ratio));
            let calcRows = Math.round(Math.sqrt(N / ratio));
            
            calcCols = Math.max(1, calcCols);
            calcRows = Math.max(1, calcRows);
            
            // Ajuste fino para garantir que a quantidade mínima seja atingida mantendo a proporção da sala
            while (calcCols * calcRows < N) {
                if ((calcCols / calcRows) < ratio) {
                    calcCols++;
                } else {
                    calcRows++;
                }
            }
            
            return { cols: calcCols, rows: calcRows, targetLux };
        }
    }
}