/* Студия — дополнения: тема, печать, самопроверка, дубликат, отмена, поиск по свайпу, PDF дизайн-проектов.
   Подключается после storage.js и ничего в нём не ломает. */
(function () {
  'use strict';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function toast(t) { if (window.U && U.toast) U.toast(t); }

  /* ================= CSS ================= */
  var CSS = [
    /* --- safe-area: не залезать под «чёлку» и полоску «Домой» --- */
    '.nv{padding-top:calc(env(safe-area-inset-top) + 4px) !important}',
    '.sc{padding-bottom:calc(env(safe-area-inset-bottom) + 8px)}',
    '.nv .rt .ib{min-width:38px;min-height:38px}',
    /* --- iOS не должен зумить страницу при фокусе поля --- */
    'input,textarea,select{font-size:16px !important}',

    /* --- светлая тема --- */
    'html[data-theme="light"]{--bg:#f6f4ef;--s1:#ffffff;--s2:#efece6;--s3:#e3dfd7;',
    '--bd:rgba(0,0,0,.10);--bd2:rgba(0,0,0,.18);',
    '--t1:#1b1b1d;--t2:#5d5d63;--t3:#8b8b90;',
    '--ac:#0a6cd6;--ac2:#0a6cd6;--ok:#248a3d;--wa:#a75b00;--er:#c8181b;',
    '--text-primary:#1b1b1d;--text-secondary:#5d5d63;--text-muted:#8b8b90;',
    '--text-accent:#0a6cd6;--text-warning:#a75b00;--text-success:#248a3d;--text-danger:#c8181b;',
    '--border:rgba(0,0,0,.10);--surface-1:#ffffff;--surface-2:#efece6;color-scheme:light}',
    'html[data-theme="light"] .ctx,html[data-theme="light"] .toast,html[data-theme="light"] .sb,',
    'html[data-theme="light"] .shd,html[data-theme="light"] .sheet{background:#fff !important;color:#1b1b1d !important}',
    'html[data-theme="light"] .ctx div{border-color:rgba(0,0,0,.10) !important}',
    'html[data-theme="light"] .ctx svg{color:#5d5d63}',

    /* --- печать: только содержимое, без интерфейса --- */
    '@media print{',
    'html,body{background:#fff !important;color:#000 !important}',
    '#ui,.ly,.sc,.in{position:static !important;height:auto !important;overflow:visible !important;display:block !important}',
    '.nv,.sbs,.sbg,.ctx,.toast,.svt,.sheet,.shd,.gr,.fade,.sx,.sxp{display:none !important}',
    '*{color:#000 !important;background:transparent !important;box-shadow:none !important;text-shadow:none !important}',
    '.rw,.row,.hs,.cv,.q{border-color:#bbb !important}',
    '}'
  ].join('\n');

  var styleEl = document.createElement('style');
  styleEl.id = 'studio-extra-css';
  styleEl.textContent = CSS;
  (document.head || document.documentElement).appendChild(styleEl);

  /* ================= тема ================= */
  var THEMES = ['dark', 'light', 'auto'];
  function themeName() { return localStorage.getItem('studio_theme') || 'dark'; }
  function applyTheme() {
    var t = themeName();
    var light = t === 'light' || (t === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches);
    document.documentElement.setAttribute('data-theme', light ? 'light' : 'dark');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', light ? '#f6f4ef' : '#0b0c0e');
  }
  function nextTheme() {
    var i = THEMES.indexOf(themeName());
    var t = THEMES[(i + 1) % THEMES.length];
    localStorage.setItem('studio_theme', t);
    applyTheme();
    toast('Тема: ' + ({ dark: 'тёмная', light: 'светлая', auto: 'как в системе' })[t]);
    setTimeout(function () { if (window.U && U.R) U.R(); }, 60);
  }
  window.studioSetTheme = function (t) { localStorage.setItem('studio_theme', t); applyTheme(); };
  window.studioNextTheme = nextTheme;

  /* ================= счётчики IDB ================= */
  function countFiles() {
    return new Promise(function (res) {
      try {
        var q = indexedDB.open('studio_files');
        q.onsuccess = function () {
          try {
            var g = q.result.transaction('blobs').objectStore('blobs').count();
            g.onsuccess = function () { res(g.result); };
            g.onerror = function () { res(-1); };
          } catch (e) { res(-1); }
        };
        q.onerror = function () { res(-1); };
      } catch (e) { res(-1); }
    });
  }
  function lsBytes() {
    var n = 0;
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      n += (k.length + (localStorage.getItem(k) || '').length) * 2;
    }
    return n;
  }

  /* ================= самопроверка ================= */
  function box(html) {
    var w = document.createElement('div');
    w.id = 'studio-diag';
    w.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);display:flex;align-items:flex-end';
    w.innerHTML = '<div style="background:var(--s1,#17181b);color:var(--t1,#f2f2f4);width:100%;max-height:82vh;overflow:auto;' +
      'border-radius:18px 18px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom));font:15px/1.45 -apple-system,system-ui,sans-serif">' +
      '<div style="display:flex;align-items:center;margin-bottom:12px"><b style="font-size:18px">Проверка приложения</b>' +
      '<button id="sd-x" style="margin-left:auto;background:var(--s3,#2a2b30);color:inherit;border:0;width:32px;height:32px;border-radius:16px;font-size:16px">✕</button></div>' +
      '<div id="sd-b">Считаю…</div></div>';
    document.body.appendChild(w);
    w.addEventListener('click', function (e) { if (e.target === w) w.remove(); });
    $('#sd-x', w).addEventListener('click', function () { w.remove(); });
    return $('#sd-b', w);
  }

  function selfCheck() {
    var b = box();
    Promise.all([countFiles()]).then(function (r) {
      var files = r[0];
      var objsN = (window.objs || []).length;
      var pages = 0;
      try { pages = Math.round(lsBytes() / 1024); } catch (e) {}
      var rows = [
        ['Версия', 'Студия · сборка 3 (PDF)'],
        ['Объектов', objsN],
        ['Файлов в памяти', files < 0 ? 'недоступно' : files],
        ['Занято в хранилище', pages + ' КБ (лимит ~5 МБ)'],
        ['Офлайн-режим', ('serviceWorker' in navigator) ? 'включён' : 'нет'],
        ['Тема', ({ dark: 'тёмная', light: 'светлая', auto: 'как в системе' })[themeName()]],
        ['Последняя копия', (function () {
          var v = localStorage.getItem('studio_last_backup');
          return v ? new Date(v).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'не делалась';
        })()]
      ];
      b.innerHTML = rows.map(function (r) {
        return '<div style="display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid var(--bd,rgba(255,255,255,.1))">' +
          '<span style="color:var(--t2,#a3a4ab)">' + r[0] + '</span><b style="text-align:right">' + r[1] + '</b></div>';
      }).join('') +
        '<button id="sd-run" style="margin-top:16px;width:100%;padding:14px;border-radius:12px;border:1px solid var(--bd2,rgba(255,255,255,.16));' +
        'background:var(--s2,#1f2024);color:inherit;font:600 15px/1 inherit">Прогнать мини-тест</button>' +
        '<div id="sd-res" style="margin-top:12px;color:var(--t2,#a3a4ab);font-size:14px"></div>' +
        '<div style="margin-top:14px;color:var(--t3,#6c6d74);font-size:12.5px">Данные хранятся на этом устройстве. Копию можно скачать в меню копии.</div>';

      $('#sd-run', b).addEventListener('click', function () {
        var out = $('#sd-res', b);
        out.textContent = 'Проверяю запись…';
        var key = 'studio_selftest';
        try {
          localStorage.setItem(key, 'ok');
          var ok = localStorage.getItem(key) === 'ok';
          localStorage.removeItem(key);
          out.innerHTML = ok
            ? '<span style="color:#30d158">✓ Запись и чтение работают</span>'
            : '<span style="color:#ff453a">✗ Хранилище не пишет</span>';
        } catch (e) {
          out.innerHTML = '<span style="color:#ff453a">✗ Хранилище недоступно: ' + (e.message || e) + '</span>';
        }
      });
    });
  }
  window.studioSelfCheck = selfCheck;

  /* ================= дубликат объекта ================= */
  function nextId() {
    var max = 0;
    (window.objs || []).forEach(function (o) {
      var n = parseInt(String(o.n).replace(/\D/g, ''), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return String(max + 1);
  }
  function dupObj() {
    if (!window.curObj) return toast('Сначала откройте объект');
    var src = window.curObj;
    var copy;
    try { copy = JSON.parse(JSON.stringify(src)); } catch (e) { return toast('Не удалось скопировать'); }
    copy.n = nextId();
    copy.ts = Date.now();
    copy.name = (src.name ? src.name + ' · ' : '') + 'копия';
    window.objs.push(copy);
    try { window.lsSave && lsSave(); } catch (e) {}
    toast('Создан объект ' + copy.n);
    try { U.goTab('objs'); } catch (e) {}
  }
  window.studioDuplicate = dupObj;

  function hookObjMenu() {
    if (!(window.U && U.objMenu) || U.objMenu.__wrapped) return;
    var orig = U.objMenu;
    var wrapped = function () {
      var r = orig.apply(this, arguments);
      try {
        var ctx = document.querySelector('.ctx');
        if (ctx && !ctx.querySelector('[data-dup]')) {
          var row = document.createElement('div');
          row.setAttribute('data-dup', '1');
          row.innerHTML = 'Дублировать объект' + (typeof I === 'function' ? I('cp', 18) : '');
          row.addEventListener('click', function () { try { U.closeS(1); } catch (e) {} dupObj(); });
          ctx.appendChild(row);
        }
      } catch (e) {}
      return r;
    };
    wrapped.__wrapped = true;
    U.objMenu = wrapped;
  }

  /* ================= отмена удаления объекта ================= */
  function undoBar(text, onUndo) {
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:9000;' +
      'background:var(--s2,#1f2024);color:var(--t1,#f2f2f4);border:1px solid var(--bd2,rgba(255,255,255,.16));' +
      'border-radius:14px;padding:12px 14px;display:flex;align-items:center;gap:10px;font:15px/1.3 -apple-system,system-ui,sans-serif;' +
      'box-shadow:0 12px 40px rgba(0,0,0,.45)';
    d.innerHTML = '<span style="flex:1">' + text + '</span>';
    var btn = document.createElement('button');
    btn.textContent = 'Вернуть';
    btn.style.cssText = 'background:#0a84ff;color:#fff;border:0;border-radius:10px;padding:10px 14px;font:600 15px/1 inherit';
    d.appendChild(btn);
    document.body.appendChild(d);
    var t = setTimeout(function () { d.remove(); }, 7000);
    btn.addEventListener('click', function () {
      clearTimeout(t); d.remove();
      try { onUndo(); } catch (e) {}
    });
  }

  function hookUndo() {
    if (typeof window.doDelObj !== 'function' || window.doDelObj.__wrapped) return;
    var orig = window.doDelObj;
    var wrapped = function () {
      var snap;
      try { snap = JSON.stringify(window.objs || []); } catch (e) { snap = null; }
      var r = orig.apply(this, arguments);
      if (snap) {
        undoBar('Объект удалён', function () {
          try {
            window.objs = JSON.parse(snap);
            window.lsSave && lsSave();
            toast('Объект восстановлен');
            try { U.goTab('objs'); } catch (e) {}
          } catch (e) {}
        });
      }
      return r;
    };
    wrapped.__wrapped = true;
    window.doDelObj = wrapped;
  }

  /* ================= запоминаем последний открытый объект ================= */
  function hookOpenObj() {
    if (typeof window.U === 'undefined' || !U.openObj || U.openObj.__wrapped) return;
    var orig = U.openObj;
    var wrapped = function (i) {
      var r = orig.apply(this, arguments);
      try {
        var o = (window.objs || [])[i];
        if (o) localStorage.setItem('studio_last_obj', String(o.n));
      } catch (e) {}
      return r;
    };
    wrapped.__wrapped = true;
    U.openObj = wrapped;
  }

  /* ================= поиск: открывается свайпом вниз на главной ================= */
  var SX = { open: false, el: null, inst: false, pill: null, label: null };
  var PULL_ARM = 90; /* на сколько пикселей надо потянуть, чтобы открылся поиск */
  var pull = { on: false, act: false, x0: 0, y0: 0, dy: 0, sc: null, inn: null };

  function sxCss() {
    if (document.getElementById('studio-sx-css')) return;
    var s = document.createElement('style');
    s.id = 'studio-sx-css';
    s.textContent = [
      '.sxp{position:fixed;left:16px;right:16px;top:calc(env(safe-area-inset-top,0px) + 10px);height:44px;z-index:55;',
      'border-radius:12px;background:var(--s2);color:var(--t3);display:none;align-items:center;gap:8px;padding:0 12px;',
      'font-size:16px;pointer-events:none;border:1.5px solid transparent;box-sizing:border-box;max-width:640px;margin:0 auto}',
      '.sxp.arm{border-color:var(--ac2);color:var(--t1)}',
      '.sx{position:absolute;inset:0;z-index:60;background:var(--bg);display:flex;flex-direction:column;',
      'animation:sxin .24s cubic-bezier(.32,.72,0,1)}',
      '.sx.out{animation:sxout .18s ease forwards;pointer-events:none}',
      '@keyframes sxin{from{opacity:0;transform:translateY(-22px)}to{opacity:1;transform:none}}',
      '@keyframes sxout{to{opacity:0;transform:translateY(-22px)}}',
      '.sxh{flex:none;width:100%;max-width:672px;margin:0 auto;box-sizing:border-box;',
      'padding:calc(env(safe-area-inset-top,0px) + 10px) 16px 8px}',
      '.sxi{display:flex;align-items:center;gap:8px;height:44px;border-radius:12px;background:var(--s2);',
      'padding:0 6px 0 12px;color:var(--t3)}',
      '.sxi input{flex:1;min-width:0;background:none;border:0;outline:none;color:var(--t1);height:44px;padding:0}',
      '.sxi input::placeholder{color:var(--t3)}',
      '.sxi input::-webkit-search-cancel-button{display:none}',
      '.sxx{width:32px;height:32px;border-radius:16px;border:0;background:var(--s3);color:var(--t2);',
      'display:flex;align-items:center;justify-content:center;padding:0;flex:none}',
      '.sxr{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;',
      'width:100%;max-width:672px;margin:0 auto;box-sizing:border-box;padding:4px 16px 40px}',
      'body.kb .sxr{padding-bottom:45vh}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function sxResults() { try { return U.sres(); } catch (e) { return ''; } }

  function openSx() {
    if (SX.open || !(window.U && U.ui && U.sres)) return;
    SX.open = true;
    U.gq = '';
    var ov = document.createElement('div');
    ov.id = 'sx';
    ov.className = 'sx';
    ov.innerHTML = '<div class="sxh"><div class="sxi">' + U.I('se', 18) +
      '<input id="gq" type="search" enterkeyhint="search" placeholder="Объекты, проекты, решения, работы" ' +
      'autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">' +
      '<button class="sxx" type="button" aria-label="Закрыть поиск">' + U.I('x', 15) + '</button></div></div>' +
      '<div id="gres" class="sxr"></div>';
    U.ui.appendChild(ov);
    SX.el = ov;
    var inp = ov.querySelector('#gq'), res = ov.querySelector('#gres');
    res.innerHTML = sxResults();
    inp.addEventListener('input', function () { U.gq = inp.value; res.innerHTML = sxResults(); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') inp.blur(); });
    /* крестик: очищает, убирает клавиатуру и закрывает поиск */
    ov.querySelector('.sxx').addEventListener('click', function (e) { e.preventDefault(); closeSx(); });
    /* листаешь результаты - клавиатура прячется */
    res.addEventListener('touchmove', function () { if (document.activeElement === inp) inp.blur(); }, { passive: true });
    /* нажали на результат: если открылся другой экран, поиск закрываем; если шторка или подсказка - остаемся */
    var snap = null;
    res.addEventListener('click', function () { snap = { top: U.top(), len: U.st.length }; }, true);
    res.addEventListener('click', function () {
      setTimeout(function () {
        if (!SX.open || !snap) return;
        if (U.top() !== snap.top || U.st.length !== snap.len) { closeSx(); return; }
        if (U.ui.querySelector('.sht')) return;
        if (inp.value !== U.gq) inp.value = U.gq;
        res.innerHTML = sxResults();
      }, 0);
    });
    try { inp.focus(); } catch (e) {}
  }

  function closeSx() {
    if (!SX.open) return;
    SX.open = false;
    var ov = SX.el;
    SX.el = null;
    try { var i = ov.querySelector('#gq'); i.value = ''; i.blur(); } catch (e) {}
    U.gq = '';
    ov.classList.add('out');
    setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 190);
  }
  window.studioOpenSearch = openSx;
  window.studioCloseSearch = closeSx;

  function homeActive() {
    var t = window.U && U.top && U.top();
    return !!(t && t.id === 'home' && !SX.open && !U.busy && !U.ui.querySelector('.sht'));
  }

  function pullUpdate(dy) {
    var shift = Math.min(58, dy * 0.55);
    if (pull.inn) { pull.inn.style.transition = 'none'; pull.inn.style.transform = 'translateY(' + shift + 'px)'; }
    var k = Math.min(1, shift / 40);
    SX.pill.style.opacity = k;
    SX.pill.style.transform = 'translateY(' + ((1 - k) * -14) + 'px)';
    var arm = dy >= PULL_ARM;
    SX.pill.classList.toggle('arm', arm);
    SX.label.textContent = arm ? 'Отпустите для поиска' : 'Потяните вниз для поиска';
  }

  function pullEnd(cancel) {
    if (!pull.on) return;
    var was = pull.act, arm = !cancel && pull.dy >= PULL_ARM, inn = pull.inn;
    pull.on = false;
    pull.act = false;
    if (inn) {
      inn.style.transition = 'transform .22s cubic-bezier(.32,.72,0,1)';
      inn.style.transform = '';
      setTimeout(function () { inn.style.transition = ''; }, 260);
    }
    if (!was) return;
    if (arm) openSx(); /* фокус ставится прямо в жесте, поэтому клавиатура открывается сразу */
    SX.pill.style.display = 'none';
  }

  function installSx() {
    if (SX.inst || !(window.U && U.ui)) return;
    SX.inst = true;
    sxCss();
    var pill = document.createElement('div');
    pill.className = 'sxp';
    pill.innerHTML = U.I('se', 18) + '<span>Потяните вниз для поиска</span>';
    U.ui.appendChild(pill);
    SX.pill = pill;
    SX.label = pill.querySelector('span');

    document.addEventListener('touchstart', function (e) {
      pull.on = false;
      if (e.touches.length !== 1 || !homeActive()) return;
      var p = e.touches[0];
      if (p.clientX < 26) return; /* левый край - свайп назад */
      var sc = U.cur && U.cur.querySelector('.sc');
      if (!sc || !sc.contains(e.target) || sc.scrollTop > 0) return;
      pull.on = true;
      pull.act = false;
      pull.x0 = p.clientX;
      pull.y0 = p.clientY;
      pull.dy = 0;
      pull.sc = sc;
      pull.inn = sc.querySelector('.in');
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
      if (!pull.on) return;
      var p = e.touches[0], dx = p.clientX - pull.x0, dy = p.clientY - pull.y0;
      if (!pull.act) {
        if (dy > 10 && dy > Math.abs(dx) * 1.3 && pull.sc.scrollTop <= 0) {
          pull.act = true;
          SX.pill.style.display = 'flex';
        } else if (dy < -6 || Math.abs(dx) > 14) { pull.on = false; return; }
        else return;
      }
      pull.dy = Math.max(0, dy);
      pullUpdate(pull.dy);
      if (e.cancelable) e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchend', function () { pullEnd(false); });
    document.addEventListener('touchcancel', function () { pullEnd(true); });
  }

  /* на главной убираем постоянную строку поиска (его открывает свайп вниз) и плашку «Продолжить» */
  function hookHome() {
    if (!(window.U && U.S && U.S.home) || U.S.home.__wrapped) return;
    installSx();
    var orig = U.S.home;
    var wrapped = function () {
      var h = orig.apply(this, arguments);
      return String(h).replace(/<div class="srch"[^>]*>[\s\S]*?<\/div>/, '') +
        '<div class="cp" style="text-align:center;margin:28px 0 8px;opacity:.45">сборка 3 · PDF в дизайн-проектах</div>';
    };
    wrapped.__wrapped = true;
    U.S.home = wrapped;
    U.openSearch = function () { openSx(); };
    try { U.R(); } catch (e) {}
  }

  /* ================= дизайн-проект: PDF и этапы ================= */
  var STG = [['meas', 'Обмеры'], ['conc', 'Концепция'], ['plan', 'Планировочные решения'], ['vis', 'Визуализации'],
    ['work', 'Рабочие чертежи'], ['spec', 'Ведомости и спецификации'], ['comp', 'Комплектация'], ['other', 'Прочее']];
  var DS = { q: null, busy: false, sel: [], selOn: false, last: '', lib: null };

  function stgAll() { var c = (window.PF && PF.stg) || []; return STG.concat(c); }
  function stgKnown(k) { return !!k && stgAll().some(function (s) { return s[0] === k; }); }
  function stgName(k) {
    if (!k) return 'Без этапа';
    var a = stgAll();
    for (var i = 0; i < a.length; i++) if (a[i][0] === k) return a[i][1];
    return 'Без этапа';
  }
  function stageOf(p, id) { var k = (p.ps || {})[id] || ''; return stgKnown(k) ? k : ''; }
  function pgLabel(p, id) { var m = (p.pn || {})[id]; return m && m[1] ? 'стр. ' + m[1] : ''; }
  function stagesOf(p) {
    p.ph = p.ph || []; p.ps = p.ps || {};
    var out = [], order = stgAll().map(function (s) { return s[0]; }).concat(['']);
    order.forEach(function (k) {
      var ids = p.ph.filter(function (id) { return stageOf(p, id) === k; });
      if (ids.length) out.push({ k: k, n: stgName(k), ids: ids });
    });
    return out;
  }
  function flatPages(p) {
    var o = [];
    stagesOf(p).forEach(function (s) { s.ids.forEach(function (id) { o.push({ id: id, s: s.k, n: s.n, l: pgLabel(p, id) }); }); });
    return o;
  }
  function plr(n, a, b, c) { return window.plur ? plur(n, a, b, c) : n; }

  function dsCss() {
    if (document.getElementById('studio-ds-css')) return;
    var s = document.createElement('style');
    s.id = 'studio-ds-css';
    s.textContent = [
      '.pgst{display:flex;gap:8px;overflow-x:auto;margin:0 -16px;padding:0 16px 4px;scrollbar-width:none}',
      '.pgst::-webkit-scrollbar{display:none}',
      '.pgst img{flex:none;height:150px;width:auto;max-width:none;border-radius:8px;background:var(--s2);display:block}',
      '.pgg{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}',
      '.pgi{position:relative;aspect-ratio:1;border-radius:8px;background:var(--s2) center/contain no-repeat;border:2px solid transparent;box-sizing:border-box}',
      '.pgi.on{border-color:var(--ac)}',
      '.pgi i{position:absolute;left:4px;bottom:4px;font-style:normal;font-size:11px;background:rgba(0,0,0,.55);color:#fff;border-radius:6px;padding:1px 5px}',
      '.pgi b{position:absolute;right:4px;top:4px;width:20px;height:20px;border-radius:10px;background:var(--ac);color:#fff;font-size:12px;display:none;align-items:center;justify-content:center}',
      '.pgi.on b{display:flex}',
      '.pgbar{position:sticky;top:0;z-index:4;background:var(--bg);padding:8px 16px;margin:0 -16px 8px}',
      '.pgv{position:absolute;inset:0;z-index:92;background:#000;display:flex;flex-direction:column;color:#fff}',
      '.pgv .top{flex:none;display:flex;align-items:center;gap:10px;padding:calc(env(safe-area-inset-top,0px) + 8px) 12px 8px}',
      '.pgv .top .x{width:36px;height:36px;border-radius:18px;border:0;background:rgba(255,255,255,.16);color:#fff;display:flex;align-items:center;justify-content:center;flex:none;padding:0}',
      '.pgv .top .ttl{flex:1;min-width:0;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.pgv .top .cn{font-size:13px;color:#bbb;flex:none}',
      '.pgv .sc2{flex:1;min-height:0;display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none}',
      '.pgv .sc2::-webkit-scrollbar{display:none}',
      '.pgv .sl{flex:none;width:100%;height:100%;scroll-snap-align:center;scroll-snap-stop:always;overflow:auto;-webkit-overflow-scrolling:touch}',
      '.pgv .sl .z{width:100%;height:100%;display:flex;align-items:center;justify-content:center}',
      '.pgv .sl img{max-width:100%;max-height:100%;object-fit:contain;display:block}',
      '.pgv .sl.zm .z{width:240%;height:auto;min-height:100%;align-items:flex-start}',
      '.pgv .sl.zm img{max-width:100%;max-height:none;width:100%;height:auto}',
      '.pgv .stgs{flex:none;display:flex;gap:6px;overflow-x:auto;padding:8px 12px calc(10px + env(safe-area-inset-bottom,0px));scrollbar-width:none}',
      '.pgv .stgs::-webkit-scrollbar{display:none}',
      '.pgv .stgs button{flex:none;border:0;border-radius:14px;padding:7px 11px;font-size:13px;background:rgba(255,255,255,.14);color:#fff}',
      '.pgv .stgs button.on{background:#fff;color:#000}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ---- просмотр страниц: листать, двойной тап - увеличить, этапы внизу ---- */
  function pgView(list, idx) {
    if (!list.length) return;
    dsCss();
    var old = document.getElementById('pgv');
    if (old) old.remove();
    var d = document.createElement('div');
    d.id = 'pgv';
    d.className = 'pgv';
    var stages = [];
    list.forEach(function (it, i) { if (!stages.some(function (x) { return x.s === it.s; })) stages.push({ s: it.s, n: it.n, i: i }); });
    d.innerHTML = '<div class="top"><button class="x" type="button" aria-label="Закрыть">' + U.I('x', 18) + '</button>' +
      '<span class="ttl"></span><span class="cn"></span></div>' +
      '<div class="sc2">' + list.map(function (it) {
        return '<div class="sl"><div class="z"><img loading="lazy" decoding="async" src="' + bUrl(it.id) + '"></div></div>';
      }).join('') + '</div>' +
      (stages.length > 1 ? '<div class="stgs">' + stages.map(function (s, k) { return '<button type="button" data-i="' + s.i + '">' + esc(s.n) + '</button>'; }).join('') + '</div>' : '');
    U.ui.appendChild(d);
    var sc = d.querySelector('.sc2'), ttl = d.querySelector('.ttl'), cn = d.querySelector('.cn');
    var chips = [].slice.call(d.querySelectorAll('.stgs button'));
    function upd() {
      var i = Math.max(0, Math.min(list.length - 1, Math.round(sc.scrollLeft / (sc.clientWidth || 1))));
      var it = list[i];
      ttl.textContent = it.n + (it.l ? ' · ' + it.l : '');
      cn.textContent = (i + 1) + ' / ' + list.length;
      chips.forEach(function (b) {
        var st = stages.filter(function (s) { return String(s.i) === b.getAttribute('data-i'); })[0];
        b.classList.toggle('on', !!st && st.s === it.s);
      });
    }
    sc.addEventListener('scroll', upd, { passive: true });
    d.querySelector('.x').addEventListener('click', function () { d.remove(); });
    chips.forEach(function (b) {
      b.addEventListener('click', function () { sc.scrollTo({ left: (+b.getAttribute('data-i')) * sc.clientWidth, behavior: 'smooth' }); });
    });
    var last = 0;
    [].slice.call(d.querySelectorAll('.sl')).forEach(function (sl) {
      sl.addEventListener('click', function () {
        var t = Date.now();
        if (t - last < 320) {
          sl.classList.toggle('zm');
          if (sl.classList.contains('zm')) { sl.scrollLeft = (sl.scrollWidth - sl.clientWidth) / 2; sl.scrollTop = 0; }
          last = 0;
        } else last = t;
      });
    });
    setTimeout(function () { sc.scrollLeft = (idx || 0) * sc.clientWidth; upd(); }, 0);
  }

  /* ---- PDF -> картинки страниц (pdf.js подгружается один раз, нужен интернет) ---- */
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (DS.lib) return DS.lib;
    var V = '3.11.174';
    var S = ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + V + '/pdf.min.js', 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + V + '/build/pdf.min.js'];
    var W = ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + V + '/pdf.worker.min.js', 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + V + '/build/pdf.worker.min.js'];
    DS.lib = new Promise(function (res, rej) {
      var i = 0;
      (function next() {
        if (i >= S.length) { DS.lib = null; rej(new Error('pdfjs')); return; }
        var s = document.createElement('script');
        s.src = S[i];
        s.onload = function () {
          if (window.pdfjsLib) { window.pdfjsLib.GlobalWorkerOptions.workerSrc = W[i]; res(window.pdfjsLib); }
          else { i++; next(); }
        };
        s.onerror = function () { i++; next(); };
        document.head.appendChild(s);
      })();
    });
    return DS.lib;
  }
  function renderPage(doc, n) {
    return doc.getPage(n).then(function (pg) {
      var v1 = pg.getViewport({ scale: 1 });
      var k = Math.min(4, 2000 / Math.max(v1.width, v1.height));
      var v = pg.getViewport({ scale: k });
      var cv = document.createElement('canvas');
      cv.width = Math.round(v.width);
      cv.height = Math.round(v.height);
      var cx = cv.getContext('2d');
      cx.fillStyle = '#fff';
      cx.fillRect(0, 0, cv.width, cv.height);
      return pg.render({ canvasContext: cx, viewport: v }).promise.then(function () {
        return new Promise(function (res) { cv.toBlob(res, 'image/jpeg', 0.86); });
      }).then(function (blob) {
        cv.width = cv.height = 0;
        try { pg.cleanup(); } catch (e) {}
        return blob;
      });
    });
  }

  function guessStage(name, isImg) {
    var n = String(name || '').toLowerCase().replace(/ё/g, 'е');
    var R = [[/обмер/, 'meas'], [/концепц|мудборд|moodboard|референс/, 'conc'], [/планир/, 'plan'], [/визуал|рендер|render|3d/, 'vis'],
      [/чертеж|рабоч|раздел/, 'work'], [/ведомост|специф/, 'spec'], [/комплект|меблир/, 'comp'], [/план/, 'plan']];
    for (var i = 0; i < R.length; i++) if (R[i][0].test(n)) return R[i][1];
    return isImg ? 'vis' : (DS.last || '');
  }

  /* ---- выбор файлов: сначала спрашиваем этап для каждого ---- */
  function pickFiles(p, files, kind) {
    if (!files.length) return;
    if (DS.busy) { toast('Идет загрузка, подождите'); return; }
    DS.q = {
      pid: p.id,
      items: files.map(function (f) {
        var isPdf = /pdf/i.test(f.type) || /\.pdf$/i.test(f.name);
        return { f: f, pdf: isPdf, s: guessStage(f.name, !isPdf) };
      })
    };
    askStages();
  }
  function askStages() {
    U.sheet(function () {
      var Q = DS.q;
      if (!Q) return { t: 'Этап проекта', b: '' };
      var opts = function (cur) {
        return '<option value="">Без этапа</option>' + stgAll().map(function (s) {
          return '<option value="' + esc(s[0]) + '"' + (s[0] === cur ? ' selected' : '') + '>' + esc(s[1]) + '</option>';
        }).join('');
      };
      var rows = Q.items.map(function (it, i) {
        return '<div class="rw"><div class="tx"><b style="font-size:15px;line-height:19px;word-break:break-word">' + esc(it.f.name) + '</b>' +
          '<span>' + (it.pdf ? 'PDF: каждая страница станет картинкой' : 'изображение') + '</span></div>' +
          '<select class="fsel" style="flex:none;max-width:48%" onchange="' + U.f(function (e, el) { Q.items[i].s = el.value; DS.last = el.value; }) + '">' + opts(it.s) + '</select></div>';
      }).join('');
      return {
        t: 'К какому этапу относится',
        b: U.grp(rows) + '<div style="margin-top:10px"><button class="chip lt2" type="button"' + U.on(function () { newStage(function () { askStages(); }); }) + '>+ Свой этап</button></div>' +
          '<div class="cp" style="margin-top:10px">Этап подобран по названию файла. Если в PDF несколько этапов, страницы можно потом перенести между этапами.</div>',
        f: '<button class="btn g2"' + U.on(function () { DS.q = null; U.closeS(); }) + '>Отмена</button><button class="btn"' + U.on(function () { U.closeS(); runImport(); }) + '>Загрузить</button>'
      };
    });
  }
  function newStage(cb) {
    U.sheet(function () {
      return {
        t: 'Свой этап',
        b: U.grp('<div class="rw"><input class="fi" id="stgn" style="text-align:left" placeholder="Например, Электрика" enterkeyhint="done" onkeydown="if(event.key===\'Enter\')this.blur()"></div>'),
        f: '<button class="btn"' + U.on(function () {
          var el = document.getElementById('stgn'), v = el ? el.value.trim() : '';
          if (!v) { toast('Введите название'); return; }
          PF.stg = PF.stg || [];
          var ex = stgAll().filter(function (s) { return s[1].toLowerCase() === v.toLowerCase(); })[0];
          var k = ex ? ex[0] : 'c' + Date.now().toString(36);
          if (!ex) PF.stg.push([k, v]);
          pfSave();
          if (DS.q) DS.q.items.forEach(function (it) { if (!it.s && !it.touched) it.s = ''; });
          cb(k);
        }) + '>Добавить</button>'
      };
    });
    setTimeout(function () { var e = document.getElementById('stgn'); if (e) e.focus(); }, 350);
  }
  function stagePick(title, cur, cb) {
    U.sheet(function () {
      var S = stgAll().concat([['', 'Без этапа']]);
      return {
        t: esc(title),
        b: U.grp(S.map(function (s) {
          return U.row({ t: esc(s[1]), ck: cur === s[0], noch: 1, fn: function () { U.closeS(); cb(s[0]); } });
        }).join('') + U.row({ t: '<span style="color:var(--ac2)">+ Свой этап</span>', noch: 1, fn: function () { newStage(function (k) { U.closeS(); cb(k); }); } }))
      };
    });
  }

  function runImport() {
    var Q = DS.q;
    if (!Q || DS.busy) return;
    var p = pfGet(Q.pid);
    if (!p) return;
    asGet().then(function (a) {
      if (!a) { toast('Загрузка файлов недоступна в этом окне'); return; }
      DS.busy = true;
      DS.q = null;
      p.ph = p.ph || []; p.ps = p.ps || {}; p.pn = p.pn || {};
      var items = Q.items, total = 0, bad = 0;
      var say = function (t) { var e = document.getElementById('pgprog'); if (e) e.textContent = t; };
      try { U.R(); } catch (e) {}
      var addPage = function (blob, it, num) {
        return a.upload(blob).then(function (r) {
          if (r && r.id) { p.ph.push(r.id); p.ps[r.id] = it.s || ''; p.pn[r.id] = [it.f.name, num]; total++; pfSave(); }
          else bad++;
        }, function () { bad++; });
      };
      var doPdf = function (it, fi) {
        return loadPdfJs().then(function (lib) {
          return it.f.arrayBuffer().then(function (buf) { return lib.getDocument({ data: buf }).promise; });
        }).then(function (doc) {
          var n = 1;
          var step = function () {
            if (n > doc.numPages) { try { doc.destroy(); } catch (e) {} return Promise.resolve(); }
            say('Файл ' + (fi + 1) + ' из ' + items.length + ' · страница ' + n + ' из ' + doc.numPages);
            var cur = n++;
            return renderPage(doc, cur).then(function (blob) { return addPage(blob, it, cur); }, function () { bad++; }).then(step);
          };
          return step();
        }, function () { bad++; toast('Не получилось открыть ' + it.f.name + '. Для PDF нужен интернет'); });
      };
      var doImg = function (it, fi) {
        say('Файл ' + (fi + 1) + ' из ' + items.length);
        return shrink(it.f).then(function (b) { return addPage(b, it, 0); }, function () { bad++; });
      };
      var i = 0;
      var next = function () {
        if (i >= items.length) return Promise.resolve();
        var it = items[i], fi = i++;
        return (it.pdf ? doPdf(it, fi) : doImg(it, fi)).then(next);
      };
      next().then(function () {
        DS.busy = false;
        pfSave();
        try { U.R(); } catch (e) {}
        toast(total ? 'Добавлено страниц: ' + total + (bad ? ' · ошибок ' + bad : '') : 'Ничего не добавлено');
      }, function () { DS.busy = false; try { U.R(); } catch (e) {} toast('Загрузка прервалась'); });
    });
  }

  /* ---- блок в карточке редактирования дизайн-проекта ---- */
  function editBlock(p) {
    var S = stagesOf(p), n = p.ph.length, h = '';
    h += U.sh('Проект: PDF и страницы', n ? '<span class="cp">' + n + ' ' + plr(n, 'страница', 'страницы', 'страниц') + '</span>' : '');
    h += '<div style="display:flex;gap:8px;margin-bottom:10px">' +
      '<label class="btn" style="flex:1">' + U.I('pl', 18) + 'PDF<input type="file" accept="application/pdf,.pdf" multiple style="display:none" onchange="' +
      U.f(function (e, el) { var f = [].slice.call(el.files); el.value = ''; pickFiles(p, f, 'pdf'); }) + '"></label>' +
      '<label class="btn g2" style="flex:1">Изображения<input type="file" accept="image/*" multiple style="display:none" onchange="' +
      U.f(function (e, el) { var f = [].slice.call(el.files); el.value = ''; pickFiles(p, f, 'img'); }) + '"></label></div>';
    if (DS.busy) h += '<div class="cp" id="pgprog" style="margin:0 2px 10px">Готовлю страницы…</div>';
    if (!S.length) return h + '<div class="cp" style="margin:0 2px">Загрузите PDF проекта: страницы станут картинками, их можно разложить по этапам (планировки, визуализации, чертежи).</div>';
    h += U.grp(S.map(function (s) {
      return U.row({
        th: '', thS: U.bg(s.ids[0], p.id), t: esc(s.n), s: s.ids.length + ' ' + plr(s.ids.length, 'страница', 'страницы', 'страниц'),
        fn: function () { DS.sel = []; DS.selOn = false; U.go('pstage', { p: p.id, k: s.k }); }
      });
    }).join(''));
    return h;
  }

  /* ---- блок просмотра в карточке проекта ---- */
  function viewBlock(p) {
    var S = stagesOf(p);
    if (!S.length) return '';
    var all = flatPages(p), h = '';
    h += U.sh('Проект', '<span class="cp">' + all.length + ' ' + plr(all.length, 'страница', 'страницы', 'страниц') + '</span>');
    h += '<button class="btn" style="height:46px;margin-bottom:4px"' + U.on(function () { pgView(all, 0); }) + '>Листать проект</button>';
    S.forEach(function (s) {
      h += U.sh(esc(s.n), '<span class="cp">' + s.ids.length + '</span>') +
        '<div class="pgst">' + s.ids.map(function (id) {
          return '<img loading="lazy" decoding="async" src="' + bUrl(id) + '"' + U.on(function () {
            var i = 0;
            all.forEach(function (it, k) { if (it.id === id) i = k; });
            pgView(all, i);
          }) + '>';
        }).join('') + '</div>';
    });
    return h;
  }

  /* ---- экран этапа: страницы, выбор, перенос, порядок, обложка, удаление ---- */
  function stageScreen(a) {
    var p = pfGet(a.p);
    if (!p) return U.nv('Проект') + '<div class="empty"><b>Проект удален</b></div>';
    var ids = p.ph.filter(function (id) { return stageOf(p, id) === a.k; });
    DS.sel = DS.sel.filter(function (id) { return ids.indexOf(id) >= 0; });
    var h = U.nv('Проект', '<button class="ib tx"' + U.on(function () { DS.selOn = !DS.selOn; DS.sel = []; U.R(); }) + '>' + (DS.selOn ? 'Готово' : 'Выбрать') + '</button>');
    h += '<div class="mt">' + esc(stgName(a.k)) + '</div><div class="cp" style="margin-bottom:12px">' + ids.length + ' ' + plr(ids.length, 'страница', 'страницы', 'страниц') + '</div>';
    if (DS.selOn) {
      var n = DS.sel.length;
      h += '<div class="pgbar"><div class="chips">' +
        '<button class="chip sm lt2"' + U.on(function () { DS.sel = n === ids.length ? [] : ids.slice(); U.R(); }) + '>' + (n === ids.length ? 'Снять все' : 'Выбрать все') + '</button>';
      if (n) {
        h += '<button class="chip sm on"' + U.on(function () {
          stagePick('Перенести в этап', a.k, function (k) {
            p.ps = p.ps || {};
            DS.sel.forEach(function (id) { p.ps[id] = k; });
            DS.sel = [];
            pfSave();
            U.R();
          });
        }) + '>Перенести: ' + n + '</button>';
      }
      if (n === 1) {
        var id1 = DS.sel[0], k1 = ids.indexOf(id1);
        var swap = function (d) {
          var j = k1 + d;
          if (j < 0 || j >= ids.length) return;
          var x = p.ph.indexOf(id1), y = p.ph.indexOf(ids[j]);
          p.ph[x] = ids[j]; p.ph[y] = id1;
          pfSave(); U.R();
        };
        h += '<button class="chip sm lt2"' + U.on(function () { swap(-1); }) + '>Раньше</button>' +
          '<button class="chip sm lt2"' + U.on(function () { swap(1); }) + '>Позже</button>' +
          '<button class="chip sm lt2"' + U.on(function () {
            p.ph = [id1].concat(p.ph.filter(function (x) { return x !== id1; }));
            pfSave(); toast('Страница стала обложкой проекта'); U.R();
          }) + '>Обложка</button>';
      }
      if (n) {
        h += '<button class="chip sm lt2" style="color:var(--er)"' + U.on(function (e, el) {
          if (!el._a) { el._a = 1; el.textContent = 'Удалить: ' + n + '?'; return; }
          var gone = DS.sel.slice();
          p.ph = p.ph.filter(function (x) { return gone.indexOf(x) < 0; });
          gone.forEach(function (x) { delete p.ps[x]; if (p.pn) delete p.pn[x]; });
          DS.sel = [];
          pfSave();
          U.R();
          asGet().then(function (as) { if (as) gone.forEach(function (x) { try { as.delete(x); } catch (e) {} }); });
        }) + '>Удалить</button>';
      }
      h += '</div></div>';
    }
    if (!ids.length) return h + '<div class="empty"><b>В этом этапе страниц нет</b>Добавьте PDF в карточке проекта</div>';
    var list = ids.map(function (id) { return { id: id, s: a.k, n: stgName(a.k), l: pgLabel(p, id) }; });
    h += '<div class="pgg">' + ids.map(function (id, i) {
      var on = DS.sel.indexOf(id) >= 0, lb = pgLabel(p, id);
      return '<div class="pgi' + (on ? ' on' : '') + '" style="background-image:url(' + bUrl(id) + ')"' + U.on(function () {
        if (DS.selOn) {
          var q = DS.sel.indexOf(id);
          if (q >= 0) DS.sel.splice(q, 1); else DS.sel.push(id);
          U.R();
        } else pgView(list, i);
      }) + '>' + (lb ? '<i>' + esc(lb) + '</i>' : '') + '<b>' + U.I('ck', 12) + '</b></div>';
    }).join('') + '</div>';
    return h;
  }

  function hookDesign() {
    if (!(window.U && U.S && U.S.pedit && U.S.proj && window.PF) || U.S.pedit.__wrapped) return;
    dsCss();
    var oe = U.S.pedit, op = U.S.proj;
    U.S.pedit = function (id) {
      var h = oe.apply(this, arguments), p = pfGet(id);
      if (!p || p.kind !== 'd') return h;
      try {
        p.ph = p.ph || [];
        var re = /<div class="sh2">Фото<span class="cp">первое - обложка<\/span><\/div>[\s\S]*?(?=<div class="sh2">)/;
        return re.test(h) ? h.replace(re, function () { return editBlock(p); }) : h + editBlock(p);
      } catch (e) { return h; }
    };
    U.S.pedit.__wrapped = true;
    U.S.proj = function (id) {
      var h = op.apply(this, arguments), p = pfGet(id);
      if (!p || p.kind !== 'd') return h;
      try {
        p.ph = p.ph || [];
        h = h.replace(/<div class="sh2">Визуализации<\/div><div style="display:grid;gap:6px;margin:0 -16px">[\s\S]*?<\/div>/, '');
        var blk = viewBlock(p);
        if (!blk) return h;
        var b = h.indexOf('class="bt"'), pos = -1;
        if (b >= 0) { var e2 = h.indexOf('</div></div></div>', b); if (e2 >= 0) pos = e2 + 18; }
        if (pos < 0) return h + blk;
        if (h.slice(pos, pos + 3) === '<p ') { var pe = h.indexOf('</p>', pos); if (pe >= 0) pos = pe + 4; }
        return h.slice(0, pos) + blk + h.slice(pos);
      } catch (e) { return h; }
    };
    U.S.proj.__wrapped = true;
    U.S.pstage = stageScreen;
  }

  /* ================= меню ================= */
  function menu() {
    var t = themeName();
    var nextLabel = ({ dark: 'Светлая тема', light: 'Тема как в системе', auto: 'Тёмная тема' })[t];
    U.menu([
      ['Скачать копию', 'bk2', function () { window.studioDownloadBackup && window.studioDownloadBackup(); }],
      ['Восстановить из файла', 'cp', function () { window.studioPickImport && window.studioPickImport(); }],
      [nextLabel, 'sh', function () { nextTheme(); }],
      ['Печать экрана', 'im', function () { setTimeout(function () { window.print(); }, 200); }],
      ['Проверка приложения', 'ch', function () { selfCheck(); }]
    ]);
  }
  window.studioMenu = menu;

  /* ================= старт ================= */
  function boot() {
    applyTheme();
    if (window.matchMedia) {
      try {
        matchMedia('(prefers-color-scheme: light)').addEventListener('change', function () {
          if (themeName() === 'auto') applyTheme();
        });
      } catch (e) {}
    }
    hookUndo();
    hookOpenObj();
    hookHome();
    hookObjMenu(); hookDesign();
    // догоняем, если приложение уже успело отрисоваться
    var n = 0;
    var t = setInterval(function () {
      n++;
      applyTheme(); hookUndo(); hookOpenObj(); hookHome(); hookObjMenu(); hookDesign();
      if (n > 20) clearInterval(t);
    }, 250);
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(boot, 0);
  else window.addEventListener('DOMContentLoaded', boot);
})();
