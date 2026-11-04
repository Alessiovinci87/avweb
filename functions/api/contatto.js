// Cloudflare Pages Function: riceve il modulo di /contatti/ e invia le email tramite Resend.
// Chiavi e indirizzi arrivano SOLO dalle variabili d'ambiente del progetto Cloudflare Pages:
//   RESEND_API_KEY (segreto), TURNSTILE_SECRET_KEY (segreto), TURNSTILE_SITE_KEY, MAIL_TO, MAIL_FROM
// Solo per le prove in locale (file .dev.vars, escluso da git): MAIL_DRY_RUN=1 non invia le email.

import { emailPerMe, emailPerCliente } from "../../lib/email.js";

const TIPI = { sito: "Sito", gestionale: "Gestionale o web app", automazione: "Automazione", altro: "Altro" };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TELEFONO = /^\+?[0-9 ().\/-]{6,20}$/;
// Nel nome niente indirizzi web, email o domini (per esempio "sito.it"): i programmi di posta li renderebbero link
const LINK = /:\/\/|www\.|@|[a-z0-9-]\.[a-z]{2,}\b/i;
const NOME_MAX = 60;
const ERR_INVIO = "Non sono riuscito a inviare il messaggio. Riprova tra poco o scrivimi su WhatsApp o via email con i pulsanti qui sotto.";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function inviaEmail(env, email) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(email),
  });
  return r.status;
}

// La pagina chiede qui la chiave pubblica di Turnstile, così non è scritta nel codice
export async function onRequestGet({ env }) {
  if (!env.TURNSTILE_SITE_KEY) return json({ error: "Modulo non configurato." }, 503);
  return json({ siteKey: env.TURNSTILE_SITE_KEY });
}

export async function onRequestPost({ request, env, waitUntil }) {
  // Accetta solo invii dalla stessa origine del sito
  const origin = request.headers.get("Origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ error: "Richiesta non valida." }, 403);

  let form;
  try { form = await request.formData(); } catch { return json({ error: "Richiesta non valida." }, 400); }
  const campo = (k) => String(form.get(k) ?? "").trim();

  // Campo nascosto anti-bot: se è compilato fingiamo che sia andato tutto bene e non inviamo nulla
  if (campo("sito_web")) return json({ ok: true });

  const nome = campo("nome").replace(/\s+/g, " ");
  const recapito = campo("recapito").replace(/[\r\n]+/g, " ");
  const tipo = campo("tipo");
  const messaggio = campo("messaggio");
  const isEmail = EMAIL.test(recapito);
  const recapitoValido = isEmail || (TELEFONO.test(recapito) && recapito.replace(/\D/g, "").length >= 6);
  if (!nome) return json({ error: "Scrivi il tuo nome." }, 400);
  if (nome.length > NOME_MAX || LINK.test(nome)) return json({ error: `Scrivi solo il tuo nome, senza link (massimo ${NOME_MAX} caratteri).` }, 400);
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

  const dati = { nome, recapito, tipo: TIPI[tipo], messaggio, quando: new Date(), isEmail };

  // 1. Email a me con il riepilogo completo
  const perMe = emailPerMe(dati);
  const emailMe = { from: env.MAIL_FROM, to: [env.MAIL_TO], subject: perMe.subject, html: perMe.html, text: perMe.text };
  if (isEmail) emailMe.reply_to = recapito;

  // 2. Conferma al cliente, solo se ha scritto un'email: saluto e tipo di richiesta, nient'altro
  const perCliente = isEmail ? emailPerCliente(dati) : null;
  const emailCliente = perCliente && { from: env.MAIL_FROM, to: [recapito], reply_to: env.MAIL_TO, subject: perCliente.subject, html: perCliente.html, text: perCliente.text };

  if (env.MAIL_DRY_RUN === "1") return json({ ok: true, dryRun: true, conferma: Boolean(emailCliente) });

  try {
    const stato = await inviaEmail(env, emailMe);
    if (stato < 200 || stato > 299) {
      console.error("Modulo contatti: Resend ha risposto", stato); // nessun dato personale nei log
      return json({ error: ERR_INVIO }, 502);
    }
  } catch {
    console.error("Modulo contatti: Resend non raggiungibile");
    return json({ error: ERR_INVIO }, 502);
  }

  // La conferma parte dopo la risposta: se fallisce, la richiesta è comunque arrivata e il cliente vede il successo
  if (emailCliente) {
    waitUntil(
      inviaEmail(env, emailCliente)
        .then((stato) => { if (stato < 200 || stato > 299) console.error("Modulo contatti: conferma non inviata, Resend ha risposto", stato); })
        .catch(() => console.error("Modulo contatti: conferma non inviata, Resend non raggiungibile"))
    );
  }
  return json({ ok: true });
}
