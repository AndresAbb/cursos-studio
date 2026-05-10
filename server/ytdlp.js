// Wrapper sobre yt-dlp para extraer items reales de una playlist
const { spawn } = require('child_process');
const which = (cmd) => new Promise((res) => {
  const p = spawn(process.platform === 'win32' ? 'where' : 'which', [cmd]);
  p.on('close', code => res(code === 0));
  p.on('error', () => res(false));
});

async function isAvailable() {
  return which('yt-dlp');
}

// Extrae lista de items de una playlist de YouTube usando yt-dlp.
// Devuelve [{ title, url, id, duration }]
function fetchPlaylist(playlistUrl, opts = {}) {
  const limit = opts.limit || 50;
  return new Promise((resolve, reject) => {
    const args = [
      '--flat-playlist',
      '--print', '%(id)s|%(title)s|%(duration)s',
      '--playlist-end', String(limit),
      '--no-warnings',
      '--skip-download',
      playlistUrl,
    ];
    const p = spawn('yt-dlp', args, { timeout: 60000 });
    let stdout = '', stderr = '';
    p.stdout.on('data', d => stdout += d);
    p.stderr.on('data', d => stderr += d);
    p.on('error', err => reject(new Error('yt-dlp no encontrado o falló: ' + err.message)));
    p.on('close', code => {
      if (code !== 0) return reject(new Error(`yt-dlp salió con código ${code}: ${stderr.slice(0,300)}`));
      const items = stdout.trim().split('\n').filter(Boolean).map(line => {
        const [id, title, duration] = line.split('|');
        return {
          id,
          title: (title || `Video ${id}`).trim(),
          url: `https://www.youtube.com/watch?v=${id}`,
          duration: parseInt(duration) || 0,
        };
      });
      resolve(items);
    });
  });
}

module.exports = { isAvailable, fetchPlaylist };
