export type DriveStatus = 'found' | 'missing'

export interface PrintItem {
  id: string
  /** Co wydrukować */
  title: string
  /** Na jakie zebranie (pliki z Dysku go nie podają) */
  meeting?: string
  /** Data zebrania (YYYY-MM-DD) */
  meetingDate?: string
  /** Nazwa pliku, którego szukamy na Dysku Google */
  fileName?: string
  /** Data ostatniej zmiany pliku na Dysku (YYYY-MM-DD) */
  driveModified?: string
  /** Stałe ID pliku na Dysku Google — po nim rozpoznajemy zmiany nazw */
  driveId?: string
  /** Kiedy synchronizacja dodała tę pozycję (ISO) — do oznaczenia „nowe” */
  syncedAt?: string
  driveStatus: DriveStatus
  printed: boolean
}

export interface Subscription {
  id: string
  /** Czego dotyczy */
  name: string
  description?: string
  /** Koszt miesięczny w PLN */
  cost: number
}

export interface WeightEntry {
  id: string
  /** Data pomiaru (YYYY-MM-DD) */
  date: string
  /** Waga w kg */
  kg: number
}

export interface ShoppingItem {
  id: string
  /** Co kupić */
  name: string
  note?: string
  bought: boolean
}
