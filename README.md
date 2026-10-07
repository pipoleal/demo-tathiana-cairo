# Demo — Dra. Tathiana Cairo

Site demo da **Dra. Tathiana Cairo — Harmonização Corporal e Emagrecimento** (Juquehy, São Sebastião – SP, e Santos – SP). HTML, CSS e JS puro, sem build.

## Direção visual (arte do designer, aplicada em 07/10/2026)

- **Base**: arte do designer no Canva (PDF), com fundo café `#44291E` e textura geométrica, cards `#4F3023`, botões nude `#E1C5A9`, rótulos `#DFBA97`, botão escuro `#633E2D` e textos em branco.
- **Tipografia**: uma família só, **Belleza** (a fonte dos títulos da arte), hospedada em `fonts/`. Sem itálico e sem negrito sintético.
- **Consistência**: um raio (`--r: 20px`), uma sombra (`--sombra`) e uma escala de espaço (`--e1…--e5`) usados em tudo.
- **Fotos**: retrato real da Dra. Tathiana (recortado), espaço de atendimento, tratamentos e pós-operatório, todas extraídas do kit do designer e convertidas para WebP em `img/`.
- **Ajustes em relação à arte**:
  - Belleza em tudo, no lugar de Belleza + Crave Sans + Open Sans itálico.
  - Sem selo azul de verificado no Instagram, e com o @ corrigido para `@dratathianacairo`.
  - Foto da fita métrica (Emagrecimento) trocada por um recorte de bem-estar, para não sugerir promessa de medidas.
  - Foto do pós-operatório recortada sem os círculos de evolução da cicatriz, para não ficar como antes e depois.
  - Etapas com coroa de folhas e ícone, sem numeração, e título "Do primeiro contato ao acompanhamento", sem prometer resultado.
  - Cards de tratamento com os nomes e textos reais, já que na arte os 5 repetiam "Harmonização Corporal".
  - O avatar cinza das avaliações saiu; ficam os depoimentos em carrossel com "Cliente no Google".
- **Fora da arte**: agendamento pelo WhatsApp, locais com mapa e "Aberto agora", e rodapé, já no visual novo.

## Seções (8)

1. Hero: foto da Dra., "Dra. Tathiana Cairo · Fisioterapeuta", título da arte, nota 5,0, 7,7 mil seguidores, Agendar
2. Sobre: por que com uma fisioterapeuta
3. Tratamentos: os 5 serviços oficiais + card de avaliação, preço "consulte"
4. Pós-operatório (drenagem, com cirurgia e liberação médica)
5. Como funciona: avaliação → protocolo → sessões → acompanhamento
6. Avaliações reais do Google (carrossel) + Instagram
7. Agendamento pelo WhatsApp
8. Locais (abas Juquehy / Santos)

## Como editar

Tudo fica no objeto `CONFIG`, no início do `<script>`:

- `registro`: hoje mostra só "CREFITO-3" (demo). **Acrescente o número real** antes de virar site oficial (aparece no rodapé e no card de formação).
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
- [x] Espaço para o registro profissional: "Dra. Tathiana Cairo — CREFITO-3" (falta o número).
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
