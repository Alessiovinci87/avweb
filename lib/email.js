// Modelli delle email del modulo di contatto: HTML compatibile con i programmi di posta
// (tabelle, stili inline, max 600 px) + versione in testo semplice.

const SITE = "https://avweb.it";
const LOGO = `${SITE}/img/email/avweb-logo-per-sfondi-chiari.png`;
// Colori del sito: blu notte del logo per pulsante e filetto, verde menta solo come dettaglio
const ACCENT = "#0b1220";
const MINT = "#34d399";
const FONT = "Arial,Helvetica,sans-serif";
const C = { bg: "#f2f0eb", card: "#ffffff", text: "#0b1220", muted: "#434b5a", line: "#dcd8cf" };

export function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
const multiline = (s) => escapeHtml(s).replace(/\r?\n/g, "<br>");

export function dataOra(d = new Date()) {
  const s = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Numero per wa.me: solo cifre con prefisso internazionale (se manca, si assume l'Italia)
export function numeroWhatsApp(recapito) {
  const r = recapito.trim();
  let n = r.replace(/\D/g, "");
  if (r.startsWith("+")) return n;
  if (n.startsWith("00")) return n.slice(2);
  return n.length <= 10 ? "39" + n : n;
}

function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;">
  <tr><td align="center" bgcolor="${ACCENT}" style="border-radius:999px;background-color:${ACCENT};">
    <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 26px;font-family:${FONT};font-size:16px;font-weight:bold;line-height:20px;color:#ffffff;text-decoration:none;border-radius:999px;">${label}</a>
  </td></tr></table>`;
}

function rows(items) {
  return items.map(([k, v], i) => `<tr>
    <td class="k" valign="top" style="padding:12px 16px 12px 0;width:140px;font-family:${FONT};font-size:14px;line-height:20px;color:${C.muted};${i ? `border-top:1px solid ${C.line};` : ""}">${k}</td>
    <td class="v" valign="top" style="padding:12px 0;font-family:${FONT};font-size:15px;line-height:22px;color:${C.text};${i ? `border-top:1px solid ${C.line};` : ""}">${v}</td>
  </tr>`).join("");
}

function layout({ preheader, body, footer }) {
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>AV Web</title>
<style>
@media (max-width: 480px) {
  .pad { padding-left: 20px !important; padding-right: 20px !important; }
  .k { display: block !important; width: auto !important; padding: 12px 0 2px !important; }
  .v { display: block !important; padding: 0 0 12px !important; border-top: 0 !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background-color:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg};">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.bg}" style="background-color:${C.bg};">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
      <tr><td bgcolor="${MINT}" style="height:5px;line-height:5px;font-size:0;border-radius:4px 4px 0 0;background-color:${MINT};">&nbsp;</td></tr>
      <tr><td class="pad" bgcolor="${C.card}" style="background-color:${C.card};padding:28px 32px 8px;">
        <a href="${SITE}" style="text-decoration:none;"><img src="${LOGO}" width="169" height="39" alt="AV Web" style="display:block;border:0;outline:none;width:169px;height:39px;font-family:${FONT};font-size:18px;font-weight:bold;color:${C.text};"></a>
      </td></tr>
      <tr><td class="pad" bgcolor="${C.card}" style="background-color:${C.card};padding:16px 32px 32px;border-radius:0 0 4px 4px;">
${body}
      </td></tr>
      <tr><td style="padding:20px 16px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${C.muted};text-align:center;">
${footer}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

const h1 = (t) => `<h1 style="margin:0 0 18px;font-family:${FONT};font-size:24px;line-height:30px;font-weight:bold;color:${C.text};">${t}</h1>`;
const p = (t, extra = "") => `<p style="margin:0 0 14px;font-family:${FONT};font-size:16px;line-height:24px;color:${C.text};${extra}">${t}</p>`;
const table = (items) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">${rows(items)}</table>`;

// d = { nome, recapito, tipo, messaggio, quando (Date), isEmail } — tutti i testi del cliente passano da escapeHtml
export function emailPerMe(d) {
  const quando = dataOra(d.quando);
  const contattoHtml = d.isEmail
    ? `<a href="mailto:${escapeHtml(d.recapito)}" style="color:${C.text};">${escapeHtml(d.recapito)}</a>`
    : escapeHtml(d.recapito);
  const pulsante = d.isEmail
    ? button(`mailto:${d.recapito}?subject=${encodeURIComponent("Re: la tua richiesta ad AV Web")}`, "Rispondi via email")
    : button(`https://wa.me/${numeroWhatsApp(d.recapito)}`, "Scrivi su WhatsApp");
  const body = `${h1("Nuova richiesta di preventivo")}
${table([
  ["Nome", escapeHtml(d.nome)],
  ["Contatto", contattoHtml],
  ["Di cosa ha bisogno", escapeHtml(d.tipo)],
  ["Messaggio", d.messaggio ? multiline(d.messaggio) : `<span style="color:${C.muted};">Nessun messaggio</span>`],
  ["Data e ora", escapeHtml(quando)],
])}
<div style="height:24px;line-height:24px;font-size:0;">&nbsp;</div>
${pulsante}`;
  const html = layout({
    preheader: `${d.tipo} – ${d.nome}`,
    body,
    footer: `Inviata dal modulo di contatto di <a href="${SITE}/contatti/" style="color:${C.muted};">avweb.it</a>`,
  });
  const text = [
    "NUOVA RICHIESTA DI PREVENTIVO",
    "",
    `Nome: ${d.nome}`,
    `Contatto: ${d.recapito}`,
    `Di cosa ha bisogno: ${d.tipo}`,
    `Messaggio: ${d.messaggio || "(nessun messaggio)"}`,
    `Data e ora: ${quando}`,
    "",
    d.isEmail ? `Rispondi via email: mailto:${d.recapito}` : `Scrivi su WhatsApp: https://wa.me/${numeroWhatsApp(d.recapito)}`,
    "",
    "Inviata dal modulo di contatto di avweb.it",
  ].join("\n");
  return { subject: `Nuova richiesta dal sito – ${d.tipo} – ${d.nome}`, html, text };
}

// Conferma al cliente: solo saluto con il nome e tipo di richiesta.
// Per sicurezza NON contiene il messaggio né il contatto scritti nel modulo.
export function emailPerCliente(d) {
  const body = `${p(`Ciao ${escapeHtml(d.nome)},`)}
${p("grazie per avermi scritto. Ho ricevuto la tua richiesta e ti rispondo entro 24 ore, dal lunedì al venerdì.")}
${p(`<span style="color:${C.muted};">Tipo di richiesta:</span> <strong>${escapeHtml(d.tipo)}</strong>`)}
${p("Se vuoi aggiungere qualcosa, rispondi pure a questa email.")}
${p("A presto,<br><strong>Alessio – AV Web</strong>", "margin-bottom:0;")}`;
  const html = layout({
    preheader: "Ho ricevuto la tua richiesta e ti rispondo entro 24 ore.",
    body,
    footer: `AV Web di Alessio Vinci · Alghero (SS) · P.IVA IT03014680908<br>
<a href="${SITE}" style="color:${C.muted};">avweb.it</a> · <a href="${SITE}/privacy.html" style="color:${C.muted};">Privacy policy</a>`,
  });
  const text = [
    `Ciao ${d.nome},`,
    "",
    "grazie per avermi scritto. Ho ricevuto la tua richiesta e ti rispondo entro 24 ore, dal lunedì al venerdì.",
    "",
    `Tipo di richiesta: ${d.tipo}`,
    "",
    "Se vuoi aggiungere qualcosa, rispondi pure a questa email.",
    "",
    "A presto,",
    "Alessio – AV Web",
    "",
    "AV Web di Alessio Vinci · Alghero (SS) · P.IVA IT03014680908",
    "avweb.it · Privacy policy: https://avweb.it/privacy.html",
  ].join("\n");
  return { subject: "Ho ricevuto la tua richiesta – AV Web", html, text };
}
