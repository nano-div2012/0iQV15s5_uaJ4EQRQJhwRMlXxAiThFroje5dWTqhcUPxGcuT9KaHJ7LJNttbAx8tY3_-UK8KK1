/* Penyimpanan lokal (localStorage). Jika tidak tersedia, data hanya di memori. */
(function () {
  'use strict';
  var KEY = 'nl_dummy_v1', mem = null, subs = [];

  function seed() {
    var names = [['Rizal', 'owner'], ['Dimas', 'lead'], ['Bagas', 'lead'], ['Fajar', 'regular'], ['Yoga', 'regular'],
      ['Hendra', 'regular'], ['Andi', 'support'], ['Rian', 'support'], ['Tono', 'support']];
    return {
      role: null, did: null, cust: null, seq: 0, orders: [], chats: {},
      tariff: { base: 5000, km: 2500, feeMin: 2000 },
      drivers: names.map(function (d, i) { return { id: i + 1, name: d[0], type: d[1], on: true }; })
    };
  }

  function get() {
    if (mem) return mem;
    try { var raw = localStorage.getItem(KEY); mem = raw ? JSON.parse(raw) : seed(); } catch (e) { mem = seed(); }
    return mem;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* abaikan */ }
    subs.forEach(function (fn) { fn(); });
  }

  window.Store = {
    get: get, save: save,
    reset: function () { mem = seed(); save(); },
    on: function (fn) { subs.push(fn); }
  };
})();
