# -*- coding: utf-8 -*-
"""kaoyan-site 数据备份脚本。

用法：
    python tools/backup.py                # 备份到 仓库根目录/backups/
    python tools/backup.py --output /backup/kaoyan

打包内容：
    - 数据库/admission.db
    - 数据库/*.csv（schools / majors / admissions / exam_subjects / reference_books）
    - 数据库/raw/ 下的源 Excel 和 JSON
    - 数据库/config.json、数据库/schema_mysql.sql

生成文件：
    backups/kaoyan-backup-YYYYmmdd_HHMMSS.zip
"""
import argparse
import datetime
import pathlib
import sys
import zipfile

REPO = pathlib.Path(__file__).resolve().parent.parent
DB_DIR = REPO / '数据库'


def main():
    ap = argparse.ArgumentParser(description='kaoyan-site 数据备份')
    ap.add_argument('--output', default=str(REPO / 'backups'), help='备份输出目录（默认仓库根目录 backups/）')
    args = ap.parse_args()

    out_dir = pathlib.Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)

    stamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    zip_path = out_dir / f'kaoyan-backup-{stamp}.zip'

    # 收集待备份文件（相对仓库根目录）
    candidates = []
    db = DB_DIR / 'admission.db'
    if db.exists():
        candidates.append(db)
    for csv in sorted(DB_DIR.glob('*.csv')):
        candidates.append(csv)
    for f in sorted((DB_DIR / 'raw').glob('*')) if (DB_DIR / 'raw').exists() else []:
        if f.is_file():
            candidates.append(f)
    for name in ('config.json', 'schema_mysql.sql'):
        f = DB_DIR / name
        if f.exists():
            candidates.append(f)

    if not candidates:
        print('未找到可备份文件（数据库/admission.db 等不存在）', file=sys.stderr)
        return 2

    with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
        for f in candidates:
            arcname = f.relative_to(REPO).as_posix()
            zf.write(f, arcname)
            print(f'  + {arcname}')

    size_kb = zip_path.stat().st_size / 1024
    print(f'备份完成：{zip_path}（{size_kb:.1f} KB，共 {len(candidates)} 个文件）')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
