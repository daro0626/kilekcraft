import { reduced } from './core.js';
import { createBlockTitle } from './blocktitle-draw.js';

function observeCanvas(canvas, renderer) {
  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    renderer.layout(width, height, Math.min(devicePixelRatio || 1, 2));
  };
  resize();
  const size = new ResizeObserver(resize);
  size.observe(canvas);
  const visibility = new IntersectionObserver(([entry]) => renderer.show(entry.isIntersecting));
  visibility.observe(canvas);
  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  canvas.addEventListener('pointermove', event => renderer.move(point(event)));
  canvas.addEventListener('pointerleave', () => renderer.move(null));
  canvas.addEventListener('pointerdown', event => renderer.press(point(event)));
  return () => { size.disconnect(); visibility.disconnect(); };
}

export function blockTitle(canvas, text, { colorAt = () => '#e6ebf5' } = {}) {
  const colors = [...text].filter(letter => letter !== ' ').map((letter, i) => colorAt(i, letter.toUpperCase()));
  if (!reduced && canvas.transferControlToOffscreen && typeof Worker !== 'undefined') {
    let worker;
    try {
      worker = new Worker(new URL('./blocktitle-worker.js', import.meta.url), { type: 'module' });
      const offscreen = canvas.transferControlToOffscreen();
      worker.postMessage({ canvas: offscreen, text, colors }, [offscreen]);
      const send = (method, ...args) => worker.postMessage({ method, args });
      const disconnect = observeCanvas(canvas, {
        layout: (...args) => send('layout', ...args),
        show: value => send('show', value),
        move: point => send('move', point),
        press: point => send('press', point),
      });
      worker.onerror = event => {
        event.preventDefault();
        disconnect();
        worker.terminate();
        const fallback = canvas.cloneNode();
        canvas.replaceWith(fallback);
        observeCanvas(fallback, createBlockTitle(fallback, text, colors, reduced));
      };
      return;
    } catch {
      worker?.terminate();
      const fallback = canvas.cloneNode();
      canvas.replaceWith(fallback);
      canvas = fallback;
    }
  }
  observeCanvas(canvas, createBlockTitle(canvas, text, colors, reduced));
}
