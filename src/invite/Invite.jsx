import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { eventInfo, signDate, whatsappLink } from "../content/format.js";
import { startEngine } from "./engine.js";
import "../styles/invite.css";

const Lines = ({ text }) =>
  String(text || "").split("\n").map((line, i, all) => (
    <span key={i}>{line}{i < all.length - 1 && <br />}</span>
  ));

function Countdown({ start, doneText }) {
  const [now, setNow] = useState(() => Date.now());
  const diff = start.getTime() - now;
  useEffect(() => {
    if (diff <= 0) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [diff <= 0]);

  if (diff <= 0) return <p className="countdown-done" data-a style={{ "--d": ".75s" }}>{doneText}</p>;
  const s = Math.floor(diff / 1000);
  const pad = (n) => String(n).padStart(2, "0");
  const parts = [
    [Math.floor(s / 86400), "Days"],
    [Math.floor((s % 86400) / 3600), "Hours"],
    [Math.floor((s % 3600) / 60), "Minutes"],
    [s % 60, "Seconds"],
  ];
  return (
    <div className="countdown" data-a style={{ "--d": ".75s" }}>
      {parts.map(([n, label], i) => (
        <Fragment key={label}>
          {i > 0 && <i />}
          <div><b>{pad(n)}</b><small>{label}</small></div>
        </Fragment>
      ))}
    </div>
  );
}

/* One event's two pages: the details, then the venue with its map. */
function EventPages({ ev, info, index, many, venueTba }) {
  const { venue } = ev;
  return (
    <>
      <div className="scene" data-scene={index}>
        <div className="safe">
          <p className="label" data-a>{ev.label}</p>
          <h2 className="script" data-a="write" style={{ "--d": ".15s" }}>{ev.title}</h2>
          <span className="rule" data-a="rule" style={{ "--d": ".45s" }} />
          <dl className="details">
            <div data-a style={{ "--d": ".5s" }}>
              <dt>Date</dt>
              <dd>{info.longDate}</dd>
            </div>
            <div data-a style={{ "--d": ".6s" }}>
              <dt>Time</dt>
              <dd>{info.timeText || "Time to be announced"}</dd>
            </div>
            <div data-a style={{ "--d": ".7s" }}>
              <dt>Venue</dt>
              <dd>{venue.name || "Venue to be announced"}{venue.name && venue.address && <><br /><small>{venue.address}</small></>}</dd>
            </div>
            {ev.dressCode && (
              <div data-a style={{ "--d": ".8s" }}>
                <dt>Dress code</dt>
                <dd>{ev.dressCode}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="scene" data-scene={index + 1}>
        <div className="safe">
          <p className="label" data-a>{many ? `${ev.venueLabel} · ${ev.name}` : ev.venueLabel}</p>
          <h2 className="script" data-a="write" style={{ "--d": ".15s" }}>{ev.venueTitle}</h2>
          <span className="rule" data-a="rule" style={{ "--d": ".45s" }} />
          {info.venueText ? (
            <div className="venue">
              {venue.name && <h3 className="venue-name" data-a style={{ "--d": ".5s" }}>{venue.name}</h3>}
              {venue.address && <p className="venue-address" data-a style={{ "--d": ".6s" }}>{venue.address}</p>}
              {info.mapEmbed && (
                <a className="map" data-a style={{ "--d": ".7s" }} href={info.directions} target="_blank" rel="noopener" aria-label="Open the venue in Google Maps">
                  <iframe src={info.mapEmbed} title={`${ev.name} venue map`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" tabIndex={-1} />
                </a>
              )}
              {info.directions && (
                <div className="actions" data-a style={{ "--d": ".8s" }}>
                  <a className="link-btn solid" href={info.directions} target="_blank" rel="noopener">Open in Google Maps</a>
                </div>
              )}
            </div>
          ) : (
            <p className="tba" data-a style={{ "--d": ".5s" }}><Lines text={venueTba} /></p>
          )}
        </div>
      </div>
    </>
  );
}

/* invite.events holds only the events this link may show, in order. */
export default function Invite({ invite }) {
  const root = useRef(null);
  const { couple, hero, events, saveTheDate, closing, music } = invite;
  const infos = useMemo(() => events.map(eventInfo), [events]);
  const [lead, info] = [events[0], infos[0]];
  const many = events.length > 1;
  const rsvp = whatsappLink(invite);
  const isStatic = useMemo(() => new URLSearchParams(location.search).has("static"), []);

  // page ids, in scroll order (also used by ?static=1&page=...)
  const pageIds = ["top", "save-the-date", ...events.flatMap((e) => [e.key, `${e.key}-venue`]), "rsvp"];

  useEffect(() => startEngine(root.current, { isStatic, music }), []);
  useEffect(() => { document.title = invite.share.title; }, [invite.share.title]);

  const twoDigitDay = info.day >= 10;

  return (
    <div className="invite" ref={root}>
      <div className="ambient" aria-hidden="true" />

      {/* ===================== THE FIXED FRAME ===================== */}
      <div className="viewport">
        <div className="frame">
          <img className="layer still" src="/assets/scene.jpg" alt="" aria-hidden="true" />
          <video className="layer v-loop" src="/assets/loop.mp4" poster="/assets/scene.jpg" muted playsInline loop preload="auto" aria-hidden="true" />
          <video className="layer v-intro" src="/assets/intro.mp4" poster="/assets/arch.jpg" muted playsInline preload="auto" aria-hidden="true" />
          <img className="layer cover" src="/assets/couple-cover.webp" alt="" aria-hidden="true" />

          {/* Page 1 · the Canva design (shows the first event of this link) */}
          <div className="scene scene-hero" data-scene="0">
            <p className="t-together intro" style={{ "--d": ".2s" }}>{hero.together}</p>
            <h1 className="sr-only">{couple.groom} and {couple.bride}</h1>
            <span className="t-name t-groom intro write" style={{ "--d": ".7s" }} aria-hidden="true">{couple.groom}</span>
            <span className="t-and intro" style={{ "--d": "1.9s" }} aria-hidden="true">and</span>
            <span className="t-name t-bride intro write" style={{ "--d": "2.2s" }} aria-hidden="true">{couple.bride}</span>
            <p className="t-invite intro" style={{ "--d": "3.3s" }}><Lines text={lead.heroLine} /></p>
            <div className={`t-date intro${twoDigitDay ? " two" : ""}`} style={{ "--d": "3.8s" }} aria-label={info.longDate}>
              <span className="t-dec">{info.monthShort}</span>
              <span className="t-bar t-bar-l" />
              <span className="t-six">{info.day}<span className="t-th">{info.dayOrdinal}</span></span>
              <span className="t-bar t-bar-r" />
              <span className="t-year">{info.year}</span>
            </div>
            <button className="scroll-cue intro" style={{ "--d": "4.6s" }} type="button" data-go="1" aria-label="Next page">
              <span>Scroll</span><i />
            </button>
          </div>

          {/* Page 2 · Save the date */}
          <div className="scene" data-scene="1">
            <div className="safe">
              <p className="label" data-a>{many ? `${saveTheDate.label} · ${lead.name}` : saveTheDate.label}</p>
              <h2 className="script" data-a="write" style={{ "--d": ".15s" }}>{saveTheDate.title}</h2>
              <span className="rule" data-a="rule" style={{ "--d": ".45s" }} />
              <p className="weekday" data-a style={{ "--d": ".5s" }}>{info.weekday}</p>
              <div className="big-date" data-a style={{ "--d": ".6s" }}>
                <span className="bd-num">{info.dayPadded}</span>
                <span className="bd-mid">{info.month}</span>
                <span className="bd-num">{info.year}</span>
              </div>
              <Countdown start={info.start} doneText="The celebration has begun!" />
              {events.slice(1).map((ev, i) => (
                <p className="also" key={ev.key} data-a style={{ "--d": ".9s" }}>
                  {ev.name}<br /><b>{infos[i + 1].longDate}</b>
                </p>
              ))}
            </div>
          </div>

          {/* Each event: details + venue */}
          {events.map((ev, i) => (
            <EventPages key={ev.key} ev={ev} info={infos[i]} index={2 + i * 2} many={many} venueTba={invite.venueTba} />
          ))}

          {/* Last page · Closing */}
          <div className="scene" data-scene={pageIds.length - 1}>
            <div className="safe">
              <p className="label" data-a>{closing.label}</p>
              <h2 className="script" data-a="write" style={{ "--d": ".15s" }}>{closing.title}</h2>
              <span className="rule" data-a="rule" style={{ "--d": ".45s" }} />
              <p className="closing-text" data-a style={{ "--d": ".5s" }}><Lines text={lead.closingText} /></p>
              {rsvp && (
                <div className="actions" data-a style={{ "--d": ".6s" }}>
                  <a className="link-btn solid" href={rsvp} target="_blank" rel="noopener">RSVP on WhatsApp</a>
                </div>
              )}
              <div className="sign" data-a style={{ "--d": ".7s" }}>
                <span className="sign-names">{couple.groom} <em>&amp;</em> {couple.bride}</span>
                <span className="sign-date">{signDate(infos)}</span>
              </div>
            </div>
          </div>

          {/* Opening · Shri Ganeshaya Namah, then page one */}
          <div className="ganesha" aria-label="Shri Ganeshaya Namah">
            <video className="layer v-ganesha" src="/assets/ganesha.mp4" poster="/assets/ganesha-poster.jpg"
              muted playsInline autoPlay preload="auto" aria-hidden="true" />
          </div>
        </div>

        <button className="music" id="musicBtn" type="button" aria-label="Play music" hidden>
          <span className="bars"><i /><i /><i /><i /></span>
          <span className="music-hint">Tap for music</span>
        </button>
      </div>

      <canvas id="petals" aria-hidden="true" />
      <audio id="bgm" src={music.enabled ? music.src : undefined} loop preload="auto" />

      {/* Scroll pages: each one snaps into place; the frame above stays fixed */}
      <main className="pages" aria-hidden="true">
        {pageIds.map((id) => (
          <section className="page" key={id} data-page={id} />
        ))}
      </main>
    </div>
  );
}
