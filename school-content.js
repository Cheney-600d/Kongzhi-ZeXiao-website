(function(){
  'use strict';

  function icon(className){var i=document.createElement('i');i.className=className;i.setAttribute('aria-hidden','true');return i;}
  function safeUrl(value,embedded){var url=String(value||'').trim();if(embedded&&url.indexOf('../')===0)url=url.slice(3);return /^(https?:\/\/|\/|\.\.\/|\.\/|[^:?#]+(?:[/?#]|$))/i.test(url)?url:'#';}
  function formatDate(value){if(!value)return'';var d=new Date(value);if(Number.isNaN(d.getTime()))return String(value).slice(0,10);return d.toLocaleDateString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit'}).replaceAll('/','-');}

  function renderModule(item,options){
    var article=document.createElement('article');article.className='school-module school-module--'+item.type;
    if(item.type==='video'||item.type==='image'||item.type==='qr_group'){
      var media=document.createElement('div');media.className='school-module__media';
      if(item.cover_url){var img=document.createElement('img');img.src=safeUrl(item.cover_url,options.embedded);img.alt=item.type==='qr_group'?item.title+'二维码':item.title+'封面';img.loading='lazy';media.appendChild(img);}else{var placeholder=document.createElement('div');placeholder.className='school-module__placeholder';placeholder.append(icon(item.type==='qr_group'?'fa-solid fa-qrcode':'fa-regular fa-image'));var hint=document.createElement('span');hint.textContent=item.type==='qr_group'?'二维码待更新':'封面待更新';placeholder.appendChild(hint);media.appendChild(placeholder);}
      if(item.type==='video'){var play=document.createElement('span');play.className='school-module__play';play.appendChild(icon('fa-solid fa-play'));media.appendChild(play);}
      article.appendChild(media);
    }
    var body=document.createElement('div');body.className='school-module__body';
    var type=document.createElement('span');type.className='school-module__type';type.textContent=({video:'视频',qr_group:'群二维码',image:'图片',link:'链接',rich_text:'公告'})[item.type]||'内容';
    var title=document.createElement('h3');title.textContent=item.title;var desc=document.createElement('p');desc.textContent=item.description||'暂无补充说明';body.append(type,title,desc);
    var meta=document.createElement('div');meta.className='school-module__meta';
    if(item.config&&item.config.platform){var platform=document.createElement('span');platform.textContent=item.config.platform;meta.appendChild(platform);}
    if(item.config&&item.config.duration){var duration=document.createElement('span');duration.textContent=item.config.duration;meta.appendChild(duration);}
    if(item.config&&item.config.expires_at){var expires=document.createElement('span');expires.textContent='有效期至 '+item.config.expires_at;meta.appendChild(expires);}
    var date=document.createElement('span');date.textContent='更新于 '+formatDate(item.updated_at);meta.appendChild(date);body.appendChild(meta);
    var href=safeUrl(item.link_url,options.embedded);if(item.link_url&&href!=='#'){var action=document.createElement('a');action.className='school-module__action';action.href=href;action.target='_blank';action.rel='noopener noreferrer';var cta=document.createElement('span');cta.textContent=(item.config&&item.config.cta)||(item.type==='qr_group'?'扫码加入':'查看详情');action.append(cta,icon('fa-solid fa-arrow-right'));body.appendChild(action);}
    article.appendChild(body);return article;
  }

  function prepareSection(section,options){
    section.classList.add('school-content-section');
    if(options.embedded)section.classList.add('school-content-section--embedded');
    section.replaceChildren();
    var heading=document.createElement('header');heading.className='school-content-heading';
    var headingCopy=document.createElement('div');var h2=document.createElement('h2');h2.textContent=options.title||'院校动态与交流';var lead=document.createElement('p');lead.textContent=options.description||'由院校运营人员配置，仅展示已发布内容';headingCopy.append(h2,lead);
    var updated=document.createElement('time');updated.textContent='正在加载…';heading.append(headingCopy,updated);
    var grid=document.createElement('div');grid.className='school-content-grid';section.append(heading,grid);
    return {grid:grid,updated:updated};
  }

  function render(container,schoolName,options){
    options=options||{};
    if(!container||!schoolName)return Promise.resolve([]);
    container.dataset.schoolContentFor=schoolName;
    var parts=prepareSection(container,options);
    container.hidden=false;
    return fetch('/api/school-content?school='+encodeURIComponent(schoolName),{headers:{Accept:'application/json'}})
      .then(function(response){if(!response.ok)throw new Error('请求失败');return response.json();})
      .then(function(json){
        if(container.dataset.schoolContentFor!==schoolName)return[];
        var items=json&&json.data&&json.data.items||[];parts.grid.replaceChildren();
        if(!items.length){container.hidden=true;return items;}
        items.forEach(function(item){parts.grid.appendChild(renderModule(item,options));});
        parts.updated.textContent='更新于 '+formatDate(items.reduce(function(latest,item){return !latest||String(item.updated_at)>String(latest)?item.updated_at:latest;},''));
        return items;
      })
      .catch(function(){
        if(container.dataset.schoolContentFor!==schoolName)return[];
        parts.grid.replaceChildren();var empty=document.createElement('div');empty.className='school-content-empty';empty.append(icon('fa-solid fa-signal'));var text=document.createElement('span');text.textContent='运营内容暂时无法加载';empty.appendChild(text);parts.grid.appendChild(empty);parts.updated.textContent='';container.hidden=false;return[];
      });
  }

  window.SchoolContentRenderer={render:render,renderModule:renderModule};

  var wrap=document.querySelector('.wrap');
  var schoolHeading=document.querySelector('body>header h1');
  var header=schoolHeading&&schoolHeading.closest('header');
  if(!header||!wrap||!schoolHeading)return;
  document.body.classList.add('school-content-enabled');
  var schoolName=schoolHeading.textContent.trim();
  var verdict=document.createElement('aside');verdict.className='school-verdict';
  var verdictLabel=document.createElement('span');verdictLabel.className='school-verdict__label';verdictLabel.textContent='择校结论';
  var verdictTitle=document.createElement('h2');verdictTitle.textContent='建议结合专业方向与招录数据重点评估';
  var verdictText=document.createElement('p');verdictText.textContent='先看核心信息，再展开专业、复试和就业明细。';
  verdict.append(verdictLabel,verdictTitle,verdictText);header.appendChild(verdict);
  var tabs=document.createElement('nav');tabs.className='school-section-tabs';tabs.setAttribute('aria-label','院校详情分区');
  [['院校概览','#'],['招生数据','.wrap'],['复试录取','.wrap h2:nth-of-type(4)'],['动态与交流','#schoolContentModules']].forEach(function(item){var a=document.createElement('a');a.href=item[1];a.textContent=item[0];tabs.appendChild(a);});
  header.insertAdjacentElement('afterend',tabs);
  var section=document.createElement('section');section.id='schoolContentModules';
  var footer=wrap.querySelector('footer');if(footer)wrap.insertBefore(section,footer);else wrap.appendChild(section);
  render(section,schoolName,{embedded:false});
})();
