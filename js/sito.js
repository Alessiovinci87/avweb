/* AV Web — script comune: anno nel footer, menu del telefono, filtro dei progetti */
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
})();
