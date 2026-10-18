import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Login } from './components/Login'
import { startCloud } from './lib/cloud'
import { supabase } from './lib/supabase'

/** Bez Supabase: aplikacja lokalna. Z Supabase: najpierw logowanie, potem synchronizacja. */
function Root() {
  const [auth, setAuth] = useState<'loading' | 'out' | 'in'>(supabase ? 'loading' : 'in')

  useEffect(() => {
    if (!supabase) {
      void startCloud()
      return
    }
    const apply = (signedIn: boolean) => {
      setAuth(signedIn ? 'in' : 'out')
      if (signedIn) void startCloud()
    }
    void supabase.auth.getSession().then(({ data }) => apply(!!data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => apply(!!session))
    return () => data.subscription.unsubscribe()
  }, [])

  if (auth === 'loading') return null
  return auth === 'in' ? <App /> : <Login />
}

// Bez przybliżania na telefonie. iOS pomija `user-scalable=no` z meta viewport,
// więc blokujemy gest szczypania (gesturestart/…) i ruch dwoma palcami.
const stop = (e: Event) => e.preventDefault()
document.addEventListener('gesturestart', stop, { passive: false })
document.addEventListener('gesturechange', stop, { passive: false })
document.addEventListener('gestureend', stop, { passive: false })
document.addEventListener(
  'touchmove',
  (e) => {
    if (e.touches.length > 1) e.preventDefault()
  },
  { passive: false },
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
