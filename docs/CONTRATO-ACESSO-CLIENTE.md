# Contrato de acesso do cliente

**Estado:** contrato local de domínio; não há autenticação, envio de código ou acesso do cliente implementados.  
**Versão:** 1.

## Objetivo

Permitir que o cliente inicie o briefing, envie referências autorizadas, veja o ilustrativo de seus projetos e confirme ou solicite alterações. O acesso nunca concede edição técnica, alteração de regras/peças/materiais, validação comercial ou liberação de produção.

## Fluxo aprovado

1. A responsável interna cria um convite associado a um projeto e a um telefone convidado.
2. Ela entrega o convite manualmente por WhatsApp. Não há integração automática com API do WhatsApp nesta fase.
3. O cliente autentica-se por código único enviado ao telefone convidado.
4. Depois da verificação, o cliente acessa apenas os projetos autorizados e as ações restritas deste contrato.
5. A confirmação do ilustrativo fica vinculada à revisão exibida. A responsável interna valida/registra comercialmente essa resposta; o marceneiro continua sendo o único a liberar produção.

## Estados do convite

| Estado | Significado | Registro obrigatório |
| --- | --- | --- |
| `created` | Convite criado, ainda não entregue. | Identificador, projeto, telefone, criação e expiração. |
| `delivered` | Convite enviado manualmente. | Data/hora da entrega. |
| `verified` | Código confirmado no telefone convidado. | Data/hora da verificação. |
| `expired` | Prazo do convite/código terminou. | Não concede acesso; prazo será definido na implementação do provedor. |
| `revoked` | Acesso foi revogado por pessoa interna autorizada. | Data/hora e, na persistência futura, responsável e motivo. |

O código bruto nunca pertence ao navegador, logs, banco de domínio ou repositório. O provedor de autenticação deve emitir e validar o código; a aplicação guarda somente os estados e a trilha necessária.

## Escopo permitido ao cliente

- iniciar e complementar briefing;
- enviar referências permitidas;
- visualizar o ilustrativo/revisão autorizada;
- solicitar alteração;
- confirmar o ilustrativo exibido.

## Escopo explicitamente proibido

- visualizar projeto de outro cliente;
- editar medidas técnicas, parede, interferência, regra construtiva, peça, material ou preço;
- aplicar proposta de IA;
- registrar validação comercial;
- liberar produção, gerar ou usar pacote de corte/materiais/etiquetas;
- usar a conta de outro cliente ou aceitar convite destinado a outro telefone.

## Pontos que permanecem para a implementação

- selecionar o provedor de autenticação por telefone e validar seus limites/custos;
- definir duração do convite e do código, número de tentativas e bloqueio contra abuso;
- definir responsável interno que pode criar/revogar convite e tratar troca/perda de telefone;
- criar a migration, RLS e testes de isolamento por projeto;
- testar acessibilidade, falha de envio, código expirado, telefone errado, revogação e tentativa de acesso cruzado.
