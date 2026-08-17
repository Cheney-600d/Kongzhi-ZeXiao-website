-- 27考研院校录取数据库 · MySQL 8.x 建表语句
-- 数据源：27考研择校宝典_录取数据表_0815.xlsx（132所高校 / 155个专业方向 / 531条记录）

CREATE DATABASE IF NOT EXISTS kaoyan_admission DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE kaoyan_admission;

-- 院校主表
CREATE TABLE IF NOT EXISTS schools (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL COMMENT '学校名称',
  province VARCHAR(32) DEFAULT NULL COMMENT '省份（后续补充）',
  tier VARCHAR(16) DEFAULT NULL COMMENT '层次：985/211/双一流/普通',
  logo_url VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_school_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='院校';

-- 专业方向主表
CREATE TABLE IF NOT EXISTS majors (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(16) NOT NULL COMMENT '专业代码，如 085400 / 0802J1',
  name VARCHAR(128) NOT NULL COMMENT '专业名称+方向，如 电子信息01超精密技术',
  full_text VARCHAR(160) NOT NULL COMMENT 'Excel 原始专业名称',
  PRIMARY KEY (id),
  UNIQUE KEY uk_major_code_name (code, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='专业方向';

-- 录取数据主表（一年一版，用 year 区分）
CREATE TABLE IF NOT EXISTS admissions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  year SMALLINT UNSIGNED NOT NULL DEFAULT 2027 COMMENT '考研年份',
  school_id INT UNSIGNED NOT NULL,
  major_id INT UNSIGNED NOT NULL,
  college VARCHAR(128) DEFAULT NULL COMMENT '学院名称',
  planned_enrollment INT DEFAULT NULL COMMENT '目录拟招生人数',
  retest_count INT DEFAULT NULL COMMENT '进复试人数',
  admitted_count INT DEFAULT NULL COMMENT '拟录取人数',
  retest_ratio DECIMAL(5,2) DEFAULT NULL COMMENT '复录比',
  retest_max_score DECIMAL(5,1) DEFAULT NULL COMMENT '进复试最高分',
  retest_min_score DECIMAL(5,1) DEFAULT NULL COMMENT '进复试最低分',
  retest_avg_score DECIMAL(5,1) DEFAULT NULL COMMENT '进复试平均分',
  retest_politics_avg DECIMAL(5,1) DEFAULT NULL COMMENT '进复试政治均分',
  retest_english_subject VARCHAR(32) DEFAULT NULL COMMENT '英语科目',
  retest_english_avg DECIMAL(5,1) DEFAULT NULL COMMENT '进复试英语均分',
  retest_math_subject VARCHAR(32) DEFAULT NULL COMMENT '数学科目',
  retest_math_avg DECIMAL(5,1) DEFAULT NULL COMMENT '进复试数学均分',
  retest_prof_subject VARCHAR(64) DEFAULT NULL COMMENT '专业课科目',
  retest_prof_avg DECIMAL(5,1) DEFAULT NULL COMMENT '进复试专业课均分',
  admitted_max_score DECIMAL(5,1) DEFAULT NULL COMMENT '录取最高分',
  admitted_min_score DECIMAL(5,1) DEFAULT NULL COMMENT '录取最低分',
  admitted_avg_score DECIMAL(5,1) DEFAULT NULL COMMENT '录取平均分',
  admitted_politics_avg DECIMAL(5,1) DEFAULT NULL COMMENT '拟录取政治均分',
  admitted_english_subject VARCHAR(32) DEFAULT NULL COMMENT '拟录取英语科目',
  admitted_english_avg DECIMAL(5,1) DEFAULT NULL COMMENT '拟录取英语均分',
  admitted_math_subject VARCHAR(32) DEFAULT NULL COMMENT '拟录取数学科目',
  admitted_math_avg DECIMAL(5,1) DEFAULT NULL COMMENT '拟录取数学均分',
  admitted_prof_subject VARCHAR(64) DEFAULT NULL COMMENT '拟录取专业课科目',
  admitted_prof_avg DECIMAL(5,1) DEFAULT NULL COMMENT '拟录取专业课均分',
  source_file VARCHAR(128) DEFAULT NULL COMMENT '来源文件',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_year_school (year, school_id),
  KEY idx_school (school_id),
  KEY idx_major (major_id),
  CONSTRAINT fk_admission_school FOREIGN KEY (school_id) REFERENCES schools(id),
  CONSTRAINT fk_admission_major FOREIGN KEY (major_id) REFERENCES majors(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='录取数据';
