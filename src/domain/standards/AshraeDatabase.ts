// src/domain/standards/AshraeDatabase.ts

export interface LpdBaseline {
    typeKey: string; // Trocado de 'type' para 'typeKey' para indicar que é uma chave de tradução
    base: number;
}

export const lpdBaselines: LpdBaseline[] =[
    { typeKey: "ashrae.baselines.warehouseMedium", base: 6.2 },
    { typeKey: "ashrae.baselines.restrooms", base: 10.5 },
    { typeKey: "ashrae.baselines.libraryStacks", base: 18.4 },
    { typeKey: "ashrae.baselines.libraryReading", base: 10.0 },
    { typeKey: "ashrae.baselines.corridor", base: 7.1 },
    { typeKey: "ashrae.baselines.kitchen", base: 10.7 },
    { typeKey: "ashrae.baselines.stairway", base: 7.4 },
    { typeKey: "ashrae.baselines.officeOpen", base: 10.5 },
    { typeKey: "ashrae.baselines.officeEnclosed", base: 11.9 },
    { typeKey: "ashrae.baselines.garage", base: 2.0 },
    { typeKey: "ashrae.baselines.hospExam", base: 17.9 },
    { typeKey: "ashrae.baselines.hospRoom", base: 6.7 },
    { typeKey: "ashrae.baselines.hospSurg", base: 20.3 },
    { typeKey: "ashrae.baselines.indManuf", base: 13.9 },
    { typeKey: "ashrae.baselines.lab", base: 13.8 },
    { typeKey: "ashrae.baselines.lobby", base: 9.7 },
    { typeKey: "ashrae.baselines.dining", base: 7.0 },
    { typeKey: "ashrae.baselines.classRoom", base: 13.3 },
    { typeKey: "ashrae.baselines.confRoom", base: 13.2 },
    { typeKey: "ashrae.baselines.retailSales", base: 18.1 },
    { typeKey: "ashrae.baselines.retailCirc", base: 11.8 },
    { typeKey: "ashrae.baselines.techRoom", base: 10.2 },
    { typeKey: "ashrae.baselines.storageAct", base: 6.8 },
    { typeKey: "ashrae.baselines.storageInact", base: 4.6 },
    { typeKey: "ashrae.baselines.lockerRoom", base: 8.1 },
    { typeKey: "ashrae.baselines.lounge", base: 7.8 },
    { typeKey: "ashrae.baselines.workshop", base: 17.1 },
    { typeKey: "ashrae.baselines.atrium", base: 4.3 }
];

// --- DOMÍNIO DE EXTERIORES (ASHRAE 90.1) ---

// Zonas de Iluminação (Lighting Zones)
export type LightingZone = 'LZ0' | 'LZ1' | 'LZ2' | 'LZ3' | 'LZ4';

export interface ExteriorBaseAllowance {
    zone: LightingZone;
    baseWattage: number; // W (Potência Base do Terreno)
    descKey: string; // Trocado de 'description' para 'descKey'
}

export const exteriorBaseAllowances: ExteriorBaseAllowance[] = [
    { zone: 'LZ0', baseWattage: 0, descKey: 'ashrae.zones.lz0Desc' },
    { zone: 'LZ1', baseWattage: 400, descKey: 'ashrae.zones.lz1Desc' },
    { zone: 'LZ2', baseWattage: 600, descKey: 'ashrae.zones.lz2Desc' },
    { zone: 'LZ3', baseWattage: 750, descKey: 'ashrae.zones.lz3Desc' },
    { zone: 'LZ4', baseWattage: 1300, descKey: 'ashrae.zones.lz4Desc' }
];

export interface ExteriorLpdBaseline {
    typeKey: string; // Trocado de 'type' para 'typeKey'
    unit: 'W/m²' | 'W/m'; // Tipagem Estrita: Área vs Linear
    zoneAllowances: Record<LightingZone, number>;
    isTradable: boolean;
}

export const exteriorLpdBaselines: ExteriorLpdBaseline[] = [
    {
        typeKey: "ashrae.baselines.extParking",
        unit: "W/m²",
        zoneAllowances: { LZ0: 0, LZ1: 0.22, LZ2: 0.54, LZ3: 0.81, LZ4: 1.08 },
        isTradable: true
    },
    {
        typeKey: "ashrae.baselines.extWalkway",
        unit: "W/m",
        zoneAllowances: { LZ0: 0, LZ1: 2.3, LZ2: 2.3, LZ3: 2.6, LZ4: 2.6 },
        isTradable: true
    },
    {
        typeKey: "ashrae.baselines.extEntrance",
        unit: "W/m",
        zoneAllowances: { LZ0: 0, LZ1: 66, LZ2: 66, LZ3: 98, LZ4: 98 },
        isTradable: true
    },
    {
        typeKey: "ashrae.baselines.extFacade",
        unit: "W/m²",
        zoneAllowances: { LZ0: 0, LZ1: 0, LZ2: 1.1, LZ3: 1.6, LZ4: 2.2 },
        isTradable: false // Regra estrita de Não-Compensação de carga
    },
    {
        typeKey: "ashrae.baselines.extCanopy",
        unit: "W/m²",
        zoneAllowances: { LZ0: 0, LZ1: 6.8, LZ2: 6.8, LZ3: 10.8, LZ4: 10.8 },
        isTradable: true
    }
];