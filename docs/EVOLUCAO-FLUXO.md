# Evolução do fluxo de projeto

Este documento separa as capacidades existentes das propostas para evoluir o protótipo até um fluxo de marcenaria com projetos, conversa assistida e importação de planos de corte. Os itens abaixo não estão implementados até serem construídos, testados e descritos como funcionalidades disponíveis.

## Situação atual

O aplicativo oferece um único balcão demonstrativo com dimensões externas em milímetros, regra determinística de quatro painéis (duas laterais, tampo e base), visualização 3D, validação, revisão em memória e exportação CSV. O cálculo `largura interna = largura externa − 2 × espessura` é coberto pelos casos de 800 mm → 764 mm e 900 mm → 864 mm.

Não há armazenamento persistente, projetos múltiplos, conversa, importação, cliente, colaboração, controle de acesso ou pacote de fabricação liberado. Recarregar a página restaura o estado inicial; o CSV exportado é uma lista geométrica preliminar.

## Objetivo do fluxo futuro

Preservar uma fonte única e auditável para cada revisão:

1. Registrar o briefing e deixar claro o que foi informado, inferido ou ainda está faltando.
2. Criar e calcular o modelo somente a partir de regras determinísticas e parâmetros identificados.
3. Usar o chat para ajudar a interpretar pedidos e apresentar alterações propostas, sem delegar a ele contas de fabricação.
4. Importar uma lista/plano externo como dados de referência com origem rastreável, nunca sobrescrevendo silenciosamente uma revisão.
5. Comparar conversa, projeto paramétrico e plano importado; destacar diferenças para a pessoa responsável resolver.
6. Salvar a confirmação como revisão imutável. Toda lista exportada e eventual plano técnico deve identificar exatamente essa revisão.
7. Manter a revisão técnica e a liberação para produção como estados distintos. Somente o marceneiro pode liberar a produção; registrar identidade e data. A confirmação comercial do cliente, inclusive quando evidenciada por WhatsApp, não substitui essa liberação.

## Conversa que propõe alterações

### Interação proposta

Exemplo: “Aumente a largura para 900 mm e mantenha a espessura do MDF em 18 mm.”

1. O sistema identifica o projeto e a revisão em edição.
2. Um modelo de linguagem pode transformar o pedido em uma proposta tipada, por exemplo `set_dimension(width, 900, "mm")`. Se houver ambiguidade (por exemplo, largura interna ou externa), deve perguntar antes de propor.
3. A proposta exibe valores atuais e novos, unidades, campos afetados, suposições, avisos e saídas que serão recalculadas.
4. A pessoa confirma ou rejeita. **Somente depois da confirmação** a aplicação chama as regras locais determinísticas, valida o resultado e cria uma nova revisão.
5. A interface atualiza modelo, lista e exportações a partir do mesmo objeto de revisão. O evento, a proposta confirmada, o autor e o horário ficam vinculados à revisão.

O contrato entre chat e aplicação deve ser um conjunto pequeno e versionado de operações permitidas, validado por schema estrito. A resposta em texto do modelo nunca é código executável, SQL, uma chamada arbitrária à API ou prova de que a mudança foi válida. Operações desconhecidas, valores sem unidade, campos ausentes e respostas malformadas são recusados com erro explícito.

### Limites e segurança

- O motor geométrico existente continua responsável por cálculos, dimensões e validação.
- A confirmação é obrigatória para alterar o modelo. A rejeição não muda parâmetros nem revisão.
- A aplicação da proposta e o salvamento da nova revisão formam uma ação atômica; falhas não devem deixar a tela em estado de sucesso parcial.
- O histórico deve permitir consultar revisões anteriores e restaurar uma delas como **nova revisão**, sem apagar o registro já existente.
- Não enviar projetos, nomes, medidas de clientes ou anexos a um provedor externo sem decisão explícita sobre hospedagem, consentimento, retenção e privacidade.
- O editor e o motor devem continuar utilizáveis se o serviço de chat estiver fora do ar; conversa é uma camada opcional.
- O chat não aprova o projeto, não define estruturas ocultas e não libera fabricação.

### Etapas de implementação

1. **Fundação:** separar o estado do domínio da interface; definir identificadores de projeto/revisão, snapshots imutáveis, operações permitidas, migração de schema e testes. Substituir a memória isolada por uma camada de armazenamento com salvamento confiável. A fundação aprovada é Supabase, com banco autenticado, armazenamento privado e regras de acesso por papel; a migration local ainda precisa ser aplicada e testada em um projeto de desenvolvimento. O estado local não é backup nem sincronização.
2. **Propostas sem IA:** implementar prévia/aceite/rejeição e eventos de revisão usando uma proposta estruturada de teste. Assim se prova o fluxo antes de integrar um modelo.
3. **Chat em modo restrito:** adicionar extração de operações a partir de conversa, validação estrita do contrato, perguntas de esclarecimento, limites de contexto e logs sem conteúdo sensível desnecessário.
4. **Operação real:** decidir provedor (ou inferência local), custo, proteção de dados, autenticação, exclusão e retenção antes de conectar contas ou dados reais de clientes.

Critérios mínimos de aceite: uma alteração confirmada cria exatamente uma revisão; rejeitá-la não altera estado; reabrir o projeto recupera os dados se a persistência tiver sido acordada; operações malformadas ou inválidas são recusadas; a regra 800 → 764 e 900 → 864 permanece coberta por testes; falha/indisponibilidade do chat não bloqueia a edição manual.

## Importação do plano de corte

“Plano de corte” pode se referir a dados distintos: lista de peças com medidas, aproveitamento/posicionamento nas chapas, um desenho CAD, ou instruções específicas para uma máquina. Esses tipos não são intercambiáveis. Antes de declarar suporte, é necessário obter ao menos um arquivo de exemplo de cada software usado, conhecer a versão, unidades, nomes/separadores de colunas e significado dos campos.

### Fonte identificada: Fusion 360 Export Cutlist

Foi identificado o add-in comunitário [Fusion360-ExportCutlist](https://github.com/bluekeyes/Fusion360-ExportCutlist), para **Autodesk Fusion 360** (não AutoCAD). A página do [README do add-in](https://github.com/bluekeyes/Fusion360-ExportCutlist#formats) lista exportação CSV, JSON, HTML e formatos para outros otimizadores. A [versão mais recente consultada, v0.6.1](https://github.com/bluekeyes/Fusion360-ExportCutlist/releases/tag/v0.6.1), corrige a seleção de unidades de exportação. O projeto declara licença MIT. O add-in ainda não faz parte deste aplicativo e nenhum arquivo exportado foi recebido ou testado.

Na [implementação do exportador CSV](https://github.com/bluekeyes/Fusion360-ExportCutlist/blob/master/lib/format.py), o esquema padrão é:

```csv
count,material,length (mm),width (mm),height (mm),names
2,MDF,720.00,500.00,18.00,"Lateral esquerda,Lateral direita"
1,MDF,764.00,500.00,18.00,Tampo
1,MDF,764.00,500.00,18.00,Base
```

O exemplo acima é ilustrativo do formato, não uma exportação recebida do usuário. Configurações do add-in podem mudar a unidade, omitir `material`, alterar nomes ou escolher outro layout.

Implicações confirmadas ao ler o código-fonte:

- `count` conta corpos agrupados. Por padrão, corpos com as mesmas dimensões e material são agrupados e seus nomes aparecem em `names`. Portanto, duas peças distintas com as mesmas dimensões (como tampo e base deste modelo) podem vir numa linha com `count=2`, sem códigos de peça.
- A ordem de dimensões é ordenada por tamanho decrescente: `length` é a maior, `width` a intermediária e `height` a menor. Isso não preserva os eixos ou a orientação original do modelo. No exemplo de uma placa, a espessura costuma ser `height`, mas a comparação precisa considerar dimensões ordenadas e não presumir os eixos X/Y/Z.
- `material` pode ser desabilitado. O cabeçalho contém a unidade selecionada, por exemplo `(mm)`; o add-in também oferece `auto`, baseado na unidade padrão do documento. A importação não deve interpretar dimensões sem unidade verificável.
- `names` é uma lista de nomes juntada por vírgula dentro de uma célula CSV. O CSV pode citar a célula inteira, mas o add-in não fornece escaping adicional para distinguir uma vírgula que pertença ao próprio nome. Nomes de componentes/corpos podem ser opcionais, simplificados ou configurados como únicos; não confiar que sempre haverá exatamente `count` nomes úteis.
- A configuração pode definir tolerância ao agrupar corpos com dimensões semelhantes, ocultar componentes ou excluir componentes externos. Logo, um CSV pode já ter consolidado peças distintas e não necessariamente inclui todo corpo do documento.
- O layout padrão lista quantidades e dimensões, não posições de corte em chapas, plano gráfico de aproveitamento, sentido de veio, fita de borda ou estratégia de corte. Formatos específicos de Cutlist Optimizer/Cutlist Evo têm outros cabeçalhos e não devem ser tratados como o CSV padrão.

Assim, há evidência suficiente para implementar **um adaptador experimental e estrito para o CSV padrão deste add-in**, mas não para alegar compatibilidade com qualquer CSV ou aceitar arquivo sem amostra. Preferir exportar com unidade **mm**, material incluído e nomes completos/não únicos quando essas opções estiverem disponíveis. Receber ao menos um CSV realmente exportado, desidentificado, para definir fixture de teste, validar codificação/separador/decimais e confirmar exatamente as opções disponíveis na versão em uso.

O JSON documentado pelo add-in traz `dimensions.units` explicitamente e `names` como array, evitando parte das ambiguidades do CSV. CSV continua sendo o primeiro caminho escolhido, mas JSON pode ser uma alternativa mais robusta se vírgulas em nomes ou detecção de unidade forem um problema para a operação. O CSV próprio do aplicativo atual não deve ser confundido com o CSV de entrada do add-in: têm cabeçalhos e significados diferentes.

### Fluxo proposto de importação CSV

1. A pessoa escolhe o CSV exportado do Fusion localmente; validar tamanho, assinatura/conteúdo e extensão sem executar conteúdo embutido.
2. Detectar BOM/codificação, separador, cabeçalho e unidade declarada com resultado visível. Recusar mapeamento ambíguo em vez de adivinhar.
3. Reconhecer estritamente o perfil `Fusion360-ExportCutlist CSV` (`count`, `length (unidade)`, `width (unidade)`, `height (unidade)`, `names`, `material` opcional) e oferecer mapeamento para outros perfis somente em uma etapa separada e explícita.
4. Validar todas as linhas antes de aceitar: contagem inteira positiva, dimensões finitas e positivas, unidade permitida, material presente se obrigatório; indicar linha e problema sem descartar conteúdo silenciosamente.
5. Pré-visualizar linhas originais e valores normalizados em milímetros. Guardar valores de origem, nomes e dimensões ordenadas, mesmo quando não há correspondência por código ou os nomes não podem ser desmembrados com confiança.
6. Exigir confirmação; preservar nome do arquivo, origem indicada, data, perfil/parser e hash do arquivo, vinculando a importação à revisão-base.
7. Comparar quantidades e dimensões ordenadas com tolerância explicitamente aprovada. Mostrar itens sem par e agrupamentos de vários nomes; não repartir uma linha agrupada em peças distintas por inferência automática.
8. Reimportar deve atualizar/criar um snapshot identificado, não duplicar itens silenciosamente. A importação não modifica parâmetros do projeto nem libera fabricação.

Campos canônicos iniciais para uma lista importada: `codigoOrigem` (opcional), `descricao`, `quantidade`, `dimensoesOrdenadasMm`, `material` (opcional), `bordas` (desconhecidas até confirmação), `origemArquivo`, `linhaOrigem` e `revisaoBaseId`. Guardar também os valores/cabeçalhos originais e a unidade declarada. Só preencher `comprimentoMm`, `larguraMm` e `espessuraMm` depois que a orientação/eixos forem resolvidos; não renomear automaticamente as dimensões ordenadas do add-in como se fossem eixos do móvel.

### Outros formatos e programas

CSV e extensões CAD não garantem um schema comum. A importação precisa de um adaptador versionado por fonte/formato, e um exemplo real para verificar se os campos exportados correspondem ao objetivo.

- **CSV:** primeira opção para uma lista de peças quando o programa realmente fornece todas as colunas requeridas. Criar fixtures de testes sem dados de clientes para cada layout suportado.
- **XLSX:** etapa posterior se houver planilhas de lista estruturada; mapear abas, colunas, fórmulas e unidades sem avaliar conteúdo ativo.
- **DXF:** investigar como uma fonte de geometria ou extração de entidades somente depois de conhecer as convenções de layer, escala, unidades, blocos e geometria dos desenhos usados. Converter linhas/contornos em painéis envolve validação técnica e não é equivalente a importar uma lista de peças.
- **DWG:** não declarar suporte direto em um parser improvisado no navegador. Se um exportador não fornecer CSV ou DXF adequado, avaliar conversão pelo software autorizado ou serviço licenciado, considerando custo, implantação, direitos de uso e privacidade.
- **PDF, imagens e arquivos de máquina:** podem ser usados como referência ou demandar processamento específico, mas não devem alimentar medidas de fabricação automaticamente sem validar extração, unidade, integridade e correspondência humana.

### Reconciliação, não substituição

O modelo paramétrico calcula a lista esperada da sua revisão. A importação registra o que outro sistema trouxe. Quando houver divergência, apresentar lado a lado o esperado e o importado e pedir decisão. Cada resultado exportado precisa registrar sua fonte: “calculado pelo motor” ou “importado de [arquivo/origem]”. Um plano importado não deve passar por cima da revisão que o gerou sem uma nova revisão explicitamente aceita.

Critérios mínimos de aceite: arquivo desconhecido ou inválido gera relatório acionável; entradas não mapeadas nunca desaparecem sem aviso; cada quantidade e medida importada pode ser rastreada até o arquivo/linha de origem; reimportar não duplica peças silenciosamente; divergências não são mescladas automaticamente; testes usam arquivos de exemplo versionados e sintéticos, não informações de clientes.

## Decisões ainda pendentes

1. Confirmar que a fonte efetivamente usada é o add-in [Fusion360-ExportCutlist](https://github.com/bluekeyes/Fusion360-ExportCutlist) no **Fusion 360** e obter um CSV real desidentificado, de preferência exportado em mm com material incluído.
2. Confirmar se o objetivo de “plano de corte” é comparar lista de peças ou importar também o posicionamento/aproveitamento das chapas. Este add-in gera uma cutlist, não layout de nesting.
3. Identificar outros softwares, versões e serviços de otimização usados. Compatibilidade adicional exige arquivos de amostra e adaptadores próprios; não inferir suporte do nome ou extensão.
4. A persistência inicial será em Supabase para os acessos internos e links temporários de cliente. Ainda definir backup/restauração, limites de anexos, retenção e o projeto de nuvem onde a migration será aplicada.
5. Decidir provedor do chat, política de dados, autenticação e contexto permitido antes de incluir dados reais de clientes.
6. Definir regras da marcenaria que ainda não aparecem no modelo: borda por lado, perdas/tolerâncias, folga, encaixes, materiais e espessuras reais.
7. Definir checklist técnico e substituto do marceneiro para eventual liberação de fabricação. Confirmação de chat, aprovação visual, mensagem de WhatsApp ou importação de arquivo não substituem essa liberação.

## Backlog e ordem de execução

O backlog priorizado, com dependências, critérios de aceite e definição do primeiro marco de entrega, está em [docs/BACKLOG-DESENVOLVIMENTO.md](./BACKLOG-DESENVOLVIMENTO.md). A ordem foi ajustada para primeiro provar o fluxo da visita até a revisão de um móvel: domínio/rastreabilidade e privacidade, persistência, evidências e pendências, ambiente 2D conectado ao móvel 3D e, depois, propostas conversacionais confirmadas. A importação da cutlist Fusion é posterior e depende de um CSV real desidentificado; não é pré-requisito para a primeira prova de valor.
