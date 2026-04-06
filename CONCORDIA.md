# Manifesto de Sincronia - Projeto Lighting SaaS

## Estado Atual da Arquitetura
- **Padrão:** Clean Architecture / DDD.
- **Camadas:** Domain (Entidades), Application (Use Cases), Infrastructure (Adapters).
- **Segurança:** Isolamento por `organization_id` em todas as queries.

## Convenções Técnicas
- **Tipagem:** TypeScript Strict (Proibido uso de `any`).
- **Validadores:** Zod para schemas de entrada e saída.
- **Cálculos:** Fórmulas fotométricas centralizadas em `src/domain/lighting/formulas.ts`.

## Últimas Alterações Relevantes (Log)
- [05/04/2026]: Separação de Preocupações (SoC): Lógica de orquestração movida do index.html para src/main.ts.
- [05/04/2026]: Implementação do Single Source of Truth (SSOT) via CONCORDIA.md.
- [05/04/2026]: Refatoração do Canvas2DEngine: Integração com a Lei do Cosseno Cúbico do domínio Photometrics.
- [05/04/2026]: Normalização do cálculo de Iluminância Vertical (E_vert) para ferramentas de destaque.
- [05/04/2026]: Otimização do RadiosityEngine: Remoção de lógica matemática duplicada e integração estrita com o Domínio (preparação para Web Workers).
- [05/04/2026]: Implementação de Web Workers (RadiosityWorker.ts): Delegação de cálculos de malha ponto a ponto para Threads secundárias (Non-blocking UI, High Performance).
- [05/04/2026]: Implementação de Segurança Multitenant via Zod (AuthManager.ts): Validação estrita de contexto de utilizador (Zero Trust Architecture) antes de expor a interface.
- [05/04/2026]: Upgrade Motor 3D (Photometric3DEngine.ts): Substituição do render em arame por um Algoritmo de Triangulação de Sólido Fotométrico com Mapeamento de Cores e Transmission (vidro iluminado).
- [05/04/2026]: Evolução do SSOT Normativo (Nbr8995Database.ts): Implementação de tipagem estrita de planos de auditoria (LP - Piso / HP - Mesa) para validação contextual de malha.
- [05/04/2026]: Refatoração de UI/UX (index.html): Adição de Tags de Transparência Técnica (UGR ESTIMADO), rótulos contextuais de auditoria NBR e controles avançados de Sólido Fotométrico no 3D.
- [05/04/2026]: Integração de Lógica Adaptativa NBR (main.ts): Orquestração do cálculo dinâmico (LP/HP) na interface e gerador de PDF, espelhando o Single Source of Truth do banco de dados.
- [05/04/2026]: Clipping 3D Físico (Photometric3DEngine.ts): Implementação de WebGL Clipping Planes dinâmicos (Piso e Paredes) atrelados às medidas do ambiente para restrição visual impecável de cones e malhas fotométricas IES.

## Estado Atual da Árvore de Arquivos
- index.html: Apenas View (Tailwind + Estrutura).
- src/main.ts: Ponto de entrada, inicialização do Supabase e ponte Global Window.
- src/domain/: Lógica pura de iluminação ($lx$, $cd$, $UGR$).
- src/infrastructure/: Motores de renderização (Three.js, Canvas2D).
- [DATA ATUAL]: Modularização do HTML concluída via AI Studio.
- [DATA ATUAL]: Definição de padrões de iluminância (LuxSintax).

## Regras para a IA
1. Antes de sugerir código, verifique se a convenção de `organization_id` está mantida.
2. Ao terminar uma tarefa, atualize este log para que a outra IA saiba o que foi feito.