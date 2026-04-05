// src/infrastructure/export/ReportExporter.ts

export class ReportExporter {
    /**
     * Gera a imagem PNG da Legenda de Cores Falsas (Heatmap)
     */
    public static getLegendPNG(colorScale: any[]): string {
        const c = document.createElement('canvas');
        c.width = 600; c.height = 60; 
        const ctx = c.getContext('2d')!;
        
        const maxLux = colorScale[colorScale.length - 1].lux;
        
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height);
        
        const grad = ctx.createLinearGradient(10, 15, c.width - 10, 15);
        colorScale.forEach(cObj => grad.addColorStop(cObj.lux / maxLux, `rgb(${cObj.r},${cObj.g},${cObj.b})`));
        
        ctx.fillStyle = grad;
        ctx.fillRect(10, 10, c.width - 20, 20);
        ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 1;
        ctx.strokeRect(10, 10, c.width - 20, 20);
        
        ctx.fillStyle = "#475569";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        
        colorScale.forEach((cObj, idx) => {
            if ([0, 100, 300, 500, 750].includes(cObj.lux) || idx === colorScale.length - 1) {
                const x = 10 + (cObj.lux / maxLux) * (c.width - 20);
                const label = idx === colorScale.length - 1 ? `${cObj.lux}+ Lux` : cObj.lux.toString();
                ctx.fillText(label, x, 35);
                ctx.beginPath(); ctx.moveTo(x, 30); ctx.lineTo(x, 34); ctx.stroke();
            }
        });
        
        return c.toDataURL('image/png');
    }

    /**
     * Gera a imagem PNG da Curva Polar Fotométrica
     */
    public static getPolarPNG(iesData: any, nominalFlux: number, finalFlux: number): string {
        const c = document.createElement('canvas');
        const size = 800; c.width = size; c.height = size; 
        const ctx = c.getContext('2d')!;
        const cx = size / 2; const cy = size / 2; const maxR = 280; 

        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, size, size);
        
        const { vAngles, candelas } = iesData;
        const mult = iesData.multiplier || 1;
        let isCdKlm = false;
        
        const plotData: number[][] =[];
        let maxPlotI = 1;
        for (let h = 0; h < candelas.length; h++) {
            plotData[h] =[];
            for (let v = 0; v < vAngles.length; v++) {
                let val = candelas[h][v] * mult; 
                if (nominalFlux > 0) {
                    val = (val / nominalFlux) * 1000; 
                    isCdKlm = true;
                }
                plotData[h][v] = val;
                if (val > maxPlotI) maxPlotI = val;
            }
        }

        ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 2; 
        for(let a = 0; a < 360; a += 15) {
            const rad = a * Math.PI / 180;
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + maxR * Math.cos(rad), cy + maxR * Math.sin(rad)); ctx.stroke();
        }

        const tickSteps =[10, 20, 25, 50, 100, 150, 200, 250, 300, 400, 500, 1000, 2000, 2500, 5000, 10000];
        let step = tickSteps.find(st => (st * 4) >= maxPlotI * 1.05) || (Math.ceil(maxPlotI / 400) * 100);
        let niceMax = step * 4;
        const steps = 4;

        for(let i = 1; i <= steps; i++) {
            ctx.beginPath(); ctx.arc(cx, cy, (maxR / steps) * i, 0, Math.PI * 2); ctx.stroke();
        }

        ctx.fillStyle = "#64748b"; ctx.font = "bold 22px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const angles =[0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180];
        angles.forEach(ang => {
            const radR = Math.PI / 2 - (ang * Math.PI / 180);
            const radL = Math.PI / 2 + (ang * Math.PI / 180);
            
            ctx.fillText(ang + "°", cx + (maxR + 35) * Math.cos(radR), cy + (maxR + 35) * Math.sin(radR));
            if (ang !== 0 && ang !== 180) {
                ctx.fillText(ang + "°", cx + (maxR + 35) * Math.cos(radL), cy + (maxR + 35) * Math.sin(radL));
            }
        });

        ctx.fillStyle = "#0f172a"; ctx.font = "bold 20px Arial";
        for(let i = 1; i <= steps; i++) {
            const val = Math.round((niceMax / steps) * i).toString();
            const r = (maxR / steps) * i;
            const tw = ctx.measureText(val).width;
            ctx.fillStyle = "#ffffff"; ctx.fillRect(cx - tw / 2 - 6, cy + r - 12, tw + 12, 24);
            ctx.fillStyle = "#0f172a"; ctx.fillText(val, cx, cy + r);
        }

        const drawCurve = (rowL: number[], rowR: number[], color: string) => {
            ctx.beginPath(); 
            ctx.moveTo(cx + (rowL[0] / niceMax) * maxR * Math.cos(Math.PI / 2), cy + (rowL[0] / niceMax) * maxR * Math.sin(Math.PI / 2));
            for(let i = 0; i < vAngles.length; i++){
                const r = (rowL[i] / niceMax) * maxR;
                const a = Math.PI / 2 + (vAngles[i] * Math.PI / 180);
                ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
            }
            for(let i = vAngles.length - 1; i >= 0; i--){
                const r = (rowR[i] / niceMax) * maxR;
                const a = Math.PI / 2 - (vAngles[i] * Math.PI / 180);
                ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
            }
            ctx.closePath();
            ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.stroke(); 
        };

        const r0 = plotData[0], r90 = plotData[9] || plotData[0];
        const r180 = plotData[18] || plotData[0], r270 = plotData[27] || plotData[9] || plotData[0];

        if (JSON.stringify(r0) !== JSON.stringify(r90) || JSON.stringify(r180) !== JSON.stringify(r270)) {
            drawCurve(r270, r90, "rgba(2, 132, 199, 1)"); 
        }
        drawCurve(r0, r180, "rgba(220, 38, 38, 1)"); 

        ctx.fillStyle = "#0f172a"; ctx.textAlign = "left"; ctx.font = "bold 24px Arial";
        ctx.fillText(isCdKlm ? "cd / klm" : "cd", 30, size - 30);
        
        let effText = "η = 100%";
        if (iesData.lor) effText = `η = ${(iesData.lor * 100).toFixed(0)}%`;
        else if (nominalFlux > 0) effText = `η = ${((finalFlux / nominalFlux) * 100).toFixed(0)}%`;
        
        ctx.textAlign = "right";
        ctx.fillText(effText, size - 30, size - 30);

        ctx.textAlign = "left";
        ctx.lineWidth = 5;
        ctx.strokeStyle = "rgba(220, 38, 38, 1)"; ctx.beginPath(); ctx.moveTo(150, size - 38); ctx.lineTo(200, size - 38); ctx.stroke();
        ctx.fillStyle = "#64748b"; ctx.font = "22px Arial"; ctx.fillText("C0 - C180", 215, size - 30);

        if (JSON.stringify(r0) !== JSON.stringify(r90) || JSON.stringify(r180) !== JSON.stringify(r270)) {
            ctx.strokeStyle = "rgba(2, 132, 199, 1)"; ctx.beginPath(); ctx.moveTo(350, size - 38); ctx.lineTo(400, size - 38); ctx.stroke();
            ctx.fillText("C90 - C270", 415, size - 30);
        }
        return c.toDataURL('image/png');
    }

    /**
     * Monta o PDF do Estudo de Malha (Método dos Lúmens)
     */
    public static async createGridPdf(PDFLib: any, data: any, images: any): Promise<Blob> {
        const pdfDoc = await PDFLib.PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]);
        const { width, height } = page.getSize();
        
        const fontBold = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
        const fontRegular = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

        page.drawRectangle({ x: 0, y: height - 45, width, height: 45, color: PDFLib.rgb(0.06, 0.09, 0.16) });
        page.drawText('LUXSINTAX', { x: 40, y: height - 28, size: 14, color: PDFLib.rgb(1, 0.65, 0), font: fontBold });
        page.drawText('| ESTUDO DE VIABILIDADE TÉCNICA v.2026', { x: 125, y: height - 28, size: 10, color: PDFLib.rgb(1, 1, 1), font: fontRegular });

        page.drawText(`PROJETO: ${data.projectName.toUpperCase()}`, { x: 40, y: height - 65, size: 9, font: fontBold, color: PDFLib.rgb(0.1, 0.15, 0.2) });
        page.drawText(`AMBIENTE: ${data.roomName.toUpperCase()}`, { x: 40, y: height - 78, size: 8, font: fontRegular, color: PDFLib.rgb(0.3, 0.3, 0.3) });
        page.drawText(`RESPONSÁVEL: ${data.authorName.toUpperCase()}`, { x: width - 260, y: height - 65, size: 8, font: fontBold, color: PDFLib.rgb(0.4, 0.4, 0.4) });
        page.drawText(`DATA: ${new Date().toLocaleDateString('pt-BR')}`, { x: width - 260, y: height - 78, size: 8, font: fontRegular, color: PDFLib.rgb(0.4, 0.4, 0.4) });

        let cy = height - 105; 

        const drawSection = (title: string, y: number) => {
            page.drawRectangle({ x: 40, y: y - 4, width: width - 80, height: 16, color: PDFLib.rgb(0.95, 0.96, 0.98) });
            page.drawText(title.toUpperCase(), { x: 50, y: y, size: 8, font: fontBold, color: PDFLib.rgb(0.2, 0.3, 0.4) });
            return y - 16;
        };

        cy = drawSection('1. Parâmetros do Ambiente', cy);
        const gridRows = [['Dimensões:', `${data.roomW.toFixed(2)}m x ${data.roomL.toFixed(2)}m (Área: ${data.area.toFixed(2)}m²)`, 'Pé-direito (H):', `${data.height.toFixed(2)}m`],['Fator Utilização (U):', `${data.utilFactor.toFixed(2)}`, 'Plano Trabalho (HP):', `${data.plane.toFixed(2)}m`],['Fator Manutenção (FM):', `${data.maintFactor.toFixed(2)}`, 'Malha Prevista:', `${data.cols}x${data.rows} (${data.totalFixtures} peças)`]
        ];

        gridRows.forEach(row => {
            page.drawText(row[0], { x: 50, y: cy, size: 7, font: fontBold }); page.drawText(row[1], { x: 140, y: cy, size: 7, font: fontRegular });
            page.drawText(row[2], { x: 340, y: cy, size: 7, font: fontBold }); page.drawText(row[3], { x: 440, y: cy, size: 7, font: fontRegular });
            cy -= 12;
        });

        cy -= 8;
        cy = drawSection('2. Especificações da Fonte Luminosa', cy);
        page.drawText('Modelo (IES):', { x: 50, y: cy, size: 7, font: fontBold }); page.drawText(data.lumName, { x: 140, y: cy, size: 7, font: fontRegular }); 
        page.drawText('Temp. de Cor:', { x: 340, y: cy, size: 7, font: fontBold }); page.drawText(data.cct ? `${data.cct} K` : 'Não informado', { x: 440, y: cy, size: 7, font: fontRegular }); cy -= 12;
        page.drawText('Potência:', { x: 50, y: cy, size: 7, font: fontBold }); page.drawText(`${data.pWatts.toFixed(1)} W`, { x: 140, y: cy, size: 7, font: fontRegular });
        page.drawText('Abertura Facho:', { x: 340, y: cy, size: 7, font: fontBold }); page.drawText(data.beamText, { x: 440, y: cy, size: 7, font: fontRegular }); cy -= 12;
        page.drawText('Fluxo Nominal:', { x: 50, y: cy, size: 7, font: fontBold }); page.drawText(`${Math.round(data.fNominal)} lm`, { x: 140, y: cy, size: 7, font: fontRegular });
        page.drawText('Eficácia Final:', { x: 340, y: cy, size: 7, font: fontBold }); page.drawText(`${data.eff} lm/W`, { x: 440, y: cy, size: 7, font: fontRegular }); cy -= 12;
        page.drawText('Fluxo Final:', { x: 50, y: cy, size: 7, font: fontBold }); page.drawText(`${Math.round(data.fFinal)} lm`, { x: 140, y: cy, size: 7, font: fontRegular });
        page.drawText('Uplight:', { x: 340, y: cy, size: 7, font: fontBold }); page.drawText(`${data.upRatio.toFixed(1)} %`, { x: 440, y: cy, size: 7, font: fontRegular }); cy -= 18;

        cy = drawSection('3. Distribuição de Iluminância e Fotometria', cy);
        
        const imgT = await pdfDoc.embedPng(images.topografia);
        const maxWidthTopo = width - 80;
        const dimsT = imgT.scaleToFit(maxWidthTopo, 200); 
        
        const xT = (width - dimsT.width) / 2;
        page.drawImage(imgT, { x: xT, y: cy - dimsT.height, width: dimsT.width, height: dimsT.height });
        page.drawRectangle({ x: xT, y: cy - dimsT.height, width: dimsT.width, height: dimsT.height, borderColor: PDFLib.rgb(0.8, 0.8, 0.8), borderWidth: 1 });
        page.drawText(`PLANO AVALIADO: ${data.targetLevel === 'LP' ? 'PISO (0.00m)' : `MESA (${data.plane.toFixed(2)}m)`}`, { x: xT, y: cy - dimsT.height - 12, size: 7, font: fontBold });

        const imgLeg = await pdfDoc.embedPng(images.legend);
        const dimsLeg = imgLeg.scaleToFit(dimsT.width, 30); 
        page.drawImage(imgLeg, { x: xT, y: cy - dimsT.height - 45, width: dimsLeg.width, height: dimsLeg.height });

        cy -= (dimsT.height + 65);

        if (images.polar) {
            const imgP = await pdfDoc.embedPng(images.polar);
            const dimsP = imgP.scaleToFit(maxWidthTopo, 140);
            const xP = (width - dimsP.width) / 2 - 30;
            
            page.drawImage(imgP, { x: xP, y: cy - dimsP.height, width: dimsP.width, height: dimsP.height });
            page.drawRectangle({ x: xP, y: cy - dimsP.height, width: dimsP.width, height: dimsP.height, borderColor: PDFLib.rgb(0.8, 0.8, 0.8), borderWidth: 1 });
            
            const textX = xP + dimsP.width + 15;
            const textY = cy - (dimsP.height / 2);
            page.drawText('CURVA POLAR', { x: textX, y: textY + 6, size: 8, font: fontBold, color: PDFLib.rgb(0.2, 0.3, 0.4) });
            page.drawText('(C0-C180 / C90-C270)', { x: textX, y: textY - 6, size: 7, font: fontRegular, color: PDFLib.rgb(0.4, 0.4, 0.4) });
            
            cy -= (dimsP.height + 25);
        }

        const titleBloco4 = data.isNbrActive ? '4. Síntese de Conformidade (NBR ISO/CIE 8995-1)' : '4. Síntese de Resultados (Estudo Livre)';
        cy = drawSection(titleBloco4, cy);
        
        const resBoxY = cy - 60;
        page.drawRectangle({ x: 40, y: resBoxY, width: width - 80, height: 70, color: data.isOk ? PDFLib.rgb(0.9, 0.98, 0.9) : PDFLib.rgb(0.98, 0.9, 0.9) });

        page.drawText('ILUMINÂNCIA (Em) CALCULADA:', { x: 60, y: cy - 15, size: 9, font: fontBold });
        page.drawText(`${data.avgLux} LUX`, { x: 60, y: cy - 35, size: 20, font: fontBold, color: data.isOk ? PDFLib.rgb(0.1, 0.5, 0.1) : PDFLib.rgb(0.7, 0.1, 0.1) });
        
        const lblAlvo = data.isNbrActive ? `Alvo Exigido (NBR): ${data.targetLux} Lux` : `Alvo Desejado: ${data.targetLux} Lux`;
        page.drawText(lblAlvo, { x: 60, y: cy - 47, size: 8, font: fontRegular, color: PDFLib.rgb(0.4, 0.4, 0.4) });

        page.drawText('EFICIÊNCIA ENERGÉTICA E UGR:', { x: 260, y: cy - 15, size: 8, font: fontBold });
        page.drawText(`Carga (Total): ${data.totalWatts.toFixed(1)} W`, { x: 260, y: cy - 28, size: 9, font: fontBold });
        page.drawText(`LPD: ${data.lpd.toFixed(2)} W/m²`, { x: 260, y: cy - 39, size: 8, font: fontRegular });
        page.drawText(`UGR Máx (Aprox): ${data.ugrStr}`, { x: 260, y: cy - 50, size: 8, font: fontRegular });

        const lblParecer = data.isNbrActive ? 'PARECER FINAL NBR:' : 'STATUS DO ALVO:';
        const txtParecerOk = data.isNbrActive ? 'APROVADO' : 'ATINGIDO';
        const txtParecerFail = data.isNbrActive ? 'NÃO CONFORME' : 'ABAIXO DO ALVO';
        
        page.drawText(lblParecer, { x: 440, y: cy - 15, size: 8, font: fontBold });
        page.drawText(data.isOk ? txtParecerOk : txtParecerFail, { x: 440, y: cy - 35, size: 12, font: fontBold, color: data.isOk ? PDFLib.rgb(0.1, 0.5, 0.1) : PDFLib.rgb(0.7, 0.1, 0.1) });

        const disclaimer = "AVISO LEGAL: Relatório técnico gerado pela suíte LuxSintax V26. Baseado em modelagem matemática e Método dos Lúmens clássico. Tratando-se de estudo paramétrico preliminar de apoio à decisão do Projetista, os resultados de iluminância e uniformidade podem variar in loco devido a interferências arquitetônicas e obstruções. Documento não substitui laudo ou projeto executivo global assinado.";
        page.drawText(disclaimer, { x: 40, y: 30, size: 6, font: fontRegular, color: PDFLib.rgb(0.6, 0.6, 0.6), maxWidth: width - 80, lineHeight: 7.5 });

        const pdfBytes = await pdfDoc.save();
        return new Blob([pdfBytes], { type: 'application/pdf' });
    }

    /**
     * Monta o PDF do Relatório LEED (ASHRAE 90.1)
     */
    public static async createLeedPdf(PDFLib: any, project: any, summary: any, targetLabel: string): Promise<Blob> {
        const pdfDoc = await PDFLib.PDFDocument.create();
        let page = pdfDoc.addPage([595.28, 841.89]);
        const { width, height } = page.getSize();

        page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: PDFLib.rgb(0.06, 0.09, 0.16) });
        page.drawText('LUXSINTAX', { x: 50, y: height - 45, size: 24, color: PDFLib.rgb(0.3, 0.48, 0.06) });
        page.drawText('RELATÓRIO DE COMPLIANCE DE CARGA (ASHRAE 90.1)', { x: 50, y: height - 65, size: 8, color: PDFLib.rgb(1, 1, 1) });

        let cy = height - 120;
        
        page.drawText(`PROJETO: ${project.name.toUpperCase()}`, { x: 50, y: cy, size: 14, color: PDFLib.rgb(0, 0, 0) });
        cy -= 20;
        page.drawText(`META APLICADA: ${targetLabel.toUpperCase()}`, { x: 50, y: cy, size: 10, color: PDFLib.rgb(0.4, 0.4, 0.4) });
        cy -= 40;

        project.rooms.forEach((r: any, idx: number) => {
            if (cy < 100) { page = pdfDoc.addPage([595.28, 841.89]); cy = height - 50; }

            let roomWatts = r.fixtures.reduce((acc: number, f: any) => acc + (f.power * f.qty), 0);
            let roomAllowed = r.area * (r.baseLpd || 0) * (summary.allowedWatts / (summary.totalArea * (r.baseLpd || 1))); // Aproximação do fator
            
            page.drawText(`${idx + 1}. ${r.name.toUpperCase()} (${r.area} m²) - Tipo: ${r.baseLpd} W/m²`, { x: 50, y: cy, size: 11, color: PDFLib.rgb(0.3, 0.48, 0.06) });
            cy -= 15;

            r.fixtures.forEach((f: any) => {
                if (cy < 60) { page = pdfDoc.addPage([595.28, 841.89]); cy = height - 50; }
                page.drawText(`- ${f.qty} un x ${f.label} (${f.power}W) = ${(f.qty * f.power).toFixed(1)}W`, { x: 60, y: cy, size: 9, color: PDFLib.rgb(0.4, 0.4, 0.4) });
                cy -= 12;
            });

            if (cy < 60) { page = pdfDoc.addPage([595.28, 841.89]); cy = height - 50; }

            page.drawText(`Carga Instalada: ${roomWatts.toFixed(1)}W | Limite: ${roomAllowed.toFixed(1)}W`, { x: 60, y: cy, size: 9, color: PDFLib.rgb(0.2, 0.2, 0.2) });
            cy -= 25;
        });

        if (cy < 150) { page = pdfDoc.addPage([595.28, 841.89]); cy = height - 50; }

        cy -= 10;
        page.drawLine({ start: { x: 50, y: cy }, end: { x: width - 50, y: cy }, thickness: 1, color: PDFLib.rgb(0.8, 0.8, 0.8) });
        cy -= 30;

        const finalStatus = summary.isCompliant ? "APROVADO (COMPLIANT)" : "REPROVADO (EXCEDE LIMITES)";
        const colorStatus = summary.isCompliant ? PDFLib.rgb(0.3, 0.48, 0.06) : PDFLib.rgb(0.8, 0.2, 0.2);

        page.drawText('DIAGNÓSTICO TÉCNICO GLOBAL', { x: 50, y: cy, size: 12, color: PDFLib.rgb(0, 0, 0) });
        cy -= 20;
        page.drawText(`Potência Total Projetada: ${summary.totalWatts.toFixed(1)} W`, { x: 50, y: cy, size: 10 }); cy -= 15;
        page.drawText(`Potência Máx. Permitida: ${summary.allowedWatts.toFixed(1)} W`, { x: 50, y: cy, size: 10 }); cy -= 15;
        page.drawText(`LPD Médio Projetado: ${summary.currentLpd.toFixed(2)} W/m²`, { x: 50, y: cy, size: 10 }); cy -= 25;
        
        page.drawText(`STATUS DA CERTIFICAÇÃO: ${finalStatus}`, { x: 50, y: cy, size: 14, color: colorStatus });

        const bytes = await pdfDoc.save();
        return new Blob([bytes], { type: 'application/pdf' });
    }
}