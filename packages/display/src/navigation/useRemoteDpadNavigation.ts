// ============================================================
// CulinaryOS — Android TV Remote & D-Pad Navigation Hook
// Captures UP, DOWN, LEFT, RIGHT, OK (DPAD_CENTER), BACK & MENU
// Works seamlessly with onn. 4K remote, physical bump bars, keyboards
// ============================================================

import { useEffect, useCallback } from 'react';

export interface DpadKeyHandlers {
  onUp?: (() => void) | undefined;
  onDown?: (() => void) | undefined;
  onLeft?: (() => void) | undefined;
  onRight?: (() => void) | undefined;
  onOk?: (() => void) | undefined;
  onBack?: (() => void) | undefined;
  onMenu?: (() => void) | undefined;
  enabled?: boolean | undefined;
}

// Android KeyCode Constants
export const ANDROID_KEYCODES = {
  DPAD_UP: 19,
  DPAD_DOWN: 20,
  DPAD_LEFT: 21,
  DPAD_RIGHT: 22,
  DPAD_CENTER: 23,
  BACK: 4,
  MENU: 82,
  ENTER: 66,
  ESCAPE: 111,
  MEDIA_PLAY_PAUSE: 85,
} as const;

export function useRemoteDpadNavigation(handlers: DpadKeyHandlers) {
  const { onUp, onDown, onLeft, onRight, onOk, onBack, onMenu, enabled = true } = handlers;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const code = e.keyCode;
      const key = e.key;

      // DPAD UP
      if (key === 'ArrowUp' || code === ANDROID_KEYCODES.DPAD_UP) {
        if (onUp) {
          e.preventDefault();
          onUp();
        }
        return;
      }

      // DPAD DOWN
      if (key === 'ArrowDown' || code === ANDROID_KEYCODES.DPAD_DOWN) {
        if (onDown) {
          e.preventDefault();
          onDown();
        }
        return;
      }

      // DPAD LEFT
      if (key === 'ArrowLeft' || code === ANDROID_KEYCODES.DPAD_LEFT) {
        if (onLeft) {
          e.preventDefault();
          onLeft();
        }
        return;
      }

      // DPAD RIGHT
      if (key === 'ArrowRight' || code === ANDROID_KEYCODES.DPAD_RIGHT) {
        if (onRight) {
          e.preventDefault();
          onRight();
        }
        return;
      }

      // DPAD OK / SELECT / BUMP
      if (
        key === 'Enter' ||
        key === ' ' ||
        code === ANDROID_KEYCODES.DPAD_CENTER ||
        code === ANDROID_KEYCODES.ENTER
      ) {
        if (onOk) {
          e.preventDefault();
          onOk();
        }
        return;
      }

      // BACK / UNDO
      if (
        key === 'Escape' ||
        key === 'Backspace' ||
        key === 'BrowserBack' ||
        code === ANDROID_KEYCODES.BACK ||
        code === ANDROID_KEYCODES.ESCAPE
      ) {
        if (onBack) {
          e.preventDefault();
          onBack();
        }
        return;
      }

      // MENU / OPTIONS
      if (key === 'ContextMenu' || code === ANDROID_KEYCODES.MENU) {
        if (onMenu) {
          e.preventDefault();
          onMenu();
        }
        return;
      }
    },
    [onUp, onDown, onLeft, onRight, onOk, onBack, onMenu, enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Hook for managing linear grid/card selection via Left/Right or Up/Down
 */
export function useLinearDpadGrid<T>({
  items,
  selectedIndex,
  onIndexChange,
  onAction,
  onBack,
  orientation = 'horizontal',
  enabled = true,
}: {
  items: T[];
  selectedIndex: number;
  onIndexChange: (newIndex: number) => void;
  onAction?: (item: T, index: number) => void;
  onBack?: () => void;
  orientation?: 'horizontal' | 'vertical' | 'both';
  enabled?: boolean;
}) {
  const count = items.length;

  const handleNext = useCallback(() => {
    if (count === 0) return;
    onIndexChange(Math.min(selectedIndex + 1, count - 1));
  }, [selectedIndex, count, onIndexChange]);

  const handlePrev = useCallback(() => {
    if (count === 0) return;
    onIndexChange(Math.max(selectedIndex - 1, 0));
  }, [selectedIndex, count, onIndexChange]);

  const handleOk = useCallback(() => {
    if (count > 0 && selectedIndex >= 0 && selectedIndex < count && onAction) {
      onAction(items[selectedIndex]!, selectedIndex);
    }
  }, [count, selectedIndex, items, onAction]);

  useRemoteDpadNavigation({
    enabled,
    onLeft: orientation === 'horizontal' || orientation === 'both' ? handlePrev : undefined,
    onRight: orientation === 'horizontal' || orientation === 'both' ? handleNext : undefined,
    onUp: orientation === 'vertical' || orientation === 'both' ? handlePrev : undefined,
    onDown: orientation === 'vertical' || orientation === 'both' ? handleNext : undefined,
    onOk: handleOk,
    onBack,
  });
}
