/**
 * theme/colors.ts
 *
 * Rebuilt to match the actual old app screenshots you sent (dark theme,
 * indigo primary, amber accent for favorites) rather than the earlier
 * guessed palette. Two full palettes now exist so Settings' Light/Dark/
 * System control (see theme/ThemeContext.tsx) actually does something,
 * instead of being a toggle that doesn't change anything.
 */

export interface Palette {
  background: string;
  surface: string;
  surfaceElevated: string; // slightly lighter than surface -- input fields, inset rows
  surfaceBorder: string;
  ink: string;
  inkMuted: string;
  inkFaint: string;
  primary: string;
  primarySoft: string; // tinted background for chips/active states
  onPrimary: string;
  amber: string; // "Favorites" stat, warm highlight
  danger: string;
  dangerSoft: string;
  overlay: string; // popup backdrop dimming
}

export const darkPalette: Palette = {
  background: '#0B0B10',
  surface: '#16161F',
  surfaceElevated: '#1D1D28',
  surfaceBorder: '#27272F',
  ink: '#F4F4F7',
  inkMuted: '#9A9AA8',
  inkFaint: '#65656F',
  primary: '#6C6CF0',
  primarySoft: '#25253D',
  onPrimary: '#FFFFFF',
  amber: '#F5A623',
  danger: '#EF4444',
  dangerSoft: '#3A2020',
  overlay: 'rgba(0,0,0,0.6)',
};

export const lightPalette: Palette = {
  background: '#F6F6FA',
  surface: '#FFFFFF',
  surfaceElevated: '#F0F0F5',
  surfaceBorder: '#E4E4EC',
  ink: '#17171F',
  inkMuted: '#63636F',
  inkFaint: '#9797A3',
  primary: '#5352E0',
  primarySoft: '#E9E8FB',
  onPrimary: '#FFFFFF',
  amber: '#B4740E',
  danger: '#DC2626',
  dangerSoft: '#FBE7E6',
  overlay: 'rgba(20,17,25,0.55)',
};