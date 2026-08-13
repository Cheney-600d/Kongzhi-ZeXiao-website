# 首页信息横幅 设计文档

**日期**: 2026-08-13
**范围**: 首页（index.html）桌面端排版微调——利用 hero 数据亮点条与导航行之间的空白，插入一条全宽信息横幅。

## 背景与目标

用户希望调整电脑端首页布局，但**不改动**左表右栏的核心结构。当前 hero 区下方有一块空白。目标：
1. 填补空白，让首页更饱满、有信息量。
2. 沉淀一份可复用的经验贴数据源，首页横幅与经验贴列表页共享，后续加贴一处维护、两处自动同步。

## 方案总览

- **位置**：hero-stats（`index.html` ~line 1340）下方、第二行「头像+导航+倒计时」（~line 1342）上方，全宽。
- **数据**：把 `考研常识科普/experience.html` line 242 内联的 `const POSTS = [...]`（126 条）抽取到新共享文件 `考研常识科普/posts-data.js`，experience.html 与 index.html 均引用同一文件。
- **渲染**：横幅 HTML 静态写入 index.html；新建 `home-banner.js`（defer）读取共享 `POSTS`，渲染左栏「最新经验贴」，右栏「更新公告」为静态 HTML。

## 横幅视觉（沿用 Ditto 浅色红 #B71C1C 主题）

```
```
┌──────────────────────────────────────────────────────────────┐
│ 左（flex:1.25）                    │ 右（flex:1，左分栏线）     │
│ ┌ 最新上岸经验贴 ── 查看全部 → ┐    │ ┌ 更新公告                 │
│ │ [南邮] 南京邮电大学…405     │    │ ◆ 经验贴上新：126 篇…→   │
│ │ [南邮] 南京邮电大学…396     │    │ ◆ 就业去向：扩至151所…→   │
│ │ [南邮] 南京邮电大学…413     │    │ ◆ 专业课参考书目12类…→   │
│ │ [南邮] 南京邮电大学…404     │    │ ◆ 27考研复试全攻略…→    │
│ └───────────────────────────┘    └───────────────────────────┘
└──────────────────────────────────────────────────────────────┘
注：上图按「数组末尾 4 条」如实示例（当前末尾 4 条为 post-227~230，均为南邮）；
实际内容随 posts-data.js 自动同步，不固定。
```

- 容器：白底圆角卡片（border-radius:14px、border:1px #E5E7EB、box-shadow 同 .card），`display:flex`，padding 14px 16px，margin-bottom 12px。
- 分区：左右各一块，中间 `border-left:1px solid #EEF0F4` 分隔，左块内边距 0 16px 0 0。
- 移动端：`@media(max-width:768px){ .home-info-banner{display:none;} }` 整条隐藏，不影响已完成的手机端适配。

### 左栏「最新上岸经验贴」
- 标题行：图标+「最新上岸经验贴」红字（#B71C1C，粗体 14px），右侧「查看全部 →」链接 → `考研常识科普/experience.html`。
- 帖子列表：`home-banner.js` 取 `window.POSTS.slice(-4).reverse()`（数组按收录顺序追加，末尾 4 条即最新收录），2×2 网格。
- 每条：`<a>` 整条可点 → `experience/{id}.html`。内容 = 学校徽章（小圆角药丸，按 level 配色：985 #E53935 白字 / 211 #00AEEC 白字 / 双一流 #9C27B0 白字 / 双非 #43A047 白字，显示 schoolShort）+ 标题（单行省略）+ 总分红字（有 total 时）。
- hover：背景 #F8F8F6，文字转红。

### 右栏「更新公告」（静态 4 条）
| 公告 | 链接目标 |
|---|---|
| 经验贴上新：126 篇 26 考研上岸实录 | 考研常识科普/experience.html |
| 就业去向揭秘：覆盖扩至 151 所高校 | 就业相关/就业去向index.html |
| 专业课参考书目：133 校 12 类方向查询上线 | 专业课选择/考研专业课院校查询.html |
| 27 考研复试全攻略上线 | 复试全攻略/index.html |

每条 = 菱形圆点（红）+ 文字，hover 转红，点击跳目标页。

## 数据共享设计（posts-data.js）

- 新建 `考研常识科普/posts-data.js`：内容为 `const POSTS = [...];`（原 line 242 原样，CRLF）+ 追加一行 `if (typeof window!=='undefined') window.POSTS = POSTS;`（供 index.html 的 home-banner.js 用 `window.POSTS` 读取）。
- **experience.html 改动**：删除 line 242 内联 POSTS（保留其余脚本不动）；在 line 241 `<script>` 前插入 `<script src="posts-data.js"></script>`（同步、按文档顺序先执行，保证内联脚本里 `POSTS` 全局词法绑定可用）。
- **index.html 改动**：在 `index.js`（line 1779）所在 defer 脚本区，先加 `<script src="考研常识科普/posts-data.js" defer></script>` 再加 `<script src="home-banner.js" defer></script>`（defer 按文档顺序执行，前者先于后者）。
- **边界**：`const POSTS` 在经典脚本顶层是全局词法绑定，同一页面多脚本可共享引用；`window.POSTS` 仅为 home-banner.js 防御式读取。两文件不共存于同一页面时也各自安全（experience.html 只用词法绑定，index.html 只读 window）。

## 涉及文件

| 文件 | 操作 |
|---|---|
| `考研常识科普/posts-data.js` | 新建（CRLF，内容=原 line 242 + window 挂载行） |
| `考研常识科普/experience.html` | 删 line 242；line 241 前插 script 引用（CRLF 保持） |
| `index.html` | hero-stats 后插横幅 HTML；defer 区加 2 个 script 引用 |
| `home-banner.js` | 新建（LF，与 index.js 一致），渲染左栏帖子 |
| `docs/superpowers/specs/2026-08-13-homepage-info-banner-design.md` | 本文档 |

## 不做的事（YAGNI）

- 不改左表右栏结构、不动移动端布局。
- 不给 POSTS 加日期字段、不做真时间排序（数组即收录顺序，够用）。
- 不做横幅轮播/动画/可配置后台。
- 公告保持静态 HTML，不引入数据文件。
