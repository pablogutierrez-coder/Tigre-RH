export const normalizeUsername = (username: string): string => {
  const normalized = username
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/[._-]{2,}/g, '.')
    .replace(/^[._-]+|[._-]+$/g, '');

  if (!normalized) {
    throw new Error('Usuario invalido.');
  }

  return normalized;
};
