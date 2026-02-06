/**
 * Telegram Mini App React Components
 * Copy-paste into your project
 * 
 * Requires: hooks.ts from this same skill
 */

import React, { CSSProperties,ReactNode, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { getWebApp, isDevMode,useFullscreen, useSafeAreaInset, useTelegramTheme } from './hooks';

// ============================================================================
// SafeAreaHeader
// ============================================================================

interface SafeAreaHeaderProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  transparent?: boolean;
  backgroundColor?: string;
  position?: 'fixed' | 'sticky';
  blur?: boolean;
  height?: number;
  border?: boolean;
  zIndex?: number;
}

/**
 * Header with proper safe area handling
 * 
 * @example
 * <SafeAreaHeader blur border>
 *   <h1>My App</h1>
 * </SafeAreaHeader>
 */
export function SafeAreaHeader({
  children,
  className = '',
  style = {},
  transparent = false,
  backgroundColor,
  position = 'sticky',
  blur = false,
  height = 56,
  border = false,
  zIndex = 1000,
}: SafeAreaHeaderProps) {
  const { totalTop } = useSafeAreaInset();
  const { params, isDark } = useTelegramTheme();

  const bgColor = backgroundColor 
    ?? (transparent ? 'transparent' : (params.bg_color ?? '#0f0f1a'));

  const headerStyle: CSSProperties = {
    position,
    top: 0,
    left: 0,
    right: 0,
    zIndex,
    paddingTop: totalTop,
    backgroundColor: blur ? `${bgColor}cc` : bgColor,
    backdropFilter: blur ? 'blur(20px)' : undefined,
    WebkitBackdropFilter: blur ? 'blur(20px)' : undefined,
    borderBottom: border 
      ? `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
      : undefined,
    ...style,
  };

  const contentStyle: CSSProperties = {
    height,
    display: 'flex',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 16,
  };

  return (
    <header style={headerStyle} className={className}>
      <div style={contentStyle}>{children}</div>
    </header>
  );
}

/**
 * Spacer for fixed SafeAreaHeader
 */
export function SafeAreaHeaderSpacer({ height = 56 }: { height?: number }) {
  const { totalTop } = useSafeAreaInset();
  return <div style={{ height: totalTop + height }} />;
}

// ============================================================================
// DebugOverlay
// ============================================================================

interface DebugOverlayProps {
  forceShow?: boolean;
  defaultOpen?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * Debug panel showing safe areas, viewport, platform info
 * Only visible on localhost or with ?debug=1
 * 
 * @example
 * <DebugOverlay /> // Add to app root
 */
export function DebugOverlay({
  forceShow = false,
  defaultOpen = false,
  position = 'bottom-right',
}: DebugOverlayProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  const insets = useSafeAreaInset();
  const { isFullscreen } = useFullscreen();

  if (!forceShow && !isDevMode()) return null;

  const webApp = getWebApp();
  
  const values = [
    { label: 'Platform', value: webApp?.platform ?? 'unknown' },
    { label: 'Version', value: webApp?.version ?? 'N/A' },
    { label: 'Fullscreen', value: isFullscreen ? '✓' : '✗' },
    { label: 'Viewport', value: `${window.innerWidth}×${webApp?.viewportHeight ?? window.innerHeight}` },
    { label: 'Safe Top', value: insets.device.top },
    { label: 'Safe Bottom', value: insets.device.bottom },
    { label: 'Content Top', value: insets.content.top },
    { label: 'Content Bottom', value: insets.content.bottom },
    { label: '⚡ Total Top', value: insets.totalTop },
    { label: '⚡ Total Bottom', value: insets.totalBottom },
  ];

  const handleCopy = async (label: string, value: any) => {
    await navigator.clipboard.writeText(String(value));
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 1000);
  };

  const positionStyle: CSSProperties = {
    'top-left': { top: 8, left: 8 },
    'top-right': { top: 8, right: 8 },
    'bottom-left': { bottom: 8, left: 8 },
    'bottom-right': { bottom: 8, right: 8 },
  }[position];

  return createPortal(
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          ...positionStyle,
          zIndex: 100000,
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: 'none',
          backgroundColor: isOpen ? '#ef4444' : 'rgba(0,0,0,0.7)',
          color: 'white',
          fontSize: 20,
          cursor: 'pointer',
        }}
      >
        {isOpen ? '✕' : '🐛'}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            ...positionStyle,
            [position.includes('right') ? 'right' : 'left']: 60,
            zIndex: 99999,
            backgroundColor: 'rgba(0,0,0,0.9)',
            color: '#fff',
            borderRadius: 12,
            padding: 12,
            fontSize: 12,
            fontFamily: 'monospace',
            minWidth: 180,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8, opacity: 0.7 }}>TG DEBUG</div>
          {values.map(({ label, value }) => (
            <div
              key={label}
              onClick={() => handleCopy(label, value)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 6px',
                cursor: 'pointer',
                backgroundColor: copiedKey === label ? 'rgba(34,197,94,0.3)' : 'transparent',
                borderRadius: 4,
              }}
            >
              <span style={{ opacity: 0.7 }}>{label}</span>
              <span>{value}</span>
            </div>
          ))}
          <div style={{ marginTop: 8, opacity: 0.5, fontSize: 10, textAlign: 'center' }}>
            Tap to copy
          </div>
        </div>
      )}
    </>,
    document.body
  );
}

// ============================================================================
// Modal (uses createPortal to fix position:fixed issue)
// ============================================================================

interface ModalProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  zIndex?: number;
}

/**
 * Modal that works in Telegram Mini Apps
 * Uses createPortal to avoid position:fixed issues
 * 
 * @example
 * <Modal isOpen={show} onClose={() => setShow(false)}>
 *   <div>Modal content</div>
 * </Modal>
 */
export function Modal({ children, isOpen, onClose, zIndex = 9999 }: ModalProps) {
  const { totalBottom } = useSafeAreaInset();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingBottom: totalBottom,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {children}
    </div>,
    document.body
  );
}
