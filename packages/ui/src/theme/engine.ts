import { ThemeConfig } from './types';
import { DEFAULT_THEME } from './presets';

const STORAGE_KEY = 'culinaryos_active_theme';

export function applyTheme(config: ThemeConfig, target: HTMLElement = document.documentElement): void {
  const { colors, radius, font, mode } = config;

  // Set dark class
  if (mode === 'dark' || mode === 'oled') {
    target.classList.add('dark');
  } else {
    target.classList.remove('dark');
  }

  // Set CSS Variables
  target.style.setProperty('--cos-bg', colors.cosBg);
  target.style.setProperty('--cos-surface', colors.cosSurface);
  target.style.setProperty('--cos-surface-2', colors.cosSurface2);
  target.style.setProperty('--cos-border', colors.cosBorder);
  target.style.setProperty('--cos-text', colors.cosText);
  target.style.setProperty('--cos-brand', colors.cosBrand);

  target.style.setProperty('--background', colors.background);
  target.style.setProperty('--foreground', colors.foreground);
  target.style.setProperty('--card', colors.card);
  target.style.setProperty('--card-foreground', colors.cardForeground);
  target.style.setProperty('--primary', colors.primary);
  target.style.setProperty('--primary-foreground', colors.primaryForeground);
  target.style.setProperty('--secondary', colors.secondary);
  target.style.setProperty('--secondary-foreground', colors.secondaryForeground);
  target.style.setProperty('--muted', colors.muted);
  target.style.setProperty('--muted-foreground', colors.mutedForeground);
  target.style.setProperty('--border', colors.border);
  target.style.setProperty('--input', colors.input);
  target.style.setProperty('--ring', colors.ring);

  // Radius
  const radiusMap = {
    none: '0px',
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '14px',
    full: '9999px',
  };
  target.style.setProperty('--radius', radiusMap[radius] || '8px');

  // Font
  const fontMap = {
    inter: "'Inter', system-ui, -apple-system, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
    serif: "'Playfair Display', Georgia, serif",
    system: "system-ui, -apple-system, sans-serif",
  };
  target.style.setProperty('--cos-font-sans', fontMap[font] || fontMap.inter);
}

export function getStoredTheme(): ThemeConfig {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to parse stored theme:', err);
  }
  return DEFAULT_THEME;
}

export function saveStoredTheme(config: ThemeConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    applyTheme(config);
    window.dispatchEvent(new CustomEvent('culinaryos:theme-change', { detail: config }));
  } catch (err) {
    console.error('Failed to save theme:', err);
  }
}

export function exportThemeCSS(config: ThemeConfig): string {
  return `:root {
  --cos-bg: ${config.colors.cosBg};
  --cos-surface: ${config.colors.cosSurface};
  --cos-surface-2: ${config.colors.cosSurface2};
  --cos-border: ${config.colors.cosBorder};
  --cos-text: ${config.colors.cosText};
  --cos-brand: ${config.colors.cosBrand};
  --primary: ${config.colors.primary};
  --primary-foreground: ${config.colors.primaryForeground};
  --radius: ${config.radius === 'none' ? '0px' : config.radius === 'xl' ? '14px' : '8px'};
}`;
}

export function exportThemeJSON(config: ThemeConfig): string {
  return JSON.stringify(config, null, 2);
}

