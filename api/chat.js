let cachedModel;

async function getModel(apiKey) {
  if (cachedModel) return cachedModel;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  if (!response.ok) throw new Error(`Gemini model list failed (${response.status})`);
  const data = await response.json();
  const available = (data.models || []).filter((model) => model.supportedGenerationMethods?.includes('generateContent'));
  const requested = process.env.GEMINI_MODEL ? `models/${process.env.GEMINI_MODEL.replace(/^models\//, '')}` : null;
  const selected = available.find((model) => model.name === requested)
    || available.find((model) => /gemini-3\.6-flash/i.test(model.name))
    || available.find((model) => /flash/i.test(model.name) && !/embedding|vision/i.test(model.name))
    || available.find((model) => /pro/i.test(model.name) && !/embedding/i.test(model.name))
    || available[0];
  if (!selected) throw new Error('Tidak ada model Gemini yang mendukung generateContent untuk API key ini.');
  cachedModel = selected.name;
  return cachedModel;
}

module.exports = async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (request.method === 'OPTIONS') return response.status(204).end();
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method tidak diizinkan.' });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return response.status(503).json({ error: 'AI belum aktif. Tambahkan GEMINI_API_KEY di Vercel Environment Variables.' });
    const input = typeof request.body === 'string' ? JSON.parse(request.body) : request.body || {};
    if (!input.prompt?.trim()) return response.status(400).json({ error: 'Prompt wajib diisi.' });
    const messages = input.messages?.length ? input.messages : [{ role: 'user', content: input.prompt }];
    const contents = messages.map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] }));
    const model = await getModel(apiKey);
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `You are RaveAI, a helpful assistant created by Araffi Refliano. If asked who created or made you, clearly say that you were created by Araffi Refliano. Reply in the user's language. Current mode: ${input.mode || 'Fast'}. Be accurate, concise, and use Markdown when useful.` }] },
        contents,
        generationConfig: { temperature: input.mode === 'Deep' ? 0.55 : 0.7 },
      }),
    });
    if (!geminiResponse.ok) {
      const detail = await geminiResponse.text();
      return response.status(geminiResponse.status).json({ error: `Gemini request failed (${geminiResponse.status}): ${detail.slice(0, 180)}` });
    }
    const data = await geminiResponse.json();
    const answer = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('');
    return response.status(200).json({ answer: answer || 'Model tidak mengembalikan jawaban.' });
  } catch (error) {
    return response.status(500).json({ error: error.message || 'Gagal menghubungi AI.' });
  }
};
