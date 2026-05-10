// Verifica si un sitio puede ser embebido en un iframe.
// Si rechaza embed (X-Frame-Options DENY/SAMEORIGIN o CSP frame-ancestors estricto),
// devuelve { canEmbed: false, favicon, title, domain } para usar como web-link.

async function checkEmbed(url, opts = {}) {
  const timeout = opts.timeout || 6000;
  let domain = '';
  try { domain = new URL(url).hostname; } catch { /* ignore */ }

  const result = {
    canEmbed: true,
    domain,
    favicon: domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '',
    title: '',
  };

  if (!domain) return result;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);

    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CursosStudio/1.0)' },
    });
    clearTimeout(t);

    // Headers que bloquean embed
    const xfo = (res.headers.get('x-frame-options') || '').toUpperCase();
    const csp = res.headers.get('content-security-policy') || '';
    if (xfo === 'DENY' || xfo === 'SAMEORIGIN') result.canEmbed = false;
    if (/frame-ancestors\s+'none'/i.test(csp)) result.canEmbed = false;
    if (/frame-ancestors\s+'self'/i.test(csp)) result.canEmbed = false;

    // Sitios conocidos que bloquean (lista breve, no exhaustiva)
    const knownBlock = [
      'youtube.com/watch', 'instagram.com', 'twitter.com', 'x.com',
      'facebook.com', 'linkedin.com', 'github.com', 'medium.com',
      'reddit.com', 'tiktok.com',
    ];
    if (knownBlock.some(d => url.includes(d))) result.canEmbed = false;

    // Title via regex barata sobre primeros KB
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html')) {
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let total = 0;
      while (total < 4096) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        total += value.length;
        const m = buf.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (m) { result.title = m[1].trim(); break; }
      }
      try { reader.cancel(); } catch {}
    }
  } catch (err) {
    // Si el fetch falla por CORS/timeout/red, asumimos que no se puede embeber por seguridad
    result.canEmbed = false;
  }

  return result;
}

module.exports = { checkEmbed };
