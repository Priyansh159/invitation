/* Imperative side of the invitation: opening, videos, music and the
   scroll-linked cross-fade between pages. React renders the markup;
   this wires up the motion once it is in the DOM. */
import { createPetals } from "./petals.js";

export function startEngine(root, { isStatic, music }) {
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => Array.from(root.querySelectorAll(s));
  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cleanups = [];
  const on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };
  const later = (fn, ms) => { const t = setTimeout(fn, ms); cleanups.push(() => clearTimeout(t)); };

  /* ---------- Videos ----------
     intro: the Canva reveal plus the one flight of birds (plays once)
     loop : the same scene without birds, 3 s, seamless
     The swing & couple fade out on later pages by fading in .cover,
     a still of the bare arch over just that area, so nothing else moves. */
  const vIntro = $(".v-intro");
  const vLoop = $(".v-loop");
  const cover = $(".cover");
  let loopStarted = false;

  const safePlay = (v) => { const p = v.play(); if (p && p.catch) p.catch(() => {}); return p; };

  function useStills() {
    body.classList.add("loop-on", "no-video");
    update();
  }

  function startLoop() {
    if (loopStarted) return;
    loopStarted = true;
    vLoop.currentTime = 0;
    let swapped = false;
    const swap = () => {
      if (swapped) return;
      swapped = true;
      body.classList.add("loop-on");
    };
    on(vLoop, "playing", swap, { once: true });
    later(swap, 400);
    const p = vLoop.play();
    if (p && p.catch) p.catch(useStills);
  }
  on(vIntro, "timeupdate", () => {
    if (vIntro.duration && vIntro.currentTime >= vIntro.duration - 0.12) startLoop();
  });
  on(vIntro, "ended", startLoop);

  function playIntro() {
    if (reduceMotion) { useStills(); return; }
    vIntro.currentTime = 0;
    const p = vIntro.play();
    if (p && p.catch) p.catch(useStills);
  }

  /* ---------- Music ----------
     Browsers only allow sound after the guest touches the page, so we try
     straight away and otherwise start on the first tap/click/key press. */
  const audio = $("#bgm");
  const musicBtn = $("#musicBtn");
  const hasMusic = Boolean(audio && music.enabled && audio.getAttribute("src"));
  let fade = 0;
  let userPaused = false;

  function setMusicUi(playing) {
    musicBtn.classList.toggle("paused", !playing);
    musicBtn.classList.toggle("ask", !playing && !userPaused);
    musicBtn.setAttribute("aria-label", playing ? "Pause music" : "Play music");
  }
  function startMusic() {
    if (!hasMusic || userPaused || !audio.paused) return;
    const target = Math.min(1, Math.max(0, music.volume ?? 0.7));
    audio.volume = 0;
    const p = audio.play();
    if (!p || !p.then) return;
    p.then(() => {
      setMusicUi(true);
      removeGestureListeners();
      cancelAnimationFrame(fade);
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / 2500);
        audio.volume = target * k;
        if (k < 1) fade = requestAnimationFrame(step);
      };
      fade = requestAnimationFrame(step);
    }).catch(() => setMusicUi(false));
  }

  const gestureEvents = ["pointerup", "touchend", "click", "keydown"];
  const onGesture = (e) => { if (!musicBtn.contains(e.target)) startMusic(); };
  function removeGestureListeners() {
    gestureEvents.forEach((t) => document.removeEventListener(t, onGesture, true));
  }

  if (hasMusic) {
    gestureEvents.forEach((t) => document.addEventListener(t, onGesture, true));
    cleanups.push(removeGestureListeners);
    on(musicBtn, "click", () => {
      if (audio.paused) {
        userPaused = false;
        audio.volume = Math.min(1, Math.max(0, music.volume ?? 0.7));
        safePlay(audio)?.then?.(() => { setMusicUi(true); removeGestureListeners(); });
      } else {
        userPaused = true;
        audio.pause();
        setMusicUi(false);
      }
    });
    on(document, "visibilitychange", () => {
      if (userPaused || musicBtn.classList.contains("ask")) return;
      if (document.hidden) audio.pause(); else safePlay(audio);
    });
    cleanups.push(() => { cancelAnimationFrame(fade); audio.pause(); });
  }

  /* ---------- Petals ---------- */
  const petals = createPetals($("#petals"), reduceMotion);
  cleanups.push(petals.stop);

  /* ---------- Opening: Shri Ganesh first, then page one ---------- */
  const ganesha = $(".ganesha");
  const vGanesha = $(".v-ganesha");
  let revealed = false;

  function reveal() {
    if (revealed) return;
    revealed = true;
    playIntro();
    body.classList.add("ganesha-out");
    later(() => {
      petals.start();
      body.classList.add("is-open");
      body.classList.remove("locked");
      if (hasMusic) musicBtn.hidden = false;
      update();
    }, 350);
    later(() => ganesha.classList.add("gone"), 2000);
  }

  function playGanesha() {
    const showStill = () => { vGanesha.poster = "/assets/ganesha-still.jpg"; later(reveal, 3500); };
    if (reduceMotion) { showStill(); return; }
    on(vGanesha, "timeupdate", () => {
      if (vGanesha.duration && vGanesha.currentTime >= vGanesha.duration - 0.6) reveal();
    });
    on(vGanesha, "ended", reveal);
    const p = vGanesha.play();
    if (p && p.catch) p.catch(showStill);
    later(reveal, 12000);   // never keep guests waiting on a slow connection
  }

  /* ---------- Pages: scroll-linked cross-fade inside the fixed frame ---------- */
  const scenes = $$(".scene");
  const pages = $$(".page");
  const last = scenes.length - 1;
  let current = -1;
  let ticking = false;

  const pageHeight = () => (pages[1] ? pages[1].offsetTop - pages[0].offsetTop : innerHeight) || innerHeight;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function update() {
    ticking = false;
    const p = clamp(scrollY / pageHeight(), 0, last);

    scenes.forEach((scene, i) => {
      const dist = p - i;
      const o = clamp(1 - Math.abs(dist) * 1.8, 0, 1);
      scene.style.opacity = o;
      scene.style.visibility = o > 0.001 ? "visible" : "hidden";
      scene.style.transform = o < 1 ? `translateY(${(-dist * 5).toFixed(2)}cqw) scale(${(1 - Math.abs(dist) * 0.03).toFixed(4)})` : "";
    });

    // the swing & couple belong to page 1 only
    cover.style.opacity = 1 - clamp(1 - p * 1.7, 0, 1);

    const idx = Math.round(p);
    if (idx !== current) {
      current = idx;
      scenes.forEach((s, i) => {
        s.classList.toggle("active", i === idx);
        s.inert = i !== idx;
      });
    }
  }

  on(window, "scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  on(window, "resize", update);

  const goTo = (i) => window.scrollTo({ top: clamp(i, 0, last) * pageHeight(), behavior: reduceMotion ? "auto" : "smooth" });
  $$("[data-go]").forEach((b) => on(b, "click", () => goTo(+b.dataset.go)));

  on(window, "keydown", (e) => {
    if (!revealed) return;
    if (e.target.closest && e.target.closest("a, button, input, textarea")) return;
    if (["ArrowDown", "PageDown", " "].includes(e.key)) { e.preventDefault(); goTo(current + 1); }
    if (["ArrowUp", "PageUp"].includes(e.key)) { e.preventDefault(); goTo(current - 1); }
  });

  /* ---------- Start ---------- */
  const htmlClasses = ["invite-page"];
  if (isStatic) {
    htmlClasses.push("static");
    body.classList.remove("locked");
    body.classList.add("is-open", "loop-on", "no-video");
    ganesha.classList.add("gone");
    revealed = true;
    // ?static=1&page=venue (or #venue) previews a single page
    const want = new URLSearchParams(location.search).get("page") || location.hash.slice(1);
    const target = want && root.querySelector(`[data-page="${CSS.escape(want)}"]`);
    requestAnimationFrame(() => {
      if (target) window.scrollTo(0, target.offsetTop);
      update();
    });
  } else {
    body.classList.add("locked");
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    window.scrollTo(0, 0);
    playGanesha();
    startMusic();
  }
  document.documentElement.classList.add(...htmlClasses);
  update();

  return () => {
    cleanups.forEach((fn) => fn());
    document.documentElement.classList.remove(...htmlClasses);
    body.classList.remove("locked", "ganesha-out", "is-open", "loop-on", "no-video");
  };
}
