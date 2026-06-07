function NetworkView() {
  return (
    <section id="network-view" className="view" style={{ display: 'none' }}>
      <div className="cv-header">
        <button className="btn btn-outline btn-sm" id="ntw-back">← Volver</button>
        <h2 className="cv-title">🌐 Red de Mundos</h2>
        <div className="graph-toolbar" style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" id="ntw-new-node">＋ Mundo</button>
        </div>
      </div>
      <p className="hint">
        Tus mundos de crecimiento como nodos conectados a ti. Pasa el cursor sobre un mundo para ver sus proyectos · clic para gestionarlos · arrastra para reorganizar.
      </p>
      <div className="graph-stage" id="network-stage">
        <canvas id="network-canvas"></canvas>
        <div className="graph-empty" id="network-empty" style={{ display: 'none' }}>
          <div className="ge-icon">🌐</div>
          <div>No hay mundos en tu red todavía</div>
          <div className="ge-sub">
            Crea uno con <b>＋ Mundo</b> y registra dentro<br/>
            tus proyectos potenciales de crecimiento.
          </div>
        </div>
        <div className="net-tooltip" id="network-tooltip"></div>
        <div className="graph-legend" id="network-legend"></div>
      </div>
    </section>
  );
}
