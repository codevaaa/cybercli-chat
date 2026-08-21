/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#0A0A0F',
        surface: '#111118',
        border:  '#1E1E2E',
        accent:  '#D97757',
        accent2: '#FF6B35',
        muted:   '#6B7280',
        success: '#10B981',
        warning: '#F59E0B',
        danger:  '#EF4444',
        // Agent persona colours
        ravan:       '#FF4444',
        chanakya:    '#795548',
        arjun:       '#00BCD4',
        madhav:      '#9C27B0',
        bheem:       '#4CAF50',
        sahadeva:    '#FF9800',
        nakul:       '#E91E63',
        yudhishthir: '#2196F3',
        shiv:        '#F44336',
        panchayat:   '#607D8B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow':  'spin 3s linear infinite',
        'fade-in':    'fadeIn 0.3s ease-in-out',
        'slide-up':   'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: { '0%': { transform: 'translateY(10px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
      }
    }
  },
  plugins: []
}
