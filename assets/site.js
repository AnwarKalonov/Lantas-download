/* Lantas — motion, plots, interactions */

document.documentElement.classList.add("js");

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ---------- nav: progress + mobile menu ---------- */

function initNav() {
  const nav = $(".nav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("stuck", window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  const btn = $(".menu-btn");
  if (btn) {
    btn.addEventListener("click", () => {
      const open = document.body.classList.toggle("nav-open");
      btn.setAttribute("aria-expanded", String(open));
    });
    $$(".nav-links a").forEach((a) =>
      a.addEventListener("click", () => {
        document.body.classList.remove("nav-open");
        btn.setAttribute("aria-expanded", "false");
      })
    );
  }
}

/* ---------- reveal ---------- */

function initReveal() {
  const items = $$("[data-reveal]");
  if (!items.length) return;
  if (reduced) {
    items.forEach((el) => el.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add("in");
        io.unobserve(el);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
  );
  items.forEach((el) => io.observe(el));
}

/* ---------- traces ---------- */

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function traceValues(kind) {
  const r = mulberry32(kind === "flat" ? 7 : 21);
  const n = 160;
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    let v;
    if (kind === "flat") {
      if (t < 0.216) {
        v = 2.36 - 1.86 * Math.pow(t / 0.216, 0.62) + (r() - 0.5) * 0.07;
      } else {
        v = 0.5012 + (r() - 0.5) * 0.0016;
      }
    } else {
      if (t < 0.62) {
        v = 0.2 + 1.55 * Math.exp(-9 * t) + (r() - 0.5) * 0.02;
      } else {
        const k = (t - 0.62) / 0.38;
        v = 0.2 + 2.6 * Math.pow(k, 1.7) + (r() - 0.5) * 0.03;
      }
    }
    out.push(v);
  }
  return out;
}

function buildTrace(host) {
  const svg = $("svg", host);
  if (!svg) return null;
  const kind = host.dataset.trace || "flat";
  const W = 1000;
  const H = kind === "flat" ? 250 : 310;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

  const vals = traceValues(kind);
  const lowest = Math.min(...vals);
  const highest = Math.max(...vals);
  const span = highest - lowest;
  const min = lowest - span * (kind === "flat" ? 0.34 : 0.12);
  const max = highest + span * 0.06;
  const padX = 6;
  const padY = 14;
  const x = (i) => padX + (i / (vals.length - 1)) * (W - padX * 2);
  const y = (v) => H - padY - ((v - min) / (max - min)) * (H - padY * 2);
  const cut = Math.round((kind === "flat" ? 0.216 : 0.62) * (vals.length - 1));

  const NS = "http://www.w3.org/2000/svg";
  const el = (name, attrs) => {
    const node = document.createElementNS(NS, name);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  };

  const lineTo = (arr, off = 0) =>
    arr
      .map((v, i) => `${i === 0 ? "M" : "L"}${x(i + off).toFixed(1)} ${y(v).toFixed(1)}`)
      .join(" ");

  const head = vals.slice(0, cut + 1);
  const tail = vals.slice(cut);

  const areaD =
    lineTo(vals) + ` L${x(vals.length - 1).toFixed(1)} ${H} L${padX} ${H} Z`;

  svg.innerHTML = "";

  const defs = el("defs", {});
  const grad = el("linearGradient", { id: "emberFade", x1: "0", y1: "0", x2: "0", y2: "1" });
  grad.append(
    el("stop", { offset: "0", "stop-color": "#2c6a4e", "stop-opacity": "0.16" }),
    el("stop", { offset: "1", "stop-color": "#2c6a4e", "stop-opacity": "0" })
  );
  defs.append(grad);
  svg.append(defs);

  const area = el("path", { d: areaD, class: "trace-area" });
  svg.append(area);

  const guide = el("line", {
    x1: x(cut),
    y1: padY,
    x2: x(cut),
    y2: H,
    class: "trace-mark",
  });
  svg.append(guide);

  const base = el("line", {
    x1: padX,
    y1: H - padY,
    x2: W - padX,
    y2: H - padY,
    class: "trace-guide",
  });
  svg.append(base);

  const main = el("path", { d: lineTo(head), class: "trace-line" });
  const tailPath = el("path", { d: lineTo(tail, cut), class: "trace-tail" });
  svg.append(main, tailPath);

  const dot = el("circle", { r: "3.2", class: "trace-head", cx: x(0), cy: y(vals[0]) });
  svg.append(dot);

  const mainLen = main.getTotalLength();
  const tailLen = tailPath.getTotalLength();
  main.style.strokeDasharray = mainLen;
  tailPath.style.strokeDasharray = tailLen;

  let raf = 0;

  const settle = () => {
    main.style.strokeDashoffset = 0;
    tailPath.style.strokeDashoffset = 0;
    dot.setAttribute("cx", x(vals.length - 1));
    dot.setAttribute("cy", y(vals[vals.length - 1]));
    area.style.opacity = 1;
    guide.style.opacity = 0.7;
  };

  const run = () => {
    cancelAnimationFrame(raf);
    main.style.strokeDashoffset = mainLen;
    tailPath.style.strokeDashoffset = tailLen;
    area.style.opacity = 0;
    guide.style.opacity = 0;
    dot.style.opacity = 1;

    if (reduced) {
      settle();
      return;
    }

    const dur = kind === "flat" ? 1900 : 2300;
    const t0 = performance.now();
    const frame = (now) => {
      const p = Math.min(1, Math.max(0, (now - t0) / dur));
      const e = 1 - Math.pow(1 - p, 3);
      const headP = Math.min(1, e / 0.72);
      const tailP = Math.max(0, (e - 0.72) / 0.28);
      main.style.strokeDashoffset = mainLen * (1 - headP);
      tailPath.style.strokeDashoffset = tailLen * (1 - tailP);

      const idx = Math.min(vals.length - 1, Math.round(e * (vals.length - 1)));
      dot.setAttribute("cx", x(idx));
      dot.setAttribute("cy", y(vals[idx]));

      if (p > 0.5) area.style.opacity = (p - 0.5) / 0.5;
      if (p > 0.72) guide.style.opacity = Math.min(0.7, (p - 0.72) * 6);

      if (p < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  };

  host._run = run;

  const replay = $(".replay", host);
  if (replay) replay.addEventListener("click", run);

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        run();
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.35 }
  );
  io.observe(host);

  return run;
}

/* ---------- counters ---------- */

function initCounters() {
  const nodes = $$("[data-count]");
  if (!nodes.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const node = entry.target;
        io.unobserve(node);
        const target = parseFloat(node.dataset.count);
        const dec = parseInt(node.dataset.dec || "0", 10);
        if (reduced || isNaN(target)) {
          node.textContent = target.toFixed(dec);
          return;
        }
        const dur = 900;
        const t0 = performance.now();
        const frame = (now) => {
          const p = Math.min(1, Math.max(0, (now - t0) / dur));
          const e = 1 - Math.pow(1 - p, 3);
          node.textContent = (target * e).toFixed(dec);
          if (p < 1) requestAnimationFrame(frame);
          else node.textContent = target.toFixed(dec);
        };
        requestAnimationFrame(frame);
      });
    },
    { threshold: 0.6 }
  );
  nodes.forEach((n) => io.observe(n));
}

/* ---------- copy ---------- */

function initCopy() {
  $$("[data-copy]").forEach((btn) => {
    const label = $(".label", btn);
    const original = label ? label.textContent : null;
    btn.addEventListener("click", async () => {
      const text = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
      } catch (e) {
        const field = document.createElement("textarea");
        field.value = text;
        document.body.append(field);
        field.select();
        document.execCommand("copy");
        field.remove();
      }
      btn.classList.add("done");
      if (label) label.textContent = "copied";
      else {
        const ok = $(".ok", btn);
        if (ok) ok.textContent = "copied";
      }
      btn.closest(".cmdline")?.classList.add("copied");
      clearTimeout(btn._t);
      btn._t = setTimeout(() => {
        btn.classList.remove("done");
        btn.closest(".cmdline")?.classList.remove("copied");
        if (label && original) label.textContent = original;
      }, 1600);
    });
  });
}

/* ---------- diff: apply / undo ---------- */

function initDiff() {
  $$("[data-diff]").forEach((win) => {
    const status = $(".state .label", win);
    const apply = $("[data-apply]", win);
    const undo = $("[data-undo]", win);
    if (!apply) return;
    apply.addEventListener("click", () => {
      win.classList.add("applied");
      if (status) status.textContent = "applied · 1 edit";
      $(".state", win)?.classList.add("on");
      apply.setAttribute("aria-pressed", "true");
    });
    if (undo)
      undo.addEventListener("click", () => {
        win.classList.remove("applied");
        if (status) status.textContent = "clean · #buy back on line 12";
        $(".state", win)?.classList.remove("on");
        apply.setAttribute("aria-pressed", "false");
      });
  });
}

/* ---------- stepper ---------- */

function initStepper() {
  $$("[data-stepper]").forEach((root) => {
    const steps = $$(".step", root);
    const panel = $(".step-panel", root);
    if (!steps.length || !panel) return;
    let cur = 0;
    const show = (i) => {
      cur = i;
      steps.forEach((s, j) => s.setAttribute("aria-selected", String(i === j)));
      const s = steps[i];
      panel.innerHTML = `
        <p class="k">${s.dataset.k || ""}</p>
        <h3>${s.dataset.title || s.textContent.trim()}</h3>
        <p>${s.dataset.body || ""}</p>
        ${s.dataset.code ? `<pre class="code-out">${s.dataset.code}</pre>` : ""}
      `;
      panel.classList.remove("enter");
      void panel.offsetWidth;
      panel.classList.add("enter");
    };
    steps.forEach((s, i) => {
      s.addEventListener("click", () => show(i));
      s.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          steps[Math.min(steps.length - 1, i + 1)].focus();
          show(Math.min(steps.length - 1, i + 1));
        }
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          e.preventDefault();
          steps[Math.max(0, i - 1)].focus();
          show(Math.max(0, i - 1));
        }
      });
    });
    show(0);

    if (!reduced) {
      const timer = setInterval(() => show((cur + 1) % steps.length), 3800);
      const stop = () => clearInterval(timer);
      root.addEventListener("pointerdown", stop, { once: true });
      root.addEventListener("keydown", stop, { once: true });
      root.addEventListener("focusin", stop, { once: true });
    }
  });
}

/* ---------- matrix focus ---------- */

function initMatrix() {
  $$("[data-matrix]").forEach((root) => {
    const wrap = $(".matrix-wrap", root) || root;
    $$("th[data-col]", wrap).forEach((th) => {
      th.addEventListener("click", () => {
        const col = th.dataset.col;
        if (wrap.dataset.focus === col) delete wrap.dataset.focus;
        else wrap.dataset.focus = col;
      });
    });
  });
}

/* ---------- bar groups in view ---------- */

function initBars() {
  $$("[data-bars]").forEach((root) => {
    $$(".bench-row", root).forEach((row, i) => row.style.setProperty("--i", i));
    $$(".oh-row", root).forEach((row, i) => row.style.setProperty("--i", i));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          root.classList.add("in");
          $$("[data-w]", root).forEach((bar) => {
            bar.style.width = bar.dataset.w + "%";
          });
          io.unobserve(root);
        });
      },
      { threshold: 0.25 }
    );
    io.observe(root);
  });
}

/* ---------- label match figure ---------- */

function initResidual() {
  const host = $("[data-resid]");
  if (!host) return;
  const svg = $("svg", host);
  const out = $(".readout-line", host);
  const W = 760;
  const H = 420;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const NS = "http://www.w3.org/2000/svg";
  const el = (n, a) => {
    const node = document.createElementNS(NS, n);
    for (const k in a) node.setAttribute(k, a[k]);
    return node;
  };
  const WANT = [
    "place order", "apply coupon", "order total", "download invoice", "next", "save changes",
    "email", "password", "search", "cart", "back", "help", "sign in", "continue",
  ];
  const SAYS = [
    "Place order", "Apply coupon", "Order total", "Download invoice", "Next", "Save changes",
    "Email address", "Password", "Search", "Cart", "Back", "Help", "Sign in", "Continue",
  ];
  const r = mulberry32(42);
  const pts = [];
  for (let i = 0; i < 14; i++) {
    const px = 40 + (i / 13) * (W - 80);
    const truth = 0.5 - 0.34 * (i / 13) + 0.1 * Math.sin(i * 0.9);
    const pred = truth - 0.22 + r() * 0.44;
    pts.push({ px, truth, pred, e: truth - pred });
  }
  const yOf = (v) => H - 40 - v * (H - 80);

  const actual = el("path", {
    d: pts.map((p, i) => `${i ? "L" : "M"}${p.px.toFixed(1)} ${yOf(p.truth).toFixed(1)}`).join(" "),
    fill: "none",
    class: "actual",
  });
  svg.append(actual);

  const line = el("path", {
    d: pts.map((p, i) => `${i ? "L" : "M"}${p.px.toFixed(1)} ${yOf(p.pred).toFixed(1)}`).join(" "),
    fill: "none",
    class: "pred",
  });
  svg.append(line);

  const group = el("g", {});
  pts.forEach((p, i) => {
    const seg = el("line", {
      x1: p.px,
      y1: yOf(p.pred),
      x2: p.px,
      y2: yOf(p.truth),
      class: "seg",
      opacity: 0.28,
    });
    const tick = el("line", {
      x1: p.px - 8,
      y1: yOf(p.truth),
      x2: p.px + 8,
      y2: yOf(p.truth),
      class: "resline",
    });
    const dot = el("circle", {
      cx: p.px,
      cy: yOf(p.pred),
      r: 5,
      class: "dot",
      "data-i": i,
      tabindex: "0",
      role: "button",
      "aria-label": `control ${i + 1}, match ${(0.96 - Math.abs(p.e)).toFixed(2)}`,
    });
    group.append(seg, tick, dot);
    const on = () => {
      $$(".dot", svg).forEach((d) => d.classList.remove("on"));
      seg.setAttribute("opacity", "1");
      dot.classList.add("on");
      if (out)
        out.innerHTML = `control <b>${i + 1}</b> · asked “${WANT[i]}” · page says “${SAYS[i]}” · match <b>${(
          0.96 - Math.abs(p.e)
        ).toFixed(2)}</b>`;
    };
    dot.addEventListener("mouseenter", on);
    dot.addEventListener("focus", on);
    dot.addEventListener("click", on);
    dot.addEventListener("mouseleave", () => seg.setAttribute("opacity", "0.5"));
  });
  svg.append(group);

  const axis = el("line", {
    x1: 24,
    y1: H - 18,
    x2: W - 24,
    y2: H - 18,
    class: "axis",
  });
  svg.append(axis);

  if (out)
    out.innerHTML = `hover a control · green is the match`;

  const paths = $$("path", svg);
  paths.forEach((path) => {
    let len = 0;
    try {
      len = path.getTotalLength();
    } catch (err) {
      len = 0;
    }
    path.style.strokeDasharray = path.classList.contains("pred") ? "3 4" : len;
    path.style.strokeDashoffset = len;
    path.dataset.len = len;
  });
  $$(".dot", svg).forEach((dot, i) => {
    dot.style.animationDelay = 70 + i * 46 + "ms";
  });
  $$(".seg, .resline", svg).forEach((node, i) => {
    node.style.animationDelay = 160 + i * 40 + "ms";
  });

  const draw = () => {
    host.classList.add("in");
    paths.forEach((path) => {
      path.style.strokeDashoffset = 0;
    });
  };

  if (reduced || !("IntersectionObserver" in window)) {
    draw();
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        draw();
        io.disconnect();
      });
    },
    { threshold: 0.25 }
  );
  io.observe(host);
}

/* ---------- docs scrollspy ---------- */

function initDocNav() {
  const nav = $(".doc-nav");
  if (!nav) return;
  const links = $$("a[href^='#']", nav);
  const sections = links
    .map((a) => document.getElementById(a.getAttribute("href").slice(1)))
    .filter(Boolean);
  if (!sections.length) return;

  const setActive = (id) => {
    links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + id));
  };

  const io = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    },
    { rootMargin: "-88px 0px -60% 0px", threshold: 0 }
  );
  sections.forEach((s) => io.observe(s));
}

/* ---------- download filter ---------- */

function initDownload() {
  const root = $("[data-download]");
  if (!root) return;
  const rows = $$("tr[data-os]", root);
  const buttons = $$(".seg button[data-os]", root);
  const count = $(".count", root);
  const platNames = { arm: "Apple silicon", intel: "Intel", ext: "extension" };

  const pick = (os) => {
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.os === os)));
    let rec = null;
    rows.forEach((row) => {
      const show = row.dataset.os === os;
      row.hidden = !show;
      row.classList.remove("rec");
      if (show) rec = row;
    });
    if (rec) {
      rec.classList.add("rec");
      const tag = $(".rec-tag", rec);
      if (tag) tag.hidden = false;
    }
    if (count) {
      const n = rows.filter((r) => !r.hidden).length;
      count.textContent = `${n} build${n === 1 ? "" : "s"} · ${platNames[os] || os}`;
    }
  };

  buttons.forEach((b) => b.addEventListener("click", () => pick(b.dataset.os)));

  const guess = () => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("intel mac") || ua.includes("x86_64")) return "intel";
    return "arm";
  };
  pick(guess());
}

/* ---------- sky field: parallax clouds + binary clouds ---------- */

/* ---------- liquid glass: specular follows the pointer ---------- */

function initGlass() {
    $$(
    [
      ".nav",
      ".btn-secondary",
      ".btn-line",
      ".cmdline",
      ".theme-btn",
      ".menu-btn",
      ".plot .replay",
      ".film-rail li",
      ".step[aria-selected='true']",
      ".seg button",
      ".panel",
      ".step-panel",
      ".film-card",
      ".resid",
      ".codewin",
      ".loop-step",
      ".bench",
      ".author",
      ".side-card",
      ".matrix-wrap",
      ".callout",
      ".tag",
    ].join(", ")
  ).forEach((el) => el.classList.add("lg"));
  if (reduced) return;
  let raf = 0;
  document.addEventListener(
    "pointermove",
    (e) => {
      const el = e.target && e.target.closest ? e.target.closest(".lg") : null;
      if (!el || raf) return;
      const x = e.clientX;
      const y = e.clientY;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!el.isConnected) return;
        const box = el.getBoundingClientRect();
        if (!box.width || !box.height) return;
        el.style.setProperty("--mx", (((x - box.left) / box.width) * 100).toFixed(1) + "%");
        el.style.setProperty("--my", (((y - box.top) / box.height) * 100).toFixed(1) + "%");
      });
    },
    { passive: true }
  );
}

/* ---------- a flashlight of binary that follows the pointer ---------- */

function initSpot() {
  const host = $(".spot");
  const pre = host && $(".spot-text", host);
  if (!host || !pre) return;
  if (reduced || !window.matchMedia("(pointer: fine)").matches) {
    host.remove();
    return;
  }

  const CELL_W = 5.4;
  const LINE_H = 9.6;
  const rnd = mulberry32(451);
  let cols = 0;
  let rows = 0;
  let cells = [];

  const paint = () => {
    let out = "";
    for (let r = 0; r < rows; r++) {
      out += cells[r].join("");
      if (r < rows - 1) out += "\n";
    }
    pre.textContent = out;
  };

  const build = () => {
    cols = Math.ceil(window.innerWidth / CELL_W) + 1;
    rows = Math.ceil(window.innerHeight / LINE_H) + 1;
    cells = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) row.push(rnd() > 0.72 ? (rnd() > 0.5 ? "1" : "0") : " ");
      cells.push(row);
    }
    paint();
  };

  build();

  let raf = 0;
  let shown = false;
  const move = (e) => {
    if (raf) return;
    const at = [e.clientX, e.clientY];
    raf = requestAnimationFrame(() => {
      const [x, y] = at;
      raf = 0;
      host.style.setProperty("--mx", x + "px");
      host.style.setProperty("--my", y + "px");
      if (!shown) {
        shown = true;
        host.style.setProperty("--on", "1");
      }
    });
  };

  document.addEventListener("pointermove", move, { passive: true });
  document.addEventListener("pointerleave", () => {
    shown = false;
    host.style.setProperty("--on", "0");
  });

  setInterval(() => {
    if (document.hidden) return;
    for (let k = 0; k < 70; k++) {
      const r = (Math.random() * rows) | 0;
      const c = (Math.random() * cols) | 0;
      cells[r][c] = Math.random() > 0.5 ? "1" : "0";
    }
    paint();
  }, 220);

  let rt = 0;
  window.addEventListener(
    "resize",
    () => {
      clearTimeout(rt);
      rt = setTimeout(build, 240);
    },
    { passive: true }
  );
}

/* ---------- light / dark ---------- */

function initTheme() {
  const root = document.documentElement;
  const KEY = "lantas-theme";

  const apply = (theme) => {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    $$("[data-theme-toggle]").forEach((btn) => {
      const dark = theme === "dark";
      btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      btn.setAttribute("aria-pressed", dark ? "true" : "false");
    });
  };

  apply(root.dataset.theme === "dark" ? "dark" : "light");

  $$("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      apply(next);
      try {
        localStorage.setItem(KEY, next);
      } catch (err) {
        /* private mode: the choice just won't persist */
      }
    });
  });
}

initTheme();

/* ---------- sky field: clouds made of digits ---------- */

const CLOUD_CURVE = [
  0.08, 0.16, 0.24, 0.32, 0.4, 0.48, 0.55, 0.61, 0.67, 0.72, 0.77, 0.81, 0.85, 0.88,
  0.91, 0.94, 0.96, 0.97, 0.98, 0.99, 1, 1, 0.99, 0.97, 0.93, 0.85, 0.72,
];

function cloudHalf(t) {
  const x = Math.min(1, Math.max(0, t)) * (CLOUD_CURVE.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = CLOUD_CURVE[i];
  const b = CLOUD_CURVE[Math.min(CLOUD_CURVE.length - 1, i + 1)];
  return a + (b - a) * f;
}

function initBits() {
  const CELL_W = 5.4;
  const CELL_H = 9.6;
  const clouds = [];
  const hosts = $$(".bits");

  const paint = (cloud) => {
    const rows = cloud.cells;
    let out = "";
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 0; c < row.length; c++) out += row[c] || " ";
      if (r < rows.length - 1) out += "\n";
    }
    cloud.node.textContent = out;
  };

  const build = (host, index) => {
    const w = host.clientWidth || 420;
    const h = host.clientHeight || 240;
    const COLS = Math.max(36, Math.min(120, Math.round(w / CELL_W)));
    const ROWS = Math.max(12, Math.min(44, Math.round(h / CELL_H)));
    const rnd = mulberry32(97 + index * 137);
    const cells = [];

    for (let r = 0; r < ROWS; r++) {
      const t = ROWS === 1 ? 0.5 : r / (ROWS - 1);
      const half = cloudHalf(t) * (COLS / 2) * 0.97;
      const drift = (rnd() - 0.5) * 2.4;
      const c0 = Math.max(0, Math.round(COLS / 2 - half + drift));
      const c1 = Math.min(COLS, Math.round(COLS / 2 + half + drift));
      const row = [];

      for (let c = 0; c < COLS; c++) {
        if (c < c0 || c >= c1) {
          row.push(null);
          continue;
        }
        const edge = Math.min(c - c0, c1 - 1 - c);
        const roll = rnd();

        if (t < 0.14 && roll > 0.55) {
          row.push(null);
          continue;
        }
        if (edge < 1) {
          row.push(roll > 0.6 ? "+" : null);
          continue;
        }
        if (edge < 3) {
          row.push(roll > 0.4 ? (roll > 0.72 ? "+" : roll > 0.56 ? "1" : "0") : null);
          continue;
        }
        if (t > 0.86 && roll > 0.72) {
          row.push(null);
          continue;
        }
        row.push(roll > 0.5 ? "1" : "0");
      }
      cells.push(row);
    }

    const node = document.createElement("pre");
    node.className = "bits-text";
    host.replaceChildren(node);
    return { host, node, cells, on: false };
  };

  const start = () => {
    clouds.length = 0;
    hosts.forEach((host, i) => clouds.push(build(host, i)));
    clouds.forEach((cloud) => {
      paint(cloud);
      cloud.on = true;
    });
  };

  if (!hosts.length) return;
  start();

  if (reduced) return;

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const cloud = clouds.find((c) => c.host === entry.target);
          if (cloud) cloud.on = entry.isIntersecting;
        });
      },
      { rootMargin: "160px" }
    );
    hosts.forEach((host) => io.observe(host));
  }

  let tick = 0;
  setInterval(() => {
    if (document.hidden) return;
    tick += 1;
    clouds.forEach((cloud, i) => {
      if (!cloud.on || (i + tick) % 2 === 0) return;
      const rows = cloud.cells;
      const flips = Math.max(5, Math.round(rows.length * rows[0].length * 0.03));
      let changed = false;

      for (let k = 0; k < flips; k++) {
        const r = (Math.random() * rows.length) | 0;
        const row = rows[r];
        const c = (Math.random() * row.length) | 0;
        if (!row[c]) continue;
        row[c] = Math.random() > 0.5 ? "1" : "0";
        changed = true;
      }
      if (changed) paint(cloud);
    });
  }, 110);

  let resizeTimer = 0;
  window.addEventListener(
    "resize",
    () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(start, 220);
    },
    { passive: true }
  );
}

function initSky() {
  const els = $$("[data-depth]");
  if (!els.length || reduced) return;

  let raf = 0;
  const apply = () => {
    raf = 0;
    const y = window.scrollY;
    const limit = window.innerHeight * 0.7;
    els.forEach((el) => {
      const d = parseFloat(el.dataset.depth) || 0;
      const off = Math.sign(d) * Math.min(Math.abs(y * d), limit);
      el.style.transform = `translate3d(0, ${(-off).toFixed(1)}px, 0)`;
    });
  };
  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(apply);
  };

  apply();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
}

/* ---------- the film: a run scrubbed by scroll ---------- */

function initFilm() {
  const sec = $("[data-film]");
  if (!sec) return;
  const stage = $("[data-film-stage]", sec);
  const rail = $$(".film-rail li", sec);
  if (!stage) return;

  const smooth = (t, a, b) => {
    const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
    return x * x * (3 - 2 * x);
  };

  const apply = (p) => {
    stage.style.setProperty("--t", p.toFixed(4));
    stage.style.setProperty("--open", smooth(p, 0.015, 0.10).toFixed(3));
    stage.style.setProperty("--done", smooth(p, 0.7, 0.8).toFixed(3));
    rail.forEach((li) => li.classList.toggle("on", p >= parseFloat(li.dataset.at)));
  };

  if (reduced) {
    apply(1);
    return;
  }

  let raf = 0;
  const update = () => {
    raf = 0;
    const rect = sec.getBoundingClientRect();
    const span = sec.offsetHeight - window.innerHeight;
    const p = span > 0 ? Math.min(1, Math.max(0, -rect.top / span)) : 1;
    apply(p);
  };
  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };

  update();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  sec._seek = (p) => apply(Math.min(1, Math.max(0, p)));
}

/* ---------- per-section parallax (binary clouds drift with the page) ---------- */

function initParallax() {
  const els = $$("[data-parallax]");
  if (!els.length || reduced) return;

  let raf = 0;
  const apply = () => {
    raf = 0;
    const vh = window.innerHeight;
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      const spd = parseFloat(el.dataset.parallax) || 0;
      const rel = r.top + r.height / 2 - vh / 2;
      el.style.transform = `translate3d(0, ${(rel * spd).toFixed(1)}px, 0)`;
    });
  };
  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(apply);
  };

  apply();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
}

/* ---------- the agent keeps working ---------- */

function initAgentLoop() {
  const agent = $(".agent");
  if (!agent || reduced) return;
  const rows = $$(".ask, .thought, .tool, .ans, .edit", agent);
  if (!rows.length) return;

  let i = 0;
  const step = () => {
    rows.forEach((r, j) => r.classList.toggle("is-live", j === i));
    i = (i + 1) % rows.length;
  };
  step();
  setInterval(step, 2400);
}

/* ---------- boot ---------- */

function boot() {
  initNav();
  initGlass();
  initSpot();
  initBits();
  initSky();
  initFilm();
  initParallax();
  initAgentLoop();
  $$("[data-trace]").forEach((host) => {
    if (reduced || !("IntersectionObserver" in window)) {
      buildTrace(host);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          buildTrace(host);
          io.disconnect();
        });
      },
      { threshold: 0.3 }
    );
    io.observe(host);
  });
  initCounters();
  initCopy();
  initDiff();
  initStepper();
  initMatrix();
  initBars();
  initResidual();
  initDocNav();
  initDownload();
  initReveal();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
