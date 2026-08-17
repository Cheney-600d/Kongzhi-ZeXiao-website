# 院校录取数据库

数据源：`raw/27考研择校宝典_录取数据表_0815.xlsx`（132 所高校 / 155 个专业方向 / 531 条记录）

## 文件说明
- `schema_mysql.sql`：MySQL 8 建表语句（线上用）
- `import_admission.py`：导入脚本（本地 SQLite / 线上 MySQL）
- `api.py`：查询 API（无第三方依赖，供 serve.py 或 Flask/FastAPI 调用）
- `admission.db`：SQLite 数据库（导入后生成）
- `schools.csv` / `majors.csv` / `admissions.csv`：导出的扁平数据

## 查询 API
根目录 `python serve.py 8767` 已内置以下接口：

| 接口 | 参数 | 说明 |
|---|---|---|
| `/api/summary` | 无 | 统计摘要（学校/专业/记录数 + Top5 学校） |
| `/api/schools` | `q` 校名模糊搜索 | 院校列表 |
| `/api/majors` | `school`、`code` | 专业方向列表 |
| `/api/admissions` | `school`、`major_code`、`year`、`page`、`page_size` | 录取数据（分页） |

示例：
```bash
curl "http://127.0.0.1:8767/api/admissions?school=清华大学&major_code=085400&page=1&page_size=10"
```

返回格式：`{"code":0,"data":{"items":[...],"page":1,"page_size":10,"total":...,"total_pages":...}}`

## 本地使用
```bash
cd 数据库
python import_admission.py
```
生成 `admission.db` 和三个 CSV。

## 上线 MySQL
1. 先执行 `schema_mysql.sql` 建库建表
2. `pip install pymysql openpyxl`
3. 导入：
```bash
python import_admission.py --mysql --host 127.0.0.1 --port 3306 --user root --password xxx --database kaoyan_admission
```

## 后台导入页面
本地启动 `python serve.py 8767` 后，打开：

```
http://127.0.0.1:8767/数据库/admin.html
```

选择最新版 `27考研择校宝典_录取数据表_XXXX.xlsx` 上传即可重建 SQLite 数据库并刷新 CSV。

> 导入接口为 `POST /api/admin/import-admission`（接收 JSON：`{"filename":"xxx.xlsx","base64":"..."}`）。
> 上线服务器时请给该接口加登录鉴权，不要直接暴露到公网。

## 核心表
- `schools`：院校
- `majors`：专业方向
- `admissions`：录取数据（year 区分年份）

## 后续更新
- 每年新数据：新增 `year` 记录，不覆盖旧年份
- 用管理后台或 Excel 导入更新
- 建议每行保留 `source_file` 和 `created_at`，方便追溯
