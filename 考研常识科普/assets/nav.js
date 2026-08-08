// 公共导航脚本
(function() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  // 导航数据 — 马卡龙配色
  const navItems = [
    { href: 'index.html', label: '首页', color: 'nav-pink' },
    { href: 'experience.html', label: '上岸经验贴', color: 'nav-mint' },
    { href: '01-basics.html', label: '基础常识', color: 'nav-purple' },
    { href: '02-timeline.html', label: '备考时间线', color: 'nav-yellow' },
    { href: '03-public-courses.html', label: '公共课备考', color: 'nav-orange' },
    { href: '04-major.html', label: '专业课备考', color: 'nav-blue' },
    { href: '05-school-selection.html', label: '考研择校', color: 'nav-rose' },
    { href: '06-mindset-career.html', label: '心态与就业', color: 'nav-green' },
    { href: '07-faq.html', label: '常见问题', color: 'nav-cyan' },
    { href: '08-methods.html', label: '学习方法', color: 'nav-lavender' },
  ];

  // 渲染导航
  function renderNav(container, isMobile) {
    container.innerHTML = '';
    navItems.forEach(item => {
      const a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.label;
      a.classList.add(item.color);
      if (item.href === currentPage || (currentPage === '' && item.href === 'index.html')) {
        a.classList.add('active');
      }
      container.appendChild(a);
    });
  }

  // 初始化导航
  document.addEventListener('DOMContentLoaded', function() {
    const desktopNav = document.querySelector('.main-nav');
    const mobileNav = document.querySelector('.mobile-nav');
    const menuToggle = document.querySelector('.menu-toggle');

    if (desktopNav) renderNav(desktopNav, false);
    if (mobileNav) renderNav(mobileNav, true);

    if (menuToggle && mobileNav) {
      menuToggle.addEventListener('click', function() {
        mobileNav.classList.toggle('show');
        menuToggle.textContent = mobileNav.classList.contains('show') ? '✕' : '☰';
      });

      // 点击移动端导航链接后关闭菜单
      mobileNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          mobileNav.classList.remove('show');
          menuToggle.textContent = '☰';
        });
      });
    }

    // ===== 经验贴详情页：科目高亮 + 隔离框处理 =====
    if (window.location.pathname.includes('/post-') || window.location.pathname.includes('post-')) {
      highlightPostSubjects();
    }
  });

  // 经验贴科目高亮函数
  function highlightPostSubjects() {
    const postBody = document.querySelector('.post-body');
    if (!postBody) return;

    const keywords = [
      { words: ['数学一', '数学二', '数学三', '数一', '数二', '数三', '高数', '线代', '概率论', '微积分', '线性代数', '概率', '张宇', '武忠祥', '汤家凤', '李永乐', '660', '880', '1000题', '1800', '330'], cls: 'math', label: '数学' },
      { words: ['政治', '马原', '毛中特', '思修', '史纲', '肖秀荣', '肖四', '肖八', '肖1000', '腿姐', '徐涛', '曲艺', '张修齐', '大牙'], cls: 'politics', label: '政治' },
      { words: ['英语一', '英语二', '英一', '英二', '英语', '单词', '阅读', '作文', '翻译', '完型', '新题型', '长难句', '唐迟', '颉斌斌', '刘晓艳', 'monkey', '田静', '语法', '墨墨背单词', '不背单词', '扇贝', '百词斩'], cls: 'english', label: '英语' },
      { words: ['信号与系统', '信号系统', '信号', '时域分析', '频域分析', '傅里叶', '拉普拉斯', 'Z变换', '奈奎斯特', '系统函数', '冲激响应', '阶跃响应', '卷积', '水木观畴', '风清扬', '宝典B', '信号', '郑君里', '奥本海姆'], cls: 'signal', label: '信号与系统' },
      { words: ['通信原理', '通信', '调制', '解调', '信道', '信噪比', '带宽', '频带', '码元', '比特率', '误码率', '多路复用', '抽样', '量化', '编码', 'PCM', 'ASK', 'FSK', 'PSK', 'QAM'], cls: 'communication', label: '通信原理' },
      { words: ['模电', '数电', '模拟电路', '数字电路', '电子技术', '半导体', '三极管', '二极管', 'MOS', '运放', '放大器', '反馈', '振荡', '触发器', '组合逻辑', '时序逻辑', '阎石', '康华光', '阳哥', '数字电路'], cls: 'electronics', label: '电子技术' },
      { words: ['电路', '电路分析', 'KCL', 'KVL', '戴维宁', '诺顿', '叠加定理', '节点电压', '回路电流', '阻抗', '导纳', '相量', '最大功率', '一阶电路', '二阶电路', '暂态', '稳态', '邱关源', '电阻', '电容', '电感'], cls: 'circuit', label: '电路' },
    ];

    const children = Array.from(postBody.children);
    let currentBox = null, currentSubject = null;

    children.forEach(function(el) {
      if (el.tagName === 'P' || el.tagName === 'H3' || el.tagName === 'UL' || el.tagName === 'OL' || el.tagName === 'DIV') {
        const text = el.textContent || '';
        let matched = null;
        for (const kw of keywords) {
          for (const w of kw.words) {
            if (text.includes(w)) { matched = kw; break; }
          }
          if (matched) break;
        }

        // 高亮关键词
        if (matched) {
          for (const w of matched.words) {
            // 安全替换：不替换已在标签内的文本
            if (el.children.length === 0 && el.tagName === 'P') {
              el.innerHTML = el.innerHTML.replace(
                new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                '<span class="subject-tag ' + matched.cls + '">' + w + '</span>'
              );
            }
          }
        }

        // 科目隔离框
        if (el.tagName === 'P' || el.tagName === 'H3') {
          if (matched) {
            if (currentSubject !== matched.cls) {
              // 新科目，创建新框
              currentBox = document.createElement('div');
              currentBox.className = 'subject-box ' + matched.cls;
              // 添加框标题
              const title = document.createElement('div');
              title.className = 'subject-box-title';
              title.innerHTML = '<span class="subject-tag ' + matched.cls + '">' + matched.label + '</span>';
              currentBox.appendChild(title);
              el.parentNode.insertBefore(currentBox, el);
              currentSubject = matched.cls;
            }
            // 将元素移入框内
            currentBox.appendChild(el);
          } else {
            // 无匹配，重置框
            currentBox = null;
            currentSubject = null;
          }
        }
      }
    });
  }
})();
