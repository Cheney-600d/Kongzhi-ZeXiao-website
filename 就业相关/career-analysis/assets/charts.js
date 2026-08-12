// ======== 控制类硕士就业数据总览报告 ========
// 数据来源：《25就业宝典》《26择校宝典》 —— 方向薪资 / 私企 / 国央企 / 研究所
(function () {
  'use strict';

  var rootStyle = getComputedStyle(document.documentElement);
  var ACCENT = (rootStyle.getPropertyValue('--accent') || '#e63946').trim();
  var ACCENT2 = (rootStyle.getPropertyValue('--accent2') || '#457b9d').trim();
  var GOLD = (rootStyle.getPropertyValue('--gold') || '#d4a017').trim();

  var PALETTE = [ACCENT, ACCENT2, GOLD, '#2a9d8f', '#9b5de5', '#f77f00', '#00bbf9', '#e63946',
                 '#457b9d', '#6d597a', '#b56576', '#84a59d', '#f28482', '#dda15e', '#5e60ce'];

  function initChart(id) {
    var el = document.getElementById(id);
    if (!el || typeof echarts === 'undefined') return null;
    return echarts.init(el, null, { renderer: 'svg' });
  }

  // 区间条形图公共配置：两段堆叠（下限半透明 + 区间实色），label 显示完整区间
  function rangeBar(cats, lows, highs, unit, name) {
    var diffs = highs.map(function (h, i) { return h - lows[i]; });
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: function (ps) {
          var i = ps[0].dataIndex;
          return '<b>' + cats[i] + '</b><br/>' + name + '区间：' + lows[i] + '-' + highs[i] + unit;
        }
      },
      grid: { left: 8, right: 56, top: 12, bottom: 8, containLabel: true },
      xAxis: { type: 'value', name: unit, splitLine: { lineStyle: { color: 'rgba(128,128,128,0.18)' } } },
      yAxis: { type: 'category', data: cats, axisLabel: { color: 'inherit' }, axisLine: { lineStyle: { color: 'rgba(128,128,128,0.35)' } } },
      series: [
        {
          name: '下限', type: 'bar', stack: 'r', data: lows, barWidth: 24,
          itemStyle: { color: ACCENT, opacity: 0.15 },
          emphasis: { itemStyle: { color: ACCENT, opacity: 0.28 } },
          label: {
            show: true, position: 'left', color: 'inherit', fontSize: 11,
            formatter: function (p) { return lows[p.dataIndex]; }
          }
        },
        {
          name: '区间', type: 'bar', stack: 'r', data: diffs,
          itemStyle: { color: ACCENT },
          label: {
            show: true, position: 'right', color: 'inherit', fontSize: 11,
            formatter: function (p) { return highs[p.dataIndex] + unit; }
          }
        }
      ]
    };
  }

  // ============================================================
  //  第一章：就业方向薪资全景
  // ============================================================
  var direction = [
    { name: '算法/AI',        low: 40, high: 60, avg: 48, co: '阿里/腾讯/百度/字节', note: '顶会论文加分，985硕士竞争激烈' },
    { name: '智能驾驶',       low: 35, high: 65, avg: 48, co: '百度/极氪/大华/商汤', note: '自动驾驶算法/数据闭环' },
    { name: '嵌入式/硬件',    low: 28, high: 50, avg: 36, co: '大疆/华为', note: '控制硕士对口度最高的方向' },
    { name: '无人机/机器人',  low: 27, high: 50, avg: 36, co: '大疆/新松/库卡/ABB', note: '飞控/机械臂/智能制造' },
    { name: '软件开发',       low: 30, high: 35, avg: 32, co: '华为/阿里/字节', note: '需求体量最大' },
    { name: '医工融合',       low: 18, high: 30, avg: 24, co: '联影/迈瑞/东软/万孚', note: '医疗影像/器械研发，薪资稳定' }
  ];

  var c1 = initChart('chart-dir-salary');
  if (c1) {
    var cats1 = direction.map(function (d) { return d.name; });
    var lows1 = direction.map(function (d) { return d.low; });
    var highs1 = direction.map(function (d) { return d.high; });
    c1.setOption(rangeBar(cats1, lows1, highs1, '万/年', '年薪'));
    window.addEventListener('resize', function () { c1.resize(); });
  }

  // 头部企业高薪岗位月薪（K/月）
  var company = [
    { name: '百度·自动驾驶',   low: 35, high: 65 },
    { name: '阿里·NLP',        low: 40, high: 60 },
    { name: '腾讯·CV算法',     low: 30, high: 50 },
    { name: '华为·嵌入式',     low: 25, high: 50 },
    { name: '大疆·嵌入式',     low: 25, high: 40 },
    { name: '小米·算法',       low: 25, high: 35 },
    { name: '极氪·自动驾驶',   low: 25, high: 35 },
    { name: '商汤·CV',         low: 20, high: 40 }
  ];

  var c2 = initChart('chart-dir-company');
  if (c2) {
    var cats2 = company.map(function (d) { return d.name; });
    var lows2 = company.map(function (d) { return d.low; });
    var highs2 = company.map(function (d) { return d.high; });
    var o2 = rangeBar(cats2, lows2, highs2, 'K/月', '月薪');
    o2.xAxis = { type: 'value', name: 'K/月', splitLine: { lineStyle: { color: 'rgba(128,128,128,0.18)' } } };
    o2.series[0].itemStyle = { color: ACCENT2, opacity: 0.15 };
    o2.series[0].emphasis.itemStyle = { color: ACCENT2, opacity: 0.28 };
    o2.series[1].itemStyle = { color: ACCENT2 };
    c2.setOption(o2);
    window.addEventListener('resize', function () { c2.resize(); });
  }

  // 方向薪资速览表
  var dirRows = '';
  direction.forEach(function (d) {
    dirRows += '<tr><td><span class="tag">' + d.name + '</span></td><td>' + d.co +
               '</td><td><span class="salary-tag">' + d.low + '-' + d.high + '万/年</span></td><td>' + d.note + '</td></tr>';
  });
  document.getElementById('direction-table-body').innerHTML = dirRows;

  // ============================================================
  //  第二章：头部私企薪酬体系
  // ============================================================
  var privateCo = [
    { name: '大疆',   low: 27, high: 50, avg: 36 },
    { name: '百度',   low: 35, high: 65, avg: 48 },
    { name: '腾讯',   low: 30, high: 50, avg: 40 },
    { name: '阿里',   low: 30, high: 50, avg: 40 },
    { name: '字节',   low: 30, high: 45, avg: 36 },
    { name: '华为',   low: 20, high: 25, avg: 22 },
    { name: '小米',   low: 25, high: 35, avg: 30 },
    { name: '极氪',   low: 25, high: 35, avg: 30 },
    { name: '商汤',   low: 20, high: 40, avg: 30 }
  ];

  var c3 = initChart('chart-private-salary');
  if (c3) {
    var cats3 = privateCo.map(function (d) { return d.name; });
    var lows3 = privateCo.map(function (d) { return d.low; });
    var highs3 = privateCo.map(function (d) { return d.high; });
    var o3 = rangeBar(cats3, lows3, highs3, '万/年', '应届年薪');
    o3.series[0].itemStyle = { color: GOLD, opacity: 0.15 };
    o3.series[0].emphasis.itemStyle = { color: GOLD, opacity: 0.28 };
    o3.series[1].itemStyle = { color: GOLD };
    c3.setOption(o3);
    window.addEventListener('resize', function () { c3.resize(); });
  }

  // 华为职级薪酬曲线
  var huawei = [
    { g: '13级', v: 22 }, { g: '14级', v: 31.5 }, { g: '15级', v: 34 }, { g: '16级', v: 55 },
    { g: '17级', v: 65 }, { g: '18级', v: 80 }, { g: '19级', v: 150 }, { g: '20级', v: 350 },
    { g: '21级', v: 450 }, { g: '22级', v: 575 }
  ];

  var c4 = initChart('chart-huawei-grade');
  if (c4) {
    c4.setOption({
      tooltip: { trigger: 'axis', formatter: function (ps) { return ps[0].name + '：约 ' + ps[0].value + ' 万/年'; } },
      grid: { left: 8, right: 24, top: 48, bottom: 8, containLabel: true },
      xAxis: { type: 'category', data: huawei.map(function (h) { return h.g; }),
               axisLabel: { color: 'inherit' }, axisLine: { lineStyle: { color: 'rgba(128,128,128,0.35)' } } },
      yAxis: { type: 'value', name: '万/年', splitLine: { lineStyle: { color: 'rgba(128,128,128,0.18)' } } },
      series: [{
        name: '平均年薪', type: 'line', data: huawei.map(function (h) { return h.v; }),
        smooth: true, symbol: 'circle', symbolSize: 8,
        lineStyle: { color: ACCENT, width: 3 },
        itemStyle: { color: ACCENT },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: 'rgba(230,57,70,0.28)' }, { offset: 1, color: 'rgba(230,57,70,0.02)' }] } },
        label: { show: true, position: 'top', color: 'inherit', fontSize: 10, formatter: function (p) { return p.value; } },
        markPoint: {
          data: [{ type: 'max', name: '最高' }],
          itemStyle: { color: GOLD },
          label: { color: '#fff', fontSize: 10 }
        },
        markLine: {
          symbol: 'none', lineStyle: { color: 'rgba(128,128,128,0.4)', type: 'dashed' },
          label: { color: 'inherit', fontSize: 10 },
          data: [{ yAxis: 60, name: '应届(13级)' }]
        }
      }]
    });
    window.addEventListener('resize', function () { c4.resize(); });
  }

  // 私企薪酬体系表
  var privateRows = '';
  var privateTable = [
    ['大疆', '应届总包27-50W；算法SP/SSP 42/54/60W', '弹性打卡+房补/公租房', '研发岗83%薪资40K左右'],
    ['华为', '13级起，13级20-25万', '应届从13级开始', '16级50-60万，19级管理层100-200万'],
    ['阿里', 'P5入职30万+', '16薪=12+1+3', 'P6破60万，P7近百万+配股'],
    ['字节', '标准12薪，实际15-18薪', '核心部门年终6-8个月', '大小周强度大，薪资实在'],
    ['腾讯', 'CV算法30-50K·16薪', '7-15天年假/30天全薪病假', '技术氛围好'],
    ['百度', '自动驾驶35-65K·16薪', '—', 'AI+自动驾驶投入大'],
    ['小米', '算法25-35K·15薪', '六险一金+商业保险', '加班费可申请'],
    ['极氪', '自动驾驶25-35K·14薪', '—', '新能源车企智能化投入大']
  ];
  privateTable.forEach(function (r) {
    privateRows += '<tr><td><span class="tag">' + r[0] + '</span></td><td>' + r[1] +
                   '</td><td><span class="salary-tag">' + r[2] + '</span></td><td>' + r[3] + '</td></tr>';
  });
  document.getElementById('private-table-body').innerHTML = privateRows;

  // ============================================================
  //  第三章：国央企薪酬体系
  // ============================================================
  var soe = [
    { name: '航天科工',   low: 30, high: 45, avg: 41 },
    { name: '兵装',       low: 25, high: 35, avg: 30 },
    { name: '电科',       low: 25, high: 35, avg: 30 },
    { name: '中国电子',   low: 20, high: 28, avg: 22 },
    { name: '中广核',     low: 19, high: 25, avg: 21 },
    { name: '中船',       low: 18, high: 25, avg: 20 },
    { name: '航天科技',   low: 15, high: 40, avg: 25 },
    { name: '移动',       low: 15, high: 20, avg: 17 },
    { name: '航发',       low: 13, high: 18, avg: 15 },
    { name: '电信(东)',   low: 12, high: 18, avg: 15 }
  ];

  var c5 = initChart('chart-soe-master');
  if (c5) {
    var cats5 = soe.map(function (d) { return d.name; });
    var lows5 = soe.map(function (d) { return d.low; });
    var highs5 = soe.map(function (d) { return d.high; });
    var o5 = rangeBar(cats5, lows5, highs5, '万/年', '硕士年薪');
    o5.series[0].itemStyle = { color: ACCENT2, opacity: 0.15 };
    o5.series[0].emphasis.itemStyle = { color: ACCENT2, opacity: 0.28 };
    o5.series[1].itemStyle = { color: ACCENT2 };
    c5.setOption(o5);
    window.addEventListener('resize', function () { c5.resize(); });
  }

  // 按学历起薪对比（本/硕/博）
  var degreeUnits = ['中船', '航发', '兵装', '中广核'];
  var degreeData = {
    '本科': [14.3, 11.5, 12, 17],
    '硕士': [18, 15.5, 30, 19],
    '博士': [32, 33, 48, 24]
  };

  var c6 = initChart('chart-soe-degree');
  if (c6) {
    c6.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { top: 0, textStyle: { color: 'inherit' } },
      grid: { left: 8, right: 24, top: 40, bottom: 8, containLabel: true },
      xAxis: { type: 'category', data: degreeUnits, axisLabel: { color: 'inherit' },
               axisLine: { lineStyle: { color: 'rgba(128,128,128,0.35)' } } },
      yAxis: { type: 'value', name: '万/年', splitLine: { lineStyle: { color: 'rgba(128,128,128,0.18)' } } },
      series: ['本科', '硕士', '博士'].map(function (k, i) {
        return {
          name: k, type: 'bar', data: degreeData[k], barWidth: 22,
          itemStyle: { color: [ACCENT, ACCENT2, GOLD][i], borderRadius: [4, 4, 0, 0] },
          label: { show: true, position: 'top', color: 'inherit', fontSize: 10 }
        };
      })
    });
    window.addEventListener('resize', function () { c6.resize(); });
  }

  // 国央企薪酬要点表
  var soeRows = '';
  var soeTable = [
    ['航天科工', '硕士约34.4K/月（年薪约41万）', '98.7%岗位薪酬20-50K'],
    ['兵装', '硕士税前约30万', '博士48万起，特殊岗位最高100万'],
    ['电科', '硕士起薪25.0K（北京28.2K）', '2024职友集20-30K占39.1%'],
    ['中国电子', '硕士第一年总包20W+', '下属企业17-18W，27家二级企业'],
    ['中广核', '硕士19万起', '本科17/博士24万起，年终奖平均20222元'],
    ['中船', '硕士≥18万', '博士25-40万+安家费20-40万'],
    ['航天科技', '年薪15-40万', '部分单位可解决事业编'],
    ['移动', '新人转正税后15-20万', '总部网络部总包33W'],
    ['航发', '硕士13-18万', '本科10-13万/博士30-36万，起薪20W安家费5W'],
    ['电信', '东部12-18万/中西8-12万', '区域差异明显'],
    ['联通', '本科定6-7级', '职级1-22级，薪酬弹性小'],
    ['中车', '年终3-6个月工资', '六险两金+企业年金'],
    ['东风', '年终奖平均约1.1万', '车企央企'],
    ['中石油', '硕博岗级7000左右', '绩效与艰苦补贴弹性大']
  ];
  soeTable.forEach(function (r) {
    soeRows += '<tr><td><span class="tag">' + r[0] + '</span></td><td>' + r[1] +
               '</td><td><span class="salary-tag">' + r[2] + '</span></td></tr>';
  });
  document.getElementById('soe-table-body').innerHTML = soeRows;

  // ============================================================
  //  第四章：研究所与就业单位分布
  // ============================================================
  var institute = [
    { city: '北京',   n: 5, units: '航天五院(501/502等)、一院一部、四院17所、二院二部、兵器导控所', f: '航天总体/制导控制' },
    { city: '西安',   n: 6, units: '五院504、兵器203、航空618、一飞院603、试飞院630、西飞', f: '航天测控/兵器/航空' },
    { city: '成都',   n: 6, units: '611、成飞、中电29/10、绵阳九院、兵装58所', f: '战机/电子对抗/机器人' },
    { city: '南京',   n: 5, units: '中电14/28/55、609民机', f: '雷达/微电子/民机' },
    { city: '上海',   n: 4, units: '航天八院八部802/811、微小卫星、航空无线电所、中船708', f: '卫星/总体' },
    { city: '武汉',   n: 3, units: '中船701/719、航天三江', f: '舰船/航天' },
    { city: '沈阳',   n: 3, units: '601、沈飞、中科院沈阳自动化所', f: '飞机/机器人' },
    { city: '无锡',   n: 3, units: '中航607/614、中船702', f: '机载雷达/船舶' },
    { city: '洛阳',   n: 2, units: '612、613', f: '空空导弹' },
    { city: '天津',   n: 1, units: '中船707', f: '舰船导航' },
    { city: '大连',   n: 1, units: '中船760', f: '船舶' },
    { city: '连云港', n: 1, units: '中船716', f: '江苏自动化所' },
    { city: '太原',   n: 1, units: '兵器207', f: '兵器' },
    { city: '烟台',   n: 1, units: '五院513', f: '航天' }
  ];

  var c7 = initChart('chart-institute-city');
  if (c7) {
    c7.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 8, right: 24, top: 12, bottom: 8, containLabel: true },
      xAxis: { type: 'category', data: institute.map(function (d) { return d.city; }),
               axisLabel: { color: 'inherit' }, axisLine: { lineStyle: { color: 'rgba(128,128,128,0.35)' } } },
      yAxis: { type: 'value', name: '单位数', minInterval: 1, splitLine: { lineStyle: { color: 'rgba(128,128,128,0.18)' } } },
      series: [{
        name: '单位数', type: 'bar', data: institute.map(function (d) { return d.n; }),
        barWidth: 30, itemStyle: { color: GOLD, borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: 'top', color: 'inherit', fontSize: 11 },
        markLine: { symbol: 'none', lineStyle: { color: 'rgba(128,128,128,0.4)', type: 'dashed' },
                    label: { color: 'inherit', fontSize: 10 },
                    data: [{ yAxis: 3, name: '平均' }] }
      }]
    });
    window.addEventListener('resize', function () { c7.resize(); });
  }

  // 14城研究所布局明细表
  var instRows = '';
  institute.forEach(function (d) {
    instRows += '<tr><td><span class="tag">' + d.city + '</span></td><td>' + d.units +
                '</td><td><span class="salary-tag">' + d.f + '</span></td></tr>';
  });
  document.getElementById('institute-table-body').innerHTML = instRows;
})();
