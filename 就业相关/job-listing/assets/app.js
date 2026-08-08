// App logic — pure frontend, lazy-load year data via fetch()
// No backend needed; data split into per-year JSON files
(function () {
  'use strict';

  var PAGE_SIZE = 20;
  var currentPage = 1;
  var filteredRecords = [];
  var totalCount = 0;

  // ===== Filter state =====
  var loadedMonths = [];   // Months loaded into cache, e.g. ['2026-07', '2026-06']
  var LOAD_BATCH_SIZE = 2; // How many months to load per batch
  var techFilter = 'tech'; // Default to tech positions
  var catFilter = '';
  var tagFilters = []; // [{type: 'industry', value: '半导体'}, ...]

  // ===== Available months (populated from meta.js, e.g. ['2026-07','2026-06',...]) =====
  var availableMonths = [];

  // ===== Month data cache (loaded once, reused) =====
  var monthDataCache = {};

  // ===== IndexedDB cache (persist across sessions) =====
  var DB_NAME = 'job-data-cache';
  var DB_VERSION = 1;
  var STORE_NAME = 'months';

  function openDB() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error('IndexedDB not supported')); return; }
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'monthKey' });
        }
      };
      req.onsuccess = function (e) { resolve(e.target.result); };
      req.onerror = function (e) { reject(e.target.error); };
    });
  }

  // Get all cached months as { '2026-07': {monthKey, data, count, cachedAt}, ... }
  function dbGetAllCachedMonths() {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, 'readonly');
        var store = tx.objectStore(STORE_NAME);
        var req = store.getAll();
        req.onsuccess = function (e) {
          var result = {};
          (e.target.result || []).forEach(function (item) {
            result[item.monthKey] = item;
          });
          resolve(result);
        };
        req.onerror = function (e) { reject(e.target.error); };
      });
    });
  }

  // Store a month's data in IndexedDB
  function dbPutMonth(monthKey, data, count) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, 'readwrite');
        var store = tx.objectStore(STORE_NAME);
        store.put({ monthKey: monthKey, data: data, count: count, cachedAt: Date.now() });
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function (e) { reject(e.target.error); };
      });
    });
  }

  // ===== Company reviews cache =====
  var reviewsLoaded = false;
  var reviewsData = {};

  function loadReviews() {
    if (reviewsLoaded) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = './data/reviews.js';
      script.onload = function () {
        if (window.__JOB_REVIEWS) {
          reviewsData = window.__JOB_REVIEWS;
          reviewsLoaded = true;
          console.log('[Reviews] Loaded ' + Object.keys(reviewsData).length + ' reviews');
        }
        resolve();
      };
      script.onerror = function () {
        console.warn('[Reviews] Failed to load reviews.js');
        resolve(); // 不阻塞主流程
      };
      document.head.appendChild(script);
    });
  }

  function getReview(company) {
    if (!company) return '';
    return reviewsData[company] || '';
  }

  // ===== Tag filter (clickable tags) =====
  function toggleTagFilter(type, value) {
    var idx = -1;
    for (var i = 0; i < tagFilters.length; i++) {
      if (tagFilters[i].type === type && tagFilters[i].value === value) { idx = i; break; }
    }
    if (idx >= 0) {
      tagFilters.splice(idx, 1);
    } else {
      tagFilters.push({ type: type, value: value });
    }
    applyFilters();
    renderTagFilterBar();
  }

  function renderTagFilterBar() {
    var bar = document.getElementById('tag-filter-bar');
    var chips = document.getElementById('tag-filter-chips');
    if (!bar || !chips) return;
    if (tagFilters.length === 0) {
      bar.style.display = 'none';
      return;
    }
    bar.style.display = 'flex';
    var typeLabels = {
      type: '类型', industry: '行业', location: '城市', grade: '届次', exam: '笔试'
    };
    var html = '';
    tagFilters.forEach(function (tf) {
      html += '<button class="tag-filter-chip" data-tag-type="' + tf.type + '" data-tag-value="' + escapeHtml(tf.value) + '">' +
        '<span class="chip-type">' + (typeLabels[tf.type] || tf.type) + '</span> ' + escapeHtml(tf.value) +
        ' <span class="chip-close">\u00d7</span></button>';
    });
    html += '<button class="tag-filter-clear" id="tag-filter-clear-all">清除全部</button>';
    chips.innerHTML = html;

    chips.querySelectorAll('.tag-filter-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        toggleTagFilter(this.getAttribute('data-tag-type'), this.getAttribute('data-tag-value'));
      });
    });
    var clearAll = document.getElementById('tag-filter-clear-all');
    if (clearAll) {
      clearAll.addEventListener('click', function () {
        tagFilters = [];
        applyFilters();
        renderTagFilterBar();
      });
    }
  }

  // ===== Company detail modal =====
  function showCompanyModal(companyName) {
    var overlay = document.getElementById('company-modal-overlay');
    var content = document.getElementById('company-modal-content');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    content.innerHTML = '<div class="modal-loading"><div class="spinner"></div><div>正在加载公司详情...</div></div>';

    Promise.all(
      availableMonths.map(function (m) { return ensureMonthData(m); })
    ).then(function (results) {
      var allRecords = [].concat.apply([], results);
      var companyRecords = allRecords.filter(function (rec) {
        return rec.company === companyName;
      });
      if (companyRecords.length === 0) {
        content.innerHTML = '<div class="modal-loading">未找到该公司信息</div>';
        return;
      }
      renderCompanyModal(companyName, companyRecords);
    }).catch(function () {
      content.innerHTML = '<div class="modal-loading">数据加载失败</div>';
    });
  }

  function closeCompanyModal() {
    var overlay = document.getElementById('company-modal-overlay');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function renderCompanyModal(companyName, records) {
    records.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });

    var types = {}, industries = {}, locations = {}, grades = {}, exams = {};
    records.forEach(function (rec) {
      (rec.types || []).forEach(function (t) { types[t] = true; });
      (rec.industries || []).forEach(function (i) { industries[i] = true; });
      (rec.locations || []).forEach(function (l) { locations[l] = true; });
      (rec.grades || []).forEach(function (g) { grades[g] = true; });
      (rec.exam || []).forEach(function (e) { exams[e] = true; });
    });

    function buildTags(obj, cssClass, tagType) {
      var html = '';
      Object.keys(obj).forEach(function (k) {
        html += '<span class="tag ' + cssClass + '" data-tag-type="' + tagType + '" data-tag-value="' + escapeHtml(k) + '">' + escapeHtml(k) + '</span>';
      });
      return html;
    }

    var tagsHtml = buildTags(types, 'tag-type', 'type') +
      buildTags(industries, 'tag-industry', 'industry') +
      buildTags(locations, 'tag-location', 'location') +
      buildTags(grades, 'tag-grade', 'grade') +
      buildTags(exams, 'tag-exam', 'exam');

    var reviewText = reviewsData[companyName] || '';
    var reviewHtml = reviewText ? '<div class="modal-review"><span class="review-label">UP点评：</span>' + escapeHtml(reviewText) + '</div>' : '';

    var statsHtml = '<div class="modal-stats-row">' +
      '<div class="modal-stat"><div class="num">' + records.length + '</div><div class="label">招聘记录</div></div>' +
      '<div class="modal-stat"><div class="num">' + Object.keys(locations).length + '</div><div class="label">工作城市</div></div>' +
      '<div class="modal-stat"><div class="num">' + Object.keys(industries).length + '</div><div class="label">涉及行业</div></div>' +
      '<div class="modal-stat"><div class="num">' + Object.keys(types).length + '</div><div class="label">招聘类型</div></div>' +
      '</div>';

    var postingsHtml = '';
    records.forEach(function (rec) {
      var positionsHtml = rec.positions ? '<div class="modal-posting-positions"><span class="label">岗位：</span>' + escapeHtml(rec.positions) + '</div>' : '';
      var noteHtml = rec.note ? '<div class="modal-posting-note">' + escapeHtml(rec.note) + '</div>' : '';
      var linksHtml = '<div class="modal-posting-links">';
      if (rec.apply_url) {
        var applyUrl = Array.isArray(rec.apply_url) ? rec.apply_url[0] : rec.apply_url;
        linksHtml += '<a href="' + escapeHtml(applyUrl) + '" class="btn-link btn-apply" target="_blank" rel="noopener">投递</a>';
      }
      if (rec.notice_url) {
        var noticeUrl = Array.isArray(rec.notice_url) ? rec.notice_url[0] : rec.notice_url;
        linksHtml += '<a href="' + escapeHtml(noticeUrl) + '" class="btn-link btn-notice" target="_blank" rel="noopener">公告</a>';
      }
      linksHtml += '</div>';

      var postingTags = '';
      (rec.types || []).forEach(function (t) { postingTags += '<span class="tag tag-type" style="font-size:0.72rem">' + escapeHtml(t) + '</span>'; });
      (rec.exam || []).forEach(function (e) { postingTags += '<span class="tag tag-exam" style="font-size:0.72rem">' + escapeHtml(e) + '</span>'; });

      postingsHtml += '<div class="modal-posting">' +
        '<div class="modal-posting-header">' +
          '<div class="modal-posting-date">' + escapeHtml(rec.date || '') + (rec.year ? ' \u00b7 ' + rec.year + '年' : '') + '</div>' +
          '<div class="modal-posting-deadline">截止：' + escapeHtml(rec.deadline || '招满为止') + '</div>' +
        '</div>' +
        (postingTags ? '<div class="tags-row" style="margin-bottom:0.4rem">' + postingTags + '</div>' : '') +
        positionsHtml + noteHtml + linksHtml +
      '</div>';
    });

    var html =
      '<div class="modal-header">' +
        '<button class="modal-close" type="button">\u00d7</button>' +
        '<h2 class="modal-company-name">' + escapeHtml(companyName) + '</h2>' +
      '</div>' +
      '<div class="modal-body">' +
        '<div class="modal-tags-section">' +
          '<div class="modal-tags-label">标签（点击可筛选同类公司）</div>' +
          '<div class="modal-tags">' + tagsHtml + '</div>' +
        '</div>' +
        reviewHtml +
        statsHtml +
        '<div class="modal-postings-title">招聘记录详情（共 ' + records.length + ' 条）</div>' +
        postingsHtml +
      '</div>';

    document.getElementById('company-modal-content').innerHTML = html;
  }

  // ===== Tech keywords =====
  var TECH_KEYWORDS = [
    '程序员', '硬件', '通信', '电子', '软件', '计算机', '嵌入式',
    '算法', 'AI', '人工智能', '开发', '测试', '运维', '前端', '后端',
    '机器学习', '深度学习', '数据库', '架构', '芯片', '集成电路', '半导体',
    '射频', '信号', '固件', '驱动', 'Java', 'Python', 'C++', 'C语言',
    '网络', '云计算', '大数据', '数据挖掘', '自然语言', '视觉', '研发工程师',
    '技术岗', '数据工程师', '安全工程师', '嵌入式软件', 'FPGA', 'DSP', 'MCU',
    'Linux', 'Android', 'iOS', '全栈', 'DevOps', '后端开发', '前端开发',
    '移动开发', '系统工程师', '硬件工程师', '电子工程师', '通信工程师'
  ];

  function isTechRecord(rec) {
    var text = ((rec.positions || '') + ' ' + (rec.note || '') + ' ' + (rec.company || '')).toLowerCase();
    for (var i = 0; i < TECH_KEYWORDS.length; i++) {
      if (text.indexOf(TECH_KEYWORDS[i].toLowerCase()) !== -1) return true;
    }
    if (/\bit\b/i.test((rec.positions || '') + ' ' + (rec.note || '') + ' ' + (rec.company || ''))) return true;
    return false;
  }

  function matchesCategory(rec, cat) {
    if (!cat) return true;
    var industries = rec.industries || [];
    var company = rec.company || '';
    switch (cat) {
      case '互联网': return industries.indexOf('互联网') !== -1;
      case '半导体': return industries.indexOf('半导体') !== -1 || (industries.indexOf('科技') !== -1 && (company.indexOf('芯') !== -1 || company.indexOf('半导') !== -1 || (rec.positions || '').indexOf('IC') !== -1));
      case '央国企': return industries.indexOf('国央企') !== -1;
      case '银行': return company.indexOf('银行') !== -1;
      case '外企': return industries.indexOf('外企') !== -1;
      default: return true;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ===== Get month count from meta (for cache validation) =====
  function getMetaMonthCount(monthKey) {
    return (window.__JOB_META && window.__JOB_META.months && window.__JOB_META.months[monthKey]) || 0;
  }

  // ===== Lazy-load month data: memory cache → IndexedDB → server =====
  function ensureMonthData(monthKey) {
    if (monthKey === 'all') {
      return Promise.all(
        availableMonths.map(function (m) { return ensureMonthData(m); })
      ).then(function (results) {
        return [].concat.apply([], results);
      });
    }

    // 1. Memory cache (instant)
    if (monthDataCache[monthKey]) {
      return Promise.resolve(monthDataCache[monthKey]);
    }

    // 2. IndexedDB cache (check if cached with matching record count)
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, 'readonly');
        var store = tx.objectStore(STORE_NAME);
        var req = store.get(monthKey);
        req.onsuccess = function (e) {
          var cached = e.target.result;
          var metaCount = getMetaMonthCount(monthKey);
          if (cached && cached.data && cached.count === metaCount) {
            // Cache hit — count matches meta, data is valid
            monthDataCache[monthKey] = cached.data;
            console.log('[Cache] ' + monthKey + ' loaded from IndexedDB (' + cached.data.length + ' records)');
            resolve(cached.data);
          } else {
            // Cache miss or stale — load from server
            resolve(null); // signal: need server load
          }
        };
        req.onerror = function () { resolve(null); }; // fallback to server
      });
    }).catch(function () { return null; }) // IndexedDB error → server load
      .then(function (cachedData) {
        if (cachedData) return cachedData;
        return loadMonthFromServer(monthKey);
      });
  }

  // ===== Load month data from server via <script> tag, then cache in IndexedDB =====
  function loadMonthFromServer(monthKey) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = './data/' + monthKey + '.js';
      script.onload = function () {
        var varName = '__JOB_DATA_' + monthKey.replace(/-/g, '_');
        var data = window[varName];
        if (data) {
          monthDataCache[monthKey] = data;
          console.log('[Data] ' + monthKey + ' loaded from server (' + data.length + ' records)');
          // Persist to IndexedDB for future visits
          var metaCount = getMetaMonthCount(monthKey) || data.length;
          dbPutMonth(monthKey, data, metaCount).catch(function (e) {
            console.warn('[Cache] Failed to store ' + monthKey + ':', e);
          });
          resolve(data);
        } else {
          reject(new Error('No data in ' + monthKey + '.js'));
        }
      };
      script.onerror = function () {
        reject(new Error('Failed to load ' + monthKey + '.js'));
      };
      document.head.appendChild(script);
    });
  }

  function getMonthRecords() {
    var all = [];
    loadedMonths.forEach(function (m) {
      all = all.concat(monthDataCache[m] || []);
    });
    return all;
  }

  // ===== Compute stats from records (for dropdowns) =====
  function computeRecordStats(records) {
    var industryMap = {};
    var typeMap = {};
    var cityMap = {};
    var gradeMap = {};

    records.forEach(function (rec) {
      (rec.industries || []).forEach(function (i) {
        if (i && typeof i === 'string') industryMap[i] = (industryMap[i] || 0) + 1;
      });
      (rec.types || []).forEach(function (t) { if (t) typeMap[t] = (typeMap[t] || 0) + 1; });
      (rec.locations || []).forEach(function (l) { if (l) cityMap[l] = (cityMap[l] || 0) + 1; });
      (rec.grades || []).forEach(function (g) { if (g) gradeMap[g] = (gradeMap[g] || 0) + 1; });
    });

    function toSortedArray(map) {
      var arr = [];
      for (var k in map) { if (map.hasOwnProperty(k)) arr.push([k, map[k]]); }
      arr.sort(function (a, b) { return b[1] - a[1]; });
      return arr;
    }

    return {
      industry: toSortedArray(industryMap),
      type: toSortedArray(typeMap),
      city: toSortedArray(cityMap),
      grade: toSortedArray(gradeMap)
    };
  }

  function rebuildDropdown(id, stats, label, maxItems) {
    var sel = document.getElementById(id);
    var currentValue = sel.value;
    sel.innerHTML = '<option value="">' + label + '</option>';
    var items = maxItems ? stats.slice(0, maxItems) : stats;
    items.forEach(function (item) {
      var opt = document.createElement('option');
      opt.value = item[0];
      opt.textContent = item[0] + ' (' + item[1] + ')';
      sel.appendChild(opt);
    });
    sel.value = currentValue;
    if (sel.value !== currentValue) sel.value = '';
  }

  function updateDropdowns() {
    var monthRecords = getMonthRecords();
    var stats = computeRecordStats(monthRecords);

    var industryStats = stats.industry.filter(function (item) {
      return item[1] >= 30;
    });
    rebuildDropdown('filter-industry', industryStats, '全部行业');
    rebuildDropdown('filter-type', stats.type, '全部类型');
    rebuildDropdown('filter-city', stats.city, '全部城市', 50);

    var gradeStats = stats.grade.filter(function (item) {
      return /\d{4}届/.test(item[0]) || item[0] === '海外往届' || item[0] === '部分往届';
    });
    rebuildDropdown('filter-grade', gradeStats, '全部届次');
  }

  // ===== Stats overview (live, based on filtered results) =====
  function updateStatsOverview() {
    document.getElementById('stat-total').textContent = filteredRecords.length.toLocaleString();
    var industrySet = {};
    var citySet = {};
    var typeSet = {};
    filteredRecords.forEach(function (rec) {
      (rec.industries || []).forEach(function (i) { industrySet[i] = true; });
      (rec.locations || []).forEach(function (l) { citySet[l] = true; });
      (rec.types || []).forEach(function (t) { typeSet[t] = true; });
    });
    document.getElementById('stat-industry').textContent = Object.keys(industrySet).length;
    document.getElementById('stat-city').textContent = Object.keys(citySet).length;
    document.getElementById('stat-type').textContent = Object.keys(typeSet).length;
    if (window.updateCharts) {
      window.updateCharts(filteredRecords);
    }
  }

  // ===== Sort records: strictly by date descending (newest first) =====
  function sortRecords(records) {
    return records.slice().sort(function (a, b) {
      var aDate = a.date || '';
      var bDate = b.date || '';
      return bDate.localeCompare(aDate);
    });
  }

  // ===== Filter records (from cached year data) =====
  function applyFilters() {
    var keyword = document.getElementById('search-input').value.trim().toLowerCase();
    var industry = document.getElementById('filter-industry').value;
    var type = document.getElementById('filter-type').value;
    var city = document.getElementById('filter-city').value;
    var grade = document.getElementById('filter-grade').value;
    var exam = document.getElementById('filter-exam').value;

    var records = getMonthRecords();

    var rawFiltered = records.filter(function (rec) {
      if (keyword) {
        var company = (rec.company || '').toLowerCase();
        var positions = (rec.positions || '').toLowerCase();
        var note = (rec.note || '').toLowerCase();
        if (company.indexOf(keyword) === -1 && positions.indexOf(keyword) === -1 && note.indexOf(keyword) === -1) return false;
      }
      if (industry && (!rec.industries || rec.industries.indexOf(industry) === -1)) return false;
      if (type && (!rec.types || rec.types.indexOf(type) === -1)) return false;
      if (city && (!rec.locations || rec.locations.indexOf(city) === -1)) return false;
      if (grade && (!rec.grades || rec.grades.indexOf(grade) === -1)) return false;
      if (exam && (!rec.exam || rec.exam.indexOf(exam) === -1)) return false;
      if (techFilter === 'tech' && !isTechRecord(rec)) return false;
      if (techFilter === 'non-tech' && isTechRecord(rec)) return false;
      if (catFilter && !matchesCategory(rec, catFilter)) return false;
      // Check tag filters (clickable tags)
      for (var j = 0; j < tagFilters.length; j++) {
        var tf = tagFilters[j];
        var tagField;
        switch (tf.type) {
          case 'type': tagField = rec.types; break;
          case 'industry': tagField = rec.industries; break;
          case 'location': tagField = rec.locations; break;
          case 'grade': tagField = rec.grades; break;
          case 'exam': tagField = rec.exam; break;
          default: break;
        }
        if (!tagField || tagField.indexOf(tf.value) === -1) return false;
      }
      return true;
    });

    filteredRecords = sortRecords(rawFiltered);
    currentPage = 1;
    renderRecords();
    renderPagination();
    updateFilterInfo();
    updateStatsOverview();
  }

  // ===== Show loading spinner =====
  function showLoading() {
    document.getElementById('records-container').innerHTML =
      '<div class="loading"><div class="spinner"></div><div>正在加载数据...</div></div>';
  }

  // ===== Load month data then apply filters (progressive loading with cache) =====
  function refreshData() {
    if (availableMonths.length === 0) return;
    showLoading();

    // Check IndexedDB for all cached months in one batch
    dbGetAllCachedMonths().then(function (allCached) {
      var cachedMonths = [];
      availableMonths.forEach(function (m) {
        var metaCount = getMetaMonthCount(m);
        var cached = allCached[m];
        if (cached && cached.data && cached.count === metaCount) {
          monthDataCache[m] = cached.data;
          cachedMonths.push(m);
        }
      });

      if (cachedMonths.length > 0) {
        // Use cached months instantly
        loadedMonths = cachedMonths;
        loadedMonths.sort(function (a, b) { return b.localeCompare(a); });
        console.log('[Cache] Restored ' + cachedMonths.length + ' months from IndexedDB');

        // If latest month isn't cached (new data), also load it from server
        var uncached = availableMonths.filter(function (m) {
          return loadedMonths.indexOf(m) === -1;
        });
        if (uncached.length > 0) {
          var batch = uncached.slice(0, LOAD_BATCH_SIZE);
          Promise.all(batch.map(function (m) { return loadMonthFromServer(m); }))
            .then(function () {
              batch.forEach(function (m) { loadedMonths.push(m); });
              loadedMonths.sort(function (a, b) { return b.localeCompare(a); });
              finishRefresh();
            })
            .catch(function () { finishRefresh(); }); // show cached data even if server fails
        } else {
          finishRefresh();
        }
      } else {
        // No cache — first visit, load latest batch from server
        var initialBatch = availableMonths.slice(0, LOAD_BATCH_SIZE);
        Promise.all(initialBatch.map(function (m) { return ensureMonthData(m); }))
          .then(function () {
            initialBatch.forEach(function (m) { loadedMonths.push(m); });
            loadedMonths.sort(function (a, b) { return b.localeCompare(a); });
            finishRefresh();
          })
          .catch(handleLoadError);
      }
    }).catch(function () {
      // IndexedDB unavailable — load from server
      var initialBatch = availableMonths.slice(0, LOAD_BATCH_SIZE);
      Promise.all(initialBatch.map(function (m) { return ensureMonthData(m); }))
        .then(function () {
          initialBatch.forEach(function (m) { loadedMonths.push(m); });
          loadedMonths.sort(function (a, b) { return b.localeCompare(a); });
          finishRefresh();
        })
        .catch(handleLoadError);
    });
  }

  function finishRefresh() {
    updateDropdowns();
    applyFilters();
    updateLoadMoreButton();
    if (!reviewsLoaded) {
      loadReviews().then(function () { renderRecords(); });
    }
  }

  function handleLoadError(err) {
    document.getElementById('records-container').innerHTML =
      '<div class="no-results"><div class="icon">\u26a0</div><div>\u6570\u636e\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u901a\u8fc7 HTTP \u670d\u52a1\u5668\u8bbf\u95ee\uff08\u4e0d\u80fd\u76f4\u63a5\u53cc\u51fb\u6253\u5f00\uff09</div></div>';
    console.error('Data load error:', err);
  }

  // ===== Load more months (progressive loading) =====
  function loadMoreMonths() {
    var unloaded = availableMonths.filter(function (m) {
      return loadedMonths.indexOf(m) === -1;
    });
    if (unloaded.length === 0) return Promise.resolve(0);

    var batch = unloaded.slice(0, LOAD_BATCH_SIZE);
    return Promise.all(batch.map(function (m) { return ensureMonthData(m); }))
      .then(function () {
        batch.forEach(function (m) { loadedMonths.push(m); });
        loadedMonths.sort(function (a, b) { return b.localeCompare(a); });
        return batch.length;
      });
  }

  // ===== Update "Load More" button (in top filter bar) =====
  function updateLoadMoreButton() {
    var btn = document.getElementById('btn-load-more');
    if (!btn) return;
    var hasMore = loadedMonths.length < availableMonths.length;

    if (hasMore) {
      var remaining = availableMonths.length - loadedMonths.length;
      btn.style.display = '';
      btn.disabled = false;
      btn.innerHTML = '加载更多数据 <span class="remaining-hint">(剩余' + remaining + '个月)</span>';
      btn.onclick = function () {
        btn.disabled = true;
        btn.innerHTML = '<span style="display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;vertical-align:middle;margin-right:0.4rem;"></span>加载中...';
        loadMoreMonths().then(function (count) {
          if (count > 0) {
            updateDropdowns();
            applyFilters();
            updateLoadMoreButton();
          } else {
            btn.style.display = 'none';
          }
        }).catch(function () {
          updateLoadMoreButton(); // restore button on error
        });
      };
    } else {
      btn.style.display = 'none';
    }
  }

  // ===== Render records =====
  function renderRecords() {
    var container = document.getElementById('records-container');
    var start = (currentPage - 1) * PAGE_SIZE;
    var end = Math.min(start + PAGE_SIZE, filteredRecords.length);
    var pageRecords = filteredRecords.slice(start, end);

    if (pageRecords.length === 0) {
      var hasMoreMonths = loadedMonths.length < availableMonths.length;
      var hint;
      if (hasMoreMonths) {
        hint = '<div style="margin-top:0.5rem;font-size:0.82rem;">\u5f53\u524d\u5df2\u52a0\u8f7d ' + getMonthRecords().length + ' \u6761\u6570\u636e\uff0c\u8fd8\u6709\u66f4\u591a\u6570\u636e\u672a\u52a0\u8f7d</div>' +
          '<div style="margin-top:0.3rem;font-size:0.82rem;color:var(--accent);cursor:pointer;font-weight:600;" id="no-result-load-more">\u70b9\u51fb\u52a0\u8f7d\u66f4\u591a\u6570\u636e \u2192</div>';
      } else {
        hint = '<div style="margin-top:0.5rem;font-size:0.82rem;">\u8bd5\u8bd5\u8c03\u6574\u641c\u7d22\u5173\u952e\u8bcd\u6216\u7b5b\u9009\u6761\u4ef6</div>';
      }
      container.innerHTML = '<div class="no-results"><div class="icon">\ud83d\udd0d</div><div>\u6ca1\u6709\u627e\u5230\u7b26\u5408\u6761\u4ef6\u7684\u62db\u8058\u4fe1\u606f</div>' + hint + '</div>';

      if (hasMoreMonths) {
        var loadLink = document.getElementById('no-result-load-more');
        if (loadLink) {
          loadLink.addEventListener('click', function () {
            loadMoreMonths().then(function (count) {
              if (count > 0) {
                updateDropdowns();
                applyFilters();
                updateLoadMoreButton();
              }
            });
          });
        }
      }
      return;
    }

    var html = '<div class="records-list">';
    pageRecords.forEach(function (rec) {
      var tagsHtml = '';
      (rec.types || []).forEach(function (t) { tagsHtml += '<span class="tag tag-type" data-tag-type="type" data-tag-value="' + escapeHtml(t) + '">' + escapeHtml(t) + '</span>'; });
      (rec.industries || []).forEach(function (i) { tagsHtml += '<span class="tag tag-industry" data-tag-type="industry" data-tag-value="' + escapeHtml(i) + '">' + escapeHtml(i) + '</span>'; });
      (rec.locations || []).forEach(function (l) { tagsHtml += '<span class="tag tag-location" data-tag-type="location" data-tag-value="' + escapeHtml(l) + '">' + escapeHtml(l) + '</span>'; });
      (rec.grades || []).forEach(function (g) { tagsHtml += '<span class="tag tag-grade" data-tag-type="grade" data-tag-value="' + escapeHtml(g) + '">' + escapeHtml(g) + '</span>'; });
      (rec.exam || []).forEach(function (e) { tagsHtml += '<span class="tag tag-exam" data-tag-type="exam" data-tag-value="' + escapeHtml(e) + '">' + escapeHtml(e) + '</span>'; });

      if (isTechRecord(rec)) {
        tagsHtml += '<span class="tag tag-techbadge">技术岗</span>';
      }

      var positionsHtml = rec.positions ? '<div class="record-positions"><span class="label">岗位：</span>' + escapeHtml(rec.positions) + '</div>' : '';

      // UP点评：优先从 reviews 数据获取，回退到 note 字段
      var reviewText = getReview(rec.company) || rec.note || '';
      var reviewHtml = reviewText ? '<div class="record-note"><span class="review-label">UP点评：</span>' + escapeHtml(reviewText) + '</div>' : '';

      var linksHtml = '<div class="record-links">';
      if (rec.apply_url) {
        var applyUrl = Array.isArray(rec.apply_url) ? rec.apply_url[0] : rec.apply_url;
        linksHtml += '<a href="' + escapeHtml(applyUrl) + '" class="btn-link btn-apply" target="_blank" rel="noopener">投递</a>';
      }
      if (rec.notice_url) {
        var noticeUrl = Array.isArray(rec.notice_url) ? rec.notice_url[0] : rec.notice_url;
        linksHtml += '<a href="' + escapeHtml(noticeUrl) + '" class="btn-link btn-notice" target="_blank" rel="noopener">公告</a>';
      }
      linksHtml += '</div>';

      var deadlineHtml = rec.deadline ? '<div class="record-deadline">截止：<b>' + escapeHtml(rec.deadline) + '</b></div>' : '<div class="record-deadline"></div>';

      html += '<div class="record-card">' +
        '<div class="record-header">' +
          '<div class="record-company" data-company="' + escapeHtml(rec.company || '') + '">' + escapeHtml(rec.company || '未知公司') + '</div>' +
          '<div class="record-date">' + escapeHtml(rec.date || '') + '</div>' +
        '</div>' +
        '<div class="tags-row">' + tagsHtml + '</div>' +
        positionsHtml +
        reviewHtml +
        '<div class="record-footer">' + deadlineHtml + linksHtml + '</div>' +
      '</div>';
    });
    html += '</div>';

    container.innerHTML = html;
  }

  // ===== Render pagination =====
  function renderPagination() {
    var container = document.getElementById('pagination');
    var totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE);

    if (totalPages <= 1) {
      container.innerHTML = totalPages === 1 ? '<span style="color:var(--muted);font-size:0.82rem;">共 1 页</span>' : '';
      return;
    }

    var html = '';
    html += '<button class="page-btn" data-page="' + (currentPage - 1) + '"' + (currentPage === 1 ? ' disabled' : '') + '>上一页</button>';

    var startPage = Math.max(1, currentPage - 2);
    var endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
      html += '<button class="page-btn" data-page="1">1</button>';
      if (startPage > 2) html += '<span class="page-ellipsis">...</span>';
    }
    for (var i = startPage; i <= endPage; i++) {
      html += '<button class="page-btn' + (i === currentPage ? ' active' : '') + '" data-page="' + i + '">' + i + '</button>';
    }
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += '<span class="page-ellipsis">...</span>';
      html += '<button class="page-btn" data-page="' + totalPages + '">' + totalPages + '</button>';
    }

    html += '<button class="page-btn" data-page="' + (currentPage + 1) + '"' + (currentPage === totalPages ? ' disabled' : '') + '>下一页</button>';
    html += '<span style="color:var(--muted);font-size:0.82rem;margin-left:0.5rem;">第 ' + currentPage + ' / ' + totalPages + ' 页</span>';

    container.innerHTML = html;

    container.querySelectorAll('.page-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (this.disabled) return;
        var page = parseInt(this.getAttribute('data-page'));
        if (page >= 1 && page <= totalPages && page !== currentPage) {
          currentPage = page;
          renderRecords();
          renderPagination();
          updateFilterInfo();
          document.querySelector('.filter-bar').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  function updateFilterInfo() {
    document.getElementById('filter-count').textContent = filteredRecords.length.toLocaleString();
    document.getElementById('filter-total').textContent = getMonthRecords().length.toLocaleString();
  }

  // ===== Setup quick filter buttons =====
  function setupQuickFilters() {
    var techBtns = document.querySelectorAll('#tech-filter .btn-toggle');
    techBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        techBtns.forEach(function (b) {
          b.classList.remove('active', 'tech', 'non-tech');
        });
        var val = this.getAttribute('data-tech');
        this.classList.add('active');
        if (val === 'tech') this.classList.add('tech');
        if (val === 'non-tech') this.classList.add('non-tech');
        techFilter = val;
        applyFilters();
      });
    });

    var catBtns = document.querySelectorAll('#cat-filter .btn-toggle');
    catBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        catBtns.forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
        catFilter = this.getAttribute('data-cat');
        applyFilters();
      });
    });
  }

  // ===== Event listeners =====
  var searchInput = document.getElementById('search-input');
  var searchTimer;
  searchInput.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilters, 300);
  });

  ['filter-industry', 'filter-type', 'filter-city', 'filter-grade', 'filter-exam'].forEach(function (id) {
    document.getElementById(id).addEventListener('change', applyFilters);
  });

  document.getElementById('btn-reset').addEventListener('click', function () {
    searchInput.value = '';
    document.getElementById('filter-industry').value = '';
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-city').value = '';
    document.getElementById('filter-grade').value = '';
    document.getElementById('filter-exam').value = '';

    techFilter = 'tech'; // Reset to tech (default)
    catFilter = '';
    var techBtns = document.querySelectorAll('#tech-filter .btn-toggle');
    techBtns.forEach(function (b) { b.classList.remove('active', 'tech', 'non-tech'); });
    if (techBtns[1]) { techBtns[1].classList.add('active', 'tech'); }
    var catBtns = document.querySelectorAll('#cat-filter .btn-toggle');
    catBtns.forEach(function (b) { b.classList.remove('active'); });
    if (catBtns[0]) catBtns[0].classList.add('active');

    tagFilters = [];
    renderTagFilterBar();
    applyFilters();
  });

  // ===== Init: load meta first, then build month selector & load default month data =====
  var metaScript = document.createElement('script');
  metaScript.src = './data/meta.js';
  metaScript.onload = function () {
    var meta = window.__JOB_META;
    if (meta) {
      totalCount = meta.total;
      document.getElementById('filter-total').textContent = meta.total.toLocaleString();
      var footerTotal = document.getElementById('footer-total');
      if (footerTotal) footerTotal.textContent = meta.total.toLocaleString();

      // Extract available months from meta.months (e.g. "2026-07": 350)
      var months = [];
      if (meta.months) {
        for (var mk in meta.months) {
          if (meta.months.hasOwnProperty(mk)) months.push(mk);
        }
      }
      months.sort(function (a, b) { return b.localeCompare(a); }); // descending

      // Fallback if meta has no months
      if (months.length === 0) {
        var now = new Date();
        var currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        months = [currentMonth];
      }

      availableMonths = months;

      // Progressive loading: start with latest months, load more on demand
      refreshData();
    }
  };
  metaScript.onerror = function () {
    console.error('Meta load error');
  };
  document.head.appendChild(metaScript);

  // ===== Event delegation: tag clicks & company name clicks =====
  document.getElementById('records-container').addEventListener('click', function (e) {
    var tagEl = e.target.closest('[data-tag-type]');
    if (tagEl) {
      e.preventDefault();
      e.stopPropagation();
      toggleTagFilter(tagEl.getAttribute('data-tag-type'), tagEl.getAttribute('data-tag-value'));
      return;
    }
    var companyEl = e.target.closest('.record-company');
    if (companyEl && companyEl.getAttribute('data-company')) {
      showCompanyModal(companyEl.getAttribute('data-company'));
    }
  });

  // ===== Modal event listeners =====
  (function setupModalEvents() {
    var overlay = document.getElementById('company-modal-overlay');

    overlay.addEventListener('click', function (e) {
      // Close on overlay click (outside modal content)
      if (e.target === overlay) {
        closeCompanyModal();
        return;
      }
      // Close button
      if (e.target.closest('.modal-close')) {
        closeCompanyModal();
        return;
      }
      // Tag click inside modal - close modal then apply filter
      var tagEl = e.target.closest('[data-tag-type]');
      if (tagEl) {
        var type = tagEl.getAttribute('data-tag-type');
        var value = tagEl.getAttribute('data-tag-value');
        closeCompanyModal();
        toggleTagFilter(type, value);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('active')) {
        closeCompanyModal();
      }
    });
  })();

  setupQuickFilters();

  // Year toggle & initial data load happen after meta.js loads (see above)
})();
