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
    briefcase: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    clipboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>',
    message: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    grad: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    scale: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>',
    map: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/></svg>',
    flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>',
    sparkles: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/></svg>',
    megaphone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>',
    chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>',
    compass: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/></svg>'
  };
  var groups = [
    {label:'备考认知', icon:'book', items:[
      ['考研常识科普/index.html','28 考研常识扫盲','book'],['复试全攻略/index.html','27 考研复试','clipboard'],['考研常识科普/experience.html','上岸经验贴','message']
    ]},
    {label:'择校工具', icon:'target', items:[
      ['专业课选择/考研专业课院校查询.html','专业课院校查询','search'],['院校PK.html','院校 PK 对比','scale'],['通信电子院校生源地图.html','院校生源地图','map'],['heat_compare.html','院校热度榜','flame'],['改考院校.html','27 改考院校','refresh']
    ]},
    {label:'就业与能力', icon:'briefcase', items:[
      ['就业相关/就业去向index.html','就业去向','briefcase'],['AI课程/ai-course-overview/ai-course-overview.html','AI 提效指南','sparkles'],['就业相关/job-listing/job-listing.html','26 校招信息','megaphone'],['就业相关/career-analysis/career-analysis.html','就业分析报告','chart'],['就业相关/career-analysis/role-tech-stack.html','职业规划全景','compass']
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
      return '<a href="'+absolute(item[0])+'"'+active+'>'+icon[item[2]]+item[1]+'</a>';
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
