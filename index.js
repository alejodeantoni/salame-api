const express = require('express');
const https   = require('https');
const app     = express();
app.use(express.json());

const FIREBASE_HOST = 'salamesystem-2ec66-default-rtdb.firebaseio.com';
const FIREBASE_AUTH = 'Yd8XQupm9mK1PyMGBKJ876leiYbliYSDAmoIziIp';

// Función para hacer PATCH a Firebase desde el servidor (Node maneja TLS sin problema)
function firebasePatch(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const options = {
      hostname: FIREBASE_HOST,
      path:     `${path}.json?auth=${FIREBASE_AUTH}`,
      method:   'PATCH',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// POST /datos — recibe datos del Wemos por HTTP plano
app.post('/datos', async (req, res) => {
  const d = req.body;
  if (d.t === undefined || d.h === undefined) {
    return res.status(400).json({ error: 'faltan datos' });
  }

  const now   = Date.now();
  const tsKey = Math.floor(now / 1000);

  const payload = {
    'datos/actual': {
      t:  d.t,
      h:  d.h,
      e:  d.e  || false,
      x:  d.x  || false,
      st: d.st || 22,
      ht: d.ht || 1,
      sh: d.sh || 60,
      hh: d.hh || 5,
      ip: d.ip || '',
      up: d.up || 0,
      ts: tsKey
    },
    [`datos/historico/${tsKey}`]: {
      t:  d.t,
      h:  d.h,
      e:  d.e  || false,
      x:  d.x  || false,
      ts: tsKey
    }
  };

  try {
    const result = await firebasePatch('/', payload);
    console.log(`[${new Date().toISOString()}] T=${d.t} H=${d.h} E=${d.e} X=${d.x} → FB:${result.status}`);
    res.json({ ok: true, fb: result.status });
  } catch (err) {
    console.error('Firebase error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /ping — para que Render no duerma el servicio
app.get('/ping', (req, res) => res.json({ ok: true, ts: Date.now() }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SalameSystem API corriendo en puerto ${PORT}`));
