# Agenda online — API + painel (multi-clínica)

Sistema de agendamento reutilizável para os sites de clientes. Uma única instalação atende várias clínicas; cada uma tem seus locais, horários, tratamentos, feriados, bloqueios e reservas.

- **Site da cliente:** mostra só horários realmente livres. Ao escolher, o horário fica **reservado (pendente)** e o WhatsApp abre com a mensagem pronta.
- **Painel (`/admin/?c=<clinica>`):** feito para o celular. Mostra a agenda da semana com horários livres por dia, a lista de reservas aguardando confirmação e botões para confirmar, cancelar (o horário volta a ficar livre) e reativar. Também permite lançar agendamentos manuais (Instagram, telefone) e bloquear um dia inteiro ou um trecho (férias, almoço).
- **Plataforma:** Cloudflare Workers + D1 (SQLite), sem dependências. O plano gratuito cobre com folga esse volume.

## Regras

- **Horários:** cada tratamento tem sua duração, e os inícios avançam de `passo_min` em `passo_min` (30 min). Um horário só aparece se a sessão inteira couber na janela do dia, sem bater com outra reserva ou bloqueio.
- **Uma profissional:** uma reserva ocupa o horário em todos os locais.
- **Sem dupla reserva:** a gravação confere o horário no próprio comando SQL, então dois pedidos simultâneos nunca levam o mesmo horário. Testado com 10 pedidos ao mesmo tempo: 1 aceito e 9 recusados.
- **Antecedência e janela:** o site só aceita reservas com 2 h de antecedência e até 45 dias à frente. O painel pode lançar qualquer horário.
- **Feriados:** os nacionais e de SP são calculados no código, incluindo Carnaval, Sexta-feira Santa e Corpus Christi. Os municipais ficam na tabela `feriados`.
- **Proteção contra abuso:** campo-armadilha para robôs e no máximo 3 reservas pendentes por telefone.
- **Se a API cair:** o site volta sozinho ao agendamento só por WhatsApp (período + mensagem), sem perder a cliente.
- **Local sem horários cadastrados** (ex.: Santos, hoje): o site mostra o período e orienta a combinar pelo WhatsApp.

## LGPD

- O banco guarda só **nome, WhatsApp, tratamento, local, data e horário**, com o consentimento marcado no site.
- Dados de saúde do pós-operatório (cirurgia, data, liberação médica) **não são gravados**: vão apenas na mensagem do WhatsApp.
- **[A FAZER antes de produção]** Incluir no site um aviso de privacidade curto (quem guarda os dados, para quê e como pedir a exclusão) e definir quanto tempo as reservas antigas ficam guardadas.

## Implantar (uma vez)

```bash
cd agenda-api
npm install
npx wrangler login
npx wrangler d1 create agenda                  # copie o database_id para o wrangler.toml
npm run db:migrar                              # cria as tabelas
npx wrangler d1 execute agenda --remote --file seed/tathiana-cairo.sql
npx wrangler secret put SESSION_SECRET         # cole um texto aleatório longo
npm run senha -- tathiana-cairo "senha longa só dela"   # gera o comando SQL da senha
npx wrangler d1 execute agenda --remote --command "<cole o UPDATE gerado>"
npm run deploy                                 # publica em https://agenda-api.<sua-conta>.workers.dev
```

Depois, no site (`index.html`), preencha `CONFIG.agenda.api` com a URL do Worker. Enquanto estiver vazio, o site continua só com WhatsApp.

O painel fica em `https://agenda-api.<sua-conta>.workers.dev/admin/?c=tathiana-cairo`. Dá para salvá-lo na tela inicial do celular da Dra.

## Novo cliente

1. Copie `seed/tathiana-cairo.sql`, troque o `id`, os locais, os horários, os tratamentos e os feriados, e rode com `d1 execute`.
2. Gere a senha com `npm run senha -- <id> "<senha>"`.
3. No site novo, use o mesmo trecho de agendamento com `CONFIG.agenda = { api: "<url>", clinica: "<id>" }`.

## Desenvolvimento local

```bash
echo "SESSION_SECRET=qualquer-coisa-local" > .dev.vars
npm run db:migrar:local
npx wrangler d1 execute agenda --local --file seed/tathiana-cairo.sql
npx wrangler d1 execute agenda --local --command "$(npm run -s senha -- tathiana-cairo 'senha-de-teste-123')"
npm run dev                                    # API e painel em http://127.0.0.1:8787
```

Para testar o site contra a API local: `index.html?agendaApi=http://127.0.0.1:8787`.

### No Windows (PowerShell)

O `echo ... > .dev.vars` do PowerShell 5.1 grava o arquivo em UTF-16, o wrangler não consegue lê-lo e o login do painel falha com "Servidor sem SESSION_SECRET configurado". Use os comandos abaixo, ou rode os de cima no Git Bash.

```powershell
Set-Content .dev.vars "SESSION_SECRET=qualquer-coisa-local" -Encoding ascii
npm run db:migrar:local
npx wrangler d1 execute agenda --local --file seed/tathiana-cairo.sql
$sql = node scripts/senha.mjs tathiana-cairo "senha-de-teste-123"
npx wrangler d1 execute agenda --local --command "$sql"
npm run dev
```

Se a porta 8787 já estiver ocupada por um `wrangler dev` antigo, encerre-o (Ctrl+C no terminal dele) ou use `npx wrangler dev --port 8788`. Depois de mudar o `.dev.vars`, reinicie o `npm run dev`.

## Confirmar com a Dra. Tathiana

- [ ] Duração de cada tratamento (hoje estimada: 60 min; tecnologias 45; terapias manuais 90).
- [ ] Se há intervalo de almoço em Juquehy, que vira uma segunda janela no mesmo dia.
- [ ] Dias e horários em Santos, para ligar a agenda online lá também.
- [ ] Antecedência mínima desejada (hoje 2 h) e até quantos dias à frente abrir a agenda (hoje 45).
