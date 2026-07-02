// date.toISOString() converts to UTC first, which silently shifts the date
// near midnight in any timezone ahead/behind UTC — these build the
// YYYY-MM-DD string from local date parts instead.
export function toISODate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayISO() {
  return toISODate(new Date())
}
