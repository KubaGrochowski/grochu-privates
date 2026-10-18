import type { PrintItem } from '../types'
import { remoteEntry } from './cloud'
import { uid } from './storage'

/**
 * Migawka folderu z Dysku Google, zapisywana przez zaplanowane zadanie (wtorek i niedziela rano)
 * do bazy jako wpis `drive.snapshot` — patrz scripts/drive-extract.js i scripts/upload-snapshot.mjs.
 */
export interface DriveSnapshot {
  folderId: string
  folderName: string
  fetchedAt: string
  files: { id: string; name: string; modified: string | null }[]
}

export interface SyncResult {
  items: PrintItem[]
  added: number
  renamed: number
  removed: number
}

const titleOf = (fileName: string) => fileName.replace(/\.pdf$/i, '')

/**
 * Łączy listę druku z migawką Dysku. Pliki rozpoznajemy po stałym ID z Dysku, więc:
 * - nowy plik → nowa pozycja (niewydrukowana),
 * - zmieniona nazwa → nowa nazwa, status „wydrukowane” zostaje bez zmian,
 * - plik usunięty z Dysku → pozycja znika,
 * - pozycje dodane ręcznie (bez ID z Dysku) zostają nietknięte,
 * - pliki, które użytkownik sam usunął z listy (`hidden`), nie wracają.
 */
export function mergeSnapshot(items: PrintItem[], snap: DriveSnapshot, hidden: string[]): SyncResult {
  const byId = new Map(snap.files.map((f) => [f.id, f]))
  const used = new Set<string>()
  let renamed = 0
  let removed = 0
  const result: PrintItem[] = []

  for (const item of items) {
    // pozycje sprzed synchronizacji nie mają jeszcze ID — dopasowujemy je raz po nazwie pliku
    const file = item.driveId
      ? byId.get(item.driveId)
      : snap.files.find((f) => f.name === item.fileName && !used.has(f.id))

    if (!file) {
      if (item.driveId) removed++
      else result.push(item)
      continue
    }

    used.add(file.id)
    if (item.fileName !== file.name) renamed++
    result.push({
      ...item,
      driveId: file.id,
      title: titleOf(file.name),
      fileName: file.name,
      driveModified: file.modified ?? item.driveModified,
      driveStatus: 'found',
    })
  }

  let added = 0
  for (const file of snap.files) {
    if (used.has(file.id) || hidden.includes(file.id)) continue
    added++
    result.push({
      id: uid(),
      driveId: file.id,
      title: titleOf(file.name),
      fileName: file.name,
      driveModified: file.modified ?? undefined,
      driveStatus: 'found',
      printed: false,
      syncedAt: snap.fetchedAt,
    })
  }

  return { items: result, added, renamed, removed }
}

export async function fetchSnapshot(): Promise<DriveSnapshot | null> {
  const fromDb = remoteEntry<DriveSnapshot>('drive.snapshot')?.value
  if (fromDb && Array.isArray(fromDb.files)) return fromDb
  // zapas na lokalne testy: plik public/drive-snapshot.json (nie trafia do repozytorium)
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}drive-snapshot.json`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as DriveSnapshot
    return Array.isArray(data.files) ? data : null
  } catch {
    return null
  }
}

export interface SyncInfo {
  fetchedAt: string
  folderName: string
  fileCount: number
  added: number
  renamed: number
  removed: number
}
