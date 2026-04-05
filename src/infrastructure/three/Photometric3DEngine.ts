// src/infrastructure/three/Photometric3DEngine.ts

import { Photometrics } from '../../domain/photometry/Photometrics.js';
import { FalseColorEngine } from '../../domain/photometry/FalseColorEngine.js';

// Declarações para evitar erros de tipagem com bibliotecas globais
declare const THREE: any;
declare const window: any;
declare const document: any;
declare const requestAnimationFrame: any;

export class Photometric3DEngine {
    public static scene: any = null;
    public static camera: any = null;
    public static renderer: any = null;
    public static controls: any = null;
    public static solidGroup: any = null;
    public static isInitialized: boolean = false;
    public static _lastToolRendered: string = '';

    public static init(): void {
        if (this.isInitialized) return;
        const container = document.getElementById('webgl-container');
        if (!container || typeof THREE === 'undefined') return;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(document.documentElement.classList.contains('dark') ? 0x111827 : 0xf8fafc);

        const rect = container.getBoundingClientRect();
        this.camera = new THREE.PerspectiveCamera(45, rect.width / rect.height, 0.1, 1000);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(rect.width, rect.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.localClippingEnabled = true; 
        container.appendChild(this.renderer.domElement);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(10, 20, 10);
        this.scene.add(dirLight);

        this.isInitialized = true;
        this.animate();

        window.addEventListener('resize', () => {
            if (!this.renderer || container.clientWidth === 0) return;
            const width = container.clientWidth;
            const height = container.clientHeight;
            this.renderer.setSize(width, height);
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        });
    }

    public static animate(): void {
        requestAnimationFrame(() => Photometric3DEngine.animate());
        if (this.controls) this.controls.update();
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    public static clearSolid(): void {
        if (this.solidGroup && this.scene) {
            this.scene.remove(this.solidGroup);
            this.solidGroup.children.forEach((child: any) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach((m: any) => {
                            if (m.map) m.map.dispose();
                            m.dispose();
                        });
                    } else {
                        if (child.material.map) child.material.map.dispose();
                        child.material.dispose();
                    }
                }
            });
            this.solidGroup = null;
        }
    }

    public static renderPhotometricSolid(iesData: any, toolId: string = 'ponto', state: any = null): void {
        if (!this.isInitialized) this.init();
        const isDark = document.documentElement.classList.contains('dark');
        if (this.scene) this.scene.background = new THREE.Color(isDark ? 0x111827 : 0xf8fafc);
        this.clearSolid();

        const hasIes = iesData && iesData.hAngles && iesData.vAngles && iesData.candelas;
        let overlay = document.getElementById('webgl-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'webgl-overlay';
            overlay.className = 'absolute top-4 right-4 z-30 pointer-events-none transition-opacity';
            document.getElementById('stage-3d')!.appendChild(overlay);
        }

        if (hasIes) {
            const dummyState = state || { beam: 90, iesData: iesData };
            const beamObj = Photometrics.getEffectiveBeam(dummyState.iesData, dummyState.beam);
            const textLabel = beamObj.isOval ? `${Math.round(beamObj.c0)}° x ${Math.round(beamObj.c90)}°` : `${Math.round(beamObj.c0)}°`;
            overlay.innerHTML = `<div class="bg-slate-900/80 backdrop-blur border border-luminous-gold/50 text-luminous-gold px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase shadow-lg">Facho FWHM: ${textLabel}</div>`;
            overlay.style.display = 'block';
        } else {
            overlay.style.display = 'none';
        }

        const webGroup = new THREE.Group();
        if (hasIes) {
            const hAngles = iesData.hAngles, vAngles = iesData.vAngles, matrix = iesData.candelas, mult = iesData.multiplier;
            let maxI = 0;
            for (let h = 0; h < hAngles.length; h++) for (let v = 0; v < vAngles.length; v++) if (matrix[h][v] > maxI) maxI = matrix[h][v];
            
            if (maxI > 0) {
                const scaleFactor = (state && state.height) ? (state.height * 0.8) / (maxI * mult) : 5 / (maxI * mult);
                
                // LUXSINTAX: Algoritmo de Sólido Fotométrico 3D (Malha contínua e Mapeamento de Cores)
                const vertices = [];
                const indices = [];
                const colors = [];
                
                const numH = hAngles.length;
                const numV = vAngles.length;
                
                // 1. Definição de Vértices no espaço polar e mapeamento de cor (Heatmap 3D)
                for (let h = 0; h < numH; h++) {
                    for (let v = 0; v < numV; v++) {
                        const intensity = matrix[h][v] * mult;
                        const r = intensity * scaleFactor;
                        
                        const phi = (hAngles[h] * Math.PI) / 180;
                        const theta = (vAngles[v] * Math.PI) / 180;
                        
                        const x = r * Math.sin(theta) * Math.cos(phi);
                        const y = -r * Math.cos(theta); // Eixo Y para baixo na simulação de iluminação
                        const z = r * Math.sin(theta) * Math.sin(phi);
                        
                        vertices.push(x, y, z);
                        
                        // Cor baseada na intensidade: de Luminous Gold (pico) para Azul profundo (fundo)
                        const ratio = intensity / (maxI * mult);
                        const color = new THREE.Color();
                        // HSL: Matiz varia do azul escuro para o amarelo/ouro
                        color.setHSL(0.6 - (ratio * 0.5), 1.0, 0.2 + (ratio * 0.4));
                        colors.push(color.r, color.g, color.b);
                    }
                }
                
                // 2. Triangulação da malha (Criação das faces)
                for (let h = 0; h < numH - 1; h++) {
                    for (let v = 0; v < numV - 1; v++) {
                        const a = h * numV + v;
                        const b = h * numV + (v + 1);
                        const c = (h + 1) * numV + v;
                        const d = (h + 1) * numV + (v + 1);
                        
                        // Construção de dois triângulos (face) para cada quadrado na malha esférica
                        indices.push(a, b, c);
                        indices.push(c, b, d);
                    }
                }

                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
                geometry.setIndex(indices);
                geometry.computeVertexNormals(); // Calcula o sombreamento liso (Smooth Shading)

                // 3. Material Enterprise (Simulação de Volumetria Translúcida)
                const material = new THREE.MeshPhysicalMaterial({
                    vertexColors: true,
                    transparent: true,
                    opacity: 0.85,
                    roughness: 0.1,
                    transmission: 0.6, // Deixa a luz atravessar a própria malha
                    side: THREE.DoubleSide,
                    depthWrite: false
                });

                const mesh = new THREE.Mesh(geometry, material);
                
                // 4. Preservação do Wireframe Fotométrico por cima do sólido
                const wireMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 });
                const wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), wireMaterial);
                mesh.add(wireframe);
                
                webGroup.add(mesh);
            }
            webGroup.rotation.y = Math.PI / 2;
        }

        this.solidGroup = new THREE.Group();
        let visI = 3000;
        if (state) {
            if (window.calcMode === 'direct') visI = state.intensity || 3000;
            else if (window.calcMode === 'photometric') visI = ((state.cdklm || 2000) * (state.flux || 1500)) / 1000;
            else if (window.calcMode === 'ies' && hasIes) visI = iesData.candelas[0][0] * iesData.multiplier;
        }
        const luxFactor = Math.min(Math.max(visI / 4000, 0.1), 2.5);

        if (toolId === 'grid' && state) {
            const spacingX = state.roomW / state.cols;
            const spacingZ = state.roomL / state.rows; 
            
            const buildTexture = (w: number, h: number, planeType: number, wallId: number | null) => {
                const resX = 64; const resY = Math.max(16, Math.round(resX * (h/w)));
                const cvs = document.createElement('canvas'); cvs.width = resX; cvs.height = resY; const cx = cvs.getContext('2d')!;
                
                cx.fillStyle = isDark ? '#111827' : '#e2e8f0';
                cx.fillRect(0, 0, resX, resY);

                if (!state.falseColor && window.state.showIsolines === false) return new THREE.CanvasTexture(cvs);

                const fixtures: any[] = [];
                const sX = -state.roomW / 2 + spacingX / 2, sZ = -state.roomL / 2 + spacingZ / 2;
                for (let i = 0; i < state.cols; i++) for (let j = 0; j < state.rows; j++) fixtures.push({ x: sX + i * spacingX, z: sZ + j * spacingZ, y: state.height });

                const halfBeamRad = (state.beam || 60) * Math.PI / 180 / 2;
                const n_power = (halfBeamRad > 0 && halfBeamRad < Math.PI / 2) ? Math.log(0.5) / Math.log(Math.cos(halfBeamRad)) : 1;
                const maxI = (state.flux * (n_power + 1)) / (2 * Math.PI);
                const ambientLux = ((state.flux * state.cols * state.rows * state.utilFactor * state.maintFactor) / (state.roomW * state.roomL)) * 0.08;

                const luxMatrix: number[][] = [];
                for (let ix = 0; ix < resX; ix++) {
                    luxMatrix[ix] = [];
                    for (let iy = 0; iy < resY; iy++) {
                        let px = 0, py = 0, pz = 0;
                        if (planeType === 0) { px = -state.roomW/2 + (ix/resX)*state.roomW; py = 0; pz = -state.roomL/2 + (iy/resY)*state.roomL; } 
                        else if (planeType === 2) { px = -state.roomW/2 + (ix/resX)*state.roomW; py = state.height; pz = -state.roomL/2 + (iy/resY)*state.roomL; } 
                        else { 
                            py = state.height - (iy/resY)*state.height;
                            if (wallId === 0) { px = -state.roomW/2 + (ix/resX)*state.roomW; pz = -state.roomL/2; }
                            if (wallId === 1) { px = -state.roomW/2 + (ix/resX)*state.roomW; pz = state.roomL/2; }
                            if (wallId === 2) { pz = -state.roomL/2 + (ix/resX)*state.roomL; px = -state.roomW/2; }
                            if (wallId === 3) { pz = -state.roomL/2 + (ix/resX)*state.roomL; px = state.roomW/2; }
                        }

                        let totalLux = 0;
                        for (const fix of fixtures) {
                            const dx = px - fix.x, dy = py - fix.y, dz = pz - fix.z;
                            const distSq = dx*dx + dy*dy + dz*dz, dist = Math.sqrt(distSq);
                            const cosTheta = dist > 0 ? Math.abs(dy) / dist : 1;
                            const angleRad = dist > 0 ? Math.acos(cosTheta) : 0;
                            if (planeType !== 2 && angleRad < Math.PI / 2) {
                                const I = maxI * Math.pow(Math.cos(angleRad), n_power);
                                const incidence = (planeType === 0) ? cosTheta : Math.sqrt(dx*dx + dz*dz)/dist;
                                if (I > 0) totalLux += (I * incidence) / distSq;
                            }
                        }
                        totalLux = Math.round(totalLux * state.maintFactor + ambientLux);
                        luxMatrix[ix][iy] = totalLux;
                        if (state.falseColor) {
                            cx.fillStyle = FalseColorEngine.getLuxColor(totalLux);
                            cx.fillRect(ix, iy, 1, 1);
                        }
                    }
                }
                if (window.state.showIsolines !== false && window.drawIsolinesOnCanvas) {
                    window.drawIsolinesOnCanvas(cx, luxMatrix, resX, resY, state.falseColor);
                }
                const tex = new THREE.CanvasTexture(cvs); tex.minFilter = THREE.LinearFilter; return tex;
            };

            const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(state.roomW, state.roomL), new THREE.MeshBasicMaterial({ map: buildTexture(state.roomW, state.roomL, 0, null), side: THREE.DoubleSide, depthWrite: true }));
            floorMesh.rotation.x = -Math.PI / 2;
            this.solidGroup.add(floorMesh);

            if (state.falseColor || window.state.showIsolines !== false) {
                const ceilMesh = new THREE.Mesh(new THREE.PlaneGeometry(state.roomW, state.roomL), new THREE.MeshBasicMaterial({ map: buildTexture(state.roomW, state.roomL, 2, null), side: THREE.FrontSide }));
                ceilMesh.rotation.x = Math.PI / 2; ceilMesh.position.set(0, state.height, 0); this.solidGroup.add(ceilMesh);
                const wallMesh0 = new THREE.Mesh(new THREE.PlaneGeometry(state.roomW, state.height), new THREE.MeshBasicMaterial({ map: buildTexture(state.roomW, state.height, 1, 0), side: THREE.FrontSide }));
                wallMesh0.position.set(0, state.height/2, -state.roomL/2); this.solidGroup.add(wallMesh0);
                const wallMesh1 = new THREE.Mesh(new THREE.PlaneGeometry(state.roomW, state.height), new THREE.MeshBasicMaterial({ map: buildTexture(state.roomW, state.height, 1, 1), side: THREE.FrontSide }));
                wallMesh1.rotation.y = Math.PI; wallMesh1.position.set(0, state.height/2, state.roomL/2); this.solidGroup.add(wallMesh1);
                const wallMesh2 = new THREE.Mesh(new THREE.PlaneGeometry(state.roomL, state.height), new THREE.MeshBasicMaterial({ map: buildTexture(state.roomL, state.height, 1, 2), side: THREE.FrontSide }));
                wallMesh2.rotation.y = Math.PI / 2; wallMesh2.position.set(-state.roomW/2, state.height/2, 0); this.solidGroup.add(wallMesh2);
                const wallMesh3 = new THREE.Mesh(new THREE.PlaneGeometry(state.roomL, state.height), new THREE.MeshBasicMaterial({ map: buildTexture(state.roomL, state.height, 1, 3), side: THREE.FrontSide }));
                wallMesh3.rotation.y = -Math.PI / 2; wallMesh3.position.set(state.roomW/2, state.height/2, 0); this.solidGroup.add(wallMesh3);
            }

            const roomMesh = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(state.roomW, state.height, state.roomL)), new THREE.LineBasicMaterial({ color: 0x475569, transparent: true, opacity: 0.3 }));
            roomMesh.position.set(0, state.height / 2, 0); this.solidGroup.add(roomMesh);

            const startX = -state.roomW / 2 + spacingX / 2, startZ = -state.roomL / 2 + spacingZ / 2;
            const fixGeo = new THREE.SphereGeometry(0.1, 16, 16), fixMat = new THREE.MeshBasicMaterial({ color: 0xd97706 });

            for (let i = 0; i < state.cols; i++) {
                for (let j = 0; j < state.rows; j++) {
                    const posX = startX + i * spacingX, posZ = startZ + j * spacingZ;
                    if (hasIes && webGroup.children.length > 0) {
                        const fixMesh = new THREE.Mesh(fixGeo, fixMat); fixMesh.position.set(posX, state.height, posZ); this.solidGroup.add(fixMesh);
                        if (window.state.showPolar !== false) { const mesh = webGroup.clone(); mesh.position.set(posX, state.height, posZ); this.solidGroup.add(mesh); }
                    } else {
                        const fixMesh = new THREE.Mesh(fixGeo, fixMat); fixMesh.position.set(posX, state.height, posZ); this.solidGroup.add(fixMesh);
                        const spotLight = new THREE.SpotLight(0xfff1e0, 1.5 * luxFactor);
                        spotLight.position.set(posX, state.height, posZ); spotLight.angle = (state.beam || 60) * Math.PI / 180 / 2; spotLight.penumbra = 0.5; spotLight.distance = state.height * 3;
                        const targetObj = new THREE.Object3D(); targetObj.position.set(posX, 0, posZ); this.solidGroup.add(targetObj); spotLight.target = targetObj; this.solidGroup.add(spotLight);
                        if (window.state.showPolar !== false) {
                            const beamRadLumen = (state.beam || 60) * Math.PI / 180 / 2;
                            const coneGeo = new THREE.CylinderGeometry(0.1, Math.tan(beamRadLumen) * state.height, state.height, 32, 1, true); coneGeo.translate(0, -state.height/2, 0);
                            const beamMesh = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.12 * luxFactor, side: THREE.DoubleSide, depthWrite: false }));
                            beamMesh.position.set(posX, state.height, posZ); this.solidGroup.add(beamMesh);
                        }
                    }
                }
            }
            if (this._lastToolRendered !== toolId) {
                this.camera.position.set(state.roomW * 1.2, state.height * 2.5, state.roomL * 1.2);
                this.controls.target.set(0, state.height / 2, 0);
            }
            this._lastToolRendered = toolId;

        } else if (toolId === 'vertical' || toolId === 'ponto') {
            const h = state.height || 3;
            const baseTiltRad = (Number(state.tilt) || 0) * Math.PI / 180;
            this.solidGroup.add(new THREE.GridHelper(10, 10, 0x334155, isDark ? 0x111827 : 0xe2e8f0));

            const floorSize = toolId === 'vertical' ? Math.max(10, ((state.qty || 1) * (state.spacing || 1)) + 6) : 10;
            let floorMat;

            const buildDynamicFloor = () => {
                const resX = 64; const resY = 64;
                const cvs = document.createElement('canvas'); cvs.width = resX; cvs.height = resY; const cx = cvs.getContext('2d')!;
                cx.fillStyle = isDark ? '#111827' : '#e2e8f0'; cx.fillRect(0, 0, resX, resY);
                
                if (!state.falseColor && window.state.showIsolines === false) return new THREE.CanvasTexture(cvs);

                const fixtures: any[] = [];
                if (toolId === 'ponto' && state.viewMode === 'array') {
                    const tiltMode3D = document.querySelector<HTMLInputElement>('input[name="p_tilt_mode"]:checked')?.value || 'same';
                    const hS = (state.spacing || 2) / 2;
                    fixtures.push({ x: -hS, y: h, z: 0, tilt: baseTiltRad, spin: 0 });
                    fixtures.push({ x: hS, y: h, z: 0, tilt: tiltMode3D === 'cross' ? -baseTiltRad : baseTiltRad, spin: 0 });
                } else if (toolId === 'vertical') {
                    const qty = state.qty || 1, spacing = state.spacing || 1.0;
                    const startZ = -((qty - 1) * spacing) / 2;
                    for (let i = 0; i < qty; i++) fixtures.push({ x: 0, y: h, z: startZ + (i * spacing), tilt: baseTiltRad, spin: (state.spin || 0) * Math.PI / 180 });
                } else {
                    fixtures.push({ x: 0, y: h, z: 0, tilt: baseTiltRad, spin: 0 });
                }

                let n_power = 1, maxI = 0, isIesActive = window.calcMode === 'ies' && hasIes;
                if (!isIesActive) {
                    const halfBeamRad = (state.beam || 30) / 2 * Math.PI / 180;
                    if (halfBeamRad > 0 && halfBeamRad < Math.PI / 2) n_power = Math.log(0.5) / Math.log(Math.cos(halfBeamRad));
                    maxI = ((state.flux || 1500) * (n_power + 1)) / (2 * Math.PI);
                }

                const luxMatrix: number[][] = [];
                for (let ix = 0; ix < resX; ix++) {
                    luxMatrix[ix] = [];
                    for (let iy = 0; iy < resY; iy++) {
                        const px = toolId === 'vertical' ? (state.dist || 1) : (-floorSize/2 + (ix/resX)*floorSize);
                        const pz = toolId === 'vertical' ? (-floorSize/2 + (ix/resX)*floorSize) : (-floorSize/2 + (iy/resY)*floorSize);
                        const py = toolId === 'vertical' ? (h - (iy/resY)*h) : 0;
                        let totalLux = 0;
                        for (const fix of fixtures) {
                            const dx = px - fix.x, dy = py - fix.y, dz = pz - fix.z;
                            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
                            const vx1 = dx * Math.cos(-fix.tilt) - dy * Math.sin(-fix.tilt);
                            const vy1 = dx * Math.sin(-fix.tilt) + dy * Math.cos(-fix.tilt);
                            const vz1 = dz;
                            const vx2 = vx1 * Math.cos(-fix.spin) + vz1 * Math.sin(-fix.spin);
                            const vy2 = vy1, vz2 = -vx1 * Math.sin(-fix.spin) + vz1 * Math.cos(-fix.spin);
                            const angleRad = dist > 0 ? Math.acos(Math.abs(vy2) / dist) : 0;
                            const azimuthDeg = (Math.atan2(vz2, vx2) * 180 / Math.PI) + 90;
                            
                            let I = isIesActive ? Photometrics.getIESIntensity(state.iesData, angleRad * 180 / Math.PI, azimuthDeg) : (angleRad < Math.PI / 2 ? maxI * Math.pow(Math.cos(angleRad), n_power) : 0);
                            const incidence = toolId === 'vertical' ? (dist > 0 ? dx / dist : 0) : (dist > 0 ? Math.abs(dy) / dist : 1);
                            if (I > 0 && incidence > 0) totalLux += (I * incidence) / (dist*dist);
                        }
                        luxMatrix[ix][iy] = totalLux;
                        if (state.falseColor) {
                            cx.fillStyle = FalseColorEngine.getLuxColor(Math.round(totalLux));
                            cx.fillRect(ix, iy, 1, 1);
                        }
                    }
                }
                if (window.state.showIsolines !== false && window.drawIsolinesOnCanvas) {
                    window.drawIsolinesOnCanvas(cx, luxMatrix, resX, resY, state.falseColor);
                }
                const tex = new THREE.CanvasTexture(cvs); tex.minFilter = THREE.LinearFilter; return tex;
            };

            floorMat = new THREE.MeshBasicMaterial({ map: buildDynamicFloor(), side: THREE.DoubleSide, depthWrite: true });
            const renderMesh = new THREE.Mesh(new THREE.PlaneGeometry(floorSize, toolId === 'vertical' ? h : floorSize), floorMat);
            
            if (toolId === 'vertical') {
                renderMesh.rotation.y = -Math.PI / 2; renderMesh.position.set(state.dist || 1, h / 2, 0); this.solidGroup.add(renderMesh);
                const roofGuide = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, h, -floorSize/2), new THREE.Vector3(0, h, floorSize/2)]), new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.2 }));
                this.solidGroup.add(roofGuide);
                const ceilLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(state.dist || 1, h, -floorSize/2), new THREE.Vector3(state.dist || 1, h, floorSize/2)]), new THREE.LineBasicMaterial({ color: 0xd97706, linewidth: 2 }));
                this.solidGroup.add(ceilLine);
                const fW = state.frameW || 1.2, fH = state.frameH || 0.8, fY = (state.dist || 1) - 0.01, hq = state.hq || 1.6;
                const frameLines = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(fW, fH)), new THREE.LineBasicMaterial({ color: 0x94a3b8, linewidth: 2 }));
                frameLines.rotation.y = -Math.PI / 2; frameLines.position.set(fY, hq, 0); this.solidGroup.add(frameLines);
            } else {
                renderMesh.rotation.x = -Math.PI / 2; this.solidGroup.add(renderMesh);
            }

            const mRatio = state ? (state.mRatio || 0.52) : 0.52;
            let lightColor = mRatio < 0.5 ? 0xf59e0b : (mRatio > 0.8 ? 0xbae6fd : 0xffbf00);
            const coneMat = new THREE.MeshBasicMaterial({ color: lightColor, transparent: true, opacity: 0.12 * luxFactor, side: THREE.DoubleSide, depthWrite: false });
            const sourceLensMat = new THREE.MeshLambertMaterial({ color: lightColor, emissive: lightColor, emissiveIntensity: 2 });
            const sourceLensGeo = new THREE.CircleGeometry(0.12, 16);
            const fixGeo = new THREE.SphereGeometry(0.06, 16, 16), fixMat = new THREE.MeshBasicMaterial({ color: 0xd97706 });

            const drawSource = (posX: number, posZ: number, rotZ: number) => {
                const tiltGrp = new THREE.Group(); tiltGrp.position.set(posX, h, posZ); tiltGrp.rotation.z = rotZ;
                const spinGrp = new THREE.Group(); spinGrp.rotation.y = (state.spin || 0) * Math.PI / 180; tiltGrp.add(spinGrp); this.solidGroup.add(tiltGrp);

                if (hasIes && webGroup.children.length > 0) {
                    tiltGrp.add(new THREE.Mesh(fixGeo, fixMat));
                    if (window.state.showPolar !== false) { const mesh = webGroup.clone(); spinGrp.add(mesh); }
                } else {
                    tiltGrp.add(new THREE.Mesh(fixGeo, fixMat));
                    const lensMesh = new THREE.Mesh(sourceLensGeo, sourceLensMat); lensMesh.rotation.x = Math.PI / 2; lensMesh.position.y = -0.01; tiltGrp.add(lensMesh);
                    const beamAngleRad = (state.beam || 30) * Math.PI / 180 / 2;
                    if (window.state.showPolar !== false) {
                        const coneGeo = new THREE.CylinderGeometry(0.12, Math.tan(beamAngleRad) * h, h, 32, 1, true); coneGeo.translate(0, -h/2, 0);
                        tiltGrp.add(new THREE.Mesh(coneGeo, coneMat));
                    }
                    const spotLight = new THREE.SpotLight(lightColor, 4.0 * luxFactor); spotLight.position.set(0, 0, 0); spotLight.angle = beamAngleRad; spotLight.penumbra = 0.5; spotLight.distance = h * 3 * Math.max(luxFactor, 1.0);
                    const targetObj = new THREE.Object3D(); targetObj.position.set(0, -h, 0); tiltGrp.add(targetObj); spotLight.target = targetObj; tiltGrp.add(spotLight);
                }
            };

            if (toolId === 'vertical') {
                const qty = state.qty || 1, spacing = state.spacing || 1.0, startZ = -((qty - 1) * spacing) / 2;
                for (let i = 0; i < qty; i++) drawSource(0, startZ + (i * spacing), baseTiltRad);
                if (this._lastToolRendered !== toolId) {
                    this.camera.position.set(-(state.dist||1) * 1.5, h * 0.8, (state.dist||1) * 2.5); 
                    this.controls.target.set((state.dist||1), state.hq || 1.6, 0);
                }
            } else {
                if (state.viewMode === 'array') {
                    const tiltMode3D = document.querySelector<HTMLInputElement>('input[name="p_tilt_mode"]:checked')?.value || 'same';
                    drawSource(-(state.spacing||2)/2, 0, baseTiltRad); drawSource((state.spacing||2)/2, 0, tiltMode3D === 'cross' ? -baseTiltRad : baseTiltRad);
                } else drawSource(0, 0, baseTiltRad);
                const axesHelper = new THREE.AxesHelper(2); axesHelper.position.set(0, h, 0); this.solidGroup.add(axesHelper);
                if (this._lastToolRendered !== toolId) {
                    this.camera.position.set(5, h + 2, 5); this.controls.target.set(0, h / 2, 0);
                }
            }
            this._lastToolRendered = toolId;
        }
        this.scene.add(this.solidGroup); this.controls.update();
    }
}