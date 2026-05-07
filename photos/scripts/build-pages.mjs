import fs from "node:fs/promises";
import path from "node:path";
import {
  PUBLIC_COLLECTIONS_DIR,
  PUBLIC_IMAGES_DIR,
  REQUIRED_DIRS,
  ensureDirectories,
  escapeHtml,
  readCatalog,
} from "./lib.mjs";

const COLLECTIONS_PATH = path.resolve("photos/data/collections.json");

function bySortOrder(a, b) {
  return Number(a.sort_order ?? 999) - Number(b.sort_order ?? 999);
}

async function readCollections() {
  const raw = await fs.readFile(COLLECTIONS_PATH, "utf8");
  return JSON.parse(raw).filter((collection) => collection.slug !== "uncategorized").sort(bySortOrder);
}

function publicLicenseLabel(record) {
  if (record.license_type === "free-use") {
    return "Free Use";
  }
  if (record.license_status === "commercial-safe") {
    return "Commercial-Safe";
  }
  return record.license_status || "Unspecified";
}

function pageShell({
  title,
  description,
  canonical,
  ogImage,
  body,
  activeCollection = "",
}) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(canonical)}" />
    <meta property="og:site_name" content="Fused Distribution" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(ogImage)}" />
    <meta property="og:locale" content="en_US" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
    <meta name="theme-color" content="#07131a" />
    <meta name="author" content="Fused Distribution" />
    <style>
      :root {
        --bg: #07131a;
        --panel: rgba(11, 24, 32, 0.82);
        --line: rgba(87, 219, 255, 0.16);
        --text: #ecf8fb;
        --muted: #afc6cf;
        --accent: #58d6ff;
        --accent-2: #4dffb8;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        color: var(--text);
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at 10% 12%, rgba(88, 214, 255, 0.12), transparent 24%),
          radial-gradient(circle at 84% 14%, rgba(77, 255, 184, 0.08), transparent 18%),
          linear-gradient(180deg, #041018 0%, #07131a 48%, #040b10 100%);
      }
      body::before {
        content: "";
        position: fixed;
        inset: 0;
        background:
          linear-gradient(120deg, rgba(88, 214, 255, 0.05), transparent 28%, transparent 68%, rgba(77, 255, 184, 0.05)),
          repeating-linear-gradient(90deg, transparent 0, transparent 94px, rgba(255, 255, 255, 0.02) 95px);
        pointer-events: none;
      }
      a { color: inherit; text-decoration: none; }
      .shell {
        width: min(1220px, calc(100% - 32px));
        margin: 18px auto 40px;
        border-radius: 28px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        background: linear-gradient(180deg, rgba(7, 17, 23, 0.96), rgba(5, 12, 17, 0.98));
        box-shadow: 0 30px 90px rgba(0, 0, 0, 0.42);
        position: relative;
        overflow: hidden;
      }
      .topbar, .hero, .main, .footer { position: relative; z-index: 1; }
      .topbar {
        display: flex; align-items: center; justify-content: space-between; gap: 18px;
        padding: 20px 30px; background: rgba(7, 16, 22, 0.92); backdrop-filter: blur(16px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        position: sticky; top: 0; z-index: 500;
      }
      .brand { display: flex; flex-direction: column; line-height: 1; }
      .brand-mark { color: var(--accent); font-size: 1.95rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
      .brand-sub { margin-top: 4px; color: rgba(236, 248, 251, 0.72); font-size: 0.75rem; letter-spacing: 0.2em; text-transform: uppercase; }
      .nav { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
      .nav-pages, .nav-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
      .nav-pages {
        padding: 8px 10px; border-radius: 999px; border: 1px solid rgba(88, 214, 255, 0.18);
        background: rgba(7, 15, 23, 0.56);
      }
      .nav a {
        font-size: 0.95rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
        padding: 9px 14px; border-radius: 999px;
      }
      .nav a:hover, .nav a:focus-visible, .nav a.active { color: var(--accent); }
      .nav-cta {
        display: inline-flex; align-items: center; justify-content: center;
        min-width: 140px; padding: 12px 18px; border-radius: 14px;
        border: 1px solid rgba(88, 214, 255, 0.28); background: rgba(88, 214, 255, 0.08); color: var(--accent);
        font-size: 0.95rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
      }
      /* Dropdown nav */
      .nav-item { position: relative; }
      .nav-toggle {
        display: inline-flex; align-items: center; gap: 5px; padding: 9px 14px; border-radius: 999px;
        border: none; background: transparent; cursor: pointer; font-family: inherit; font-size: 0.95rem;
        font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(239,252,255,0.9);
        transition: color 0.15s;
      }
      .nav-toggle:hover, .nav-item:hover .nav-toggle, .nav-item:focus-within .nav-toggle { color: var(--accent); outline: none; }
      .nav-caret { font-size: 0.68rem; transition: transform 0.2s ease; display: inline-block; }
      .nav-item:hover .nav-caret, .nav-item:focus-within .nav-caret { transform: rotate(180deg); }
      .nav-dropdown {
        display: flex; flex-direction: column; position: absolute; top: calc(100% + 2px); left: 50%;
        transform: translateX(-50%) translateY(-6px); min-width: 210px; padding: 8px; border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.08); background: rgba(8,16,24,0.97); backdrop-filter: blur(20px);
        box-shadow: 0 16px 48px rgba(0,0,0,0.55); z-index: 200; opacity: 0; visibility: hidden;
        pointer-events: none; transition: opacity 0.25s ease 0.35s, visibility 0.25s ease 0.35s, transform 0.25s ease 0.35s;
      }
      .nav-item:hover .nav-dropdown, .nav-item:focus-within .nav-dropdown {
        transition: opacity 0.18s ease 0s, visibility 0.18s ease 0s, transform 0.18s ease 0s;
        opacity: 1; visibility: visible; pointer-events: auto; transform: translateX(-50%) translateY(0);
      }
      .nav-dropdown a {
        padding: 9px 14px; border-radius: 10px; font-size: 0.88rem; letter-spacing: 0.04em;
        color: rgba(220,240,248,0.78); text-transform: none; transition: background 0.12s, color 0.12s;
      }
      .nav-dropdown a:hover, .nav-dropdown a:focus-visible { background: rgba(88,214,255,0.08); color: var(--accent); }
      .nav-dropdown-divider { height: 1px; background: rgba(255,255,255,0.07); margin: 4px 6px; }
      @media (max-width: 900px) {
        .nav-dropdown { left: 0; transform: translateY(-6px); }
        .nav-item:hover .nav-dropdown, .nav-item:focus-within .nav-dropdown { transform: translateY(0); }
      }
      .hero { padding: 56px 54px 36px; border-bottom: 1px solid rgba(255,255,255,0.04); }
      .eyebrow {
        display: inline-block; padding: 8px 14px; border-radius: 999px; border: 1px solid var(--line);
        background: rgba(88, 214, 255, 0.08); color: var(--accent); font-size: 0.82rem; font-weight: 800;
        letter-spacing: 0.14em; text-transform: uppercase;
      }
      h1, h2, h3 {
        margin: 0; font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
        letter-spacing: 0.03em; text-transform: uppercase;
      }
      h1 { margin-top: 18px; font-size: clamp(2.4rem, 5vw, 4.1rem); line-height: 0.98; }
      h2 { font-size: clamp(1.7rem, 2.8vw, 2.5rem); }
      h3 { font-size: 1.25rem; }
      p { margin: 0; color: var(--muted); line-height: 1.72; }
      .hero p { margin-top: 16px; max-width: 740px; font-size: 1.05rem; }
      .main { padding: 42px 54px 64px; }
      .footer { padding: 28px 54px 38px; border-top: 1px solid rgba(255,255,255,0.04); color: rgba(236, 248, 251, 0.65); }
      .btn {
        display: inline-flex; align-items: center; justify-content: center; min-height: 46px; padding: 12px 18px;
        border-radius: 14px; border: 1px solid rgba(88, 214, 255, 0.28); background: rgba(88, 214, 255, 0.08);
        color: var(--accent); font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;
      }
      .btn-primary { color: #07131a; background: linear-gradient(135deg, var(--accent), var(--accent-2)); border-color: transparent; }
      .meta-row, .tag-list, .actions { display: flex; gap: 10px; flex-wrap: wrap; }
      .meta-row, .tag-list { margin-top: 18px; }
      .actions { margin-top: 24px; }
      .pill {
        display: inline-flex; padding: 6px 10px; border-radius: 999px; border: 1px solid rgba(88, 214, 255, 0.16);
        background: rgba(88, 214, 255, 0.08); color: var(--accent); font-size: 0.75rem; font-weight: 800;
        letter-spacing: 0.08em; text-transform: uppercase;
      }
      .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
      .card {
        padding: 18px; border-radius: 22px; border: 1px solid rgba(255,255,255,0.06);
        background: var(--panel); box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
      }
      .shot { display: block; width: 100%; border-radius: 18px; overflow: hidden; background: rgba(255,255,255,0.02); }
      .shot img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .thumb-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
      .thumb-card { border-radius: 18px; border: 1px solid rgba(255,255,255,0.06); background: rgba(8,18,26,0.8); overflow: hidden; }
      .thumb-card a { display: block; }
      .thumb-card img { width: 100%; aspect-ratio: 4/3; object-fit: cover; display: block; transition: transform 0.3s ease; }
      .thumb-card:hover img { transform: scale(1.04); }
      .thumb-card-info { padding: 12px 14px 14px; }
      .thumb-card strong { display: block; color: var(--text); font-size: 0.9rem; line-height: 1.3; }
      .thumb-card-collection { display: block; margin-top: 5px; color: var(--accent); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
      .detail-layout { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(300px, 0.85fr); gap: 26px; }
      .side-list { display: grid; gap: 14px; margin-top: 18px; }
      .side-item { padding: 14px 16px; border-radius: 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); }
      .side-item strong { display: block; color: var(--text); margin-bottom: 5px; }
      .back-link { display: inline-flex; margin-bottom: 18px; color: var(--accent); font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
      .related-section { margin-top: 42px; padding-top: 32px; border-top: 1px solid rgba(255,255,255,0.05); }
      .related-section h2 { margin-bottom: 8px; }
      .related-section > p { margin-bottom: 22px; margin-top: 8px; }
      @media (max-width: 980px) { .grid-2, .detail-layout, .thumb-grid { grid-template-columns: 1fr; } }
      @media (max-width: 820px) { .topbar, .hero, .main, .footer { padding-left: 22px; padding-right: 22px; } }
    </style>
  </head>
  <body>
    <div class="shell">
      <header class="topbar">
        <a class="brand" href="/" aria-label="Fused Distribution home">
          <span class="brand-mark">Fused</span>
          <span class="brand-sub">Distribution</span>
        </a>
        <nav class="nav" aria-label="Primary">
          <div class="nav-pages">
            <a href="/">Home</a>
            <div class="nav-item">
              <button class="nav-toggle" aria-expanded="false" aria-controls="dd-tech">
                Technology Solutions <span class="nav-caret" aria-hidden="true">▾</span>
              </button>
              <div class="nav-dropdown" id="dd-tech" role="menu">
                <a href="/projects/" role="menuitem">Overview</a>
                <div class="nav-dropdown-divider"></div>
                <a href="/process/" role="menuitem">How It Works</a>
                <a href="/pricing/" role="menuitem">Pricing</a>
                <div class="nav-dropdown-divider"></div>
                <a href="/projects/faq/" role="menuitem">FAQ</a>
              </div>
            </div>
            <div class="nav-item">
              <button class="nav-toggle" aria-expanded="false" aria-controls="dd-reserve">
                Silver Reserve <span class="nav-caret" aria-hidden="true">▾</span>
              </button>
              <div class="nav-dropdown" id="dd-reserve" role="menu">
                <a href="/reserve/" role="menuitem">Overview</a>
                <div class="nav-dropdown-divider"></div>
                <a href="/reserve/#how-it-works" role="menuitem">How It Works</a>
                <a href="/reserve/#plans" role="menuitem">Plans</a>
                <a href="/reserve/#benefits" role="menuitem">Benefits</a>
                <a href="/reserve/#inventory" role="menuitem">Inventory</a>
                <a href="/reserve/#join" role="menuitem">Join</a>
                <div class="nav-dropdown-divider"></div>
                <a href="/reserve/faq/" role="menuitem">FAQ</a>
              </div>
            </div>
            <div class="nav-item">
              <button class="nav-toggle" aria-expanded="false" aria-controls="dd-edu">
                Education <span class="nav-caret" aria-hidden="true">▾</span>
              </button>
              <div class="nav-dropdown" id="dd-edu" role="menu">
                <a href="/education/" role="menuitem">Overview</a>
                <div class="nav-dropdown-divider"></div>
                <a href="/education/authority-assessment/" role="menuitem">Authority Assessment</a>
              </div>
            </div>
            <a class="active" href="/photos/">Photos</a>
            <a href="/about/">About</a>
            <a href="/blog/">Blog</a>
          </div>
          <div class="nav-actions">
            <a class="nav-cta" href="/#contact">Get Started</a>
          </div>
        </nav>
      </header>
      ${body}
      <footer class="footer">
        <small>Fused Photos — commercially cleared free-use photography. <a href="/photos/" style="color:var(--accent);">Browse all images</a></small>
      </footer>
    </div>
    <script>
      (function(){
        var toggles=document.querySelectorAll('.nav-toggle');
        function closeAll(e){toggles.forEach(function(b){if(b!==e)b.setAttribute('aria-expanded','false');});}
        toggles.forEach(function(btn){
          btn.addEventListener('click',function(){
            var x=btn.getAttribute('aria-expanded')==='true';
            closeAll(btn);btn.setAttribute('aria-expanded',x?'false':'true');
          });
        });
        document.addEventListener('keydown',function(e){if(e.key==='Escape')closeAll(null);});
        document.addEventListener('click',function(e){if(!e.target.closest('.nav-item'))closeAll(null);});
      })();
    </script>
  </body>
</html>`;
}

function websiteImageUrl(record) {
  return `/photos/derived/web/${record.slug}.jpg`;
}

function collectionUrl(collection) {
  return `/photos/collections/${collection.slug}/`;
}

function detailUrl(record) {
  return `/photos/images/${record.slug}/`;
}

function localCollectionHref(collection) {
  return `../${collection.slug}/`;
}

function localImageHrefFromCollection(record) {
  return `../../images/${record.slug}/`;
}

function localImageHrefFromPhotos(record) {
  return `images/${record.slug}/`;
}

function localCollectionHrefFromDetail(collection) {
  return `../../collections/${collection.slug}/`;
}

function localImageHrefFromDetail(record) {
  return `../${record.slug}/`;
}

function localImageSrcFromCollection(record) {
  return `../../derived/web/${record.slug}.jpg`;
}

function localImageSrcFromDetail(record) {
  return `../../derived/web/${record.slug}.jpg`;
}

function buildCollectionPage(collection, records) {
  const hero = records.find((record) => record.id === collection.hero_image_id) ?? records[0];
  const thumbs = records
    .map((record) => `
      <article class="thumb-card">
        <a href="/photos/images/${record.slug}/">
          <img src="/photos/derived/web/${record.slug}.jpg" alt="${escapeHtml(record.title)}" loading="lazy" />
          <div class="thumb-card-info">
            <strong>${escapeHtml(record.title)}</strong>
            <span class="thumb-card-collection">${escapeHtml(collection.name)}</span>
          </div>
        </a>
      </article>
    `)
    .join("");

  const pills = (collection.tags ?? []).map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("");

  const body = `
    <section class="hero">
      <a class="back-link" href="/photos/">← Back To Photos</a>
      <span class="eyebrow">Collection</span>
      <h1>${escapeHtml(collection.name)}</h1>
      <p>${escapeHtml(collection.description)}</p>
      <div class="meta-row">
        <span class="pill">${records.length} Image${records.length === 1 ? "" : "s"}</span>
        <span class="pill">Free Use</span>
        ${pills}
      </div>
    </section>
    <main class="main">
      <section class="grid-2">
        <article class="card">
          <a class="shot" href="/photos/images/${hero.slug}/">
            <img src="/photos/derived/web/${hero.slug}.jpg" alt="${escapeHtml(hero.title)}" loading="eager" />
          </a>
        </article>
        <article class="card">
          <h2>About This Collection</h2>
          <p>${escapeHtml(collection.description)}</p>
          <div class="side-list">
            <div class="side-item">
              <strong>Images</strong>
              ${records.length} photograph${records.length === 1 ? "" : "s"} in this set
            </div>
            <div class="side-item">
              <strong>Usage</strong>
              All images are commercially cleared free-use. No attribution required.
            </div>
          </div>
          <div class="actions">
            <a class="btn btn-primary" href="/photos/browse/">Browse Full Library</a>
            <a class="btn" href="/photos/">Fused Photos Home</a>
          </div>
        </article>
      </section>
      <section style="margin-top: 34px;">
        <h2>All Images In This Collection</h2>
        <p style="margin-top: 8px; margin-bottom: 22px;">Click any image to open the full detail page.</p>
        <div class="thumb-grid">${thumbs}</div>
      </section>
    </main>
  `;

  return pageShell({
    title: `${collection.name} | Fused Photos`,
    description: collection.description,
    canonical: `https://fuseddistribution.com/photos/collections/${collection.slug}/`,
    ogImage: `https://fuseddistribution.com${websiteImageUrl(hero)}`,
    body,
  });
}

function cleanLocation(loc) {
  if (!loc) return null;
  if (loc.toLowerCase().startsWith("unspecified")) return null;
  return loc;
}

function buildDetailPage(record, collection, related) {
  const relatedMarkup = related
    .slice(0, 6)
    .map((item) => `
      <article class="thumb-card">
        <a href="/photos/images/${item.slug}/">
          <img src="/photos/derived/web/${item.slug}.jpg" alt="${escapeHtml(item.title)}" loading="lazy" />
          <div class="thumb-card-info">
            <strong>${escapeHtml(item.title)}</strong>
            ${collection ? `<span class="thumb-card-collection">${escapeHtml(collection.name)}</span>` : ""}
          </div>
        </a>
      </article>
    `)
    .join("");

  const tags = String(record.tags ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 10)
    .map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`)
    .join("");

  const location = cleanLocation(record.location);

  const body = `
    <section class="hero">
      <a class="back-link" href="${collection ? `/photos/collections/${collection.slug}/` : "/photos/"}">← Back To ${escapeHtml(collection?.name || "Photos")}</a>
      <span class="eyebrow">${collection ? escapeHtml(collection.name) : "Image Detail"}</span>
      <h1>${escapeHtml(record.title)}</h1>
      <div class="meta-row">
        <span class="pill">${escapeHtml(record.orientation)}</span>
        <span class="pill">${escapeHtml(publicLicenseLabel(record))}</span>
        ${location ? `<span class="pill">${escapeHtml(location)}</span>` : ""}
      </div>
    </section>
    <main class="main">
      <section class="detail-layout">
        <article class="card">
          <a class="shot" href="/photos/derived/web/${record.slug}.jpg" title="Open full image">
            <img src="/photos/derived/web/${record.slug}.jpg" alt="${escapeHtml(record.title)}" loading="eager" fetchpriority="high" />
          </a>
        </article>
        <aside class="card">
          <h2>Image Details</h2>
          <div class="side-list">
            ${location ? `<div class="side-item"><strong>Location</strong>${escapeHtml(location)}</div>` : ""}
            ${record.date_captured ? `<div class="side-item"><strong>Date Captured</strong>${escapeHtml(record.date_captured)}</div>` : ""}
            <div class="side-item"><strong>Usage</strong>Free Use — commercially cleared. No attribution required.</div>
            <div class="side-item"><strong>Collection</strong>${collection ? escapeHtml(collection.name) : "General"}</div>
          </div>
          ${tags ? `<div class="tag-list" style="margin-top:18px;">${tags}</div>` : ""}
          <div class="actions">
            <a class="btn btn-primary" href="/photos/browse/">Browse Full Library</a>
            ${collection ? `<a class="btn" href="/photos/collections/${collection.slug}/">View Collection</a>` : `<a class="btn" href="/photos/">All Photos</a>`}
          </div>
        </aside>
      </section>
      ${relatedMarkup ? `
      <section class="related-section">
        <h2>More From ${escapeHtml(collection?.name || "This Collection")}</h2>
        <p>Other images in this collection, cleared for the same free use.</p>
        <div class="thumb-grid" style="margin-top:22px;">${relatedMarkup}</div>
      </section>` : ""}
    </main>
  `;

  return pageShell({
    title: `${record.title} | Fused Photos`,
    description: `${record.title} — free-use original photograph${location ? ` from ${location}` : ""}. Commercially cleared for web, editorial, and brand use.`,
    canonical: `https://fuseddistribution.com/photos/images/${record.slug}/`,
    ogImage: `https://fuseddistribution.com${websiteImageUrl(record)}`,
    body,
  });
}

async function writePage(outputDir, html) {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, "index.html"), html, "utf8");
}

function orientationClass(record) {
  const o = String(record.orientation ?? "").toLowerCase().trim();
  if (o === "portrait") return "portrait";
  if (o === "square") return "square";
  return "landscape";
}

function imgDimensions(record) {
  const o = String(record.orientation ?? "").toLowerCase().trim();
  if (o === "portrait") return 'width="1800" height="2400"';
  if (o === "square") return 'width="2400" height="2400"';
  return 'width="2400" height="1800"';
}

function buildBrowsePage(collections, records) {
  const total = records.length;

  const filterBtns = [
    `<button class="filter-btn active" data-filter="all">All <span class="filter-count">${total}</span></button>`,
    ...collections.map((col) => {
      const count = records.filter((r) => r.collection === col.slug).length;
      if (count === 0) return "";
      return `<button class="filter-btn" data-filter="${escapeHtml(col.slug)}">${escapeHtml(col.name)} <span class="filter-count">${count}</span></button>`;
    }).filter(Boolean),
  ].join("\n        ");

  const cards = records.map((record) => {
    const col = collections.find((c) => c.slug === record.collection);
    const colName = col ? col.name : record.collection;
    const colLabel = colName.replace(/Residential Architecture Event/, "Architecture")
      .replace(/Suburban Atmosphere/, "Atmosphere")
      .replace(/Nature Details/, "Nature")
      .replace(/Waterside Sunsets/, "Waterside")
      .replace(/Seasonal Details/, "Seasonal")
      .replace(/Long Beach Coast/, "Long Beach")
      .replace(/Quiet Shorelines/, "Shorelines")
      .replace(/Astoria Overlooks/, "Astoria");

    return `
          <a class="photo-card ${orientationClass(record)}" href="/photos/images/${record.slug}/" data-collection="${escapeHtml(record.collection)}">
            <img src="/photos/derived/web/${record.slug}.jpg" alt="${escapeHtml(record.title)}" loading="lazy" ${imgDimensions(record)} />
            <span class="photo-badge">${escapeHtml(colLabel)}</span>
            <div class="photo-overlay">
              <span class="photo-collection-tag">${escapeHtml(colName)}</span>
              <span class="photo-title">${escapeHtml(record.title)}</span>
            </div>
          </a>`;
  }).join("");

  const body = `
      <section class="page-hero">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="/photos/">Photos</a>
          <span aria-hidden="true">›</span>
          <span>Full Library</span>
        </nav>
        <div class="hero-row">
          <div>
            <div class="eyebrow">Free-Use Library</div>
            <h1>Full Photo Library</h1>
          </div>
          <div class="hero-meta">
            <div class="meta-stat"><strong>${total}</strong><span>Images</span></div>
            <div class="meta-stat"><strong>${collections.length}</strong><span>Collections</span></div>
            <div class="meta-stat"><strong>Free</strong><span>Commercial use</span></div>
          </div>
        </div>
      </section>

      <div class="filter-bar" role="group" aria-label="Filter by collection">
        ${filterBtns}
      </div>

      <main class="main">
        <p class="gallery-count" id="gallery-count">Showing <strong>${total}</strong> images</p>
        <div class="gallery-grid" id="gallery-grid">${cards}
        </div>
        <p class="gallery-empty" id="gallery-empty">No images in this collection yet.</p>
      </main>`;

  const browseStyles = `
      <style>
        .page-hero { padding: 48px 54px 36px; border-bottom: 1px solid rgba(255,255,255,0.04); position: relative; z-index: 1; }
        .breadcrumb { display: flex; align-items: center; gap: 8px; margin-bottom: 18px; font-size: 0.82rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
        .breadcrumb a { color: var(--accent); }
        .breadcrumb span { opacity: 0.5; }
        .hero-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
        .hero-meta { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 4px; }
        .meta-stat { display: flex; flex-direction: column; gap: 2px; }
        .meta-stat strong { font-size: 1.5rem; font-weight: 900; color: var(--text); line-height: 1; }
        .meta-stat span { font-size: 0.75rem; color: var(--muted); letter-spacing: 0.06em; text-transform: uppercase; }
        .filter-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 20px 54px; border-bottom: 1px solid rgba(255,255,255,0.04); background: rgba(6,14,20,0.6); position: relative; z-index: 1; }
        .filter-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: var(--muted); font-family: inherit; font-size: 0.82rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; transition: border-color 0.18s, color 0.18s, background 0.18s; }
        .filter-btn:hover { border-color: rgba(88,214,255,0.3); color: var(--text); }
        .filter-btn.active { border-color: var(--accent); background: rgba(88,214,255,0.1); color: var(--accent); }
        .filter-count { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 5px; border-radius: 999px; background: rgba(255,255,255,0.08); font-size: 0.7rem; font-weight: 900; }
        .filter-btn.active .filter-count { background: rgba(88,214,255,0.2); }
        .main { padding: 32px 40px 64px; position: relative; z-index: 1; }
        .gallery-count { margin-bottom: 20px; font-size: 0.82rem; color: var(--muted); letter-spacing: 0.04em; }
        .gallery-count strong { color: var(--text); }
        .gallery-grid { columns: 4; column-gap: 12px; }
        .photo-card { break-inside: avoid; margin-bottom: 12px; position: relative; border-radius: 14px; border: 1px solid rgba(255,255,255,0.06); overflow: hidden; background: rgba(8,18,26,0.8); display: block; transition: border-color 0.2s, box-shadow 0.2s; }
        .photo-card:hover, .photo-card:focus-within { border-color: rgba(88,214,255,0.24); box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
        .photo-card img { width: 100%; display: block; object-fit: cover; aspect-ratio: 3/2; transition: transform 0.45s ease; }
        .photo-card:hover img, .photo-card:focus-within img { transform: scale(1.04); }
        .photo-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 28px 16px 16px; background: linear-gradient(to top, rgba(4,10,16,0.95) 0%, rgba(4,10,16,0.6) 55%, transparent 100%); transform: translateY(4px); opacity: 0; transition: opacity 0.25s ease, transform 0.25s ease; }
        .photo-card:hover .photo-overlay, .photo-card:focus-within .photo-overlay { opacity: 1; transform: translateY(0); }
        .photo-collection-tag { display: inline-block; margin-bottom: 6px; padding: 3px 9px; border-radius: 999px; border: 1px solid rgba(88,214,255,0.3); background: rgba(88,214,255,0.1); color: var(--accent); font-size: 0.68rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
        .photo-title { display: block; color: var(--text); font-size: 0.92rem; font-weight: 700; line-height: 1.3; }
        .photo-badge { position: absolute; top: 12px; left: 12px; padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.1); background: rgba(4,10,16,0.75); backdrop-filter: blur(8px); color: rgba(236,248,251,0.75); font-size: 0.67rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; pointer-events: none; }
        .photo-card.hidden { display: none; }
        .gallery-empty { display: none; text-align: center; padding: 64px 0; color: var(--muted); }
        .gallery-empty.visible { display: block; }
        @media (max-width: 1100px) { .gallery-grid { columns: 3; } }
        @media (max-width: 820px) {
          .page-hero, .filter-bar, .main { padding-left: 22px; padding-right: 22px; }
          .gallery-grid { columns: 2; }
          .hero-row { flex-direction: column; align-items: flex-start; }
        }
        @media (max-width: 640px) { h1 { font-size: 1.8rem; } }
      </style>
      <script>
        (function(){
          var btns=document.querySelectorAll('.filter-btn');
          var cards=document.querySelectorAll('.photo-card');
          var countEl=document.getElementById('gallery-count');
          var emptyEl=document.getElementById('gallery-empty');
          btns.forEach(function(btn){
            btn.addEventListener('click',function(){
              var f=btn.getAttribute('data-filter');
              btns.forEach(function(b){b.classList.remove('active');});
              btn.classList.add('active');
              var v=0;
              cards.forEach(function(c){
                var m=f==='all'||c.getAttribute('data-collection')===f;
                c.classList.toggle('hidden',!m);
                if(m)v++;
              });
              countEl.innerHTML='Showing <strong>'+v+'</strong> image'+(v!==1?'s':'');
              emptyEl.classList.toggle('visible',v===0);
            });
          });
        })();
      </script>`;

  return pageShell({
    title: "Browse All Photos | Fused Photos Free-Use Library",
    description: `Browse all ${total} original free-use photographs from Fused Photos — ${collections.map((c) => c.name).join(", ")}. Commercially cleared for web, editorial, and brand use.`,
    canonical: "https://fuseddistribution.com/photos/browse/",
    ogImage: "https://fuseddistribution.com/photos/derived/web/img-0048-img-3909.jpg",
    body: browseStyles + body,
  });
}

async function main() {
  await ensureDirectories(REQUIRED_DIRS);
  const collections = await readCollections();
  const { records } = await readCatalog();
  const pageRecords = records.filter((record) => record.slug && record.collection && record.collection !== "uncategorized");

  for (const collection of collections) {
    const collectionRecords = pageRecords.filter((record) => record.collection === collection.slug);
    if (collectionRecords.length === 0) {
      continue;
    }
    await writePage(path.join(PUBLIC_COLLECTIONS_DIR, collection.slug), buildCollectionPage(collection, collectionRecords));
  }

  for (const record of pageRecords) {
    const collection = collections.find((item) => item.slug === record.collection);
    const related = pageRecords.filter((item) => item.collection === record.collection && item.slug !== record.slug);
    await writePage(path.join(PUBLIC_IMAGES_DIR, record.slug), buildDetailPage(record, collection, related));
  }

  const browsePath = path.resolve("photos/browse");
  await writePage(browsePath, buildBrowsePage(collections, pageRecords));

  console.log(`Built ${collections.length} collection page(s), ${pageRecords.length} image detail page(s), and browse page.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
