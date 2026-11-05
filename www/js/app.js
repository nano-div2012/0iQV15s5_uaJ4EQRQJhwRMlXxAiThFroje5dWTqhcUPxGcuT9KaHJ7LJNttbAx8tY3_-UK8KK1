/* Next Level - versi dummy. Semua data contoh, tanpa server. */
(function () {
  'use strict';
  var S = window.Store, app = document.getElementById('app'), live = null, draft = {}, R = {}, A = {};

  var TYPES = { owner: 'Owner Driver', lead: 'Lead Driver', regular: 'Regular Driver', support: 'Support Driver' };
  var SERV = [
    ['jastip', 'JASTIP (Jasa Titip)', 'Pesan makanan, minuman, obat, belanja ke pasar atau minimarket.'],
    ['ambil', 'Jasa Ambil Pesanan', 'Ambil pesanan di mana pun dan antar ke pembeli.'],
    ['ojek', 'Jasa Ojek Panggilan', 'Driver jemput kamu dan antar ke tujuan.'],
    ['risk', 'Jasa High Risk', 'Beli atau jual emas, ambil uang tunai, antar barang berharga. Ditangani driver khusus.'],
    ['khusus', 'Jasa Khusus', 'Antar jalan-jalan, temani ke undangan, atau pesanan privasi.']
  ];
  var LET = { jastip: 'J', ambil: 'A', ojek: 'O', risk: 'H', khusus: 'K' };
  var STAT = { pending: 'Menunggu driver', taken: 'Diambil driver', ongoing: 'Sedang diantar', done: 'Selesai', cancelled: 'Dibatalkan' };
  var CT = [['c/home', 'Home'], ['c/orders', 'Pesanan'], ['c/chats', 'Chat'], ['c/profile', 'Profil']];
  var DT = [['d/inbox', 'Masuk'], ['d/mine', 'Pesanan saya']];
  var AT = [['a/dash', 'Ringkasan'], ['a/orders', 'Pesanan'], ['a/drivers', 'Driver'], ['a/tariff', 'Tarif']];
  var REPLY = ['Siap kak, saya proses ya.', 'Baik, mohon ditunggu sebentar.', 'Saya OTW ke lokasi sekarang.', 'Sudah saya catat kak.'];

  /* ---------- helper ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function rp(n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID'); }
  function go(p) { location.hash = '#/' + p; }
  function $(s) { return document.querySelector(s); }
  function svc(t) { for (var i = 0; i < SERV.length; i++) if (SERV[i][0] === t) return SERV[i][1]; return t; }
  function ord(id) { return S.get().orders.filter(function (o) { return o.id === id; })[0]; }
  function drv(id) { return S.get().drivers.filter(function (d) { return d.id === id; })[0]; }
  function dist(s) { var h = 7; s = s || ''; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973; return 2 + h % 8; }
  function pad(n) { return ('0' + n).slice(-2); }
  function newId(t) { var s = S.get(), d = new Date(); s.seq++; return pad(d.getFullYear() % 100) + pad(d.getMonth() + 1) + pad(d.getDate()) + '.' + pad(s.seq) + '.' + LET[t]; }
  function brief(o) {
    if (o.type === 'jastip') return (o.items || []).map(function (i) { return i.q + 'x ' + i.n; }).join(', ');
    if (o.type === 'ojek') return o.from + ' ke ' + o.to;
    return o.desc;
  }

  function shell(title, body, tabs, active) {
    var st = S.get();
    return '<div class="app"><header class="top"><h1>' + esc(title) + '</h1>' +
      (st.role ? '<button class="ghost" data-act="switch">Ganti peran</button>' : '') + '</header>' +
      '<div class="demo">Versi dummy: data contoh, tersimpan di HP ini, tanpa server.</div><main>' + body + '</main>' +
      (tabs ? '<nav class="tabs">' + tabs.map(function (t) { return '<a href="#/' + t[0] + '" class="' + (active === t[0] ? 'on' : '') + '">' + t[1] + '</a>'; }).join('') + '</nav>' : '') + '</div>';
  }

  function card(o, href, extra) {
    var d = o.driverId ? drv(o.driverId) : null, tag = href && !extra ? 'a' : 'div';
    return '<' + tag + (tag === 'a' ? ' href="' + href + '"' : '') + ' class="card oc"><div class="ocr"><b>' + svc(o.type) +
      '</b><span class="badge s-' + o.status + '">' + STAT[o.status] + '</span></div><div class="mute">' + o.id + (d ? ' - ' + esc(d.name) : '') +
      '</div><p>' + esc(brief(o)) + '</p>' + (extra || '') + '</' + tag + '>';
  }

  function takeOrder(o, d) {
    o.driverId = d.id; o.status = 'taken';
    if (d.type === 'support') {
      var c = S.get().chats; c[o.id] = c[o.id] || [];
      c[o.id].push({ from: 'd', text: 'Halo saya ' + d.name + ' Support Driver yang akan menghandle pesanan anda, boleh anda jelaskan apa yang bisa saya bantu?', t: Date.now() });
    }
    S.save();
  }

  /* ---------- perhitungan ongkos ---------- */
  function calc(t, d) {
    var tf = S.get().tariff, est = 0, fare = 0, fee = tf.feeMin, km = 0;
    if (t === 'jastip') {
      (d.items || []).forEach(function (i) { est += (+i.q || 0) * (+i.p || 0); });
      fee = est ? Math.max(tf.feeMin, Math.round(est * 0.04 / 500) * 500) : 0;
    } else if (t === 'ojek') {
      km = dist((d.from || '') + (d.fromx || '') + '|' + (d.to || '') + (d.tox || ''));
      fare = tf.base + km * tf.km;
    }
    return { est: est, fare: fare, fee: fee, km: km, total: est + fare + fee };
  }
  function row(a, v, b) { return '<div class="sumrow' + (b ? ' b' : '') + '"><span>' + a + '</span><span>' + rp(v) + '</span></div>'; }
  function sumHtml() {
    if (draft._mode === 'chat') return '<p class="mute">Ongkos dan fee dicek langsung oleh driver saat pesanan siap dikirim.</p>';
    var c = calc(draft._type, draft), h = '';
    if (c.est) h += row('Estimasi harga', c.est);
    if (c.fare) h += row('Ongkos (' + c.km + ' km, contoh)', c.fare);
    return h + row('Fee penanganan', c.fee) + row('Total', c.total, 1);
  }
  function collect() {
    document.querySelectorAll('[data-f]').forEach(function (el) {
      var k = el.getAttribute('data-f');
      if (k.indexOf('items.') === 0) {
        var p = k.split('.'); draft.items[+p[1]][p[2]] = el.value;
      } else draft[k] = el.value;
    });
  }

  /* ---------- peta contoh ---------- */
  function mapBox() {
    return '<svg class="map" viewBox="0 0 300 130" role="img" aria-label="Peta contoh"><rect width="300" height="130" fill="#e9ece6"/>' +
      '<path d="M0 40H300M0 90H300M60 0V130M140 0V130M220 0V130" stroke="#fff" stroke-width="8"/><path d="M0 120L300 20" stroke="#fff" stroke-width="5"/>' +
      '<path d="M150 40c-9 0-14 7-14 14 0 10 14 24 14 24s14-14 14-24c0-7-5-14-14-14z" fill="#d32f2f"/><circle cx="150" cy="54" r="5" fill="#fff"/></svg>' +
      '<div class="row"><input id="link" readonly placeholder="https://maps.app.goo.gl/..." value="' + esc(draft.link || '') + '"><button class="btn blue small" data-act="pin">Pilih lokasi</button></div>';
  }

  /* ---------- halaman umum ---------- */
  R[''] = function () {
    var b = '<section class="card center"><h2>Pilih peran untuk dicoba</h2><p class="mute">Satu HP bisa mencoba ketiga sisi. Pesanan dari customer langsung muncul di driver dan admin.</p></section>' +
      '<button class="btn" data-act="role" data-v="customer">Masuk sebagai Customer</button>' +
      '<button class="btn blue" data-act="role" data-v="driver">Masuk sebagai Driver</button>' +
      '<button class="btn red" data-act="role" data-v="admin">Masuk sebagai Admin</button>';
    return shell('Next Level', b);
  };

  /* ---------- customer ---------- */
  R['c/register'] = function () {
    var b = '<section class="card"><h2>Nomor WhatsApp</h2><label for="name">Nama</label><input id="name" placeholder="Nama kamu">' +
      '<label for="wa">Nomor WhatsApp utama</label><input id="wa" inputmode="tel" placeholder="+62 8xx xxxx xxxx">' +
      '<label for="wa2">Nomor WhatsApp kedua (opsional)</label><input id="wa2" inputmode="tel" placeholder="+62 8xx xxxx xxxx"></section>' +
      '<section class="card"><h2>Verifikasi wajah</h2><p class="mute">Simulasi saja, kamera tidak dipakai.</p><button class="btn blue" id="face" data-act="face">Ambil selfie</button></section>' +
      '<section class="card"><h2>Alamat utama (rumah)</h2>' + mapBox() + '<label for="addr">Alamat lengkap</label><textarea id="addr" placeholder="Contoh: Jl. Merdeka No.12, dekat warung Bu Siti"></textarea></section>' +
      '<div class="err" id="err"></div><button class="btn" data-act="reg">Simpan dan lanjut</button>';
    return shell('Daftar akun customer', b);
  };

  R['c/home'] = function () {
    var c = S.get().cust;
    return shell('Next Level', '<div class="hello"><h2>Halo, ' + esc(c.name) + '</h2><p>Mau pesan apa sekarang?</p></div>' +
      SERV.map(function (s) { return '<a class="svc s-' + s[0] + '" href="#/c/mode/' + s[0] + '"><b>' + s[1] + '</b><span>' + s[2] + '</span></a>'; }).join(''), CT, 'c/home');
  };

  R['c/mode'] = function (a) {
    var t = a[2];
    return shell('Pilih cara pesan', '<section class="card center"><h2>' + svc(t) + '</h2><p class="mute">Mau pesan gimana nih?</p></section>' +
      '<a class="btn" href="#/c/order/' + t + '/chat">Langsung chat driver</a><p class="mute">Jelaskan pesanan, driver yang cek ongkos dan total saat pesanan siap dikirim.</p>' +
      '<a class="btn blue" href="#/c/order/' + t + '/cek">Cek ongkos dan total dulu</a><p class="mute">Isi detail pesanan, lihat estimasi ongkos dan fee sebelum dikirim.</p>' +
      '<a class="btn plain" href="#/c/home">Kembali ke menu utama</a>', CT, 'c/home');
  };

  function whereSel(id, label, key) {
    return '<label for="' + id + '">' + label + '</label><select id="' + id + '" data-f="' + key + '"><option value="Rumah utama"' + (draft[key] !== 'Lokasi berbeda' ? ' selected' : '') + '>Rumah utama</option>' +
      '<option value="Lokasi berbeda"' + (draft[key] === 'Lokasi berbeda' ? ' selected' : '') + '>Lokasi berbeda</option></select>' +
      '<input data-f="' + key + 'x" value="' + esc(draft[key + 'x'] || '') + '" placeholder="Contoh: dekat apa, patokannya apa">';
  }

  R['c/order'] = function (a) {
    var t = a[2], m = a[3];
    if (draft._type !== t || draft._mode !== m) draft = { _type: t, _mode: m, items: [{ n: '', q: '1', p: '' }] };
    var b = '<section class="card"><h2>' + svc(t) + '</h2>';
    if (t === 'jastip') {
      b += '<label for="shop">Lokasi pembelian</label><input id="shop" data-f="shop" value="' + esc(draft.shop || '') + '" placeholder="Contoh: Indomaret dekat Masjid Al-Ikhlas">';
      draft.items.forEach(function (it, i) {
        b += '<label>Produk ' + (i + 1) + '</label><input data-f="items.' + i + '.n" value="' + esc(it.n) + '" placeholder="Contoh: Bakso Wonogiri">' +
          '<div class="row"><input data-f="items.' + i + '.q" inputmode="numeric" value="' + esc(it.q) + '" placeholder="Jumlah"><input data-f="items.' + i + '.p" inputmode="numeric" value="' + esc(it.p) + '" placeholder="Harga satuan"></div>';
      });
      b += '<button class="btn blue small" data-act="addprod">+ Tambah produk</button>' + whereSel('to', 'Dikirim ke mana?', 'to');
    } else if (t === 'ojek') {
      b += whereSel('from', 'Lokasi jemput', 'from') + whereSel('to', 'Lokasi antar', 'to');
    } else {
      b += '<label for="desc">Jelaskan pesanan kamu</label><textarea id="desc" data-f="desc" placeholder="Contoh: nama produk, belinya di mana, berapa pcs">' + esc(draft.desc || '') + '</textarea>' + whereSel('to', 'Dikirim ke mana?', 'to');
    }
    b += '</section><section class="card"><h2>' + (m === 'cek' ? 'Estimasi biaya' : 'Biaya') + '</h2><div id="sum">' + sumHtml() + '</div></section>' +
      '<div class="err" id="err"></div><button class="btn" data-act="send">Kirim ke driver</button>';
    return shell('Pesanan', b, CT, 'c/home');
  };

  R['c/sent'] = function (a) {
    return shell('Pesanan masuk', '<section class="card center"><h2>Pesanan ' + esc(a[2]) + ' sudah masuk ke aplikasi driver</h2><p class="mute">Driver kami akan segera menghubungi kamu.</p></section>' +
      '<a class="btn" href="#/c/status/' + esc(a[2]) + '">Cek status pesanan</a>', CT, 'c/orders');
  };

  R['c/status'] = function (a) {
    var o = ord(a[2]); if (!o) return R.missing();
    live = render;
    var c = S.get().cust, d = o.driverId ? drv(o.driverId) : null, h = '<section class="card center"><span class="badge s-' + o.status + '">' + STAT[o.status] + '</span><h2 style="margin-top:8px">Pesanan ' + o.id + '</h2><p class="mute">' + svc(o.type) + '</p></section>';
    if (o.status === 'pending') {
      h += '<section class="card"><h2>Belum ada driver yang mengambil</h2><p class="mute">Mohon tunggu sebentar. Cara driver menghubungi berbeda tergantung tipe driver:</p>' +
        '<dl class="kv"><dt>Owner Driver</dt><dd>chat WhatsApp</dd><dt>Lead Driver</dt><dd>chat WhatsApp</dd><dt>Regular Driver</dt><dd>chat WhatsApp</dd><dt>Support Driver</dt><dd>chat di aplikasi</dd></dl></section>' +
        '<section class="card"><h2>Simulasi driver (khusus dummy)</h2><p class="mute">Pilih tipe driver yang mengambil pesanan ini.</p>' +
        Object.keys(TYPES).map(function (k) { return '<button class="btn plain small" data-act="simtake" data-id="' + o.id + '" data-v="' + k + '">' + TYPES[k] + '</button>'; }).join('') + '</section>';
    } else if (d) {
      var wa = d.type !== 'support';
      h += '<section class="card"><h2>Diambil oleh ' + TYPES[d.type] + ' ' + esc(d.name) + '</h2>' +
        (wa ? '<p>Mohon standby di nomor WhatsApp ' + esc(c.wa) + '. ' + TYPES[d.type] + ' akan segera menghubungi lewat chat WhatsApp.</p>'
          : '<p>Mohon standby di chat aplikasi untuk menjadi penerima.</p><a class="btn blue" href="#/c/chat/' + o.id + '">Buka chat aplikasi</a>') + '</section>';
      if (o.status === 'taken') h += '<button class="btn plain" data-act="simgo" data-id="' + o.id + '">Simulasi: driver mulai jalan</button>';
      if (o.status === 'ongoing') h += '<button class="btn plain" data-act="simdone" data-id="' + o.id + '">Simulasi: pesanan selesai</button>';
      if (o.status === 'done') {
        h += o.rating ? '<section class="card center"><h2>Terima kasih atas penilaianmu</h2><p class="mute">Nilai: ' + o.rating.star + ' dari 5</p></section>'
          : '<section class="card"><h2>Bagaimana pelayanan driver kami?</h2><div class="stars">' + [1, 2, 3, 4, 5].map(function (n) { return '<button data-act="star" data-v="' + n + '">' + n + '</button>'; }).join('') + '</div>' +
          '<p class="mute">1 = sangat buruk, 5 = sangat baik</p><label for="r1">Kritik dan saran untuk driver ' + esc(d.name) + '</label><textarea id="r1"></textarea><label for="r2">Kritik dan saran untuk Next Level</label><textarea id="r2"></textarea>' +
          '<div class="err" id="err"></div><button class="btn" data-act="rate" data-id="' + o.id + '">Kirim penilaian</button></section>';
      }
    }
    return shell('Status pesanan', h, CT, 'c/orders');
  };

  R['c/orders'] = function () {
    var l = S.get().orders; live = render;
    return shell('Pesanan', l.length ? l.map(function (o) { return card(o, '#/c/status/' + o.id); }).join('') : '<section class="card center"><p class="mute">Belum ada pesanan. Pilih layanan di Home.</p></section>', CT, 'c/orders');
  };

  function msgs(id, who) {
    return (S.get().chats[id] || []).map(function (m) { return '<div class="msg' + (m.from === who ? ' me' : '') + '">' + esc(m.text) + '</div>'; }).join('') || '<p class="mute">Belum ada pesan.</p>';
  }
  R['c/chats'] = function () {
    var l = S.get().orders.filter(function (o) { var d = o.driverId && drv(o.driverId); return d && d.type === 'support'; });
    return shell('Chat', l.length ? l.map(function (o) { return card(o, '#/c/chat/' + o.id); }).join('') : '<section class="card center"><p class="mute">Chat dalam aplikasi muncul saat pesananmu diambil Support Driver. Driver lain menghubungi lewat WhatsApp.</p></section>', CT, 'c/chats');
  };
  function chatView(a, who) {
    var o = ord(a[2]); if (!o) return R.missing();
    live = function () { var m = $('#msgs'); if (m) { m.innerHTML = msgs(o.id, who); m.scrollTop = m.scrollHeight; } };
    var d = o.driverId && drv(o.driverId), back = who === 'c' ? '#/c/status/' + o.id : '#/d/mine';
    return shell((who === 'c' && d ? 'Support Driver ' + d.name : 'Chat ' + o.id), '<a class="mute" href="' + back + '">Kembali</a><div class="msgs" id="msgs">' + msgs(o.id, who) +
      '</div><div class="row" style="margin-top:10px"><input id="txt" placeholder="Ketik pesan..."><button class="btn small" data-act="chat" data-id="' + o.id + '" data-who="' + who + '">Kirim</button></div>', who === 'c' ? CT : DT, who === 'c' ? 'c/chats' : 'd/mine');
  }
  R['c/chat'] = function (a) { return chatView(a, 'c'); };
  R['d/chat'] = function (a) { return chatView(a, 'd'); };

  R['c/profile'] = function () {
    var c = S.get().cust;
    return shell('Profil', '<section class="card"><dl class="kv"><dt>Nama</dt><dd>' + esc(c.name) + '</dd><dt>WhatsApp utama</dt><dd>' + esc(c.wa) + '</dd><dt>WhatsApp kedua</dt><dd>' + esc(c.wa2 || '-') + '</dd><dt>Alamat utama</dt><dd>' + esc(c.addr) + '</dd></dl></section>' +
      '<button class="btn red" data-act="reset">Reset data dummy</button>', CT, 'c/profile');
  };

  /* ---------- driver ---------- */
  R['d/pick'] = function () {
    return shell('Pilih akun driver', '<p class="mute">Pilih salah satu dari 9 driver contoh.</p>' + S.get().drivers.filter(function (d) { return d.on; }).map(function (d) {
      return '<button class="btn plain" data-act="driver" data-v="' + d.id + '">' + esc(d.name) + ' - ' + TYPES[d.type] + '</button>'; }).join(''));
  };
  function dTitle() { var d = drv(S.get().did); return d ? d.name + ' (' + TYPES[d.type] + ')' : 'Driver'; }
  R['d/inbox'] = function () {
    var d = drv(S.get().did); live = render;
    var l = S.get().orders.filter(function (o) { return o.status === 'pending'; });
    return shell(dTitle(), l.length ? l.map(function (o) {
      var lock = o.type === 'risk' && (d.type === 'regular' || d.type === 'support');
      return card(o, null, '<p class="mute">Pemesan: ' + esc(o.cust) + ' (' + esc(o.wa) + ')</p><button class="btn small" ' + (lock ? 'disabled' : 'data-act="take" data-id="' + o.id + '"') + '>' + (lock ? 'Khusus Owner dan Lead' : 'Ambil pesanan') + '</button>');
    }).join('') : '<section class="card center"><p class="mute">Belum ada pesanan masuk. Buat pesanan dari sisi Customer.</p></section>', DT, 'd/inbox');
  };
  R['d/mine'] = function () {
    var id = S.get().did, d = drv(id); live = render;
    var l = S.get().orders.filter(function (o) { return o.driverId === id; });
    return shell(dTitle(), l.length ? l.map(function (o) {
      var x = '<p class="mute">Pemesan: ' + esc(o.cust) + '</p>';
      if (d.type === 'support') x += '<a class="btn blue small" href="#/d/chat/' + o.id + '">Chat aplikasi</a>';
      else x += '<a class="btn blue small" href="https://wa.me/' + esc(String(o.wa).replace(/\D/g, '')) + '">Hubungi via WhatsApp</a>';
      if (o.status === 'taken') x += '<button class="btn small" data-act="simgo" data-id="' + o.id + '">Mulai jalan</button>';
      if (o.status === 'ongoing') x += '<button class="btn small" data-act="simdone" data-id="' + o.id + '">Selesaikan</button>';
      return card(o, null, x);
    }).join('') : '<section class="card center"><p class="mute">Belum ada pesanan yang kamu ambil.</p></section>', DT, 'd/mine');
  };

  /* ---------- admin ---------- */
  R['a/dash'] = function () {
    var st = S.get(), n = function (s) { return st.orders.filter(function (o) { return o.status === s; }).length; }; live = render;
    return shell('Admin', '<div class="grid2"><div class="card"><p class="mute">Total pesanan</p><p class="big">' + st.orders.length + '</p></div><div class="card"><p class="mute">Menunggu driver</p><p class="big">' + n('pending') + '</p></div>' +
      '<div class="card"><p class="mute">Berjalan</p><p class="big">' + (n('taken') + n('ongoing')) + '</p></div><div class="card"><p class="mute">Selesai</p><p class="big">' + n('done') + '</p></div></div>' +
      '<h2 style="margin:16px 4px 8px;font-size:16px">Pesanan terbaru</h2>' + (st.orders.slice(0, 3).map(function (o) { return card(o); }).join('') || '<p class="mute">Belum ada pesanan.</p>'), AT, 'a/dash');
  };
  R['a/orders'] = function () {
    live = render;
    return shell('Semua pesanan', S.get().orders.map(function (o) {
      return card(o, null, '<p class="mute">Pemesan: ' + esc(o.cust) + ' - ' + rp(o.total) + '</p>' + (o.status === 'pending' || o.status === 'taken' ? '<button class="btn red small" data-act="cancel" data-id="' + o.id + '">Batalkan</button>' : ''));
    }).join('') || '<section class="card center"><p class="mute">Belum ada pesanan.</p></section>', AT, 'a/orders');
  };
  R['a/drivers'] = function () {
    var b = '<section class="card"><h2>Tambah driver</h2><label for="dn">Nama</label><input id="dn"><label for="dt">Tipe</label><select id="dt">' +
      Object.keys(TYPES).map(function (k) { return '<option value="' + k + '">' + TYPES[k] + '</option>'; }).join('') + '</select><button class="btn" data-act="adddrv">Tambah</button></section>';
    b += S.get().drivers.map(function (d) {
      return '<div class="card"><div class="ocr oc" style="display:flex;justify-content:space-between"><b>' + esc(d.name) + '</b><span class="badge">' + TYPES[d.type] + '</span></div>' +
        '<button class="btn plain small" data-act="togdrv" data-v="' + d.id + '">' + (d.on ? 'Nonaktifkan' : 'Aktifkan') + '</button></div>';
    }).join('');
    return shell('Driver (' + S.get().drivers.length + ')', b, AT, 'a/drivers');
  };
  R['a/tariff'] = function () {
    var t = S.get().tariff;
    return shell('Tarif contoh', '<section class="card"><p class="mute">Rumus contoh untuk ongkos ojek dan fee. Rumus asli menyesuaikan kebutuhan Next Level.</p>' +
      '<label for="tb">Tarif dasar ojek (Rp)</label><input id="tb" inputmode="numeric" value="' + t.base + '"><label for="tk">Tarif per km (Rp)</label><input id="tk" inputmode="numeric" value="' + t.km + '">' +
      '<label for="tf">Fee minimum (Rp)</label><input id="tf" inputmode="numeric" value="' + t.feeMin + '"><div class="err" id="err"></div><button class="btn" data-act="tariff">Simpan tarif</button></section>', AT, 'a/tariff');
  };

  R.missing = function () { return shell('Tidak ditemukan', '<section class="card center"><p>Halaman tidak ditemukan.</p></section><a class="btn plain" href="#/">Ke beranda</a>'); };

  /* ---------- aksi ---------- */
  function err(m) { var e = $('#err'); if (e) e.textContent = m; }
  function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }

  A['switch'] = function () { var s = S.get(); s.role = null; s.did = null; S.save(); go(''); };
  A.role = function (b) {
    var s = S.get(), v = b.dataset.v; s.role = v; S.save();
    go(v === 'customer' ? (s.cust ? 'c/home' : 'c/register') : v === 'driver' ? 'd/pick' : 'a/dash');
  };
  A.face = function (b) { b.textContent = 'Memeriksa...'; b.disabled = true; setTimeout(function () { b.textContent = 'Wajah terverifikasi'; b.disabled = false; b.className = 'btn'; draft.face = true; }, 900); };
  A.pin = function () { draft.link = 'https://maps.app.goo.gl/dummy' + Math.floor(Math.random() * 9000 + 1000); $('#link').value = draft.link; };
  A.reg = function () {
    var name = val('name'), wa = val('wa'), addr = val('addr');
    if (!name) return err('Isi nama dulu.');
    if (!/^\+?\d[\d\s-]{8,}$/.test(wa)) return err('Nomor WhatsApp belum benar. Contoh: +62 812 3456 7890');
    if (!draft.face) return err('Ambil selfie untuk verifikasi dulu.');
    if (!addr) return err('Isi alamat rumah dulu.');
    var s = S.get(); s.cust = { name: name, wa: wa, wa2: val('wa2'), addr: addr }; S.save(); draft = {}; go('c/home');
  };
  A.addprod = function () { collect(); draft.items.push({ n: '', q: '1', p: '' }); render(); };
  A.send = function () {
    collect();
    var t = draft._type, s = S.get(), c = s.cust;
    var from = draft.from === 'Lokasi berbeda' ? draft.fromx : 'Rumah utama', to = draft.to === 'Lokasi berbeda' ? draft.tox : 'Rumah utama';
    if (draft.from === 'Lokasi berbeda' && !draft.fromx) return err('Isi patokan lokasi jemput.');
    if (draft.to === 'Lokasi berbeda' && !draft.tox) return err('Isi patokan lokasi tujuan.');
    if (t === 'jastip') {
      if (!draft.shop) return err('Isi lokasi pembelian.');
      draft.items = draft.items.filter(function (i) { return i.n; });
      if (!draft.items.length) return err('Isi minimal satu produk.');
    } else if (t !== 'ojek' && !draft.desc) return err('Jelaskan pesanan kamu dulu.');
    var k = calc(t, draft), o = {
      id: newId(t), type: t, mode: draft._mode, desc: draft.desc || '', shop: draft.shop || '', items: draft.items || [], from: from, to: to,
      total: k.total, status: 'pending', driverId: null, rating: null, at: Date.now(), cust: c.name, wa: c.wa
    };
    s.orders.unshift(o); s.chats[o.id] = []; S.save(); draft = {}; go('c/sent/' + o.id);
  };
  A.simtake = function (b) {
    var o = ord(b.dataset.id), d = S.get().drivers.filter(function (x) { return x.type === b.dataset.v && x.on; })[0];
    if (o && d) takeOrder(o, d);
  };
  A.take = function (b) { var o = ord(b.dataset.id), d = drv(S.get().did); if (o && o.status === 'pending') takeOrder(o, d); };
  A.simgo = function (b) { var o = ord(b.dataset.id); if (o) { o.status = 'ongoing'; S.save(); } };
  A.simdone = function (b) { var o = ord(b.dataset.id); if (o) { o.status = 'done'; S.save(); } };
  A.cancel = function (b) { var o = ord(b.dataset.id); if (o) { o.status = 'cancelled'; S.save(); } };
  A.star = function (b) {
    draft.star = +b.dataset.v;
    document.querySelectorAll('.stars button').forEach(function (x) { x.classList.toggle('on', +x.dataset.v <= draft.star); });
  };
  A.rate = function (b) {
    if (!draft.star) return err('Pilih bintang dulu.');
    var o = ord(b.dataset.id); o.rating = { star: draft.star, driver: val('r1'), app: val('r2') }; draft.star = 0; S.save();
  };
  A.chat = function (b) {
    var t = val('txt'), id = b.dataset.id, who = b.dataset.who; if (!t) return;
    var c = S.get().chats; c[id] = c[id] || []; c[id].push({ from: who, text: t, t: Date.now() }); S.save(); $('#txt').value = '';
    if (who === 'c') setTimeout(function () { c[id].push({ from: 'd', text: REPLY[Math.floor(Math.random() * REPLY.length)], t: Date.now() }); S.save(); }, 900);
  };
  A.driver = function (b) { var s = S.get(); s.did = +b.dataset.v; S.save(); go('d/inbox'); };
  A.adddrv = function () {
    var n = val('dn'); if (!n) return;
    var s = S.get(); s.drivers.push({ id: s.drivers.length + 1, name: n, type: val('dt'), on: true }); S.save(); render();
  };
  A.togdrv = function (b) { var d = drv(+b.dataset.v); d.on = !d.on; S.save(); render(); };
  A.tariff = function () {
    var b = +val('tb'), k = +val('tk'), f = +val('tf');
    if (!(b >= 0 && k >= 0 && f >= 0) || !val('tb') || !val('tk') || !val('tf')) return err('Isi semua tarif dengan angka.');
    S.get().tariff = { base: b, km: k, feeMin: f }; S.save(); err('Tarif disimpan.');
  };
  A.reset = function () { if (window.confirm('Hapus semua data dummy di HP ini?')) { draft = {}; S.reset(); go(''); } };

  /* ---------- router ---------- */
  function render() {
    live = null;
    var a = (location.hash.replace(/^#\/?/, '') || '').split('/'), st = S.get(), key = a[0] ? a[0] + '/' + a[1] : '';
    if (a[0] === 'c' && st.role !== 'customer' || a[0] === 'd' && st.role !== 'driver' || a[0] === 'a' && st.role !== 'admin') return go('');
    if (a[0] === 'c' && !st.cust && key !== 'c/register') return go('c/register');
    if (a[0] === 'd' && !drv(st.did) && key !== 'd/pick') return go('d/pick');
    var fn = R[key] || R.missing, y = window.scrollY;
    app.innerHTML = fn(a);
    if (live && key === window.__last) window.scrollTo(0, y); else window.scrollTo(0, 0);
    window.__last = key;
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (b && !b.disabled && A[b.dataset.act]) A[b.dataset.act](b, e);
  });
  document.addEventListener('input', function (e) {
    if (e.target.hasAttribute('data-f') && draft._type) { collect(); var s = $('#sum'); if (s) s.innerHTML = sumHtml(); }
  });
  document.addEventListener('change', function (e) {
    if (e.target.hasAttribute('data-f') && draft._type) { collect(); var s = $('#sum'); if (s) s.innerHTML = sumHtml(); }
  });
  S.on(function () { if (live) live(); });
  window.addEventListener('hashchange', render);
  render();
})();
