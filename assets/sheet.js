/* 안내 페이지의 체크·메모 칸을 이 기기에 저장하고, 질문표 답변을 기록부로 보냅니다. 서버 전송 없음. */
(function () {
  'use strict';
  var RECORD_KEY = 'mpa-farm-record-v1';
  function store(get, key, value) {
    try {
      if (get) return window.localStorage.getItem(key);
      if (value === null) window.localStorage.removeItem(key); else window.localStorage.setItem(key, value);
      return true;
    } catch (e) { return get ? null : false; }
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function uid() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  document.querySelectorAll('form[data-sheet]').forEach(function (form) {
    var key = 'mpa-sheet-' + form.getAttribute('data-sheet');
    var status = form.querySelector('[data-sheet-status]');
    var timer = null;
    function say(msg, err) { if (status) { status.textContent = msg; status.className = 'status' + (err ? ' err' : ''); } }
    function fields() { return Array.prototype.slice.call(form.querySelectorAll('input[name], textarea[name], select[name]')); }
    function collect() {
      var data = {};
      fields().forEach(function (el) { data[el.name] = el.type === 'checkbox' ? el.checked : String(el.value).slice(0, 2000); });
      return data;
    }
    var saved = store(true, key);
    if (saved) {
      try {
        var data = JSON.parse(saved);
        fields().forEach(function (el) {
          if (!(el.name in data)) return;
          if (el.type === 'checkbox') el.checked = !!data[el.name]; else el.value = data[el.name];
        });
        say('이 기기에 저장해 둔 내용을 불러왔습니다.');
      } catch (e) { /* 손상된 저장값은 무시 */ }
    }
    function save() {
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (store(false, key, JSON.stringify(collect()))) {
          var d = new Date();
          say('이 기기에 저장됨 · ' + pad(d.getHours()) + ':' + pad(d.getMinutes()));
        } else say('이 브라우저에서는 저장되지 않습니다. 필요하면 인쇄해 두세요.', true);
      }, 400);
    }
    form.addEventListener('input', save);
    form.addEventListener('change', save);
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    var printBtn = form.querySelector('[data-sheet-print]');
    if (printBtn) printBtn.addEventListener('click', function () { window.print(); });
    var clearBtn = form.querySelector('[data-sheet-clear]');
    if (clearBtn) clearBtn.addEventListener('click', function () {
      if (!window.confirm('이 페이지에 적은 체크와 메모를 지울까요?')) return;
      form.reset();
      store(false, key, null);
      say('지웠습니다.');
    });
    var sendBtn = form.querySelector('[data-send-qa]');
    if (sendBtn) sendBtn.addEventListener('click', function () {
      var who = (form.querySelector('[name="who"]') || {}).value || '';
      var date = (form.querySelector('[name="asked"]') || {}).value || today();
      var items = [];
      form.querySelectorAll('[data-q]').forEach(function (box) {
        var a = box.querySelector('textarea');
        if (a && a.value.trim()) items.push({ q: box.getAttribute('data-q'), a: a.value.trim().slice(0, 2000) });
      });
      if (!items.length) { say('보낼 답변이 없습니다. 답변 칸에 들은 내용을 먼저 적어 주세요.', true); return; }
      var raw = store(true, RECORD_KEY);
      var state = null;
      try { state = raw ? JSON.parse(raw) : null; } catch (e) { state = null; }
      if (!state || !Array.isArray(state.machines) || !state.machines.length) {
        var id = uid();
        state = { app: 'farm-asset-record', version: 1, activeId: id, lastExportAt: '', machines: [{ id: id, info: {}, handover: { checks: {}, notes: {}, photos: {} }, maintenance: [], incidents: [], insurance: { qa: [] } }] };
      }
      var m = state.machines.filter(function (x) { return x && x.id === state.activeId; })[0] || state.machines[0];
      state.activeId = m.id;
      m.insurance = m.insurance || {};
      m.insurance.qa = Array.isArray(m.insurance.qa) ? m.insurance.qa : [];
      var added = 0;
      items.forEach(function (it) {
        var dup = m.insurance.qa.some(function (x) { return x.q === it.q && x.a === it.a; });
        if (!dup) { m.insurance.qa.push({ id: uid(), date: date, who: String(who).slice(0, 300), q: it.q, a: it.a }); added++; }
      });
      if (!store(false, RECORD_KEY, JSON.stringify(state))) { say('이 브라우저에서는 저장이 막혀 있어 기록부로 보낼 수 없습니다.', true); return; }
      var info = m.info || {};
      var name = [info.type === '기타' ? info.typeEtc : info.type, info.model].filter(Boolean).join(' ') || '기록부의 첫 번째 기계';
      say(added ? '답변 ' + added + '개를 "' + name + '"의 보험 메모에 추가했습니다. 기록부에서 확인하세요.' : '같은 답변이 이미 기록부에 있습니다.');
      var link = form.querySelector('[data-after-send]');
      if (link) link.hidden = false;
    });
  });
})();
