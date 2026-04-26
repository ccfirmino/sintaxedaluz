// src/domain/health/SpdDatabase.ts

export interface SpectralProfile {
    id: string;
    label: string;
    cct: number;
    description: string;
    spd: Array<{nm: number, val: number}>;
}

export const SpdDatabase: SpectralProfile[] = [
    {
        id: "d65_daylight",
        label: "Luz Natural (D65 CIE)",
        cct: 6500,
        description: "Padrão de luz do dia. Elevado estímulo melanópico, referencial biológico perfeito.",
        spd: [
            {nm:380, val:0.5}, {nm:400, val:0.83}, {nm:420, val:0.93}, {nm:440, val:1.05}, {nm:460, val:1.18}, 
            {nm:480, val:1.15}, {nm:500, val:1.09}, {nm:520, val:1.05}, {nm:540, val:1.04}, {nm:560, val:1.00}, 
            {nm:580, val:0.96}, {nm:600, val:0.90}, {nm:620, val:0.88}, {nm:640, val:0.84}, {nm:660, val:0.80}, 
            {nm:680, val:0.72}, {nm:700, val:0.72}, {nm:720, val:0.62}, {nm:740, val:0.69}, {nm:760, val:0.46}, {nm:780, val:0.63}
        ]
    },
    {
        id: "led_3000k_std",
        label: "LED Comercial 3000K (CRI 80)",
        cct: 3000,
        description: "Baixa emissão no espectro ciano (480nm). Fraco para alerta, bom para relaxamento noturno.",
        spd: [
            {nm:380, val:0.01}, {nm:400, val:0.02}, {nm:420, val:0.05}, {nm:440, val:0.35}, {nm:460, val:0.30}, 
            {nm:480, val:0.12}, {nm:500, val:0.25}, {nm:520, val:0.45}, {nm:540, val:0.65}, {nm:560, val:0.85}, 
            {nm:580, val:0.95}, {nm:600, val:1.00}, {nm:620, val:0.90}, {nm:640, val:0.65}, {nm:660, val:0.40}, 
            {nm:680, val:0.20}, {nm:700, val:0.10}, {nm:720, val:0.05}, {nm:740, val:0.02}, {nm:760, val:0.01}, {nm:780, val:0.01}
        ]
    },
    {
        id: "led_4000k_cyan",
        label: "LED Cyan-Enhanced 4000K",
        cct: 4000,
        description: "Engenharia de espectro com pico extra em 480nm. Alto m-EDI mantendo temperatura neutra.",
        spd: [
            {nm:380, val:0.01}, {nm:400, val:0.02}, {nm:420, val:0.10}, {nm:440, val:0.60}, {nm:460, val:0.50}, 
            {nm:480, val:0.75}, {nm:500, val:0.55}, {nm:520, val:0.65}, {nm:540, val:0.85}, {nm:560, val:0.95}, 
            {nm:580, val:1.00}, {nm:600, val:0.90}, {nm:620, val:0.70}, {nm:640, val:0.50}, {nm:660, val:0.30}, 
            {nm:680, val:0.15}, {nm:700, val:0.05}, {nm:720, val:0.02}, {nm:740, val:0.01}, {nm:760, val:0.01}, {nm:780, val:0.01}
        ]
    }
];