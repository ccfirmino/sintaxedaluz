// src/domain/photometry/FalseColorEngine.ts

export interface ColorStop {
    lux: number;
    r: number;
    g: number;
    b: number;
}

export class FalseColorEngine {
    public static readonly colorScale: ColorStop[] =[
        {lux: 0, r: 0, g: 0, b: 0},          // Preto
        {lux: 50, r: 0, g: 0, b: 128},       // Azul Escuro
        {lux: 100, r: 0, g: 0, b: 255},      // Azul
        {lux: 200, r: 0, g: 255, b: 255},    // Ciano
        {lux: 300, r: 0, g: 255, b: 0},      // Verde
        {lux: 400, r: 173, g: 255, b: 47},   // Verde-Limão
        {lux: 500, r: 255, g: 255, b: 0},    // Amarelo
        {lux: 750, r: 255, g: 165, b: 0},    // Laranja
        {lux: 900, r: 255, g: 0, b: 0},      // Vermelho
        {lux: 1000, r: 255, g: 255, b: 255}  // Branco (Teto 1000+)
    ];

    public static getLuxColor(lux: number, alpha: number = 1.0): string {
        const s = this.colorScale;
        if (lux <= s[0].lux) return `rgba(${s[0].r},${s[0].g},${s[0].b},${alpha})`;
        if (lux >= s[s.length - 1].lux) return `rgba(${s[s.length - 1].r},${s[s.length - 1].g},${s[s.length - 1].b},${alpha})`;
        
        for (let i = 0; i < s.length - 1; i++) {
            if (lux >= s[i].lux && lux <= s[i + 1].lux) {
                const t = (lux - s[i].lux) / (s[i + 1].lux - s[i].lux);
                const r = Math.round(s[i].r + t * (s[i + 1].r - s[i].r));
                const g = Math.round(s[i].g + t * (s[i + 1].g - s[i].g));
                const b = Math.round(s[i].b + t * (s[i + 1].b - s[i].b));
                return `rgba(${r},${g},${b},${alpha})`;
            }
        }
        return `rgba(0,0,0,${alpha})`;
    }
}