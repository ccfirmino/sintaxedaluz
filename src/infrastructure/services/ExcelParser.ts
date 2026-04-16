// src/infrastructure/services/ExcelParser.ts
import { z } from 'zod';

// 1. Definição Estrita do Schema (Contrato de Dados da Clean Architecture)
const LeedFixtureSchema = z.object({
    id: z.number(),
    label: z.string().min(1).default("Luminária Importada"),
    power: z.number().nonnegative("Potência não pode ser negativa").default(0),
    qty: z.number().int().positive("Quantidade deve ser no mínimo 1").default(1)
});

const LeedRoomSchema = z.object({
    id: z.number(),
    floor: z.string().default("Geral"),
    name: z.string().min(1).default("Ambiente Não Nomeado"),
    area: z.number().nonnegative("Área não pode ser negativa").default(0),
    baseLpd: z.number().default(0),
    typology: z.string().default(""),
    leedCategory: z.enum(['interior', 'facade', 'exterior']).default('interior'),
    expanded: z.boolean().default(false),
    fixtures: z.array(LeedFixtureSchema)
});

const LeedProjectExportSchema = z.array(LeedRoomSchema);

export class ExcelParser {
    /**
     * Extrai, normaliza e VALIDA os dados de ambientes e luminárias de um buffer Excel.
     */
    static async parseLeedRooms(file: File): Promise<any[]> {
        return new Promise((resolve, reject) => {
            if (!(window as any).XLSX) {
                return reject(new Error("Motor XLSX não carregado. Tente novamente em alguns segundos."));
            }

            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target!.result as ArrayBuffer);
                    const workbook = (window as any).XLSX.read(data, {type: 'array'});
                    const firstSheet = workbook.SheetNames[0];
                    const rows = (window as any).XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);

                    const roomMap = new Map();

                    rows.forEach((row: any) => {
                        const getVal = (aliases: string[]) => {
                            const key = Object.keys(row).find(k => aliases.some(a => k.toLowerCase().includes(a)));
                            return key ? row[key] : null;
                        };

                        const floor = getVal(['pavimento', 'andar', 'nivel', 'level']) || "Geral";
                        const roomName = getVal(['ambiente', 'sala', 'nome', 'room', 'espaco']) || "Ambiente Não Nomeado";
                        // LUXSINTAX: Fuzzymatcher expandido
                        const fixture = getVal(['cód', 'cod', 'código', 'id', 'tag', 'ref', 'luminaria', 'luminária', 'tipo', 'modelo', 'equipamento', 'nome']) || "Luminária Importada";
                        
                        // Proteção extra contra strings sujas vindas do Excel (ex: "15 W" ou "15,5")
                        const rawPower = getVal(['potencia', 'potência', 'w', 'watts', 'carga']);
                        const power = typeof rawPower === 'string' ? parseFloat(rawPower.replace(',', '.')) : (parseFloat(rawPower) || 0);
                        
                        // LUXSINTAX: Fuzzy matcher expandido para Padrões Brasileiros de Orçamentação
                        const rawQty = getVal(['qtd', 'qt', 'quantidade', 'quant', 'qtde', 'unid', 'unidades', 'peca', 'peça', 'pcs', 'pçs']);
                        let qty = 1;
                        if (rawQty !== null && rawQty !== undefined) {
                            const cleanQty = String(rawQty).replace(/[^0-9]/g, '');
                            const parsedQty = parseInt(cleanQty, 10);
                            if (!isNaN(parsedQty) && parsedQty > 0) qty = parsedQty;
                        }

                        const uniqueKey = `${floor}_${roomName}`;

                        if (!roomMap.has(uniqueKey)) {
                            roomMap.set(uniqueKey, {
                                id: Date.now() + Math.random(),
                                floor: String(floor).trim(),
                                name: String(roomName).trim(),
                                area: parseFloat(getVal(['area', 'área', 'm2', 'm²'])) || 0,
                                baseLpd: 0,
                                typology: "", 
                                leedCategory: "interior",
                                expanded: false, 
                                fixtures: []
                            });
                        }

                        const roomObj = roomMap.get(uniqueKey);
                        const currentArea = parseFloat(getVal(['area', 'área', 'm2', 'm²'])) || 0;
                        if (currentArea > roomObj.area) roomObj.area = currentArea;

                        if (power > 0) {
                            roomObj.fixtures.push({
                                id: Date.now() + Math.random(),
                                label: String(fixture).trim(),
                                power: power,
                                qty: qty
                            });
                        }
                    });

                    // 2. Validação Zero Trust (Zod) antes de devolver ao Orquestrador
                    const newRooms = Array.from(roomMap.values());
                    const validatedData = LeedProjectExportSchema.parse(newRooms);
                    
                    resolve(validatedData);

                } catch (err) {
                    if (err instanceof z.ZodError) {
                        console.error("[ExcelParser] Erro de Validação Zod:", err.errors);
                        reject(new Error("A planilha contém dados inválidos ou formatos matemáticos incorretos. Verifique os campos de área e potência."));
                    } else {
                        console.error("[ExcelParser] Falha na leitura do buffer:", err);
                        reject(new Error("Falha na importação. O arquivo pode estar corrompido."));
                    }
                }
            };
            
            reader.onerror = () => reject(new Error("Erro ao ler o arquivo físico."));
            reader.readAsArrayBuffer(file);
        });
    }
}