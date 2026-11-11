# Preparação de deploy

**Estado:** Cloudflare Pages foi escolhido e o projeto remoto `rayzen-marcenaria` foi criado em 8 de novembro de 2026. Prévia e produção foram publicadas; `marcenaria.rayzen.com.br` respondeu HTTPS com `200 OK` após a publicação.

## Decisões confirmadas

- A aplicação é uma SPA Vite/React e gera artefatos estáticos com `npm run build` em `dist/`.
- O backend de dados é o projeto Supabase remoto já vinculado.
- A publicação usará Cloudflare Pages, separado do Worker `itapevi-em-dados-public-api` já existente.
- O subdomínio proposto é `marcenaria.rayzen.com.br`.
- Deploy de produção exige revisão e aprovação humana antes da publicação.

## Requisitos do host

O provedor escolhido precisa oferecer:

1. HTTPS gerenciado para domínio próprio;
2. deploy de conteúdo estático a partir de `dist/`;
3. configuração de variáveis de ambiente de build;
4. fallback de SPA: qualquer rota da aplicação deve responder `index.html`;
5. logs de build/deploy, rollback e controle de acesso da equipe;
6. forma documentada de apontar o subdomínio por DNS.

## Variáveis de produção

Configurar no painel do host, nunca no repositório:

```text
VITE_SUPABASE_URL=https://frbtknggquivbjofknhk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

A chave publishable pode estar no bundle do navegador; Row Level Security é que limita o acesso aos dados. Nunca usar `sb_secret_`, `service_role`, senha do banco ou token pessoal em variáveis com prefixo `VITE_`.

## Sequência segura

1. Autenticar o Wrangler na conta Cloudflare que administra `rayzen.com.br` com `npm run cloudflare:login`.
2. Confirmar no painel que o projeto Pages `rayzen-marcenaria` continua associado à conta e que o domínio personalizado aponta para o deployment esperado.
3. Preencher `VITE_SUPABASE_PUBLISHABLE_KEY` em `.env.local` antes de gerar qualquer build destinado à publicação.
4. Adicionar `marcenaria.rayzen.com.br` em **Workers & Pages → rayzen-marcenaria → Custom domains**. Como a zona já está no Cloudflare, concluir o fluxo no painel permite que o DNS seja criado de forma segura.
5. A prévia foi publicada em `https://33032114.rayzen-marcenaria.pages.dev` a partir da branch `preview` em 8 de novembro de 2026.
6. Validar visualmente login, acesso negado, links expirados, navegação por URL direta, HTTPS e conexão Supabase.
7. A produção foi aprovada e publicada em `marcenaria.rayzen.com.br` em 9 de novembro de 2026, deployment `e95bf4a4.rayzen-marcenaria.pages.dev` da branch `main`, a partir do commit `2681324`. O deployment e o domínio responderam HTTPS 200; o bundle público contém a instrução de referência zero sem refilo por peça e o CSS usa tom neutro nas cotas. A sequência agora registra refilos, adoção das bordas limpas como referência e depois faixas/peças com 3 mm de serra. A composição ainda precisa de validação visual, e o comportamento remoto precisa de ensaio com contas/RLS. Não há recuperação em outro dispositivo, sequência validada na máquina ou liberação de fabricação.
8. A verificação HTTPS retornou `200 OK`. Uma publicação futura ainda deve executar `npm run cloudflare:pages:deploy`, conferir o domínio e registrar versão/data.

9. Estado de encerramento desta sessão: o commit `547b54f` foi publicado após ApprovalGate `06e60fa0-40d9-4991-9987-e729a4e35218` no deployment `06c5f0c0.rayzen-marcenaria.pages.dev`; o preview e `marcenaria.rayzen.com.br` responderam HTTP 200. A versão inclui carregamento remoto do catálogo por `local_id`; isso não prova RLS exercitada com todas as identidades nem liberação de fabricação.

10. Em 10/11/2026, o commit `ec19f62` (peças por revisão, recuperação de projetos remotos e comparação canônica de `jsonb`) foi publicado após aprovação explícita do usuário na conversa, sem ID de ApprovalGate registrado nesta sessão. Prévia `50822801.rayzen-marcenaria.pages.dev` e produção `bf89eab1.rayzen-marcenaria.pages.dev`; `marcenaria.rayzen.com.br` e uma rota SPA direta responderam HTTP 200 servindo `index-CoFGQOTE.js`, que contém os novos textos de recuperação e de sincronização das peças. Isso não prova recuperação humana em outro dispositivo nem RLS remota com contas reais.

11. Em 11/11/2026, com aprovação explícita do usuário na conversa, a migration `20261110230000_marceneiro_reads_all_and_representative_members.sql` foi aplicada ao Supabase remoto (dry-run antes listou só ela; depois `upToDate: true`). Em seguida o commit `cd9520e` (equipe do projeto e códigos de peça por móvel) foi publicado: prévia `d3fe2ce0.rayzen-marcenaria.pages.dev`, produção `a21a4610.rayzen-marcenaria.pages.dev`. `marcenaria.rayzen.com.br` e uma rota SPA direta responderam HTTP 200 com `index-w7RjR_ci.js`, que contém "Equipe do projeto". As permissões com contas reais ainda não foram ensaiadas (ver `.local/TESTES-PENDENTES.md`, T4).

## Ainda necessário

- regra de acesso à prévia e responsável pela aprovação de publicação;
- política de retenção de logs.

## Barreira de configuracao publica

Antes de criar o cliente do navegador, o codigo aceita apenas URL HTTP(S) sem credenciais e uma chave publica. Ele recusa `sb_secret_`, `service_role` e JWT legado com papel `service_role`. Esta barreira evita expor um segredo conhecido no bundle, mas nao valida RLS, autenticacao ou conectividade. Nunca registrar valores de `.env.local` ao investigar uma configuracao recusada.

A pipeline tambem recusa qualquer `.env` versionado, inclusive variantes, exceto o modelo sem valores `.env.example`. Essa verificacao usa apenas os caminhos rastreados pelo Git e nunca le o conteudo das credenciais.

## Operação e rollback

- Antes de qualquer produção, registrar no PR/registro de mudança o commit, data, responsável, resultado de `npm run check`, URL de prévia e aprovação humana. O build local não substitui a revisão visual da prévia.
- Após publicar, conferir `https://marcenaria.rayzen.com.br` e uma rota SPA direta, e registrar o ID do deployment e o resultado. Nunca registrar tokens, chaves ou valores de `.env.local`.
- Em incidente, interromper novas publicações e obter aprovação humana para o rollback. No painel **Workers & Pages → rayzen-marcenaria → Deployments**, selecionar um deployment de **produção** bem-sucedido e usar **Rollback to this deployment**. Pré-visualizações não são alvo de rollback de produção.
- Depois do rollback, verificar o domínio novamente, registrar deployment de origem/destino, horário, motivo e responsável; então abrir investigação no código sem apagar a evidência do incidente.
