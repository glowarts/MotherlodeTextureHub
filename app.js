/* Motherlode Texture Workshop — no framework, no build step, no network calls
   beyond loading the generated catalog that sits next to this file.

   A card is one *block*, not one PNG. Blocks with several faces (a log's side
   and top, a door's two halves) group into a single card, because that is how
   an artist thinks about the job. */

const CONFIG = window.MOTHERLODE_CONFIG || {};
const STATUSES = ["missing", "placeholder", "unreviewed", "done"];
const STATUS_LABEL = {
  missing: "Missing",
  placeholder: "Placeholder",
  unreviewed: "Unreviewed",
  done: "Done",
};

const state = {
  groups: [],
  category: "block",
  // Show everything. Filtering to just the unfinished work makes the mod look
  // untextured and hides the finished art people are meant to match, so
  // priority is expressed through sort order and badges instead.
  statuses: new Set(STATUSES),
  search: "",
  material: "",
  variant: "",
  // "priority" surfaces the work; "name" keeps a family together even when some
  // of its members are finished and others are not.
  sort: "priority",
};

const el = (id) => document.getElementById(id);
const byKey = new Map();

/* ---------- boot ------------------------------------------------------ */

fetch("data/catalog.json?v=b35c3911")
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
  state.groups = catalog.groups;
  state.groups.forEach((g) => byKey.set(g.key, g));

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
    const n = state.groups.filter((g) => g.category === category).length;
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
  const pool = state.groups.filter((g) => g.category === state.category);
  fill(el("materialFilter"), "All materials", uniq(pool.map((g) => g.material)));
  fill(el("variantFilter"), "All variants", uniq(pool.map((g) => g.variant)));
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
  el("sortBy").onchange = (e) => { state.sort = e.target.value; render(); };
  el("resetFilters").onclick = () => {
    state.search = state.material = state.variant = "";
    state.sort = "priority";
    state.statuses = new Set(STATUSES);
    el("search").value = "";
    el("sortBy").value = "priority";
    buildStatusChips();
    buildSelects();
    render();
  };

  el("guideToggle").onclick = (e) => {
    e.preventDefault();
    el("guide").hidden = !el("guide").hidden;
  };

  // Animations play by default for everyone; the choice to stop them is the
  // viewer's, and it survives a reload.
  const animBtn = el("animToggle");
  const setAnim = (paused) => {
    document.body.dataset.anim = paused ? "paused" : "playing";
    animBtn.textContent = paused ? "Play animations" : "Pause animations";
    animBtn.setAttribute("aria-pressed", String(paused));
    try { localStorage.setItem("motherlode.anim", paused ? "paused" : "playing"); } catch (e) { }
  };
  let stored = null;
  try { stored = localStorage.getItem("motherlode.anim"); } catch (e) { }
  setAnim(stored === "paused");
  animBtn.onclick = () => setAnim(document.body.dataset.anim !== "paused");

  el("modal").onclick = (e) => { if (e.target.dataset.close !== undefined) closeModal(); };
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
}

/* ---------- filtering / grid ------------------------------------------ */

function matches(g) {
  if (g.category !== state.category) return false;
  if (!state.statuses.has(g.status)) return false;
  if (state.material && g.material !== state.material) return false;
  if (state.variant && g.variant !== state.variant) return false;
  if (state.search) {
    const hay = `${g.name} ${g.material || ""} ${g.variant || ""}`.toLowerCase();
    if (!hay.includes(state.search)) return false;
  }
  return true;
}

function render() {
  const pool = state.groups.filter((g) => g.category === state.category);
  const counts = {};
  STATUSES.forEach((s) => { counts[s] = pool.filter((g) => g.status === s).length; });
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.querySelector(".n").textContent = ` ${counts[chip.dataset.status]}`;
  });

  const shown = state.groups.filter(matches).sort(
    (a, b) => (state.sort === "priority"
      ? STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) : 0) ||
      a.name.localeCompare(b.name)
  );

  const grid = el("grid");
  grid.innerHTML = "";
  const frag = document.createDocumentFragment();
  shown.forEach((g) => frag.appendChild(cardFor(g)));
  grid.appendChild(frag);

  el("empty").hidden = shown.length > 0;

  const noun = state.category === "block" ? "block" : "item";
  const needsArt = counts.missing + counts.placeholder;
  const order = state.sort === "priority"
    ? "Sorted with the gaps first." : "Sorted by name, so families stay together.";
  el("resultCount").textContent = shown.length !== pool.length
    ? `Showing ${shown.length} of ${pool.length} ${noun}s. ${order}`
    : `${pool.length} ${noun}s — ${needsArt} still need art, ` +
      `${counts.unreviewed + counts.done} already drawn. ${order}`;
}

/** The face that best represents the block on its card. */
function coverFace(g) {
  return g.faces.find((f) => f.status !== "missing") || g.faces[0];
}

function thumbFor(face, cls) {
  if (!face || face.status === "missing") {
    return `<div class="${cls} none" aria-hidden="true">?</div>`;
  }
  const src = `textures/${face.id}.png`;
  if (!(face.frames > 1)) {
    return `<img class="${cls}" loading="lazy" alt="" src="${src}">`;
  }
  // An animated texture is a vertical filmstrip, so showing the PNG whole would
  // squash every frame into one square. Clip to a single frame and step the
  // strip upward instead: the image is `frames` tall, and translating it by its
  // own height in `frames` steps lands exactly on each frame in turn.
  return `<div class="${cls} filmstrip">
      <img loading="lazy" alt="" src="${src}"
           style="height:calc(${face.frames} * 100%);animation-duration:${face.duration}s;animation-timing-function:steps(${face.frames})">
    </div>`;
}

function cardFor(g, small) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "card";
  card.title = g.key;

  const anim = g.faces.find((f) => f.frames > 1);
  const faces = g.faces.length > 1
    ? `<span class="faces">${g.faces.length} faces</span>`
    : anim ? `<span class="faces">${anim.frames} frames</span>` : "";

  card.innerHTML =
    thumbFor(coverFace(g), "thumb") +
    `<span class="badge ${g.status}"></span>${faces}` +
    `<span class="name">${escapeHtml(small ? g.label : g.name)}</span>`;
  card.onclick = () => openModal(g.key);
  return card;
}

/* ---------- detail ---------------------------------------------------- */

function openModal(key) {
  const g = byKey.get(key);
  if (!g) return;

  const cover = coverFace(g);
  const rows = [["Status", `<span class="pill ${g.status}">${STATUS_LABEL[g.status]}</span>`]];
  if (g.material) rows.push(["Material", titleCase(g.material)]);
  if (g.variant) rows.push(["Variant", titleCase(g.variant)]);
  rows.push(["Textures", g.faces.length === 1
    ? "1" : `${g.faces.length} faces, all needed`]);
  const anim = g.faces.find((f) => f.frames > 1);
  if (cover && cover.size) {
    // For a filmstrip the useful size is one frame, not the whole sheet.
    const [w, h] = anim ? [anim.size[0], anim.size[0]] : cover.size;
    rows.push(["Size", `${w}&times;${h}`]);
  }
  if (anim) {
    rows.push(["Animation",
      `${anim.frames} frames over ${anim.duration}s` +
      (anim.hasMeta ? "" : ' <span class="warn">(no .mcmeta &mdash; will not animate in game)</span>')]);
  }

  const sameMaterial = g.material
    ? state.groups.filter((o) => o.material === g.material && o.key !== g.key &&
                                 o.category === g.category)
    : [];
  const sameVariant = g.variant
    ? state.groups.filter((o) => o.variant === g.variant && o.key !== g.key &&
                                 o.category === g.category)
    : [];

  el("modalBody").innerHTML = `
    <button class="close" data-close aria-label="Close">&times;</button>
    <div class="detail-head">
      ${thumbFor(cover, "detail-preview")}
      <div class="detail-meta">
        <h2>${escapeHtml(g.label)}</h2>
        <div class="id">${escapeHtml(g.key)}</div>
        <dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>
      </div>
    </div>
    ${facesSection(g)}
    <div class="actions">
      <a class="btn primary" href="${submitUrl(g)}" target="_blank" rel="noopener">
        ${g.faces.length > 1 ? "Submit textures for this block" : "Submit a texture"}</a>
    </div>
    ${strip("Same material",
      `Other ${titleCase(g.material || "")} blocks — yours has to sit alongside these.`,
      sameMaterial)}
    ${strip("Same shape",
      `${titleCase(g.variant || "")} in other materials — copy the shapes and shading, change only the colours.`,
      sameVariant)}
  `;

  el("modalBody").querySelectorAll("[data-strip]").forEach((host) => {
    JSON.parse(host.dataset.strip).forEach((k) => host.appendChild(cardFor(byKey.get(k), true)));
  });

  el("modalBody").querySelector(".close").onclick = closeModal;
  el("modal").hidden = false;
  document.body.style.overflow = "hidden";
}

/** Every face of the block, each downloadable and submittable on its own. */
function facesSection(g) {
  const single = g.faces.length === 1;
  const tiles = g.faces.map((f) => {
    const name = (f.face ? titleCase(f.face) : "Main") +
      (f.frames > 1 ? ` · ${f.frames} frames` : "");
    const download = f.status === "missing" ? "" :
      `<a class="face-link" href="textures/${f.id}.png" download="${f.name.split("/").pop()}.png">Download</a>`;
    return `<figure class="face">
        ${thumbFor(f, "face-img")}
        <figcaption>
          <span class="face-name">${escapeHtml(name)}</span>
          <span class="pill ${f.status}">${STATUS_LABEL[f.status]}</span>
          ${f.reason ? `<span class="face-reason">${escapeHtml(f.reason)}</span>` : ""}
          ${f.redundantOf ? `<span class="face-reason warn">Unused duplicate of ${
            escapeHtml(f.redundantOf.split("/").pop())} &mdash; nothing references this file.</span>` : ""}
          ${f.note ? `<span class="face-note">${escapeHtml(f.note)}</span>` : ""}
          <span class="face-actions">${download}
            <a class="face-link" href="${submitUrl(g, f)}" target="_blank" rel="noopener">Submit</a>
          </span>
        </figcaption>
      </figure>`;
  }).join("");

  return `<section class="related">
      <h3>${single ? "Texture" : "Faces"}</h3>
      <p class="hint">${single
        ? "One texture covers this block."
        : "This block needs all of these. Draw them as a set so they line up."}</p>
      <div class="faces-grid">${tiles}</div>
    </section>`;
}

function strip(heading, hint, list) {
  if (!list.length) return "";
  // Cap the strip so a 58-member family doesn't dump 58 images into the modal.
  const keys = list.slice(0, 24).map((g) => g.key);
  const more = list.length > keys.length ? ` (showing ${keys.length} of ${list.length})` : "";
  return `<section class="related">
      <h3>${heading}</h3>
      <p class="hint">${escapeHtml(hint)}${more}</p>
      <div class="strip" data-strip='${JSON.stringify(keys)}'></div>
    </section>`;
}

function closeModal() {
  el("modal").hidden = true;
  document.body.style.overflow = "";
}

/* ---------- submission ------------------------------------------------ */

function submitUrl(g, face) {
  const target = face ? face.id : g.key;
  const params = new URLSearchParams({
    template: "texture-submission.yml",
    labels: "texture-submission",
    title: `[Texture] ${target}`,
    texture_id: target,
    current_status: STATUS_LABEL[face ? face.status : g.status],
  });
  if (!face && g.faces.length > 1) {
    params.set("notes", "Faces needed: " +
      g.faces.map((f) => f.name.split("/").pop()).join(", "));
  }
  return `https://github.com/${CONFIG.owner}/${CONFIG.repo}/issues/new?${params}`;
}

/* ---------- utils ----------------------------------------------------- */

function titleCase(s) {
  return String(s).split(/[_ ]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
