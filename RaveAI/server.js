const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = process.env.PORT || 4173;
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
let cachedModel;

async function askGemini(messages, mode) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const contents = messages.map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] }));
  if (!cachedModel) {
    const modelResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!modelResponse.ok) throw new Error(`Gemini model list failed (${modelResponse.status})`);
    const modelData = await modelResponse.json();
    const availableModels = (modelData.models || []).filter((item) => item.supportedGenerationMethods?.includes('generateContent'));
    const requestedModel = process.env.GEMINI_MODEL ? `models/${process.env.GEMINI_MODEL.replace(/^models\//, '')}` : null;
    const selectedModel = availableModels.find((item) => item.name === requestedModel)
      || availableModels.find((item) => /gemini-3\.6-flash/i.test(item.name))
      || availableModels.find((item) => /flash/i.test(item.name) && !/embedding|vision/i.test(item.name))
      || availableModels.find((item) => /pro/i.test(item.name) && !/embedding/i.test(item.name))
      || availableModels[0];
    if (!selectedModel) throw new Error('Tidak ada model Gemini yang mendukung generateContent untuk API key ini.');
    cachedModel = selectedModel.name;
  }
  const model = cachedModel;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: `You are RaveAI, a helpful assistant created by Araffi Refliano. If asked who created or made you, clearly say that you were created by Araffi Refliano. Reply in the user's language. Current mode: ${mode}. Be accurate, concise, and use Markdown when useful.` }] }, contents, generationConfig: { temperature: mode === 'Deep' ? 0.55 : 0.7 } }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${detail.slice(0, 180)}`);
  }
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || 'Model tidak mengembalikan jawaban.';
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  response.end(JSON.stringify(payload));
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') { response.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }); response.end(); return; }
  if (request.method === 'POST' && request.url === '/api/chat') {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', async () => {
      try {
        const input = JSON.parse(body || '{}');
        if (!input.prompt?.trim()) return sendJson(response, 400, { error: 'Prompt wajib diisi.' });
        const answer = await askGemini(input.messages?.length ? input.messages : [{ role: 'user', content: input.prompt }], input.mode || 'Fast');
        if (!answer) return sendJson(response, 503, { error: 'AI belum aktif. Tambahkan GEMINI_API_KEY di environment server RaveAI.' });
        sendJson(response, 200, { answer });
      } catch (error) { sendJson(response, 500, { error: error.message || 'Gagal menghubungi AI.' }); }
    });
    return;
  }
  const requested = request.url === '/' ? '/index.html' : request.url.split('?')[0];
  const filePath = path.normalize(path.join(root, requested));
  if (!filePath.startsWith(root)) { response.writeHead(403); response.end('Forbidden'); return; }
  fs.readFile(filePath, (error, content) => {
    if (error) { response.writeHead(404); response.end('Not found'); return; }
    response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' }); response.end(content);
  });
});

server.listen(port, '0.0.0.0', () => console.log(`RaveAI server running at http://localhost:${port}`));
