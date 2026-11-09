# Estado verificável e retomada

**Atualizado em 8 de novembro de 2026.** Este documento separa evidências do que ainda é plano para que uma nova sessão possa retomar o projeto sem promover suposições a fatos.

## Estado confirmado

| Área | Estado | Evidência e limite |
| --- | --- | --- |
| Motor do balcão | Implementado e testado localmente | Calcula laterais, tampo e base para o caso MDF de 18 mm; não representa outros módulos nem valida fabricação real. |
| Interface | Implementada, com rascunho persistido apenas no navegador | Editor React/Vite com prévia 3D, CSV, proposta controlada de largura, medidas e observações com contexto/confiança, pendências rastreáveis que podem ser concluídas por uma nova medida, interferências físicas com medida-fonte, parede em elevação 2D e balcão posicionado por coordenadas explícitas, especificações por projeto, histórico/restauração como nova revisão, login por e-mail/senha, contexto de papéis e botão de sincronização explícita da revisão salva. Quando o Supabase está configurado, a área de trabalho fica oculta sem sessão/perfil autenticados. A elevação mostra extrapolação de limite e quando um ponto de interferência cai dentro do retângulo do balcão, mas não calcula colisões dimensionais, recuos ou folgas. Falhas e conflitos de sincronização ficam explícitos; o rascunho local pode ser apagado explicitamente. |
| Contrato de domínio | Implementado localmente e parcialmente usado pela interface; ainda sem banco | `src/projectDomain.ts` define o schema v1 para registros do primeiro fluxo, incluindo paredes rastreáveis, associação opcional de uma interferência à parede e posicionamento explícito do balcão. `src/wallElevation.ts` projeta somente posições/dimensões registradas, sinaliza itens fora dos limites e aponta pontos de interferência no retângulo do móvel sem inferir adaptação. `src/projectSpecifications.ts` define especificações rastreáveis por projeto e propostas auditáveis, `src/projectRepository.ts` prova revisões imutáveis em memória, `src/dataUseConsent.ts` registra consentimento versionado e `src/counterChangeProposal.ts` valida/pré-visualiza uma alteração de dimensão; não criam persistência remota nem regras construtivas. |
| Qualidade local | Verificada em 9/11/2026 | `npm.cmd test`: 17 arquivos, 61 testes aprovados; `npm.cmd run build`: concluído. A pipeline também confere whitespace do commit e a configuração pública do Supabase recusa credenciais privilegiadas conhecidas. Isto não é teste visual, de operação, autenticação ou RLS. |
| Supabase | Fundação, acesso do cliente e múltiplos papéis aplicados; ainda sem RLS operacional validada | Migrations iniciais, cliente/consentimento e `20261109090000_profile_multiple_roles.sql` aplicadas no projeto remoto. Em 8/11/2026, a tentativa de reset local não deixou o Postgres local disponível porque a imagem `supabase/postgres:17.11.0.018` não foi criada pelo Docker; portanto RLS ainda não foi exercitada com identidades reais. O adaptador remoto exige sessão/perfil provisionados. |
| Hosting | Produção estática publicada | Cloudflare Pages, deployment `60134df3.rayzen-marcenaria.pages.dev` do commit `e25ef0a`, domínio `marcenaria.rayzen.com.br` respondeu HTTPS 200 em 9/11/2026 e o bundle público contém a URL Supabase. Falhas de login exibem fallback visível com diagnóstico sanitizado; RLS ainda depende de teste humano. |

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
