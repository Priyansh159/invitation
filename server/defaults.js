/* Default invitation content (server only, so nothing private ships in the
   page's JavaScript). The live content is edited from the portal at /admin
   and saved to data/invite.json; anything missing there falls back to this. */
const venueSearch = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

export const EVENT_KEYS = ["wedding", "reception"];

export const DEFAULT_INVITE = {
  couple: {
    groom: "Priyansh",
    bride: "Ayushi",
  },

  hero: {
    together: "Together with our families",
  },

  events: {
    wedding: {
      show: true,
      name: "Wedding",
      date: "2027-02-15",          // YYYY-MM-DD
      time: "",                    // 24h "HH:MM"; empty shows "Time to be announced"
      timeLabel: "",               // optional wording, e.g. "7:00 PM onwards"
      dressCode: "",
      venue: {
        name: "Kiran Farm",
        address: "Muzaffarnagar, Uttar Pradesh",
        mapsLink: venueSearch("Muzaffarnagar, Uttar Pradesh"),
        mapQuery: "Muzaffarnagar, Uttar Pradesh",   // what the embedded map shows
      },
      heroLine: "We cordially invite\nyou to join our Wedding on",
      label: "The occasion",
      title: "The Wedding",
      venueLabel: "Where",
      venueTitle: "The Venue",
      closingText: "As we take our pheras and begin\nour journey of forever,\nwe would love to have you by our side.",
    },
    reception: {
      show: true,
      name: "Reception",
      date: "2027-02-16",
      time: "",
      timeLabel: "",
      dressCode: "",
      venue: {
        name: "Narayan Grand",
        address: "Muzaffarnagar, Uttar Pradesh",
        mapsLink: venueSearch("Narayan Grand, Muzaffarnagar"),
        mapQuery: "Narayan Grand, Muzaffarnagar",
      },
      heroLine: "We cordially invite\nyou to our Wedding Reception on",
      label: "The celebration continues",
      title: "The Reception",
      venueLabel: "Where",
      venueTitle: "The Venue",
      closingText: "As we begin our journey of forever,\nwe would love to celebrate\nwith you by our side.",
    },
  },

  saveTheDate: {
    label: "Mark your calendar",
    title: "Save the Date",
  },

  venueTba: "Venue details will be\nshared with you soon.",

  closing: {
    label: "Your presence is our blessing",
    title: "Do join us",
  },

  rsvp: {
    whatsapp: "",                // digits with country code, e.g. 919876543210
    message: "Hello! I'd love to attend the {event} of Priyansh & Ayushi.",
  },

  music: {
    enabled: true,
    src: "/assets/invi-music.mp3",
    volume: 0.7,
  },

  // {event}, {date} and {venue} are filled in for each share link
  share: {
    title: "Priyansh & Ayushi · {event}",
    description: "{date} · {venue}. We cordially invite you to join us.",
  },
};

/* Who can see what. Saved separately in data/access.json and never sent to guests. */
export const DEFAULT_ACCESS = {
  locked: false,         // ask guests for a password before showing anything
  password: "",
  plainLink: "both",     // what the main link (without a code) shows: both | wedding | reception
  links: { both: "", wedding: "", reception: "" },   // private share codes, generated on first run
};

/* Overlay saved content on the defaults, keeping only known keys and types. */
export function mergeInvite(saved, base = DEFAULT_INVITE) {
  const out = {};
  for (const [key, def] of Object.entries(base)) {
    const val = saved && typeof saved === "object" ? saved[key] : undefined;
    if (def && typeof def === "object" && !Array.isArray(def)) out[key] = mergeInvite(val, def);
    else if (val === undefined || val === null || typeof val !== typeof def) out[key] = def;
    else out[key] = typeof val === "string" ? val.slice(0, 2000) : val;
  }
  return out;
}

/* Content saved before the reception was added had a single event. */
export function migrateInvite(saved) {
  if (!saved || typeof saved !== "object" || saved.events || !saved.event) return saved;
  const { event, venue, hero = {}, details = {}, venuePage = {}, closing = {} } = saved;
  return {
    ...saved,
    hero: { together: hero.together },
    events: {
      wedding: {
        ...event,
        venue,
        heroLine: hero.invite,
        label: details.label,
        title: details.title,
        venueLabel: venuePage.label,
        venueTitle: venuePage.title,
        closingText: closing.text,
      },
    },
    venueTba: venuePage.tba,
    closing: { label: closing.label, title: closing.title },
    rsvp: saved.rsvp && /attend the wedding of/.test(saved.rsvp.message || "")
      ? { ...saved.rsvp, message: undefined }   // the old default: now uses {event}
      : saved.rsvp,
    share: undefined,   // now built per link from {event}/{date}/{venue}
  };
}
