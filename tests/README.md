# 测试说明

所有测试从仓库根目录运行，不需要常驻服务。

| 脚本 | 依赖 | 说明 |
|---|---|---|
| `python tests/test_api.py` | 无（标准库） | 直接调用 `数据库/api.py` 各查询函数 |
| `python tests/test_server_auth.py` | 无（标准库） | 自动拉起 `serve.py`，验证后台导入鉴权 |
| `python tests/test_mobile_pages.py` | playwright | 自动拉起 `serve.py`，390px 手机端溢出回归 |

## 首次准备（手机端测试）

```bash
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
```

## 一键全部运行

```bash
python tests/test_api.py
python tests/test_server_auth.py
python tests/test_mobile_pages.py
```

Windows PowerShell 可用：

```powershell
python tests/test_api.py; python tests/test_server_auth.py; python tests/test_mobile_pages.py
```
