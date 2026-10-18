# Grochu Privates

Prywatny pulpit z kafelkami (druk na zebranie, subskrypcje, waga, zakupy).
React + Vite, instalowalny jako aplikacja (PWA) na iPhonie i komputerze.

## Uruchomienie lokalnie

```bash
npm install
npm run dev      # tryb deweloperski, http://localhost:5173
npm start        # wersja produkcyjna, http://localhost:4173
```

Lokalnie dane zapisują się tylko w przeglądarce.

## Hosting i synchronizacja

- **GitHub Pages** — publikacja przez GitHub Actions (`.github/workflows/deploy.yml`).
- **Supabase** — logowanie kodem z e-maila i wspólny stan telefon ↔ komputer
  (tabela `app_state` z Row Level Security, schemat w `supabase/schema.sql`).
  Adres i klucz publiczny (anon) podaje się w zmiennych `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY`.
  Bez nich aplikacja działa lokalnie, a dane zostają w przeglądarce.

Kod jest publiczny, dane nie: bez zalogowania baza nic nie zwraca.

## Dysk Google

Zaplanowane zadanie Claude (wtorek i niedziela rano) odczytuje wybrany folder skryptem
`scripts/drive-extract.js` i zapisuje migawkę plików do Supabase. Aplikacja łączy ją
z listą druku po ID plików: nowe pliki dodaje, zmienione nazwy aktualizuje bez zmiany statusu,
usunięte usuwa. Na Dysku nic nie jest zmieniane — tylko odczyt.

## Ikony

`node scripts/make-icons.mjs` generuje favicon i ikony z `scripts/icon-source.png` do `public/`.
