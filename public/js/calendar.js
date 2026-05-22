const Calendar = {
  changeWeek(delta) { State.weekOff += delta; this.render(); },
  goToday()         { State.weekOff = 0; this.render(); },

  render() {
    if (!State.cur) return;
    const ws = getWeekStart(State.weekOff);
    const we = new Date(ws); we.setDate(ws.getDate() + 6);
    const fmt = d => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const courseWeek = calcCourseWeek(State.cur.startDate, ws);
    const relPart = State.showRelWeek ? `Sem ${courseWeek + 1} · ` : '';
    $('week-label').textContent = `${relPart}${fmt(ws)} — ${fmt(we)}`;
    const today      = new Date(); today.setHours(0, 0, 0, 0);

    // Show syllabus section label for current week
    const labels      = State.cur?.syllabusLabels || [];
    const curSection  = labels.find(l => l.startWeek <= courseWeek && l.endWeek >= courseWeek);
    const sectionEl   = $('cal-section-label');
    if (sectionEl) {
      if (curSection) {
        sectionEl.textContent = `§ ${curSection.title}${curSection.description ? ' — ' + curSection.description : ''}`;
        sectionEl.style.display = '';
      } else {
        sectionEl.style.display = 'none';
      }
    }

    let html = '';
    for (let d = 0; d < 7; d++) {
      const day     = dayDate(ws, d);
      const isToday = day.getTime() === today.getTime();
      const mods    = State.curModules.filter(m => m.dayOfWeek === d && m.week === courseWeek);
      const status  = dayStatus(day, mods, today);

      let colCls = 'day-col';
      if (isToday) colCls += ' today-col';
      if (status === 'missed' || (status === 'empty' && day.getTime() < today.getTime())) {
        colCls += ' elapsed-empty';
      }

      const statusEl = (status !== 'future' && status !== 'empty')
        ? `<div class="d-status ${status}" title="${this.statusLabel(status)}">${statusEmoji(status)}</div>`
        : '';

      html += `
        <div class="${colCls}">
          <div class="d-head">${DAYS_SHORT[d]}</div>
          <div class="d-num ${isToday ? 'today' : ''}">${day.getDate()}${statusEl}</div>
          <div class="d-mods">
            ${mods.map(m => this.renderModuleCell(m)).join('')}
            <div class="cal-add" data-day="${d}" data-week="${courseWeek}">+ agregar</div>
          </div>
        </div>`;
    }
    $('cal-grid').innerHTML = html;

    $('cal-grid').querySelectorAll('.cal-mod').forEach(el => {
      el.addEventListener('click', () => Player.open(el.dataset.mid));
    });
    $('cal-grid').querySelectorAll('.cal-add').forEach(el => {
      el.addEventListener('click', () => {
        const day  = parseInt(el.dataset.day);
        const week = parseInt(el.dataset.week);
        Course.showAddModule(day, Math.max(0, week));
      });
    });
  },

  renderModuleCell(m) {
    const col  = typeColor(m.type, State.cur.color);
    let icon   = typeIcon(m.type);
    let prefix = '';
    if (m.type === 'web-link' && m.favicon) {
      prefix = `<img class="cal-mod-fav" src="${m.favicon}" alt="">`;
      icon   = '';
    }
    const lockedCls = (m.type === 'ai-exam' && m.examConfig?.locked) ? 'locked' : '';
    return `<div class="cal-mod ${m.done ? 'done' : ''} ${lockedCls}"
      style="background:${col}22;color:${col};border-color:${col}44"
      data-mid="${m._id}" title="${escapeHTML(m.title)}">
      ${prefix}${icon ? icon + ' ' : ''}${escapeHTML(m.title.length > 22 ? m.title.slice(0, 22) + '…' : m.title)}
    </div>`;
  },

  statusLabel(s) {
    return { complete: 'Día completo', partial: 'Parcial', missed: 'Día perdido' }[s] || '';
  },

  init() {
    $('cal-prev').addEventListener('click', () => this.changeWeek(-1));
    $('cal-next').addEventListener('click', () => this.changeWeek(1));
    $('cal-today').addEventListener('click', () => this.goToday());
    $('cal-rel-toggle').addEventListener('click', () => {
      State.showRelWeek = !State.showRelWeek;
      $('cal-rel-toggle').classList.toggle('active', State.showRelWeek);
      this.render();
    });
  },
};

// ─── Calendario Global ───────────────────────────
const GlobalCalendar = {
  data: null,

  async open() {
    State.cur = null;
    Stickers.clearCanvas();
    $('home-view').style.display = 'none';
    $('course-view').style.display = 'none';
    $('global-cal-view').style.display = '';
    const gv3 = $('graph-view'); if (gv3) gv3.style.display = 'none';
    if (window.SkillGraph) SkillGraph.close();
    $('main').style.background = 'var(--bg)';
    applyDarkModeForBg(null);
    State.globalWeekOff = 0;
    await this.load();
  },

  async load() {
    try {
      this.data = await API.globalCalendar();
      this.render();
    } catch (err) { toast('❌ ' + err.message); }
  },

  changeWeek(d) { State.globalWeekOff += d; this.render(); },

  render() {
    if (!this.data) return;
    const ws  = getWeekStart(State.globalWeekOff);
    const we  = new Date(ws); we.setDate(ws.getDate() + 6);
    const fmt = d => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const wsYear = ws.getFullYear(), weYear = we.getFullYear();
    const yearLabel = wsYear === weYear ? ` ${wsYear}` : ` ${wsYear}–${weYear}`;
    $('gweek-label').textContent = `${fmt(ws)} — ${fmt(we)}${yearLabel}`;

    const today     = new Date(); today.setHours(0, 0, 0, 0);
    const { courses, modules, externals } = this.data;
    const activeCourses = courses.filter(c => !c.status || c.status === 'active');
    const coursesById = Object.fromEntries(activeCourses.map(c => [String(c._id), c]));

    // Max module week per course — fallback when no manual endDate or syllabusLabels
    const maxModWeek = {};
    for (const m of modules) {
      const cid = String(m.courseId);
      if (coursesById[cid] && (maxModWeek[cid] === undefined || m.week > maxModWeek[cid])) {
        maxModWeek[cid] = m.week;
      }
    }
    // courseEndWeek priority: manual endDate > syllabusLabels > maxModWeek
    const courseEndWeek = {};
    for (const c of activeCourses) {
      const id = String(c._id);
      if (c.endDate) {
        const d = new Date(c.endDate); d.setHours(0, 0, 0, 0);
        const dow = d.getDay();
        d.setDate(d.getDate() + ((dow === 0 ? -6 : 1) - dow)); // snap to Monday of that week
        courseEndWeek[id] = calcCourseWeek(c.startDate, d);
      } else {
        const labels = c.syllabusLabels;
        if (labels && labels.length) {
          courseEndWeek[id] = Math.max(...labels.map(l => l.endWeek));
        } else if (maxModWeek[id] !== undefined) {
          courseEndWeek[id] = maxModWeek[id];
        }
      }
    }

    let html = '';
    for (let d = 0; d < 7; d++) {
      const day     = dayDate(ws, d);
      const isToday = day.getTime() === today.getTime();

      const dayModules = [];
      for (const m of modules) {
        const c = coursesById[String(m.courseId)];
        if (!c) continue;
        const cw = calcCourseWeek(c.startDate, ws);
        const endWk = courseEndWeek[String(m.courseId)];
        if (m.week === cw && m.dayOfWeek === d && (endWk === undefined || m.week <= endWk)) {
          dayModules.push({ m, c });
        }
      }

      const dayExternals = externals.filter(e => {
        if (!e.daysOfWeek?.includes(d)) return false;
        const start = new Date(e.startDate); start.setHours(0,0,0,0);
        if (day.getTime() < start.getTime()) return false;
        if (e.endDate) { const end = new Date(e.endDate); end.setHours(23,59,59,999); if (day.getTime() > end.getTime()) return false; }
        return true;
      });

      const status = (() => {
        const allMods = dayModules.map(x => x.m);
        if (!allMods.length && !dayExternals.length) return 'empty';
        if (day.getTime() > today.getTime()) return 'future';
        const done = allMods.filter(m => m.done).length;
        if (done === allMods.length && allMods.length > 0) return 'complete';
        if (done > 0) return 'partial';
        return allMods.length ? 'missed' : 'empty';
      })();

      const statusEl = (status !== 'future' && status !== 'empty')
        ? `<div class="d-status ${status}">${statusEmoji(status)}</div>`
        : '';

      html += `<div class="day-col${isToday ? ' today-col' : ''}${status === 'missed' ? ' elapsed-empty' : ''}">
        <div class="d-head">${DAYS_SHORT[d]}</div>
        <div class="d-num ${isToday ? 'today' : ''}">${fmt(day)}${statusEl}</div>
        <div class="d-mods">
          ${dayModules.map(({m, c}) => {
            const col = c.color || '#888';
            return `<div class="cal-mod ${m.done ? 'done' : ''}"
              style="background:${col}22;color:${col};border-color:${col}44"
              data-cid="${c._id}" data-mid="${m._id}"
              title="${escapeHTML(c.title + ' · ' + m.title)}">
              ${typeIcon(m.type)} ${escapeHTML((c.emoji||'') + ' ' + (m.title.length > 18 ? m.title.slice(0,18)+'…' : m.title))}
            </div>`;
          }).join('')}
          ${dayExternals.map(e => {
            const col = e.color || '#5b4a8a';
            const fav = e.favicon ? `<img class="cal-mod-fav" src="${e.favicon}" alt="">` : '';
            return `<div class="cal-mod external"
              style="background:${col}22;color:${col};border-color:${col}66"
              data-eid="${e._id}"
              title="${escapeHTML(e.title)}${e.timeOfDay ? ' · ' + e.timeOfDay : ''}">
              ${fav}${escapeHTML(e.title.length > 18 ? e.title.slice(0,18)+'…' : e.title)}${e.timeOfDay ? ' <span style="opacity:.7">'+e.timeOfDay+'</span>' : ''}
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }
    $('gcal-grid').innerHTML = html;

    $('gcal-grid').querySelectorAll('.cal-mod[data-mid]').forEach(el => {
      el.addEventListener('click', async () => {
        await Course.open(el.dataset.cid);
        Player.open(el.dataset.mid);
      });
    });
    $('gcal-grid').querySelectorAll('.cal-mod[data-eid]').forEach(el => {
      el.addEventListener('click', () => {
        const e = this.data.externals.find(x => x._id === el.dataset.eid);
        if (e) window.open(e.url, '_blank');
      });
    });
  },

  init() {
    $('gcal-prev').addEventListener('click', () => this.changeWeek(-1));
    $('gcal-next').addEventListener('click', () => this.changeWeek(1));
    $('gcal-today').addEventListener('click', () => { State.globalWeekOff = 0; this.render(); });
    $('gcv-back').addEventListener('click', () => Course.showHome());
    $('nav-global-cal').addEventListener('click', () => this.open());
  },
};
