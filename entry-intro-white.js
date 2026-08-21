(function () {
  'use strict';

  var intro = document.getElementById('entryIntro');
  var skip = document.getElementById('entryIntroSkip');
  if (!intro || !skip) return;

  var storageKey = 'control_school_white_intro_seen_v1';
  var forceReplay = window.location.search.indexOf('intro=1') !== -1;
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasPlayed = false;

  /*
   * intro=1 只负责触发这一次动画，不应该成为浏览器历史里的返回落点。
   * 动画继续播放，但立即把当前历史项规范化为普通主页地址。
   */
  if (forceReplay && window.history && window.history.replaceState) {
    try {
      var cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('intro');
      window.history.replaceState(window.history.state, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
    } catch (error) {}
  }

  try {
    hasPlayed = window.sessionStorage.getItem(storageKey) === '1';
    if (!hasPlayed) window.sessionStorage.setItem(storageKey, '1');
  } catch (error) {}

  // 带 school/from 参数 = 从专业课查询等子页面跳转回来的详情页场景，用户已在站内，跳过开场动画
  var isDetailEntry = window.location.search.indexOf('school=') !== -1 ||
                      window.location.search.indexOf('from=') !== -1;

  // 从站内其他页面返回首页时，不重复播放入场动画
  var isReturnFromSite = false;
  try {
    if (document.referrer) {
      var refUrl = new URL(document.referrer);
      if (refUrl.origin === window.location.origin) isReturnFromSite = true;
    }
  } catch (error) {}

  if ((!forceReplay && (hasPlayed || isReturnFromSite)) || reducedMotion || isDetailEntry) {
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

  function removeIntroImmediately() {
    closed = true;
    window.clearTimeout(autoTimer);
    window.clearTimeout(removalTimer);
    remember();
    document.documentElement.classList.remove('entry-intro-running');
    if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
  }

  skip.addEventListener('click', function () { closeIntro('skip'); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeIntro('escape');
  });
  // 离开主页前直接移除动画层，避免浏览器从 BFCache 恢复时把开场画面一并带回来。
  window.addEventListener('pagehide', removeIntroImmediately);
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) removeIntroImmediately();
  });
})();
