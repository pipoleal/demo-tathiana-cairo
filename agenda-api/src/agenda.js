/* Regras de agenda: datas no fuso da clínica, feriados e cálculo de horários livres. */

export const hhmm = m => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export const minutos = s => { const r = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(s || ""); return r ? +r[1] * 60 + +r[2] : null; };
export const dataValida = s => /^\d{4}-\d{2}-\d{2}$/.test(s || "") && !isNaN(Date.parse(s + "T00:00:00Z"));
export const somarDias = (s, n) => { const d = new Date(s + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const diaSemana = s => new Date(s + "T00:00:00Z").getUTCDay();

/** Data e hora "agora" no fuso da clínica. */
export function agoraNoFuso(fuso) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit", hour: "numeric", minute: "numeric", hour12: false })
    .formatToParts(new Date()).map(x => [x.type, x.value]));
  return { data: `${p.year}-${p.month}-${p.day}`, minutos: (+p.hour % 24) * 60 + +p.minute };
}

/* Feriados nacionais e do estado de SP. Carnaval, Sexta-feira Santa e Corpus Christi vêm da Páscoa. */
const FIXOS = { "01-01": "Ano-Novo", "04-21": "Tiradentes", "05-01": "Dia do Trabalho", "07-09": "Revolução Constitucionalista",
  "09-07": "Independência", "10-12": "Nossa Senhora Aparecida", "11-02": "Finados", "11-15": "Proclamação da República",
  "11-20": "Consciência Negra", "12-25": "Natal" };
function pascoa(a) {
  const b = a % 19, c = Math.floor(a / 100), d = a % 100, e = Math.floor(c / 4), f = c % 4, g = Math.floor((c + 8) / 25), h = Math.floor((c - g + 1) / 3),
    i = (19 * b + c - e - h + 15) % 30, k = Math.floor(d / 4), l = d % 4, m = (32 + 2 * f + 2 * k - i - l) % 7, n = Math.floor((b + 11 * i + 22 * m) / 451);
  const mes = Math.floor((i + m - 7 * n + 114) / 31), dia = ((i + m - 7 * n + 114) % 31) + 1;
  return `${a}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}
export function feriado(data, localId, feriadosClinica) {
  const md = data.slice(5);
  if (FIXOS[md]) return FIXOS[md];
  const p = pascoa(+data.slice(0, 4));
  const movel = { [somarDias(p, -48)]: "Carnaval", [somarDias(p, -47)]: "Carnaval", [somarDias(p, -2)]: "Sexta-feira Santa", [somarDias(p, 60)]: "Corpus Christi" }[data];
  if (movel) return movel;
  const proprio = feriadosClinica.find(f => f.md === md && (!f.local_id || f.local_id === localId));
  return proprio ? proprio.nome : null;
}

/** Carrega tudo que o cálculo precisa sobre a clínica (uma ida ao banco). */
export async function carregarClinica(db, clinicaId) {
  const [c, locais, horarios, tratamentos, feriados] = await db.batch([
    db.prepare("SELECT id, nome, whatsapp, fuso, passo_min, antecedencia_min, janela_dias FROM clinicas WHERE id = ?").bind(clinicaId),
    db.prepare("SELECT id, nome FROM locais WHERE clinica_id = ? AND ativo = 1 ORDER BY ordem").bind(clinicaId),
    db.prepare("SELECT local_id, dia_semana, inicio, fim FROM horarios WHERE clinica_id = ? ORDER BY inicio").bind(clinicaId),
    db.prepare("SELECT id, nome, duracao_min FROM tratamentos WHERE clinica_id = ? AND ativo = 1 ORDER BY ordem").bind(clinicaId),
    db.prepare("SELECT local_id, md, nome FROM feriados WHERE clinica_id = ?").bind(clinicaId),
  ]);
  const clinica = c.results[0];
  if (!clinica) return null;
  return { clinica, locais: locais.results, horarios: horarios.results, tratamentos: tratamentos.results, feriados: feriados.results };
}

/** Reservas ativas e bloqueios entre duas datas, agrupados por dia. */
export async function carregarOcupacao(db, clinicaId, de, ate) {
  const [r, b] = await db.batch([
    db.prepare("SELECT data, inicio, fim FROM reservas WHERE clinica_id = ? AND data BETWEEN ? AND ? AND status IN ('pendente','confirmada')").bind(clinicaId, de, ate),
    db.prepare("SELECT data, inicio, fim FROM bloqueios WHERE clinica_id = ? AND data BETWEEN ? AND ?").bind(clinicaId, de, ate),
  ]);
  const porDia = {};
  for (const x of r.results) (porDia[x.data] ??= []).push({ inicio: x.inicio, fim: x.fim });
  for (const x of b.results) (porDia[x.data] ??= []).push({ inicio: x.inicio ?? 0, fim: x.fim ?? 1440 });
  return porDia;
}

/**
 * Horários de início livres num dia, para um local e uma duração.
 * Respeita: janela de atendimento do local, feriados, ocupação (de qualquer local,
 * já que a profissional é uma só), antecedência mínima e janela máxima de dias.
 */
export function livresNoDia({ cfg, data, localId, duracao, ocupacao, agora, ignorarAntecedencia = false }) {
  const { clinica, horarios, feriados } = cfg;
  const res = { data, aberto: false, feriado: null, livres: [] };
  const janelas = horarios.filter(h => h.local_id === localId && h.dia_semana === diaSemana(data));
  if (!janelas.length) return res;
  res.feriado = feriado(data, localId, feriados);
  if (res.feriado) return res;
  res.aberto = true;
  if (data < agora.data) return res;
  if (!ignorarAntecedencia && data > somarDias(agora.data, clinica.janela_dias)) return res;
  const minimo = data === agora.data ? agora.minutos + (ignorarAntecedencia ? 0 : clinica.antecedencia_min) : -1;
  const ocup = ocupacao[data] || [];
  for (const j of janelas) {
    for (let s = j.inicio; s + duracao <= j.fim; s += clinica.passo_min) {
      if (s < minimo) continue;
      if (ocup.some(o => o.inicio < s + duracao && o.fim > s)) continue;
      res.livres.push(s);
    }
  }
  return res;
}
