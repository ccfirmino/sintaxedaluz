// src/infrastructure/services/ExcelParser.ts
import { z } from 'zod';
import { t } from '../i18n/i18nEngine'; // 1. Importação do motor de tradução

// 1. Definição Estrita do Schema (Contrato de Dados Universal)
const MasterFixtureSchema = z.object({
    id: z.number(),
    code: z.string().default("LUM-XX"),
    label: z.string().min(1).default("Luminária Importada"),
    // 2. Trocando as mensagens fixas pelas chaves do dicionário
    qty: z.number().int().positive({ message: "errors.qty_min" }).default(1),
    power: z.number().nonnegative({ message: "errors.power_neg" }).default(0),

    // Características Físicas & Fotometria
    cct: z.number().nullable().optional(),
    flux: z.number().nullable().optional(),
    efficacy: z.number().nullable().optional(),
    cri: z.number().nullable().optional(),
    beamAngle: z.number().nullable().optional(),
    dimensions: z.object({
        height: z.number().optional(),
        width: z.number().optional(),
        length: z.number().optional()
    }).optional(),

    // Descritivos Físicos
    mounting: z.string().nullable().optional(),
    lightSource: z.string().nullable().optional(),
    finish: z.string().nullable().optional(),
    controlGear: z.string().nullable().optional(),

    // Mercado & Custos
    manufacturer: z.string().nullable().optional(),
    unitPrice: z.number().nullable().optional(),
    link: z.string().nullable().optional(),
});

const MasterRoomSchema = z.object({
    id: z.number(),
    floor: z.string().default("Geral"),
    name: z.string().min(1).default("Ambiente Não Nomeado"),
    // 2. Trocando a mensagem da área
    area: z.number().nonnegative({ message: "errors.area_neg" }).default(0),
    baseLpd: z.number().default(0),
    typology: z.string().default(""),
    leedCategory: z.enum(['interior', 'facade', 'exterior']).default('interior'),
    expanded: z.boolean().default(false),
    fixtures: z.array(MasterFixtureSchema)
});

const MasterProjectExportSchema = z.array(MasterRoomSchema);

export class ExcelParser {
    /**
     * Extrai propriedades físicas fotométricas aglutinadas em textos descritivos.
     * Converte dimensões capturadas em milímetros (mm) diretamente para metros (m).
     */
    private static extractPhysicalAttributes(text: string) {
        if (!text) return {};
        const safeText = text.toUpperCase();

        const parseNum = (match: RegExpMatchArray | null) => match ? parseFloat(match[1].replace(',', '.')) : undefined;

        const powerMatch = safeText.match(/(\d+(?:\.\d+)?)\s?W\b/);
        const cctMatch = safeText.match(/(\d{3,4})\s?K\b/);
        const fluxMatch = safeText.match(/(\d+(?:\.\d+)?)\s?LM\b/);
        const criMatch = safeText.match(/(?:IRC|CRI)\s?(\d{2,3})\b/);
        const beamMatch = safeText.match(/(\d+(?:\.\d+)?)\s?[º°]/);

        const h = parseNum(safeText.match(/H\s?(\d+(?:[.,]\d+)?)/));
        const w = parseNum(safeText.match(/[L|W]\s?(\d+(?:[.,]\d+)?)/));
        const l = parseNum(safeText.match(/C\s?(\d+(?:[.,]\d+)?)/));

        return {
            power: parseNum(powerMatch),
            cct: parseNum(cctMatch),
            flux: parseNum(fluxMatch),
            cri: parseNum(criMatch),
            beamAngle: parseNum(beamMatch),
            dimensions: (h || w || l) ? {
                height: h ? h / 1000 : undefined,
                width: w ? w / 1000 : undefined,
                length: l ? l / 1000 : undefined,
            } : undefined
        };
    }

    /**
     * Extrai APENAS o cabeçalho da planilha (Necessário para o Wizard de Mapeamento - Fase 1)
     */
    static async extractHeaders(file: File): Promise<string[]> {
        return new Promise((resolve, reject) => {
            // 3. Traduzindo o erro de infraestrutura
            if (!(window as any).XLSX) return reject(new Error(t("errors.xlsx_missing")));
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target!.result as ArrayBuffer);
                    const workbook = (window as any).XLSX.read(data, {type: 'array'});
                    const firstSheet = workbook.SheetNames[0];
                    const rows = (window as any).XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { header: 1 });
                    if (rows.length > 0) resolve(rows[0] as string[]);
                    else resolve([]);
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Extrai, normaliza e VALIDA os dados de ambientes e luminárias de um buffer Excel.
     * Suporta Dicionário Híbrido: Memória do Usuário (Nível 3) + Fuzzy Matching (Nível 1).
     */
    static async parseMasterSpreadsheet(file: File, customMapping: Record<string, string> = {}): Promise<any[]> {
        return new Promise((resolve, reject) => {
            if (!(window as any).XLSX) {
                // 3. Traduzindo o erro
                return reject(new Error(t("errors.xlsx_missing")));
            }

            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target!.result as ArrayBuffer);
                    const workbook = (window as any).XLSX.read(data, {type: 'array'});
                    const firstSheet = workbook.SheetNames[0];
                    const rows = (window as any).XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);

                    const roomMap = new Map();

                    // Motor de Limpeza Numérica Universal (Trata R$ 1.500,50 e $ 1,500.50)
                    const parseUniversalNumber = (val: any) => {
                        if (val === null || val === undefined || val === '') return null;
                        if (typeof val === 'number') return val;
                        const str = String(val).toLowerCase();
                        const cleanStr = str.replace(/[^0-9.,-]/g, '');
                        if (!cleanStr) return null;
                        
                        let normalized = cleanStr;
                        if (cleanStr.includes(',') && cleanStr.includes('.')) {
                            if (cleanStr.lastIndexOf(',') > cleanStr.lastIndexOf('.')) {
                                normalized = cleanStr.replace(/\./g, '').replace(',', '.');
                            } else {
                                normalized = cleanStr.replace(/,/g, '');
                            }
                        } else if (cleanStr.includes(',')) {
                            normalized = cleanStr.replace(',', '.');
                        }
                        const parsed = parseFloat(normalized);
                        return isNaN(parsed) ? null : parsed;
                    };

                    rows.forEach((row: any) => {
                        const getVal = (fieldKey: string, aliases: string[]) => {
                            if (customMapping && customMapping[fieldKey] && row[customMapping[fieldKey]] !== undefined) {
                                return row[customMapping[fieldKey]];
                            }
                            const key = Object.keys(row).find(k => aliases.some(a => k.toLowerCase().includes(a)));
                            return key ? row[key] : null;
                        };

                        const floor = getVal('floor', ['pavimento', 'andar', 'nivel', 'level', 'floor']) || "Geral";
                        const roomName = getVal('roomName', ['ambiente', 'sala', 'nome', 'room', 'espaco', 'space', 'area']) || "Ambiente Não Nomeado";
                        const code = getVal('code', ['cód', 'cod', 'código', 'id', 'tag', 'ref', 'code', 'type mark']) || "LUM-XX";
                        const description = getVal('label', ['luminaria', 'luminária', 'modelo', 'equipamento', 'descrição', 'description', 'fixture', 'produto', 'tipo']) || "Luminária Importada";
                        const physData = ExcelParser.extractPhysicalAttributes(String(description));
                        
                        const rawPower = getVal('power', ['potencia', 'potência', 'w', 'watts', 'carga', 'power', 'wattage', 'load']);
                        const power = parseUniversalNumber(rawPower) || physData.power || 0;
                        
                        const rawQty = getVal('qty', ['qtd', 'qt', 'quantidade', 'quant', 'qtde', 'unid', 'unidades', 'peca', 'peça', 'pcs', 'pçs', 'qty', 'quantity', 'amount']);
                        let qty = 1;
                        if (rawQty !== null && rawQty !== undefined) {
                            const cleanQty = parseUniversalNumber(rawQty);
                            if (cleanQty && cleanQty > 0) qty = Math.floor(cleanQty);
                        }

                        const currentArea = parseUniversalNumber(getVal('area', ['area', 'área', 'm2', 'm²'])) || 0;

                        let cct = parseUniversalNumber(getVal('cct', ['cct', 'temperatura', 'cor', 'kelvin', 'k', 'tonalidade', 'temp', 'tc', 'color temperature'])) || physData.cct;
                        if (cct !== null && cct !== undefined && cct < 100 && cct > 0) cct = cct * 1000; 

                        const flux = parseUniversalNumber(getVal('flux', ['fluxo', 'lúmens', 'lumens', 'lm', 'emissão', 'luminoso', 'flux', 'output'])) || physData.flux;
                        const efficacy = parseUniversalNumber(getVal('efficacy', ['eficiência', 'eficiencia', 'lm/w', 'rendimento', 'efficacy', 'efficiency']));
                        const cri = parseUniversalNumber(getVal('cri', ['irc', 'cri', 'r9', 'reprodução', 'reproducao', 'índice', 'color rendering'])) || physData.cri;
                        const beamAngle = parseUniversalNumber(getVal('beamAngle', ['facho', 'abertura', 'ângulo', 'angulo', 'graus', '°', 'feixe', 'beam', 'spread'])) || physData.beamAngle;

                        const unitPrice = parseUniversalNumber(getVal('unitPrice', ['custo', 'valor', 'preço', 'preco', 'r$', 'unitário', 'unitario', 'orçamento', 'compra', 'cost', 'price', '$', 'usd']));
                        
                        const mounting = getVal('mounting', ['aplicação', 'montagem', 'instalação', 'família', 'type', 'mounting', 'application', 'tipologia']);
                        const lightSource = getVal('lightSource', ['fonte', 'lâmpada', 'lampada', 'led', 'bulbo', 'soquete', 'source', 'lamp', 'bulb']);
                        const finish = getVal('finish', ['acabamento', 'pintura', 'cor da peça', 'material', 'finish', 'housing']);
                        const controlGear = getVal('controlGear', ['driver', 'reator', 'equipamento auxiliar', 'dimerização', 'dali', 'gear', 'ballast', 'dimming', 'auxiliar']);
                        const manufacturer = getVal('manufacturer', ['fabricante', 'marca', 'fornecedor', 'loja', 'manufacturer', 'brand', 'vendor', 'make']);
                        const link = getVal('link', ['link', 'url', 'site', 'página', 'catálogo', 'catalog', 'webpage']);

                        const uniqueKey = `${floor}_${roomName}`;

                        if (!roomMap.has(uniqueKey)) {
                            roomMap.set(uniqueKey, {
                                id: Date.now() + Math.random(),
                                floor: String(floor).trim(),
                                name: String(roomName).trim(),
                                area: currentArea,
                                baseLpd: 0,
                                typology: "", 
                                leedCategory: "interior",
                                expanded: false, 
                                fixtures: []
                            });
                        }

                        const roomObj = roomMap.get(uniqueKey);
                        if (currentArea > roomObj.area) roomObj.area = currentArea;

                        roomObj.fixtures.push({
                            id: Date.now() + Math.random(),
                            code: String(code).trim(),
                            label: String(description).trim(),
                            power: power,
                            qty: qty,
                            cct: cct,
                            flux: flux,
                            efficacy: efficacy,
                            cri: cri,
                            beamAngle: beamAngle,
                            mounting: mounting ? String(mounting).trim() : null,
                            lightSource: lightSource ? String(lightSource).trim() : null,
                            finish: finish ? String(finish).trim() : null,
                            controlGear: controlGear ? String(controlGear).trim() : null,
                            manufacturer: manufacturer ? String(manufacturer).trim() : null,
                            unitPrice: unitPrice,
                            link: link ? String(link).trim() : null,
                            dimensions: physData.dimensions
                        });
                    });

                    // 6. Validação Zero Trust (Zod) da Planilha Mestra
                    const newRooms = Array.from(roomMap.values());
                    const validatedData = MasterProjectExportSchema.parse(newRooms);
                    
                    resolve(validatedData);

                } catch (err) {
                    if (err instanceof z.ZodError) {
                        console.error("[ExcelParser] Erro de Validação Zod:", err.errors);
                        // 3. Traduzindo o erro do Zod (Falha de Validação)
                        reject(new Error(t("errors.zod_invalid")));
                    } else {
                        console.error("[ExcelParser] Falha na leitura do buffer:", err);
                        // 3. Traduzindo erro de arquivo corrompido
                        reject(new Error(t("errors.file_corrupted")));
                    }
                }
            };
            
            // 3. Traduzindo erro de I/O físico
            reader.onerror = () => reject(new Error(t("errors.read_error")));
            reader.readAsArrayBuffer(file);
        });
    }
}