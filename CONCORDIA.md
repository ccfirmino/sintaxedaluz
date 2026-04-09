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
- [05/04/2026]: Calibração Física Direta (RadiosityEngine.ts): Remoção do falso rebatimento indireto. O motor agora calcula estritamente a iluminância direta via Lei do Cosseno Cúbico depreciada pelo Fator de Manutenção (FM), garantindo exatidão fotométrica e honestidade técnica em estudos preliminares.
- [05/04/2026]: Clipping 3D Físico (Photometric3DEngine.ts): Implementação de WebGL Clipping Planes dinâmicos (Piso e Paredes) atrelados às medidas do ambiente para restrição visual impecável de cones e malhas fotométricas IES.
- [05/04/2026]: Integração Algorítmica (Canvas2D & Radiosity): Implementação de algoritmo físico Marching Squares para plotagem de Isolinhas Vetoriais dinâmicas e calibração de malha térmica integrando coeficientes U (Reflexão Indireta) e FM (Depreciação Lúminosa).
- [06/04/2026]: Ergonomia e Unicidade Geométrica (Ponto a Ponto Vertical): Agrupamento contextual de inputs na View (Altura/Distância e Tilt/Spin). Padronização do Eixo Azimutal (Spin = 180º) entre motores 2D e 3D para coerência rotacional de arquivos IES. Implementação de algoritmo de busca de Hotspot (E_max) isolado no Domínio Fotométrico com plotagem visual no Canvas.
- [06/04/2026]: Sincronia de Rotação Azimutal (Motores 3D e Radiosidade): Aplicação de matriz de rotação inversa (Spin +90º) nos ficheiros Photometric3DEngine.ts e RadiosityEngine.ts, garantindo a correspondência exata entre o Sólido Fotométrico visual e a malha térmica de falsa cor (Heatmap) gerada por raycasting.
- [06/04/2026]: Evolução do Ponto a Ponto Horizontal: Reordenação ergonômica da interface (Grid lado-a-lado). Inserção do toggle de Curva Polar no modo 3D. Implementação do sistema de Comportamento de Tilt dinâmico (Mesmo Lado / Invertido) para estudos de facho em matriz (Array), com sincronia matemática vetorial aplicada simultaneamente no Canvas2DEngine e Photometric3DEngine.
- [06/04/2026]: Refatoração UI/UX (Módulo LEED): Reestruturação dos cards de ambiente para layout Data Row compacto, otimizando a densidade de informação visual.
- [06/04/2026]: Otimização de Performance (Módulo LEED): Implementação de manipulação de estado DOM Anti-Flicker (display toggle) na expansão de ambientes, prevenindo re-renderização excessiva (DOM Thrashing).
- [06/04/2026]: Evolução de Regra de Negócio (Interface e Domínio): Inserção de suporte matemático (`StandardsEngine.ts`) e de interface para Meta de Redução LPD Customizada.
- [06/04/2026]: Compliance Legal (ReportExporter): Injeção automática de Disclaimer Técnico (Hold Harmless clause) nos relatórios PDF gerados, protegendo a plataforma juridicamente.
- [06/04/2026]: Módulo de Auditoria e Performance (Fase 1 - Elétrica): Criação da aba "Auditoria & Performance". Implementação do ElectricalEngine.ts no Domínio para cálculo de Queda de Tensão (Driver Intelligence).
- [06/04/2026]: Módulo de Auditoria e Performance (Fase 2 - HCL): Implementação do HCLEngine.ts no Domínio. Cálculo do m-EDI (Melanopic Equivalent Daylight Illuminance) para validação de ciclo circadiano e certificação WELL.
- [06/04/2026]: Módulo de Auditoria e Performance (Fase 3 - ESG & ROI): Implementação do ESGEngine.ts no Domínio. Cálculo dinâmico de Payback, economia de energia em R$ e compensação de Carbono (CO2 convertido em árvores/ano).
- [07/04/2026]: Refatoração Sistêmica (Driver Intelligence Hub): Migração do "Guardião Elétrico" para a aba Driver. Implementação de Dashboard visual para dimensionamento de fontes com Auditoria de Carga (80% Safety Margin) e sugestões de Topologia.
- [07/04/2026]: Upgrade do Motor ESG (ESGEngine.ts): Inclusão de variáveis de Climatização (HVAC) e Custos de Manutenção (OPEX) para cálculo de ROI Enterprise.
- [07/04/2026]: Refinamento HCL: Adição de alertas contextuais sobre Iluminância Vertical (Ev) para conformidade técnica com WELL v2.
- [08/04/2026]: Implementação de Infraestrutura PWA (Progressive Web App). Criação de manifest.json e sw.js. Injeção de lógica de interceptação 'beforeinstallprompt' em main.ts e botão dinâmico de instalação desktop no header (index.html).
- [08/04/2026]: Refinamento de UX/UI. Atualização da tag 'name' no manifest.json para simplificação do atalho desktop e injeção do Favicon global no index.html.
- [08/04/2026]: Refinamento de UI (PWA). Simplificação da tag <title> no index.html para remoção de redundância e polimento do cabeçalho na janela standalone do Desktop.
- [08/04/2026]: Refatoração UI/UX: Reordenação dos módulos na barra de navegação (Priorização da Auditoria) e redesenho estrutural do painel de Auditoria NBR 8995-1 (Maior legibilidade de dados, tags contextuais e suporte nativo a internacionalização de texto no motor TS).
- [08/04/2026]: Implementação de Internacionalização Inteligente (i18n) na camada de infraestrutura (ReportExporter). Relatórios em PDF agora herdam o idioma do estado global (window.currentLang) puxando tags do dicionário. Refatoração UI do Painel de Auditoria NBR e ordenação lógica dos botões de navegação no header.
- [08/04/2026]: Correção de Algoritmo. Implementação de trava de arredondamento (Floating Point Precision) na ponte UI-Estado (main.ts), garantindo que as conversões do sistema Imperial (pés) para o sistema Métrico não deturpem os algoritmos de cálculo de índice de recinto do Método dos Lúmens.
- [08/04/2026]: Integração Analítica (GA4). Injeção de rastreadores de Virtual Page Views no switchTool e mapeamento de Macro-Conversões (generate_report) nos métodos de exportação de PDF, garantindo a coleta de dados de engajamento na arquitetura Single Page Application.
- [08/04/2026]: Sprint 2 (Renascimento Elétrico). Refatoração massiva do ElectricalEngine.ts e integração avançada no main.ts. O sistema agora audita limites de comprimento contínuo da fita LED (Topologia Física) cruzando voltagem (12V/24V) contra as perdas no cabo (Voltage Drop), exigindo divisão de circuitos (Paralelo) para garantir a segurança da infraestrutura do cliente.
- [08/04/2026]: Sprint 3 (Auditor Circadiano). Refatoração do HCLEngine.ts para implementar auditoria implacável de saúde humana (WELL v2 / Neurociência). O sistema agora emite Alerta Crítico de Supressão de Melatonina em cenários noturnos utilizando espectros frios (>4000K) e alerta de "Ambiente Adormecido" para escritórios diurnos com m-EDI inferior a 250.
- [09/04/2026]: Refatoração do Domínio HCL (HCLEngine.ts). Implementação de algoritmos físicos de Transmitância do Cristalino (Correção por Idade) e integração do Modelo LRC (Circadian Stimulus) isolados da UI.

## Estado Atual da Árvore de Arquivos
- index.html: Apenas View (Tailwind + Estrutura).
- src/main.ts: Ponto de entrada, orquestrador de estado global e ponte Window.
- src/domain/: Lógica pura matemática e física (Fotometria, Elétrica, Normas, ESG).
- src/infrastructure/: Motores de renderização (Three.js, Canvas2D) e exportação.
- [DATA ATUAL]: Modularização do HTML concluída via AI Studio.
- [07/04/2026]: Implementação do Dashboard de Auditoria & Performance e Driver Hub concluídos.

## Regras para a IA
1. Antes de sugerir código, verifique se a convenção de `organization_id` está mantida.
2. Ao terminar uma tarefa, atualize este log para que a outra IA saiba o que foi feito.