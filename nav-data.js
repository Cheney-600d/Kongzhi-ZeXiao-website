/* 全站导航唯一数据源：桌面 mega 菜单 / hero-channels 三大频道 / 移动端 mobile-shell 三处共用。
   新增或修改功能入口时，只改这里。 */
window.NAV_ICONS = {
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  clipboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>',
  message: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  target: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  scale: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>',
  map: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/></svg>',
  flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>',
  briefcase: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
  sparkles: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/></svg>',
  megaphone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>',
  chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>',
  compass: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/></svg>'
};

window.NAV_GROUPS = [
  { id: 'study', label: '备考与提升', icon: 'book', items: [
    { href: '考研常识科普/index.html', label: '28 考研常识扫盲', icon: 'book' },
    { href: '复试全攻略/index.html', label: '27 考研复试', icon: 'clipboard' },
    { href: '考研常识科普/experience.html', label: '上岸经验贴', icon: 'message' }
  ] },
  { id: 'school', label: '择校决策', icon: 'target', items: [
    { href: '专业课选择/考研专业课院校查询.html', label: '专业课院校查询', icon: 'search' },
    { href: '院校PK.html', label: '院校 PK 对比', icon: 'scale' },
    { href: 'school_detail/index.html', label: '院校详情库', icon: 'book' },
    { href: '控制院校生源地图.html', label: '院校生源地图', icon: 'map' },
    { href: 'heat_compare.html', label: '院校热度榜', icon: 'flame' },
    { href: '改考院校.html', label: '27 改考院校', icon: 'refresh' }
  ] },
  { id: 'career', label: '就业与能力', icon: 'briefcase', items: [
    { href: '就业相关/就业去向index.html', label: '就业去向', icon: 'briefcase' },
    { href: 'AI课程/ai-course-overview/ai-course-overview.html', label: 'AI 提效指南', icon: 'sparkles' },
    { href: '就业相关/job-listing/job-listing.html', label: '27 校招信息', icon: 'megaphone' },
    { href: '就业相关/career-analysis/career-analysis.html', label: '就业分析报告', icon: 'chart' },
    { href: '就业相关/career-analysis/role-tech-stack.html', label: '职业规划全景', icon: 'compass' }
  ] }
];
