// Cloudflare Pages Function: riceve il modulo di /contatti/ e invia l'email tramite Resend.
// Chiavi e indirizzi arrivano SOLO dalle variabili d'ambiente del progetto Cloudflare Pages:
//   RESEND_API_KEY (segreto), TURNSTILE_SECRET_KEY (segreto), TURNSTILE_SITE_KEY, MAIL_TO, MAIL_FROM
// Solo per le prove in locale (file .dev.vars, escluso da git): MAIL_DRY_RUN=1 non invia l'email.

const TIPI = { sito: "Sito", gestionale: "Gestionale o web app", automazione: "Automazione", altro: "Altro" };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TELEFONO = /^\+?[0-9 ().\/-]{6,20}$/;
const ERR_INVIO = "Non sono riuscito a inviare il messaggio. Riprova tra poco o scrivimi su WhatsApp o via email con i pulsanti qui sotto.";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

// La pagina chiede qui la chiave pubblica di Turnstile, così non è scritta nel codice
export async function onRequestGet({ env }) {
  if (!env.TURNSTILE_SITE_KEY) return json({ error: "Modulo non configurato." }, 503);
  return json({ siteKey: env.TURNSTILE_SITE_KEY });
}

export async function onRequestPost({ request, env }) {
  // Accetta solo invii dalla stessa origine del sito
  const origin = request.headers.get("Origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ error: "Richiesta non valida." }, 403);

  let form;
  try { form = await request.formData(); } catch { return json({ error: "Richiesta non valida." }, 400); }
  const campo = (k) => String(form.get(k) ?? "").trim();

  // Campo nascosto anti-bot: se è compilato fingiamo che sia andato tutto bene e non inviamo nulla
  if (campo("sito_web")) return json({ ok: true });

  const nome = campo("nome").replace(/[\r\n]+/g, " ");
  const recapito = campo("recapito").replace(/[\r\n]+/g, " ");
  const tipo = campo("tipo");
  const messaggio = campo("messaggio");
  const recapitoValido = EMAIL.test(recapito) || (TELEFONO.test(recapito) && recapito.replace(/\D/g, "").length >= 6);
  if (!nome || nome.length > 100) return json({ error: "Scrivi il tuo nome." }, 400);
  if (!recapito || recapito.length > 150 || !recapitoValido) return json({ error: "Controlla l'email o il numero di telefono." }, 400);
  if (!Object.hasOwn(TIPI, tipo)) return json({ error: "Scegli di cosa hai bisogno." }, 400);
  if (messaggio.length > 2000) return json({ error: "Il messaggio è troppo lungo." }, 400);

  if (!env.TURNSTILE_SECRET_KEY || !env.MAIL_TO || !env.MAIL_FROM || (!env.RESEND_API_KEY && env.MAIL_DRY_RUN !== "1")) {
    console.error("Modulo contatti: variabili d'ambiente mancanti");
    return json({ error: ERR_INVIO }, 503);
  }

  // Verifica Turnstile
  const token = campo("cf-turnstile-response");
  if (!token) return json({ error: "Completa il controllo anti-spam e riprova." }, 400);
  let verifica = { success: false };
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: request.headers.get("CF-Connecting-IP") || "" }),
    });
    verifica = await r.json();
  } catch { /* resta success: false */ }
  if (!verifica.success) return json({ error: "Il controllo anti-spam non è riuscito. Riprova." }, 400);

  const testo = [
    "Nuova richiesta dal modulo di contatto di avweb.it",
    "",
    `Nome: ${nome}`,
    `Email o telefono: ${recapito}`,
    `Di cosa ha bisogno: ${TIPI[tipo]}`,
    "",
    "Messaggio:",
    messaggio || "(nessun messaggio)",
    "",
  ].join("\n");
  const email = { from: env.MAIL_FROM, to: [env.MAIL_TO], subject: `Richiesta dal sito: ${TIPI[tipo]} - ${nome.slice(0, 60)}`, text: testo };
  if (EMAIL.test(recapito)) email.reply_to = recapito;

  if (env.MAIL_DRY_RUN === "1") return json({ ok: true, dryRun: true });

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(email),
    });
    if (!r.ok) {
      console.error("Modulo contatti: Resend ha risposto", r.status); // nessun dato personale nei log
      return json({ error: ERR_INVIO }, 502);
    }
  } catch {
    console.error("Modulo contatti: Resend non raggiungibile");
    return json({ error: ERR_INVIO }, 502);
  }
  return json({ ok: true });
}
