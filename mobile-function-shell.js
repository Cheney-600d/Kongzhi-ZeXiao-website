(function(){
  'use strict';
  var script = document.currentScript;
  var root = script && script.dataset.root ? script.dataset.root.replace(/\/$/, '') : '.';
  var icon = {
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    target: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    briefcase: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>'
  };
  var groups = [
    {label:'备考认知', icon:'book', items:[
      ['考研常识科普/index.html','28 考研常识扫盲'],['复试全攻略/index.html','27 考研复试'],['考研常识科普/experience.html','上岸经验贴'],['本科指南/index.html','大学生存与发展']
    ]},
    {label:'择校工具', icon:'target', items:[
      ['专业课选择/考研专业课院校查询.html','专业课院校查询'],['院校PK.html','院校 PK 对比'],['通信电子院校生源地图.html','院校生源地图'],['heat_compare.html','院校热度榜'],['改考院校.html','27 改考院校']
    ]},
    {label:'就业与能力', icon:'briefcase', items:[
      ['就业相关/就业去向index.html','就业去向'],['AI课程/ai-course-overview/ai-course-overview.html','AI 提效指南'],['就业相关/job-listing/job-listing.html','26 校招信息'],['就业相关/career-analysis/career-analysis.html','就业分析报告'],['就业相关/career-analysis/role-tech-stack.html','职业规划全景']
    ]}
  ];
  var path = decodeURI(location.pathname).replace(/\\/g,'/');
  var current = '';
  groups.some(function(group){ return group.items.some(function(item){ if(path.endsWith('/'+item[0]) || path.endsWith(item[0])){ current=item[1]; return true; } return false; }); });
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
      var active = current === item[1] ? ' aria-current="page"' : '';
      return '<a href="'+absolute(item[0])+'"'+active+'>'+item[1]+'</a>';
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
