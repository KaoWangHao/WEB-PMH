/*
 * Giả lập các dịch vụ Apps Script trong trình duyệt để chạy thử code thật trong src/*.gs.
 * Dữ liệu giả được lưu trong localStorage (key "mockdb"); thêm ?reset vào URL để tạo lại.
 * Chỉ dùng cho phát triển local — không push lên Apps Script.
 */
(function () {
  'use strict';
  var KEY = 'mockdb';
  if (location.search.indexOf('reset') >= 0) {
    localStorage.removeItem(KEY);
    localStorage.removeItem('hs_token');
  }
  var state;
  try { state = JSON.parse(localStorage.getItem(KEY)); } catch (e) { state = null; }
  if (!state) state = { props: {}, cache: {}, books: {} };
  function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
  window.__mockSave = save;
  window.__mockIsEmpty = function () { return !state.props.DB_SPREADSHEET_ID; };

  /* ---------- SHA-256 đồng bộ ---------- */
  var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  function sha256(bytes) {
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var l = bytes.length;
    var withPad = new Uint8Array(((l + 9 + 63) >> 6) << 6);
    withPad.set(bytes);
    withPad[l] = 0x80;
    var bits = l * 8;
    var dv = new DataView(withPad.buffer);
    dv.setUint32(withPad.length - 4, bits >>> 0);
    dv.setUint32(withPad.length - 8, Math.floor(bits / 0x100000000));
    var W = new Uint32Array(64);
    for (var off = 0; off < withPad.length; off += 64) {
      for (var t = 0; t < 16; t++) W[t] = dv.getUint32(off + t * 4);
      for (t = 16; t < 64; t++) {
        var x = W[t - 15], y = W[t - 2];
        var s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
        var s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
        W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (t = 0; t < 64; t++) {
        var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
        var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        var mj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + mj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    var out = [];
    H.forEach(function (w) { out.push(w >>> 24, (w >>> 16) & 255, (w >>> 8) & 255, w & 255); });
    return out;
  }

  /* ---------- Utilities ---------- */
  window.Utilities = {
    DigestAlgorithm: { SHA_256: 'SHA_256' },
    Charset: { UTF_8: 'UTF_8' },
    computeDigest: function (alg, str) {
      return sha256(new TextEncoder().encode(String(str))).map(function (b) { return b > 127 ? b - 256 : b; });
    },
    getUuid: function () { return crypto.randomUUID(); },
    formatDate: function (date, tz, fmt) {
      var parts = {};
      new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
        .formatToParts(date).forEach(function (p) { parts[p.type] = p.value; });
      return fmt.replace('yyyy', parts.year).replace('MM', parts.month).replace('dd', parts.day)
        .replace('HH', parts.hour).replace('mm', parts.minute);
    }
  };

  window.PropertiesService = {
    getScriptProperties: function () {
      return {
        getProperty: function (k) { return state.props[k] || null; },
        setProperty: function (k, v) { state.props[k] = String(v); },
        deleteProperty: function (k) { delete state.props[k]; },
        getProperties: function () { return Object.assign({}, state.props); }
      };
    }
  };
  window.CacheService = {
    getScriptCache: function () {
      return {
        get: function (k) { return state.cache[k] || null; },
        put: function (k, v) { state.cache[k] = String(v); },
        remove: function (k) { delete state.cache[k]; }
      };
    }
  };
  window.LockService = { getScriptLock: function () { return { tryLock: function () { return true; }, releaseLock: function () {} }; } };
  window.__ownerMode = false;
  window.Session = {
    getActiveUser: function () { return { getEmail: function () { return window.__ownerMode ? 'owner@local.test' : ''; } }; },
    getEffectiveUser: function () { return { getEmail: function () { return 'owner@local.test'; } }; }
  };
  window.Logger = { log: function (m) { console.log('[Logger]', m); } };

  /* ---------- SpreadsheetApp giả ---------- */
  function Range(sheet, row, col, nr, nc) {
    this.getValues = function () {
      var out = [];
      for (var r = 0; r < nr; r++) {
        var src = sheet.data[row - 1 + r] || [];
        var line = [];
        for (var c = 0; c < nc; c++) line.push(src[col - 1 + c] == null ? '' : src[col - 1 + c]);
        out.push(line);
      }
      return out;
    };
    this.setValues = function (vals) {
      for (var r = 0; r < nr; r++) {
        while (sheet.data.length < row + r) sheet.data.push([]);
        var target = sheet.data[row - 1 + r];
        for (var c = 0; c < nc; c++) target[col - 1 + c] = vals[r][c];
      }
      return this;
    };
    this.clearContent = function () {
      for (var r = 0; r < nr; r++) {
        var target = sheet.data[row - 1 + r];
        if (target) for (var c = 0; c < nc; c++) target[col - 1 + c] = '';
      }
      return this;
    };
    this.setNumberFormat = function () { return this; };
    this.setFontWeight = function () { return this; };
  }
  function Sheet(raw) {
    this.raw = raw;
    this.data = raw.data;
    this.getName = function () { return raw.name; };
    this.getLastRow = function () {
      for (var i = raw.data.length - 1; i >= 0; i--) {
        if ((raw.data[i] || []).some(function (v) { return v !== '' && v != null; })) return i + 1;
      }
      return 0;
    };
    this.getMaxRows = function () { return Math.max(1000, raw.data.length); };
    this.getLastColumn = function () {
      return raw.data.reduce(function (m, r) {
        for (var i = (r || []).length - 1; i >= 0; i--) if (r[i] !== '' && r[i] != null) return Math.max(m, i + 1);
        return m;
      }, 0);
    };
    this.getRange = function (row, col, nr, nc) { return new Range(this, row, col, nr || 1, nc || 1); };
    this.deleteRow = function (r) { raw.data.splice(r - 1, 1); };
    this.setFrozenRows = function () {};
  }
  function Book(id) {
    var raw = state.books[id];
    this.getId = function () { return id; };
    this.getUrl = function () { return 'mock://spreadsheet/' + id; };
    this.getSheets = function () { return raw.sheets.map(function (s) { return new Sheet(s); }); };
    this.getSheetByName = function (n) {
      var s = raw.sheets.filter(function (x) { return x.name === n; })[0];
      return s ? new Sheet(s) : null;
    };
    this.insertSheet = function (n) { var s = { name: n, data: [] }; raw.sheets.push(s); return new Sheet(s); };
    this.deleteSheet = function (sh) { raw.sheets = raw.sheets.filter(function (x) { return x !== sh.raw; }); };
  }
  window.SpreadsheetApp = {
    create: function (name) {
      var id = 'mock-' + Date.now();
      state.books[id] = { name: name, sheets: [{ name: 'Sheet1', data: [] }] };
      return new Book(id);
    },
    openById: function (id) {
      if (!state.books[id]) throw new Error('Không tìm thấy spreadsheet ' + id);
      return new Book(id);
    }
  };

  /* ---------- google.script.run giả ---------- */
  function runner(ok, fail) {
    return new Proxy({}, {
      get: function (_, name) {
        if (name === 'withSuccessHandler') return function (fn) { return runner(fn, fail); };
        if (name === 'withFailureHandler') return function (fn) { return runner(ok, fn); };
        return function () {
          var args = JSON.parse(JSON.stringify(Array.prototype.slice.call(arguments)));
          setTimeout(function () {
            try {
              window.db_cache_ = null;
              var res = window[name].apply(null, args);
              save();
              if (ok) ok(res === undefined ? null : JSON.parse(JSON.stringify(res)));
            } catch (e) {
              console.error(e);
              if (fail) fail(e);
            }
          }, 120);
        };
      }
    });
  }
  window.google = { script: { run: runner(null, null) } };
})();
