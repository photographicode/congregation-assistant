/* A schedule capability is exchanged for a scoped, expiring session before cleaning the URL. */
(() => {
  "use strict";
  const initialToken = new URLSearchParams(location.search).get("token"),
    title = document.getElementById("weekend-title"),
    status = document.getElementById("weekend-status"),
    list = document.getElementById("weekend-assignments");
  let sessionToken = "",
    sessionId = history.state?.ca_weekend_id || crypto.randomUUID();
  try {
    sessionToken =
      sessionStorage.getItem("ca-weekend-session:" + sessionId) || "";
  } catch {}
  async function call(name, args) {
    const response = await fetch(
      "https://ejosykrxjvwrhxfnputo.supabase.co/rest/v1/rpc/" + name,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: "sb_publishable_-WylxZpXTD06syk3LPGpWg_SfSf5K7C",
        },
        body: JSON.stringify(args),
        referrerPolicy: "no-referrer",
      },
    );
    const data = await response.json();
    if (!response.ok || !data)
      throw Error(data?.message || "Schedule unavailable");
    return data;
  }
  function render(data) {
    title.textContent = data.congregation + " — Weekend meeting";
    status.textContent = "Week of " + data.week;
    list.replaceChildren();
    for (const [label, value] of [
      ["Chairman", data.chairman],
      ["Opening song", data.openingSong],
      ["Public talk", data.talkTitle],
      ["Speaker", data.speaker],
      ["Watchtower article", data.articleTitle],
      ["Conductor", data.conductor],
      ["Reader", data.reader],
      ["Closing song", data.closingSong],
      ["Concluding prayer", data.prayer],
      ...(data.duties || []).map((d) => [d.name, d.people]),
    ]) {
      const row = document.createElement("p"),
        heading = document.createElement("strong");
      heading.textContent = label + ": ";
      row.append(
        heading,
        document.createTextNode(String(value || "Unassigned")),
      );
      list.append(row);
    }
  }
  async function refresh() {
    try {
      let snapshot;
      if (initialToken && !sessionToken) {
        const exchange = await call("ca_v2_exchange_weekend", {
          p_token: initialToken,
        });
        sessionToken = exchange.session;
        snapshot = exchange.snapshot;
        try {
          sessionStorage.setItem(
            "ca-weekend-session:" + sessionId,
            sessionToken,
          );
          history.replaceState(
            { ca_weekend_id: sessionId },
            "",
            location.pathname,
          );
        } catch {
          /* With session storage unavailable, retain the original link for reload. */
        }
      } else if (sessionToken)
        snapshot = await call("ca_v2_weekend_session", {
          p_session: sessionToken,
        });
      else throw Error("Open the original schedule link again.");
      render(snapshot);
    } catch (error) {
      status.textContent =
        "The schedule could not refresh. " +
        error.message +
        " A previously loaded version is kept.";
    }
  }
  refresh();
  const timer = setInterval(() => {
    if (!document.hidden) refresh();
  }, 30000);
  window.addEventListener("pagehide", () => clearInterval(timer), {
    once: true,
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refresh();
  });
})();
