"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export function ScrollRegion({
  children,
  className,
  bottomFade = true,
  fadeFromClassName = "from-lacuna-canvas",
}: {
  children: ReactNode;
  className?: string;
  bottomFade?: boolean;
  fadeFromClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [showFade, setShowFade] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (!bottomFade) {
      setShowFade(false);
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = el;
    const hasOverflow = scrollHeight > clientHeight + 1;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 2;
    setShowFade(hasOverflow && !atBottom);
  }, [bottomFade]);

  useEffect(() => {
    queueMicrotask(() => {
      update();
    });
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, [update]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={ref}
        onScroll={update}
        className={`min-h-0 flex-1 overflow-y-scroll overscroll-contain [scrollbar-gutter:stable] ${className ?? ""}`}
      >
        {children}
      </div>
      {showFade ? (
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t ${fadeFromClassName} to-transparent`}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
