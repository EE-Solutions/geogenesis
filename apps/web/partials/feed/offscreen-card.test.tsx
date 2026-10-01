import { act, cleanup, render, screen } from '@testing-library/react';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { OffscreenCard } from './offscreen-card';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubObservers() {
  let intersect: IntersectionObserverCallback = () => {};
  let resize: ResizeObserverCallback = () => {};
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: IntersectionObserverCallback) {
        intersect = cb;
      }
      observe() {}
      disconnect() {}
    }
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(cb: ResizeObserverCallback) {
        resize = cb;
      }
      observe() {}
      disconnect() {}
    }
  );
  return {
    near: (isIntersecting: boolean) =>
      act(() => intersect([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver)),
    measure: (blockSize: number) =>
      act(() => resize([{ borderBoxSize: [{ blockSize }] } as unknown as ResizeObserverEntry], {} as ResizeObserver)),
  };
}

describe('OffscreenCard', () => {
  it('swaps a measured card that leaves the window for a box of the same height, and back', () => {
    const io = stubObservers();
    const view = render(
      <OffscreenCard>
        <article>card</article>
      </OffscreenCard>
    );
    io.measure(240);

    io.near(false);
    expect(screen.queryByText('card')).toBeNull();
    expect((view.container.firstChild as HTMLElement).style.height).toBe('240px');

    io.near(true);
    expect(screen.getByText('card')).toBeTruthy();
    expect((view.container.firstChild as HTMLElement).style.height).toBe('');
  });

  it('keeps a card that was never measured, so a new list never collapses', () => {
    const io = stubObservers();
    render(
      <OffscreenCard>
        <article>card</article>
      </OffscreenCard>
    );

    io.near(false);
    expect(screen.getByText('card')).toBeTruthy();
  });

  it('always renders without IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(
      <OffscreenCard>
        <article>card</article>
      </OffscreenCard>
    );
    expect(screen.getByText('card')).toBeTruthy();
  });
});
