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
    /* --- дата: прозрачный нативный input поверх строки --- */
    '.rw.dt{position:relative;overflow:hidden}',
    '.rw.dt .dv{position:relative;z-index:1;pointer-events:none;margin-left:auto;font-size:17px}',
    '.rw.dt .dn{position:absolute;inset:0;width:100%;height:100%;opacity:0;border:0;background:transparent;-webkit-appearance:none;appearance:none;z-index:2;padding:0;margin:0;font-size:16px}',
    '.rw.dt .dx{position:relative;z-index:3;width:28px;height:28px;border-radius:14px;border:0;background:var(--s3);color:var(--t2);display:flex;align-items:center;justify-content:center;padding:0;flex:none;margin-left:8px}',
    /* --- на обложке всегда тёмный градиент: текст должен быть светлым в любой теме --- */
    '.hero .bt,.hero .bt .mt{color:#fff}',

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

  /* ================= даты: нативный барабан iOS ================= */
  function isoShift(years) {
    var d = new Date();
    var t = new Date(d.getFullYear() + (years || 0), d.getMonth(), d.getDate());
    return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
  }
  window.U && (U.drange = function (back, fwd) {
    return { min: isoShift(-(back || 0)), max: isoShift(fwd || 0) };
  });
  /* ДД.ММ.ГГГГ для печати; не-ISO значения (старый ручной ввод) отдаём как есть */
  window.U && (U.dt = function (v) {
    var m = String(v == null ? '' : v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? (m[3] + '.' + m[2] + '.' + m[1]) : (v == null ? '' : String(v));
  });
  window.U && (U.drow = function (l, val, cb, auto, o) {
    o = o || {};
    var isIso = /^\d{4}-\d{2}-\d{2}$/.test(String(val || ''));
    var shown = val ? (U.dshow(val) || val) : (auto ? (U.dshow(auto) || auto) : 'не выбрана');
    var col = val ? 'var(--t1)' : (auto ? '#7db8ff' : 'var(--t3)');
    var mn = o.min ? ' min="' + o.min + '"' : '';
    var mx = o.max ? ' max="' + o.max + '"' : '';
    /* после смены даты перерисовываем лист, если строка внутри листа */
    var fire = function (v) { cb(v); try { if (U.shR) U.shR(); } catch (e) {} };
    return '<div class="rw dt"><label>' + l + (auto && !val ? '<span class="aut">авто</span>' : '') + '</label>' +
      '<span class="dv" style="color:' + col + '">' + esc(shown) + '</span>' +
      (val ? '<button class="dx" type="button" aria-label="Очистить дату"' + U.on(function (e) { if (e) e.stopPropagation(); fire(''); }) + '>' + (typeof I === 'function' ? I('x', 13) : '×') + '</button>' : '') +
      '<input class="dn" type="date" value="' + (isIso ? val : '') + '"' + mn + mx +
      ' oninput="' + U.f(function (e, el) { fire(el.value); }) + '" onchange="' + U.f(function (e, el) { fire(el.value); }) + '">' +
      '</div>';
  });

  /* ================= каретка в конец при входе в поле ================= */
  var caretEl = null;
  function isTextish(el) {
    if (!el || !el.tagName) return false;
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName !== 'INPUT') return false;
    return (el.getAttribute('type') || 'text').toLowerCase() === 'text';
  }
  function caretEnd(el) {
    try {
      var n = (el.value || '').length;
      if (el.setSelectionRange) el.setSelectionRange(n, n);
    } catch (e) {}
  }
  function caretApply(el) {
    var run = function () { if (document.activeElement === el) caretEnd(el); };
    if (window.requestAnimationFrame) window.requestAnimationFrame(run);
    run();
    setTimeout(run, 0);
    setTimeout(run, 50);
    setTimeout(run, 120);
  }
  document.addEventListener('focusin', function (e) {
    var el = e.target;
    if (!isTextish(el)) return;
    if (caretEl === el) return;   /* уже в фокусе: повторное касание ставит курсор как обычно */
    caretEl = el;
    caretApply(el);
  });
  document.addEventListener('focusout', function (e) { if (caretEl === e.target) caretEl = null; });

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
        ['Версия', 'Студия · сборка 6'],
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

  /* ================= скидка на работы в смете ================= */
  window.U && (U.discBlock = function () {
    var d = U.discPct ? U.discPct() : 0;
    var S = U.estSums ? U.estSums() : null;
    var h = U.sh('Скидка на работы', '<span class="cp">' + (d ? d + '%' : 'нет') + '</span>');
    var chip = function (v, t) {
      return '<button class="chip sm' + (d === v ? ' on' : ' lt2') + '" type="button"' + U.on(function () {
        est().disc = v; touch(); U.R();
      }) + '>' + t + '</button>';
    };
    h += '<div class="chips" style="margin-bottom:8px">' + chip(0, 'Нет') + chip(5, '5%') + chip(10, '10%') + '</div>';
    h += '<div class="rw" style="background:var(--s1);border-radius:14px"><label>Другая, %</label>' +
      '<input class="fi" id="dsc" value="' + (d && d !== 5 && d !== 10 ? d : '') + '" placeholder="0-20" enterkeyhint="done"' +
      ' onkeydown="if(event.key===\'Enter\')this.blur()" onchange="' + U.f(function (e, el) {
        var v = Math.round(num(el.value));
        if (!(v >= 0)) v = 0;
        if (v > 20) v = 20;
        est().disc = v; touch(); U.R();
      }) + '"></div>';
    if (S && d) h += '<div class="cp" style="margin-top:8px">Скидка ' + d + '% на работы, кроме спецмонтажных: ' + U.money(S.discAmount) + ' из ' + U.money(S.fullNonSpec) + '</div>';
    else if (S) h += '<div class="cp" style="margin-top:8px">Цены в смете — по прайсу, без скидки.</div>';
    return h;
  });

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
  var SX = { open: false, el: null, bd: null, inst: false, pill: null, label: null, sus: false, supT: 0, scr: 0, ok: 0,
    inp: null, sTop: null, raf: 0, kb: 0 };
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
      '.sxb{position:absolute;inset:0;z-index:58;background:rgba(0,0,0,.45);animation:sxfi .25s ease}',
      '.sxb.out{animation:sxfo .22s ease forwards;pointer-events:none}',
      '.sxs{position:fixed;left:0;right:0;top:var(--sx-top,0px);height:var(--sx-h,100%);z-index:60;',
      'background:var(--bg);border-radius:16px 16px 0 0;display:flex;flex-direction:column;will-change:transform;',
      'box-shadow:0 -8px 40px rgba(0,0,0,.4);padding-top:var(--sx-pad,0px);animation:sxup .34s cubic-bezier(.32,.72,0,1)}',
      '.sxs.drag{animation:none;transition:none}',
      '.sxs.out{animation:sxdn .24s cubic-bezier(.32,.72,0,1) forwards;pointer-events:none}',
      '@keyframes sxfi{from{opacity:0}}@keyframes sxfo{to{opacity:0}}',
      '@keyframes sxup{from{transform:translateY(100%)}to{transform:none}}',
      '@keyframes sxdn{to{transform:translateY(100%)}}',
      '.sxg{width:36px;height:5px;border-radius:3px;background:var(--s3);margin:7px auto 9px}',
      '.sxh{flex:none;width:100%;max-width:672px;margin:0 auto;box-sizing:border-box;padding:0 16px 8px;touch-action:none}',
      '.sxi{display:flex;align-items:center;gap:8px;height:44px;border-radius:12px;background:var(--s2);padding:0 6px 0 12px;color:var(--t3)}',
      '.sxi input{flex:1;min-width:0;background:none;border:0;outline:none;color:var(--t1);height:44px;padding:0}',
      '.sxi input::placeholder{color:var(--t3)}',
      '.sxi input::-webkit-search-cancel-button{display:none}',
      '.sxx{width:32px;height:32px;border-radius:16px;border:0;background:var(--s3);color:var(--t2);',
      'display:flex;align-items:center;justify-content:center;padding:0;flex:none}',
      '.sxr{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;',
      'width:100%;max-width:672px;margin:0 auto;box-sizing:border-box;',
      'padding:4px 16px calc(var(--sx-kb,0px) + 32px);transition:padding-bottom .16s ease-out}',
      /* пока шторка открыта, #ui не сдвигаем: шторка сама считается по visual viewport */
      'html.sxo #ui{transform:none !important}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function sxResults() { try { return U.sres(); } catch (e) { return ''; } }

  /* ---- геометрия шторки по visual viewport ----
     iOS при фокусе поля двигает visual viewport, а fixed-элементы считаются от layout viewport.
     Поэтому высоту/верх/отступ под клавиатуру берём у visualViewport и пересчитываем на resize/scroll. */
  function sxVv() { return window.visualViewport || null; }
  function sxSafeTop() {
    if (SX.sTop != null) return SX.sTop;
    SX.sTop = 0;
    try {
      var d = document.createElement('div');
      d.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:0;visibility:hidden;pointer-events:none;' +
        'padding-top:env(safe-area-inset-top,0px)';
      document.documentElement.appendChild(d);
      SX.sTop = Math.round(d.getBoundingClientRect().height || 0);
      if (d.parentNode) d.parentNode.removeChild(d);
    } catch (e) { SX.sTop = 0; }
    return SX.sTop;
  }
  function sxApply() {
    var sh = SX.el;
    if (!sh || !sh.parentNode) return;
    var v = sxVv();
    var top = v ? Math.max(0, Math.round(v.offsetTop)) : 0;
    var lay = Math.max(1, Math.round(window.innerHeight || document.documentElement.clientHeight || 1));
    var vis = v ? Math.max(1, Math.round(v.height)) : lay;
    var kb = Math.max(0, lay - vis - top);
    if (kb < 80) kb = 0;                     /* дрожание адресной строки клавиатурой не считаем */
    var pad = Math.max(0, sxSafeTop() - top);
    sh.style.setProperty('--sx-top', top + 'px');
    sh.style.setProperty('--sx-h', Math.max(260, lay - top) + 'px');
    sh.style.setProperty('--sx-pad', pad + 'px');
    sh.style.setProperty('--sx-kb', kb + 'px');
    SX.kb = kb;
  }
  function sxGeom() {
    if (SX.raf) return;
    SX.raf = 1;
    var f = function () { SX.raf = 0; sxApply(); };
    if (window.requestAnimationFrame) window.requestAnimationFrame(f);
    else setTimeout(f, 16);
  }
  /* фокус без прокрутки документа: иначе Safari уводит шторку за верхний край */
  function sxFocus(inp) {
    if (!inp) return;
    try { inp.focus({ preventScroll: true }); }
    catch (e) { try { inp.focus(); } catch (x) {} }
    sxGeom();
    setTimeout(sxGeom, 60);
    setTimeout(sxGeom, 220);
  }

  /* поиск - выезжающая шторка: тянешь вниз - закрывается, нажал на результат - шторка уходит,
     а когда вернешься назад, она появляется снова с тем же запросом */
  function openSx(restore) {
    if (SX.open || !(window.U && U.ui && U.sres)) return;
    SX.open = true;
    SX.sus = false;
    if (!restore) U.gq = '';
    document.documentElement.classList.add('sxo');
    var bd = document.createElement('div');
    bd.className = 'sxb';
    var sh = document.createElement('div');
    sh.className = 'sxs';
    sh.innerHTML = '<div class="sxh"><div class="sxg"></div><div class="sxi">' + U.I('se', 18) +
      '<input id="gq" type="search" enterkeyhint="search" placeholder="Объекты, проекты, решения, работы" ' +
      'autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">' +
      '<button class="sxx" type="button" aria-label="Закрыть поиск">' + U.I('x', 15) + '</button></div></div>' +
      '<div id="gres" class="sxr"></div>';
    U.ui.appendChild(bd);
    U.ui.appendChild(sh);
    SX.el = sh;
    SX.bd = bd;
    var inp = sh.querySelector('#gq'), res = sh.querySelector('#gres'), hd = sh.querySelector('.sxh');
    SX.inp = inp;
    sxApply();
    if (sxVv()) { sxVv().addEventListener('resize', sxGeom); sxVv().addEventListener('scroll', sxGeom); }
    window.addEventListener('resize', sxGeom);
    window.addEventListener('orientationchange', sxGeom);
    inp.value = U.gq || '';
    res.innerHTML = sxResults();
    if (restore && SX.scr) res.scrollTop = SX.scr;
    inp.addEventListener('input', function () { U.gq = inp.value; res.innerHTML = sxResults(); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') inp.blur(); });
    sh.querySelector('.sxx').addEventListener('click', function (e) {
      e.preventDefault();
      try { inp.blur(); } catch (x) {}
      closeSx(false);
    });
    bd.addEventListener('click', function () { closeSx(false); });
    res.addEventListener('touchmove', function () { if (document.activeElement === inp) inp.blur(); }, { passive: true });

    /* тянем шторку за верхнюю часть вниз */
    var dg = null;
    hd.addEventListener('touchstart', function (e) {
      if (e.target.closest && e.target.closest('input,button')) return;
      dg = { y0: e.touches[0].clientY, dy: 0, t0: Date.now(), on: false };
    }, { passive: true });
    hd.addEventListener('touchmove', function (e) {
      if (!dg) return;
      var dy = Math.max(0, e.touches[0].clientY - dg.y0);
      if (!dg.on && dy > 6) { dg.on = true; try { inp.blur(); } catch (x) {} sh.classList.add('drag'); }
      if (!dg.on) return;
      dg.dy = dy;
      sh.style.transform = 'translateY(' + dy + 'px)';
      bd.style.animation = 'none';
      bd.style.opacity = String(Math.max(0, 1 - dy / 500));
      if (e.cancelable) e.preventDefault();
    }, { passive: false });
    var dgEnd = function () {
      if (!dg || !dg.on) { dg = null; return; }
      var dy = dg.dy, v = dy / Math.max(1, Date.now() - dg.t0);
      dg = null;
      if (dy > 110 || v > 0.5) closeSx(true);
      else {
        sh.classList.remove('drag');
        sh.style.transition = 'transform .25s cubic-bezier(.32,.72,0,1)';
        sh.style.transform = '';
        bd.style.opacity = '';
      }
    };
    hd.addEventListener('touchend', dgEnd);
    hd.addEventListener('touchcancel', dgEnd);

    /* нажали на результат: открылся другой экран - шторку убираем и запоминаем запрос;
       открылась другая шторка (например, прайс) - остаемся */
    var snap = null;
    res.addEventListener('click', function () { snap = { top: U.top(), len: U.st.length }; }, true);
    res.addEventListener('click', function () {
      setTimeout(function () {
        if (!SX.open || !snap) return;
        if (U.top() !== snap.top || U.st.length !== snap.len) { suspendSx(); return; }
        if (U.ui.querySelector('.sht')) return;
        if (inp.value !== U.gq) inp.value = U.gq;
        res.innerHTML = sxResults();
      }, 0);
    });
    if (restore) setTimeout(sxGeom, 30);
    else sxFocus(inp);
  }

  function killSx(fast) {
    if (!SX.open) return;
    var sh = SX.el, bd = SX.bd;
    SX.open = false;
    SX.el = SX.bd = null;
    SX.inp = null;
    if (sxVv()) { sxVv().removeEventListener('resize', sxGeom); sxVv().removeEventListener('scroll', sxGeom); }
    window.removeEventListener('resize', sxGeom);
    window.removeEventListener('orientationchange', sxGeom);
    document.documentElement.classList.remove('sxo');
    var ui = document.getElementById('ui');
    if (ui) ui.style.transform = '';
    try { sh.querySelector('#gq').blur(); } catch (e) {}
    if (fast) {
      sh.style.transition = 'transform .22s cubic-bezier(.32,.72,0,1)';
      sh.style.transform = 'translateY(100%)';
      bd.style.transition = 'opacity .22s';
      bd.style.opacity = '0';
    } else { sh.classList.add('out'); bd.classList.add('out'); }
    setTimeout(function () { if (sh.parentNode) sh.parentNode.removeChild(sh); if (bd.parentNode) bd.parentNode.removeChild(bd); }, 270);
  }
  function closeSx(fast) {
    SX.sus = false;
    U.gq = '';
    killSx(!!fast);
  }
  function suspendSx() {
    if (!SX.open) return;
    var r = SX.el && SX.el.querySelector('#gres');
    SX.scr = r ? r.scrollTop : 0;
    SX.sus = true;
    SX.supT = Date.now();
    killSx(false);
  }
  /* вернулись на главную - шторка поиска возвращается с тем же запросом (в течение 3 минут) */
  function startSxWatch() {
    setInterval(function () {
      if (!SX.sus || SX.open) { SX.ok = 0; return; }
      if (Date.now() - SX.supT > 180000) { SX.sus = false; SX.ok = 0; return; }
      var t = U.top && U.top();
      if (t && t.id === 'home' && U.st.length === 1 && !U.busy && !U.ui.querySelector('.sht') && !document.getElementById('pgv')) {
        SX.ok = (SX.ok || 0) + 1;
        if (SX.ok >= 2) { SX.ok = 0; openSx(true); }
      } else SX.ok = 0;
    }, 250);
  }
  window.studioOpenSearch = function () { openSx(false); };
  window.studioCloseSearch = function () { closeSx(false); };

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
    if (arm) openSx(false); /* фокус ставится прямо в жесте, поэтому клавиатура открывается сразу */
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
    startSxWatch();

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
      try { rzCss(); } catch (e) {}
      var h = String(orig.apply(this, arguments)).replace(/<div class="srch"[^>]*>[\s\S]*?<\/div>/, '');
      /* реализации на главной — плитками в две колонки, а не лентой */
      var at = h.indexOf('<b>Реализация</b>');
      if (at >= 0) {
        var ed = h.indexOf('<div class="ed">', at);
        var nxt = h.indexOf('<div class="hd"', at);
        var lim = nxt > ed ? nxt : h.length;
        if (ed >= 0 && ed < lim && h.slice(ed, lim).indexOf('rzc') >= 0) {
          h = h.slice(0, ed) + '<div class="ed rz">' + h.slice(ed + 16);
        }
      }
      return h + '<div class="cp" style="text-align:center;margin:28px 0 8px;opacity:.45">сборка 6</div>';
    };
    wrapped.__wrapped = true;
    U.S.home = wrapped;
    U.openSearch = function () { openSx(false); };
    try { U.R(); } catch (e) {}
  }

  /* ================= дизайн-проект: PDF и этапы ================= */
  var STG = [['meas', 'Обмеры'], ['conc', 'Концепция'], ['plan', 'Планировочные решения'], ['vis', 'Визуализации'],    ['work', 'Рабочие чертежи'], ['spec', 'Ведомости и спецификации'], ['comp', 'Комплектация'], ['other', 'Прочее']];
  var DS = { q: null, busy: false, sel: [], selOn: false, last: '', lib: null, rep: null };

  /* этапы реализации: свои названия, но те же поля p.ps / p.pn / PF.stg */
  var STG_R = [['pre', 'До ремонта'], ['demo', 'Демонтаж'], ['rough', 'Черновые работы'],
    ['eng', 'Инженерия и узлы'], ['fin', 'Чистовая отделка'], ['done', 'Результат']];

  function stgAll() { var c = (window.PF && PF.stg) || []; return STG.concat(STG_R).concat(c); }
  function stgList(kind) { var c = (window.PF && PF.stg) || []; return (kind === 'r' ? STG_R : STG).concat(c); }
  function stgKnown(k) { return !!k && stgAll().some(function (s) { return s[0] === k; }); }
  function stgName(k, kind) {
    var empty = kind === 'r' ? 'Фото' : 'Без этапа';
    if (!k) return empty;
    var a = stgAll();
    for (var i = 0; i < a.length; i++) if (a[i][0] === k) return a[i][1];
    return empty;
  }
  function stageOf(p, id) { var k = (p.ps || {})[id] || ''; return stgKnown(k) ? k : ''; }
  function pgLabel(p, id) { var m = (p.pn || {})[id]; return m && m[1] ? 'стр. ' + m[1] : ''; }
  function stagesOf(p) {
    p.ph = p.ph || []; p.ps = p.ps || {};
    var kind = p.kind === 'r' ? 'r' : 'd';
    var order = stgList(kind).map(function (s) { return s[0]; });
    /* чужие этапы (старые данные, смена типа) не теряем — показываем после своих */
    stgAll().forEach(function (s) { if (order.indexOf(s[0]) < 0) order.push(s[0]); });
    order.push('');
    var out = [], seen = {};
    order.forEach(function (k) {
      if (seen[k]) return;
      seen[k] = 1;
      var ids = p.ph.filter(function (id) { return stageOf(p, id) === k; });
      if (ids.length) out.push({ k: k, n: stgName(k, kind), ids: ids });
    });
    return out;
  }
  function flatPages(p) {
    var o = [];
    stagesOf(p).forEach(function (s) {
      s.ids.forEach(function (id) {
        var m = pageSrc(p, id);
        o.push({ id: id, s: s.k, n: s.n, l: pgLabel(p, id), th: (p.th || {})[id] || '', src: m ? m.src : '', pg: m ? m.pg : 0 });
      });
    });
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
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ---- просмотр страниц: свои жесты (щипок, двойной тап, свайпы), без прокрутки и зума страницы ---- */
  function pgvCss() {
    if (document.getElementById('studio-pgv-css')) return;
    var s = document.createElement('style');
    s.id = 'studio-pgv-css';
    var R = [];
    R.push('.pgv{position:absolute;inset:0;z-index:92;background:#000;color:#fff;overflow:hidden;touch-action:none;overscroll-behavior:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}');
    R.push('.pgv .trk{position:absolute;left:0;top:0;bottom:0;display:flex;will-change:transform}');
    R.push('.pgv .sl{flex:none;height:100%;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;will-change:transform}');
    R.push('.pgv .sl img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block;will-change:transform;transform-origin:50% 50%;pointer-events:none;-webkit-user-drag:none}');
    R.push('.pgv .bar{position:absolute;left:0;right:0;top:0;z-index:3;display:flex;align-items:center;gap:10px;padding:calc(env(safe-area-inset-top,0px) + 8px) 12px 24px;background:linear-gradient(rgba(0,0,0,.65),transparent);transition:opacity .2s}');
    R.push('.pgv .bar .x{min-width:36px;height:36px;border-radius:18px;border:0;background:rgba(255,255,255,.18);color:#fff;display:flex;align-items:center;justify-content:center;flex:none;padding:0;font-size:14px;font-weight:600}');
    R.push('.pgv .bar .ttl{flex:1;min-width:0;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}');
    R.push('.pgv .bar .cn{font-size:13px;color:#ccc;flex:none}');
    R.push('.pgv .stgs{position:absolute;left:0;right:0;bottom:0;z-index:3;display:flex;gap:6px;overflow-x:auto;touch-action:pan-x;padding:24px 12px calc(10px + env(safe-area-inset-bottom,0px));background:linear-gradient(transparent,rgba(0,0,0,.65));scrollbar-width:none;transition:opacity .2s}');
    R.push('.pgv .stgs::-webkit-scrollbar{display:none}');
    R.push('.pgv .stgs button{flex:none;border:0;border-radius:14px;padding:7px 11px;font-size:13px;background:rgba(255,255,255,.16);color:#fff}');
    R.push('.pgv .stgs button.on{background:#fff;color:#000}');
    R.push('.pgv.nc .bar,.pgv.nc .stgs{opacity:0;pointer-events:none}');
    s.textContent = R.join('\n');
    document.head.appendChild(s);
  }

  function pgView(list, idx, opts) {
    if (!list || !list.length) return;
    opts = opts || {};
    pgvCss();
    var old = document.getElementById('pgv');
    if (old && old._off) old._off();
    else if (old) old.remove();

    var N = list.length, W = 1, H = 1, tx = 0, ty = 0;
    var i = Math.max(0, Math.min(N - 1, idx || 0));
    var Z = { s: 1, x: 0, y: 0 };
    var d = document.createElement('div');
    d.id = 'pgv';
    d.className = 'pgv';
    var stages = [];
    list.forEach(function (it, k) {
      if (it.s != null && it.n && !stages.some(function (x) { return x.s === it.s; })) stages.push({ s: it.s, n: it.n, i: k });
    });
    d.innerHTML = '<div class="trk">' + list.map(function () { return '<div class="sl"><img alt="" draggable="false"></div>'; }).join('') + '</div>' +
      '<div class="bar"><button class="x cl" type="button" aria-label="Закрыть">' + U.I('x', 18) + '</button><span class="ttl"></span><span class="cn"></span>' +
      (opts.del ? '<button class="x dl" type="button" aria-label="Удалить">' + U.I('tr', 17) + '</button>' : '') + '</div>' +
      (stages.length > 1 ? '<div class="stgs">' + stages.map(function (s) { return '<button type="button" data-i="' + s.i + '">' + esc(s.n) + '</button>'; }).join('') + '</div>' : '');
    U.ui.appendChild(d);

    var trk = d.querySelector('.trk'), bar = d.querySelector('.bar'), stg = d.querySelector('.stgs');
    var sls = [].slice.call(d.querySelectorAll('.sl'));
    var imgs = sls.map(function (s) { return s.firstChild; });
    var ttl = d.querySelector('.ttl'), cn = d.querySelector('.cn');
    var chips = [].slice.call(d.querySelectorAll('.stgs button'));
    var HI = [];            /* страницы, перерисованные в большем разрешении, по индексу */
    var HIq = {};           /* что уже запрошено, чтобы не дёргать pdf.js повторно */

    function srcOf(k) { var it = list[k]; return HI[k] || it.u || bUrl(it.id); }
    /* при зуме больше ~2x просим у pdf.js ту же страницу в большем разрешении */
    function requestHi(k) {
      var it = list[k];
      if (HIq[k] || !it || !it.src || !it.pg || !window.studioHiPage) return;
      HIq[k] = 1;
      window.studioHiPage(it.src, it.pg).then(function (u) {
        if (!u) return;
        HI[k] = u;
        if (k === i) imgs[k].setAttribute('src', u);
      }, function () {});
    }
    function measure() {
      W = d.clientWidth || window.innerWidth;
      H = d.clientHeight || window.innerHeight;
      trk.style.width = (W * N) + 'px';
      sls.forEach(function (s) { s.style.width = W + 'px'; });
    }
    function load() {
      for (var k = 0; k < N; k++) {
        var im = imgs[k], dk = Math.abs(k - i);
        if (dk <= 1 && !im.getAttribute('src')) im.setAttribute('src', srcOf(k));
        else if (dk > 2 && im.getAttribute('src')) im.removeAttribute('src');
      }
    }
    function place(anim) {
      trk.style.transition = anim ? 'transform .28s cubic-bezier(.32,.72,0,1)' : 'none';
      trk.style.transform = 'translate3d(' + (-i * W + tx) + 'px,0,0)';
    }
    function applyZ(anim) {
      var im = imgs[i];
      im.style.transition = anim ? 'transform .25s cubic-bezier(.32,.72,0,1)' : 'none';
      im.style.transform = 'translate3d(' + Z.x + 'px,' + Z.y + 'px,0) scale(' + Z.s + ')';
    }
    function resetZ(k) { Z = { s: 1, x: 0, y: 0 }; imgs[k].style.transition = 'none'; imgs[k].style.transform = ''; }
    function bounds() {
      var im = imgs[i], w = im.offsetWidth * Z.s, h = im.offsetHeight * Z.s;
      return { mx: Math.max(0, (w - W) / 2), my: Math.max(0, (h - H) / 2) };
    }
    function clampZ() {
      var b = bounds();
      Z.x = Math.max(-b.mx, Math.min(b.mx, Z.x));
      Z.y = Math.max(-b.my, Math.min(b.my, Z.y));
    }
    function info() {
      var it = list[i];
      ttl.textContent = (it.n || '') + (it.l ? (it.n ? ' · ' : '') + it.l : '');
      cn.textContent = (i + 1) + ' / ' + N;
      chips.forEach(function (b) {
        var st = stages.filter(function (s) { return String(s.i) === b.getAttribute('data-i'); })[0];
        b.classList.toggle('on', !!st && st.s === it.s);
      });
    }
    /* панели скрываются только классом .nc: inline-стили перебивали бы его и «залипали» после щипка */
    function setPanels(hide) { d.classList.toggle('nc', !!hide); }
    function panelsHidden() { return d.classList.contains('nc'); }
    function dv(anim) {
      var a = Math.min(1, Math.abs(ty) / 360);
      sls[i].style.transition = anim ? 'transform .22s cubic-bezier(.32,.72,0,1)' : 'none';
      sls[i].style.transform = ty ? 'translate3d(0,' + ty + 'px,0) scale(' + (1 - a * 0.1) + ')' : '';
      d.style.background = 'rgba(0,0,0,' + (1 - a * 0.85) + ')';
    }
    function go(k, anim) {
      k = Math.max(0, Math.min(N - 1, k));
      if (k !== i) { resetZ(i); i = k; load(); info(); }
      tx = 0;
      place(anim !== false);
    }
    function closeV(anim) {
      if (d._gone) return;
      d._gone = true;
      setPanels(true);
      window.removeEventListener('resize', onRes);
      if (!anim) { if (d.parentNode) d.parentNode.removeChild(d); return; }
      var dir = ty >= 0 ? 1 : -1;
      sls[i].style.transition = 'transform .22s cubic-bezier(.32,.72,0,1)';
      sls[i].style.transform = 'translate3d(0,' + (dir * H) + 'px,0)';
      d.style.transition = 'background .22s';
      d.style.background = 'rgba(0,0,0,0)';
      setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 240);
    }
    function onRes() { measure(); place(false); }
    window.addEventListener('resize', onRes);
    d._off = function () { closeV(false); };

    /* ---- жесты ---- */
    var G = { mode: '', x0: 0, y0: 0, lx: 0, ly: 0, lt: 0, vx: 0, vy: 0, d0: 1, s0: 1, mx0: 0, my0: 0, ox0: 0, oy0: 0, moved: false, lastTap: 0, ltx: 0, lty: 0, tt: 0, hid0: false };
    function dist(T) { var a = T[0].clientX - T[1].clientX, b = T[0].clientY - T[1].clientY; return Math.sqrt(a * a + b * b) || 1; }
    function mid(T) { return { x: (T[0].clientX + T[1].clientX) / 2, y: (T[0].clientY + T[1].clientY) / 2 }; }
    function startPinch(T) {
      G.mode = 'pinch';
      var m = mid(T);
      G.d0 = dist(T); G.s0 = Z.s; G.mx0 = m.x; G.my0 = m.y; G.ox0 = Z.x; G.oy0 = Z.y;
      tx = 0; ty = 0; place(false); dv(false);
      setPanels(true);   /* панели прячем на время жеста и сами не показываем — только тап */
      if (G.tt) { clearTimeout(G.tt); G.tt = 0; }
    }
    function doPinch(T) {
      var m = mid(T), s = G.s0 * dist(T) / G.d0;
      s = Math.max(0.6, Math.min(6, s));
      Z.s = s;
      Z.x = m.x - W / 2 - (s / G.s0) * (G.mx0 - W / 2 - G.ox0);
      Z.y = m.y - H / 2 - (s / G.s0) * (G.my0 - H / 2 - G.oy0);
      applyZ(false);
      if (s > 2) requestHi(i);
    }
    function finishPinch() {
      if (Z.s < 1.05) Z = { s: 1, x: 0, y: 0 };
      else { Z.s = Math.min(5, Z.s); clampZ(); if (Z.s > 2) requestHi(i); }
      applyZ(true);
    }
    function toggleZoom(x, y) {
      if (Z.s > 1.05) Z = { s: 1, x: 0, y: 0 };
      else { var s = 2.6; Z = { s: s, x: (x - W / 2) * (1 - s), y: (y - H / 2) * (1 - s) }; clampZ(); requestHi(i); }
      applyZ(true);
    }
    function tap(x, y) {
      var now = Date.now();
      if (G.tt && now - G.lastTap < 300 && Math.abs(x - G.ltx) < 40 && Math.abs(y - G.lty) < 40) {
        clearTimeout(G.tt); G.tt = 0; G.lastTap = 0; toggleZoom(x, y); return;
      }
      G.lastTap = now; G.ltx = x; G.lty = y;
      G.tt = setTimeout(function () { G.tt = 0; setPanels(!panelsHidden()); }, 300);
    }
    function onUi(e) { return !!(e.target.closest && e.target.closest('.bar,.stgs')); }

    d.addEventListener('touchstart', function (e) {
      if (onUi(e)) { G.mode = 'ui'; return; }
      var T = e.touches;
      if (T.length >= 2) { startPinch(T); return; }
      G.mode = '';
      G.x0 = G.lx = T[0].clientX; G.y0 = G.ly = T[0].clientY; G.lt = Date.now();
      G.vx = G.vy = 0; G.moved = false; G.ox0 = Z.x; G.oy0 = Z.y;
      G.hid0 = panelsHidden();
    }, { passive: true });

    d.addEventListener('touchmove', function (e) {
      if (G.mode === 'ui') return;
      if (e.cancelable) e.preventDefault();
      var T = e.touches;
      if (T.length >= 2) { if (G.mode !== 'pinch') startPinch(T); doPinch(T); return; }
      if (G.mode === 'pinch' || G.mode === 'wait') return;
      var x = T[0].clientX, y = T[0].clientY, now = Date.now(), dx = x - G.x0, dy = y - G.y0;
      var dt = Math.max(1, now - G.lt);
      G.vx = (x - G.lx) / dt; G.vy = (y - G.ly) / dt; G.lx = x; G.ly = y; G.lt = now;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) G.moved = true;
      if (!G.mode) {
        if (Z.s > 1.02) G.mode = 'pan';
        else if (Math.abs(dx) > 8 || Math.abs(dy) > 8) G.mode = Math.abs(dx) > Math.abs(dy) ? 'page' : 'dismiss';
        else return;
        if (G.tt) { clearTimeout(G.tt); G.tt = 0; }
      }
      if (G.mode === 'page') {
        tx = ((i === 0 && dx > 0) || (i === N - 1 && dx < 0)) ? dx * 0.3 : dx;
        place(false);
      } else if (G.mode === 'dismiss') {
        ty = dy; dv(false);
        if (Math.abs(dy) > 6) setPanels(true);
      } else if (G.mode === 'pan') {
        var b = bounds(), nx = G.ox0 + dx, ny = G.oy0 + dy;
        var cx = Math.max(-b.mx, Math.min(b.mx, nx)), cy = Math.max(-b.my, Math.min(b.my, ny));
        var over = nx - cx;
        Z.x = cx; Z.y = cy;
        tx = (over && ((i > 0 && over > 0) || (i < N - 1 && over < 0))) ? over : 0;
        applyZ(false); place(false);
      }
    }, { passive: false });

    function onEnd(e) {
      if (G.mode === 'ui') { if (!e.touches.length) G.mode = ''; return; }
      if (e.touches.length > 0) { if (G.mode === 'pinch') { finishPinch(); G.mode = 'wait'; } return; }
      var m = G.mode;
      G.mode = '';
      var c = e.changedTouches && e.changedTouches[0];
      var x = c ? c.clientX : G.lx, y = c ? c.clientY : G.ly;
      if (m === 'pinch' || m === 'wait') { finishPinch(); return; }
      if (m === 'page' || (m === 'pan' && tx)) {
        var dir = 0;
        if (m === 'pan') {
          /* на краю увеличенной картинки хватает небольшого увода за край */
          if (tx < -28 || (G.vx < -0.4 && tx < 0)) dir = 1;
          else if (tx > 28 || (G.vx > 0.4 && tx > 0)) dir = -1;
        } else {
          var thr = W * 0.2;
          if (tx < -thr || (G.vx < -0.45 && tx < 0)) dir = 1;
          else if (tx > thr || (G.vx > 0.45 && tx > 0)) dir = -1;
        }
        if (m === 'pan') { clampZ(); applyZ(true); }
        go(i + dir, true);
        return;
      }
      if (m === 'dismiss') {
        if (Math.abs(ty) > 110 || Math.abs(G.vy) > 0.6) closeV(true);
        else { ty = 0; dv(true); setPanels(G.hid0); }
        return;
      }
      if (m === 'pan') { clampZ(); applyZ(true); return; }
      if (!G.moved) tap(x, y);
    }
    d.addEventListener('touchend', onEnd, { passive: true });
    d.addEventListener('touchcancel', function () {
      G.mode = '';
      if (ty) { ty = 0; dv(true); }
      tx = 0; place(true);
      if (Z.s < 1.05) { Z = { s: 1, x: 0, y: 0 }; applyZ(true); }
    }, { passive: true });
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (n) {
      d.addEventListener(n, function (e) { e.preventDefault(); }, { passive: false });
    });

    d.querySelector('.cl').addEventListener('click', function () { ty = 0; closeV(true); });
    var dl = d.querySelector('.dl');
    if (dl) {
      dl.addEventListener('click', function () {
        if (!dl._a) { dl._a = 1; dl.style.padding = '0 12px'; dl.style.background = '#ff453a'; dl.textContent = 'Удалить?'; return; }
        ty = 0; closeV(true);
        try { opts.del(i); } catch (e) {}
      });
    }
    chips.forEach(function (b) {
      b.addEventListener('click', function () { go(+b.getAttribute('data-i'), true); });
    });

    measure(); load(); info(); place(false);
  }
  /* обычные фото (реализации, файлы объекта) открываем тем же просмотром */
  window.phView = function (src, delFn) {
    pgView([{ u: src, s: null, n: '', l: '' }], 0, delFn ? { del: delFn } : {});
  };

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
  /* ---- качество страниц: длинная сторона ~3400 px, но не больше ~13 Мп (лимиты canvas на iOS) ---- */
  var PDF_SIDE = 3400, PDF_AREA = 13000000, PDF_Q = 0.92;
  var TH_SIDE = 600, TH_Q = 0.8;

  function pageScale(v1, side, area) {
    var k = (side || PDF_SIDE) / Math.max(1, Math.max(v1.width, v1.height));
    var px = v1.width * v1.height * k * k;
    var lim = area || PDF_AREA;
    if (px > lim) k *= Math.sqrt(lim / px);
    return Math.max(0.05, Math.min(6, k));
  }

  function renderPage(doc, n, opt) {
    opt = opt || {};
    var side = opt.side || PDF_SIDE, area = opt.area || PDF_AREA, q = opt.q || PDF_Q;
    return doc.getPage(n).then(function (pg) {
      var v1 = pg.getViewport({ scale: 1 });
      var v = pg.getViewport({ scale: pageScale(v1, side, area) });
      var cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(v.width));
      cv.height = Math.max(1, Math.round(v.height));
      var cx = cv.getContext('2d');
      cx.fillStyle = '#fff';
      cx.fillRect(0, 0, cv.width, cv.height);
      var free = function () {
        try { cv.width = 0; cv.height = 0; } catch (e) {}
        try { pg.cleanup(); } catch (e) {}
      };
      return pg.render({ canvasContext: cx, viewport: v }).promise.then(function () {
        return new Promise(function (res) { cv.toBlob(res, 'image/jpeg', q); });
      }).then(function (blob) { free(); return blob; }, function (e) { free(); throw e; });
    });
  }

  /* маленькое превью для плиток: в просмотре всё равно открывается полный файл */
  function thumbOf(blob, side, q) {
    return new Promise(function (res) {
      if (!blob) { res(null); return; }
      var u = URL.createObjectURL(blob), im = new Image();
      im.onload = function () {
        var c = null;
        try {
          var w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
          var k = Math.min(1, (side || TH_SIDE) / Math.max(1, Math.max(w, h)));
          if (k >= 0.98) { URL.revokeObjectURL(u); res(null); return; }
          c = document.createElement('canvas');
          c.width = Math.round(w * k);
          c.height = Math.round(h * k);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          URL.revokeObjectURL(u);
          c.toBlob(function (b) {
            try { c.width = 0; c.height = 0; } catch (e) {}
            res(b || null);
          }, 'image/jpeg', q || TH_Q);
        } catch (e) {
          try { URL.revokeObjectURL(u); } catch (x) {}
          res(null);
        }
      };
      im.onerror = function () { try { URL.revokeObjectURL(u); } catch (e) {} res(null); };
      im.src = u;
    });
  }

  /* ---- увеличенная страница из сохранённого оригинала (кэш на несколько штук) ---- */
  var HIC = { url: {}, doc: {}, order: [], max: 6 };

  function srcBlob(a, id) {
    if (a && a.get) return a.get(id).then(function (b) { return b; });
    return fetch(bUrl(id)).then(function (r) { return r.blob(); });
  }
  function hiDoc(srcId) {
    if (HIC.doc[srcId]) return Promise.resolve(HIC.doc[srcId]);
    return Promise.all([loadPdfJs(), asGet()]).then(function (r) {
      var lib = r[0], a = r[1];
      if (!a) throw new Error('no storage');
      return srcBlob(a, srcId).then(function (b) {
        if (!b) throw new Error('no file');
        return b.arrayBuffer();
      }).then(function (buf) { return lib.getDocument({ data: buf }).promise; });
    }).then(function (doc) {
      HIC.doc[srcId] = doc;
      var keys = Object.keys(HIC.doc);
      if (keys.length > 2) {
        var k0 = keys[0];
        if (k0 !== srcId) { try { HIC.doc[k0].destroy(); } catch (e) {} delete HIC.doc[k0]; }
      }
      return doc;
    });
  }
  function hiDocFresh(srcId) {
    if (HIC.doc[srcId]) { try { HIC.doc[srcId].destroy(); } catch (e) {} delete HIC.doc[srcId]; }
    return hiDoc(srcId);
  }
  function hiUrl(srcId, page) {
    var key = srcId + '|' + page;
    if (HIC.url[key]) return Promise.resolve(HIC.url[key]);
    return hiDoc(srcId).then(function (doc) {
      return renderPage(doc, page, { side: 4200, area: 16000000, q: 0.92 });
    }).then(function (blob) {
      var u = URL.createObjectURL(blob);
      if (HIC.order.length >= HIC.max) {
        var old = HIC.order.shift(), ou = HIC.url[old];
        if (ou) { try { URL.revokeObjectURL(ou); } catch (e) {} }
        delete HIC.url[old];
      }
      HIC.url[key] = u;
      HIC.order.push(key);
      return u;
    });
  }
  window.studioHiPage = hiUrl;

  /* к какой странице какого оригинала относится картинка */
  function pageSrc(p, id) {
    var out = null;
    (p.src || []).forEach(function (s) {
      if (out || !s || !s.pg) return;
      var k = s.pg.indexOf(id);
      if (k >= 0) out = { src: s.id, pg: k + 1 };
    });
    return out;
  }

  function guessStage(name, isImg, kind) {
    var n = String(name || '').toLowerCase().replace(/ё/g, 'е');
    if (kind === 'r') {
      var RR = [[/до ремонта|до работ|исходн/, 'pre'], [/демонтаж|снос|разбор/, 'demo'],
        [/чернов|стяжк|штукатур|каркас|гкл|гипсокартон|гидроизол|пароизол/, 'rough'],
        [/инженер|электр|сантех|вентил|кондицион|отоплен|узел|щит|труб/, 'eng'],
        [/чистов|плитк|керамогранит|краск|обои|паркет|ламинат|двер|мебел/, 'fin'],
        [/результ|готов|после ремонта|интерьер/, 'done']];
      for (var j = 0; j < RR.length; j++) if (RR[j][0].test(n)) return RR[j][1];
      return DS.last || '';
    }
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
        return { f: f, pdf: isPdf, s: guessStage(f.name, !isPdf, p.kind) };
      })
    };
    askStages();
  }
  function askStages() {
    U.sheet(function () {
      var Q = DS.q;
      if (!Q) return { t: 'Этап проекта', b: '' };
      var proj = pfGet(Q.pid), kind = proj && proj.kind === 'r' ? 'r' : 'd';
      var opts = function (cur) {
        return '<option value="">' + 'Без этапа' + '</option>' + stgList(kind).map(function (s) {
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
          '<div class="cp" style="margin-top:10px">Этап подобран по названию файла. ' +
          (kind === 'r' ? 'Фото разных этапов можно перенести потом в карточке.' : 'Если в PDF несколько этапов, страницы можно потом перенести между этапами.') + '</div>',
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
  function stagePick(title, cur, cb, kind) {
    U.sheet(function () {
      var S = stgList(kind).concat([['', 'Без этапа']]);
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
      p.ph = p.ph || []; p.ps = p.ps || {}; p.pn = p.pn || {}; p.th = p.th || {}; p.src = p.src || [];
      var items = Q.items, total = 0, bad = 0;
      var say = function (t) { var e = document.getElementById('pgprog'); if (e) e.textContent = t; };
      try { U.R(); } catch (e) {}
      var addPage = function (blob, it, num, src) {
        return a.upload(blob).then(function (r) {
          if (!r || !r.id) { bad++; return; }
          p.ph.push(r.id);
          p.ps[r.id] = it.s || '';
          p.pn[r.id] = [it.f.name, num || 0];
          if (src && src.pg) src.pg.push(r.id);
          total++;
          pfSave();
          return thumbOf(blob, TH_SIDE, TH_Q).then(function (tb) {
            if (!tb) return;
            return a.upload(tb).then(function (tr) {
              if (tr && tr.id) { p.th[r.id] = tr.id; pfSave(); }
            }, function () {});
          }, function () {});
        }, function () { bad++; });
      };
      var doPdf = function (it, fi) {
        var buf = null, src = null;
        say('Файл ' + (fi + 1) + ' из ' + items.length + ' · читаю PDF');
        return it.f.arrayBuffer().then(function (b) {
          buf = b;
          /* оригинал кладём в хранилище: из него можно перерисовать страницы крупнее */
          return a.upload(it.f).then(function (r) {
            if (r && r.id) { src = { id: r.id, name: it.f.name, at: Date.now(), pg: [] }; p.src.push(src); pfSave(); }
          }, function () {});
        }, function () { return null; }).then(function () {
          if (!buf) throw new Error('read');
          return loadPdfJs();
        }).then(function (lib) {
          /* pdf.js забирает буфер себе — отдаём копию */
          return lib.getDocument({ data: buf.slice(0) }).promise;
        }).then(function (doc) {
          var n = 1, num = doc.numPages;
          var step = function () {
            if (n > num) { try { doc.destroy(); } catch (e) {} return Promise.resolve(); }
            say('Файл ' + (fi + 1) + ' из ' + items.length + ' · страница ' + n + ' из ' + num);
            var cur = n++;
            return renderPage(doc, cur).then(function (blob) { return addPage(blob, it, cur, src); }, function () { bad++; }).then(step);
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
        /* замена файла: старые страницы убираем только после успешного импорта */
        var rep = DS.rep;
        DS.rep = null;
        if (rep && total) {
          rep.ids.forEach(function (id) {
            p.ph = (p.ph || []).filter(function (x) { return x !== id; });
            if (p.ps) delete p.ps[id];
            if (p.pn) delete p.pn[id];
            var th = p.th && p.th[id];
            if (p.th) delete p.th[id];
            if (a) {
              try { a['delete'](id); } catch (e) {}
              if (th) { try { a['delete'](th); } catch (e) {} }
            }
          });
        }
        pfSave();
        try { U.R(); } catch (e) {}
        toast(total ? 'Добавлено страниц: ' + total + (bad ? ' · ошибок ' + bad : '') : 'Ничего не добавлено');
      }, function () { DS.rep = null; DS.busy = false; try { U.R(); } catch (e) {} toast('Загрузка прервалась'); });
    });
  }

  /* ---- «Обновить качество»: перерисовать страницы из сохранённого PDF ---- */
  function refreshQuality(p) {
    if (DS.busy) { toast('Идет загрузка, подождите'); return; }
    var srcs = (p.src || []).filter(function (s) { return s && s.id && s.pg && s.pg.length; });
    if (!srcs.length) { legacyQuality(p); return; }
    asGet().then(function (a) {
      if (!a) { toast('Хранилище недоступно'); return; }
      if (!a.put) { toast('Обновите приложение и повторите'); return; }
      DS.busy = true;
      var say = function (t) { var e = document.getElementById('pgprog'); if (e) e.textContent = t; };
      try { U.R(); } catch (e) {}
      var done = 0, chain = Promise.resolve();
      srcs.forEach(function (s) {
        chain = chain.then(function () {
          return hiDocFresh(s.id).then(function (doc) {
            var k = 0;
            var step = function () {
              if (k >= s.pg.length) {
                if (HIC.doc[s.id] === doc) delete HIC.doc[s.id];
                try { doc.destroy(); } catch (e) {}
                return Promise.resolve();
              }
              var id = s.pg[k], page = k + 1;
              k++;
              if (p.ph.indexOf(id) < 0) return step();
              say('Обновляю ' + s.name + ' · страница ' + page + ' из ' + s.pg.length);
              return renderPage(doc, page).then(function (blob) {
                return a.put(id, blob).then(function () {
                  done++;
                  return thumbOf(blob, TH_SIDE, TH_Q).then(function (tb) {
                    if (!tb) return;
                    var old = p.th && p.th[id];
                    return a.upload(tb).then(function (tr) {
                      p.th = p.th || {};
                      p.th[id] = tr.id;
                      if (old) { try { a['delete'](old); } catch (e) {} }
                      pfSave();
                    }, function () {});
                  }, function () {});
                });
              }, function () { return null; }).then(step, step);
            };
            return step();
          });
        });
      });
      chain.then(function () {
        DS.busy = false;
        pfSave();
        try { U.R(); } catch (e) {}
        toast(done ? 'Обновлено страниц: ' + done : 'Не удалось обновить');
        /* остались страницы без оригинала (старые загрузки) — предложим загрузить PDF заново */
        var left = (p.ph || []).filter(function (id) { return !pageSrc(p, id); });
        if (left.length) setTimeout(function () { legacyQuality(p); }, 700);
      }, function () {
        DS.busy = false;
        try { U.R(); } catch (e) {}
        toast('Обновление прервалось');
      });
    });
  }

  /* старые проекты: оригинала нет — предлагаем загрузить PDF этого файла заново */
  function legacyQuality(p) {
    var byName = {}, order = [];
    (p.ph || []).forEach(function (id) {
      var m = p.pn && p.pn[id], nm = m && m[0] ? m[0] : '';
      if (!nm || !/\.pdf$/i.test(nm)) return;
      if (!byName[nm]) { byName[nm] = []; order.push(nm); }
      byName[nm].push(id);
    });
    if (!order.length) { toast('Оригинал PDF не сохранён'); return; }
    U.sheet(function () {
      return {
        t: 'Заменить страницы файла',
        b: U.grp(order.map(function (nm) {
          var n = byName[nm].length;
          return U.row({
            t: esc(nm), s: n + ' ' + plr(n, 'страница', 'страницы', 'страниц') + ' · оригинал не сохранён',
            fn: function () { U.closeS(1); pickReplace(p, nm, byName[nm]); }
          });
        }).join('')) + '<div class="cp" style="margin:10px 2px 0">Выберите тот же PDF: страницы этого файла заменятся на новые, крупные. Этап сохранится.</div>',
        f: '<button class="btn g2"' + U.on(function () { U.closeS(); }) + '>Отмена</button>'
      };
    });
  }
  function pickReplace(p, name, ids) {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'application/pdf,.pdf';
    inp.style.display = 'none';
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (inp.parentNode) inp.parentNode.removeChild(inp);
      if (!f) return;
      var st = (p.ps && p.ps[ids[0]]) || '';
      /* старые страницы уберём после того, как новый PDF импортируется */
      DS.rep = { pid: p.id, ids: ids.slice() };
      DS.q = { pid: p.id, items: [{ f: f, pdf: true, s: st }] };
      runImport();
    };
    document.body.appendChild(inp);
    inp.click();
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
    if (S.length) h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">' +
      '<button class="chip lt2" type="button"' + U.on(function () { refreshQuality(p); }) + '>Обновить качество</button>' +
      ((p.src || []).length ? '<span class="cp">оригинал сохранён</span>' : '<span class="cp">оригинала нет</span>') + '</div>';
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
          return '<img loading="lazy" decoding="async" src="' + bUrl(((p.th || {})[id]) || id) + '"' + U.on(function () {
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
    var isR = p.kind === 'r';
    var unit = isR ? 'фото' : 'страница';
    var many = function (n) { return isR ? n + ' фото' : n + ' ' + plr(n, 'страница', 'страницы', 'страниц'); };
    var ids = p.ph.filter(function (id) { return stageOf(p, id) === a.k; });
    DS.sel = DS.sel.filter(function (id) { return ids.indexOf(id) >= 0; });
    var h = U.nv(isR ? 'Назад' : 'Проект', '<button class="ib tx"' + U.on(function () { DS.selOn = !DS.selOn; DS.sel = []; U.R(); }) + '>' + (DS.selOn ? 'Готово' : 'Выбрать') + '</button>');
    h += '<div class="mt">' + esc(stgName(a.k, isR ? 'r' : 'd')) + '</div><div class="cp" style="margin-bottom:12px">' + many(ids.length) + '</div>';
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
          }, isR ? 'r' : 'd');
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
            pfSave(); toast(isR ? 'Фото стало обложкой' : 'Страница стала обложкой проекта'); U.R();
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
          asGet().then(function (as) {
            if (!as) return;
            gone.forEach(function (x) {
              var th = p.th && p.th[x];
              try { as['delete'](x); } catch (e) {}
              if (th) { try { as['delete'](th); } catch (e) {} }
              if (p.th) delete p.th[x];
            });
            pfSave();
          });
        }) + '>Удалить</button>';
      }
      h += '</div></div>';
    }
    if (!ids.length) return h + '<div class="empty"><b>' + (isR ? 'В этом этапе фото нет' : 'В этом этапе страниц нет') + '</b>' + (isR ? 'Добавьте фото в карточке' : 'Добавьте PDF в карточке проекта') + '</div>';
    var list = ids.map(function (id) {
      var m = pageSrc(p, id);
      return { id: id, s: a.k, n: stgName(a.k, isR ? 'r' : 'd'), l: pgLabel(p, id), th: (p.th || {})[id] || '', src: m ? m.src : '', pg: m ? m.pg : 0 };
    });
    h += '<div class="pgg">' + ids.map(function (id, i) {
      var on = DS.sel.indexOf(id) >= 0, lb = pgLabel(p, id);
      return '<div class="pgi' + (on ? ' on' : '') + '" style="background-image:url(' + bUrl(((p.th || {})[id]) || id) + ')"' + U.on(function () {
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

  /* ================= реализация: фото по этапам, мозаика, карточки ================= */
  var RZS = {};

  function rzCss() {
    if (document.getElementById('studio-rz-css')) return;
    var s = document.createElement('style');
    s.id = 'studio-rz-css';
    s.textContent = [
      '.rzh{height:400px}',
      '.rzh .rzsh{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(0,0,0,.42) 0%,rgba(0,0,0,0) 30%,rgba(9,10,12,.32) 66%,rgba(9,10,12,.94) 100%)}',
      '.rzh .bt{background:none}',
      '.rzt{display:flex;gap:7px;overflow-x:auto;margin:14px -16px 4px;padding:2px 16px 4px;scrollbar-width:none}',
      '.rzt::-webkit-scrollbar{display:none}',
      '.rzt .chip{flex:none}',
      '.rzg{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:0 -16px 6px;padding:0 16px}',
      '.rzg .rzp{position:relative;aspect-ratio:1;border-radius:11px;overflow:hidden;border:0;padding:0;background:var(--s2);display:block;width:100%}',
      '.rzg .rzp img{width:100%;height:100%;object-fit:cover;display:block;animation:rzin .35s ease both}',
      '.rzg .rzp.big{grid-column:span 2;grid-row:span 2;border-radius:14px}',
      '@keyframes rzin{from{opacity:0}to{opacity:1}}',
      '@media(max-width:359px){.rzg{grid-template-columns:repeat(2,1fr)}}',
      '.rzw{display:flex;flex-wrap:wrap;gap:7px;align-items:flex-start}',
      '.rzmore{border:0;background:none;color:var(--ac2);font-size:14px;padding:6px 2px;align-self:center}',
      '.rzmat{color:var(--t2);line-height:23px;margin:0;white-space:pre-wrap;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}',
      '.rzmat.on{display:block;-webkit-line-clamp:unset}',
      '.rzc{background:var(--s1);border-radius:14px;overflow:hidden}',
      '.rzc .rzci{aspect-ratio:4/3;background:var(--s2) center/cover no-repeat;position:relative}',
      '.rzc .rzci i{position:absolute;right:7px;top:7px;font-style:normal;font-size:11px;font-weight:600;background:rgba(0,0,0,.5);color:#fff;border-radius:8px;padding:2px 6px;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}',
      '.rzc b{display:block;font-size:15px;line-height:19px;font-weight:600;padding:9px 11px 0;overflow:hidden;max-height:47px}',
      '.rzc span{display:block;font-size:12.5px;line-height:16px;color:var(--t2);padding:3px 11px 11px;overflow:hidden;max-height:35px}',
      '.rzgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
      '.ed.rz{display:grid;grid-template-columns:1fr 1fr;gap:10px;overflow:visible;margin:0;padding:0}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function rzState(p) {
    var s = RZS[p.id];
    if (!s) { s = { f: null, w: 0, t: 0, m: 0 }; RZS[p.id] = s; }
    return s;
  }
  function rzBg(p, id) {
    var th = p.th && p.th[id];
    return th ? 'background-image:url(' + bUrl(th) + ')' : (id ? 'background-image:url(' + bUrl(id) + ')' : '');
  }
  function rzIds(p) {
    var a = [];
    stagesOf(p).forEach(function (g) { a = a.concat(g.ids); });
    return a;
  }
  function rzFacts(p) {
    var f = [], n = (p.ph || []).length, w = (p.works || []).length;
    if (p.addr) f.push(p.addr);
    if (p.area) f.push(p.area + ' м²');
    if (n) f.push(n + ' ' + plr(n, 'фото', 'фото', 'фото'));
    if (w) f.push(w + ' ' + plr(w, 'работа', 'работы', 'работ'));
    return f;
  }
  /* список для просмотра: все фото в порядке групп, с привязкой к оригиналу для крупного рендера */
  function rzList(p) {
    var out = [];
    stagesOf(p).forEach(function (g) {
      g.ids.forEach(function (id) {
        var m = pageSrc(p, id);
        out.push({ id: id, th: (p.th || {})[id] || '', s: g.k || null, n: g.k ? g.n : '',
          l: '', src: m ? m.src : '', pg: m ? m.pg : 0 });
      });
    });
    return out;
  }

  function rzTile(p, id, idx, big) {
    var th = (p.th && p.th[id]) || id;
    return '<button class="rzp' + (big ? ' big' : '') + '" type="button"' + U.on(function () {
      pgView(rzList(p), Math.max(0, idx || 0));
    }) + '><img loading="lazy" decoding="async" alt="" src="' + bUrl(th) + '"></button>';
  }

  function rzWorks(p) {
    var w = p.works || [];
    if (!w.length) return '';
    var st = rzState(p), lim = st.w ? w.length : 6;
    var h = U.sh('Выполненные работы', w.length > 6 ? '<span class="cp">' + w.length + '</span>' : '');
    h += '<div class="rzw">' + w.slice(0, lim).map(function (x) {
      return '<span class="chip lt2 sm">' + esc(x) + '</span>';
    }).join('');
    if (w.length > 6) {
      h += st.w
        ? '<button class="rzmore" type="button"' + U.on(function () { st.w = 0; U.R(); }) + '>свернуть</button>'
        : '<button class="rzmore" type="button"' + U.on(function () { st.w = 1; U.R(); }) + '>ещё ' + (w.length - 6) + '</button>';
    }
    return h + '</div>';
  }

  function rzMats(p) {
    if (!p.mats) return '';
    var st = rzState(p);
    return U.sh('Материалы') +
      '<p class="rzmat' + (st.m ? ' on' : '') + '"' + U.on(function () { st.m = st.m ? 0 : 1; U.R(); }) + '>' + esc(p.mats) + '</p>';
  }

  function rzTags(p) {
    var T = U.pTags(p);
    if (!T.length) return '';
    var st = rzState(p), lim = st.t ? T.length : 8;
    var h = U.sh('Решения', T.length > 8 ? '<span class="cp">' + T.length + '</span>' : '');
    h += '<div class="rzw">' + T.slice(0, lim).map(function (t) {
      return '<button class="chip sm' + (U.pf.indexOf(t.id) >= 0 ? ' hit' : ' lt2') + '" type="button"' + U.on(function () {
        U.pv = 'r'; U.pf = [t.id]; U.goTab('port');
      }) + '>' + esc(t.n) + '</button>';
    }).join('');
    if (T.length > 8) {
      h += st.t
        ? '<button class="rzmore" type="button"' + U.on(function () { st.t = 0; U.R(); }) + '>свернуть</button>'
        : '<button class="rzmore" type="button"' + U.on(function () { st.t = 1; U.R(); }) + '>ещё ' + (T.length - 8) + '</button>';
    }
    return h + '</div>';
  }

  function rzProj(p) {
    rzCss();
    var st = rzState(p);
    p.th = p.th || {};
    var groups = stagesOf(p), all = rzIds(p);
    var cover = (p.ph || [])[0] || '';
    var h = '<div class="hero rzh" style="' + (cover ? '' : 'height:250px;') + rzBg(p, cover) + '">' +
      '<div class="rzsh"></div>' +
      '<div class="tp"><button class="ib ov"' + U.on(U.back) + '>' + U.I('bk', 20) + '</button>' +
      '<div style="display:flex;gap:8px">' +
      '<button class="ib ov tx"' + U.on(function () { U.pickSheet(p.id); }) + '>' + U.I('pl', 16) + 'В подборку</button>' +
      '<button class="ib ov"' + U.on(function () { U.go('pedit', p.id); }) + '>' + U.I('pe', 17) + '</button>' +
      '</div></div>' +
      '<div class="bt"><div class="mt" style="font-size:29px;line-height:33px">' + esc(p.title || 'Без названия') + '</div>' +
      '<div class="cp" style="color:#d8d8dc;font-size:14.5px;margin-top:4px">' + esc(rzFacts(p).join(' · ')) + '</div></div></div>';

    if (!all.length) {
      h += '<div class="empty" style="padding:28px 16px"><b>Фотографий пока нет</b>Добавьте снимки — они соберутся в мозаику по этапам</div>';
    } else {
      /* null — «Все»; ключ группы может быть '' (фото без этапа), поэтому не путаем их */
      var fl = st.f;
      if (groups.length > 1) {
        var tab = function (k, name, n) {
          return '<button class="chip sm' + (fl === k ? ' on' : ' lt2') + '" type="button"' + U.on(function () {
            st.f = fl === k ? null : k; U.R();
          }) + '>' + esc(name) + ' · ' + n + '</button>';
        };
        h += '<div class="rzt">' + tab(null, 'Все', all.length) + groups.map(function (g) {
          return tab(g.k, g.n, g.ids.length);
        }).join('') + '</div>';
      }
      var list = groups.filter(function (g) { return fl === null || g.k === fl; });
      /* позиция плитки в общем списке: считаем по группам, а не по id (id может повториться) */
      var off = {}, acc = 0;
      groups.forEach(function (g) { off[g.k] = acc; acc += g.ids.length; });
      list.forEach(function (g) {
        var big = g.ids.length >= 5 ? g.ids[0] : '';
        h += U.sh(esc(g.n), '<span class="cp">' + g.ids.length + '</span>');
        h += '<div class="rzg">' + g.ids.map(function (id, j) {
          return rzTile(p, id, (off[g.k] || 0) + j, id === big);
        }).join('') + '</div>';
      });
    }

    if (p.desc) h += U.sh('О проекте') + '<p style="color:var(--t2);line-height:24px;margin:0;white-space:pre-wrap">' + esc(p.desc) + '</p>';
    h += rzWorks(p) + rzMats(p) + rzTags(p);

    var lk = p.link ? pfGet(p.link) : null;
    var back = PF.items.filter(function (x) { return x.link === p.id; });
    if (lk) {
      h += U.sh('По дизайн-проекту') + U.grp(U.row({
        th: '', thS: U.bg(lk.ph && lk.ph[0], lk.id), t: esc(lk.title || 'Без названия'),
        s: 'Дизайн-проект', fn: function () { U.go('proj', lk.id); }
      }));
    }
    if (back.length) {
      h += U.sh('Связанные проекты') + U.grp(back.map(function (b) {
        return U.row({
          th: '', thS: U.bg(b.ph && b.ph[0], b.id), t: esc(b.title || 'Без названия'),
          s: 'Реализация', fn: function () { U.go('proj', b.id); }
        });
      }).join(''));
    }
    return h;
  }

  function rzCard(p) {
    var id = (p.ph || [])[0] || '';
    var n = (p.ph || []).length;
    var facts = [p.area ? p.area + ' м²' : '', (p.works || []).slice(0, 2).join(', ')].filter(Boolean).join(' · ');
    return '<div class="rzc"' + U.on(function () { U.go('proj', p.id); }) + '>' +
      '<div class="rzci" style="' + (id ? rzBg(p, id) : '') + '">' + (n > 1 ? '<i>' + n + '</i>' : '') + '</div>' +
      '<b>' + esc(p.title || 'Без названия') + '</b>' +
      (facts ? '<span>' + esc(facts) + '</span>' : '<span>' + esc([p.addr || '', n ? n + ' фото' : ''].filter(Boolean).join(' · ')) + '</span>') +
      '</div>';
  }

  /* ---- редактирование реализации: загрузка с выбором этапа + список этапов ---- */
  function rzEdit(p) {
    rzCss();
    p.th = p.th || {};
    var S = stagesOf(p), n = (p.ph || []).length, h = '';
    h += U.sh('Фото', '<span class="cp">' + (n ? n + ' · первое — обложка' : 'по этапам') + '</span>');
    h += '<div style="display:flex;gap:8px;margin-bottom:10px">' +
      '<label class="btn" style="flex:1">' + U.I('pl', 18) + 'Добавить фото<input type="file" accept="image/*" multiple style="display:none" onchange="' +
      U.f(function (e, el) { var f = [].slice.call(el.files); el.value = ''; pickFiles(p, f, 'img'); }) + '"></label>' +
      '<label class="btn g2" style="flex:1">PDF<input type="file" accept="application/pdf,.pdf" multiple style="display:none" onchange="' +
      U.f(function (e, el) { var f = [].slice.call(el.files); el.value = ''; pickFiles(p, f, 'pdf'); }) + '"></label></div>';
    if (DS.busy) h += '<div class="cp" id="pgprog" style="margin:0 2px 10px">Готовлю фото…</div>';
    if (!S.length) return h + '<div class="cp" style="margin:0 2px">Добавьте фото: при загрузке выберете этап, а в карточке они соберутся в мозаику.</div>';
    h += U.grp(S.map(function (s) {
      return U.row({
        th: '', thS: rzBg(p, s.ids[0]), t: esc(s.n),
        s: s.ids.length + ' ' + plr(s.ids.length, 'фото', 'фото', 'фото'),
        fn: function () { DS.sel = []; DS.selOn = false; U.go('pstage', { p: p.id, k: s.k }); }
      });
    }).join(''));
    h += '<div class="cp" style="margin:10px 2px 0">Внутри этапа: выбрать, перенести, поменять порядок, сделать обложкой, удалить.</div>';
    return h;
  }

  /* ---- каталог: реализации плитками в две колонки ---- */
  function rzPort() {
    rzCss();
    var L = U.dps('r'), m = U.tagMap();
    var h = '<div style="display:flex;justify-content:space-between;align-items:center">' +
      '<div class="lt" style="margin:4px 0 12px">Портфолио</div>' +
      '<button class="ib"' + U.on(function () { U.pNew('r'); }) + '>' + U.I('pl', 18) + '</button></div>' +
      U.seg([['d', 'Дизайн-проекты'], ['r', 'Реализация']], U.pv, function (v) { U.pv = v; U.pf = []; U.R(); });
    h += '<button class="chip lt2" style="display:flex;align-items:center;gap:6px;margin-bottom:12px"' + U.on(U.fltSheet) + '>' +
      U.I('fl', 17) + 'Подбор по решениям' + (U.pf.length ? ' · ' + U.pf.length : '') + '</button>';
    if (U.pf.length) {
      h += '<div class="chips" style="margin-bottom:12px">' + U.pf.map(function (id) {
        return '<button class="chip on sm"' + U.on(function () { U.fTog(id); }) + '>' + esc(m[id] ? m[id].n : '') + ' ×</button>';
      }).join('') + '</div>';
    }
    if (!L.length) {
      return h + '<div class="empty"><b>Выполненных работ пока нет</b>Фото узлов, инженерии и отделки. Они продают ремонт.</div>' +
        '<button class="btn"' + U.on(function () { U.pNew('r'); }) + '>Добавить</button>';
    }
    var ex = L.filter(function (p) { return U.pMatch(p).ok; });
    var list = ex.length ? ex : L;
    if (!ex.length && U.pf.length) h += '<div class="empty" style="padding:14px"><b>Точных совпадений нет</b>Показаны все работы</div>';
    h += '<div class="rzgrid">' + list.map(rzCard).join('') + '</div>';
    return h;
  }

  function hookRz() {
    if (!(window.U && U.S && U.S.proj && U.S.pedit && window.PF) || U.S.proj.__rz) return;
    rzCss();
    var op = U.S.proj, oe = U.S.pedit, oplate = U.plate, oport = U.S.port;
    U.S.proj = function (id) {
      var p = pfGet(id);
      if (p && p.kind === 'r') {
        try { return rzProj(p); } catch (e) { try { console.error(e); } catch (x) {} return op.apply(this, arguments); }
      }
      return op.apply(this, arguments);
    };
    U.S.proj.__rz = 1;
    U.S.proj.__wrapped = true;
    U.S.pedit = function (id) {
      var h = oe.apply(this, arguments), p = pfGet(id);
      if (!p || p.kind !== 'r') return h;
      try {
        p.ph = p.ph || [];
        var re = /<div class="sh2">Фото<span class="cp">первое - обложка<\/span><\/div>[\s\S]*?(?=<div class="sh2">)/;
        if (re.test(h)) return h.replace(re, function () { return rzEdit(p); });
        return h + rzEdit(p);
      } catch (e) { return h; }
    };
    U.S.pedit.__rz = 1;
    U.S.pedit.__wrapped = true;
    U.plate = function (p) {
      if (!p || p.kind !== 'r') return oplate.apply(this, arguments);
      try { return rzCard(p); } catch (e) { return oplate.apply(this, arguments); }
    };
    var basePort = oport;
    U.S.port = function () {
      if (U.pv === 'r') {
        try { return rzPort(); } catch (e) { try { console.error(e); } catch (x) {} return basePort.apply(this, arguments); }
      }
      return basePort.apply(this, arguments);
    };
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
    hookObjMenu(); hookDesign(); hookRz();
    // догоняем, если приложение уже успело отрисоваться
    var n = 0;
    var t = setInterval(function () {
      n++;
      applyTheme(); hookUndo(); hookOpenObj(); hookHome(); hookObjMenu(); hookDesign(); hookRz();
      if (n > 20) clearInterval(t);
    }, 250);
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(boot, 0);
  else window.addEventListener('DOMContentLoaded', boot);
})();
