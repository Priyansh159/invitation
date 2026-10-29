/* Downloads what the opening needs before it starts, so it always plays
   smoothly: the Ganesha and page-one videos, page one's pictures and the fonts.
   (The loop, stills and posters are needed later and load while Ganesha plays.) Returns local
   (blob:) addresses for what finished, and the normal path for anything that
   didn't make it in time, so the invitation still opens on a very bad signal. */
const FILES = {
  ganesha: "/assets/ganesha.mp4",
  intro: "/assets/intro.mp4",
  scene: "/assets/scene.jpg",
  cover: "/assets/couple-cover.webp",
};
// rough sizes, so the progress line moves evenly before the real sizes are known
const GUESS = { ganesha: 650e3, intro: 1600e3, scene: 165e3, cover: 28e3 };

const FONTS = ['400 1em "Monsieur La Doulaise"', '500 1em "Playfair Display"', 'italic 400 1em "Playfair Display"', '500 1em "Cinzel"'];

export async function preloadMedia(onProgress = () => {}, { timeout = 25000, minTime = 900 } = {}) {
  const started = Date.now();
  const ctrl = new AbortController();
  const total = {}, loaded = {};
  for (const k in FILES) { total[k] = GUESS[k]; loaded[k] = 0; }
  const report = () => {
    const t = Object.values(total).reduce((a, b) => a + b, 0);
    const l = Object.values(loaded).reduce((a, b) => a + b, 0);
    onProgress(t ? l / t : 0);
  };

  async function get(key) {
    const res = await fetch(FILES[key], { signal: ctrl.signal });
    if (!res.ok) throw new Error(res.status);
    const size = Number(res.headers.get("content-length")) || 0;
    if (size) total[key] = size;
    if (!res.body || !res.body.getReader) {
      const blob = await res.blob();
      loaded[key] = total[key] = blob.size; report();
      return URL.createObjectURL(blob);
    }
    const reader = res.body.getReader();
    const chunks = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded[key] += value.length;
      report();
    }
    total[key] = loaded[key]; report();
    const type = res.headers.get("content-type") || "";
    return URL.createObjectURL(new Blob(chunks, { type }));
  }

  const urls = { ...FILES };
  const files = Object.keys(FILES).map((k) => get(k).then((u) => { urls[k] = u; }).catch(() => {}));
  const fonts = document.fonts ? Promise.all(FONTS.map((f) => document.fonts.load(f).catch(() => {}))) : Promise.resolve();

  let timer;
  const late = new Promise((r) => { timer = setTimeout(r, timeout); });
  await Promise.race([Promise.all([...files, fonts]), late]);
  clearTimeout(timer);
  ctrl.abort();          // stop anything still downloading; the page loads it normally
  onProgress(1);

  const wait = minTime - (Date.now() - started);   // no flash on a quick repeat visit
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  return urls;
}
