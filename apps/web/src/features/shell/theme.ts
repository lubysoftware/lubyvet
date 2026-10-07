/** D38: claro, escuro ou sistema, em cookie. */
export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_COOKIE = 'lv_theme';
export const resolveTheme = (v: string | undefined): Theme =>
  (THEMES as readonly string[]).includes(v ?? '') ? (v as Theme) : 'system';
