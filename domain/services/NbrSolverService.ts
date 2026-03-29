import { 
  NbrEnvironmentRule, 
  LightingProjectResult, 
  NbrComplianceReport, 
  MetricEvaluation,
  NbrEnvironmentRuleSchema,
  LightingProjectResultSchema
} from '../entities/NbrStandard';

export class NbrSolverService {
  /**
   * Avalia os resultados contra a NBR 8995-1.
   */
  public evaluateCompliance(
    rule: NbrEnvironmentRule,
    result: LightingProjectResult
  ): NbrComplianceReport {
    // Validação de segurança para garantir que os dados são válidos
    const validatedRule = NbrEnvironmentRuleSchema.parse(rule);
    const validatedResult = LightingProjectResultSchema.parse(result);

    const emEvaluation = this.evaluateEm(validatedRule.requiredEm, validatedResult.calculatedEm);
    const ugrEvaluation = this.evaluateUgr(validatedRule.maxUgr, validatedResult.calculatedUgr);
    const criEvaluation = this.evaluateCri(validatedRule.minCri, validatedResult.calculatedCri);

    const evaluations: MetricEvaluation[] = [emEvaluation, ugrEvaluation, criEvaluation];

    const allPassed = evaluations.every((e) => e.passed);
    
    // Lógica de "Warning": Se a iluminância estiver até 10% abaixo, mas o resto ok.
    const isWarning = !allPassed && this.isAcceptableWarning(emEvaluation) && ugrEvaluation.passed && criEvaluation.passed;

    let status: 'APPROVED' | 'REJECTED' | 'WARNING' = 'REJECTED';
    if (allPassed) {
      status = 'APPROVED';
    } else if (isWarning) {
      status = 'WARNING';
    }

    return {
      environmentName: validatedRule.environmentName,
      status,
      evaluations,
      timestamp: new Date(),
    };
  }

  private evaluateEm(required: number, calculated: number): MetricEvaluation {
    const passed = calculated >= required;
    const deviationPercentage = ((calculated - required) / required) * 100;

    return {
      metric: 'Em',
      required,
      calculated,
      passed,
      deviationPercentage: Number(deviationPercentage.toFixed(2)),
    };
  }

  private evaluateUgr(maxAllowed: number, calculated: number): MetricEvaluation {
    const passed = calculated <= maxAllowed;
    const deviationPercentage = ((calculated - maxAllowed) / maxAllowed) * 100;

    return {
      metric: 'UGR',
      required: maxAllowed,
      calculated,
      passed,
      deviationPercentage: Number(deviationPercentage.toFixed(2)),
    };
  }

  private evaluateCri(minRequired: number, calculated: number): MetricEvaluation {
    const passed = calculated >= minRequired;
    const deviationPercentage = ((calculated - minRequired) / minRequired) * 100;

    return {
      metric: 'CRI',
      required: minRequired,
      calculated,
      passed,
      deviationPercentage: Number(deviationPercentage.toFixed(2)),
    };
  }

  private isAcceptableWarning(emEvaluation: MetricEvaluation): boolean {
    return !emEvaluation.passed && emEvaluation.deviationPercentage >= -10.00;
  }
}