/** Formats a length stored in millimetres as centimetres, with one decimal place. */
export function formatMillimetresAsCentimetres(millimetres: number): string {
  const centimetres = millimetres / 10;
  return `${centimetres.toFixed(1)} cm`;
}
