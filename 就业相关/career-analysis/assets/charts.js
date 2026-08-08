// career-analysis charts.js v2 - with salary & city features
(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();
  var gold = '#d4a017';

  // ==================== DATA ====================
  var regionData = [
    {"region":"北京","total":3021,"companies":2314,"avg_salary":2.25,"stacks":{"算法/AI": 847, "测试": 319, "安全": 295, "数据/大数据": 261, "产品/设计": 233, "通信/信号处理": 216, "运维/DevOps": 176, "C/C++": 168, "芯片/IC设计": 164, "前端/JavaScript": 141}},
    {"region":"上海","total":2981,"companies":2235,"avg_salary":2.18,"stacks":{"算法/AI": 803, "测试": 356, "数据/大数据": 242, "安全": 228, "产品/设计": 217, "芯片/IC设计": 195, "C/C++": 186, "运维/DevOps": 139, "通信/信号处理": 131, "前端/JavaScript": 130}},
    {"region":"深圳","total":1928,"companies":1469,"avg_salary":2.05,"stacks":{"算法/AI": 592, "测试": 310, "产品/设计": 197, "C/C++": 183, "安全": 145, "数据/大数据": 144, "芯片/IC设计": 140, "通信/信号处理": 119, "前端/JavaScript": 103, "运维/DevOps": 97}},
    {"region":"广州","total":1318,"companies":1047,"avg_salary":1.62,"stacks":{"算法/AI": 305, "产品/设计": 129, "测试": 129, "数据/大数据": 123, "安全": 107, "前端/JavaScript": 71, "C/C++": 69, "运维/DevOps": 68, "通信/信号处理": 54, "Java": 54}},
    {"region":"全国各地","total":1281,"companies":1041,"avg_salary":1.15,"stacks":{"算法/AI": 216, "安全": 172, "测试": 95, "数据/大数据": 92, "产品/设计": 77, "运维/DevOps": 69, "通信/信号处理": 53, "C/C++": 49, "芯片/IC设计": 39, "Java": 31}},
    {"region":"杭州","total":1246,"companies":961,"avg_salary":1.86,"stacks":{"算法/AI": 392, "测试": 169, "产品/设计": 137, "安全": 109, "数据/大数据": 103, "C/C++": 96, "芯片/IC设计": 77, "前端/JavaScript": 72, "Java": 67, "通信/信号处理": 58}},
    {"region":"成都","total":1069,"companies":869,"avg_salary":1.35,"stacks":{"算法/AI": 320, "测试": 163, "安全": 109, "芯片/IC设计": 108, "通信/信号处理": 98, "产品/设计": 92, "C/C++": 81, "数据/大数据": 73, "运维/DevOps": 52, "前端/JavaScript": 51}},
    {"region":"南京","total":949,"companies":746,"avg_salary":1.58,"stacks":{"算法/AI": 259, "测试": 147, "安全": 104, "产品/设计": 83, "数据/大数据": 80, "C/C++": 69, "芯片/IC设计": 64, "通信/信号处理": 64, "运维/DevOps": 63, "Java": 53}},
    {"region":"武汉","total":856,"companies":674,"avg_salary":1.22,"stacks":{"算法/AI": 264, "测试": 155, "安全": 90, "产品/设计": 90, "数据/大数据": 83, "C/C++": 77, "通信/信号处理": 66, "前端/JavaScript": 54, "运维/DevOps": 53, "芯片/IC设计": 52}},
    {"region":"西安","total":797,"companies":648,"avg_salary":1.28,"stacks":{"算法/AI": 248, "测试": 132, "安全": 91, "芯片/IC设计": 81, "通信/信号处理": 75, "产品/设计": 67, "C/C++": 66, "数据/大数据": 63, "运维/DevOps": 48, "前端/JavaScript": 45}},
    {"region":"苏州","total":683,"companies":540,"avg_salary":1.49,"stacks":{"算法/AI": 152, "测试": 112, "C/C++": 60, "产品/设计": 55, "芯片/IC设计": 53, "安全": 44, "数据/大数据": 35, "通信/信号处理": 30, "运维/DevOps": 25, "前端/JavaScript": 24}},
    {"region":"天津","total":634,"companies":517,"avg_salary":1.3,"stacks":{"算法/AI": 109, "安全": 78, "测试": 64, "通信/信号处理": 45, "产品/设计": 44, "数据/大数据": 41, "运维/DevOps": 24, "芯片/IC设计": 22, "Java": 22, "前端/JavaScript": 22}},
    {"region":"重庆","total":603,"companies":505,"avg_salary":1.18,"stacks":{"算法/AI": 140, "测试": 74, "安全": 71, "数据/大数据": 47, "运维/DevOps": 38, "通信/信号处理": 33, "产品/设计": 32, "C/C++": 25, "前端/JavaScript": 22, "芯片/IC设计": 16}},
    {"region":"合肥","total":516,"companies":416,"avg_salary":1.25,"stacks":{"算法/AI": 137, "测试": 60, "安全": 55, "数据/大数据": 41, "产品/设计": 39, "C/C++": 36, "芯片/IC设计": 36, "通信/信号处理": 31, "运维/DevOps": 23, "Java": 21}},
    {"region":"长沙","total":473,"companies":396,"avg_salary":1.2,"stacks":{"算法/AI": 132, "产品/设计": 56, "测试": 55, "安全": 53, "数据/大数据": 42, "C/C++": 29, "运维/DevOps": 28, "前端/JavaScript": 27, "通信/信号处理": 26, "Java": 22}},
  ];
  var stackNames = ["算法/AI", "测试", "安全", "数据/大数据", "产品/设计", "通信/信号处理", "C/C++", "运维/DevOps", "芯片/IC设计", "前端/JavaScript", "Java", "Android"];
  var stackColors = {};
  var palette = ["#e63946", "#457b9d", "#2a9d8f", "#e9c46a", "#f4a261", "#264653", "#e76f51", "#6d6875", "#b5838d", "#ffb4a2", "#d4a373", "#a8dadc", "#06d6a0", "#118ab2", "#073b4c"];
  stackNames.forEach(function(n,i){stackColors[n]=palette[i%palette.length]});
  var stackData = [
    {"name":"算法/AI","total":2083,"companies":1663,"regions":{"北京": 847, "上海": 803, "深圳": 592, "杭州": 392, "成都": 320, "广州": 305, "武汉": 264, "南京": 259, "西安": 248, "全国各地": 216, "苏州": 152, "重庆": 140, "合肥": 137, "长沙": 132, "天津": 109},"grades":{"2026届": 815, "2027届": 353, "2025届": 112, "2024届": 49, "2028届": 6, "海外往届": 3, "2029届": 2, "2023届": 1, "部分往届": 1},"types":{"26届秋招": 930, "春招": 731, "实习": 167, "暑期实习": 130, "秋招提前批": 52, "秋招": 51, "秋招补录": 37, "26届提前批": 27, "春招补录": 17, "人才计划": 12},"industries":{"国央企": 452, "互联网": 421, "科技": 275, "金融": 194, "制造业": 171, "半导体": 137, "事业单位": 95, "其他": 82, "外企": 76, "生物医药": 68},"salary_low":20,"salary_high":80,"salary_avg":35,"skill":"Python/C++, ML/DL框架, 数学基础, 顶会论文加分"},
    {"name":"测试","total":942,"companies":802,"regions":{"上海": 356, "北京": 319, "深圳": 310, "杭州": 169, "成都": 163, "武汉": 155, "南京": 147, "西安": 132, "广州": 129, "苏州": 112, "全国各地": 95, "重庆": 74, "天津": 64, "海外": 61, "合肥": 60},"grades":{"2026届": 355, "2027届": 98, "2025届": 28, "2024届": 10, "2023届": 1, "部分往届": 1, "海外往届": 1},"types":{"26届秋招": 496, "春招": 312, "实习": 48, "暑期实习": 37, "秋招补录": 23, "秋招": 18, "秋招提前批": 13, "26届提前批": 11, "春招补录": 10, "26届暑期实习": 2},"industries":{"互联网": 159, "科技": 151, "半导体": 127, "国央企": 127, "制造业": 108, "外企": 50, "其他": 46, "金融": 44, "生物医药": 41, "汽车新能源": 40},"salary_low":10,"salary_high":18,"salary_avg":14,"skill":"测试理论, 自动化工具(Selenium/JMeter), Linux基础"},
    {"name":"安全","total":934,"companies":840,"regions":{"北京": 295, "上海": 228, "全国各地": 172, "深圳": 145, "成都": 109, "杭州": 109, "广州": 107, "南京": 104, "西安": 91, "武汉": 90, "天津": 78, "重庆": 71, "合肥": 55, "长沙": 53, "济南": 45},"grades":{"2026届": 387, "2025届": 132, "2024届": 75, "2027届": 53, "海外往届": 4},"types":{"26届秋招": 491, "春招": 364, "实习": 22, "暑期实习": 18, "秋招": 16, "秋招补录": 10, "秋招提前批": 9, "春招补录": 4, "26届提前批": 3, "人才计划": 2},"industries":{"国央企": 479, "事业单位": 112, "互联网": 92, "金融": 58, "科技": 48, "制造业": 44, "能源": 42, "其他": 39, "建筑": 29, "汽车新能源": 26},"salary_low":15,"salary_high":25,"salary_avg":20,"skill":"网络协议, 渗透测试, 安全合规, CTF竞赛加分"},
    {"name":"数据/大数据","total":700,"companies":614,"regions":{"北京": 261, "上海": 242, "深圳": 144, "广州": 123, "杭州": 103, "全国各地": 92, "武汉": 83, "南京": 80, "成都": 73, "西安": 63, "重庆": 47, "长沙": 42, "合肥": 41, "天津": 41, "济南": 38},"grades":{"2026届": 269, "2025届": 83, "2027届": 71, "2024届": 45, "海外往届": 2, "2023届": 1},"types":{"26届秋招": 362, "春招": 241, "暑期实习": 36, "实习": 22, "秋招补录": 16, "秋招提前批": 13, "秋招": 11, "26届提前批": 6, "春招补录": 5, "人才计划": 4},"industries":{"国央企": 207, "互联网": 110, "金融": 107, "事业单位": 74, "科技": 43, "其他": 30, "外企": 30, "制造业": 27, "快消零售": 24, "汽车新能源": 20},"salary_low":15,"salary_high":30,"salary_avg":22,"skill":"SQL, Hadoop/Spark/Flink, Python, 统计学"},
    {"name":"产品/设计","total":660,"companies":576,"regions":{"北京": 233, "上海": 217, "深圳": 197, "杭州": 137, "广州": 129, "成都": 92, "武汉": 90, "南京": 83, "全国各地": 77, "西安": 67, "长沙": 56, "苏州": 55, "天津": 44, "厦门": 39, "合肥": 39},"grades":{"2026届": 241, "2027届": 73, "2025届": 31, "2024届": 13, "海外往届": 2, "2023届": 1},"types":{"26届秋招": 342, "春招": 223, "实习": 42, "暑期实习": 25, "秋招补录": 22, "26届提前批": 7, "秋招提前批": 7, "秋招": 6, "春招补录": 5, "实习生": 3},"industries":{"互联网": 162, "科技": 74, "国央企": 70, "其他": 49, "快消零售": 48, "游戏": 45, "金融": 43, "制造业": 40, "生物医药": 34, "外企": 21},"salary_low":12,"salary_high":25,"salary_avg":18,"skill":"产品思维, 用户研究, Axure/Figma, 数据分析"},
    {"name":"通信/信号处理","total":637,"companies":569,"regions":{"北京": 216, "上海": 131, "深圳": 119, "成都": 98, "西安": 75, "武汉": 66, "南京": 64, "杭州": 58, "广州": 54, "全国各地": 53, "天津": 45, "重庆": 33, "合肥": 31, "苏州": 30, "长沙": 26},"grades":{"2026届": 252, "2025届": 67, "2024届": 42, "2027届": 37},"types":{"26届秋招": 336, "春招": 232, "秋招": 20, "暑期实习": 13, "秋招提前批": 13, "秋招补录": 10, "26届提前批": 9, "实习": 8, "实习生": 1, "人才计划": 1},"industries":{"国央企": 304, "事业单位": 96, "科技": 91, "半导体": 44, "制造业": 42, "互联网": 25, "金融": 22, "汽车新能源": 18, "其他": 15, "能源": 14},"salary_low":15,"salary_high":35,"salary_avg":25,"skill":"信号处理, DSP, 5G协议, MATLAB, RF/基带"},
    {"name":"C/C++","total":554,"companies":471,"regions":{"上海": 186, "深圳": 183, "北京": 168, "杭州": 96, "成都": 81, "武汉": 77, "南京": 69, "广州": 69, "西安": 66, "苏州": 60, "全国各地": 49, "合肥": 36, "海外": 35, "长沙": 29, "厦门": 25},"grades":{"2026届": 214, "2027届": 46, "2025届": 18, "2024届": 9, "海外往届": 1, "2028届": 1, "2029届": 1},"types":{"26届秋招": 288, "春招": 193, "实习": 23, "暑期实习": 14, "秋招": 11, "春招补录": 10, "秋招补录": 8, "26届提前批": 7, "秋招提前批": 7, "实习生": 3},"industries":{"科技": 134, "互联网": 80, "制造业": 76, "半导体": 59, "国央企": 56, "金融": 30, "其他": 29, "外企": 27, "游戏": 17, "汽车新能源": 17},"salary_low":14,"salary_high":40,"salary_avg":24,"skill":"Linux系统编程, 数据结构, 操作系统, 嵌入式"},
    {"name":"运维/DevOps","total":427,"companies":374,"regions":{"北京": 176, "上海": 139, "深圳": 97, "全国各地": 69, "广州": 68, "南京": 63, "杭州": 58, "武汉": 53, "成都": 52, "西安": 48, "重庆": 38, "长沙": 28, "厦门": 25, "苏州": 25, "天津": 24},"grades":{"2026届": 174, "2025届": 42, "2027届": 28, "2024届": 14, "海外往届": 1},"types":{"26届秋招": 229, "春招": 165, "实习": 11, "暑期实习": 10, "秋招补录": 9, "秋招": 4, "26届提前批": 3, "春招补录": 3, "秋招提前批": 1},"industries":{"国央企": 144, "互联网": 69, "金融": 55, "科技": 42, "事业单位": 26, "制造业": 25, "其他": 18, "半导体": 18, "游戏": 15, "能源": 12},"salary_low":12,"salary_high":28,"salary_avg":18,"skill":"Linux, Docker/K8s, CI/CD, 网络协议, 脚本编程"},
    {"name":"芯片/IC设计","total":388,"companies":313,"regions":{"上海": 195, "北京": 164, "深圳": 140, "成都": 108, "西安": 81, "杭州": 77, "南京": 64, "苏州": 53, "武汉": 52, "全国各地": 39, "合肥": 36, "广州": 29, "珠海": 22, "天津": 22, "无锡": 22},"grades":{"2026届": 129, "2027届": 47, "2025届": 6, "2024届": 2, "2028届": 1},"types":{"26届秋招": 209, "春招": 115, "实习": 19, "秋招": 14, "暑期实习": 12, "秋招提前批": 10, "26届提前批": 5, "秋招补录": 5, "春招补录": 5, "26届暑期实习": 2},"industries":{"半导体": 152, "科技": 70, "国央企": 68, "制造业": 38, "外企": 22, "互联网": 20, "生物医药": 9, "汽车新能源": 6, "金融": 6, "其他": 5},"salary_low":15,"salary_high":50,"salary_avg":35,"skill":"Verilog/VHDL, 数字/模拟电路, FPGA, EDA工具"},
    {"name":"前端/JavaScript","total":330,"companies":281,"regions":{"北京": 141, "上海": 130, "深圳": 103, "杭州": 72, "广州": 71, "武汉": 54, "成都": 51, "南京": 47, "西安": 45, "全国各地": 30, "厦门": 28, "济南": 28, "长沙": 27, "苏州": 24, "福州": 23},"grades":{"2026届": 121, "2027届": 44, "2025届": 18, "2024届": 11},"types":{"26届秋招": 162, "春招": 100, "实习": 31, "暑期实习": 14, "秋招补录": 11, "26届提前批": 9, "秋招": 6, "秋招提前批": 6, "春招补录": 2, "实习生": 1},"industries":{"互联网": 122, "科技": 41, "国央企": 37, "金融": 34, "半导体": 23, "游戏": 19, "制造业": 14, "教育": 12, "外企": 10, "快消零售": 7},"salary_low":12,"salary_high":23,"salary_avg":17,"skill":"HTML/CSS/JS, React/Vue, TypeScript, 工程化"},
    {"name":"Java","total":257,"companies":218,"regions":{"北京": 123, "上海": 91, "深圳": 77, "杭州": 67, "广州": 54, "南京": 53, "成都": 41, "西安": 35, "武汉": 33, "全国各地": 31, "福州": 30, "济南": 26, "长沙": 22, "天津": 22, "合肥": 21},"grades":{"2026届": 100, "2027届": 23, "2025届": 12, "2024届": 3, "海外往届": 2},"types":{"26届秋招": 134, "春招": 92, "暑期实习": 12, "实习": 11, "秋招补录": 8, "26届提前批": 3, "春招补录": 2, "秋招提前批": 2, "秋招": 2, "春招提前批": 1},"industries":{"互联网": 104, "科技": 46, "国央企": 31, "金融": 22, "制造业": 16, "其他": 10, "游戏": 7, "外企": 7, "教育": 6, "半导体": 4},"salary_low":15,"salary_high":25,"salary_avg":20,"skill":"Java基础, Spring生态, 微服务, 数据库, 分布式"},
    {"name":"Android","total":85,"companies":73,"regions":{"深圳": 38, "北京": 23, "上海": 23, "武汉": 15, "杭州": 13, "西安": 12, "南京": 12, "成都": 11, "广州": 10, "海外": 9, "福州": 7, "全国各地": 7, "香港": 7, "长沙": 6, "合肥": 6},"grades":{"2026届": 35, "2027届": 5, "2025届": 2, "2024届": 1, "海外往届": 1},"types":{"26届秋招": 47, "春招": 29, "实习": 3, "26届提前批": 2, "秋招": 2, "实习生": 1, "秋招补录": 1, "春招补录": 1},"industries":{"互联网": 30, "科技": 17, "制造业": 8, "金融": 7, "汽车新能源": 6, "国央企": 5, "游戏": 4, "其他": 3, "半导体": 3, "教育": 2},"salary_low":12,"salary_high":22,"salary_avg":16,"skill":"Kotlin/Java, Android SDK, 移动架构, 性能优化"},
    {"name":"数据库","total":43,"companies":38,"regions":{"北京": 22, "广州": 12, "上海": 11, "成都": 10, "全国各地": 8, "重庆": 7, "杭州": 7, "南京": 6, "深圳": 6, "武汉": 6, "天津": 5, "苏州": 5, "福州": 4, "长沙": 4, "西安": 4},"grades":{"2026届": 19, "2025届": 3, "2027届": 3, "2024届": 2},"types":{"26届秋招": 22, "春招": 19, "实习": 1, "暑期实习": 1, "秋招提前批": 1},"industries":{"互联网": 11, "国央企": 10, "金融": 8, "科技": 5, "事业单位": 5, "快消零售": 2, "游戏": 2, "能源": 1, "生物医药": 1, "半导体": 1},"salary_low":12,"salary_high":20,"salary_avg":16,"skill":"-"},
    {"name":"Python","total":43,"companies":34,"regions":{"北京": 22, "上海": 22, "深圳": 13, "广州": 10, "成都": 8, "南京": 8, "杭州": 8, "武汉": 7, "苏州": 6, "福州": 5, "合肥": 5, "天津": 5, "西安": 4, "全国各地": 4, "海口": 3},"grades":{"2026届": 16, "2027届": 3, "2025届": 2, "2028届": 1, "2029届": 1},"types":{"26届秋招": 25, "春招": 14, "暑期实习": 2, "秋招补录": 1, "实习": 1},"industries":{"科技": 14, "互联网": 12, "金融": 5, "半导体": 4, "国央企": 3, "汽车新能源": 2, "中外合资": 2, "制造业": 1, "游戏": 1, "外企": 1},"salary_low":12,"salary_high":20,"salary_avg":16,"skill":"-"},
    {"name":"iOS","total":40,"companies":35,"regions":{"深圳": 17, "上海": 11, "北京": 11, "杭州": 8, "南京": 7, "武汉": 6, "广州": 5, "成都": 4, "重庆": 3, "香港": 3, "苏州": 2, "西安": 2, "长沙": 2, "惠州": 1, "扬州": 1},"grades":{"2026届": 14, "2027届": 3, "2025届": 2, "2024届": 1},"types":{"26届秋招": 24, "春招": 11, "26届提前批": 2, "实习": 2, "实习生": 1, "秋招": 1},"industries":{"互联网": 17, "金融": 6, "游戏": 6, "科技": 5, "国央企": 2, "其他": 2, "制造业": 2, "教育": 1, "半导体": 1, "外企": 1},"salary_low":12,"salary_high":20,"salary_avg":16,"skill":"-"},
    {"name":"Go","total":26,"companies":23,"regions":{"上海": 10, "杭州": 9, "北京": 9, "广州": 5, "武汉": 4, "深圳": 4, "厦门": 4, "成都": 4, "全国各地": 3, "苏州": 3, "济南": 2, "海外": 2, "南京": 2, "长沙": 2, "天津": 1},"grades":{"2026届": 7, "2027届": 1},"types":{"26届秋招": 17, "春招": 6, "26届提前批": 1, "暑期实习": 1, "春招补录": 1},"industries":{"互联网": 15, "游戏": 3, "科技": 3, "制造业": 2, "教育": 2, "金融": 1},"salary_low":12,"salary_high":20,"salary_avg":16,"skill":"-"},
    {"name":"Rust","total":2,"companies":2,"regions":{"杭州": 2},"grades":{"2026届": 1},"types":{"26届秋招": 1, "春招": 1},"industries":{"互联网": 1, "制造业": 1},"salary_low":12,"salary_high":20,"salary_avg":16,"skill":"-"},
  ];
  var cityFeatures = {
  "北京": {
    "industries": "互联网、央企/国企、金融科技、人工智能、半导体",
    "feature": "全国科技研发中心，央企总部+互联网大厂+AI创业公司聚集。安全、通信/信号处理岗位全国第一，军工院所大量招聘。高薪岗位集中在大模型开发、自动驾驶算法。",
    "top_companies": "百度、字节跳动、理想汽车、京东方、申万宏源",
    "high_salary_dirs": "AI大模型开发(月薪30-65K)、集成电路设计(月薪25-50K)、自动驾驶算法(月薪35-60K)"
  },
  "上海": {
    "industries": "半导体/芯片、互联网、金融科技、汽车、生物医药",
    "feature": "全国半导体产业高地，外企+本土芯片公司密集。芯片/IC设计岗位全国第一，C/C++岗位突出。金融科技岗位薪资高（机器学习、量化开发）。",
    "top_companies": "传音控股、德州仪器、小红书、蔚来、汇添富基金",
    "high_salary_dirs": "芯片设计(月薪30-55K)、金融合规开发(月薪25-50K)、机器学习(月薪30-60K)"
  },
  "深圳": {
    "industries": "消费电子、互联网/游戏、半导体、汽车、通信设备",
    "feature": "硬件创新之都，华为/腾讯/比亚迪等总部所在地。C/C++和产品/设计岗位占比高，游戏开发薪资极强。通信设备方向（华为/中兴）岗位丰富。",
    "top_companies": "迈瑞医疗、中兴通讯、传音控股、深信服、安克创新",
    "high_salary_dirs": "算法工程(月薪30-60K)、游戏开发(月薪25-50K)、嵌入式开发(月薪20-45K)"
  },
  "广州": {
    "industries": "互联网、游戏、金融、汽车、电商/SaaS",
    "feature": "华南互联网重镇，网易/多益网络/微信等提供大量岗位。产品/设计岗占比高于其他城市，游戏方向突出。跨境电商企业IT岗需求增长。",
    "top_companies": "网易游戏、多益网络、浩鲸科技、施耐德电气",
    "high_salary_dirs": "游戏开发(月薪25-50K)、智能座舱(月薪20-40K)、SaaS产品(月薪15-30K)"
  },
  "全国各地": {
    "industries": "央企/国企、银行/金融、制造业、互联网（远程）",
    "feature": "非一线城市岗位多为全国分部的统一招聘，安全岗占比高。适合不限制工作地点的求职者，央企/银行岗位稳定性强。",
    "top_companies": "海康威视、招商银行、京东、字节跳动（远程）",
    "high_salary_dirs": "安全工程师(月薪12-25K)、运维(月薪10-20K)、数据开发(月薪12-22K)"
  },
  "杭州": {
    "industries": "互联网/电商、安防/AI、半导体、汽车、金融科技",
    "feature": "阿里系生态+海康威视+网易游戏，AI和安防岗集中。数据类岗位需求量大，电商架构师薪资高。近年零跑/吉利等带动汽车方向。",
    "top_companies": "阿里国际、蚂蚁集团、海康威视、网易游戏、同花顺",
    "high_salary_dirs": "数据科学家(月薪25-45K)、电商架构师(月薪30-50K)、机器视觉(月薪20-40K)"
  },
  "成都": {
    "industries": "半导体、游戏、互联网、央企/国防、汽车",
    "feature": "西部科技中心，芯片/IC设计和通信岗占比高。游戏产业聚集（腾讯天美、FunPlus等），性价比最高的求职城市之一。军工院所提供大量信号处理岗。",
    "top_companies": "海康威视、FunPlus、本源量子、中国一汽",
    "high_salary_dirs": "芯片设计(月薪20-40K)、游戏开发(月薪18-35K)、信号处理(月薪18-35K)"
  },
  "南京": {
    "industries": "通信设备、半导体、汽车、互联网、军工/国防",
    "feature": "中兴/华为研发中心+中国电科14所，通信和国防岗集中。芯片设计/测试岗位稳定，紫金山实验室等提供前沿研究岗。",
    "top_companies": "中兴通讯、迈瑞医疗、汇川技术、中国电科14所、vivo",
    "high_salary_dirs": "芯片设计(月薪18-35K)、数字IC验证(月薪18-35K)、通信协议开发(月薪15-30K)"
  },
  "武汉": {
    "industries": "汽车、互联网、半导体、通信、生物医药",
    "feature": "东风/小米/蔚来等汽车产业链，光电子产业全国领先。芯片设计岗位增长快（长江存储/新凯来），自动驾驶算法需求大。性价比高。",
    "top_companies": "迈瑞医疗、海康威视、蔚来、东风汽车、文远知行",
    "high_salary_dirs": "自动驾驶算法(月薪20-40K)、光电子嵌入式(月薪15-30K)、芯片设计(月薪18-35K)"
  },
  "西安": {
    "industries": "半导体、军工/航天、通信、汽车、AI",
    "feature": "航天军工重镇，芯片设计+信号处理双强。三星/美光等外企设厂，兆易创新/芯动科技等本土芯片公司。军工院所提供大量高稳定性岗位。",
    "top_companies": "迈瑞医疗、隆基绿能、中兴通讯、科大讯飞、兆易创新",
    "high_salary_dirs": "芯片设计(月薪18-35K)、信号处理(月薪15-30K)、AI嵌入式(月薪18-35K)"
  }
};
  var tooltipBase = {trigger:'axis',appendToBody:true,backgroundColor:'rgba(255,255,255,0.95)',borderColor:rule,borderWidth:1,textStyle:{color:ink,fontSize:13}};

  // ==================== Chart 1: City Bar ====================
  var c1 = echarts.init(document.getElementById('chart-city-bar'), null, {renderer:'svg'});
  c1.setOption({animation:false,tooltip:tooltipBase,grid:{left:80,right:50,top:20,bottom:60},
    xAxis:{type:'value',axisLabel:{color:muted,fontSize:12},splitLine:{lineStyle:{color:rule}}},
    yAxis:{type:'category',data:regionData.map(function(r){return r.region}).reverse(),axisLabel:{color:ink,fontSize:13}},
    series:[{type:'bar',data:regionData.map(function(r){return r.total}).reverse(),
      itemStyle:{color:accent,borderRadius:[0,4,4,0]},
      label:{show:true,position:'right',color:muted,fontSize:11}
    }]
  });
  window.addEventListener('resize',function(){c1.resize()});

  // ==================== Chart 2: City Salary Bar ====================
  var sortedBySalary = regionData.slice().sort(function(a,b){return b.avg_salary-a.avg_salary});
  var c2 = echarts.init(document.getElementById('chart-city-salary'), null, {renderer:'svg'});
  c2.setOption({animation:false,tooltip:{trigger:'axis',appendToBody:true,backgroundColor:'rgba(255,255,255,0.95)',borderColor:rule,borderWidth:1,textStyle:{color:ink,fontSize:13},formatter:function(p){return p[0].name+': '+p[0].value.toFixed(2)+'万/月'}},
    grid:{left:80,right:50,top:20,bottom:60},
    xAxis:{type:'value',axisLabel:{color:muted,fontSize:12,formatter:function(v){return v.toFixed(1)+'万'}},splitLine:{lineStyle:{color:rule}}},
    yAxis:{type:'category',data:sortedBySalary.map(function(r){return r.region}).reverse(),axisLabel:{color:ink,fontSize:13}},
    series:[{type:'bar',data:sortedBySalary.map(function(r){return r.avg_salary}).reverse(),
      itemStyle:{color:gold,borderRadius:[0,4,4,0]},
      label:{show:true,position:'right',color:muted,fontSize:11,formatter:function(p){return p.value.toFixed(2)+'万'}}
    }]
  });
  window.addEventListener('resize',function(){c2.resize()});

  // ==================== Chart 3: Stack Rank ====================
  var c3 = echarts.init(document.getElementById('chart-stack-rank'), null, {renderer:'svg'});
  c3.setOption({animation:false,tooltip:tooltipBase,grid:{left:140,right:60,top:20,bottom:40},
    xAxis:{type:'value',axisLabel:{color:muted},splitLine:{lineStyle:{color:rule}}},
    yAxis:{type:'category',data:stackData.map(function(s){return s.name}).reverse(),axisLabel:{color:ink,fontSize:13}},
    series:[{type:'bar',data:stackData.map(function(s){return s.total}).reverse(),
      itemStyle:{color:function(p){return palette[p.dataIndex%palette.length]},borderRadius:[0,4,4,0]},
      label:{show:true,position:'right',color:muted,fontSize:11}
    }]
  });
  window.addEventListener('resize',function(){c3.resize()});

  // ==================== Chart 4: Stack Salary Bar ====================
  var sortedStackBySalary = stackData.slice().sort(function(a,b){return b.salary_avg-a.salary_avg});
  var c4 = echarts.init(document.getElementById('chart-stack-salary-bar'), null, {renderer:'svg'});
  c4.setOption({animation:false,
    tooltip:{trigger:'axis',appendToBody:true,backgroundColor:'rgba(255,255,255,0.95)',borderColor:rule,borderWidth:1,textStyle:{color:ink,fontSize:13},
      formatter:function(p){return p[0].name+'<br/>年薪: '+p[0].value+'万'}},
    grid:{left:140,right:40,top:10,bottom:40},
    xAxis:{type:'value',name:'平均年薪(万)',nameTextStyle:{color:muted,fontSize:11},axisLabel:{color:muted,fontSize:12,formatter:function(v){return v+'万'}},splitLine:{lineStyle:{color:rule}}},
    yAxis:{type:'category',data:sortedStackBySalary.map(function(s){return s.name}).reverse(),axisLabel:{color:ink,fontSize:13}},
    series:[
      {type:'bar',data:sortedStackBySalary.map(function(s){return s.salary_avg}).reverse(),
        itemStyle:{color:gold,borderRadius:[0,4,4,0]},
        label:{show:true,position:'right',color:muted,fontSize:11,formatter:function(p){return p.value+'万'}}
      }
    ]
  });
  window.addEventListener('resize',function(){c4.resize()});

  // ==================== Chart 5: Heatmap ====================
  var heatCities = ["北京","上海","深圳","杭州","广州","成都","南京","武汉","西安"];
  var heatStacks = stackNames.slice(0,10);
  var heatData = [];
  for(var si=0;si<heatStacks.length;si++){
    for(var ci=0;ci<heatCities.length;ci++){
      var val = 0;
      for(var k=0;k<stackData.length;k++){
        if(stackData[k].name===heatStacks[si]){val = stackData[k].regions[heatCities[ci]]||0;break;}
      }
      heatData.push([ci,si,val]);
    }
  }
  var maxVal = Math.max.apply(null,heatData.map(function(d){return d[2]}));
  var c5 = echarts.init(document.getElementById('chart-stack-heatmap'), null, {renderer:'svg'});
  c5.setOption({animation:false,
    tooltip:{trigger:'item',appendToBody:true,backgroundColor:'rgba(255,255,255,0.95)',borderColor:rule,borderWidth:1,textStyle:{color:ink,fontSize:13},formatter:function(p){return p.data[2]+'个岗位'}},
    grid:{left:120,right:60,top:20,bottom:80},
    xAxis:{type:'category',data:heatCities,axisLabel:{color:ink,fontSize:12,rotate:30},splitArea:{show:false}},
    yAxis:{type:'category',data:heatStacks,axisLabel:{color:ink,fontSize:12},splitArea:{show:false}},
    visualMap:{min:0,max:maxVal,calculable:true,orient:'horizontal',left:'center',bottom:0,inRange:{color:[bg2,'#fdd','#fbb','#f77',accent]},textStyle:{color:muted,fontSize:11},itemWidth:12,itemHeight:100},
    series:[{type:'heatmap',data:heatData,label:{show:true,fontSize:10,color:ink,formatter:function(p){return p.data[2]||''}},
      emphasis:{itemStyle:{shadowBlur:6,shadowColor:'rgba(0,0,0,0.2)'}}
    }]
  });
  window.addEventListener('resize',function(){c5.resize()});

  // ==================== Chart 6: Grade Stacked ====================
  var gradeNames = ["2026届","2027届","2025届","2024届","2023届","海外往届","2028届"];
  var gradeColors = ["#e63946","#457b9d","#2a9d8f","#e9c46a","#f4a261","#6d6875","#d4a373"];
  var c6 = echarts.init(document.getElementById('chart-stack-grade'), null, {renderer:'svg'});
  c6.setOption({animation:false,tooltip:tooltipBase,
    legend:{data:gradeNames,bottom:0,textStyle:{color:muted,fontSize:11},itemWidth:12,itemHeight:10},
    grid:{left:120,right:20,top:10,bottom:60},
    xAxis:{type:'value',axisLabel:{color:muted},splitLine:{lineStyle:{color:rule}}},
    yAxis:{type:'category',data:stackData.map(function(s){return s.name}).reverse(),axisLabel:{color:ink,fontSize:13}},
    series:gradeNames.map(function(gn,gi){return {name:gn,type:'bar',stack:'grade',data:stackData.map(function(s){return s.grades[gn]||0}),itemStyle:{color:gradeColors[gi]}};})
  });
  window.addEventListener('resize',function(){c6.resize()});

  // ==================== City Feature Cards (3-column grid) ====================
  var cityContainer = document.getElementById('city-feature-container');
  var top10cities = regionData.slice(0,10);
  var cityHTML = '<div class="grid-3col">';
  top10cities.forEach(function(c){
    var feat = cityFeatures[c.region] || {industries:'-',feature:'-',top_companies:'-',high_salary_dirs:'-'};
    var stacks = Object.entries(c.stacks).sort(function(a,b){return b[1]-a[1]}).slice(0,5);
    cityHTML += '<div class="city-feature">';
    cityHTML += '<div class="city-feature-header">';
    cityHTML += '<span class="city-feature-name">'+c.region+'</span>';
    cityHTML += '<div class="city-feature-stats">';
    cityHTML += '<div class="city-feature-stat"><div class="num">'+c.total+'</div><div class="label">岗位</div></div>';
    cityHTML += '<div class="city-feature-stat"><div class="num" style="color:'+gold+'">'+c.avg_salary+'万</div><div class="label">月薪</div></div>';
    cityHTML += '</div></div>';
    // Single column inside each card for 3-col layout
    cityHTML += '<div class="city-section-title">主导行业</div>';
    cityHTML += '<div class="city-section-content"><p>'+feat.industries+'</p></div>';
    cityHTML += '<div class="city-section-title" style="margin-top:0.6rem">产业特色</div>';
    cityHTML += '<div class="city-section-content"><p>'+feat.feature+'</p></div>';
    cityHTML += '<div class="city-section-title" style="margin-top:0.6rem">代表企业</div>';
    cityHTML += '<div class="city-section-content"><p>'+feat.top_companies+'</p></div>';
    cityHTML += '<div class="city-section-title" style="margin-top:0.6rem">技术栈分布</div>';
    cityHTML += '<div class="city-section-content">';
    stacks.forEach(function(s){cityHTML += '<span class="tag">'+s[0]+'('+s[1]+')</span>'; });
    cityHTML += '</div>';
    cityHTML += '<div class="city-section-title" style="margin-top:0.6rem">高薪方向</div>';
    cityHTML += '<div class="city-section-content"><p class="salary-inline">'+feat.high_salary_dirs+'</p></div>';
    cityHTML += '</div>';
  });
  cityHTML += '</div>';
  cityContainer.innerHTML = cityHTML;

  // ==================== Salary Detail Table ====================
  var salTableEl = document.getElementById('salary-table-body');
  var salHTML = '';
  stackData.forEach(function(s){
    var topR = Object.entries(s.regions).sort(function(a,b){return b[1]-a[1]}).slice(0,3).map(function(r){return r[0]}).join('、');
    var cls = s.salary_avg >= 30 ? 'high' : (s.salary_avg >= 18 ? 'mid' : 'low');
    salHTML += '<tr>';
    salHTML += '<td><strong>'+s.name+'</strong></td>';
    salHTML += '<td>'+s.total+'</td>';
    salHTML += '<td class="salary-cell '+cls+'">'+s.salary_low+'~'+s.salary_high+'万</td>';
    salHTML += '<td class="salary-cell '+cls+'">'+(s.salary_avg/12).toFixed(1)+'~'+(s.salary_high/12).toFixed(1)+'万</td>';
    salHTML += '<td>'+topR+'</td>';
    salHTML += '<td style="font-size:0.78rem;color:'+muted+'">'+s.skill+'</td>';
    salHTML += '</tr>';
  });
  salTableEl.innerHTML = salHTML;

  // ==================== Stack Detail Cards ====================
  var container = document.getElementById('stack-detail-container');
  var descMap = {
    "算法/AI":"涵盖机器学习、深度学习、计算机视觉、NLP、推荐系统等方向。几乎所有头部科技公司都有大量需求，是当前校招最热门方向。要求扎实的数学基础和编程能力。",
    "测试":"包括功能测试、自动化测试、性能测试、测试开发等。门槛相对较低，但自动化测试方向有较高技术含量。适合细心、有质量意识的同学。",
    "安全":"涵盖网络安全、信息安全、渗透测试等方向。央企、银行、网络安全公司需求大，对往届生友好。需要网络协议、操作系统基础知识。",
    "数据/大数据":"包括数据开发、数据工程、数仓、BI分析等。互联网和金融行业需求最大，需要SQL、Hadoop、Spark等技能。",
    "产品/设计":"产品经理、UI/UX设计师等岗位。需要良好的沟通能力和产品思维，不限专业背景，但竞争激烈。",
    "通信/信号处理":"涵盖5G/6G、射频、基带、天线等方向。央企、通信设备商、芯片公司为主要雇主，专业对口要求高。",
    "C/C++":"嵌入式、底层开发、系统编程、游戏引擎等方向。半导体、汽车、通信行业需求大，对计算机底层理解要求高。",
    "运维/DevOps":"Linux运维、SRE、云原生运维等。互联网和央企需求大，需要Linux网络基础和自动化脚本能力。",
    "芯片/IC设计":"数字/模拟电路设计、FPGA、验证等方向。半导体行业集中度高，薪资竞争力强，但专业门槛高。",
    "前端/JavaScript":"Web前端、小程序、Node.js开发等。互联网公司为主，岗位量较往年收缩，竞争加剧。",
    "Java":"后端开发、微服务、中间件等。传统强项方向，但岗位量明显少于算法，建议搭配全栈能力。",
    "Android":"移动端开发，岗位量较小。建议关注鸿蒙或跨平台方向。"
  };
  var cardsHTML = '<div class="grid-3col">';
  stackData.forEach(function(s){
    var topRegions = Object.entries(s.regions).sort(function(a,b){return b[1]-a[1]}).slice(0,5);
    var topGrades = Object.entries(s.grades).sort(function(a,b){return b[1]-a[1]}).slice(0,4);
    var topIndustries = Object.entries(s.industries).sort(function(a,b){return b[1]-a[1]}).slice(0,5);
    var topTypes = Object.entries(s.types).sort(function(a,b){return b[1]-a[1]}).slice(0,3);
    cardsHTML += '<div class="stack-card">';
    cardsHTML += '<div class="stack-header">';
    cardsHTML += '<span class="stack-name">'+s.name+'</span>';
    cardsHTML += '<div style="display:flex;gap:6px;flex-wrap:wrap">';
    cardsHTML += '<span class="stack-count">'+s.total+'岗</span>';
    cardsHTML += '<span class="stack-salary">'+s.salary_low+'~'+s.salary_high+'万</span>';
    cardsHTML += '</div></div>';
    cardsHTML += '<div class="stack-meta">';
    cardsHTML += '<div class="stack-meta-item"><span class="stack-meta-label">岗位说明</span><span class="stack-meta-value" style="font-size:0.78rem;line-height:1.5">'+(descMap[s.name]||'-')+'</span></div>';
    cardsHTML += '<div class="stack-meta-item"><span class="stack-meta-label">核心技能</span><span class="stack-meta-value" style="font-size:0.78rem">'+s.skill+'</span></div>';
    cardsHTML += '<div class="stack-meta-item"><span class="stack-meta-label">主要城市</span><span class="stack-meta-value" style="font-size:0.78rem">'+topRegions.map(function(r){return r[0]+'('+r[1]+')'}).join('、')+'</span></div>';
    cardsHTML += '<div class="stack-meta-item"><span class="stack-meta-label">招聘届次</span><span class="stack-meta-value" style="font-size:0.78rem">'+topGrades.map(function(g){return g[0]+':'+g[1]}).join(' | ')+'</span></div>';
    cardsHTML += '<div class="stack-meta-item"><span class="stack-meta-label">招聘类型</span><span class="stack-meta-value" style="font-size:0.78rem">'+topTypes.map(function(t){return t[0]+':'+t[1]}).join(' | ')+'</span></div>';
    cardsHTML += '<div class="stack-meta-item"><span class="stack-meta-label">主要行业</span><span class="stack-meta-value">'+topIndustries.map(function(ind){return '<span class="tag">'+ind[0]+'('+ind[1]+')</span>'}).join('')+'</span></div>';
    cardsHTML += '</div></div>';
  });
  cardsHTML += '</div>';
  container.innerHTML = cardsHTML;

  // ==================== Industry Table ====================
  var indTableEl = document.getElementById('industry-table-body');
  var indHTML = '';
  stackData.forEach(function(s){
    var topInd = Object.entries(s.industries).sort(function(a,b){return b[1]-a[1]}).slice(0,5);
    indHTML += '<tr><td><strong>'+s.name+'</strong><br><span style="color:'+gold+';font-size:0.72rem">'+s.salary_low+'~'+s.salary_high+'万/年</span></td>';
    for(var ii=0;ii<5;ii++){
      if(topInd[ii]) indHTML += '<td>'+topInd[ii][0]+'<br><span style="color:'+muted+';font-size:0.72rem">'+topInd[ii][1]+'个</span></td>';
      else indHTML += '<td>-</td>';
    }
    indHTML += '</tr>';
  });
  indTableEl.innerHTML = indHTML;

})();
