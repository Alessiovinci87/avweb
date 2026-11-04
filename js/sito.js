/* AV Web — script comune: anno nel footer, menu del telefono, filtro dei progetti, modulo di contatto */
(function () {
  var anno = document.getElementById("anno");
  if (anno) anno.textContent = new Date().getFullYear();

  // Menu apribile sul telefono
  var header = document.querySelector("header.top");
  var btn = header && header.querySelector(".menu-btn");
  var menu = document.getElementById("menu");
  if (btn && menu) {
    var label = btn.querySelector(".menu-label");
    var setOpen = function (open) {
      header.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      if (label) label.textContent = open ? "Chiudi" : "Menu";
    };
    var isOpen = function () { return btn.getAttribute("aria-expanded") === "true"; };
    btn.addEventListener("click", function () { setOpen(!isOpen()); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("click", function (e) { if (isOpen() && !header.contains(e.target)) setOpen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) { setOpen(false); btn.focus(); }
    });
    var desktop = window.matchMedia("(min-width: 961px)");
    var onChange = function () { if (desktop.matches) setOpen(false); };
    if (desktop.addEventListener) desktop.addEventListener("change", onChange);
  }

  // Filtro della pagina Progetti: senza JavaScript i pulsanti restano nascosti e si vedono tutti i progetti
  var filtro = document.querySelector(".filter");
  if (filtro) {
    var schede = Array.prototype.slice.call(document.querySelectorAll(".cards [data-cat]"));
    var pulsanti = Array.prototype.slice.call(filtro.querySelectorAll("button"));
    var conteggio = document.getElementById("conteggio");
    filtro.hidden = false;
    filtro.addEventListener("click", function (e) {
      var scelto = e.target.closest("button");
      if (!scelto) return;
      var cat = scelto.getAttribute("data-filter");
      pulsanti.forEach(function (b) { b.setAttribute("aria-pressed", b === scelto ? "true" : "false"); });
      var n = 0;
      schede.forEach(function (s) {
        var visibile = cat === "tutti" || s.getAttribute("data-cat") === cat;
        s.hidden = !visibile;
        if (visibile) n++;
      });
      if (conteggio) conteggio.textContent = n === 1 ? "1 progetto mostrato" : n + " progetti mostrati";
    });
  }

  // Modulo di contatto: la chiave pubblica di Turnstile arriva dalla Function (variabile d'ambiente)
  var form = document.getElementById("form-contatto");
  if (form) {
    var avviso = document.getElementById("form-msg");
    var grazie = document.getElementById("form-ok");
    var invia = form.querySelector('button[type="submit"]');
    var widget = null;
    var ERR_GENERICO = "Non sono riuscito a inviare il messaggio. Riprova tra poco o scrivimi su WhatsApp o via email con i pulsanti qui sotto.";
    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var TELEFONO = /^\+?[0-9 ().\/-]{6,20}$/;
    var LINK = /:\/\/|www\.|@|[a-z0-9-]\.[a-z]{2,}\b/i;

    var mostraAvviso = function (testo) { avviso.textContent = testo || ""; };

    fetch("/api/contatto", { headers: { Accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (cfg) {
        window.avwebTurnstile = function () {
          widget = window.turnstile.render("#turnstile", { sitekey: cfg.siteKey, language: "it", theme: "dark", size: "flexible" });
        };
        var sc = document.createElement("script");
        sc.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=avwebTurnstile";
        sc.async = true;
        sc.onerror = function () { mostraAvviso("Il controllo anti-spam non si è caricato. Ricarica la pagina o scrivimi con i pulsanti qui sotto."); };
        document.head.appendChild(sc);
      })
      .catch(function () {
        mostraAvviso("Il modulo non è disponibile in questo momento. Scrivimi su WhatsApp o via email con i pulsanti qui sotto.");
        invia.disabled = true;
      });

    var segna = function (campo, idErr, testo) {
      var e = document.getElementById(idErr);
      e.textContent = testo || "";
      e.hidden = !testo;
      if (campo) {
        if (testo) campo.setAttribute("aria-invalid", "true");
        else campo.removeAttribute("aria-invalid");
      }
      return !testo;
    };

    var valida = function () {
      var nome = form.elements.nome, rec = form.elements.recapito, r = rec.value.trim();
      var recOk = EMAIL.test(r) || (TELEFONO.test(r) && r.replace(/\D/g, "").length >= 6);
      var nomeVal = nome.value.trim();
      var ok = segna(nome, "e-nome", !nomeVal ? "Scrivi il tuo nome." : (nomeVal.length > 60 || LINK.test(nomeVal)) ? "Scrivi solo il tuo nome, senza link (massimo 60 caratteri)." : "");
      ok = segna(rec, "e-recapito", !r ? "Scrivi un'email o un numero di telefono." : recOk ? "" : "Controlla l'email o il numero di telefono.") && ok;
      var tipoOk = segna(null, "e-tipo", form.querySelector('input[name="tipo"]:checked') ? "" : "Scegli di cosa hai bisogno.");
      if (!ok) form.querySelector('[aria-invalid="true"]').focus();
      else if (!tipoOk) form.querySelector('input[name="tipo"]').focus();
      return ok && tipoOk;
    };

    // Appena l'utente corregge un campo, il suo errore sparisce
    form.addEventListener("input", function (ev) {
      var c = ev.target;
      if (c.name === "nome" || c.name === "recapito") segna(c, "e-" + c.name, "");
      if (c.name === "tipo") segna(null, "e-tipo", "");
    });

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      mostraAvviso("");
      if (!valida()) return;
      if (widget === null || !window.turnstile.getResponse(widget)) { mostraAvviso("Completa il controllo anti-spam qui sopra e riprova."); return; }
      invia.disabled = true;
      invia.textContent = "Invio in corso…";
      fetch("/api/contatto", { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok && d.ok === true, d: d }; });
        })
        .then(function (res) {
          if (res.ok) {
            form.hidden = true;
            grazie.hidden = false;
            grazie.querySelector("h2").focus();
          } else {
            mostraAvviso(res.d.error || ERR_GENERICO);
            if (window.turnstile && widget !== null) window.turnstile.reset(widget);
          }
        })
        .catch(function () { mostraAvviso(ERR_GENERICO); })
        .then(function () { invia.disabled = false; invia.textContent = "Invia la richiesta"; });
    });
  }
})();
