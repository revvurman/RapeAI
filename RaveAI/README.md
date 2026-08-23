# RaveAI

RaveAI is a lightweight, responsive AI workspace prototype.

## Run

For the live AI endpoint, set a Gemini key in the server environment and run:

```powershell
$env:GEMINI_API_KEY = "your-key-here"
& "C:\Program Files\nodejs\node.exe" server.js
```

Then open `http://localhost:4173`.

## Deploy on Vercel for free

1. Upload this folder to a GitHub repository.
2. In Vercel, choose **Add New Project** and import the repository.
3. Leave the build command empty.
4. Add an environment variable named `GEMINI_API_KEY` with your Gemini key.
5. Deploy and open the generated Vercel URL.

The `api/chat.js` serverless function keeps the Gemini key on the server. Do not put the key in frontend files.

## Included in this prototype

- Multi-view workspace: chat, web search, image studio, file analyst, settings
- Chat history persisted in localStorage
- Fast, Deep, Academic, and News modes
- Simulated streaming response state
- File selection and drag/drop UI
- Browser Speech Recognition voice input when supported
- Image generation concept preview
- Theme toggle, memory toggle, share action, and admin overview

## Production integrations still required

The UI is ready for a real backend, but live model inference, OAuth, JWT sessions, 2FA, CAPTCHA, email verification, web search providers, object storage, document parsing, image generation, Redis, PostgreSQL, and monitoring require server-side implementation and environment credentials. Never expose provider API keys in browser JavaScript.
