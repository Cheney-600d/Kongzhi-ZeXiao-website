(function(){
  var nav=document.querySelector('.site-nav');
  var toggle=document.querySelector('.site-nav__toggle');
  var tools=document.querySelector('.site-nav__tools');
  var toolsButton=document.querySelector('.site-nav__tools-btn');
  var scrim=document.querySelector('.site-nav__scrim');
  var closeButton=document.querySelector('.site-nav__close');
  var rail=document.querySelector('.site-nav__rail span');
  if(!nav||!toggle||!tools||!toolsButton)return;
  toggle.addEventListener('click',function(){var open=nav.classList.toggle('is-open');toggle.setAttribute('aria-expanded',String(open));});
  toolsButton.addEventListener('click',function(){var open=tools.classList.toggle('is-open');toolsButton.setAttribute('aria-expanded',String(open));});
  if(scrim)scrim.addEventListener('click',function(){tools.classList.remove('is-open');toolsButton.setAttribute('aria-expanded','false');});
  if(closeButton)closeButton.addEventListener('click',function(){tools.classList.remove('is-open');toolsButton.setAttribute('aria-expanded','false');toolsButton.focus();});
  document.addEventListener('click',function(e){if(!tools.contains(e.target)){tools.classList.remove('is-open');toolsButton.setAttribute('aria-expanded','false');}if(!nav.contains(e.target)){nav.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');}});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){tools.classList.remove('is-open');nav.classList.remove('is-open');toolsButton.setAttribute('aria-expanded','false');toggle.setAttribute('aria-expanded','false');}});
  function updateRail(){var max=document.documentElement.scrollHeight-innerHeight;rail.style.width=(max>0?Math.max(18,scrollY/max*100):18)+'%';}
  addEventListener('scroll',updateRail,{passive:true});addEventListener('resize',updateRail);updateRail();
  var lastScrollY=window.scrollY;
  var mobileQuery=window.matchMedia('(max-width: 980px)');
  function updateMobileDock(){
    if(!mobileQuery.matches||tools.classList.contains('is-open')){tools.classList.remove('is-compact');lastScrollY=window.scrollY;return;}
    var next=window.scrollY;
    if(next>120&&next>lastScrollY+3)tools.classList.add('is-compact');
    else if(next<lastScrollY-5||next<80)tools.classList.remove('is-compact');
    lastScrollY=next;
  }
  addEventListener('scroll',updateMobileDock,{passive:true});
  mobileQuery.addEventListener&&mobileQuery.addEventListener('change',updateMobileDock);
})();
