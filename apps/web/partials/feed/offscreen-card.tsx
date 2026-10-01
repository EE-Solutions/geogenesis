'use client';

import * as React from 'react';

/**
 * How far outside the viewport a card stays mounted. Wider than the feed's 1500px page sentinel, so a
 * card is never swapped out while it is close enough to scroll into view in one gesture.
 */
const KEEP_MOUNTED_MARGIN = '2500px 0px';

/**
 * Renders a feed card only while it is near the viewport (GEO-3067).
 *
 * Every page the feed has loaded stays in the list, so without this a long scroll keeps every card's
 * DOM, images, media and per-card queries alive. Far cards become an empty box at their last measured
 * height, which keeps the scroll position and the window scrollbar exactly where they were. Cached
 * query data survives, so a card scrolled back to renders from cache.
 *
 * A card starts mounted and is only swapped out after it has been measured, so a fresh list never
 * collapses to zero-height boxes (which would pull the page sentinel into view and fetch page after
 * page). Without `IntersectionObserver` (jsdom, old browsers) cards always render.
 */
export function OffscreenCard({ children }: { children: React.ReactNode }) {
  const [node, setNode] = React.useState<HTMLDivElement | null>(null);
  const [far, setFar] = React.useState(false);
  const heightRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!node || far || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => {
      const height = entries.at(-1)?.borderBoxSize?.[0]?.blockSize ?? node.offsetHeight;
      if (height > 0) heightRef.current = height;
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, far]);

  React.useEffect(() => {
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      entries => {
        const latest = entries.at(-1);
        if (!latest) return;
        if (latest.isIntersecting) setFar(false);
        else if (heightRef.current != null) setFar(true);
      },
      { rootMargin: KEEP_MOUNTED_MARGIN }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return (
    <div ref={setNode} style={far ? { height: heightRef.current ?? undefined } : undefined}>
      {far ? null : children}
    </div>
  );
}
