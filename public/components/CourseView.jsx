function CourseView() {
  return (
    <section id="course-view" className="view" style={{ display: 'none' }}>
      <div className="cv-header">
        <button className="btn btn-outline btn-sm" id="cv-back">← Volver</button>
        <h2 className="cv-title" id="cv-title"></h2>
        <div className="view-toggle">
          <button className="vbtn on" data-view="cal">📅 Calendario</button>
          <button className="vbtn" data-view="mod">📋 Módulos</button>
          <button className="vbtn" data-view="syllabus">§ Sílabo</button>
          <button className="vbtn" data-view="grades">📊 Notas</button>
        </div>
        <button className="btn btn-primary btn-sm" id="cv-add-module">＋ Módulo</button>
        <button className="btn btn-outline btn-sm" id="cv-settings">⚙️ Config</button>
      </div>

      {/* Calendar view */}
      <div id="cal-view">
        <div className="cal-nav">
          <button className="btn btn-outline btn-sm" id="cal-prev">‹</button>
          <button className="btn btn-outline btn-sm" id="cal-next">›</button>
          <h3 id="week-label"></h3>
          <button className="btn btn-outline btn-sm" id="cal-today">Hoy</button>
        </div>
        <div id="cal-section-label" className="cal-section-label" style={{ display: 'none' }}></div>
        <div className="cal-grid" id="cal-grid"></div>
      </div>

      {/* Module list view */}
      <div id="mod-view" style={{ display: 'none' }}>
        <div className="mod-list" id="mod-list"></div>
      </div>

      {/* Syllabus view */}
      <div id="syllabus-view" style={{ display: 'none' }}></div>

      {/* Grades view */}
      <div id="grades-view" style={{ display: 'none' }}>
        <div className="grades-header">
          <h3 className="grades-title">Calificaciones</h3>
          <button className="btn btn-outline btn-sm" id="btn-final-exam">
            🏁 Generar examen final
          </button>
        </div>
        <div className="grades-summary" id="grades-summary"></div>
        <table className="grades-table" id="grades-table"></table>
      </div>
    </section>
  );
}
