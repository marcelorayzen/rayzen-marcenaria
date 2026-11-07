# Backlog de desenvolvimento

Este backlog transforma a direção confirmada do produto em entregas verificáveis. A prioridade ordena o trabalho; não representa prazo ou estimativa. Uma tarefa só está concluída quando seus critérios de aceite são demonstrados e os testes/documentação relacionados estão atualizados.

## Visão e limites

**Produto:** plataforma web de projeto e produção de móveis que conecta registros da visita, evidências, decisões conversacionais, ambiente, móveis paramétricos, peças e montagem, preservando a origem de cada informação até a revisão técnica e a liberação explícita.

**Primeira prova de valor:** abrir um projeto, anexar fotos, registrar medidas e observações por texto, desenhar uma parede em elevação 2D, configurar um balcão paramétrico em 3D, conversar sobre uma alteração e ver uma proposta que, depois de confirmada, atualiza o modelo e a lista de peças. Os registros devem apontar sua origem e nível de confiança.

**Fora da primeira prova:** vídeo e voz, reconstrução automática do ambiente, colaboração, nesting, integração com máquinas, e liberação automática de produção. Nenhum dado estimado ou interpretado por IA vira medida de fabricação conferida sem revisão humana.

**Prioridades:** P0 = necessário para a primeira prova; P1 = evolução necessária para operação mais ampla; P2 = capacidade especializada ou dependente de decisões futuras. Não há datas estimadas.

## Épico A — Fundamentos e confiança

### A1 · Definir modelo de domínio e rastreabilidade — P0

- **Tarefa:** definir schemas versionados para projeto, ambiente, parede, vão, obstáculo/equipamento, evidência, observação, medida, móvel, peça calculada, proposta e revisão.
- **Tarefa:** diferenciar explicitamente `informado`, `observado`, `estimado` e `medido`; registrar autor, data, unidade, origem e estado de confirmação quando aplicável.
- **Aceite:** uma medida pode ser rastreada até uma observação e uma foto; uma peça pode ser rastreada até o móvel, parâmetros e revisão que a calcularam; schemas rejeitam estados inválidos e suportam migração.
- **Dependências:** nenhuma.

### A2 · Definir privacidade, armazenamento e recuperação — P0

- **Tarefa:** decidir o que fica somente neste dispositivo, como fotos são armazenadas, limites de tamanho, exportação/backup e comportamento quando o armazenamento falha.
- **Tarefa:** manter a decisão de conta, sincronização e uso de serviço externo de IA separada; não enviar mídia ou dados de cliente antes de consentimento, política de retenção e fornecedor aprovados.
- **Aceite:** o usuário entende onde os arquivos ficam; falhas e limites são exibidos sem sucesso falso; há um caminho testado de backup/restauração antes de uso com projetos reais.
- **Dependências:** A1.
- **Decisão em aberto:** primeira implantação local para um usuário/dispositivo ou serviço com login e sincronização.

### A3 · Persistir projetos e revisões — P0

- **Tarefa:** substituir o estado efêmero da aba por armazenamento persistente compatível com o escopo decidido; criar, abrir, renomear e arquivar projetos.
- **Tarefa:** salvar revisões imutáveis e permitir restaurar uma anterior como nova revisão; manter autosave de rascunho claramente distinto de revisão confirmada.
- **Aceite:** recarregar e reabrir recupera projeto e revisões; cada exportação identifica revisão; erros de gravação são visíveis; migração de schema e restauração de backup têm testes.
- **Dependências:** A1, A2.

## Épico B — Registro da visita

### B1 · Anexar fotos ao projeto — P0

- **Tarefa:** importar imagens locais com validação de tipo/tamanho, miniaturas, remoção confirmada e visualização ampliada.
- **Tarefa:** permitir associar notas, medidas e pendências a uma foto; preservar nome/origem e data disponível sem inventar metadados.
- **Aceite:** fotos permanecem após reabrir o projeto; uma observação ligada à foto abre a evidência correta; arquivos inválidos ou armazenamento cheio geram mensagem acionável.
- **Dependências:** A1, A2, A3.

### B2 · Registrar medidas, observações e pendências — P0

- **Tarefa:** criar entradas de medida com valor, unidade, localização/contexto, origem e estado de confiança; registrar observações textuais vinculadas ao projeto e, opcionalmente, à evidência.
- **Tarefa:** criar pendências específicas, como “medir distância da tomada ao canto”, e permitir concluí-las com uma nova medida/evidência.
- **Aceite:** não há conversão silenciosa de estimativa em medida conferida; pendências abertas aparecem no projeto e apontam para o contexto de origem; unidade e valor são validados.
- **Dependências:** A1, A3; B1 para vínculo com fotos.

## Épico C — Modelo do ambiente e móvel

### C1 · Criar ambiente em elevação 2D — P0

- **Tarefa:** modelar parede com comprimento e altura confirmados ou identificados como estimados; adicionar vãos, pilares e pontos hidráulicos/elétricos com posição e dimensão quando conhecidas.
- **Tarefa:** desenhar e editar a elevação 2D com cotas, seleção e indicação visual de dados não conferidos.
- **Aceite:** geometria e cotas derivam dos mesmos dados; entidades têm IDs estáveis e podem ser selecionadas; valores ausentes aparecem como pendências, não como dimensões presumidas; validação cobre limites e sobreposições relevantes.
- **Dependências:** A1, A3, B2.

### C2 · Vincular balcão paramétrico ao ambiente — P0

- **Tarefa:** evoluir o motor atual para instâncias de móveis colocadas no ambiente, mantendo dimensões e peças calculadas deterministicamente.
- **Tarefa:** associar seleção entre móvel/peça, elevação, visualização 3D e lista de peças; identificar visualmente itens que ainda são apenas demonstrativos.
- **Aceite:** alterar parâmetro válido recalcula 3D e lista da mesma revisão; posição e dimensões do balcão podem ser conferidas na parede; entradas incompatíveis com vãos/obstáculos são sinalizadas sem ajuste automático oculto.
- **Dependências:** A1, A3, C1.

### C3 · Compor estação de trabalho contextual — P0

- **Tarefa:** integrar projeto/visualização, agente e material da visita, mantendo seleção/contexto compartilhados.
- **Tarefa:** em telas estreitas, permitir alternar entre áreas sem perder seleção, rascunho de conversa ou contexto do projeto.
- **Aceite:** selecionar peça ou foto muda o contexto visível ao agente; usuário consegue voltar da conversa para a evidência; estados vazios e erros de mídia/projeto são compreensíveis; teclado e leitor de tela conseguem navegar nas ações centrais.
- **Dependências:** B1, B2, C1, C2, D1.

## Épico D — Conversa assistida com controle

### D1 · Criar operações de domínio e prévia sem IA — P0

- **Tarefa:** definir operações permitidas e tipadas, por exemplo, alterar uma dimensão, criar uma observação ou abrir uma pendência; validar unidade, alvo e revisão-base.
- **Tarefa:** mostrar valor atual, valor proposto, impacto nas peças e avisos; aceitar ou rejeitar; desfazer uma operação aceita por meio de nova ação auditável, sem apagar revisões anteriores.
- **Aceite:** rejeição não altera projeto; aceite válido atualiza ambiente/móvel/lista numa única revisão; erro de validação não deixa sucesso parcial; operações ambíguas solicitam esclarecimento; histórico registra autoria, origem e resultado.
- **Dependências:** A1, A3, B2, C2.

### D2 · Aprovar arquitetura e política do agente — P0, bloqueio para IA externa

- **Tarefa:** decidir provedor (incluindo opção de não usar provedor externo), quais dados/contexto podem ser enviados, consentimento, retenção, custo e comportamento em indisponibilidade.
- **Aceite:** a decisão está documentada; anexos e dados identificáveis não são enviados por padrão; usuário pode continuar edição manual se o agente falhar.
- **Dependências:** A2, D1.

### D3 · Integrar conversa por texto — P0

- **Tarefa:** transformar mensagens em propostas usando contrato limitado de operações; usar seleção atual, evidências e dados do projeto apenas dentro da política aprovada.
- **Tarefa:** fazer perguntas quando faltarem unidade, alvo, posição ou medida; não executar instruções arbitrárias nem aceitar texto do modelo como cálculo.
- **Aceite:** cenários de teste cobrem alteração explícita, referência à seleção, pergunta ambígua, dado ausente, operação inválida e indisponibilidade; só confirmação humana aplica proposta; cálculo final passa pelo motor determinístico.
- **Dependências:** D1, D2; C3 para experiência integrada.

## Marco M0 — Primeira prova de valor

O marco só está entregue quando o fluxo ponta a ponta for demonstrado em um projeto de teste:

1. Criar e reabrir projeto persistido.
2. Anexar foto da parede e registrar medida/observação com origem e estado de confiança.
3. Criar parede em elevação 2D e identificar pelo menos uma pendência.
4. Colocar o balcão paramétrico, abrir sua lista de peças e verificar a consistência com a visualização.
5. Selecionar móvel ou evidência e pedir uma alteração por texto.
6. Ver proposta e consequências, rejeitar sem alteração, depois aceitar uma proposta válida e conferir a revisão atualizada.
7. Reabrir o projeto e confirmar a trilha de revisão; verificar que nenhuma medida estimada foi apresentada como pronta para fabricação.

**Composição do marco:** A1–A3, B1–B2, C1–C3, D1–D3. D2 precisa ser resolvido antes de ligar um provedor real; até lá, D1 permite testar a experiência com propostas controladas sem IA.

## Épico E — Ampliar projeto e fabricação

### E1 · Módulos, equipamentos e interferências — P1

- **Tarefa:** expandir o catálogo para portas, gavetas, ferragens e equipamentos; representar zonas de uso e folgas conforme regras confirmadas pelo marceneiro/fabricante.
- **Aceite:** regras têm fonte e testes; interferências são explicadas com medidas; nenhuma regra desconhecida é inventada pelo agente.
- **Dependências:** C2, D1.

### E2 · Inspeção interna e montagem — P1

- **Tarefa:** vistas de inspeção para interior, divisórias, ferragens e interferências; plano de montagem vinculado a peças/revisão.
- **Aceite:** seleção sincroniza vista e peça; montagem identifica componentes e sequência verificados; conteúdo demonstrativo é marcado como tal.
- **Dependências:** E1, C3.

### E3 · Verificação de prontidão para fabricação — P1

- **Tarefa:** definir checklist de medidas confirmadas, materiais, bordas, ferragens, folgas, revisão e responsável técnico.
- **Tarefa:** gerar relatório de pendências e documentos preliminares apenas para revisões válidas.
- **Aceite:** “preparar para fabricar” não significa liberar; bloqueios são rastreáveis; liberação exige ação explícita de responsável autorizado e registra identidade/data/revisão.
- **Dependências:** A3, E1, E2.

### E4 · Importar e reconciliar cutlist Fusion — P2

- **Tarefa:** receber CSV real desidentificado exportado pelo Fusion360-ExportCutlist; construir fixture e perfil estrito; validar unidade, agrupamentos, nomes e configurações antes de implementar.
- **Tarefa:** oferecer prévia, normalização rastreável, comparação com revisão e confirmação sem sobrescrever o projeto.
- **Aceite:** linhas e quantidades rastreiam o arquivo/origem; ambiguidades não são resolvidas silenciosamente; importação não é apresentada como nesting; divergências não são mescladas nem liberadas automaticamente.
- **Dependências:** A1, A3, E3; amostra de arquivo do usuário.

### E5 · Voz e vídeo da visita — P2

- **Tarefa:** avaliar captura/transcrição de voz e vídeo, vínculo com trecho/tempo e política de armazenamento antes de implementar processamento.
- **Aceite:** trechos transcritos ou interpretações mantêm vínculo com mídia e estado de confiança; usuário revisa antes de converter em medida ou operação.
- **Dependências:** A2, B1, B2, D2, D3.

### E6 · Acesso multiusuário e sincronização — P2

- **Tarefa:** definir identidade, papéis, concorrência, compartilhamento, backup e sincronização após validação do fluxo local.
- **Aceite:** conflitos e permissões são explícitos; dados de projeto não são expostos por links públicos não autorizados.
- **Dependências:** decisão de arquitetura A2; A3.

## Sequência e gestão

1. Resolver A1 e A2; confirmar escopo de armazenamento e política de dados.
2. Implementar A3 e D1 como base de revisões e alterações confiáveis.
3. Construir B1–B2 para que o projeto tenha evidências e pendências utilizáveis.
4. Implementar C1–C3 e validar o fluxo em uma visita de teste.
5. Integrar D2–D3 apenas após decisão de privacidade; validar o Marco M0 ponta a ponta.
6. Priorizar E1–E3 conforme as regras reais da oficina e a necessidade de liberação técnica.
7. Iniciar E4, E5 ou E6 somente quando suas dependências e amostras/decisões estiverem disponíveis.

Não há estimativas de esforço ou datas neste backlog. Reestimar após o primeiro vertical slice e teste com dados de uma visita desidentificada. Alterações de escopo devem atualizar também os critérios de aceite e os documentos de produto.
