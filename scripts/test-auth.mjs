// Smoke test for accounts + saved prompts: node scripts/test-auth.mjs
const base = process.env.API || 'http://localhost:3001/api'
const j = (path, opts = {}, token) =>
  fetch(base + path, { ...opts, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }))
const email = `test${Date.now()}@example.com`
const post = (path, body, token) => j(path, { method: 'POST', body: JSON.stringify(body) }, token)
const show = (label, r) => console.log(label.padEnd(34), r.status, JSON.stringify(r.body).slice(0, 110))

show('register (weak password)', await post('/auth/register', { name: 'Test User', email, password: 'short' }))
const reg = await post('/auth/register', { name: 'Test User', email, password: 'correct-horse-battery' })
show('register', { ...reg, body: { ...reg.body, token: '<hidden>' } })
show('register duplicate', await post('/auth/register', { name: 'Test User', email, password: 'correct-horse-battery' }))
show('login wrong password', await post('/auth/login', { email, password: 'wrong-password-1' }))
const login = await post('/auth/login', { email, password: 'correct-horse-battery' })
show('login', { ...login, body: { ...login.body, token: '<hidden>' } })
const token = login.body.token
show('me (valid token)', await j('/auth/me', {}, token))
show('me (tampered token)', await j('/auth/me', {}, token.slice(0, -3) + 'abc'))
show('history without login', await j('/history'))
const chat = await post('/assistant/chat', { message: 'What are the library timings?' }, token)
console.log('chat'.padEnd(34), chat.status, chat.body?.provider ?? chat.body?.error)
const hist = await j('/history', {}, token)
show('history (after one question)', hist)
console.log('saved prompt has timestamp:', Boolean(hist.body?.items?.[0]?.created_at), hist.body?.items?.[0]?.created_at)
