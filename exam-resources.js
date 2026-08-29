(function(){
  'use strict';
  var resourceList=document.getElementById('resourceList');
  var videoList=document.getElementById('videoList');
  if(!resourceList||!videoList)return;

  function normalizeExternalUrl(value){
    var text=String(value||'').trim();
    if(!text)return'';
    var match=text.match(/https?:\/\/[^\s"'<>，。；;]+/i);
    if(!match)match=text.match(/(?:pan\.baidu\.com|b23\.tv|(?:www\.)?bilibili\.com)\/[^\s"'<>，。；;]+/i);
    var url=match?match[0]:text;
    if(!/^https?:\/\//i.test(url)&&/^(?:pan\.baidu\.com|b23\.tv|(?:www\.)?bilibili\.com)\//i.test(url))url='https://'+url;
    url=url.replace(/[，。；;、）)\]】]+$/g,'');
    return/^https?:\/\//i.test(url)?url:'';
  }

  function node(tag,className,text){var el=document.createElement(tag);if(className)el.className=className;if(text!=null)el.textContent=text;return el;}
  function icon(className){var i=node('i',className);i.setAttribute('aria-hidden','true');return i;}
  function empty(title,copy){var box=node('div','exam-empty');box.append(icon('fa-regular fa-folder-open'),node('strong','',title),node('span','',copy));return box;}

  function copyText(value,button){
    function done(){
      var original=button.dataset.label||button.textContent;
      button.dataset.label=original;
      button.replaceChildren(icon('fa-solid fa-check'),document.createTextNode('已复制'));
      button.classList.add('is-copied');
      window.setTimeout(function(){button.replaceChildren(icon('fa-regular fa-copy'),document.createTextNode(original));button.classList.remove('is-copied');},1800);
    }
    if(navigator.clipboard&&window.isSecureContext){
      navigator.clipboard.writeText(value).then(done).catch(function(){fallbackCopy(value,done);});
    }else fallbackCopy(value,done);
  }

  function fallbackCopy(value,onDone){
    var input=node('textarea');input.value=value;input.setAttribute('readonly','');input.style.position='fixed';input.style.opacity='0';document.body.appendChild(input);input.select();
    try{document.execCommand('copy');onDone();}catch(error){}finally{input.remove();}
  }

  function resourceCard(item){
    var card=node('article','resource-card');
    var mark=node('span','resource-card__icon');mark.appendChild(icon('fa-solid fa-cloud-arrow-down'));
    var copy=node('div','resource-card__copy');copy.append(node('h3','',item.title),node('p','',item.description||'点击按钮前往资料领取页面。'));
    var actions=node('div','resource-card__actions');
    var target=normalizeExternalUrl(item.link_url);
    if(target){
      var link=node('a','',item.config&&item.config.cta||'领取资料');link.href=target;link.target='_blank';link.rel='noopener noreferrer';link.appendChild(icon('fa-solid fa-arrow-up-right-from-square'));actions.appendChild(link);
      var copyButton=node('button');copyButton.type='button';copyButton.append(icon('fa-regular fa-copy'),document.createTextNode('复制链接'));copyButton.addEventListener('click',function(){copyText(target,copyButton);});actions.appendChild(copyButton);
    }else{
      var disabled=node('button','', '链接待完善');disabled.type='button';disabled.disabled=true;actions.appendChild(disabled);
    }
    card.append(mark,copy,actions);return card;
  }

  function videoItems(module){
    var configured=module&&module.config&&Array.isArray(module.config.video_items)?module.config.video_items:[];
    var items=configured.map(function(video){
      return{url:normalizeExternalUrl(video&&(video.url||video.link_url)),title:String(video&&video.title||'').trim(),platform:String(video&&video.platform||'').trim(),duration:String(video&&video.duration||'').trim()};
    }).filter(function(video){return video.url;});
    var fallback=normalizeExternalUrl(module&&module.link_url);
    if(!items.length&&fallback)items.push({url:fallback,title:module.title||'',platform:module.config&&module.config.platform||'哔哩哔哩',duration:module.config&&module.config.duration||''});
    return items;
  }

  function videoLink(video,index){
    var link=node('a','video-link-item');link.href=video.url;link.target='_blank';link.rel='noopener noreferrer';
    link.appendChild(node('span','video-link-item__index',String(index+1).padStart(2,'0')));
    var copy=node('span','video-link-item__copy');copy.append(node('strong','',video.title||'真题配套讲解 '+(index+1)),node('small','',(video.platform||'视频链接')+(video.duration?' · '+video.duration:'')));link.appendChild(copy);
    var meta=node('span','video-link-item__meta');meta.append(node('span','','打开视频'),icon('fa-solid fa-arrow-up-right-from-square'));link.appendChild(meta);return link;
  }

  fetch('/api/exam-resources',{headers:{Accept:'application/json'}}).then(function(response){if(!response.ok)throw new Error('请求失败');return response.json();}).then(function(json){
    var items=json&&json.data&&json.data.items||[];
    var resources=items.filter(function(item){return item.type!=='video';});
    var videos=[];items.filter(function(item){return item.type==='video';}).forEach(function(item){videos=videos.concat(videoItems(item));});
    resourceList.replaceChildren();videoList.replaceChildren();
    if(resources.length)resources.forEach(function(item){resourceList.appendChild(resourceCard(item));});else resourceList.appendChild(empty('资料入口待发布','管理员可在内容后台切换到“真题备考区”，添加百度云链接并发布。'));
    if(videos.length)videos.forEach(function(video,index){videoList.appendChild(videoLink(video,index));});else videoList.appendChild(empty('配套讲解待发布','在后台每行粘贴一个 B 站链接，批量获取后即可发布为可跳转列表。'));
  }).catch(function(){resourceList.replaceChildren(empty('资料暂时无法加载','请确认本地后台服务正在运行后刷新页面。'));videoList.replaceChildren(empty('视频暂时无法加载','请确认本地后台服务正在运行后刷新页面。'));});
})();
