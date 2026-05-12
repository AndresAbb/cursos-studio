const Notes = {
  currentModuleId: null,
  saveTimer: null,
  isPreview: false,

  async load(moduleId) {
    this.currentModuleId = moduleId;
    this.isPreview = false;
    try {
      const note = await API.getNote(moduleId);
      const editor = $('note-editor');
      const preview = $('note-preview');
      editor.value = note.content || '';
      editor.style.display = '';
      preview.style.display = 'none';
      $('pl-preview').textContent = '👁';
      // Mostrar si está vinculado a Obsidian
      if (note.obsidianPath) {
        $('note-hint').textContent = `📓 ${note.obsidianPath}`;
      } else if (State.settings?.obsidianAutoSave) {
        $('note-hint').textContent = 'Auto-guardado · Obsidian on';
      } else {
        $('note-hint').textContent = 'Auto-guardado';
      }
    } catch (err) {
      console.error(err);
      $('note-editor').value = '';
    }
  },

  setupAutoSave() {
    $('note-editor').addEventListener('input', () => {
      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => this.autoSave(), 1000);
    });
  },

  async autoSave() {
    if (!this.currentModuleId) return;
    try {
      await API.saveNote(this.currentModuleId, $('note-editor').value);
    } catch (err) { console.error(err); }
  },

  downloadMD() {
    if (!this.currentModuleId) return;
    this.autoSave().then(() => {
      const url = API.downloadNoteUrl(this.currentModuleId);
      const a = document.createElement('a');
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast('💾 Descargado');
    });
  },

  async saveToObsidian() {
    if (!this.currentModuleId) return;
    if (!State.settings?.obsidianVaultPath) {
      toast('Configura el path del vault de Obsidian en ⚙️');
      return Settings.open();
    }
    try {
      await this.autoSave();
      const r = await API.saveNoteToObsidian(this.currentModuleId);
      $('note-hint').textContent = `📓 ${r.relative}`;
      toast('📓 Guardado en carpeta');
    } catch (err) { toast('❌ ' + err.message); }
  },

  copyMD() {
    const txt = $('note-editor').value;
    if (!txt) return toast('Vacío');
    navigator.clipboard?.writeText(txt).then(() => toast('📋 Copiado'), () => toast('No se pudo copiar'));
  },

  togglePreview() {
    const editor = $('note-editor');
    const preview = $('note-preview');
    this.isPreview = !this.isPreview;
    if (this.isPreview) {
      preview.innerHTML = mdParse(editor.value);
      preview.style.display = '';
      editor.style.display = 'none';
      $('pl-preview').textContent = '✏️';
    } else {
      preview.style.display = 'none';
      editor.style.display = '';
      $('pl-preview').textContent = '👁';
    }
  },

  init() {
    this.setupAutoSave();
    $('pl-save-md').addEventListener('click', () => this.downloadMD());
    $('pl-save-obsidian').addEventListener('click', () => this.saveToObsidian());
    $('pl-copy-md').addEventListener('click', () => this.copyMD());
    $('pl-preview').addEventListener('click', () => this.togglePreview());
  },
};
