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

  // 2. Settings
  try { State.settings = await API.getSettings(); } catch {}

  // 3. Init modules
  Stickers.initPanel();
  Notes.init();
  Player.init();
  Calendar.init();
  GlobalCalendar.init();
  Course.init();
  Externals.init();
  await Exams.init();   // async: loads exam_templates.json before any UI
  Settings.init();

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

  // 6. Load courses
  await Course.loadList();

  // 7. Initial view
  Course.showHome();

  console.log('📚 Cursos Studio v3 iniciado');
};
