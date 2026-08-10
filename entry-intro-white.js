(function () {
  'use strict';

  var intro = document.getElementById('entryIntro');
  var skip = document.getElementById('entryIntroSkip');
  if (!intro || !skip) return;

  var storageKey = 'control_school_white_intro_seen_v1';
  var forceReplay = window.location.search.indexOf('intro=1') !== -1;
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasPlayed = false;

  try {
    hasPlayed = window.sessionStorage.getItem(storageKey) === '1';
  } catch (error) {}

  if ((!forceReplay && hasPlayed) || reducedMotion) {
    intro.remove();
    return;
  }

  document.documentElement.classList.add('entry-intro-running');
  var closed = false;
  var removalTimer = null;
  var autoTimer = window.setTimeout(function () {
    closeIntro('complete');
  }, 4550);

  function remember() {
    try {
      window.sessionStorage.setItem(storageKey, '1');
    } catch (error) {}
  }

  function closeIntro(reason) {
    if (closed) return;
    closed = true;
    window.clearTimeout(autoTimer);
    remember();
    intro.setAttribute('data-exit-reason', reason);
    intro.classList.add('entry-intro--leaving');
    removalTimer = window.setTimeout(function () {
      document.documentElement.classList.remove('entry-intro-running');
      intro.remove();
    }, 1080);
  }

  skip.addEventListener('click', function () { closeIntro('skip'); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeIntro('escape');
  });
  window.addEventListener('pagehide', function () {
    window.clearTimeout(autoTimer);
    window.clearTimeout(removalTimer);
  });
})();
