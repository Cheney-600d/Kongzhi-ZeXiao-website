-- 27考研院校录取数据库 · MySQL 8.x 建表语句
-- 数据源：27考研择校宝典_录取数据表_0815.xlsx（132所高校 / 152个专业方向 / 530条记录）

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

-- 专业课科目元信息（查询页首页科目卡片）
CREATE TABLE IF NOT EXISTS subject_meta (
  subject_name VARCHAR(64) NOT NULL,
  bg_gradient VARCHAR(255) DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (subject_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='专业课科目元信息';

-- 学校-专业课-层次-代码-地区
CREATE TABLE IF NOT EXISTS exam_subjects (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject_name VARCHAR(64) NOT NULL,
  school_name VARCHAR(64) NOT NULL,
  tier VARCHAR(16) NOT NULL,
  region VARCHAR(32) DEFAULT NULL,
  codes_json TEXT,
  PRIMARY KEY (id),
  UNIQUE KEY uk_subject_school_tier (subject_name, school_name, tier),
  KEY idx_subject_school (school_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='专业课学校科目';

-- 学校-初试参考书目
CREATE TABLE IF NOT EXISTS reference_books (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  school_name VARCHAR(64) NOT NULL,
  book_text TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_book_school (school_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='初试参考书目';


-- 内容数据：经验贴 / 校招岗位 / 资料课程
CREATE TABLE IF NOT EXISTS experience_posts (
  id VARCHAR(64) NOT NULL,
  title TEXT,
  school VARCHAR(64),
  school_short VARCHAR(32),
  code VARCHAR(32),
  total VARCHAR(16),
  subject_score VARCHAR(16),
  author VARCHAR(64),
  year VARCHAR(16),
  level VARCHAR(16),
  category VARCHAR(64),
  undergrad VARCHAR(32),
  c1 VARCHAR(16),
  c2 VARCHAR(16),
  ct VARCHAR(16),
  yc1 VARCHAR(16),
  yc2 VARCHAR(16),
  lc VARCHAR(16),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考研经验贴';

CREATE TABLE IF NOT EXISTS job_posts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  company VARCHAR(128) NOT NULL,
  date VARCHAR(32),
  deadline VARCHAR(64),
  positions TEXT,
  note TEXT,
  apply_url VARCHAR(512),
  notice_url VARCHAR(512),
  types_json TEXT,
  industries_json TEXT,
  locations_json TEXT,
  grades_json TEXT,
  exam_json TEXT,
  PRIMARY KEY (id),
  KEY idx_job_company (company)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='校招岗位';

CREATE TABLE IF NOT EXISTS course_resources (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(128) NOT NULL,
  category VARCHAR(128),
  images_json TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_resource_title (title)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='资料课程画廊';

