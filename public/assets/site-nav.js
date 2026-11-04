// Mobile menu for the shared navigation (see src/site-nav.js).
(function () {
  var header = document.querySelector("header.topbar");
  var burger = header && header.querySelector(".fx-burger");
  if (!burger) return;
  var mobile = window.matchMedia("(max-width: 1180px)");

  function setOpen(open) {
    header.classList.toggle("fx-open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  burger.addEventListener("click", function () {
    setOpen(!header.classList.contains("fx-open"));
  });

  header.querySelectorAll(".nav-item > .nav-toggle").forEach(function (toggle) {
    toggle.addEventListener("click", function () {
      if (!mobile.matches) return;
      var item = toggle.parentElement;
      var open = !item.classList.contains("fx-expanded");
      item.classList.toggle("fx-expanded", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  // Close after choosing a link (same-page anchors like #contact otherwise leave it open).
  header.querySelectorAll("nav.nav a").forEach(function (a) {
    a.addEventListener("click", function () {
      if (mobile.matches) setOpen(false);
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && header.classList.contains("fx-open")) {
      setOpen(false);
      burger.focus();
    }
  });

  mobile.addEventListener("change", function (e) {
    if (!e.matches) setOpen(false);
  });
})();
