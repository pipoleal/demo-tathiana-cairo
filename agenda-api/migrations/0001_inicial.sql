-- Agenda multi-clínica: cada site (cliente) é uma "clínica" com seus locais,
-- horários, tratamentos, feriados, bloqueios e reservas.
-- Horários são guardados em minutos desde a meia-noite (660 = 11:00) e datas
-- como 'AAAA-MM-DD', sempre no fuso da clínica.

CREATE TABLE clinicas (
  id               TEXT PRIMARY KEY,            -- slug usado na URL, ex.: 'tathiana-cairo'
  nome             TEXT NOT NULL,
  whatsapp         TEXT NOT NULL,               -- só dígitos, com DDI: 5512987016860
  fuso             TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  passo_min        INTEGER NOT NULL DEFAULT 30, -- de quanto em quanto tempo um horário pode começar
  antecedencia_min INTEGER NOT NULL DEFAULT 120,-- reserva pelo site só com essa antecedência
  janela_dias      INTEGER NOT NULL DEFAULT 45, -- até quantos dias à frente o site mostra
  senha_hash       TEXT,                        -- pbkdf2$<iteracoes>$<sal b64>$<hash b64>
  criado_em        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE locais (
  clinica_id TEXT NOT NULL REFERENCES clinicas(id),
  id         TEXT NOT NULL,
  nome       TEXT NOT NULL,
  ativo      INTEGER NOT NULL DEFAULT 1,
  ordem      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (clinica_id, id)
);

-- Uma linha por janela de atendimento; mais de uma no mesmo dia = intervalo (almoço).
CREATE TABLE horarios (
  clinica_id TEXT NOT NULL,
  local_id   TEXT NOT NULL,
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0 = domingo
  inicio     INTEGER NOT NULL,
  fim        INTEGER NOT NULL CHECK (fim > inicio),
  FOREIGN KEY (clinica_id, local_id) REFERENCES locais(clinica_id, id)
);
CREATE INDEX horarios_clinica ON horarios (clinica_id, dia_semana);

CREATE TABLE tratamentos (
  clinica_id  TEXT NOT NULL REFERENCES clinicas(id),
  id          TEXT NOT NULL,
  nome        TEXT NOT NULL,
  duracao_min INTEGER NOT NULL CHECK (duracao_min > 0),
  ativo       INTEGER NOT NULL DEFAULT 1,
  ordem       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (clinica_id, id)
);

-- Feriados próprios da clínica (municipais etc.), além dos nacionais calculados no código.
-- local_id NULL = vale para todos os locais. 'md' = 'MM-DD' (repete todo ano).
CREATE TABLE feriados (
  clinica_id TEXT NOT NULL REFERENCES clinicas(id),
  local_id   TEXT,
  md         TEXT NOT NULL,
  nome       TEXT NOT NULL
);

-- Bloqueios pontuais: dia inteiro (inicio/fim NULL) ou um trecho do dia.
CREATE TABLE bloqueios (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  clinica_id TEXT NOT NULL REFERENCES clinicas(id),
  data       TEXT NOT NULL,
  inicio     INTEGER,
  fim        INTEGER,
  motivo     TEXT,
  criado_em  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX bloqueios_dia ON bloqueios (clinica_id, data);

-- Reservas. 'pendente' e 'confirmada' ocupam o horário; 'cancelada' libera.
-- A profissional é uma só: uma reserva ocupa o horário em todos os locais.
CREATE TABLE reservas (
  id            TEXT PRIMARY KEY,
  clinica_id    TEXT NOT NULL REFERENCES clinicas(id),
  local_id      TEXT NOT NULL,
  tratamento_id TEXT NOT NULL,
  data          TEXT NOT NULL,
  inicio        INTEGER NOT NULL,
  fim           INTEGER NOT NULL,
  nome          TEXT NOT NULL,
  telefone      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','confirmada','cancelada')),
  origem        TEXT NOT NULL DEFAULT 'site' CHECK (origem IN ('site','manual')),
  observacao    TEXT,
  consentimento INTEGER NOT NULL DEFAULT 0,
  criado_em     TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX reservas_dia ON reservas (clinica_id, data, status);
