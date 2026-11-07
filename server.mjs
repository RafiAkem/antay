// Server lokal Antay: menyajikan halaman dan meneruskan frame kamera ke Jev (TypeSafe).
// API key hanya ada di server (.env), tidak pernah dikirim ke browser.
// Jalankan: node server.mjs  lalu buka http://localhost:4173
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT || 4173);
const MAX_FRAME = 4 * 1024 * 1024;

const envPath = join(ROOT, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const KEY = process.env.TYPESAFE_API_KEY;

// Pertanyaan untuk Jev. Bahasa Inggris dipakai karena dukungan bahasa Indonesia belum didokumentasikan.
// Jev tidak dipakai untuk menghitung orang (dokumentasinya: tidak andal untuk counting); hitungan tetap dari COCO-SSD.
const QUESTIONS = {
  // Penyaring: tanpa ini Jev bisa menilai "padat" pada gambar yang tidak berisi orang sama sekali.
  people: {
    type: 'noul',
    instructions: 'Is this a real camera photo that shows one or more people?',
  },
  density: {
    type: 'score',
    instructions: 'Camera frame of the waiting area in front of a ticket exchange counter inside a shopping mall. How crowded is the queue area?',
    criteria: [
      'Empty: nobody is waiting',
      'Light: a few people, the line moves freely',
      'Moderate: a steady line, still orderly with open space around it',
      'Crowded: a long, dense line with little open space left',
      'Overflowing: people packed beyond the waiting area or blocking walkways',
    ],
  },
  overflow: {
    type: 'noul',
    instructions: 'Does the queue or crowd spill beyond the intended waiting area, or block a walkway, escalator, or shop entrance?',
  },
  fallen: {
    type: 'noul',
    instructions: 'Is any person lying or fallen on the floor in this frame?',
  },
};

async function askJev(jpeg) {
  const form = new FormData();
  form.append('request', new Blob([JSON.stringify({
    model: 'jev-preview',
    state: 'frame',
    questions: QUESTIONS,
    assets: { frame: { type: 'image', part: 'frame_img' } },
  })], { type: 'application/json' }));
  form.append('frame_img', new Blob([jpeg], { type: 'image/jpeg' }), 'frame.jpg');
  const t0 = Date.now();
  const res = await fetch('https://api.typesafe.ai/v1/systemone', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'TypeSafe-Danger-Zone-Images': 'true' },
    body: form,
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  if (!res.ok) throw Object.assign(new Error(`Jev menolak permintaan (HTTP ${res.status}): ${text.slice(0, 300)}`), { status: res.status });
  const data = JSON.parse(text);
  const d = data.answers.density, people = data.answers.people.noul;
  // Level = tingkat dengan probabilitas tertinggi; dipaksa 0 (kosong) kalau Jev tidak melihat orang.
  const top = Number(Object.entries(d.probabilities).sort((a, b) => b[1] - a[1])[0][0]);
  return {
    model: data.model,
    ms: Date.now() - t0,
    people,
    density: { score: d.score, level: people < 0.5 ? 0 : top, confidence: d.confidence, probabilities: d.probabilities },
    overflow: data.answers.overflow.noul,
    fallen: data.answers.fallen.noul,
    usage: data.usage,
  };
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(Object.assign(new Error('Frame terlalu besar'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const send = (res, status, body, type = 'application/json; charset=utf-8') => {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/loket-pintar.html')) {
      return send(res, 200, await readFile(join(ROOT, 'loket-pintar.html')), 'text/html; charset=utf-8');
    }
    if (req.method === 'GET' && url.pathname === '/api/jev-status') return send(res, 200, { enabled: Boolean(KEY) });
    if (req.method === 'POST' && url.pathname === '/api/jev-antrean') {
      if (!KEY) return send(res, 503, { error: 'TYPESAFE_API_KEY belum diisi di .env' });
      if (!(req.headers['content-type'] || '').startsWith('image/jpeg')) return send(res, 415, { error: 'Kirim frame sebagai image/jpeg' });
      const jpeg = await readBody(req, MAX_FRAME);
      return send(res, 200, await askJev(jpeg));
    }
    // Hanya halaman dan API di atas yang disajikan, supaya .env dan file lain tidak bisa diambil.
    send(res, 404, { error: 'Tidak ditemukan' });
  } catch (e) {
    send(res, e.status && e.status < 500 ? e.status : 502, { error: e.message });
  }
}).listen(PORT, () => console.log(`Antay jalan di http://localhost:${PORT} (Jev ${KEY ? 'aktif' : 'nonaktif: isi TYPESAFE_API_KEY di .env'})`));
