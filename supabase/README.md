# Fundação Supabase

Esta pasta prepara a primeira fundação de nuvem do Rayzen Marcenaria. Ela não contém chaves. A migration foi aplicada com sucesso na pilha local e no projeto remoto `frbtknggquivbjofknhk` em 8 de novembro de 2026. Nenhum dado operacional foi incluído e a interface web ainda não está conectada ao serviço.

## Conteúdo

**Atualização de 9 de novembro de 2026:** a migration `20261108160000_client_access_and_consent.sql` foi aplicada ao projeto remoto `frbtknggquivbjofknhk` e o dry-run confirmou `upToDate: true`. Ainda não há provisionamento de perfis nem teste de RLS com usuários reais.

- `migrations/20261108123000_initial_project_governance.sql`: esquema, RLS, funções de aprovação/liberação e bucket privado de arquivos.
- `../.env.example`: somente valores públicos consumidos pelo navegador; a chave `service_role` nunca pertence ao frontend nem a este arquivo.

## Modelo de acesso

- O representante registra levantamento e aprovação comercial.
- O marceneiro é o único papel que pode liberar uma revisão para produção.
- Projetos, revisões, peças e anexos são acessíveis apenas a membros internos do projeto.
- Links para cliente guardam apenas o hash do token, expiram em até dez dias e podem ser revogados. A leitura externa acontece exclusivamente pela função `get_shared_revision`.

O acesso próprio do cliente tem a migration `20261108160000_client_access_and_consent.sql`, aplicada ao projeto remoto em 9 de novembro de 2026. Ela prepara perfil de cliente, convite manual entregue por WhatsApp, escopo por projeto, consentimento versionado e confirmação do cliente. A autenticação é por Supabase Phone Auth; o código não é guardado no banco. Cliente não recebe acesso direto a projetos, revisões, peças ou arquivos: uma futura camada de apresentação precisa limitar a visualização ao ilustrativo aprovado.

## Aplicação futura

1. O projeto remoto aprovado tem a referência `frbtknggquivbjofknhk`.
2. Executar `npm run supabase:link` e concluir o login interativo com uma conta que possua acesso administrativo ao projeto. O CLI pedirá autenticação e poderá pedir a senha do banco; não registrar esses valores em arquivos do repositório ou no chat.
3. Copiar `.env.example` para `.env.local` e configurar `VITE_SUPABASE_PUBLISHABLE_KEY` com a chave pública/publishable encontrada no painel do projeto. O endpoint do projeto já consta no exemplo. Nunca usar ou expor `service_role` no navegador.
4. Iniciar Docker Desktop e executar `npm run supabase:start` para aplicar/testar a migration localmente. O comando requer que o daemon Docker esteja ativo. A primeira validação local deste repositório foi concluída em 8 de novembro de 2026.
5. Testar permissões com cliente, representante, marceneiro e visitante anônimo antes de qualquer `npm run supabase:push`. Exercitar convite, revogação, consentimento, confirmação, isolamento entre projetos e ausência de acesso a peças/arquivos técnicos.
6. Solicitar aprovação humana explícita para `npm run supabase:push -- --yes`: o comando altera o banco remoto vinculado.
7. Validar o contrato do formulário de criação de perfil antes de permitir o primeiro login interno; revisar também limites de tamanho e tipos permitidos por arquivo antes do primeiro envio de CAD, foto ou CSV reais.

Não aplique a migration diretamente em produção sem executar esses testes de acesso e revisar a política de retenção de anexos e evidências.

O módulo `src/supabaseClient.ts` permanece inativo (`supabase === null`) até que as duas variáveis públicas existam no ambiente local. Assim, a demonstração atual não tenta conectar ao banco por engano.

## Guarda de configuracao publica

O cliente do navegador so e criado quando a URL e HTTP(S), nao contem credenciais e ha uma chave publica. A validacao recusa `sb_secret_`, texto `service_role` e JWT legado que declara o papel `service_role`. Ela nao le valores, nao consulta o Supabase e nao prova autenticacao, RLS ou permissao; a interface atual tambem nao usa o cliente para persistir dados.

## Atalhos locais

| Comando | Finalidade |
| --- | --- |
| `npm run supabase:status` | Exibe o estado da pilha local. |
| `npm run supabase:start` | Inicia a pilha local com Docker e aplica migrations locais. |
| `npm run supabase:reset` | Recria o banco **local** a partir das migrations; não usar quando houver dados locais importantes. |
| `npm run supabase:link` | Vincula este repositório ao projeto remoto aprovado, após login interativo. |
| `npm run supabase:push -- --yes` | Aplica migrations pendentes no remoto vinculado após aprovação humana explícita. Não executar automaticamente. |
