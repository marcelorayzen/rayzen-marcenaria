# SANDBOX-TESTE

> Arquivo gerado pela sandbox do Rayzen como teste (16/11/2026). Resumo baseado apenas no que foi lido no repositório.

## O que o projeto parece fazer

Editor web de um balcão paramétrico para marcenaria (README: demonstração, não sistema de liberação para fabricação). A partir de medidas externas gera geometria 3D, validação, revisões, peças, plano de corte (chapa 2750 × 1850 mm, serra de 3 mm), etiquetas, CSV/JSON e checklist de prontidão. A direção declarada é: projeto → móveis paramétricos → peças/ferragens → plano de corte → etiquetas/montagem, com IA contextual.

## Estrutura

- `src/` — app React 19 + TypeScript + Vite, com testes Vitest ao lado de cada módulo.
  - `furnitureEngine.ts`: motor determinístico do balcão.
  - `App.tsx` e `*Panel.tsx`: interface (autenticação, plano de corte, fotos, catálogo).
  - `cuttingPlan*.ts`, `cuttingLabels.ts`, `composite*.ts`: plano de corte, etiquetas, peças compostas (15+6, 15+15).
  - `browser*.ts`: armazenamento local (projetos, catálogo, planos).
  - `supabase*`, `draftSync*`, `remoteRecoveryMerge.ts`: sincronização e recuperação remota.
  - Contratos de domínio: acesso de cliente, uso de dados, equipe interna, liberação técnica.
- `supabase/` — migrations, `config.toml` e testes pgTAP de RLS.
- `docs/` — estado do projeto, backlog, contratos, deploy, governança de IA.
- `AGENTS.md`, `PRODUCT.md`, `DESIGN.md` — regras de trabalho, produto e design.
- `.github/workflows/quality.yml` — verificação de qualidade (CI).

## Como rodar

`npm install`, `npm run dev`; verificação com `npm run check` (testes + build). Deploy em Cloudflare Pages (`docs/DEPLOY.md`).
