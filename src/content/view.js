/* What a guest gets for a link: only the events that link may show,
   in order, with {event}/{date}/{venue} filled in. Used by the server
   (to decide what to send) and by the portal preview. */
import { eventInfo } from "./format.js";

export const VIEWS = {
  both: ["wedding", "reception"],
  wedding: ["wedding"],
  reception: ["reception"],
};

export function publicView(invite, view = "both") {
  const keys = VIEWS[view] || VIEWS.both;
  const events = keys
    .filter((k) => invite.events[k] && invite.events[k].show)
    .map((k) => ({ key: k, ...invite.events[k] }));

  const lead = events[0];
  const info = lead ? eventInfo(lead) : null;
  const names = events.map((e) => e.name).join(" & ");
  const fill = (s) => String(s || "")
    .replaceAll("{event}", names)
    .replaceAll("{date}", info ? info.longDate : "")
    .replaceAll("{venue}", lead ? [lead.venue.name, lead.venue.address.split(",")[0]].filter(Boolean).join(", ") : "");

  const { events: _all, ...rest } = invite;
  return {
    ...rest,
    view,
    events,
    rsvp: { ...invite.rsvp, message: String(invite.rsvp.message || "").replaceAll("{event}", names.toLowerCase()) },
    share: { title: fill(invite.share.title), description: fill(invite.share.description) },
  };
}
