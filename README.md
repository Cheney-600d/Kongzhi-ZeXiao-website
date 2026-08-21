# 控制考研择校与复试网站

面向控制类考研的一站式信息站：院校录取数据、专业课查询、就业信息、复试全攻略、面试题库。

- **技术栈**：纯静态 HTML + 原生 JS + ECharts/Chart.js/Tailwind；本地开发用 Python 标准库 `serve.py`；数据层支持 SQLite / MySQL（可切换）
- **运行环境**：Windows / Linux 均可，Python 3.9+
- **离线可用**：第三方库已本地化在 `vendor/`，断网可访问

---

## 快速启动

```bash
python serve.py 8767
```

浏览器打开 `http://127.0.0.1:8767`。

- 首页：`index.html`
- 专业课院校查询：`专业课选择/考研专业课院校查询.html`
- 复试全攻略：`复试全攻略/index.html`
- 复试面试题库：`复试全攻略/面试题库.html`
- 后台数据导入：`数据库/admin.html`

改动 HTML/CSS/JS 后无需重启，浏览器 `Ctrl+F5` 强刷即可。

---

## 生产环境 API

```bash
# 生产推荐：FastAPI + Uvicorn
export KAOYAN_ADMIN_TOKEN="你的强密码"
uvicorn api_app:app --host 127.0.0.1 --port 8000
```

- `api_app.py` 提供 `/api/*` 查询接口和 `POST /api/admin/import-admission` 后台导入接口
- 静态文件交给 Nginx，API 反向代理到 `127.0.0.1:8000`
- 详细部署见 `docs/部署.md`

---

## 站点结构

| 目录/文件 | 说明 |
|---|---|
| `index.html` / `index.js` / `kaoyan_data.js` | 首页与择校主数据 |
| `专业课选择/` | 专业课院校查询、资料与课程 |
| `复试全攻略/` | 复试时间线、笔试、面试、导师、项目、调剂、面试题库 |
| `就业相关/` | 就业去向、校招信息、就业分析 |
| `考研常识科普/` | 考研常识、上岸经验贴 |
| `数据库/` | SQLite 数据库、API、导入脚本、后台管理页 |
| `tools/` | 备份脚本 |
| `tests/` | 自动化测试 |
| `docs/部署.md` | 服务器部署指南 |

---

## 数据与数据库

### 主要数据

| 数据 | 来源 | 数量 |
|---|---|---|
| 院校录取数据 | `27考研择校宝典_录取数据表_0815.xlsx` | 530 条 / 133 校 / 152 专业 |
| 专业课科目/参考书 | 从查询页提取 | 7 门 / 146 条 / 461 本书 |
| 经验贴 | `考研常识科普/posts-data.js` | 126 条 |
| 校招岗位 | `就业相关/job-listing` | 136 条 |
| 资料课程 | `专业课选择/资料和课程.html` | 8 个分类 |
| 复试面试题库 | 桌面《26宝典C：万人教育控制复试面试宝典.docx》 | 1485 题 |

### SQLite 数据库

文件：`数据库/admission.db`

表：`schools`、`majors`、`admissions`、`subject_meta`、`exam_subjects`、`reference_books`、`experience_posts`、`job_posts`、`course_resources`

### API 接口

由 `数据库/api.py` 提供，`serve.py` 挂载：

| 接口 | 说明 |
|---|---|
| `/api/summary` | 统计数据（学校/专业/记录/省份/科目数） |
| `/api/schools?q=` | 院校列表（含省份/层次/校徽） |
| `/api/majors?school=&code=` | 专业方向 |
| `/api/admissions?school=&major_code=&year=&page=&page_size=` | 录取数据分页 |
| `/api/subjects` | 专业课科目 |
| `/api/exam-subjects?school=` | 学校-专业课 |
| `/api/books?school=` | 参考书目 |
| `/api/posts` | 经验贴（筛选/搜索/分页） |
| `/api/jobs` | 校招岗位（筛选/搜索/分页） |
| `/api/resources` | 资料课程画廊 |

### 数据源切换

`数据库/config.json`：

```json
{
  "db_type": "sqlite",
  "mysql": {
    "host": "127.0.0.1",
    "port": 3306,
    "user": "root",
    "password": "",
    "database": "kaoyan_admission",
    "charset": "utf8mb4"
  }
}
```

- 本地开发保持 `sqlite`
- 服务器部署改为 `mysql`，并 `pip install pymysql`，表结构见 `数据库/schema_mysql.sql`

### 数据导入

```bash
# SQLite（本地开发）
python 数据库/import_admission.py
python 数据库/import_subjects.py
python 数据库/import_content.py

# MySQL（服务器，读取 数据库/config.json 的 mysql 配置）
python 数据库/import_admission.py --mysql
python 数据库/import_subjects.py --mysql
python 数据库/import_content.py --mysql
```

后台页面 `数据库/admin.html` 可上传 Excel 自动导入录取数据；系统会根据 `config.json` 自动选择写 SQLite 还是 MySQL。

---

## 后台导入与鉴权

- 未设置 `KAOYAN_ADMIN_TOKEN`：仅本机回环可访问导入接口
- 设置后：`POST /api/admin/import-admission` 必须携带请求头 `X-Admin-Token`

```bash
# Windows PowerShell
$env:KAOYAN_ADMIN_TOKEN="你的强密码"
python serve.py 8767
```

---

## 测试

```bash
python tests/test_api.py
python tests/test_server_auth.py
python tests/test_mobile_pages.py
```

- `test_api.py`：API 函数直连测试
- `test_server_auth.py`：后台导入鉴权测试
- `test_mobile_pages.py`：390px 手机端溢出回归（需 playwright）

手机端测试首次准备：

```bash
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
```

---

## 备份

```bash
python tools/backup.py
```

默认生成 `backups/kaoyan-backup-时间戳.zip`，包含数据库、CSV、原始 Excel/JSON、配置与表结构。

---

## 部署

见 `docs/部署.md`，包含：

- 环境要求
- MySQL 建库建表与数据导入
- `serve.py` + Nginx + HTTPS
- systemd 守护
- 备份与常见问题

---

## Git 工作流

- 分支：`main`
- 提交信息用中文，说明本次改动
- 每次完成一个功能后：

```bash
git add -A
git commit -m "本次改动说明"
git push origin main
```

- `.gitignore` 已排除：`__pycache__/`、`backups/`、`.dsh/`、`数据库/raw/20*.xlsx` 等
