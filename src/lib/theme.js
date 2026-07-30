import { KEYS, read, write } from './storage.js';

/** Colour themes. Each supplies its own light and dark halves (see index.css). */
export const THEMES = [
  { id: 'default', name: 'Classic', swatch: ['#007aff', '#f2f2f7', '#1c1c1e'] },
  { id: 'ocean', name: 'Ocean', swatch: ['#0b72c4', '#00a0b0', '#04121f'] },
  { id: 'dunes', name: 'Dunes', swatch: ['#c2701b', '#f0a13c', '#3b2408'] },
  { id: 'forest', name: 'Forest', swatch: ['#217a45', '#9ad14e', '#06120b'] },
  { id: 'rainbow', name: 'Rainbow', swatch: ['#8b3fd4', '#ff6b9d', '#f7b733'] },
  { id: 'sparkle', name: 'Sparkle', swatch: ['#d6337f', '#a855f7', '#ffd1e7'] },
];

/** Typeface options. On Apple devices these map to the real system families. */
export const FONTS = [
  { id: 'system', name: 'System', hint: 'SF Pro' },
  { id: 'rounded', name: 'Rounded', hint: 'SF Pro Rounded' },
  { id: 'serif', name: 'Serif', hint: 'New York' },
  { id: 'editorial', name: 'Editorial', hint: 'Serif headlines' },
  { id: 'mono', name: 'Mono', hint: 'SF Mono' },
];

export const MODES = [
  { id: 'system', name: 'System' },
  { id: 'light', name: 'Light' },
  { id: 'dark', name: 'Dark' },
];

const DEFAULTS = { mode: 'system', theme: 'default', font: 'system' };

export function getAppearance() {
  const saved = read(KEYS.theme, null);
  // Older builds stored just the mode string.
  if (typeof saved === 'string') return { ...DEFAULTS, mode: saved };
  return { ...DEFAULTS, ...(saved || {}) };
}

export function setAppearance(patch) {
  const next = { ...getAppearance(), ...patch };
  write(KEYS.theme, next);
  applyAppearance(next);
  return next;
}

/**
 * Stamp the choices onto <html>. The stylesheet keys off `.light`/`.dark` for
 * mode, `data-theme` for palette and `data-font` for typeface.
 */
export function applyAppearance(appearance = getAppearance()) {
  const root = document.documentElement;

  root.classList.remove('light', 'dark');
  if (appearance.mode === 'light' || appearance.mode === 'dark') root.classList.add(appearance.mode);

  root.setAttribute('data-theme', appearance.theme || 'default');
  root.setAttribute('data-font', appearance.font || 'system');

  // Keep the iOS status bar tint in step with the resolved background.
  const dark =
    appearance.mode === 'dark' ||
    (appearance.mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  for (const el of document.querySelectorAll('meta[name="theme-color"]')) el.remove();
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  // Read the resolved value so the tint matches whichever theme is active.
  meta.content =
    getComputedStyle(root).getPropertyValue('--c-bg').trim() || (dark ? '#000000' : '#f2f2f7');
  document.head.appendChild(meta);
}
