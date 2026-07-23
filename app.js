/* Motherlode Texture Workshop — no framework, no build step, no network calls
   beyond loading the generated catalog that sits next to this file. */

const CONFIG = window.MOTHERLODE_CONFIG || {};
const STATUSES = ["missing", "placeholder", "unreviewed", "done"];
const STATUS_LABEL = {
  missing: "Missing",
  placeholder: "Placeholder",
  unreviewed: "Unreviewed",
  done: "Done",
};

const state = {
  textures: [],
  category: "block",
  // Show everything. Filtering to just the unfinished work makes the mod look
  // untextured and hides the finished art people are meant to match, so
  // priority is expressed through sort order and badges instead.
  statuses: new Set(STATUSES),
  search: "",
  material: "",
  variant: "",
};

const el = (id) => document.getElementById(id);
const byId = new Map();

/* ---------- boot ------------------------------------------------------ */

fetch("data/catalog.json?v=2604c01e")
  .then((r) => {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  })
  .then(init)
  .catch(() => {
    el("grid").innerHTML =
      '<p class="empty">Could not load <code>data/catalog.json</code>. ' +
      "If you're opening this file directly, serve the folder instead: " +
      "<code>python -m http.server</code></p>";
  });

function init(catalog) {
  state.textures = catalog.textures;
  state.textures.forEach((t) => byId.set(t.id, t));

  buildTabs(catalog.categories);
  buildStatusChips();
  buildSelects();
  wireControls();
  render();
}

/* ---------- chrome ---------------------------------------------------- */

function buildTabs(categories) {
  const tabs = el("tabs");
  tabs.innerHTML = "";
  categories.forEach((category) => {
    const n = state.textures.filter((t) => t.category === category).length;
    const button = document.createElement("button");
    button.className = "tab";
    button.type = "button";
    button.setAttribute("aria-selected", String(category === state.category));
    button.innerHTML = `${category === "block" ? "Blocks" : "Items"}<span class="count">${n}</span>`;
    button.onclick = () => {
      state.category = category;
      // Material/variant vocabularies differ per tab, so reset them.
      state.material = state.variant = "";
      [...tabs.children].forEach((t) => t.setAttribute("aria-selected", "false"));
      button.setAttribute("aria-selected", "true");
      buildSelects();
      render();
    };
    tabs.appendChild(button);
  });
}

function buildStatusChips() {
  const wrap = el("statusFilters");
  wrap.innerHTML = "";
  STATUSES.forEach((status) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.dataset.status = status;
    chip.setAttribute("aria-pressed", String(state.statuses.has(status)));
    chip.innerHTML = `<span class="dot"></span>${STATUS_LABEL[status]}<span class="n"></span>`;
    chip.onclick = () => {
      state.statuses.has(status) ? state.statuses.delete(status) : state.statuses.add(status);
      chip.setAttribute("aria-pressed", String(state.statuses.has(status)));
      render();
    };
    wrap.appendChild(chip);
  });
}

function buildSelects() {
  const pool = state.textures.filter((t) => t.category === state.category);
  fill(el("materialFilter"), "All materials", uniq(pool.map((t) => t.material)));
  fill(el("variantFilter"), "All variants", uniq(pool.map((t) => t.variant)));
  el("materialFilter").value = state.material;
  el("variantFilter").value = state.variant;
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function fill(select, placeholder, values) {
  select.innerHTML = `<option value="">${placeholder}</option>`;
  values.forEach((v) => {
    const option = document.createElement("option");
    option.value = v;
    option.textContent = titleCase(v);
    select.appendChild(option);
  });
}

function wireControls() {
  el("search").oninput = (e) => {
    state.search = e.target.value.trim().toLowerCase();
    render();
  };
  el("materialFilter").onchange = (e) => { state.material = e.target.value; render(); };
  el("variantFilter").onchange = (e) => { state.variant = e.target.value; render(); };
  el("resetFilters").onclick = () => {
    state.search = state.material = state.variant = "";
    state.statuses = new Set(STATUSES);
    el("search").value = "";
    buildStatusChips();
    buildSelects();
    render();
  };

  el("guideToggle").onclick = (e) => {
    e.preventDefault();
    el("guide").hidden = !el("guide").hidden;
  };

  el("modal").onclick = (e) => { if (e.target.dataset.close !== undefined) closeModal(); };
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
}

/* ---------- filtering / grid ------------------------------------------ */

function matches(t) {
  if (t.category !== state.category) return false;
  if (!state.statuses.has(t.status)) return false;
  if (state.material && t.material !== state.material) return false;
  if (state.variant && t.variant !== state.variant) return false;
  if (state.search) {
    const hay = `${t.name} ${t.material || ""} ${t.variant || ""}`.toLowerCase();
    if (!hay.includes(state.search)) return false;
  }
  return true;
}

function render() {
  const pool = state.textures.filter((t) => t.category === state.category);
  const counts = {};
  STATUSES.forEach((s) => { counts[s] = pool.filter((t) => t.status === s).length; });
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.querySelector(".n").textContent = ` ${counts[chip.dataset.status]}`;
  });

  const shown = state.textures.filter(matches).sort(
    (a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) ||
              a.name.localeCompare(b.name)
  );

  const grid = el("grid");
  grid.innerHTML = "";
  const frag = document.createDocumentFragment();
  shown.forEach((t) => frag.appendChild(cardFor(t)));
  grid.appendChild(frag);

  el("empty").hidden = shown.length > 0;

  const noun = state.category === "block" ? "block" : "item";
  const needsArt = counts.missing + counts.placeholder;
  const filtered = shown.length !== pool.length;
  el("resultCount").textContent = filtered
    ? `Showing ${shown.length} of ${pool.length} ${noun} textures`
    : `${pool.length} ${noun} textures — ${needsArt} still need art, ` +
      `${counts.unreviewed + counts.done} already drawn. Sorted with the gaps first.`;
}

function cardFor(t, small) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "card";
  card.title = t.id;

  const thumb = t.status === "missing"
    ? `<div class="thumb none" aria-hidden="true">?</div>`
    : `<img class="thumb" loading="lazy" alt="" src="textures/${t.id}.png">`;

  card.innerHTML =
    `${thumb}<span class="badge ${t.status}"></span>` +
    `<span class="name">${escapeHtml(small ? t.label : t.name)}</span>`;
  card.onclick = () => openModal(t.id);
  return card;
}

/* ---------- detail ---------------------------------------------------- */

function openModal(id) {
  const t = byId.get(id);
  if (!t) return;

  const preview = t.status === "missing"
    ? `<div class="detail-preview none" aria-hidden="true">?</div>`
    : `<img class="detail-preview" alt="${escapeHtml(t.label)}" src="textures/${t.id}.png">`;

  const rows = [];
  rows.push(["Status", `<span class="pill ${t.status}">${STATUS_LABEL[t.status]}</span>`]);
  if (t.material) rows.push(["Material", titleCase(t.material)]);
  if (t.variant) rows.push(["Variant", titleCase(t.variant)]);
  if (t.size) rows.push(["Size", `${t.size[0]}&times;${t.size[1]}${t.animated ? " (animated)" : ""}`]);
  if (t.usedBy && t.usedBy.length) {
    rows.push(["Used by", `${t.usedBy.length} model${t.usedBy.length > 1 ? "s" : ""}`]);
  }

  const sameMaterial = t.material
    ? state.textures.filter((o) => o.material === t.material && o.id !== t.id && o.category === t.category)
    : [];
  const sameVariant = t.variant
    ? state.textures.filter((o) => o.variant === t.variant && o.id !== t.id && o.category === t.category)
    : [];

  el("modalBody").innerHTML = `
    <button class="close" data-close aria-label="Close">&times;</button>
    <div class="detail-head">
      ${preview}
      <div class="detail-meta">
        <h2>${escapeHtml(t.label)}</h2>
        <div class="id">${escapeHtml(t.id)}.png</div>
        <dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>
      </div>
    </div>
    ${t.reason ? `<p class="reason">Flagged because: ${escapeHtml(t.reason)}.</p>` : ""}
    ${t.note ? `<p class="note">${escapeHtml(t.note)}</p>` : ""}
    <div class="actions">
      <a class="btn primary" href="${submitUrl(t)}" target="_blank" rel="noopener">Submit a texture</a>
      ${t.status === "missing" ? "" :
        `<a class="btn" href="textures/${t.id}.png" download="${t.name.split("/").pop()}.png">Download current</a>`}
    </div>
    ${strip("Same material", `Other ${titleCase(t.material || "")} textures — your texture must sit alongside these.`, sameMaterial)}
    ${strip("Same variant", `${titleCase(t.variant || "")} across other materials — copy the shapes and shading, change only the colours.`, sameVariant)}
  `;

  el("modalBody").querySelectorAll("[data-strip]").forEach((host) => {
    const ids = JSON.parse(host.dataset.strip);
    ids.forEach((rid) => host.appendChild(cardFor(byId.get(rid), true)));
  });

  el("modalBody").querySelector(".close").onclick = closeModal;
  el("modal").hidden = false;
  document.body.style.overflow = "hidden";
}

function strip(heading, hint, list) {
  if (!list.length) return "";
  // Cap the strip so a 58-member family doesn't dump 58 images into the modal.
  const ids = list.slice(0, 24).map((t) => t.id);
  const more = list.length > ids.length ? ` (showing ${ids.length} of ${list.length})` : "";
  return `<section class="related">
      <h3>${heading}</h3>
      <p class="hint">${escapeHtml(hint)}${more}</p>
      <div class="strip" data-strip='${JSON.stringify(ids)}'></div>
    </section>`;
}

function closeModal() {
  el("modal").hidden = true;
  document.body.style.overflow = "";
}

/* ---------- submission ------------------------------------------------ */

function submitUrl(t) {
  const params = new URLSearchParams({
    template: "texture-submission.yml",
    labels: "texture-submission",
    title: `[Texture] ${t.id}`,
    texture_id: t.id,
    current_status: STATUS_LABEL[t.status],
  });
  return `https://github.com/${CONFIG.owner}/${CONFIG.repo}/issues/new?${params}`;
}

/* ---------- utils ----------------------------------------------------- */

function titleCase(s) {
  return String(s).split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
