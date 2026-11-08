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
2. O projeto Pages `rayzen-marcenaria` já foi criado, sem deploy.
3. Preencher `VITE_SUPABASE_PUBLISHABLE_KEY` em `.env.local` antes de gerar qualquer build destinado à publicação.
4. Adicionar `marcenaria.rayzen.com.br` em **Workers & Pages → rayzen-marcenaria → Custom domains**. Como a zona já está no Cloudflare, concluir o fluxo no painel permite que o DNS seja criado de forma segura.
5. A prévia foi publicada em `https://33032114.rayzen-marcenaria.pages.dev` a partir da branch `preview` em 8 de novembro de 2026.
6. Validar visualmente login, acesso negado, links expirados, navegação por URL direta, HTTPS e conexão Supabase.
7. A produção foi aprovada e publicada em `marcenaria.rayzen.com.br` em 8 de novembro de 2026, deployment `c9665222-7cce-482f-8fcf-c01762e71b07` da branch `main`.
8. A verificação HTTPS retornou `200 OK`. Uma publicação futura ainda deve executar `npm run cloudflare:pages:deploy`, conferir o domínio e registrar versão/data.

## Ainda necessário

- regra de acesso à prévia e responsável pela aprovação de publicação;
- política de rollback e retenção de logs.
