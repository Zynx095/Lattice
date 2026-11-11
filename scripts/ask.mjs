// Quick manual check: node scripts/ask.mjs "question" ["question2" ...]
const base = process.env.API || 'http://localhost:3001/api'
for (const message of process.argv.slice(2)) {
  const t = Date.now()
  const res = await fetch(`${base}/assistant/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) })
  const d = await res.json()
  console.log(`\nQ: ${message}  (${Date.now() - t} ms)`)
  console.log(`   ${d.provider ?? '-'} ${d.model ?? ''} [${d.availability ?? res.status}]`)
  console.log(`   ${d.answer ?? d.error}`)
  if (d.sources?.length) console.log(`   sources: ${d.sources.map((s) => s.label).join(', ')}`)
}
