import { CreditCard } from 'lucide-react'
import claude from '../assets/brands/claude.svg'
import spotify from '../assets/brands/spotify.svg'
import wisprFlow from '../assets/brands/wispr-flow.png'

/**
 * Logo usług dopasowywane po nazwie subskrypcji.
 * - 'glyph': jednokolorowe SVG (Simple Icons, CC0), barwione kolorem marki przez maskę CSS
 * - 'image': gotowa ikona aplikacji (PNG)
 * Nową usługę dodajesz: plik do src/assets/brands/ + wpis tutaj.
 */
type Brand =
  | { match: RegExp; kind: 'glyph'; src: string; color: string }
  | { match: RegExp; kind: 'image'; src: string }

const brands: Brand[] = [
  { match: /spotify/i, kind: 'glyph', src: spotify, color: '#1DB954' },
  { match: /claude/i, kind: 'glyph', src: claude, color: '#D97757' },
  { match: /wispr/i, kind: 'image', src: wisprFlow },
]

export function BrandIcon({ name }: { name: string }) {
  const brand = brands.find((b) => b.match.test(name))

  if (!brand) {
    return (
      <span className="brand-icon brand-fallback" aria-hidden>
        <CreditCard size={22} strokeWidth={1.6} />
      </span>
    )
  }

  if (brand.kind === 'image') {
    return (
      <span className="brand-icon" aria-hidden>
        <img src={brand.src} alt="" className="brand-img" />
      </span>
    )
  }

  return (
    <span className="brand-icon" aria-hidden>
      <span
        className="brand-glyph"
        style={{
          backgroundColor: brand.color,
          maskImage: `url("${brand.src}")`,
          WebkitMaskImage: `url("${brand.src}")`,
        }}
      />
    </span>
  )
}
