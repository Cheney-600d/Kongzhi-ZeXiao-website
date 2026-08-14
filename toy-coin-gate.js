/*
 * Toy 推荐视频投币门槛
 * 使用方式：
 * 1. 把 RECOMMEND_VIDEOS 中的占位视频替换成你的真实视频 aid、bvid 和标题。
 * 2. 默认规则是“已关注作者 + 推荐视频中至少 3 个已投币即可查看完整网站”。
 * 3. 首页前 1/3 支持试看；继续下滑或点击站内二级页面时弹出解锁层。
 * 4. 本地调试可在网址后加 ?coinGate=off 临时关闭门槛。
 * 5. 自有服务器环境会自动关闭门槛；如服务端能注入 window.TXKYER_PROJECT_PATH = '/var/www/txkyer'，会优先按该路径判断。
 */
(function () {
  'use strict';

  var REQUIRED_COINED_COUNT = 3;
  var AUTHOR_MID = '589801594';

  var RECOMMEND_VIDEOS = [
    {
      aid: 117028648130697,
      bvid: 'BV1QuGF6JEtq',
      title: '丸蛋辣！27通信电子多所名校临时改考，哪些院校还能值得放心冲？'
    },
    {
      aid: 117018414027943,
      bvid: 'BV1aKGu6VEsr',
      title: '考研暑期择校必看：热度飙升黑马vs老牌强校该怎么取舍？'
    },
    {
      aid: 117025175245246,
      bvid: 'BV1Ta3R6FEuL',
      title: '20w+次点击｜通信电子人刚需！本科/考研/就业全覆盖一条龙网站正式上线'
    },
    {
      aid: 117003599877957,
      bvid: 'BV1kz3n64EeS',
      title: '通信电子考研暑期热度排行：哪些学校看似热门实则好考？哪些冷门校就业反而更香？'
    },
    {
      aid: 115157300681598,
      bvid: 'BV1hxYKzvEGH',
      title: '27 通信电子考研扫盲：专业课、考研方向、读研方向、就业方向有哪些？怎么选？一个视频讲清楚！'
    }
  ];

  var state = {
    isChecking: false,
    gateVisible: false,
    isOwner: false,
    isFollowing: false,
    relationStatus: 'unchecked',
    coinedCount: 0,
    coinedAidSet: new Set(),
    actionMap: {},
    lastError: '',
    pendingNavigation: null
  };
  var toySdkPromise = null;

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function aidKey(aid) {
    return String(aid || '').trim();
  }

  function firstDefined(values) {
    for (var i = 0; i < values.length; i += 1) {
      if (values[i] !== undefined && values[i] !== null) return values[i];
    }
    return undefined;
  }

  function asPositive(value) {
    if (value === true) return 1;
    if (typeof value === 'string' && /^(true|yes|y|已投币|投币|coin|coined)$/i.test(value.trim())) return 1;
    var num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : 0;
  }

  function isTruthyRelation(value) {
    if (value === true) return true;
    if (typeof value === 'string') {
      return /^(true|yes|y|follow|following|followed|已关注|关注|1)$/i.test(value.trim());
    }
    if (typeof value === 'number') return value > 0;
    return false;
  }

  function isTruthyOwner(value) {
    if (value === true) return true;
    if (typeof value === 'string') {
      return /^(true|yes|y|self|author|owner|up|up主|本人|作者本人|当前作者|1)$/i.test(value.trim());
    }
    if (typeof value === 'number') return value > 0;
    return false;
  }

  function extractOwner(result) {
    var data = result && result.data ? result.data : result;
    if (!data) return false;
    var relation = data.relation && typeof data.relation === 'object' ? data.relation : {};
    return [
      data.isSelf,
      data.self,
      data.is_self,
      data.isAuthor,
      data.author,
      data.is_author,
      data.isOwner,
      data.owner,
      data.is_owner,
      data.isUp,
      data.is_up,
      data.isUploader,
      data.uploader,
      data.relationStatus,
      data.status,
      result && result.status,
      relation.isSelf,
      relation.self,
      relation.is_self,
      relation.isAuthor,
      relation.author,
      relation.is_author,
      relation.isOwner,
      relation.owner,
      relation.is_owner
    ].some(isTruthyOwner);
  }

  function extractFollowing(result) {
    var data = result && result.data ? result.data : result;
    if (!data) return false;
    var relation = data.relation && typeof data.relation === 'object' ? data.relation : {};
    return [
      data.isFollowing,
      data.following,
      data.followed,
      data.is_following,
      data.is_follow,
      data.isFollow,
      data.hasFollow,
      data.relation,
      relation.isFollowing,
      relation.following,
      relation.followed,
      relation.is_following,
      relation.is_follow,
      relation.isFollow,
      data.relationStatus,
      data.attribute
    ].some(isTruthyRelation);
  }

  function getActionAid(item, fallbackAid) {
    return aidKey(firstDefined([
      item && item.aid,
      item && item.archiveAid,
      item && item.archive_aid,
      item && item.videoAid,
      item && item.video_aid,
      fallbackAid
    ]));
  }

  function getActionCoinCount(item) {
    if (!item) return 0;
    return asPositive(firstDefined([
      item.coinCount,
      item.coin_count,
      item.coins,
      item.coin,
      item.multiply,
      item.coinNum,
      item.coin_num,
      item.isCoined,
      item.hasCoin,
      item.has_coin,
      item.coined,
      item.is_coined
    ]));
  }

  function extractActionItems(result, aids) {
    var data = result && result.data !== undefined ? result.data : result;
    var list = [];

    if (Array.isArray(result && result.items)) list = result.items;
    else if (Array.isArray(data && data.items)) list = data.items;
    else if (Array.isArray(data && data.list)) list = data.list;
    else if (Array.isArray(data && data.actions)) list = data.actions;
    else if (Array.isArray(data)) list = data;
    else if (data && typeof data === 'object') {
      var map = data.actions || data.actionMap || data.map || data;
      Object.keys(map).forEach(function (key) {
        var value = map[key];
        if (value && typeof value === 'object') {
          if (value.aid === undefined) value.aid = key;
          list.push(value);
        }
      });
    }

    if (!list.length && result && typeof result === 'object') {
      Object.keys(result).forEach(function (key) {
        var value = result[key];
        if (value && typeof value === 'object' && aids.map(aidKey).indexOf(aidKey(key)) !== -1) {
          if (value.aid === undefined) value.aid = key;
          list.push(value);
        }
      });
    }

    return list;
  }

  function getConfiguredProjectPath() {
    var candidates = [
      window.TXKYER_PROJECT_PATH,
      window.__TXKYER_PROJECT_PATH__,
      document.documentElement.getAttribute('data-project-path')
    ];
    var meta = document.querySelector('meta[name="txkyer-project-path"]');
    if (meta) {
      candidates.push(meta.getAttribute('content'));
    }
    var currentScript = document.currentScript;
    if (currentScript) {
      candidates.push(currentScript.getAttribute('data-project-path'));
    }
    var gateScript = document.querySelector('script[src*="toy-coin-gate.js"][data-project-path]');
    if (gateScript) {
      candidates.push(gateScript.getAttribute('data-project-path'));
    }

    for (var i = 0; i < candidates.length; i += 1) {
      if (typeof candidates[i] === 'string' && candidates[i].trim()) {
        return candidates[i].trim();
      }
    }
    return '';
  }

  function normalizeProjectPath(path) {
    return String(path || '')
      .replace(/\\/g, '/')
      .replace(/\/+$/, '')
      .toLowerCase();
  }

  function isOwnServerProjectPath() {
    var projectPath = normalizeProjectPath(getConfiguredProjectPath());
    return projectPath === '/var/www/txkyer' || projectPath.indexOf('/var/www/txkyer/') === 0;
  }

  function isBilibiliHost() {
    var host = location.hostname.toLowerCase();
    return /(^|\.)bilibili\.com$/.test(host) ||
      /(^|\.)bilibili\.cn$/.test(host) ||
      /(^|\.)b23\.tv$/.test(host) ||
      /(^|\.)hdslb\.com$/.test(host);
  }

  function isBilibiliToyRuntime() {
    return isBilibiliHost() && (
      location.pathname.indexOf('/toy/') !== -1 ||
      hasToySdk()
    );
  }

  function hasToySdk() {
    var toy = getToy();
    return Boolean(toy && (
      typeof toy.getVideoUserActions === 'function' ||
      typeof toy.getAuthorRelation === 'function' ||
      typeof toy.navigate === 'function'
    ));
  }

  function isOwnServerRuntime() {
    if (isOwnServerProjectPath()) return true;
    var host = location.hostname.toLowerCase();
    if (location.protocol === 'file:' ||
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '[::1]') {
      return true;
    }
    return !isBilibiliToyRuntime();
  }

  function isGateDisabled() {
    var params = new URLSearchParams(location.search);
    if (params.get('coinGate') === 'on') return false;
    if (params.get('coinGate') === 'off') return true;
    return isOwnServerRuntime();
  }

  function isVideoConfigReady() {
    return RECOMMEND_VIDEOS.length >= REQUIRED_COINED_COUNT &&
      RECOMMEND_VIDEOS.every(function (video) {
        return Number.isInteger(video.aid) &&
          video.aid > 0 &&
          typeof video.bvid === 'string' &&
          /^BV/i.test(video.bvid);
      });
  }

  function getToy() {
    return window.toy || null;
  }

  function loadToySdkOnce() {
    if (hasToySdk()) {
      return Promise.resolve(getToy());
    }
    if (toySdkPromise) {
      return toySdkPromise;
    }

    var existingScript = document.querySelector('script[src*="toy-sdk.js"]');
    if (existingScript) {
      toySdkPromise = new Promise(function (resolve, reject) {
        var timer = setTimeout(function () {
          reject(new Error('Toy SDK 加载超时'));
        }, 4500);
        existingScript.addEventListener('load', function () {
          clearTimeout(timer);
          resolve(getToy());
        }, { once: true });
        existingScript.addEventListener('error', function (err) {
          clearTimeout(timer);
          reject(err);
        }, { once: true });
      }).catch(function (err) {
        toySdkPromise = null;
        throw err;
      });
      return toySdkPromise;
    }

    toySdkPromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      var timer = setTimeout(function () {
        reject(new Error('Toy SDK 加载超时'));
      }, 4500);
      script.src = 'https://s1.hdslb.com/bfs/seed/toy/app/sdk/toy-sdk.js';
      script.async = true;
      script.onload = function () {
        clearTimeout(timer);
        resolve(getToy());
      };
      script.onerror = function (err) {
        clearTimeout(timer);
        reject(err);
      };
      document.head.appendChild(script);
    }).catch(function (err) {
      toySdkPromise = null;
      throw err;
    });
    return toySdkPromise;
  }

  function ensureGate() {
    var existing = $('#toyCoinGate');
    if (existing) return existing;

    var gate = document.createElement('section');
    gate.id = 'toyCoinGate';
    gate.setAttribute('aria-live', 'polite');
    gate.innerHTML = [
      '<div class="toy-coin-shell">',
      '  <div class="toy-coin-orb toy-coin-orb-a"></div>',
      '  <div class="toy-coin-orb toy-coin-orb-b"></div>',
      '  <div class="toy-coin-card">',
      '    <div class="toy-coin-kicker">试看结束 · 解锁完整内容</div>',
      '    <h2>解锁完整择校指南</h2>',
      '    <p class="toy-coin-desc">关注 UP，并给任意 <strong>3</strong> 个推荐视频投币。完成后点刷新即可继续看。</p>',
      '    <div class="toy-coin-steps" aria-label="解锁步骤">',
      '      <span>① 关注 UP</span>',
      '      <span>② 投 3 个视频</span>',
      '      <span>③ 刷新解锁</span>',
      '    </div>',
      '    <div class="toy-follow-status" id="toyFollowStatus">正在检测关注状态...</div>',
      '    <div class="toy-coin-progress-wrap">',
      '      <div class="toy-coin-progress-text"><span id="toyCoinStatusText">正在检测投币状态...</span><strong><span id="toyCoinCount">0</span> / ' + REQUIRED_COINED_COUNT + '</strong></div>',
      '      <div class="toy-coin-progress"><span id="toyCoinProgressBar"></span></div>',
      '    </div>',
      '    <div id="toyCoinNotice" class="toy-coin-notice"></div>',
      '    <div id="toyCoinVideos" class="toy-coin-videos"></div>',
      '    <div class="toy-coin-actions">',
      '      <button id="toyFollowAuthor" type="button" class="toy-coin-btn toy-coin-btn-follow">戳我关注 UP</button>',
      '      <button id="toyCoinRefresh" type="button" class="toy-coin-btn toy-coin-btn-primary">我已关注/投币，刷新状态</button>',
      '      <button id="toyCoinRetry" type="button" class="toy-coin-btn toy-coin-btn-ghost">重新检测</button>',
      '    </div>',
      '    <p class="toy-coin-footnote">说明：页面只读取你与当前 Toy 作者的关注关系，以及你对这些视频的点赞、投币、收藏状态，不会获取你的 UID/MID 或登录令牌。</p>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.appendChild(gate);
    injectStyles();
    bindEvents(gate);
    return gate;
  }

  function injectStyles() {
    if ($('#toyCoinGateStyles')) return;

    var style = document.createElement('style');
    style.id = 'toyCoinGateStyles';
    style.textContent = [
      '#toyCoinGate{position:fixed;inset:0;z-index:100000;display:flex;align-items:flex-start;justify-content:center;padding:clamp(18px,4vh,42px) 22px;overflow:auto;background:radial-gradient(circle at 18% 12%,rgba(251,114,153,.24),transparent 32%),radial-gradient(circle at 84% 18%,rgba(169,33,34,.35),transparent 34%),linear-gradient(135deg,rgba(18,24,38,.88),rgba(59,35,72,.86));backdrop-filter:blur(14px);}',
      '#toyCoinGate.toy-coin-unlocked{display:none;}',
      '.toy-coin-shell{position:relative;width:min(980px,100%);margin:auto 0;}',
      '.toy-coin-orb{position:absolute;border-radius:999px;filter:blur(1px);opacity:.8;pointer-events:none;}',
      '.toy-coin-orb-a{width:160px;height:160px;left:-46px;top:-48px;background:linear-gradient(135deg,#FB7299,#FFD1DF);animation:toyCoinFloat 7s ease-in-out infinite;}',
      '.toy-coin-orb-b{width:220px;height:220px;right:-72px;bottom:-80px;background:linear-gradient(135deg,#a92122,#78DCE8);animation:toyCoinFloat 8s ease-in-out infinite reverse;}',
      '.toy-coin-card{position:relative;overflow:auto;max-height:calc(100vh - 48px);border:1px solid rgba(255,255,255,.5);border-radius:30px;background:linear-gradient(145deg,rgba(255,255,255,.94),rgba(255,247,252,.9));box-shadow:0 28px 80px rgba(17,24,39,.38);padding:34px;color:#2d2d3d;}',
      '.toy-coin-card::before{content:"";position:absolute;inset:0;background:linear-gradient(120deg,transparent 0%,rgba(255,255,255,.55) 42%,transparent 58%);transform:translateX(-120%);animation:toyCoinShine 5.5s ease-in-out infinite;pointer-events:none;}',
      '.toy-coin-kicker{display:inline-flex;align-items:center;gap:8px;padding:7px 13px;border-radius:999px;background:#FFE4ED;color:#a92122;font-size:13px;font-weight:900;letter-spacing:.08em;}',
      '.toy-coin-card h2{margin:16px 0 10px;font-size:clamp(28px,5vw,48px);line-height:1.08;color:#a92122;text-shadow:none;font-weight:900;letter-spacing:-.04em;}',
      '.toy-coin-desc{max-width:760px;color:#4b5563;font-size:16px;line-height:1.7;margin:0 0 12px;}',
      '.toy-coin-desc strong{color:#FB7299;font-size:1.25em;}',
      '.toy-coin-steps{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px;}',
      '.toy-coin-steps span{display:inline-flex;align-items:center;padding:7px 11px;border-radius:999px;background:linear-gradient(135deg,#FFF1F5,#F3E8FF);color:#a92122;font-size:13px;font-weight:900;border:1px solid rgba(251,114,153,.18);}',
      '.toy-follow-status{display:inline-flex;align-items:center;width:max-content;max-width:100%;padding:8px 13px;margin:0 0 14px;border-radius:999px;background:#F3F4F6;color:#4b5563;font-size:13px;font-weight:900;}',
      '.toy-follow-status.done{background:#DCFCE7;color:#166534;}',
      '.toy-follow-status.warn{background:#FFE4ED;color:#a92122;}',
      '.toy-coin-progress-wrap{padding:16px;border-radius:20px;background:rgba(169,33,34,.14);border:1px solid rgba(169,33,34,.28);margin-bottom:16px;}',
      '.toy-coin-progress-text{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:10px;color:#4b5563;font-size:14px;}',
      '.toy-coin-progress-text strong{font-size:20px;color:#a92122;}',
      '.toy-coin-progress{height:12px;background:#efe6e6;border-radius:999px;overflow:hidden;box-shadow:inset 0 2px 6px rgba(0,0,0,.08);}',
      '.toy-coin-progress span{display:block;width:0%;height:100%;border-radius:999px;background:linear-gradient(90deg,#FB7299,#a92122,#78DCE8);transition:width .35s ease;}',
      '.toy-coin-notice{display:none;margin:0 0 16px;padding:12px 14px;border-radius:16px;background:#FFF7ED;color:#9A3412;border:1px solid #FED7AA;font-size:14px;line-height:1.6;}',
      '.toy-coin-notice.active{display:block;}',
      '.toy-coin-videos{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:18px 0;}',
      '.toy-coin-video{position:relative;display:flex;flex-direction:column;gap:10px;min-height:145px;padding:16px;border-radius:20px;background:#fff;border:1px solid rgba(169,33,34,.35);box-shadow:0 8px 24px rgba(169,33,34,.18);}',
      '.toy-coin-video.done{border-color:rgba(67,160,71,.45);background:linear-gradient(145deg,#F0FDF4,#fff);}',
      '.toy-coin-video-title{font-weight:900;line-height:1.45;color:#2d2d3d;}',
      '.toy-coin-video-meta{font-size:12px;color:#6b7280;}',
      '.toy-coin-video-status{display:inline-flex;width:max-content;padding:4px 10px;border-radius:999px;background:#F3F4F6;color:#4b5563;font-size:12px;font-weight:800;}',
      '.toy-coin-video.done .toy-coin-video-status{background:#DCFCE7;color:#166534;}',
      '.toy-coin-video button{margin-top:auto;border:none;border-radius:14px;padding:10px 12px;background:#FB7299;color:white;font-weight:900;cursor:pointer;box-shadow:0 8px 18px rgba(251,114,153,.28);transition:transform .18s ease,box-shadow .18s ease,filter .18s ease;}',
      '.toy-coin-video button:hover{transform:translateY(-2px);box-shadow:0 12px 26px rgba(251,114,153,.36);filter:brightness(1.04);}',
      '.toy-coin-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:4px;}',
      '.toy-coin-btn{border:none;border-radius:16px;padding:13px 18px;font-weight:900;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,opacity .18s ease;}',
      '.toy-coin-btn:disabled{opacity:.6;cursor:not-allowed;}',
      '.toy-coin-btn-follow{background:linear-gradient(135deg,#FB7299,#FF85AA 45%,#FFD1DF);color:#fff;box-shadow:0 12px 26px rgba(251,114,153,.38);position:relative;overflow:hidden;}',
      '.toy-coin-btn-follow::after{content:"";position:absolute;inset:-40% -20%;background:linear-gradient(120deg,transparent 35%,rgba(255,255,255,.55) 50%,transparent 65%);transform:translateX(-120%);animation:toyFollowShine 2.8s ease-in-out infinite;pointer-events:none;}',
      '.toy-coin-btn-primary{background:linear-gradient(135deg,#a92122,#FB7299);color:#fff;box-shadow:0 10px 24px rgba(169,33,34,.26);}',
      '.toy-coin-btn-ghost{background:#fff;color:#a92122;border:1px solid rgba(169,33,34,.18);}',
      '.toy-coin-btn:not(:disabled):hover{transform:translateY(-2px);}',
      '.toy-coin-footnote{margin:16px 0 0;color:#6b7280;font-size:12px;line-height:1.7;}',
      '@keyframes toyCoinFloat{0%,100%{transform:translate3d(0,0,0) scale(1);}50%{transform:translate3d(12px,-16px,0) scale(1.06);}}',
      '@keyframes toyCoinShine{0%,68%{transform:translateX(-125%);}100%{transform:translateX(125%);}}',
      '@keyframes toyFollowShine{0%,58%{transform:translateX(-120%);}100%{transform:translateX(120%);}}',
      '@media(max-width:640px){#toyCoinGate{padding:10px;align-items:flex-start;overflow:auto;}.toy-coin-card{max-height:none;padding:15px;border-radius:22px;margin:8px 0;}.toy-coin-kicker{font-size:11px;padding:6px 10px;letter-spacing:.04em;}.toy-coin-card h2{font-size:21px;line-height:1.12;margin:12px 0 8px;}.toy-coin-desc{font-size:12px;line-height:1.55;margin-bottom:9px;}.toy-coin-desc strong{font-size:1.12em;}.toy-coin-steps{gap:6px;margin-bottom:10px;}.toy-coin-steps span{font-size:11px;padding:5px 8px;}.toy-follow-status{font-size:11px;padding:6px 10px;margin-bottom:9px;}.toy-coin-progress-wrap{padding:10px;margin-bottom:9px;border-radius:16px;}.toy-coin-progress-text{font-size:11px;margin-bottom:7px;}.toy-coin-progress-text strong{font-size:17px;}.toy-coin-progress{height:9px;}.toy-coin-notice{font-size:11px;line-height:1.45;margin-bottom:9px;padding:9px 10px;border-radius:13px;}.toy-coin-videos{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0;}.toy-coin-video{min-height:126px;padding:9px;border-radius:15px;gap:6px;}.toy-coin-video-title{font-size:10.5px;line-height:1.32;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}.toy-coin-video-meta{font-size:8.5px;line-height:1.3;word-break:break-all;}.toy-coin-video-status{font-size:9.5px;padding:3px 7px;}.toy-coin-video button{font-size:10.5px;padding:7px 5px;border-radius:10px;}.toy-coin-actions{position:sticky;bottom:0;background:linear-gradient(to top,rgba(255,255,255,.98),rgba(255,255,255,.9));padding-top:9px;gap:7px;}.toy-coin-btn{flex:1 1 calc(50% - 4px);padding:10px 8px;font-size:11px;border-radius:12px;}.toy-coin-btn-follow{flex-basis:100%;font-size:13px;}.toy-coin-footnote{font-size:10px;line-height:1.5;margin-top:10px;}}'
    ].join('');

    document.head.appendChild(style);
  }

  function bindEvents(gate) {
    $('#toyFollowAuthor', gate).addEventListener('click', navigateToAuthor);
    $('#toyCoinRefresh', gate).addEventListener('click', checkCoinStatus);
    $('#toyCoinRetry', gate).addEventListener('click', checkCoinStatus);
  }

  function renderVideos() {
    var listEl = $('#toyCoinVideos');
    if (!listEl) return;

    listEl.innerHTML = RECOMMEND_VIDEOS.map(function (video, index) {
      var done = state.coinedAidSet.has(aidKey(video.aid));
      var action = state.actionMap[video.aid] || {};
      var coinCount = getActionCoinCount(action);
      var statusText = done
        ? '已识别投币 ' + coinCount + ' 枚'
        : (action.status && action.status !== 'ok' ? '检测异常：' + action.status : '待投币');
      return [
        '<article class="toy-coin-video ' + (done ? 'done' : '') + '">',
        '  <div class="toy-coin-video-status">' + escapeHtml(statusText) + '</div>',
        '  <div class="toy-coin-video-title">' + escapeHtml(index + 1 + '. ' + video.title) + '</div>',
        '  <div class="toy-coin-video-meta">aid: ' + escapeHtml(video.aid) + ' ｜ ' + escapeHtml(video.bvid) + '</div>',
        '  <button type="button" data-bvid="' + escapeHtml(video.bvid) + '">打开视频去投币</button>',
        '</article>'
      ].join('');
    }).join('');

    listEl.querySelectorAll('button[data-bvid]').forEach(function (button) {
      button.addEventListener('click', function () {
        navigateToVideo(button.getAttribute('data-bvid'));
      });
    });
  }

  async function navigateToVideo(bvid) {
    var toy = getToy();
    if (toy && typeof toy.navigate === 'function') {
      try {
        await toy.navigate({
          type: 'video',
          id: bvid,
          extra: {
            from: 'toy_coin_gate'
          }
        });
        return;
      } catch (err) {
        state.lastError = err && err.message ? err.message : String(err);
        setNotice('暂时无法通过 Toy SDK 跳转，已尝试打开普通 B站视频链接。');
      }
    }

    window.open('https://www.bilibili.com/video/' + encodeURIComponent(bvid), '_blank', 'noopener,noreferrer');
  }

  async function navigateToAuthor() {
    var toy = getToy();
    if (toy && typeof toy.navigate === 'function') {
      try {
        await toy.navigate({
          type: 'user',
          id: AUTHOR_MID,
          extra: {
            from: 'toy_coin_gate_follow'
          }
        });
        return;
      } catch (err) {
        state.lastError = err && err.message ? err.message : String(err);
        setNotice('暂时无法通过 Toy SDK 跳转关注页，已尝试打开普通 B站主页。关注后请回到本页点击“我已关注/投币，刷新状态”。');
      }
    }

    window.open('https://space.bilibili.com/' + encodeURIComponent(AUTHOR_MID), '_blank', 'noopener,noreferrer');
  }

  function setNotice(message) {
    var notice = $('#toyCoinNotice');
    if (!notice) return;
    notice.textContent = message || '';
    notice.classList.toggle('active', Boolean(message));
  }

  function setChecking(isChecking) {
    state.isChecking = isChecking;
    var refreshBtn = $('#toyCoinRefresh');
    var retryBtn = $('#toyCoinRetry');
    if (refreshBtn) {
      refreshBtn.disabled = isChecking;
      refreshBtn.textContent = isChecking ? '检测中...' : '我已关注/投币，刷新状态';
    }
    if (retryBtn) {
      retryBtn.disabled = isChecking;
    }
  }

  function updateFollowStatus() {
    var el = $('#toyFollowStatus');
    if (!el) return;

    el.classList.remove('done', 'warn');
    if (state.isOwner) {
      el.textContent = '已识别为作者本人，自动解锁';
      el.classList.add('done');
      return;
    }

    if (state.isFollowing) {
      el.textContent = '已识别关注作者';
      el.classList.add('done');
      return;
    }

    if (state.relationStatus === 'error') {
      el.textContent = '关注状态检测失败，请确认已登录并在 B站 Toy 环境访问';
      el.classList.add('warn');
      return;
    }

    el.textContent = '还需要先关注作者';
    el.classList.add('warn');
  }

  function updateProgress() {
    var count = Math.min(state.coinedCount, REQUIRED_COINED_COUNT);
    var percent = Math.round(count / REQUIRED_COINED_COUNT * 100);
    var countEl = $('#toyCoinCount');
    var barEl = $('#toyCoinProgressBar');
    var statusEl = $('#toyCoinStatusText');

    if (countEl) countEl.textContent = String(state.coinedCount);
    if (barEl) barEl.style.width = percent + '%';
    if (statusEl) {
      statusEl.textContent = isUnlocked()
        ? '已满足关注与投币门槛，正在解锁...'
        : state.coinedCount >= REQUIRED_COINED_COUNT
          ? '投币数量已满足，还需要确认关注状态'
        : '还差 ' + Math.max(REQUIRED_COINED_COUNT - state.coinedCount, 0) + ' 个投币视频';
    }
    updateFollowStatus();
  }

  function isUnlocked() {
    return state.isOwner || (state.isFollowing && state.coinedCount >= REQUIRED_COINED_COUNT);
  }

  function unlockSite() {
    state.gateVisible = false;
    document.documentElement.classList.remove('toy-coin-gate-pending');
    document.documentElement.classList.remove('toy-coin-gate-preview');
    document.documentElement.classList.add('toy-coin-gate-unlocked');
    var gate = $('#toyCoinGate');
    if (gate) {
      gate.classList.add('toy-coin-unlocked');
    }
    if (state.pendingNavigation) {
      var href = state.pendingNavigation;
      state.pendingNavigation = null;
      setTimeout(function () {
        location.href = href;
      }, 80);
    }
  }

  function lockSite() {
    state.gateVisible = true;
    document.documentElement.classList.add('toy-coin-gate-pending');
    document.documentElement.classList.remove('toy-coin-gate-unlocked');
    var gate = ensureGate();
    gate.classList.remove('toy-coin-unlocked');
  }

  async function checkFollowStatus(toy) {
    if (!toy || typeof toy.getAuthorRelation !== 'function') {
      state.isFollowing = false;
      state.relationStatus = 'error';
      return;
    }

    try {
      var result = await toy.getAuthorRelation();
      window.__toyCoinGateLastFollowResult = result;
      state.isOwner = extractOwner(result);
      state.isFollowing = extractFollowing(result);
      state.relationStatus = result && result.status ? result.status : 'ok';
      console.info('[ToyCoinGate] 关注检测结果', result);
    } catch (err) {
      state.isOwner = false;
      state.isFollowing = false;
      state.relationStatus = 'error';
      console.error('[ToyCoinGate] 关注检测失败', err);
    }
  }

  async function checkCoinStatus() {
    if (state.isChecking) return;

    if (!isVideoConfigReady()) {
      lockSite();
      state.coinedCount = 0;
      state.coinedAidSet = new Set();
      state.actionMap = {};
      state.isOwner = false;
      state.isFollowing = false;
      state.relationStatus = 'error';
      updateProgress();
      renderVideos();
      setNotice('推荐视频还没有配置完成：请把 toy-coin-gate.js 顶部的 RECOMMEND_VIDEOS 替换成真实 aid、bvid 和标题。');
      return;
    }

    var toy = getToy();
    if (!toy || typeof toy.getVideoUserActions !== 'function') {
      try {
        toy = await loadToySdkOnce();
      } catch (err) {
        state.lastError = err && err.message ? err.message : String(err);
      }
    }
    if (!toy || typeof toy.getVideoUserActions !== 'function') {
      lockSite();
      state.coinedCount = 0;
      state.coinedAidSet = new Set();
      state.actionMap = {};
      state.isOwner = false;
      state.isFollowing = false;
      state.relationStatus = 'error';
      updateProgress();
      renderVideos();
      setNotice('当前环境没有检测到 Toy SDK，正式发布到 B站 Toy 环境后会自动检测投币状态。本地调试可在网址后加 ?coinGate=off。');
      return;
    }

    setChecking(true);
    setNotice('');

    try {
      await checkFollowStatus(toy);

      if (state.isOwner) {
        state.coinedAidSet = new Set();
        state.coinedCount = REQUIRED_COINED_COUNT;
        state.actionMap = {};
        updateProgress();
        renderVideos();
        setNotice('作者本人已自动解锁。');
        setTimeout(unlockSite, 250);
        return;
      }

      var aids = RECOMMEND_VIDEOS.map(function (video) { return video.aid; });
      var result = await toy.getVideoUserActions({ aids: aids });
      var coinedAidSet = new Set();
      var actionMap = {};
      var items = extractActionItems(result, aids);
      window.__toyCoinGateLastCoinResult = result;

      items.forEach(function (item, index) {
        var aid = getActionAid(item, aids[index]);
        if (aid) {
          actionMap[aid] = item || { status: 'missing' };
        }
        if (item && getActionCoinCount(item) > 0) {
          coinedAidSet.add(aid);
        }
      });

      state.coinedAidSet = coinedAidSet;
      state.coinedCount = coinedAidSet.size;
      state.actionMap = actionMap;
      updateProgress();
      renderVideos();
      console.info('[ToyCoinGate] 投币检测结果', result);

      if (isUnlocked()) {
        setTimeout(unlockSite, 450);
      } else {
        lockSite();
        setNotice('解锁条件：关注 UP + 投 3 个不同视频。');
      }
    } catch (err) {
      lockSite();
      state.lastError = err && err.message ? err.message : String(err);
      setNotice('检测失败：请确认已登录，稍后再刷新。');
      updateProgress();
      renderVideos();
      console.error('[ToyCoinGate]', err);
    } finally {
      setChecking(false);
    }
  }

  function requestGate(reason, pendingNavigation) {
    if (isGateDisabled() || document.documentElement.classList.contains('toy-coin-gate-unlocked')) {
      return false;
    }

    if (pendingNavigation) {
      state.pendingNavigation = pendingNavigation;
    }

    lockSite();
    renderVideos();
    updateProgress();
    if (reason === 'scroll') {
      setNotice('试看结束：关注 UP + 投 3 个视频后解锁。');
    } else {
      setNotice('完整内容需先解锁。');
    }
    checkCoinStatus();
    return true;
  }

  function isInternalHref(href) {
    if (!href || href === '#' || href.indexOf('javascript:') === 0) return false;
    try {
      var url = new URL(href, location.href);
      return url.origin === location.origin && url.pathname !== location.pathname + '#';
    } catch (err) {
      return false;
    }
  }

  function bindPreviewTriggers() {
    var triggeredByScroll = false;

    window.addEventListener('scroll', function () {
      if (triggeredByScroll || state.gateVisible || document.documentElement.classList.contains('toy-coin-gate-unlocked')) {
        return;
      }

      var home = $('#homePage');
      var baseHeight = home ? home.scrollHeight : document.documentElement.scrollHeight;
      var threshold = Math.max(480, Math.floor(baseHeight / 3));
      if (window.scrollY > threshold) {
        triggeredByScroll = true;
        requestGate('scroll');
      }
    }, { passive: true });

    document.addEventListener('click', function (event) {
      if (state.gateVisible || document.documentElement.classList.contains('toy-coin-gate-unlocked')) {
        return;
      }

      if (event.target.closest('#toyCoinGate')) {
        return;
      }

      var detailTarget = event.target.closest('[onclick*="goDetail"], .school-link');
      if (detailTarget) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        requestGate('detail');
        return;
      }

      var link = event.target.closest('a[href]');
      if (!link) return;
      var href = link.getAttribute('href');
      if (!isInternalHref(href)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      requestGate('navigation', link.href);
    }, true);
  }

  function init() {
    if (isGateDisabled()) {
      unlockSite();
      return;
    }

    document.documentElement.classList.remove('toy-coin-gate-pending');
    document.documentElement.classList.add('toy-coin-gate-preview');
    bindPreviewTriggers();
    if (isBilibiliHost() || hasToySdk() || new URLSearchParams(location.search).get('coinGate') === 'on') {
      loadToySdkOnce().catch(function (err) {
        console.warn('[ToyCoinGate] Toy SDK 异步加载失败', err);
      });
    }

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && state.gateVisible && !document.documentElement.classList.contains('toy-coin-gate-unlocked')) {
        checkCoinStatus();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
