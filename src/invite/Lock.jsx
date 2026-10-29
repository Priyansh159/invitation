import { useState } from "react";
import "../styles/invite.css";

/* Password screen (and the screen for links that don't work).
   Uses only the plain paper artwork, so nothing private shows before unlocking. */
export default function Lock({ onSubmit, error: initialError = "", message = "" }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!password.trim() || busy) return;
    setBusy(true);
    const err = await onSubmit(password.trim());
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <div className="invite">
      <div className="ambient lock-ambient" aria-hidden="true" />
      <div className="viewport">
        <div className="frame">
          <img className="layer" src="/assets/ganesha-poster.jpg" alt="" aria-hidden="true" />
          <main className="lock">
            <p className="label">{message ? "Invitation" : "A private invitation"}</p>
            <h1 className="script">Welcome</h1>
            <span className="rule" />
            {message ? (
              <p className="lock-text">{message}</p>
            ) : (
              <form onSubmit={submit}>
                <label className="lock-text" htmlFor="invite-pass">Please enter the password shared with you</label>
                <input id="invite-pass" className="lock-input" type="password" autoComplete="current-password"
                  autoFocus value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} />
                <button className="link-btn solid" type="submit" disabled={busy}>{busy ? "Opening…" : "Open invitation"}</button>
                <p className="lock-error" role="alert">{error}</p>
              </form>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
