export type ColorMode = 'light' | 'dark' | 'oled';

export interface ThemeColors {
  primary: string;
  primaryForeground: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  success: string;
  warning: string;
  cosBg: string;
  cosSurface: string;
  cosSurface2: string;
  cosBorder: string;
  cosText: string;
  cosBrand: string;
}

export type RadiusPreset = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type FontPreset = 'inter' | 'mono' | 'serif' | 'system';
export type AnimationPreset = 'instant' | 'normal' | 'playful';

export interface ThemeConfig {
  id: string;
  name: string;
  mode: ColorMode;
  colors: ThemeColors;
  radius: RadiusPreset;
  font: FontPreset;
  animation: AnimationPreset;
}
