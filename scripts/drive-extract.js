// Uruchamiany na stronie folderu Dysku Google (zalogowana przeglądarka).
// Zwraca migawkę folderu jako obiekt JSON — zapisz go do public/drive-snapshot.json.
// Daty z Dysku ("13 sie", "13 sie 2025", "07:45") zamieniamy na YYYY-MM-DD.
;(() => {
  const months = { sty: 1, lut: 2, mar: 3, kwi: 4, maj: 5, cze: 6, lip: 7, sie: 8, wrz: 9, paź: 10, lis: 11, gru: 12 }
  const pad = (n) => String(n).padStart(2, '0')
  const now = new Date()
  const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`

  function parseDate(text) {
    if (/^\d{1,2}:\d{2}$/.test(text)) return iso(now.getFullYear(), now.getMonth() + 1, now.getDate())
    const m = text.match(/^(\d{1,2}) (\p{L}{3})\p{L}*\.?(?: (\d{4}))?$/u)
    if (!m || !months[m[2].toLowerCase()]) return null
    const day = Number(m[1])
    const month = months[m[2].toLowerCase()]
    let year = m[3] ? Number(m[3]) : now.getFullYear()
    // bez roku Dysk pokazuje bieżący rok; data "z przyszłości" oznacza rok poprzedni
    if (!m[3] && new Date(year, month - 1, day) > now) year -= 1
    return iso(year, month, day)
  }

  const rows = [...document.querySelectorAll('tr[role="row"][data-id]')]
  const files = rows.map((row) => {
    const parts = row.innerText.split('\n').map((s) => s.trim()).filter(Boolean)
    const modified = parts.map(parseDate).find(Boolean) ?? null
    return { id: row.getAttribute('data-id'), name: parts[0], modified }
  })

  return {
    folderId: location.pathname.split('/').pop(),
    folderName: document.title.replace(/ – Dysk Google$/, ''),
    fetchedAt: new Date().toISOString(),
    files,
  }
})()
