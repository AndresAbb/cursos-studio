function PlayerOverlay() {
  return (
    <div id="player">
      <div className="pl-main">
        <div className="pl-topbar">
          <button className="btn btn-dark btn-sm" id="pl-close">✕</button>
          <div className="pl-title" id="pl-title"></div>
          <div className="pl-timer" id="pl-timer">⏱ 0:00</div>
          <button className="btn btn-dark btn-sm" id="pl-timer-btn">⏸</button>
          <button className="btn btn-dark btn-sm" id="pl-duplicate" title="Duplicar a otra fecha">
            ⎘
          </button>
          <button className="btn btn-dark btn-sm" id="pl-delete-mod" title="Eliminar este módulo">
            🗑
          </button>
          <button className="btn btn-primary btn-sm" id="pl-mark-done">✅ Visto</button>
        </div>
        <div className="pl-embed" id="pl-embed"></div>
        <div className="pl-foot">
          <span id="pl-meta"></span>
        </div>
      </div>
      <aside className="pl-note-panel">
        <div className="pl-note-head">
          📝 Apuntes
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn btn-outline btn-sm" id="pl-preview">👁</button>
            <button className="btn btn-outline btn-sm" id="pl-save-md" title="Descargar .md">
              💾
            </button>
            <button className="btn btn-primary btn-sm" id="pl-save-obsidian" title="Guardar a Obsidian">
              📓
            </button>
          </div>
        </div>
        <div className="pl-note-body">
          <textarea
            id="note-editor"
            placeholder={"# Apuntes\n\nMarkdown soportado…"}
          ></textarea>
          <div className="note-preview md" id="note-preview"></div>
        </div>
        <div className="note-foot">
          <span className="hint" id="note-hint">Auto-guardado</span>
          <button className="btn btn-outline btn-sm" id="pl-copy-md">Copiar</button>
        </div>
      </aside>
    </div>
  );
}
