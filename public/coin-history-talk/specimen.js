(() => {
  for (const viewer of document.querySelectorAll('[data-specimen]')) {
    const viewport = viewer.querySelector('.specimen-viewport');
    const flip = viewer.querySelector('[data-specimen-flip]');
    const reset = viewer.querySelector('[data-specimen-reset]');
    if (!viewport || !flip || !reset) continue;

    const body = document.createElement('div');
    body.className = 'specimen-body';
    body.setAttribute('aria-hidden', 'true');
    for (const side of ['obverse', 'reverse']) {
      const face = document.createElement('div');
      face.className = 'specimen-face specimen-face-' + side;
      body.append(face);
    }
    for (let degrees = 0; degrees < 360; degrees += 5) {
      const segment = document.createElement('div');
      segment.className = 'specimen-rim';
      segment.style.setProperty('--segment', degrees + 'deg');
      body.append(segment);
    }
    const sideLabel = viewer.querySelector('[data-specimen-side]');
    viewport.querySelector('.specimen-poster')?.remove();
    viewport.append(body);

    const initialPitch = -6;
    const initialYaw = -17;
    let pitch = initialPitch;
    let yaw = initialYaw;
    let drag;
    function render(animate = false) {
      if (sideLabel) {
        const facing = Math.cos(pitch * Math.PI / 180) * Math.cos(yaw * Math.PI / 180);
        const side = Math.abs(facing) < 0.12 ? 'Edge' : facing > 0 ? 'Obverse' : 'Reverse';
        if (sideLabel.textContent !== side) sideLabel.textContent = side;
      }
      body.toggleAttribute('data-settling', animate);
      body.style.transform = 'rotateX(' + pitch + 'deg) rotateY(' + yaw + 'deg)';
      body.style.setProperty('--light-x', (45 + 42 * Math.sin(yaw * Math.PI / 180)) + '%');
      body.style.setProperty('--light-y', (35 - 30 * Math.sin(pitch * Math.PI / 180)) + '%');
    }
    function nearestAngle(current, target) {
      return target + 360 * Math.round((current - target) / 360);
    }
    function resetView() {
      pitch = nearestAngle(pitch, initialPitch);
      yaw = nearestAngle(yaw, initialYaw);
      render(true);
    }
    function flipView() {
      const front = Math.cos(pitch * Math.PI / 180) * Math.cos(yaw * Math.PI / 180) >= 0;
      pitch = nearestAngle(pitch, front ? 180 : 0);
      yaw = nearestAngle(yaw, 0);
      render(true);
    }
    flip.addEventListener('click', flipView);
    reset.addEventListener('click', resetView);
    viewport.addEventListener('keydown', event => {
      switch (event.key) {
        case 'ArrowRight': yaw += 15; break;
        case 'ArrowLeft': yaw -= 15; break;
        case 'ArrowUp': pitch -= 15; break;
        case 'ArrowDown': pitch += 15; break;
        case 'Home': event.preventDefault(); resetView(); return;
        default: return;
      }
      event.preventDefault();
      render(true);
    });
    viewport.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, pitch, yaw };
      viewport.setPointerCapture(event.pointerId);
      viewport.setAttribute('data-dragging', '');
      body.removeAttribute('data-settling');
    });
    viewport.addEventListener('pointermove', event => {
      if (event.pointerId !== drag?.id) return;
      const scale = 180 / Math.max(1, viewport.clientWidth);
      yaw = drag.yaw + (event.clientX - drag.x) * scale;
      pitch = drag.pitch - (event.clientY - drag.y) * scale;
      render();
    });
    viewport.addEventListener('lostpointercapture', event => {
      if (event.pointerId !== drag?.id) return;
      drag = undefined;
      viewport.removeAttribute('data-dragging');
    });
    render();
  }
})();

const inspection = document.querySelector('#inspection');
const inspectButton = document.querySelector('#inspect');
if (inspection && inspectButton && typeof inspection.showModal === 'function') {
  const exhibit = inspectButton.closest('[data-specimen]');
  const home = exhibit.parentNode;
  const nextAtHome = exhibit.nextSibling;
  const side = exhibit.querySelector('[data-specimen-side]');
  const note = inspection.querySelector('.specimen-note');
  const notes = {
    Obverse: 'John McLoughlin’s portrait sits between the dates 1825 and 1925. His name follows the lower curve above HALF DOLLAR.',
    Reverse: 'A frontiersman stands before the stockade. FORT VANCOUVER CENTENNIAL follows the upper rim.',
    Edge: 'The narrow ridged band is a modeled edge. Both faces use photographs of the collection coin.'
  };
  function describeFace() {
    note.textContent = notes[side.textContent];
  }
  if (exhibit.querySelector('.specimen-body')) {
    inspectButton.hidden = false;
    const observer = new MutationObserver(describeFace);
    inspectButton.addEventListener('click', () => {
      inspection.querySelector('.inspection-stage').append(exhibit);
      describeFace();
      observer.observe(side, { childList: true });
      inspection.showModal();
    });
    inspection.addEventListener('close', () => {
      observer.disconnect();
      home.insertBefore(exhibit, nextAtHome);
      inspectButton.focus({ preventScroll: true });
    });
  }
}
