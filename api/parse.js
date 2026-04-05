export default function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
    
    try {
        const { content, extension } = req.body;
        let parsed = null;

        if (extension === 'ldt') parsed = parseLDT(content);
        else if (extension === 'ies') parsed = parseIES(content);
        else return res.status(400).json({ error: 'Formato não suportado' });

        if (parsed) res.status(200).json(parsed);
        else res.status(400).json({ error: 'Falha na leitura geométrica' });
    } catch (error) {
        res.status(500).json({ error: 'Erro interno no motor fotométrico' });
    }
}

// ==========================================
// MOTOR FOTOMÉTRICO (Agora oculto no servidor)
// ==========================================
function parseLDT(rawData) {
    try {
        const lines = rawData.replace(/\r\n|\r/g, '\n').split('\n').map(l => l.trim());
        while (lines.length > 0 && lines[0] === '') lines.shift();
        if (lines.length < 40) return null;
        
        const Mc = parseInt(lines[3], 10);
        const Mg = parseInt(lines[5], 10);
        if (isNaN(Mc) || isNaN(Mg) || Mc <= 0 || Mg <= 0) return null;
        
        const ityp = parseInt(lines[1], 10);
        const convFactor = parseFloat((lines[23] || '1').replace(/,/g, '.')) || 1.0;
        const nLampsSets = parseInt(lines[25], 10) || 0;
        
        let totalFlux = 0; let wattage = 0;
        for (let i = 0; i < nLampsSets; i++) {
            const baseIdx = 26 + (i * 6);
            const qty = parseInt(lines[baseIdx], 10) || 1;
            totalFlux += qty * (parseFloat((lines[baseIdx + 2] || '0').replace(/,/g, '.').replace(/[^\d.-]/g, '')) || 0);
            wattage += qty * (parseFloat((lines[baseIdx + 5] || '0').replace(/,/g, '.').replace(/[^\d.-]/g, '')) || 0);
        }
        
        let conversionFactor = 1.0;
        if (ityp === 1) {
            conversionFactor = convFactor;
            if (totalFlux <= 0 || isNaN(totalFlux)) totalFlux = 1000;
        } else {
            if (totalFlux <= 0 || isNaN(totalFlux)) { totalFlux = 1000; conversionFactor = convFactor; } 
            else { conversionFactor = (totalFlux / 1000) * convFactor; }
        }
        
        const matrixStartLine = 26 + (nLampsSets * 6);
        const tokens = lines.slice(matrixStartLine).join(' ').replace(/\s+/g, ' ').trim().split(' ');
        let nums = [];
        for (let t of tokens) {
            if (t === '') continue;
            let str = t;
            if (str.includes('.') && str.includes(',')) {
                if (str.lastIndexOf(',') > str.lastIndexOf('.')) str = str.replace(/\./g, '').replace(/,/g, '.');
                else str = str.replace(/,/g, '');
            } else { str = str.replace(/,/g, '.'); }
            const val = Number(str);
            if (!isNaN(val)) nums.push(val);
        }
        
        let startIndex = 10;
        for (let i = 0; i < 50; i++) {
            if (i + Mc + Mg <= nums.length) {
                if (nums[i] === 0 && nums[i + Mc] === 0) {
                    let valid = true;
                    for (let k = 0; k < Mc - 1; k++) if (nums[i + k] >= nums[i + k + 1]) { valid = false; break; }
                    if (valid) { for (let k = 0; k < Mg - 1; k++) if (nums[i + Mc + k] >= nums[i + Mc + k + 1]) { valid = false; break; } }
                    if (valid) { startIndex = i; break; }
                }
            }
        }
        
        let ptr = startIndex;
        let hAngles = []; for (let i = 0; i < Mc; i++) hAngles.push(ptr < nums.length ? nums[ptr++] : 0);
        const vAngles = []; for (let i = 0; i < Mg; i++) vAngles.push(ptr < nums.length ? nums[ptr++] : 0);
        let candelas = [];
        for (let c = 0; c < Mc; c++) {
            const row = [];
            for (let g = 0; g < Mg; g++) { row.push((ptr < nums.length ? nums[ptr++] : 0) * conversionFactor); }
            candelas.push(row);
        }
        
        let hasLightOver90 = false; let hasLightOver180 = false;
        for (let i = 0; i < hAngles.length; i++) {
            const maxVal = Math.max(...candelas[i]);
            if (hAngles[i] > 90 && maxVal > 0.5) hasLightOver90 = true;
            if (hAngles[i] > 180 && maxVal > 0.5) hasLightOver180 = true;
        }
        if (!hasLightOver90 && hAngles[hAngles.length - 1] > 90) {
            const vc = hAngles.filter(a => Math.round(a) <= 90).length;
            hAngles = hAngles.slice(0, vc); candelas = candelas.slice(0, vc);
        } else if (!hasLightOver180 && hAngles[hAngles.length - 1] > 180) {
            const vc = hAngles.filter(a => Math.round(a) <= 180).length;
            hAngles = hAngles.slice(0, vc); candelas = candelas.slice(0, vc);
        }
        
        let firstH = Math.round(hAngles[0]); let lastH = Math.round(hAngles[hAngles.length - 1]);
        if (hAngles.length === 1 || (firstH === 0 && lastH === 0)) {
            const c0 = candelas[0]; hAngles = [0, 90, 180, 270, 360]; candelas = [c0, c0, c0, c0, c0];
        } else {
            if (firstH === 0 && lastH === 90) { const len = hAngles.length; for (let i = len - 2; i >= 0; i--) { hAngles.push(180 - hAngles[i]); candelas.push(candelas[i]); } lastH = 180; }
            if (firstH === 0 && lastH === 180) { const len = hAngles.length; for (let i = len - 2; i >= 0; i--) { hAngles.push(360 - hAngles[i]); candelas.push(candelas[i]); } }
            if (Math.round(hAngles[hAngles.length - 1]) < 360) { hAngles.push(360); candelas.push(candelas[0]); }
        }
        
        const normH = []; const normC = [];
        for (let a = 0; a <= 360; a += 10) {
            normH.push(a);
            const row = [];
            for (let v = 0; v < vAngles.length; v++) {
                let idx1 = 0, idx2 = 0;
                for (let i = 0; i < hAngles.length - 1; i++) { if (a >= hAngles[i] && a <= hAngles[i+1]) { idx1 = i; idx2 = i + 1; break; } }
                if (hAngles[idx1] === hAngles[idx2] || a === hAngles[idx1]) { row.push(candelas[idx1][v]); } 
                else {
                    const t = (a - hAngles[idx1]) / (hAngles[idx2] - hAngles[idx1]);
                    const smoothT = (1 - Math.cos(t * Math.PI)) / 2;
                    row.push(candelas[idx1][v] * (1 - smoothT) + candelas[idx2][v] * smoothT);
                }
            }
            normC.push(row);
        }
        return { vAngles, hAngles: normH, candelas: normC, multiplier: 1, totalFlux, wattage };
    } catch (err) { return null; }
}

function parseIES(content) {
    try {
        let wattage = null;
        const lines = content.replace(/\r\n|\r/g, '\n').split('\n');
        for (let line of lines) {
            if (line.toUpperCase().includes('WATTAGE') || line.toUpperCase().includes('_WATTAGE') || line.toUpperCase().includes('INPUTFREE')) {
                const match = line.match(/[\d.]+/); if (match) wattage = parseFloat(match[0]);
            }
        }
        const tokens = content.replace(/\s+/g, " ").trim().split(" ");
        let cursor = 0; let tiltFound = false;
        for(let i=0; i < tokens.length; i++) { if (tokens[i].startsWith("TILT=")) { cursor = i + 1; tiltFound = true; break; } }
        if (!tiltFound) return null;
        
        function nextNum() {
            while(cursor < tokens.length) { const val = parseFloat(tokens[cursor]); cursor++; if (!isNaN(val)) return val; }
            return null;
        }
        
        nextNum(); nextNum(); 
        const multiplier = nextNum(); const vCount = nextNum(); const hCount = nextNum();
        nextNum(); nextNum(); nextNum(); nextNum(); nextNum(); nextNum(); nextNum(); nextNum();
        
        const vAngles = []; for(let i=0; i<vCount; i++) vAngles.push(nextNum());
        let hAngles = []; for(let i=0; i<hCount; i++) hAngles.push(nextNum());
        let candelas = [];
        for(let h=0; h<hCount; h++) {
            const row = []; for(let v=0; v<vCount; v++) { row.push(nextNum()); } candelas.push(row);
        }
        
        let firstH = Math.round(hAngles[0]); let lastH = Math.round(hAngles[hAngles.length - 1]);
        if (hAngles.length === 1 || (firstH === 0 && lastH === 0)) {
            const c0 = candelas[0]; hAngles = [0, 90, 180, 270, 360]; candelas = [c0, c0, c0, c0, c0];
        } else {
            if (firstH === 0 && lastH === 90) { const len = hAngles.length; for (let i = len - 2; i >= 0; i--) { hAngles.push(180 - hAngles[i]); candelas.push(candelas[i]); } lastH = 180; }
            if (firstH === 0 && lastH === 180) { const len = hAngles.length; for (let i = len - 2; i >= 0; i--) { hAngles.push(360 - hAngles[i]); candelas.push(candelas[i]); } }
            if (Math.round(hAngles[hAngles.length - 1]) < 360) { hAngles.push(360); candelas.push(candelas[0]); }
        }
        
        const normH = []; const normC = [];
        for (let a = 0; a <= 360; a += 10) {
            normH.push(a); const row = [];
            for (let v = 0; v < vAngles.length; v++) {
                let idx1 = 0, idx2 = 0;
                for (let i = 0; i < hAngles.length - 1; i++) { if (a >= hAngles[i] && a <= hAngles[i+1]) { idx1 = i; idx2 = i + 1; break; } }
                if (hAngles[idx1] === hAngles[idx2] || a === hAngles[idx1]) { row.push(candelas[idx1][v]); } 
                else {
                    const t = (a - hAngles[idx1]) / (hAngles[idx2] - hAngles[idx1]);
                    const smoothT = (1 - Math.cos(t * Math.PI)) / 2;
                    row.push(candelas[idx1][v] * (1 - smoothT) + candelas[idx2][v] * smoothT);
                }
            }
            normC.push(row);
        }
        hAngles = normH; candelas = normC;
        
        let estimatedTotalFlux = 0;
        if (multiplier > 0) {
           const avgCandela = candelas[0].reduce((a, b) => a + b, 0) / vCount;
           estimatedTotalFlux = avgCandela * multiplier * 2 * Math.PI; 
        }
        return { vAngles, hAngles, candelas, multiplier, wattage, totalFlux: estimatedTotalFlux };
    } catch (e) { return null; }
}