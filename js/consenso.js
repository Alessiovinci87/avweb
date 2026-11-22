/* AV Web — consenso ai cookie di analisi (Microsoft Clarity).
   Clarity viene caricato SOLO dopo "Accetta". La scelta resta salvata per 6 mesi in questo browser
   e si può cambiare da "Preferenze cookie" nel footer (elementi con data-preferenze-cookie). */
(function () {
  var PROGETTO = "zhjx4yvroq";
  var CHIAVE = "avweb_consenso";
  var DURATA = 182 * 24 * 60 * 60 * 1000;

  function leggi() {
    try {
      var s = JSON.parse(window.localStorage.getItem(CHIAVE) || "null");
      if (!s || s.v !== 1 || Date.now() - s.ts > DURATA) return null;
      return s.analisi === "si" ? "si" : s.analisi === "no" ? "no" : null;
    } catch (e) { return null; }
  }
  function salva(scelta) {
    try { window.localStorage.setItem(CHIAVE, JSON.stringify({ v: 1, analisi: scelta, ts: Date.now() })); } catch (e) {}
  }

  function avviaClarity() {
    if (window.clarity) return;
    window.clarity = function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.clarity.ms/tag/" + PROGETTO;
    document.head.appendChild(s);
    window.clarity("consentv2", { ad_Storage: "denied", analytics_Storage: "granted" });
  }
  function fermaClarity() {
    if (window.clarity) {
      window.clarity("consentv2", { ad_Storage: "denied", analytics_Storage: "denied" });
      window.clarity("consent", false);
    }
    var h = window.location.hostname;
    var domini = ["", h, "." + h, "." + h.split(".").slice(-2).join(".")];
    ["_clck", "_clsk"].forEach(function (nome) {
      domini.forEach(function (d) {
        document.cookie = nome + "=; Max-Age=0; path=/" + (d ? "; domain=" + d : "");
      });
    });
  }

  var stile =
    ".consenso{position:fixed;z-index:70;left:16px;right:16px;bottom:16px;max-width:460px;margin-left:auto;" +
    "background:#0b1220;color:#dbe4f0;border-radius:14px;padding:20px 20px 18px;box-shadow:0 18px 50px rgba(11,18,32,.35);" +
    "font:15px/1.55 Onest,ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}" +
    ".consenso h2{margin:0 0 6px;font:700 17px/1.3 Bricolage,'Segoe UI',system-ui,sans-serif;color:#fff}" +
    ".consenso p{margin:0 0 14px;color:#b9c6d8}" +
    ".consenso a{color:#fff}" +
    ".consenso-azioni{display:flex;gap:10px}" +
    ".consenso-azioni button{flex:1;min-height:46px;border-radius:10px;font-weight:600;font-size:15px;font-family:inherit;cursor:pointer;" +
    "border:1px solid rgba(255,255,255,.28);background:transparent;color:#fff}" +
    ".consenso-azioni button:hover{border-color:#fff}" +
    ".consenso-azioni button:focus-visible{outline:2px solid #34d399;outline-offset:2px}" +
    "@media (min-width:600px){.consenso{left:auto;right:24px;bottom:24px}}" +
    "@media print{.consenso{display:none}}";

  var banner = null;
  function chiudi() { if (banner) { banner.remove(); banner = null; } }
  function mostra() {
    if (banner) return;
    if (!document.getElementById("consenso-stile")) {
      var st = document.createElement("style");
      st.id = "consenso-stile";
      st.textContent = stile;
      document.head.appendChild(st);
    }
    banner = document.createElement("div");
    banner.className = "consenso";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-modal", "false");
    banner.setAttribute("aria-labelledby", "consenso-titolo");
    banner.setAttribute("aria-describedby", "consenso-testo");
    banner.innerHTML =
      '<h2 id="consenso-titolo">Cookie di analisi</h2>' +
      '<p id="consenso-testo">Con il tuo consenso uso Microsoft Clarity per capire come viene usato il sito e migliorarlo. ' +
      'I campi dei moduli non vengono registrati. Se rifiuti, il sito funziona allo stesso modo. ' +
      'Puoi cambiare idea in qualsiasi momento da “Preferenze cookie” in fondo alla pagina. ' +
      '<a href="/cookie.html">Cookie policy</a></p>' +
      '<div class="consenso-azioni"><button type="button" data-scelta="no">Rifiuta</button>' +
      '<button type="button" data-scelta="si">Accetta</button></div>';
    banner.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-scelta]");
      if (b) scegli(b.getAttribute("data-scelta"));
    });
    document.body.appendChild(banner);
  }

  function scegli(scelta) {
    var prima = leggi();
    salva(scelta);
    chiudi();
    if (scelta === "si") avviaClarity();
    else if (prima === "si") { fermaClarity(); window.location.reload(); }
  }

  document.addEventListener("click", function (e) {
    var p = e.target.closest("[data-preferenze-cookie]");
    if (!p) return;
    e.preventDefault();
    mostra();
    var primo = banner && banner.querySelector("button");
    if (primo) primo.focus();
  });

  var stato = leggi();
  if (stato === "si") avviaClarity();
  else if (stato === null) mostra();
})();
