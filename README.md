# 控制工程考研择校网站 · AI 接手指南

> 本文档是给后续接手开发的人/AI（如 Codex、Claude）看的快速上手说明。
> **定位**：面向抖音私域引流业务的「控制工程考研择校」信息站。
> **技术栈**：纯静态站 —— HTML + 原生 JS + ECharts/Chart.js + Tailwind，**无后端、无数据库、无构建步骤**。
> 当前数据：**491 条记录 / 129 所学校**（`kaoyan_data.js`）。

---

## 一、快速上手（5 分钟跑起来）

```bash
cd C:\Users\51366\kaoyan-site-template
python serve.py 8000     # 静态文件服务 + 禁用缓存（避免浏览器缓存旧数据）
```

浏览器打开 `http://127.0.0.1:8000`。

- 也可以双击桌面《启动择校网站.bat》（等价，且自动开浏览器）。
- 改动数据/代码后无需重启服务器，**浏览器 Ctrl+F5 强刷**即可看到效果。
- 资源已全部本地化在 `vendor/`，**完全离线可用**，无需联网。

---

## 二、关键文件地图

| 文件/目录 | 作用 | 什么时候动它 |
|---|---|---|
| `index.html` | 首页单页应用（HTML 结构 + 样式变量） | 改页面结构、品牌文案、**表格列宽(colgroup)**、主题色(`#B8A4D8` 等 CSS 变量) |
| `index.js` | 全部渲染与交互（原生 JS + ECharts） | 改表格逻辑、筛选、热度榜、详情面板、图表 |
| `kaoyan_data.js` | 首页主表数据（`window.KAOYAN_DATA`） | **改学校/分数数据**（也由脚本生成，见第四节） |
| `zexiaobao_data.js` | 择校宝分数分布（详情面板直方图） | 由 `generate_zexiaobao_data.py` 生成，勿手改 |
| `school_detail_data.js` | 院校弹窗/详情文字数据（简介、学科评估） | 改弹窗文字 |
| `school_distributions.js` | 每校每方向分数分布 | 由 `generate_school_distributions.py` 生成 |
| `school_detail/*.html` | 每所学校独立详情页（129 所） | 由脚本生成，勿手改 |
| `vendor/` | 本地化的全部第三方库（ECharts/Chart.js/Tailwind/字体） | 一般不动 |
| 各 `.py` | 数据生成管线（见第四节） | 数据源更新时 |
| 内容目录 | `就业相关/ 专业课选择/ AI课程/ 考研常识科普/ 本科指南/ 复试全攻略/ 导师资料/` 等 | 编辑型子站内容 |

---

## 三、数据模型（重要）

### 3.1 `KAOYAN_DATA` 结构

`window.KAOYAN_DATA` 含：`records`（491 条）、`schoolColleges`（学校→学院）、`schoolStats`（学校级聚合）、`columns` 等。

`records` 每行是一个**数组**，`columns` 字段定义了索引含义：

| 索引 | 字段 | 含义 | 备注 |
|---|---|---|---|
| 0 | province | 省份 | |
| 1 | school | 学校 | |
| 2 | college | 学院 | 如 "013 精密仪器系" |
| 3 | majorCode | 专业代码 | |
| 4 | majorName | 专业方向 | |
| 5 | enterNum | 进复试人数 | **数据源缺口，多为 null** |
| 6 | admitNum | 拟录取人数 | **数据源缺口，多为 null** |
| 7 | ratio | 复录比 | 如 1.33 |
| 8-11 | enterMax/Min/Mid/Avg | 进复试最高/最低/中位/平均 | |
| 12-15 | admitMax/Min/Avg/Mid | 录取最高/最低/平均/中位 | |
| 16-19 | courseMax/Min/Avg/Mid | 专业课最高/最低/平均/中位 | |
| 20 | mathAvg | 数学平均 | |
| 21-23 | math / english / course2 | 数学/英语/业务课二科目名 | |
| 24 | tier | 院校层级（985/211/双一流/普通） | |

`schoolStats`（学校级）字段：`enter/admit` 多数为 0（数据缺口）；`avgEnter/avgAdmit/avgCourse/ratio` 大部分有值（129 校中 105-124 校非 0）。

### 3.2 首页表格的"未选方向占位"逻辑（近期改动，别弄坏）

首页表格有 5 个数据列：**进复试、拟录取、复录比、录取均分、专业课均分**（class：`row-enter/row-admit/row-ratio/row-avgadmit/row-avgcourse`）。

- **未选具体方向**（含选"全部"）→ 5 列显示**柔和占位**：进复试列文字"选方向查看"，其余列"—"，颜色 `#c9c9de`、小字号。逻辑在 `index.js` 的 `setRowPlaceholder()`。
- **已选具体方向** → 必须调用 `clearRowPlaceholder()` **清除占位的内联样式**，再填真实数据，恢复醒目的 `scoreClass`/`ratioClass` 配色。逻辑在 `applyRowSelect()`。
- 两个函数都遍历 5 列操作 `td.style.color/fontSize/fontWeight/whiteSpace`，改动时注意**成对出现**。

### 3.3 表格布局规则（防文字遮挡）

- 列宽由 `index.html` 的 **`<colgroup>`** 控制（约 1282 行起）。表格是 `table-layout:auto` + 定宽 1024px 容器，**`min-width`/`width` 写在 td 上无效**，只能改 colgroup。
- 当前列宽：层级54 / 省份85 / 学校170 / 院校信息105 / 学院112 / 专业方向160 / 数据列42×5 / ⭐48。
- 表级 `white-space:nowrap`，长校名会溢出：`index.js` 的 `schoolNameHtml()` 会把带括号校名（如"华北电力大学（北京）"）的括号部分用小字号弱化；学校列 td 设了 `white-space:normal` 兜底极端长名换行。
- 5 个数据列表头设了 `white-space:normal;font-size:12px` 防止"录取均分"等 4 字表头溢出。

### 3.4 分数数据口径（改数据/生成脚本时必读）

- **录取均分**：优先取宝典分数段表"总计"行的总分均分，并校验必须落在 `[录取最低, 录取最高]` 区间内，否则回退或置空。
- **学校级录取均分/专业课均分**：`Σ(各方向录取人数 × 该方向均分) ÷ 总录取人数`（按录取人数加权）。
- 缺失分数用 `zexiaobao_data.js`（parquet 个人分数）补全。
- 初试分合理性过滤：100-500 分，解析拼凑值（如 4185）自动置空。
- 已知缺口：进复试/拟录取**人数**（enterNum/admitNum）多数为 null，页面显示"-"或占位，属数据源本身缺失，勿强行编造。

---

## 四、数据更新管线（宝典/Excel → 网站）

数据源头有两个，二选一（都用过，都可用）：

**管线 A：Word 宝典 → 结构化 JSON → 站点数据**
```bash
# 1. 抽取 Word 文本（命令见 parse_zxb.py 头部注释）→ zxb_text.txt
# 2. 解析为结构化 JSON
python parse_zxb.py                       # → zxb_parsed.json（每校：简介/学院/专业/复试线/录取分析等）
# 3. 生成站点数据
python generate_kaoyan_data.py            # → kaoyan_data.js（records/columns/schoolStats/provinceStats 等）
# 4. 生成独立详情页（如需要）
python generate_school_detail_pages.py    # → school_detail/<学校>.html
python generate_school_distributions.py   # → school_distributions.js（详情面板分数分布图）
```

**管线 B：Excel 录取数据表 → 站点数据**
```bash
python convert_excel_data.py              # 桌面《27考研择校宝典_录取数据表.xlsx》→ kaoyan_data.js
```

**管线 C：parquet 原始分数 → 择校宝分布**
```bash
python generate_zexiaobao_data.py         # 27择校宝典原始数据/data_reports/*.parquet → zexiaobao_data.js
```

> 注意：各生成脚本之间有关联（如 `generate_kaoyan_data.py` 依赖 `parse_zxb.py` 的 JSON）。改完重新生成后，跑一下 `node --check kaoyan_data.js` 确认语法，再刷浏览器看效果。

---

## 五、常见开发任务速查

| 任务 | 怎么做 |
|---|---|
| 改某校某方向的分数 | 直接改 `kaoyan_data.js` 对应行（注意 3.1 的列索引），无需跑脚本 |
| 全量更新数据 | 用第四节管线，改完 `node --check` 验证 |
| 改品牌文案/标题/联系方式 | `index.html`（页面骨架）+ `index.js`（如 `COURSE_CATEGORIES` 等 JS 文案）+ `school_detail_data.js`（弹窗文字） |
| 改表格列宽/防遮挡 | 只改 `index.html` 的 `<colgroup>`，别在 td 上写 min-width（无效） |
| 新增子页面 | 参考现有栏目页（如 `院校PK.html`）结构，资源从 `vendor/` 引用，保持离线可用 |
| 本地测试 | `python serve.py 8000` + 浏览器 Ctrl+F5 强刷 |

---

## 六、已知事项与坑

- **未选方向占位**：见 3.2，`setRowPlaceholder`/`clearRowPlaceholder` 必须成对，选方向后不清除会一直灰色（已修过一次，别再犯）。
- **校徽图片**：约 30 所学校校徽在原站就 404，页面靠 `onerror` 隐藏，视觉无影响，属预存在问题。
- **坏页**：`AI课程/ai-course-overview/module1-ai-basics/slides.html` 结构性损坏（含裸 `</script>`），原站线上同样无法初始化，如需使用自行重写。
- **版权**：本目录源自 www.txkyer.cn 的首页镜像（@一只通信考研的er），数据/图片版权归原站作者，本地自用没问题，公开发布前需确认授权。
- **CDN 已全部本地化**：`vendor/` 274 个文件，全站断网可用（已用 Playwright 38/38 验证）。

---

## 七、git 工作流约定

- 仓库已初始化（`main` 分支），首次提交 `c15f7e8` 包含 1418 个文件。
- **日常开发流**：改完一批 → `git add -A` → `git commit -m "本次改了什么"`（中文，说清改了什么）。随时 `git log` 看历史，`git checkout -- 文件` 回滚。
- `.gitignore` 已排除：`__pycache__/`、`_backup_*/`、`_tmp_*`、`*.pyc`。**备份由 git 承担，别再手动复制日期备份文件夹**。
- 提交身份当前为占位 `51366 <51366@local>`，将来推远程前请换成真实 name/email（`git config user.name/email`）。
- **将来部署**：纯静态站，国内轻量服务器 + Nginx 即可（需 ICP 备案）；或 Gitee/GitHub 私有仓库 → 服务器 `git pull`。
