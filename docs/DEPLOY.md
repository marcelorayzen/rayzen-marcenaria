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
7. A produção foi aprovada e publicada em `marcenaria.rayzen.com.br` em 9 de novembro de 2026, deployment `4f13ba81.rayzen-marcenaria.pages.dev` da branch `main`, a partir do commit `a3301b0`. O deployment e o domínio responderam HTTPS 200. Esta versão preserva e reabre projetos locais separadamente e apresenta distribuição e operações preliminares das peças nas chapas; ainda não recupera projetos em outro dispositivo, não oferece sequência operacional validada nem liberação de fabricação.
8. A verificação HTTPS retornou `200 OK`. Uma publicação futura ainda deve executar `npm run cloudflare:pages:deploy`, conferir o domínio e registrar versão/data.

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
