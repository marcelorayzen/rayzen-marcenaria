# Estado verificável e retomada

**Atualizado em 8 de novembro de 2026.** Este documento separa evidências do que ainda é plano para que uma nova sessão possa retomar o projeto sem promover suposições a fatos.

## Estado confirmado

| Área | Estado | Evidência e limite |
| --- | --- | --- |
| Motor do balcão | Implementado e testado localmente | Calcula laterais, tampo e base para o caso MDF de 18 mm; não representa outros módulos nem valida fabricação real. |
| Interface | Implementada | Editor React/Vite com prévia 3D, revisões em memória e CSV; recarregar a página perde o estado. |
| Qualidade local | Verificada em 8/11/2026 | `npm.cmd test`: 1 arquivo, 4 testes aprovados; `npm.cmd run build`: concluído. Isto não é teste visual nem de operação. |
| Supabase | Fundação de schema implantada | Migration inicial aplicada localmente e no projeto remoto; UI ainda não a usa, não há dados operacionais e as permissões não foram exercitadas com papéis reais. |
| Hosting | Produção estática publicada | Cloudflare Pages, deployment `c9665222-7cce-482f-8fcf-c01762e71b07`, domínio `marcenaria.rayzen.com.br` respondeu HTTPS 200 em 8/11/2026. Não prova autenticação, persistência ou RLS. |

## Bloqueios conscientes antes de persistência

1. **Modelo de domínio A1:** a migration cobre projeto, revisão e peças, mas ainda não define de forma versionada ambientes, paredes, medidas, evidências, observações, pendências, móveis e propostas descritos no backlog.
2. **Provisionamento de identidade:** não existe fluxo implementado para criar um registro `profiles` de um novo usuário autenticado. A política atual permite leitura do próprio perfil, mas não concede inserção pelo cliente. Definir quem provisiona os membros internos e por qual backend/fluxo controlado antes de criar uma tela de login.
3. **RLS demonstrada:** é necessário testar ao menos representante, marceneiro, membro sem privilégio e visitante anônimo: isolamento entre projetos, upload/download privado, criação/revogação/expiração de link, aprovação comercial e liberação técnica.
4. **Dados e retenção:** faltam decisão operacional de retenção, backup/restauração, tipos e limites de arquivo, e o caminho para dados reais. Não enviar fotos, nomes, medidas ou anexos a IA externa antes da política aprovada.

## Próxima fatia recomendada

Começar por **A1 + a decisão de provisionamento de identidade**, sem conectar a interface ao banco ainda:

1. Converter entidades e estados do primeiro fluxo em tipos/schemas versionados, com origem e confiança explícitas (`informado`, `observado`, `estimado`, `medido`).
2. Especificar o contrato de criação de usuário/perfil e a autoridade que pode atribuir `representante` ou `marceneiro`.
3. Criar fixtures desidentificadas e testes de banco/RLS para o contrato escolhido.
4. Só depois alterar a migration em uma nova migration revisada e validar localmente; aplicar no remoto requer autorização explícita.

Não iniciar integração de IA externa, importação CAD/CSV, compartilhamento de cliente ou liberação de produção nesta fatia.

## Como retomar

1. Conferir `git status -sb` e ler este documento, `AGENTS.md` e o backlog.
2. Executar `npm.cmd run check` e `git diff --check`.
3. Escolher uma única unidade de trabalho com aceite verificável. Atualizar testes e documentação no mesmo change set.
4. Registrar evidência adicional somente após executá-la; deploy, banco remoto e uso humano permanecem evidências distintas.

Para notas que não devem entrar no repositório público, usar `.local/SESSION_HANDOFF.md` como modelo local.
