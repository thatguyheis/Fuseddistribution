import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../public/projects/index.html', import.meta.url), 'utf8');
function setup(mobile = true) {
  const handlers = {};
  const scrolls = [];
  const link = { dataset: {}, addEventListener: (name, fn) => { handlers[name] = fn; },
    setPointerCapture() {}, hasPointerCapture: () => true, releasePointerCapture() {} };
  const frame = { contentWindow: { scrollY: 100, scrollTo: value => scrolls.push(value.top) } };
  const view = { clientWidth: 195, querySelector: selector => selector === 'iframe' ? frame : link };
  const context = vm.createContext({ window: { matchMedia: () => ({ matches: mobile }) } });
  const start = html.indexOf('        var IPHONE_WIDTH = 390;');
  const end = html.indexOf('        function fitFrames()', start);
  vm.runInContext(html.slice(start, end), context);
  context.enableTouchPreview(view);
  const event = (extra = {}) => ({ pointerId: 1, isPrimary: true, button: 0, clientX: 20, clientY: 100,
    preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; }, ...extra });
  return { handlers, scrolls, event };
}
test('swipe scrolls the embedded page at its scale and suppresses navigation', () => {
  const { handlers: h, scrolls, event } = setup();
  h.pointerdown(event()); h.pointermove(event({ clientY: 60 }));
  h.pointerup(event({ type: 'pointerup', clientY: 60 }));
  const click = event({ detail: 1 }); h.click(click);
  assert.deepEqual(scrolls, [180]);
  assert.equal(click.prevented, true); assert.equal(click.stopped, true);
});
test('small finger movement remains a native link tap; next tap works after a swipe', () => {
  const { handlers: h, event } = setup();
  h.pointerdown(event()); h.pointermove(event({ clientY: 50 })); h.pointerup(event({ type: 'pointerup' }));
  h.pointerdown(event()); h.pointermove(event({ clientY: 97 })); h.pointerup(event({ type: 'pointerup' }));
  const click = event({ detail: 1 }); h.click(click); assert.equal(click.prevented, undefined);
});
test('desktop input does not take over preview scrolling', () => {
  const { handlers: h, scrolls, event } = setup(false);
  h.pointerdown(event()); h.pointermove(event({ clientY: 50 }));
  assert.deepEqual(scrolls, []);
});
test('mobile page scrolling exits before changing preview position', () => {
  const start = html.indexOf('        function updateParallax()');
  const end = html.indexOf('        function requestParallax()', start);
  vm.runInNewContext(html.slice(start, end) + '\nupdateParallax();', {
    touchPreview: { matches: true }, reduceMotion: false,
    window: new Proxy({}, { get() { throw new Error('Mobile parallax accessed page position'); } }),
  });
});
