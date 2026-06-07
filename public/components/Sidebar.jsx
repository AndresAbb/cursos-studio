function Sidebar() {
  return (
    <aside id="sidebar">
      <div className="sb-label">Mis Cursos</div>
      <div id="sb-courses"></div>
      <div className="sep"></div>
      <div className="sb-label">Cursos Externos</div>
      <div id="sb-externals"></div>
      <div className="sep"></div>
      <div className="sb-label">Herramientas</div>
      <div className="sb-item" id="nav-home">🏠 Inicio</div>
      <div className="sb-item" id="nav-global-cal">📅 Calendario global</div>
      <div className="sb-item" id="nav-graph">🕸 Grafo de habilidades</div>
      <div className="sb-item" id="nav-network">🌐 Red de mundos</div>
      <div className="sb-item" id="nav-cards">🃏 Mazo de Cartas</div>
      <div className="sb-item" id="nav-new">➕ Nuevo curso</div>
      <div className="sb-item" id="nav-new-external">🌐 Curso externo</div>
    </aside>
  );
}
