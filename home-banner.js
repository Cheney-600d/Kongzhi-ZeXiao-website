/* 首页信息横幅：最新上岸经验贴（数据来自共享 posts-data.js，自动同步） */
(function () {
  var list = document.getElementById('bannerLatestPosts');
  if (!list) return;
  var posts = window.POSTS || [];
  var LEVEL = { '985': '#E53935', '211': '#00AEEC', '双一流': '#9C27B0', '双非': '#43A047' };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  // 从最新往前取 4 条，但学校去重：凑满 4 所不同学校（auto-sync 时也能保证多样性）
  var latest = [];
  var seen = {};
  for (var i = posts.length - 1; i >= 0 && latest.length < 4; i--) {
    var p = posts[i];
    var key = p.school || p.schoolShort || p.id;
    if (!seen[key]) { seen[key] = true; latest.push(p); }
  }
  if (!latest.length) {
    list.innerHTML = '<div style="font-size:12px;color:#999;padding:6px 2px;">暂无经验贴</div>';
    return;
  }
  list.innerHTML = latest.map(function (p) {
    var schoolBase = (p.school || '').replace(/[（(][^）)]*[）)]/g, ''); // 分校区剥后缀→校本部徽章
    var schoolBadge = schoolBase === '中国石油大学' ? '中国石油大学(华东)' : (schoolBase === '中国地质大学' ? '中国地质大学(武汉)' : schoolBase); // 无校区简称帖默认主校区
    var logo = '<img src="专业课选择/images/校徽/' + esc(schoolBadge) + '.jpg" onerror="this.style.display=\'none\'" alt="" style="width:20px;height:20px;border-radius:50%;object-fit:cover;flex-shrink:0;">';
    var badge = '<span style="background:' + (LEVEL[p.level] || '#6b7280') + ';color:#fff;font-size:11px;font-weight:600;line-height:1;padding:3px 6px;border-radius:6px;flex-shrink:0;">' + esc(p.schoolShort || p.school || '') + '</span>';
    var title = '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;color:#1f2430;">' + esc(p.title) + '</span>';
    var score = p.total ? '<span style="color:#a92122;font-weight:700;font-size:13px;flex-shrink:0;">' + esc(p.total) + '分</span>' : '';
    return '<a class="banner-post" href="考研常识科普/experience/' + esc(p.id) + '.html" title="' + esc(p.title) + '">' + logo + badge + title + score + '</a>';
  }).join('');
})();
