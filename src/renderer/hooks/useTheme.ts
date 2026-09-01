// ============================================
// ЭТАП 4: UI и Брендирование - Хук для работы с темой
// ============================================

import { useEffect, useState } from 'react';
import { ThemeConfig } from '@shared/types';

const DEFAULT_THEME: ThemeConfig = {
  brandName: 'SCO Kiosk',
  logoUrl: '',
  colors: {
    primary: '#007AFF',
    secondary: '#FFFFFF',
    accent: '#FF9500',
    background: '#F2F2F7',
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
    success: '#34C759',
    error: '#FF3B30',
    warning: '#FFCC00',
  },
  fonts: {
    primary: 'system-ui, -apple-system, sans-serif',
    heading: 'system-ui, -apple-system, sans-serif',
  },
  messages: {
    welcome: 'Welcome!',
    scanBarcode: 'Scan product barcode',
    insertCard: 'Insert loyalty card',
    paymentSuccess: 'Payment successful!',
    paymentFailed: 'Payment failed. Try another method.',
    callOperator: 'Operator called. Please wait.',
  },
  language: 'en',
};

export function useTheme() {
  const [theme, setTheme] = useState<ThemeConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const response = await fetch('/theme.json');
        if (!response.ok) {
          throw new Error('Failed to load theme.json');
        }
        const loadedTheme: ThemeConfig = await response.json();
        setTheme(loadedTheme);
        injectThemeVariables(loadedTheme);
      } catch (err) {
        console.warn('Could not load theme.json, using defaults', err);
        setTheme(DEFAULT_THEME);
        injectThemeVariables(DEFAULT_THEME);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

  return { theme, isLoading, error };
}

function injectThemeVariables(theme: ThemeConfig): void {
  const root = document.documentElement;
  const { colors } = theme;

  root.style.setProperty('--brand-primary', colors.primary);
  root.style.setProperty('--brand-secondary', colors.secondary);
  root.style.setProperty('--brand-accent', colors.accent);
  root.style.setProperty('--brand-background', colors.background);
  root.style.setProperty('--brand-surface', colors.surface);
  root.style.setProperty('--brand-text', colors.text);
  root.style.setProperty('--brand-text-secondary', colors.textSecondary);
  root.style.setProperty('--brand-success', colors.success);
  root.style.setProperty('--brand-error', colors.error);
  root.style.setProperty('--brand-warning', colors.warning);

  // Fonts
  root.style.setProperty('--font-primary', theme.fonts.primary);
  root.style.setProperty('--font-heading', theme.fonts.heading);
}
