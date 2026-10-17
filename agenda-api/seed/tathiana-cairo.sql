-- Configuração da clínica Dra. Tathiana Cairo.
-- [CONFIRMAR COM ELA] durações dos tratamentos e horários de Santos.

INSERT INTO clinicas (id, nome, whatsapp, passo_min, antecedencia_min, janela_dias)
VALUES ('tathiana-cairo', 'Dra. Tathiana Cairo', '5512987016860', 30, 120, 45);

INSERT INTO locais (clinica_id, id, nome, ordem) VALUES
  ('tathiana-cairo', 'juquehy', 'Juquehy', 0),
  ('tathiana-cairo', 'santos',  'Santos',  1);

-- Juquehy: segunda a sexta, das 11h às 18h (horário real informado).
INSERT INTO horarios (clinica_id, local_id, dia_semana, inicio, fim) VALUES
  ('tathiana-cairo', 'juquehy', 1, 660, 1080),
  ('tathiana-cairo', 'juquehy', 2, 660, 1080),
  ('tathiana-cairo', 'juquehy', 3, 660, 1080),
  ('tathiana-cairo', 'juquehy', 4, 660, 1080),
  ('tathiana-cairo', 'juquehy', 5, 660, 1080);
-- Santos: sem horário online até ela informar os dias (o site orienta a combinar pelo WhatsApp).
-- Exemplo para quando souber (sábado, 9h às 13h):
-- INSERT INTO horarios (clinica_id, local_id, dia_semana, inicio, fim) VALUES ('tathiana-cairo', 'santos', 6, 540, 780);

-- Durações estimadas [CONFIRMAR COM ELA].
INSERT INTO tratamentos (clinica_id, id, nome, duracao_min, ordem) VALUES
  ('tathiana-cairo', 'avaliacao',     'Avaliação',             60, 0),
  ('tathiana-cairo', 'harmonizacao',  'Harmonização Corporal', 60, 1),
  ('tathiana-cairo', 'emagrecimento', 'Emagrecimento',         60, 2),
  ('tathiana-cairo', 'facial',        'Estética Facial',       60, 3),
  ('tathiana-cairo', 'tecnologias',   'Tecnologias Estéticas', 45, 4),
  ('tathiana-cairo', 'manuais',       'Terapias Manuais',      90, 5);

-- Feriados municipais (os nacionais e de SP são calculados no código).
INSERT INTO feriados (clinica_id, local_id, md, nome) VALUES
  ('tathiana-cairo', 'juquehy', '01-20', 'Dia de São Sebastião'),
  ('tathiana-cairo', 'santos',  '01-26', 'Aniversário de Santos'),
  ('tathiana-cairo', 'santos',  '09-08', 'Nossa Senhora do Monte Serrat');
