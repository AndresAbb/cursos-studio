function HomeView() {
  return (
    <section id="home-view" className="view">
      <p className="hero-text">Aprende con<br /><em>intención.</em></p>
      <p className="hero-sub">
        Organiza YouTube, Spotify, sitios web, textos y exámenes IA en cursos con calendario propio.
      </p>
      <div className="home-actions">
        <button className="btn btn-primary" id="hero-cta">✨ Crear curso</button>
        <button className="btn btn-outline" id="hero-cta-external">🌐 Curso externo</button>
      </div>
      <h3 className="section-title">Mis cursos</h3>
      <div className="courses-grid" id="courses-grid"></div>
      <h3 className="section-title">Externos</h3>
      <div className="courses-grid" id="externals-grid"></div>
    </section>
  );
}
