(function () {
  'use strict';

  var root = document.getElementById('journeyHome');
  if (!root) return;

  var STORAGE_STAGE = 'kaoyan_journey_stage_tab_v2';
  var STORAGE_PROMPT = 'kaoyan_journey_prompt_seen_v1';
  var stages = {
    learn: {
      label: '目标定位', icon: 'fa-bullseye', meta: '第 1 阶段 · 建立认知',
      title: '先用 15 分钟看懂考研全貌',
      description: '把时间线、考试科目和基本规则一次理顺，再决定下一步从哪里开始。',
      steps: ['看懂完整考研时间线', '确认初试科目和总分构成', '记录你的专业与目标年份'],
      progress: 18,
      primary: ['开始了解考研', '考研常识科普/index.html'],
      secondary: ['参考上岸经验', '考研常识科普/experience.html']
    },
    direction: {
      label: '专业课判断', icon: 'fa-book-open', meta: '第 2 阶段 · 明确方向',
      title: '先确认专业课与目标地区',
      description: '专业课和地区会直接缩小院校范围，先确定边界，后续筛选会快很多。',
      steps: ['查看专业课代码与难度', '选择可接受的城市和地区', '判断学硕、专硕与个人基础'],
      progress: 32,
      primary: ['查询专业课匹配', '专业课选择/考研专业课院校查询.html'],
      secondary: ['查看院校生源分布', '控制院校生源地图.html']
    },
    school: {
      label: '正在筛院校', icon: 'fa-magnifying-glass', meta: '第 3 阶段 · 建立备选',
      title: '先筛出第一批备选院校',
      description: '不用马上选出唯一答案。先根据地区、层级和专业课，留下 6–10 所值得进一步看的学校。',
      steps: ['填写地区、层级与专业课条件', '浏览符合条件的院校卡片', '收藏 6–10 所作为第一批备选'],
      progress: 48,
      primary: ['开始筛选院校', '#mainContentArea'],
      secondary: ['先查专业课匹配', '专业课选择/考研专业课院校查询.html']
    },
    target: {
      label: '院校对比', icon: 'fa-scale-balanced', meta: '第 4 阶段 · 收敛方案',
      title: '把备选院校放到一起比较',
      description: '用同一套标准对比招生、分数、热度和地区，把名单收敛成冲、稳、保。',
      steps: ['加入 2–4 所备选院校', '比较分数线与招生规模', '形成冲稳保目标组合'],
      progress: 64,
      primary: ['开始院校 PK', '院校PK.html'],
      secondary: ['查看院校热度', 'heat_compare.html']
    },
    review: {
      label: '备考复习', icon: 'fa-clipboard-check', meta: '第 5 阶段 · 执行复习',
      title: '建立这一阶段的复习节奏',
      description: '围绕目标院校整理资料与复习重点，把选校结论真正转成每天的行动。',
      steps: ['核对目标院校考试科目', '建立专业课资料清单', '安排阶段复盘和模拟练习'],
      progress: 78,
      primary: ['真题备考区', '真题备考区.html'],
      secondary: ['阅读上岸经验', '考研常识科普/experience.html']
    },
    retest: {
      label: '就业与发展', icon: 'fa-briefcase', meta: '第 6 阶段 · 规划发展',
      title: '提前看清就业去向与能力路径',
      description: '从院校就业去向、校招机会和岗位能力要求出发，判断目标院校能否承接你的长期规划。',
      steps: ['查看目标院校就业去向', '跟进校招信息与行业机会', '用分析报告规划岗位能力栈'],
      progress: 92,
      primary: ['进入就业与发展', '就业相关/index.html'],
      secondary: ['查看就业分析报告', '就业相关/career-analysis/career-analysis.html']
    }
  };

  function read(key) {
    try { return localStorage.getItem(key); } catch (error) { return null; }
  }

  function write(key, value) {
    try { localStorage.setItem(key, value); } catch (error) {}
  }

  var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-stage-tab]'));
  var action = root.querySelector('.journey-action');
  var dialog = document.getElementById('journeyStageDialog');
  var selected = stages[read(STORAGE_STAGE)] ? read(STORAGE_STAGE) : 'school';

  action.innerHTML = [
    '<div class="journey-task__topline">',
      '<span class="journey-task__symbol"><i class="fa-solid" data-task-icon aria-hidden="true"></i></span>',
      '<span class="journey-task__badge">当前任务</span>',
      '<span class="journey-task__meta" data-task-meta></span>',
    '</div>',
    '<h2 data-task-title></h2>',
    '<p class="journey-task__description" data-task-description></p>',
    '<ol class="journey-task__steps" data-task-steps></ol>',
    '<div class="journey-task__progress-head"><span>当前路线进度</span><strong data-task-progress-label></strong></div>',
    '<div class="journey-task__progress" aria-hidden="true"><i data-task-progress></i></div>',
    '<div class="journey-task__actions">',
      '<a class="journey-action__primary" data-task-primary><span data-task-primary-label></span><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>',
      '<a class="journey-action__secondary" data-task-secondary><span data-task-secondary-label></span><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a>',
    '</div>'
  ].join('');

  var quickTools = document.createElement('div');
  quickTools.className = 'journey-quick-tools';
  quickTools.setAttribute('aria-label', '常用工具');
  quickTools.innerHTML = [
    '<a href="专业课选择/考研专业课院校查询.html"><span class="journey-quick-tools__icon"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i></span><span><b>院校条件筛选</b><small>按地区、层级与专业课筛选</small></span><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>',
    '<a href="专业课选择/考研专业课院校查询.html"><span class="journey-quick-tools__icon"><i class="fa-solid fa-book-open" aria-hidden="true"></i></span><span><b>专业课匹配</b><small>查看科目难度与匹配院校</small></span><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>',
    '<a href="heat_compare.html"><span class="journey-quick-tools__icon"><i class="fa-solid fa-fire-flame-curved" aria-hidden="true"></i></span><span><b>院校热度</b><small>观察关注度和报考趋势</small></span><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>'
  ].join('');
  root.insertBefore(quickTools, root.querySelector('.journey-tools-trigger'));

  function followLink(event) {
    var href = event.currentTarget.getAttribute('href');
    if (href === '#mainContentArea') {
      var target = document.getElementById('mainContentArea');
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  function render(stageKey) {
    var stage = stages[stageKey] || stages.school;
    selected = stageKey;
    write(STORAGE_STAGE, stageKey);
    tabs.forEach(function (tab) {
      var active = tab.getAttribute('data-stage-tab') === stageKey;
      tab.setAttribute('aria-pressed', String(active));
      tab.classList.toggle('is-active', active);
    });
    action.querySelector('[data-task-meta]').textContent = stage.meta;
    action.querySelector('[data-task-icon]').className = 'fa-solid ' + stage.icon;
    action.querySelector('[data-task-title]').textContent = stage.title;
    action.querySelector('[data-task-description]').textContent = stage.description;
    action.querySelector('[data-task-steps]').innerHTML = stage.steps.map(function (step, index) {
      return '<li><span>' + (index + 1) + '</span><b>' + step + '</b></li>';
    }).join('');
    action.querySelector('[data-task-progress-label]').textContent = stage.progress + '%';
    action.querySelector('[data-task-progress]').style.width = stage.progress + '%';
    var primary = action.querySelector('[data-task-primary]');
    primary.setAttribute('href', stage.primary[1]);
    primary.querySelector('[data-task-primary-label]').textContent = stage.primary[0];
    primary.onclick = followLink;
    var secondary = action.querySelector('[data-task-secondary]');
    secondary.setAttribute('href', stage.secondary[1]);
    secondary.querySelector('[data-task-secondary-label]').textContent = stage.secondary[0];
    action.animate([{ opacity: 0.72, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 180, easing: 'ease-out' });
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      render(tab.getAttribute('data-stage-tab'));
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-dialog-stage]'), function (button) {
    button.addEventListener('click', function () {
      render(button.getAttribute('data-dialog-stage'));
      write(STORAGE_PROMPT, '1');
      if (dialog && dialog.open) dialog.close();
    });
  });

  var rechoose = root.querySelector('[data-rechoose-stage]');
  if (rechoose) rechoose.addEventListener('click', function () {
    if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
  });

  var skip = document.querySelector('[data-dialog-skip]');
  if (skip) skip.addEventListener('click', function () {
    write(STORAGE_PROMPT, '1');
    if (dialog && dialog.open) dialog.close();
  });

  var toolsTrigger = root.querySelector('[data-open-tools]');
  if (toolsTrigger) toolsTrigger.addEventListener('click', function () {
    var tools = document.querySelector('.site-nav__tools');
    if (tools) tools.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  render(selected);
})();
