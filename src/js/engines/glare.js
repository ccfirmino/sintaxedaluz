window.GlareEngine = {
    calculateGuthIndex: (distX, distY, heightAboveEye) => {
        const d = Math.sqrt(distX ** 2 + distY ** 2);
        if (d === 0) return 1;
        const s = heightAboveEye / d;
        return Math.exp(s * (0.8 + 0.12 * s)); 
    },
    calculateUGR: (gridState, inputs) => {
        const { roomW, roomL, cols, rows, height, flux } = gridState;
        const eyeLevel = inputs.observerHeight;
        const hEff = height - eyeLevel;
        if(hEff <= 0) return 10;
        const obsX = roomW / 2; const obsY = roomL / 2;
        const spacingX = roomW / cols; const spacingY = roomL / rows;
        let sumPart = 0;
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const luxX = (i + 0.5) * spacingX; const luxY = (j + 0.5) * spacingY;
                const dx = luxX - obsX; const dy = luxY - obsY;
                const distSq = dx ** 2 + dy ** 2 + hEff ** 2;
                const luminance = (flux / Math.PI) / inputs.luminaireArea;
                const omega = inputs.luminaireArea / distSq;
                const p = window.GlareEngine.calculateGuthIndex(dx, dy, hEff);
                sumPart += (Math.pow(luminance, 2) * omega) / Math.pow(p, 2);
            }
        }
        if(sumPart === 0) return 10;
        const ugr = 8 * Math.log10((0.25 / inputs.backgroundLuminance) * sumPart);
        return parseFloat(Math.max(10, ugr).toFixed(1));
    }
};

window.FalseColorEngine = {
    colorScale: [
        { lux: 0, r: 0, g: 0, b: 0 }, { lux: 100, r: 0, g: 0, b: 255 }, { lux: 300, r: 0, g: 255, b: 0 },
        { lux: 500, r: 255, g: 255, b: 0 }, { lux: 750, r: 255, g: 0, b: 0 }, { lux: 1000, r: 255, g: 255, b: 255 }
    ],
    getLuxColor: (lux, alpha = 0.6) => {
        const scale = window.FalseColorEngine.colorScale;
        let lower = scale[0], upper = scale[scale.length - 1];
        for (let i = 0; i < scale.length - 1; i++) {
            if (lux >= scale[i].lux && lux <= scale[i + 1].lux) { lower = scale[i]; upper = scale[i + 1]; break; }
        }
        const range = upper.lux - lower.lux;
        const factor = range === 0 ? 0 : (lux - lower.lux) / range;
        const r = Math.round(lower.r + factor * (upper.r - lower.r));
        const g = Math.round(lower.g + factor * (upper.g - lower.g));
        const b = Math.round(lower.b + factor * (upper.b - lower.b));
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
};