import { useEffect, useRef, useState } from 'react';

export function useSwipe(onSwipeLeft, onSwipeRight) {
  const [startX, setStartX] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const containerRef = useRef(null);

  const MIN_SWIPE_DISTANCE = 80;
  const MAX_OFFSET = 150;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Touch events
    const handleTouchStart = (e) => {
      setStartX(e.touches[0].clientX);
    };

    const handleTouchMove = (e) => {
      if (startX === 0) return;
      const currentX = e.touches[0].clientX;
      const diff = currentX - startX;
      // Limita el movimiento visual a MAX_OFFSET
      setOffsetX(Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, diff)));
    };

    const handleTouchEnd = () => {
      if (Math.abs(offsetX) > MIN_SWIPE_DISTANCE) {
        if (offsetX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
      setOffsetX(0);
      setStartX(0);
    };

    // Mouse events for desktop
    const handleMouseDown = (e) => {
      setStartX(e.clientX);
    };

    const handleMouseMove = (e) => {
      if (startX === 0) return;
      const diff = e.clientX - startX;
      // Limita el movimiento visual a MAX_OFFSET
      setOffsetX(Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, diff)));
    };

    const handleMouseUp = () => {
      if (Math.abs(offsetX) > MIN_SWIPE_DISTANCE) {
        if (offsetX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
      setOffsetX(0);
      setStartX(0);
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseUp);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [startX, offsetX, onSwipeLeft, onSwipeRight]);

  return { containerRef, offsetX };
}
