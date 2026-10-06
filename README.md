# Demo — Dra. Tathiana Cairo

Site demo da **Dra. Tathiana Cairo — Harmonização Corporal e Emagrecimento** (Juquehy, São Sebastião – SP, e Santos – SP). HTML, CSS e JS puro, sem build.

## Direção visual (opção B · Café Noturno)

- **Paleta terrosa**: marrom-café `#2F211B` como base, caramelo `#C99468` / `#E2BC97`, nude `#E7D5C3`, areia `#F1E7DA` e off-white `#FAF6F0`. Sem rosa.
- **Ritmo**: hero, pós-operatório, agendamento e rodapé em café; as demais seções em off-white e areia.
- **Tipografia**: uma família só, **Jost** (hospedada em `fonts/`). Sem itálico nos títulos e sem numeração de seção.
- **Consistência**: um raio (`--r: 18px`), uma sombra (`--sombra`) e uma escala de espaço (`--e1…--e5`) usados em tudo.
- **Marca**: coração marrom 🤎 (desenhado em SVG no site; emoji só na mensagem do WhatsApp).
- **Ilustração**: praia de Juquehy (sol, ilha, mar e dunas) em SVG, nas cores da marca. Não há foto de banco nem foto de corpo.

## Seções (8)

1. Hero: nome, frase oficial, selo Fisioterapeuta, nota 5,0, 7,7 mil seguidores, Agendar
2. Por que com uma fisioterapeuta
3. Tratamentos: os 5 serviços oficiais + card de avaliação, preço "consulte"
4. Pós-operatório (drenagem, com cirurgia e liberação médica)
5. Como funciona: avaliação → protocolo → sessões → acompanhamento
6. Avaliações reais do Google + Instagram
7. Agendamento pelo WhatsApp
8. Locais (abas Juquehy / Santos)

## Como editar

Tudo fica no objeto `CONFIG`, no início do `<script>`:

- `registro`: **trocar `CREFITO-3 [NÚMERO]` pelo número real** (aparece no rodapé e no card de formação).
- `locais[1]` (Santos): **trocar `[ENDEREÇO EM SANTOS]`** e o `cep`. Enquanto começar com `[`, o site mostra "Endereço completo confirmado no agendamento" e o mapa aponta para a cidade. Para mostrar "Aberto agora" em Santos, preencha `abre`/`fecha` (e os `periodos`, com hora).
- `nota`, `avaliacoes`, `seguidores`: números da prova social.
- `feriados` (nacionais + SP) e `locais[].feriados` (municipais): dias bloqueados no agendamento.

## Funcionalidades

- Agendamento: tratamento, local, 5 próximos dias úteis + "outra data", período (conforme o horário do local), nome e "É pós-operatório?". Se for, pede a cirurgia (obrigatória), a data e se já tem liberação médica. A prévia da mensagem atualiza em tempo real.
- Bloqueia datas passadas, fins de semana e feriados (Carnaval, Sexta-feira Santa e Corpus Christi pela Páscoa), sugerindo o próximo dia útil. Hoje só entra se faltar pelo menos 1h para fechar.
- Botões "Agendar" dos tratamentos e do pós-operatório já preenchem o formulário.
- "Aberto agora / Fechado agora" pelo horário de Brasília (Juquehy: seg a sex, 11h às 18h), com o dia de hoje destacado na tabela.

## Regras profissionais (COFFITO/CREFITO) — checklist

- [x] Sem promessa de resultado (nada de medidas, prazos ou "perca X").
- [x] Sem antes e depois e sem fotos de corpo.
- [x] Aviso no rodapé: "Os resultados variam de pessoa para pessoa e dependem de avaliação individual."
- [x] Espaço para o registro profissional: "Dra. Tathiana Cairo — CREFITO-3 [NÚMERO]".
- [x] Depoimentos reais do Google, sem nome ("Cliente no Google").
- [ ] **Confirmar**: número do CREFITO-3.
- [ ] **Confirmar**: endereço e horário em Santos.
- [ ] **Confirmar**: se ela atende em feriados municipais e no Carnaval.
- [ ] **Confirmar**: uso do título "Dra." (fisioterapeutas podem usar "Dr./Dra." conforme resolução do COFFITO).

## Opções de primeira tela

`_opcoes/` guarda as 3 propostas (A, B, C) e os screenshots. A pasta não vai para o deploy (`.vercelignore`).

## Publicar (repositório privado)

```bash
gh repo create demo-tathiana-cairo --private --source=. --remote=origin --push
vercel deploy --prod --yes --project demo-tathiana-cairo
```
