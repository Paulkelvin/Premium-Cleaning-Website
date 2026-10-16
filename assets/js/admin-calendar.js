// Admin > Settings > Google Calendar: connect, sync now, disconnect.
(function () {
  const config = window.CLEANCO_CONFIG || {};
  const card = document.querySelector("[data-calendar-card]");
  if (!card || !config.supabaseUrl) return;

  const statusEl = card.querySelector("[data-calendar-status]");
  const stateEl = card.querySelector("[data-calendar-state]");
  const connectBtn = card.querySelector("[data-calendar-connect]");
  const syncBtn = card.querySelector("[data-calendar-sync]");
  const disconnectBtn = card.querySelector("[data-calendar-disconnect]");
  const endpoint = `${config.supabaseUrl}/functions/v1/google-calendar`;

  const REASONS = {
    link_expired: "The sign-in link expired. Please try again.",
    google_refused: "Google didn't accept the sign-in. Please try again.",
    permission_not_granted: "Calendar permission wasn't ticked on Google's screen. Please try again and allow it.",
    no_refresh_token: "Google didn't give lasting access. Please try again.",
  };

  function headers() {
    return {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${window.getAdminToken?.() || ""}`,
      "Content-Type": "application/json",
    };
  }

  function setState(type, message) {
    stateEl.className = `form-state admin-settings-state ${type || ""}`;
    stateEl.textContent = message || "";
  }

  function when(iso) {
    if (!iso) return "never";
    const d = new Date(iso);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  function render(status) {
    connectBtn.hidden = true;
    syncBtn.hidden = true;
    disconnectBtn.hidden = true;
    if (!status.client_configured) {
      statusEl.innerHTML = "<strong>Not set up yet.</strong> The Google sign-in details still need to be added by your web developer.";
      return;
    }
    if (!status.connected) {
      statusEl.innerHTML = "<strong>Not connected.</strong> Connect the Google account whose calendar should hold bookings.";
      connectBtn.hidden = false;
      return;
    }
    const s = status.last_sync_summary || {};
    const account = status.account_email ? ` to <strong>${status.account_email.replace(/</g, "&lt;")}</strong>` : "";
    statusEl.innerHTML = status.last_sync_error
      ? `<strong>Connected${account}, but the last sync failed:</strong> ${String(status.last_sync_error).replace(/</g, "&lt;")}`
      : `<strong>Connected${account}.</strong> Last synced ${when(status.last_sync_at)} · ${Number(s.busy) || 0} busy time(s) in the calendar.`;
    connectBtn.hidden = !status.last_sync_error;
    connectBtn.innerHTML = '<i data-lucide="link"></i> Reconnect';
    syncBtn.hidden = false;
    disconnectBtn.hidden = false;
    if (typeof lucide !== "undefined") lucide.createIcons({ root: card });
  }

  async function call(action) {
    const res = await fetch(endpoint, { method: "POST", headers: headers(), body: JSON.stringify({ action }) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok && !body.connected) throw new Error(body.error || "Something went wrong");
    return body;
  }

  async function refresh() {
    try {
      render(await call("status"));
    } catch (err) {
      statusEl.textContent = "Couldn't check the calendar connection.";
      setState("error", err.message);
    }
  }

  connectBtn.addEventListener("click", async () => {
    connectBtn.disabled = true;
    setState("loading", "Opening Google sign-in…");
    try {
      const { url } = await call("connect");
      window.location.assign(url);
    } catch (err) {
      connectBtn.disabled = false;
      setState("error", err.message);
    }
  });

  syncBtn.addEventListener("click", async () => {
    syncBtn.disabled = true;
    setState("loading", "Syncing with Google Calendar…");
    try {
      const body = await call("sync");
      render(body);
      setState(body.error ? "error" : "success", body.error || "Synced.");
    } catch (err) {
      setState("error", err.message);
    } finally {
      syncBtn.disabled = false;
    }
  });

  disconnectBtn.addEventListener("click", async () => {
    if (!window.confirm("Disconnect Google Calendar? Customers will then only be blocked from times already booked on the website.")) return;
    disconnectBtn.disabled = true;
    try {
      render(await call("disconnect"));
      setState("success", "Disconnected.");
    } catch (err) {
      setState("error", err.message);
    } finally {
      disconnectBtn.disabled = false;
    }
  });

  // Coming back from Google's sign-in page.
  const params = new URLSearchParams(window.location.search);
  const result = params.get("calendar");
  if (result) {
    document.querySelector('[data-view-target="settings"]')?.click();
    if (result === "connected") setState("success", "Google Calendar connected. Bookings will now sync both ways.");
    else if (result === "cancelled") setState("error", "Google sign-in was cancelled.");
    else setState("error", REASONS[params.get("reason")] || "Couldn't connect Google Calendar. Please try again.");
    params.delete("calendar");
    params.delete("reason");
    const query = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (query ? `?${query}` : "") + window.location.hash);
  }

  // Wait until the admin is signed in (admin.js stores the session) before asking.
  let tries = 0;
  const start = () => {
    if (window.getAdminToken?.()) refresh();
    else if (tries++ < 40) setTimeout(start, 250);
  };
  start();
})();
