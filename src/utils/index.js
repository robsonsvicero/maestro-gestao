export function createPageUrl(pageName) {
  const slug = pageName.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'dashboard'

  return `/${slug}`
}
