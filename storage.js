/* Студия — локальное хранилище файлов и резервные копии.
   Работает поверх приложения: заменяет облачные API (window.claude.*)
   на IndexedDB и добавляет экспорт/импорт всей базы. */
(function () {
  'use strict';

  var DB_NAME = 'studio_files';
  var DB_VER = 1;
  var STORE = 'blobs';

  /* ---------- IndexedDB ---------- */
  var _db = null;
  function db() {
    if (_db) return Promise.resolve(_db);
    return new Promise(function (res, rej) {
      var r = indexedDB.open(DB_NAME, DB_VER);
      r.onupgradeneeded = function () {
        var d = r.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
      };
      r.onsuccess = function () { _db = r.result; res(_db); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function op(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var q = fn(d.transaction(STORE, mode).objectStore(STORE));
        q.onsuccess = function () { res(q.result); };
        q.onerror = function () { rej(q.error); };
      });
    });
  }
  var putBlob = function (id, blob) { return op('readwrite', function (s) { return s.put(blob, id); }).then(function () { return id; }); };
  var getBlob = function (id) { return op('readonly', function (s) { return s.get(id); }); };
  var delBlob = function (id) { return op('readwrite', function (s) { return s['delete'](id); }); };
  var allIds = function () { return op('readonly', function (s) { return s.getAllKeys(); }).then(function (k) { return k || []; }); };

  /* ---------- URL-кэш ---------- */
  var urls = new Map();

  /* ---------- Адаптер вместо claude.use('assets') ---------- */
  var seq = 0;
  function newId() {
    seq++;
    return 'f' + Date.now().toString(36) + seq.toString(36) + Math.random().toString(36).slice(2, 7);
  }
  var adapter = {
    upload: function (file) {
      var id = newId();
      return putBlob(id, file).then(function () {
        return getBlob(id);
      }).then(function (b) {
        if (b) urls.set(id, URL.createObjectURL(b));
        return { id: id };
      });
    },
    'delete': function (id) {
      var u = urls.get(id);
      if (u) { try { URL.revokeObjectURL(u); } catch (e) {} urls.delete(id); }
      return delBlob(id).catch(function () {});
    },
    url: function (id) { return Promise.resolve(urls.get(id) || ''); }
  };

  /* ---------- Подмена функций приложения ---------- */
  if (typeof window.asGet === 'function') {
    window.asGet = function () { return Promise.resolve(adapter); };
  }
  var BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  window.bUrl = function (id) {
    if (!id) return BLANK;
    return urls.get(id) || BLANK;
  };

  /* ---------- Экспорт ---------- */
  function blobToDataUrl(blob) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { res(fr.result); };
      fr.onerror = function () { rej(fr.error); };
      fr.readAsDataURL(blob);
    });
  }

  function exportJSON() {
    var ls = {};
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k === 'studio_tmp_backup') continue;
      ls[k] = localStorage.getItem(k);
    }
    return allIds().then(function (ids) {
      var filePromises = ids.map(function (id) {
        return getBlob(id).then(function (b) {
          if (!b) return null;
          return blobToDataUrl(b).then(function (d) { return [id, d]; });
        });
      });
      return Promise.all(filePromises).then(function (pairs) {
        var files = {};
        pairs.forEach(function (p) { if (p) files[p[0]] = p[1]; });
        return JSON.stringify({ app: 'studio-backup', v: 1, at: new Date().toISOString(), ls: ls, files: files });
      });
    });
  }

  function toast(t) {
    if (window.U && U.toast) U.toast(t);
    else alert(t);
  }

  function downloadBackup() {
    toast('Готовлю копию…');
    exportJSON().then(function (json) {
      var name = 'studiya-kopiya-' + new Date().toISOString().slice(0, 10) + '.json';
      var file = new File([json], name, { type: 'application/json' });
      localStorage.setItem('studio_last_backup', new Date().toISOString());
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: 'Копия данных «Студия»' })
          .then(function () { toast('Копия отправлена'); })
          .catch(function () { downloadFile(file, name); });
      }
      downloadFile(file, name);
    }).catch(function (e) { toast('Не вышло: ' + (e && e.message || e)); });
  }

  function downloadFile(file, name) {
    try {
      var u = URL.createObjectURL(file);
      var a = document.createElement('a');
      a.href = u; a.download = name; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 20000);
      toast('Копия сохранена в загрузки');
    } catch (e) {
      toast('Сохранение файла недоступно');
    }
  }

  /* ---------- Импорт ---------- */
  function pickImport() {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.style.display = 'none';
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (f) doImport(f);
      inp.remove();
    };
    document.body.appendChild(inp);
    inp.click();
  }

  function applyBackup(data, opts) {
    opts = opts || {};
    return exportJSON().then(function (current) {
      try { localStorage.setItem('studio_tmp_backup', current); } catch (e) {}
    }).catch(function () {}).then(function () {
      Object.keys(data.ls || {}).forEach(function (k) {
        try { localStorage.setItem(k, data.ls[k]); } catch (e) {}
      });
      var jobs = Object.keys(data.files || {}).map(function (id) {
        return fetch(data.files[id]).then(function (r) { return r.blob(); })
          .then(function (b) { return putBlob(id, b); })
          .catch(function () {});
      });
      return Promise.all(jobs);
    }).then(function () {
      if (opts.skipReload) return true;
      toast('Готово, перезапускаю…');
      setTimeout(function () { location.reload(); }, 700);
      return true;
    });
  }

  function importJSON(txt, opts) {
    opts = opts || {};
    var data;
    try { data = JSON.parse(txt); } catch (e) { return Promise.reject(new Error('Файл повреждён')); }
    if (!data || data.app !== 'studio-backup') return Promise.reject(new Error('Это не файл копии «Студии»'));
    var nFiles = Object.keys(data.files || {}).length;
    var when = (data.at || '').slice(0, 16).replace('T', ' ');
    if (opts.confirm !== false) {
      if (!confirm('Заменить данные копией от ' + when + '?\nФайлов в копии: ' + nFiles)) {
        return Promise.resolve(false);
      }
    }
    return applyBackup(data, opts);
  }

  function doImport(file) {
    file.text().then(function (txt) {
      return importJSON(txt);
    }).catch(function (e) { toast(e.message || 'Ошибка импорта'); });
  }

  window.studioImportJSON = importJSON;

  /* ---------- Меню ---------- */
  function backupMenu() {
    if (!(window.U && U.menu)) return toast('Меню недоступно');
    var last = localStorage.getItem('studio_last_backup');
    U.menu([
      ['Скачать копию', 'bk2', downloadBackup],
      ['Восстановить из файла', 'cp', pickImport],
      ['Копия: ' + (last ? new Date(last).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'ещё не делалась'), 'sh', function () {}]
    ]);
  }
  window.studioBackup = backupMenu;
  window.studioExportJSON = exportJSON;

  /* ---------- Кнопка в шапке списка объектов ---------- */
  function decorate() {
    try {
      var mt = null, titles = document.querySelectorAll('.mt');
      for (var i = 0; i < titles.length; i++) {
        if (titles[i].textContent.trim() === 'Объекты') { mt = titles[i]; break; }
      }
      if (!mt) return;
      var rt = document.querySelector('.nv .rt');
      if (!rt || rt.querySelector('[data-bk]')) return;
      var b = document.createElement('button');
      b.className = 'ib';
      b.setAttribute('data-bk', '1');
      b.setAttribute('aria-label', 'Резервная копия');
      b.innerHTML = typeof window.I === 'function' ? I('bk2', 18) : '⋯';
      b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); backupMenu(); });
      rt.insertBefore(b, rt.firstChild);
    } catch (e) {}
  }

  function watch() {
    if (window.U && U.R) {
      var orig = U.R;
      U.R = function () {
        var r = orig.apply(this, arguments);
        try { decorate(); } catch (e) {}
        return r;
      };
    }
    try { decorate(); } catch (e) {}
  }

  /* ---------- Честный статус сохранения ---------- */
  try {
    if (typeof window.svHtml === 'function') {
      window.svHtml = function () {
        var st = window.store && store.state;
        if (st === 'saving') return '<i class="spn"></i>Сохраняю';
        if (st === 'retry') return '<i class="spn"></i>Нет сети, повторю';
        return (typeof window.ic === 'function' ? ic('check', 14) : '') + 'Сохранено на устройстве';
      };
    }
  } catch (e) {}

  /* ---------- Предзагрузка файлов в URL-кэш ---------- */
  function preload() {
    return allIds().then(function (ids) {
      return Promise.all(ids.map(function (id) {
        return getBlob(id).then(function (b) {
          if (b && !urls.has(id)) urls.set(id, URL.createObjectURL(b));
        }).catch(function () {});
      })).then(function () {
        if (ids.length) { try { if (window.U && U.R) U.R(); } catch (e) {} }
      });
    });
  }

  /* ---------- Старт ---------- */
  function boot() {
    watch();
    setInterval(function () { try { decorate(); } catch (e) {} }, 500);
    preload().catch(function () {});
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(boot, 0);
  else window.addEventListener('DOMContentLoaded', boot);
})();
