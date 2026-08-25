/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success, 142.1 76.2% 36.3%))',
          foreground: 'hsl(var(--success-foreground, 355.7 100% 97.3%))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning, 38 92% 50%))',
          foreground: 'hsl(var(--warning-foreground, 48 96% 89%))',
        },
        brand: {
          DEFAULT: '#0f172a',
          hover: '#1e293b',
          soft: 'rgba(15, 23, 42, 0.06)',
          border: 'rgba(15, 23, 42, 0.18)',
        },
        brandHover: '#1e293b',
        'cos-bg': 'var(--cos-bg, #f8f9fa)',
        'cos-surface': 'var(--cos-surface, #ffffff)',
        'cos-surface-2': 'var(--cos-surface-2, #f1f3f5)',
        'cos-surface-hover': 'var(--cos-surface-hover, #f8f9fa)',
        'cos-border': 'var(--cos-border, #e5e7eb)',
        'cos-border-strong': 'var(--cos-border-strong, #d1d5db)',
        'cos-text': 'var(--cos-text, #1f2937)',
        'cos-text-muted': 'var(--cos-text-muted, #6b7280)',
        'cos-text-dim': 'var(--cos-text-dim, #9ca3af)',
        'cos-green': '#16a34a',
        'cos-green-soft': 'rgba(22, 163, 74, 0.08)',
        'cos-amber': '#d97706',
        'cos-amber-soft': 'rgba(217, 119, 6, 0.08)',
        'cos-red': '#dc2626',
        'cos-red-soft': 'rgba(220, 38, 38, 0.08)',
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
        lg: 'var(--radius, 8px)',
        md: 'calc(var(--radius, 8px) - 2px)',
        sm: 'calc(var(--radius, 8px) - 4px)',
        xl: '12px',
        '2xl': '16px',
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
