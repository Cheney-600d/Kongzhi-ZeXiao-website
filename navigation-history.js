(function(){
  'use strict';

  var current = location.href;
  var referrer = '';
  var trailKey = 'control_school_navigation_trail_v2';
  var viewKey = 'control_school_view_state_v1';
  var trail = [];
  try {
    if(document.referrer){
      var parsed = new URL(document.referrer, current);
      if(parsed.origin === location.origin && parsed.href !== current) referrer = parsed.href;
    }
  } catch(error) {}

  try {
    trail = JSON.parse(sessionStorage.getItem(trailKey) || '[]');
    if(!Array.isArray(trail)) trail = [];
    if(trail.length === 0 || trail[trail.length - 1] !== current){
      trail.push(current);
      if(trail.length > 80) trail = trail.slice(-80);
      sessionStorage.setItem(trailKey, JSON.stringify(trail));
    }
  } catch(error) { trail = []; }

  function previousSiteUrl(){
    for(var i = trail.length - 2; i >= 0; i--){
      try {
        var candidate = new URL(trail[i], current);
        if(candidate.origin === location.origin && candidate.href !== current) return candidate.href;
      } catch(error) {}
    }
    return '';
  }

  function siteRoot(){
    if(document.documentElement.dataset.siteRoot){
      return new URL(document.documentElement.dataset.siteRoot.replace(/\/$/,'') + '/', current);
    }
    var marker = ['/复试全攻略/','/考研常识科普/','/专业课选择/','/就业相关/','/school_detail/'];
    var pathname = decodeURIComponent(location.pathname);
    for(var i = 0; i < marker.length; i++){
      var at = pathname.indexOf(marker[i]);
      if(at !== -1) return new URL(pathname.slice(0, at + 1), location.origin);
    }
    return new URL('./', location.href);
  }

  function parentFallback(){
    var root = siteRoot();
    var path = decodeURIComponent(location.pathname).replace(/\\/g,'/');
    var target = 'index.html';
    if(/\/复试全攻略\/(?!index\.html$)/.test(path)) target = '复试全攻略/index.html';
    else if(/\/考研常识科普\/experience\/post-/.test(path)) target = '考研常识科普/experience.html';
    else if(/\/考研常识科普\/(?!index\.html$|experience\.html$)/.test(path)) target = '考研常识科普/index.html';
    else if(/\/就业相关\/院校就业去向\/schools\//.test(path)) target = '就业相关/就业去向index.html';
    else if(/\/就业相关\/career-analysis\/role-tech-stack\.html$/.test(path)) target = '就业相关/career-analysis/career-analysis.html';
    else if(/\/专业课选择\/kecheng_difficulty\.html$/.test(path)) target = '专业课选择/考研专业课院校查询.html';
    return new URL(target + '?from=parent-fallback', root).href;
  }

  function explicitSchoolParent(){
    var params = new URLSearchParams(location.search);
    var school = params.get('sourceSchool');
    if(!school || params.get('fromSchoolDetail') !== '1') return '';
    var url = new URL('index.html', siteRoot());
    url.searchParams.set('school', school);
    url.searchParams.set('from', 'school-context-fallback');
    return url.href;
  }

  function captureViewState(){
    var controls = {};
    document.querySelectorAll('select[id],input[id],textarea[id]').forEach(function(el){
      if(el.type === 'password' || el.type === 'file') return;
      controls[el.id] = el.type === 'checkbox' || el.type === 'radio' ? !!el.checked : el.value;
    });
    var payload = { url: current, x: scrollX, y: scrollY, controls: controls, at: Date.now() };
    try { sessionStorage.setItem(viewKey + ':' + location.pathname + location.search, JSON.stringify(payload)); } catch(error) {}
  }

  function restoreViewState(){
    var raw = null;
    try { raw = sessionStorage.getItem(viewKey + ':' + location.pathname + location.search); } catch(error) {}
    if(!raw) return;
    try {
      var saved = JSON.parse(raw);
      Object.keys(saved.controls || {}).forEach(function(id){
        var el = document.getElementById(id);
        if(!el || el.type === 'password' || el.type === 'file') return;
        if(el.type === 'checkbox' || el.type === 'radio') el.checked = !!saved.controls[id];
        else el.value = saved.controls[id];
      });
      requestAnimationFrame(function(){ scrollTo(saved.x || 0, saved.y || 0); });
    } catch(error) {}
  }

  addEventListener('pagehide', captureViewState);
  addEventListener('pageshow', function(event){ if(event.persisted) restoreViewState(); });

  function fallbackFor(anchor){
    var href = anchor && anchor.getAttribute('href');
    if(href && !/^javascript:/i.test(href) && href !== '#') return href;
    return document.documentElement.dataset.siteRoot
      ? document.documentElement.dataset.siteRoot.replace(/\/$/,'') + '/index.html?from=history-fallback'
      : parentFallback();
  }

  window.siteHistoryBack = function(fallback){
    var schoolParent = explicitSchoolParent();
    if(schoolParent){
      // School child pages must always return to that school's detail view.
      // replace() also removes the child from the forward/back loop, which is
      // important in mobile browsers that restore a page's intermediate state.
      window.location.replace(schoolParent);
      return;
    }
    var previous = previousSiteUrl();
    if(referrer){
      window.history.back();
      return;
    }
    if(previous){
      trail.pop();
      try { sessionStorage.setItem(trailKey, JSON.stringify(trail)); } catch(error) {}
      window.location.assign(previous);
      return;
    }
    window.location.replace(fallback || parentFallback());
  };

  document.addEventListener('click',function(event){
    var control = event.target.closest('a,button');
    if(!control) return;
    if(control.hasAttribute('data-fixed-destination') || control.hasAttribute('data-internal-back')) return;
    var label = (control.textContent || '').replace(/\s+/g,'').trim();

    // 明确写明“首页”的入口保持固定目的地；页面内部状态返回也保留原处理函数。
    if(/返回(?:网站|择校|指南)?首页|网站首页|择校首页/.test(label)) return;
    if(control.matches('[onclick*="showMain"],[onclick*="goBackFromSchool"]')) return;

    // 已明确写出父级名称的按钮，按信息架构返回固定父级，不受其他浏览历史干扰。
    if(/返回经验贴列表|返回课程总览|返回就业去向/.test(label)){
      var parentHref = control.getAttribute('href');
      if(parentHref && !/^javascript:/i.test(parentHref) && parentHref !== '#') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.assign(parentFallback());
      return;
    }

    if(/返回上一级|返回上一页/.test(label)){
      event.preventDefault();
      event.stopImmediatePropagation();
      window.siteHistoryBack(fallbackFor(control));
    }
  },true);
})();
