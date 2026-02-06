/**
 * Telegram Mini App React Hooks
 * Copy-paste into your project
 */

import { useCallback,useEffect, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

interface SafeAreaInset {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface TelegramWebApp {
  version: string;
  platform: string;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  isFullscreen: boolean;
  safeAreaInset: SafeAreaInset;
  contentSafeAreaInset: SafeAreaInset;
  themeParams: Record<string, string>;
  colorScheme: 'light' | 'dark';
  requestFullscreen: () => void;
  exitFullscreen: () => void;
  onEvent: (eventType: string, callback: () => void) => void;
  offEvent: (eventType: string, callback: () => void) => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

// ============================================================================
// Utilities
// ============================================================================

export function getWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp ?? null;
}

export function isDevMode(): boolean {
  if (typeof window === 'undefined') return false;
  const url = new URL(window.location.href);
  return ['localhost', '127.0.0.1'].includes(url.hostname) || url.searchParams.get('debug') === '1';
}

// ============================================================================
// useSafeAreaInset
// ============================================================================

export interface SafeAreaInsets {
  device: SafeAreaInset;
  content: SafeAreaInset;
  totalTop: number;
  totalBottom: number;
}

/**
 * Reactive safe area insets - updates when Telegram sends events
 * 
 * @example
 * const { totalTop, totalBottom } = useSafeAreaInset();
 * <div style={{ paddingTop: totalTop }}>Header</div>
 */
export function useSafeAreaInset(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>(() => {
    const webApp = getWebApp();
    const device = webApp?.safeAreaInset ?? { top: 0, bottom: 0, left: 0, right: 0 };
    const content = webApp?.contentSafeAreaInset ?? { top: 0, bottom: 0, left: 0, right: 0 };
    return {
      device,
      content,
      totalTop: device.top + content.top,
      totalBottom: device.bottom + content.bottom,
    };
  });

  const updateInsets = useCallback(() => {
    const webApp = getWebApp();
    const device = webApp?.safeAreaInset ?? { top: 0, bottom: 0, left: 0, right: 0 };
    const content = webApp?.contentSafeAreaInset ?? { top: 0, bottom: 0, left: 0, right: 0 };
    
    // Add minimum fallbacks for fullscreen mode
    let totalTop = device.top + content.top;
    if (webApp?.isFullscreen && totalTop < 80) {
      totalTop = webApp.platform === 'ios' ? 100 : 80;
    }
    
    setInsets({
      device,
      content,
      totalTop,
      totalBottom: device.bottom + content.bottom,
    });
  }, []);

  useEffect(() => {
    const webApp = getWebApp();
    if (!webApp) return;

    updateInsets();

    webApp.onEvent('safeAreaChanged', updateInsets);
    webApp.onEvent('contentSafeAreaChanged', updateInsets);
    webApp.onEvent('fullscreenChanged', updateInsets);

    // Fallback: poll every 500ms (some events may not fire)
    const interval = setInterval(updateInsets, 500);

    return () => {
      webApp.offEvent('safeAreaChanged', updateInsets);
      webApp.offEvent('contentSafeAreaChanged', updateInsets);
      webApp.offEvent('fullscreenChanged', updateInsets);
      clearInterval(interval);
    };
  }, [updateInsets]);

  return insets;
}

// ============================================================================
// useFullscreen
// ============================================================================

export interface FullscreenState {
  isFullscreen: boolean;
  isSupported: boolean;
  requestFullscreen: () => void;
  exitFullscreen: () => void;
  toggleFullscreen: () => void;
}

/**
 * Manage Telegram Mini App fullscreen mode (requires version 8.0+)
 * 
 * @example
 * const { isFullscreen, toggleFullscreen } = useFullscreen();
 * <button onClick={toggleFullscreen}>{isFullscreen ? 'Exit' : 'Fullscreen'}</button>
 */
export function useFullscreen(): FullscreenState {
  const [isFullscreen, setIsFullscreen] = useState(() => {
    return getWebApp()?.isFullscreen ?? false;
  });

  const isSupported = (() => {
    const webApp = getWebApp();
    if (!webApp) return false;
    return parseFloat(webApp.version) >= 8.0;
  })();

  const requestFullscreen = useCallback(() => {
    getWebApp()?.requestFullscreen?.();
  }, []);

  const exitFullscreen = useCallback(() => {
    getWebApp()?.exitFullscreen?.();
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) exitFullscreen();
    else requestFullscreen();
  }, [isFullscreen, requestFullscreen, exitFullscreen]);

  useEffect(() => {
    const webApp = getWebApp();
    if (!webApp) return;

    const handleChange = () => setIsFullscreen(webApp.isFullscreen);

    webApp.onEvent('fullscreenChanged', handleChange);
    webApp.onEvent('fullscreenFailed', handleChange);

    return () => {
      webApp.offEvent('fullscreenChanged', handleChange);
      webApp.offEvent('fullscreenFailed', handleChange);
    };
  }, []);

  return { isFullscreen, isSupported, requestFullscreen, exitFullscreen, toggleFullscreen };
}

// ============================================================================
// useTelegramTheme
// ============================================================================

export interface TelegramTheme {
  params: Record<string, string>;
  colorScheme: 'light' | 'dark';
  isDark: boolean;
}

/**
 * Reactive Telegram theme params
 * 
 * @example
 * const { params, isDark } = useTelegramTheme();
 * <div style={{ background: params.bg_color }}>...</div>
 */
export function useTelegramTheme(): TelegramTheme {
  const [theme, setTheme] = useState<TelegramTheme>(() => {
    const webApp = getWebApp();
    return {
      params: webApp?.themeParams ?? {},
      colorScheme: webApp?.colorScheme ?? 'light',
      isDark: webApp?.colorScheme === 'dark',
    };
  });

  useEffect(() => {
    const webApp = getWebApp();
    if (!webApp) return;

    const handleChange = () => {
      setTheme({
        params: webApp.themeParams,
        colorScheme: webApp.colorScheme,
        isDark: webApp.colorScheme === 'dark',
      });
    };

    webApp.onEvent('themeChanged', handleChange);
    return () => webApp.offEvent('themeChanged', handleChange);
  }, []);

  return theme;
}
