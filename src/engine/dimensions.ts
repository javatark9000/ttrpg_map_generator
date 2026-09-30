export const MIN_SIDE = 8;
export const MAX_SIDE = 120;
export const MAX_CELLS = 6400;
export const SIZE_PRESETS = [
  { value: '24x18', label: 'Pequeño · 24 × 18 · 4:3' },
  { value: '40x30', label: 'Mediano · 40 × 30 · 4:3' },
  { value: '56x40', label: 'Grande · 56 × 40 · 7:5' },
  { value: '64x48', label: 'Épico · 64 × 48 · 4:3' },
  { value: '32x32', label: 'Cuadrado · 32 × 32 · 1:1' },
  { value: '64x36', label: 'Panorámico · 64 × 36 · 16:9' },
  { value: '30x40', label: 'Vertical · 30 × 40 · 3:4' },
  { value: '36x64', label: 'Retrato · 36 × 64 · 9:16' },
  { value: '72x24', label: 'Corredor · 72 × 24 · 3:1' },
];
export function dimensionsError(width: number, height: number): string | undefined {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < MIN_SIDE || height < MIN_SIDE || width > MAX_SIDE || height > MAX_SIDE) return `Ancho y alto deben ser enteros entre ${MIN_SIDE} y ${MAX_SIDE} casillas.`;
  if (width * height > MAX_CELLS) return `El mapa no puede superar ${MAX_CELLS.toLocaleString('es')} casillas en total.`;
}
export function aspectRatio(width: number, height: number): string {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) return '—';
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}
