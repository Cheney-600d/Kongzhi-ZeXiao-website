# -*- coding: utf-8 -*-
"""数据库配置读取与 MySQL 连接辅助。"""
import json
import os
import pathlib

CFG_PATH = pathlib.Path(__file__).with_name('config.json')


def sqlite_path():
    """返回 SQLite 文件位置；生产环境可放到仓库外的持久化目录。"""
    configured = os.environ.get('KAOYAN_SQLITE_PATH', '').strip()
    if configured:
        return pathlib.Path(configured).expanduser().resolve()
    return pathlib.Path(__file__).with_name('admission.db')


def load_config():
    if CFG_PATH.exists():
        try:
            return json.loads(CFG_PATH.read_text(encoding='utf-8'))
        except Exception:
            return {}
    return {}


def is_mysql():
    db_type = os.environ.get('KAOYAN_DB_TYPE') or load_config().get('db_type') or 'sqlite'
    return str(db_type).lower() == 'mysql'


def mysql_config():
    cfg = load_config()
    result = dict(cfg.get('mysql') or {})
    env_keys = {
        'host': 'KAOYAN_DB_HOST',
        'port': 'KAOYAN_DB_PORT',
        'user': 'KAOYAN_DB_USER',
        'password': 'KAOYAN_DB_PASSWORD',
        'database': 'KAOYAN_DB_NAME',
        'charset': 'KAOYAN_DB_CHARSET',
    }
    for key, env_name in env_keys.items():
        if env_name in os.environ:
            result[key] = os.environ[env_name]
    return result


def mysql_connect():
    import pymysql
    mc = mysql_config()
    return pymysql.connect(
        host=mc.get('host', '127.0.0.1'),
        port=int(mc.get('port', 3306)),
        user=mc.get('user', 'root'),
        password=mc.get('password', ''),
        database=mc.get('database', 'kaoyan_admission'),
        charset=mc.get('charset', 'utf8mb4'),
        autocommit=False,
    )
