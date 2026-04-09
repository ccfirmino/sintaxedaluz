// src/domain/standards/AshraeDatabase.ts

export interface LpdBaseline {
    type: string;
    base: number;
}

export const lpdBaselines: LpdBaseline[] =[
    { type: "Armazém/Estoque (Bulky/Medium)", base: 6.2 },
    { type: "Banheiros (Restrooms)", base: 10.5 },
    { type: "Biblioteca (Acervo/Stacks)", base: 18.4 },
    { type: "Biblioteca (Área de Leitura)", base: 10.0 },
    { type: "Corredor/Transição", base: 7.1 },
    { type: "Cozinha/Preparo de Alimentos", base: 10.7 },
    { type: "Escadas (Stairway)", base: 7.4 },
    { type: "Escritório Aberto (Open Plan)", base: 10.5 },
    { type: "Escritório Fechado (Enclosed)", base: 11.9 },
    { type: "Estacionamento (Garage Area)", base: 2.0 },
    { type: "Hospital (Exame/Tratamento)", base: 17.9 },
    { type: "Hospital (Quarto de Paciente)", base: 6.7 },
    { type: "Hospital (Sala de Cirurgia)", base: 20.3 },
    { type: "Indústria (Manufatura Detalhada)", base: 13.9 },
    { type: "Laboratório", base: 13.8 },
    { type: "Lobby / Recepção", base: 9.7 },
    { type: "Refeitório (Dining Area)", base: 7.0 },
    { type: "Sala de Aula/Treinamento", base: 13.3 },
    { type: "Sala de Reunião/Conferência", base: 13.2 },
    { type: "Varejo (Área de Vendas)", base: 18.1 },
    { type: "Varejo (Circulação de Mall)", base: 11.8 },
    { type: "Área Técnica / Máquinas (Electrical/Mechanical)", base: 10.2 },
    { type: "Depósito Ativo (Active Storage)", base: 6.8 },
    { type: "Depósito Inativo (Inactive Storage)", base: 4.6 },
    { type: "Vestiário (Locker Room)", base: 8.1 },
    { type: "Copa / Descanso (Lounge/Breakroom)", base: 7.8 },
    { type: "Oficina / Manutenção (Workshop)", base: 17.1 },
    { type: "Átrio (Atrium - Altura padrão)", base: 4.3 }
];

// --- DOMÍNIO DE EXTERIORES (ASHRAE 90.1) ---

// Zonas de Iluminação (Lighting Zones)
export type LightingZone = 'LZ0' | 'LZ1' | 'LZ2' | 'LZ3' | 'LZ4';

export interface ExteriorBaseAllowance {
    zone: LightingZone;
    baseWattage: number; // W (Potência Base do Terreno)
    description: string;
}

export const exteriorBaseAllowances: ExteriorBaseAllowance[] = [
    { zone: 'LZ0', baseWattage: 0, description: 'Áreas Naturais / Parques Nacionais' },
    { zone: 'LZ1', baseWattage: 400, description: 'Áreas Rurais / Parques Desenvolvidos' },
    { zone: 'LZ2', baseWattage: 600, description: 'Áreas Residenciais / Comercial Leve' },
    { zone: 'LZ3', baseWattage: 750, description: 'Áreas Comerciais / Industriais Padrão' },
    { zone: 'LZ4', baseWattage: 1300, description: 'Centros Urbanos de Alta Atividade' }
];

export interface ExteriorLpdBaseline {
    type: string;
    unit: 'W/m²' | 'W/m'; // Tipagem Estrita: Área vs Linear
    zoneAllowances: Record<LightingZone, number>;
    isTradable: boolean;
}

export const exteriorLpdBaselines: ExteriorLpdBaseline[] = [
    {
        type: "Estacionamento Aberto (Asfalto/Piso)",
        unit: "W/m²",
        zoneAllowances: { LZ0: 0, LZ1: 0.22, LZ2: 0.54, LZ3: 0.81, LZ4: 1.08 },
        isTradable: true
    },
    {
        type: "Passarelas e Calçadas (< 3m largura)",
        unit: "W/m",
        zoneAllowances: { LZ0: 0, LZ1: 2.3, LZ2: 2.3, LZ3: 2.6, LZ4: 2.6 },
        isTradable: true
    },
    {
        type: "Entrada Principal (Largura da Porta)",
        unit: "W/m",
        zoneAllowances: { LZ0: 0, LZ1: 66, LZ2: 66, LZ3: 98, LZ4: 98 },
        isTradable: true
    },
    {
        type: "Fachada de Edifício (Área Iluminada)",
        unit: "W/m²",
        zoneAllowances: { LZ0: 0, LZ1: 0, LZ2: 1.1, LZ3: 1.6, LZ4: 2.2 },
        isTradable: false // Regra estrita de Não-Compensação de carga
    },
    {
        type: "Marquise / Drive-through (Canopy)",
        unit: "W/m²",
        zoneAllowances: { LZ0: 0, LZ1: 6.8, LZ2: 6.8, LZ3: 10.8, LZ4: 10.8 },
        isTradable: true
    }
];