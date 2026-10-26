/* 농기계 자산 기록부: 브라우저 저장(localStorage) 전용, 서버 전송 없음 */
(function () {
  'use strict';

  var KEY = 'mpa-farm-record-v1';
  var APP = 'farm-asset-record';
  var MAX_TEXT = 2000;
  var MAX_LINE = 300;

  var COMMON = [
    ['plate', '명판(제조사·모델·제조번호)과 서류·매물 설명 일치'],
    ['hours', '계기판 사용 시간 확인·사진'],
    ['start', '엔진이 식은 상태에서 시동'],
    ['sound', '엔진 소리와 배기 연기'],
    ['leak', '엔진·미션·유압 호스 주변 누유 흔적'],
    ['fluids', '엔진오일·냉각수 양과 색'],
    ['battery', '배터리 단자 조임과 충전 상태'],
    ['brake', '브레이크·주차 브레이크 작동'],
    ['steer', '조향·클러치·변속 조작'],
    ['lights', '등화장치·야간 반사판'],
    ['guard', '회전부 방호 덮개·긴급정지 장치'],
    ['implements', '작업기·부속품 종류·수량·연결 상태'],
    ['docs', '열쇠·사용설명서·정비 기록 등 받기로 한 물건']
  ];
  var BY_TYPE = {
    '트랙터': [
      ['t_brakeplay', '브레이크 유격'],
      ['t_air', '에어클리너 청소 상태'],
      ['t_radiator', '라디에이터 먼지·잡풀 끼임'],
      ['t_tire', '타이어 공기압·표면 찢어짐'],
      ['t_hitch', '3점 링크(유압) 올림·내림'],
      ['t_pto', 'PTO(동력 취출축) 회전'],
      ['t_rops', '안전 프레임·안전벨트']
    ],
    '콤바인': [
      ['c_blade', '예취날·체인 마모'],
      ['c_thresh', '탈곡부 안쪽 짚 부스러기·먼지'],
      ['c_crawler', '크롤러(궤도) 장력과 돌·흙 끼임'],
      ['c_water', '유수분리기 불순물']
    ],
    '이앙기': [
      ['r_plant', '식부부 오일·그리스와 작동'],
      ['r_belt', '모 이송 벨트·체인 장력'],
      ['r_sensor', '수평 제어 감지기(센서) 부위 흙·오염물']
    ],
    '동력경운기': [
      ['k_steer', '핸들·조향클러치 작동'],
      ['k_cover', '회전체 덮개와 벨트'],
      ['k_wire', '전선 피복(절연)·배전반 덮개'],
      ['k_trailer', '트레일러 연결부·바퀴']
    ]
  };
  var OTHER = [
    ['o_wheel', '바퀴·타이어 또는 크롤러'],
    ['o_work', '작업부(회전·유압 등) 작동']
  ];
  var PHOTOS = [
    ['p_four', '기계 전체 앞·뒤·왼쪽·오른쪽'],
    ['p_plate', '명판(제조번호가 읽히게)'],
    ['p_hours', '계기판의 사용 시간'],
    ['p_engine', '엔진룸, 오일·냉각수 상태'],
    ['p_under', '하부·호스 주변 누유 흔적'],
    ['p_tire', '타이어 또는 크롤러'],
    ['p_impl', '작업기·부속품 전체와 연결부'],
    ['p_damage', '이미 있던 흠집·파손 부위(가까이)'],
    ['p_video', '시동·작동 영상(소리 포함)'],
    ['p_docs', '계약서·영수증·인수 확인 문서']
  ];
  var STATUS = [['ok', '양호'], ['bad', '이상 있음'], ['na', '확인 못 함']];
  var M_KINDS = ['정기 점검', '오일·필터 교환', '부품 교체', '고장 수리', '사고 수리', '기타'];
  var I_KINDS = ['충돌·접촉', '추락·전복', '화재·폭발', '도난', '침수(태풍·홍수 등)', '끼임·말림(사람 부상)', '기타'];
  var I_STATUS = ['접수 전', '보험사 접수함', '수리 중', '처리 끝남', '보험 접수 안 함'];

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function str(v, max) { return (v === undefined || v === null) ? '' : String(v).slice(0, max || MAX_TEXT); }
  function esc(v) {
    return str(v, 20000).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d.getTime()) ? null : d;
  }
  function daysFromToday(s) {
    var d = parseDate(s);
    if (!d) return null;
    var t = parseDate(today());
    return Math.round((d - t) / 86400000);
  }
  function num(s) {
    var clean = str(s).replace(/[,\s원]/g, '');
    if (!clean || !/^\d+(\.\d+)?$/.test(clean)) return null;
    return parseFloat(clean);
  }
  function fmtWon(n) { return Math.round(n).toLocaleString('ko-KR') + '원'; }

  function blankMachine() {
    return {
      id: uid(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      info: {}, handover: { checks: {}, notes: {}, photos: {} },
      maintenance: [], incidents: [], insurance: { qa: [] }
    };
  }
  function normText(obj, keys, max) {
    var out = {};
    keys.forEach(function (k) { out[k] = str(obj && obj[k], max); });
    return out;
  }
  var INFO_KEYS = ['type', 'typeEtc', 'maker', 'model', 'year', 'serial', 'engineNo', 'spec', 'acquiredOn', 'acquiredHow', 'acquiredFrom', 'price', 'attachments', 'storage', 'docs', 'memo'];
  var HAND_KEYS = ['date', 'place', 'hours', 'memo'];
  var INS_KEYS = ['insurer', 'product', 'policyNo', 'start', 'end', 'coverage', 'deductible', 'implCovered', 'claimContact', 'memo'];
  var M_KEYS = ['date', 'hours', 'kind', 'work', 'shop', 'cost', 'proof'];
  var I_KEYS = ['date', 'place', 'kind', 'damage', 'people', 'report', 'status', 'proof'];
  var Q_KEYS = ['date', 'who', 'q', 'a'];

  function normList(list, keys) {
    if (!Array.isArray(list)) return [];
    return list.slice(0, 500).map(function (row) {
      var r = normText(row, keys);
      r.id = str(row && row.id, 80) || uid();
      return r;
    });
  }
  function normMap(obj, max) {
    var out = {};
    if (obj && typeof obj === 'object') {
      Object.keys(obj).slice(0, 200).forEach(function (k) {
        var v = obj[k];
        out[str(k, 40)] = typeof v === 'boolean' ? v : str(v, max || MAX_LINE);
      });
    }
    return out;
  }
  function normMachine(m) {
    m = m && typeof m === 'object' ? m : {};
    var h = m.handover || {};
    var ins = m.insurance || {};
    var hand = normText(h, HAND_KEYS);
    hand.checks = normMap(h.checks, 10);
    hand.notes = normMap(h.notes);
    hand.photos = normMap(h.photos);
    var insurance = normText(ins, INS_KEYS);
    insurance.qa = normList(ins.qa, Q_KEYS);
    return {
      id: str(m.id, 80) || uid(),
      createdAt: str(m.createdAt, 40) || new Date().toISOString(),
      updatedAt: str(m.updatedAt, 40) || new Date().toISOString(),
      info: normText(m.info, INFO_KEYS),
      handover: hand,
      maintenance: normList(m.maintenance, M_KEYS),
      incidents: normList(m.incidents, I_KEYS),
      insurance: insurance
    };
  }

  /* 저장소 */
  var storageOK = true;
  var loadNote = '';
  var dirty = {};   /* 이 창에서 고쳤지만 아직 저장하지 않은 기계 id */
  var removed = {}; /* 이 창에서 지웠지만 아직 저장하지 않은 기계 id */
  var lastSeen = null; /* 이 창이 마지막으로 읽거나 쓴 저장값 */
  function readRaw() {
    try { return window.localStorage.getItem(KEY); } catch (e) { storageOK = false; return null; }
  }
  /* null: 저장된 것 없음, false: 읽을 수 없음, 객체: 정상 */
  function parseState(raw) {
    if (!raw) return null;
    var d;
    try { d = JSON.parse(raw); } catch (e) { return false; }
    if (!d || typeof d !== 'object' || !Array.isArray(d.machines) || (d.version && d.version > 1)) return false;
    return d;
  }
  /* 읽을 수 없는 저장값은 덮어쓰지 않고 다른 이름으로 남겨 둡니다. */
  function keepUnreadable(raw) {
    try {
      for (var i = 0; i < window.localStorage.length; i++) {
        var k = window.localStorage.key(i);
        if (k && k.indexOf(KEY + '-unreadable-') === 0 && window.localStorage.getItem(k) === raw) return true;
      }
      window.localStorage.setItem(KEY + '-unreadable-' + Date.now(), raw);
      return true;
    } catch (e) { return false; }
  }
  function normMachines(data) {
    var seen = {};
    var machines = data ? data.machines.map(normMachine) : [];
    machines.forEach(function (m) { if (seen[m.id]) m.id = uid(); seen[m.id] = true; });
    return machines;
  }
  function buildState(data) {
    var machines = normMachines(data);
    if (!machines.length) machines = [blankMachine()];
    var active = data && machines.some(function (m) { return m.id === data.activeId; }) ? data.activeId : machines[0].id;
    return { app: APP, version: 1, activeId: active, machines: machines, lastExportAt: str(data && data.lastExportAt, 40) };
  }
  function loadState() {
    var raw = readRaw();
    lastSeen = raw;
    var data = parseState(raw);
    if (data === false) {
      loadNote = keepUnreadable(raw)
        ? '이 기기에 저장돼 있던 기록을 읽지 못해 지우지 않고 따로 보관해 두었습니다. 백업 파일이 있으면 아래에서 불러오세요.'
        : '이 기기에 저장돼 있던 기록을 읽지 못했습니다. 백업 파일이 있으면 아래에서 불러오세요.';
      data = null;
    }
    return buildState(data);
  }
  var state = loadState();
  var saveTimer = null;
  var summaryTimer = null;

  function setStatus(msg, isErr) {
    var el = $('#save-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'status' + (isErr ? ' err' : '');
  }
  /* 다른 창이 저장한 내용(latest)과 이 창의 내용을 기계별로 합칩니다.
     양쪽에 있는 기계는 아직 저장 안 한 쪽 또는 더 나중에 고친 쪽을 남기고,
     이 창에만 있는 기계는 아직 저장 안 한 새 기계일 때만, 이 창에서 지운 기계는 빼고 남깁니다.
     이 창 쪽 내용을 남긴 것이 있으면 true(다시 저장 필요)를 돌려줍니다. */
  function mergeWith(latest) {
    var mine = {};
    var localWins = false;
    state.machines.forEach(function (m) { mine[m.id] = m; });
    var base = [];
    normMachines(latest).forEach(function (x) {
      if (removed[x.id]) { localWins = true; return; }
      var m = mine[x.id];
      delete mine[x.id];
      if (m && (dirty[m.id] || str(m.updatedAt) > str(x.updatedAt))) {
        base.push(m);
        if (str(m.updatedAt) !== str(x.updatedAt)) localWins = true;
      } else base.push(x);
    });
    state.machines.forEach(function (m) { if (mine[m.id] && dirty[m.id]) { base.push(m); localWins = true; } });
    if (!base.length) base = [blankMachine()];
    var active = state.activeId;
    if (!base.some(function (m) { return m.id === active; })) {
      active = latest && base.some(function (m) { return m.id === latest.activeId; }) ? latest.activeId : base[0].id;
    }
    state.machines = base;
    state.activeId = active;
    if (latest && str(latest.lastExportAt) > str(state.lastExportAt)) state.lastExportAt = str(latest.lastExportAt, 40);
    return localWins;
  }
  function saveNow() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (!storageOK) { setStatus('이 브라우저에서는 자동 저장이 되지 않습니다. 작성 후 반드시 백업 파일로 내려받으세요.', true); return false; }
    try {
      var raw = window.localStorage.getItem(KEY);
      if (raw !== lastSeen) {
        var latest = parseState(raw);
        if (latest === false) keepUnreadable(raw);
        else { mergeWith(latest); renderMachineSelect(); }
      }
      var text = JSON.stringify(state);
      window.localStorage.setItem(KEY, text);
      lastSeen = text;
      dirty = {};
      removed = {};
      var d = new Date();
      setStatus('이 기기에 저장됨 · ' + pad(d.getHours()) + ':' + pad(d.getMinutes()));
      return true;
    } catch (e) {
      setStatus('저장 공간이 부족하거나 저장이 막혀 있습니다. 백업 파일로 내려받아 두세요.', true);
      return false;
    }
  }
  /* 창을 닫거나 새로고침하기 직전, 다른 앱으로 넘어갈 때 남은 입력을 바로 저장 */
  function flushSave() { if (saveTimer) saveNow(); }
  function scheduleSave() {
    current().updatedAt = new Date().toISOString();
    dirty[current().id] = true;
    setStatus('저장 중…');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 400);
    clearTimeout(summaryTimer);
    summaryTimer = setTimeout(function () { renderSummary(); renderMachineSelect(); }, 350);
  }
  function current() {
    for (var i = 0; i < state.machines.length; i++) if (state.machines[i].id === state.activeId) return state.machines[i];
    state.activeId = state.machines[0].id;
    return state.machines[0];
  }

  /* 경로 접근 */
  function getPath(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }
  function setPath(obj, path, value) {
    var parts = path.split('.');
    var last = parts.pop();
    var target = parts.reduce(function (o, k) { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; return o[k]; }, obj);
    target[last] = value;
  }

  function machineLabel(m, i) {
    var t = m.info.type === '기타' ? (m.info.typeEtc || '기타') : (m.info.type || '기종 미입력');
    var name = [t, m.info.maker, m.info.model].filter(Boolean).join(' ');
    return (i + 1) + '. ' + name;
  }
  function typeName(m) { return m.info.type === '기타' ? (m.info.typeEtc || '기타') : m.info.type; }
  function checkItems(m) {
    var extra = BY_TYPE[m.info.type] || OTHER;
    return COMMON.concat(extra);
  }

  /* 화면 그리기 */
  function renderMachineSelect() {
    var sel = $('#machine-select');
    if (!sel) return;
    sel.innerHTML = state.machines.map(function (m, i) {
      return '<option value="' + esc(m.id) + '"' + (m.id === state.activeId ? ' selected' : '') + '>' + esc(machineLabel(m, i)) + '</option>';
    }).join('');
    var count = $('#machine-count');
    if (count) count.textContent = '이 기기에 기록된 기계 ' + state.machines.length + '대';
  }

  function fillStatic() {
    var m = current();
    $$('[data-k]').forEach(function (el) {
      var v = getPath(m, el.getAttribute('data-k'));
      el.value = v == null ? '' : v;
    });
    toggleTypeEtc();
  }
  function toggleTypeEtc() {
    var box = $('#type-etc-box');
    if (box) box.hidden = current().info.type !== '기타';
  }

  function renderChecks() {
    var m = current();
    var wrap = $('#check-list');
    var items = checkItems(m);
    var label = typeName(m);
    $('#check-type-note').textContent = m.info.type
      ? '공통 항목 ' + COMMON.length + '개와 ' + (BY_TYPE[m.info.type] ? label + ' 항목' : '기타 기종 항목') + ' ' + (items.length - COMMON.length) + '개를 보여 줍니다.'
      : '기계 정보에서 기종을 고르면 트랙터·콤바인·이앙기·경운기별 점검 항목이 추가됩니다.';
    wrap.innerHTML = items.map(function (it, idx) {
      var id = it[0];
      var val = m.handover.checks[id] || '';
      var note = m.handover.notes[id] || '';
      var radios = STATUS.map(function (s) {
        return '<label class="seg seg-' + s[0] + '"><input type="radio" name="chk-' + id + '" value="' + s[0] + '" data-check="' + id + '"' + (val === s[0] ? ' checked' : '') + '><span>' + s[1] + '</span></label>';
      }).join('');
      return '<li class="check-item' + (val === 'bad' ? ' is-bad' : '') + '"><fieldset><legend><span class="num">' + (idx + 1) + '</span>' + esc(it[1]) + '</legend>' +
        '<div class="segs">' + radios + '</div>' +
        '<label class="note"><span class="sr">' + esc(it[1]) + ' 메모</span><input type="text" maxlength="' + MAX_LINE + '" placeholder="본 것·들은 것 메모(선택)" data-note="' + id + '" value="' + esc(note) + '"></label>' +
        '</fieldset></li>';
    }).join('');
    var ph = $('#photo-list');
    ph.innerHTML = PHOTOS.map(function (p) {
      return '<li><label class="row"><input type="checkbox" data-photo="' + p[0] + '"' + (m.handover.photos[p[0]] ? ' checked' : '') + '><span>' + esc(p[1]) + '</span></label></li>';
    }).join('');
  }

  function opt(list, val) {
    var has = !val || list.indexOf(val) >= 0;
    return '<option value="">선택</option>' + list.map(function (o) {
      return '<option' + (o === val ? ' selected' : '') + '>' + esc(o) + '</option>';
    }).join('') + (has ? '' : '<option selected>' + esc(val) + '</option>');
  }
  function field(label, wide, input) {
    return '<label class="field' + (wide ? ' wide' : '') + '"><span>' + label + '</span>' + input + '</label>';
  }
  function inp(list, row, key, extra) {
    return '<input type="' + (extra && extra.type || 'text') + '" data-list="' + list + '" data-id="' + esc(row.id) + '" data-f="' + key + '" value="' + esc(row[key]) + '" maxlength="' + MAX_LINE + '"' + (extra && extra.attrs || '') + '>';
  }
  function area(list, row, key, ph) {
    return '<textarea data-list="' + list + '" data-id="' + esc(row.id) + '" data-f="' + key + '" maxlength="' + MAX_TEXT + '" placeholder="' + esc(ph || '') + '">' + esc(row[key]) + '</textarea>';
  }
  function sel(list, row, key, options) {
    return '<select data-list="' + list + '" data-id="' + esc(row.id) + '" data-f="' + key + '">' + opt(options, row[key]) + '</select>';
  }

  function renderMaintenance() {
    var m = current();
    var box = $('#maint-list');
    if (!m.maintenance.length) {
      box.innerHTML = '<p class="empty">아직 정비 기록이 없습니다. 오일 교환처럼 작은 작업도 날짜와 계기 시간을 함께 적어 두면 다음 정비와 판매 때 설명하기 쉽습니다.</p>';
      return;
    }
    box.innerHTML = m.maintenance.map(function (r, i) {
      return '<article class="entry"><div class="entry-head"><h3>정비 ' + (i + 1) + '</h3><button type="button" class="btn danger small-btn" data-del="maintenance" data-id="' + esc(r.id) + '">이 기록 삭제</button></div><div class="fields">' +
        field('날짜', false, inp('maintenance', r, 'date', { type: 'date' })) +
        field('계기 시간(시간)', false, inp('maintenance', r, 'hours', { attrs: ' inputmode="decimal" placeholder="예: 1250"' })) +
        field('구분', false, sel('maintenance', r, 'kind', M_KINDS)) +
        field('정비업체·작업자', false, inp('maintenance', r, 'shop')) +
        field('작업 내용', true, area('maintenance', r, 'work', '실제로 한 작업과 교체한 부품. 추정 원인은 따로 적기')) +
        field('비용(원)', false, inp('maintenance', r, 'cost', { attrs: ' inputmode="numeric" placeholder="영수증 금액"' })) +
        field('영수증·사진 보관 위치', false, inp('maintenance', r, 'proof', { attrs: ' placeholder="예: 휴대폰 앨범 \'트랙터 정비\', 서랍 파일"' })) +
        '</div></article>';
    }).join('');
  }

  function renderIncidents() {
    var m = current();
    var box = $('#inc-list');
    if (!m.incidents.length) {
      box.innerHTML = '<p class="empty">사고 기록이 없습니다. 사고가 나면 안전 조치와 신고를 먼저 하고, 정리된 뒤 여기에 사실을 적으세요.</p>';
      return;
    }
    box.innerHTML = m.incidents.map(function (r, i) {
      return '<article class="entry"><div class="entry-head"><h3>사고 ' + (i + 1) + '</h3><button type="button" class="btn danger small-btn" data-del="incidents" data-id="' + esc(r.id) + '">이 기록 삭제</button></div><div class="fields">' +
        field('날짜·시각', false, inp('incidents', r, 'date', { attrs: ' placeholder="예: 2026-10-26 오후 3시"' })) +
        field('장소', false, inp('incidents', r, 'place', { attrs: ' placeholder="예: ○○리 농로 내리막"' })) +
        field('사고 종류', false, sel('incidents', r, 'kind', I_KINDS)) +
        field('처리 상태', false, sel('incidents', r, 'status', I_STATUS)) +
        field('기계 손상', true, area('incidents', r, 'damage', '눈으로 확인한 손상 부위. 추정 원인은 "추정"이라고 표시')) +
        field('사람·남의 재산 피해와 신고', true, area('incidents', r, 'people', '부상자, 상대 차량·시설 피해, 119·112 신고 여부')) +
        field('보험 접수번호·담당 창구', false, inp('incidents', r, 'report')) +
        field('사진·견적서 보관 위치', false, inp('incidents', r, 'proof')) +
        '</div></article>';
    }).join('');
  }

  function renderQA() {
    var m = current();
    var box = $('#qa-list');
    if (!m.insurance.qa.length) {
      box.innerHTML = '<p class="empty">보험사·창구에 물어본 내용이 없습니다. <a href="/guides/used-farm-machinery-insurance-check/">가입 전 질문표</a>의 답변을 이곳으로 보낼 수도 있습니다.</p>';
      return;
    }
    box.innerHTML = m.insurance.qa.map(function (r, i) {
      return '<article class="entry"><div class="entry-head"><h3>문의 ' + (i + 1) + '</h3><button type="button" class="btn danger small-btn" data-del="qa" data-id="' + esc(r.id) + '">이 기록 삭제</button></div><div class="fields">' +
        field('문의 날짜', false, inp('qa', r, 'date', { type: 'date' })) +
        field('문의한 곳·담당', false, inp('qa', r, 'who', { attrs: ' placeholder="예: ○○농협 보험 창구"' })) +
        field('질문', true, area('qa', r, 'q')) +
        field('답변(들은 그대로)', true, area('qa', r, 'a', '약관 조항이나 서류 이름을 들었다면 함께 적기')) +
        '</div></article>';
    }).join('');
  }

  function listOf(name) {
    var m = current();
    return name === 'qa' ? m.insurance.qa : m[name];
  }

  /* 기록 점검 결과 */
  function renderSummary() {
    var m = current();
    var out = [];
    function add(level, html) { out.push({ level: level, html: html }); }
    var info = m.info;

    if (!info.type || !info.model) add('todo', '<strong>기계 정보</strong>: 기종과 모델명을 먼저 적어 주세요. <a href="#info">기계 정보로 가기</a>');
    if (!info.serial) add('todo', '<strong>제조번호</strong>가 비어 있습니다. 명판 사진과 대조해 적어 두면 보험사·정비업체·구매자에게 같은 기계라는 것을 설명하기 쉽습니다.');
    if (info.type && info.model && info.serial) add('ok', '<strong>기계 정보</strong>: 기종·모델·제조번호가 적혀 있습니다.');

    var items = checkItems(m);
    var ok = 0, bad = [], na = 0, none = 0;
    items.forEach(function (it) {
      var v = m.handover.checks[it[0]];
      if (v === 'ok') ok++; else if (v === 'bad') bad.push(it[1]); else if (v === 'na') na++; else none++;
    });
    if (none === items.length) {
      add('todo', '<strong>인수 상태 점검</strong>: 아직 표시한 항목이 없습니다. 인수 때 확인한 것만 양호·이상 있음·확인 못 함으로 표시하세요. <a href="#handover">점검표로 가기</a>');
    } else {
      add(bad.length ? 'warn' : 'ok', '<strong>인수 상태 점검</strong>: ' + items.length + '개 중 양호 ' + ok + '개, 이상 있음 ' + bad.length + '개, 확인 못 함 ' + na + '개, 표시 안 함 ' + none + '개.' +
        (bad.length ? ' 이상 있음: ' + bad.map(esc).join(', ') + '. 수리했다면 정비 이력에, 판매자와 합의했다면 인수 메모에 남기세요.' : ''));
    }
    var photoCount = PHOTOS.filter(function (p) { return m.handover.photos[p[0]]; }).length;
    add(photoCount === PHOTOS.length ? 'ok' : 'todo', '<strong>인수 사진</strong>: 권장 ' + PHOTOS.length + '종 중 ' + photoCount + '종을 찍었다고 표시했습니다.' + (photoCount < PHOTOS.length ? ' 원본 파일은 휴대폰 앨범과 다른 곳에 한 번 더 보관하세요.' : ''));

    var hHours = num(m.handover.hours);
    var maint = m.maintenance;
    if (!maint.length) {
      add('todo', '<strong>정비 이력</strong>: 기록이 없습니다. <a href="#maintenance">정비 기록 추가</a>');
    } else {
      var dated = maint.filter(function (r) { return parseDate(r.date); }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      var last = dated[dated.length - 1];
      var costs = maint.map(function (r) { return num(r.cost); }).filter(function (n) { return n !== null; });
      var total = costs.reduce(function (a, b) { return a + b; }, 0);
      add('ok', '<strong>정비 이력</strong>: ' + maint.length + '건' + (last ? ', 마지막 기록 ' + esc(last.date) + (last.hours ? ' (계기 ' + esc(last.hours) + '시간)' : '') : '') + '.' +
        (costs.length ? ' 비용을 적은 ' + costs.length + '건의 합계는 ' + fmtWon(total) + '입니다(입력한 영수증 금액 기준).' : ''));
      var badCost = maint.filter(function (r) { return r.cost && num(r.cost) === null; }).length;
      if (badCost) add('warn', '비용 칸 ' + badCost + '곳에 숫자가 아닌 글자가 있어 합계에서 뺐습니다. 금액은 숫자만 적어 주세요(쉼표는 괜찮습니다).');
      if (hHours !== null) {
        var hDate = parseDate(m.handover.date) || parseDate(info.acquiredOn);
        var lower = maint.filter(function (r) {
          var h = num(r.hours);
          if (h === null || h >= hHours) return false;
          var d = parseDate(r.date);
          return !(hDate && d && d < hDate); /* 인수 전 날짜(이전 소유자)의 기록은 빼고 셉니다 */
        }).length;
        if (lower) add('warn', '정비 기록 ' + lower + '건의 계기 시간이 인수 때(' + esc(m.handover.hours) + '시간)보다 작습니다. 입력 실수인지, 계기판을 교체했는지 확인해 메모해 두세요.');
      }
    }

    var open = m.incidents.filter(function (r) { return r.status && r.status !== '처리 끝남' && r.status !== '보험 접수 안 함'; });
    if (m.incidents.length) {
      add(open.length ? 'warn' : 'ok', '<strong>사고 기록</strong>: ' + m.incidents.length + '건' + (open.length ? ', 그중 ' + open.length + '건은 아직 처리 중으로 표시돼 있습니다. 접수번호와 담당 창구, 받은 안내를 적어 두세요.' : '.'));
      var noReport = m.incidents.filter(function (r) { return r.status === '보험사 접수함' && !r.report; }).length;
      if (noReport) add('warn', '보험사에 접수했다고 표시한 사고 ' + noReport + '건에 접수번호가 없습니다.');
    }

    var ins = m.insurance;
    var hasIns = ins.insurer || ins.product || ins.start || ins.end || ins.coverage;
    if (!hasIns) {
      add('todo', '<strong>보험 확인 메모</strong>가 비어 있습니다. 가입했다면 증권에 적힌 그대로 옮겨 적고, 가입 전이라면 <a href="/guides/used-farm-machinery-insurance-check/">가입 전 질문표</a>로 물어볼 내용을 정리하세요.');
    } else {
      var s = parseDate(ins.start), e = parseDate(ins.end);
      if (s && e && e < s) {
        add('warn', '보험기간 종료일이 시작일보다 앞서 있습니다. 증권의 날짜를 다시 확인해 주세요.');
      } else if (e) {
        var d = daysFromToday(ins.end);
        if (d < 0) add('warn', '<strong>보험기간</strong>: 적어 둔 종료일(' + esc(ins.end) + ')이 ' + (-d) + '일 지났습니다. 갱신했는지 증권이나 보험사에서 확인하고 새 기간을 적어 두세요.');
        else if (d <= 30) add('warn', '<strong>보험기간</strong>: 적어 둔 종료일(' + esc(ins.end) + ')까지 ' + d + '일 남았습니다. 갱신 여부와 보장 공백이 없는지 보험사에 확인하세요.');
        else add('ok', '<strong>보험기간</strong>: 적어 둔 종료일(' + esc(ins.end) + ')까지 ' + d + '일 남았습니다.');
      } else {
        add('todo', '증권의 보험기간 종료일을 적어 두면 남은 날짜를 이곳에 보여 드립니다.');
      }
      if (!ins.claimContact) add('todo', '사고 접수 창구·연락처를 증권이나 보험사 안내에서 찾아 적어 두면 사고 때 바로 찾을 수 있습니다.');
    }
    if (!state.lastExportAt) add('todo', '<strong>백업</strong>: 아직 백업 파일을 내려받지 않았습니다. 이 기록은 이 기기에만 있으니 <a href="#export">백업 파일</a>을 받아 두세요.');
    else {
      var since = Math.round((Date.now() - new Date(state.lastExportAt).getTime()) / 86400000);
      if (since > 30) add('todo', '<strong>백업</strong>: 마지막 백업 파일을 받은 지 ' + since + '일이 지났습니다.');
    }

    var order = { warn: 0, todo: 1, ok: 2 };
    out.sort(function (a, b) { return order[a.level] - order[b.level]; });
    var labels = { warn: '확인 필요', todo: '채울 곳', ok: '기록됨' };
    $('#summary-list').innerHTML = out.map(function (o) {
      return '<li class="sum-' + o.level + '"><span class="chip">' + labels[o.level] + '</span><span>' + o.html + '</span></li>';
    }).join('');
  }

  function renderAll() {
    renderMachineSelect();
    fillStatic();
    renderChecks();
    renderMaintenance();
    renderIncidents();
    renderQA();
    renderSummary();
  }

  /* 인쇄용 화면 */
  function line(label, value) {
    return '<tr><th>' + esc(label) + '</th><td>' + (value ? esc(value).replace(/\n/g, '<br>') : '&nbsp;') + '</td></tr>';
  }
  function printHTML(m, blank) {
    var e = blank ? function () { return ''; } : function (v) { return v; };
    var info = m.info, h = m.handover, ins = m.insurance;
    var title = blank ? '농기계 자산 기록부 (현장용 빈 양식)' : '농기계 자산 기록부 — ' + ([typeName(m), info.maker, info.model].filter(Boolean).join(' ') || '이름 없는 기계');
    var html = '<h1>' + esc(title) + '</h1><p class="pv-meta">출력일 ' + today() + ' · 농기계 자산 수첩(megapureunasset.kr) · 이 기록은 작성자가 확인한 사실을 정리한 것이며 시세·보험료·보상 여부를 판단하지 않습니다.</p>';
    html += '<h2>1. 기계 정보</h2><table class="pv">' +
      line('기종', e(typeName(m))) + line('제조사·모델', e([info.maker, info.model].filter(Boolean).join(' '))) +
      line('제조연도', e(info.year)) + line('제조번호(차대번호)', e(info.serial)) + line('엔진번호', e(info.engineNo)) +
      line('마력·규격', e(info.spec)) + line('구입(인수)일', e(info.acquiredOn)) + line('구입 경로', e(info.acquiredHow)) +
      line('판매처·거래 상대', e(info.acquiredFrom)) + line('지급 금액(원)', e(info.price)) + line('작업기·부속품', e(info.attachments)) +
      line('보관 장소', e(info.storage)) + line('원본 증빙 보관 위치', e(info.docs)) + line('메모', e(info.memo)) + '</table>';
    html += '<h2>2. 인수 상태 점검</h2><table class="pv">' + line('점검일', e(h.date)) + line('장소', e(h.place)) + line('계기 시간', e(h.hours)) + '</table>';
    var items = blank ? COMMON.concat([['b1', ''], ['b2', ''], ['b3', ''], ['b4', '']]) : checkItems(m);
    html += '<table class="pv grid"><thead><tr><th>점검 항목</th><th>결과</th><th>메모</th></tr></thead><tbody>' + items.map(function (it) {
      var v = blank ? '' : (h.checks[it[0]] || '');
      var res = blank ? '□양호 □이상 □확인 못 함' : (v ? STATUS.filter(function (s) { return s[0] === v; })[0][1] : '표시 안 함');
      return '<tr><td>' + (it[1] ? esc(it[1]) : '&nbsp;') + '</td><td>' + res + '</td><td>' + esc(blank ? '' : (h.notes[it[0]] || '')) + '&nbsp;</td></tr>';
    }).join('') + '</tbody></table>';
    html += '<p class="pv-photos"><strong>인수 사진:</strong> ' + PHOTOS.map(function (p) { return (!blank && h.photos[p[0]] ? '■' : '□') + esc(p[1]); }).join(' &nbsp; ') + '</p>';
    html += '<table class="pv">' + line('인수 때 합의·특이사항', e(h.memo)) + '</table>';
    var maint = blank ? [{}, {}, {}, {}, {}, {}, {}, {}] : m.maintenance.slice().sort(function (a, b) { return (a.date || '9') < (b.date || '9') ? -1 : 1; });
    html += '<h2>3. 정비 이력</h2>' + (maint.length ? '<table class="pv grid"><thead><tr><th>날짜</th><th>계기 시간</th><th>구분</th><th>작업 내용</th><th>업체</th><th>비용(원)</th><th>증빙 위치</th></tr></thead><tbody>' + maint.map(function (r) {
      return '<tr><td>' + esc(r.date) + '&nbsp;</td><td>' + esc(r.hours) + '</td><td>' + esc(r.kind) + '</td><td>' + esc(r.work).replace(/\n/g, '<br>') + '</td><td>' + esc(r.shop) + '</td><td>' + esc(r.cost) + '</td><td>' + esc(r.proof) + '</td></tr>';
    }).join('') + '</tbody></table>' : '<p>기록 없음</p>');
    var inc = blank ? [{}, {}, {}] : m.incidents;
    html += '<h2>4. 사고 기록</h2>' + (inc.length ? '<table class="pv grid"><thead><tr><th>날짜·시각</th><th>장소</th><th>종류</th><th>기계 손상</th><th>사람·재산 피해, 신고</th><th>접수번호·창구</th><th>상태</th></tr></thead><tbody>' + inc.map(function (r) {
      return '<tr><td>' + esc(r.date) + '&nbsp;</td><td>' + esc(r.place) + '</td><td>' + esc(r.kind) + '</td><td>' + esc(r.damage).replace(/\n/g, '<br>') + '</td><td>' + esc(r.people).replace(/\n/g, '<br>') + '</td><td>' + esc(r.report) + '</td><td>' + esc(r.status) + '</td></tr>';
    }).join('') + '</tbody></table>' : '<p>기록 없음</p>');
    html += '<h2>5. 보험 확인 메모</h2><p class="pv-meta">증권·약관에 적힌 내용을 옮겨 적은 메모입니다. 보장 여부는 보험사 안내와 약관이 기준입니다.</p><table class="pv">' +
      line('보험사', e(ins.insurer)) + line('상품명(증권 표기)', e(ins.product)) + line('증권번호', e(ins.policyNo)) +
      line('보험기간', blank || (!ins.start && !ins.end) ? '' : (ins.start || '(시작일 미기록)') + ' ~ ' + (ins.end || '(종료일 미기록)')) + line('가입 담보(증권 표기)', e(ins.coverage)) +
      line('자기부담금(증권·약관 표기)', e(ins.deductible)) + line('작업기·부속품 포함 여부', e(ins.implCovered)) +
      line('사고 접수 창구·연락처', e(ins.claimContact)) + line('메모', e(ins.memo)) + '</table>';
    var qa = blank ? [{}, {}] : ins.qa;
    if (qa.length) html += '<table class="pv grid"><thead><tr><th>날짜</th><th>문의한 곳</th><th>질문</th><th>답변</th></tr></thead><tbody>' + qa.map(function (r) {
      return '<tr><td>' + esc(r.date) + '&nbsp;</td><td>' + esc(r.who) + '</td><td>' + esc(r.q).replace(/\n/g, '<br>') + '</td><td>' + esc(r.a).replace(/\n/g, '<br>') + '</td></tr>';
    }).join('') + '</tbody></table>';
    html += '<p class="pv-meta">공유하거나 매수자에게 보여 줄 때는 주소·연락처·증권번호처럼 필요 없는 개인정보를 가리세요.</p>';
    return html;
  }
  var printBlank = false;
  function preparePrint() {
    var pv = $('#print-view');
    pv.innerHTML = printHTML(current(), printBlank);
  }
  function doPrint(blank) {
    printBlank = !!blank;
    preparePrint();
    window.print();
    setTimeout(function () { printBlank = false; }, 1000);
  }

  /* 내보내기 */
  function download(name, text, type) {
    var blob = new Blob([text], { type: type });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }
  function stamp() { return today().replace(/-/g, ''); }
  function safeName(s) { return (s || '').replace(/[\\/:*?"<>|\s]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); }
  function exportJSON() {
    state.lastExportAt = new Date().toISOString();
    var data = { app: APP, version: 1, exportedAt: state.lastExportAt, machines: state.machines };
    download('농기계기록부-백업-' + stamp() + '.json', JSON.stringify(data, null, 2), 'application/json');
    saveNow();
    renderSummary();
    setExportMsg('백업 파일(기계 ' + state.machines.length + '대)을 내려받았습니다. 휴대폰이면 "다운로드" 폴더나 파일 앱에서 확인하세요.');
  }
  function csvCell(v) { return '"' + str(v, 20000).replace(/"/g, '""') + '"'; }
  function exportCSV() {
    var m = current();
    var rows = [];
    function r(arr) { rows.push(arr.map(csvCell).join(',')); }
    r(['농기계 자산 기록부', typeName(m), m.info.maker, m.info.model, '출력일 ' + today()]);
    r([]);
    r(['[기계 정보]', '내용']);
    [['기종', typeName(m)], ['제조사', m.info.maker], ['모델', m.info.model], ['제조연도', m.info.year], ['제조번호', m.info.serial], ['엔진번호', m.info.engineNo], ['마력·규격', m.info.spec], ['구입(인수)일', m.info.acquiredOn], ['구입 경로', m.info.acquiredHow], ['판매처·거래 상대', m.info.acquiredFrom], ['지급 금액(원)', m.info.price], ['작업기·부속품', m.info.attachments], ['보관 장소', m.info.storage], ['원본 증빙 위치', m.info.docs], ['메모', m.info.memo]].forEach(r);
    r([]);
    r(['[인수 상태 점검]', '결과', '메모']);
    r(['점검일 ' + m.handover.date, '장소 ' + m.handover.place, '계기 시간 ' + m.handover.hours]);
    checkItems(m).forEach(function (it) {
      var v = m.handover.checks[it[0]];
      r([it[1], v ? STATUS.filter(function (s) { return s[0] === v; })[0][1] : '표시 안 함', m.handover.notes[it[0]] || '']);
    });
    r(['인수 때 합의·특이사항', m.handover.memo]);
    r([]);
    r(['[정비 이력]', '계기 시간', '구분', '작업 내용', '업체', '비용(원)', '증빙 위치']);
    m.maintenance.forEach(function (x) { r([x.date, x.hours, x.kind, x.work, x.shop, x.cost, x.proof]); });
    r([]);
    r(['[사고 기록]', '장소', '종류', '기계 손상', '사람·재산 피해와 신고', '접수번호·창구', '상태', '증빙 위치']);
    m.incidents.forEach(function (x) { r([x.date, x.place, x.kind, x.damage, x.people, x.report, x.status, x.proof]); });
    r([]);
    r(['[보험 확인 메모]', '내용']);
    [['보험사', m.insurance.insurer], ['상품명', m.insurance.product], ['증권번호', m.insurance.policyNo], ['보험 시작일', m.insurance.start], ['보험 종료일', m.insurance.end], ['가입 담보(증권 표기)', m.insurance.coverage], ['자기부담금', m.insurance.deductible], ['작업기·부속품 포함 여부', m.insurance.implCovered], ['사고 접수 창구', m.insurance.claimContact], ['메모', m.insurance.memo]].forEach(r);
    r(['[보험 문의]', '문의한 곳', '질문', '답변']);
    m.insurance.qa.forEach(function (x) { r([x.date, x.who, x.q, x.a]); });
    var name = safeName([typeName(m), m.info.model].filter(Boolean).join('-')) || '기계';
    download('농기계기록부-' + name + '-' + stamp() + '.csv', '﻿' + rows.join('\r\n'), 'text/csv;charset=utf-8');
    setExportMsg('표 파일(CSV)을 내려받았습니다. 엑셀이나 한셀에서 열 수 있습니다. 다시 불러오기는 백업 파일(JSON)로만 됩니다.');
  }
  function setExportMsg(msg, err) {
    var el = $('#export-status');
    el.textContent = msg;
    el.className = 'status' + (err ? ' err' : '');
  }
  function importFile(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setExportMsg('파일이 너무 큽니다(5MB 초과). 이 기록부에서 내려받은 백업 파일인지 확인하세요.', true); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var data;
      try { data = JSON.parse(String(reader.result).replace(/^﻿/, '')); } catch (e) { setExportMsg('백업 파일을 읽지 못했습니다. 이 기록부에서 내려받은 .json 파일을 골라 주세요.', true); return; }
      if (!data || data.app !== APP || !Array.isArray(data.machines)) { setExportMsg('농기계 자산 기록부의 백업 파일이 아닙니다. 표 파일(CSV)은 불러올 수 없습니다.', true); return; }
      var seen = {};
      var incoming = data.machines.slice(0, 200).filter(function (x) {
        return x && typeof x === 'object' && !Array.isArray(x);
      }).map(normMachine).filter(function (m) { return !isEmptyMachine(m); });
      incoming.forEach(function (m) { if (seen[m.id]) m.id = uid(); seen[m.id] = true; });
      if (!incoming.length) { setExportMsg('백업 파일에 불러올 기계 기록이 없습니다. 이 기기의 기록은 그대로입니다.', true); return; }
      var same = incoming.filter(function (m) { return findMachine(m.id); });
      var changed = same.filter(function (m) { return contentOf(findMachine(m.id)) !== contentOf(m); });
      if (changed.length) {
        var newer = changed.filter(function (m) { return str(findMachine(m.id).updatedAt) > str(m.updatedAt); }).length;
        var ask = '백업 파일의 기계 ' + changed.length + '대는 이 기기에 이미 있는 기록이며 내용이 다릅니다. 불러오면 이 기기의 내용이 백업 내용으로 바뀝니다.' +
          (newer ? ' 그중 ' + newer + '대는 이 기기의 기록이 백업보다 나중에 고쳐져 있어, 최근에 고친 내용이 사라집니다.' : '') + ' 계속할까요?';
        if (!window.confirm(ask)) { setExportMsg('불러오기를 취소했습니다. 이 기기의 기록은 그대로입니다.'); return; }
      }
      var replaced = 0;
      var importedAt = new Date().toISOString();
      incoming.forEach(function (m) {
        m.updatedAt = importedAt;
        var idx = -1;
        state.machines.forEach(function (x, i) { if (x.id === m.id) idx = i; });
        if (idx >= 0) { state.machines[idx] = m; replaced++; } else state.machines.push(m);
        dirty[m.id] = true;
      });
      state.machines = state.machines.filter(function (m) {
        var drop = state.machines.length > 1 && isEmptyMachine(m) && incoming.indexOf(m) < 0;
        if (drop) removed[m.id] = true;
        return !drop;
      });
      state.activeId = incoming[0].id;
      var saved = saveNow();
      renderAll();
      if (!saved) { setExportMsg('기록은 화면에 불러왔지만 이 기기에 저장하지 못했습니다(저장 공간 부족 또는 저장 차단). 창을 닫기 전에 백업 파일로 다시 내려받아 두세요.', true); return; }
      setExportMsg('기계 ' + incoming.length + '대의 기록을 불러왔습니다' + (replaced ? '(같은 기록 ' + replaced + '대는 백업 내용으로 바꿈)' : '') + '.');
    };
    reader.onerror = function () { setExportMsg('파일을 여는 중 문제가 생겼습니다. 다시 시도해 주세요.', true); };
    reader.readAsText(file);
  }
  function findMachine(id) {
    for (var i = 0; i < state.machines.length; i++) if (state.machines[i].id === id) return state.machines[i];
    return null;
  }
  function contentOf(m) {
    var c = normMachine(m);
    c.createdAt = ''; c.updatedAt = '';
    return JSON.stringify(c);
  }
  function isEmptyMachine(m) {
    var hasInfo = Object.keys(m.info).some(function (k) { return m.info[k]; });
    var hasHand = HAND_KEYS.some(function (k) { return m.handover[k]; }) || Object.keys(m.handover.checks).length || Object.keys(m.handover.photos).some(function (k) { return m.handover.photos[k]; });
    var hasIns = INS_KEYS.some(function (k) { return m.insurance[k]; }) || m.insurance.qa.length;
    return !hasInfo && !hasHand && !hasIns && !m.maintenance.length && !m.incidents.length;
  }

  /* 이벤트 */
  function bind() {
    document.addEventListener('input', onEdit);
    document.addEventListener('change', onEdit);
    document.addEventListener('focusout', function (ev) {
      var el = ev.target;
      if (el.getAttribute && (el.getAttribute('data-f') === 'cost' || el.getAttribute('data-k') === 'info.price')) {
        var n = num(el.value);
        if (n !== null && el.value !== n.toLocaleString('ko-KR')) { el.value = n.toLocaleString('ko-KR'); onEdit({ target: el, type: 'input' }); }
      }
    });
    document.addEventListener('click', function (ev) {
      var t = ev.target.closest ? ev.target.closest('[data-del]') : null;
      if (!t) return;
      var list = listOf(t.getAttribute('data-del'));
      var id = t.getAttribute('data-id');
      if (!window.confirm('이 기록을 지울까요? 지운 뒤에는 되돌릴 수 없습니다.')) return;
      for (var i = 0; i < list.length; i++) if (list[i].id === id) { list.splice(i, 1); break; }
      rerenderList(t.getAttribute('data-del'));
      scheduleSave();
    });
    $('#machine-select').addEventListener('change', function () {
      state.activeId = this.value;
      saveNow();
      renderAll();
    });
    $('#add-machine').addEventListener('click', function () {
      var m = blankMachine();
      state.machines.push(m);
      state.activeId = m.id;
      dirty[m.id] = true;
      saveNow();
      renderAll();
      var first = $('[data-k="info.type"]');
      if (first) first.focus();
      setStatus('새 기계를 추가했습니다. 기종부터 골라 주세요.');
    });
    $('#delete-machine').addEventListener('click', function () {
      var m = current();
      var label = machineLabel(m, state.machines.indexOf(m));
      if (!window.confirm('"' + label + '" 기록을 이 기기에서 지울까요? 백업 파일이 없으면 되돌릴 수 없습니다.')) return;
      state.machines = state.machines.filter(function (x) { return x.id !== m.id; });
      removed[m.id] = true;
      delete dirty[m.id];
      if (!state.machines.length) state.machines.push(blankMachine());
      state.activeId = state.machines[0].id;
      saveNow();
      renderAll();
      setStatus('기계 기록을 지웠습니다.');
    });
    $('#add-maint').addEventListener('click', function () {
      current().maintenance.push({ id: uid(), date: today(), hours: '', kind: '', work: '', shop: '', cost: '', proof: '' });
      renderMaintenance(); scheduleSave(); focusLast('#maint-list');
    });
    $('#add-inc').addEventListener('click', function () {
      current().incidents.push({ id: uid(), date: today(), place: '', kind: '', damage: '', people: '', report: '', status: '', proof: '' });
      renderIncidents(); scheduleSave(); focusLast('#inc-list');
    });
    $('#add-qa').addEventListener('click', function () {
      current().insurance.qa.push({ id: uid(), date: today(), who: '', q: '', a: '' });
      renderQA(); scheduleSave(); focusLast('#qa-list');
    });
    $('#print-record').addEventListener('click', function () { doPrint(false); });
    $('#print-blank').addEventListener('click', function () { doPrint(true); });
    $('#export-json').addEventListener('click', exportJSON);
    $('#export-csv').addEventListener('click', exportCSV);
    $('#import-json').addEventListener('change', function () { importFile(this.files && this.files[0]); this.value = ''; });
    $('#clear-all').addEventListener('click', function () {
      if (!window.confirm('이 기기에 저장된 농기계 기록을 모두 지울까요? 질문표·사고 기록표에 적은 체크와 메모도 함께 지워집니다. 백업 파일이 없으면 되돌릴 수 없습니다.')) return;
      try {
        var keys = [];
        for (var i = 0; i < window.localStorage.length; i++) keys.push(window.localStorage.key(i));
        keys.forEach(function (k) { if (k && (k.indexOf(KEY + '-') === 0 || k.indexOf('mpa-sheet-') === 0)) window.localStorage.removeItem(k); });
      } catch (e) { /* 저장소 없음 */ }
      state = { app: APP, version: 1, activeId: '', machines: [blankMachine()], lastExportAt: '' };
      state.activeId = state.machines[0].id;
      dirty = {};
      removed = {};
      lastSeen = readRaw();
      saveNow();
      renderAll();
      setExportMsg('이 기기의 기록을 모두 지웠습니다.');
    });
    window.addEventListener('beforeprint', function () { if (!$('#print-view').innerHTML || !printBlank) preparePrint(); });
    window.addEventListener('pagehide', flushSave);
    window.addEventListener('beforeunload', flushSave);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flushSave(); });
    window.addEventListener('storage', onOtherWindowSave);
  }
  /* 다른 창(탭)이 저장했을 때: 그쪽 내용을 받되, 이 창에서 아직 저장하지 않은 기계는 이 창 내용을 지키고,
     이 창에서 보고 있던 기계를 그대로 보여 줍니다. */
  function onOtherWindowSave(ev) {
    if (ev.key !== KEY && ev.key !== null) return;
    var raw = readRaw();
    if (raw === lastSeen) return;
    var latest = parseState(raw);
    if (latest === false) return;
    var focus = focusKey(document.activeElement);
    var caret = null;
    try { caret = [document.activeElement.selectionStart, document.activeElement.selectionEnd]; } catch (e) { caret = null; }
    var kept = mergeWith(latest);
    lastSeen = raw;
    if (kept) saveNow();
    renderAll();
    if (focus) {
      var el = null;
      try { el = document.querySelector(focus); } catch (e) { el = null; }
      if (el && el !== document.activeElement) {
        el.focus({ preventScroll: true });
        try { if (caret && caret[0] !== null) el.setSelectionRange(caret[0], caret[1]); } catch (e) { /* 날짜·선택 칸 */ }
      }
    }
    setStatus(kept ? '다른 창에서 바뀐 기록을 합쳐 저장했습니다.' : '다른 창에서 바뀐 기록을 불러왔습니다.');
  }
  function focusKey(el) {
    if (!el || !el.getAttribute) return null;
    var q = function (v) { return '"' + String(v).replace(/["\\]/g, '\\$&') + '"'; };
    var simple = ['data-k', 'data-note', 'data-photo'];
    for (var i = 0; i < simple.length; i++) if (el.getAttribute(simple[i])) return '[' + simple[i] + '=' + q(el.getAttribute(simple[i])) + ']';
    if (el.getAttribute('data-check')) return '[data-check=' + q(el.getAttribute('data-check')) + '][value=' + q(el.value) + ']';
    if (el.getAttribute('data-list')) return '[data-list=' + q(el.getAttribute('data-list')) + '][data-id=' + q(el.getAttribute('data-id')) + '][data-f=' + q(el.getAttribute('data-f')) + ']';
    if (el.id) return '#' + el.id;
    return null;
  }
  function focusLast(sel) {
    var entries = $$(sel + ' .entry');
    var last = entries[entries.length - 1];
    if (!last) return;
    last.scrollIntoView({ block: 'center' });
    var f = last.querySelector('input,select,textarea');
    if (f) f.focus({ preventScroll: true });
  }
  function rerenderList(name) {
    if (name === 'maintenance') renderMaintenance();
    else if (name === 'incidents') renderIncidents();
    else renderQA();
  }
  function onEdit(ev) {
    var el = ev.target;
    if (!el || !el.getAttribute) return;
    var m = current();
    var k = el.getAttribute('data-k');
    if (k) {
      setPath(m, k, str(el.value, el.tagName === 'TEXTAREA' ? MAX_TEXT : MAX_LINE));
      if (k === 'info.type') { toggleTypeEtc(); if (ev.type === 'change') renderChecks(); }
      scheduleSave();
      return;
    }
    var c = el.getAttribute('data-check');
    if (c && ev.type === 'change') {
      m.handover.checks[c] = el.value;
      var li = el.closest('.check-item');
      if (li) li.classList.toggle('is-bad', el.value === 'bad');
      scheduleSave();
      return;
    }
    var n = el.getAttribute('data-note');
    if (n) { m.handover.notes[n] = str(el.value, MAX_LINE); scheduleSave(); return; }
    var p = el.getAttribute('data-photo');
    if (p && ev.type === 'change') { m.handover.photos[p] = el.checked; scheduleSave(); return; }
    var list = el.getAttribute('data-list');
    if (list) {
      var rows = listOf(list);
      var id = el.getAttribute('data-id');
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].id === id) { rows[i][el.getAttribute('data-f')] = str(el.value, el.tagName === 'TEXTAREA' ? MAX_TEXT : MAX_LINE); break; }
      }
      scheduleSave();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var app = $('#record-app');
    if (!app) return;
    app.hidden = false;
    var nojs = $('#nojs');
    if (nojs) nojs.hidden = true;
    bind();
    renderAll();
    if (!storageOK) setStatus('이 브라우저에서는 자동 저장이 되지 않습니다(사생활 보호 모드 등). 작성 후 반드시 백업 파일로 내려받으세요.', true);
    else if (loadNote) { setStatus(loadNote, true); setExportMsg(loadNote, true); }
    else setStatus(state.machines.length && !isEmptyMachine(current()) ? '이 기기에 저장된 기록을 불러왔습니다.' : '입력하면 이 기기에 자동 저장됩니다.');
  });
})();
