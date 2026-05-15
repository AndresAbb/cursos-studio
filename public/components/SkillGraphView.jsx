function SkillGraphView() {
  return (
    <section id="graph-view" className="view" style={{ display: 'none' }}>
      <div className="cv-header">
        <button className="btn btn-outline btn-sm" id="grv-back">← Volver</button>
        <h2 className="cv-title">🕸 Grafo de Habilidades</h2>
        <div className="graph-toolbar" style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="hint" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            Layout
            <select id="graph-layout" className="select-sm">
              <option value="free">Libre (arrastrar)</option>
              <option value="axes">Por ejes</option>
              <option value="force">Fuerza (conexiones)</option>
            </select>
          </label>
          <label className="hint" id="graph-axis-x-wrap" style={{ display: 'none', alignItems: 'center', gap: '4px' }}>
            X
            <select id="graph-axis-x" className="select-sm">
              <option value="careerValue">Valor profesional</option>
              <option value="personalPull">Atracción personal</option>
              <option value="technical">Técnico</option>
              <option value="difficulty">Dificultad</option>
            </select>
          </label>
          <label className="hint" id="graph-axis-y-wrap" style={{ display: 'none', alignItems: 'center', gap: '4px' }}>
            Y
            <select id="graph-axis-y" className="select-sm">
              <option value="careerValue">Valor profesional</option>
              <option value="personalPull">Atracción personal</option>
              <option value="technical">Técnico</option>
              <option value="difficulty">Dificultad</option>
            </select>
          </label>
          <button className="btn btn-primary btn-sm" id="graph-new-skill">＋ Habilidad</button>
        </div>
      </div>
      <p className="hint">
        Tus habilidades como puntos en un mapa. Tamaño = conocimiento previo · Brillo = curso en progreso · Líneas = relaciones que tú defines.
      </p>
      <div className="graph-stage" id="graph-stage">
        <canvas id="graph-canvas"></canvas>
        <div className="graph-empty" id="graph-empty" style={{ display: 'none' }}>
          <div className="ge-icon">🕸</div>
          <div>Aún no hay habilidades en el grafo</div>
          <div className="ge-sub">
            Crea tu primera con <b>＋ Habilidad</b>, asígnale ejes y vincúlala<br/>
            a uno o varios cursos para verla brillar mientras la estudias.
          </div>
        </div>
        <div className="graph-legend" id="graph-legend"></div>
      </div>
    </section>
  );
}
