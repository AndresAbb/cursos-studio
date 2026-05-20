function HomeView() {
  return (
    <section id="home-view" className="view">
      <div id="hero-dynamic" className="hero-dynamic">
        <div className="hero-meta">
          <span className="hero-day"     id="hero-day"></span>
          <span className="hero-time"    id="hero-time"></span>
        </div>
        <p className="hero-text" id="hero-greeting">Hola</p>
        <p className="hero-quote" id="hero-quote"></p>
        <p className="hero-quote-author" id="hero-quote-author"></p>
      </div>
      <div className="home-actions">
        <button className="btn btn-primary" id="hero-cta">✨ Crear curso</button>
        <button className="btn btn-outline" id="hero-cta-external">🌐 Curso externo</button>
        <button className="btn btn-outline" id="hero-cta-ghost">🌱 Curso fantasma</button>
      </div>

      <div className="crono-block">
        <div className="crono-headerbar">
          <h3 className="section-title" style={{ margin: 0 }}>📆 Cronograma</h3>
          <div className="crono-controls">
            <div className="crono-scale">
              <button className="crono-scale-btn on" data-scale="weeks">Semanas</button>
              <button className="crono-scale-btn"    data-scale="months">Meses</button>
            </div>
            <div className="crono-nav">
              <button className="btn btn-outline btn-sm" id="crono-prev">‹</button>
              <button className="btn btn-outline btn-sm" id="crono-today">Hoy</button>
              <button className="btn btn-outline btn-sm" id="crono-next">›</button>
            </div>
          </div>
        </div>
        <div id="crono-body"></div>
      </div>

      <h3 className="section-title">Mis cursos</h3>
      <p className="hint" id="courses-reorder-hint" style={{ marginTop: '-8px', marginBottom: '8px', display: 'none' }}>
        Arrastra una tarjeta para reordenarla.
      </p>
      <div className="courses-grid" id="courses-grid"></div>

      <details id="archived-details" className="archived-details" style={{ display: 'none' }}>
        <summary className="section-title archived-summary">
          <span>Archivados</span>
          <span className="archived-count" id="archived-count"></span>
        </summary>
        <div className="courses-grid archived-grid" id="archived-grid"></div>
      </details>

      <h3 className="section-title">Externos</h3>
      <div className="courses-grid" id="externals-grid"></div>
    </section>
  );
}
