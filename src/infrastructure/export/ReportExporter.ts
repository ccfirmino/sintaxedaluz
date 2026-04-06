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
    public static async createGridPdf(PDFLib: any, data: any, images: any, userLogoBase64?: string | null): Promise<Blob> {
        const pdfDoc = await PDFLib.PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]);
        const { width, height } = page.getSize();
        
        const fontBold = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
        const fontRegular = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

        // Estética Sofisticada Unificada (Header White-Label)
        const drawHeader = async (currentPage: any) => {
            currentPage.drawRectangle({ x: 0, y: height - 55, width, height: 55, color: PDFLib.rgb(0.06, 0.09, 0.16) });
            currentPage.drawRectangle({ x: 0, y: height - 57, width, height: 2, color: PDFLib.rgb(0.85, 0.46, 0.02) });
            
            currentPage.drawText('LUXSINTAX', { x: 40, y: height - 32, size: 14, font: fontBold, color: PDFLib.rgb(0.85, 0.46, 0.02) });
            currentPage.drawText('ESTUDO DE VIABILIDADE TÉCNICA E ILUMINÂNCIA', { x: 130, y: height - 32, size: 9, font: fontRegular, color: PDFLib.rgb(1, 1, 1) });
            
            if (userLogoBase64) {
                try {
                    const logoImg = await pdfDoc.embedPng(userLogoBase64); 
                    const logoDims = logoImg.scaleToFit(100, 35);
                    currentPage.drawImage(logoImg, { x: width - logoDims.width - 40, y: height - 10 - logoDims.height, width: logoDims.width, height: logoDims.height });
                } catch(e) { console.warn("Erro ao renderizar logo", e); }
            }
        };

        await drawHeader(page);

        page.drawText(`PROJETO: ${data.projectName.toUpperCase()}`, { x: 40, y: height - 75, size: 9, font: fontBold, color: PDFLib.rgb(0.1, 0.15, 0.2) });
        page.drawText(`AMBIENTE: ${data.roomName.toUpperCase()}`, { x: 40, y: height - 88, size: 8, font: fontRegular, color: PDFLib.rgb(0.3, 0.3, 0.3) });
        page.drawText(`RESPONSÁVEL: ${data.authorName.toUpperCase()}`, { x: width - 260, y: height - 75, size: 8, font: fontBold, color: PDFLib.rgb(0.4, 0.4, 0.4) });
        page.drawText(`DATA: ${new Date().toLocaleDateString('pt-BR')}`, { x: width - 260, y: height - 88, size: 8, font: fontRegular, color: PDFLib.rgb(0.4, 0.4, 0.4) });

        let cy = height - 115; 

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

        // LUXSINTAX: Motor de Auditoria e Carimbo de Conformidade Normativa
        const titleBloco4 = data.isNbrActive ? '4. Síntese de Conformidade (NBR ISO/CIE 8995-1)' : '4. Síntese de Resultados (Estudo Livre)';
        cy = drawSection(titleBloco4, cy);
        
        let status = 'APPROVED';
        if (data.isNbrActive) {
            const parsedUgr = parseFloat(data.ugrStr);
            // Tolerância estrita: Reprova se Lux < 90% do alvo, ou se UGR ultrapassar o limite da NBR
            if (data.avgLux < data.targetLux * 0.9) status = 'REJECTED';
            else if (!isNaN(parsedUgr) && parsedUgr > data.targetUgr) status = 'REJECTED';
            else if (data.avgLux < data.targetLux) status = 'WARNING';
        } else {
            status = data.isOk ? 'APPROVED' : 'REJECTED';
        }

        let boxColor, textColor, stampText;
        if (status === 'APPROVED') {
            boxColor = PDFLib.rgb(0.92, 0.98, 0.92); textColor = PDFLib.rgb(0.06, 0.46, 0.15);
            stampText = data.isNbrActive ? 'APROVADO NBR' : 'ALVO ATINGIDO';
        } else if (status === 'WARNING') {
            boxColor = PDFLib.rgb(1.0, 0.97, 0.86); textColor = PDFLib.rgb(0.75, 0.45, 0.0);
            stampText = 'TOLERÁVEL';
        } else {
            boxColor = PDFLib.rgb(0.98, 0.90, 0.90); textColor = PDFLib.rgb(0.75, 0.10, 0.10);
            stampText = data.isNbrActive ? 'NÃO CONFORME' : 'ABAIXO DO ALVO';
        }

        const resBoxY = cy - 65;
        page.drawRectangle({ x: 40, y: resBoxY, width: width - 80, height: 75, color: boxColor, borderColor: textColor, borderWidth: 1 });

        page.drawText('ILUMINÂNCIA (Em) CALCULADA:', { x: 55, y: cy - 15, size: 9, font: fontBold, color: PDFLib.rgb(0.2, 0.2, 0.2) });
        page.drawText(`${data.avgLux} LUX`, { x: 55, y: cy - 38, size: 24, font: fontBold, color: textColor });
        
        const lblAlvo = data.isNbrActive ? `Alvo Exigido (NBR): ${data.targetLux} Lux` : `Alvo Desejado: ${data.targetLux} Lux`;
        page.drawText(lblAlvo, { x: 55, y: cy - 52, size: 8, font: fontRegular, color: PDFLib.rgb(0.4, 0.4, 0.4) });

        page.drawText('MÉTRICAS COMPLEMENTARES:', { x: 240, y: cy - 15, size: 8, font: fontBold, color: PDFLib.rgb(0.2, 0.2, 0.2) });
        page.drawText(`Carga Instalada: ${data.totalWatts.toFixed(1)} W`, { x: 240, y: cy - 28, size: 9, font: fontRegular });
        page.drawText(`Densidade (LPD): ${data.lpd.toFixed(2)} W/m²`, { x: 240, y: cy - 40, size: 9, font: fontRegular });
        
        // Destaca a vermelho se o UGR for o motivo da reprovação
        const ugrColor = (status === 'REJECTED' && parseFloat(data.ugrStr) > (data.targetUgr || 19)) ? PDFLib.rgb(0.8, 0, 0) : PDFLib.rgb(0.2, 0.2, 0.2);
        page.drawText(`UGR Máx (Aprox): ${data.ugrStr}`, { x: 240, y: cy - 52, size: 9, font: fontBold, color: ugrColor });

        // CARIMBO OFICIAL DE AUDITORIA (STAMP)
        const stampX = width - 190;
        const stampY = cy - 45;
        page.drawRectangle({ x: stampX, y: stampY - 8, width: 130, height: 42, borderColor: textColor, borderWidth: 3, color: PDFLib.rgb(1, 1, 1), opacity: 0.8 });
        page.drawText(stampText, { x: stampX + 10, y: stampY + 12, size: 14, font: fontBold, color: textColor });
        if (data.isNbrActive) {
            page.drawText('ISO/CIE 8995-1', { x: stampX + 28, y: stampY - 2, size: 8, font: fontBold, color: textColor });
        }

        const disclaimer = "AVISO LEGAL: Relatório técnico gerado pela suíte LuxSintax V26. Baseado em modelagem matemática e Método dos Lúmens clássico. Tratando-se de estudo paramétrico preliminar de apoio à decisão do Projetista, os resultados de iluminância e uniformidade podem variar in loco devido a interferências arquitetônicas e obstruções. Documento não substitui laudo ou projeto executivo global assinado.";
        page.drawText(disclaimer, { x: 40, y: 30, size: 6, font: fontRegular, color: PDFLib.rgb(0.6, 0.6, 0.6), maxWidth: width - 80, lineHeight: 7.5 });

        const pdfBytes = await pdfDoc.save();
        return new Blob([pdfBytes], { type: 'application/pdf' });
    }

    /**
     * Monta o PDF do Relatório LEED (ASHRAE 90.1)
     */
    public static async createLeedPdf(PDFLib: any, project: any, summary: any, targetLabel: string, userLogoBase64?: string | null): Promise<Blob> {
        const pdfDoc = await PDFLib.PDFDocument.create();
        const fontBold = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
        const fontRegular = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
        
        let page = pdfDoc.addPage([595.28, 841.89]);
        const { width, height } = page.getSize();

        // Estética Sofisticada Unificada (Header White-Label)
        const drawHeader = async (currentPage: any) => {
            currentPage.drawRectangle({ x: 0, y: height - 55, width, height: 55, color: PDFLib.rgb(0.06, 0.09, 0.16) });
            currentPage.drawRectangle({ x: 0, y: height - 57, width, height: 2, color: PDFLib.rgb(0.85, 0.46, 0.02) });
            
            currentPage.drawText('LUXSINTAX', { x: 40, y: height - 32, size: 14, font: fontBold, color: PDFLib.rgb(0.85, 0.46, 0.02) });
            currentPage.drawText('RELATÓRIO DE COMPLIANCE LEED / ASHRAE 90.1', { x: 130, y: height - 32, size: 9, font: fontRegular, color: PDFLib.rgb(1, 1, 1) });
            
            if (userLogoBase64) {
                try {
                    const logoImg = await pdfDoc.embedPng(userLogoBase64); 
                    const logoDims = logoImg.scaleToFit(100, 35);
                    currentPage.drawImage(logoImg, { x: width - logoDims.width - 40, y: height - 10 - logoDims.height, width: logoDims.width, height: logoDims.height });
                } catch(e) { console.warn("Erro ao renderizar logo", e); }
            }
        };

        const drawSection = (title: string, y: number, currentPage: any) => {
            currentPage.drawRectangle({ x: 40, y: y - 4, width: width - 80, height: 16, color: PDFLib.rgb(0.95, 0.96, 0.98) });
            currentPage.drawText(title.toUpperCase(), { x: 50, y: y, size: 8, font: fontBold, color: PDFLib.rgb(0.2, 0.3, 0.4) });
            return y - 16;
        };

        await drawHeader(page);

        page.drawText(`PROJETO: ${project.name.toUpperCase()}`, { x: 40, y: height - 75, size: 9, font: fontBold, color: PDFLib.rgb(0.1, 0.15, 0.2) });
        page.drawText(`META APLICADA: ${targetLabel.toUpperCase()}`, { x: 40, y: height - 88, size: 8, font: fontRegular, color: PDFLib.rgb(0.3, 0.3, 0.3) });
        page.drawText(`DATA: ${new Date().toLocaleDateString('pt-BR')}`, { x: width - 260, y: height - 88, size: 8, font: fontRegular, color: PDFLib.rgb(0.4, 0.4, 0.4) });

        let cy = height - 115;
        
        cy = drawSection('1. Balanço Energético Global', cy, page);
        cy -= 12;

        const maxBarWidth = 350;
        const maxWatts = Math.max(summary.allowedWatts, summary.totalWatts) * 1.2 || 1; 
        
        const allowedWidth = (summary.allowedWatts / maxWatts) * maxBarWidth;
        page.drawText('LIMITE ASHRAE:', { x: 50, y: cy, size: 7, font: fontBold, color: PDFLib.rgb(0.4, 0.4, 0.4) });
        page.drawRectangle({ x: 130, y: cy - 2, width: allowedWidth, height: 8, color: PDFLib.rgb(0.8, 0.8, 0.8) });
        page.drawText(`${summary.allowedWatts.toFixed(1)} W`, { x: 135 + allowedWidth, y: cy, size: 7, font: fontBold, color: PDFLib.rgb(0.4, 0.4, 0.4) });
        cy -= 16;

        const projectWidth = (summary.totalWatts / maxWatts) * maxBarWidth;
        const barColor = summary.isCompliant ? PDFLib.rgb(0.3, 0.48, 0.06) : PDFLib.rgb(0.8, 0.2, 0.2);
        page.drawText('CARGA PROJETO:', { x: 50, y: cy, size: 7, font: fontBold, color: PDFLib.rgb(0.4, 0.4, 0.4) });
        page.drawRectangle({ x: 130, y: cy - 2, width: projectWidth, height: 8, color: barColor });
        page.drawText(`${summary.totalWatts.toFixed(1)} W`, { x: 135 + projectWidth, y: cy, size: 7, font: fontBold, color: barColor });
        cy -= 24;

        cy = drawSection('2. Impacto ESG e Sustentabilidade (Estimativa Anual)', cy, page);
        cy -= 12;
        
        if (summary.esg && summary.esg.savingsKwh > 0) {
            page.drawText(`Eficiência Operacional: Economia de ${summary.esg.savingsKwh.toFixed(0)} kWh/ano em relação à linha de base.`, { x: 50, y: cy, size: 7, font: fontRegular }); cy -= 12;
            page.drawText(`Pegada de Carbono: Redução estimada de ${summary.esg.co2ReductionKg.toFixed(0)} kg CO2 emitidos na atmosfera.`, { x: 50, y: cy, size: 7, font: fontRegular }); cy -= 12;
            page.drawText(`Equivalência Ambiental: Benefício correspondente a absorção de ${Math.round(summary.esg.treesEquivalent)} árvore(s) adulta(s).`, { x: 50, y: cy, size: 7, font: fontBold, color: PDFLib.rgb(0.3, 0.48, 0.06) }); cy -= 20;
        } else {
            page.drawText('O projeto atual não apresenta redução de carga energética frente ao limite normativo.', { x: 50, y: cy, size: 7, font: fontRegular, color: PDFLib.rgb(0.4, 0.4, 0.4) }); cy -= 20;
        }

        cy = drawSection('3. Memorial de Cálculo por Ambiente', cy, page);
        cy -= 8;

        for (let i = 0; i < project.rooms.length; i++) {
            const r = project.rooms[i];
            if (cy < 80) { page = pdfDoc.addPage([595.28, 841.89]); await drawHeader(page); cy = height - 80; }

            let roomWatts = r.fixtures.reduce((acc: number, f: any) => acc + (f.power * f.qty), 0);
            
            // Fator de meta recriado localmente para o renderizador
            let targetFactor = 1.0;
            if (targetLabel.includes('-5%')) targetFactor = 0.95;
            else if (targetLabel.includes('-10%')) targetFactor = 0.90;
            else if (targetLabel.includes('-20%')) targetFactor = 0.80;
            else if (targetLabel.includes('-30%')) targetFactor = 0.70;
            else if (project.customReduction) targetFactor = Math.max(0, 1 - (project.customReduction / 100));
            
            let roomAllowed = r.area * (r.baseLpd || 0) * targetFactor;

            page.drawText(`${i + 1}. ${r.name.toUpperCase()}`, { x: 50, y: cy, size: 7, font: fontBold, color: PDFLib.rgb(0.1, 0.15, 0.2) });
            page.drawText(`Área: ${r.area} m² | LPD Alvo: ${((r.baseLpd || 0) * targetFactor).toFixed(1)} W/m²`, { x: 250, y: cy, size: 7, font: fontRegular, color: PDFLib.rgb(0.4, 0.4, 0.4) });
            cy -= 12;

            for (let f of r.fixtures) {
                if (cy < 60) { page = pdfDoc.addPage([595.28, 841.89]); await drawHeader(page); cy = height - 80; }
                page.drawText(`- ${f.qty} un x ${f.label} (${f.power}W)`, { x: 60, y: cy, size: 7, font: fontRegular, color: PDFLib.rgb(0.3, 0.3, 0.3) });
                page.drawText(`${(f.qty * f.power).toFixed(1)} W`, { x: 400, y: cy, size: 7, font: fontRegular, color: PDFLib.rgb(0.3, 0.3, 0.3) });
                cy -= 10;
            }

            if (cy < 70) { page = pdfDoc.addPage([595.28, 841.89]); await drawHeader(page); cy = height - 80; }

            const roomStatusColor = roomWatts <= roomAllowed ? PDFLib.rgb(0.3, 0.48, 0.06) : PDFLib.rgb(0.8, 0.2, 0.2);
            page.drawText(`SUBTOTAL: ${roomWatts.toFixed(1)} W`, { x: 60, y: cy, size: 7, font: fontBold, color: roomStatusColor });
            page.drawText(`LIMITE: ${roomAllowed.toFixed(1)} W`, { x: 250, y: cy, size: 7, font: fontBold, color: PDFLib.rgb(0.4, 0.4, 0.4) });
            cy -= 18;
        }

        if (cy < 150) { page = pdfDoc.addPage([595.28, 841.89]); await drawHeader(page); cy = height - 80; }

        cy -= 10;
        cy = drawSection('4. Diagnóstico Técnico Global', cy, page);
        cy -= 12;

        const finalStatus = summary.isCompliant ? "COMPLIANCE ATINGIDO (APROVADO)" : "REPROVADO (EXCEDE LIMITES)";
        
        page.drawText(`LPD Médio Projetado: ${summary.currentLpd.toFixed(2)} W/m²`, { x: 50, y: cy, size: 7, font: fontRegular }); cy -= 16;
        page.drawText(finalStatus, { x: 50, y: cy, size: 9, font: fontBold, color: barColor });
        
        // Rodapé de Isenção Legal
        if (summary.disclaimer) {
            cy -= 30;
            page.drawText(summary.disclaimer, { 
                x: 40, y: cy, size: 6, font: fontRegular, color: PDFLib.rgb(0.6, 0.6, 0.6), 
                maxWidth: width - 80, lineHeight: 7.5 
            });
        }

        const bytes = await pdfDoc.save();
        return new Blob([bytes], { type: 'application/pdf' });
    }
}