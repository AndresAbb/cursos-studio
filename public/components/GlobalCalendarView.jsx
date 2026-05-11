function GlobalCalendarView() {
  return (
    <section id="global-cal-view" className="view" style={{ display: 'none' }}>
      <div className="cv-header">
        <button className="btn btn-outline btn-sm" id="gcv-back">← Volver</button>
        <h2 className="cv-title">📅 Calendario Global</h2>
        <div className="cal-nav" style={{ marginLeft: 'auto' }}>
          <button className="btn btn-outline btn-sm" id="gcal-prev">‹</button>
          <button className="btn btn-outline btn-sm" id="gcal-next">›</button>
          <h3
            id="gweek-label"
            style={{ fontFamily: "'Fraunces',serif", fontSize: '18px', minWidth: '200px' }}
          ></h3>
          <button className="btn btn-outline btn-sm" id="gcal-today">Hoy</button>
        </div>
      </div>
      <p className="hint">
        Vista unificada: módulos de todos tus cursos + cursos externos recurrentes.
      </p>
      <div className="cal-grid" id="gcal-grid"></div>
    </section>
  );
}
