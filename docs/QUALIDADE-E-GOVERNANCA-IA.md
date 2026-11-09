# Qualidade e governança de IA

**Estado:** base operacional para evolução do produto; não é certificação ISO nem prova de conformidade.  
**Aplicação:** qualquer função que interprete dados, sugira alterações ou prepare ações usando IA.

## Propósito

Esta política reduz riscos sem transformar a operação em burocracia. Ela adota, de modo proporcional ao tamanho da marcenaria, quatro ciclos do [NIST AI RMF](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/): **governar, mapear, medir e gerenciar**. A estrutura também é compatível com a intenção de gestão contínua de IA da [ISO/IEC 42001:2023](https://www.iso.org/standard/42001), sem alegar certificação ou cumprimento integral da norma.

## 1. Governar

Para cada função assistida por IA, manter uma ficha com:

- objetivo de negócio e usuário responsável;
- dados e anexos que podem ser usados, fonte, provedor e finalidade;
- decisão que a IA pode apenas sugerir, nunca executar;
- responsável humano pela revisão e pela ação final;
- versão do contrato de operações permitidas e das regras determinísticas;
- limites conhecidos, comportamento na indisponibilidade e canal para relatar falha.

O responsável pela operação mantém as decisões de escopo, acessos, provedores e retenção. O representante da marcenaria registra levantamento, relacionamento e confirmação comercial; o marceneiro valida a consequência construtiva e de produção e é o único autorizado a liberar corte e produção. Ninguém pode transferir essas responsabilidades para a IA.

## 2. Mapear

Antes de ativar uma capacidade nova, documentar o cenário: entrada, saída, pessoas afetadas, riscos, impacto se falhar e controle humano. Para o Rayzen Marcenaria, o registro inicial é:

| Risco | Impacto | Controle mínimo | Evidência esperada |
| --- | --- | --- | --- |
| IA interpreta medida, unidade ou pedido de forma errada | Móvel, furo ou lista de peças incorretos | Proposta tipada, unidade obrigatória, prévia e confirmação humana | Caso de teste de ambiguidade e revisão registrada |
| Ilustrativo confirmado não corresponde à revisão de produção | Retrabalho, conflito com cliente ou perda financeira | Acesso do cliente e confirmações fixados a uma revisão; confirmação do cliente, validação comercial e liberação técnica separados | Registro das três confirmações e identificador da revisão |
| Link compartilhado é acessado por pessoa não autorizada | Exposição de dados de cliente/projeto | Token não adivinhável, validade de 10 dias e revogação | Teste de expiração/revogação e log de compartilhamento |
| IA ou importador cria/duplica peça | Corte a mais, desperdício ou montagem confusa | Identificador estável por peça, regras determinísticas e reconciliação | Teste de quantidade/identidade e etiqueta vinculada |
| Arquivo CAD/CSV é interpretado fora do seu contexto | Medida, orientação ou material incorretos | Perfil por formato, amostra real, prévia e confirmação | Fixture desidentificada e relatório de divergências |
| Dados além do necessário chegam ao provedor | Privacidade, contrato ou exposição indevida | Minimização, finalidade registrada e envio opcional por contexto | Log de escopo enviado, sem conteúdo sensível desnecessário |
| Serviço de IA falha ou responde inadequadamente | Operação interrompida ou decisão errada | Fluxo manual disponível, falha explícita e sem sucesso parcial | Teste de indisponibilidade e procedimento operacional |

O registro é revisto quando um módulo muda, ocorre incidente, entra nova fonte de dados ou a equipe identifica efeito não previsto.

## 3. Medir e validar

Nenhuma função de IA passa para uso operacional apenas porque responde bem em uma demonstração. Ela precisa de evidência proporcional ao risco:

| Nível | Exemplo | Mínimo antes de uso |
| --- | --- | --- |
| Baixo | Resumo de observações sem alterar projeto | Casos de exemplo, revisão humana e aviso de limitações |
| Médio | Sugestão de alteração em móvel/ambiente | Testes de proposta válida, ambígua, inválida e indisponibilidade; confirmação humana e trilha de revisão |
| Alto | Dados para corte, etiqueta, pedido, preço ou liberação | Regras determinísticas testadas, reconciliação, teste de ponta a ponta, liberação humana identificada e piloto acompanhado |

Cada entrega deve guardar separadamente: requisito e aceite; decisão de arquitetura; dados/fixtures desidentificados; resultados automatizados; validação em navegador; resultado do piloto; defeitos/incidentes; e decisão de disponibilização. “Build passou” não prova que a operação está pronta, e aprovação comercial não libera produção.

**Evidência de infraestrutura (8 de novembro de 2026):** a migration inicial de governança foi aplicada e conferida no projeto Supabase remoto. Isso prova somente o esquema implantado; não prova permissões por papel em uso real, integração da interface, envio de anexos, aprovação comercial ou liberação de produção.

**Evidência de migration (9 de novembro de 2026):** as migrations de acesso/consentimento e múltiplos papéis foram aplicadas ao projeto Supabase remoto e um dry-run posterior retornou `upToDate: true`. Um perfil de representante de teste foi provisionado. Isso não prova autenticação de produção ou RLS exercitada por todos os papéis.

**Evidência de prévia (8 de novembro de 2026):** o build atual foi enviado ao Cloudflare Pages na branch `preview`. Isso prova upload e build estático; ainda requer validação humana da interface e não equivale à publicação de produção.

**Evidência de produção (9 de novembro de 2026):** após aprovação humana, o build atual foi publicado no Cloudflare Pages em `marcenaria.rayzen.com.br`, deployment `66d22d3a.rayzen-marcenaria.pages.dev`. A verificação HTTPS retornou `200 OK` e o bundle público contém a URL Supabase. Isso prova disponibilidade e configuração pública do cliente, não prova persistência, permissões, dados de cliente ou operação da IA.

Métricas iniciais úteis:

- propostas aceitas, rejeitadas e corrigidas pelo operador;
- campos ou medidas que mais geram esclarecimento;
- divergências entre lista calculada, importada e cortada;
- peças duplicadas, faltantes ou reetiquetadas por revisão;
- tempo entre aprovação comercial, liberação técnica e início de produção;
- links expirados/revogados e incidentes de compartilhamento.

## 4. Gerenciar e melhorar

Quando uma validação falhar ou houver incidente, a equipe deve: pausar a capacidade ou limitar seu escopo; preservar a revisão e evidência; registrar causa, impacto e correção; testar a correção; e liberar novamente somente com responsável identificado.

Uma mudança em modelo de IA, provedor, contrato de operações, fonte CAD/CSV ou regra determinística é uma mudança de risco. Ela exige atualização da ficha, testes relevantes e decisão explícita antes de alcançar dados ou produção reais.

## Gates de operação

1. **Dados recebidos:** origem, data, responsável e estado de confiança registrados; CAD/CSV não é autoridade automática.
2. **Proposta técnica:** impacto e suposições visíveis; alteração só ocorre após confirmação interna.
3. **Confirmação do cliente:** cliente confirma ou solicita alteração para a revisão ilustrativa exibida em seu acesso. Isso não altera dados técnicos nem libera produção.
4. **Validação comercial:** responsável por projeto/relacionamento confere e registra a resposta do cliente para aquela revisão. Mensagem de WhatsApp pode ser evidência, não automação de estado.
5. **Liberação técnica:** marceneiro confere e libera a revisão de produção. Só então podem ser usados plano de corte, etiquetas, materiais, acessórios, pedidos e manual de montagem.
6. **Aprendizado:** divergência, perda ou retrabalho volta para o registro de risco, requisitos e testes.

## Cadência leve

- Em cada módulo: preencher a ficha de governança, o risco e os casos de aceite antes da implementação.
- Antes de piloto: executar testes, conferir manualmente um caso desidentificado e decidir se o risco residual é aceitável.
- Após uso real: registrar desvios e revisar as métricas do módulo.
- Mensalmente, enquanto houver mudança ativa: revisar riscos abertos, permissões, links ativos e incidentes.

## Itens ainda a definir

- responsável marceneiro e substituto para liberação técnica;
- permissões dos dois acessos internos;
- convite entregue preferencialmente por WhatsApp, autenticação por código único no telefone convidado, recuperação, revogação e escopo por projeto do acesso do cliente; não tratar mensagem ou link encaminhado como prova de identidade;
- renovação de link expirado: novo token ou extensão controlada;
- retenção de anexos, conversas, logs e evidências de WhatsApp;
- equipamento, tamanho e conferência da etiqueta portátil;
- amostras desidentificadas de SketchUp, Promob e CSV para validar o primeiro adaptador.
- comportamento de captura e sincronização em campo quando não houver conectividade confiável.
