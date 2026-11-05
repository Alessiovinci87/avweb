/* AV Web — script comune: tela con tavole trascinabili, cursore "Alessio", progetti e metodo legati allo scroll.
   Senza JavaScript o con "riduci movimento" la pagina resta completa e statica. */
(function () {
  var root = document.documentElement;
  var anno = document.getElementById("anno");
  if (anno) anno.textContent = new Date().getFullYear();

  // ---------- Menu del telefono ----------
  var header = document.querySelector("header.top");
  var btn = header.querySelector(".menu-btn");
  var label = btn.querySelector(".menu-label");
  var setOpen = function (open) {
    header.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    label.textContent = open ? "Chiudi" : "Menu";
  };
  btn.addEventListener("click", function () { setOpen(btn.getAttribute("aria-expanded") !== "true"); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && header.classList.contains("open")) { setOpen(false); btn.focus(); }
  });
  header.querySelector("#menu").addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
  var onScroll = function () { header.classList.toggle("scrolled", window.scrollY > 8); };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var desktop = window.matchMedia("(min-width: 900px)");
  var wide = window.matchMedia("(min-width: 1000px)");

  // ---------- Progetti: immagine ferma che cambia (funziona anche con riduci movimento: è solo uno stato) ----------
  var cases = Array.prototype.slice.call(document.querySelectorAll("[data-case]"));
  var stageImgs = Array.prototype.slice.call(document.querySelectorAll("[data-stage]"));
  var dots = Array.prototype.slice.call(document.querySelectorAll(".stage-dots li"));
  var stageName = document.querySelector("[data-stage-name]");
  var attivo = -1;
  var mostra = function (i) {
    if (i === attivo) return;
    attivo = i;
    cases.forEach(function (c, k) { c.classList.toggle("is-on", k === i); });
    stageImgs.forEach(function (im, k) { im.classList.toggle("is-on", k === i); });
    dots.forEach(function (d, k) { d.classList.toggle("is-on", k === i); });
    if (stageName) stageName.textContent = cases[i].getAttribute("data-name");
  };
  if ("IntersectionObserver" in window && cases.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) mostra(Number(en.target.getAttribute("data-case"))); });
    }, { rootMargin: "-45% 0px -45% 0px" });
    cases.forEach(function (c) { io.observe(c); });
    mostra(0);
  }

  // ---------- Filtro della pagina Progetti: senza JavaScript i pulsanti restano nascosti e si vedono tutti i progetti ----------
  var filtro = document.querySelector(".filter");
  if (filtro) {
    var schede = Array.prototype.slice.call(document.querySelectorAll("[data-cat]"));
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
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    });
  }

  // ---------- Modulo di contatto (stessa logica e stessa Function del sito attuale, tema chiaro) ----------
  var form = document.getElementById("form-contatto");
  if (form) {
    var avviso = document.getElementById("form-msg");
    var grazie = document.getElementById("form-ok");
    var invia = form.querySelector('button[type="submit"]');
    var testoInvia = invia.textContent;
    var widget = null;
    var ERR_GENERICO = "Non sono riuscito a inviare il messaggio. Riprova tra poco o scrivimi su WhatsApp o via email.";
    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var TELEFONO = /^\+?[0-9 ().\/-]{6,20}$/;
    var LINK = /:\/\/|www\.|@|[a-z0-9-]\.[a-z]{2,}\b/i;
    var mostraAvviso = function (t) { avviso.textContent = t || ""; };
    mostraAvviso("");

    fetch("/api/contatto", { headers: { Accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (cfg) {
        window.avwebTurnstile = function () {
          widget = window.turnstile.render("#turnstile", { sitekey: cfg.siteKey, language: "it", theme: "light", size: "flexible" });
        };
        var sc = document.createElement("script");
        sc.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=avwebTurnstile";
        sc.async = true;
        sc.onerror = function () { mostraAvviso("Il controllo anti-spam non si è caricato. Ricarica la pagina o scrivimi su WhatsApp o via email."); };
        document.head.appendChild(sc);
      })
      .catch(function () {
        mostraAvviso("Il modulo non è disponibile in questo momento. Scrivimi su WhatsApp o via email: trovi i contatti qui accanto.");
        invia.disabled = true;
      });

    var segna = function (campo, idErr, testo) {
      var e = document.getElementById(idErr);
      e.textContent = testo || "";
      e.hidden = !testo;
      if (campo) { if (testo) campo.setAttribute("aria-invalid", "true"); else campo.removeAttribute("aria-invalid"); }
      return !testo;
    };
    var valida = function () {
      var nome = form.elements.nome, rec = form.elements.recapito, r = rec.value.trim(), n = nome.value.trim();
      var recOk = EMAIL.test(r) || (TELEFONO.test(r) && r.replace(/\D/g, "").length >= 6);
      var ok = segna(nome, "e-nome", !n ? "Scrivi il tuo nome." : (n.length > 60 || LINK.test(n)) ? "Scrivi solo il tuo nome, senza link (massimo 60 caratteri)." : "");
      ok = segna(rec, "e-recapito", !r ? "Scrivi un'email o un numero di telefono." : recOk ? "" : "Controlla l'email o il numero di telefono.") && ok;
      var tipoOk = segna(null, "e-tipo", form.querySelector('input[name="tipo"]:checked') ? "" : "Scegli di cosa hai bisogno.");
      if (!ok) form.querySelector('[aria-invalid="true"]').focus();
      else if (!tipoOk) form.querySelector('input[name="tipo"]').focus();
      return ok && tipoOk;
    };
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
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok && d.ok === true, d: d }; }); })
        .then(function (res) {
          if (res.ok) { form.hidden = true; grazie.hidden = false; grazie.querySelector("h2").focus(); }
          else { mostraAvviso(res.d.error || ERR_GENERICO); if (window.turnstile && widget !== null) window.turnstile.reset(widget); }
        })
        .catch(function () { mostraAvviso(ERR_GENERICO); })
        .then(function () { invia.disabled = false; invia.textContent = testoInvia; });
    });
  }

  // ---------- Case study: passando su una nota si evidenzia il suo punto sulla tavola ----------
  document.querySelectorAll("[data-note]").forEach(function (item) {
    var pin = document.querySelector('.note-pin[data-pin="' + item.getAttribute("data-note") + '"]');
    if (!pin) return;
    var on = function () { pin.classList.add("is-hot"); item.classList.add("is-hot"); };
    var off = function () { pin.classList.remove("is-hot"); item.classList.remove("is-hot"); };
    [item, pin].forEach(function (el) { el.addEventListener("pointerenter", on); el.addEventListener("pointerleave", off); });
    item.addEventListener("focusin", on); item.addEventListener("focusout", off);
  });

  if (reduce || !window.gsap) return; // da qui in poi solo movimento

  root.classList.add("anim");
  var gsap = window.gsap;
  gsap.registerPlugin.apply(gsap, [window.ScrollTrigger, window.Draggable, window.SplitText].filter(Boolean));
  var ST = window.ScrollTrigger;

  // ---------- Scorrimento fluido (solo mouse: sul telefono resta quello nativo) ----------
  if (fine && window.Lenis) {
    var lenis = new window.Lenis({ lerp: 0.11 });
    lenis.on("scroll", ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var t = document.querySelector(a.getAttribute("href"));
        if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -70 }); t.setAttribute("tabindex", "-1"); t.focus({ preventScroll: true }); }
      });
    });
  }

  // ---------- Titolo: le righe salgono una alla volta ----------
  var h1 = document.querySelector("h1.split");
  if (h1 && window.SplitText) document.fonts.ready.then(function () {
    var split = new window.SplitText(h1, { type: "lines", mask: "lines", linesClass: "line" });
    gsap.from(split.lines, { yPercent: 110, duration: 1, ease: "expo.out", stagger: 0.09, delay: 0.1 });
    gsap.from(".hero-kick, .hero-lead, .hero-cta", { y: 18, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.08, delay: 0.35 });
  });

  // ---------- Comparsa dei titoli di sezione ----------
  gsap.utils.toArray(".reveal").forEach(function (el) {
    gsap.to(el, { opacity: 1, y: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 85%", once: true } });
  });
  gsap.utils.toArray(".do-col, .case h3, .way, .rise").forEach(function (el) {
    gsap.from(el, { y: 32, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
  });

  // Percorso: le tappe compaiono una dopo l'altra
  if (document.querySelector(".path")) gsap.from(".path li", { x: -16, opacity: 0, duration: 0.7, ease: "power3.out", stagger: 0.12, scrollTrigger: { trigger: ".path", start: "top 80%", once: true } });

  // ---------- Pulsanti "magnetici" ----------
  if (fine) {
    document.querySelectorAll(".magnet").forEach(function (el) {
      var xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
      var yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.18);
        yTo((e.clientY - r.top - r.height / 2) * 0.28);
      });
      el.addEventListener("pointerleave", function () { xTo(0); yTo(0); });
    });
  }

  var board = document.querySelector(".board");
  if (board && window.Draggable) {
  // ---------- Tela: tavole, guide di allineamento, cursore ----------
  var frames = Array.prototype.slice.call(board.querySelectorAll("[data-frame]"));
  var guideV = board.querySelector(".guide-v");
  var guideH = board.querySelector(".guide-h");
  var cursor = board.querySelector("[data-cursor]");
  var comment = board.querySelector("[data-comment]");
  var tidyBtn = document.querySelector("[data-tidy]");

  frames.forEach(function (f) {
    var h = document.createElement("span");
    h.className = "handles";
    h.innerHTML = "<i></i><i></i><i></i><i></i>";
    f.appendChild(h);
  });
  var seleziona = function (f) { frames.forEach(function (x) { x.classList.toggle("is-sel", x === f); }); };

  // Rettangolo di una tavola (solo il corpo, senza il nome) relativo alla tela
  var rect = function (f) {
    var b = board.getBoundingClientRect(), r = f.querySelector(".frame-body").getBoundingClientRect();
    return { l: r.left - b.left, t: r.top - b.top, r: r.right - b.left, b: r.bottom - b.top, w: r.width, h: r.height };
  };

  // Entrata delle tavole
  gsap.from(frames, { y: 40, opacity: 0, duration: 1.1, ease: "expo.out", stagger: 0.12, delay: 0.25 });

  // Guide di allineamento come in un programma di progettazione: si agganciano entro 6 px
  var SNAP = 6;
  var aggancia = function (drag) {
    var f = drag.target, me = rect(f), dx = 0, dy = 0, gx = null, gy = null;
    frames.forEach(function (o) {
      if (o === f) return;
      var r = rect(o);
      [[me.l, r.l], [me.l, r.r], [me.r, r.r], [me.r, r.l]].forEach(function (p) {
        if (gx === null && Math.abs(p[0] - p[1]) < SNAP) { dx = p[1] - p[0]; gx = p[1]; }
      });
      [[me.t, r.t], [me.b, r.b], [me.t, r.b], [me.b, r.t]].forEach(function (p) {
        if (gy === null && Math.abs(p[0] - p[1]) < SNAP) { dy = p[1] - p[0]; gy = p[1]; }
      });
    });
    if (dx || dy) gsap.set(f, { x: "+=" + dx, y: "+=" + dy });
    gsap.set(guideV, { left: gx || 0, opacity: gx === null ? 0 : 1 });
    gsap.set(guideH, { top: gy || 0, opacity: gy === null ? 0 : 1 });
  };
  var nascondiGuide = function () { gsap.to([guideV, guideH], { opacity: 0, duration: 0.2 }); };

  var drags = [];
  var intro = null;
  var attivaTrascinamento = function () {
    if (drags.length) return;
    drags = window.Draggable.create(frames, {
      bounds: board,
      zIndexBoost: false,
      onPress: function () {
        if (intro) { intro.progress(1).kill(); intro = null; gsap.to(cursor, { opacity: 0, duration: 0.3 }); }
        seleziona(this.target);
        this.target.classList.add("is-dragging");
      },
      onDrag: function () { aggancia(this); },
      onRelease: function () { this.target.classList.remove("is-dragging"); nascondiGuide(); },
    });
  };
  var disattivaTrascinamento = function () { drags.forEach(function (d) { d.kill(); }); drags = []; };

  // "Metti in ordine": le tavole si allineano su una griglia, poi tornano dov'erano
  var inOrdine = false, posizioniLibere = null;
  if (tidyBtn) {
    tidyBtn.addEventListener("click", function () {
      if (intro) { intro.progress(1).kill(); intro = null; gsap.set(cursor, { opacity: 0 }); }
      var a = frames[0], b = frames[1], c = frames[2];
      if (!inOrdine) {
        posizioniLibere = frames.map(function (f) { return { x: gsap.getProperty(f, "x"), y: gsap.getProperty(f, "y") }; });
        var bw = board.clientWidth, gap = 32;
        var ra = rect(a), rb = rect(b), rc = rect(c);
        var x0 = Math.round(bw * 0.53), y0 = Math.round(board.clientHeight * 0.1);
        var mete = [
          { f: a, l: x0, t: y0, r: ra },
          { f: b, l: x0, t: y0 + ra.h + gap + 20, r: rb },
          { f: c, l: x0 + rb.w + gap, t: y0 + ra.h + gap + 20, r: rc },
        ];
        mete.forEach(function (m, i) {
          gsap.to(m.f, { x: "+=" + (m.l - m.r.l), y: "+=" + (m.t - m.r.t), duration: 0.9, ease: "expo.inOut", delay: i * 0.05 });
        });
        seleziona(null);
      } else {
        frames.forEach(function (f, i) { gsap.to(f, { x: posizioniLibere[i].x, y: posizioniLibere[i].y, duration: 0.9, ease: "expo.inOut", delay: i * 0.05 }); });
      }
      inOrdine = !inOrdine;
      tidyBtn.textContent = inOrdine ? "Sparpaglia" : "Metti in ordine";
      tidyBtn.setAttribute("aria-pressed", inOrdine ? "true" : "false");
    });
  }

  // Il cursore di Alessio: prende la tavola di Profit, la allinea a Emovere, lascia un commento su QuitFresh
  var avviaIntro = function () {
    var a = frames[0], b = frames[1], c = frames[2];
    var ra = rect(a), rb = rect(b), rc = rect(c);
    var bw = board.clientWidth;
    var spostX = ra.l - rc.l; // allinea il bordo sinistro di Profit a quello di Emovere
    if (Math.abs(spostX) > bw * 0.25 || !desktop.matches) spostX = Math.min(40, bw * 0.06);
    var presa = { x: rc.l + rc.w * 0.45, y: rc.t + rc.h * 0.4 };
    gsap.set(cursor, { x: bw * 0.98, y: board.clientHeight * 0.95, opacity: 0 });
    gsap.set(comment, { x: rb.l + rb.w * 0.55, y: rb.t + rb.h * 0.62, opacity: 0, scale: 0.6, transformOrigin: "0% 100%" });
    var bubble = comment.querySelector(".bubble");
    // Se il fumetto uscirebbe dalla tela, va a sinistra della puntina
    var pinX = rb.l + rb.w * 0.55;
    var aSinistra = pinX + 244 > bw;
    comment.classList.toggle("left", aSinistra);
    if (aSinistra) gsap.set(comment, { x: pinX - 208, transformOrigin: "100% 100%" });

    intro = gsap.timeline({ delay: 1.4, onComplete: function () { intro = null; } })
      .to(cursor, { opacity: 1, duration: 0.3 })
      .to(cursor, { x: presa.x, y: presa.y, duration: 1.1, ease: "power3.inOut" })
      .add(function () { seleziona(c); })
      .to(cursor, { scale: 0.88, duration: 0.12 })
      .to([cursor, c], { x: "+=" + spostX, duration: 0.9, ease: "power2.inOut" })
      .add(function () { if (desktop.matches) gsap.set(guideV, { left: ra.l, opacity: 1 }); })
      .to(cursor, { scale: 1, duration: 0.12 }, "+=0.25")
      .add(function () { nascondiGuide(); })
      .to(cursor, { x: rb.l + rb.w * 0.55 + 6, y: rb.t + rb.h * 0.62 + 4, duration: 0.9, ease: "power3.inOut" }, "+=0.2")
      .add(function () { seleziona(null); })
      .to(comment, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(2)" })
      .from(bubble, { opacity: 0, x: -8, duration: 0.3 }, "<0.15")
      .to(cursor, { x: "+=" + Math.min(160, bw * 0.12), y: "-=" + 60, duration: 1.4, ease: "sine.inOut" }, "+=0.6")
      .to(cursor, { opacity: 0, duration: 0.5 }, "+=1.2");
  };

  // Desktop: trascinamento attivo. Telefono: solo l'animazione, così la pagina scorre normalmente
  var impostaTela = function () {
    if (desktop.matches) attivaTrascinamento(); else disattivaTrascinamento();
  };
  impostaTela();
  if (desktop.addEventListener) desktop.addEventListener("change", function () {
    if (intro) { intro.progress(1).kill(); intro = null; }
    gsap.set(frames, { x: 0, y: 0 }); gsap.set([cursor, comment], { opacity: 0 }); seleziona(null);
    inOrdine = false; if (tidyBtn) { tidyBtn.textContent = "Metti in ordine"; tidyBtn.setAttribute("aria-pressed", "false"); }
    impostaTela();
  });
  window.addEventListener("load", function () {
    // Parte quando la tela è visibile
    ST.create({ trigger: board, start: "top 80%", once: true, onEnter: avviaIntro });
  });

  }

  if (document.querySelector(".method-pin")) {
  // ---------- Metodo: lo schizzo diventa il sito mentre scorri ----------
  var sketch = document.querySelector(".wf-sketch");
  var scan = document.querySelector(".wf-scan");
  var steps = Array.prototype.slice.call(document.querySelectorAll(".steps li"));
  var mm = gsap.matchMedia();
  mm.add("(min-width: 1000px)", function () {
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".method-pin", start: "top top", end: "+=180%", pin: true, scrub: 0.6,
        onUpdate: function (st) {
          var i = Math.min(steps.length - 1, Math.floor(st.progress * steps.length));
          steps.forEach(function (s, k) { s.classList.toggle("is-on", k === i); });
        },
      },
    });
    tl.from(".wf-sketch i", { scale: 0.6, opacity: 0, transformOrigin: "0 0", stagger: 0.04, duration: 0.6, ease: "power2.out" })
      .set(scan, { opacity: 1 })
      .to(sketch, { clipPath: "inset(0 0 0 100%)", duration: 1.2, ease: "none" })
      .fromTo(scan, { left: "0%" }, { left: "100%", duration: 1.2, ease: "none" }, "<")
      .set(scan, { opacity: 0 })
      .to({}, { duration: 0.4 });
    return function () { steps.forEach(function (s) { s.classList.remove("is-on"); }); steps[0].classList.add("is-on"); };
  });
  // Telefono: lo schizzo si scopre una volta, quando entra nello schermo
  mm.add("(max-width: 999px)", function () {
    gsap.timeline({ scrollTrigger: { trigger: ".wf", start: "top 70%", once: true } })
      .from(".wf-sketch i", { scale: 0.6, opacity: 0, transformOrigin: "0 0", stagger: 0.03, duration: 0.5 })
      .set(scan, { opacity: 1 })
      .to(sketch, { clipPath: "inset(0 0 0 100%)", duration: 1.4, ease: "power2.inOut" }, "+=0.3")
      .fromTo(scan, { left: "0%" }, { left: "100%", duration: 1.4, ease: "power2.inOut" }, "<")
      .set(scan, { opacity: 0 });
  });
  }

  // ---------- Case study: le note compaiono sulla tavola, le tavole scorrono a velocità diverse ----------
  if (document.querySelector(".study-canvas")) {
    gsap.from(".note-pin", { scale: 0, duration: 0.5, ease: "back.out(2.5)", stagger: 0.15, scrollTrigger: { trigger: ".study-canvas", start: "top 60%", once: true } });
    gsap.utils.toArray("[data-speed]").forEach(function (el) {
      gsap.to(el, { yPercent: -Number(el.getAttribute("data-speed")), ease: "none", scrollTrigger: { trigger: ".study-canvas", start: "top bottom", end: "bottom top", scrub: true } });
    });
  }

  // ---------- Settore: lo schema del telefono si costruisce blocco per blocco ----------
  if (document.querySelector(".schema")) {
    gsap.from(".schema-block", { y: 18, opacity: 0, duration: 0.6, ease: "power3.out", stagger: 0.1, scrollTrigger: { trigger: ".schema", start: "top 75%", once: true } });
  }
})();
