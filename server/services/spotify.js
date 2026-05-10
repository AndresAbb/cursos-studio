// Spotify Web API: client_credentials flow
// Permite extraer tracks de playlists y episodios de podcasts.
// Requiere SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET en .env

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';

let cachedToken = null;
let tokenExp = 0;

function isConfigured() {
  return !!(CLIENT_ID && CLIENT_SECRET);
}

async function getToken() {
  if (cachedToken && Date.now() < tokenExp - 30000) return cachedToken;
  if (!isConfigured()) throw new Error('SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET no configurados en .env');

  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`Spotify token: HTTP ${res.status}`);
  const json = await res.json();
  cachedToken = json.access_token;
  tokenExp = Date.now() + (json.expires_in * 1000);
  return cachedToken;
}

async function spotifyGet(pathOrUrl) {
  const token = await getToken();
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `https://api.spotify.com/v1${pathOrUrl}`;
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Spotify API: HTTP ${res.status}`);
  return res.json();
}

// Detecta tipo y ID de URL de Spotify
// Soporta: /playlist/ID, /show/ID, /album/ID, /track/ID, /episode/ID
function parseSpotifyUrl(url) {
  const m = url.match(/spotify\.com\/(?:embed\/)?(playlist|show|album|track|episode)\/([a-zA-Z0-9]+)/);
  if (!m) return null;
  return { kind: m[1], id: m[2] };
}

// Extrae items de una playlist, show (podcast), o álbum
async function fetchItems(url, limitTotal = 50) {
  const parsed = parseSpotifyUrl(url);
  if (!parsed) throw new Error('URL de Spotify no válida');

  const { kind, id } = parsed;
  const items = [];
  let next;

  if (kind === 'playlist') {
    next = `/playlists/${id}/tracks?limit=50&fields=next,items(track(id,name,external_urls,duration_ms))`;
  } else if (kind === 'show') {
    next = `/shows/${id}/episodes?limit=50&market=US`;
  } else if (kind === 'album') {
    next = `/albums/${id}/tracks?limit=50`;
  } else if (kind === 'track' || kind === 'episode') {
    // Single item
    const data = await spotifyGet(`/${kind}s/${id}`);
    return [{
      id: data.id,
      title: data.name,
      url: data.external_urls?.spotify || url,
      duration: Math.floor((data.duration_ms || 0) / 1000),
    }];
  }

  while (next && items.length < limitTotal) {
    const data = await spotifyGet(next);
    const list = data.items || [];
    for (const it of list) {
      const t = it.track || it; // playlist usa it.track, otros it directo
      if (!t || !t.id) continue;
      items.push({
        id: t.id,
        title: t.name || `Item ${items.length + 1}`,
        url: t.external_urls?.spotify || `https://open.spotify.com/${kind === 'show' ? 'episode' : 'track'}/${t.id}`,
        duration: Math.floor((t.duration_ms || 0) / 1000),
      });
      if (items.length >= limitTotal) break;
    }
    next = data.next;
  }

  return items;
}

module.exports = { isConfigured, fetchItems, parseSpotifyUrl };
