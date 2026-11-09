# Estado verificável e retomada

**Revisão de direção em 9 de novembro de 2026.** Este documento separa evidências do que ainda é plano para que uma nova sessão possa retomar o projeto sem promover suposições a fatos.

## Auditoria e direção vigente — 9/11/2026

Esta seção prevalece sobre os registros históricos abaixo que ainda descrevem a etapa anterior à conexão remota. O usuário relatou sucesso de login, sincronização explícita e download. Isso não comprova recuperação em outro dispositivo, isolamento integral ou fabricação. A última rodada registrada na conversa aprovou 64 testes; qualquer nova execução deve registrar seu próprio resultado.

Inspeção atual do código: o chat usa expressões regulares, sem provedor de IA; `.skt.json` é JSON, não plano de corte. “Novo projeto” agora preserva os projetos anteriores em um catálogo local e cada projeto usa chaves próprias para revisões e fila de sincronização. A fila reserva um UUID remoto antes da primeira chamada, propaga o vínculo às novas revisões e trata associação já existente em retentativas; isso foi provado somente por testes locais com cliente simulado, não por RLS remoto. As limitações remanescentes devem ser corrigidas, não promovidas a capacidades completas.

Direção confirmada: projeto/ambiente → móveis paramétricos → peças/ferragens → plano de corte para serra/esquadrejadeira → etiquetas/montagem, com IA contextual ao longo do fluxo. A oficina quer reduzir o trabalho manual do aplicativo de corte atual. “SKT” não foi solicitação de uma extensão de arquivo própria. Prioridades e critérios atualizados estão no backlog, incluindo E7. O plano operacional detalhado fica em `.local/PLANO-CONCLUSAO-PRODUTO.md`.

Próximo trabalho: ensaiar o vínculo local/remoto e o isolamento com as duas contas existentes, completar recuperação em outro dispositivo e continuar o plano de corte a partir dos contratos já introduzidos. Os demais cadastros não bloqueiam desenvolvimento. Plano de corte e IA fazem parte da primeira versão operacional. A limpeza local no logout continua requisito pendente, não comportamento demonstrado.

## Estado confirmado

Incremento em 9/11/2026: contratos `compositePanel.ts` para camadas, bordas e operações, e `cuttingPlan.ts` para validar chapa, largura de corte, refilos e compatibilidade das peças. A distribuição preliminar em faixas com afastamento da serra e múltiplas chapas está integrada à interface para a revisão salva, com configuração de refilo/veio e estratégia preferida persistidas localmente por projeto. O motor audita limites, IDs, afastamento da serra, área e sequência antes de aceitar a geometria e compara três estratégias determinísticas por chapas, desperdício e operações; o operador pode aceitar a recomendação ou escolher outra alternativa auditada. `cuttingPlanReport.ts` confere as quantidades e projeta um relatório rastreado por projeto/revisão para impressão ou PDF do navegador; `cuttingLabels.ts` deriva uma etiqueta rastreável para cada peça posicionada; `cuttingPlanExport.ts` valida e exporta pacote JSON e etiquetas CSV; `browserCuttingPlanArchive.ts` preserva pacotes preliminares locais por revisão. O navegador também mantém um catálogo de projetos locais, permite alternar entre eles e isola revisões e filas de sincronização por projeto. Ainda não há persistência remota recuperável em outro dispositivo, arquivo de corte canônico/sincronizado, formato de etiqueta validado, ótimo global ou validação na esquadrejadeira; não equivale a plano liberado.

Regra de oficina confirmada em 9/11/2026: refilar os lados, adotar as bordas limpas como referência zero e então executar faixas/peças com 3 mm de serra; não remover nova borda de cada peça. A operação foi adicionada ao contrato/sequência, e as cotas visuais passaram de vermelho para tom neutro para não parecerem cortes.

O motor `groupedCuttingPlan.ts` separa listas heterogêneas por material e espessura antes de calcular, com testes para 15 mm, 6 mm, acabamento distinto e rejeição de IDs repetidos entre grupos. A interface apresenta comparação, mapas, listas e etiquetas por grupo; `groupedCuttingPlanExport.ts` valida um pacote único multi-grupo, e o arquivo local aceita formatos individual/agrupado. `compositePanelCutting.ts` converte cada camada física de um painel composto em peça retangular rastreável e prova por teste que camadas 15+6 seguem para grupos de chapa distintos, sem transformar cava/usinagem pendente em geometria inventada. A tela agora permite registrar peças complementares por revisão com material, espessura, medidas, quantidade, veio, bordas e origem; a lista fica somente no navegador e alimenta o mesmo cálculo agrupado. A origem segue no relatório, pacote, etiqueta e CSV. O balcão demonstrativo continua produzindo apenas um material/espessura por si só, e a nova entrada complementar ainda não foi conferida por uma pessoa no navegador autenticado.

Validação humana relatada em 9/11/2026: o usuário confirmou que impressão e download funcionaram na versão publicada. Uma captura posterior mostrou que as primeiras cotas estavam sobrepostas e com setas desproporcionais; o código foi corrigido para manter resumo geral fora da chapa e cotas finas somente nas peças. Isso ainda precisa de nova conferência visual e não valida etiqueta física, conteúdo em outro dispositivo ou execução do corte.

| Área | Estado | Evidência e limite |
| --- | --- | --- |
| Motor do balcão | Implementado e testado localmente | Calcula laterais, tampo e base para o caso MDF de 18 mm; não representa outros módulos nem valida fabricação real. |
| Interface | Implementada, com projetos e rascunhos persistidos apenas no navegador | Editor React/Vite com catálogo local, criação e reabertura de projetos sem apagar os anteriores, prévia 3D, CSV, proposta controlada de largura, medidas e observações com contexto/confiança, pendências rastreáveis que podem ser concluídas por uma nova medida, interferências físicas com medida-fonte, parede em elevação 2D e balcão posicionado por coordenadas explícitas, especificações por projeto, histórico/restauração como nova revisão, login por e-mail/senha, contexto de papéis e botão de sincronização explícita da revisão salva. Quando o Supabase está configurado, a área de trabalho fica oculta sem sessão/perfil autenticados. A elevação mostra extrapolação de limite e quando um ponto de interferência cai dentro do retângulo do balcão, mas não calcula colisões dimensionais, recuos ou folgas. Falhas e conflitos de sincronização ficam explícitos; o rascunho local pode ser apagado explicitamente. |
| Contrato de domínio | Implementado localmente e parcialmente usado pela interface; ainda sem banco | `src/projectDomain.ts` define o schema v1 para registros do primeiro fluxo, incluindo paredes rastreáveis, associação opcional de uma interferência à parede e posicionamento explícito do balcão. `src/wallElevation.ts` projeta somente posições/dimensões registradas, sinaliza itens fora dos limites e aponta pontos de interferência no retângulo do móvel sem inferir adaptação. `src/projectSpecifications.ts` define especificações rastreáveis por projeto e propostas auditáveis, `src/projectRepository.ts` prova revisões imutáveis em memória, `src/dataUseConsent.ts` registra consentimento versionado e `src/counterChangeProposal.ts` valida/pré-visualiza uma alteração de dimensão; não criam persistência remota nem regras construtivas. |
| Qualidade local | Verificada em 9/11/2026 | `npm.cmd run check`: 31 arquivos, 115 testes aprovados e build concluído; `git diff --check`: aprovado. A pipeline também confere whitespace do commit e a configuração pública do Supabase recusa credenciais privilegiadas conhecidas. Impressão e download anteriores foram confirmados pelo usuário; isto não é teste visual da entrada complementar/multi-grupo, impressão física/etiquetas, operação, autenticação ou RLS. |
| Supabase | Fundação, acesso do cliente e múltiplos papéis aplicados; ainda sem RLS operacional validada | Migrations iniciais, cliente/consentimento e `20261109090000_profile_multiple_roles.sql` aplicadas no projeto remoto. Em 8/11/2026, a tentativa de reset local não deixou o Postgres local disponível porque a imagem `supabase/postgres:17.11.0.018` não foi criada pelo Docker; portanto RLS ainda não foi exercitada com identidades reais. O adaptador remoto exige sessão/perfil provisionados. |
| Hosting | Produção estática publicada | Cloudflare Pages, release da interface `11e98429.rayzen-marcenaria.pages.dev` do commit `ab73589`; o deployment e `marcenaria.rayzen.com.br` responderam HTTPS 200 em 9/11/2026. O bundle servido contém a entrada de peças complementares e a interface agrupada por material/espessura. A instrução de referência zero sem refilo por peça e as cotas em tom neutro permanecem no código publicado. Isso ainda precisa de validação visual autenticada com uma lista heterogênea e não prova impressão física, RLS remoto, recuperação em outro dispositivo, sequência operacional na máquina, ótimo global ou fabricação. |

## Bloqueios conscientes antes de persistência

1. **Modelo de domínio A1:** há um contrato local inicial para proveniência de medidas, evidências, pendências, interferências e paredes, com uso parcial na interface; a migration ainda não define de forma versionada ambientes, móveis, peças calculadas e propostas descritos no backlog, nem há persistência remota.
2. **Provisionamento de identidade:** o login interno por e-mail/senha já tem painel no app; a equipe confirmada é Kevin (marceneiro), Moises (marceneiro e representante), Marcelo (marceneiro) e Tais (representante). Um perfil de representante de teste já foi provisionado; faltam os usuários reais e os testes de permissões por papel.
3. **RLS demonstrada:** é necessário testar ao menos cliente, representante, marceneiro, membro sem privilégio e visitante anônimo: isolamento entre projetos, upload/download privado, convite por telefone, aprovação comercial e liberação técnica.
4. **Dados e retenção:** o levantamento offline em rascunho local foi decidido; após sincronização bem-sucedida, sair da conta apaga a cópia local. Ainda faltam retenção, backup/restauração, segurança do dispositivo, tipos e limites de arquivo e o caminho para dados reais. Não enviar fotos, nomes, medidas ou anexos a IA externa antes da política aprovada.

## Próxima fatia recomendada

Começar por **A1 + a decisão de provisionamento de identidade**, sem conectar a interface ao banco ainda:

1. Converter entidades e estados do primeiro fluxo em tipos/schemas versionados, com origem e confiança explícitas (`informado`, `observado`, `estimado`, `medido`).
2. Especificar o contrato de criação de usuário/perfil, a autoridade que pode atribuir `representante` ou `marceneiro` e o acesso do cliente limitado ao seu projeto.
3. Definir o comportamento de captura/sincronização para uso em campo no celular ou notebook e criar fixtures desidentificadas e testes de banco/RLS para o contrato escolhido.
4. Só depois alterar a migration em uma nova migration revisada e validar localmente; aplicar no remoto requer autorização explícita.

Não iniciar integração de IA externa, importação CAD/CSV, compartilhamento de cliente ou liberação de produção nesta fatia.

## Fila local de sincronizacao

`src/draftSyncQueue.ts` valida snapshots antes de enfileirar e conserva estados `pending`, `syncing`, `synced`, `failed` e `conflict`, incluindo tentativas e referencias remotas quando um adaptador futuro confirmar o envio. Esta fila ainda nao envia dados ao Supabase; identidade, RLS e o adaptador remoto permanecem pendentes.

Última verificação desta fatia: `npm.cmd test` aprovou 17 arquivos e 61 testes; `npm.cmd run build` foi concluído.

O adaptador `src/supabaseDraftSync.ts` implementa a ordem autenticacao → perfil → projeto/membro → revisão e retorna bloqueio explícito sem sessão/perfil, conflito para conteúdo divergente e sucesso somente após confirmação remota. A migration de cliente/consentimento foi aplicada no projeto remoto em 9/11/2026; RLS e provisionamento ainda precisam de testes com identidades reais.

## Backup local

O histórico permite baixar todas as revisões locais em JSON. Um arquivo escolhido pode ser validado no navegador antes de a ação de restauração aparecer. Restaurar exige confirmação explícita e substitui somente o rascunho local deste demonstrador; não envia dados ao Supabase nem à produção.

## Como retomar

1. Conferir `git status -sb` e ler este documento, `AGENTS.md` e o backlog.
2. Executar `npm.cmd run check` e `git diff --check`.
3. Escolher uma única unidade de trabalho com aceite verificável. Atualizar testes e documentação no mesmo change set.
4. Registrar evidência adicional somente após executá-la; deploy, banco remoto e uso humano permanecem evidências distintas.

Para notas que não devem entrar no repositório público, usar `.local/SESSION_HANDOFF.md` como modelo local.
