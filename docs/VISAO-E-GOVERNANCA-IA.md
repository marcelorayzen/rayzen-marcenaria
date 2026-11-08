# Visão e governança de IA

**Estado:** direção de produto validada na descoberta em 7 de novembro de 2026.  
**Não representa funcionalidades já entregues.** O protótipo atual continua sendo um editor local de um balcão demonstrativo, sem persistência, contas, compartilhamento ou pacote de fabricação.

## Resultado pretendido

Rayzen Marcenaria será uma estação de trabalho que começa no acesso próprio e restrito do cliente e continua com dois acessos internos iniciais: o marceneiro e a responsável por projeto e relacionamento com o cliente. Ela deve acompanhar o serviço desde o material recebido no levantamento até a entrega: medidas e referências CAD, comunicação com cliente/arquiteto, projeto ilustrativo, aprovação, produção, compras, corte, etiquetagem, montagem e acompanhamento.

O primeiro valor operacional a preservar é evitar perda, duplicidade ou esquecimento de peças. Toda peça de uma revisão aprovada deve poder receber uma identidade estável, aparecer no plano de corte, na etiqueta e no manual de montagem. Uma peça extra só pode ser criada por uma decisão explícita e rastreável, nunca por ambiguidade em lista ou comunicação.

## Experiência alvo

1. O cliente inicia o briefing no seu acesso, descrevendo o ambiente, necessidades, referências e informações que possui. A responsável por projeto ou o marceneiro continua o levantamento no próprio ambiente, em celular ou notebook, registrando medidas, CAD, fotos, observações e restrições. O levantamento pode continuar offline como rascunho local; a experiência deve deixar claro quando um dado está pendente, local, aguardando sincronização, com falha/conflito, informado pelo cliente ou ainda não confirmado.
2. O projetista cria um ilustrativo do ambiente e do mobiliário. A pessoa pode selecionar componentes com o mouse e revisar detalhes localmente, como posição e dimensão de um furo para passagem de tubo.
3. A conversa assistida interpreta pedidos, aponta medidas ausentes, conflitos e impactos, e prepara propostas estruturadas. Ela não altera silenciosamente o modelo nem substitui as regras de engenharia.
4. O cliente revisa o ilustrativo no seu acesso e pode confirmar ou solicitar alteração. A visualização deve expor claramente o que é ilustrativo, o que foi confirmado e o que ainda é estimativa.
5. A responsável por projeto valida e registra a confirmação do cliente para a revisão exibida. O marceneiro conclui os dados técnicos e, se os requisitos estiverem atendidos, libera a revisão de produção. Só então o sistema pode gerar materiais, acessórios, informações de corte, etiquetas e manual de montagem vinculados à mesma revisão.
6. A produção registra execução, divergências e entrega; qualquer alteração posterior cria uma nova revisão, sem apagar a anterior.

## Papéis e acessos

| Papel | Escopo inicial |
| --- | --- |
| Responsável por projeto e relacionamento com o cliente (`representante` no perfil técnico) | Realiza ou registra o levantamento no cliente, desenvolve o projeto, mantém o relacionamento, reúne referências e comunica o orçamento/ilustrativo. |
| Marceneiro | Confere medidas, viabilidade construtiva, peças e execução de produção. |
| Cliente e arquiteto | Possui acesso próprio, restrito ao(s) projeto(s) autorizado(s), para iniciar briefing, enviar referências permitidas, acompanhar o ilustrativo e confirmar ou solicitar alterações. Não altera dados técnicos, regras, peças, materiais ou liberação de fabricação. WhatsApp entrega o convite e o acesso é autenticado por código único enviado ao número de telefone convidado. |
| Marceneiro (responsável técnico) | É a única pessoa autorizada a liberar uma revisão para corte e produção. Confere pendências, materiais, medidas, regras e revisão; sua identidade e a data da liberação devem ficar registradas. |
| Assistente de IA | Analisa contexto autorizado, faz perguntas, sugere alternativas e cria propostas. Não tem permissão de aprovar pelo cliente, liberar produção, alterar preços, fazer pedidos ou executar ações irreversíveis. |

## Controles obrigatórios

### Três confirmações, três finalidades

| Gate | O que decide | Efeito permitido |
| --- | --- | --- |
| Confirmação do cliente | Cliente aceitou o ilustrativo e as condições apresentadas, ou solicitou alteração. | Registra a resposta para uma revisão específica; não altera dados técnicos nem libera corte ou compra. |
| Validação comercial | Responsável por projeto/relacionamento conferiu e registrou a resposta do cliente para a mesma revisão. | Permite encaminhar a revisão para análise técnica; não libera corte ou compra automaticamente. |
| Liberação técnica de produção | Marceneiro conferiu a revisão, medidas, materiais, ferragens, furos, bordas, pendências e documentos. | Autoriza gerar e usar o pacote de produção daquela revisão. |

Uma alteração após a aprovação comercial invalida explicitamente a versão aprovada e deve pedir nova aprovação quando afetar o que foi apresentado ao cliente. Uma alteração após a liberação técnica exige nova revisão e nova liberação.

### IA confiável e auditável

- Regras geométricas, quantidades, lista de peças, preços e cálculos de produção devem ser determinísticos, versionados e testados; a IA não é a fonte final desses números.
- Cada proposta da IA informa dados usados, suposições, campos afetados, impacto previsto, versão-base e resultado da validação.
- Pedido ambíguo, medida sem unidade, conflito com ambiente ou dado ausente vira pergunta ou pendência, não uma alteração inferida.
- Elementos físicos do ambiente — por exemplo, saída de esgoto, suporte de pia, tomada, pilar ou vão — são registrados como entidades com tipo, posição, dimensões, orientação, origem, confiança e evidência. Um recuo só é proposto quando a entidade e suas medidas estiverem explícitas; a IA não inventa folga, corte ou encaixe.
- Ações de alto impacto — aprovar, liberar, gerar pedido, excluir, compartilhar externamente ou substituir documentos — exigem confirmação humana identificada.
- Links compartilhados devem ser tokens não adivinháveis, revogáveis e associados a uma revisão específica; não podem conceder acesso ao painel interno ou a outras obras.
- O link de aprovação comercial tem validade padrão de dez dias. Ao expirar, a equipe interna deve renovar ou gerar novo link de forma rastreável; a expiração não altera a revisão nem equivale a rejeição.
- A aprovação do cliente é registrada por uma pessoa do comercial, identificando revisão, data/hora, canal e evidência. Mensagem de WhatsApp pode ser anexada ou referenciada como evidência, mas não deve mudar o estado do projeto sem esse registro interno.
- Dados de clientes podem ser enviados a provedores de IA conforme o contrato já adotado, mas a implementação ainda deve registrar finalidade, escopo enviado, provedor, retenção aplicável e acesso. Anexos e dados além do necessário não devem ser enviados por padrão.
- O fluxo manual deve continuar disponível quando o serviço de IA falhar ou estiver indisponível.
- Capturas offline são rascunhos locais até sincronização explícita. Conflito, falha ou ausência de conexão não pode parecer sucesso nem sobrescrever uma revisão remota; confirmação do cliente, validação comercial e liberação técnica só ocorrem em revisão sincronizada.
- Depois de sincronização bem-sucedida, sair da conta apaga a cópia local do dispositivo. Se houver rascunho não sincronizado, a pessoa escolhe explicitamente mantê-lo para sincronizar depois ou descartá-lo; nenhuma das ações ocorre sem aviso.

## Qualidade e evidências

Antes de afirmar que uma etapa está pronta, o projeto deve manter evidência separada de: regra de negócio aprovada, implementação, teste automatizado, validação em navegador, teste de operação com dados desidentificados e uso real acompanhado. Aprovação visual do cliente não é evidência de segurança técnica para fabricação.

Os documentos mínimos a estabelecer para cada módulo são:

1. requisito e critério de aceite rastreáveis;
2. decisão de arquitetura e política de dados, quando aplicável;
3. riscos, controles e responsável;
4. casos de teste e evidências de execução;
5. contrato de dados e versionamento de revisão;
6. instrução operacional e condição de liberação.

## Prioridade proposta: primeiro fluxo útil

1. Definir modelo de projeto, revisão imutável, peça identificada e estados de aprovação/liberação.
2. Persistir projetos e revisões na fundação aprovada, com rascunho de campo, sincronização explícita e backup/exportação antes de incluir colaboração externa.
3. Construir lista de peças com identificadores, quantidades, estado e rastreio até etiqueta/manual. A primeira etiqueta portátil deve conter, no mínimo, número da peça, nome e medidas da revisão liberada.
4. Criar propostas estruturadas sem IA externa; confirmar que aceite, rejeição e reversão geram a trilha correta.
5. Adicionar o ilustrativo compartilhável e a aprovação comercial controlada.
6. Integrar IA ao contrato de propostas, com análise de medidas e conflitos, somente após os controles acima.
7. Gerar plano de corte, materiais, compras e manual de montagem apenas a partir de revisão tecnicamente liberada.

## Fontes de projeto prioritárias

As três fontes inicialmente priorizadas pela operação são **SketchUp**, **Promob** e **CSV**. Elas não têm o mesmo papel no fluxo:

| Fonte | Primeiro uso seguro | Evolução condicionada |
| --- | --- | --- |
| SketchUp | Anexar ao projeto e registrar origem, versão e responsável; visualizar somente se a compatibilidade for comprovada. | Extrair componentes, medidas ou materiais apenas após testar uma amostra real e validar o mapeamento com o projetista. |
| Promob | Anexar ao projeto e manter o vínculo com a revisão/origem. | Avaliar exportações disponíveis e implementar adaptador somente para um formato documentado e testado. |
| CSV | Importar por adaptador estrito, com prévia, unidade, colunas, origem e reconciliação explícitas. | Aceitar cada perfil de CSV por fonte e versão; não tratar qualquer planilha como lista de corte válida. |

Não se deve converter automaticamente arquivos SketchUp ou Promob em dados de produção. O pacote de corte, etiquetas e montagem só pode nascer de uma revisão cujas peças, quantidades e medidas tenham passado pelas regras e validações do domínio.

## Decisões ainda necessárias

- O cliente terá acesso próprio e restrito para iniciar o briefing e revisar o ilustrativo. WhatsApp é o canal preferencial para entregar o convite, de forma inicialmente manual; a integração automática com a API do WhatsApp não faz parte do escopo atual. O acesso é autenticado por código único enviado ao número de telefone convidado. Ainda faltam especificar consentimento, expiração/revogação, recuperação de troca/perda de telefone e limitação a cada projeto. Links temporários podem continuar como complemento, mas não substituem a conta do cliente.
- Confirmar a matriz dos dois acessos internos: a responsável por projeto/relacionamento pode registrar levantamento, alterar projeto, compartilhar material quando aprovado e registrar confirmação comercial; o marceneiro confere a construção e é o único a liberar corte e produção. Ainda falta definir quem provisiona esses perfis e quem administra substituições futuras.
- As fontes prioritárias são SketchUp, Promob e CSV. Faltam uma amostra desidentificada, versão e extensão de cada fonte, além da definição do que será apenas anexado, visualizado, extraído ou convertido para lista/plano de corte.
- Qual é a fonte de preços, materiais, ferragens e estoque, e quem pode aprovar um pedido de compra?
- A identificação física inicial será uma etiqueta portátil simples com número da peça, nome e medidas. Falta confirmar equipamento, dimensões e material da etiqueta, além de quando a etiqueta é impressa e conferida.
- Definir o comportamento de campo sem conectividade: quais dados podem ficar apenas no dispositivo, quando a sincronização deve ocorrer e como conflitos/erros ficam visíveis antes do uso no cliente.
- Quais documentos e padrões de governança de IA a operação já utiliza, para que este repositório os adote sem duplicar ou contradizer o padrão vigente?
