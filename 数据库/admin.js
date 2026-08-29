(function () {
  'use strict';

  var state = {
    csrf: '', user: null, schools: [], schoolId: 0, scope: 'school', modules: [], activeId: 0,
    saveTimer: 0, saving: false, selectedFile: null
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

  async function loadSchools() {
    var data = await api('/api/admin/schools');
    state.schools = data.items || [];
    els.schoolSelect.innerHTML = state.schools.map(function (school) {
      return '<option value="' + school.id + '">' + escapeHtml(school.name) + '</option>';
    }).join('');
    var preferred = state.schools.find(function (school) { return school.name === '浙江工业大学'; }) || state.schools[0];
    if (!preferred) throw new Error('当前账号没有可管理的院校');
    state.schoolId = preferred.id;
    els.schoolSelect.value = String(preferred.id);
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

  Array.prototype.forEach.call(document.querySelectorAll('.sidebar-nav button'), function (button) {
    button.addEventListener('click', function () {
      Array.prototype.forEach.call(document.querySelectorAll('.sidebar-nav button'), function (item) { item.classList.toggle('is-active', item === button); });
      var view = button.dataset.view;
      $('#modulesView').hidden = view !== 'modules'; $('#importView').hidden = view !== 'import'; $('#placeholderView').hidden = view === 'modules' || view === 'import';
      if (view !== 'modules' && view !== 'import') $('#placeholderTitle').textContent = button.textContent.trim();
      if (view === 'import') loadSummary();
      els.adminApp.classList.remove('is-sidebar-open');
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
