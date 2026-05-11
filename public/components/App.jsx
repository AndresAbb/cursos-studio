function App() {
  React.useEffect(() => {
    if (typeof window.appBoot === 'function') window.appBoot();
  }, []);

  return (
    <React.Fragment>
      <Topbar />
      <Sidebar />
      <div id="sticker-canvas"></div>
      <main id="main">
        <HomeView />
        <CourseView />
        <GlobalCalendarView />
      </main>
      <PlayerOverlay />
      <StickerPanel />
      <div id="del-zone">🗑 Suelta para eliminar</div>
      <div id="toast"></div>
      <div id="modal-root"></div>
    </React.Fragment>
  );
}

const _root = ReactDOM.createRoot(document.getElementById('root'));
_root.render(<App />);
