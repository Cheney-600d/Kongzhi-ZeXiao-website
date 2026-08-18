// ===================== 数据初始化 =====================
const DATA = window.KAOYAN_DATA;
const COLS = DATA.columns;
const records = DATA.records.map(r => {
  const obj = {};
  COLS.forEach((c,i) => obj[c] = r[i]);
  return obj;
});

let filteredRecords = [...records];
let filteredSchoolStats = [...DATA.schoolStats];

// ===================== 工具函数 =====================
function fmt(n){ return n==null||isNaN(n)?'-':Number(n).toFixed(1); }
function fmtInt(n){ return n==null||isNaN(n)?'-':Math.round(n); }
function scoreClass(s){
  if(s==null||isNaN(s)) return '';
  if(s>=380) return 'score-high';
  if(s>=340) return 'score-mid';
  return 'score-low';
}
function courseClass(s){
  if(s==null||isNaN(s)) return '';
  if(s>=120) return 'score-high';
  if(s>=100) return 'score-mid';
  return 'score-low';
}
function ratioClass(r){
  if(r==null||isNaN(r)) return '';
  if(r<=1.2) return 'score-low';
  if(r<=1.5) return 'score-mid';
  return 'score-high';
}
function fillRatio(ratio, enter, admit){
  if(ratio != null && ratio !== '') return ratio;
  if(enter == null || admit == null || admit <= 0 || enter < admit) return null;
  return Math.round((enter / admit) * 100) / 100;
}

// ===================== 地区-省份映射（使用数据中的完整名称） =====================
const REGION_MAP = {
  '西南地区': ['四川省','重庆市','贵州省','云南省'],
  '山河四省': ['山西省','山东省','河南省','河北省'],
  '京津地区': ['北京市','天津市'],
  '华中地区': ['湖南省','湖北省','安徽省','江西省'],
  '江浙沪地区': ['江苏省','浙江省','上海市'],
  '华南地区': ['广东省','广西壮族自治区','福建省'],
  '西北地区': ['陕西省','甘肃省','宁夏回族自治区','新疆维吾尔自治区','内蒙古自治区'],
  '东北地区': ['黑龙江省','吉林省','辽宁省']
};

// 所有选项缓存
const ALL_PROVINCES = [...new Set(records.map(r=>r.province))].sort();
const ALL_SCHOOLS = [...new Set(records.map(r=>r.school))].sort();
const ALL_COLLEGES = [...new Set(records.map(r=>r.college))].sort();
const ALL_MAJORS = [...new Set(records.map(r=>r.majorCode))].sort();

// 更新下拉框选项（清空当前值）
function setOptions(selectId, values, label){
  const sel = document.getElementById(selectId);
  sel.innerHTML = `<option value="">全部${label}</option>`;
  values.forEach(v=> sel.add(new Option(v,v)));
}

// 获取用于更新指定字段选项的过滤记录
// 使用 updateField 之前的所有已选字段值来过滤，忽略 updateField 及之后的字段
function getFilteredForUpdate(updateField){
  const rv = document.getElementById('filterRegion').value;
  const pv = document.getElementById('filterProvince').value;
  const sv = document.getElementById('filterSchool').value;
  const cv = document.getElementById('filterCollege').value;
  const mv = document.getElementById('filterMajor').value;
  const is0854 = document.getElementById('filter0854').checked;
  const isMath2Eng2 = document.getElementById('filterMath2Eng2').checked;
  return records.filter(r=>{
    if(rv && !REGION_MAP[rv].includes(r.province)) return false;
    if(updateField !== 'province' && pv && r.province !== pv) return false;
    if(updateField !== 'school' && sv && r.school !== sv) return false;
    if(updateField !== 'college' && cv && r.college !== cv) return false;
    if(updateField !== 'major' && mv && r.majorCode !== mv) return false;
    if(is0854 && !(r.majorCode||'').startsWith('0854')) return false;
    if(isMath2Eng2 && !(r.math && r.english && r.math.replace(/[\s（）()]/g,'').includes('数学二') && r.english.replace(/[\s（）()]/g,'').includes('英语二'))) return false;
    return true;
  });
}

// ===================== 首页统计 =====================
function initStats(){ /* 无操作 */ }

function initFilters(){
  // ... 现有代码不变
}

// ===================== 热度榜 TOP10 数据（按月份） =====================
var HEAT_DATA_BY_MONTH = {
  '202604': [{rank:1, school:'南京理工大学', heat:85.54, tier:'211'}, {rank:2, school:'哈尔滨工程大学', heat:75.33, tier:'211'}, {rank:3, school:'华北电力大学', heat:68.63, tier:'211'}, {rank:4, school:'电子科技大学', heat:66.71, tier:'985'}, {rank:5, school:'北京工业大学', heat:65.51, tier:'211'}, {rank:6, school:'中国科学技术大学', heat:64.17, tier:'985'}, {rank:7, school:'北京科技大学', heat:62.42, tier:'211'}, {rank:8, school:'浙江大学', heat:60.46, tier:'985'}, {rank:9, school:'哈尔滨工业大学', heat:60.26, tier:'985'}, {rank:10, school:'华东理工大学', heat:58.26, tier:'211'}],
  '202605': [{rank:1, school:'上海大学', heat:86.28, tier:'211'}, {rank:2, school:'上海交通大学', heat:83.43, tier:'985'}, {rank:3, school:'南京理工大学', heat:80.58, tier:'211'}, {rank:4, school:'东南大学', heat:77.14, tier:'985'}, {rank:5, school:'华东理工大学', heat:73.7, tier:'211'}, {rank:6, school:'大连理工大学', heat:72.44, tier:'985'}, {rank:7, school:'安徽大学', heat:67.47, tier:'211'}, {rank:8, school:'浙江大学', heat:66.62, tier:'985'}, {rank:9, school:'北京理工大学', heat:65.78, tier:'985'}, {rank:10, school:'哈尔滨工程大学', heat:63.8, tier:'211'}],
  '202606': [{rank:1, school:'同济大学', heat:81.96, tier:'985'}, {rank:2, school:'上海大学', heat:76.36, tier:'211'}, {rank:3, school:'西安电子科技大学', heat:72.98, tier:'211'}, {rank:4, school:'华东理工大学', heat:66.71, tier:'211'}, {rank:5, school:'哈尔滨工业大学', heat:66.1, tier:'985'}, {rank:6, school:'上海交通大学', heat:65.7, tier:'985'}, {rank:7, school:'南京理工大学', heat:65.7, tier:'211'}, {rank:8, school:'中国科学技术大学', heat:63.71, tier:'985'}, {rank:9, school:'南京邮电大学', heat:63.14, tier:'双非'}, {rank:10, school:'长安大学', heat:62.73, tier:'211'}],
  '202607': [{rank:1, school:'华北电力大学', heat:77.2, tier:'211'}, {rank:2, school:'上海大学', heat:77.16, tier:'211'}, {rank:3, school:'哈尔滨工业大学', heat:73.3, tier:'985'}, {rank:4, school:'南京理工大学', heat:71.32, tier:'211'}, {rank:5, school:'中国计量大学', heat:69.65, tier:'双非'}, {rank:6, school:'华东理工大学', heat:66.83, tier:'211'}, {rank:7, school:'天津大学', heat:66.44, tier:'985'}, {rank:8, school:'哈尔滨工程大学', heat:65.43, tier:'211'}, {rank:9, school:'北京邮电大学', heat:63.26, tier:'211'}, {rank:10, school:'中国科学院大学', heat:61.3, tier:'双非'}]
};

// 自动选择最近可用的月份数据
function getLatestHeatMonth() {
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth() + 1;
  for (var i = 0; i < 12; i++) {
    var m = month - 1 - i;
    var y = year;
    if (m <= 0) { m += 12; y--; }
    var key = String(y) + String(m).padStart(2, "0");
    if (HEAT_DATA_BY_MONTH[key]) {
      return { key: key, year: y, month: m, data: HEAT_DATA_BY_MONTH[key] };
    }
  }
  var keys = Object.keys(HEAT_DATA_BY_MONTH).sort();
  var lastKey = keys[keys.length - 1];
  return { key: lastKey, year: parseInt(lastKey.slice(0,4)), month: parseInt(lastKey.slice(4)), data: HEAT_DATA_BY_MONTH[lastKey] };
}

var LATEST_HEAT = getLatestHeatMonth();
var HEAT_RANK_TOP10 = LATEST_HEAT.data;
var HEAT_LATEST_MONTH = LATEST_HEAT.month;
var HEAT_LATEST_YEAR = LATEST_HEAT.year;

function initHeatRank(){
  var container = document.getElementById('heatRankButtons');
  if(!container) return;
  
  // 更新标题和链接
  var titleEl = document.getElementById('heatRankTitle');
  var linkEl = document.getElementById('heatRankLink');
  if (titleEl) {
    titleEl.textContent = '🔥 ' + HEAT_LATEST_YEAR + '年' + HEAT_LATEST_MONTH + '月热度榜 TOP10';
  }
  if (linkEl) {
    linkEl.href = 'heat_compare.html?month=' + HEAT_LATEST_MONTH;
  }
  
  var html = '<div class="heat-rank-wrap">';
  html += HEAT_RANK_TOP10.map(function(item){
    var rank = item.rank;
    var badgeCls;
    if(rank === 1) badgeCls = 'gold';
    else if(rank === 2) badgeCls = 'silver';
    else if(rank === 3) badgeCls = 'bronze';
    else badgeCls = 'normal';
    
    return '<button onclick="goDetail(\'' + item.school.replace(/'/g, "\\'") + '\')" class="heat-rank-btn" title="点击查看' + item.school + '详情">' +
      '<span class="heat-rank-badge ' + badgeCls + '">' + rank + '</span>' +
      '<img src="专业课选择/images/校徽/' + item.school + '.jpg" class="heat-rank-img" onerror="this.style.display=\'none\'" alt="">' +
      '<div class="heat-rank-info">' +
        '<span class="heat-rank-name">' + item.school + '</span>' +
        '<div class="heat-rank-meta">' +
          '<span class="heat-rank-heat">🔥 ' + item.heat + '</span>' +
          '<span class="heat-rank-tier heat-rank-tier-' + item.tier + '">' + item.tier + '</span>' +
        '</div>' +
      '</div>' +
      '</button>';
  }).join('');
  html += '</div>';
  container.innerHTML = html;
}

// ===================== 筛选器初始化 =====================
function initFilters(){
  const fr = document.getElementById('filterRegion');
  Object.keys(REGION_MAP).forEach(rg=> fr.add(new Option(rg,rg)));

  setOptions('filterProvince', ALL_PROVINCES, '省份');
  setOptions('filterSchool', ALL_SCHOOLS, '学校');
  setOptions('filterCollege', ALL_COLLEGES, '学院');
  setOptions('filterMajor', ALL_MAJORS, '专业');

  // 初始化标签筛选下拉框
  const tagSel = document.getElementById('filterTag');
  // 群体标签
  const groupOpt = document.createElement('optgroup');
  groupOpt.label = '群体标签';
  Object.keys(SCHOOL_TAGS).forEach(tag => groupOpt.appendChild(new Option(tag, tag)));
  tagSel.add(groupOpt);
  // 学科评估标签
  const evalOpt = document.createElement('optgroup');
  evalOpt.label = '学科评估';
  const evalTags = new Set();
  Object.values(EVAL_TAGS).forEach(tags => tags.forEach(t => evalTags.add(t)));
  [...evalTags].sort().forEach(tag => evalOpt.appendChild(new Option(tag, tag)));
  tagSel.add(evalOpt);

  // 地区变化 → 使用地区值过滤，忽略省份/学校/学院/专业，更新所有下级
  fr.addEventListener('change', ()=>{
    const base = getFilteredForUpdate('province');
    setOptions('filterProvince', [...new Set(base.map(r=>r.province))].sort(), '省份');
    setOptions('filterSchool', [...new Set(base.map(r=>r.school))].sort(), '学校');
    setOptions('filterCollege', [...new Set(base.map(r=>r.college))].sort(), '学院');
    setOptions('filterMajor', [...new Set(base.map(r=>r.majorCode))].sort(), '专业');
  });

  // 省份变化 → 使用地区+省份值过滤，忽略学校/学院/专业
  document.getElementById('filterProvince').addEventListener('change', ()=>{
    const base = getFilteredForUpdate('school');
    setOptions('filterSchool', [...new Set(base.map(r=>r.school))].sort(), '学校');
    setOptions('filterCollege', [...new Set(base.map(r=>r.college))].sort(), '学院');
    setOptions('filterMajor', [...new Set(base.map(r=>r.majorCode))].sort(), '专业');
    applyFilter();
  });

  // 学校变化 → 使用地区+省份+学校值过滤，忽略学院/专业
  document.getElementById('filterSchool').addEventListener('change', ()=>{
    const base = getFilteredForUpdate('college');
    setOptions('filterCollege', [...new Set(base.map(r=>r.college))].sort(), '学院');
    setOptions('filterMajor', [...new Set(base.map(r=>r.majorCode))].sort(), '专业');
    applyFilter();
  });

  // 学院变化 → 使用地区+省份+学校+学院值过滤，忽略专业
  document.getElementById('filterCollege').addEventListener('change', ()=>{
    const base = getFilteredForUpdate('major');
    setOptions('filterMajor', [...new Set(base.map(r=>r.majorCode))].sort(), '专业');
    applyFilter();
  });

  // 0854专项勾选变化 → 更新所有级联选项
  document.getElementById('filter0854').addEventListener('change', ()=>{
    const base = getFilteredForUpdate('');
    setOptions('filterProvince', [...new Set(base.map(r=>r.province))].sort(), '省份');
    setOptions('filterSchool', [...new Set(base.map(r=>r.school))].sort(), '学校');
    setOptions('filterCollege', [...new Set(base.map(r=>r.college))].sort(), '学院');
    setOptions('filterMajor', [...new Set(base.map(r=>r.majorCode))].sort(), '专业');
    applyFilter();
  });

  // 数二英二专项勾选变化 → 更新所有级联选项
  document.getElementById('filterMath2Eng2').addEventListener('change', ()=>{
    const base = getFilteredForUpdate('');
    setOptions('filterProvince', [...new Set(base.map(r=>r.province))].sort(), '省份');
    setOptions('filterSchool', [...new Set(base.map(r=>r.school))].sort(), '学校');
    setOptions('filterCollege', [...new Set(base.map(r=>r.college))].sort(), '学院');
    setOptions('filterMajor', [...new Set(base.map(r=>r.majorCode))].sort(), '专业');
    applyFilter();
  });

  // 院校层级变化 → 触发学校列表筛选
  document.getElementById('filterTier').addEventListener('change', ()=>{
    applySchoolFilter();
  });

  // B站粉丝数（已移到header中显示）
  // document.getElementById('bilibiliFans').textContent = 'B站 27.0万';
  initPosterCarousel();
  initHeatRank();
}

function saveHomeFilterState(){
  const state = {
    // 顶部筛选区
    region: document.getElementById('filterRegion').value,
    province: document.getElementById('filterProvince').value,
    school: document.getElementById('filterSchool').value,
    college: document.getElementById('filterCollege').value,
    tag: document.getElementById('filterTag').value,
    major: document.getElementById('filterMajor').value,
    is0854: document.getElementById('filter0854').checked,
    isMath2Eng2: document.getElementById('filterMath2Eng2').checked,
    // 学校列表筛选区
    search: document.getElementById('schoolSearch').value,
    sTier: document.getElementById('filterTier').value,
    // 标签筛选
    currentTagFilter: currentTagFilter
  };
  localStorage.setItem('homeFilterState', JSON.stringify(state));
}

function restoreHomeFilterState(){
  const saved = localStorage.getItem('homeFilterState');
  if(!saved) return false;
  try{
    const state = JSON.parse(saved);
    // 恢复顶部筛选区
    if(state.region != null) document.getElementById('filterRegion').value = state.region;
    if(state.province != null) document.getElementById('filterProvince').value = state.province;
    if(state.school != null) document.getElementById('filterSchool').value = state.school;
    if(state.college != null) document.getElementById('filterCollege').value = state.college;
    if(state.tag != null) document.getElementById('filterTag').value = state.tag;
    if(state.major != null) document.getElementById('filterMajor').value = state.major;
    if(state.is0854 != null) document.getElementById('filter0854').checked = state.is0854;
    if(state.isMath2Eng2 != null) document.getElementById('filterMath2Eng2').checked = state.isMath2Eng2;
    // 恢复学校列表筛选区
    if(state.search != null) document.getElementById('schoolSearch').value = state.search;
    if(state.sTier != null) document.getElementById('filterTier').value = state.sTier;
    // 恢复标签筛选（仅当标签仍存在时恢复，避免已删除/失效的标签把列表过滤到空）
    if(state.currentTagFilter != null && TAG_TO_SCHOOLS[state.currentTagFilter]) currentTagFilter = state.currentTagFilter;
    return true;
  }catch(e){ return false; }
}

function applyFilter(){
  filteredRecords = getFilteredForUpdate('');

  // 重新计算学校统计
  const grouped = {};
  filteredRecords.forEach(r=>{
    const k = r.province+'|'+r.school;
    if(!grouped[k]) grouped[k] = {province:r.province, school:r.school, tier: r.tier||'双非', college:new Set(), n:0, e:0, a:0, avg_e:0, avg_a:0, avg_p:0, we:0, wa:0, wp:0, se:0, sa:0, sp:0, ratios:[], ne:0, na:0, np:0};
    grouped[k].college.add(r.college);
    grouped[k].n++;
    grouped[k].e += r.enterNum||0;
    grouped[k].a += r.admitNum||0;
    grouped[k].avg_e += (r.enterAvg||0) * (r.enterNum||0);
    grouped[k].avg_a += (r.admitAvg||0) * (r.admitNum||0);
    grouped[k].avg_p += (r.courseAvg||0) * (r.admitNum||0);
    // 加权均分分母：只累计有均分记录的人数，避免无均分专业人数虚增分母
    if(r.enterAvg != null) grouped[k].we += r.enterNum||0;
    if(r.admitAvg != null) grouped[k].wa += r.admitNum||0;
    if(r.courseAvg != null) grouped[k].wp += r.admitNum||0;
    grouped[k].se += r.enterAvg||0;
    grouped[k].sa += r.admitAvg||0;
    grouped[k].sp += r.courseAvg||0;
    if(r.enterAvg != null) grouped[k].ne++;
    if(r.admitAvg != null) grouped[k].na++;
    if(r.courseAvg != null) grouped[k].np++;
    if(r.ratio != null && r.ratio > 0) grouped[k].ratios.push(r.ratio);
  });
  filteredSchoolStats = Object.values(grouped).map(g=>({
    '省份/自治区': g.province, '学校': g.school, tier: g.tier,
    college: g.college.size, count: g.n, enter: g.e, admit: g.a,
    avgEnter: g.we?g.avg_e/g.we:(g.ne?g.se/g.ne:null), avgAdmit: g.wa?g.avg_a/g.wa:(g.na?g.sa/g.na:null), avgCourse: g.wp?g.avg_p/g.wp:(g.np?g.sp/g.np:null),
    ratio: (g.e&&g.a)?(g.e/g.a).toFixed(2):(g.ratios.length?(g.ratios.reduce(function(x,y){return x+y;},0)/g.ratios.length).toFixed(2):null)
  }));

  // 标签筛选
  const tagVal = document.getElementById('filterTag').value;
  if(tagVal && TAG_TO_SCHOOLS[tagVal]){
    const tagged = new Set(TAG_TO_SCHOOLS[tagVal]);
    filteredSchoolStats = filteredSchoolStats.filter(s => tagged.has(s['学校']));
  }

  // 更新学校列表筛选器选项

  renderHomeCharts();
  renderSchoolTable();
  saveHomeFilterState();
}

function resetFilter(){
  document.getElementById('filterRegion').value='';
  document.getElementById('filterTag').value='';
  document.getElementById('filter0854').checked=false;
  document.getElementById('filterMath2Eng2').checked=false;
  setOptions('filterProvince', ALL_PROVINCES, '省份');
  setOptions('filterSchool', ALL_SCHOOLS, '学校');
  setOptions('filterCollege', ALL_COLLEGES, '学院');
  setOptions('filterMajor', ALL_MAJORS, '专业');
  filteredRecords = [...records];
  filteredSchoolStats = [...DATA.schoolStats];
  // 重置学校列表筛选器并更新选项
  window.schoolCurrentPage = 1;
  resetSchoolFilter();
  renderHomeCharts();
  renderSchoolTable();
  saveHomeFilterState();
}

// ===================== 首页图表 =====================
// 防抖函数
function debounce(fn, delay) {
  let timer = null;
  return function() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, delay);
  };
}

const COURSE_CATEGORIES = [
  {name:'自动控制原理',keywords:['自动控制','自控','现代控制','控制理论','经典控制','线性系统']},
  {name:'信号与系统',keywords:['信号','系统','数字信号处理','DSP','信号与系统']},
  {name:'电路',keywords:['电路','电路分析','电路原理','模拟电子','数字电子','模电','数电']},
  {name:'计算机控制',keywords:['计算机控制','微机','单片机','嵌入式','计算机']},
  {name:'检测技术',keywords:['检测','传感器','测控','仪器','误差']},
  {name:'电力电子',keywords:['电力电子','电力系统','电机','电力']},
  {name:'机器人学',keywords:['机器人','运筹','系统工程','智能']}
];
function classifyCourse(courseName){
  if(!courseName) return '其他';
  const c = courseName.toLowerCase();
  for(const cat of COURSE_CATEGORIES){
    for(const kw of cat.keywords){
      if(c.includes(kw.toLowerCase())) return cat.name;
    }
  }
  return '其他';
}

let charts = {};
function renderHomeCharts(){
  // 省份分布 - 按招生人数排序
  const provMap = {};
  filteredRecords.forEach(r=>{
    if(!provMap[r.province]) provMap[r.province]={name:r.province, n:0};
    provMap[r.province].n++;
  });
  const provArr = Object.values(provMap).sort((a,b)=>b.n-a.n).slice(0,15);

  // charts.province = echarts.init(document.getElementById('chartProvince', null, {renderer: 'canvas'})); // 已移到右侧栏
  charts.provinceSide = echarts.init(document.getElementById('chartProvinceSide'), null, {renderer: 'canvas'});
  charts.provinceSide.setOption({
    tooltip:{trigger:'axis'},
    grid:{left:'2%',right:'2%',bottom:'2%',top:'8%',containLabel:true},
    xAxis:{type:'category',data:provArr.map(x=>x.name),axisLabel:{rotate:25,fontSize:9}},
    yAxis:[{type:'value',axisLabel:{fontSize:8}}],
    series:[
      {name:'专业方向数',type:'bar',data:provArr.map(x=>x.n),itemStyle:{color:'#a92122',borderRadius:[5,5,0,0]},barMaxWidth:14}
    ]
  });

  // 复录比分布
  const ratioMap = {'1.0(等额)':0,'1.0-1.2':0,'1.2-1.5':0,'1.5-2.0':0,'2.0+':0,'未知':0};
  filteredRecords.forEach(r=>{
    const ratio = r.ratio;
    if(ratio==null||isNaN(ratio)) ratioMap['未知']++;
    else if(ratio<=1.0) ratioMap['1.0(等额)']++;
    else if(ratio<=1.2) ratioMap['1.0-1.2']++;
    else if(ratio<=1.5) ratioMap['1.2-1.5']++;
    else if(ratio<=2.0) ratioMap['1.5-2.0']++;
    else ratioMap['2.0+']++;
  });
  const ratioData = Object.entries(ratioMap).filter(([k,v])=>v>0).map(([k,v])=>({name:k,value:v}));
  const ratioColors = ['#a92122','#D94F4F','#E57373','#C62828','#EF9A9A','#8B1A1A'];

  // charts.ratio = echarts.init(document.getElementById('chartRatio', null, {renderer: 'canvas'})); // 已移到右侧栏
  charts.ratioSide = echarts.init(document.getElementById('chartRatioSide', null, {renderer: 'canvas'}));
  charts.ratioSide.setOption({
    tooltip:{trigger:'axis',axisPointer:{type:'shadow'}},
    grid:{left:'2%',right:'2%',bottom:'2%',top:'8%',containLabel:true},
    xAxis:{type:'category',data:ratioData.map(x=>x.name),axisLabel:{rotate:30,fontSize:9}},
    yAxis:{type:'value',axisLabel:{fontSize:8}},
    series:[{
      type:'bar',data:ratioData.map((x,i)=>({value:x.value,itemStyle:{color:ratioColors[i%ratioColors.length],borderRadius:[4,4,0,0]}})),barMaxWidth:16
    }]
  });

}

// 显示业务课二大类详情弹窗
function showCourseDetail(category){
  const matched = filteredRecords.filter(r=>classifyCourse(r.course2)===category);
  
  // 按院校分组，收集每个院校下的 (代码)课程名 组合
  const schoolMap = {};
  matched.forEach(r=>{
    if(!schoolMap[r.school]) schoolMap[r.school] = new Set();
    const code = r.majorCode || '';
    const course = r.course2 || '';
    if(code && course) schoolMap[r.school].add(`(${code})${course}`);
  });
  
  // 按院校名称排序
  const schoolList = Object.entries(schoolMap)
    .sort((a,b)=>a[0].localeCompare(b[0]));
  
  document.getElementById('courseModalTitle').textContent = `${category} — 涉及 ${matched.length} 条记录`;
  document.getElementById('courseModalSchools').innerHTML = schoolList.map(([name,codes],i)=>`
    <li style="flex-direction:column;align-items:flex-start;padding:8px 0;">
      <div style="font-weight:600;margin-bottom:4px;">
        <span class="modal-rank ${i<3?'top3':''}">${i+1}</span>${name}
      </div>
      <div style="padding-left:28px;color:#6a6a7a;font-size:12px;line-height:1.8;">
        ${[...codes].join('　')}
      </div>
    </li>
  `).join('') || '<li class="text-gray-400">无数据</li>';
  
  document.getElementById('courseModal').classList.add('active');
}

function closeCourseModal(event){
  if(!event || event.target.id==='courseModal' || event.target.closest('.modal-close')){
    document.getElementById('courseModal').classList.remove('active');
  }
}
function closeDirectionPrompt(){
  document.getElementById('directionPromptModal').classList.remove('active');
}
// 未选方向时直接看学校详情：不设方向过滤 → 详情页展示该校所有学院、所有方向数据
function goSchoolDetailNoDirection(){
  const school = window.directionPromptSchool;
  if(!school) return;
  document.getElementById('directionPromptModal').classList.remove('active');
  window.pendingDetailFilter = null;
  if(typeof window.enterSchoolDetailWithHistory === 'function') window.enterSchoolDetailWithHistory(school);
  else goDetail(school);
}

// 当前标签筛选（全局）
let currentTagFilter = '';

// 按标签筛选学校
function filterByTag(tagName) {
  currentTagFilter = tagName;
  // 如果在二级页，先返回首页
  if(document.getElementById('detailPage').style.display === 'block'){
    goHome();
  }
  // 重置其他筛选
  resetSchoolFilter();
  // 重新渲染
  renderSchoolTable();
  saveHomeFilterState();
  // 滚动到学校列表
  setTimeout(() => {
    const schoolListEl = document.getElementById('schoolTable').closest('.card');
    if (schoolListEl) schoolListEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function filterByTier(tierName) {
  // 如果在二级页，先返回首页
  if(document.getElementById('detailPage').style.display === 'block'){
    goHome();
  }
  // 设置层级筛选
  document.getElementById('filterTier').value = tierName;
  // 应用筛选
  applyFilter();
  // 滚动到学校列表
  setTimeout(() => {
    const schoolListEl = document.getElementById('schoolTable').closest('.card');
    if (schoolListEl) schoolListEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}
function resetTagFilter() {
  currentTagFilter = '';
  renderSchoolTable();
  saveHomeFilterState();
}
function filterByRegion(regionName) {
  if(document.getElementById('detailPage').style.display === 'block'){
    goHome();
  }
  document.getElementById('filterRegion').value = regionName;
  document.getElementById('filterProvince').value = '';
  applyFilter();
  setTimeout(() => {
    const schoolListEl = document.getElementById('schoolTable').closest('.card');
    if (schoolListEl) schoolListEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}
function filterByProvince(provinceName) {
  if(document.getElementById('detailPage').style.display === 'block'){
    goHome();
  }
  document.getElementById('filterRegion').value = '';
  document.getElementById('filterProvince').value = provinceName;
  applyFilter();
  setTimeout(() => {
    const schoolListEl = document.getElementById('schoolTable').closest('.card');
    if (schoolListEl) schoolListEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function withSchoolDetailSource(href, schoolName){
  try {
    const url = new URL(href, window.location.href);
    url.searchParams.set('fromSchoolDetail', '1');
    url.searchParams.set('sourceSchool', schoolName);
    return url.pathname.replace(/^\//,'') + url.search + url.hash;
  } catch(error) { return href; }
}

function renderClickableTags(schoolName, tier) {
  const tags = getSchoolTags(schoolName, tier);
  return tags.map(t => {
    const s = getTagStyle(t.name, t.type);
    if (t.type === 'tier') {
      return `<span class="tag clickable-tag" style="background:${s.bg};color:${s.color};border:1px solid ${s.border};white-space:nowrap;cursor:pointer;" onclick="filterByTier('${t.name.replace(/'/g, "\\'")}')" title="点击筛选所有${t.name}院校">${t.name}</span>`;
    }
    if (t.type === 'shengyuan') {
      return `<span class="tag clickable-tag" style="background:${s.bg};color:${s.color};border:1px solid ${s.border};white-space:nowrap;cursor:pointer;" onclick="window.open(withSchoolDetailSource('控制院校生源地图.html?school=${encodeURIComponent(schoolName)}','${schoolName.replace(/'/g,"\\'")}'),'_self')" title="点击查看生源分布">${t.name}</span>`;
    }
    if (t.type === 'eval') {
      const subject = '0810';
      return `<span class="tag clickable-tag" style="background:${s.bg};color:${s.color};border:1px solid ${s.border};white-space:nowrap;cursor:pointer;" onclick="openSchoolModal('${schoolName.replace(/'/g, "\\'")}','${subject}')" title="点击查看${t.name}研究方向">${t.name}</span>`;
    }
    return `<span class="tag clickable-tag" style="background:${s.bg};color:${s.color};border:1px solid ${s.border};white-space:nowrap;cursor:pointer;" onclick="filterByTag('${t.name.replace(/'/g, "\\'")}')" title="点击筛选所有${t.name}院校">${t.name}</span>`;
  }).join('');
}

// ===================== 学校列表 =====================

function smartSearch(school, keyword){
  if(!keyword || keyword.length === 0) return true;
  var kw = keyword.toLowerCase();
  // 学校名匹配
  if(school['学校'].indexOf(keyword) >= 0) return true;
  // 省份匹配
  if(school['省份/自治区'] && school['省份/自治区'].indexOf(keyword) >= 0) return true;
  // 标签匹配（tier）
  if(school.tier && school.tier.indexOf(keyword) >= 0) return true;
  // 拼音首字母预留接口（SCHOOL_PINYIN）
  if(typeof SCHOOL_PINYIN !== 'undefined' && SCHOOL_PINYIN[school['学校']] && SCHOOL_PINYIN[school['学校']].indexOf(kw) >= 0) return true;
  return false;
}
function getSchoolTableData(){
  let data = [...filteredSchoolStats];
  const tier = document.getElementById('filterTier').value;
  const province = document.getElementById('filterProvince').value;
  const school = document.getElementById('filterSchool').value;

  if(tier) data = data.filter(s=>s.tier===tier);
  if(province) data = data.filter(s=>s['省份/自治区']===province);
  if(school) data = data.filter(s=>s['学校']===school);
  // 搜索框模糊匹配
  const searchVal = document.getElementById('schoolSearch').value.trim();
  if(searchVal) data = data.filter(s=>smartSearch(s, searchVal));
  // 标签筛选
  if(currentTagFilter) {
    const taggedSchools = TAG_TO_SCHOOLS[currentTagFilter] || [];
    data = data.filter(s => taggedSchools.includes(s['学校']));
  }
  // 排序
  if(sortField && data.length > 0){
    data.sort(function(a,b){
      var va = a[sortField] || 0;
      var vb = b[sortField] || 0;
      if(typeof va === 'string') va = parseFloat(va) || va;
      if(typeof vb === 'string') vb = parseFloat(vb) || vb;
      if(typeof va === 'number' && typeof vb === 'number') return (va - vb) * sortDir;
      return String(va).localeCompare(String(vb)) * sortDir;
    });
  }
  return data;
}

function applySchoolSearch(){
  window.schoolCurrentPage = 1;
  applySchoolFilter();
}

function applySchoolFilter(){
  // 获取表格筛选后的学校列表
  const tableData = getSchoolTableData();
  const tableSchools = new Set(tableData.map(s => s['学校']));
  
  // 保存原始数据
  const origRecords = filteredRecords;
  const origSchoolStats = filteredSchoolStats;
  
  // 临时过滤数据用于图表渲染
  filteredRecords = filteredRecords.filter(r => tableSchools.has(r.school));
  filteredSchoolStats = filteredSchoolStats.filter(s => tableSchools.has(s['学校']));
  
  renderHomeCharts();
  
  // 恢复原始数据
  filteredRecords = origRecords;
  filteredSchoolStats = origSchoolStats;
  
  // 渲染表格
  window.schoolCurrentPage = 1;
  renderSchoolTable();
  saveHomeFilterState();
}

function resetSchoolFilter(){
  document.getElementById('schoolSearch').value='';
  document.getElementById('filterTier').value='';
  window.schoolCurrentPage = 1;
  renderHomeCharts();
  renderSchoolTable();
  saveHomeFilterState();
}


// ===================== 表格排序 =====================
var sortField = null;
var sortDir = 1; // 1 asc, -1 desc
function sortTable(field){
  if(sortField === field) sortDir *= -1; else { sortField = field; sortDir = 1; }
  window.schoolCurrentPage = 1;
  renderSchoolTable();
}
function escAttr(s){
  return String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function normCollege(c){
  return String(c||'').replace(/^\(\d+\)\s*/, '').replace(/[：:；;、\s]/g, '').trim();
}
function dirCollege(r){
  if(r && r.college) return r.college;
  const nm = String((r&&r.majorName)||'');
  const m = nm.match(/[（(]([^（）()]*(?:学院|研究院|学部|系|所)[^（）()]*)[）)]/);
  return m ? m[1].trim() : '';
}
function wavgRecs(recs, field){
  const pairs = recs.filter(r=>r[field]!=null && r.admitNum);
  if(!pairs.length) return null;
  return pairs.reduce((x,r)=>x+r[field]*(r.admitNum||0),0)/pairs.reduce((x,r)=>x+(r.admitNum||0),0);
}
function setRowPlaceholder(tr){
  // 未选方向时: 数据列不展示数据, 统一灰色弱化占位
  // 进复试列放"选方向后查看"引导, 其余列"—"避免窄列内文字溢出重叠
  ['row-enter','row-admit','row-ratio','row-avgadmit','row-avgcourse'].forEach(function(c){
    const td = tr.querySelector('.'+c);
    if(!td) return;
    td.textContent = (c === 'row-enter') ? '选方向查看' : '—';
    td.style.color = '#c9c9de';
    td.style.fontSize = (c === 'row-enter') ? '9px' : '10px';
    td.style.fontWeight = '400';
    td.style.whiteSpace = 'nowrap';
  });
}
function clearRowPlaceholder(tr){
  // 清除占位时的灰色弱化内联样式, 恢复数据本来的醒目展示(含scoreClass/ratioClass颜色)
  ['row-enter','row-admit','row-ratio','row-avgadmit','row-avgcourse'].forEach(function(c){
    const td = tr.querySelector('.'+c);
    if(!td) return;
    td.style.color = '';
    td.style.fontSize = '';
    td.style.fontWeight = '';
    td.style.whiteSpace = '';
  });
}
function mobileMetricValue(tr, cls){
  const el = tr.querySelector('.'+cls);
  return el ? (el.textContent||'—').trim() : '—';
}
function updateMobileSchoolCard(tr){
  if(!tr || !tr.dataset.mobileCardId) return;
  const card = document.getElementById(tr.dataset.mobileCardId);
  if(!card) return;
  const chosen = tr.dataset.dirChosen === '1' && tr.querySelector('.row-dir') && tr.querySelector('.row-dir').value !== '';
  card.classList.toggle('has-direction', chosen);
  const status = card.querySelector('.mobile-school-card__status');
  if(status) status.textContent = chosen ? '已更新当前方向数据' : '请选择具体方向查看数据';
  const mapping = {enter:'row-enter',admit:'row-admit',ratio:'row-ratio',avgadmit:'row-avgadmit',avgcourse:'row-avgcourse'};
  Object.keys(mapping).forEach(function(key){
    const target = card.querySelector('[data-metric="'+key+'"]');
    if(!target) return;
    if(!chosen){
      target.textContent = '—';
      if(key === 'ratio') target.className = '';
      return;
    }
    if(key === 'ratio'){
      const ratioText = mobileMetricValue(tr, mapping[key]);
      const enterNum = parseFloat(mobileMetricValue(tr, 'row-enter'));
      const admitNum = parseFloat(mobileMetricValue(tr, 'row-admit'));
      const ratioVal = fillRatio(
        (ratioText !== '' && ratioText !== '-' && ratioText !== '—') ? Number(ratioText) : null,
        isNaN(enterNum) ? null : enterNum,
        isNaN(admitNum) ? null : admitNum
      );
      target.textContent = ratioVal != null ? ratioVal : (ratioText === '' ? '—' : ratioText);
      target.className = ratioVal != null ? ratioClass(ratioVal) : '';
    } else {
      target.textContent = mobileMetricValue(tr, mapping[key]);
    }
  });
  updateMobileFavoriteButton(card, tr.dataset.school || '');
}
function updateMobileFavoriteButton(card, schoolName){
  if(!card || !schoolName) return;
  const btn = card.querySelector('.mobile-school-card__star');
  if(!btn) return;
  const active = isFavorite(schoolName);
  btn.classList.toggle('is-favorite', active);
  btn.textContent = active ? '★' : '☆';
  btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  btn.setAttribute('aria-label', (active ? '取消收藏' : '收藏') + schoolName);
  btn.title = active ? '从目标院校移除' : '加入目标院校';
}
function toggleMobileFavorite(event, button, schoolName){
  if(event){
    event.preventDefault();
    event.stopPropagation();
  }
  toggleFavorite(schoolName);
  const card = button && button.closest('.mobile-school-card');
  if(card) updateMobileFavoriteButton(card, schoolName);
}
function mobileSelectSchoolCard(cardId, type, value){
  const card = document.getElementById(cardId);
  if(!card) return;
  const trId = card.dataset.rowId;
  const tr = document.querySelector('#schoolTable tr[data-mobile-row-id="'+trId+'"]');
  if(!tr) return;
  const original = tr.querySelector(type === 'college' ? '.row-col' : '.row-dir');
  if(!original) return;
  original.value = value;
  applyRowSelect(original);
  if(type === 'college'){
    const mobileDir = card.querySelector('.mobile-row-dir');
    const originalDir = tr.querySelector('.row-dir');
    if(mobileDir && originalDir){
      mobileDir.innerHTML = originalDir.innerHTML;
      mobileDir.value = originalDir.value;
    }
  }
  updateMobileSchoolCard(tr);
  card.classList.remove('is-updating');
  void card.offsetWidth;
  card.classList.add('is-updating');
}
function renderMobileSchoolCards(){
  const host = document.getElementById('mobileSchoolCards');
  const tbody = document.getElementById('schoolTable');
  if(!host || !tbody) return;
  const rows = Array.from(tbody.querySelectorAll('tr[data-school]'));
  if(!rows.length){
    host.innerHTML = '<div class="mobile-school-empty">没有符合当前条件的院校，请调整筛选条件。</div>';
    return;
  }
  host.innerHTML = '';
  rows.forEach(function(tr,index){
    const rowId = 'mobile-row-'+index;
    const cardId = 'mobile-school-card-'+index;
    tr.dataset.mobileRowId = rowId;
    tr.dataset.mobileCardId = cardId;
    const school = tr.dataset.school || '';
    const cells = tr.children;
    const tier = cells[0] ? cells[0].textContent.trim() : '—';
    const province = cells[1] ? cells[1].textContent.trim() : '—';
    const info = cells[3] ? cells[3].innerHTML : '';
    const colSel = tr.querySelector('.row-col');
    const dirSel = tr.querySelector('.row-dir');
    const card = document.createElement('article');
    card.id = cardId;
    card.dataset.rowId = rowId;
    card.dataset.school = school;
    card.className = 'mobile-school-card';
    card.innerHTML = '<header class="mobile-school-card__header">'+
      '<div class="mobile-school-card__identity"><img src="专业课选择/images/校徽/'+escAttr(school)+'.jpg" onerror="this.style.display=\'none\'" alt="'+escAttr(school)+'校徽"><span><small>'+escAttr(tier)+' · '+escAttr(province)+'</small><button type="button" onclick="openMobileSchoolDetail(\''+cardId+'\')">'+escAttr(school)+'</button></span></div>'+
      '<button class="mobile-school-card__star'+(isFavorite(school)?' is-favorite':'')+'" type="button" onclick="toggleMobileFavorite(event,this,\''+String(school).replace(/'/g,"\\'")+'\')" aria-pressed="'+(isFavorite(school)?'true':'false')+'" aria-label="'+(isFavorite(school)?'取消收藏':'收藏')+escAttr(school)+'">'+(isFavorite(school)?'★':'☆')+'</button></header>'+
      '<div class="mobile-school-card__links">'+info+'</div>'+
      '<div class="mobile-school-card__controls"><label>学院<select class="mobile-row-col" onchange="mobileSelectSchoolCard(\''+cardId+'\',\'college\',this.value)">'+(colSel?colSel.innerHTML:'')+'</select></label><label>专业方向<select class="mobile-row-dir" onchange="mobileSelectSchoolCard(\''+cardId+'\',\'direction\',this.value)">'+(dirSel?dirSel.innerHTML:'')+'</select></label></div>'+
      '<section class="mobile-school-card__result"><div class="mobile-school-card__result-head"><b>当前方向数据</b><span class="mobile-school-card__status">请选择具体方向查看数据</span></div><div class="mobile-school-card__metrics">'+
      '<div><span data-metric="enter">—</span><small>进复试</small></div><div><span data-metric="admit">—</span><small>拟录取</small></div><div><span data-metric="ratio">—</span><small>复录比</small></div><div><span data-metric="avgadmit">—</span><small>录取均分</small></div><div><span data-metric="avgcourse">—</span><small>专业课均分</small></div></div></section>'+
      '<footer><button type="button" onclick="openMobileSchoolDetail(\''+cardId+'\')">查看完整数据 <span>→</span></button></footer>';
    host.appendChild(card);
    if(colSel) card.querySelector('.mobile-row-col').value = colSel.value;
    if(dirSel) card.querySelector('.mobile-row-dir').value = dirSel.value;
    updateMobileSchoolCard(tr);
  });
}
function renderMobileDirectionCards(recs){
  const host = document.getElementById('mobileSchoolCards');
  if(!host) return;
  if(!recs || !recs.length){
    host.innerHTML = '<div class="mobile-school-empty">没有符合条件的数二英二方向，请调整筛选条件。</div>';
    return;
  }
  host.innerHTML = recs.map(function(r){
    const school = r.school || '';
    const direction = cleanDirName(r.majorName) || '未标注方向';
    const recordIndex = records.indexOf(r);
    const ratioVal = fillRatio(r.ratio, r.enterNum, r.admitNum);
    return '<article class="mobile-school-card mobile-direction-card has-direction" data-school="'+escAttr(school)+'" data-record-index="'+recordIndex+'">'+
      '<header class="mobile-school-card__header"><div class="mobile-school-card__identity"><img src="专业课选择/images/校徽/'+escAttr(school)+'.jpg" onerror="this.style.display=\'none\'" alt="'+escAttr(school)+'校徽"><span><small>'+escAttr(r.tier||'—')+' · '+escAttr(r.province||'—')+'</small><button type="button" onclick="openMobileDirectionDetail(this.closest(\'.mobile-direction-card\'))">'+escAttr(school)+'</button></span></div><button class="mobile-school-card__star'+(isFavorite(school)?' is-favorite':'')+'" type="button" onclick="toggleMobileFavorite(event,this,\''+String(school).replace(/'/g,"\\'")+'\')" aria-pressed="'+(isFavorite(school)?'true':'false')+'" aria-label="'+(isFavorite(school)?'取消收藏':'收藏')+escAttr(school)+'">'+(isFavorite(school)?'★':'☆')+'</button></header>'+
      '<div class="mobile-direction-card__path"><span>数二英二专项</span><b>'+escAttr(r.college||dirCollege(r)||'学院未标注')+'</b><strong>'+(r.majorCode?escAttr(r.majorCode)+' ':'')+escAttr(direction)+'</strong></div>'+
      '<section class="mobile-school-card__result"><div class="mobile-school-card__result-head"><b>该方向录取数据</b><span>专项筛选结果</span></div><div class="mobile-school-card__metrics">'+
      '<div><span>'+escAttr(r.enterNum!=null?r.enterNum:'—')+'</span><small>进复试</small></div><div><span>'+escAttr(r.admitNum!=null?r.admitNum:'—')+'</span><small>拟录取</small></div><div><span class="' + ratioClass(ratioVal) + '">'+(ratioVal!=null?ratioVal:'—')+'</span><small>复录比</small></div><div><span>'+escAttr(r.admitAvg!=null?fmt(r.admitAvg):'—')+'</span><small>录取均分</small></div><div><span>'+escAttr(r.courseAvg!=null?fmt(r.courseAvg):'—')+'</span><small>专业课均分</small></div></div></section>'+
      '<footer><button type="button" onclick="openMobileDirectionDetail(this.closest(\'.mobile-direction-card\'))">查看该方向完整数据 <span>→</span></button></footer></article>';
  }).join('');
}

// 移动端学校卡片沿用首页的选择上下文：未选方向看全校，选择后只看该学院下的该方向。
function openMobileSchoolDetail(cardId){
  const card = document.getElementById(cardId);
  if(!card) return;
  const rowId = card.dataset.rowId;
  const tr = rowId ? document.querySelector('tr[data-mobile-row-id="'+rowId+'"]') : null;
  if(!tr || !tr.dataset.school) return;

  const school = tr.dataset.school;
  const dirSel = tr.querySelector('.row-dir');
  const dirIdx = dirSel ? dirSel.value : '';
  const schRecs = records.filter(function(r){ return r.school === school; });

  // 「查看完整数据」始终进入该校所有学院、所有方向的数据；方向筛选交给详情页内筛选栏
  window.pendingDetailFilter = null;
  if(typeof window.enterSchoolDetailWithHistory === 'function') window.enterSchoolDetailWithHistory(school);
  else goDetail(school);
}

// 数二英二专项卡片本身已代表一个明确方向，进入详情时保持这一精确筛选。
function openMobileDirectionDetail(card){
  if(!card) return;
  const school = card.dataset.school || '';
  const recordIndex = parseInt(card.dataset.recordIndex, 10);
  const rec = Number.isNaN(recordIndex) ? null : records[recordIndex];
  if(!school) return;

  window.pendingDetailFilter = rec ? function(r){
    return r.college === rec.college && r.majorName === rec.majorName;
  } : null;
  goDetail(school);
}
function applyRowSelect(sel){
  const tr = sel.closest('tr');
  if(!tr) return;
  const school = tr.dataset.school;
  const colSel = tr.querySelector('.row-col');
  const dirSel = tr.querySelector('.row-dir');
  const schRecs = records.filter(r=>r.school===school);
  const college = colSel ? colSel.value : '';
  // 记录用户是否主动选择过方向：切学院会重置方向下拉，故清除标记
  if(sel.classList.contains('row-col')){
    tr.dataset.dirChosen = '';
  } else if(sel.classList.contains('row-dir')){
    tr.dataset.dirChosen = '1';
  }
  // 学院变化 → 级联刷新方向下拉(只显示该学院下的方向),保留"全部"显示学院整体
  if(sel.classList.contains('row-col')){
    let colRecs = schRecs;
    if(college){
      const selNorm = normCollege(college);
      colRecs = schRecs.filter(function(r){
        const rc = normCollege(r.college || dirCollege(r));
        return !!rc && rc === selNorm;
      });
    }
    if(!colRecs.length) colRecs = schRecs;  // 匹配不到时回退到全部方向
    const opts = ['<option value="">全部('+colRecs.length+'个方向)</option>'];
    colRecs.forEach(function(r){
      opts.push('<option value="'+schRecs.indexOf(r)+'">'+escAttr(dirOptionText(r, college))+'</option>');
    });
    dirSel.innerHTML = opts.join('');
    dirSel.selectedIndex = 0;  // 默认选"全部" → 显示该学院整体数据
  }
  const dirIdx = dirSel ? dirSel.value : '';
  // 未主动选择具体方向(含"全部")：不展示任何数据, 显示柔和占位
  if(tr.dataset.dirChosen !== '1' || dirIdx === ''){
    setRowPlaceholder(tr);
    updateMobileSchoolCard(tr);
    return;
  }
  // 已选具体方向：先清除占位灰色样式, 恢复醒目数据展示
  clearRowPlaceholder(tr);
  const chosen = schRecs[parseInt(dirIdx)];
  if(!chosen || (college && chosen.college && chosen.college !== college)){
    tr.querySelector('.row-enter').textContent = '-';
    tr.querySelector('.row-admit').textContent = '-';
    tr.querySelector('.row-ratio').textContent = '-';
    tr.querySelector('.row-avgadmit').textContent = '-';
    tr.querySelector('.row-avgcourse').textContent = '-';
    return;
  }
  tr.querySelector('.row-enter').textContent = chosen.enterNum!=null?chosen.enterNum:'-';
  tr.querySelector('.row-admit').textContent = chosen.admitNum!=null?chosen.admitNum:'-';
  tr.querySelector('.row-ratio').textContent = chosen.ratio!=null?chosen.ratio:'-';
  tr.querySelector('.row-avgadmit').textContent = chosen.admitAvg!=null?fmt(chosen.admitAvg):'-';
  tr.querySelector('.row-avgcourse').textContent = chosen.courseAvg!=null?fmt(chosen.courseAvg):'-';
  updateMobileSchoolCard(tr);
}
function findDist(school, rec){
  const dists = (typeof SCHOOL_DIST!=='undefined') ? SCHOOL_DIST[school] : null;
  if(!dists || !rec) return null;
  const code = rec.majorCode || '';
  const mn = String(rec.majorName||'').trim();
  const colShort = String(rec.college||'').replace(/^\(\d+\)\s*/,'').replace(/[：:；;、\s]/g,'').replace('哈尔滨工业大学','哈工大');
  // 1) 学院 + 完整方向名 同时命中(优先, 解决同代码多校区/多基地方向串卡)
  if(mn && colShort){
    for(const d of dists){
      if((d.title||'').indexOf(colShort)>=0 && d.title.indexOf(mn)>=0) return d;
    }
  }
  // 2) 完整方向名命中
  if(mn){
    for(const d of dists){
      if(d.title.indexOf(mn)>=0) return d;
    }
  }
  // 3) 代码命中
  if(code){
    for(const d of dists){
      const m = d.title.match(/(\d{5,6}|[0-9A-Za-z]{5,6})/);
      if(m && m[1]===code) return d;
    }
  }
  // 4) 去括号/去学硕专硕 的方向名
  const nm = mn.replace(/（.*）|\(.*\)/g,'').replace(/学硕|专硕/g,'').trim();
  if(nm){
    for(const d of dists){
      if(d.title.indexOf(nm)>=0) return d;
    }
  }
  return null;
}
function cleanDirName(name){
  let n = String(name||'').trim();
  n = n.replace(/^[\d一二三四五六七八九十]+、?\s*/, '');
  n = n.replace(/26考研|27考研|考研/g, '');
  n = n.replace(/录取情况分析|录取情况|情况分析|录取分析|分析/g, '');
  n = n.replace(/学硕|专硕/g, '');
  n = n.replace(/（[^）]*录取[^）]*）|\([^)]*录取[^)]*\)/g, '');
  n = n.replace(/\s+/g, '').trim();
  return n;
}
function dirOptionText(r, college){
  let nm = cleanDirName(r.majorName);
  const colNorm = normCollege(college);
  if(colNorm && nm){
    const esc = colNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    nm = nm.replace(new RegExp('[（(]' + esc + '[）)]'), '');
  }
  return (r.majorCode||'') + (nm ? ' ' + nm : '');
}
function renderDirectionRows(){
  const tbody = document.getElementById('schoolTable');
  const tierOrder = {'985':1,'211':2,'双非':4};
  const tierClass = {'985':'tier-985','211':'tier-211','双非':'tier-sf'};
  const thInfo = document.getElementById('thSchoolInfo');
  if(thInfo) thInfo.style.display = 'none';
  const tier = document.getElementById('filterTier').value;
  let recs = getFilteredForUpdate('');
  if(tier) recs = recs.filter(function(r){ return r.tier===tier; });
  recs.sort(function(a,b){
    const ta = tierOrder[a.tier||'双非']||4, tb = tierOrder[b.tier||'双非']||4;
    if(ta!==tb) return ta-tb;
    return (b.admitAvg||0)-(a.admitAvg||0);
  });
  if(recs.length === 0){
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:40px 20px;"><svg viewBox="0 0 24 24" style="width:46px;height:46px;margin:0 auto 14px;display:block;color:#c9ccd1;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:square;stroke-linejoin:round;"><circle cx="11" cy="11" r="7"/><path d="m16.4 16.4 4.6 4.6"/><path d="M8.4 11h5.2"/></svg><div style="font-size:16px;font-weight:700;color:#17191d;">没有符合条件的数二英二方向</div></td></tr>';
    renderSchoolPagination(0, 1);
    renderMobileDirectionCards([]);
    return;
  }
  tbody.innerHTML = recs.map(function(r){
    const tierC = tierClass[r.tier||'双非']||'tier-sf';
    const dirName = cleanDirName(r.majorName);
    return '<tr class="table-row border-b">' +
      '<td class="py-3 pr-2"><span class="'+tierC+'">'+(r.tier||'-')+'</span></td>' +
      '<td class="py-3 pr-2">'+escAttr(r.province||'-')+'</td>' +
      '<td class="py-3 pr-2 col-school"><div class="flex items-center gap-1"><img src="专业课选择/images/校徽/'+escAttr(r.school)+'.jpg" onerror="this.style.display=\'none\'" style="width:30px;height:30px;border-radius:50%;object-fit:cover;"><span onclick="goDetail(\''+String(r.school).replace(/'/g,"\\'")+'\')" style="cursor:pointer;">'+escAttr(r.school)+'</span></div></td>' +
      '<td class="py-3 pr-2" style="font-size:12px;white-space:normal;line-height:1.4;">'+escAttr(r.college||'-')+'</td>' +
      '<td class="py-3 pr-2" style="font-size:12px;white-space:normal;line-height:1.4;">'+escAttr(dirName||'-')+'</td>' +
      '<td class="py-3 pr-2 row-enter" style="text-align:center;">'+(r.enterNum!=null?r.enterNum:'-')+'</td>' +
      '<td class="py-3 pr-2 row-admit" style="text-align:center;">'+(r.admitNum!=null?r.admitNum:'-')+'</td>' +
      '<td class="py-3 pr-2 row-ratio" style="text-align:center;">'+(r.ratio!=null?r.ratio:'-')+'</td>' +
      '<td class="py-3 pr-2 row-avgadmit" style="text-align:center;">'+fmt(r.admitAvg)+'</td>' +
      '<td class="py-3 pr-2 row-avgcourse" style="text-align:center;">'+fmt(r.courseAvg)+'</td>' +
      '<td class="py-3" style="text-align:center;"></td>' +
      '</tr>';
  }).join('');
  const countEl = document.getElementById('schoolCount');
  if(countEl) countEl.textContent = '(共'+recs.length+'个方向)';
  renderSchoolPagination(recs.length, 1);
  renderMobileDirectionCards(recs);
}
function schoolNameHtml(name){
  // 带括号校区后缀(如"华北电力大学（北京）")的括号部分用小字号弱化, 防窄列内文字溢出遮挡
  const m = String(name||'').match(/^([^（(]*)[（(]([^）)]*)[）)]$/);
  if(!m) return escAttr(name);
  return escAttr(m[1]) + '<span style="font-size:11px;opacity:.8;">（' + escAttr(m[2]) + '）</span>';
}
function renderSchoolTable(){
  const tbody = document.getElementById('schoolTable');
  tbody.innerHTML = '';
  if(document.getElementById('filterMath2Eng2').checked){
    renderDirectionRows();
    return;
  }
  const thInfo = document.getElementById('thSchoolInfo');
  if(thInfo) thInfo.style.display = '';
  const data = getSchoolTableData();

  if(data.length === 0){
    tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:40px 20px;"><svg viewBox="0 0 24 24" style="width:46px;height:46px;margin:0 auto 14px;display:block;color:#c9ccd1;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:square;stroke-linejoin:round;"><circle cx="11" cy="11" r="7"/><path d="m16.4 16.4 4.6 4.6"/><path d="M8.4 11h5.2"/></svg><div style="font-size:16px;font-weight:700;color:#17191d;margin-bottom:8px;">没有找到符合条件的院校</div><div style="font-size:13px;color:#777a80;margin-bottom:16px;">试试调整筛选条件或搜索关键词</div><button onclick="resetSchoolFilters()" style="padding:8px 20px;background:#a92122;color:#fff;border:none;border-radius:20px;cursor:pointer;font-size:13px;font-weight:700;">重置筛选</button></div></td></tr>';
    const mobileHost = document.getElementById('mobileSchoolCards');
    if(mobileHost) mobileHost.innerHTML = '<div class="mobile-school-empty">没有符合当前条件的院校，请调整筛选条件。</div>';
    renderSchoolPagination(0, 1);
    return;
  }
  
  // 更新标题显示标签筛选状态
  const schoolCountEl = document.getElementById('schoolCount');
  if(currentTagFilter) {
    schoolCountEl.innerHTML = `<span class="tag" style="background:#dbeafe;color:#4A5570;padding:2px 8px;border-radius:4px;font-size:12px;">${currentTagFilter}</span> (共${data.length}所) <button class="text-xs text-gray-500 ml-2" style="cursor:pointer;background:none;border:none;" onclick="resetTagFilter()">清除</button>`;
  } else {
    schoolCountEl.textContent = `(共${data.length}所)`;
  }

  const tierOrder = {'985': 1, '211': 2,  '双非': 4};
  const tierClass = {'985': 'tier-985', '211': 'tier-211',  '双非': 'tier-sf'};
  const schoolClass = {'985': 'school-name-985', '211': 'school-name-211',  '双非': 'school-name-sf'};

  data.sort((a,b)=>{
    const ta = tierOrder[a.tier||'双非'] || 4;
    const tb = tierOrder[b.tier||'双非'] || 4;
    if(ta !== tb) return ta - tb;
    return (b.enter||0) - (a.enter||0);
  });

  // 分页逻辑
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / 20) || 1;
  if(window.schoolCurrentPage > totalPages) window.schoolCurrentPage = 1;
  const start = (window.schoolCurrentPage - 1) * 20;
  const end = Math.min(start + 20, totalItems);
  const pageData = data.slice(start, end);

  pageData.forEach(s=>{
    const tier = s.tier || '双非';
    const tr = document.createElement('tr');
    tr.className = 'table-row border-b';
    const isFav = isFavorite(s['学校']);
    tr.dataset.school = s['学校'];
    tr.dataset.enter = s.enter!=null?s.enter:'';
    tr.dataset.admit = s.admit!=null?s.admit:'';
    tr.dataset.ratio = s.ratio!=null?s.ratio:'';
    tr.dataset.avgAdmit = s.avgAdmit!=null?s.avgAdmit:'';
    tr.dataset.avgCourse = s.avgCourse!=null?s.avgCourse:'';
    const schRecs = records.filter(r=>r.school===s['学校']);
    let rowColleges = [];
    if(window.KAOYAN_DATA && window.KAOYAN_DATA.schoolColleges && window.KAOYAN_DATA.schoolColleges[s['学校']]){
      rowColleges = window.KAOYAN_DATA.schoolColleges[s['学校']];
    }
    if(!rowColleges.length){
      rowColleges = [...new Set(schRecs.map(r=>r.college).filter(Boolean))];
    }
    if(!rowColleges.length){
      rowColleges = [...new Set(schRecs.map(r=>dirCollege(r)).filter(Boolean))];
    }
    const colOpts = rowColleges.map(function(c){return '<option value="'+escAttr(c)+'">'+escAttr(c)+'</option>';}).join('');
    const dirOpts = '';
    tr.innerHTML = `
      <td class="py-3 pr-2"><span class="${tierClass[tier]}">${tier}</span></td>
      <td class="py-3 pr-2" style="font-size:12px;white-space:nowrap;">${s['省份/自治区']}</td>
      <td class="py-3 pr-2 col-school ${schoolClass[tier]}" style="white-space:normal;">
        <div class="flex items-center gap-1"><img src="专业课选择/images/校徽/${s['学校']}.jpg" onerror="this.style.display='none'" style="width:22px;height:22px;border-radius:50%;vertical-align:middle;object-fit:cover;flex:none;"><span onclick="goRowDetail(this)" style="cursor:pointer;" title="点击查看${s['学校']}详情">${schoolNameHtml(s['学校'])}</span></div>
      </td>
      <td class="py-3 pr-2">
        <div class="flex gap-1 flex-wrap" style="justify-content:flex-start;">
          ${SHENGYUAN_SCHOOLS.has(s['学校']) ? `<a href="控制院校生源地图.html?school=${encodeURIComponent(s['学校'])}" class="tag tag-blue" style="font-size:10px;padding:2px 5px;cursor:pointer;text-decoration:none;" title="查看该校生源分布">院校生源</a>` : ''}
          <a href="专业课选择/考研专业课院校查询.html?school=${encodeURIComponent(s['学校'])}&fromSchoolDetail=1" class="tag tag-green" style="font-size:10px;padding:2px 5px;cursor:pointer;text-decoration:none;" title="查看该校考察的专业课">考察专业课</a>
          ${EMPLOYMENT_SCHOOLS.has(s['学校']) ? `<a href="${EMPLOYMENT_MAP[s['学校']] || '就业相关/院校就业去向/schools/' + s['学校'] + '.html'}" class="tag tag-orange" style="font-size:10px;padding:2px 5px;cursor:pointer;text-decoration:none;" title="查看该校就业数据">就业去向</a>` : ''}
        </div>
      </td>
      <td class="py-3 pr-2"><select class="row-col" onchange="applyRowSelect(this)" style="width:100%;min-width:0;max-width:110px;font-size:11px;padding:2px 4px;border:1px solid #e5e7eb;border-radius:6px;">${colOpts}</select></td>
      <td class="py-3 pr-2"><select class="row-dir" onchange="applyRowSelect(this)" style="width:100%;min-width:0;max-width:150px;font-size:11px;padding:2px 4px;border:1px solid #e5e7eb;border-radius:6px;">${dirOpts}</select></td>
      <td class="py-3 pr-2 row-enter">${s.enter||'-'}</td>
      <td class="py-3 pr-2 row-admit">${s.admit||'-'}</td>
      <td class="py-3 pr-2 row-ratio ${ratioClass(s.ratio)}">${s.ratio!=null?s.ratio:'-'}</td>
      <td class="py-3 pr-2 row-avgadmit ${scoreClass(s.avgAdmit)}">${fmt(s.avgAdmit)}</td>
      <td class="py-3 pr-2 row-avgcourse">${fmt(s.avgCourse)}</td>
      <td class="py-3" style="text-align:center;">
        <span class="fav-star ${isFav?'fav-active':'fav-inactive'}" onclick="toggleFavorite('${s['学校'].replace(/'/g, "\\'")}')" title="${isFav?'取消收藏':'加入目标院校'}" style="font-size:20px;cursor:pointer;display:inline-block;">★</span>
      </td>
    `;
    const colSelR = tr.querySelector('.row-col');
    const dirSelR = tr.querySelector('.row-dir');
    if(rowColleges.length > 0){
      colSelR.value = rowColleges[0];
      applyRowSelect(colSelR);
    } else if(dirSelR){
      dirSelR.innerHTML = schRecs.map(function(r,ri){return '<option value="'+ri+'">'+escAttr(r.majorName||'')+'</option>';}).join('');
      setRowPlaceholder(tr);  // 无学院学校初始未选方向 → 数据列占位
    }
    tbody.appendChild(tr);
  });

  renderSchoolPagination(totalItems, totalPages);
  renderMobileSchoolCards();
  // 更新排序箭头
  ['admit','avgAdmit','avgCourse','enter','ratio'].forEach(function(f){
    var el = document.getElementById('sort-'+f);
    if(el) el.textContent = (sortField === f) ? (sortDir > 0 ? ' ▲' : ' ▼') : '';
  });
}

function renderSchoolPagination(totalItems, totalPages){
  const el = document.getElementById('schoolPagination');
  if(!el) return;
  if(totalPages <= 1) { el.style.display = 'none'; return; }
  el.style.display = 'flex';
  let html = '';
  const cur = window.schoolCurrentPage;
  html += `<button class="page-btn" onclick="goSchoolPage(${cur-1})" ${cur<=1?'disabled style="opacity:.5;cursor:not-allowed;"':''}>上一页</button>`;
  const startPage = Math.max(1, cur - 2);
  const endPage = Math.min(totalPages, cur + 2);
  if(startPage > 1) { html += `<button class="page-btn" onclick="goSchoolPage(1)">1</button>`; if(startPage > 2) html += `<span style="padding:0 4px;color:#999;">...</span>`; }
  for(let i = startPage; i <= endPage; i++){
    html += `<button class="page-btn ${i===cur?'active':''}" onclick="goSchoolPage(${i})">${i}</button>`;
  }
  if(endPage < totalPages) { if(endPage < totalPages - 1) html += `<span style="padding:0 4px;color:#999;">...</span>`; html += `<button class="page-btn" onclick="goSchoolPage(${totalPages})">${totalPages}</button>`; }
  html += `<button class="page-btn" onclick="goSchoolPage(${cur+1})" ${cur>=totalPages?'disabled style="opacity:.5;cursor:not-allowed;"':''}>下一页</button>`;
  html += `<span style="font-size:13px;color:#888;margin-left:10px;">第 ${cur}/${totalPages} 页，共 ${totalItems} 所</span>`;
  el.innerHTML = html;
}

function goSchoolPage(page){
  const data = getSchoolTableData();
  const totalPages = Math.ceil(data.length / 20) || 1;
  if(page < 1 || page > totalPages) return;
  window.schoolCurrentPage = page;
  renderSchoolTable();
  const schoolListEl = document.getElementById('schoolTable').closest('.card');
  if(schoolListEl) schoolListEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===================== 院校标签定义 =====================
const SCHOOL_TAGS = {
  '28所': new Set(['清华大学','北京大学','中国科学院大学','北京航空航天大学','北京理工大学','北京工业大学','复旦大学','上海交通大学','同济大学','东南大学','南京大学','浙江大学','中国科学技术大学','合肥工业大学','西安交通大学','西北工业大学','西安电子科技大学','电子科技大学','华中科技大学','中山大学','华南理工大学','天津大学','大连理工大学','山东大学','国防科学技术大学','福州大学','厦门大学','南方科技大学']),
  '军工六校': new Set(['中国人民解放军国防科技大学','哈尔滨工程大学','南京理工大学','中国人民解放军陆军工程大学','中国人民解放军陆军装甲兵学院','中国人民解放军陆军防化学院']),
  '兵工七子': new Set(['北京理工大学','南京理工大学','中北大学','长春理工大学','沈阳理工大学','西安工业大学','重庆理工大学']),
  '两电一邮': new Set(['电子科技大学','西安电子科技大学','北京邮电大学']),
  'C9联盟': new Set(['北京大学','清华大学','浙江大学','复旦大学','上海交通大学','南京大学','中国科学技术大学','哈尔滨工业大学','西安交通大学'])
};

// 有生源数据的院校（172所）
const SHENGYUAN_SCHOOLS = new Set(['上海交通大学','上海大学','上海海事大学','上海理工大学','上海电力大学','东北农业大学','东北大学','东北师范大学','东北林业大学','东华大学','东华理工大学','东南大学','东莞理工学院','中北大学','中南大学','中南林业科技大学','中南民族大学','中国人民公安大学','中国传媒大学','中国地质大学(北京)','中国地质大学(武汉)','中国民航大学','中国海洋大学','中国石油大学(北京)','中国石油大学(华东)','中国矿业大学','中国科学技术大学','中国科学院大学','中国计量大学','中央民族大学','中山大学','云南大学','兰州大学','内蒙古工业大学','北京交通大学','北京信息科技大学','北京化工大学','北京大学','北京工业大学','北京林业大学','北京理工大学','北京电子科技学院','北京科技大学','北京航空航天大学','北京邮电大学','北方工业大学','华东交通大学','华东师范大学','华东理工大学','华中师范大学','华中科技大学','华侨大学','华北电力大学','华北电力大学(保定)','华南农业大学','华南师范大学','华南理工大学','南京信息工程大学','南京农业大学','南京大学','南京工业大学','南京工程学院','南京师范大学','南京理工大学','南京航空航天大学','南京邮电大学','南开大学','南方科技大学','南昌大学','南昌航空大学','厦门大学','合肥工业大学','吉林大学','哈尔滨工业大学','哈尔滨工程大学','哈尔滨理工大学','四川大学','国防科技大学','复旦大学','大连工业大学','大连海事大学','大连理工大学','天津大学','天津工业大学','天津理工大学','天津科技大学','太原理工大学','宁夏大学','宁波大学','安徽农业大学','安徽大学','安徽师范大学','安徽理工大学','山东大学','山东师范大学','山东科技大学','山西大学','广东工业大学','广州大学','广西大学','成都信息工程大学','成都理工大学','新疆大学','昆明理工大学','暨南大学','杭州电子科技大学','桂林电子科技大学','武汉大学','武汉工程大学','武汉理工大学','武汉科技大学','江南大学','江苏科技大学','江西师范大学','沈阳理工大学','沈阳航空航天大学','河北工业大学','河北科技大学','河南大学','河南工业大学','河南理工大学','河海大学','济南大学','浙江大学','浙江工业大学','浙江工商大学','浙江理工大学','海南大学','深圳大学','温州大学','湖北大学','湖北工业大学','湖南大学','湖南师范大学','湘潭大学','电子科技大学','石家庄铁道大学','福州大学','福建师范大学','苏州大学','西北大学','西北工业大学','西南交通大学','西南大学','西南石油大学','西南科技大学','西安交通大学','西安工业大学','西安工程大学','西安理工大学','西安电子科技大学','西安石油大学','西安科技大学','西安邮电大学','贵州大学','郑州大学','重庆大学','重庆理工大学','重庆邮电大学','长安大学','长春工业大学','长春理工大学','长江大学','长沙理工大学','陕西师范大学','集美大学','青岛理工大学','黑龙江大学','齐鲁工业大学','燕山大学','同济大学','内蒙古大学']);

const EVAL_TAGS = {};
// 有就业数据的院校（98所）
const EMPLOYMENT_SCHOOLS = new Set([
  '上海大学','上海电力大学','东北大学','东北林业大学','东南大学',
  '中国海洋大学','中国矿业大学','中山大学','北京工业大学','北京理工大学',
  '北京航空航天大学','北京邮电大学','华东师范大学','华中师范大学','华中科技大学',
  '华北电力大学','华南农业大学','华南师范大学','南京信息工程大学','南京理工大学',
  '南京航空航天大学','南京邮电大学','南方科技大学','南昌大学','厦门大学',
  '合肥工业大学','吉林大学','哈尔滨工业大学','哈尔滨工程大学','国防科技大学',
  '大连海事大学','大连理工大学','天津大学','天津工业大学','宁波大学',
  '安徽大学','广东工业大学','成都信息工程大学','成都理工大学','暨南大学',
  '杭州电子科技大学','桂林电子科技大学','武汉大学','武汉理工大学','江南大学',
  '沈阳航空航天大学','河北大学','河北工业大学','河海大学','浙江大学',
  '浙江工业大学','海南大学','清华大学','湖南大学','电子科技大学','福州大学',
  '苏州大学','西北工业大学','西华大学','西南交通大学','西安交通大学',
  '西安工程大学','西安理工大学','西安电子科技大学','西安邮电大学','贵州大学',
  '重庆邮电大学','长安大学','黑龙江大学',
  '上海交通大学','上海理工大学','东华大学','中南大学','中国民航大学',
  '中国石油大学（北京）','中国石油大学（华东）','中国矿业大学（徐州）','中国科学技术大学','北京交通大学',
  '北京科技大学','华东理工大学','华北电力大学（保定）','华北电力大学（北京）','南京大学',
  '南开大学','同济大学','四川大学','太原理工大学','山东大学',
  '武汉科技大学','河南科技大学','浙江理工大学','深圳大学','渤海大学',
  '西安工业大学','郑州大学','重庆大学','陕西科技大学'
]);
// 就业数据映射（名称不完全匹配的情况）
const EMPLOYMENT_MAP = {
  '中国石油大学(华东)': '就业相关/院校就业去向/schools/中国石油大学（华东）.html',
  '中国科学院大学': '就业相关/院校就业去向/schools/中国科学院成都光电技术研究所.html'
};
// 控制科学与工程（第四轮学科评估评级，无评级或"其他"不写）
[
  ['控制A+',['浙江大学','北京理工大学','东北大学']],
  ['控制A',['哈尔滨工业大学','北京航空航天大学','上海交通大学','山东大学']],
  ['控制A-',['中南大学','西安交通大学','华中科技大学','北京科技大学','南京航空航天大学','华东理工大学']],
  ['控制B+',['大连理工大学','华南理工大学','天津大学','同济大学','西北工业大学','中国科学技术大学','北京工业大学','江南大学','南京理工大学','西安电子科技大学','杭州电子科技大学','西安理工大学','北京化工大学']],
  ['控制B',['电子科技大学','湖南大学','吉林大学','南开大学','重庆大学','华北电力大学（北京）','华北电力大学（保定）','东华大学','上海大学','武汉科技大学','浙江工业大学','燕山大学','空军工程大学']],
  ['控制B-',['武汉大学','厦门大学','北京交通大学','北京邮电大学','大连海事大学','合肥工业大学','中国石油大学（华东）','中国石油大学（北京）','中国矿业大学（徐州）','重庆邮电大学','河南科技大学','中国计量大学','兰州理工大学','华东交通大学']],
  ['控制C+',['武汉理工大学','郑州大学','南京邮电大学','天津工业大学','中国民航大学','上海理工大学','东北电力大学','北方工业大学','南京工业大学','哈尔滨理工大学','安徽工程大学','山西大学','辽宁工业大学','辽宁石油化工大学']],
  ['控制C',['四川大学','南京大学','河海大学','渤海大学','北京建筑大学','江苏科技大学','济南大学','长春工业大学','青岛大学','青岛科技大学']],
  ['控制C-',['中国海洋大学','太原理工大学','深圳大学','昆明理工大学','陕西科技大学','西安工业大学','浙江理工大学','北京信息科技大学','南通大学','太原科技大学','黑龙江大学']],
].forEach(([tag,schools])=> schools.forEach(s=>{ if(!EVAL_TAGS[s]) EVAL_TAGS[s]=[]; EVAL_TAGS[s].push(tag); }));

// 构建标签到学校的反向映射（用于点击标签筛选）
const TAG_TO_SCHOOLS = {};
// 群体标签
Object.entries(SCHOOL_TAGS).forEach(([tag, schools]) => {
  TAG_TO_SCHOOLS[tag] = [...schools];
});
// 学科评估标签
Object.entries(EVAL_TAGS).forEach(([school, tags]) => {
  tags.forEach(tag => {
    if (!TAG_TO_SCHOOLS[tag]) TAG_TO_SCHOOLS[tag] = [];
    if (!TAG_TO_SCHOOLS[tag].includes(school)) TAG_TO_SCHOOLS[tag].push(school);
  });
});

function getSchoolTags(schoolName, tier, province, noGroup){
  const tags = [];
  // 院校生源放第一个
  if(SHENGYUAN_SCHOOLS.has(schoolName)) tags.push({type:'shengyuan', name:'院校生源'});
  // 添加院校层次标签
  if(tier) tags.push({type:'tier', name:tier});
  // 添加地区和省份标签
  const REGION_MAP = {
    '北京':'华北','天津':'华北','河北':'华北','山西':'华北','内蒙古':'华北',
    '辽宁':'东北','吉林':'东北','黑龙江':'东北',
    '上海':'华东','江苏':'华东','浙江':'华东','安徽':'华东','福建':'华东','江西':'华东','山东':'华东',
    '河南':'华中','湖北':'华中','湖南':'华中',
    '广东':'华南','广西':'华南','海南':'华南',
    '重庆':'西南','四川':'西南','贵州':'西南','云南':'西南','西藏':'西南',
    '陕西':'西北','甘肃':'西北','青海':'西北','宁夏':'西北','新疆':'西北'
  };
  const region = REGION_MAP[province];
  if(region) tags.push({type:'region', name:region});
  if(province) tags.push({type:'province', name:province});
  // 添加学校特色标签（详情页传 noGroup=true 时去掉"28所"等群体标签）
  if(!noGroup){
    Object.entries(SCHOOL_TAGS).forEach(([name,set])=>{ if(set.has(schoolName)) tags.push({type:'group',name}); });
  }
  // 添加学科评估标签
  if(EVAL_TAGS[schoolName]){
    EVAL_TAGS[schoolName].forEach(tag=> tags.push({type:'eval',name:tag}));
  }
  return tags;
}

const TAG_STYLES = {
  '28所':{bg:'#fee2e2',color:'#991b1b',border:'#fecaca'},
  '军工六校':{bg:'#ffedd5',color:'#9a3412',border:'#fed7aa'},
  '兵工七子':{bg:'#fef3c7',color:'#92400e',border:'#fde68a'},
  '两电一邮':{bg:'#fce7f3',color:'#9d174d',border:'#f9a8d4'},
  'C9联盟':{bg:'#dbeafe',color:'#1e40af',border:'#93c5fd'}
};

function getTagStyle(tagName, type){
  if(type === 'tier') {
    if(tagName === '985') return {bg:'#e74c3c',color:'#fff',border:'#c0392b'};
    if(tagName === '211') return {bg:'#8b5cf6',color:'#fff',border:'#7c3aed'};
    
    return {bg:'#e5e7eb',color:'#6b7280',border:'#d1d5db'};
  }
  if(type === 'shengyuan') return {bg:'#f0fdf4',color:'#166534',border:'#86efac'};
  if(type === 'region') return {bg:'#e0e7ff',color:'#3730a3',border:'#c7d2fe'};
  if(type === 'province') return {bg:'#fef3c7',color:'#92400e',border:'#fde68a'};
  if(TAG_STYLES[tagName]) return TAG_STYLES[tagName];
  if(tagName.startsWith('控制A+')) return {bg:'#15803d',color:'#fff',border:'#166534'};
  if(tagName.startsWith('控制A')) return {bg:'#2563eb',color:'#fff',border:'#1e40af'};
  if(tagName.startsWith('控制A-')) return {bg:'#60a5fa',color:'#fff',border:'#3b82f6'};
  if(tagName.startsWith('控制B+')) return {bg:'#22c55e',color:'#fff',border:'#16a34a'};
  if(tagName.startsWith('控制B')) return {bg:'#16a34a',color:'#fff',border:'#15803d'};
  if(tagName.startsWith('控制B-')) return {bg:'#bbf7d0',color:'#166534',border:'#86efac'};
  if(tagName.startsWith('控制C+')) return {bg:'#facc15',color:'#713f12',border:'#fde047'};
  if(tagName.startsWith('控制C')) return {bg:'#f97316',color:'#fff',border:'#ea580c'};
  if(tagName.startsWith('控制C-')) return {bg:'#d1d5db',color:'#374151',border:'#9ca3af'};
  return {bg:'#f3f4f6',color:'#374151',border:'#17191d'};
}

// ===================== 二级页 =====================
function openImageLightbox(src) {
  var el = document.getElementById('imgLightbox');
  var img = document.getElementById('imgLightboxImg');
  if (el && img) { img.src = src; el.style.display = 'flex'; }
}
function joinQQGroup(groupId) {
  var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = 'mqqapi://card/show_pslcard?src_type=internal&version=1&card_type=group&uin=' + groupId;
  } else {
    var imgPath = groupId === '1050160942' ? '专业课选择/images/27考研群/27.jpg' : '专业课选择/images/27考研群/28.jpg';
    openImageLightbox(imgPath);
  }
}
function closeImageLightbox() {
  var el = document.getElementById('imgLightbox');
  if (el) el.style.display = 'none';
}
function goRowDetail(el){
  const tr = el.closest('tr');
  if(!tr || !tr.dataset.school) return;
  const school = tr.dataset.school;
  const dirSel = tr.querySelector('.row-dir');
  const colSel = tr.querySelector('.row-col');
  const dirIdx = dirSel ? dirSel.value : '';
  const college = colSel ? colSel.value : '';
  // 需主动选择具体方向(非"全部")：dirChosen标记主动选过 + 当前值是具体方向，二者缺一即弹提示
  if(tr.dataset.dirChosen !== '1' || dirIdx === ''){
    window.directionPromptSchool = school; // 供"不选方向，看学校详情"跳转
    document.getElementById('directionPromptModal').classList.add('active');
    return;
  }
  const schRecs = records.filter(r=>r.school===school);
  window.pendingDetailFilter = null;
  if(dirIdx !== '' && schRecs[parseInt(dirIdx)]){
    const rec = schRecs[parseInt(dirIdx)];
    window.pendingDetailFilter = function(r){ return r.college===rec.college && r.majorName===rec.majorName; };
  } else if(college){
    const colNorm = normCollege(college);
    const colMatcher = function(r){
      const rc = normCollege(r.college || dirCollege(r));
      return !!rc && (rc === colNorm || rc.indexOf(colNorm) >= 0 || colNorm.indexOf(rc) >= 0);
    };
    // 记录里无法关联到该学院时，降级为不过滤，避免详情页空白
    if(schRecs.some(colMatcher)) window.pendingDetailFilter = colMatcher;
  }
  goDetail(school);
}
function goDetail(schoolName){
  console.log('goDetail called:', schoolName);
  recordRecentlyViewed(schoolName);
  var dp = document.getElementById('detailPage');
  var hp = document.getElementById('homePage');
  console.log('dp found:', !!dp, 'hp found:', !!hp);
  if(!dp || !hp) { console.error('Missing page elements'); return; }
  dp.style.opacity = '';
  dp.style.transform = '';
  dp.classList.remove('hidden-detail');
  dp.classList.add('visible-detail');
  // 隐藏首页：必须用 !important，否则手机端适配的 #homePage{display:flex !important} 会覆盖此隐藏
  hp.style.setProperty('display', 'none', 'important');
  dp.style.setProperty('display', 'block', 'important');
  console.log('dp display:', dp.style.display, 'dp className:', dp.className);
  window.scrollTo(0,0);
  renderDetail(schoolName);
}

function showPage(pageId){
  document.querySelectorAll('.page').forEach(p=>{
    p.style.setProperty('display', 'none', 'important');
    p.classList.remove('visible-detail');
    p.classList.add('hidden-detail');
  });
  var el = document.getElementById(pageId);
  if(el){
    el.style.setProperty('display', 'block', 'important');
    el.classList.remove('hidden-detail');
    el.classList.add('visible-detail');
  }
  window.scrollTo(0,0);
}

function handleFavClick(schoolName){
  toggleFavorite(schoolName);
  var star = document.querySelector('#detailHeader .fav-star');
  if(star){
    star.className = 'fav-star ' + (isFavorite(schoolName) ? 'fav-active' : 'fav-inactive');
  }
}

function goHome(){
  var dp = document.getElementById('detailPage');
  var hp = document.getElementById('homePage');
  dp.style.opacity = '';
  dp.style.transform = '';
  dp.classList.remove('visible-detail');
  dp.classList.add('hidden-detail');
  setTimeout(function(){
    dp.style.setProperty('display', 'none', 'important');
    // 恢复首页显示：清空内联样式回落 CSS（手机端 #homePage{display:flex} 布局保留，桌面为 block）
    hp.style.removeProperty('display');
    window.scrollTo(0,0);
    Object.values(charts).forEach(c=>c&&c.resize());
    updateHomeQqGroupAds(isQrAdEnabled());
  }, 200);
}


function openQrLightbox(src){
  var ov = document.getElementById('qrLightbox');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'qrLightbox';
    ov.className = 'qr-lightbox-overlay';
    ov.innerHTML = '<img id="qrLightboxImg" src="" style="max-width:90vw;max-height:85vh;width:auto;height:auto;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.5);border:4px solid #fff;">';
    ov.onclick = function(){this.classList.remove('active');};
    document.body.appendChild(ov);
  }
  document.getElementById('qrLightboxImg').src = src;
  ov.classList.add('active');
}
function openPosterLightbox(src){
  // 如果旧灯箱存在，先移除（确保事件处理器是最新的）
  var oldOv = document.getElementById('posterLightbox');
  if(oldOv) oldOv.remove();
  
  var ov = document.createElement('div');
  ov.id = 'posterLightbox';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:none;overflow-y:auto;cursor:zoom-out;scroll-behavior:smooth;';
  var img = document.createElement('img');
  img.id = 'posterLightboxImg';
  img.style.cssText = 'max-width:90%;width:auto;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.5);display:block;margin:40px auto;cursor:zoom-in;transition:all 0.3s ease;';
  img.onclick = function(e){
    e.stopPropagation();
    var ov = document.getElementById('posterLightbox');
    if(ov.dataset.zoomed === 'true'){
      ov.dataset.zoomed = 'false';
      this.style.maxWidth = '90%';
      this.style.width = 'auto';
      this.style.margin = '40px auto';
      ov.style.cursor = 'zoom-out';
      this.style.cursor = 'zoom-in';
    } else {
      ov.dataset.zoomed = 'true';
      this.style.maxWidth = 'none';
      this.style.width = 'auto';
      this.style.margin = '20px auto';
      ov.style.cursor = 'zoom-out';
      this.style.cursor = 'zoom-out';
    }
  };
  ov.appendChild(img);
  ov.onclick = function(){
    if(this.dataset.zoomed === 'true'){
      this.dataset.zoomed = 'false';
      var img = document.getElementById('posterLightboxImg');
      img.style.maxWidth = '90%';
      img.style.width = 'auto';
      img.style.margin = '40px auto';
      this.style.cursor = 'zoom-out';
      img.style.cursor = 'zoom-in';
    } else {
      this.style.display = 'none';
    }
  };
  document.body.appendChild(ov);
  
  img.src = src;
  ov.dataset.zoomed = 'false';
  ov.style.display = 'block';
  img.style.maxWidth = '90%';
  img.style.width = 'auto';
  img.style.margin = '40px auto';
  img.style.cursor = 'zoom-in';
  ov.style.cursor = 'zoom-out';
  // 滚动到顶部
  ov.scrollTop = 0;
}
// ===================== 最近浏览功能 =====================
function recordRecentlyViewed(schoolName){
  if(!schoolName) return;
  var recent = [];
  try { recent = JSON.parse(localStorage.getItem('recentlyViewed') || '[]'); } catch(e){}
  if(!Array.isArray(recent)) recent = [];
  recent = recent.filter(function(n){ return n !== schoolName; });
  recent.unshift(schoolName);
  if(recent.length > 5) recent = recent.slice(0, 5);
  localStorage.setItem('recentlyViewed', JSON.stringify(recent));
  renderRecentViewBar();
}
function renderRecentViewBar(){
  var bar = document.getElementById('recentViewBar');
  if(!bar) return;
  var recent = [];
  try { recent = JSON.parse(localStorage.getItem('recentlyViewed') || '[]'); } catch(e){}
  if(!Array.isArray(recent)) recent = [];
  if(recent.length === 0){ bar.style.display = 'none'; updateResponsiveChromeVars(); return; }
  bar.style.display = 'flex';
  var tags = document.getElementById('recentViewTags');
  if(!tags) return;
  tags.innerHTML = recent.map(function(s){
    return '<span class="recent-tag" onclick="goDetail(\'' + s.replace(/'/g, "\\'") + '\')">' + s + '</span>';
  }).join('');
  updateRecentViewBarPosition();
}
function updateRecentViewBarPosition(){
  var bar = document.getElementById('recentViewBar');
  var compareBar = document.getElementById('compareBar');
  if(!bar) return;
  if(compareBar && compareBar.offsetHeight > 0 && window.getComputedStyle(compareBar).display !== 'none'){
    bar.style.bottom = (compareBar.offsetHeight + 2) + 'px';
  } else {
    bar.style.bottom = '0px';
  }
  updateResponsiveChromeVars();
}
function updateResponsiveChromeVars(){
  var root = document.documentElement;
  var body = document.body;
  var compareBar = document.getElementById('compareBar');
  var recentBar = document.getElementById('recentViewBar');
  var space = 0;
  if(compareBar && window.getComputedStyle(compareBar).display !== 'none'){
    space += compareBar.offsetHeight || 0;
  }
  if(recentBar && window.getComputedStyle(recentBar).display !== 'none'){
    space += recentBar.offsetHeight || 0;
  }
  root.style.setProperty('--bottom-floating-space', space ? (space + 18) + 'px' : '0px');

  if(window.visualViewport && body){
    var keyboardOpen = window.visualViewport.height < window.innerHeight - 120;
    body.classList.toggle('keyboard-open', keyboardOpen);
  }
}

function setDetailTitles(recs){
  const single = recs && recs.length === 1;
  const dir = single ? (recs[0].majorName||'') : '';
  const col = single ? (recs[0].college||'') : '';
  const t1 = document.getElementById('hDetailMajor');
  const t2 = document.getElementById('hDetailPie');
  const t3 = document.getElementById('hDetailCollege');
  const t4 = document.getElementById('hDetailCourse');
  if(t1) t1.textContent = single ? ('该方向复试/录取/专业课平均：' + dir) : '各专业复试/录取平均分对比';
  if(t2) t2.textContent = single ? ('该方向招生人数：' + dir) : '各专业招生人数占比';
  if(t3) t3.textContent = single ? ('该方向招生情况：' + col) : '各学院招生情况';
  if(t4) t4.textContent = single ? ('该方向专业课分数分布：' + dir) : '专业课分数分布';
}
function renderDetail(schoolName){
  try {
  // 销毁旧图表
  ['detailMajor','detailPie','detailCollege','detailCourse'].forEach(k=>{
    if(charts[k]){ charts[k].dispose(); charts[k]=null; }
  });

  // 保存当前学校数据到全局变量供筛选使用
  window.currentSchoolName = schoolName;
  window.currentSchoolRecs = records.filter(r=>r.school===schoolName);
  if(window.pendingDetailFilter){
    window.currentSchoolRecs = window.currentSchoolRecs.filter(window.pendingDetailFilter);
    window.pendingDetailFilter = null;
  }

  if(!window.currentSchoolRecs.length){
    // 无数据时渲染简化页面
    const province = '';
    const tags = getSchoolTags(schoolName, '', province, true);
    const tagsHtml = `<div class="flex flex-wrap gap-2 items-center">${tags.map(t => {
      const s = getTagStyle(t.name, t.type);
      const baseStyle = `background:${s.bg};color:${s.color};border:1px solid ${s.border};white-space:nowrap;cursor:pointer;font-size:14px;padding:6px 14px;border-radius:16px;`;
      if (t.type === 'tier') return `<span class="tag clickable-tag" style="${baseStyle}" onclick="filterByTier('${t.name.replace(/'/g, "\\'")}')" title="点击筛选所有${t.name}院校">${t.name}</span>`;
      if (t.type === 'shengyuan') return `<span class="tag clickable-tag" style="${baseStyle}" onclick="window.open(withSchoolDetailSource('控制院校生源地图.html?school=${encodeURIComponent(schoolName)}','${schoolName.replace(/'/g,"\\'")}'),'_self')" title="点击查看生源分布">${t.name}</span>`;
      if (t.type === 'eval') return `<span class="tag clickable-tag" style="${baseStyle}" onclick="openSchoolModal('${schoolName.replace(/'/g, "\\'")}','0810')" title="点击查看${t.name}研究方向">${t.name}</span>`;
      return `<span class="tag clickable-tag" style="${baseStyle}" onclick="filterByTag('${t.name.replace(/'/g, "\\'")}')" title="点击筛选所有${t.name}院校">${t.name}</span>`;
    }).join('')}</div>`;
    
    document.getElementById('detailHeader').innerHTML = `
      <div class="card p-6">
        <div class="flex flex-wrap items-center gap-3 mb-3">
          <img src="专业课选择/images/校徽/${schoolName}.jpg" 
               style="width:60px;height:60px;border-radius:8px;object-fit:contain;box-shadow:0 2px 4px rgba(0,0,0,0.1);background:#fff;"
               onerror="this.style.display='none'" 
               alt="${schoolName}校徽">
          <h2 class="text-2xl font-bold text-gray-800">${schoolName}</h2>
          ${tagsHtml}
          <div style="margin-left:auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            ${(EMPLOYMENT_SCHOOLS.has(schoolName) ? `<a href="${withSchoolDetailSource(EMPLOYMENT_MAP[schoolName] || '就业相关/院校就业去向/schools/' + schoolName + '.html', schoolName)}" class="tag clickable-tag" style="background:#fff3e0;color:#ef6c00;border:1px solid #ffcc80;font-size:14px;padding:6px 14px;border-radius:16px;text-decoration:none;" title="查看${schoolName}就业去向">💼 就业去向</a>` : '')}
            <a href="专业课选择/考研专业课院校查询.html?school=${encodeURIComponent(schoolName)}&fromSchoolDetail=1" class="tag clickable-tag" style="background:#dcfce7;color:#15803d;border:1px solid #86efac;font-size:14px;padding:6px 14px;border-radius:16px;text-decoration:none;" title="查看${schoolName}考察专业课">📚 考察专业课</a>
            ${VALID_QRS.has(schoolName) ? `<span class="tag clickable-tag" style="background:#e0f2fe;color:#0277bd;border:1px solid #81d4fa;font-size:14px;padding:6px 14px;border-radius:16px;cursor:pointer;" onclick="openQrLightbox('${getQrPath(schoolName)}')" title="点击查看${schoolName}QQ群二维码">📱 院校QQ群</span>` : ''}
            ${GAIKAO_SCHOOLS.has(schoolName) ? `<a href="${withSchoolDetailSource('改考院校.html?school='+encodeURIComponent(schoolName), schoolName)}" class="tag clickable-tag" style="background:#fff1f0;color:#cf1322;border:1px solid #ffa39e;font-size:14px;padding:6px 14px;border-radius:16px;text-decoration:none;" title="查看${schoolName}改考信息">🔔 27考研有改考</a>` : ''}
            <span class="fav-star ${isFavorite(schoolName)?'fav-active':'fav-inactive'}" 
                  onclick="handleFavClick('${schoolName.replace(/'/g, "\\'")}')" 
                  title="${isFavorite(schoolName)?'取消收藏':'加入目标院校'}" 
                  style="font-size:44px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;">★</span>
          </div>
        </div>
        <div style="padding:40px;text-align:center;background:#f8f9fa;border-radius:12px;color:#666;">
          <div style="font-size:48px;margin-bottom:16px;">📭</div>
          <div style="font-size:16px;font-weight:600;color:#888;">暂无该院校详细招生数据</div>
          <div style="font-size:13px;color:#aaa;margin-top:8px;">该院校暂未收录到 27 择校数据总览中</div>
          <div style="margin-top:20px;">
            <a href="school_detail/${schoolName}.html" class="tag clickable-tag" style="background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;font-size:14px;padding:8px 20px;text-decoration:none;" title="查看${schoolName}详细院校介绍">🏫 查看院校详情页</a>
          </div>
        </div>
      </div>
    `;
    
    const detailCharts = document.getElementById('detailCharts');
    if(detailCharts) detailCharts.style.display = 'none';
    const detailTable = document.getElementById('detailTable');
    if(detailTable) detailTable.innerHTML = '';
    const similarSchools = document.getElementById('similarSchools');
    if(similarSchools) similarSchools.style.display = 'none';
    const detailAds = document.getElementById('detailAds');
    if(detailAds) { detailAds.innerHTML = ''; detailAds.style.display = 'none'; }
    
    showPage('detailPage');
    return;
  }
  
  // 恢复图表容器可见性（防止之前被隐藏）
  const detailCharts = document.getElementById('detailCharts');
  if(detailCharts) detailCharts.style.display = '';
  
  const schoolRecs = window.currentSchoolRecs;
  setDetailTitles(schoolRecs);
  const province = schoolRecs[0].province;
  const totalEnter = schoolRecs.reduce((s,r)=>s+(r.enterNum||0),0);
  const totalAdmit = schoolRecs.reduce((s,r)=>s+(r.admitNum||0),0);
  const naCnt = schoolRecs.filter(r=>r.admitAvg!=null).length;
  const npCnt = schoolRecs.filter(r=>r.courseAvg!=null).length;
  // 加权均分：分母只统计有均分记录的人数，避免无均分专业的人数虚增分母
  const admitW = schoolRecs.filter(r=>r.admitAvg!=null&&(r.admitNum||0)).reduce((s,r)=>s+(r.admitNum||0),0);
  const courseW = schoolRecs.filter(r=>r.courseAvg!=null&&(r.admitNum||0)).reduce((s,r)=>s+(r.admitNum||0),0);
  const avgAdmit = admitW? schoolRecs.filter(r=>r.admitAvg!=null).reduce((s,r)=>s+r.admitAvg*(r.admitNum||0),0)/admitW : (naCnt? schoolRecs.reduce((s,r)=>s+(r.admitAvg||0),0)/naCnt : null);
  const avgCourse = courseW? schoolRecs.filter(r=>r.courseAvg!=null).reduce((s,r)=>s+r.courseAvg*(r.admitNum||0),0)/courseW : (npCnt? schoolRecs.reduce((s,r)=>s+(r.courseAvg||0),0)/npCnt : null);
  const colleges = [...new Set(schoolRecs.map(r=>r.college))];

  const tags = getSchoolTags(schoolName, schoolRecs[0].tier, province, true);
  
  function renderTagGroup(tagList) {
    // 详情页标签仅作注释展示（985/地区/控制评级等），不提供跳转/筛选
    return tagList.map(t => {
      const s = getTagStyle(t.name, t.type);
      const baseStyle = `background:${s.bg};color:${s.color};border:1px solid ${s.border};white-space:nowrap;font-size:14px;padding:6px 14px;border-radius:16px;`;
      const tipMap = {
        tier: `${t.name}工程院校`,
        shengyuan: `属于${schoolName}的院校生源标签`,
        region: `${t.name}地区`,
        province: `所在省份：${t.name}`,
        eval: `${schoolName}${t.name}`,
        group: t.name
      };
      const tip = tipMap[t.type] || t.name;
      return `<span class="tag" data-type="${t.type}" style="${baseStyle}" title="${tip}">${t.name}</span>`;
    }).join('');
  }
  
  const tagsHtml = `<div class="flex flex-wrap gap-2 items-center">${renderTagGroup(tags)}</div>`;

  // 计算复试最低分和录取最低分
  const minAdmit = schoolRecs.reduce((min, r) => {
    const val = r.admitMin || r.minScore || r.minAdmit;
    return val != null ? (min == null ? val : Math.min(min, val)) : min;
  }, null);
  const minEnter = schoolRecs.reduce((min, r) => {
    const val = r.enterMin || r.minScore || r.minEnter;
    return val != null ? (min == null ? val : Math.min(min, val)) : min;
  }, null);

  const qrId = 'qr_' + schoolName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
  const posterId = 'poster_' + schoolName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
  document.getElementById('detailHeader').innerHTML = `
    <div class="card p-6">
      <div class="flex flex-wrap items-center gap-3 mb-3">
        <img src="专业课选择/images/校徽/${schoolName}.jpg" 
             style="width:60px;height:60px;border-radius:8px;object-fit:contain;box-shadow:0 2px 4px rgba(0,0,0,0.1);background:#fff;"
             onerror="this.style.display='none'" 
             alt="${schoolName}校徽">
        <h2 class="text-2xl font-bold text-gray-800">${schoolName}</h2>
        ${tagsHtml}
        <div style="margin-left:auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          ${(EMPLOYMENT_SCHOOLS.has(schoolName) ? `<a href="${withSchoolDetailSource(EMPLOYMENT_MAP[schoolName] || '就业相关/院校就业去向/schools/' + schoolName + '.html', schoolName)}" class="tag clickable-tag" style="background:#fff3e0;color:#ef6c00;border:1px solid #ffcc80;font-size:14px;padding:6px 14px;border-radius:16px;text-decoration:none;" title="查看${schoolName}就业去向">💼 就业去向</a>` : '')}
          <a href="专业课选择/考研专业课院校查询.html?school=${encodeURIComponent(schoolName)}&fromSchoolDetail=1" class="tag clickable-tag" style="background:#dcfce7;color:#15803d;border:1px solid #86efac;font-size:14px;padding:6px 14px;border-radius:16px;text-decoration:none;" title="查看${schoolName}考察专业课">📚 考察专业课</a>
          ${VALID_QRS.has(schoolName) ? `<span class="tag clickable-tag" style="background:#e0f2fe;color:#0277bd;border:1px solid #81d4fa;font-size:14px;padding:6px 14px;border-radius:16px;cursor:pointer;" onclick="openQrLightbox('${getQrPath(schoolName)}')" title="点击查看${schoolName}QQ群二维码">📱 院校QQ群</span>` : ``}
          ${GAIKAO_SCHOOLS.has(schoolName) ? `<a href="${withSchoolDetailSource('改考院校.html?school='+encodeURIComponent(schoolName), schoolName)}" class="tag clickable-tag" style="background:#fff1f0;color:#cf1322;border:1px solid #ffa39e;font-size:14px;padding:6px 14px;border-radius:16px;text-decoration:none;" title="查看${schoolName}改考信息">🔔 27考研有改考</a>` : ``}
          <span class="fav-star ${isFavorite(schoolName)?'fav-active':'fav-inactive'}" 
                onclick="handleFavClick('${schoolName.replace(/'/g, "\\'")}')" 
                title="${isFavorite(schoolName)?'取消收藏':'加入目标院校'}" 
                style="font-size:44px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;">★</span>
        </div>
      </div>
      <div class="overview-stats" style="display:flex;flex-wrap:wrap;gap:16px;margin:12px 0;padding:16px;background:#f8f9fa;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <div style="flex:0 0 100px;min-width:0;text-align:center;">
          <div style="font-size:12px;color:#888;margin-bottom:4px;">学院数</div>
          <div style="font-size:22px;font-weight:700;color:#4A5570;">${colleges.length}</div>
        </div>
        <div style="flex:0 0 100px;min-width:0;text-align:center;">
          <div style="font-size:12px;color:#888;margin-bottom:4px;">专业方向</div>
          <div style="font-size:22px;font-weight:700;color:#4A5570;">${schoolRecs.length}</div>
        </div>
        <div style="flex:0 0 100px;min-width:0;text-align:center;">
          <div style="font-size:12px;color:#888;margin-bottom:4px;">进复试人数</div>
          <div style="font-size:22px;font-weight:700;color:#4A5570;">${totalEnter || '-'}</div>
        </div>
        <div style="flex:0 0 100px;min-width:0;text-align:center;">
          <div style="font-size:12px;color:#888;margin-bottom:4px;">拟录取人数</div>
          <div style="font-size:22px;font-weight:700;color:#4A5570;">${totalAdmit || '-'}</div>
        </div>
        <div style="flex:0 0 100px;min-width:0;text-align:center;">
          <div style="font-size:12px;color:#888;margin-bottom:4px;">平均录取分</div>
          <div class="${scoreClass(avgAdmit)}" style="font-size:22px;font-weight:700;">${fmt(avgAdmit)}</div>
        </div>
        <div style="flex:0 0 100px;min-width:0;text-align:center;">
          <div style="font-size:12px;color:#888;margin-bottom:4px;">平均专业课</div>
          <div class="${courseClass(avgCourse)}" style="font-size:22px;font-weight:700;">${fmt(avgCourse)}</div>
        </div>
        <div style="flex:0 0 100px;min-width:0;text-align:center;">
          <div style="font-size:12px;color:#888;margin-bottom:4px;">复试最低分</div>
          <div class="${scoreClass(minEnter)}" style="font-size:22px;font-weight:700;">${minEnter != null ? minEnter : '-'}</div>
        </div>
        <div style="flex:0 0 100px;min-width:0;text-align:center;">
          <div style="font-size:12px;color:#888;margin-bottom:4px;">录取最低分</div>
          <div class="${scoreClass(minAdmit)}" style="font-size:22px;font-weight:700;">${minAdmit != null ? minAdmit : '-'}</div>
        </div>
      </div>
    </div>
  `;

  // 广告框移到 detailAds 容器
  // 只在文件存在时才生成对应的HTML，彻底避免404请求
  var hasPoster = VALID_POSTERS.has(schoolName);
  var hasQR = VALID_QRS.has(schoolName);
  
  if(hasPoster || hasQR){
    var adHtml = '';
    if(hasPoster){
      adHtml += `
      <div style="text-align:center;padding:10px;">
        <img src="专业课选择/images/院校海报/compressed/${schoolName}.jpg"
             style="width:100%;max-width:200px;border-radius:8px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.15);display:block;margin:0 auto;"
             onclick="openPosterLightbox('专业课选择/images/院校海报/${schoolName}.jpg')">
        <div style="font-size:12px;color:#555;font-weight:600;margin-top:4px;">${schoolName}海报</div>
      </div>`;
    }
    document.getElementById('detailAds').innerHTML = adHtml;
    // 广告开关控制
    var detailAds = document.getElementById('detailAds');
    if(detailAds){
      detailAds.style.display = isQrAdEnabled() ? 'block' : 'none';
    }
  } else {
    // 海报不存在，隐藏容器
    var detailAds = document.getElementById('detailAds');
    if(detailAds) detailAds.style.display = 'none';
  }
  
  // 院校QQ群二维码单独组件
  var qqGroupCard = document.getElementById('qqGroupCard');
  if(qqGroupCard) qqGroupCard.style.display = isQrAdEnabled() ? 'block' : 'none';
  if(hasQR){
    document.getElementById('qqGroupContent').innerHTML = `
      <div style="text-align:center;cursor:pointer;" onclick="openQrLightbox('${getQrPath(schoolName)}')">
        <img src="${getQrPath(schoolName)}"
             style="width:100%;max-width:260px;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,0.15);display:block;margin:0 auto;"
             alt="${schoolName}QQ群">
        <div style="font-size:12px;color:#555;font-weight:600;margin-top:4px;">📱 院校QQ群</div>
        <div style="font-size:10px;color:#999;">扫码加入考研群</div>
      </div>`;
  } else {
    document.getElementById('qqGroupContent').innerHTML = `
      <div style="text-align:center;padding:28px 12px;color:#888;">
        <div style="font-size:40px;line-height:1;margin-bottom:8px;">🏗️</div>
        <div style="font-size:15px;font-weight:600;color:#555;">QQ群在建设中</div>
        <div style="font-size:11px;color:#aaa;margin-top:4px;">该院校QQ群二维码暂未收集到</div>
      </div>`;
  }

  // 初始化筛选器
  initDetailFilters(schoolRecs);

  // 学院数超过5个时，图表改为单列布局
  const chartGrid = document.getElementById('detailCharts');
  if(colleges.length > 5){
    chartGrid.className = 'grid grid-cols-1 gap-4 mb-6';
  } else {
    chartGrid.className = 'grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6';
  }

  // 各专业对比柱状图
  const majorGroups = {};
  schoolRecs.forEach(r=>{
    const k = r.majorCode+' '+r.majorName;
    if(!majorGroups[k]) majorGroups[k]={name:k, enterAvg:0, admitAvg:0, courseAvg:0, n:0, enter:0, admit:0, we:0, wa:0, wp:0, se:0, sa:0, sp:0, ne:0, na:0, np:0};
    majorGroups[k].enterAvg += (r.enterAvg||0) * (r.enterNum||0);
    majorGroups[k].admitAvg += (r.admitAvg||0) * (r.admitNum||0);
    majorGroups[k].courseAvg += (r.courseAvg||0) * (r.admitNum||0);
    majorGroups[k].n++;
    majorGroups[k].enter += r.enterNum||0;
    majorGroups[k].admit += r.admitNum||0;
    if(r.enterAvg != null) majorGroups[k].we += r.enterNum||0;
    if(r.admitAvg != null) majorGroups[k].wa += r.admitNum||0;
    if(r.courseAvg != null) majorGroups[k].wp += r.admitNum||0;
    majorGroups[k].se += r.enterAvg||0;
    majorGroups[k].sa += r.admitAvg||0;
    majorGroups[k].sp += r.courseAvg||0;
    if(r.enterAvg != null) majorGroups[k].ne++;
    if(r.admitAvg != null) majorGroups[k].na++;
    if(r.courseAvg != null) majorGroups[k].np++;
  });
  const majorArr = Object.values(majorGroups).map(g=>({
    name:g.name,
    shortName: g.name.substring(0, 18) + (g.name.length > 18 ? '...' : ''),
    enterAvg: g.we?g.enterAvg/g.we:(g.ne?g.se/g.ne:null),
    admitAvg: g.wa?g.admitAvg/g.wa:(g.na?g.sa/g.na:null),
    courseAvg: g.wp?g.courseAvg/g.wp:(g.np?g.sp/g.np:null),
    enter:g.enter, admit:g.admit
  })).sort((a,b)=>b.admit-a.admit);

  // 各专业招生人数占比：按具体方向(majorName)分组，人数=拟录取人数(admitNum)，无拟录取用进复试人数(enterNum)兜底
  const pieMap = {};
  schoolRecs.forEach(r=>{
    const pk = r.majorName || r.majorCode || '未知';
    if(!pieMap[pk]) pieMap[pk]={name:pk, n:0, admit:0, enter:0};
    pieMap[pk].n++;
    pieMap[pk].admit += (r.admitNum||0);
    pieMap[pk].enter += (r.enterNum||0);
  });
  const pieArr = Object.values(pieMap).map(x=>({
    name:x.name, n:x.n,
    num: x.admit>0 ? x.admit : (x.enter>0 ? x.enter : 0)
  })).sort((a,b)=>b.num-a.num);

  charts.detailMajor = echarts.init(document.getElementById('chartDetailMajor', null, {renderer: 'canvas'}));
  charts.detailMajor.setOption({
    tooltip:{trigger:'axis',axisPointer:{type:'shadow'}},
    legend:{bottom:0},
    grid:{left:'3%',right:'4%',bottom:'20%',top:'10%',containLabel:true},
    xAxis:{type:'category',data:majorArr.map(x=>x.shortName),axisLabel:{rotate:50,fontSize:10,interval:0}},
    yAxis:{type:'value',name:'分数'},
    series:[
      {name:'复试平均分',type:'bar',data:majorArr.map(x=>x.enterAvg!=null?+x.enterAvg.toFixed(1):null),itemStyle:{color:'#637c9a',borderRadius:[5,5,0,0]},barMaxWidth:20},
      {name:'录取平均分',type:'bar',data:majorArr.map(x=>x.admitAvg!=null?+x.admitAvg.toFixed(1):null),itemStyle:{color:'#a92122',borderRadius:[5,5,0,0]},barMaxWidth:20},
      {name:'专业课平均',type:'bar',data:majorArr.map(x=>x.courseAvg!=null?+x.courseAvg.toFixed(1):null),itemStyle:{color:'#c98a3d',borderRadius:[5,5,0,0]},barMaxWidth:20}
    ]
  });

  // 各专业招生人数占比(哈工大为柱状图, 其余学校保持饼图)——标注具体方向名+人数
  const pieShort = function(n){
    let s = cleanDirName(n);
    if(!s) s = String(n||'');
    return s.length>14 ? s.substring(0,14)+'…' : s;
  };
  charts.detailPie = echarts.init(document.getElementById('chartDetailPie', null, {renderer: 'canvas'}));
  if(schoolName === '哈尔滨工业大学'){
    const pieTotal = pieArr.reduce((s,x)=>s+(x.num||0),0);
    charts.detailPie.setOption({
      tooltip:{trigger:'axis',axisPointer:{type:'shadow'},
        formatter:function(ps){
          return ps.map(p=>{
            const nm = pieShort(p.name);
            const pct = pieTotal ? (p.value/pieTotal*100).toFixed(1) : '0';
            return nm + '<br/>招生人数 <b>' + p.value + '</b> 人 (' + pct + '%)';
          }).join('<br/>');
        }},
      grid:{left:'3%',right:'4%',bottom:'8%',top:'10%',containLabel:true},
      xAxis:{type:'category',data:pieArr.map(x=>pieShort(x.name)),axisLabel:{rotate:55,fontSize:9,interval:0}},
      yAxis:{type:'value',name:'人数'},
      series:[{
        name:'招生人数',type:'bar',
        data:pieArr.map(x=>x.num||0),
        itemStyle:{color:'#a92122',borderRadius:[5,5,0,0]},barMaxWidth:26,
        label:{show:true,position:'top',fontSize:9,color:'#17191d',formatter:function(p){return p.value ? p.value : '';}}
      }]
    });
  } else {
    charts.detailPie.setOption({
      tooltip:{trigger:'item',formatter:function(p){
        return p.name + '<br/>招生人数 <b>' + (p.value||0) + '</b> 人 (' + p.percent + '%)';
      }},
      legend:{type:'scroll',bottom:0,textStyle:{fontSize:11},formatter:function(name){return name.length>16?name.substring(0,16)+'…':name;}},
      series:[{
        type:'pie',radius:['40%','70%'],
        itemStyle:{borderRadius:6,borderColor:'#fff',borderWidth:2},
        label:{show:true,formatter:function(p){return pieShort(p.name)+'\n'+(p.value?p.value+'人':'人数暂无');},fontSize:10},
        data:pieArr.map(x=>({name:x.name,value:x.num||0}))
      }]
    });
  }

  // 各学院招生情况：显示该学院所有方向的进复试人数 + 拟录取人数（按学院区分）
  const collegeGroups = {};
  schoolRecs.forEach(r=>{
    const c = r.college || '未知';
    if(!collegeGroups[c]) collegeGroups[c]={name:c, n:0, enter:0, admit:0};
    collegeGroups[c].n++;
    collegeGroups[c].enter += (r.enterNum||0);
    collegeGroups[c].admit += (r.admitNum||0);
  });
  const collegeArr = Object.values(collegeGroups).sort((a,b)=>b.admit-a.admit);

  charts.detailCollege = echarts.init(document.getElementById('chartDetailCollege', null, {renderer: 'canvas'}));
  charts.detailCollege.setOption({
    tooltip:{trigger:'axis',axisPointer:{type:'shadow'},formatter:function(params){
      return params[0].axisValue + '<br/>' + params.map(p=>p.marker + p.seriesName + ' <b>' + (p.value||0) + '</b> 人').join('<br/>');
    }},
    legend:{bottom:0},
    grid:{left:'3%',right:'4%',bottom:'8%',top:'3%',containLabel:true},
    xAxis:{type:'value',name:'人数'},
    yAxis:{type:'category',data:collegeArr.map(x=>x.name.length>22?x.name.substring(0,22)+'…':x.name).reverse(),axisLabel:{fontSize:10}},
    series:[
      {name:'进复试人数',type:'bar',data:collegeArr.map(x=>x.enter).reverse(),itemStyle:{color:'#637c9a',borderRadius:[5,5,0,0]},barMaxWidth:18},
      {name:'拟录取人数',type:'bar',data:collegeArr.map(x=>x.admit).reverse(),itemStyle:{color:'#a92122',borderRadius:[5,5,0,0]},barMaxWidth:18}
    ]
  });

  // 专业课分数分布（各方向）——x轴注明具体方向名（同名方向追加学院短名区分）
  const courseDirLabel = schoolRecs.map(r=>pieShort(r.majorName) || r.majorName || '未知');
  const dirCnt = {};
  courseDirLabel.forEach(x=>dirCnt[x]=(dirCnt[x]||0)+1);
  const courseXData = schoolRecs.map((r,i)=>{
    let d = courseDirLabel[i];
    if(dirCnt[d] > 1 && r.college){
      d = d + '(' + String(r.college).replace(/^\d{3}\s*/,'').substring(0,6) + ')';
    }
    return d.length>20 ? d.substring(0,20)+'…' : d;
  });
  charts.detailCourse = echarts.init(document.getElementById('chartDetailCourse', null, {renderer: 'canvas'}));
  charts.detailCourse.setOption({
    tooltip:{trigger:'axis',formatter:function(ps){
      const idx = ps[0].dataIndex;
      const r = schoolRecs[idx];
      const head = (r.majorName||'') + (r.college ? '（'+r.college+'）' : '');
      return head + '<br/>' + ps.map(p=>p.marker + p.seriesName + ' <b>' + (p.value==null?'-':p.value) + '</b>').join('<br/>');
    }},
    legend:{bottom:0},
    grid:{left:'3%',right:'4%',bottom:'22%',top:'10%',containLabel:true},
    xAxis:{type:'category',data:courseXData,axisLabel:{rotate:55,fontSize:9,interval:0}},
    yAxis:{type:'value',name:'分数'},
    series:[
      {name:'专业课最高',type:'bar',data:schoolRecs.map(r=>r.courseMax),itemStyle:{color:'#a92122',borderRadius:[5,5,0,0]},barMaxWidth:14},
      {name:'专业课平均',type:'bar',data:schoolRecs.map(r=>r.courseAvg),itemStyle:{color:'#c98a3d',borderRadius:[5,5,0,0]},barMaxWidth:14},
      {name:'专业课最低',type:'bar',data:schoolRecs.map(r=>r.courseMin),itemStyle:{color:'#5d8d96',borderRadius:[5,5,0,0]},barMaxWidth:14}
    ]
  });

  // 初始渲染表格（无筛选）
  renderDetailTable(schoolRecs);
  
  // 渲染各方向分数分布图
  renderDetailDistributions(schoolName);

  // 渲染相似院校推荐
  renderSimilarSchools(schoolName, schoolRecs);

  } catch(err) {
    console.error('renderDetail error:', err);
    alert('详情页渲染出错: ' + (err && err.message ? err.message : String(err)));
  }
}

// 生成分数阶梯选项
function generateScoreSteps(min, max, step){
  const options = [];
  const start = Math.floor(min/step)*step;
  const end = Math.ceil(max/step)*step;
  for(let i=start; i<end; i+=step){
    options.push(`${i}-${i+step}`);
  }
  return options;
}

// 初始化二级页筛选器
function initDetailFilters(schoolRecs){
  const colleges = [...new Set(schoolRecs.map(r=>r.college))].sort();
  const majorCodes = [...new Set(schoolRecs.map(r=>r.majorCode))].sort();
  const majorNames = [...new Set(schoolRecs.map(r=>r.majorName))].sort();
  const maths = [...new Set(schoolRecs.map(r=>r.math).filter(Boolean))].sort();
  const englishes = [...new Set(schoolRecs.map(r=>r.english).filter(Boolean))].sort();
  const course2s = [...new Set(schoolRecs.map(r=>r.course2).filter(Boolean))].sort();

  // 分数范围
  const enterAvgs = schoolRecs.map(r=>r.enterAvg).filter(v=>v!=null&&!isNaN(v));
  const admitAvgs = schoolRecs.map(r=>r.admitAvg).filter(v=>v!=null&&!isNaN(v));
  const courseAvgs = schoolRecs.map(r=>r.courseAvg).filter(v=>v!=null&&!isNaN(v));

  const enterSteps = generateScoreSteps(Math.min(...enterAvgs), Math.max(...enterAvgs), 10);
  const admitSteps = generateScoreSteps(Math.min(...admitAvgs), Math.max(...admitAvgs), 10);
  const courseSteps = generateScoreSteps(Math.min(...courseAvgs), Math.max(...courseAvgs), 10);

  function fill(selId, values){
    const sel = document.getElementById(selId);
    if(!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">全部</option>';
    values.forEach(v=> sel.add(new Option(v,v)));
    sel.value = cur;
  }

  fill('dFilterCollege', colleges);
  fill('mFilterCollege', colleges);
  fill('dFilterMajorCode', majorCodes);
  fill('dFilterMajorName', majorNames);
  fill('mFilterMajorName', majorNames);
  updateMobileMajorOptions();
  var mCollege = document.getElementById('mFilterCollege');
  var mMajor = document.getElementById('mFilterMajorName');
  if(mCollege && !mCollege.dataset.bound){
    mCollege.dataset.bound = '1';
    mCollege.addEventListener('change', function(){
      updateMobileMajorOptions();
      applyDetailFilter();
    });
  }
  if(mMajor && !mMajor.dataset.bound){
    mMajor.dataset.bound = '1';
    mMajor.addEventListener('change', applyDetailFilter);
  }
  fill('dFilterEnterAvg', enterSteps);
  fill('dFilterAdmitAvg', admitSteps);
  fill('dFilterCourseAvg', courseSteps);
  fill('dFilterMath', maths);
  fill('dFilterEnglish', englishes);
  fill('dFilterCourse2', course2s);

  // 清空数值输入
  ['dFilterEnterMin','dFilterAdmitMin','dFilterRatioMax','mFilterEnterMin','mFilterAdmitMin','mFilterRatioMax'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.value = '';
  });
}

// 手机端：选学院后，方向只保留该学院下的方向
function updateMobileMajorOptions(){
  var collegeSel = document.getElementById('mFilterCollege');
  var majorSel = document.getElementById('mFilterMajorName');
  if(!collegeSel || !majorSel) return;
  var recs = window.currentSchoolRecs || [];
  var college = collegeSel.value;
  var names = recs.filter(function(r){
    return !college || r.college === college;
  }).map(function(r){ return r.majorName; }).filter(Boolean);
  var uniq = [];
  names.forEach(function(n){ if(uniq.indexOf(n) < 0) uniq.push(n); });
  uniq.sort();
  majorSel.innerHTML = '<option value="">全部</option>';
  uniq.forEach(function(v){ majorSel.add(new Option(v, v)); });
}

// 应用二级页筛选
function applyDetailFilter(){
  if(!window.currentSchoolRecs) return;
  let result = [...window.currentSchoolRecs];

  const college = document.getElementById('dFilterCollege').value || document.getElementById('mFilterCollege').value;
  const majorCode = document.getElementById('dFilterMajorCode').value;
  const majorName = document.getElementById('dFilterMajorName').value || document.getElementById('mFilterMajorName').value;
  const enterMin = document.getElementById('dFilterEnterMin').value;
  const admitMin = document.getElementById('dFilterAdmitMin').value;
  const ratioMax = document.getElementById('dFilterRatioMax').value;
  const enterAvgRange = document.getElementById('dFilterEnterAvg').value;
  const admitAvgRange = document.getElementById('dFilterAdmitAvg').value;
  const courseAvgRange = document.getElementById('dFilterCourseAvg').value;
  const math = document.getElementById('dFilterMath').value;
  const english = document.getElementById('dFilterEnglish').value;
  const course2 = document.getElementById('dFilterCourse2').value;

  result = result.filter(r=>{
    if(college && r.college!==college) return false;
    if(majorCode && r.majorCode!==majorCode) return false;
    if(majorName && r.majorName!==majorName) return false;
    if(enterMin && (r.enterNum==null || r.enterNum < +enterMin)) return false;
    if(admitMin && (r.admitNum==null || r.admitNum < +admitMin)) return false;
    if(ratioMax && (r.ratio==null || r.ratio > +ratioMax)) return false;
    if(math && r.math!==math) return false;
    if(english && r.english!==english) return false;
    if(course2 && r.course2!==course2) return false;
    if(enterAvgRange){
      const [min,max] = enterAvgRange.split('-').map(Number);
      if(r.enterAvg==null || r.enterAvg < min || r.enterAvg >= max) return false;
    }
    if(admitAvgRange){
      const [min,max] = admitAvgRange.split('-').map(Number);
      if(r.admitAvg==null || r.admitAvg < min || r.admitAvg >= max) return false;
    }
    if(courseAvgRange){
      const [min,max] = courseAvgRange.split('-').map(Number);
      if(r.courseAvg==null || r.courseAvg < min || r.courseAvg >= max) return false;
    }
    return true;
  });

  renderDetailTable(result);
  if(window.currentSchoolName) renderDetailDistributions(window.currentSchoolName, result);
}

// 重置二级页筛选
function resetDetailFilter(){
  if(!window.currentSchoolRecs) return;
  initDetailFilters(window.currentSchoolRecs);
  renderDetailTable(window.currentSchoolRecs);
  if(window.currentSchoolName) renderDetailDistributions(window.currentSchoolName, window.currentSchoolRecs);
}

// 渲染二级页表格
function renderDetailTable(data){
  const tbody = document.getElementById('detailTable');
  if(!data || data.length === 0){
    tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:40px 20px;"><svg viewBox="0 0 24 24" style="width:46px;height:46px;margin:0 auto 14px;display:block;color:#c9ccd1;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:square;stroke-linejoin:round;"><circle cx="11" cy="11" r="7"/><path d="m16.4 16.4 4.6 4.6"/><path d="M8.4 11h5.2"/></svg><div style="font-size:16px;font-weight:700;color:#17191d;margin-bottom:8px;">没有找到符合条件的记录</div><div style="font-size:13px;color:#777a80;margin-bottom:16px;">试试调整筛选条件</div><button onclick="resetDetailFilter()" style="padding:8px 20px;background:#a92122;color:#fff;border:none;border-radius:20px;cursor:pointer;font-size:13px;font-weight:700;">重置筛选</button></div></td></tr>';
    document.getElementById('detailCount').textContent = '(共0条)';
    renderDetailCards([]);
    return;
  }
  tbody.innerHTML = ''; 
  document.getElementById('detailCount').textContent = `(共${data.length}条)`;

  data.forEach(r=>{
    const tr = document.createElement('tr');
    tr.className = 'table-row border-b';
    tr.innerHTML = `
      <td class="py-3 pr-3 text-xs">${r.college}</td>
      <td class="py-3 pr-3 font-mono">${r.majorCode}</td>
      <td class="py-3 pr-3">${r.majorName}</td>
      <td class="py-3 pr-3">${r.enterNum||'-'}</td>
      <td class="py-3 pr-3">${r.admitNum||'-'}</td>
      <td class="py-3 pr-3 ${ratioClass(r.ratio)}">${r.ratio||'-'}</td>
      <td class="py-3 pr-3 ${scoreClass(r.enterAvg)}">${fmt(r.enterAvg)}</td>
      <td class="py-3 pr-3 ${scoreClass(r.admitAvg)}">${fmt(r.admitAvg)}</td>
      <td class="py-3 pr-3">${fmt(r.courseAvg)}</td>
      <td class="py-3 pr-3 text-xs">${r.math||'-'}</td>
      <td class="py-3 pr-3 text-xs">${r.english||'-'}</td>
      <td class="py-3 text-xs">${r.course2||'-'}</td>
    `;
    tbody.appendChild(tr);
  });
  renderDetailCards(data);
}

function renderDetailCards(data){
  const cards = document.getElementById('detailCards');
  if(!cards) return;
  if(!data || data.length === 0){
    cards.innerHTML = '<div style="text-align:center;color:#9ca3af;padding:30px 0;">没有找到符合条件的记录</div>';
    return;
  }
  cards.innerHTML = data.map(function(r){
    var cardTitle = r.majorName || '';
    if (r.majorCode && cardTitle.indexOf(r.majorCode) !== 0) cardTitle = r.majorCode + ' ' + cardTitle;

    // 复录比缺失时，用 进复试人数/拟录取人数 补全；进复试人数小于拟录取人数时不补
    var ratioVal = fillRatio(r.ratio, r.enterNum, r.admitNum);

    var fullRows = '';
    function addRow(label, val, cls){
      if(val == null || val === '') return;
      fullRows += '<div class="full-item"><span>' + label + '</span><b class="' + (cls || '') + '">' + val + '</b></div>';
    }
    addRow('学院', r.college);
    addRow('专业代码', r.majorCode);
    addRow('专业名称', r.majorName);
    addRow('进复试人数', r.enterNum);
    addRow('拟录取人数', r.admitNum);
    addRow('复录比', ratioVal, ratioClass(ratioVal));
    addRow('复试最高分', r.enterMax != null ? fmt(r.enterMax) : '', scoreClass(r.enterMax));
    addRow('复试最低分', r.enterMin != null ? fmt(r.enterMin) : '', scoreClass(r.enterMin));
    addRow('复试平均分', r.enterAvg != null ? fmt(r.enterAvg) : '', scoreClass(r.enterAvg));
    addRow('录取最高分', r.admitMax != null ? fmt(r.admitMax) : '', scoreClass(r.admitMax));
    addRow('录取最低分', r.admitMin != null ? fmt(r.admitMin) : '', scoreClass(r.admitMin));
    addRow('录取平均分', r.admitAvg != null ? fmt(r.admitAvg) : '', scoreClass(r.admitAvg));
    addRow('专业课最高分', r.courseMax != null ? fmt(r.courseMax) : '', courseClass(r.courseMax));
    addRow('专业课最低分', r.courseMin != null ? fmt(r.courseMin) : '', courseClass(r.courseMin));
    addRow('专业课平均分', r.courseAvg != null ? fmt(r.courseAvg) : '', courseClass(r.courseAvg));
    addRow('数学', r.math);
    addRow('外语', r.english);
    addRow('业务课二', r.course2);

    return '<div class="detail-card" onclick="toggleDetailCard(this)">' +
      '<div class="detail-card__title">' + cardTitle + '</div>' +
      '<div class="detail-card__college">' + (r.college || '') + '</div>' +
      '<div class="detail-card__stats">' +
        '<span>进复试 <b>' + (r.enterNum || '-') + '</b></span>' +
        '<span>拟录取 <b>' + (r.admitNum || '-') + '</b></span>' +
        '<span>复录比 <b class="' + ratioClass(ratioVal) + '">' + (ratioVal || '-') + '</b></span>' +
      '</div>' +
      '<div class="detail-card__scores">' +
        '<span>复试均分 <b class="' + scoreClass(r.enterAvg) + '">' + fmt(r.enterAvg) + '</b></span>' +
        '<span>录取均分 <b class="' + scoreClass(r.admitAvg) + '">' + fmt(r.admitAvg) + '</b></span>' +
        '<span>专业课均分 <b class="' + courseClass(r.courseAvg) + '">' + fmt(r.courseAvg) + '</b></span>' +
      '</div>' +
      '<div class="detail-card__subjects">数学 ' + (r.math || '-') + ' · 外语 ' + (r.english || '-') + ' · 业务课二 ' + (r.course2 || '-') + '</div>' +
      '<div class="detail-card__full" style="display:none;">' + fullRows + '</div>' +
      '<div class="detail-card__hint">👆 点击卡片查看完整数据</div>' +
    '</div>';
  }).join('');
}

window.toggleDetailCard = function(el){
  var full = el.querySelector('.detail-card__full');
  var hint = el.querySelector('.detail-card__hint');
  if(!full) return;
  if(full.style.display === 'block'){
    full.style.display = 'none';
    if(hint) hint.textContent = '👆 点击卡片查看完整数据';
  } else {
    full.style.display = 'block';
    if(hint) hint.textContent = '🔼 点击收起完整数据';
  }
};

// ===================== 相似院校推荐 =====================
function renderSimilarSchools(schoolName, schoolRecs){
  var container = document.getElementById('similarSchools');
  var list = document.getElementById('similarSchoolsList');
  if(!container || !list) return;
  
  // 获取当前学校的 tier 和省份
  var currentStats = filteredSchoolStats.find(function(s){ return s['学校'] === schoolName; });
  if(!currentStats) { container.style.display = 'none'; return; }
  
  var tier = currentStats.tier;
  var province = currentStats['省份/自治区'];
  var currentTags = getSchoolTags(schoolName, tier);
  var currentEvals = currentTags.filter(function(t){ return t.type === 'eval'; }).map(function(t){ return t.name; });
  
  // 找相似院校：同层级优先，同省份次之
  var similar = filteredSchoolStats.filter(function(s){
    return s['学校'] !== schoolName;
  }).map(function(s){
    var score = 0;
    if(s.tier === tier) score += 10;
    if(s['省份/自治区'] === province) score += 5;
    var tags = getSchoolTags(s['学校'], s.tier);
    var evals = tags.filter(function(t){ return t.type === 'eval'; }).map(function(t){ return t.name; });
    evals.forEach(function(e){ if(currentEvals.indexOf(e) >= 0) score += 3; });
    return {school: s['学校'], score: score, tier: s.tier};
  }).sort(function(a,b){ return b.score - a.score; }).slice(0, 8);
  
  if(similar.length === 0) { container.style.display = 'none'; return; }
  container.style.display = 'block';
  
  list.innerHTML = similar.map(function(s){
    var tierClass = s.tier === '985' ? 'tag-red' : s.tier === '211' ? 'tag-orange' : 'tag-gray';
    return '<a href="index.html?school=' + encodeURIComponent(s.school) + '" class="tag ' + tierClass + '" style="text-decoration:none;padding:6px 12px;font-size:13px;cursor:pointer;">' + s.school + '</a>';
  }).join('');
}

function renderDetailDistributions(schoolName, recs){
  const container = document.getElementById('detailDistributions');
  const content = document.getElementById('detailDistributionsContent');
  if(!container || !content) return;
  let dists = (typeof SCHOOL_DIST !== 'undefined' && SCHOOL_DIST[schoolName]) || null;
  if(recs === undefined) recs = window.currentSchoolRecs;
  if(recs && recs.length === 1){
    const single = findDist(schoolName, recs[0]);
    dists = single ? [single] : [];
  } else if(recs && recs.length > 1){
    // 筛选结果全部同属一个学院时，只显示该学院的方向分布卡片
    const colleges = new Set(recs.map(r => r.college).filter(Boolean));
    if(colleges.size === 1){
      const colShort = [...colleges][0].replace(/^\(\d+\)\s*/,'').replace(/[：:；;、\s]/g,'').replace('哈尔滨工业大学','哈工大');
      if(colShort && dists){
        const byCollege = dists.filter(d => (d.title||'').indexOf(colShort) >= 0);
        if(byCollege.length > 0){
          dists = byCollege;
        } else {
          // 部分院校的标题不含学院名(如东北大学"四、26考研控制科学与工程（本部）...")
          // 学院过滤会全空 → 回退按该学院记录的方向名匹配，避免分布区消失
          const names = recs.map(r => r.majorName).filter(Boolean);
          if(names.length){
            dists = dists.filter(d => names.some(n => (d.title||'').indexOf(n) >= 0));
          }
        }
      }
    }
  }
  if(!dists || dists.length === 0){
    container.style.display = 'none';
    return;
  }
  container.style.display = '';
  content.innerHTML = '';
  dists.forEach(function(d, idx){
    const card = document.createElement('div');
    card.className = 'card p-4 mb-4';
    let html = '<div style="font-size:15px;font-weight:700;color:#a92122;margin-bottom:10px;">' + (d.title||('方向'+(idx+1))) + '</div>';
    html += '<div class="grid grid-cols-1 lg:grid-cols-3 gap-3">';
    const extTag = function(dd){
      const parts = [];
      if(dd && dd.avg!=null) parts.push('平均分 '+Number(dd.avg).toFixed(1));
      if(dd && dd.max!=null) parts.push('最高 '+dd.max);
      if(dd && dd.min!=null) parts.push('最低 '+dd.min);
      return parts.length ? ' <span style="font-weight:400;color:#888;font-size:12px;">（'+parts.join(' · ')+'）</span>' : '';
    };
    if(d.total){
      const totAvg = [d.total.enterAvg!=null ? '复试均分 '+Number(d.total.enterAvg).toFixed(1) : '', d.total.admitAvg!=null ? '录取均分 '+Number(d.total.admitAvg).toFixed(1) : ''].filter(Boolean).join('｜');
      html += '<div><div style="font-size:13px;font-weight:600;color:#a92122;margin-bottom:4px;">总分分布' +
              (totAvg ? ' <span style="font-weight:400;color:#888;font-size:12px;">（'+totAvg+'）</span>' : '') +
              '</div><div id="dist-total-'+idx+'" style="height:180px;"></div></div>';
    }
    html += '<div><div style="font-size:13px;font-weight:600;color:#a92122;margin-bottom:4px;">数学分数分布' + extTag(d.math) + '</div>' +
            (d.math ? '<div id="dist-math-'+idx+'" style="height:180px;"></div>' : '<div style="font-size:13px;color:#777a80;padding-top:60px;text-align:center;">暂无数据</div>') + '</div>';
    html += '<div><div style="font-size:13px;font-weight:600;color:#a92122;margin-bottom:4px;">专业课分数分布' + extTag(d.course) + '</div>' +
            (d.course ? '<div id="dist-course-'+idx+'" style="height:180px;"></div>' : '<div style="font-size:13px;color:#777a80;padding-top:60px;text-align:center;">暂无数据</div>') + '</div>';
    html += '</div>';
    card.innerHTML = html;
    content.appendChild(card);
    if(d.total && typeof echarts !== 'undefined'){
      var ch = echarts.init(document.getElementById('dist-total-'+idx));
      ch.setOption({
        tooltip:{trigger:'axis'},
        grid:{left:40,right:10,top:20,bottom:30},
        xAxis:{type:'category', data:d.total.labels},
        yAxis:{type:'value', minInterval:1},
        series:[
          {name:'复试人数', type:'bar', data:d.total.enter, itemStyle:{color:'#637c9a',borderRadius:[5,5,0,0]}},
          {name:'录取人数', type:'bar', data:d.total.admit, itemStyle:{color:'#a92122',borderRadius:[5,5,0,0]}}
        ]
      });
    }
    if(d.math && typeof echarts !== 'undefined'){
      var cm = echarts.init(document.getElementById('dist-math-'+idx));
      cm.setOption(histOption(d.math, '#637c9a'));
    }
    if(d.course && typeof echarts !== 'undefined'){
      var cc = echarts.init(document.getElementById('dist-course-'+idx));
      cc.setOption(histOption(d.course, '#c98a3d'));
    }
  });
}

function histOption(dist, color){
  if(dist.type === 'hist'){
    return {
      tooltip:{trigger:'axis'},
      grid:{left:40,right:10,top:20,bottom:30},
      xAxis:{type:'category', data:dist.labels},
      yAxis:{type:'value', minInterval:1},
      series:[{name:'人数', type:'bar', data:dist.counts, itemStyle:{color:color,borderRadius:[5,5,0,0]}}]
    };
  }
  return {
    tooltip:{trigger:'axis'},
    grid:{left:40,right:10,top:20,bottom:30},
    xAxis:{type:'category', data:dist.labels},
    yAxis:{type:'value'},
    series:[{name:'均分', type:'bar', data:dist.values, itemStyle:{color:color,borderRadius:[5,5,0,0]}}]
  };
}
// ===================== 初始化 =====================
window.addEventListener('DOMContentLoaded', ()=>{
  initStats();
  initFilters();
  updateHomeQqGroupAds(isQrAdEnabled());
  renderRecentViewBar();
  
  // 恢复保存的筛选状态
  const hasSaved = restoreHomeFilterState();
  if(hasSaved){
    // 有保存状态时，先应用顶部筛选，再应用学校列表筛选
    applyFilter();
    applySchoolFilter();
  } else {
    window.schoolCurrentPage = 1;
    renderHomeCharts();
    renderSchoolTable();
  }
  
  // URL参数解析：自动跳转到指定院校详情页
  // school= 直接同步 goDetail；uiView=school-detail 由 ui-history-state.js 深度链接恢复
  // 在 defer 阶段已渲染详情（早于本 DOMContentLoaded）。两条路径统一在此解除 head 遮蔽。
  const urlParams = new URLSearchParams(window.location.search);
  const schoolParam = urlParams.get('school');
  const isDetailEntry = schoolParam || urlParams.get('uiView') === 'school-detail';
  if (isDetailEntry) {
    if (schoolParam) {
      console.log('URL school param detected:', schoolParam);
      // 直接跳转详情页（同步执行：同一任务内先隐藏首页再渲染详情，
      // 避免"先转到首页再打开择校数据"的闪烁），即使数据中没有也会显示"暂无数据"页面
      goDetail(schoolParam);
    }
    // 必须等学校详情已经完成首帧布局后，才能解除 head 中的首页遮蔽。
    // 提前删除会让移动端 WebView 在脚本执行间隙绘制一次主页。
    const noHomeFlash = document.getElementById('noHomeFlashStyle');
    if (noHomeFlash) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.documentElement.classList.remove('school-detail-boot');
          noHomeFlash.remove();
        });
      });
    }
  }
});

// ===================== 动态控制工程信号场背景 =====================
// 去除旧紫色与通用科技粒子，改为：工程网格 + 闭环反馈回路 + 阶跃响应 + 稀疏信号流节点
(function(){
  const canvas = document.getElementById('techBg');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const RED = '#a92122';      // 控制红（信号）
  const NEUTRAL = '#637c9a';  // 蓝灰中性（网格/节点/回路）

  let loopPath = [], loopLen = 0, loopGeo = null;
  let signalT = 0, lastTime = 0;
  let nodes = [];
  let animId = null, running = true;

  function rand(a, b){ return a + Math.random() * (b - a); }

  function buildLoop(w, h){
    const m = Math.max(64, w * 0.07);
    const x0 = m, y0 = 122;
    const x1 = w - m, y1 = y0 + Math.min(104, h * 0.13);
    loopPath = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    loopLen = 2 * ((x1 - x0) + (y1 - y0));
    loopGeo = { x0: x0, y0: y0, x1: x1, y1: y1 };
  }

  function buildNodes(w, h){
    const count = w < 768 ? 5 : 9;
    nodes = [];
    for(let i = 0; i < count; i++){
      nodes.push({ x: rand(40, w - 40), y: rand(h * 0.34, h - 30), r: rand(1.4, 3), phase: rand(0, Math.PI * 2) });
    }
  }

  function resize(){
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildLoop(window.innerWidth, window.innerHeight);
    buildNodes(window.innerWidth, window.innerHeight);
  }

  function pointOnLoop(t){
    let d = (t % 1) * loopLen;
    for(let i = 0; i < loopPath.length; i++){
      const a = loopPath[i], b = loopPath[(i + 1) % loopPath.length];
      const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if(d <= seg || i === loopPath.length - 1){
        const k = seg === 0 ? 0 : d / seg;
        return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
      }
      d -= seg;
    }
    return loopPath[0];
  }

  function drawGrid(w, h){
    const step = 48;
    ctx.lineWidth = 1;
    ctx.strokeStyle = NEUTRAL;
    ctx.globalAlpha = 0.05;
    ctx.beginPath();
    for(let x = step; x < w; x += step){ ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for(let y = step; y < h; y += step){ ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawLoop(){
    const g = loopGeo;
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = NEUTRAL;
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.moveTo(loopPath[0][0], loopPath[0][1]);
    for(let i = 1; i < loopPath.length; i++) ctx.lineTo(loopPath[i][0], loopPath[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 1;

    const cx = g.x0, cy = (g.y0 + g.y1) / 2;
    ctx.strokeStyle = NEUTRAL;
    ctx.globalAlpha = 0.4;
    ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy); ctx.lineTo(cx + 4, cy);
    ctx.moveTo(cx, cy - 4); ctx.lineTo(cx, cy + 4);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const bw = 34, bh = 22;
    const bx = (g.x0 + g.x1) / 2 - bw / 2, by = g.y0 - bh / 2;
    ctx.globalAlpha = 0.3;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.globalAlpha = 1;

    const s = pointOnLoop(signalT);
    ctx.beginPath(); ctx.arc(s[0], s[1], 3.5, 0, Math.PI * 2);
    ctx.fillStyle = RED; ctx.globalAlpha = 0.9; ctx.fill();
    ctx.beginPath(); ctx.arc(s[0], s[1], 9, 0, Math.PI * 2);
    ctx.fillStyle = RED; ctx.globalAlpha = 0.14; ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawStepResponse(){
    const g = loopGeo;
    if(!g) return;
    const x0 = g.x0 + 6, y0 = g.y1 + 44;
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = NEUTRAL;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.moveTo(x0, y0 + 80); ctx.lineTo(x0 + 200, y0 + 80);
    ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + 80);
    ctx.stroke();
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x0, y0 + 55); ctx.lineTo(x0 + 30, y0 + 55); ctx.lineTo(x0 + 30, y0 + 22); ctx.lineTo(x0 + 200, y0 + 22);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x0 + 30, y0 + 55);
    ctx.bezierCurveTo(x0 + 45, y0 + 55, x0 + 48, y0 + 24, x0 + 75, y0 + 22);
    ctx.bezierCurveTo(x0 + 100, y0 + 20, x0 + 115, y0 + 26, x0 + 200, y0 + 22);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawNodes(timeSec){
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = NEUTRAL;
    ctx.globalAlpha = 0.1;
    ctx.beginPath();
    for(let i = 0; i < nodes.length; i++){
      for(let j = i + 1; j < nodes.length; j++){
        const a = nodes[i], b = nodes[j];
        if(Math.hypot(a.x - b.x, a.y - b.y) < 180){ ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
      }
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    nodes.forEach(n => {
      const glow = 0.5 + 0.5 * Math.sin(timeSec * 0.8 + n.phase);
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = NEUTRAL;
      ctx.globalAlpha = 0.12 + glow * 0.1;
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  function drawFrame(now){
    const w = window.innerWidth, h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);
    drawGrid(w, h);
    if(w >= 768){ drawLoop(); drawStepResponse(); }
    drawNodes(now / 1000);
  }

  function loop(now){
    if(!running) return;
    if(lastTime) signalT = (signalT + (now - lastTime) / 12000) % 1;
    lastTime = now;
    drawFrame(now);
    animId = requestAnimationFrame(loop);
  }

  function start(){
    if(prefersReducedMotion){ signalT = 0.18; drawFrame(0); return; }
    animId = requestAnimationFrame(loop);
  }

  document.addEventListener('visibilitychange', function(){
    if(document.hidden){
      running = false;
      if(animId){ cancelAnimationFrame(animId); animId = null; }
    } else if(!prefersReducedMotion){
      running = true; lastTime = 0;
      animId = requestAnimationFrame(loop);
    }
  });

  window.addEventListener('resize', resize);
  resize();
  start();
})();

window.addEventListener('resize', debounce(()=>{
  Object.values(charts).forEach(c=>c&&c.resize());
  updateResponsiveChromeVars();
}, 250));

if(window.visualViewport){
  window.visualViewport.addEventListener('resize', debounce(updateResponsiveChromeVars, 80));
  window.visualViewport.addEventListener('scroll', debounce(updateResponsiveChromeVars, 80));
}

(function(){
  const interactiveSelector = '[onclick]:not(a):not(button):not(input):not(select):not(textarea), .clickable-tag:not(a):not(button), .recent-tag:not(a):not(button), .fav-star:not(a):not(button), .puppy-thumb:not(a):not(button)';
  const enhance = function(root){
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll(interactiveSelector).forEach(function(el){
      if(el.dataset.keyboardEnhanced === 'true') return;
      if(!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
      if(!el.hasAttribute('role')) el.setAttribute('role', 'button');
      if(!el.getAttribute('aria-label')){
        const label = (el.getAttribute('title') || el.textContent || el.alt || '可点击操作').trim();
        el.setAttribute('aria-label', label);
      }
      el.addEventListener('keydown', function(e){
        if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          el.click();
        }
      });
      el.dataset.keyboardEnhanced = 'true';
    });
  };
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ enhance(document); updateResponsiveChromeVars(); });
  } else {
    enhance(document);
    updateResponsiveChromeVars();
  }
  const observer = new MutationObserver(function(mutations){
    mutations.forEach(function(m){
      m.addedNodes.forEach(function(node){
        if(node.nodeType === 1) enhance(node);
      });
    });
    updateResponsiveChromeVars();
  });
  observer.observe(document.documentElement, {childList:true, subtree:true});
})();

(function(){
  const isInteractive = function(el){
    if(!el) return false;
    const tag = el.tagName;
    if(['A','BUTTON','INPUT','SELECT','TEXTAREA','IMG','SVG','CANVAS','LABEL'].includes(tag)) return true;
    const cls = el.className || '';
    if(typeof cls === 'string' && /tag|clickable|btn|button|filter|select|nav-icon|back-btn|modal|chart|puppy/.test(cls)) return true;
    if(el.closest && (el.closest('a') || el.closest('button') || el.closest('label'))) return true;
    return false;
  };
  document.addEventListener('click', function(e){
    if(isInteractive(e.target)) return;
    const x = e.clientX, y = e.clientY;
    // 控制红信号脉冲
    const pulse = document.createElement('div');
    pulse.className = 'signal-pulse';
    pulse.style.left = (x - 6) + 'px';
    pulse.style.top = (y - 6) + 'px';
    document.body.appendChild(pulse);
    setTimeout(() => pulse.remove(), 700);
  });
})();

// ===================== 收藏功能 =====================
var FAVORITE_KEY = 'kaoyan_favorites_v1';
var FAVORITE_FILTER = false;
function getFavorites(){
  try { return JSON.parse(localStorage.getItem(FAVORITE_KEY) || '[]'); } catch(e) { return []; }
}
function saveFavorites(arr){
  localStorage.setItem(FAVORITE_KEY, JSON.stringify(arr));
}
function isFavorite(name){
  return getFavorites().includes(name);
}
function toggleFavorite(name){
  var arr = getFavorites();
  var idx = arr.indexOf(name);
  if(idx >= 0) arr.splice(idx, 1); else arr.push(name);
  saveFavorites(arr);
  renderSchoolTable();
  updateFavBtnStyle();
  document.querySelectorAll('.mobile-school-card').forEach(function(card){
    const row = card.id ? document.querySelector('#schoolTable tr[data-mobile-card-id="'+card.id+'"]') : null;
    const cardSchool = card.dataset.school || (row && row.dataset.school);
    if(cardSchool === name) updateMobileFavoriteButton(card, name);
  });
}
function toggleFavoriteFilter(){
  FAVORITE_FILTER = !FAVORITE_FILTER;
  updateFavBtnStyle();
  window.schoolCurrentPage = 1;
  renderSchoolTable();
}
function updateFavBtnStyle(){
  var btn = document.getElementById('favBtn');
  if(!btn) return;
  if(FAVORITE_FILTER){
    btn.style.background = 'linear-gradient(135deg,#FF6B6B 0%,#FF6B6B 100%)';
    btn.style.color = '#fff';
  } else {
    btn.style.background = 'linear-gradient(135deg,#FF6B6B 0%,#FFE66D 100%)';
    btn.style.color = '#fff';
  }
}

// ===================== 实时搜索防抖 =====================
var searchDebounceTimer = null;
function debounceSchoolSearch(){
  var input = document.getElementById('schoolSearch');
  var clearBtn = document.getElementById('searchClear');
  if(clearBtn) clearBtn.style.display = input.value ? 'inline-block' : 'none';
  if(searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(function(){
    window.schoolCurrentPage = 1;
    renderSchoolTable();
  }, 300);
}
function clearSchoolSearch(){
  var input = document.getElementById('schoolSearch');
  if(input) input.value = '';
  var clearBtn = document.getElementById('searchClear');
  if(clearBtn) clearBtn.style.display = 'none';
  window.schoolCurrentPage = 1;
  renderSchoolTable();
}

// ===================== 多选对比功能 =====================
var compareSchools = new Set();
(function(){
  var saved = localStorage.getItem('kaoyan_compare_schools');
  if(saved){ try{ JSON.parse(saved).forEach(function(s){ compareSchools.add(s); }); }catch(e){} }
})();
function toggleCompareSchool(name, checked){
  if(checked) compareSchools.add(name); else compareSchools.delete(name);
  updateCompareBar();
  saveCompareState();
}
function toggleCompareAll(cb){
  var data = getSchoolTableData();
  var pageData = data.slice((window.schoolCurrentPage-1)*20, window.schoolCurrentPage*20);
  pageData.forEach(function(s){
    if(cb.checked) compareSchools.add(s['学校']); else compareSchools.delete(s['学校']);
  });
  saveCompareState();
  renderSchoolTable();
  updateCompareBar();
}
function updateCompareBar(){
  var bar = document.getElementById('compareBar');
  var count = document.getElementById('compareCount');
  var tags = document.getElementById('compareTags');
  if(!bar) return;
  var arr = Array.from(compareSchools);
  if(arr.length === 0) { bar.style.display = 'none'; updateRecentViewBarPosition(); updateResponsiveChromeVars(); return; }
  bar.style.display = 'flex';
  count.textContent = arr.length;
  tags.innerHTML = arr.map(function(s){
    return '<span class="compare-tag">'+s+'<button onclick="removeCompareSchool(\''+s.replace(/'/g, "\\'")+'\')">✕</button></span>';
  }).join('');
  updateRecentViewBarPosition();
  updateResponsiveChromeVars();
}
function removeCompareSchool(name){
  compareSchools.delete(name);
  saveCompareState();
  renderSchoolTable();
  updateCompareBar();
}
function clearCompare(){
  compareSchools.clear();
  saveCompareState();
  renderSchoolTable();
  updateCompareBar();
}
function openCompareModal(){
  var arr = Array.from(compareSchools);
  if(arr.length < 2) { alert('请至少选择2所院校进行对比'); return; }
  if(arr.length > 8) { alert('最多对比8所院校'); return; }
  // 跳转到院校PK页面，传递选中的学校
  var url = '院校PK.html?schools=' + arr.map(function(s){ return encodeURIComponent(s); }).join(',');
  window.location.href = url;
}

function saveCompareState(){
  localStorage.setItem('kaoyan_compare_schools', JSON.stringify(Array.from(compareSchools)));
}

// 修改 getSchoolTableData 支持收藏筛选
var originalGetSchoolTableData = getSchoolTableData;
getSchoolTableData = function(){
  var data = originalGetSchoolTableData();
  if(FAVORITE_FILTER) {
    var favs = getFavorites();
    data = data.filter(function(s){ return favs.includes(s['学校']); });
  }
  // 排序
  if(sortField && data.length > 0){
    data.sort(function(a,b){
      var va = a[sortField] || 0;
      var vb = b[sortField] || 0;
      if(typeof va === 'string') va = parseFloat(va) || va;
      if(typeof vb === 'string') vb = parseFloat(vb) || vb;
      if(typeof va === 'number' && typeof vb === 'number') return (va - vb) * sortDir;
      return String(va).localeCompare(String(vb)) * sortDir;
    });
  }
  return data;
};

// ===================== 广告开关控制 =====================
var QR_AD_KEY = 'kaoyan_qr_ad_enabled';
function isQrAdEnabled(){
  var val = localStorage.getItem(QR_AD_KEY);
  return val === null ? true : (val === 'true');
}
function updateHomeQqGroupAds(enabled){
  var isMobile = window.innerWidth <= 768;
  var desktop = document.querySelectorAll('.ad-qq-group-desktop');
  var mobile = document.querySelectorAll('.ad-qq-group-mobile');
  desktop.forEach(function(el){ el.style.display = (enabled && !isMobile) ? 'flex' : 'none'; });
  mobile.forEach(function(el){ el.style.display = (enabled && isMobile) ? 'flex' : 'none'; });
}
window.addEventListener('resize', function(){ updateHomeQqGroupAds(isQrAdEnabled()); updateResponsiveChromeVars(); });
window.addEventListener('pageshow', function(){ updateHomeQqGroupAds(isQrAdEnabled()); updateResponsiveChromeVars(); });

// ===================== 院校海报轮播 =====================
var POSTERS = [
  {school: '哈工大801控制考研全程班', img: '专业课选择/images/院校海报/compressed/哈工大801控制考研全程班.jpg', link: ''},
  {school: '万人教育答疑班开班', img: '专业课选择/images/院校海报/compressed/万人教育答疑班.jpg', link: ''}
];
// 实际存在的图片文件集合——用于彻底避免404请求
var VALID_POSTERS = new Set(["哈工大801控制考研全程班", "万人教育答疑班开班"]);
// 27考研改考院校集合（数据来源：改考院校.html）
var GAIKAO_SCHOOLS = new Set(["东北林业大学","东南大学","中国地质大学（北京）","中国计量大学","中央民族大学","北京林业大学","北京理工大学","华东师范大学","华北电力大学","华南理工大学","南京信息工程大学","南京林业大学","南京理工大学","厦门大学","吉林大学","哈尔滨工业大学","天津大学","天津工业大学","宁波大学","安徽大学","杭州电子科技大学","河北工业大学","浙江大学","浙江师范大学","海南大学","福州大学","绍兴大学","西北工业大学","西南交通大学","西南大学","西安邮电大学","长安大学","黑龙江大学"]);
var VALID_QRS = new Set([
  "上海大学", "东北大学", "东南大学", "中南大学", "中国矿业大学（徐州）", "中国科学技术大学", "中国科学院大学", "北京工业大学",
  "北京航空航天大学", "华北电力大学（北京）", "华北电力大学（保定）", "南京信息工程大学", "南京理工大学", "南京航空航天大学", "南京邮电大学", "南昌大学",
  "同济大学", "哈尔滨工业大学", "哈尔滨工程大学", "大连海事大学", "大连理工大学", "天津工业大学", "安徽大学", "山东大学",
  "广东工业大学", "杭州电子科技大学", "江南大学", "河海大学", "济南大学", "浙江理工大学", "燕山大学", "电子科技大学",
  "福州大学", "郑州大学", "重庆邮电大学"
]);
var QR_EXTS = {
  "上海大学": ".png",
  "东北大学": ".png",
  "东南大学": ".png",
  "中南大学": ".png",
  "中国矿业大学（徐州）": ".png",
  "中国科学技术大学": ".png",
  "中国科学院大学": ".png",
  "北京工业大学": ".png",
  "北京航空航天大学": ".png",
  "华北电力大学（北京）": ".png",
  "华北电力大学（保定）": ".png",
  "南京信息工程大学": ".png",
  "南京理工大学": ".png",
  "南京航空航天大学": ".png",
  "南京邮电大学": ".png",
  "南昌大学": ".png",
  "同济大学": ".png",
  "哈尔滨工业大学": ".png",
  "哈尔滨工程大学": ".png",
  "大连海事大学": ".png",
  "大连理工大学": ".png",
  "天津工业大学": ".png",
  "安徽大学": ".png",
  "山东大学": ".png",
  "广东工业大学": ".png",
  "杭州电子科技大学": ".png",
  "江南大学": ".png",
  "河海大学": ".png",
  "济南大学": ".png",
  "浙江理工大学": ".png",
  "燕山大学": ".png",
  "电子科技大学": ".png",
  "福州大学": ".png",
  "郑州大学": ".png",
  "重庆邮电大学": ".png"
};
function getQrPath(name){
  if(!VALID_QRS.has(name)) return null;
  return '专业课选择/images/27考研群/' + name + (QR_EXTS[name] || '.png');
}
var posterIndex = 0;
var posterTimer = null;

function initPosterCarousel(){
  var carousel = document.getElementById('posterCarousel');
  if(!carousel || POSTERS.length === 0) return;
  
  // 直接用 VALID_POSTERS 过滤，不发送任何检测请求
  var filtered = POSTERS.filter(function(p){ return VALID_POSTERS.has(p.school); });
  if(filtered.length === 0){
    carousel.style.display = 'none';
    return;
  }
  POSTERS = filtered;
  
  // 根据广告开关控制显示
  var enabled = isQrAdEnabled();
  carousel.style.display = enabled ? 'block' : 'none';
  
  var img = document.getElementById('posterImg');
  var link = document.getElementById('posterLink');
  var title = document.getElementById('posterTitle');
  var dots = document.getElementById('posterDots');
  if(!img || !link || !title || !dots) return;
  
  // 生成指示点
  dots.innerHTML = '';
  POSTERS.forEach(function(p, i){
    var dot = document.createElement('span');
    dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:' + (i === 0 ? '#a92122' : '#ddd') + ';cursor:pointer;transition:background .3s;';
    dot.onclick = function(){ showPoster(i); };
    dots.appendChild(dot);
  });
  
  showPoster(0);
  
  // 每5秒切换
  if(posterTimer) clearInterval(posterTimer);
  posterTimer = setInterval(function(){
    var enabled = isQrAdEnabled();
    var carousel = document.getElementById('posterCarousel');
    if(carousel && enabled){
      posterIndex = (posterIndex + 1) % POSTERS.length;
      showPoster(posterIndex);
    }
  }, 5000);
}

function showPoster(index){
  var img = document.getElementById('posterImg');
  var link = document.getElementById('posterLink');
  var title = document.getElementById('posterTitle');
  var dots = document.getElementById('posterDots');
  if(!img || !link || !title || !dots || !POSTERS[index]) return;
  
  var p = POSTERS[index];
  img.src = p.img;
  link.href = p.link || 'javascript:void(0);';
  img.style.cursor = 'pointer';
  if(p.link){
    img.onclick = null;    // 有跳转链接时，点击事件自然冒泡到 <a> 标签实现跳转
  } else {
    img.onclick = function(){ openPosterLightbox(p.img); };  // 无链接时点击放大看大图
  }
  title.textContent = p.school;
  posterIndex = index;
  
  // 更新指示点
  var dotEls = dots.querySelectorAll('span');
  dotEls.forEach(function(dot, i){
    dot.style.background = i === index ? '#a92122' : '#ddd';
  });
}
