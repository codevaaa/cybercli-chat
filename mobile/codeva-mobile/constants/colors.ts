export const Colors = {
  dark: {
    background: '#0F0F14',
    surface: '#1A1918',
    elevated: '#222120',
    text: '#E8E4DE',
    textMuted: '#9A9590',
    textDim: '#6B6560',
    border: 'rgba(255,255,255,0.07)',
    accent: '#C96442',
    accentHover: '#D4714F',
    accentGlow: 'rgba(201,100,66,0.15)',
    success: '#4ADE80',
    error: '#F87171',
    purple: '#8B5CF6',
  },
  light: {
    background: '#FFFFFF',
    surface: '#F8F8F8',
    elevated: '#FFFFFF',
    text: '#191919',
    textMuted: '#666666',
    textDim: '#999999',
    border: 'rgba(0,0,0,0.06)',
    accent: '#C96442',
    accentHover: '#B9573A',
    accentGlow: 'rgba(201,100,66,0.1)',
    success: '#22C55E',
    error: '#EF4444',
    purple: '#7C3AED',
  },
}

export type ThemeColors = typeof Colors.dark
