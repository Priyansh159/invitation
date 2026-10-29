/* The Ganesha loader that's built into app.html (#boot). */
const el = () => document.getElementById("boot");

export const boot = {
  show() { el()?.classList.remove("hide"); },
  progress(p) { el()?.style.setProperty("--p", String(Math.max(0, Math.min(1, p)))); },
  hide() { el()?.classList.add("hide"); },
};
