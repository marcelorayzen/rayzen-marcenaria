# Estado verificável e retomada

**Atualizado em 8 de novembro de 2026.** Este documento separa evidências do que ainda é plano para que uma nova sessão possa retomar o projeto sem promover suposições a fatos.

## Estado confirmado

| Área | Estado | Evidência e limite |
| --- | --- | --- |
| Motor do balcão | Implementado e testado localmente | Calcula laterais, tampo e base para o caso MDF de 18 mm; não representa outros módulos nem valida fabricação real. |
| Interface | Implementada, com rascunho persistido apenas no navegador | Editor React/Vite com prévia 3D, CSV, proposta controlada de largura, medidas e observações com contexto/confiança, pendências rastreáveis que podem ser concluídas por uma nova medida, interferências físicas com medida-fonte, parede em elevação 2D e balcão posicionado por coordenadas explícitas, especificações por projeto e histórico/restauração como nova revisão. A elevação mostra extrapolação de limite e quando um ponto de interferência cai dentro do retângulo do balcão, mas não calcula colisões dimensionais, recuos ou folgas. O rascunho local sobrevive ao recarregamento e pode ser apagado explicitamente; não há sincronização, conta ou dados operacionais no serviço remoto. |
| Contrato de domínio | Implementado localmente e parcialmente usado pela interface; ainda sem banco | `src/projectDomain.ts` define o schema v1 para registros do primeiro fluxo, incluindo paredes rastreáveis, associação opcional de uma interferência à parede e posicionamento explícito do balcão. `src/wallElevation.ts` projeta somente posições/dimensões registradas, sinaliza itens fora dos limites e aponta pontos de interferência no retângulo do móvel sem inferir adaptação. `src/projectSpecifications.ts` define especificações rastreáveis por projeto e propostas auditáveis, `src/projectRepository.ts` prova revisões imutáveis em memória, `src/dataUseConsent.ts` registra consentimento versionado e `src/counterChangeProposal.ts` valida/pré-visualiza uma alteração de dimensão; não criam persistência remota nem regras construtivas. |
| Qualidade local | Verificada em 8/11/2026 | `npm.cmd test`: 12 arquivos, 48 testes aprovados; `npm.cmd run build`: concluído. A pipeline também confere whitespace do commit e a configuração pública do Supabase recusa credenciais privilegiadas conhecidas. Isto não é teste visual, de operação, autenticação ou RLS. |
| Supabase | Fundação de schema implantada; evolução de acesso do cliente preparada, ainda não validada localmente | Migration inicial aplicada localmente e no projeto remoto. A migration adicional de cliente/consentimento está apenas no repositório. Em 8/11/2026, a tentativa de reset local não deixou o Postgres local disponível porque a imagem `supabase/postgres:17.11.0.018` não foi criada pelo Docker; portanto RLS da nova migration ainda não foi exercitada. UI ainda não a usa, não há dados operacionais e o remoto não foi alterado. |
| Hosting | Produção estática publicada | Cloudflare Pages, deployment `c9665222-7cce-482f-8fcf-c01762e71b07`, domínio `marcenaria.rayzen.com.br` respondeu HTTPS 200 em 8/11/2026. Não prova autenticação, persistência ou RLS. |

## Bloqueios conscientes antes de persistência

1. **Modelo de domínio A1:** há um contrato local inicial para proveniência de medidas, evidências, pendências, interferências e paredes, com uso parcial na interface; a migration ainda não define de forma versionada ambientes, móveis, peças calculadas e propostas descritos no backlog, nem há persistência remota.
2. **Provisionamento de identidade:** existe contrato local para o convite manual via WhatsApp e código único no telefone convidado, mas não existe fluxo implementado, provedor escolhido, registro `profiles` para novo usuário autenticado ou migration para o cliente. A política atual permite leitura do próprio perfil, mas não concede inserção pelo cliente. Definir o provisionamento controlado dos dois membros internos iniciais — marceneiro e responsável por projeto/relacionamento com o cliente — antes de criar telas de login.
3. **RLS demonstrada:** é necessário testar ao menos cliente, representante, marceneiro, membro sem privilégio e visitante anônimo: isolamento entre projetos, upload/download privado, convite por telefone, aprovação comercial e liberação técnica.
4. **Dados e retenção:** o levantamento offline em rascunho local foi decidido; após sincronização bem-sucedida, sair da conta apaga a cópia local. Ainda faltam retenção, backup/restauração, segurança do dispositivo, tipos e limites de arquivo e o caminho para dados reais. Não enviar fotos, nomes, medidas ou anexos a IA externa antes da política aprovada.

## Próxima fatia recomendada

Começar por **A1 + a decisão de provisionamento de identidade**, sem conectar a interface ao banco ainda:

1. Converter entidades e estados do primeiro fluxo em tipos/schemas versionados, com origem e confiança explícitas (`informado`, `observado`, `estimado`, `medido`).
2. Especificar o contrato de criação de usuário/perfil, a autoridade que pode atribuir `representante` ou `marceneiro` e o acesso do cliente limitado ao seu projeto.
3. Definir o comportamento de captura/sincronização para uso em campo no celular ou notebook e criar fixtures desidentificadas e testes de banco/RLS para o contrato escolhido.
4. Só depois alterar a migration em uma nova migration revisada e validar localmente; aplicar no remoto requer autorização explícita.

Não iniciar integração de IA externa, importação CAD/CSV, compartilhamento de cliente ou liberação de produção nesta fatia.

## Backup local

O histórico permite baixar todas as revisões locais em JSON. Um arquivo escolhido pode ser validado no navegador antes de a ação de restauração aparecer. Restaurar exige confirmação explícita e substitui somente o rascunho local deste demonstrador; não envia dados ao Supabase nem à produção.

## Como retomar

1. Conferir `git status -sb` e ler este documento, `AGENTS.md` e o backlog.
2. Executar `npm.cmd run check` e `git diff --check`.
3. Escolher uma única unidade de trabalho com aceite verificável. Atualizar testes e documentação no mesmo change set.
4. Registrar evidência adicional somente após executá-la; deploy, banco remoto e uso humano permanecem evidências distintas.

Para notas que não devem entrar no repositório público, usar `.local/SESSION_HANDOFF.md` como modelo local.
