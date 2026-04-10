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
- [09/04/2026]: Unificação do Design System LuxSintax: Correção de inversão de cores (Surface Inversion) nos módulos HCL e ESG, e ajuste de tokens de contraste para o banner de viabilidade no Modo Claro.
- [09/04/2026]: Evolução Pedagógica do HCL: Implementação de Auto-scaling dinâmico no eixo Y (prevenção de clipping da curva), preenchimento com gradiente espectral e marcação técnica do pico melanópico em 480nm.
- [09/04/2026]: Refinamento de UI/UX e Consistência: Restauração do controle HCL no modo Vertical e padronização minimalista de Tooltips (atributo title) para parâmetros de CCT/Espectro em toda a plataforma.
- [09/04/2026]: Evolução Pedagógica do HCL: Implementação de Auto-scaling dinâmico no eixo Y (prevenção de clipping da curva), preenchimento com gradiente espectral e marcação técnica do pico melanópico em 480nm.
- [09/04/2026]: Refinamento de UI/UX e Consistência: Restauração do controle HCL no modo Vertical e padronização minimalista de Tooltips (atributo title) para parâmetros de CCT/Espectro em toda a plataforma.
- [09/04/2026]: Sprint de BIM & Produtividade (Módulo LEED): Integração do motor `SheetJS` no ambiente de View (`index.html`). Implementação de arquitetura `ExcelParser` (Hash Map) no orquestrador (`main.ts`) permitindo upload massivo de tabelas (.xlsx). Evolução do modelo de dados do estado local adicionando propriedades `floor` (Pavimento) e `area` (m²) ao schema dinâmico de `rooms`.
- [09/04/2026]: Evolução de Regra de Negócio (Módulo LEED): Implementação do conceito de "Context Grouping" no StandardsEngine.ts e main.ts. O sistema agora separa o cálculo de interiores, fachadas e áreas externas, aplicando a regra estrita de Anti-Trade-Off (Não-Compensação de Carga) da norma ASHRAE 90.1, e preparando a base para relatórios seccionados.
- [09/04/2026]: Evolução de Relatórios (ReportExporter.ts): Refatoração do motor de PDF-Lib para gerar relatórios divididos em seções (Zonas LEED). Injeção de blocos dinâmicos de Subtotal que evidenciam o "Context Grouping" aprovando ou reprovando Zonas Isoladas de Fachada, Exterior e Interior.
- [09/04/2026]: Evolução de Regra de Negócio (Módulo LEED): Expansão do algoritmo de Fuzzymatching na importação de planilhas Excel (main.ts). O sistema agora reconhece variações nominais (CÓD, ID, TAG, REF) garantindo a importação fidedigna da nomenclatura dos equipamentos especificados.
- [09/04/2026]: Refatoração Arquitetural (Clean Architecture): Extração da lógica de leitura e normalização de planilhas do main.ts para um serviço dedicado em src/infrastructure/services/ExcelParser.ts.
- [09/04/2026]: Evolução Arquitetural do Módulo ESG: Implementação de cálculo LCC (Life Cycle Costing) com Valor Presente Líquido (VPL), inflação energética (5%) e taxa de desconto (10%), utilizando padrão Progressive Disclosure no main.ts e ESGEngine.ts.
- [09/04/2026]: Atualização UI/UX: Injeção de Widget "CFO Mode" no Módulo ESG para controle de VPL. Evolução do HCLEngine.ts: Criação do método simulateCircadianJourney para avaliação temporal de supressão de melatonina (Turnos Diurnos e Noturnos).
- [09/04/2026]: Atualização UI/UX e View: Injeção de Widget "CFO Mode" no Módulo ESG do index.html para suporte ao Progressive Disclosure. Atualização do renderizador do Canvas (main.ts) consumindo o método 'simulateCircadianJourney' para desenhar a curva dinâmica de supressão da melatonina ao longo das 24 horas.
- [09/04/2026]: Expansão do Dicionário Normativo ASHRAE 90.1 (Módulo LEED): Injeção de tipologias físicas de suporte (Áreas Técnicas, Casas de Máquinas, Depósitos e Átrios) no `src/domain/standards/AshraeDatabase.ts`. Reforço da precisão do cálculo de LPD (Lighting Power Density) para auditorias de eficiência energética em projetos de alta complexidade (Enterprise).
- [09/04/2026]: Evolução UI/UX e Orquestração (Módulo LEED): Implementação de Arquitetura Reativa no `main.ts` (Progressive Disclosure) para suportar unidades físicas híbridas (Área em m² vs Comprimento Linear em m). Injeção de seletor global de Lighting Zones (LZ0-LZ4), garantindo sincronia ponta a ponta com o novo domínio de Exteriores (ASHRAE 90.1).
- [09/04/2026]: Refatoração Matemática Híbrida no StandardsEngine.ts. Implementação de suporte nativo a unidades lineares (W/m) e injeção dinâmica de Base Allowance atrelada a Lighting Zones (LZ0-LZ4) para conformidade total com áreas externas e fachadas da norma ASHRAE 90.1.
- [09/04/2026]: Evolução de Compliance no Exportador PDF (ReportExporter.ts): Injeção de tipagem dinâmica para unidades físicas híbridas (m² vs m Linear). O relatório gerado agora respeita perfeitamente as normativas ASHRAE 90.1 para cálculos de fachada, prevenindo erros em auditorias LEED devido a conversões indevidas de área.
- [09/04/2026]: Evolução de i18n (Dictionary.ts): Mapeamento cruzado e injeção de dicionário (PT/EN) para as features Enterprise recém-adicionadas: CFO Mode (ESG), Zonas ASHRAE (LZ0-LZ4) e suporte a terminologias de cálculo de fachada híbrido (Área vs Linear). A plataforma consolida seu status de arquitetura 100% Bilíngue.
- [09/04/2026]: Refinamento de UX/UI (Módulo LEED): Implementação de algoritmo de ordenação alfabética in-memory (`localeCompare`) no orquestrador `main.ts` para as tipologias ASHRAE 90.1, facilitando a busca de ambientes pelo usuário sem mutar a estrutura do banco de dados (SSOT).
- [2026/04/10]: Injeção do algoritmo WELL Performance Score no HCLEngine.ts e expansão da UI de Auditoria para suporte ao HUD de Envelhecimento e Mapa de Fadiga.
- [2026/04/10]: Integração final do HUD de Envelhecimento Ótico e WELL Performance Score no main.ts. Atualização do Canvas2DEngine.ts para renderizar o Mapa de Fadiga (Zonas Biológicas 24h) e o Fantasma do Ciano (Máscara Melanópica no SPD).
- [2026-04-10] REFACTOR: Dívida técnica mitigada. Migração total do método drawCircadianChart do orquestrador (main.ts) para o motor responsável pela renderização (Canvas2DEngine.ts), respeitando o pilar da Clean Architecture.

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