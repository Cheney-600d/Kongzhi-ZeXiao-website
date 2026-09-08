(function () {
  'use strict';

  var fallback = window.HEAT_DATA || {};
  var cache = {};
  var periods = Object.keys(fallback).sort();
  var activePeriod = periods.length ? periods[periods.length - 1] : '';
  var activeScope = 'all';
  var scopeLabels = {all: '总', '985': '985', '211': '211', double_non: '双非'};
  var tierLookup = {all: '', '985': '985', '211': '211', double_non: '双非'};

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (char) {
      return ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'})[char];
    });
  }

  function normalizeScope(scope) {
    if (scope === '双非') return 'double_non';
    return scopeLabels[scope] ? scope : 'all';
  }

  function mapPublicItems(items) {
    return (items || []).map(function (item) {
      return {
        rank: Number(item.rank),
        school: item.school_name || item.source_school_name,
        sourceSchool: item.source_school_name || item.school_name,
        heat: Number(item.heat),
        tier: item.tier || '双非',
        totalRank: item.total_rank == null ? null : Number(item.total_rank)
      };
    });
  }

  function fallbackItems(period, scope) {
    var source = (fallback[period] || []).map(function (item) {
      return {rank: Number(item.rank), school: item.school, sourceSchool: item.school, heat: Number(item.heat), tier: item.tier, totalRank: Number(item.rank)};
    });
    var tier = tierLookup[scope];
    if (tier) source = source.filter(function (item) { return item.tier === tier; });
    return source.map(function (item, index) {
      var copy = Object.assign({}, item);
      copy.rank = index + 1;
      return copy;
    });
  }

  async function loadRanking(period, scope) {
    cache[period] = cache[period] || {};
    if (cache[period][scope]) return cache[period][scope];
    try {
      var response = await fetch('/api/heat-rankings?period=' + encodeURIComponent(period) + '&scope=' + encodeURIComponent(scope) + '&limit=20', {cache: 'no-store'});
      var json = await response.json();
      if (response.ok && json.code === 0 && json.data && Array.isArray(json.data.items) && json.data.items.length) {
        (json.data.available_periods || []).forEach(function (value) { if (periods.indexOf(value) < 0) periods.push(value); });
        periods.sort();
        cache[period][scope] = mapPublicItems(json.data.items);
        return cache[period][scope];
      }
    } catch (error) {
      console.warn('热度榜接口暂不可用，使用页面内置历史数据。', error);
    }
    cache[period][scope] = fallbackItems(period, scope);
    return cache[period][scope];
  }

  function periodLabel(period, includeYear) {
    if (!period || period.length !== 6) return '暂无月份';
    return (includeYear ? Number(period.slice(0, 4)) + '年' : '') + Number(period.slice(4)) + '月';
  }

  function renderMonthButtons() {
    var box = document.getElementById('month-btns');
    if (!box) return;
    var years = {};
    periods.forEach(function (period) { years[period.slice(0, 4)] = true; });
    var includeYear = Object.keys(years).length > 1;
    box.innerHTML = periods.map(function (period) {
      return '<button class="month-btn' + (period === activePeriod ? ' active' : '') + '" data-period="' + period + '" onclick="switchHeatPeriod(\'' + period + '\')">' + periodLabel(period, includeYear) + '</button>';
    }).join('');
  }

  function schoolLink(schoolName) {
    var safeName = escapeHtml(schoolName);
    var badge = '<img src="专业课选择/images/校徽/' + encodeURIComponent(schoolName) + '.jpg" onerror="this.style.display=\'none\'" style="width:35px;height:35px;border-radius:50%;margin-right:8px;vertical-align:middle;object-fit:cover" alt="">';
    return '<a href="index.html?school=' + encodeURIComponent(schoolName) + '&from=heat_compare.html" style="color:#a92122;text-decoration:none;font-weight:600">' + badge + safeName + '</a>';
  }

  function rankingMap(items) {
    var map = {};
    items.forEach(function (item) { map[item.school] = item; });
    return map;
  }

  function renderTable(items, previousItems) {
    if (!items.length) return '<div class="empty-msg">该月份暂无此层级榜单</div>';
    var previous = previousItems ? rankingMap(previousItems) : null;
    var html = '<div class="table-wrap"><table><thead><tr><th>排名</th><th>学校</th><th>热度</th><th>排名趋势</th><th>层级</th></tr></thead><tbody>';
    items.forEach(function (item) {
      var trend = '<span class="trend-same">—</span>';
      if (previous) {
        if (previous[item.school]) {
          var difference = Number(previous[item.school].rank) - Number(item.rank);
          if (difference > 0) trend = '<span class="trend-up"><span class="trend-arrow">↑</span>' + difference + '</span>';
          else if (difference < 0) trend = '<span class="trend-down"><span class="trend-arrow">↓</span>' + Math.abs(difference) + '</span>';
        } else {
          trend = '<span class="trend-up" style="color:#3498db">新</span>';
        }
      }
      html += '<tr><td class="rank">' + item.rank + '</td><td class="school">' + schoolLink(item.school) + '</td><td class="heat">' + item.heat + '</td><td>' + trend + '</td><td><span class="tier-tag tier-' + escapeHtml(item.tier) + '">' + escapeHtml(item.tier) + '</span></td></tr>';
    });
    return html + '</tbody></table></div>';
  }

  function renderStats(items) {
    var total = items.reduce(function (sum, item) { return sum + Number(item.heat || 0); }, 0);
    var average = items.length ? (total / items.length).toFixed(2) : '—';
    var top = items.length ? schoolLink(items[0].school) : '—';
    return '<div class="stats-bar"><div class="stat-item"><div class="num">' + items.length + '</div><div class="lbl">上榜数</div></div><div class="stat-item"><div class="num">' + average + '</div><div class="lbl">平均热度</div></div><div class="stat-item"><div class="num">' + top + '</div><div class="lbl">热度第一</div></div></div>';
  }

  function previousPeriod() {
    var index = periods.indexOf(activePeriod);
    return index > 0 ? periods[index - 1] : '';
  }

  async function renderDynamic() {
    var container = document.getElementById('compare-container');
    if (!container || !activePeriod) return;
    renderMonthButtons();
    document.querySelectorAll('.tier-btn').forEach(function (button) {
      button.classList.toggle('active', normalizeScope(button.getAttribute('data-tier')) === activeScope);
    });
    container.innerHTML = '<div class="compare-section"><div class="empty-msg">正在读取榜单…</div></div>';
    var items = await loadRanking(activePeriod, activeScope);
    var previous = previousPeriod();
    var previousItems = previous ? await loadRanking(previous, activeScope) : null;
    var label = scopeLabels[activeScope] || '总';
    container.innerHTML = '<div class="compare-section"><div class="section-title"><span>' + periodLabel(activePeriod, true) + ' · 控制类考研' + label + '热度榜</span></div>' +
      renderStats(items) + '<div class="compare-grid"><div class="compare-panel"><div class="panel-title">' + label + '榜 TOP' + items.length + '</div>' + renderTable(items, previousItems) + '</div></div></div>';
    var subtitle = document.getElementById('heatPageSubtitle');
    if (subtitle) subtitle.textContent = periodLabel(activePeriod, true) + ' · 总榜与分层榜前20名 · 逐月切换看排名趋势';
    var footer = document.getElementById('heatPageFooter');
    if (footer) footer.textContent = '数据来源：' + periodLabel(activePeriod, true) + '控制类考研热度榜（万人教育/控制考研）';
  }

  window.switchHeatPeriod = function (period) {
    if (periods.indexOf(period) < 0) return;
    activePeriod = period;
    var url = new URL(window.location.href);
    url.searchParams.set('period', period);
    url.searchParams.delete('month');
    history.replaceState(null, '', url.pathname + url.search);
    renderDynamic();
  };

  window.switchMonth = function (month) {
    var candidates = periods.filter(function (period) { return Number(period.slice(4)) === Number(month); });
    if (candidates.length) window.switchHeatPeriod(candidates[candidates.length - 1]);
  };

  window.filterTier = function (scope) {
    activeScope = normalizeScope(scope);
    renderDynamic();
  };

  async function initialize() {
    var query = new URLSearchParams(window.location.search);
    var requestedPeriod = String(query.get('period') || '').replace(/\D/g, '');
    try {
      var response = await fetch('/api/heat-rankings?scope=all&limit=1', {cache: 'no-store'});
      var json = await response.json();
      if (response.ok && json.code === 0 && json.data) {
        (json.data.available_periods || []).forEach(function (period) { if (periods.indexOf(period) < 0) periods.push(period); });
        periods.sort();
        if (!requestedPeriod && json.data.period) requestedPeriod = json.data.period;
      }
    } catch (error) {
      console.warn('无法读取已发布月份列表。', error);
    }
    if (requestedPeriod && periods.indexOf(requestedPeriod) >= 0) activePeriod = requestedPeriod;
    else {
      var requestedMonth = query.get('month');
      var candidates = periods.filter(function (period) { return Number(period.slice(4)) === Number(requestedMonth); });
      if (requestedMonth && candidates.length) activePeriod = candidates[candidates.length - 1];
      else if (periods.length) activePeriod = periods[periods.length - 1];
    }
    renderDynamic();
  }

  initialize();
})();
