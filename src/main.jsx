import { lazy, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { adminData, loadInvite } from "./api.js";
import { boot } from "./boot.js";
import { publicView } from "./content/view.js";
import { preloadMedia } from "./invite/preload.js";

const isAdmin = location.pathname.replace(/\/+$/, "").endsWith("/admin");

// start downloading the invitation's code right away, alongside its details
const inviteCode = isAdmin ? null : import("./invite/Invite.jsx");
const Invite = lazy(() => inviteCode || import("./invite/Invite.jsx"));
const Lock = lazy(() => import("./invite/Lock.jsx"));
const Admin = lazy(() => import("./admin/Admin.jsx"));

const params = new URLSearchParams(location.search);
const isStatic = params.has("static");

/* The Ganesha loader stays up while the details load and everything the
   opening needs downloads; the invitation starts only once it's all ready. */
async function prepare(result) {
  if (result.status !== "ok" || isStatic) return result;
  boot.show();
  const [media] = await Promise.all([preloadMedia(boot.progress), inviteCode]);
  return { ...result, media };
}

function InvitePage() {
  const [state, setState] = useState(null);

  useEffect(() => {
    if (params.has("preview")) {
      // the portal's preview: the saved content, as a given link would show it
      adminData()
        .then(({ invite }) => setState({ status: "ok", invite: publicView(invite, params.get("view") || "both") }))
        .catch((err) => setState({ status: "missing", error: err.message }));
    } else {
      loadInvite().then(prepare).then(setState);
    }
  }, []);

  useEffect(() => {
    if (state && state.status !== "ok") boot.hide();   // lock screen / messages show without the loader
  }, [state]);

  if (!state) return null;
  if (state.status === "ok") return <Invite invite={state.invite} media={state.media} />;
  if (state.status === "locked") {
    return (
      <Lock
        error={state.error}
        onSubmit={async (password) => {
          const next = await loadInvite(password);
          if (next.status === "locked") return next.error || "That password isn't right. Please try again.";
          setState(await prepare(next));
          return "";
        }}
      />
    );
  }
  return (
    <Lock
      message={state.status === "error"
        ? "We couldn't load the invitation. Please check your connection and try again."
        : state.error}
    />
  );
}

if (isAdmin || isStatic) boot.hide();

createRoot(document.getElementById("root")).render(
  <Suspense fallback={null}>
    {isAdmin ? <Admin /> : <InvitePage />}
  </Suspense>
);
