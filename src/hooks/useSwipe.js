import { useEffect, useRef, useState } from 'react';

export function useSwipe(onSwipeLeft, onSwipeRight) {
  const [offsetX, setOffsetX] = useState(0);
  const containerRef = useRef(null);
  const startXRef = useRef(null);
  const offsetXRef = useRef(0);
  const callbacksRef = useRef({ onSwipeLeft, onSwipeRight });

  const MIN_SWIPE_DISTANCE = 80;
  const MAX_OFFSET = 150;

  useEffect(() => {
    callbacksRef.current = { onSwipeLeft, onSwipeRight };
  }, [onSwipeLeft, onSwipeRight]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const updateOffset = (clientX) => {
      if (startXRef.current === null) return;
      const diff = clientX - startXRef.current;
      const nextOffset = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, diff));
      offsetXRef.current = nextOffset;
      setOffsetX(nextOffset);
    };

    const start = (clientX) => {
      startXRef.current = clientX;
      offsetXRef.current = 0;
    };

    const end = () => {
      const finalOffset = offsetXRef.current;
      if (Math.abs(finalOffset) > MIN_SWIPE_DISTANCE) {
        if (finalOffset > 0) callbacksRef.current.onSwipeRight?.();
        else callbacksRef.current.onSwipeLeft?.();
      }
      startXRef.current = null;
      offsetXRef.current = 0;
      setOffsetX(0);
    };

    const handleTouchStart = (event) => start(event.touches[0].clientX);
    const handleTouchMove = (event) => updateOffset(event.touches[0].clientX);
    const handleMouseDown = (event) => start(event.clientX);
    const handleMouseMove = (event) => updateOffset(event.clientX);

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', end);
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', end);
    container.addEventListener('mouseleave', end);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', end);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', end);
      container.removeEventListener('mouseleave', end);
    };
  }, []);

  return { containerRef, offsetX };
}