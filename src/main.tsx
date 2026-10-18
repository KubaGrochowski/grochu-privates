import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Login } from './components/Login'
import { startCloud } from './lib/cloud'
import { supabase } from './lib/supabase'
import { registerSW } from 'virtual:pwa-register'

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
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  window.addEventListener(type, stop, { passive: false, capture: true })
}
window.addEventListener(
  'touchmove',
  (e) => {
    if (e.touches.length > 1) e.preventDefault()
  },
  { passive: false, capture: true },
)
// podwójne stuknięcie (zapas dla starszych iOS, które ignorują touch-action)
let lastTap = 0
window.addEventListener(
  'touchend',
  (e) => {
    const now = Date.now()
    if (now - lastTap < 300 && !(e.target instanceof HTMLInputElement)) e.preventDefault()
    lastTap = now
  },
  { passive: false, capture: true },
)

// Nowa wersja aplikacji wczytuje się od razu (a nie dopiero przy którymś kolejnym uruchomieniu)
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
