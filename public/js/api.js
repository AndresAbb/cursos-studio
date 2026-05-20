// API client — todas las llamadas a /api/*
const API = {
  async req(path, opts = {}) {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    if (res.status === 401 && !path.startsWith('/api/auth') && !path.startsWith('/api/login')) {
      location.href = `/login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
      throw new Error('unauthorized');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    if (res.headers.get('content-type')?.includes('json')) return res.json();
    return res.text();
  },

  // Auth
  authStatus() { return this.req('/api/auth/status'); },
  logout()     { return this.req('/api/logout', { method: 'POST' }); },

  // Health & config
  health()  { return this.req('/api/health'); },
  config()  { return this.req('/api/config'); },

  // Settings
  getSettings()        { return this.req('/api/settings'); },
  saveSettings(data)   { return this.req('/api/settings', { method: 'PUT', body: JSON.stringify(data) }); },

  // Courses
  listCourses()             { return this.req('/api/courses'); },
  getCourse(id)             { return this.req(`/api/courses/${id}`); },
  createCourse(data)        { return this.req('/api/courses', { method: 'POST', body: JSON.stringify(data) }); },
  updateCourse(id, data)    { return this.req(`/api/courses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },
  deleteCourse(id)          { return this.req(`/api/courses/${id}`, { method: 'DELETE' }); },
  reorderCourses(orderedIds){ return this.req('/api/courses/reorder', { method: 'POST', body: JSON.stringify({ orderedIds }) }); },
  setCourseStatus(id, status){ return this.req(`/api/courses/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }); },
  getGrades(courseId)       { return this.req(`/api/courses/${courseId}/grades`); },

  // Exam prompt generation
  getExamPrompt(courseId, scope, week)  { return this.req(`/api/courses/${courseId}/exam-prompt?scope=${scope}&week=${week}`); },
  getFinalExamPrompt(courseId)          { return this.req(`/api/courses/${courseId}/final-exam-prompt`); },

  // Modules
  listModules(courseId)          { return this.req(`/api/courses/${courseId}/modules`); },
  createModule(courseId, data)   { return this.req(`/api/courses/${courseId}/modules`, { method: 'POST', body: JSON.stringify(data) }); },
  bulkModules(courseId, data)    { return this.req(`/api/courses/${courseId}/modules/bulk`, { method: 'POST', body: JSON.stringify(data) }); },
  updateModule(id, data)         { return this.req(`/api/modules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },
  addTime(id, seconds)           { return this.req(`/api/modules/${id}/time`, { method: 'POST', body: JSON.stringify({ seconds }) }); },
  deleteModule(id)               { return this.req(`/api/modules/${id}`, { method: 'DELETE' }); },
  duplicateModule(id, data)      { return this.req(`/api/modules/${id}/duplicate`, { method: 'POST', body: JSON.stringify(data) }); },

  // Notes
  getNote(moduleId)            { return this.req(`/api/modules/${moduleId}/note`); },
  saveNote(moduleId, content)  { return this.req(`/api/modules/${moduleId}/note`, { method: 'PUT', body: JSON.stringify({ content }) }); },
  downloadNoteUrl(moduleId)    { return `/api/modules/${moduleId}/note/download`; },
  saveNoteToObsidian(moduleId) { return this.req(`/api/modules/${moduleId}/note/obsidian`, { method: 'POST' }); },

  // Exams
  getExam(moduleId)                          { return this.req(`/api/modules/${moduleId}/exam`); },
  generateExam(moduleId)                     { return this.req(`/api/modules/${moduleId}/exam/generate`, { method: 'POST' }); },
  unlockExam(moduleId)                       { return this.req(`/api/modules/${moduleId}/exam/unlock`, { method: 'POST' }); },
  pasteExam(moduleId, content)               { return this.req(`/api/modules/${moduleId}/exam/paste`, { method: 'POST', body: JSON.stringify({ content }) }); },
  gradeExam(moduleId, score, total, notes)   { return this.req(`/api/modules/${moduleId}/exam/grade`, { method: 'POST', body: JSON.stringify({ score, total, notes }) }); },

  // Stickers
  listStickers(courseId)          { return this.req(`/api/courses/${courseId}/stickers`); },
  createSticker(courseId, data)   { return this.req(`/api/courses/${courseId}/stickers`, { method: 'POST', body: JSON.stringify(data) }); },
  updateSticker(id, data)         { return this.req(`/api/stickers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },
  deleteSticker(id)               { return this.req(`/api/stickers/${id}`, { method: 'DELETE' }); },
  clearStickers(courseId)         { return this.req(`/api/courses/${courseId}/stickers`, { method: 'DELETE' }); },

  // External courses
  listExternals()             { return this.req('/api/externals'); },
  createExternal(data)        { return this.req('/api/externals', { method: 'POST', body: JSON.stringify(data) }); },
  updateExternal(id, data)    { return this.req(`/api/externals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },
  deleteExternal(id)          { return this.req(`/api/externals/${id}`, { method: 'DELETE' }); },

  // Ghost courses (cronograma)
  listGhosts()            { return this.req('/api/ghosts'); },
  createGhost(data)       { return this.req('/api/ghosts', { method: 'POST', body: JSON.stringify(data) }); },
  updateGhost(id, data)   { return this.req(`/api/ghosts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },
  deleteGhost(id)         { return this.req(`/api/ghosts/${id}`, { method: 'DELETE' }); },
  promoteGhost(id)        { return this.req(`/api/ghosts/${id}/promote`, { method: 'POST' }); },

  // Global calendar
  globalCalendar() { return this.req('/api/calendar/global'); },

  // Skills (Graph)
  listSkills()                       { return this.req('/api/skills'); },
  createSkill(data)                  { return this.req('/api/skills', { method: 'POST', body: JSON.stringify(data) }); },
  updateSkill(id, data)              { return this.req(`/api/skills/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },
  deleteSkill(id)                    { return this.req(`/api/skills/${id}`, { method: 'DELETE' }); },
  connectSkill(id, skillId, strength){ return this.req(`/api/skills/${id}/connect`, { method: 'POST', body: JSON.stringify({ skillId, strength }) }); },
  disconnectSkill(id, skillId)       { return this.req(`/api/skills/${id}/disconnect`, { method: 'POST', body: JSON.stringify({ skillId }) }); },

  // Upload
  async upload(file) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Error subiendo archivo');
    return res.json();
  },

  // Friends / Co-learning
  friendsMe()                   { return this.req('/api/friends/me'); },
  friendsUpdateMe(data)         { return this.req('/api/friends/me', { method: 'PATCH', body: JSON.stringify(data) }); },
  listFriends()                 { return this.req('/api/friends'); },
  friendsInvite()               { return this.req('/api/friends/invite', { method: 'POST' }); },
  friendsAccept(token, data)    { return this.req(`/api/friends/accept/${token}`, { method: 'POST', body: JSON.stringify(data) }); },
  friendFromAccept(data)        { return this.req('/api/friends/from-accept', { method: 'POST', body: JSON.stringify(data) }); },
  updateFriend(id, data)        { return this.req(`/api/friends/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },
  removeFriend(id)              { return this.req(`/api/friends/${id}`, { method: 'DELETE' }); },
  blockFriend(id)               { return this.req(`/api/friends/${id}/block`, { method: 'POST' }); },
  pokeFriend(id, data)          { return this.req(`/api/friends/${id}/poke`, { method: 'POST', body: JSON.stringify(data) }); },
  friendsBroadcast(type, payload) { return this.req('/api/friends/broadcast', { method: 'POST', body: JSON.stringify({ type, payload }) }); },
};
