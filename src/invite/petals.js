/* Falling rose petals on a full-screen canvas. */
const COLORS = [
  ["#f7a8bf", "#e5688f"],
  ["#fbc9d6", "#ee8fab"],
  ["#ffd8c2", "#f3a27f"],
  ["#fff3f5", "#f3bccb"],
];
const rand = (a, b) => a + Math.random() * (b - a);

export function createPetals(canvas, reduceMotion) {
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, list = [], running = false, raf = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function make(fromTop) {
    return {
      x: rand(0, W), y: fromTop ? rand(-80, -20) : rand(-H, H),
      s: rand(5, 10), vy: rand(0.4, 1), vx: rand(-0.25, 0.3),
      r: rand(0, Math.PI * 2), vr: rand(-0.02, 0.02),
      sw: rand(0, Math.PI * 2), sws: rand(0.008, 0.02),
      f: rand(0, Math.PI * 2), fs: rand(0.02, 0.05),
      c: COLORS[(Math.random() * COLORS.length) | 0], temp: false,
    };
  }
  function draw(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.r);
    ctx.scale(1, 0.35 + Math.abs(Math.cos(p.f)) * 0.65);
    const g = ctx.createLinearGradient(0, -p.s, 0, p.s);
    g.addColorStop(0, p.c[0]); g.addColorStop(1, p.c[1]);
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(0, -p.s);
    ctx.bezierCurveTo(p.s * 0.95, -p.s * 0.55, p.s * 0.65, p.s * 0.75, 0, p.s);
    ctx.bezierCurveTo(-p.s * 0.65, p.s * 0.75, -p.s * 0.95, -p.s * 0.55, 0, -p.s);
    ctx.fill();
    ctx.restore();
  }
  function frame() {
    ctx.clearRect(0, 0, W, H);
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.sw += p.sws; p.f += p.fs; p.r += p.vr;
      p.x += p.vx + Math.sin(p.sw) * 0.6;
      p.y += p.vy;
      if (p.temp) { p.vx *= 0.985; p.vy = Math.min(p.vy + 0.03, 1.4); }
      if (p.y > H + 30 || p.x < -40 || p.x > W + 40) {
        if (p.temp) { list.splice(i, 1); continue; }
        Object.assign(p, make(true));
      }
      draw(p);
    }
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (running || reduceMotion) return;
    running = true;
    resize();
    const count = Math.round(Math.min(26, Math.max(12, W / 50)));
    for (let i = 0; i < count; i++) list.push(make(false));
    addEventListener("resize", resize);
    raf = requestAnimationFrame(frame);
  }
  function burst() {
    if (reduceMotion) return;
    start();
    const cx = W / 2, cy = H * 0.5;
    for (let i = 0; i < 40; i++) {
      const a = rand(0, Math.PI * 2), v = rand(2, 6.5);
      list.push(Object.assign(make(false), { x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, temp: true }));
    }
  }
  function stop() {
    cancelAnimationFrame(raf);
    removeEventListener("resize", resize);
    running = false; list = [];
  }
  return { start, burst, stop };
}
