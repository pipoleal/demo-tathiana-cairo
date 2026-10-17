/* ============================================================
   API de agenda (Cloudflare Worker + D1), multi-clínica.

   Público (usado pelo site):
     GET  /api/:clinica/config
     GET  /api/:clinica/disponibilidade?local=&tratamento=&de=AAAA-MM-DD&dias=21
     POST /api/:clinica/reservas
   Painel (Authorization: Bearer <token>):
     POST   /api/:clinica/admin/login
     GET    /api/:clinica/admin/agenda?de=&ate=
     POST   /api/:clinica/admin/reservas          (agendamento manual, já confirmado)
     PATCH  /api/:clinica/admin/reservas/:id      ({status})
     POST   /api/:clinica/admin/bloqueios
     DELETE /api/:clinica/admin/bloqueios/:id
   O painel em si é estático (public/admin) e servido pelo próprio Worker.
   ============================================================ */
import { agoraNoFuso, carregarClinica, carregarOcupacao, dataValida, hhmm, livresNoDia, minutos, somarDias } from "./agenda.js";
import { conferirSenha, criarToken, lerToken } from "./auth.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Max-Age": "86400",
};
const json = (dados, status = 200, extra = {}) =>
  new Response(JSON.stringify(dados), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...CORS, ...extra } });
const erro = (mensagem, status = 400, extra = {}) => json({ erro: mensagem, ...extra }, status);
const corpo = async req => { try { return await req.json(); } catch { return {}; } };
const idReserva = () => { const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", b = crypto.getRandomValues(new Uint8Array(8)); return [...b].map(x => a[x % a.length]).join(""); };
const soDigitos = s => String(s || "").replace(/\D/g, "");

const INSERIR = `INSERT INTO reservas (id, clinica_id, local_id, tratamento_id, data, inicio, fim, nome, telefone, status, origem, observacao, consentimento)
  SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13
  WHERE NOT EXISTS (SELECT 1 FROM reservas WHERE clinica_id = ?2 AND data = ?5 AND status IN ('pendente','confirmada') AND inicio < ?7 AND fim > ?6)
    AND NOT EXISTS (SELECT 1 FROM bloqueios WHERE clinica_id = ?2 AND data = ?5 AND COALESCE(inicio, 0) < ?7 AND COALESCE(fim, 1440) > ?6)`;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (url.pathname === "/") return Response.redirect(new URL("/admin/", url), 302);

    const m = url.pathname.match(/^\/api\/([a-z0-9-]+)\/(.+?)\/?$/);
    if (!m) return env.ASSETS ? env.ASSETS.fetch(req) : erro("Não encontrado.", 404);
    const [, clinicaId, rota] = m;

    try {
      const cfg = await carregarClinica(env.DB, clinicaId);
      if (!cfg) return erro("Clínica não encontrada.", 404);
      const agora = agoraNoFuso(cfg.clinica.fuso);

      /* ---------- Público ---------- */
      if (rota === "config" && req.method === "GET") {
        return json({
          clinica: { nome: cfg.clinica.nome, whatsapp: cfg.clinica.whatsapp, janela_dias: cfg.clinica.janela_dias, hoje: agora.data },
          locais: cfg.locais.map(l => ({ id: l.id, nome: l.nome, agendaOnline: cfg.horarios.some(h => h.local_id === l.id) })),
          tratamentos: cfg.tratamentos.map(t => ({ id: t.id, nome: t.nome, duracao: t.duracao_min })),
        }, 200, { "Cache-Control": "public, max-age=60" });
      }

      if (rota === "disponibilidade" && req.method === "GET") {
        const local = cfg.locais.find(l => l.id === url.searchParams.get("local"));
        const trat = cfg.tratamentos.find(t => t.id === url.searchParams.get("tratamento"));
        if (!local || !trat) return erro("Local ou tratamento inválido.");
        const de = dataValida(url.searchParams.get("de")) && url.searchParams.get("de") > agora.data ? url.searchParams.get("de") : agora.data;
        const dias = Math.min(62, Math.max(1, +url.searchParams.get("dias") || 21));
        const ate = somarDias(de, dias - 1);
        const ocupacao = await carregarOcupacao(env.DB, clinicaId, de, ate);
        const lista = [];
        for (let d = de; d <= ate; d = somarDias(d, 1)) {
          const r = livresNoDia({ cfg, data: d, localId: local.id, duracao: trat.duracao_min, ocupacao, agora });
          lista.push({ data: d, aberto: r.aberto, feriado: r.feriado, livres: r.livres.map(hhmm) });
        }
        return json({ local: local.id, tratamento: trat.id, duracao: trat.duracao_min, dias: lista }, 200, { "Cache-Control": "no-store" });
      }

      if (rota === "reservas" && req.method === "POST") {
        const b = await corpo(req);
        if (b.empresa) return json({ ok: true }); // honeypot: robôs preenchem o campo escondido
        const local = cfg.locais.find(l => l.id === b.local), trat = cfg.tratamentos.find(t => t.id === b.tratamento);
        const inicio = minutos(b.hora), nome = String(b.nome || "").trim().slice(0, 80), tel = soDigitos(b.telefone);
        if (!local || !trat) return erro("Escolha o tratamento e o local.");
        if (!dataValida(b.data) || inicio === null) return erro("Escolha um dia e um horário.");
        if (nome.length < 2) return erro("Informe o seu nome.", 400, { campo: "nome" });
        if (tel.length < 10 || tel.length > 13) return erro("Informe um WhatsApp válido, com DDD.", 400, { campo: "telefone" });
        if (b.consentimento !== true) return erro("É preciso concordar com o uso dos dados para o agendamento.", 400, { campo: "consentimento" });

        const ocupacao = await carregarOcupacao(env.DB, clinicaId, b.data, b.data);
        const dia = livresNoDia({ cfg, data: b.data, localId: local.id, duracao: trat.duracao_min, ocupacao, agora });
        if (!dia.livres.includes(inicio)) return erro("Esse horário não está mais disponível. Escolha outro.", 409, { codigo: "indisponivel" });

        const pend = await env.DB.prepare("SELECT COUNT(*) n FROM reservas WHERE clinica_id = ? AND telefone = ? AND status = 'pendente' AND data >= ?")
          .bind(clinicaId, tel, agora.data).first();
        if (pend.n >= 3) return erro("Você já tem reservas aguardando confirmação. Fale com a Dra. pelo WhatsApp.", 429);

        const id = idReserva(), fim = inicio + trat.duracao_min;
        const r = await env.DB.prepare(INSERIR).bind(id, clinicaId, local.id, trat.id, b.data, inicio, fim, nome, tel, "pendente", "site", null, 1).run();
        if (!r.meta.changes) return erro("Esse horário acabou de ser reservado por outra pessoa. Escolha outro.", 409, { codigo: "indisponivel" });
        return json({ ok: true, reserva: { id, data: b.data, hora: hhmm(inicio), fim: hhmm(fim), local: local.nome, tratamento: trat.nome, status: "pendente" } }, 201);
      }

      /* ---------- Painel ---------- */
      if (rota === "admin/login" && req.method === "POST") {
        const { senha } = await corpo(req);
        const linha = await env.DB.prepare("SELECT senha_hash FROM clinicas WHERE id = ?").bind(clinicaId).first();
        if (!env.SESSION_SECRET) return erro("Servidor sem SESSION_SECRET configurado.", 500);
        if (!(await conferirSenha(senha, linha?.senha_hash))) return erro("Senha incorreta.", 401);
        return json({ token: await criarToken(clinicaId, env.SESSION_SECRET), clinica: cfg.clinica.nome });
      }

      if (rota.startsWith("admin/")) {
        const quem = await lerToken((req.headers.get("Authorization") || "").replace(/^Bearer /, ""), env.SESSION_SECRET || "");
        if (quem !== clinicaId) return erro("Sessão expirada. Entre de novo.", 401);
        return await admin(req, env, url, rota.slice(6), cfg, agora, clinicaId);
      }
      return erro("Não encontrado.", 404);
    } catch (e) {
      console.error(e);
      return erro("Erro inesperado. Tente de novo em instantes.", 500);
    }
  },
};

async function admin(req, env, url, rota, cfg, agora, clinicaId) {
  const db = env.DB;
  const nomeLocal = id => cfg.locais.find(l => l.id === id)?.nome || id;
  const nomeTrat = id => cfg.tratamentos.find(t => t.id === id)?.nome || id;

  if (rota === "agenda" && req.method === "GET") {
    const de = dataValida(url.searchParams.get("de")) ? url.searchParams.get("de") : agora.data;
    let ate = dataValida(url.searchParams.get("ate")) ? url.searchParams.get("ate") : somarDias(de, 6);
    if (ate < de || ate > somarDias(de, 62)) ate = somarDias(de, 6);
    const [r, b] = await db.batch([
      db.prepare("SELECT id, local_id, tratamento_id, data, inicio, fim, nome, telefone, status, origem, observacao, criado_em FROM reservas WHERE clinica_id = ? AND data BETWEEN ? AND ? ORDER BY data, inicio").bind(clinicaId, de, ate),
      db.prepare("SELECT id, data, inicio, fim, motivo FROM bloqueios WHERE clinica_id = ? AND data BETWEEN ? AND ? ORDER BY data, inicio").bind(clinicaId, de, ate),
    ]);
    const pendentes = await db.prepare("SELECT COUNT(*) n FROM reservas WHERE clinica_id = ? AND status = 'pendente' AND data >= ?").bind(clinicaId, agora.data).first();
    const ocupacao = await carregarOcupacao(db, clinicaId, de, ate);
    const menor = Math.min(...cfg.tratamentos.map(t => t.duracao_min));
    const dias = [];
    for (let d = de; d <= ate; d = somarDias(d, 1)) {
      const porLocal = cfg.locais.map(l => {
        const x = livresNoDia({ cfg, data: d, localId: l.id, duracao: menor, ocupacao, agora, ignorarAntecedencia: true });
        return { local: l.id, aberto: x.aberto, feriado: x.feriado, livres: x.livres.length };
      });
      const doDia = r.results.filter(x => x.data === d);
      dias.push({ data: d, locais: porLocal, pendentes: doDia.filter(x => x.status === "pendente").length, confirmadas: doDia.filter(x => x.status === "confirmada").length });
    }
    return json({
      hoje: agora.data, pendentes: pendentes.n, duracaoReferencia: menor,
      locais: cfg.locais, tratamentos: cfg.tratamentos.map(t => ({ id: t.id, nome: t.nome, duracao: t.duracao_min })),
      dias,
      reservas: r.results.map(x => ({ ...x, hora: hhmm(x.inicio), horaFim: hhmm(x.fim), local: nomeLocal(x.local_id), tratamento: nomeTrat(x.tratamento_id) })),
      bloqueios: b.results.map(x => ({ ...x, hora: x.inicio == null ? null : hhmm(x.inicio), horaFim: x.fim == null ? null : hhmm(x.fim) })),
    }, 200, { "Cache-Control": "no-store" });
  }

  if (rota === "reservas" && req.method === "POST") {
    const b = await corpo(req);
    const local = cfg.locais.find(l => l.id === b.local), trat = cfg.tratamentos.find(t => t.id === b.tratamento), inicio = minutos(b.hora);
    const nome = String(b.nome || "").trim().slice(0, 80), tel = soDigitos(b.telefone);
    if (!local || !trat || !dataValida(b.data) || inicio === null) return erro("Preencha local, tratamento, dia e horário.");
    if (nome.length < 2) return erro("Informe o nome da cliente.");
    const fim = inicio + trat.duracao_min;
    if (fim > 1440) return erro("O atendimento passaria da meia-noite.");
    const id = idReserva();
    const r = await db.prepare(INSERIR).bind(id, clinicaId, local.id, trat.id, b.data, inicio, fim, nome, tel, "confirmada", "manual", String(b.observacao || "").slice(0, 300) || null, 0).run();
    if (!r.meta.changes) return erro("Já existe um atendimento ou bloqueio nesse horário.", 409);
    return json({ ok: true, id }, 201);
  }

  const mr = rota.match(/^reservas\/([A-Z0-9]+)$/);
  if (mr && req.method === "PATCH") {
    const { status } = await corpo(req);
    if (!["pendente", "confirmada", "cancelada"].includes(status)) return erro("Status inválido.");
    // Reativar uma reserva cancelada só se o horário ainda estiver livre.
    const r = await db.prepare(`UPDATE reservas SET status = ?1, atualizado_em = datetime('now')
      WHERE id = ?2 AND clinica_id = ?3 AND (?1 = 'cancelada' OR status != 'cancelada' OR NOT EXISTS (
        SELECT 1 FROM reservas r2 WHERE r2.clinica_id = ?3 AND r2.data = reservas.data AND r2.id != ?2
          AND r2.status IN ('pendente','confirmada') AND r2.inicio < reservas.fim AND r2.fim > reservas.inicio))`)
      .bind(status, mr[1], clinicaId).run();
    if (!r.meta.changes) return erro("Não foi possível: o horário já foi ocupado por outra reserva.", 409);
    return json({ ok: true });
  }

  if (rota === "bloqueios" && req.method === "POST") {
    const b = await corpo(req);
    if (!dataValida(b.data)) return erro("Escolha o dia.");
    const diaTodo = !b.inicio && !b.fim, ini = minutos(b.inicio), fim = minutos(b.fim);
    if (!diaTodo && (ini === null || fim === null || fim <= ini)) return erro("Horário de início e fim inválidos.");
    const r = await db.prepare("INSERT INTO bloqueios (clinica_id, data, inicio, fim, motivo) VALUES (?, ?, ?, ?, ?)")
      .bind(clinicaId, b.data, diaTodo ? null : ini, diaTodo ? null : fim, String(b.motivo || "").slice(0, 120) || null).run();
    return json({ ok: true, id: r.meta.last_row_id }, 201);
  }

  const mb = rota.match(/^bloqueios\/(\d+)$/);
  if (mb && req.method === "DELETE") {
    await db.prepare("DELETE FROM bloqueios WHERE id = ? AND clinica_id = ?").bind(+mb[1], clinicaId).run();
    return json({ ok: true });
  }
  return erro("Não encontrado.", 404);
}
