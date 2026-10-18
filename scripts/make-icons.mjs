// Generuje ikony aplikacji (PWA, iPhone) z scripts/icon-source.svg do public/icons/.
// Uruchom: node scripts/make-icons.mjs
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const src = fileURLToPath(new URL('./icon-source.svg', import.meta.url))
const out = fileURLToPath(new URL('../public/icons/', import.meta.url))
await mkdir(out, { recursive: true })

const sizes = {
  'icon-192.png': 192,
  'icon-512.png': 512,
  'maskable-512.png': 512, // źródło ma pełne tło i margines — nadaje się jako maskable
  'apple-touch-icon.png': 180,
}

for (const [name, size] of Object.entries(sizes)) {
  await sharp(src).resize(size, size).png().toFile(out + name)
  console.log('✓', name)
}
