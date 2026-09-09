export const theme = {
  pageBg: '#EAF3FA',
  cardBg: '#FFFFFF',
  primary: '#5B8DEF',
  secondary: '#78ACE8',
  light: '#A9CFF2',
  veryLight: '#DCECF9',
  blueGray: '#C8D7E5',
  navy: '#17263A',
  secondaryText: '#64748B',
  border: '#C9D7E4',
  success: '#5BA88E',
  warning: '#E0A458',
  danger: '#C8554F',
} as const;

export type Theme = typeof theme;

export const chartPalette = {
  blue1: '#5B8DEF',
  blue2: '#78ACE8',
  blue3: '#A9CFF2',
  blue4: '#C8D7E5',
  blue5: '#3F6FC9',
  blue6: '#9CC3EA',
  blue7: '#E3EEF9',
} as const;