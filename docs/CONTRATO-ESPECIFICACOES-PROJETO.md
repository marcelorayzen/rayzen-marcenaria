# Contrato de especificações por projeto

**Estado:** contrato local de domínio; não há catálogo, importador Promob ou conversa com IA implementados.  
**Versão:** 1.

## Princípio

Cada móvel e projeto pode ter suas próprias especificações. O sistema não assume uma regra global para ferragens, materiais, bordas, folgas ou cortes. Uma informação do Promob, SketchUp, documento ou levantamento é registrada com a sua fonte e vale somente no escopo do projeto/revisão até ser confirmada.

## Especificação rastreável

Uma especificação contém identificador, escopo (projeto, ambiente, móvel ou módulo), rótulo, valor, estado (`proposed` ou `confirmed`) e fonte. As fontes iniciais possíveis são Promob, SketchUp, documento, cliente, campo, registro manual ou importação. Nenhuma fonte externa se torna regra de produção automaticamente.

Exemplo: uma ferragem indicada no Promob entra como especificação do módulo correspondente, apontando para o arquivo/exportação que a informou. Ela pode ser confirmada, corrigida ou substituída sem alterar o padrão dos outros projetos.

## Alteração por clique ou conversa

Uma ação de interface ou conversa assistida cria uma **proposta de alteração**, nunca uma mudança direta. A proposta identifica a especificação, a revisão-base, valor proposto, motivo e origem (`internal` ou `assistant`). Aceite ou rejeição exige pessoa identificada e data; o aceite posterior criará uma nova revisão quando o fluxo de revisões estiver implementado.

## Dados para IA e migração

O projeto canônico pode ser mantido para continuidade operacional e uma futura migração autorizada a outro servidor. Uso para evolução de IA não é automático: antes de transferir ou reutilizar conteúdo de cliente, deve haver finalidade documentada, conjunto de dados definido, consentimento aplicável, retenção, acesso e trilha de auditoria. A IA operacional recebe somente o contexto necessário à proposta; ela não treina automaticamente com cada projeto.

## Limites

### Peças compostas — contrato inicial de 9/11/2026

`src/compositePanel.ts` expande uma peça composta em blanks individuais por camada e quantidade, preservando material, espessura de chapa, dimensões explícitas, veio, identidade e revisão. A soma das camadas é espessura nominal: não incorpora espessura de cola ou tolerâncias não informadas. As dimensões de corte são entradas explícitas; este contrato não calcula descontos de borda.

Largura e espessura da fita são campos distintos. A largura deve cobrir a espessura nominal; isso não prova tolerância de acabamento. Veio pendente, espessura de fita ausente e operação sem especificação permanecem pendências. Cava, colagem e aplicação de borda são operações referenciadas; não há geração de geometria de usinagem ou autorização de fabricação.

Estado: contrato e testes locais, ainda sem ligação ao editor, banco ou otimizador. O exemplo 15 + 6 usa dimensões sintéticas nos testes. O caso 15 + 15 testa a aritmética de uma composição explícita e não estabelece uma regra universal de engrossamento.

- Importar Promob, SketchUp ou CSV não equivale a aceitar regras, ferragens ou medidas.
- O cliente não altera especificação técnica diretamente.
- A IA não confirma a proposta, não calcula produção e não libera materiais/cortes.
- Uma especificação confirmada ainda não equivale à liberação técnica da revisão.
