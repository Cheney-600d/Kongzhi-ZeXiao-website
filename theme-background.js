(function initThemeAtmosphere() {
  'use strict';

  const atmosphereCanvas = document.getElementById('themeAtmosphere');
  const signalCanvas = document.getElementById('heroSignalCanvas');
  const feedbackRibbon = document.getElementById('feedbackRibbon');
  const schoolCanvas = document.getElementById('schoolDataField');
  const schoolBay = document.getElementById('mainContentArea');
  if (
    !atmosphereCanvas?.getContext ||
    !signalCanvas?.getContext ||
    !schoolCanvas?.getContext ||
    !feedbackRibbon ||
    !schoolBay
  ) return;

  const atmosphere = atmosphereCanvas.getContext('2d');
  const signal = signalCanvas.getContext('2d');
  const schoolField = schoolCanvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let viewportWidth = 0;
  let viewportHeight = 0;
  let ribbonWidth = 0;
  let ribbonHeight = 0;
  let schoolWidth = 0;
  let schoolHeight = 0;
  let schoolFieldVisible = false;
  let dpr = 1;
  let animationFrame = 0;

  function sizeCanvas(canvas, context, width, height) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
    ribbonWidth = feedbackRibbon.clientWidth;
    ribbonHeight = feedbackRibbon.clientHeight;
    sizeCanvas(atmosphereCanvas, atmosphere, viewportWidth, viewportHeight);
    sizeCanvas(signalCanvas, signal, ribbonWidth, ribbonHeight);
    syncSchoolCanvas();
    if (reduceMotion.matches) drawFrame(0, true);
  }

  function syncSchoolCanvas() {
    const nextWidth = schoolBay.clientWidth;
    const nextHeight = schoolBay.clientHeight;
    if (!nextWidth || !nextHeight) return;
    if (nextWidth === schoolWidth && nextHeight === schoolHeight) return;
    schoolWidth = nextWidth;
    schoolHeight = nextHeight;
    sizeCanvas(schoolCanvas, schoolField, schoolWidth, schoolHeight);
    drawSchoolField(0, true);
  }

  function drawAtmosphere(time) {
    atmosphere.clearRect(0, 0, viewportWidth, viewportHeight);
    const grid = viewportWidth < 768 ? 78 : 62;
    const drift = time ? (time * .002) % grid : 0;

    atmosphere.save();
    atmosphere.lineWidth = .55;
    atmosphere.strokeStyle = 'rgba(37,58,87,.045)';
    atmosphere.beginPath();
    for (let x = -grid + drift; x < viewportWidth + grid; x += grid) {
      atmosphere.moveTo(x, 0);
      atmosphere.lineTo(x, viewportHeight);
    }
    for (let y = -grid + drift * .4; y < viewportHeight + grid; y += grid) {
      atmosphere.moveTo(0, y);
      atmosphere.lineTo(viewportWidth, y);
    }
    atmosphere.stroke();

    const glow = atmosphere.createRadialGradient(
      viewportWidth * .9, viewportHeight * .2, 0,
      viewportWidth * .9, viewportHeight * .2, Math.max(viewportWidth, viewportHeight) * .4,
    );
    glow.addColorStop(0, 'rgba(217,230,244,.2)');
    glow.addColorStop(1, 'rgba(217,230,244,0)');
    atmosphere.fillStyle = glow;
    atmosphere.fillRect(0, 0, viewportWidth, viewportHeight);
    atmosphere.restore();
  }

  const loopPoints = [
    [.185, .48],
    [.834, .48],
    [.834, .82],
    [.185, .82],
    [.185, .48],
  ];

  function pointOnLoop(progress) {
    const segments = [];
    let total = 0;
    for (let index = 1; index < loopPoints.length; index += 1) {
      const from = loopPoints[index - 1];
      const to = loopPoints[index];
      const length = Math.hypot(
        (to[0] - from[0]) * ribbonWidth,
        (to[1] - from[1]) * ribbonHeight,
      );
      segments.push({ from, to, length });
      total += length;
    }

    let distance = ((progress % 1) + 1) % 1 * total;
    for (const segment of segments) {
      if (distance <= segment.length) {
        const ratio = segment.length ? distance / segment.length : 0;
        return {
          x: (segment.from[0] + (segment.to[0] - segment.from[0]) * ratio) * ribbonWidth,
          y: (segment.from[1] + (segment.to[1] - segment.from[1]) * ratio) * ribbonHeight,
        };
      }
      distance -= segment.length;
    }
    return { x: loopPoints[0][0] * ribbonWidth, y: loopPoints[0][1] * ribbonHeight };
  }

  function drawNodeGlow(x, y, radius, color, strength) {
    const glow = signal.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, color.replace('ALPHA', (.2 * strength).toFixed(3)));
    glow.addColorStop(.3, color.replace('ALPHA', (.11 * strength).toFixed(3)));
    glow.addColorStop(1, color.replace('ALPHA', '0'));
    signal.fillStyle = glow;
    signal.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  function drawSignalLayer(time, isStatic) {
    signal.clearRect(0, 0, ribbonWidth, ribbonHeight);
    const seconds = time / 1000;
    const nodeSpecs = [
      [.185, '#edbd5f', 0],
      [.356, '#78d1cb', .8],
      [.581, '#89b5e1', 1.6],
      [.834, '#ef8d7e', 2.4],
    ];

    nodeSpecs.forEach(([x, hex, phase]) => {
      const strength = isStatic ? .72 : .68 + Math.sin(seconds * 1.35 - phase) * .28;
      const rgb = hex === '#edbd5f' ? '237,189,95' :
        hex === '#78d1cb' ? '120,209,203' :
          hex === '#89b5e1' ? '137,181,225' : '239,141,126';
      drawNodeGlow(x * ribbonWidth, .48 * ribbonHeight, ribbonWidth < 600 ? 44 : 72, `rgba(${rgb},ALPHA)`, strength);
    });

    const particleCount = ribbonWidth < 640 ? 9 : 22;
    for (let index = 0; index < particleCount; index += 1) {
      const base = index / particleCount;
      const speed = .037 + (index % 4) * .004;
      const progress = isStatic ? base : base + seconds * speed;
      const point = pointOnLoop(progress);
      const tail = pointOnLoop(progress - .012);
      const isForward = point.y < ribbonHeight * .64;
      const color = isForward ? '237,189,95' : '120,209,203';
      const radius = index % 5 === 0 ? 2.7 : 1.55;

      const trail = signal.createLinearGradient(tail.x, tail.y, point.x, point.y);
      trail.addColorStop(0, `rgba(${color},0)`);
      trail.addColorStop(1, `rgba(${color},.62)`);
      signal.strokeStyle = trail;
      signal.lineWidth = radius * 1.15;
      signal.beginPath();
      signal.moveTo(tail.x, tail.y);
      signal.lineTo(point.x, point.y);
      signal.stroke();

      signal.shadowColor = `rgba(${color},.9)`;
      signal.shadowBlur = radius * 5;
      signal.fillStyle = `rgba(${color},.92)`;
      signal.beginPath();
      signal.arc(point.x, point.y, radius, 0, Math.PI * 2);
      signal.fill();
      signal.shadowBlur = 0;
    }
  }

  function drawSchoolRadar(x, y, radius, strength) {
    const glow = schoolField.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, `rgba(120,209,203,${.16 * strength})`);
    glow.addColorStop(.45, `rgba(120,209,203,${.07 * strength})`);
    glow.addColorStop(1, 'rgba(120,209,203,0)');
    schoolField.fillStyle = glow;
    schoolField.fillRect(x - radius, y - radius, radius * 2, radius * 2);

    schoolField.save();
    schoolField.strokeStyle = `rgba(120,209,203,${.14 * strength})`;
    schoolField.lineWidth = 1;
    for (let ring = 1; ring <= 3; ring += 1) {
      schoolField.beginPath();
      schoolField.arc(x, y, radius * ring / 3, 0, Math.PI * 2);
      schoolField.stroke();
    }
    schoolField.restore();
  }

  function drawSchoolField(time, isStatic) {
    if (!schoolWidth || !schoolHeight) return;
    schoolField.clearRect(0, 0, schoolWidth, schoolHeight);
    const seconds = time / 1000;
    const compact = schoolWidth < 700;
    const lanes = compact
      ? [.12, .38, .66, .9]
      : [.08, .27, .48, .7, .91];
    const nodeXs = [.22, .48, .74];

    schoolField.save();
    schoolField.lineWidth = 1;
    lanes.forEach((lane, laneIndex) => {
      const y = lane * schoolHeight;
      schoolField.strokeStyle = laneIndex % 2
        ? 'rgba(237,189,95,.1)'
        : 'rgba(120,209,203,.13)';
      schoolField.setLineDash([7, 12]);
      schoolField.beginPath();
      schoolField.moveTo(0, y);
      schoolField.bezierCurveTo(
        schoolWidth * .28, y + (laneIndex % 2 ? 14 : -12),
        schoolWidth * .68, y + (laneIndex % 2 ? -10 : 13),
        schoolWidth, y,
      );
      schoolField.stroke();
    });
    schoolField.setLineDash([]);

    nodeXs.forEach((nodeX, nodeIndex) => {
      lanes.forEach((lane, laneIndex) => {
        if ((nodeIndex + laneIndex) % 2 !== 0) return;
        const x = nodeX * schoolWidth;
        const y = lane * schoolHeight;
        const pulse = isStatic ? .55 : .55 + Math.sin(seconds * 1.15 - nodeIndex - laneIndex * .4) * .28;
        schoolField.fillStyle = `rgba(120,209,203,${.45 + pulse * .25})`;
        schoolField.shadowColor = 'rgba(120,209,203,.8)';
        schoolField.shadowBlur = 9 * pulse;
        schoolField.beginPath();
        schoolField.arc(x, y, compact ? 2.2 : 3, 0, Math.PI * 2);
        schoolField.fill();
        schoolField.shadowBlur = 0;
        schoolField.strokeStyle = `rgba(120,209,203,${.13 + pulse * .12})`;
        schoolField.beginPath();
        schoolField.arc(x, y, compact ? 8 : 12, 0, Math.PI * 2);
        schoolField.stroke();
      });
    });

    if (!compact) {
      const radarPulse = isStatic ? .62 : .62 + Math.sin(seconds * .72) * .2;
      drawSchoolRadar(schoolWidth * .92, schoolHeight * .09, 150, radarPulse);
      drawSchoolRadar(schoolWidth * .06, schoolHeight * .91, 118, radarPulse * .8);
    }

    const busXs = compact
      ? [5, schoolWidth - 5]
      : [7, 14, schoolWidth - 14, schoolWidth - 7];
    const nodeGap = compact ? 168 : 140;

    busXs.forEach((busX, busIndex) => {
      const busColor = busIndex % 3 === 0 ? '237,189,95' : '120,209,203';
      schoolField.strokeStyle = `rgba(${busColor},${compact ? .24 : .32})`;
      schoolField.lineWidth = busIndex % 2 === 0 ? 1 : .7;
      schoolField.setLineDash(busIndex % 2 === 0 ? [5, 9] : [2, 12]);
      schoolField.beginPath();
      schoolField.moveTo(busX, 24);
      schoolField.lineTo(busX, schoolHeight - 24);
      schoolField.stroke();
      schoolField.setLineDash([]);

      const pulseY = ((seconds * .045 + busIndex * .21) % 1) * schoolHeight;
      for (let nodeY = 54; nodeY < schoolHeight - 30; nodeY += nodeGap) {
        const rawDistance = Math.abs(nodeY - pulseY);
        const distance = Math.min(rawDistance, schoolHeight - rawDistance);
        const proximity = isStatic ? .18 : Math.max(0, 1 - distance / 90);
        const alpha = .22 + proximity * .62;
        schoolField.fillStyle = `rgba(${busColor},${alpha})`;
        schoolField.shadowColor = `rgba(${busColor},.9)`;
        schoolField.shadowBlur = 3 + proximity * 12;
        schoolField.beginPath();
        schoolField.arc(busX, nodeY, compact ? 1.4 : 2, 0, Math.PI * 2);
        schoolField.fill();
        schoolField.shadowBlur = 0;
      }
    });

    if (!compact && !isStatic) {
      const scanY = ((seconds % 16) / 16) * schoolHeight;
      const scan = schoolField.createLinearGradient(0, scanY - 42, 0, scanY + 42);
      scan.addColorStop(0, 'rgba(120,209,203,0)');
      scan.addColorStop(.48, 'rgba(120,209,203,.035)');
      scan.addColorStop(.5, 'rgba(142,219,212,.22)');
      scan.addColorStop(.52, 'rgba(120,209,203,.035)');
      scan.addColorStop(1, 'rgba(120,209,203,0)');
      schoolField.fillStyle = scan;
      schoolField.fillRect(0, scanY - 42, schoolWidth, 84);
    }

    if (!isStatic) {
      const busParticleCount = compact ? 10 : 28;
      for (let index = 0; index < busParticleCount; index += 1) {
        const busIndex = index % busXs.length;
        const busX = busXs[busIndex];
        const reverse = index % 6 === 0;
        const speed = .035 + (index % 4) * .006;
        const baseProgress = (index / busParticleCount + seconds * speed) % 1;
        const progress = reverse ? 1 - baseProgress : baseProgress;
        const y = 22 + progress * (schoolHeight - 44);
        const trailLength = compact ? 12 : 22;
        const tailY = y + (reverse ? trailLength : -trailLength);
        const color = reverse ? '237,189,95' : '120,209,203';
        const trail = schoolField.createLinearGradient(busX, tailY, busX, y);
        trail.addColorStop(0, `rgba(${color},0)`);
        trail.addColorStop(1, `rgba(${color},.88)`);
        schoolField.strokeStyle = trail;
        schoolField.lineWidth = index % 7 === 0 ? 2 : 1.2;
        schoolField.beginPath();
        schoolField.moveTo(busX, tailY);
        schoolField.lineTo(busX, y);
        schoolField.stroke();
        schoolField.fillStyle = `rgba(${color},.96)`;
        schoolField.shadowColor = `rgba(${color},.92)`;
        schoolField.shadowBlur = compact ? 5 : 9;
        schoolField.beginPath();
        schoolField.arc(busX, y, index % 7 === 0 ? 2.4 : 1.45, 0, Math.PI * 2);
        schoolField.fill();
        schoolField.shadowBlur = 0;
      }

      const particleCount = compact ? 12 : 34;
      for (let index = 0; index < particleCount; index += 1) {
        const laneIndex = index % lanes.length;
        const speed = .022 + (index % 5) * .0035;
        const progress = (index / particleCount + seconds * speed) % 1;
        const x = progress * schoolWidth;
        const laneY = lanes[laneIndex] * schoolHeight;
        const splitWave = Math.sin(progress * Math.PI * 6 + laneIndex) * (compact ? 4 : 9);
        const y = laneY + splitWave;
        const tailX = Math.max(0, x - (compact ? 14 : 24));
        const color = index % 7 === 0 ? '237,189,95' : '120,209,203';
        const radius = index % 6 === 0 ? 2.5 : 1.45;
        const trail = schoolField.createLinearGradient(tailX, y, x, y);
        trail.addColorStop(0, `rgba(${color},0)`);
        trail.addColorStop(1, `rgba(${color},.66)`);
        schoolField.strokeStyle = trail;
        schoolField.lineWidth = radius;
        schoolField.beginPath();
        schoolField.moveTo(tailX, y);
        schoolField.lineTo(x, y);
        schoolField.stroke();
        schoolField.fillStyle = `rgba(${color},.92)`;
        schoolField.shadowColor = `rgba(${color},.8)`;
        schoolField.shadowBlur = radius * 5;
        schoolField.beginPath();
        schoolField.arc(x, y, radius, 0, Math.PI * 2);
        schoolField.fill();
        schoolField.shadowBlur = 0;
      }
    }
    schoolField.restore();
  }

  function drawFrame(time, isStatic) {
    drawAtmosphere(isStatic ? 0 : time);
    drawSignalLayer(isStatic ? 0 : time, isStatic);
    if (isStatic) drawSchoolField(0, true);
    else if (schoolFieldVisible) drawSchoolField(time, false);
  }

  function animate(time) {
    drawFrame(time, false);
    animationFrame = requestAnimationFrame(animate);
  }

  function stop() {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  function start() {
    stop();
    if (reduceMotion.matches) {
      drawFrame(0, true);
      return;
    }
    animationFrame = requestAnimationFrame(animate);
  }

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      resize();
      start();
    }, 120);
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  function updateSchoolFieldState() {
    schoolBay.dataset.fieldActive = reduceMotion.matches
      ? 'static'
      : schoolFieldVisible ? 'active' : 'paused';
  }

  if ('IntersectionObserver' in window) {
    const schoolObserver = new IntersectionObserver((entries) => {
      schoolFieldVisible = entries[0]?.isIntersecting || false;
      updateSchoolFieldState();
      if (schoolFieldVisible) {
        drawSchoolField(reduceMotion.matches ? 0 : performance.now(), reduceMotion.matches);
      }
    }, { rootMargin: '40px 0px', threshold: .01 });
    schoolObserver.observe(schoolBay);
  } else {
    schoolFieldVisible = true;
  }

  if ('ResizeObserver' in window) {
    const schoolResizeObserver = new ResizeObserver(() => {
      syncSchoolCanvas();
    });
    schoolResizeObserver.observe(schoolBay);
  }

  const onMotionChange = () => {
    updateSchoolFieldState();
    start();
  };
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', onMotionChange);
  else reduceMotion.addListener(onMotionChange);

  updateSchoolFieldState();
  resize();
  start();
}());
