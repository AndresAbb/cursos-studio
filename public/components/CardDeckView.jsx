function CardDeckView() {
  return (
    <section id="cards-view" className="view" style={{ display: 'none' }}>
      <div className="cv-header">
        <button className="btn btn-outline btn-sm" id="cards-back">← Volver</button>
        <h2 className="cv-title">🃏 Mazo de Cartas</h2>
      </div>
      <p id="cards-progress" className="hint" style={{ marginBottom: '12px' }}></p>
      <div id="cards-lock-banner" className="cards-lock-banner" style={{ display: 'none' }}>
        <span style={{ fontSize: '20px' }}>🔒</span>
        <span>Completa todos los módulos programados para hoy y desbloquea el mazo.</span>
      </div>
      <div className="cards-grid" id="cards-grid"></div>
      <div className="cards-empty" id="cards-empty" style={{ display: 'none' }}>
        <div style={{ fontSize: '3rem' }}>🃏</div>
        <p>Crea habilidades en el <b>Grafo</b> para verlas aquí como cartas.</p>
      </div>
    </section>
  );
}
