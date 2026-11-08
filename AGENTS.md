# Contrato de trabalho do repositório

## Escopo atual

Este repositório entrega uma demonstração estática de um balcão paramétrico. O motor em `src/furnitureEngine.ts` é a fonte determinística para o caso de ensaio; a UI em `src/App.tsx` mantém dados apenas em memória. A publicação em Cloudflare Pages não transforma a demonstração em um sistema com contas, dados de clientes ou liberação de fabricação.

## Antes de alterar

1. Ler `docs/ESTADO-DO-PROJETO.md`, `docs/BACKLOG-DESENVOLVIMENTO.md` e o documento do módulo afetado.
2. Preservar a diferença entre decisão aprovada, código, teste automatizado, validação humana, deploy e uso operacional.
3. Não inventar regras de marcenaria, medidas, materiais, dados de cliente ou critérios de liberação. Registrar a lacuna e pedir a definição necessária.
4. Para uma mudança de domínio, começar por um contrato tipado e testes determinísticos antes de modificar a tela.

## Segurança e operações

- Nunca ler, imprimir, versionar ou pedir que sejam colados valores de `.env.local`, tokens, senhas, chaves `service_role` ou credenciais Cloudflare/Supabase.
- Não executar `supabase:push`, reset remoto, deploy Cloudflare, rollback, alteração de DNS, publicação externa ou qualquer ação sobre dados reais sem aprovação humana explícita para aquele alvo.
- A migration atual é fundação, não prova de autenticação funcional: não ligar a UI ao Supabase antes de definir o provisionamento de perfis e testar RLS para cada papel.
- Manter notas operacionais, evidências e handoffs em `.local/`, que é deliberadamente ignorado pelo Git. Documentação pública deve distinguir fatos verificados de planos.

## Verificação mínima

Executar `npm.cmd run check` e `git diff --check`.

No Windows, preferir `npm.cmd` se a política de execução bloquear `npm.ps1`. Testes e build comprovam somente o código local; validar navegador, banco, permissões e deploy de forma separada quando aplicável.
