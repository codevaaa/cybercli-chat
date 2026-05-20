/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
          elevated: 'var(--bg-elevated)',
        },
        foreground: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          light: 'var(--accent-light)',
          dark: 'var(--accent-dark)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          medium: 'var(--border-medium)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display': ['5rem', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '800' }],
        'h1': ['3.5rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        'h2': ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.015em', fontWeight: '700' }],
        'h3': ['1.75rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
        'h4': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.7' }],
        'body': ['1rem', { lineHeight: '1.7' }],
        'body-sm': ['0.875rem', { lineHeight: '1.6' }],
        'caption': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.02em' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },
      borderRadius: {
        'button': '8px',
        'card': '12px',
        'modal': '16px',
        'pill': '9999px',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '300ms',
        'slow': '500ms',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-in-right': 'slideInRight 0.3s ease-out forwards',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
      backdropBlur: {
        'nav': '20px',
      },
    },
  },
  plugins: [
    function({ addBase, theme }) {
      addBase({
        ':root': {
          '--bg-primary': '#FAFAFB',
          '--bg-secondary': '#F0F0F5',
          '--bg-tertiary': '#E8E8EE',
          '--bg-elevated': '#FFFFFF',
          '--text-primary': '#0A0A0F',
          '--text-secondary': '#4A4A55',
          '--text-muted': '#7A7A85',
          '--accent': '#7C3AED',
          '--accent-light': '#A78BFA',
          '--accent-dark': '#5B21B6',
          '--border-subtle': 'rgba(0,0,0,0.06)',
          '--border-medium': 'rgba(0,0,0,0.12)',
          '--success': '#10B981',
          '--warning': '#F59E0B',
          '--error': '#EF4444',
          '--info': '#3B82F6',
        },
        '.dark': {
          '--bg-primary': '#0A0A0F',
          '--bg-secondary': '#12121A',
          '--bg-tertiary': '#1A1A24',
          '--bg-elevated': '#1E1E2E',
          '--text-primary': '#F8F8FC',
          '--text-secondary': '#A0A0B0',
          '--text-muted': '#606070',
          '--accent': '#7C3AED',
          '--accent-light': '#A78BFA',
          '--accent-dark': '#5B21B6',
          '--border-subtle': 'rgba(255,255,255,0.06)',
          '--border-medium': 'rgba(255,255,255,0.12)',
          '--success': '#10B981',
          '--warning': '#F59E0B',
          '--error': '#EF4444',
          '--info': '#3B82F6',
        },
      });
    },
  ],
}
