export default async function handler(req, res) {
  if (req.url && req.url.startsWith('/api/ping')) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: true, node: process.version }));
  }
  try {
    const mod = await import('./_server.mjs');
    return mod.default(req, res);
  } catch (err) {
    console.error('API failed to load:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'API_LOAD_FAILED', message: String((err && err.message) || err).slice(0, 2000) }));
  }
}
