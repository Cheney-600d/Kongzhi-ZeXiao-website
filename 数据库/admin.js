(function () {
  'use strict';

  var state = {
    csrf: '', user: null, schools: [], schoolId: 0, scope: 'school', modules: [], activeId: 0,
    saveTimer: 0, saving: false, selectedFile: null, heatFile: null, heatPreview: null,
    schoolManagerId: 0, schoolManagerModules: [], schoolManagerRequest: 0,
    siteMedia: [], courseResources: [], historyPage: 1, historyTotal: 0, historyPageSize: 30
  };

  var $ = function (selector) { return document.querySelector(selector); };
  var els = {
    loginView: $('#loginView'), loginForm: $('#loginForm'), loginUsername: $('#loginUsername'),
    loginPassword: $('#loginPassword'), loginMessage: $('#loginMessage'), adminApp: $('#adminApp'),
    contentScope: $('#contentScope'), schoolSelect: $('#schoolSelect'), schoolSelectLabel: $('#schoolSelectLabel'), moduleList: $('#moduleList'), moduleCount: $('#moduleCount'),
    moduleForm: $('#moduleForm'), editorEmpty: $('#editorEmpty'), editorTitle: $('#editorTitle'),
    editorSubtitle: $('#editorSubtitle'), saveStatus: $('#saveStatus'), livePreview: $('#livePreview'),
    publishCheck: $('#publishCheck'), publicPreviewLink: $('#publicPreviewLink'), toast: $('#toast'),
    typeMenu: $('#moduleTypeMenu'), addModuleBtn: $('#addModuleBtn'), publishBtn: $('#publishBtn'),
    fieldType: $('#fieldType'), fieldStatus: $('#fieldStatus'), fieldTitle: $('#fieldTitle'),
    fieldDescription: $('#fieldDescription'), fieldLink: $('#fieldLink'), fieldLinkGeneric: $('#fieldLinkGeneric'),
    fieldVideoList: $('#fieldVideoList'),
    fieldExpiresAt: $('#fieldExpiresAt'), fieldCta: $('#fieldCta'), fieldCtaDefault: $('#fieldCtaDefault'),
    fieldPublishAt: $('#fieldPublishAt'), fieldUnpublishAt: $('#fieldUnpublishAt'),
    videoFields: $('#videoFields'), examVideoListFields: $('#examVideoListFields'), linkFields: $('#linkFields'), qrFields: $('#qrFields'),
    defaultCtaField: $('#defaultCtaField'), coverFields: $('#coverFields'), coverLabel: $('#coverLabel'),
    coverPreview: $('#coverPreview'), coverInput: $('#coverInput'), videoFetchStatus: $('#videoFetchStatus'),
    fetchVideoListBtn: $('#fetchVideoListBtn'), videoListFetchStatus: $('#videoListFetchStatus'),
    editorMessage: $('#editorMessage')
  };

  var typeLabels = { video: '视频', qr_group: '二维码', image: '图片', link: '链接', rich_text: '公告' };

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char];
    });
  }

  function safeUrl(value) {
    var url = String(value || '').trim();
    return /^(https?:\/\/|\/|\.\.\/|\.\/)/i.test(url) ? url : '#';
  }

  function adminAssetUrl(value) {
    var url = String(value || '').trim().replace(/\\/g, '/');
    if (!url || (/^[a-z][a-z0-9+.-]*:/i.test(url) && !/^https?:\/\//i.test(url))) return '';
    if (/^(https?:\/\/|\/|\.\.\/)/i.test(url)) return url;
    return '../' + url.replace(/^\.\//, '').replace(/^\/+/, '');
  }

  function normalizeExternalUrl(value) {
    var text = String(value || '').trim();
    if (!text) return '';
    var match = text.match(/https?:\/\/[^\s"'<>，。；;]+/i);
    if (!match) match = text.match(/(?:pan\.baidu\.com|b23\.tv|(?:www\.)?bilibili\.com)\/[^\s"'<>，。；;]+/i);
    var url = match ? match[0] : text;
    if (!/^https?:\/\//i.test(url) && /^(?:pan\.baidu\.com|b23\.tv|(?:www\.)?bilibili\.com)\//i.test(url)) url = 'https://' + url;
    url = url.replace(/[，。；;、）)\]】]+$/g, '');
    return /^https?:\/\//i.test(url) ? url : '';
  }

  function uniqueVideoUrls(value) {
    var seen = {};
    return String(value || '').split(/\r?\n/).map(normalizeExternalUrl).filter(function (url) {
      if (!url || seen[url]) return false;
      seen[url] = true;
      return true;
    });
  }

  function getVideoItems(item) {
    var configured = item && item.config && Array.isArray(item.config.video_items) ? item.config.video_items : [];
    var items = configured.map(function (video) {
      return {
        url: normalizeExternalUrl(video && (video.url || video.link_url)),
        title: String(video && video.title || '').trim(),
        platform: String(video && video.platform || '').trim(),
        duration: String(video && video.duration || '').trim(),
        cover_url: String(video && video.cover_url || '').trim()
      };
    }).filter(function (video) { return video.url; });
    if (!items.length && item && normalizeExternalUrl(item.link_url)) {
      items.push({
        url: normalizeExternalUrl(item.link_url), title: item.title || '',
        platform: item.config && item.config.platform || '哔哩哔哩',
        duration: item.config && item.config.duration || '', cover_url: item.cover_url || ''
      });
    }
    return items;
  }

  async function api(path, options) {
    options = options || {};
    var headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    if (state.csrf && options.method && options.method !== 'GET') headers['X-CSRF-Token'] = state.csrf;
    var response = await fetch(path, Object.assign({ credentials: 'same-origin', headers: headers }, options));
    var json = await response.json().catch(function () { return { code: 1, msg: '服务器返回格式错误' }; });
    if (response.status === 401 && path !== '/api/admin/login') showLogin('登录状态已失效，请重新登录。');
    if (!response.ok || json.code !== 0) throw new Error(json.msg || '请求失败');
    return json.data;
  }

  function showMessage(node, message, ok) {
    node.textContent = message || '';
    node.classList.toggle('is-error', !!message && !ok);
    node.classList.toggle('is-success', !!message && !!ok);
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('is-visible');
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(function () { els.toast.classList.remove('is-visible'); }, 2200);
  }

  function showLogin(message) {
    els.adminApp.hidden = true;
    els.loginView.hidden = false;
    showMessage(els.loginMessage, message || '', false);
  }

  function showAdmin(data) {
    state.user = data.user;
    state.csrf = data.csrf_token;
    els.loginView.hidden = true;
    els.adminApp.hidden = false;
    $('#adminDisplayName').textContent = data.user.display_name;
    $('#adminRole').textContent = data.user.role === 'super_admin' ? '超级管理员' : '内容编辑';
  }

  async function boot() {
    try {
      var data = await api('/api/admin/me');
      showAdmin(data);
      await loadSchools();
      await switchAdminView('overview');
    } catch (error) {
      showLogin('');
    }
  }

  els.loginForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    var button = els.loginForm.querySelector('button');
    button.disabled = true;
    showMessage(els.loginMessage, '正在验证…', true);
    try {
      var data = await api('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username: els.loginUsername.value.trim(), password: els.loginPassword.value })
      });
      showAdmin(data);
      els.loginPassword.value = '';
      await loadSchools();
      await switchAdminView('overview');
    } catch (error) {
      showMessage(els.loginMessage, error.message, false);
    } finally {
      button.disabled = false;
    }
  });

  $('#logoutBtn').addEventListener('click', async function () {
    try { await api('/api/admin/logout', { method: 'POST', body: '{}' }); } catch (error) {}
    state.csrf = '';
    showLogin('已安全退出。');
  });

  function syncSchoolSelectOptions() {
    var selected = state.schools.some(function (school) { return school.id === Number(state.schoolId); }) ? Number(state.schoolId) : 0;
    els.schoolSelect.innerHTML = state.schools.map(function (school) {
      return '<option value="' + school.id + '">' + escapeHtml(school.name) + '</option>';
    }).join('');
    var preferred = state.schools.find(function (school) { return school.id === selected; }) || state.schools.find(function (school) { return school.name === '浙江工业大学'; }) || state.schools[0];
    if (!preferred) throw new Error('当前账号没有可管理的院校');
    state.schoolId = preferred.id;
    els.schoolSelect.value = String(preferred.id);
  }

  async function loadSchools() {
    var data = await api('/api/admin/schools');
    state.schools = data.items || [];
    syncSchoolSelectOptions();
    syncScopeUi();
    await loadModules();
  }

  function currentSchool() {
    return state.schools.find(function (school) { return school.id === Number(state.schoolId); });
  }

  function syncPublicLink() {
    var school = currentSchool();
    els.publicPreviewLink.href = state.scope === 'exam' ? '../真题备考区.html' : (school ? '../index.html?school=' + encodeURIComponent(school.name) + '&uiView=school-detail#schoolContentModules' : '#');
  }

  function syncScopeUi() {
    var exam = state.scope === 'exam';
    els.schoolSelectLabel.hidden = exam;
    $('#contentBreadcrumb').textContent = exam ? '真题备考区' : '院校详情页';
    $('#moduleEyebrow').textContent = exam ? 'Exam resources operations' : 'School detail operations';
    $('#moduleDescription').textContent = exam ? '配置百度云真题资料入口与 B 站配套讲解视频，并控制发布顺序。' : '按院校维护视频、群二维码、图片和链接，并控制发布状态。';
    Array.prototype.forEach.call(document.querySelectorAll('.scope-school-only'), function (item) { item.hidden = exam; });
    els.fieldLinkGeneric.placeholder = exam ? '可粘贴完整百度云分享文本或 https:// 链接' : 'https://';
    syncPublicLink();
  }

  els.contentScope.addEventListener('change', async function () {
    state.scope = els.contentScope.value === 'exam' ? 'exam' : 'school';
    state.activeId = 0;
    els.typeMenu.hidden = true;
    syncScopeUi();
    await loadModules();
  });

  els.schoolSelect.addEventListener('change', async function () {
    state.schoolId = Number(els.schoolSelect.value);
    state.activeId = 0;
    syncPublicLink();
    await loadModules();
  });

  async function loadModules(preferredId) {
    var path = state.scope === 'exam' ? '/api/admin/global-modules?section=exam_resources' : '/api/admin/schools/' + state.schoolId + '/modules';
    var data = await api(path);
    state.modules = data.items || [];
    if (preferredId && state.modules.some(function (item) { return item.id === preferredId; })) state.activeId = preferredId;
    else if (!state.modules.some(function (item) { return item.id === state.activeId; })) state.activeId = state.modules[0] ? state.modules[0].id : 0;
    renderModuleList();
    renderEditor();
  }

  function schoolManagerFilteredItems() {
    var keyword = $('#schoolManagerSearch').value.trim().toLowerCase();
    var tier = $('#schoolManagerTier').value;
    return state.schools.filter(function (school) {
      var haystack = (school.name + ' ' + (school.province || '')).toLowerCase();
      return (!keyword || haystack.indexOf(keyword) !== -1) && (!tier || (school.tier || '') === tier);
    });
  }

  function renderSchoolManagerList() {
    var items = schoolManagerFilteredItems();
    $('#schoolManagerResult').textContent = '当前显示 ' + items.length + ' / ' + state.schools.length + ' 所院校';
    $('#schoolManagerList').innerHTML = items.length ? items.map(function (school) {
      var active = school.id === Number(state.schoolManagerId);
      var logoUrl = adminAssetUrl(school.logo_url);
      var logo = logoUrl ? '<img src="' + escapeHtml(logoUrl) + '" alt="">' : '<i class="fa-solid fa-building-columns"></i>';
      return '<button class="school-manager-item' + (active ? ' is-active' : '') + '" type="button" data-school-manage="' + school.id + '">' +
        '<span class="school-manager-item__logo">' + logo + '</span><span><b>' + escapeHtml(school.name) + '</b><small>' +
        escapeHtml((school.province || '地区待补充') + ' · ' + (school.tier || '普通院校')) + '</small></span><span class="school-manager-item__count"><strong>' +
        formatCount(school.module_count) + ' 个模块</strong><i class="fa-solid fa-chevron-right"></i></span></button>';
    }).join('') : '<p class="school-manager-empty">没有符合当前条件的院校</p>';
  }

  function renderSchoolProfile(school, modules) {
    $('#schoolProfileEmpty').hidden = true;
    $('#schoolProfileContent').hidden = false;
    $('#schoolProfileName').textContent = school.name;
    $('#schoolProfileMeta').textContent = (school.province || '地区待补充') + ' / ' + (school.tier || '普通院校');
    var profileLogoUrl = adminAssetUrl(school.logo_url);
    $('#schoolProfileLogo').innerHTML = profileLogoUrl ? '<img src="' + escapeHtml(profileLogoUrl) + '" alt="' + escapeHtml(school.name) + '">' : '<i class="fa-solid fa-building-columns"></i>';
    $('#schoolProfilePublicLink').href = '../index.html?school=' + encodeURIComponent(school.name) + '&uiView=school-detail#schoolContentModules';
    var published = modules.filter(function (item) { return item.status === 'published'; }).length;
    var drafts = modules.filter(function (item) { return item.status === 'draft'; }).length;
    $('#schoolProfileModules').textContent = formatCount(modules.length);
    $('#schoolProfilePublished').textContent = formatCount(published);
    $('#schoolProfileDrafts').textContent = formatCount(drafts);
    if (school.modules_updated_at) {
      var updated = new Date(school.modules_updated_at);
      $('#schoolProfileUpdate').textContent = '最近更新：' + (Number.isNaN(updated.getTime()) ? school.modules_updated_at : updated.toLocaleString('zh-CN', { hour12: false }));
    } else {
      $('#schoolProfileUpdate').textContent = '尚未配置模块';
    }
    var icons = { video: 'fa-circle-play', qr_group: 'fa-qrcode', image: 'fa-image', link: 'fa-link', rich_text: 'fa-align-left' };
    $('#schoolProfileModulesList').innerHTML = modules.length ? modules.map(function (item) {
      var publishedItem = item.status === 'published';
      return '<button class="school-profile-module" type="button" data-edit-school="' + school.id + '" data-edit-module="' + item.id + '"><i class="fa-solid ' +
        (icons[item.type] || 'fa-layer-group') + '"></i><span><b>' + escapeHtml(item.title) + '</b><small>' + escapeHtml(typeLabels[item.type] || item.type) +
        ' · 点击进入内容模块编辑</small></span><span class="school-profile-module__state"><span class="' + (publishedItem ? 'is-published' : '') + '">' +
        (publishedItem ? '已发布' : item.status === 'archived' ? '已归档' : '草稿') + '</span><i class="fa-solid fa-arrow-right"></i></span></button>';
    }).join('') : '<div class="school-profile-modules__empty">该院校还没有详情页模块。<br>点击“添加模块”即可进入内容模块创建。</div>';
  }

  async function loadSchoolManagerDetail(schoolId) {
    var school = state.schools.find(function (item) { return item.id === Number(schoolId); });
    if (!school) return;
    state.schoolManagerId = school.id;
    renderSchoolManagerList();
    var requestId = ++state.schoolManagerRequest;
    $('#schoolProfileEmpty').hidden = true;
    $('#schoolProfileContent').hidden = false;
    $('#schoolProfileName').textContent = school.name;
    $('#schoolProfileModulesList').innerHTML = '<div class="school-profile-modules__empty">正在读取详情页配置…</div>';
    try {
      var data = await api('/api/admin/schools/' + school.id + '/modules');
      if (requestId !== state.schoolManagerRequest) return;
      state.schoolManagerModules = data.items || [];
      renderSchoolProfile(school, state.schoolManagerModules);
    } catch (error) {
      if (requestId === state.schoolManagerRequest) $('#schoolProfileModulesList').innerHTML = '<div class="school-profile-modules__empty">' + escapeHtml(error.message) + '</div>';
    }
  }

  async function applySchoolManagerFilters() {
    var items = schoolManagerFilteredItems();
    if (items.length && !items.some(function (school) { return school.id === Number(state.schoolManagerId); })) {
      await loadSchoolManagerDetail(items[0].id);
    } else {
      renderSchoolManagerList();
    }
  }

  async function loadSchoolManagement() {
    var data = await api('/api/admin/schools');
    state.schools = data.items || [];
    syncSchoolSelectOptions();
    $('#schoolManagementCount').textContent = formatCount(state.schools.length);
    var selectedTier = $('#schoolManagerTier').value;
    var tiers = Array.from(new Set(state.schools.map(function (school) { return school.tier || ''; }).filter(Boolean))).sort();
    $('#schoolManagerTier').innerHTML = '<option value="">全部层级</option>' + tiers.map(function (tier) { return '<option value="' + escapeHtml(tier) + '">' + escapeHtml(tier) + '</option>'; }).join('');
    if (tiers.indexOf(selectedTier) !== -1) $('#schoolManagerTier').value = selectedTier;
    var preferred = state.schools.find(function (school) { return school.id === Number(state.schoolManagerId || state.schoolId); }) || state.schools[0];
    if (preferred) await loadSchoolManagerDetail(preferred.id);
    else {
      renderSchoolManagerList();
      $('#schoolProfileEmpty').hidden = false;
      $('#schoolProfileContent').hidden = true;
    }
  }

  async function openSchoolModuleEditor(schoolId, moduleId, showAddMenu) {
    state.scope = 'school';
    els.contentScope.value = 'school';
    state.schoolId = Number(schoolId);
    els.schoolSelect.value = String(state.schoolId);
    state.activeId = Number(moduleId) || 0;
    syncScopeUi();
    await switchAdminView('modules');
    await loadModules(state.activeId);
    if (showAddMenu) els.typeMenu.hidden = false;
  }

  $('#schoolManagerSearch').addEventListener('input', applySchoolManagerFilters);
  $('#schoolManagerTier').addEventListener('change', applySchoolManagerFilters);
  $('#schoolManagerList').addEventListener('click', function (event) {
    var button = event.target.closest('[data-school-manage]');
    if (button) loadSchoolManagerDetail(Number(button.dataset.schoolManage));
  });
  $('#schoolProfileModulesList').addEventListener('click', function (event) {
    var button = event.target.closest('[data-edit-module]');
    if (button) openSchoolModuleEditor(Number(button.dataset.editSchool), Number(button.dataset.editModule), false);
  });
  $('#schoolProfileConfigureBtn').addEventListener('click', function () { openSchoolModuleEditor(state.schoolManagerId, 0, false); });
  $('#schoolProfileAddBtn').addEventListener('click', function () { openSchoolModuleEditor(state.schoolManagerId, 0, true); });

  function renderModuleList() {
    els.moduleCount.textContent = state.modules.length + ' 个模块';
    if (!state.modules.length) {
      els.moduleList.innerHTML = '<div class="empty-editor" style="min-height:180px"><i class="fa-regular fa-folder-open"></i><h3>还没有模块</h3><p>点击下方按钮添加第一项内容。</p></div>';
      return;
    }
    els.moduleList.innerHTML = state.modules.map(function (item) {
      var published = item.status === 'published';
      return '<article class="module-card' + (item.id === state.activeId ? ' is-active' : '') + '" draggable="true" data-id="' + item.id + '" data-type="' + item.type + '">' +
        '<i class="module-card__handle fa-solid fa-grip-vertical" aria-hidden="true"></i>' +
        '<div class="module-card__main"><span class="module-card__type">' + escapeHtml(typeLabels[item.type] || item.type) + '</span><b>' + escapeHtml(item.title) + '</b></div>' +
        '<span class="module-card__status' + (published ? ' is-published' : '') + '">' + (published ? '已发布' : item.status === 'archived' ? '已归档' : '草稿') + '</span></article>';
    }).join('');
    Array.prototype.forEach.call(els.moduleList.querySelectorAll('.module-card'), bindModuleCard);
  }

  function bindModuleCard(card) {
    var id = Number(card.dataset.id);
    card.addEventListener('click', function () { state.activeId = id; renderModuleList(); renderEditor(); });
    card.addEventListener('dragstart', function (event) { card.classList.add('is-dragging'); event.dataTransfer.setData('text/plain', String(id)); });
    card.addEventListener('dragend', function () { card.classList.remove('is-dragging'); });
    card.addEventListener('dragover', function (event) { event.preventDefault(); });
    card.addEventListener('drop', async function (event) {
      event.preventDefault();
      var fromId = Number(event.dataTransfer.getData('text/plain'));
      if (!fromId || fromId === id) return;
      var fromIndex = state.modules.findIndex(function (item) { return item.id === fromId; });
      var toIndex = state.modules.findIndex(function (item) { return item.id === id; });
      var moved = state.modules.splice(fromIndex, 1)[0];
      state.modules.splice(toIndex, 0, moved);
      renderModuleList();
      try {
        var reorderPath = state.scope === 'exam' ? '/api/admin/global-modules/reorder' : '/api/admin/modules/reorder';
        var reorderPayload = state.scope === 'exam' ? { section_key: 'exam_resources', ordered_ids: state.modules.map(function (item) { return item.id; }) } : { school_id: state.schoolId, ordered_ids: state.modules.map(function (item) { return item.id; }) };
        var data = await api(reorderPath, { method: 'POST', body: JSON.stringify(reorderPayload) });
        state.modules = data.items;
        renderModuleList();
        toast('展示顺序已保存');
      } catch (error) { toast(error.message); await loadModules(fromId); }
    });
  }

  function activeModule() {
    return state.modules.find(function (item) { return item.id === state.activeId; });
  }

  function toLocalDate(value) {
    if (!value) return '';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
    var offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
  }

  function renderEditor() {
    var item = activeModule();
    if (!item) {
      els.moduleForm.hidden = true; els.editorEmpty.hidden = false; els.editorTitle.textContent = '选择一个模块开始编辑';
      els.livePreview.innerHTML = '<div class="empty-editor" style="min-height:270px"><i class="fa-regular fa-eye"></i><h3>等待预览</h3><p>选择模块后查看公开页效果。</p></div>';
      renderChecks(null); return;
    }
    els.moduleForm.hidden = false; els.editorEmpty.hidden = true;
    els.editorTitle.textContent = '编辑' + (typeLabels[item.type] || '') + '模块';
    els.editorSubtitle.textContent = '模块 ID ' + item.id + ' · 最后更新 ' + String(item.updated_at || '').replace('T', ' ').slice(0, 16);
    els.fieldType.value = item.type; els.fieldStatus.value = item.status; els.fieldTitle.value = item.title || '';
    els.fieldDescription.value = item.description || ''; els.fieldLink.value = item.link_url || ''; els.fieldLinkGeneric.value = item.link_url || '';
    els.fieldVideoList.value = getVideoItems(item).map(function (video) { return video.url; }).join('\n');
    els.fieldExpiresAt.value = (item.config && item.config.expires_at) || '';
    els.fieldCta.value = (item.config && item.config.cta) || '扫码加入';
    els.fieldCtaDefault.value = (item.config && item.config.cta) || '查看详情';
    els.fieldPublishAt.value = toLocalDate(item.publish_at); els.fieldUnpublishAt.value = toLocalDate(item.unpublish_at);
    syncTypeFields(item.type); renderCover(item); renderPreview(item); renderChecks(item); setSaveStatus('已保存', true);
  }

  function syncTypeFields(type) {
    var examVideo = state.scope === 'exam' && type === 'video';
    els.videoFields.hidden = type !== 'video' || examVideo;
    els.examVideoListFields.hidden = !examVideo;
    els.linkFields.hidden = !(type === 'link' || type === 'image');
    els.qrFields.hidden = type !== 'qr_group';
    els.defaultCtaField.hidden = type === 'qr_group' || type === 'rich_text';
    els.coverFields.hidden = type === 'link' || type === 'rich_text' || examVideo;
    els.coverLabel.textContent = type === 'qr_group' ? '二维码图片' : type === 'image' ? '模块图片' : '视频封面';
  }

  function renderCover(item) {
    if (item.cover_url) els.coverPreview.innerHTML = '<img src="' + escapeHtml(safeUrl(item.cover_url)) + '" alt="' + escapeHtml(item.title) + '">';
    else els.coverPreview.innerHTML = '<div><i class="fa-regular fa-image"></i><span>暂无封面</span></div>';
  }

  function renderPreview(item) {
    if (!item) return;
    var examVideo = state.scope === 'exam' && item.type === 'video';
    if (examVideo) {
      var videos = getVideoItems(item);
      var rows = videos.length ? videos.map(function (video, index) {
        return '<div class="preview-video-list__item"><span>' + String(index + 1).padStart(2, '0') + '</span><div><b>' + escapeHtml(video.title || '待获取视频标题') + '</b><small>' + escapeHtml(video.platform || '视频链接') + (video.duration ? ' · ' + escapeHtml(video.duration) : '') + '</small></div><i class="fa-solid fa-arrow-up-right-from-square"></i></div>';
      }).join('') : '<div class="preview-video-list__empty">粘贴视频链接后，公开页将显示为可跳转列表。</div>';
      els.livePreview.innerHTML = '<article class="preview-card"><div class="preview-card__body"><span class="preview-card__tag">视频列表</span><h3>' + escapeHtml(item.title) + '</h3><p>' + escapeHtml(item.description || '真题配套讲解视频列表。') + '</p><div class="preview-video-list">' + rows + '</div></div></article>';
      return;
    }
    var type = typeLabels[item.type] || '内容';
    var cover = item.cover_url ? '<img src="' + escapeHtml(safeUrl(item.cover_url)) + '" alt="">' : '<i class="fa-regular fa-image" style="font-size:28px"></i>';
    var coverBlock = '';
    if (item.type === 'video') coverBlock = '<div class="preview-card__cover">' + cover + '<span class="play"><i class="fa-solid fa-play"></i></span></div>';
    else if (item.type === 'qr_group') coverBlock = '<div class="preview-card__cover" style="height:154px">' + (item.cover_url ? '<img class="preview-card__qr" src="' + escapeHtml(safeUrl(item.cover_url)) + '" alt="群二维码">' : cover) + '</div>';
    else if (item.type === 'image') coverBlock = '<div class="preview-card__cover">' + cover + '</div>';
    var cta = (item.config && item.config.cta) || (item.type === 'qr_group' ? '扫码加入' : '查看详情');
    els.livePreview.innerHTML = '<article class="preview-card">' + coverBlock + '<div class="preview-card__body"><span class="preview-card__tag">' + escapeHtml(type) + '</span><h3>' + escapeHtml(item.title) + '</h3><p>' + escapeHtml(item.description || '暂无摘要') + '</p><a href="' + escapeHtml(safeUrl(item.link_url)) + '" tabindex="-1">' + escapeHtml(cta) + ' <i class="fa-solid fa-arrow-right"></i></a></div></article>';
  }

  function renderChecks(item) {
    if (!item) { els.publishCheck.innerHTML = '<h3><i class="fa-solid fa-circle-check"></i>发布检查</h3><ul><li>选择模块后开始检查</li></ul>'; return; }
    var checks = [];
    checks.push(item.title ? '标题完整' : '标题不能为空');
    var examVideo = state.scope === 'exam' && item.type === 'video';
    if (examVideo) {
      var videoCount = getVideoItems(item).length;
      checks.push(videoCount ? videoCount + ' 个视频链接已填写' : '至少需要 1 个视频链接');
    } else if (item.type === 'video') checks.push(item.link_url ? '视频链接已填写' : '需要视频链接');
    if ((!examVideo && item.type === 'video') || item.type === 'image' || item.type === 'qr_group') checks.push(item.cover_url ? '图片资源完整' : '需要上传图片');
    if (item.type === 'qr_group' && item.config && item.config.expires_at) checks.push('二维码有效期：' + item.config.expires_at);
    els.publishCheck.innerHTML = '<h3><i class="fa-solid fa-circle-check"></i>发布检查</h3><ul>' + checks.map(function (text) { return '<li>' + escapeHtml(text) + '</li>'; }).join('') + '</ul>';
  }

  function formPayload() {
    var item = activeModule();
    var type = els.fieldType.value;
    var config = Object.assign({}, item.config || {});
    config.cta = type === 'qr_group' ? els.fieldCta.value.trim() : els.fieldCtaDefault.value.trim();
    if (type === 'qr_group') config.expires_at = els.fieldExpiresAt.value || '';
    var examVideo = state.scope === 'exam' && type === 'video';
    var linkUrl = type === 'video' ? els.fieldLink.value.trim() : els.fieldLinkGeneric.value.trim();
    var coverUrl = item.cover_url || '';
    if (examVideo) {
      var existingByUrl = {};
      getVideoItems(item).forEach(function (video) { existingByUrl[video.url] = video; });
      config.video_items = uniqueVideoUrls(els.fieldVideoList.value).map(function (url) {
        return existingByUrl[url] || { url: url, title: '待获取视频标题', platform: '哔哩哔哩', duration: '', cover_url: '' };
      });
      linkUrl = config.video_items[0] ? config.video_items[0].url : '';
      coverUrl = '';
    }
    return {
      type: type, status: els.fieldStatus.value, title: els.fieldTitle.value.trim(),
      description: els.fieldDescription.value.trim(),
      link_url: linkUrl,
      cover_url: coverUrl, config: config,
      publish_at: els.fieldPublishAt.value ? new Date(els.fieldPublishAt.value).toISOString() : null,
      unpublish_at: els.fieldUnpublishAt.value ? new Date(els.fieldUnpublishAt.value).toISOString() : null
    };
  }

  function setSaveStatus(text, success) {
    els.saveStatus.textContent = text;
    els.saveStatus.classList.toggle('status-pill--success', !!success);
  }

  function scheduleSave() {
    var item = activeModule();
    if (!item) return;
    var draft = formPayload();
    Object.assign(item, draft);
    syncTypeFields(draft.type); renderModuleList(); renderPreview(item); renderChecks(item);
    setSaveStatus('待保存', false);
    window.clearTimeout(state.saveTimer);
    state.saveTimer = window.setTimeout(saveCurrent, 650);
  }

  async function saveCurrent() {
    var item = activeModule();
    if (!item || state.saving) return;
    if (!els.fieldTitle.value.trim()) { showMessage(els.editorMessage, '标题不能为空', false); return; }
    state.saving = true; setSaveStatus('保存中…', false);
    try {
      var itemPath = state.scope === 'exam' ? '/api/admin/global-modules/' : '/api/admin/modules/';
      var updated = await api(itemPath + item.id, { method: 'PATCH', body: JSON.stringify(formPayload()) });
      var index = state.modules.findIndex(function (module) { return module.id === updated.id; });
      state.modules[index] = updated;
      renderModuleList(); renderPreview(updated); renderChecks(updated); renderCover(updated);
      setSaveStatus('已保存', true); showMessage(els.editorMessage, '', true);
    } catch (error) {
      setSaveStatus('保存失败', false); showMessage(els.editorMessage, error.message, false);
    } finally { state.saving = false; }
  }

  Array.prototype.forEach.call(els.moduleForm.querySelectorAll('input,select,textarea'), function (field) {
    if (field.type !== 'file') field.addEventListener(field.tagName === 'SELECT' ? 'change' : 'input', scheduleSave);
  });

  els.addModuleBtn.addEventListener('click', function () { els.typeMenu.hidden = !els.typeMenu.hidden; });
  Array.prototype.forEach.call(els.typeMenu.querySelectorAll('[data-add-type]'), function (button) {
    button.addEventListener('click', async function () {
      var type = button.dataset.addType;
      var defaults = {
        video: state.scope === 'exam' ? ['真题配套讲解', '粘贴 B 站真题讲解视频链接后自动获取标题和封面。'] : ['新视频模块', '粘贴视频链接后自动获取标题和封面。'],
        qr_group: ['新交流群', '上传群二维码并填写入群说明。'],
        image: ['新图片模块', '上传院校通知或活动海报。'],
        link: state.scope === 'exam' ? ['领取真题资料', '填写百度云真题资料链接与领取说明。'] : ['新链接模块', '填写学院官网或招生信息链接。']
      }[type];
      try {
        var createPath = state.scope === 'exam' ? '/api/admin/global-modules?section=exam_resources' : '/api/admin/schools/' + state.schoolId + '/modules';
        var defaultCta = state.scope === 'exam' ? (type === 'video' ? '观看讲解' : '领取资料') : (type === 'qr_group' ? '扫码加入' : '查看详情');
        var created = await api(createPath, { method: 'POST', body: JSON.stringify({ section_key: state.scope === 'exam' ? 'exam_resources' : undefined, type: type, title: defaults[0], description: defaults[1], status: 'draft', config: { cta: defaultCta } }) });
        els.typeMenu.hidden = true; await loadModules(created.id); toast('模块已添加');
      } catch (error) { toast(error.message); }
    });
  });

  $('#deleteModuleBtn').addEventListener('click', async function () {
    var item = activeModule();
    if (!item || !window.confirm('确定删除“' + item.title + '”吗？此操作会写入审计记录。')) return;
    try { var itemPath = state.scope === 'exam' ? '/api/admin/global-modules/' : '/api/admin/modules/'; await api(itemPath + item.id, { method: 'DELETE', body: '{}' }); state.activeId = 0; await loadModules(); toast('模块已删除'); }
    catch (error) { toast(error.message); }
  });

  els.publishBtn.addEventListener('click', async function () {
    var item = activeModule();
    if (!item) { toast('请先选择要发布的模块'); return; }
    await saveCurrent();
    try {
      var itemPath = state.scope === 'exam' ? '/api/admin/global-modules/' : '/api/admin/modules/';
      var updated = await api(itemPath + item.id + '/publish', { method: 'POST', body: '{}' });
      var index = state.modules.findIndex(function (module) { return module.id === updated.id; }); state.modules[index] = updated;
      renderModuleList(); renderEditor(); toast('模块已发布到公开页');
    } catch (error) { toast(error.message); }
  });

  $('#fetchVideoBtn').addEventListener('click', async function () {
    var item = activeModule(); var url = els.fieldLink.value.trim();
    if (!item || !url) { els.videoFetchStatus.textContent = '请先粘贴视频链接'; return; }
    var button = $('#fetchVideoBtn'); button.disabled = true; els.videoFetchStatus.textContent = '正在读取目标页面…';
    try {
      var data = await api('/api/admin/media/video-preview', { method: 'POST', body: JSON.stringify({ url: url }) });
      item.link_url = data.url; item.cover_url = data.cover_url || item.cover_url;
      item.config = Object.assign({}, item.config || {}, { platform: data.platform, duration: data.duration || '', cta: item.config && item.config.cta || '查看视频' });
      if (!item.title || item.title === '新视频模块') item.title = data.title;
      els.fieldTitle.value = item.title; els.fieldLink.value = item.link_url; renderCover(item); renderPreview(item);
      els.videoFetchStatus.textContent = '已识别 ' + data.platform + (data.cover_url ? '，标题和封面已获取' : '，未发现可用封面');
      await saveCurrent();
    } catch (error) { els.videoFetchStatus.textContent = '获取失败：' + error.message + '。可继续手动填写并上传封面。'; }
    finally { button.disabled = false; }
  });

  els.fetchVideoListBtn.addEventListener('click', async function () {
    var item = activeModule();
    var urls = uniqueVideoUrls(els.fieldVideoList.value);
    if (!item || !urls.length) { els.videoListFetchStatus.textContent = '请先粘贴至少一个视频链接，每行一个。'; return; }
    var moduleId = item.id;
    window.clearTimeout(state.saveTimer);
    while (state.saving) await new Promise(function (resolve) { window.setTimeout(resolve, 50); });
    els.fetchVideoListBtn.disabled = true;
    els.videoListFetchStatus.textContent = '正在读取 1 / ' + urls.length + '…';
    var results = [];
    var failed = 0;
    for (var index = 0; index < urls.length; index += 1) {
      els.videoListFetchStatus.textContent = '正在读取 ' + (index + 1) + ' / ' + urls.length + '…';
      try {
        var data = await api('/api/admin/media/video-preview', { method: 'POST', body: JSON.stringify({ url: urls[index] }) });
        results.push({ url: data.url || urls[index], title: data.title || '视频 ' + (index + 1), cover_url: data.cover_url || '', platform: data.platform || '哔哩哔哩', duration: data.duration || '' });
      } catch (error) {
        failed += 1;
        results.push({ url: urls[index], title: '视频 ' + (index + 1), cover_url: '', platform: '哔哩哔哩', duration: '' });
      }
    }
    item = activeModule();
    if (!item || item.id !== moduleId) {
      els.videoListFetchStatus.textContent = '已停止：编辑期间切换了其他模块。';
      els.fetchVideoListBtn.disabled = false;
      return;
    }
    item.config = Object.assign({}, item.config || {}, { video_items: results, cta: item.config && item.config.cta || '观看讲解' });
    item.link_url = results[0] ? results[0].url : '';
    els.fieldVideoList.value = results.map(function (video) { return video.url; }).join('\n');
    renderPreview(item); renderChecks(item);
    els.videoListFetchStatus.textContent = '已读取 ' + results.length + ' 个视频' + (failed ? '，其中 ' + failed + ' 个保留为原链接，可继续发布。' : '，标题已更新。');
    await saveCurrent();
    els.fetchVideoListBtn.disabled = false;
  });

  $('#uploadCoverBtn').addEventListener('click', function () { els.coverInput.click(); });
  els.coverInput.addEventListener('change', async function () {
    var file = els.coverInput.files && els.coverInput.files[0]; var item = activeModule();
    if (!file || !item) return;
    if (file.size > 5 * 1024 * 1024) { toast('图片不能超过 5MB'); return; }
    try {
      var base64 = await fileToBase64(file);
      var kind = item.type === 'qr_group' ? 'qr_code' : item.type === 'video' ? 'video_cover' : 'image';
      var asset = await api('/api/admin/media/upload', { method: 'POST', body: JSON.stringify({ filename: file.name, kind: kind, base64: base64 }) });
      item.cover_url = asset.url; renderCover(item); renderPreview(item); await saveCurrent(); toast('图片已上传');
    } catch (error) { toast(error.message); }
    finally { els.coverInput.value = ''; }
  });

  $('#clearCoverBtn').addEventListener('click', async function () {
    var item = activeModule(); if (!item) return; item.cover_url = ''; renderCover(item); renderPreview(item); await saveCurrent();
  });

  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader(); reader.onload = function () { resolve(String(reader.result).split(',')[1] || ''); };
      reader.onerror = function () { reject(new Error('文件读取失败')); }; reader.readAsDataURL(file);
    });
  }

  var heatFileBox = $('#heatFileBox');
  var heatFileInput = $('#heatFileInput');
  var heatPreviewBtn = $('#heatPreviewBtn');
  var heatPublishBtn = $('#heatPublishBtn');
  var heatPeriod = $('#heatPeriod');

  function defaultHeatPeriod() {
    var now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  }

  function periodFromFilename(filename) {
    var text = String(filename || '');
    var full = text.match(/(20\d{2})\D{0,3}(1[0-2]|0?[1-9])\s*月?/);
    if (full) return full[1] + '-' + String(Number(full[2])).padStart(2, '0');
    var monthOnly = text.match(/(?:^|\D)(1[0-2]|0?[1-9])\s*月/);
    if (monthOnly) return new Date().getFullYear() + '-' + String(Number(monthOnly[1])).padStart(2, '0');
    return '';
  }

  function resetHeatPreview() {
    state.heatPreview = null;
    $('#heatPreviewPanel').hidden = true;
    $('#heatGroups').innerHTML = '';
    heatPublishBtn.disabled = true;
  }

  function setHeatFile(file) {
    state.heatFile = file || null;
    resetHeatPreview();
    var valid = !!(file && /\.xlsx$/i.test(file.name) && file.size <= 12 * 1024 * 1024);
    $('#heatFileName').textContent = file
      ? file.name + ' · ' + Math.max(1, Math.round(file.size / 1024)) + ' KB'
      : '需要包含总榜、985、211、普通院校四张工作表';
    heatPreviewBtn.disabled = !valid || !heatPeriod.value;
    if (file && !valid) showMessage($('#heatMessage'), '请选择不超过 12MB 的 .xlsx 文件。', false);
    else showMessage($('#heatMessage'), '', true);
    var inferred = file ? periodFromFilename(file.name) : '';
    if (inferred) heatPeriod.value = inferred;
  }

  function bindHeatFileDrop() {
    if (!heatFileBox) return;
    heatFileBox.addEventListener('dragover', function (event) { event.preventDefault(); heatFileBox.classList.add('is-dragover'); });
    heatFileBox.addEventListener('dragleave', function () { heatFileBox.classList.remove('is-dragover'); });
    heatFileBox.addEventListener('drop', function (event) {
      event.preventDefault(); heatFileBox.classList.remove('is-dragover');
      setHeatFile(event.dataTransfer.files[0] || null);
    });
    heatFileInput.addEventListener('change', function () { setHeatFile(heatFileInput.files[0] || null); });
    heatPeriod.value = defaultHeatPeriod();
    heatPeriod.addEventListener('change', function () {
      resetHeatPreview();
      heatPreviewBtn.disabled = !state.heatFile || !heatPeriod.value;
    });
  }

  function allHeatRows() {
    var rows = [];
    (state.heatPreview && state.heatPreview.groups || []).forEach(function (group) {
      (group.items || []).forEach(function (item) { rows.push(item); });
    });
    return rows;
  }

  function heatOptionHtml(item, catalog) {
    var candidates = item.match && item.match.candidates || [];
    var suggested = {};
    candidates.forEach(function (candidate) { suggested[candidate.name] = true; });
    var current = item.match && item.match.school_name || '';
    var html = '<option value="">请选择对应院校</option>';
    if (candidates.length) {
      html += '<optgroup label="建议匹配">' + candidates.map(function (candidate) {
        return '<option value="' + escapeHtml(candidate.name) + '"' + (candidate.name === current ? ' selected' : '') + '>' + escapeHtml(candidate.name) + '</option>';
      }).join('') + '</optgroup>';
    }
    html += '<optgroup label="全部院校">' + catalog.filter(function (school) { return !suggested[school.name]; }).map(function (school) {
      return '<option value="' + escapeHtml(school.name) + '"' + (school.name === current ? ' selected' : '') + '>' + escapeHtml(school.name) + '</option>';
    }).join('') + '</optgroup>';
    return html;
  }

  function heatStatus(item) {
    if (item.match && item.match.manual) return { label: '已人工确认', cls: '' };
    if (item.match && item.match.status === 'matched') return { label: '自动匹配', cls: '' };
    if (item.match && item.match.status === 'ambiguous') return { label: '存在歧义', cls: ' is-ambiguous' };
    return { label: '未匹配', cls: ' is-unmatched' };
  }

  function updateHeatPublishState() {
    var rows = allHeatRows();
    var unresolved = rows.filter(function (item) { return !(item.match && item.match.school_name); }).length;
    heatPublishBtn.disabled = !rows.length || unresolved > 0;
    var hint = $('#heatPublishHint');
    hint.classList.toggle('is-ready', unresolved === 0 && rows.length > 0);
    hint.textContent = unresolved ? '还有 ' + unresolved + ' 条院校信息需要确认。' : '80 条院校信息均已匹配，可以发布。';
  }

  function renderHeatPreview() {
    var preview = state.heatPreview;
    if (!preview) return;
    $('#heatPreviewPanel').hidden = false;
    $('#heatPreviewTitle').textContent = preview.year + '年' + preview.month + '月 · ' + preview.filename;
    $('#heatSummary').innerHTML =
      '<span>共 ' + preview.summary.rows + ' 条</span>' +
      '<span class="is-good">自动匹配 ' + preview.summary.matched + '</span>' +
      '<span class="is-warning">歧义 ' + preview.summary.ambiguous + '</span>' +
      '<span class="is-danger">未匹配 ' + preview.summary.unmatched + '</span>';
    $('#heatGroups').innerHTML = preview.groups.map(function (group) {
      var unresolved = group.items.filter(function (item) { return !(item.match && item.match.school_name); }).length;
      var rows = group.items.map(function (item) {
        var status = heatStatus(item);
        var rowCls = status.cls ? status.cls.trim() : '';
        return '<tr class="' + rowCls + '" data-scope="' + group.scope + '" data-rank="' + item.rank + '">' +
          '<td>' + item.rank + '</td><td><b>' + escapeHtml(item.source_school_name) + '</b></td>' +
          '<td>' + item.heat + '</td><td>' + (item.total_rank == null ? '—' : item.total_rank) + '</td>' +
          '<td><select aria-label="为' + escapeHtml(item.source_school_name) + '选择院校">' + heatOptionHtml(item, preview.catalog) + '</select></td>' +
          '<td><span class="heat-match-status' + status.cls + '">' + status.label + '</span></td></tr>';
      }).join('');
      return '<details class="heat-group"' + (unresolved ? ' open' : '') + '><summary><b>' + escapeHtml(group.label) + '榜</b><span>前20名 · ' + (unresolved ? unresolved + ' 条待确认' : '全部已匹配') + '</span></summary>' +
        '<div class="heat-table-wrap"><table class="heat-match-table"><thead><tr><th>排名</th><th>Excel 院校名</th><th>热度值</th><th>总排名</th><th>匹配到网站院校</th><th>状态</th></tr></thead><tbody>' + rows + '</tbody></table></div></details>';
    }).join('');

    Array.prototype.forEach.call($('#heatGroups').querySelectorAll('select'), function (select) {
      select.addEventListener('change', function () {
        var row = select.closest('tr');
        var group = preview.groups.find(function (entry) { return entry.scope === row.dataset.scope; });
        var item = group.items.find(function (entry) { return entry.rank === Number(row.dataset.rank); });
        var selectedSchool = preview.catalog.find(function (school) { return school.name === select.value; }) || {};
        preview.groups.forEach(function (entry) {
          entry.items.forEach(function (candidate) {
            if (candidate.source_school_name !== item.source_school_name) return;
            candidate.match.school_name = select.value;
            candidate.match.school_id = selectedSchool.school_id || null;
            candidate.match.manual = !!select.value;
          });
        });
        renderHeatPreview();
      });
    });
    updateHeatPublishState();
  }

  heatPreviewBtn.addEventListener('click', async function () {
    if (!state.heatFile || !heatPeriod.value) return;
    heatPreviewBtn.disabled = true;
    showMessage($('#heatMessage'), '正在读取工作表并匹配院校…', true);
    try {
      var data = await api('/api/admin/heat-rankings/preview', {
        method: 'POST',
        body: JSON.stringify({ period: heatPeriod.value, filename: state.heatFile.name, base64: await fileToBase64(state.heatFile) })
      });
      state.heatPreview = data;
      renderHeatPreview();
      showMessage($('#heatMessage'), '解析完成。请检查黄色或红色匹配项。', true);
    } catch (error) {
      resetHeatPreview();
      showMessage($('#heatMessage'), error.message, false);
    } finally {
      heatPreviewBtn.disabled = !state.heatFile || !heatPeriod.value;
    }
  });

  heatPublishBtn.addEventListener('click', async function () {
    if (!state.heatPreview || heatPublishBtn.disabled) return;
    var label = state.heatPreview.year + '年' + state.heatPreview.month + '月';
    if (!window.confirm('将发布' + label + '四组前20名榜单；同月份旧数据会被覆盖。确定继续？')) return;
    heatPublishBtn.disabled = true;
    showMessage($('#heatMessage'), '正在发布榜单…', true);
    try {
      var groups = state.heatPreview.groups.map(function (group) {
        return {
          scope: group.scope,
          items: group.items.map(function (item) {
            return {
              rank: item.rank, source_school_name: item.source_school_name,
              school_name: item.match.school_name, heat: item.heat,
              total_rank: item.total_rank, source_tier: item.source_tier
            };
          })
        };
      });
      var result = await api('/api/admin/heat-rankings/publish', {
        method: 'POST', body: JSON.stringify({ period: state.heatPreview.period, filename: state.heatPreview.filename, groups: groups })
      });
      showMessage($('#heatMessage'), label + '榜单发布成功，共更新 ' + result.rows + ' 条。', true);
      $('#heatPublishHint').textContent = '发布成功，首页展示总榜前10名，完整榜单展示四组前20名。';
      $('#heatPublishHint').classList.add('is-ready');
      toast('热度榜发布成功');
    } catch (error) {
      showMessage($('#heatMessage'), error.message, false);
      updateHeatPublishState();
    }
  });

  bindHeatFileDrop();

  function formatCount(value) {
    return new Intl.NumberFormat('zh-CN').format(Number(value) || 0);
  }

  function renderAnalytics(data) {
    var metrics = data.metrics || {};
    $('#clickTotal').textContent = formatCount(metrics.total);
    $('#clickToday').textContent = formatCount(metrics.today);
    $('#clickWeek').textContent = formatCount(metrics.week);
    $('#clickMonth').textContent = formatCount(metrics.month);

    var daily = data.daily || [];
    var maxClicks = Math.max.apply(Math, daily.map(function (item) { return Number(item.clicks) || 0; }).concat([1]));
    $('#analyticsChart').innerHTML = daily.map(function (item, index) {
      var clicks = Number(item.clicks) || 0;
      var height = Math.max(4, Math.round(clicks / maxClicks * 190));
      var date = new Date(item.date + 'T00:00:00+08:00');
      var label = (date.getMonth() + 1) + '/' + date.getDate();
      var todayClass = index === daily.length - 1 ? ' is-today' : '';
      return '<div class="analytics-bar' + todayClass + '" style="--bar-height:' + height + 'px" title="' + escapeHtml(item.date + '：' + clicks + ' 次') + '">' +
        '<b>' + formatCount(clicks) + '</b><i aria-hidden="true"></i><small>' + label + '</small></div>';
    }).join('');

    var pages = data.top_pages || [];
    $('#analyticsTopPages').innerHTML = pages.length ? pages.map(function (page, index) {
      return '<div class="analytics-page"><span>' + String(index + 1).padStart(2, '0') + '</span><div><b>' + escapeHtml(page.title || page.path) +
        '</b><small>' + escapeHtml(page.path) + '</small></div><strong>' + formatCount(page.clicks) + '</strong></div>';
    }).join('') : '<p class="analytics-empty">暂时还没有点击数据，前台产生操作后会自动显示。</p>';
    var generated = data.generated_at ? new Date(data.generated_at) : new Date();
    $('#analyticsUpdatedAt').textContent = '更新于 ' + generated.toLocaleString('zh-CN', { hour12: false });
  }

  async function loadAnalytics() {
    var button = $('#refreshAnalyticsBtn');
    button.disabled = true;
    showMessage($('#analyticsMessage'), '正在读取点击数据…', true);
    try {
      var data = await api('/api/admin/analytics/summary');
      renderAnalytics(data);
      showMessage($('#analyticsMessage'), '统计数据已更新', true);
    } catch (error) {
      showMessage($('#analyticsMessage'), error.message, false);
    } finally {
      button.disabled = false;
    }
  }

  $('#refreshAnalyticsBtn').addEventListener('click', loadAnalytics);

  var mediaKindLabels = { qr_code: '交流群二维码', poster: '院校海报' };

  function mediaSlotHint(item) {
    if (item.slot_key === 'home_qr_27') return '首页 27 考研交流群卡片';
    if (item.slot_key === 'home_qr_28') return '首页 28 考研交流群卡片';
    return '首页右侧院校海报轮播位';
  }

  function renderSiteMedia() {
    var grid = $('#siteMediaGrid');
    grid.innerHTML = state.siteMedia.map(function (item) {
      return '<article class="site-media-card panel-card" data-slot-key="' + escapeHtml(item.slot_key) + '">' +
        '<div class="site-media-preview site-media-preview--' + escapeHtml(item.kind) + '">' +
          '<img src="' + escapeHtml(adminAssetUrl(item.image_url)) + '" alt="' + escapeHtml(item.title) + '">' +
          '<span>' + escapeHtml(mediaKindLabels[item.kind] || '首页媒体') + '</span>' +
        '</div>' +
        '<div class="site-media-editor"><header><div><small>' + escapeHtml(mediaSlotHint(item)) + '</small><h2>' + escapeHtml(item.title) + '</h2></div>' +
          '<label class="media-switch"><input data-media-field="enabled" type="checkbox" ' + (item.enabled ? 'checked' : '') + '><span></span><em>' + (item.enabled ? '已展示' : '已隐藏') + '</em></label></header>' +
          '<label>展示标题<input data-media-field="title" maxlength="120" value="' + escapeHtml(item.title) + '"></label>' +
          '<label>点击跳转链接（选填）<input data-media-field="link_url" inputmode="url" placeholder="不填则点击放大图片" value="' + escapeHtml(item.link_url || '') + '"></label>' +
          '<div class="site-media-path"><i class="fa-regular fa-image"></i><span title="' + escapeHtml(item.image_url) + '">' + escapeHtml(item.image_url) + '</span></div>' +
          '<div class="site-media-actions"><button class="button button--secondary" data-media-upload type="button"><i class="fa-solid fa-upload"></i>上传替换</button>' +
          '<input data-media-file type="file" accept="image/png,image/jpeg,image/webp" hidden>' +
          '<button class="button button--primary" data-media-save type="button"><i class="fa-solid fa-cloud-arrow-up"></i>保存并发布</button></div>' +
          '<small class="site-media-updated">上次更新：' + escapeHtml(item.updated_at ? new Date(item.updated_at).toLocaleString('zh-CN', { hour12: false }) : '—') + '</small>' +
        '</div></article>';
    }).join('');
    if (!state.siteMedia.length) grid.innerHTML = '<div class="history-empty"><i class="fa-regular fa-images"></i><p>暂无可配置的首页媒体槽位</p></div>';
  }

  async function loadSiteMedia() {
    showMessage($('#mediaMessage'), '正在读取首页媒体…', true);
    try {
      var data = await api('/api/admin/site-media');
      state.siteMedia = data.items || [];
      renderSiteMedia();
      showMessage($('#mediaMessage'), '', true);
    } catch (error) {
      showMessage($('#mediaMessage'), error.message, false);
    }
  }

  function readSiteMediaCard(card) {
    return {
      title: card.querySelector('[data-media-field="title"]').value.trim(),
      link_url: card.querySelector('[data-media-field="link_url"]').value.trim(),
      enabled: card.querySelector('[data-media-field="enabled"]').checked
    };
  }

  async function saveSiteMediaCard(card, extra) {
    var key = card.dataset.slotKey;
    var button = card.querySelector('[data-media-save]');
    var payload = Object.assign(readSiteMediaCard(card), extra || {});
    button.disabled = true;
    try {
      var updated = await api('/api/admin/site-media/' + encodeURIComponent(key), { method: 'PATCH', body: JSON.stringify(payload) });
      state.siteMedia = state.siteMedia.map(function (item) { return item.slot_key === key ? updated : item; });
      renderSiteMedia();
      toast('首页媒体已发布');
    } catch (error) {
      toast(error.message);
      button.disabled = false;
    }
  }

  $('#siteMediaGrid').addEventListener('click', function (event) {
    var card = event.target.closest('.site-media-card');
    if (!card) return;
    var upload = event.target.closest('[data-media-upload]');
    if (upload) { card.querySelector('[data-media-file]').click(); return; }
    if (event.target.closest('[data-media-save]')) saveSiteMediaCard(card);
  });

  $('#siteMediaGrid').addEventListener('change', async function (event) {
    var card = event.target.closest('.site-media-card');
    if (!card) return;
    if (event.target.matches('[data-media-field="enabled"]')) {
      var label = event.target.closest('.media-switch').querySelector('em');
      label.textContent = event.target.checked ? '已展示' : '已隐藏';
      return;
    }
    if (!event.target.matches('[data-media-file]')) return;
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('图片不能超过 5MB'); event.target.value = ''; return; }
    var uploadButton = card.querySelector('[data-media-upload]');
    uploadButton.disabled = true;
    try {
      var kind = card.dataset.slotKey.indexOf('home_qr_') === 0 ? 'qr_code' : 'image';
      var asset = await api('/api/admin/media/upload', { method: 'POST', body: JSON.stringify({ filename: file.name, kind: kind, base64: await fileToBase64(file) }) });
      await saveSiteMediaCard(card, { image_url: asset.url });
    } catch (error) {
      toast(error.message);
    } finally {
      event.target.value = '';
      if (document.body.contains(uploadButton)) uploadButton.disabled = false;
    }
  });

  function resourceSlotHint(item) {
    return item.slot_key === 'high_scores' ? '公开页高分喜报图库' : '公开页资料卡 · ' + (item.images || []).length + ' 张实拍图';
  }

  function renderCourseResources() {
    var grid = $('#courseResourceGrid');
    grid.innerHTML = state.courseResources.map(function (item) {
      return '<article class="course-resource-card panel-card" data-resource-key="' + escapeHtml(item.slot_key) + '">' +
        '<div class="course-resource-preview"><img src="' + escapeHtml(adminAssetUrl(item.cover_url)) + '" alt="' + escapeHtml(item.title) + '"><span>封面预览</span></div>' +
        '<div class="course-resource-editor"><header><div><small>' + escapeHtml(resourceSlotHint(item)) + '</small><h2>' + escapeHtml(item.title) + '</h2></div>' +
          '<label class="media-switch"><input data-resource-field="enabled" type="checkbox" ' + (item.enabled ? 'checked' : '') + '><span></span><em>' + (item.enabled ? '已展示' : '已隐藏') + '</em></label></header>' +
          '<div class="course-resource-fields"><label>展示标题<input data-resource-field="title" maxlength="120" value="' + escapeHtml(item.title) + '"></label>' +
          '<label>卡片说明<textarea data-resource-field="description" rows="3" maxlength="500">' + escapeHtml(item.description || '') + '</textarea></label></div>' +
          '<label>封面地址<input data-resource-field="cover_url" value="' + escapeHtml(item.cover_url || '') + '" placeholder="上传封面后自动填写"></label>' +
          '<label>图库图片地址（每行一张，顺序即公开页顺序）<textarea class="course-resource-gallery" data-resource-field="images" spellcheck="false">' + escapeHtml((item.images || []).join('\n')) + '</textarea></label>' +
          '<div class="course-resource-meta"><span>' + (item.images || []).length + ' 张图库图片</span><span>上次更新：' + escapeHtml(item.updated_at ? new Date(item.updated_at).toLocaleString('zh-CN', { hour12: false }) : '—') + '</span></div>' +
          '<p class="course-resource-upload-status" data-resource-status></p>' +
          '<div class="course-resource-actions"><button class="button button--secondary" data-resource-cover-upload type="button"><i class="fa-solid fa-upload"></i>上传封面</button>' +
          '<input data-resource-cover-file type="file" accept="image/png,image/jpeg,image/webp" hidden>' +
          '<button class="button button--secondary" data-resource-gallery-upload type="button"><i class="fa-regular fa-images"></i>批量替换图库</button>' +
          '<input data-resource-gallery-files type="file" accept="image/png,image/jpeg,image/webp" multiple hidden>' +
          '<button class="button button--primary" data-resource-save type="button"><i class="fa-solid fa-cloud-arrow-up"></i>保存并发布</button></div>' +
        '</div></article>';
    }).join('');
    if (!state.courseResources.length) grid.innerHTML = '<div class="history-empty panel-card"><i class="fa-solid fa-book-open"></i><p>暂无可配置的资料课程槽位</p></div>';
  }

  async function loadCourseResources() {
    showMessage($('#resourceMessage'), '正在读取资料与课程配置…', true);
    try {
      var data = await api('/api/admin/course-resources');
      state.courseResources = data.items || [];
      renderCourseResources();
      showMessage($('#resourceMessage'), '', true);
    } catch (error) {
      showMessage($('#resourceMessage'), error.message, false);
    }
  }

  function readCourseResourceCard(card) {
    var seen = {};
    var images = card.querySelector('[data-resource-field="images"]').value.split(/\r?\n/).map(function (value) { return value.trim(); }).filter(function (url) {
      if (!url || seen[url]) return false;
      seen[url] = true;
      return true;
    });
    return {
      title: card.querySelector('[data-resource-field="title"]').value.trim(),
      description: card.querySelector('[data-resource-field="description"]').value.trim(),
      cover_url: card.querySelector('[data-resource-field="cover_url"]').value.trim(),
      images: images,
      enabled: card.querySelector('[data-resource-field="enabled"]').checked
    };
  }

  async function saveCourseResourceCard(card, extra, successMessage) {
    var key = card.dataset.resourceKey;
    var button = card.querySelector('[data-resource-save]');
    var payload = Object.assign(readCourseResourceCard(card), extra || {});
    button.disabled = true;
    try {
      var updated = await api('/api/admin/course-resources/' + encodeURIComponent(key), { method: 'PATCH', body: JSON.stringify(payload) });
      state.courseResources = state.courseResources.map(function (item) { return item.slot_key === key ? updated : item; });
      renderCourseResources();
      toast(successMessage || '资料与课程配置已发布');
    } catch (error) {
      toast(error.message);
      button.disabled = false;
      throw error;
    }
  }

  async function uploadResourceFiles(files, statusNode) {
    var urls = [];
    if (files.length > 100) throw new Error('每个资料分类最多保存 100 张图片');
    for (var index = 0; index < files.length; index += 1) {
      var file = files[index];
      if (file.size > 5 * 1024 * 1024) throw new Error(file.name + ' 超过 5MB');
      statusNode.textContent = '正在上传 ' + (index + 1) + ' / ' + files.length + '：' + file.name;
      var asset = await api('/api/admin/media/upload', { method: 'POST', body: JSON.stringify({ filename: file.name, kind: 'image', base64: await fileToBase64(file) }) });
      urls.push(asset.url);
    }
    return urls;
  }

  $('#courseResourceGrid').addEventListener('click', function (event) {
    var card = event.target.closest('.course-resource-card');
    if (!card) return;
    if (event.target.closest('[data-resource-cover-upload]')) { card.querySelector('[data-resource-cover-file]').click(); return; }
    if (event.target.closest('[data-resource-gallery-upload]')) { card.querySelector('[data-resource-gallery-files]').click(); return; }
    if (event.target.closest('[data-resource-save]')) saveCourseResourceCard(card).catch(function () {});
  });

  $('#courseResourceGrid').addEventListener('change', async function (event) {
    var card = event.target.closest('.course-resource-card');
    if (!card) return;
    if (event.target.matches('[data-resource-field="enabled"]')) {
      event.target.closest('.media-switch').querySelector('em').textContent = event.target.checked ? '已展示' : '已隐藏';
      return;
    }
    var isCover = event.target.matches('[data-resource-cover-file]');
    var isGallery = event.target.matches('[data-resource-gallery-files]');
    if (!isCover && !isGallery) return;
    var files = Array.prototype.slice.call(event.target.files || []);
    if (!files.length) return;
    var statusNode = card.querySelector('[data-resource-status]');
    statusNode.classList.remove('is-error');
    try {
      if (isGallery && !window.confirm('将用选中的 ' + files.length + ' 张图片替换当前整组图库，确定继续？')) return;
      var urls = await uploadResourceFiles(isCover ? files.slice(0, 1) : files, statusNode);
      statusNode.textContent = '上传完成，正在发布…';
      await saveCourseResourceCard(card, isCover ? { cover_url: urls[0] } : { images: urls }, isCover ? '封面已替换并发布' : '图库已替换并发布');
    } catch (error) {
      statusNode.textContent = error.message;
      statusNode.classList.add('is-error');
    } finally {
      event.target.value = '';
    }
  });

  var historyActionLabels = { publish: '发布', unpublish: '下线', create: '新建', update: '更新', delete: '删除', reorder: '排序' };
  var historyTypeLabels = { school_content_module: '院校详情模块', global_content_module: '真题备考模块', site_media_slot: '首页媒体', course_resource_slot: '资料与课程', heat_ranking_batch: '热度榜单' };

  function auditSummary(item) {
    var change = item.change || {};
    if (item.object_type === 'heat_ranking_batch') return (change.rows || 0) + ' 条榜单数据' + (change.replaced ? '，已替换同月版本' : '');
    if (item.object_type === 'site_media_slot') return (change.enabled === false ? '隐藏媒体' : '更新图片并展示') + (change.link_url ? '，含跳转链接' : '');
    if (item.object_type === 'course_resource_slot') return (change.enabled === false ? '隐藏资料卡' : '更新资料卡') + '，图库 ' + (change.image_count || 0) + ' 张';
    if (item.action === 'reorder') return '调整了 ' + ((change.ordered_ids || []).length || 0) + ' 个模块的顺序';
    if (item.action === 'publish') return '状态更新为已发布';
    if (item.action === 'unpublish') return '状态更新为草稿';
    var labels = { title: '标题', description: '摘要', link_url: '链接', cover_url: '封面', status: '状态', config: '模块配置', config_json: '模块配置' };
    var keys = Object.keys(change).filter(function (key) { return labels[key]; }).map(function (key) { return labels[key]; });
    return keys.length ? '变更：' + keys.slice(0, 4).join('、') : (historyActionLabels[item.action] || '内容变更');
  }

  function formatAuditTime(value) {
    if (!value) return '—';
    var date = new Date(value);
    return isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
  }

  function renderAuditHistory(data) {
    state.historyPage = data.page || 1;
    state.historyTotal = data.total || 0;
    state.historyPageSize = data.page_size || 30;
    var items = data.items || [];
    $('#historyTableBody').innerHTML = items.map(function (item) {
      var action = historyActionLabels[item.action] || item.action;
      var scope = item.school_name || (item.object_type === 'global_content_module' ? '真题备考区' : item.object_type === 'site_media_slot' ? '公开首页' : item.object_type === 'heat_ranking_batch' ? '全站榜单' : '全局');
      return '<tr><td data-label="时间"><time>' + escapeHtml(formatAuditTime(item.created_at)) + '</time></td>' +
        '<td data-label="操作人"><b>' + escapeHtml(item.display_name || item.username || '系统') + '</b><small>' + escapeHtml(item.username || '') + '</small></td>' +
        '<td data-label="内容"><b>' + escapeHtml(item.target_title) + '</b><small>' + escapeHtml(historyTypeLabels[item.object_type] || item.object_type) + '</small></td>' +
        '<td data-label="操作"><span class="history-action history-action--' + escapeHtml(item.action) + '">' + escapeHtml(action) + '</span></td>' +
        '<td data-label="范围">' + escapeHtml(scope) + '</td><td data-label="变更摘要">' + escapeHtml(auditSummary(item)) + '</td></tr>';
    }).join('');
    $('#historyEmpty').hidden = items.length > 0;
    $('.history-table-wrap').hidden = items.length === 0;
    var totalPages = Math.max(1, Math.ceil(state.historyTotal / state.historyPageSize));
    $('#historyCount').textContent = '共 ' + state.historyTotal + ' 条记录';
    $('#historyPageInfo').textContent = '第 ' + state.historyPage + ' / ' + totalPages + ' 页';
    $('#historyPrev').disabled = state.historyPage <= 1;
    $('#historyNext').disabled = state.historyPage >= totalPages;
  }

  async function loadAuditHistory(page) {
    var params = new URLSearchParams({ page: String(page || 1), page_size: '30' });
    var action = $('#historyAction').value;
    var objectType = $('#historyObjectType').value;
    var query = $('#historySearch').value.trim();
    if (action) params.set('action', action);
    if (objectType) params.set('object_type', objectType);
    if (query) params.set('q', query);
    showMessage($('#historyMessage'), '正在读取发布记录…', true);
    try {
      var data = await api('/api/admin/audit-logs?' + params.toString());
      renderAuditHistory(data);
      showMessage($('#historyMessage'), '', true);
    } catch (error) {
      showMessage($('#historyMessage'), error.message, false);
    }
  }

  $('#refreshHistoryBtn').addEventListener('click', function () { loadAuditHistory(state.historyPage); });
  $('#applyHistoryFilter').addEventListener('click', function () { loadAuditHistory(1); });
  $('#historyAction').addEventListener('change', function () { loadAuditHistory(1); });
  $('#historyObjectType').addEventListener('change', function () { loadAuditHistory(1); });
  $('#historySearch').addEventListener('keydown', function (event) { if (event.key === 'Enter') { event.preventDefault(); loadAuditHistory(1); } });
  $('#historyPrev').addEventListener('click', function () { if (state.historyPage > 1) loadAuditHistory(state.historyPage - 1); });
  $('#historyNext').addEventListener('click', function () { if (state.historyPage * state.historyPageSize < state.historyTotal) loadAuditHistory(state.historyPage + 1); });

  async function switchAdminView(view) {
    var activeButton = $('.sidebar-nav button[data-view="' + view + '"]');
    Array.prototype.forEach.call(document.querySelectorAll('.sidebar-nav button'), function (item) { item.classList.toggle('is-active', item === activeButton); });
    var implemented = view === 'modules' || view === 'import' || view === 'heat' || view === 'overview' || view === 'schools' || view === 'media' || view === 'resources' || view === 'history';
    $('#modulesView').hidden = view !== 'modules';
    $('#importView').hidden = view !== 'import';
    $('#heatView').hidden = view !== 'heat';
    $('#overviewView').hidden = view !== 'overview';
    $('#schoolManagementView').hidden = view !== 'schools';
    $('#mediaView').hidden = view !== 'media';
    $('#resourcesView').hidden = view !== 'resources';
    $('#historyView').hidden = view !== 'history';
    $('#placeholderView').hidden = implemented;
    if (!implemented && activeButton) $('#placeholderTitle').textContent = activeButton.textContent.trim();
    var breadcrumb = ({ overview: '运营数据总览', schools: '院校管理', media: '首页媒体资源', resources: '资料与课程配置', history: '发布记录', heat: '院校热度榜单', import: '录取数据导入' })[view];
    if (view === 'modules') breadcrumb = state.scope === 'exam' ? '真题备考区' : '院校详情页';
    $('#contentBreadcrumb').textContent = breadcrumb || (activeButton ? activeButton.textContent.trim() : '内容管理');
    if (view === 'overview') await loadAnalytics();
    if (view === 'schools') await loadSchoolManagement();
    if (view === 'media') await loadSiteMedia();
    if (view === 'resources') await loadCourseResources();
    if (view === 'history') await loadAuditHistory(1);
    if (view === 'import') await loadSummary();
    els.adminApp.classList.remove('is-sidebar-open');
  }

  Array.prototype.forEach.call(document.querySelectorAll('.sidebar-nav button'), function (button) {
    button.addEventListener('click', function () {
      switchAdminView(button.dataset.view).catch(function (error) { toast(error.message); });
    });
  });
  $('#sidebarToggle').addEventListener('click', function () { els.adminApp.classList.toggle('is-sidebar-open'); });

  async function loadSummary() {
    try {
      var response = await fetch('/api/summary'); var json = await response.json();
      if (json.code === 0) { $('#sumSchools').textContent = json.data.school_count; $('#sumMajors').textContent = json.data.major_count; $('#sumRecords').textContent = json.data.record_count; }
    } catch (error) { $('#sumSchools').textContent = '—'; }
  }
  var fileBox = $('#fileBox'); var fileInput = $('#fileInput'); var importBtn = $('#importBtn');
  fileBox.addEventListener('dragover', function (event) { event.preventDefault(); fileBox.classList.add('is-dragover'); });
  fileBox.addEventListener('dragleave', function () { fileBox.classList.remove('is-dragover'); });
  fileBox.addEventListener('drop', function (event) { event.preventDefault(); fileBox.classList.remove('is-dragover'); state.selectedFile = event.dataTransfer.files[0] || null; syncImportFile(); });
  fileInput.addEventListener('change', function () { state.selectedFile = fileInput.files[0] || null; syncImportFile(); });
  function syncImportFile() { $('#fileName').textContent = state.selectedFile ? state.selectedFile.name + ' · ' + Math.round(state.selectedFile.size / 1024) + ' KB' : '导入会覆盖当前录取数据表'; importBtn.disabled = !state.selectedFile; }
  importBtn.addEventListener('click', async function () {
    if (!state.selectedFile || !window.confirm('导入会覆盖当前录取数据表，确定继续？')) return;
    importBtn.disabled = true; showMessage($('#importResult'), '正在导入…', true);
    try {
      var base64 = await fileToBase64(state.selectedFile);
      var response = await fetch('/api/admin/import-admission', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf, 'X-Admin-Token': $('#adminToken').value || '' }, body: JSON.stringify({ filename: state.selectedFile.name, base64: base64 }) });
      var json = await response.json(); if (!response.ok || json.code !== 0) throw new Error(json.msg || '导入失败');
      showMessage($('#importResult'), '导入成功：' + json.data.records + ' 条记录，' + json.data.schools + ' 所院校。', true); loadSummary();
    } catch (error) { showMessage($('#importResult'), error.message, false); }
    finally { importBtn.disabled = !state.selectedFile; }
  });

  boot();
})();
