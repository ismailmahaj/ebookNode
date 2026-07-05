export function paginate(page = 1, perPage = 15) {
  const p = Math.max(1, parseInt(page, 10) || 1)
  const pp = Math.min(100, Math.max(1, parseInt(perPage, 10) || 15))
  const offset = (p - 1) * pp
  return { page: p, perPage: pp, offset, limit: pp }
}

export function paginatedResponse(data, total, page, perPage) {
  const lastPage = Math.max(1, Math.ceil(total / perPage))
  return {
    data,
    current_page: page,
    last_page: lastPage,
    per_page: perPage,
    total,
  }
}

export function parseBool(value) {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'boolean') return value
  return value === '1' || value === 'true' || value === true
}
