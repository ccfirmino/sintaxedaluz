
import { z } from 'zod';

export const NbrEnvironmentRuleSchema = z.object({
  id: z.string().uuid().optional(),
  environmentName: z.string().min(3, "O nome do ambiente deve ter no mínimo 3 caracteres."),
  requiredEm: z.number().positive("A iluminância média (Em) deve ser maior que zero."),
  maxUgr: z.number().positive("O limite de UGR deve ser um valor positivo."),
  minCri: z.number().int().positive("O IRC mínimo (Ra) deve ser um número inteiro positivo."),
});

export type NbrEnvironmentRule = z.infer<typeof NbrEnvironmentRuleSchema>;

export const LightingProjectResultSchema = z.object({
  calculatedEm: z.number().nonnegative("O cálculo de iluminância não pode ser negativo."),
  calculatedUgr: z.number().nonnegative("O cálculo de UGR não pode ser negativo."),
  calculatedCri: z.number().nonnegative("O cálculo de IRC não pode ser negativo."),
});

export type LightingProjectResult = z.infer<typeof LightingProjectResultSchema>;

export type ComplianceStatus = 'APPROVED' | 'REJECTED' | 'WARNING';

export interface MetricEvaluation {
  metric: 'Em' | 'UGR' | 'CRI';
  required: number;
  calculated: number;
  passed: boolean;
  deviationPercentage: number;
}

export interface NbrComplianceReport {
  environmentName: string;
  status: ComplianceStatus;
  evaluations: MetricEvaluation[];
  timestamp: Date;
}