/** Formata uma data no fuso local para campos do tipo DATE (YYYY-MM-DD). */
export const getLocalDateString = (date = new Date()) => {
  const value = new Date(date);
  const pad = (number) => String(number).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
};

/**
 * Lê campos DATE do banco como meia-noite local, sem convertê-los de UTC.
 * Valores com horário/timestamp continuam usando o parser nativo.
 */
export const parseLocalDate = (value) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`);
  }
  return new Date(value);
};
