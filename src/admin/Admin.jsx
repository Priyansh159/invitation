import { useEffect, useMemo, useState } from "react";
import { ADMIN_KEY, adminData, adminLogin, adminStatus, saveAccess, saveInvite, session } from "../api.js";
import { eventInfo } from "../content/format.js";
import { VIEWS } from "../content/view.js";
import "../styles/admin.css";

const EVENT_LABELS = { wedding: "Wedding", reception: "Reception" };
const VIEW_LABELS = { both: "Wedding & Reception", wedding: "Wedding only", reception: "Reception only" };

/* One event's editable fields: [path, label, options] */
const eventFields = (k) => [
  [`events.${k}.show`, `Show the ${EVENT_LABELS[k].toLowerCase()} on the invitation`, { type: "checkbox" }],
  [`events.${k}.name`, "Event name", { hint: "Used in share-link titles and the RSVP message." }],
  [`events.${k}.date`, "Date", { type: "date" }],
  [`events.${k}.time`, "Start time", { type: "time", hint: "Leave empty to show “Time to be announced”." }],
  [`events.${k}.timeLabel`, "Time wording (optional)", { hint: "e.g. “7:00 PM onwards”. Replaces the time shown." }],
  [`events.${k}.dressCode`, "Dress code", { hint: "Hidden when empty." }],
  [`events.${k}.venue.name`, "Venue name"],
  [`events.${k}.venue.address`, "Address"],
  [`events.${k}.venue.mapsLink`, "Google Maps link", { type: "url", hint: "In Google Maps tap Share → Copy link, and paste it here for exact directions." }],
  [`events.${k}.venue.mapQuery`, "Map search text", { hint: "What the small map on the venue page shows." }],
  [`events.${k}.heroLine`, "Line on page 1", { type: "textarea", hint: "Shown above the date when this event comes first on a link." }],
  [`events.${k}.label`, "Details page · small heading"],
  [`events.${k}.title`, "Details page · title"],
  [`events.${k}.venueLabel`, "Venue page · small heading"],
  [`events.${k}.venueTitle`, "Venue page · title"],
  [`events.${k}.closingText`, "Closing message", { type: "textarea", hint: "Used on the last page when this event comes first on a link." }],
];

const SECTIONS = [
  { title: "Couple", fields: [
    ["couple.groom", "Groom's name"],
    ["couple.bride", "Bride's name"],
  ]},
  { title: "Wedding", event: "wedding", fields: eventFields("wedding") },
  { title: "Reception", event: "reception", fields: eventFields("reception") },
  { title: "Page 1 · Names", preview: "top", fields: [
    ["hero.together", "Line above the names"],
  ]},
  { title: "Page 2 · Save the date", preview: "save-the-date", fields: [
    ["saveTheDate.label", "Small heading"],
    ["saveTheDate.title", "Title"],
  ]},
  { title: "Last page · Closing", preview: "rsvp", fields: [
    ["closing.label", "Small heading"],
    ["closing.title", "Title"],
    ["venueTba", "Venue page text when no venue is set", { type: "textarea" }],
  ]},
  { title: "RSVP", preview: "rsvp", fields: [
    ["rsvp.whatsapp", "WhatsApp number", { type: "tel", hint: "Country code + number, digits only (e.g. 919876543210). The RSVP button is hidden when empty." }],
    ["rsvp.message", "Pre-filled message", { type: "textarea", hint: "{event} becomes the events on that guest's link, e.g. “wedding & reception”." }],
  ]},
  { title: "Music", fields: [
    ["music.enabled", "Play background music", { type: "checkbox" }],
    ["music.src", "Music file", { hint: "A file in public/assets (e.g. /assets/invi-music.mp3) or a full https:// link." }],
    ["music.volume", "Volume", { type: "range", min: 0, max: 1, step: 0.05 }],
  ]},
  { title: "Link preview (WhatsApp)", fields: [
    ["share.title", "Title", { hint: "{event} becomes the events on that link, e.g. “Wedding & Reception”." }],
    ["share.description", "Description", { type: "textarea", hint: "{date} and {venue} are the first event's date and venue." }],
  ]},
];

const get = (obj, path) => path.split(".").reduce((o, k) => o?.[k], obj);
function set(obj, path, value) {
  const [k, ...rest] = path.split(".");
  return { ...obj, [k]: rest.length ? set(obj[k], rest.join("."), value) : value };
}

function Switch({ id, checked, onChange, children }) {
  return (
    <label className="switch" htmlFor={id}>
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" aria-hidden="true"><span className="thumb" /></span>
      <span>{children}</span>
    </label>
  );
}

function Field({ path, label, opts = {}, value, onChange }) {
  const id = "f-" + path.replaceAll(".", "-");
  const type = opts.type || "text";
  let input;
  if (type === "checkbox") {
    return <div className="field wide"><Switch id={id} checked={Boolean(value)} onChange={onChange}>{label}</Switch></div>;
  } else if (type === "textarea") {
    input = <textarea id={id} rows={3} value={value} onChange={(e) => onChange(e.target.value)} />;
  } else if (type === "number" || type === "range") {
    input = (
      <div className={type === "range" ? "range" : undefined}>
        <input id={id} type={type} min={opts.min} max={opts.max} step={opts.step} value={value}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} />
        {type === "range" && <output>{Math.round(value * 100)}%</output>}
      </div>
    );
  } else {
    input = <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)}
      inputMode={type === "tel" ? "numeric" : undefined} />;
  }
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {input}
      {opts.hint && <small>{opts.hint}</small>}
    </div>
  );
}

function CopyLink({ url, disabled }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(url); }
    catch {
      const t = document.createElement("textarea");
      t.value = url; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }
  return (
    <div className={`link-row${disabled ? " off" : ""}`}>
      <code>{url}</code>
      <button className="btn small" type="button" onClick={copy} disabled={disabled}>{copied ? "Copied ✓" : "Copy"}</button>
      <a className="btn small" href={url} target="_blank" rel="noopener" aria-disabled={disabled}>Open</a>
    </div>
  );
}

function PrivacyCard({ access, setAccess, savedAccess, invite }) {
  const origin = location.origin;
  const shown = (view) => VIEWS[view].some((k) => invite.events[k].show);
  const changedLinks = access.newLinks;
  return (
    <section className="card privacy">
      <h2>Privacy &amp; sharing</h2>

      <div className="lock-row">
        <Switch id="f-locked" checked={access.locked} onChange={(v) => setAccess({ ...access, locked: v })}>
          Password lock {access.locked ? "on" : "off"}
        </Switch>
        <p className="muted">
          {access.locked
            ? "Guests must enter the password once before anything is shown. Their phone remembers it after that."
            : "Anyone with a link can open the invitation."}
        </p>
      </div>
      <div className="grid">
        <div className="field">
          <label htmlFor="f-view-pass">Guest password</label>
          <input id="f-view-pass" type="text" autoComplete="off" spellCheck={false} value={access.password}
            onChange={(e) => setAccess({ ...access, password: e.target.value })} placeholder="At least 4 characters" />
          <small>Share it with the people who should see the invitation. Changing it asks everyone again.</small>
        </div>
        <div className="field">
          <label htmlFor="f-plain">The main link shows</label>
          <select id="f-plain" value={access.plainLink} onChange={(e) => setAccess({ ...access, plainLink: e.target.value })}>
            {Object.keys(VIEWS).map((v) => <option key={v} value={v}>{VIEW_LABELS[v]}</option>)}
          </select>
          <small>For anyone opening the site address without a code.</small>
        </div>
      </div>

      <h3>Share links</h3>
      <p className="muted">Each link only ever shows its own events. Guests can't change it to see the others.</p>
      <div className="links">
        <div className="link-label">Main link <span>{VIEW_LABELS[savedAccess.plainLink]}</span></div>
        <CopyLink url={`${origin}/`} />
        {Object.keys(VIEWS).map((v) => (
          <div key={v}>
            <div className="link-label">{VIEW_LABELS[v]}{!shown(v) && <span className="warn">hidden: turn the event on to use this link</span>}</div>
            <CopyLink url={`${origin}/i/${savedAccess.links[v]}`} disabled={!shown(v) || changedLinks} />
          </div>
        ))}
      </div>
      <div className="links-foot">
        <button className="btn small" type="button" onClick={() => setAccess({ ...access, newLinks: !changedLinks })}>
          {changedLinks ? "Keep the current links" : "Make new links"}
        </button>
        <small className="muted">
          {changedLinks
            ? "New links will be made when you save. The old ones will stop working."
            : "Links use the address you opened this portal on. Open the portal on your live site to copy the live links."}
        </small>
      </div>
    </section>
  );
}

export default function Admin() {
  const [status, setStatus] = useState(null);
  const [password, setPassword] = useState(() => session.get(ADMIN_KEY));
  const [authed, setAuthed] = useState(false);
  const [saved, setSaved] = useState(null);
  const [draft, setDraft] = useState(null);
  const [savedAccess, setSavedAccess] = useState(null);
  const [access, setAccess] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [previewView, setPreviewView] = useState("both");
  const [previewPage, setPreviewPage] = useState("top");
  const [previewKey, setPreviewKey] = useState(0);

  const inviteDirty = useMemo(() => JSON.stringify(saved) !== JSON.stringify(draft), [saved, draft]);
  const accessDirty = useMemo(() => JSON.stringify(savedAccess) !== JSON.stringify(access), [savedAccess, access]);
  const dirty = inviteDirty || accessDirty;

  useEffect(() => {
    document.documentElement.classList.add("admin-page");
    adminStatus().then(setStatus).catch(() => setStatus({ error: true }));
  }, []);

  useEffect(() => {
    if (!status || status.error) return;
    if (status.localEditing) { setAuthed(true); return; }
    if (status.passwordRequired && password) login(password, true);
  }, [status]);

  useEffect(() => {
    if (!authed) return;
    adminData().then(({ invite, access }) => {
      setSaved(invite); setDraft(invite);
      setSavedAccess(access); setAccess(access);
    }).catch((err) => setMsg({ type: "error", text: err.message }));
  }, [authed]);

  useEffect(() => {
    const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function login(pw, silent) {
    try {
      await adminLogin(pw);
      session.set(ADMIN_KEY, pw);
      setAuthed(true);
      setMsg(null);
    } catch (err) {
      if (!silent) setMsg({ type: "error", text: err.message });
    }
  }

  async function save() {
    if (access.locked && access.password.trim().length < 4) {
      setMsg({ type: "error", text: "Choose a guest password of at least 4 characters before turning the lock on." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      if (inviteDirty) { const next = await saveInvite(draft); setSaved(next); setDraft(next); }
      if (accessDirty) { const next = await saveAccess(access); setSavedAccess(next); setAccess(next); }
      setPreviewKey((k) => k + 1);
      setMsg({ type: "ok", text: "Saved. The invitation is updated for everyone." });
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  }

  if (!status) return <div className="admin"><p className="loading">Loading…</p></div>;

  if (status.error) {
    return (
      <div className="admin"><div className="gatebox">
        <h1>Invitation portal</h1>
        <p>The server isn't reachable. Start it with <code>npm run dev</code> (or <code>npm start</code>) and reload.</p>
      </div></div>
    );
  }

  if (!authed) {
    if (!status.passwordRequired) {
      return (
        <div className="admin"><div className="gatebox">
          <h1>Invitation portal</h1>
          <p>No admin password is set, so editing is only allowed on the computer running the server (open <code>http://localhost:3000/admin</code> there).</p>
          <p>To edit from anywhere, set <code>ADMIN_PASSWORD</code> on the server and restart it.</p>
        </div></div>
      );
    }
    return (
      <div className="admin"><form className="gatebox" onSubmit={(e) => { e.preventDefault(); login(password); }}>
        <h1>Invitation portal</h1>
        <p>Enter the admin password to edit the invitation.</p>
        <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" aria-label="Password" />
        <button className="btn primary" type="submit">Sign in</button>
        {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
      </form></div>
    );
  }

  if (!draft || !access) return <div className="admin"><p className="loading">{msg ? msg.text : "Loading…"}</p></div>;

  // preview: the saved content, as the chosen link shows it
  const previewEvents = VIEWS[previewView].filter((k) => saved.events[k].show);
  const previewPages = [
    ["top", "Names"], ["save-the-date", "Date"],
    ...previewEvents.flatMap((k) => [[k, EVENT_LABELS[k]], [`${k}-venue`, `${EVENT_LABELS[k]} venue`]]),
    ["rsvp", "Closing"],
  ];
  const page = previewPages.some(([id]) => id === previewPage) ? previewPage : "top";
  const previewSrc = `/?static=1&preview=1&view=${previewView}&page=${page}&v=${previewKey}`;
  const summary = Object.keys(EVENT_LABELS)
    .filter((k) => draft.events[k].show)
    .map((k) => `${draft.events[k].name} · ${eventInfo(draft.events[k]).longDate}`);

  return (
    <div className="admin">
      <header className="bar">
        <div>
          <h1>{draft.couple.groom} &amp; {draft.couple.bride}</h1>
          <p>
            {summary.join("  ·  ") || "No events shown"}
            <span className={`pill${savedAccess.locked ? " on" : ""}`}>{savedAccess.locked ? "Locked" : "Public"}</span>
          </p>
        </div>
        <div className="bar-actions">
          <a className="btn" href="/" target="_blank" rel="noopener">Open invite ↗</a>
          <button className="btn" type="button" disabled={!dirty || busy}
            onClick={() => { setDraft(saved); setAccess(savedAccess); }}>Discard</button>
          <button className="btn primary" type="button" disabled={!dirty || busy} onClick={save}>{busy ? "Saving…" : dirty ? "Save changes" : "Saved"}</button>
        </div>
      </header>
      {msg && <p className={`msg ${msg.type} floating`} role="status">{msg.text}</p>}

      <div className="layout">
        <main className="form">
          <PrivacyCard access={access} setAccess={setAccess} savedAccess={savedAccess} invite={draft} />

          {SECTIONS.map((sec) => (
            <section className={`card${sec.event && !draft.events[sec.event].show ? " dim" : ""}`} key={sec.title}
              onFocus={() => {
                if (sec.preview) setPreviewPage(sec.preview);
                if (sec.event) { setPreviewView(sec.event); setPreviewPage(sec.event); }
              }}>
              <h2>{sec.title}{sec.event && !draft.events[sec.event].show && <span className="pill">Hidden</span>}</h2>
              <div className="grid">
                {sec.fields.map(([path, label, opts]) => (
                  <Field key={path} path={path} label={label} opts={opts}
                    value={get(draft, path)} onChange={(v) => setDraft((d) => set(d, path, v))} />
                ))}
              </div>
            </section>
          ))}
        </main>

        <aside className="preview">
          <div className="tabs" role="tablist" aria-label="Preview link">
            {Object.keys(VIEWS).map((v) => (
              <button key={v} type="button" role="tab" aria-selected={previewView === v}
                className={previewView === v ? "on" : ""} onClick={() => setPreviewView(v)}>{VIEW_LABELS[v]}</button>
            ))}
          </div>
          <div className="tabs small" role="tablist" aria-label="Preview page">
            {previewPages.map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={page === id}
                className={page === id ? "on" : ""} onClick={() => setPreviewPage(id)}>{label}</button>
            ))}
          </div>
          <div className="phone">
            {previewEvents.length
              ? <iframe key={previewSrc} src={previewSrc} title="Invitation preview" />
              : <p className="empty">Nothing to show: both events on this link are hidden.</p>}
          </div>
          <p className="note">{dirty ? "Preview shows the saved version. Save to see your changes." : "This is what guests with this link see."}</p>
        </aside>
      </div>
    </div>
  );
}
