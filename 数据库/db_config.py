# -*- coding: utf-8 -*-
"""数据库配置读取与 MySQL 连接辅助。"""
import json
import pathlib

CFG_PATH = pathlib.Path(__file__).with_name('config.json')


def load_config():
    if CFG_PATH.exists():
        try:
            return json.loads(CFG_PATH.read_text(encoding='utf-8'))
        except Exception:
            return {}
    return {}


def is_mysql():
    return str(load_config().get('db_type') or 'sqlite').lower() == 'mysql'


def mysql_config():
    cfg = load_config()
    return cfg.get('mysql') or {}


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
