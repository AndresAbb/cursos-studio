function Topbar() {
  return (
    <header id="topbar">
      <h1>Cursos <span>Studio</span></h1>
      <div className="top-actions">
        <span id="db-status" className="db-status" title="Estado">●</span>
        <button className="btn btn-dark btn-sm" id="btn-decorate">🎨 Decorar</button>
        <button className="btn btn-dark btn-sm" id="btn-settings-open">⚙️</button>
        <button className="btn btn-primary btn-sm" id="btn-new-course">＋ Curso</button>
      </div>
    </header>
  );
}
