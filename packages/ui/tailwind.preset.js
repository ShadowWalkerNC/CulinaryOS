/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
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
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
};
