export function bootHeadlineUI({ root, onReadyText }) {
  const STATE_KEY = "headline_state_v1";
  const API_KEY_KEY = "headline_newsapi_key_v1";

  const state = loadState() || {
    lastHourKey: null,
    dismissedHourKey: null,
    headline: null,
    source: null,
    url: null,
    fetchedAt: null
  };

  root.innerHTML = `
    <div class="wrap" id="wrap">
      <header class="top">
        <div class="brand">
          <div class="name">One Headline</div>
          <div class="sub">one per hour • anti-doomscroll</div>
        </div>
        <div class="pill" id="envPill">WEB</div>
      </header>

      <main class="card" id="card" aria-label="Headline card">
        <div class="stamp">
          <span class="dot"></span>
          <span id="stampText">READY</span>
        </div>

        <div class="headline" id="headline">Loading…</div>

        <div class="metaRow">
          <div class="meta" id="meta">—</div>
          <button class="link" id="readBtn" type="button">read more</button>
        </div>

        <div class="divider"></div>

        <div class="controls">
          <input class="apikey" id="apiKey" autocomplete="off" spellcheck="false"
                 placeholder="optional: paste NewsAPI key (saved locally)" />
          <button class="btn" id="saveKeyBtn" type="button">save</button>
          <button class="ghost" id="clearKeyBtn" type="button">clear</button>
        </div>

        <div class="hint">
          <span class="chip">swipe ← dismiss</span>
          <span class="chip">tap headline = refresh (hour only)</span>
        </div>
      </main>

      <section class="empty" id="empty" aria-label="Empty state">
        <div class="emptyTitle">nothing until the next hour</div>
        <div class="emptySub" id="nextAt">—</div>
        <button class="ghost big" id="undismissBtn" type="button">undo dismiss</button>
      </section>
    </div>
  `;

  const el = {
    env: root.querySelector("#envPill"),
    wrap: root.querySelector("#wrap"),
    card: root.querySelector("#card"),
    empty: root.querySelector("#empty"),
    headline: root.querySelector("#headline"),
    meta: root.querySelector("#meta"),
    readBtn: root.querySelector("#readBtn"),
    stamp: root.querySelector("#stampText"),
    apiKey: root.querySelector("#apiKey"),
    saveKeyBtn: root.querySelector("#saveKeyBtn"),
    clearKeyBtn: root.querySelector("#clearKeyBtn"),
    nextAt: root.querySelector("#nextAt"),
    undismiss: root.querySelector("#undismissBtn"),
  };

  function setEnv(isMini) {
    el.env.textContent = isMini ? "MINI" : "WEB";
    el.env.classList.toggle("mini", !!isMini);
  }

  function hourKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const day = String(d.getDate()).padStart(2,"0");
    const hh = String(d.getHours()).padStart(2,"0");
    return `${y}-${m}-${day}-${hh}`;
  }

  function nextHourText() {
    const d = new Date();
    d.setMinutes(0,0,0);
    d.setHours(d.getHours()+1);
    return `next at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  function saveState() { localStorage.setItem(STATE_KEY, JSON.stringify(state)); }
  function loadState() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  }

  function getApiKey() {
    try { return localStorage.getItem(API_KEY_KEY) || ""; } catch { return ""; }
  }
  function setApiKey(k) {
    try { localStorage.setItem(API_KEY_KEY, k); } catch {}
  }
  function clearApiKey() {
    try { localStorage.removeItem(API_KEY_KEY); } catch {}
  }

  function showCard() {
    el.card.style.display = "block";
    el.empty.style.display = "none";
  }
  function showEmpty() {
    el.card.style.display = "none";
    el.empty.style.display = "block";
    el.nextAt.textContent = nextHourText();
  }

  function stamp(msg) {
    el.stamp.textContent = msg.toUpperCase();
    el.wrap.classList.remove("pop");
    void el.wrap.offsetWidth;
    el.wrap.classList.add("pop");
  }

  function setHeadline({ headline, source, url, fetchedAt }) {
    state.headline = headline;
    state.source = source || "—";
    state.url = url || null;
    state.fetchedAt = fetchedAt || new Date().toISOString();
    saveState();

    el.headline.textContent = headline;
    el.meta.textContent = `${state.source} • ${new Date(state.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    el.readBtn.disabled = !state.url;
    el.readBtn.style.opacity = state.url ? "1" : "0.5";
  }

  function setFallbackHeadline() {
    // High-quality fallback list (no API key needed)
    const fallback = [
      { h: "Small habits beat big plans.", s: "studio", u: null },
      { h: "One clear task is a day saved.", s: "studio", u: null },
      { h: "Less feed. More focus.", s: "studio", u: null },
      { h: "If it matters, write it down once.", s: "studio", u: null },
      { h: "Shipping is a form of meditation.", s: "studio", u: null },
      { h: "Scroll less, choose more.", s: "studio", u: null },
      { h: "Attention is your currency.", s: "studio", u: null },
      { h: "Simplicity is a competitive advantage.", s: "studio", u: null },
      { h: "Today’s headline: you control your time.", s: "studio", u: null }
    ];
    const pick = fallback[Math.floor(Math.random()*fallback.length)];
    setHeadline({ headline: pick.h, source: pick.s, url: pick.u, fetchedAt: new Date().toISOString() });
    stamp(getApiKey() ? "api error" : "no api key");
  }

  async function fetchNewsAPI() {
    const key = getApiKey().trim();
    if (!key) return setFallbackHeadline();

    // Free-tier friendly endpoint (top headlines)
    // Note: users must supply their own key.
    const url = new URL("https://newsapi.org/v2/top-headlines");
    url.searchParams.set("language", "en");
    url.searchParams.set("pageSize", "1");
    url.searchParams.set("apiKey", key);

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) throw new Error("bad_response");
    const data = await res.json();
    const item = (data.articles && data.articles[0]) ? data.articles[0] : null;
    if (!item) throw new Error("no_articles");

    setHeadline({
      headline: String(item.title || "Untitled").trim(),
      source: (item.source && item.source.name) ? String(item.source.name) : "NewsAPI",
      url: item.url || null,
      fetchedAt: new Date().toISOString()
    });
    stamp("updated");
  }

  async function ensureHeadlineForThisHour(force=false) {
    const now = new Date();
    const hk = hourKey(now);

    // If dismissed this hour, show empty until next hour
    if (state.dismissedHourKey === hk) {
      showEmpty();
      stamp("dismissed");
      return;
    }

    showCard();

    // Use cached headline within same hour unless force
    if (!force && state.lastHourKey === hk && state.headline) {
      el.headline.textContent = state.headline;
      el.meta.textContent = `${state.source || "—"} • ${new Date(state.fetchedAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      el.readBtn.disabled = !state.url;
      return stamp("cached");
    }

    state.lastHourKey = hk;
    saveState();

    try {
      stamp("fetching");
      await fetchNewsAPI();
    } catch {
      setFallbackHeadline();
    }
  }

  // Swipe-to-dismiss
  let startX = null;
  let startY = null;
  let dragging = false;

  function onDown(e) {
    const p = e.touches ? e.touches[0] : e;
    startX = p.clientX;
    startY = p.clientY;
    dragging = true;
  }

  function onMove(e) {
    if (!dragging || startX == null) return;
    const p = e.touches ? e.touches[0] : e;
    const dx = p.clientX - startX;
    const dy = p.clientY - startY;
    // ignore vertical scroll
    if (Math.abs(dy) > Math.abs(dx)) return;

    const t = Math.max(-120, Math.min(0, dx));
    el.card.style.transform = `translateX(${t}px) rotate(${t/18}deg)`;
    el.card.style.opacity = String(1 - Math.abs(t)/180);
  }

  function onUp(e) {
    if (!dragging) return;
    dragging = false;
    const p = e.changedTouches ? e.changedTouches[0] : e;
    const dx = p.clientX - startX;
    startX = null; startY = null;

    if (dx < -90) {
      // dismiss for the current hour
      const hk = hourKey(new Date());
      state.dismissedHourKey = hk;
      saveState();
      el.card.style.transform = "";
      el.card.style.opacity = "";
      showEmpty();
      stamp("dismissed");
      return;
    }

    // snap back
    el.card.style.transform = "";
    el.card.style.opacity = "";
  }

  el.card.addEventListener("mousedown", onDown);
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
  el.card.addEventListener("touchstart", onDown, { passive: true });
  el.card.addEventListener("touchmove", onMove, { passive: true });
  el.card.addEventListener("touchend", onUp, { passive: true });

  // Tap headline refresh (within hour gate; force fetch)
  el.headline.addEventListener("click", () => ensureHeadlineForThisHour(true));

  // Read more
  el.readBtn.addEventListener("click", () => {
    if (!state.url) return;
    window.open(state.url, "_blank", "noopener,noreferrer");
  });

  // API key UI
  el.apiKey.value = getApiKey();
  el.saveKeyBtn.addEventListener("click", () => {
    const v = el.apiKey.value.trim();
    if (!v) return stamp("empty key");
    setApiKey(v);
    stamp("saved");
    ensureHeadlineForThisHour(true);
  });
  el.clearKeyBtn.addEventListener("click", () => {
    clearApiKey();
    el.apiKey.value = "";
    stamp("cleared");
    ensureHeadlineForThisHour(true);
  });

  el.undismiss.addEventListener("click", () => {
    state.dismissedHourKey = null;
    saveState();
    stamp("undone");
    ensureHeadlineForThisHour(false);
  });

  stamp(onReadyText || "ready ✓");
  ensureHeadlineForThisHour(false);

  return { setEnv };
}