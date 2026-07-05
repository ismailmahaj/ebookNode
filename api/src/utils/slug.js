export function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function uniqueSlug(queryFn, base, excludeId = null) {
  let slug = slugify(base)
  let candidate = slug
  let i = 1

  while (true) {
    const params = excludeId ? [candidate, excludeId] : [candidate]
    const sql = excludeId
      ? 'SELECT id FROM ebooks WHERE slug = $1 AND id != $2'
      : 'SELECT id FROM ebooks WHERE slug = $1'
    const { rows } = await queryFn(sql, params)
    if (rows.length === 0) return candidate
    candidate = `${slug}-${i++}`
  }
}
