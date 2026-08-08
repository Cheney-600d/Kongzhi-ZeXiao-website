// ===== 站点导航配置（短标签，紧凑导航） =====
const SITE_NAV = [
  { href: '01-timeline.html', label: '时间线' },
  { href: '02-competitiveness.html', label: '竞争力' },
  { href: '03-written-exam.html', label: '笔试' },
  { href: '04-interview.html', label: '面试' },
  { href: '05-interview-questions.html', label: '问题' },
  { href: '06-mentor.html', label: '导师' },
  { href: '07-projects.html', label: '项目' },
  { href: '08-project-packaging.html', label: '简历' },
  { href: '09-professional-questions.html', label: '100题' },
  { href: '10-tiaoji.html', label: '调剂' },
];

// ===== 渲染导航 =====
function renderNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  // 桌面导航 — 子页面显示短标签药丸按钮
  const navLinks = document.querySelector('.nav-links');
  if (navLinks && currentPage !== 'index.html') {
    navLinks.innerHTML = SITE_NAV.map(item => {
      const isActive = item.href === currentPage;
      return `<li><a href="${item.href}" class="${isActive ? 'active' : ''}">${item.label}</a></li>`;
    }).join('');
  } else if (navLinks) {
    navLinks.innerHTML = '';
  }

  // 移动端导航
  const mobileNav = document.querySelector('.mobile-nav');
  if (mobileNav && currentPage !== 'index.html') {
    mobileNav.innerHTML = SITE_NAV.map(item => {
      const isActive = item.href === currentPage;
      return `<a href="${item.href}" class="${isActive ? 'active' : ''}">${item.label}</a>`;
    }).join('');
  } else if (mobileNav) {
    mobileNav.innerHTML = '';
  }

  // 添加返回按钮
  const mainNav = document.querySelector('.main-nav');
  if (mainNav && !mainNav.querySelector('.nav-back-buttons')) {
    const btnContainer = document.createElement('div');
    btnContainer.className = 'nav-back-buttons';
    if (currentPage === 'index.html') {
      btnContainer.innerHTML = `
        <a href="../index.html" class="nav-back-btn">← 返回择校首页</a>
      `;
    } else {
      btnContainer.innerHTML = `
        <a href="index.html" class="nav-back-btn">🏠 返回首页</a>
        <a href="../index.html" class="nav-back-btn">← 返回择校首页</a>
      `;
    }
    const hamburger = mainNav.querySelector('.hamburger');
    if (hamburger) {
      mainNav.insertBefore(btnContainer, hamburger);
    } else {
      mainNav.appendChild(btnContainer);
    }
  }
}

// ===== 汉堡菜单 =====
function toggleMobileNav() {
  const mobileNav = document.querySelector('.mobile-nav');
  if (mobileNav) {
    mobileNav.classList.toggle('open');
  }
}

// ===== 回到顶部 =====
function setupBackToTop() {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  });

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ===== Q&A 折叠 =====
function setupQA() {
  document.querySelectorAll('.qa-question').forEach(q => {
    q.addEventListener('click', () => {
      const answer = q.nextElementSibling;
      const isOpen = answer.classList.contains('open');

      // 关闭同组其他
      q.closest('.qa-list, .section, body')?.querySelectorAll('.qa-answer.open').forEach(a => {
        if (a !== answer) {
          a.classList.remove('open');
          a.previousElementSibling?.classList.remove('active');
        }
      });

      answer.classList.toggle('open');
      q.classList.toggle('active');
    });
  });
}

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  renderNav();
  setupBackToTop();
  setupQA();

  // 汉堡菜单点击
  document.querySelector('.hamburger')?.addEventListener('click', toggleMobileNav);

  // 点击外部关闭移动端菜单
  document.addEventListener('click', (e) => {
    const mobileNav = document.querySelector('.mobile-nav');
    const hamburger = document.querySelector('.hamburger');
    if (mobileNav?.classList.contains('open') &&
        !mobileNav.contains(e.target) &&
        !hamburger?.contains(e.target)) {
      mobileNav.classList.remove('open');
    }
  });
});
