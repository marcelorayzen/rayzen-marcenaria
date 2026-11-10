# Rayzen Marcenaria

Editor web local para testar o primeiro fluxo paramétrico de um balcão: medidas externas, geometria 3D, validação, revisão e CSV. Esta é uma demonstração de uma única peça de mobiliário; não é ainda a plataforma completa nem um sistema de liberação para fabricação.

## Estado atual em 10 de novembro de 2026

Além do caso geométrico inicial, a aplicação possui projetos/revisões locais, fotos, catálogo de portas/gavetas/ferragens/equipamentos, especificações `chave=valor`, peças complementares 15+6 e 15+15, plano de corte preliminar para chapa 2750 × 1850 mm com serra de 3 mm, etiquetas/CSV/JSON, checklist de prontidão e sincronização explícita de catálogo/checklist com Supabase. A produção está em `https://marcenaria.rayzen.com.br`.

## Requisitos

- Node.js 22 ou superior
- npm

## Instalação e execução

```powershell
npm install
npm run dev
```

Abra o endereço local informado pelo Vite. Para verificar a aplicação:

```powershell
npm test
npm run build
```

## Estado funcional

O fluxo do protótipo foi conferido no navegador:

1. Alterar a largura externa de 800 para 900 mm recalcula tampo e base de 764 para 864 mm.
2. As alterações aparecem como prévia e não habilitam exportação até salvar uma revisão.
3. Salvar cria R02; o CSV correspondente inclui a revisão e as peças recalculadas.
4. A largura de 36 mm é rejeitada porque não comporta duas laterais de 18 mm.
5. Os controles frontal, lateral, superior e isométrico mudam a vista 3D; selecionar uma linha da lista destaca a peça no modelo.

Os quatro testes automatizados exercitam o motor geométrico, dimensões inválidas e conteúdo do CSV. O download CSV foi acionado durante a conferência no navegador, e o usuário confirmou que o arquivo foi gravado.

## Primeiro caso de ensaio

O projeto inicia com 800 × 720 × 500 mm, em MDF de 18 mm. As duas laterais recebem tampo e base entre elas. O motor calcula 764 mm para o comprimento desses painéis. Ao alterar a largura externa para 900 mm, recalcula 864 mm.

Edite as dimensões para conferir a prévia; salve uma nova revisão para habilitar a exportação CSV dessa revisão. Selecione uma linha da lista para destacar a peça correspondente no modelo. As vistas frontal, lateral e superior alteram a câmera do modelo 3D.

## Limites históricos do caso inicial

- O estado e as revisões existem apenas na memória desta aba e desaparecem ao recarregar ou fechar a página; não há banco de dados, salvamento persistente ou sincronização.
- O material é fixo em MDF e a convenção das bordas é explicitamente “Sem fita” apenas para este ensaio. Catálogo, fita e descontos ainda não foram implementados.
- O modelo não contém portas, fundo, ferragens, furos, plano de corte, etiquetas, manual ou otimização de chapas.
- O CSV é uma lista geométrica preliminar, não um pacote liberado para fabricação.
- Não há chat, edição por linguagem natural, importação de planos de corte, autenticação, colaboração multiusuário ou armazenamento de arquivos. A demonstração está publicada estaticamente, mas não expõe contas, dados de clientes ou persistência.
- A vista técnica é proporcional e deriva do mesmo cálculo que a lista. A aprovação visual não substitui conferência e liberação técnica por um profissional.
- Nenhum teste de montagem física foi realizado.
- Licenças de dependências diretas e transitivas: [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

## Próximas etapas propostas

O plano priorizado, com dependências, critérios de aceite e o marco do primeiro protótipo, está em [docs/BACKLOG-DESENVOLVIMENTO.md](./docs/BACKLOG-DESENVOLVIMENTO.md).

O add-in indicado é [Fusion360-ExportCutlist](https://github.com/bluekeyes/Fusion360-ExportCutlist), para Fusion 360, que exporta uma cutlist em CSV (entre outros formatos). É diferente de AutoCAD e, por si só, não entrega um layout de aproveitamento das chapas. O código do add-in ordena as três dimensões por tamanho, agrupa peças iguais por material/dimensão e junta nomes na coluna `names`; por isso não preserva os eixos do modelo nem garante códigos individuais por peça.

O documento [docs/EVOLUCAO-FLUXO.md](./docs/EVOLUCAO-FLUXO.md) descreve o formato de CSV encontrado no repositório, os cuidados de mapeamento e reconciliação, além do fluxo seguro para o chat. Para confirmar o adaptador com testes, ainda precisamos de um CSV realmente exportado e desidentificado com as configurações usadas na marcenaria.

A direção validada para a evolução — estação interna de projeto e produção assistida por IA, ilustrativo compartilhável, aprovação comercial e liberação técnica separadas, além de rastreio de peças — está registrada em [docs/VISAO-E-GOVERNANCA-IA.md](./docs/VISAO-E-GOVERNANCA-IA.md). É uma visão de produto, não uma descrição de recursos já implementados.

Os controles de risco, evidências e gates para funcionalidades assistidas por IA estão em [docs/QUALIDADE-E-GOVERNANCA-IA.md](./docs/QUALIDADE-E-GOVERNANCA-IA.md). A política adapta referências de gestão de IA à operação; não afirma certificação.

A fundação de persistência em nuvem está em [supabase/README.md](./supabase/README.md). As migrations de catálogo, checklist e identidade local foram aplicadas ao projeto remoto; a sincronização continua explícita e depende de sessão, perfil e vínculo remoto válidos.

Os requisitos e a sequência de publicação em subdomínio estão em [docs/DEPLOY.md](./docs/DEPLOY.md). O projeto Cloudflare Pages está publicado em [marcenaria.rayzen.com.br](https://marcenaria.rayzen.com.br); esta evidência prova a entrega estática atual, não a integração futura de persistência/contas.

O estado verificável, as lacunas conhecidas e a ordem segura de retomada estão em [docs/ESTADO-DO-PROJETO.md](./docs/ESTADO-DO-PROJETO.md). As regras de trabalho para sessões futuras estão em [AGENTS.md](./AGENTS.md).

Ordem proposta para o primeiro protótipo: definir rastreabilidade e armazenamento, persistir projetos, anexar fotos e medidas, modelar a parede em 2D conectada ao balcão 3D e validar propostas conversacionais antes de ligar um agente real. O backlog detalha tarefas e dependências. Importar a cutlist Fusion, outros CSV, DXF, DWG, planilhas e layouts de nesting fica para etapas posteriores e depende de amostras e análise específicas.

## Estrutura

- `src/furnitureEngine.ts`: regras geométricas e CSV, sem dependência de interface.
- `src/App.tsx`: interface do editor e revisões em memória.
- `src/furnitureEngine.test.ts`: ensaios do caso de aceitação do motor.
- `docs/EVOLUCAO-FLUXO.md`: proposta de evolução para persistência, chat com confirmação e importação/reconciliação de planos de corte.
