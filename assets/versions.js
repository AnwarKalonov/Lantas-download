/* Lantas — versions page.
 *
 * The release list comes from the public download repository on GitHub: free,
 * anonymous, no server of our own. Publish a release and this page picks it up.
 * The response is cached for ten minutes so a visit costs one API call at most.
 */

const REPO = "AnwarKalonov/Lantas-download";
const API = `https://api.github.com/repos/${REPO}/releases?per_page=30`;
const RELEASES = `https://github.com/${REPO}/releases`;
const CACHE_KEY = "lantas:releases:v1";
const CACHE_MS = 10 * 60 * 1000;

const $ = (sel, root = document) => root.querySelector(sel);

const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
  });

const clean = (version) => String(version || "").replace(/^v/i, "").trim();

function dateLabel(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function sizeLabel(bytes) {
  if (!bytes) return "";
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1e3))} KB`;
}

/* Release notes are markdown. The page shows the first few meaningful lines as
   plain text: no HTML is ever injected, and "What's Changed" is skipped because
   the list under it says the same thing more plainly. */
function noteLines(body) {
  const lines = String(body || "")
    .split("\n")
    .map((line) =>
      line
        .replace(/^#{1,6}\s*/, "")
        .replace(/^\s*[-*+]\s+/, "")
        .replace(/^\s*>\s*/, "")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/[*_`]/g, "")
        .trim()
    )
    .filter(Boolean)
    .filter((line) => !/^what'?s changed$/i.test(line))
    .filter((line) => !/^full changelog/i.test(line))
    .filter((line) => !/^contributors?:?$/i.test(line));

  return lines.slice(0, 5);
}

/* Every build the release carries, in the order a person picks one. */
function buildsOf(release) {
  const assets = Array.isArray(release.assets) ? release.assets : [];
  const find = (test) => assets.find((asset) => test(String(asset.name || "").toLowerCase()));
  const pick = (asset, label, kind) =>
    asset && {
      label,
      kind,
      name: asset.name,
      url: asset.browser_download_url,
      size: sizeLabel(asset.size),
    };

  const arm = (name) => name.includes("arm64") || name.includes("aarch64");
  const intel = (name) => name.includes("x64") || name.includes("x86_64") || name.includes("intel");
  const armDmg = find((name) => arm(name) && name.endsWith(".dmg"));
  const intelDmg = find((name) => intel(name) && name.endsWith(".dmg"));
  const armZip = find((name) => arm(name) && name.endsWith(".zip") && !name.includes("extension"));
  const intelZip = find((name) => intel(name) && name.endsWith(".zip") && !name.includes("extension"));
  const extension = find((name) => name.includes("extension") && name.endsWith(".zip"));

  return [
    pick(armDmg, "Apple silicon · dmg", "mac"),
    pick(intelDmg, "Intel · dmg", "mac"),
    pick(armZip, "Apple silicon · app.zip", "mac"),
    pick(intelZip, "Intel · app.zip", "mac"),
    pick(extension, "Chrome extension", "ext"),
  ].filter(Boolean);
}

function normalise(release) {
  const version = clean(release.tag_name || release.name);
  const builds = buildsOf(release);
  return {
    version,
    date: dateLabel(release.published_at),
    summary: (release.name || "").replace(/^v?[\d.]+\s*[—:-]?\s*/, "").trim(),
    notes: noteLines(release.body),
    url: release.html_url || `${RELEASES}/tag/v${version}`,
    builds,
    count: builds.length,
  };
}

function renderLatest(release) {
  const host = $("#ver-latest");
  if (!host) return;

  if (!release) {
    host.innerHTML = `
      <article class="ver-card is-empty">
        <p class="ver-kicker"><span class="dot"></span>No releases yet</p>
        <p class="ver-empty">The first build has not been published. When it is, it appears here — this page reads the release list directly, so there is nothing to update by hand.</p>
        <p class="ver-empty"><a class="dl-link" href="${esc(RELEASES)}">Releases on GitHub
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg></a></p>
      </article>`;
    return;
  }

  const notes = release.notes.length
    ? `<ul class="ver-notes">${release.notes.map((line) => `<li>${esc(line)}</li>`).join("")}</ul>`
    : "";

  const downloads = release.builds.length
    ? `<div class="ver-dl">${release.builds
        .map(
          (build) => `<a class="ver-build${build.kind === "ext" ? " is-ext" : ""}" href="${esc(build.url)}">
            <span class="vb-label">${esc(build.label)}</span>
            <span class="vb-meta">${esc(build.name)}${build.size ? ` · ${esc(build.size)}` : ""}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M8 11l4 4 4-4M5 19h14"/></svg>
          </a>`
        )
        .join("")}</div>`
    : `<p class="ver-empty">This release has no downloadable builds. <a href="${esc(release.url)}">Open it on GitHub</a>.</p>`;

  host.innerHTML = `
    <article class="ver-card">
      <header class="ver-head">
        <div>
          <p class="ver-kicker"><span class="dot"></span>Latest release</p>
          <h2 class="ver-num">${esc(release.version)}</h2>
          ${release.summary ? `<p class="ver-sum">${esc(release.summary)}</p>` : ""}
        </div>
        <div class="ver-meta">
          <span>${esc(release.date)}</span>
          <span>${release.count} ${release.count === 1 ? "build" : "builds"}</span>
          <a href="${esc(release.url)}">release notes</a>
        </div>
      </header>
      ${notes}
      ${downloads}
    </article>`;
}

function renderHistory(releases) {
  const host = $("#ver-list");
  if (!host) return;

  if (!releases.length) {
    host.innerHTML = `<p class="ver-empty">Older versions will be listed here once there are more than one.</p>`;
    return;
  }

  host.innerHTML = `
    <div class="tablewrap">
      <table class="dl-table ver-table">
        <thead>
          <tr>
            <th style="width:110px">Version</th>
            <th>Released</th>
            <th class="num" style="width:92px">Builds</th>
            <th style="width:132px"></th>
          </tr>
        </thead>
        <tbody>
          ${releases
            .map(
              (release) => `<tr>
                <td class="py">${esc(release.version)}</td>
                <td class="ver-date">${esc(release.date)}</td>
                <td class="sz">${release.count || "—"}</td>
                <td><a class="dl-link" href="${esc(release.url)}">release
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg></a></td>
              </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>
    <p class="ver-count">${releases.length} older ${releases.length === 1 ? "release" : "releases"}</p>`;
}

function setStatus(text) {
  const host = $("#ver-status");
  if (host) {
    host.textContent = text;
    host.hidden = !text;
  }
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.releases)) return null;
    if (Date.now() - Number(parsed.at || 0) > CACHE_MS) return null;
    return parsed.releases;
  } catch (error) {
    return null;
  }
}

function writeCache(releases) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), releases }));
  } catch (error) {
    /* private mode: the page still works, it just asks again next time */
  }
}

async function load() {
  const cached = readCache();
  if (cached) {
    paint(cached);
    return;
  }

  setStatus("Loading releases…");
  try {
    const response = await fetch(API, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const raw = await response.json();
    const releases = (Array.isArray(raw) ? raw : [])
      .filter((release) => !release.draft && !release.prerelease)
      .map(normalise)
      .filter((release) => release.version);
    writeCache(releases);
    paint(releases);
  } catch (error) {
    setStatus("");
    renderLatest(null);
    renderHistory([]);
    const host = $("#ver-latest");
    if (host) {
      host.innerHTML += `<p class="ver-empty">The release list could not be loaded just now. It is read from GitHub, so try again in a minute or <a href="${esc(RELEASES)}">open the releases on GitHub</a>.</p>`;
    }
  }
}

function paint(releases) {
  setStatus("");
  renderLatest(releases[0] || null);
  renderHistory(releases.slice(1));
  const stamp = $("#ver-stamp");
  if (stamp && releases[0]) {
    stamp.textContent = `${releases.length} ${releases.length === 1 ? "release" : "releases"} · newest ${releases[0].version}`;
  }
}

document.documentElement.classList.add("js");
load();
