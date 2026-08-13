# 首页信息横幅 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在首页 hero-stats 与导航行之间插入一条全宽「最新经验贴 + 更新公告」信息横幅；经验贴数据与经验贴列表页共享同一份 `posts-data.js`，一处维护两页自动同步。

**Architecture:** 把 experience.html 内联的 `const POSTS`（126 条，一整行）抽取到 `考研常识科普/posts-data.js`（定义全局词法绑定 `POSTS` + 挂 `window.POSTS`）；experience.html 引用该文件并删除内联数组；index.html 静态写入横幅 HTML + 新增 `home-banner.js`（defer）从 `window.POSTS.slice(-4).reverse()` 渲染左栏，右栏公告为静态 HTML。

**Tech Stack:** 纯静态站点（无构建），经典 `<script>`、内联 style。编辑用 Node（`fs`）处理超长行的抽取/删除，HTML 编辑用文本工具。

**关联设计文档:** `docs/superpowers/specs/2026-08-13-homepage-info-banner-design.md`

## Global Constraints

- 行尾格式：`experience.html`、`posts-data.js` 用 **CRLF**；`index.html`、`home-banner.js` 用 **LF**。编辑时不得整文件改写导致行尾翻页级 diff。
- 主题色：#B71C1C（强调红）、#E5E7EB（描边）、#F8F8F6（hover 底）、#EEF0F4（分栏线）。
- 移动端 `@media(max-width:768px)` 下整条横幅 `display:none`，不得影响手机端。
- `const POSTS` 是经典脚本全局词法绑定：同一页面内后续脚本可直接引用 `POSTS`；跨页面统一经 `window.POSTS` 读取。
- 详情页链接：首页下为 `考研常识科普/experience/{id}.html`；经验贴列表页内为 `experience/{id}.html`（相对自身目录）。
- 公告 4 条目标页（已在首页导航验证存在）：`考研常识科普/experience.html`、`就业相关/就业去向index.html`、`专业课选择/考研专业课院校查询.html`、`复试全攻略/index.html`。

---

### Task 1: 抽取 POSTS 到 posts-data.js

**Files:**
- Create: `考研常识科普/posts-data.js`（CRLF）
- Modify: `考研常识科普/experience.html`（CRLF）

**Interfaces:**
- Produces: 全局 `POSTS`（词法绑定）+ `window.POSTS`，供 Task 2 的 `home-banner.js` 读取。

**背景事实**（已核实）：experience.html 共 376 行；line 241 `<script>`，line 242 为 `const POSTS = [...];`（一整行，126 条）；line 361 `</script>`。`const POSTS` 全文件仅出现 1 次。

- [ ] **Step 1: 写抽取脚本**（放临时目录，不提交）

创建 `C:\Users\51366\.claude\jobs\3412f358\tmp\extract_posts.cjs`：

```js
const fs = require('fs');
const path = require('path');
const base = 'C:/Users/51366/kaoyan-site-template/';
const htmlFile = path.join(base, '考研常识科普/experience.html');
const dataFile = path.join(base, '考研常识科普/posts-data.js');
const txt = fs.readFileSync(htmlFile, 'utf8');
const lines = txt.split(/\r?\n/);
const idx = lines.findIndex(l => /^const POSTS = \[/.test(l));
if (idx === -1) { console.error('POSTS 未找到'); process.exit(1); }
const postsLine = lines[idx];
if (!/\];\s*$/.test(postsLine)) { console.error('POSTS 行未以 ]; 结尾，中止'); process.exit(1); }
// 向上找 POSTS 所在 <script> 开标签（原 line 241），共享脚本须插在其之前
let scriptIdx = idx - 1;
while (scriptIdx >= 0 && lines[scriptIdx].trim() !== '<script>') scriptIdx--;
if (scriptIdx < 0) { console.error('未找到 POSTS 所在 <script> 开标签'); process.exit(1); }
// 写 posts-data.js（CRLF）：原数组 + window 挂载行
fs.writeFileSync(dataFile,
  postsLine + '\r\n' +
  "if (typeof window !== 'undefined') window.POSTS = POSTS;" + '\r\n',
  'utf8');
// experience.html：原 POSTS 行替换为注释，<script> 开标签之前插入共享脚本引用
lines[idx] = '// POSTS 已抽取至 posts-data.js（全站共享数据源）';
lines.splice(scriptIdx, 0, '<script src="posts-data.js"></script>');
fs.writeFileSync(htmlFile, lines.join('\r\n'), 'utf8');
console.log('ok POSTS 长度 =', postsLine.length);
```

- [ ] **Step 2: 运行脚本**

Run: `node C:/Users/51366/.claude/jobs/3412f358/tmp/extract_posts.cjs`
Expected: 输出 `ok POSTS 长度 = <数字>`（约 4 万字符量级）。

- [ ] **Step 3: 核对文件状态**

Run:
```bash
grep -c "const POSTS" "考研常识科普/posts-data.js"        # 期望 1
grep -c "const POSTS" "考研常识科普/experience.html"      # 期望 0
grep -c "window.POSTS = POSTS" "考研常识科普/posts-data.js" # 期望 1
grep -n "posts-data.js" "考研常识科普/experience.html"     # 期望出现 1 行 script 引用
```
Expected: 三个计数如上。同时确认 `experience.html` 仍是 CRLF、行尾风格未被破坏（可用 `file` 或读首行确认无 BOM/异常）。

- [ ] **Step 4: 冒烟验证经验贴列表页**

启动 8766 服务器（见 Task 3 脚本或现有 serve），浏览器打开 `http://127.0.0.1:8766/考研常识科普/experience.html`，确认：页面正常渲染 126 张卡片、控制台无 `POSTS is not defined` 报错、搜索/筛选可用。

- [ ] **Step 5: 提交**

```bash
git add "考研常识科普/posts-data.js" "考研常识科普/experience.html"
git commit -m "refactor: 抽取经验贴POSTS到共享posts-data.js"
```

---

### Task 2: index.html 插入横幅 + 新建 home-banner.js

**Files:**
- Create: `home-banner.js`（LF）
- Modify: `index.html`（LF）

**Interfaces:**
- Consumes: Task 1 的 `window.POSTS`。
- Produces: 首页 hero-stats 下方全宽信息横幅。

- [ ] **Step 1: 新建 `home-banner.js`**（LF，与 index.js 同风格）

```js
/* 首页信息横幅：最新上岸经验贴（数据来自共享 posts-data.js，自动同步） */
(function () {
  var list = document.getElementById('bannerLatestPosts');
  if (!list) return;
  var posts = window.POSTS || [];
  var LEVEL = { '985': '#E53935', '211': '#00AEEC', '双一流': '#9C27B0', '双非': '#43A047' };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var latest = posts.slice(-4).reverse();
  if (!latest.length) {
    list.innerHTML = '<div style="font-size:12px;color:#999;padding:6px 2px;">暂无经验贴</div>';
    return;
  }
  list.innerHTML = latest.map(function (p) {
    var badge = '<span style="background:' + (LEVEL[p.level] || '#6b7280') + ';color:#fff;font-size:11px;font-weight:600;line-height:1;padding:3px 6px;border-radius:6px;flex-shrink:0;">' + esc(p.schoolShort || p.school || '') + '</span>';
    var title = '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;color:#1f2430;">' + esc(p.title) + '</span>';
    var score = p.total ? '<span style="color:#B71C1C;font-weight:700;font-size:13px;flex-shrink:0;">' + esc(p.total) + '分</span>' : '';
    return '<a class="banner-post" href="考研常识科普/experience/' + esc(p.id) + '.html" title="' + esc(p.title) + '">' + badge + title + score + '</a>';
  }).join('');
})();
```

- [ ] **Step 2: 在 index.html hero-stats 后插入横幅 HTML**

定位点：line 1340 `    </div>`（hero-stats 收尾）与 line 1341 空行、line 1342 `    <!-- 第二行：左侧头像... -->`。在此两行之间插入：

```html

    <!-- 信息横幅：最新经验贴 + 更新公告（桌面端显示，移动端隐藏） -->
    <style>
      .home-banner{display:flex;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:14px;box-shadow:0 1px 2px rgba(0,0,0,0.04),0 2px 8px rgba(0,0,0,0.05);padding:14px 16px;margin-bottom:12px;}
      .home-banner .hb-col{padding:0 16px;min-width:0;}
      .home-banner .hb-col:first-child{padding-left:0;}
      .home-banner .hb-col + .hb-col{border-left:1px solid #EEF0F4;}
      .home-banner .hb-title{display:flex;align-items:center;justify-content:space-between;font-size:14px;font-weight:800;color:#B71C1C;margin-bottom:8px;}
      .home-banner .hb-title .hb-more{font-size:12px;font-weight:600;color:#6b7280;text-decoration:none;}
      .home-banner .hb-title .hb-more:hover{color:#B71C1C;}
      .home-banner .hb-posts{display:grid;grid-template-columns:1fr 1fr;gap:2px 10px;}
      .home-banner a.banner-post{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:8px;text-decoration:none;min-width:0;transition:background .2s;}
      .home-banner a.banner-post:hover{background:#F8F8F6;}
      .home-banner .hb-news{list-style:none;margin:0;padding:0;}
      .home-banner .hb-news li{display:flex;align-items:center;gap:8px;font-size:13px;color:#374151;padding:4px 0;}
      .home-banner .hb-news li a{color:#374151;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .home-banner .hb-news li a:hover{color:#B71C1C;}
      .home-banner .hb-news .dot{width:6px;height:6px;border-radius:50%;background:#B71C1C;flex-shrink:0;}
      @media(max-width:768px){.home-banner{display:none;}}
    </style>
    <div class="home-banner" aria-label="首页信息">
      <!-- 左：最新上岸经验贴（JS 渲染） -->
      <div class="hb-col" style="flex:1.25;">
        <div class="hb-title">
          <span><svg class="li-ico" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg> 最新上岸经验贴</span>
          <a class="hb-more" href="考研常识科普/experience.html">查看全部 →</a>
        </div>
        <div class="hb-posts" id="bannerLatestPosts"></div>
      </div>
      <!-- 右：更新公告 -->
      <div class="hb-col" style="flex:1;">
        <div class="hb-title"><span><svg class="li-ico" viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg> 更新公告</span></div>
        <ul class="hb-news">
          <li><span class="dot"></span><a href="考研常识科普/experience.html">经验贴上新：126 篇 26 考研上岸实录</a></li>
          <li><span class="dot"></span><a href="就业相关/就业去向index.html">就业去向揭秘：覆盖扩至 151 所高校</a></li>
          <li><span class="dot"></span><a href="专业课选择/考研专业课院校查询.html">专业课参考书目：133 校 12 类方向查询上线</a></li>
          <li><span class="dot"></span><a href="复试全攻略/index.html">27 考研复试全攻略上线</a></li>
        </ul>
      </div>
    </div>
```

- [ ] **Step 3: 在 index.html defer 脚本区引入 posts-data.js + home-banner.js**

定位点：line 1779 `<script src="index.js" defer></script>`。在其上方插入：

```html
    <script src="考研常识科普/posts-data.js" defer></script>
    <script src="home-banner.js" defer></script>
```

（defer 按文档顺序执行：posts-data.js 先于 home-banner.js，保证 `window.POSTS` 就绪。）

- [ ] **Step 4: 静态自查**

- index.html 仍是 LF；横幅 HTML 的 `<style>` 与现有 Ditto 覆盖无冲突（横幅类是新增独立类名，不与 `.card` 等复用）。
- `grep -c "home-banner.js" index.html` = 1；`grep -c "bannerLatestPosts" index.html` = 1（HTML 定义）且 home-banner.js 中 = 1（读取）。

- [ ] **Step 5: 提交**

```bash
git add home-banner.js index.html
git commit -m "feat: 首页新增最新经验贴+更新公告信息横幅"
```

---

### Task 3: 验证横幅与全站

**Files:**
- Test: 8766 验证服务器 + Playwright 截图（脚本放 `C:\Users\51366\.claude\jobs\3412f358\tmp`）

- [ ] **Step 1: 启动 8766 服务器**

沿用已验证的 serve（如 `python serve.py` 或 `python -m http.server 8766`），确认 8766 可访问、8765 生产端口不动。

- [ ] **Step 2: 桌面 1440 截图验证**

Playwright（`D:/claude_workspace/kaoyan-site-v2/node_modules`、浏览器 `D:/claude_workspace/.playwright-browsers`）在 1440 视口截首页：
- 横幅可见：`document.querySelector('.home-banner')` 非空、`display !== 'none'`；
- 左栏渲染出 4 条 `.banner-post`，文本含末尾 4 条（post-227~230，均「南京邮电大学 …」）；
- 4 条公告链接存在；任一帖子/公告 href 可打开（`页面状态 200`）；
- 控制台无报错。

- [ ] **Step 3: 移动 390 验证横幅隐藏**

Playwright 390×844 视口：`.home-banner` 计算样式 `display === 'none'`；首页其余元素（学校卡片、底部 dock）不受影响，控制台无报错。

- [ ] **Step 4: 经验贴页回归**

打开 `考研常识科普/experience.html`：卡片数量 = 126，搜索「南京邮电」能过滤出南邮帖子；点开一张卡片进入 `experience/post-101.html` 详情页 200。

- [ ] **Step 5: 全量页面冒烟（改动波及检查）**

首页 + 经验贴列表 + 任一详情页 + 就业去向首页 + 专业课查询页 + 复试全攻略 均 200。

- [ ] **Step 6: 提交验证脚本产物与截图（可选）或仅汇总**

验证通过后向用户汇报截图路径与结论，无需提交脚本。
