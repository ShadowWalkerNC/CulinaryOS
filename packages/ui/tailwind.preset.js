/** @type {import('tailwindcss').Config} */

// Helper to support raw CSS variable color references (hex, rgb, oklch)
// without invalid hsl(...) wrappers, while seamlessly supporting
// optional Tailwind opacity modifiers (e.g. bg-primary/90 or bg-card/95)
const colorVar = (name, fallback) => ({ opacityValue }) => {
  if (opacityValue !== undefined) {
    return `color-mix(in srgb, var(${name}${fallback ? `, ${fallback}` : ''}) calc(${opacityValue} * 100%), transparent)`;
  }
  return `var(${name}${fallback ? `, ${fallback}` : ''})`;
};

export default {
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        border: colorVar('--border', '#e2e8f0'),
        input: colorVar('--input', '#e2e8f0'),
        ring: colorVar('--ring', '#f59e0b'),
        background: colorVar('--background', '#f8f9fa'),
        foreground: colorVar('--foreground', '#090d16'),
        primary: {
          DEFAULT: colorVar('--primary', '#090d16'),
          foreground: colorVar('--primary-foreground', '#f8f9fa'),
        },
        secondary: {
          DEFAULT: colorVar('--secondary', '#f1f3f5'),
          foreground: colorVar('--secondary-foreground', '#090d16'),
        },
        destructive: {
          DEFAULT: colorVar('--destructive', '#ef4444'),
          foreground: colorVar('--destructive-foreground', '#ffffff'),
        },
        muted: {
          DEFAULT: colorVar('--muted', '#f1f3f5'),
          foreground: colorVar('--muted-foreground', '#64748b'),
        },
        accent: {
          DEFAULT: colorVar('--accent', '#f1f3f5'),
          foreground: colorVar('--accent-foreground', '#090d16'),
        },
        popover: {
          DEFAULT: colorVar('--popover', '#ffffff'),
          foreground: colorVar('--popover-foreground', '#090d16'),
        },
        card: {
          DEFAULT: colorVar('--card', '#ffffff'),
          foreground: colorVar('--card-foreground', '#090d16'),
        },
        success: {
          DEFAULT: colorVar('--success', '#10b981'),
          foreground: colorVar('--success-foreground', '#ffffff'),
        },
        warning: {
          DEFAULT: colorVar('--warning', '#f59e0b'),
          foreground: colorVar('--warning-foreground', '#090d16'),
        },
        amber: {
          DEFAULT: '#f59e0b',
          foreground: '#090d16',
          hover: '#d97706',
          active: '#b45309',
        },
        ember: {
          DEFAULT: '#ff6b35',
          foreground: '#ffffff',
          hover: '#ea580c',
          active: '#c2410c',
        },
        brand: {
          DEFAULT: '#090d16',
          hover: '#182030',
          soft: 'rgba(9, 13, 22, 0.06)',
          border: 'rgba(9, 13, 22, 0.18)',
        },
        brandHover: '#182030',
        'cos-bg': colorVar('--cos-bg', '#f8f9fa'),
        'cos-surface': colorVar('--cos-surface', '#ffffff'),
        'cos-surface-2': colorVar('--cos-surface-2', '#f1f3f5'),
        'cos-surface-hover': colorVar('--cos-surface-hover', '#f8f9fa'),
        'cos-border': colorVar('--cos-border', '#e5e7eb'),
        'cos-border-strong': colorVar('--cos-border-strong', '#d1d5db'),
        'cos-text': colorVar('--cos-text', '#1f2937'),
        'cos-text-muted': colorVar('--cos-text-muted', '#6b7280'),
        'cos-text-dim': colorVar('--cos-text-dim', '#9ca3af'),
        'cos-green': '#10b981',
        'cos-green-soft': 'rgba(16, 185, 129, 0.08)',
        'cos-amber': '#f59e0b',
        'cos-amber-soft': 'rgba(245, 158, 11, 0.08)',
        'cos-red': '#ef4444',
        'cos-red-soft': 'rgba(239, 68, 68, 0.08)',
        'cos-blue': '#2563eb',
        'cos-blue-soft': 'rgba(37, 99, 235, 0.08)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        xs: '0 1px 2px rgba(0,0,0,0.05)',
        sm: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        md: '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.04)',
        lg: '0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.04)',
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: 'var(--radius, 8px)',
        xl: '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleUp: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.04)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out',
        scaleUp: 'scaleUp 0.15s ease-out',
        pulseGlow: 'pulseGlow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
