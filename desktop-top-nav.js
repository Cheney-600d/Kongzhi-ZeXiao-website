(function () {
  function isDesktop() {
    return !window.matchMedia || window.matchMedia('(min-width: 769px)').matches;
  }

  function homeHref() {
    var path = location.pathname;
    var parts = path.split('/').filter(Boolean);
    var depth = parts.length - 1;
    if (depth <= 0) return 'index.html';
    return '../'.repeat(depth) + 'index.html';
  }

  function rootHomePath() {
    return new URL(homeHref(), location.href).pathname;
  }

  function findMainNav() {
    return document.querySelector('.site-nav, .main-nav, .navbar, .exam-site-header');
  }

  function getBackHref() {
    var up = document.querySelector('.back-nav .back-up, .back-nav a.back-up');
    if (up) {
      var href = up.getAttribute('href') || '';
      if (href) return href;
    }
    return '';
  }

  function hasRootHomeLink(nav) {
    var root = rootHomePath();
    var links = nav.querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      try {
        if (new URL(links[i].href, location.href).pathname === root) return true;
      } catch (e) {}
    }
    return false;
  }

  function hasBackLink(nav) {
    return !!nav.querySelector('.dt-back, a.back-up');
  }

  function addHomeToNav(nav) {
    if (hasRootHomeLink(nav)) return;
    var a = document.createElement('a');
    a.href = homeHref();
    a.textContent = '🏠 首页';
    a.style.marginLeft = 'auto';
    a.style.color = '#a92122';
    a.style.fontWeight = '700';
    a.style.textDecoration = 'none';
    nav.appendChild(a);
  }

  function addBackToNav(nav) {
    if (hasBackLink(nav)) return;
    var href = getBackHref();
    if (!href) return;
    var a = document.createElement('a');
    a.className = 'dt-back';
    a.href = href;
    a.textContent = '← 返回上一级';
    a.style.marginLeft = '12px';
    a.style.color = '#a92122';
    a.style.fontWeight = '700';
    a.style.textDecoration = 'none';
    nav.appendChild(a);
  }

  function injectStandaloneNav() {
    var nav = document.createElement('div');
    nav.className = 'desktop-top-nav';

    var home = document.createElement('a');
    home.className = 'dt-home';
    home.href = homeHref();
    home.textContent = '🏠 首页';
    nav.appendChild(home);

    var backHref = getBackHref();
    if (backHref) {
      var back = document.createElement('a');
      back.className = 'dt-back';
      back.href = backHref;
      back.textContent = '← 返回上一级';
      nav.appendChild(back);
    }

    var title = document.title || '';
    title = title.replace(/[|｜].*$/, '').trim();
    if (title) {
      var span = document.createElement('span');
      span.className = 'dt-title';
      span.textContent = title;
      nav.appendChild(span);
    }

    document.body.insertBefore(nav, document.body.firstChild);
  }

  function injectStyle() {
    var css = '.desktop-top-nav{display:flex;align-items:center;gap:12px;padding:10px 20px;background:#fff;border-bottom:1px solid #e3e5e7;position:sticky;top:0;z-index:1000}.desktop-top-nav a.dt-home,.desktop-top-nav a.dt-back{color:#a92122;font-weight:700;text-decoration:none;font-size:0.9rem;white-space:nowrap}.desktop-top-nav a.dt-home:hover,.desktop-top-nav a.dt-back:hover{text-decoration:underline}.desktop-top-nav .dt-title{color:#61666d;font-size:0.85rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}@media(max-width:768px){.desktop-top-nav{display:none!important}}';
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function init() {
    injectStyle();
    if (!isDesktop()) return;

    var mainNav = findMainNav();
    if (mainNav) {
      addHomeToNav(mainNav);
      addBackToNav(mainNav);
    } else {
      injectStandaloneNav();
    }
  }

  function onReady() {
    setTimeout(init, 100);
  }

  if (document.readyState === 'complete') {
    onReady();
  } else {
    window.addEventListener('load', onReady);
  }
})();
