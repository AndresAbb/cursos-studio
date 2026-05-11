function StickerPanel() {
  return (
    <aside id="stk-panel">
      <h3>🎨 Decorar</h3>
      <div className="stk-tabs">
        <button className="stk-tab on" data-tab="emoji">Emoji</button>
        <button className="stk-tab" data-tab="text">Texto</button>
        <button className="stk-tab" data-tab="img">Imagen</button>
        <button className="stk-tab" data-tab="bg">Fondo</button>
      </div>

      <div className="stk-form" data-pane="emoji">
        <div className="sec-label">Emoji</div>
        <div className="emoji-grid" id="emoji-grid"></div>
        <div className="sec-label">Movimiento</div>
        <select className="stk-select" id="e-category">
          <option value="fixed">🔒 Fijo</option>
          <option value="globo">🎈 Globo (flota)</option>
          <option value="rueda">🌀 Rueda (gira)</option>
          <option value="carta">🃏 Carta (flip)</option>
          <option value="candelabro">🕯 Lámpara colgante</option>
        </select>
        <div className="sec-label">Tamaño</div>
        <input type="range" id="e-size" min="20" max="80" defaultValue="44" />
        <button className="btn btn-primary" id="add-emoji-stk">Agregar</button>
      </div>

      <div className="stk-form" data-pane="text" style={{ display: 'none' }}>
        <div className="sec-label">Texto</div>
        <input id="t-val" placeholder="Escribe…" />
        <div className="sec-label">Estilo</div>
        <select className="stk-select" id="t-style">
          <option value="plain">Sin fondo</option>
          <option value="postit">📌 Post-it</option>
          <option value="border">▣ Con borde</option>
        </select>
        <div className="sec-label">Fuente</div>
        <select className="stk-select" id="t-font">
          <option value="Caveat">Caveat</option>
          <option value="Patrick Hand">Patrick Hand</option>
          <option value="Architects Daughter">Architects Daughter</option>
          <option value="Shadows Into Light">Shadows Into Light</option>
          <option value="Permanent Marker">Permanent Marker</option>
          <option value="Kalam">Kalam</option>
          <option value="Indie Flower">Indie Flower</option>
          <option value="Fraunces">Fraunces</option>
        </select>
        <div className="sec-label">Tamaño</div>
        <input type="range" id="t-size" min="14" max="64" defaultValue="32" />
        <div className="sec-label">Color</div>
        <div className="swatch-row" id="txt-colors"></div>
        <div className="sec-label">Movimiento</div>
        <select className="stk-select" id="t-category">
          <option value="fixed">🔒 Fijo</option>
          <option value="globo">🎈 Globo</option>
          <option value="rueda">🌀 Rueda</option>
          <option value="carta">🃏 Carta</option>
          <option value="candelabro">🕯 Lámpara</option>
        </select>
        <button className="btn btn-primary" id="add-text-stk">Agregar</button>
      </div>

      <div className="stk-form" data-pane="img" style={{ display: 'none' }}>
        <div className="sec-label">Imagen (PNG transparente OK)</div>
        <input type="file" id="img-file" accept="image/*" />
        <div className="sec-label">Movimiento</div>
        <select className="stk-select" id="i-category">
          <option value="fixed">🔒 Fijo</option>
          <option value="globo">🎈 Globo</option>
          <option value="rueda">🌀 Rueda</option>
          <option value="carta">🃏 Carta</option>
          <option value="candelabro">🕯 Lámpara</option>
        </select>
        <button className="btn btn-primary" id="add-img-stk">Agregar</button>
      </div>

      <div className="stk-form" data-pane="bg" style={{ display: 'none' }}>
        <div className="sec-label">Color</div>
        <div className="bg-grid" id="bg-grid"></div>
        <div className="sec-label">Imagen</div>
        <input type="file" id="bg-file" accept="image/*" />
        <button className="btn btn-primary btn-sm" id="apply-bg-img">Aplicar</button>
      </div>

      <div className="sep"></div>
      <button className="btn btn-sm btn-danger" id="clear-stickers">🗑 Limpiar todos</button>
      <p className="hint" style={{ marginTop: '10px' }}>
        Arrastra para mover. Suelta en la zona roja para borrar.
      </p>
    </aside>
  );
}
