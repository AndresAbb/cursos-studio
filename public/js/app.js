// ── Home dynamic hero (time-of-day greeting + rotating quote) ──
const Home = {
  _interval: null,

  // Map hero mood → body palette. Night/evening go dark; others light.
  themeForMood(mood) {
    if (mood === 'night')   return 'night';
    if (mood === 'evening') return 'dusk';
    return 'day';
  },

  renderHero() {
    const pick = pickQuoteForNow(State.quotes);
    if (!pick) return;
    const moodLbl = {
      dawn:'Madrugada', morning:'Mañana', midday:'Mediodía',
      afternoon:'Tarde', evening:'Anochecer', night:'Noche',
    }[pick.mood] || '';
    const root = $('hero-dynamic');
    if (root) root.dataset.mood = pick.mood;

    // Propagate the mood to the whole interface via body[data-theme]
    document.body.dataset.theme = this.themeForMood(pick.mood);

    const dEl = $('hero-day');     if (dEl) dEl.textContent     = pick.day.label ? `${pick.day.label} · ${pick.day.vibe}` : '';
    const tEl = $('hero-time');    if (tEl) tEl.textContent    = moodLbl;
    const gEl = $('hero-greeting');if (gEl) gEl.innerHTML      = `${escapeHTML(pick.greeting)}<span class="hero-comma">,</span><br/><em>${escapeHTML(State.settings?.displayName || 'aprende con intención')}.</em>`;
    const qEl = $('hero-quote');   if (qEl) qEl.textContent    = `“${pick.quote.text}”`;
    const aEl = $('hero-quote-author'); if (aEl) aEl.textContent = pick.quote.author ? `— ${pick.quote.author}` : '';
  },

  init() {
    // Refresh every 5 min so the hero crosses mood boundaries without a reload.
    clearInterval(this._interval);
    this._interval = setInterval(() => this.renderHero(), 5 * 60 * 1000);
  },
};

function faviconUrl(url) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`; }
  catch { return ''; }
}

function renderQuickLinks() {
  const bar = document.getElementById('quick-links-bar');
  if (!bar) return;
  const s = State.settings;
  if (!s?.showQuickLinks || !s?.quickLinks?.length) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  bar.innerHTML = s.quickLinks.map(({ url }) => {
    const domain = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } })();
    const fav = faviconUrl(url);
    return `<a class="quick-link-btn" href="${escapeHTML(url)}" target="_blank" rel="noopener" title="${escapeHTML(domain)}">` +
      `<img src="${escapeHTML(fav)}" alt="${escapeHTML(domain)}" width="20" height="20" onerror="this.style.display='none';this.nextSibling.style.display=''">` +
      `<span class="quick-link-fallback" style="display:none">${escapeHTML(domain.slice(0,2).toUpperCase())}</span>` +
      `</a>`;
  }).join('');
}

// Exposed as window.appBoot so App.jsx can call it after React renders the DOM.
window.appBoot = async () => {
  // 1. Health + capabilities
  try {
    State.capabilities = await API.health();
    const ind = $('db-status');
    if (State.capabilities.db === 'connected') {
      ind.textContent = '● MongoDB';
      ind.classList.remove('error');
    } else {
      ind.textContent = '● MongoDB OFFLINE';
      ind.classList.add('error');
    }
  } catch (err) {
    $('db-status').textContent = '● Servidor OFFLINE';
    $('db-status').classList.add('error');
  }

  // 2. Settings + feature flags (courses.json, graph.json)
  try { State.settings = await API.getSettings(); renderQuickLinks(); } catch {}
  try {
    const cfg = await API.config();
    State.features = {
      multiplayer:                  !!cfg.courses?.multiplayer,
      graphIncludeExternalCourses:  !!cfg.graph?.includeExternalCourses,
    };
  } catch { State.features = { multiplayer: false, graphIncludeExternalCourses: false }; }

  // Hide multiplayer UI entirely when disabled in courses.json
  if (!State.features.multiplayer) {
    const btn = document.getElementById('btn-friends');     if (btn) btn.style.display = 'none';
    const pnl = document.getElementById('friends-panel');   if (pnl) pnl.style.display = 'none';
  }

  // 3. Init modules
  Stickers.initPanel();
  Notes.init();
  Player.init();
  Calendar.init();
  GlobalCalendar.init();
  SkillGraph.init();
  NetworkGraph.init();
  CardDeck.init();
  Course.init();
  Externals.init();
  Ghosts.init();
  await Exams.init();   // async: loads exam_templates.json before any UI
  Settings.init();
  if (State.features?.multiplayer) {
    await Friends.init();
  }
  await loadQuotes();
  Home.init();

  // 4. Wire final exam button (rendered on grades view)
  document.addEventListener('click', e => {
    if (e.target && e.target.id === 'btn-final-exam') {
      Exams.showFinalExamModal();
    }
  });

  // 5. Wire exam prompt generation buttons (rendered inside modals)
  document.addEventListener('click', e => {
    const id = e.target?.id;
    if (!id || !State.cur) return;
    if (id === 'ex-gen-week' || id === 'ex-gen-month' || id === 'ex-gen-all') {
      const scope = id === 'ex-gen-week' ? 'week' : id === 'ex-gen-month' ? 'month' : 'all';
      const week  = State.weekOff !== undefined ? calcCourseWeek(State.cur.startDate, getWeekStart(State.weekOff)) : 0;
      (async () => {
        try {
          toast('⏳ Generando prompt…', 3000);
          const { prompt } = await API.getExamPrompt(State.cur._id, scope, Math.max(0, week));
          Exams.applyPromptTemplate(prompt);
          toast('✅ Prompt generado');
        } catch (err) { toast('❌ ' + err.message); }
      })();
    }
  });

  // 6. Load courses + planned ghost courses
  await Promise.all([
    Course.loadList(),
    Ghosts.loadList(),
  ]);

  // Wire home-page card deck button (rendered after React mounts)
  $('hero-cta-cards')?.addEventListener('click', () => CardDeck.open());

  // 7. Initial view
  Course.showHome();
  Home.renderHero();
  Ghosts.render();

  console.log('📚 Cursos Studio v3 iniciado');
};
