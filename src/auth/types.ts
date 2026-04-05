// src/domain/auth/types.ts
import { z } from 'zod';

/**
 * Schema de contexto de execução (Multitenant Security).
 * Garante em tempo de execução que nenhum utilizador aceda ao sistema sem uma identidade validada.
 */
export const TenantContextSchema = z.object({
    userId: z.string().uuid({ message: "ID de utilizador inválido ou ausente." }),
    email: z.string().email(),
    organizationId: z.string().uuid().optional(), // Preparado para expansão B2B (Múltiplos utilizadores na mesma empresa)
    role: z.string().default('LIGHTING_DESIGNER'),
});

// Tipo inferido automaticamente pelo Zod
export type TenantContext = z.infer<typeof TenantContextSchema>;

/**
 * Interface obrigatória para qualquer serviço que aceda à base de dados
 * ou execute exportação de relatórios confidenciais.
 */
export interface ISecureLightingService {
    validateAccess(context: TenantContext): boolean;
}