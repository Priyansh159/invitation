import { lazy, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { adminData, loadInvite } from "./api.js";
import { publicView } from "./content/view.js";

const isAdmin = location.pathname.replace(/\/+$/, "").endsWith("/admin");

// start downloading the invitation's code right away, alongside its details
const inviteCode = isAdmin ? null : import("./invite/Invite.jsx");
const Invite = lazy(() => inviteCode || import("./invite/Invite.jsx"));
const Lock = lazy(() => import("./invite/Lock.jsx"));
const Admin = lazy(() => import("./admin/Admin.jsx"));

const params = new URLSearchParams(location.search);

function InvitePage() {
  const [state, setState] = useState(null);

  useEffect(() => {
    if (params.has("preview")) {
      // the portal's preview: the saved content, as a given link would show it
      adminData()
        .then(({ invite }) => setState({ status: "ok", invite: publicView(invite, params.get("view") || "both") }))
        .catch((err) => setState({ status: "missing", error: err.message }));
    } else {
      loadInvite().then(setState);
    }
  }, []);

  if (!state) return null;
  if (state.status === "ok") return <Invite invite={state.invite} />;
  if (state.status === "locked") {
    return (
      <Lock
        error={state.error}
        onSubmit={async (password) => {
          const next = await loadInvite(password);
          if (next.status === "locked") return next.error || "That password isn't right. Please try again.";
          setState(next);
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

createRoot(document.getElementById("root")).render(
  <Suspense fallback={null}>
    {isAdmin ? <Admin /> : <InvitePage />}
  </Suspense>
);
