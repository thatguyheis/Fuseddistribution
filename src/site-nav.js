// Shared primary navigation for every page that uses the standard
// <header class="topbar"><a class="brand">..</a><nav class="nav">..</nav></header> layout.
//
// Pages are hand-built or pipeline-generated and each carries its own copy of the
// menu. Rewriting the menu at the edge keeps every page (including future posts)
// on one menu without touching the generators. Edit the menu here, not in pages.

const MENU = [
  { href: "/", label: "Home" },
  {
    id: "tech",
    label: "Technology Solutions",
    match: ["/projects/", "/process/", "/pricing/"],
    items: [
      { href: "/projects/", label: "Overview" },
      { divider: true },
      { href: "/process/", label: "How It Works" },
      { href: "/pricing/", label: "Pricing" },
      { divider: true },
      { href: "/projects/faq/", label: "FAQ" },
    ],
  },
  {
    id: "reserve",
    label: "Silver Reserve",
    match: ["/reserve/", "/newsletter/silver/"],
    items: [
      { href: "/reserve/", label: "Silver Subscriptions" },
      { divider: true },
      { href: "/reserve/#how-it-works", label: "How It Works" },
      { href: "/reserve/#plans", label: "Plans" },
      { href: "/reserve/#benefits", label: "Benefits" },
      { href: "/reserve/#inventory", label: "Inventory" },
      { href: "/reserve/#join", label: "Join" },
      { divider: true },
      { href: "/reserve/faq/", label: "FAQ" },
    ],
  },
  {
    id: "education",
    label: "Education",
    match: ["/education/"],
    items: [
      { href: "/education/", label: "Overview" },
      { divider: true },
      { href: "/education/authority-assessment/", label: "Authority Assessment" },
    ],
  },
  { href: "/photos/", label: "Photos", match: ["/photos/"] },
  { href: "/about/", label: "About" },
  { href: "/blog/", label: "Blog", match: ["/blog/"] },
];

function isCurrent(path, href) {
  return href === path;
}

function inSection(path, entry) {
  if (entry.href && isCurrent(path, entry.href)) return true;
  return (entry.match || []).some((prefix) => (prefix === "/" ? path === "/" : path.startsWith(prefix)));
}

function link(href, label, path, extra = "") {
  const current = isCurrent(path, href);
  const attrs = current ? ' class="active" aria-current="page"' : "";
  return `<a href="${href}"${extra}${attrs}>${label}</a>`;
}

export function menuHtml(path) {
  return MENU.map((entry) => {
    if (!entry.items) {
      const active = !isCurrent(path, entry.href) && inSection(path, entry) && entry.href !== "/";
      return active
        ? `<a href="${entry.href}" class="active">${entry.label}</a>`
        : link(entry.href, entry.label, path);
    }
    const active = inSection(path, entry) ? " active" : "";
    const items = entry.items
      .map((item) => (item.divider ? '<div class="nav-dropdown-divider"></div>' : link(item.href, item.label, path, ' role="menuitem"')))
      .join("");
    return `<div class="nav-item" id="nav-${entry.id}"><button class="nav-toggle${active}" type="button" aria-expanded="false" aria-controls="dropdown-${entry.id}">${entry.label} <span class="nav-caret" aria-hidden="true">&#9662;</span></button><div class="nav-dropdown" id="dropdown-${entry.id}" role="menu">${items}</div></div>`;
  }).join("");
}

const BURGER =
  '<button class="fx-burger" type="button" aria-expanded="false" aria-controls="fx-primary-nav" aria-label="Open menu"><span></span><span></span><span></span></button>';

export function addSharedNav(rewriter, path) {
  return rewriter
    .on("header.topbar", {
      element(element) {
        element.before('<link rel="stylesheet" href="/assets/site-nav.css">', { html: true });
        element.after('<script src="/assets/site-nav.js" defer></script>', { html: true });
      },
    })
    .on("header.topbar > nav.nav", {
      element(element) {
        element.before(BURGER, { html: true });
        element.setAttribute("id", "fx-primary-nav");
      },
    })
    .on("header.topbar > nav.nav > .nav-pages", {
      element(element) {
        element.setInnerContent(menuHtml(path), { html: true });
      },
    });
}

export function renderSharedNav(response, path) {
  return addSharedNav(new HTMLRewriter(), path).transform(response);
}
