/* Everything date/link related is derived from an event's content, so
   changing a date or venue in the portal updates every page and countdown. */
const TZ = "Asia/Kolkata";
const OFFSET = "+05:30";

const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};
const pad = (n) => String(n).padStart(2, "0");

export function eventInfo(ev) {
  const venue = ev.venue || {};
  const [y, m, d] = (ev.date || "2027-02-15").split("-").map(Number);
  const hasTime = /^\d{1,2}:\d{2}$/.test(ev.time || "");
  const start = new Date(`${y}-${pad(m)}-${pad(d)}T${hasTime ? ev.time.padStart(5, "0") : "00:00"}:00${OFFSET}`);
  const valid = !Number.isNaN(start.getTime());
  const at = valid ? start : new Date();

  const fmt = (o) => at.toLocaleDateString("en-IN", { timeZone: TZ, ...o });
  const weekday = fmt({ weekday: "long" });
  const month = fmt({ month: "long" });
  const monthShort = fmt({ month: "short" }).replace(".", "").toUpperCase().slice(0, 3);

  const timeText = ev.timeLabel ||
    (hasTime ? at.toLocaleTimeString("en-IN", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase() : "");

  const venueText = [venue.name, venue.address].filter(Boolean).join(", ");
  const mapQuery = venue.mapQuery || venueText;
  const directions = venue.mapsLink ||
    (mapQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}` : "");

  return {
    start: at, hasTime, valid,
    day: d, dayPadded: pad(d), dayOrdinal: ordinal(d).toUpperCase(),
    month, monthShort, monthNum: pad(m), year: String(y), weekday,
    longDate: `${weekday}, ${d}${ordinal(d)} ${month} ${y}`,
    shortDate: `${pad(d)} · ${pad(m)} · ${y}`,
    timeText,
    venueText, mapQuery, directions,
    mapEmbed: mapQuery ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed` : "",
  };
}

// "15 · 02 · 2027", or "15 & 16 · 02 · 2027" for two days in the same month
export function signDate(infos) {
  if (infos.length === 1) return infos[0].shortDate;
  const sameMonth = infos.every((i) => i.monthNum === infos[0].monthNum && i.year === infos[0].year);
  return sameMonth
    ? `${infos.map((i) => i.dayPadded).join(" & ")} · ${infos[0].monthNum} · ${infos[0].year}`
    : infos.map((i) => i.shortDate).join("  |  ");
}

export function whatsappLink(invite) {
  const num = (invite.rsvp.whatsapp || "").replace(/\D/g, "");
  return num ? `https://wa.me/${num}?text=${encodeURIComponent(invite.rsvp.message || "")}` : "";
}
