import { motion } from 'motion/react'
import { Lock } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Logowanie e-mailem i hasłem — raz na urządzenie, potem sesja jest zapamiętana.
 * Konta zakłada się tylko w panelu Supabase (rejestracja jest wyłączona).
 * Pola mają autocomplete, więc iPhone i przeglądarka zapamiętają hasło.
 */
export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signIn = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase || !email.trim() || !password) return
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setError('Nieprawidłowy e-mail lub hasło.')
  }

  return (
    <main className="page login-page">
      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="tile-icon">
          <Lock size={16} />
        </span>
        <h1>
          Grochu Privates<span className="accent">.</span>
        </h1>

        <form className="login-form" onSubmit={signIn}>
          <p className="login-lede">Zaloguj się, żeby zobaczyć swoje sprawy.</p>
          <label className="field">
            <span>E-mail</span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="twoj@email.pl"
            />
          </label>
          <label className="field">
            <span>Hasło</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button type="submit" className="btn primary" disabled={busy || !email.trim() || !password}>
            {busy ? 'Loguję…' : 'Zaloguj'}
          </button>
        </form>

        {error && (
          <motion.p className="login-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {error}
          </motion.p>
        )}
      </motion.div>
    </main>
  )
}
