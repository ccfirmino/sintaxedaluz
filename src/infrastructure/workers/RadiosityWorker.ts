// src/infrastructure/workers/RadiosityWorker.ts
import { RadiosityEngine } from '../../domain/photometry/RadiosityEngine';

/**
 * LUXSINTAX WEB WORKER
 * Processa a malha fotométrica em uma thread paralela para evitar bloqueio da UI.
 */
self.onmessage = (e: MessageEvent) => {
    try {
        const params = e.data;
        // Delega o processamento pesado para o motor estático de domínio
        const result = RadiosityEngine.calculateGridMatrix(params);
        self.postMessage(result);
    } catch (error: any) {
        console.error('[LuxSintax Worker Error] Falha no cálculo:', error);
        self.postMessage({ error: error.message || 'Erro matemático no Worker' });
    }
};