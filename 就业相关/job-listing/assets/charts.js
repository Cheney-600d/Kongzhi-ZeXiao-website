// Chart initialization — receives records from app.js, computes stats client-side
// No backend needed; stats computed from filteredRecords
// echarts.min.js is lazy-loaded when charts section scrolls into view
(function () {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var accent3 = style.getPropertyValue('--accent3').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var fontFamily = "'Noto Sans CJK SC','Microsoft YaHei','WenQuanYi Micro Hei',sans-serif";

  var palette = [
    accent, accent2, accent3, '#059669', '#d97706', '#dc2626',
    '#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#06b6d4'
  ];

  // ===== Compute stats from records =====
  function computeStats(records) {
    var industryMap = {};
    var typeMap = {};
    var cityMap = {};
    var monthMap = {};

    records.forEach(function (rec) {
      (rec.industries || []).forEach(function (i) {
        industryMap[i] = (industryMap[i] || 0) + 1;
      });
      (rec.types || []).forEach(function (t) {
        typeMap[t] = (typeMap[t] || 0) + 1;
      });
      (rec.locations || []).forEach(function (l) {
        cityMap[l] = (cityMap[l] || 0) + 1;
      });
      var month = (rec.date || '').substring(0, 7);
      if (month) {
        monthMap[month] = (monthMap[month] || 0) + 1;
      }
    });

    function toSortedArray(map) {
      var arr = [];
      for (var k in map) { if (map.hasOwnProperty(k)) arr.push([k, map[k]]); }
      arr.sort(function (a, b) { return b[1] - a[1]; });
      return arr;
    }

    var months = toSortedArray(monthMap);
    months.sort(function (a, b) { return a[0].localeCompare(b[0]); });

    return {
      industry: toSortedArray(industryMap),
      type: toSortedArray(typeMap),
      city: toSortedArray(cityMap),
      month: months
    };
  }

  var chart1, chart2, chart3, chart4;
  var echartsReady = false;
  var pendingRecords = null;

  // ===== Lazy-load echarts when charts section is visible =====
  function loadEchartsIfNeeded(callback) {
    if (echartsReady) {
      callback();
      return;
    }
    var script = document.createElement('script');
    script.src = './_shared/js/echarts.min.js';
    script.onload = function () {
      echartsReady = true;
      initCharts();
      callback();
    };
    script.onerror = function () {
      console.warn('[Charts] Failed to load echarts.min.js');
    };
    document.head.appendChild(script);
  }

  function initCharts() {
    chart1 = echarts.init(document.getElementById('chart-industry'), null, { renderer: 'svg' });
    chart2 = echarts.init(document.getElementById('chart-type'), null, { renderer: 'svg' });
    chart3 = echarts.init(document.getElementById('chart-city'), null, { renderer: 'svg' });
    chart4 = echarts.init(document.getElementById('chart-month'), null, { renderer: 'svg' });

    window.addEventListener('resize', function () {
      if (chart1) chart1.resize();
      if (chart2) chart2.resize();
      if (chart3) chart3.resize();
      if (chart4) chart4.resize();
    });
  }

  // ===== Update function — called with filtered records =====
  window.updateCharts = function (records) {
    if (!echartsReady) {
      // echarts not loaded yet — stash records for later
      pendingRecords = records;
      return;
    }
    renderCharts(records);
  };

  function renderCharts(records) {
    var stats = computeStats(records);

    // Chart 1: Industry distribution (pie)
    var industryData = stats.industry.slice(0, 12).map(function (item) {
      return { name: item[0], value: item[1] };
    });
    chart1.setOption({
      animation: false,
      tooltip: { trigger: 'item', appendToBody: true, formatter: '{b}: {c} ({d}%)' },
      legend: {
        type: 'scroll', orient: 'vertical', right: 0, top: 'middle',
        textStyle: { color: muted, fontSize: 11, fontFamily: fontFamily },
        pageTextStyle: { color: muted }
      },
      color: palette,
      series: [{
        type: 'pie',
        radius: ['38%', '68%'],
        center: ['36%', '50%'],
        data: industryData,
        label: { show: false },
        labelLine: { show: false },
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold', fontFamily: fontFamily } }
      }]
    });

    // Chart 2: Recruitment type (bar)
    var typeNames = stats.type.map(function (item) { return item[0]; });
    var typeValues = stats.type.map(function (item) { return item[1]; });
    chart2.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '8%', containLabel: true },
      xAxis: {
        type: 'category', data: typeNames,
        axisLabel: { color: muted, fontSize: 10, fontFamily: fontFamily, interval: 0, rotate: 25 },
        axisLine: { lineStyle: { color: rule } },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: muted, fontSize: 10, fontFamily: fontFamily },
        splitLine: { lineStyle: { color: rule, type: 'dashed' } },
        axisLine: { show: false }
      },
      series: [{
        type: 'bar',
        data: typeValues,
        barWidth: '50%',
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: accent },
              { offset: 1, color: accent2 }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        },
        label: { show: true, position: 'top', color: ink, fontSize: 10, fontFamily: fontFamily }
      }]
    });

    // Chart 3: Top cities (horizontal bar)
    var cityData = stats.city.slice(0, 15).reverse();
    var cityNames = cityData.map(function (item) { return item[0]; });
    var cityValues = cityData.map(function (item) { return item[1]; });
    chart3.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '8%', bottom: '3%', top: '3%', containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { color: muted, fontSize: 10, fontFamily: fontFamily },
        splitLine: { lineStyle: { color: rule, type: 'dashed' } },
        axisLine: { show: false }
      },
      yAxis: {
        type: 'category', data: cityNames,
        axisLabel: { color: ink, fontSize: 11, fontFamily: fontFamily },
        axisLine: { lineStyle: { color: rule } },
        axisTick: { show: false }
      },
      series: [{
        type: 'bar',
        data: cityValues,
        barWidth: '55%',
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: accent3 },
              { offset: 1, color: accent }
            ]
          },
          borderRadius: [0, 4, 4, 0]
        },
        label: { show: true, position: 'right', color: ink, fontSize: 10, fontFamily: fontFamily }
      }]
    });

    // Chart 4: Monthly trend (bar)
    var monthNames = stats.month.map(function (item) { return item[0]; });
    var monthValues = stats.month.map(function (item) { return item[1]; });
    chart4.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: {
        type: 'category', data: monthNames,
        axisLabel: { color: muted, fontSize: 11, fontFamily: fontFamily },
        axisLine: { lineStyle: { color: rule } },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: muted, fontSize: 10, fontFamily: fontFamily },
        splitLine: { lineStyle: { color: rule, type: 'dashed' } },
        axisLine: { show: false }
      },
      series: [{
        type: 'bar',
        data: monthValues,
        barWidth: '45%',
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: accent2 },
              { offset: 1, color: accent3 }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        },
        label: { show: true, position: 'top', color: ink, fontSize: 10, fontFamily: fontFamily }
      }]
    });
  }

  // ===== Lazy-load echarts when charts section scrolls into view =====
  function setupLazyCharts() {
    var chartsSection = document.querySelector('.charts-grid');
    if (!chartsSection) {
      // Fallback: load after 3s if section not found
      setTimeout(function () {
        loadEchartsIfNeeded(function () {
          if (pendingRecords) renderCharts(pendingRecords);
        });
      }, 3000);
      return;
    }

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            observer.disconnect();
            loadEchartsIfNeeded(function () {
              if (pendingRecords) renderCharts(pendingRecords);
            });
          }
        });
      }, { rootMargin: '200px' });
      observer.observe(chartsSection);
    } else {
      // Fallback for old browsers: load after 2s
      setTimeout(function () {
        loadEchartsIfNeeded(function () {
          if (pendingRecords) renderCharts(pendingRecords);
        });
      }, 2000);
    }
  }

  setupLazyCharts();
})();
