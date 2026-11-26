/* Lantas — pointer motion.
   Three small ideas, all of them restrained: screens tilt toward the cursor,
   the main call to action leans after it, and everything springs back when
   the pointer leaves. Nothing runs when motion is reduced. */
(() => {
  const still =
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.classList.contains("reduce-motion");
  if (still) return;

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  /* ---------- 1. screens tilt toward the pointer ---------- */
  const tilts = [...document.querySelectorAll(".player")];
  const MAX = 4.5; // degrees, well inside the 10-15 rule

  for (const el of tilts) {
    let frame = 0;
    const reset = () => {
      el.style.transform = "";
      el.style.setProperty("--tilt", "0");
    };

    el.addEventListener("pointermove", (event) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = el.getBoundingClientRect();
        const px = (event.clientX - r.left) / r.width - 0.5;
        const py = (event.clientY - r.top) / r.height - 0.5;
        const ry = clamp(px * MAX * 2, -MAX, MAX);
        const rx = clamp(-py * MAX * 2, -MAX, MAX);
        el.style.transform = `perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
        el.style.setProperty("--tilt", "1");
      });
    });
    el.addEventListener("pointerleave", reset);
    el.addEventListener("blur", reset, true);
  }

  /* ---------- 2. the primary action leans toward the pointer ---------- */
  for (const btn of document.querySelectorAll(".btn")) {
    let frame = 0;
    btn.addEventListener("pointermove", (event) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = btn.getBoundingClientRect();
        const dx = (event.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (event.clientY - (r.top + r.height / 2)) / r.height;
        btn.style.transform = `translate3d(${(dx * 3).toFixed(2)}px, ${(dy * 2).toFixed(2)}px, 0)`;
      });
    });
    btn.addEventListener("pointerleave", () => {
      btn.style.transform = "";
    });
  }

  /* ---------- 3. the sky moves a little slower than the page ---------- */
  const skies = [...document.querySelectorAll(".hero-sky")];
  if (skies.length) {
    let queued = false;
    const drift = () => {
      queued = false;
      const y = scrollY;
      for (const sky of skies) {
        sky.style.setProperty("translate", `0 ${Math.min(y * 0.06, 40).toFixed(1)}px`);
      }
    };
    addEventListener("scroll", () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(drift);
    }, { passive: true });
    drift();
  }
})();
