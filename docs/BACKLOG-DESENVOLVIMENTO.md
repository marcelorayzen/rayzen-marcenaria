# Backlog de desenvolvimento

Este backlog transforma a direção confirmada do produto em entregas verificáveis. A prioridade ordena o trabalho; não representa prazo ou estimativa. Uma tarefa só está concluída quando seus critérios de aceite são demonstrados e os testes/documentação relacionados estão atualizados.

O roteiro de execução em fases, com limites e critérios para delegação a outros fornecedores, está em [PLANO-DE-FORNECEDORES.md](./PLANO-DE-FORNECEDORES.md). Este backlog continua sendo a fonte das capacidades e critérios de aceite; o plano organiza sua execução sem promover itens planejados a funcionalidades entregues.

## Visão e limites

**Repriorização em 9/11/2026:** a primeira versão operacional deve conectar ilustrativo, módulos construtivos, peças, ferragens e plano de corte para serra/esquadrejadeira própria. A gestão das duas contas existentes apoia o desenvolvimento; cadastrar toda a equipe não é pré-requisito. O cliente/WhatsApp permanece no escopo, mas não bloqueia a primeira demonstração interna de corte. Esta direção substitui a ordem anterior que adiava fabricação e excluía o plano de corte da primeira prova.

**Sequência vigente:** corrigir preservação/reabertura de projetos e sincronização → lista de peças e configuração de chapas → plano de corte visual/PDF/etiquetas → ambiente e módulos alimentando automaticamente as peças → fluxo de aprovação e oficina → piloto. A IA real é desenvolvida junto aos contratos de operações e ativada para cada capacidade validada. Os marcos abaixo não equivalem a funcionalidade entregue.

**Produto:** plataforma web responsiva de projeto e produção de móveis. O cliente inicia o briefing em seu acesso próprio e restrito; o marceneiro e a responsável por projeto/relacionamento com o cliente continuam o levantamento, inclusive em campo por celular ou notebook. A plataforma conecta registros da visita, evidências, decisões conversacionais, ambiente, móveis paramétricos, peças e montagem, preservando a origem de cada informação até a confirmação do cliente, validação comercial e liberação técnica explícita.

**Primeira prova de valor:** o cliente inicia um briefing restrito; a equipe abre o projeto, anexa fotos, registra medidas e observações por texto, desenha uma parede em elevação 2D, registra interferências físicas, configura um balcão paramétrico em 3D, conversa sobre uma alteração e vê uma proposta que, depois de confirmada, atualiza o modelo e a lista de peças. O cliente confirma o ilustrativo, a responsável registra essa confirmação e o marceneiro libera tecnicamente uma revisão válida antes de qualquer saída de produção. Os registros devem apontar sua origem e nível de confiança.

**Fora da primeira prova:** vídeo e voz, reconstrução automática do ambiente, colaboração simultânea, nesting irregular/CNC, integração com máquinas e liberação automática de produção. Plano de corte retangular com sequência para serra faz parte da primeira versão operacional. Nenhum dado estimado ou interpretado por IA vira medida de fabricação conferida sem revisão humana.

**Prioridades:** P0 = necessário para a primeira prova; P1 = evolução necessária para operação mais ampla; P2 = capacidade especializada ou dependente de decisões futuras. Não há datas estimadas.

## Épico A — Fundamentos e confiança

### A1 · Definir modelo de domínio e rastreabilidade — P0

- **Tarefa:** definir schemas versionados para projeto, ambiente, parede, vão, obstáculo/equipamento, evidência, observação, medida, móvel, peça calculada, proposta e revisão.
- **Tarefa:** diferenciar explicitamente `informado`, `observado`, `estimado` e `medido`; registrar autor, data, unidade, origem e estado de confirmação quando aplicável.
- **Aceite:** uma medida pode ser rastreada até uma observação e uma foto; uma peça pode ser rastreada até o móvel, parâmetros e revisão que a calcularam; schemas rejeitam estados inválidos e suportam migração.
- **Dependências:** nenhuma.

### A2 · Definir privacidade, armazenamento e recuperação — P0

- **Tarefa:** configurar a fundação aprovada em Supabase: conta interna, banco, armazenamento privado, limites de tamanho, exportação/backup e comportamento quando o armazenamento falha.
- **Tarefa:** manter a integração de IA separada da fundação de dados; o contrato autoriza o uso de dados de cliente, mas escopo enviado, retenção e fornecedor de IA precisam ser documentados antes da conexão.
- **Decisão confirmada:** criar o acesso/projeto registra consentimento versionado para operação, migração futura autorizada e evolução governada do produto/IA. A aceitação não permite transferência automática a outro servidor ou provedor.
- **Decisão confirmada:** o levantamento pode continuar offline em rascunho local. A interface precisa indicar `local-only`, `sync-pending`, `synced`, `sync-failed` ou `conflict`; conflito não pode gerar sobrescrita silenciosa.
- **Tarefa:** implementar rascunho local, sincronização explícita, recuperação de falhas e resolução de conflito antes do uso com clientes. Após sincronização bem-sucedida, sair da conta limpa a cópia local; rascunho não sincronizado exige escolha explícita entre manter para sincronizar depois ou descartar. Confirmação do cliente, validação comercial e liberação técnica exigem revisão sincronizada.
- **Aceite:** o usuário entende onde os arquivos ficam; falhas e limites são exibidos sem sucesso falso; há um caminho testado de backup/restauração antes de uso com projetos reais.
- **Dependências:** A1.
- **Decisão confirmada:** Supabase para banco, autenticação, armazenamento privado e sincronização. A migration inicial foi validada localmente e aplicada ao projeto remoto sem dados operacionais. Faltam testes de permissões no remoto, backup, retenção, limites de mídia e integração da interface.

### A3 · Persistir projetos e revisões — P0

- **Correção prioritária identificada em 9/11/2026:** criar um projeto não pode remover o rascunho/fila anteriores. Implementar listagem e reabertura, isolamento local por conta/projeto, vínculo remoto por projeto e sincronização idempotente. Aceite adicional: duas revisões no mesmo projeto remoto, retentativa sem duplicação e recuperação em outro dispositivo.
- **Implementado localmente em 9/11/2026:** catálogo e seletor de projetos no navegador, com revisões e fila de sincronização separadas por projeto. A fila reserva e persiste o UUID remoto, propaga-o às revisões seguintes e tem teste simulado de retentativa sem duplicar projeto/revisão. Ainda faltam isolamento por conta, renomear/arquivar, teste remoto de RLS/idempotência e recuperação em outro dispositivo.

- **Tarefa:** substituir o estado efêmero da aba por armazenamento persistente compatível com o escopo decidido; criar, abrir, renomear e arquivar projetos.
- **Tarefa:** salvar revisões imutáveis e permitir restaurar uma anterior como nova revisão; manter autosave de rascunho claramente distinto de revisão confirmada.
- **Aceite:** recarregar e reabrir recupera projeto e revisões; cada exportação identifica revisão; erros de gravação são visíveis; migração de schema e restauração de backup têm testes.
- **Dependências:** A1, A2.

### A4 · Acesso do cliente e três confirmações — P0

- **Decisão confirmada:** usar Supabase Phone Auth para o código único enviado ao telefone convidado; WhatsApp continua como canal manual de entrega do convite. A configuração do provedor de telefone, custos e limites permanece fora do repositório e exige autorização específica.
- **Tarefa:** usar WhatsApp como canal preferencial de entrega manual do convite e autenticar o cliente por código único enviado ao número de telefone convidado. Definir e implementar expiração, recuperação/revogação de acesso, troca/perda de telefone e escopo por projeto; permitir iniciar briefing e enviar solicitações/referências autorizadas sem conceder edição técnica. Integração automatizada com API do WhatsApp não entra nesta fatia.
- **Tarefa:** modelar separadamente confirmação do cliente, validação comercial e liberação técnica, todas vinculadas à revisão exata. Uma alteração relevante deve invalidar as confirmações aplicáveis de forma explícita.
- **Aceite:** cliente só visualiza os próprios projetos e não consegue alterar dados técnicos; o sistema registra a revisão, identidade, data e resultado de cada confirmação; somente o marceneiro libera produção; uma revisão alterada não pode reutilizar confirmação ou liberação indevidamente.
- **Dependências:** A1, A2, A3.

## Épico B — Registro da visita

### B1 · Anexar fotos ao projeto — P0

- **Tarefa:** importar imagens locais com validação de tipo/tamanho, miniaturas, remoção confirmada e visualização ampliada.
- **Tarefa:** permitir associar notas, medidas e pendências a uma foto; preservar nome/origem e data disponível sem inventar metadados.
- **Aceite:** fotos permanecem após reabrir o projeto; uma observação ligada à foto abre a evidência correta; arquivos inválidos ou armazenamento cheio geram mensagem acionável.
- **Dependências:** A1, A2, A3.

### B2 · Registrar medidas, observações e pendências — P0

- **Tarefa:** criar entradas de medida com valor, unidade, localização/contexto, origem e estado de confiança; registrar observações textuais vinculadas ao projeto e, opcionalmente, à evidência.
- **Tarefa:** criar pendências específicas, como “medir distância da tomada ao canto”, e permitir concluí-las com uma nova medida/evidência.
- **Tarefa:** registrar interferências físicas do ambiente como entidades tipadas e selecionáveis, com posição/referência, dimensões, orientação, origem, confiança e evidência. Exemplos incluem saída de esgoto, suporte de pia, tomadas, pilares e vãos; qualquer recuo ou adaptação é uma proposta revisável, não uma regra presumida.
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
- **Aceite:** selecionar peça ou foto muda o contexto visível ao agente; usuário consegue voltar da conversa para a evidência; estados vazios, erros de mídia/projeto e estado de sincronização são compreensíveis; em celular e notebook as ações centrais podem ser usadas durante o levantamento; teclado e leitor de tela conseguem navegar nas ações centrais.
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

**Composição do marco:** A1–A4, B1–B2, C1–C3, D1–D3. D2 precisa ser resolvido antes de ligar um provedor real; até lá, D1 permite testar a experiência com propostas controladas sem IA.

## Épico E — Ampliar projeto e fabricação

### E1 · Módulos, equipamentos e interferências — P0

- **Tarefa:** expandir o catálogo para portas, gavetas, ferragens e equipamentos; representar zonas de uso e folgas conforme regras confirmadas pelo marceneiro/fabricante.
- **Aceite:** regras têm fonte e testes; interferências são explicadas com medidas; nenhuma regra desconhecida é inventada pelo agente.
- **Dependências:** C2, D1.

### E2 · Inspeção interna e montagem — P0

- **Tarefa:** vistas de inspeção para interior, divisórias, ferragens e interferências; plano de montagem vinculado a peças/revisão.
- **Aceite:** seleção sincroniza vista e peça; montagem identifica componentes e sequência verificados; conteúdo demonstrativo é marcado como tal.
- **Dependências:** E1, C3.

### E3 · Verificação de prontidão para fabricação — P0

- **Tarefa:** definir checklist de medidas confirmadas, materiais, bordas, ferragens, folgas, revisão e responsável técnico. Somente o marceneiro pode executar a liberação; definir também o substituto autorizado.
- **Tarefa:** gerar relatório de pendências e documentos preliminares apenas para revisões válidas; gerar materiais, acessórios, informações de corte, etiquetas e montagem para uso somente a partir de revisão tecnicamente liberada.
- **Aceite:** “preparar para fabricar” não significa liberar; bloqueios são rastreáveis; liberação exige ação explícita do marceneiro e registra identidade/data/revisão. A confirmação do comercial/cliente não a substitui.
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

A sequência histórica abaixo é substituída pela repriorização de 9/11/2026 para a primeira versão operacional. O M0 anterior permanece uma prova intermediária: concluir o produto também exige E1–E3 e E7, IA contextual e piloto de corte/montagem validado pela oficina.

1. Resolver A1 e A2; confirmar escopo de armazenamento, política de dados e comportamento em campo.
2. Implementar A3, depois B2 e C1–C2, para que uma alteração tenha projeto, medida, contexto e revisão-base válidos.
3. Implementar D1 como base de propostas controladas; construir B1 e C3 para completar as evidências e a estação de trabalho responsiva.
4. Implementar A4 antes de expor qualquer dado ao cliente. Integrar D2–D3 apenas após decisão de privacidade; validar o Marco M0 ponta a ponta em celular e notebook, com dados desidentificados.
6. Priorizar E1–E3 conforme as regras reais da oficina e a necessidade de liberação técnica.
7. Iniciar E4, E5 ou E6 somente quando suas dependências e amostras/decisões estiverem disponíveis.

Não há estimativas de esforço ou datas neste backlog. Reestimar após o primeiro vertical slice e teste com dados de uma visita desidentificada. Alterações de escopo devem atualizar também os critérios de aceite e os documentos de produto.

### E7 · Plano de corte para serra/esquadrejadeira — P0

- **Tarefa E7.1:** contrato de peças por unidade e chapas/sobras, com material/acabamento, espessura, dimensões de corte, veio, bordas, refilo e largura real de corte. Valores da oficina devem ser informados; fixtures de teste são identificadas como tais.
- **Tarefa E7.2:** otimizador retangular com sequência de cortes guilhotinados; separar materiais/espessuras e respeitar rotação/veio. Informar peças não alocadas e comparar alternativas por consumo e execução.
- **Tarefa E7.3:** mapa cotado por chapa, sequência, aproveitamento, PDF e etiquetas vinculados a projeto/revisão/peça. Ajuste manual exige revalidação do plano.
- **Implementado parcialmente em 9/11/2026:** relatório preliminar imprimível/PDF pelo navegador com projeto, revisão, parâmetros, mapas, lista de peças, operações e uma etiqueta rastreável por peça posicionada. Veio e refilos são persistidos localmente por projeto. Ainda faltam cotas completas, arquivo PDF gerado de forma determinística, formato/impressora de etiquetas validados, configuração vinculada à revisão/sincronizada e revalidação de ajustes manuais.
- **Tarefa E7.4:** alimentar o corte com as peças calculadas dos módulos sem redigitação; alterações invalidam o plano derivado anterior. Recortes internos e usinagens permanecem operações específicas, distintas do desdobro retangular.
- **Aceite:** contagem exata, ausência de sobreposição, dimensões/refilo/serra/veio respeitados, cortes reproduzíveis e comparação com projeto já executado. Marceneiro valida a execução e libera a revisão antes do uso em fabricação.
- **Dependências:** A1–A3 para persistência; E1 para geração automática; E3 para liberação. O motor pode ser desenvolvido com lista conferida antes do catálogo completo.
- **Referências:** SketchCut como referência de experiência; Promob Cut Pro como organização de produção; OpenCutList como referência de peças/diagramas/etiquetas; Fusion360-ExportCutlist como possível adaptador de lista. Compatibilidade de arquivos e reaproveitamento de código exigem análise própria.
