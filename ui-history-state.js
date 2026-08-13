(function () {
  'use strict';

  var restoring = false;
  var path = decodeURIComponent(location.pathname);

  function state(extra) {
    return Object.assign({}, history.state || {}, { kzUiHistory: true }, extra);
  }

  function cleanUrl() {
    var url = new URL(location.href);
    ['uiView', 'uiSchool', 'uiSubject'].forEach(function (key) {
      url.searchParams.delete(key);
    });
    return url;
  }

  function write(view, payload, replace) {
    var url = cleanUrl();
    url.searchParams.set('uiView', view);
    if (payload && payload.school) url.searchParams.set('uiSchool', payload.school);
    if (payload && payload.subject) url.searchParams.set('uiSubject', payload.subject);
    history[replace ? 'replaceState' : 'pushState'](
      state(Object.assign({ view: view }, payload || {})),
      '',
      url.pathname + url.search + url.hash
    );
  }

  function initialView(view, payload) {
    write(view, payload, true);
  }

  function installHomeHistory() {
    if (typeof window.goDetail !== 'function' || typeof window.goHome !== 'function') return;
    var renderDetail = window.goDetail;
    var renderHome = window.goHome;
    var directSchool = new URL(location.href).searchParams.get('school');

    initialView('home');

    function enterSchoolDetail(schoolName) {
      if (!schoolName) return;
      if (!restoring) {
        if (directSchool) {
          write('school-detail', { school: schoolName }, true);
          directSchool = null;
        } else if (!(history.state && history.state.kzUiHistory && history.state.view === 'school-detail' && history.state.school === schoolName)) {
          write('school-detail', { school: schoolName }, false);
        }
      }
      return renderDetail(schoolName);
    }

    window.goDetail = function (schoolName) {
      return enterSchoolDetail(schoolName);
    };
    window.enterSchoolDetailWithHistory = enterSchoolDetail;

    window.goHome = function () {
      if (!restoring && history.state && history.state.kzUiHistory && history.state.view === 'school-detail') {
        history.back();
        return;
      }
      return renderHome.apply(this, arguments);
    };

    window.goBackFromDetail = function () {
      if (history.state && history.state.kzUiHistory && history.state.view === 'school-detail') {
        history.back();
      } else if (history.length > 1) {
        history.back();
      } else {
        renderHome();
      }
    };

    addEventListener('popstate', function (event) {
      var s = event.state;
      if (!s || !s.kzUiHistory) return;
      restoring = true;
      if (s.view === 'school-detail' && s.school) renderDetail(s.school);
      else renderHome();
      restoring = false;
    });
  }

  function installCourseQueryHistory() {
    if (typeof window.goToDetail !== 'function' || typeof window.goToSchoolDetail !== 'function') return;
    var renderSubject = window.goToDetail;
    var renderSchool = window.goToSchoolDetail;
    var renderHome = window.goHome;
    var direct = new URL(location.href).searchParams;
    var directSubject = direct.get('subject');
    var directSchool = direct.get('school');
    var subjectCache = new Map();

    initialView('home');

    window.goToDetail = function (subject) {
      if (subject && subject.name) subjectCache.set(subject.name, subject);
      if (!restoring) {
        write('subject-detail', { subject: subject && subject.name }, !!directSubject);
        directSubject = null;
      }
      return renderSubject.apply(this, arguments);
    };

    window.goToSchoolDetail = function (schoolName) {
      if (!restoring) {
        write('course-school-detail', {
          school: schoolName,
          subject: history.state && history.state.view === 'subject-detail' ? history.state.subject : null
        }, !!directSchool);
        directSchool = null;
      }
      return renderSchool.apply(this, arguments);
    };

    window.goBackFromSchool = function () {
      if (history.state && history.state.kzUiHistory && history.state.view === 'course-school-detail') history.back();
      else renderHome();
    };

    window.goHome = function () {
      if (!restoring && history.state && history.state.kzUiHistory && history.state.view !== 'home') history.back();
      else return renderHome.apply(this, arguments);
    };

    addEventListener('popstate', function (event) {
      var s = event.state;
      if (!s || !s.kzUiHistory) return;
      restoring = true;
      if (s.view === 'course-school-detail' && s.school) {
        if (s.subject) {
          var parent = subjectCache.get(s.subject);
          if (parent) renderSubject(parent);
        }
        renderSchool(s.school);
      } else if (s.view === 'subject-detail' && s.subject) {
        var subject = subjectCache.get(s.subject);
        if (subject) renderSubject(subject);
        else renderHome();
      } else {
        renderHome();
      }
      restoring = false;
    });
  }

  function installSourceMapHistory() {
    if (typeof window.showDetail !== 'function' || typeof window.showMain !== 'function') return;
    var renderDetail = window.showDetail;
    var renderMain = window.showMain;
    var directSchool = new URL(location.href).searchParams.get('school');

    initialView('source-map');

    window.showDetail = function (schoolName) {
      if (!restoring) {
        write('source-detail', { school: schoolName }, !!directSchool);
        directSchool = null;
      }
      return renderDetail.apply(this, arguments);
    };

    window.showMain = function () {
      if (!restoring && history.state && history.state.kzUiHistory && history.state.view === 'source-detail') history.back();
      else return renderMain.apply(this, arguments);
    };

    addEventListener('popstate', function (event) {
      var s = event.state;
      if (!s || !s.kzUiHistory) return;
      restoring = true;
      if (s.view === 'source-detail' && s.school) renderDetail(s.school);
      else renderMain();
      restoring = false;
    });
  }

  if (/专业课选择\/考研专业课院校查询\.html$/.test(path)) installCourseQueryHistory();
  else if (/通信电子院校生源地图\.html$/.test(path)) installSourceMapHistory();
  else if (/\/(index\.html)?$/.test(path)) installHomeHistory();
})();
