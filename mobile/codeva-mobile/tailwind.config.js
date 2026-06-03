/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#C96442',
        'accent-hover': '#D4714F',
        'bg-primary': '#0F0F14',
        'bg-surface': '#1A1918',
        'bg-elevated': '#222120',
        'fg-primary': '#E8E4DE',
        'fg-muted': '#9A9590',
        'fg-dim': '#6B6560',
        success: '#4ADE80',
        error: '#F87171',
        purple: '#8B5CF6',
      },
      fontFamily: {
        inter: ['Inter'],
        mono: ['JetBrainsMono'],
      },
    },
  },
  plugins: [],
}
