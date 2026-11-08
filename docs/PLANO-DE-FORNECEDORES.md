# Plano de fases e delegação

**Estado:** plano de execução derivado do backlog em 8 de novembro de 2026.  
**Finalidade:** dividir o trabalho em entregas que equipes ou fornecedores distintos possam executar sem alterar a direção do produto nem antecipar integrações sensíveis.

Este documento não declara funcionalidades entregues. O demonstrador atual continua sendo um balcão local, sem contas, dados de clientes, persistência ou IA conectada.

## Direção confirmada

- O cliente possui acesso próprio e restrito para iniciar o briefing, enviar referências permitidas e revisar o ilustrativo de seus projetos.
- O convite é entregue manualmente por WhatsApp. O cliente autentica-se por código único enviado ao telefone convidado; uma mensagem ou link encaminhado não é prova de identidade.
- A responsável por projeto/relacionamento e o marceneiro usam o sistema na oficina e no levantamento, por celular ou notebook.
- Há três confirmações para uma revisão: cliente confirma, responsável registra/valida comercialmente, marceneiro libera tecnicamente.
- IA é uma camada assistiva: interpreta contexto autorizado e prepara propostas; não cria medidas, recuos, peças, preços ou liberações sem contrato determinístico e confirmação humana.
- Saída de esgoto, suporte de pia, vãos, tomadas, pilares e outros elementos físicos são dados medidos e rastreáveis. Uma adaptação, como um recuo, é proposta explícita e revisável.

## Regras para toda delegação

Cada fornecedor recebe somente a fase/tarefa autorizada e deve entregar:

1. código e migrações somente no repositório ou branch definidos;
2. contratos tipados, testes determinísticos e fixtures desidentificadas antes da tela quando a tarefa mudar o domínio;
3. documentação atualizada, com limites e evidências executadas;
4. resultado de `npm.cmd run check` e `git diff --check`;
5. lista de decisões, suposições e bloqueios — sem inventar regra de marcenaria, dados do cliente ou critério de liberação.

Nenhum fornecedor recebe credenciais, valores de `.env.local`, chaves privilegiadas, dados reais de cliente, acesso para `supabase:push`, deploy Cloudflare ou API do WhatsApp sem autorização humana específica. Integrações externas e mudanças no banco remoto não são parte de uma entrega comum.

## Mapa de dependências

```text
F0 contratos e decisões
  -> F1 identidade, RLS e revisões persistidas
      -> F2 briefing do cliente e levantamento em campo
          -> F3 ambiente 2D e móvel contextualizado
              -> F4 propostas determinísticas e estação de trabalho
                  -> F5 IA restrita e confirmações cliente/comercial
                      -> F6 liberação técnica e saídas de produção
                          -> F7 piloto, segurança e operação
```

Uma fase não passa adiante só porque a tela foi construída: seus critérios de aceite e testes precisam estar demonstrados. F5 não depende de uma IA real para iniciar; F4 prova as propostas com dados estruturados de teste primeiro.

## F0 — Contratos, decisões e preparação

**Objetivo:** tornar explícito o que os outros fornecedores podem construir com segurança.

| ID | Tarefa delegável | Perfil sugerido | Entregável e aceite | Dependências |
| --- | --- | --- | --- | --- |
| F0.1 | Definir schemas versionados de projeto, revisão, ambiente, parede, medida, evidência, observação, pendência, móvel, peça, interferência e proposta. | Tech lead / domínio | Tipos ou schemas, estratégia de evolução e fixtures. Estados inválidos são rejeitados; origem, unidade, confiança, autor e revisão-base ficam rastreáveis. | Nenhuma |
| F0.2 | Definir o contrato de identidade. | Arquitetura e segurança | Contrato local em [CONTRATO-ACESSO-CLIENTE.md](./CONTRATO-ACESSO-CLIENTE.md) e `src/clientAccessDomain.ts`: convite manual no WhatsApp e código único no telefone convidado. Ainda faltam selecionar provedor, duração/tentativas e implementar persistência. | F0.1 |
| F0.3 | Definir política de dados de campo. | Produto + segurança | **Decisões confirmadas:** o levantamento pode ocorrer offline como rascunho local e sincroniza de forma explícita; falha/conflito é visível e não sobrescreve revisão remota; após sincronização bem-sucedida, sair da conta limpa a cópia local; criar acesso/projeto registra consentimento versionado para operação, migração futura autorizada e evolução governada do produto/IA. Ainda definir retenção, tipos/tamanhos de arquivo, backup/restauração e segurança do dispositivo. | F0.1 |
| F0.4 | Definir regras construtivas iniciais fornecidas pela oficina. | Marceneiro + domínio | Contrato local em [CONTRATO-ESPECIFICACOES-PROJETO.md](./CONTRATO-ESPECIFICACOES-PROJETO.md) e `src/projectSpecifications.ts`: cada especificação tem escopo e fonte; Promob e outras referências não viram regra global. As regras efetivas de cada projeto continuam dependentes de confirmação. | Nenhuma |

**Gate F0:** F0.1 e F0.2 aprovados; para F0.3, a decisão de offline está aprovada, mas retenção, backup/restauração, consentimento e segurança do dispositivo precisam ser aprovados antes de qualquer captura real em campo; F0.4 aprovado antes de ampliar o motor além do balcão de ensaio.

## F1 — Fundação confiável: identidade, acesso e revisões

**Objetivo:** substituir o estado efêmero por projetos rastreáveis e acessíveis somente às pessoas corretas.

| ID | Tarefa delegável | Perfil sugerido | Entregável e aceite | Dependências |
| --- | --- | --- | --- | --- |
| F1.1 | Criar camada de domínio e repositório de projetos/revisões. | TypeScript backend/frontend | Repositório local em memória em `src/projectRepository.ts` prova snapshots imutáveis e restauração como nova revisão. O demonstrador usa `src/browserProjectStorage.ts` para manter o rascunho no mesmo navegador após recarregar, com limpeza explícita; persistência autenticada e sincronização ainda dependem do adaptador remoto. | F0.1, F0.3 |
| F1.2 | Evoluir schema e RLS para papéis internos e cliente. | Especialista Supabase / segurança | Nova migration revisada, sem alterar o remoto. Cliente só acessa seus projetos; responsável e marceneiro têm permissões mínimas; revisão liberada não é alterável. | F0.1, F0.2 |
| F1.3 | Implementar autenticação por telefone e convite manual. | Frontend + Supabase Auth | Fluxo de código único, vínculo ao telefone convidado, expiração, falha, revogação e recuperação definidos em F0.2. Não há API do WhatsApp. | F1.2 |
| F1.4 | Criar suíte de testes de autorização. | QA/Sec | Fixtures para cliente A/B, responsável, marceneiro e visitante. Testa isolamento, convite inválido/expirado/revogado, acesso cruzado e ações proibidas. | F1.2, F1.3 |

**Gate F1:** testes locais de RLS e identidade aprovados, revisão persiste e recarrega, e nenhum acesso de cliente vê projeto alheio. Aplicar migration ou conectar a interface ao projeto remoto exige autorização separada.

## F2 — Briefing do cliente e levantamento em campo

**Objetivo:** iniciar corretamente o projeto e capturar fatos do ambiente sem confundir informação do cliente com medida conferida.

| ID | Tarefa delegável | Perfil sugerido | Entregável e aceite | Dependências |
| --- | --- | --- | --- | --- |
| F2.1 | Portal restrito do cliente. | Frontend mobile | Cliente inicia briefing, descreve necessidade e envia referências autorizadas. Todas as entradas ficam marcadas como `informado`; não altera geometria ou peças. | F1 |
| F2.2 | Registro de medidas, observações e pendências. | Frontend + domínio | Unidade, valor, contexto, origem e confiança obrigatórios; pendência é concluída por nova evidência/medida. Não há conversão silenciosa para `medido`. | F1, F0.1 |
| F2.3 | Evidências e anexos. | Frontend + storage | Foto/anexo validado por tipo/tamanho, miniatura, remoção confirmada, vínculo a medida/observação e falha acionável. | F1, F0.3 |
| F2.4 | Experiência de campo responsiva. | Frontend mobile + QA | Fluxos centrais operam em celular e notebook. O estado de rascunho, sincronização, falha e conflito obedece à decisão F0.3. | F1, F0.3 |

**Gate F2:** cliente inicia briefing; equipe mede no local; uma pendência e uma foto/observação são recuperadas após reabrir o projeto, com estado de confiança visível.

## F3 — Arquitetura digital do ambiente e móvel

**Objetivo:** construir o contexto espacial que impede alterações construtivas implícitas.

| ID | Tarefa delegável | Perfil sugerido | Entregável e aceite | Dependências |
| --- | --- | --- | --- | --- |
| F3.1 | Parede em elevação 2D. | Frontend geometry | Parede, cotas, seleção, vãos e limites com IDs estáveis. Valores ausentes aparecem como pendência. | F2, F0.1 |
| F3.2 | Interferências físicas tipadas. | Domínio + geometry | Saída de esgoto, suporte de pia, tomada, pilar e vão têm posição de referência, dimensões, orientação, confiança e evidência. Testes rejeitam geometria inválida. | F2, F0.1 |
| F3.3 | Instância do balcão no ambiente. | Motor paramétrico + 3D | Balcão colocado na parede; seleção sincronizada entre 2D, 3D e peças. Incompatibilidades são sinalizadas, nunca corrigidas ocultamente. | F3.1, F3.2 |
| F3.4 | Contratos para recuos e adaptações. | Domínio + marceneiro | Uma proposta de recuo identifica a interferência, medida-fonte, móvel/peça afetada, impacto e regra aprovada. Sem regra, gera pendência. | F3.2, F0.4 |

**Gate F3:** cenário desidentificado com uma interferência é exibido e rastreável; a aplicação não permite que uma medida estimada pareça confirmada nem que uma colisão gere ajuste invisível.

## F4 — Alterações controladas sem IA e estação de trabalho

**Objetivo:** provar que mudanças podem ser propostas, revisadas e revertidas antes de conectar um modelo de IA.

| ID | Tarefa delegável | Perfil sugerido | Entregável e aceite | Dependências |
| --- | --- | --- | --- |
| F4.1 | Contrato de operações permitidas. | Domínio | A primeira operação local está em `src/counterChangeProposal.ts`: alterar dimensão do balcão com unidade, revisão-base, razão e origem; a prévia usa o motor determinístico. Ainda faltam observação, pendência, adaptação de interferência e integração de tela. | F1, F3 |
| F4.2 | Prévia, aceite, rejeição e reversão. | Frontend + domínio | Mostra valor atual/proposto, impacto em peças e avisos. Rejeitar não muda estado; aceitar cria uma revisão; desfazer cria nova ação auditável. | F4.1 |
| F4.3 | Estação de trabalho contextual. | Frontend UX | Seleção entre evidência, parede, móvel e peça preserva contexto; acessível e utilizável em tela estreita. | F2, F3, F4.2 |
| F4.4 | Testes de fluxo de revisão. | QA | Casos para alteração válida, ambiguidade, dado ausente, colisão, rejeição, aceite, reversão e falha de gravação. | F4.1–F4.3 |

**Gate F4:** uma proposta estruturada de teste altera um balcão e suas peças na mesma revisão, e uma rejeição ou erro não deixa sucesso parcial.

## F5 — IA restrita e confirmações cliente/comercial

**Objetivo:** conectar IA somente ao contrato já provado e fechar o ciclo ilustrativo sem liberar produção.

| ID | Tarefa delegável | Perfil sugerido | Entregável e aceite | Dependências |
| --- | --- | --- | --- |
| F5.1 | Política e gateway de IA. | Arquitetura + segurança | Provedor ou alternativa local, dados permitidos, minimização, retenção, custo, logs e comportamento em falha documentados. Anexos e dados identificáveis não saem por padrão. | F0.3, F4 |
| F5.2 | Conversa por texto que gera proposta. | IA + backend | Converte apenas para operações permitidas; pede esclarecimento para alvo/unidade ausente; texto do modelo não executa código nem cálculo. | F5.1, F4 |
| F5.3 | Confirmação do cliente e validação comercial. | Frontend + domínio | Cliente confirma ou pede alteração na revisão ilustrativa; responsável valida e registra a resposta. Alteração relevante invalida confirmações aplicáveis. | F1, F4 |
| F5.4 | Avaliação e testes de IA. | QA/IA | Casos desidentificados para pedido explícito, ambíguo, inválido, interferência, indisponibilidade e vazamento de escopo. | F5.1, F5.2 |

**Gate F5:** IA só propõe; o fluxo manual continua útil sem ela; confirmação do cliente e validação comercial ficam vinculadas a uma revisão, sem produzir liberação técnica.

## F6 — Prontidão e saídas de produção

**Objetivo:** permitir geração operacional somente depois da conferência técnica humana.

| ID | Tarefa delegável | Perfil sugerido | Entregável e aceite | Dependências |
| --- | --- | --- | --- |
| F6.1 | Catálogo e regras construtivas aprovadas. | Domínio + marceneiro | Materiais, bordas, ferragens, folgas e identificadores de peça têm fonte, versão e testes. | F0.4, F3 |
| F6.2 | Checklist e liberação técnica. | Domínio + frontend | Somente marceneiro libera; checklist registra revisão, identidade, data e pendências. Não existe liberação parcial ou automática. | F1, F5, F6.1 |
| F6.3 | Pacote de produção. | Relatórios/integração | Lista de materiais, acessórios, informações de corte, etiquetas e montagem identificam a revisão tecnicamente liberada. | F6.2 |
| F6.4 | Importadores e reconciliação. | Integração de dados | Começar apenas com fixture real desidentificada de uma fonte/versionamento definido; prévia, normalização e divergências sem sobrescrever o projeto. | F6.2, amostra aprovada |

**Gate F6:** uma saída de produção não pode ser gerada/usada para revisão não liberada; uma revisão alterada exige nova liberação.

## F7 — Piloto, observabilidade e expansão

**Objetivo:** validar em situação real controlada antes de ampliar formatos, automações ou colaboração.

| ID | Tarefa delegável | Perfil sugerido | Entregável e aceite | Dependências |
| --- | --- | --- | --- |
| F7.1 | Piloto desidentificado de ponta a ponta. | QA + operação | Evidências separadas de testes, navegador, permissões, operação e decisão de disponibilidade. | F1–F6 |
| F7.2 | Observabilidade e incidentes. | Operações + segurança | Métricas de propostas, pendências, conflitos, links/convites e divergências; procedimento de pausa e correção. | F5, F6 |
| F7.3 | Expansões condicionadas. | Produto | SketchUp, Promob, outros CSV, voz/vídeo, multiusuário e integração com máquinas só entram com decisão, amostra e plano próprios. | F7.1 |

## Pacotes seguros para contratação paralela

| Pacote | Pode começar agora? | Limite |
| --- | --- | --- |
| P-A: F0.1 contratos e fixtures | Sim | Não alterar UI ou banco remoto. |
| P-B: F0.2 identidade por telefone | Sim | Especificação; não escolher/ativar provedor sem aprovação. |
| P-C: F0.3 dados de campo | Sim | Decisão e cenários; não coletar dados reais. |
| P-D: F0.4 regras da oficina | Sim, com marceneiro | Registrar fonte e lacunas; não codificar suposições. |
| P-E: F1 implementação | Depois dos contratos F0 | Sem credenciais, push remoto ou deploy. |
| P-F: F2 interface de campo | Depois de F1/F0.3 | Usar fixtures desidentificadas. |
| P-G: F3/F4 geometria e propostas | Depois de F0.4, F1 e F2 | Não inventar regras de encaixe/recuo. |
| P-H: F5 IA | Depois de F4 e decisão de política | Não enviar dados reais a provedor. |
| P-I: F6 produção | Depois de regras aprovadas e liberação | Não afirmar prontidão sem piloto. |

## Critério de encerramento de cada tarefa

Uma tarefa só pode ser marcada como concluída quando houver: requisito e aceite cumpridos; revisão de código; testes executados; documentação atualizada; resultado de validação humana quando aplicável; e evidência separada de deploy ou uso real. A conclusão de um fornecedor não autoriza publicação, alteração remota ou entrada de dados reais.

## Próxima ação recomendada

Contratar ou delegar primeiro os quatro pacotes F0. Eles produzem os contratos que limitam o trabalho posterior. A implementação deve começar por F1.1 somente após aprovação de F0.1 e F0.3; F1.2/F1.3 exigem também o contrato de identidade F0.2.
