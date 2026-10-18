// Wysyła migawkę Dysku (public/drive-snapshot.json) do Supabase jako wpis `drive.snapshot`
// właściciela aplikacji. Uruchamiane przez zaplanowane zadanie po odczycie folderu.
//
//   node --use-system-ca --env-file=.env.local scripts/upload-snapshot.mjs
//
// .env.local (tylko na tym komputerze, nigdy w repozytorium):
//   SUPABASE_URL=https://....supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=...      ← klucz „secret / service_role” z panelu Supabase
//   OWNER_EMAIL=twoj@email             ← e-mail konta, na które ma trafić migawka
import { readFile } from 'node:fs/promises'

const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, OWNER_EMAIL: email } = process.env
if (!url || !key || !email) {
  console.error('Brak SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY lub OWNER_EMAIL w .env.local')
  process.exit(1)
}

const headers = { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' }

const snapshot = JSON.parse(await readFile(new URL('../public/drive-snapshot.json', import.meta.url), 'utf8'))
if (!Array.isArray(snapshot.files) || snapshot.files.length === 0) {
  console.error('Migawka jest pusta — nic nie wysyłam.')
  process.exit(1)
}

// znajdź ID właściciela po e-mailu
const usersRes = await fetch(`${url}/auth/v1/admin/users?per_page=50`, { headers })
if (!usersRes.ok) throw new Error(`Nie udało się pobrać użytkowników: ${usersRes.status}`)
const { users } = await usersRes.json()
const owner = users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
if (!owner) throw new Error(`Nie ma użytkownika ${email}`)

const res = await fetch(`${url}/rest/v1/app_state?on_conflict=user_id,key`, {
  method: 'POST',
  headers: { ...headers, prefer: 'resolution=merge-duplicates,return=minimal' },
  body: JSON.stringify({ user_id: owner.id, key: 'drive.snapshot', value: snapshot, updated_at: Date.now() }),
})
if (!res.ok) throw new Error(`Zapis nie powiódł się: ${res.status} ${await res.text()}`)

console.log(`✓ Wysłano migawkę: ${snapshot.files.length} plików (${snapshot.fetchedAt})`)
