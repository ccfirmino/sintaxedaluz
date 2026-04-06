// src/infrastructure/canvas/Canvas2DEngine.ts
// @ts-nocheck - Desativa checagem estrita temporariamente para facilitar a migração do Canvas

import { RadiosityEngine } from '../../domain/photometry/RadiosityEngine';
import { FalseColorEngine } from '../../domain/photometry/FalseColorEngine';
import { Photometrics } from '../../domain/photometry/Photometrics';

export class Canvas2DEngine {
    // LUXSINTAX: Controlo de Concorrência. Evita sobreposição de renders (Race Conditions)
    private static currentRenderId = 0;

    private static drawDimLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, text: string) { 
        const isDark = document.documentElement.classList.contains('dark');
        ctx.beginPath(); ctx.strokeStyle = isDark ? "#475569" : "#94a3b8"; ctx.lineWidth = 1; 
        ctx.moveTo(x1, y1 - 3); ctx.lineTo(x1, y1 + 3); ctx.moveTo(x1, y1); ctx.lineTo(x2, y1); ctx.moveTo(x2, y1 - 3); ctx.lineTo(x2, y1 + 3); ctx.stroke(); 
        ctx.font = "bold 13px Manrope"; const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2; const tw = ctx.measureText(text).width; 
        ctx.fillStyle = isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)"; ctx.fillRect(mx - tw / 2 - 6, my - 10, tw + 12, 20); 
        ctx.fillStyle = isDark ? "#94a3b8" : "#475569"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, mx, my); 
        ctx.textAlign = "start"; ctx.textBaseline = "alphabetic";
    }

    private static drawDimLineVertical(ctx: CanvasRenderingContext2D, x: number, y1: number, y2: number, text: string) { 
        const isDark = document.documentElement.classList.contains('dark');
        ctx.beginPath(); ctx.strokeStyle = isDark ? "#475569" : "#94a3b8"; ctx.lineWidth = 1; ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke(); 
        const cy = (y1 + y2) / 2; ctx.save(); ctx.translate(x, cy); ctx.rotate(-Math.PI/2); 
        ctx.font = "bold 13px Manrope"; const tw = ctx.measureText(text).width; 
        ctx.fillStyle = isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)"; ctx.fillRect(-tw/2-6, -10, tw+12, 20); 
        ctx.fillStyle = isDark ? "#94a3b8" : "#475569"; ctx.fillText(text, -tw/2, 4); ctx.restore(); 
    }

    private static drawAngleDim(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, tilt: number, radius: number, color: string, isTilt = false) {
        const isDark = document.documentElement.classList.contains('dark');
        const tr = tilt * Math.PI / 180;
        let startAngle, endAngle, centerAngle;
        if (isTilt) { centerAngle = (Math.PI / 2) - (tr / 2); startAngle = (Math.PI / 2) - tr; endAngle = (Math.PI / 2); } 
        else { const br = angle * Math.PI / 180; const beamAxis = (Math.PI / 2) - tr; centerAngle = beamAxis; startAngle = beamAxis - (br / 2); endAngle = beamAxis + (br / 2); }
        ctx.beginPath(); ctx.arc(x, y, radius, startAngle, endAngle); ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
        const textRadius = radius + 15; const tx = x + textRadius * Math.cos(centerAngle); const ty = y + textRadius * Math.sin(centerAngle);
        ctx.font = "bold 13px Manrope"; const text = angle + "°"; const tw = ctx.measureText(text).width;
        ctx.fillStyle = isDark ? "rgba(15, 23, 42, 0.9)" : "rgba(255, 255, 255, 0.9)"; ctx.fillRect(tx - tw/2 - 4, ty - 10, tw + 8, 20);
        ctx.fillStyle = color; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, tx, ty);
        ctx.textAlign = "start"; ctx.textBaseline = "alphabetic";
    }

    private static drawTextVal(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
        const isDark = document.documentElement.classList.contains('dark');
        ctx.font = "900 13px Manrope"; const tw = ctx.measureText(text).width;
        ctx.fillStyle = isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)"; ctx.fillRect(x - tw/2 - 6, y - 18, tw + 12, 24);
        ctx.fillStyle = "#d97706"; ctx.textAlign = "center"; ctx.fillText(text, x, y - 2); ctx.textAlign = "start"; 
    }

    // LUXSINTAX: Algoritmo Marching Squares para Isolinhas Fotométricas
    private static drawIsolines(ctx: CanvasRenderingContext2D, matrix: number[][], cols: number, rows: number, cellW: number, cellH: number, offsetX: number, offsetY: number, hasFalseColor: boolean, isDark: boolean) {
        const levels = [100, 200, 300, 500, 750, 1000, 1500, 2000];
        ctx.lineJoin = "round";

        const getPt = (vA: number, vB: number, pA: {x:number, y:number}, pB: {x:number, y:number}, lvl: number) => {
            if (vA === vB) return { x: pA.x, y: pA.y };
            const t = (lvl - vA) / (vB - vA);
            return { x: pA.x + t * (pB.x - pA.x), y: pA.y + t * (pB.y - pA.y) };
        };

        levels.forEach(lvl => {
            ctx.beginPath();
            ctx.strokeStyle = hasFalseColor ? (isDark ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.6)") : (isDark ? "rgba(14,165,233,0.8)" : "rgba(2,132,199,0.8)");
            ctx.lineWidth = hasFalseColor ? 1 : 1.5;

            let segmentCount = 0;

            for (let i = 0; i < cols - 1; i++) {
                for (let j = 0; j < rows - 1; j++) {
                    const v0 = matrix[i][j], v1 = matrix[i+1][j], v2 = matrix[i+1][j+1], v3 = matrix[i][j+1];
                    const p0 = { x: offsetX + (i + 0.5) * cellW, y: offsetY + (j + 0.5) * cellH };
                    const p1 = { x: offsetX + (i + 1.5) * cellW, y: offsetY + (j + 0.5) * cellH };
                    const p2 = { x: offsetX + (i + 1.5) * cellW, y: offsetY + (j + 1.5) * cellH };
                    const p3 = { x: offsetX + (i + 0.5) * cellW, y: offsetY + (j + 1.5) * cellH };

                    let state = 0;
                    if (v0 >= lvl) state |= 1;
                    if (v1 >= lvl) state |= 2;
                    if (v2 >= lvl) state |= 4;
                    if (v3 >= lvl) state |= 8;

                    if (state === 0 || state === 15) continue;

                    const pts: any[] = [];
                    const s0 = state & 1, s1 = (state & 2) >> 1, s2 = (state & 4) >> 2, s3 = (state & 8) >> 3;

                    if (s0 !== s1) pts.push(getPt(v0, v1, p0, p1, lvl)); // Topo
                    if (s1 !== s2) pts.push(getPt(v1, v2, p1, p2, lvl)); // Direita
                    if (s2 !== s3) pts.push(getPt(v3, v2, p3, p2, lvl)); // Fundo
                    if (s3 !== s0) pts.push(getPt(v0, v3, p0, p3, lvl)); // Esquerda

                    if (pts.length >= 2) {
                        ctx.moveTo(pts[0].x, pts[0].y);
                        ctx.lineTo(pts[1].x, pts[1].y);
                        
                        if (pts.length === 4) {
                            ctx.moveTo(pts[2].x, pts[2].y);
                            ctx.lineTo(pts[3].x, pts[3].y);
                        }

                        segmentCount++;
                        // Adicionar Rótulo Numérico estrategicamente espaçado (a cada 25 nós do grid)
                        if (segmentCount % 25 === 0) {
                            ctx.save();
                            ctx.font = "bold 9px Manrope";
                            const tw = ctx.measureText(String(lvl)).width;
                            ctx.fillStyle = isDark ? "rgba(15,23,42,0.85)" : "rgba(255,255,255,0.85)";
                            ctx.fillRect(pts[0].x - tw/2 - 2, pts[0].y - 6, tw + 4, 12);
                            ctx.fillStyle = hasFalseColor ? (isDark ? "#ffffff" : "#0f172a") : "#0284c7";
                            ctx.textAlign = "center";
                            ctx.textBaseline = "middle";
                            ctx.fillText(String(lvl), pts[0].x, pts[0].y);
                            ctx.restore();
                        }
                    }
                }
            }
            ctx.stroke();
        });
    }

    public static async render() {
        const currentId = ++this.currentRenderId;
        const win = window as any;
        if (win.currentTool !== 'grid') {
            document.getElementById('grid-hud-overlay')?.classList.add('hidden');
        }
        const canvas = document.getElementById('beamCanvas') as HTMLCanvasElement;
        if (!canvas) return;
        const isDark = document.documentElement.classList.contains('dark');
        const cBaseText = isDark ? "#94a3b8" : "#64748b";
        const cFloorLine = isDark ? "#334155" : "#cbd5e1";
        
        const dpr = window.devicePixelRatio || 1;
        const parent = canvas.parentElement!;
        const rect = parent.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext('2d')!;
        ctx.scale(dpr, dpr);
        const cw = rect.width;
        const ch = rect.height;
        const floorY = ch - 70;
        const centerX = cw / 2;
        let boundsH = 3.0;
        let boundsW = 3.0; 
        const s = win.state[win.currentTool];

        let currentBeamObj = win.getEffectiveBeam(s);
        let currentBeam = currentBeamObj.c0;

        if (win.currentTool === 'ponto') {
            boundsH = s.height * 1.15; 
            const maxAngleRad = (Math.abs(s.tilt) + currentBeam/2) * Math.PI / 180;
            const limitRad = Math.min(maxAngleRad, 1.48);
            boundsW = s.height * Math.tan(limitRad) * 1.25; 
            if (s.viewMode === 'array') {
                boundsW += s.spacing; 
            }
            boundsW = Math.max(boundsW, 3.0);
        } else if (win.currentTool === 'vertical') {
            boundsH = Math.max(s.height, s.hq + s.frameH/2) * 1.15; 
            if (s.viewMode === 'section' || !s.viewMode) {
                boundsW = Math.max(s.dist * 2.5, 3.5); 
            } else {
                boundsW = Math.max((s.qty * s.spacing) + (s.frameW * 2), 2.5);
            }
        } else if (win.currentTool === 'homog') {
            boundsH = s.height;
            const halfBeamRad = (currentBeam/2) * Math.PI / 180;
            boundsW = (s.spacing / 2) + (s.height * Math.tan(halfBeamRad));
        } else if (win.currentTool === 'grid') {
            boundsW = s.roomW;
            boundsH = s.roomL;
        }

        ctx.clearRect(0, 0, cw, ch);
        if (win.currentTool === 'driver') {
            const d = win.state.driver;
            const ccParams = document.getElementById('cc-params');
            if(ccParams) ccParams.classList.toggle('hidden', d.mode !== 'CC');

            const totalPower = d.power * d.qty;
            const recPower = totalPower * 1.20; 

            ctx.fillStyle = isDark ? "#111827" : "#f8fafc";
            ctx.strokeStyle = cFloorLine; ctx.lineWidth = 1;
            if (ctx.roundRect) {
                ctx.beginPath(); ctx.roundRect(centerX - 220, ch/2 - 140, 440, 280, 16); ctx.fill(); ctx.stroke();
            } else {
                ctx.fillRect(centerX - 220, ch/2 - 140, 440, 280); ctx.strokeRect(centerX - 220, ch/2 - 140, 440, 280);
            }

            ctx.textAlign = "center";
            ctx.fillStyle = isDark ? "#94a3b8" : "#64748b";
            ctx.font = "900 11px Manrope";
            ctx.fillText("POTÊNCIA TOTAL DA CARGA (W)", centerX, ch/2 - 70);
            
            ctx.fillStyle = "#d97706";
            ctx.font = "900 52px Manrope";
            ctx.fillText(`${totalPower.toFixed(1)} W`, centerX, ch/2 - 20);

            ctx.fillStyle = isDark ? "#cbd5e1" : "#0f172a";
            ctx.font = "900 11px Manrope";
            ctx.fillText("DRIVER RECOMENDADO (MARGEM DE +20%)", centerX, ch/2 + 40);
            
            ctx.fillStyle = "#0284c7";
            ctx.font = "900 38px Manrope";
            ctx.fillText(`Mínimo: ${recPower.toFixed(1)} W`, centerX, ch/2 + 85);

            ctx.fillStyle = isDark ? "#111827" : "#e2e8f0";
            if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(centerX - 220, ch/2 + 100, 440, 40, {bl: 16, br: 16}); ctx.fill(); } 
            else { ctx.fillRect(centerX - 220, ch/2 + 100, 440, 40); }

            if (d.mode === 'CC') {
                const vForward = totalPower / (d.current / 1000);
                ctx.fillStyle = "#4d7c0f"; ctx.font = "bold 12px Manrope";
                ctx.fillText(`Saída Exigida: ${d.current}mA  |  Janela de Tensão > ${vForward.toFixed(1)}V DC`, centerX, ch/2 + 125);
            } else {
                ctx.fillStyle = "#4d7c0f"; ctx.font = "bold 12px Manrope";
                ctx.fillText(`Saída Exigida: 12V ou 24V DC (Conforme especificação da fita)`, centerX, ch/2 + 125);
            }
            
            ctx.textAlign = "start"; 
            return;
        }
        if (win.currentTool === 'grid') {
            const padX = 80;
            const padY = 80;
            const availW = cw - padX * 2;
            const availH = ch - padY * 2;
            let scale = Math.min(availW / boundsW, availH / boundsH);
            
            const roomPxW = boundsW * scale;
            const roomPxH = boundsH * scale;
            const offsetX = (cw - roomPxW) / 2;
            const offsetY = (ch - roomPxH) / 2;

            ctx.fillStyle = isDark ? "#0f172a" : "#f8fafc";
            ctx.fillRect(offsetX, offsetY, roomPxW, roomPxH);
            
            ctx.save();
            ctx.beginPath();
            ctx.rect(offsetX, offsetY, roomPxW, roomPxH);
            ctx.clip();

            const spacingX = s.roomW / s.cols;
            const spacingY = s.roomL / s.rows;

            const fixtures =[];
            for (let i = 0; i < s.cols; i++) {
                for (let j = 0; j < s.rows; j++) {
                    fixtures.push({ x: (i + 0.5) * spacingX, y: (j + 0.5) * spacingY });
                }
            }

            // LUXSINTAX: Feedback Visual de Processamento (Loading State)
            ctx.fillStyle = isDark ? "rgba(15, 23, 42, 0.8)" : "rgba(248, 250, 252, 0.8)";
            ctx.fillRect(offsetX, offsetY, roomPxW, roomPxH);
            ctx.fillStyle = "#d97706";
            ctx.font = "bold 12px Manrope";
            ctx.textAlign = "center";
            ctx.fillText("A PROCESSAR MALHA FOTOMÉTRICA...", offsetX + roomPxW/2, offsetY + roomPxH/2);

            // Delegação para o Web Worker (Non-blocking UI)
            const radiosityResult = await RadiosityEngine.calculateGridMatrixAsync({
                roomW: s.roomW,
                roomL: s.roomL,
                height: s.height,
                plane: s.plane,
                fixtures: fixtures,
                calcMode: win.calcMode,
                iesData: s.iesData,
                flux: s.flux,
                beam: s.beam,
                maintFactor: s.maintFactor,
                utilFactor: 0.60,
                reflectance: s.reflectance !== undefined ? s.reflectance : 0.05,
                viewLevel: s.viewLevel,
                cellSizeM: 0.5
            });

            // Aborta a renderização se o utilizador já solicitou um novo cálculo (Cancel Token Pattern)
            if (currentId !== this.currentRenderId) return;

            // Limpa a tela de loading e prepara para pintar os resultados
            ctx.clearRect(offsetX, offsetY, roomPxW, roomPxH);
            ctx.fillStyle = isDark ? "#0f172a" : "#f8fafc";
            ctx.fillRect(offsetX, offsetY, roomPxW, roomPxH);

            const { luxMatrix, metricsLP, metricsHP, cellCols, cellRows } = radiosityResult;
            const cellPxW = roomPxW / cellCols;
            const cellPxH = roomPxH / cellRows;

            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = "bold 9px Manrope";

            for (let i = 0; i < cellCols; i++) {
                for (let j = 0; j < cellRows; j++) {
                    const renderLux = luxMatrix[i][j];
                    const pxX = offsetX + i * cellPxW;
                    const pxY = offsetY + j * cellPxH;

                    if (s.falseColor) {
                        ctx.fillStyle = FalseColorEngine.getLuxColor(renderLux, 0.85);
                        ctx.fillRect(pxX, pxY, cellPxW, cellPxH);
                    } else {
                        ctx.strokeStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
                        ctx.lineWidth = 1;
                        ctx.strokeRect(pxX, pxY, cellPxW, cellPxH);
                    }

                    if (cellPxW > 24 && cellPxH > 16) {
                        ctx.fillStyle = s.falseColor ? "rgba(0,0,0,0.6)" : (isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)");
                        ctx.fillText(renderLux.toString(), pxX + cellPxW/2, pxY + cellPxH/2);
                    }
                }
            }

            if (win.state.showIsolines !== false) {
                this.drawIsolines(ctx, luxMatrix, cellCols, cellRows, cellPxW, cellPxH, offsetX, offsetY, s.falseColor, isDark);
            }

            const bgToggle = document.getElementById('fc-toggle-bg');
            const dotToggle = document.getElementById('fc-toggle-dot');
            if (bgToggle && dotToggle) {
                if (s.falseColor) {
                    bgToggle.classList.add('bg-tech-cyan'); bgToggle.classList.remove('bg-slate-200', 'dark:bg-slate-600');
                    dotToggle.classList.add('translate-x-3');
                } else {
                    bgToggle.classList.remove('bg-tech-cyan'); bgToggle.classList.add('bg-slate-200', 'dark:bg-slate-600');
                    dotToggle.classList.remove('translate-x-3');
                }
            }

            const rPxX = Math.abs((s.height * Math.tan((currentBeamObj.c0 * Math.PI / 180) / 2)) * scale);
            const rPxY = Math.abs((s.height * Math.tan((currentBeamObj.c90 * Math.PI / 180) / 2)) * scale);
            const maxRad = Math.max(rPxX, rPxY);

            for (const fix of fixtures) {
                const cxPx = offsetX + fix.x * scale;
                const cyPx = offsetY + fix.y * scale;

                if (!s.falseColor) {
                    ctx.beginPath();
                    if (ctx.ellipse) {
                        ctx.ellipse(cxPx, cyPx, rPxX, rPxY, 0, 0, Math.PI * 2);
                    } else {
                        ctx.arc(cxPx, cyPx, maxRad, 0, Math.PI * 2);
                    }
                    const spotGradient = ctx.createRadialGradient(cxPx, cyPx, 0, cxPx, cyPx, maxRad);
                    spotGradient.addColorStop(0, isDark ? "rgba(217, 119, 6, 0.25)" : "rgba(251, 191, 36, 0.25)");
                    spotGradient.addColorStop(0.5, isDark ? "rgba(217, 119, 6, 0.08)" : "rgba(251, 191, 36, 0.08)");
                    spotGradient.addColorStop(1, "rgba(251, 191, 36, 0)");
                    ctx.fillStyle = spotGradient;
                    ctx.fill();
                }
                
                ctx.beginPath();
                ctx.arc(cxPx, cyPx, 4, 0, Math.PI * 2);
                ctx.fillStyle = "#d97706";
                ctx.fill();
                ctx.strokeStyle = isDark ? "#0f172a" : "#ffffff";
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            ctx.restore();

            ctx.strokeStyle = cFloorLine;
            ctx.lineWidth = 3;
            ctx.strokeRect(offsetX, offsetY, roomPxW, roomPxH);

            this.drawDimLine(ctx, offsetX, offsetY - 20, offsetX + roomPxW, offsetY - 20, win.formatDist(s.roomW));
            this.drawDimLineVertical(ctx, offsetX - 20, offsetY, offsetY + roomPxH, win.formatDist(s.roomL));

            if (s.cols > 1) {
                const cx1 = offsetX + 0.5 * spacingX * scale;
                const cx2 = offsetX + 1.5 * spacingX * scale;
                this.drawDimLine(ctx, cx1, offsetY + roomPxH + 25, cx2, offsetY + roomPxH + 25, win.formatDist(spacingX));
            }
            if (s.rows > 1) {
                const cy1 = offsetY + 0.5 * spacingY * scale;
                const cy2 = offsetY + 1.5 * spacingY * scale;
                this.drawDimLineVertical(ctx, offsetX + roomPxW + 25, cy1, cy2, win.formatDist(spacingY));
            }

            const gridHud = document.getElementById('grid-hud-overlay');
            if (gridHud) {
                gridHud.classList.remove('hidden');
                
                const actualPieces = s.cols * s.rows;
                const trueAvgLux_LP = metricsLP.avgLux;
                const trueAvgLux_HP = metricsHP.avgLux;
                const uniformity_LP = trueAvgLux_LP > 0 ? (metricsLP.minLux / trueAvgLux_LP).toFixed(2) : "0.00";
                const uniformity_HP = trueAvgLux_HP > 0 ? (metricsHP.minLux / trueAvgLux_HP).toFixed(2) : "0.00";

                document.getElementById('hud-layout')!.innerText = `${s.cols} x ${s.rows} (${actualPieces} un)`;
                document.getElementById('hud-em-lp')!.innerText = `${trueAvgLux_LP} lx`;
                document.getElementById('hud-u-lp')!.innerText = uniformity_LP;
                document.getElementById('hud-em-hp')!.innerText = `${trueAvgLux_HP} lx`;
                document.getElementById('hud-u-hp')!.innerText = uniformity_HP;

                const totalWatts = (s.watts || 30) * s.cols * s.rows;
                win.updateResultsUI(trueAvgLux_HP, 18.5, totalWatts, trueAvgLux_LP);
            }

            return; 
        }

        const availH = floorY - 60; const availW = (cw / 2) - 50; 
        let scaleH = availH / Math.max(boundsH, 0.5); let scaleW = availW / Math.max(boundsW, 0.5);
        let scale = Math.min(scaleH, scaleW); scale = Math.min(Math.max(scale, 1.5), 160);

        if(win.currentTool !== 'vertical' || s.viewMode === 'section' || !s.viewMode) {
            ctx.strokeStyle = cFloorLine; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, floorY); ctx.lineTo(cw, floorY); ctx.stroke(); 
            if (win.currentTool === 'ponto' || win.currentTool === 'vertical' || win.currentTool === 'homog') {
                ctx.fillStyle = cBaseText; ctx.font = "bold 13px Manrope"; ctx.textAlign = "left"; 
                ctx.fillText(win.currentLang === 'en' ? "FLOOR LINE (fl)" : "LINHA DE PISO (lp)", 10, floorY + 18); 
                ctx.fillText(win.currentLang === 'en' ? "fl: 0' 0\"" : "lp: 0.00m", 10, floorY - 8); 
                ctx.beginPath(); ctx.moveTo(0, floorY); ctx.lineTo(5, floorY); ctx.stroke();
            }
        }

         if (win.currentTool === 'ponto') {
            const sy = floorY - (s.height * scale), py = floorY - (s.plane * scale);
            const hEff = s.height - s.plane;
            const br = currentBeam * Math.PI / 180;

            let origins = [centerX];
            if (win.currentTool === 'ponto' && s.viewMode === 'array') {
                const hS = (s.spacing * scale) / 2;
                origins =[centerX - hS, centerX + hS];
            }

            const tiltModeElGen = document.querySelector<HTMLInputElement>('input[name="p_tilt_mode"]:checked');
            const tiltModeGen = tiltModeElGen ? tiltModeElGen.value : 'same';

            ctx.beginPath(); ctx.setLineDash([5, 5]); ctx.strokeStyle = isDark ? "rgba(148, 163, 184, 0.4)" : "rgba(100, 116, 139, 0.4)"; ctx.moveTo(0, py); ctx.lineTo(cw, py); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = cBaseText; ctx.font = "bold 13px Manrope"; 
            ctx.fillText(`${win.currentLang === 'en' ? 'wp' : 'hp'}: ${win.formatDist(s.plane)}`, 10, py - 8);

            origins.forEach((xPos, idx) => {
                let currentTilt = Number(s.tilt) || 0;
                if (origins.length === 2 && tiltModeGen === 'cross' && idx === 1) currentTilt = -currentTilt;
                const tr = currentTilt * Math.PI / 180;
                
                // LUXSINTAX: Cálculo Físico via Domínio (Lei do Cosseno Cúbico e Integração IES)
                const iesData = (win.calcMode === 'ies') ? s.iesData : null;
                const dx = s.height * Math.tan(tr);
                
                // Desacoplamento da Intensidade Base (Resolve erro TS2554)
                const baseIntensity = (win.calcMode === 'direct') ? (s.intensity || 0) : ((s.cdklm * s.flux) / 1000 || 0);
                
                // Iluminância no Piso (E = I * cos³θ / h²)
                const resFloor = Photometrics.calculatePointIlluminance(iesData, dx, 0, s.height, currentTilt);
                const luxFloor = (win.calcMode === 'ies') ? resFloor.lux : (baseIntensity * Math.pow(Math.cos(tr), 3)) / (s.height ** 2);
                
                // Iluminância no Plano de Trabalho (Cálculo na altura efetiva hEff)
                let luxPlane = 0;
                if (hEff > 0) {
                    const dxPlane = hEff * Math.tan(tr);
                    const resPlane = Photometrics.calculatePointIlluminance(iesData, dxPlane, 0, hEff, currentTilt);
                    luxPlane = (win.calcMode === 'ies') ? resPlane.lux : (baseIntensity * Math.pow(Math.cos(tr), 3)) / (hEff ** 2);
                }
                
                if (win.calcMode !== 'ies') {
                    const opBase = 0.6; 
                    ctx.save(); ctx.translate(xPos, sy);
                    const g = ctx.createLinearGradient(0, 0, 0, floorY-sy); 
                    g.addColorStop(0, `rgba(251, 191, 36, ${opBase})`); 
                    g.addColorStop(1, `rgba(251, 191, 36, 0)`);
                    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo((floorY-sy) * Math.tan(tr - br / 2), floorY-sy); ctx.lineTo((floorY-sy) * Math.tan(tr + br / 2), floorY-sy); ctx.closePath(); ctx.fill(); ctx.restore();
                }

                if (s.showGlareZone) {
                    ctx.save();
                    ctx.translate(xPos, sy);
                    
                    const nadir = Math.PI / 2; 
                    const limitRad = 65 * (Math.PI / 180);
                    const arcLength = (s.height * scale) * 0.85;

                    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, arcLength, 0, nadir - limitRad, false);
                    ctx.fillStyle = "rgba(220, 38, 38, 0.15)"; ctx.fill();
                    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, arcLength, nadir + limitRad, Math.PI, false); ctx.fill();

                    ctx.beginPath(); ctx.setLineDash([4, 4]); ctx.strokeStyle = "rgba(220, 38, 38, 0.8)"; 
                    ctx.moveTo(0, 0); ctx.lineTo(arcLength * Math.cos(nadir - limitRad), arcLength * Math.sin(nadir - limitRad));
                    ctx.moveTo(0, 0); ctx.lineTo(arcLength * Math.cos(nadir + limitRad), arcLength * Math.sin(nadir + limitRad));
                    ctx.stroke();

                    const safeTiltRad = 30 * (Math.PI / 180);
                    ctx.strokeStyle = "rgba(16, 185, 129, 0.6)"; 
                    ctx.moveTo(0, 0); ctx.lineTo(arcLength * 0.6 * Math.cos(nadir - safeTiltRad), arcLength * 0.6 * Math.sin(nadir - safeTiltRad));
                    ctx.moveTo(0, 0); ctx.lineTo(arcLength * 0.6 * Math.cos(nadir + safeTiltRad), arcLength * 0.6 * Math.sin(nadir + safeTiltRad));
                    ctx.stroke(); ctx.setLineDash([]);
                    ctx.beginPath(); ctx.arc(0, 0, arcLength * 0.5, nadir - safeTiltRad, nadir + safeTiltRad, false);
                    ctx.strokeStyle = "rgba(16, 185, 129, 0.3)"; ctx.lineWidth = 4; ctx.stroke(); ctx.lineWidth = 1.5;
                    
                    const maxBeamAngle = Math.abs(tr) + (br / 2);
                    if (maxBeamAngle > limitRad) {
                        ctx.fillStyle = "rgba(220, 38, 38, 0.9)"; ctx.font = "900 11px Manrope"; ctx.textAlign = "center";
                        ctx.fillText("⚠️ RISCO DE OFUSCAMENTO (>65°)", 0, -15);
                        ctx.font = "bold 9px Manrope"; ctx.fillText("Facho ultrapassou o ângulo de corte seguro.", 0, -4);
                    }
                    ctx.restore();
                }

                ctx.fillStyle = '#FBBF24'; ctx.beginPath(); ctx.arc(xPos, sy, 5, 0, Math.PI * 2); ctx.fill();

                const hitXFloor = xPos + (s.height * scale) * Math.tan(tr);
                ctx.beginPath(); ctx.setLineDash([5, 5]); ctx.strokeStyle = "rgba(217, 119, 6, 0.4)"; ctx.moveTo(xPos, sy); ctx.lineTo(hitXFloor, floorY); ctx.stroke(); ctx.setLineDash([]);
                ctx.beginPath(); ctx.arc(hitXFloor, floorY, 4, 0, Math.PI * 2); ctx.fillStyle = "#d97706"; ctx.fill();
                
                let valText = win.formatIllum(luxFloor);
                if (win.calcMode === 'ies' && !s.iesData) valText = "LOAD IES";
                this.drawTextVal(ctx, valText, hitXFloor, floorY - 12); 

                win.updateResultsUI(luxPlane, 18.5, (s.watts || 10), luxFloor);

                if (win.currentTool === 'ponto' && win.state.showHCL) {
                    const mEDI = Math.round(luxFloor * (s.mRatio || 0.52));
                    ctx.font = "900 13px Manrope";
                    ctx.fillStyle = "#a855f7";
                    ctx.textAlign = "center";
                    ctx.fillText(`${mEDI} m-EDI`, hitXFloor, floorY + 16);
                }
                
                if (hEff > 0) { 
                    const ix = xPos + (hEff * scale) * Math.tan(tr); 
                    ctx.beginPath(); ctx.arc(ix, py, 3, 0, Math.PI * 2); ctx.fillStyle = "#d97706"; ctx.fill(); 
                    let valTextPlane = win.formatIllum(luxPlane);
                    if (win.calcMode === 'ies' && !s.iesData) valTextPlane = "LOAD IES";
                    this.drawTextVal(ctx, valTextPlane, ix, py - 12);

                    if (win.currentTool === 'ponto' && win.state.showHCL) {
                        const mEDIPlane = Math.round(luxPlane * (s.mRatio || 0.52));
                        ctx.font = "900 13px Manrope";
                        ctx.fillStyle = "#a855f7";
                        ctx.textAlign = "center";
                        ctx.fillText(`${mEDIPlane} m-EDI`, ix, py + 16);
                    }
                }
            });

            const lblPTilt = document.getElementById('lbl-p-tilt');
            const warnPTilt = document.getElementById('warn-p-tilt');
            if (lblPTilt && warnPTilt) {
                if (Math.abs(s.tilt) > 30) {
                    lblPTilt.classList.add('text-red-500'); lblPTilt.classList.remove('text-slate-500');
                    warnPTilt.classList.remove('hidden');
                } else {
                    lblPTilt.classList.remove('text-red-500'); lblPTilt.classList.add('text-slate-500');
                    warnPTilt.classList.add('hidden');
                }
            }

            if (s.viewMode === 'array') {
                this.drawDimLine(ctx, origins[0], sy - 25, origins[1], sy - 25, `D: ${win.formatDist(s.spacing)}`);
                
                ctx.beginPath(); ctx.setLineDash([2, 4]); ctx.moveTo(origins[0] - 20, sy); ctx.lineTo(origins[0] - 10, sy); ctx.strokeStyle = isDark ? '#475569' : '#94a3b8'; ctx.stroke(); ctx.setLineDash([]); 
                ctx.font = "bold 13px Manrope"; ctx.fillStyle = cBaseText; ctx.fillText(`${win.formatDist(s.height)}`, origins[0] - 50, sy + 4); 
            } else {
                ctx.beginPath(); ctx.setLineDash([2, 4]); ctx.moveTo(centerX - 20, sy); ctx.lineTo(centerX - 10, sy); ctx.strokeStyle = isDark ? '#475569' : '#94a3b8'; ctx.stroke(); ctx.setLineDash([]); 
                ctx.font = "bold 13px Manrope"; ctx.fillStyle = cBaseText; ctx.fillText(`${win.formatDist(s.height)}`, centerX - 50, sy + 4); 
                
                if (s.tilt > 0) {
                    ctx.beginPath(); ctx.setLineDash([2, 2]); ctx.strokeStyle = isDark ? "rgba(148, 163, 184, 0.4)" : "rgba(100, 116, 139, 0.4)"; ctx.moveTo(centerX, sy); ctx.lineTo(centerX, sy + 60); ctx.stroke(); ctx.setLineDash([]);
                    this.drawAngleDim(ctx, centerX, sy, s.tilt, s.tilt, 70, "#0284c7", true);
                    const distH = s.height * Math.tan(tr);
                    this.drawDimLine(ctx, centerX, floorY + 25, centerX + (s.height * scale) * Math.tan(tr), floorY + 25, `d: ${win.formatDist(distH)}`);
                }
            }

            const tiltModeEl = document.querySelector<HTMLInputElement>('input[name="p_tilt_mode"]:checked');
            const tiltMode = tiltModeEl ? tiltModeEl.value : 'same';

            if (win.calcMode !== 'ies' || s.iesData) {
                origins.forEach((xPos, idx) => {
                    let currentTilt = Number(s.tilt) || 0;
                    if (origins.length === 2 && tiltMode === 'cross' && idx === 1) currentTilt = -currentTilt;
                    const currentTr = currentTilt * Math.PI / 180;

                    if (currentBeamObj.isOval) {
                        this.drawAngleDim(ctx, xPos, sy, Math.round(currentBeamObj.c0), currentTilt, 40, "rgba(217, 119, 6, 0.8)", false); 
                        this.drawAngleDim(ctx, xPos, sy, Math.round(currentBeamObj.c90), currentTilt, 55, "rgba(2, 132, 199, 0.8)", false); 
                        const diaC0 = 2 * (s.height / Math.cos(currentTr)) * Math.tan((currentBeamObj.c0 * Math.PI / 180) / 2);
                        const diaC90 = 2 * (s.height / Math.cos(currentTr)) * Math.tan((currentBeamObj.c90 * Math.PI / 180) / 2);
                        const xL = (floorY - sy) * Math.tan(currentTr - (currentBeamObj.c0 * Math.PI / 180) / 2), xR = (floorY - sy) * Math.tan(currentTr + (currentBeamObj.c0 * Math.PI / 180) / 2); 
                        this.drawDimLine(ctx, xPos + xL, floorY + 50, xPos + xR, floorY + 50, `Ø ${win.formatDist(diaC0)} x ${win.formatDist(diaC90)}`);
                    } else {
                        this.drawAngleDim(ctx, xPos, sy, Math.round(currentBeam), currentTilt, 40, "rgba(217, 119, 6, 0.8)", false); 
                        
                        const dia = 2 * (s.height / Math.cos(currentTr)) * Math.tan(br / 2);
                        const xL = (floorY - sy) * Math.tan(currentTr - br / 2), xR = (floorY - sy) * Math.tan(currentTr + br / 2); 
                        this.drawDimLine(ctx, xPos + xL, floorY + 50, xPos + xR, floorY + 50, `Ø ${win.formatDist(dia)}`);
                    }
                });
            }
        }
        else if (win.currentTool === 'vertical') {
            const tr = s.tilt * Math.PI / 180, br = currentBeam * Math.PI / 180;
            const hitY_metric = s.height - (s.dist / Math.tan(tr));
            
            // LUXSINTAX: Cálculo de Iluminância Vertical Normatizado (E_vert)
            const iesDataVertical = (win.calcMode === 'ies') ? s.iesData : null;
            const deltaH = s.height - hitY_metric; // Altura relativa entre a fonte e o ponto de impacto
            
            let ev = 0;
            if (win.calcMode === 'ies' && iesDataVertical) {
                // Utiliza a fórmula física completa integrada no domínio
                ev = Photometrics.calculateVerticalIlluminance(iesDataVertical, s.dist, deltaH, s.tilt, s.spin || 0);
            } else {
                // Fallback para intensidade paramétrica direta (Desacoplado, Resolve TS2554)
                const baseIntensity = (win.calcMode === 'direct') ? (s.intensity || 0) : ((s.cdklm * s.flux) / 1000 || 0);
                ev = (s.tilt > 0) ? (baseIntensity * Math.pow(Math.sin(tr), 3)) / (s.dist * s.dist) : 0;
            }
            let hitY_px = floorY - (hitY_metric * scale);
            const sy = floorY - (s.height * scale);

            if (s.viewMode === 'section' || !s.viewMode) {
                const wx = centerX + (s.dist * scale); 

                ctx.beginPath(); ctx.moveTo(wx, floorY); ctx.lineTo(wx, floorY - (s.height * scale * 1.5)); ctx.strokeStyle = cFloorLine; ctx.lineWidth = 3; ctx.stroke(); ctx.lineWidth = 2;
                
                ctx.fillStyle = '#FBBF24'; ctx.beginPath(); ctx.arc(centerX, sy, 5, 0, Math.PI * 2); ctx.fill();

                ctx.beginPath(); ctx.setLineDash([2, 4]); ctx.moveTo(centerX - 20, sy); ctx.lineTo(centerX - 10, sy); ctx.strokeStyle = isDark ? '#475569' : '#94a3b8'; ctx.stroke(); ctx.setLineDash([]);
                ctx.font = "bold 13px Manrope"; ctx.fillStyle = cBaseText; ctx.fillText(`${win.formatDist(s.height)}`, centerX - 50, sy + 4);

                const hqY = floorY - (s.hq * scale);
                ctx.beginPath(); ctx.setLineDash([5, 5]); ctx.strokeStyle = isDark ? "rgba(148, 163, 184, 0.4)" : "rgba(100, 116, 139, 0.4)"; ctx.moveTo(0, hqY); ctx.lineTo(wx, hqY); ctx.stroke(); ctx.setLineDash([]);
                ctx.fillStyle = cBaseText; ctx.font = "bold 13px Manrope"; ctx.textAlign = "left"; ctx.fillText(`hq: ${win.formatDist(s.hq)}`, 10, hqY - 8);

                if (win.calcMode !== 'ies') {
                    ctx.save(); ctx.beginPath(); ctx.rect(0, -1000, wx, floorY + 1000); ctx.clip();
                    ctx.save(); ctx.translate(centerX, sy);
                    const g = ctx.createLinearGradient(0, 0, 0, floorY-sy); g.addColorStop(0, `rgba(251, 191, 36, 0.6)`); g.addColorStop(1, `rgba(251, 191, 36, 0)`);
                    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo((floorY-sy) * Math.tan(tr - br / 2), floorY-sy); ctx.lineTo((floorY-sy) * Math.tan(tr + br / 2), floorY-sy); ctx.closePath(); ctx.fill(); ctx.restore(); ctx.restore();
                }

                if (s.showGlareZone) {
                    ctx.save();
                    ctx.translate(centerX, sy);
                    
                    const nadir = Math.PI / 2; 
                    const limitRad = 65 * (Math.PI / 180); 
                    const arcLength = (s.height * scale) * 0.85;

                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.arc(0, 0, arcLength, 0, nadir - limitRad, false);
                    ctx.fillStyle = "rgba(220, 38, 38, 0.15)";
                    ctx.fill();
                    
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.arc(0, 0, arcLength, nadir + limitRad, Math.PI, false);
                    ctx.fill();

                    ctx.beginPath();
                    ctx.setLineDash([4, 4]);
                    ctx.strokeStyle = "rgba(220, 38, 38, 0.8)"; 
                    ctx.moveTo(0, 0); ctx.lineTo(arcLength * Math.cos(nadir - limitRad), arcLength * Math.sin(nadir - limitRad)); 
                    ctx.moveTo(0, 0); ctx.lineTo(arcLength * Math.cos(nadir + limitRad), arcLength * Math.sin(nadir + limitRad)); 
                    ctx.stroke();

                    const safeTiltRad = 30 * (Math.PI / 180);
                    ctx.strokeStyle = "rgba(16, 185, 129, 0.6)"; 
                    ctx.moveTo(0, 0); ctx.lineTo(arcLength * 0.6 * Math.cos(nadir - safeTiltRad), arcLength * 0.6 * Math.sin(nadir - safeTiltRad));
                    ctx.moveTo(0, 0); ctx.lineTo(arcLength * 0.6 * Math.cos(nadir + safeTiltRad), arcLength * 0.6 * Math.sin(nadir + safeTiltRad));
                    ctx.stroke();
                    ctx.setLineDash([]);
                    
                    ctx.beginPath();
                    ctx.arc(0, 0, arcLength * 0.5, nadir - safeTiltRad, nadir + safeTiltRad, false);
                    ctx.strokeStyle = "rgba(16, 185, 129, 0.3)";
                    ctx.lineWidth = 4;
                    ctx.stroke();
                    ctx.lineWidth = 1.5;
                    
                    const maxBeamAngle = Math.abs(tr) + (br / 2);
                    if (maxBeamAngle > limitRad) {
                        ctx.fillStyle = "rgba(220, 38, 38, 0.9)";
                        ctx.font = "900 11px Manrope";
                        ctx.textAlign = "center";
                        ctx.fillText("⚠️ RISCO DE OFUSCAMENTO (>65°)", 0, -15);
                        ctx.font = "bold 9px Manrope";
                        ctx.fillText("Facho ultrapassou o ângulo de corte seguro.", 0, -4);
                    }
                    
                    ctx.restore();
                }

                if (s.tilt > 0) {
                    const axisX = centerX + (s.height * scale) * Math.tan(tr);
                    ctx.beginPath(); ctx.setLineDash([5, 3, 2, 3]); ctx.strokeStyle = isDark ? "rgba(148, 163, 184, 0.5)" : "rgba(100, 116, 139, 0.5)"; ctx.moveTo(centerX, sy); ctx.lineTo(centerX + (s.height * scale * 2) * Math.tan(tr), floorY + (s.height * scale)); ctx.stroke(); ctx.setLineDash([]);
                    this.drawAngleDim(ctx, centerX, sy, s.tilt, s.tilt, 70, "#0284c7", true);
                }
                if (win.calcMode !== 'ies' || s.iesData) this.drawAngleDim(ctx, centerX, sy, Math.round(currentBeam), s.tilt, 40, "rgba(217, 119, 6, 0.8)", false);

                const lblTilt = document.getElementById('lbl-v-tilt');
                const warnTilt = document.getElementById('warn-v-tilt');
                if (lblTilt && warnTilt) {
                    if (Math.abs(s.tilt) > 30) {
                        lblTilt.classList.add('text-red-500'); lblTilt.classList.remove('text-slate-500');
                        warnTilt.classList.remove('hidden');
                    } else {
                        lblTilt.classList.remove('text-red-500'); lblTilt.classList.add('text-slate-500');
                        warnTilt.classList.add('hidden');
                    }
                }

                if (s.tilt > 0) {
                    ctx.beginPath(); ctx.moveTo(centerX, sy); ctx.lineTo(wx, hitY_px); ctx.strokeStyle = "#d97706"; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
                    if (hitY_metric > -10 && hitY_metric < s.height * 3) {
                        ctx.beginPath(); ctx.arc(wx, hitY_px, 3, 0, Math.PI * 2); ctx.fillStyle = "#d97706"; ctx.fill();
                        let valText = win.formatIllum(ev);
                        if (win.calcMode === 'ies' && !s.iesData) valText = "LOAD FILE";
                        this.drawTextVal(ctx, valText, wx - 45, hitY_px);
                        
                        if (win.state.showHCL) {
                            const mEDI_v = Math.round(ev * (s.mRatio || 0.52));
                            ctx.font = "900 13px Manrope";
                            ctx.fillStyle = "#a855f7";
                            ctx.textAlign = "center";
                            ctx.fillText(`${mEDI_v} m-EDI`, wx - 45, hitY_px + 24);
                        }

                        if (hitY_px < floorY) this.drawDimLineVertical(ctx, wx + 45, hitY_px, floorY, `${win.formatDist(hitY_metric)}`);
                    }
                }
                this.drawDimLine(ctx, centerX, sy - 35, wx, sy - 35, `d: ${win.formatDist(s.dist)}`);

            } else {
                const wallW = Math.max(cw * 0.8, s.frameW * scale * 1.5 + (s.qty * s.spacing * scale));
                const wallX = (cw - wallW) / 2;
                
                ctx.fillStyle = isDark ? "#111827" : "#f1f5f9"; 
                ctx.fillRect(wallX, 60, wallW, floorY - 60);
                ctx.strokeStyle = cFloorLine; 
                ctx.beginPath(); ctx.moveTo(0, floorY); ctx.lineTo(cw, floorY); ctx.stroke();

                ctx.strokeStyle = isDark ? "#334155" : "#e2e8f0";
                ctx.beginPath(); ctx.moveTo(0, 40); ctx.lineTo(cw, 40); ctx.stroke();

                const fW_px = s.frameW * scale, fH_px = s.frameH * scale, fY_px = floorY - (s.hq * scale);
                ctx.strokeStyle = "#d97706"; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); 
                ctx.strokeRect(centerX - fW_px/2, fY_px - fH_px/2, fW_px, fH_px); ctx.setLineDash([]);

                const startX = centerX - ((s.qty - 1) * s.spacing * scale) / 2;
                const trRad = tr; 
                const brRad = br; 
                
                // LUXSINTAX: Busca exata do Hotspot de E_max na parede (Domínio Físico)
                const baseIntensity = (win.calcMode === 'direct') ? (s.intensity || 0) : ((s.cdklm * s.flux) / 1000 || 0);
                const hotspot = Photometrics.findVerticalHotspot(iesDataVertical, s.dist, s.height, s.tilt, s.spin || 0, baseIntensity);
                const hotspotY_px = floorY - (hotspot.yMetric * scale);

                for(let i=0; i < s.qty; i++) {
                    const spotX = startX + (i * s.spacing * scale);
                    
                    const safeTrRad = Math.max(0.05, trRad);
                    const pathLength = s.dist / Math.sin(safeTrRad);
                    const transversalBeamRad = currentBeamObj.isOval ? (currentBeamObj.c90 * Math.PI / 180) : brRad;
                    const bW_metric = 2 * (pathLength * Math.tan(transversalBeamRad / 2));
                    const bW_px = bW_metric * scale;
                    
                    let bH_metric = bW_metric / Math.sin(safeTrRad);
                    bH_metric = Math.min(bH_metric, s.height * 2.5); 
                    const bH_px = bH_metric * scale;
                    
                    const hitY_metric_current = s.height - (s.dist / Math.tan(safeTrRad));
                    const hitY_px_current = floorY - (hitY_metric_current * scale);

                    const maxRadius = Math.max(bW_px, bH_px) / 2;
                    const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, maxRadius);
                    const intensityAlpha = isDark ? 0.8 : 0.7; 
                    
                    sg.addColorStop(0, `rgba(251, 191, 36, ${intensityAlpha})`);
                    sg.addColorStop(0.6, `rgba(251, 191, 36, ${intensityAlpha * 0.5})`);
                    sg.addColorStop(0.9, `rgba(251, 191, 36, ${intensityAlpha * 0.05})`);
                    sg.addColorStop(1, "rgba(251, 191, 36, 0)");

                    ctx.save();
                    
                    ctx.beginPath();
                    ctx.rect(0, 40, cw, floorY - 40);
                    ctx.clip();

                    ctx.translate(spotX, hitY_px_current);
                    ctx.scale(bW_px / (maxRadius * 2), bH_px / (maxRadius * 2));
                    
                    ctx.fillStyle = sg;
                    ctx.beginPath();
                    ctx.arc(0, 0, maxRadius, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.restore();

                    ctx.fillStyle = '#FBBF24';
                    ctx.beginPath(); ctx.arc(spotX, 40, 4, 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = "#d97706"; ctx.lineWidth = 1; ctx.stroke();
                    
                    if (i === 0 && tr > 0) {
                        // LUXSINTAX: Desenha o Hotspot na coordenada real de E_max
                        ctx.beginPath();
                        ctx.moveTo(spotX - 8, hotspotY_px); ctx.lineTo(spotX + 8, hotspotY_px);
                        ctx.moveTo(spotX, hotspotY_px - 8); ctx.lineTo(spotX, hotspotY_px + 8);
                        ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 2; ctx.stroke();
                        ctx.beginPath(); ctx.arc(spotX, hotspotY_px, 3, 0, Math.PI * 2); ctx.fillStyle = "#ef4444"; ctx.fill();

                        let valText = win.formatIllum(hotspot.lux);
                        if (win.calcMode === 'ies' && !s.iesData) valText = "LOAD IES";
                        this.drawTextVal(ctx, valText, spotX, hotspotY_px - 14);

                        ctx.fillStyle = "#ef4444"; ctx.font = "900 9px Manrope"; ctx.textAlign = "center";
                        ctx.fillText("E_MAX", spotX, hotspotY_px - 32);

                        if (win.state.showHCL) {
                            const mEDI_wall = Math.round(hotspot.lux * (s.mRatio || 0.52));
                            ctx.font = "900 13px Manrope";
                            ctx.fillStyle = "#a855f7";
                            ctx.textAlign = "center";
                            ctx.fillText(`${mEDI_wall} m-EDI`, spotX, hotspotY_px + 18);
                        }
                    }
                }

                this.drawDimLineVertical(ctx, wallX - 40, 40, floorY, `H: ${win.formatDist(s.height)}`);
                
                ctx.beginPath(); ctx.setLineDash([2, 2]); ctx.strokeStyle = "#94a3b8";
                ctx.moveTo(startX, 40); ctx.lineTo(startX, 20); ctx.stroke(); ctx.setLineDash([]);
                ctx.font = "bold 11px Manrope"; ctx.fillStyle = "#d97706";
                ctx.fillText(`D: ${win.formatDist(s.dist)} (OFFSET)`, startX + 10, 30);

                this.drawDimLine(ctx, centerX - fW_px/2, fY_px + fH_px/2 + 25, centerX + fW_px/2, fY_px + fH_px/2 + 25, `w: ${win.formatDist(s.frameW)}`);
                this.drawDimLineVertical(ctx, centerX + fW_px/2 + 30, fY_px - fH_px/2, fY_px + fH_px/2, `h: ${win.formatDist(s.frameH)}`);
                
                ctx.beginPath(); ctx.setLineDash([4, 2]); ctx.strokeStyle = "rgba(148, 163, 184, 0.5)";
                ctx.moveTo(wallX, fY_px); ctx.lineTo(wallX + wallW, fY_px); ctx.stroke(); ctx.setLineDash([]);
                ctx.fillStyle = cBaseText; ctx.fillText(`hq: ${win.formatDist(s.hq)}`, wallX + 10, fY_px - 8);

                if (s.qty > 1) {
                    this.drawDimLine(ctx, startX, 55, startX + (s.spacing * scale), 55, `s: ${win.formatDist(s.spacing)}`);
                }
            }
        } 
        
        if (win.calcMode === 'ies' && s.iesData) {
            if (win.currentTool !== 'vertical' || s.viewMode !== 'elevation') {
                const { vAngles, candelas } = s.iesData;
                
                const spinOffset = Math.round((s.spin || 0) / 10);
                const idxFront = (0 + spinOffset) % 36;
                const idxBack = (18 + spinOffset) % 36;
                const idxLeft = (27 + spinOffset) % 36;
                const idxRight = (9 + spinOffset) % 36;

                const rowC0 = candelas[idxFront] || candelas[0];
                const rowC90 = candelas[idxRight] || candelas[9] || candelas[0];
                const rowC180 = candelas[idxBack] || candelas[18] || candelas[0];
                const rowC270 = candelas[idxLeft] || candelas[27] || candelas[9] || candelas[0];

            let maxI = 0;
            for(let r of candelas) { const m = Math.max(...r); if(m > maxI) maxI = m; }
            if(maxI === 0) maxI = 1;

            const sy = floorY - (s.height * scale);

            let origins =[centerX];
            if (win.currentTool === 'ponto' && s.viewMode === 'array') {
                const hS = (s.spacing * scale) / 2;
                origins =[centerX - hS, centerX + hS];
            }

            const tiltModeEl2 = document.querySelector<HTMLInputElement>('input[name="p_tilt_mode"]:checked');
            const tiltMode2 = tiltModeEl2 ? tiltModeEl2.value : 'same';

            origins.forEach((originX, idx) => {
                ctx.save();
                
                let currentTilt = Number(s.tilt) || 0;
                if (origins.length === 2 && tiltMode2 === 'cross' && idx === 1) currentTilt = -currentTilt;

                ctx.beginPath();
                ctx.rect(0, 0, cw, floorY);
                ctx.clip();

                const drawCurve = (rowA: number[], rowB: number[], lineColor: string, fillColor: string) => {
                    const fillPath = new Path2D();
                    fillPath.moveTo(originX, sy);
                    for(let i=0; i<vAngles.length; i++) {
                        const ang = (-vAngles[i] + currentTilt) * Math.PI / 180;
                        const r = (rowA[i] / maxI) * (s.height * scale * 0.85);
                        fillPath.lineTo(originX + r * Math.sin(ang), sy + r * Math.cos(ang));
                    }
                    for(let i = vAngles.length - 1; i >= 0; i--) {
                        const ang = (vAngles[i] + currentTilt) * Math.PI / 180;
                        const r = (rowB[i] / maxI) * (s.height * scale * 0.85);
                        fillPath.lineTo(originX + r * Math.sin(ang), sy + r * Math.cos(ang));
                    }
                    fillPath.closePath(); 

                    const grad = ctx.createRadialGradient(originX, sy, 0, originX, sy, s.height * scale);
                    grad.addColorStop(0, fillColor);
                    grad.addColorStop(1, "rgba(255, 255, 255, 0)");
                    ctx.fillStyle = grad;
                    ctx.fill(fillPath);

                    const strokePathL = new Path2D();
                    for(let i=0; i<vAngles.length; i++) {
                        const ang = (-vAngles[i] + currentTilt) * Math.PI / 180;
                        const r = (rowA[i] / maxI) * (s.height * scale * 0.85);
                        if(i===0) strokePathL.moveTo(originX + r * Math.sin(ang), sy + r * Math.cos(ang)); 
                        else strokePathL.lineTo(originX + r * Math.sin(ang), sy + r * Math.cos(ang));
                    }
                    const strokePathR = new Path2D();
                    for(let i=0; i<vAngles.length; i++) {
                        const ang = (vAngles[i] + currentTilt) * Math.PI / 180;
                        const r = (rowB[i] / maxI) * (s.height * scale * 0.85);
                        if(i===0) strokePathR.moveTo(originX + r * Math.sin(ang), sy + r * Math.cos(ang)); 
                        else strokePathR.lineTo(originX + r * Math.sin(ang), sy + r * Math.cos(ang));
                    }

                    ctx.strokeStyle = lineColor;
                    ctx.lineWidth = 1.5;
                    ctx.setLineDash([]);
                    ctx.stroke(strokePathL);
                    ctx.stroke(strokePathR);
                };

                const isOval = JSON.stringify(rowC0) !== JSON.stringify(rowC90) || JSON.stringify(rowC180) !== JSON.stringify(rowC270);
                
                if (isOval) {
                    drawCurve(rowC90, rowC270, "rgba(2, 132, 199, 0.8)", "rgba(2, 132, 199, 0.15)");
                }
                drawCurve(rowC0, rowC180, "rgba(217, 119, 6, 0.8)", "rgba(251, 191, 36, 0.45)");

                ctx.restore();
            });
            } 
        }

        if (win.state.showHCL && win.HCLEngine && (win.currentTool === 'ponto' || win.currentTool === 'vertical')) {
            const hclW = 260;
            const hclH = 150;
            const hclX = cw - hclW - 20;
            const hclY = 20;

            ctx.save();
            
            ctx.fillStyle = isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)";
            ctx.shadowColor = "rgba(0,0,0,0.15)";
            ctx.shadowBlur = 15;
            ctx.shadowOffsetY = 5;
            if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(hclX, hclY, hclW, hclH, 12); ctx.fill(); } 
            else { ctx.fillRect(hclX, hclY, hclW, hclH); }
            ctx.shadowColor = "transparent";

            ctx.strokeStyle = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
            ctx.lineWidth = 1;
            if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(hclX, hclY, hclW, hclH, 12); ctx.stroke(); } 
            else { ctx.strokeRect(hclX, hclY, hclW, hclH); }

            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillStyle = "#6366f1"; 
            ctx.font = "900 10px Manrope";
            ctx.fillText("ESPECTROFOTÔMETRO (HCL)", hclX + 15, hclY + 12);

            const currentMRatio = (s.mRatio || 0.52).toFixed(2);
            let cctLabel = "3000K";
            if(currentMRatio === "0.45") cctLabel = "2700K";
            if(currentMRatio === "0.68") cctLabel = "4000K";
            if(currentMRatio === "0.92") cctLabel = "5000K";
            if(currentMRatio === "1.10") cctLabel = "6500K";

            ctx.fillStyle = isDark ? "#94a3b8" : "#64748b";
            ctx.font = "bold 9px Manrope";
            ctx.fillText(`CCT: ${cctLabel} | Razão Melanópica: ${currentMRatio}`, hclX + 15, hclY + 26);

            const gX = hclX + 25;
            const gY = hclY + 115;
            const gW = hclW - 40;
            const gH = 65;

            ctx.beginPath();
            ctx.strokeStyle = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
            ctx.moveTo(gX, gY - gH); ctx.lineTo(gX, gY); ctx.lineTo(gX + gW, gY);
            ctx.stroke();

            const rainbow = ctx.createLinearGradient(gX, 0, gX + gW, 0);
            rainbow.addColorStop(0, "rgba(139, 92, 246, 0.15)"); 
            rainbow.addColorStop(0.25, "rgba(59, 130, 246, 0.15)"); 
            rainbow.addColorStop(0.5, "rgba(34, 197, 94, 0.15)"); 
            rainbow.addColorStop(0.75, "rgba(234, 179, 8, 0.15)"); 
            rainbow.addColorStop(1, "rgba(239, 68, 68, 0.15)"); 
            ctx.fillStyle = rainbow;
            ctx.fillRect(gX, gY - gH, gW, gH);

            const numPoints = 17;
            const drawSpectralCurve = (dataArray: number[], color: string, lineWidth = 2, isDashed = false) => {
                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = lineWidth;
                if (isDashed) ctx.setLineDash([3, 3]); else ctx.setLineDash([]);
                for(let i=0; i<numPoints; i++) {
                    const px = gX + (i / (numPoints - 1)) * gW;
                    const py = gY - (dataArray[i] * gH);
                    
                    if (i === 0) {
                        ctx.moveTo(px, py);
                    } else {
                        const prevPx = gX + ((i - 1) / (numPoints - 1)) * gW;
                        const prevPy = gY - (dataArray[i - 1] * gH);
                        const cp1x = prevPx + (px - prevPx) / 2;
                        const cp1y = prevPy;
                        const cp2x = prevPx + (px - prevPx) / 2;
                        const cp2y = py;
                        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, px, py);
                    }
                }
                ctx.stroke();
                ctx.setLineDash([]);
            };

            const spdData = win.HCLEngine.spds[currentMRatio] || win.HCLEngine.spds["0.52"];
            
            // LUXSINTAX: Prevenção de quebra caso as curvas biológicas não estejam carregadas
            const melCurve = win.HCLEngine.melanopic || [0,0,0,0.05,0.2,0.5,0.9,1.0,0.7,0.3,0.1,0.05,0,0,0,0,0];
            const photCurve = win.HCLEngine.photopic || [0,0,0,0.02,0.1,0.4,0.8,1.0,0.8,0.4,0.1,0.02,0,0,0,0,0];

            drawSpectralCurve(melCurve, "#a855f7", 1.5, true);
            drawSpectralCurve(photCurve, "#fbbf24", 1.5, true);
            drawSpectralCurve(spdData, isDark ? "#f8fafc" : "#0f172a", 2.5);

            ctx.font = "bold 8px Manrope";
            
            ctx.fillStyle = isDark ? "#f8fafc" : "#0f172a";
            ctx.fillText("━━ SPD (Emissão do LED)", hclX + 15, hclY + 128);
            
            ctx.fillStyle = "#fbbf24";
            ctx.fillText("--- V(λ) Visão Fotópica", hclX + 15, hclY + 138);
            
            ctx.fillStyle = "#a855f7";
            ctx.fillText("--- Curva Melanópica (ipRGC)", hclX + 125, hclY + 138);

            ctx.restore();
        }
    }
}