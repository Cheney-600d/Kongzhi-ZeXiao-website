(function () {
  'use strict';

  if (window.__siteClickAnalyticsStarted) return;
  window.__siteClickAnalyticsStarted = true;
  var pagePath = decodeURI(location.pathname || '/');
  if (pagePath.indexOf('/数据库/') !== -1 || /\/admin\.html$/i.test(pagePath)) return;

  function clean(value, limit) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
  }

  function targetPath(element) {
    var raw = element.getAttribute('href') || element.getAttribute('data-href') || '';
    if (!raw || raw.charAt(0) === '#') return '';
    try {
      var url = new URL(raw, location.href);
      if (url.origin === location.origin) return decodeURI(url.pathname);
      return url.hostname + decodeURI(url.pathname);
    } catch (error) {
      return clean(raw, 360);
    }
  }

  function targetType(element) {
    if (element.tagName === 'A') return 'link';
    if (element.tagName === 'BUTTON' || element.tagName === 'INPUT') return 'button';
    if (element.hasAttribute('onclick')) return 'card';
    return 'control';
  }

  function send(payload) {
    var body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      var queued = navigator.sendBeacon('/api/analytics/click', new Blob([body], { type: 'application/json' }));
      if (queued) return;
    }
    fetch('/api/analytics/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
      credentials: 'same-origin',
      keepalive: true
    }).catch(function () {});
  }

  document.addEventListener('click', function (event) {
    if (!event.isTrusted || event.button !== 0) return;
    var element = event.target && event.target.closest
      ? event.target.closest('a[href],button,[role="button"],[onclick],[data-analytics-click],input[type="submit"],input[type="button"]')
      : null;
    if (!element || element.disabled || element.getAttribute('aria-disabled') === 'true') return;
    var label = clean(
      element.getAttribute('data-analytics-click') || element.getAttribute('aria-label') ||
      element.getAttribute('title') || element.value || element.textContent,
      100
    );
    send({
      page_path: pagePath,
      page_title: clean(document.title, 120),
      target_type: targetType(element),
      target_label: label || '未命名操作',
      target_path: targetPath(element)
    });
  }, true);
})();
