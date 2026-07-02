// crypto.randomUUID() needs a secure context (HTTPS/localhost) — basic-ssl
// covers dev, but this fallback keeps client-generated IDs (e.g. list keys
// for not-yet-saved rows) working if that ever isn't true.
export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
