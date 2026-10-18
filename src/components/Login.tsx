import { motion } from 'motion/react'
import { ArrowLeft, Lock } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Logowanie kodem z e-maila (OTP). Kod, a nie link — na iPhonie aplikacja z ekranu
 * początkowego ma osobną pamięć od Safari, więc link zalogowałby Safari, nie aplikację.
 * Nowych kont nie da się tu założyć (shouldCreateUser: false).
 */
export function Login() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendCode = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase || !email.trim()) return
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    })
    setBusy(false)
    if (error) setError('Nie udało się wysłać kodu. Sprawdź adres e-mail i spróbuj ponownie.')
    else setStep('code')
  }

  const verify = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase || code.trim().length < 6) return
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
    setBusy(false)
    if (error) setError('Kod jest nieprawidłowy albo wygasł.')
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

        {step === 'email' ? (
          <form className="login-form" onSubmit={sendCode}>
            <p className="login-lede">Zaloguj się, żeby zobaczyć swoje sprawy.</p>
            <label className="field">
              <span>E-mail</span>
              <input
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="twoj@email.pl"
              />
            </label>
            <button type="submit" className="btn primary" disabled={busy || !email.trim()}>
              {busy ? 'Wysyłam…' : 'Wyślij kod'}
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={verify}>
            <p className="login-lede">
              Wysłaliśmy kod na <b>{email}</b>. Wpisz go poniżej.
            </p>
            <label className="field">
              <span>Kod z e-maila</span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={10}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="code-input"
              />
            </label>
            <button type="submit" className="btn primary" disabled={busy || code.length < 6}>
              {busy ? 'Sprawdzam…' : 'Zaloguj'}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setStep('email')
                setCode('')
                setError(null)
              }}
            >
              <ArrowLeft size={15} /> Inny e-mail
            </button>
          </form>
        )}

        {error && (
          <motion.p className="login-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {error}
          </motion.p>
        )}
      </motion.div>
    </main>
  )
}
