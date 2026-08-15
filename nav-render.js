/* 从 window.NAV_GROUPS 生成桌面 mega 菜单与 hero-channels 三大频道 */
(function () {
  'use strict';
  var groups = window.NAV_GROUPS;
  if (!groups || !groups.length) return;

  function liIcon(key) {
    var s = window.NAV_ICONS && window.NAV_ICONS[key];
    if (!s) return '';
    return s.replace('<svg ', '<svg class="li-ico" ').replace(' aria-hidden="true"', '');
  }

  function renderMega() {
    var el = document.getElementById('megaNavGroups');
    if (!el) return;
    el.innerHTML = groups.map(function (g, i) {
      var num = ('0' + (i + 1)).slice(-2);
      var links = g.items.map(function (it) {
        return '<a href="' + it.href + '">' + liIcon(it.icon) + it.label + '</a>';
      }).join('');
      return '<section><p><span>' + num + '</span>' + g.label + '</p>' + links + '</section>';
    }).join('');
  }

  function renderHero() {
    var el = document.getElementById('heroChannels');
    if (!el) return;
    el.innerHTML = groups.map(function (g) {
      var links = g.items.map(function (it) {
        return '<a href="' + it.href + '">' + liIcon(it.icon) + it.label + '</a>';
      }).join('');
      return '<div class="hc">' +
        '<div class="hc-head" role="button" tabindex="0" aria-expanded="false" onclick="var hc=this.parentNode;var o=hc.classList.toggle(\'open\');this.setAttribute(\'aria-expanded\',o);">' +
          '<span class="hc-ico">' + liIcon(g.icon) + '</span>' +
          '<b>' + g.label + '</b>' +
          '<span class="hc-n">' + g.items.length + ' 项</span>' +
          '<svg class="hc-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>' +
        '</div>' +
        '<div class="hc-links">' + links + '</div>' +
      '</div>';
    }).join('');
  }

  renderMega();
  renderHero();
})();
