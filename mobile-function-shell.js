(function(){
  'use strict';
  var script = document.currentScript;
  var root = script && script.dataset.root ? script.dataset.root.replace(/\/$/, '') : '.';
    var icon = Object.assign({}, window.NAV_ICONS, {
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>'
  });
  var groups = window.NAV_GROUPS;
  var path = decodeURI(location.pathname).replace(/\\/g,'/');
  var current = '';
  groups.some(function(group){ return group.items.some(function(item){ if(path.endsWith('/'+item.href) || path.endsWith(item.href)){ current=item.label; return true; } return false; }); });
  if(!current){
    var heading = document.querySelector('h1');
    current = heading && heading.textContent.trim() ? heading.textContent.trim() : (document.title || '控制考研工具');
  }
  var absolute = function(relative){ return root + '/' + relative; };
  var currentUrl = location.href;
  var referrerUrl = '';
  var trailKey = 'control_school_navigation_trail_v2';
  var trail = [];
  try {
    if(document.referrer){
      var ref = new URL(document.referrer, currentUrl);
      if(ref.origin === location.origin && ref.href !== currentUrl) referrerUrl = ref.href;
    }
  } catch(error) {}
  try {
    trail = JSON.parse(sessionStorage.getItem(trailKey) || '[]');
    if(!Array.isArray(trail)) trail = [];
    if(trail.length === 0 || trail[trail.length - 1] !== currentUrl){
      trail.push(currentUrl);
      if(trail.length > 80) trail = trail.slice(-80);
      sessionStorage.setItem(trailKey, JSON.stringify(trail));
    }
  } catch(error) { trail = []; }

  var previousSiteUrl = function(){
    for(var i = trail.length - 2; i >= 0; i--){
      try {
        var candidate = new URL(trail[i], currentUrl);
        if(candidate.origin === location.origin && candidate.href !== currentUrl) return candidate.href;
      } catch(error) {}
    }
    return '';
  };

  var explicitSchoolParent = function(){
    var params = new URLSearchParams(location.search);
    var school = params.get('sourceSchool');
    if(!school || params.get('fromSchoolDetail') !== '1') return '';
    var url = new URL(absolute('index.html'), location.href);
    url.searchParams.set('school', school);
    url.searchParams.set('from', 'mobile-school-context-fallback');
    return url.href;
  };
  var historyFallback = absolute('index.html') + '?from=mobile-back-fallback';
  var goPrevious = function(event){
    if(event) event.preventDefault();
    var schoolParent = explicitSchoolParent();
    if(schoolParent){
      var referrerMatches = false;
      try {
        var ref = new URL(referrerUrl, currentUrl);
        var sourceSchool = new URL(location.href).searchParams.get('sourceSchool');
        referrerMatches = ref.origin === location.origin && /\/index\.html$/.test(ref.pathname) &&
          (ref.searchParams.get('uiSchool') === sourceSchool || ref.searchParams.get('school') === sourceSchool);
      } catch(error) {}
      if(referrerMatches) window.history.back();
      else window.location.assign(schoolParent);
      return;
    }
    if(typeof window.siteHistoryBack === 'function'){
      window.siteHistoryBack(historyFallback);
      return;
    }
    var previous = previousSiteUrl();
    if(referrerUrl){
      window.history.back();
      return;
    }
    if(previous){
      trail.pop();
      try { sessionStorage.setItem(trailKey, JSON.stringify(trail)); } catch(error) {}
      window.location.assign(previous);
      return;
    }
    window.location.replace(historyFallback);
  };
  var groupHtml = groups.map(function(group){
    return '<section class="mfs-group"><b>'+icon[group.icon]+group.label+'</b><div class="mfs-grid">'+group.items.map(function(item){
      var active = current === item.label ? ' aria-current="page"' : '';
      return '<a href="'+absolute(item.href)+'"'+active+'>'+icon[item.icon]+item.label+'</a>';
    }).join('')+'</div></section>';
  }).join('');

  document.body.insertAdjacentHTML('afterbegin',
    '<header class="mfs-topbar" aria-label="移动端页面导航">'+
      '<button class="mfs-icon-btn" type="button" data-mfs-back aria-label="返回上一页" title="返回上一页">'+icon.back+'</button>'+
      '<span class="mfs-title"><small>CONTROL TOOL / MOBILE</small><strong>'+current+'</strong></span>'+
      '<button class="mfs-menu-btn" type="button" data-mfs-open>'+icon.grid+'<span>全部功能</span></button>'+
    '</header>'+
    '<nav class="mfs-dock" aria-label="移动端快捷导航">'+
      '<a href="'+absolute('index.html')+'">'+icon.home+'<span>首页</span></a>'+
      '<button class="is-primary" type="button" data-mfs-open>'+icon.grid+'<span>功能</span></button>'+
      '<button type="button" data-mfs-top>'+icon.up+'<span>顶部</span></button>'+
    '</nav>'+
    '<button class="mfs-scrim" type="button" data-mfs-close aria-label="关闭功能菜单"></button>'+
    '<aside class="mfs-sheet" aria-hidden="true" aria-label="全站功能">'+
      '<div class="mfs-sheet__handle"></div><header class="mfs-sheet__head"><span><small>CONTROL HUB</small><strong>选择下一项工具</strong></span><button class="mfs-sheet__close" type="button" data-mfs-close aria-label="关闭功能菜单">'+icon.close+'</button></header>'+groupHtml+
    '</aside>'
  );
  document.body.classList.add('mobile-function-ready');

  var sheet = document.querySelector('.mfs-sheet');
  var scrim = document.querySelector('.mfs-scrim');
  var close = function(){ sheet.classList.remove('is-open'); scrim.classList.remove('is-open'); sheet.setAttribute('aria-hidden','true'); document.documentElement.style.overflow=''; };
  var open = function(){ sheet.classList.add('is-open'); scrim.classList.add('is-open'); sheet.setAttribute('aria-hidden','false'); document.documentElement.style.overflow='hidden'; };
  document.querySelectorAll('[data-mfs-open]').forEach(function(btn){ btn.addEventListener('click',open); });
  document.querySelectorAll('[data-mfs-close]').forEach(function(btn){ btn.addEventListener('click',close); });
  document.querySelector('[data-mfs-back]').addEventListener('click',goPrevious);
  document.querySelector('[data-mfs-top]').addEventListener('click',function(){ window.scrollTo({top:0,behavior:'smooth'}); });
  document.addEventListener('keydown',function(event){ if(event.key==='Escape') close(); });
})();
