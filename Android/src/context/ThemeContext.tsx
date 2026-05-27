import { createContext, useContext, useState, ReactNode } from 'react';

// ─── Light palette ──────────────────────────────────────────────────────────
export const lightColors = {
  // Backgrounds
  bg:           '#f9fafb',   // screen background
  card:         '#ffffff',   // card / surface
  cardBorder:   '#e5e7eb',   // card border
  header:       '#ffffff',   // top bars / headers
  headerBorder: '#e5e7eb',
  // Text
  textPrimary:   '#111827',  // headings, amounts
  textSecondary: '#6b7280',  // labels, captions
  textMuted:     '#9ca3af',  // placeholder, sub-text
  textLabel:     '#374151',  // form labels
  // Inputs
  inputBg:     '#f9fafb',
  inputBorder: '#e5e7eb',
  // Chips / pills
  chipBg:          '#f3f4f6',
  chipText:        '#4b5563',
  activeChipBg:    '#111827',
  activeChipText:  '#ffffff',
  // Accents (same in both modes)
  primary:   '#f97316',
  primaryDk: '#ea580c',
  primaryLt: '#fff7ed',
  green:     '#16a34a',
  greenLt:   '#f0fdf4',
  blue:      '#2563eb',
  blueLt:    '#eff6ff',
  purple:    '#7c3aed',
  purpleLt:  '#f5f3ff',
  red:       '#dc2626',
  redLt:     '#fef2f2',
  amber:     '#d97706',
  amberLt:   '#fffbeb',
  white:     '#ffffff',
  black:     '#000000',
  // Grays (kept for backward compatibility)
  gray900: '#111827', gray800: '#1f2937', gray700: '#374151',
  gray600: '#4b5563', gray500: '#6b7280', gray400: '#9ca3af',
  gray300: '#d1d5db', gray200: '#e5e7eb', gray100: '#f3f4f6',
  gray50:  '#f9fafb',
};

// ─── Dark palette ────────────────────────────────────────────────────────────
export const darkColors: typeof lightColors = {
  // Backgrounds
  bg:           '#0f172a',
  card:         '#1e293b',
  cardBorder:   '#334155',
  header:       '#1e293b',
  headerBorder: '#334155',
  // Text
  textPrimary:   '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted:     '#64748b',
  textLabel:     '#cbd5e1',
  // Inputs
  inputBg:     '#0f172a',
  inputBorder: '#334155',
  // Chips / pills
  chipBg:         '#334155',
  chipText:       '#94a3b8',
  activeChipBg:   '#f1f5f9',
  activeChipText: '#0f172a',
  // Accents (same)
  primary:   '#f97316',
  primaryDk: '#ea580c',
  primaryLt: '#431407',
  green:     '#4ade80',
  greenLt:   '#052e16',
  blue:      '#60a5fa',
  blueLt:    '#172554',
  purple:    '#a78bfa',
  purpleLt:  '#2e1065',
  red:       '#f87171',
  redLt:     '#450a0a',
  amber:     '#fbbf24',
  amberLt:   '#451a03',
  white:     '#ffffff',
  black:     '#000000',
  // Grays remapped for dark mode
  gray900: '#f1f5f9', gray800: '#e2e8f0', gray700: '#cbd5e1',
  gray600: '#94a3b8', gray500: '#64748b', gray400: '#475569',
  gray300: '#334155', gray200: '#1e293b', gray100: '#0f172a',
  gray50:  '#020617',
};

// ─── Context ─────────────────────────────────────────────────────────────────
type ThemeColors = typeof lightColors;

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  c: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const toggleTheme = () => setIsDark(v => !v);
  const c = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, c }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
