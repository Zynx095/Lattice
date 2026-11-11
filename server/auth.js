import crypto from 'crypto'
import { Router } from 'express'
import { users, prompts } from './db.js'

const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex')
if (!process.env.SESSION_SECRET) console.warn('[auth] SESSION_SECRET not set: sessions will reset on every restart')
const TOKEN_TTL_MS = 7 * 24 * 3600 * 1000

// ---- password hashing: scrypt with a per-user salt ----
const hashPassword = (pw) => {
  const salt = crypto.randomBytes(16)
  return `${salt.toString('hex')}:${crypto.scryptSync(pw, salt, 64).toString('hex')}`
}
const checkPassword = (pw, stored) => {
  const [saltHex, hashHex] = String(stored).split(':')
  const expected = Buffer.from(hashHex, 'hex')
  const actual = crypto.scryptSync(pw, Buffer.from(saltHex, 'hex'), 64)
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

// ---- stateless signed token: base64url(payload).hmac ----
const sign = (data) => crypto.createHmac('sha256', SECRET).update(data).digest('base64url')
export const issueToken = (userId) => {
  const body = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + TOKEN_TTL_MS })).toString('base64url')
  return `${body}.${sign(body)}`
}
function readToken(req) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const good = Buffer.from(sign(body))
  const given = Buffer.from(sig)
  if (good.length !== given.length || !crypto.timingSafeEqual(good, given)) return null
  try {
    const { uid, exp } = JSON.parse(Buffer.from(body, 'base64url').toString())
    return exp > Date.now() ? uid : null
  } catch {
    return null
  }
}

/** Attaches req.user when a valid token is sent; never blocks (guests are allowed). */
export function optionalAuth(req, _res, next) {
  const uid = readToken(req)
  req.user = uid ? users.byId(uid) ?? null : null
  next()
}
export function requireAuth(req, res, next) {
  optionalAuth(req, res, () => (req.user ? next() : res.status(401).json({ error: 'Please sign in.', status: 401 })))
}

// ---- brute-force guard: max 10 auth attempts / 15 min per IP ----
const attempts = new Map()
function tooMany(ip) {
  const now = Date.now()
  const recent = (attempts.get(ip) || []).filter((t) => now - t < 15 * 60_000)
  recent.push(now)
  attempts.set(ip, recent)
  return recent.length > 10
}

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email })
const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= 254

export const authRouter = Router()

authRouter.post('/register', (req, res) => {
  if (tooMany(req.ip)) return res.status(429).json({ error: 'Too many attempts. Try again later.', status: 429 })
  const { name, email, password } = req.body || {}
  if (typeof name !== 'string' || name.trim().length < 2 || name.length > 80) return res.status(400).json({ error: 'Enter your name (2-80 characters).', status: 400 })
  if (!isEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.', status: 400 })
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Password must be 8-128 characters.', status: 400 })
  const mail = email.trim().toLowerCase()
  if (users.byEmail(mail)) return res.status(409).json({ error: 'An account with this email already exists.', status: 409 })
  const id = users.create(name.trim(), mail, hashPassword(password))
  res.status(201).json({ token: issueToken(id), user: publicUser(users.byId(id)) })
})

authRouter.post('/login', (req, res) => {
  if (tooMany(req.ip)) return res.status(429).json({ error: 'Too many attempts. Try again later.', status: 429 })
  const { email, password } = req.body || {}
  const row = isEmail(email) && typeof password === 'string' ? users.byEmail(email.trim().toLowerCase()) : null
  // Same message for unknown email and wrong password.
  if (!row || !checkPassword(password, row.password_hash)) return res.status(401).json({ error: 'Incorrect email or password.', status: 401 })
  users.touchLogin(row.id)
  res.json({ token: issueToken(row.id), user: publicUser(row) })
})

authRouter.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }))

export const historyRouter = Router()
historyRouter.get('/', requireAuth, (req, res) => res.json({ items: prompts.forUser(req.user.id) }))
historyRouter.delete('/', requireAuth, (req, res) => {
  prompts.clearForUser(req.user.id)
  res.json({ ok: true })
})
