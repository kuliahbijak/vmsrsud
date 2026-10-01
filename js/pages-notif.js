/* ==========================================================================
   HALAMAN WHATSAPP & NOTIFIKASI + CRM KONTAK  (gas-notifikasi-wa-crm, v1.1)
   - Blast WA per batch (10/20/50) + jeda anti-banned, bisa dihentikan
   - Antrean pesan (WA + Email) dengan status & ulang kirim
   - Konfigurasi: token Fonnte (disimpan di Script Properties), saklar kanal,
     matriks event × kanal, editor template pesan
   - CRM: daftar kontak gabungan (Rekanan, Staf, Akun Rekanan, PJ Ruangan,
     kontak luar), deteksi nomor WA, tag, opt-out, gabung duplikat, timeline
   Data dimuat on-demand (tidak membebani bootstrap).
   ========================================================================== */
const WA_VARS = ['{nama}', '{institusi}', '{link}'];
const fmtWA = t => E(t).replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/_([^_\n]+)_/g, '<i>$1</i>').replace(/\n/g, '<br>');
const waChip = s => s === 'Terdaftar' ? '<span class="chip st-green nodot wa-badge">WA ✓</span>' : s === 'Tidak Terdaftar' ? '<span class="chip st-red nodot wa-badge">Bukan WA</span>' : '<span class="chip st-gray nodot wa-badge">Belum cek</span>';

/* =====================================================================
   WHATSAPP & NOTIFIKASI
   ===================================================================== */
Pages.notifwa = {
  title: 'WhatsApp & Notifikasi', roles: CAN.wa,
  render(el) {
    const st = ps('notifwa', { tab: 'blast', sumber: 'crm', segmen: '', statusWA: '', teks: '', judul: '', pesan: 'Yth. {nama},\n\n\n— {institusi}', batch: 0, jeda: '', aud: null, qStatus: '', qKanal: '', qBlast: '' });
    const tabs = [{ id: 'blast', l: 'Blast WhatsApp' }, { id: 'antrean', l: 'Antrean & Riwayat' }].concat(can('notifConfig') ? [{ id: 'konfig', l: 'Konfigurasi' }] : []);
    if (!tabs.some(t => t.id === st.tab)) st.tab = 'blast';
    el.innerHTML = pageHead({
      eyebrow: `<span class="tag">Notifikasi Otomatis</span> • WhatsApp (Fonnte) & Email`, title: 'WhatsApp & Notifikasi',
      sub: 'Pengiriman lewat antrean — tombol tetap instan, pesan dikirim bertahap oleh server tiap menit.',
      actions: `<button class="btn btn-outline" data-act="nw.process">${I('send')} Proses Antrean Sekarang</button>`
    }) + tabsBar('nw.tab', tabs, st.tab) + `<div id="nw-body">${st.tab === 'blast' ? nwBlast(st) : st.tab === 'antrean' ? nwQueueShell(st) : '<div class="skel" style="height:240px"></div>'}</div>`;
    if (st.tab === 'blast') { nwBlastList(); nwPreview(); }
    if (st.tab === 'antrean') nwQueueLoad();
    if (st.tab === 'konfig') nwCfgLoad();
  }
};
Act['nw.tab'] = el => { ps('notifwa').tab = el.dataset.v; App.refreshCurrent(); };
Act['nw.process'] = async el => {
  UI.busy(el, true);
  try { const r = await API.call('notifProcessNow', {}, { timeout: 300000 }); const h = r.data || {}; UI.toast(h.info ? 'Antrean: ' + h.info : `Antrean diproses: ${h.terkirim || 0} terkirim, ${h.gagal || 0} gagal`, 'ok', 5000); const st = ps('notifwa'); if (st.tab === 'antrean') nwQueueLoad(); if (st.tab === 'blast') nwBlastList(); }
  catch (e) { UI.toast(e.message, 'err', 6000); }
  UI.busy(el, false);
};

/* ---------- Tab Blast ---------- */
function nwBlast(st) {
  const segs = [...new Set(['Rekanan', 'Akun Rekanan', 'Staf RSUD', 'PJ Ruangan', 'Kontak Luar'])];
  return `<div class="grid g-3-2">
    <div class="stack">
      <div class="card"><div class="card-head"><div class="ic" style="background:#d6f5df;color:var(--success)">${I('wa')}</div><div style="flex:1"><h3>1. Tulis Pesan</h3><p>Variabel: ${WA_VARS.map(v => `<button class="code-pill" data-act="nw.var" data-v="${v}">${v}</button>`).join(' ')} · *tebal* _miring_</p></div></div>
        <div class="field"><label>Judul blast (internal)</label><input class="input" value="${E(st.judul)}" data-in="nw.f" data-f="judul" placeholder="mis. Undangan sosialisasi e-Katalog"></div>
        <div class="field mt"><label>Isi pesan</label><textarea class="textarea" rows="7" id="nw-pesan" data-in="nw.f" data-f="pesan">${E(st.pesan)}</textarea></div>
        <div class="grid g2 mt" style="gap:12px"><div class="field"><label>Ukuran batch</label><div class="seg" id="nw-batch">${[10, 20, 50].map(n => `<button type="button" class="${(st.batch || 20) === n ? 'on' : ''}" data-act="nw.batch" data-v="${n}">${n}</button>`).join('')}</div><span class="help">Jumlah pesan per putaran (tiap ±1 menit)</span></div>
          <div class="field"><label>Jeda antar pesan (detik)</label><input class="input mono" value="${E(st.jeda)}" placeholder="5 atau 3-8" data-in="nw.f" data-f="jeda"><span class="help">Rentang acak lebih aman dari pemblokiran</span></div></div></div>
      <div class="card"><div class="card-head"><div class="ic">${I('contacts')}</div><div style="flex:1"><h3>2. Pilih Penerima</h3><p>Nomor ganda & opt-out otomatis dibuang</p></div></div>
        <div class="seg"><button type="button" class="${st.sumber === 'crm' ? 'on' : ''}" data-act="nw.src" data-v="crm">Dari CRM Kontak</button><button type="button" class="${st.sumber === 'manual' ? 'on' : ''}" data-act="nw.src" data-v="manual">Tempel daftar nomor</button></div>
        ${st.sumber === 'crm' ? `<div class="grid g2 mt" style="gap:12px"><div class="field"><label>Segmen</label><select class="select" data-ch="nw.f" data-f="segmen">${UI.opt(segs, st.segmen, 'Semua segmen')}</select></div><div class="field"><label>Status WhatsApp</label><select class="select" data-ch="nw.f" data-f="statusWA">${UI.opt([{ v: 'Terdaftar', l: 'Terdaftar WA' }, { v: 'belum', l: 'Belum dicek' }, { v: 'Tidak Terdaftar', l: 'Tidak terdaftar' }], st.statusWA, 'Semua')}</select></div></div>`
        : `<div class="field mt"><label>Satu baris per penerima: <span class="mono">nomor|nama</span></label><textarea class="textarea mono" rows="5" data-in="nw.f" data-f="teks" placeholder="081234567890|Budi Santoso&#10;0813xxxxxxx|Apotek Sehat">${E(st.teks)}</textarea></div>`}
        <div class="row wrap mt" style="gap:8px"><button class="btn btn-outline" data-act="nw.aud">${I('refresh')} Muat & Periksa Penerima</button>${st.aud ? `<button class="btn btn-ghost" data-act="nw.validate">${I('wa')} Cek nomor WhatsApp</button>` : ''}</div>
        <div id="nw-aud" class="mt">${st.aud ? nwAudHTML(st.aud) : ''}</div></div>
    </div>
    <div class="stack">
      <div class="card"><div class="card-head"><div class="ic">${I('eye')}</div><h3>Pratinjau</h3></div><div class="wa-preview"><div class="wa-bubble" id="nw-prev"></div></div>
        <button class="btn btn-success mt" style="width:100%" data-act="nw.send">${I('send')} Kirim Blast</button><p class="xs muted mt-s">Token Fonnte & saklar WA diatur Admin di tab Konfigurasi.</p></div>
      <div class="card pad-0"><div class="row" style="padding:14px 16px"><h3 style="flex:1">Riwayat Blast</h3><button class="btn btn-ghost btn-sm" data-act="nw.blasts">${I('refresh')}</button></div><div id="nw-blasts"><div class="skel" style="height:120px;margin:0 16px 16px"></div></div></div>
    </div></div>`;
}
function nwAudHTML(a) {
  const r = a.ringkas, ok = a.rows.filter(x => x.valid && !x.ganda && !x.optOut);
  return `<div class="statline"><div><div class="k">Siap kirim</div><div class="v num" style="color:var(--success-dark)">${ok.length}</div></div><div><div class="k">Tidak valid</div><div class="v num">${r.tidakValid}</div></div><div><div class="k">Ganda</div><div class="v num">${r.ganda}</div></div><div><div class="k">Opt-out</div><div class="v num">${r.optOut}</div></div><div><div class="k">Terdaftar WA</div><div class="v num">${r.terdaftarWA}</div></div></div>
    <div class="tbl-wrap mt-s" style="max-height:260px;overflow:auto"><table class="tbl"><thead><tr><th>Nama</th><th>Nomor</th><th>Status</th></tr></thead><tbody>${a.rows.slice(0, 200).map(x => `<tr class="${!x.valid || x.ganda || x.optOut ? 'row-dim' : ''}"><td class="small">${E(x.nama || '-')}<div class="xs muted">${E(x.segmen || '')}</div></td><td class="mono xs">${E(x.hp || '-')}</td><td>${!x.valid ? '<span class="chip st-red nodot">Tidak valid</span>' : x.ganda ? '<span class="chip st-gray nodot">Ganda</span>' : x.optOut ? '<span class="chip st-amber nodot">Opt-out</span>' : waChip(x.status_wa)}</td></tr>`).join('') || `<tr><td colspan="3">${UI.empty('Tidak ada penerima')}</td></tr>`}</tbody></table></div>${a.rows.length > 200 ? `<p class="xs muted">Menampilkan 200 dari ${a.rows.length}.</p>` : ''}`;
}
function nwPreview() {
  const st = ps('notifwa'), p = document.getElementById('nw-prev'); if (!p) return;
  const v = { nama: (st.aud && (st.aud.rows.find(x => x.valid) || {}).nama) || 'Bapak/Ibu', institusi: S.settings.RS_NAMA_DOK || S.settings.RS_NAMA || '', link: S.settings.APP_URL || '' };
  p.innerHTML = fmtWA(String(st.pesan || '').replace(/\{(\w+)\}/g, (m, k) => v[k] != null ? v[k] : m)) + `<span class="wa-time">${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>`;
}
Act['nw.f'] = el => { const st = ps('notifwa'); st[el.dataset.f] = el.value; if (el.dataset.f === 'pesan') nwPreview(); if (['segmen', 'statusWA'].includes(el.dataset.f)) st.aud = null; };
Act['nw.var'] = el => { const t = document.getElementById('nw-pesan'); if (!t) return; const a = t.selectionStart || t.value.length; t.value = t.value.slice(0, a) + el.dataset.v + t.value.slice(t.selectionEnd || a); ps('notifwa').pesan = t.value; t.focus(); nwPreview(); };
Act['nw.batch'] = el => { ps('notifwa').batch = Number(el.dataset.v); el.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); };
Act['nw.src'] = el => { const st = ps('notifwa'); st.sumber = el.dataset.v; st.aud = null; App.refreshCurrent(); };
Act['nw.aud'] = async el => {
  const st = ps('notifwa'); UI.busy(el, true);
  try { const r = await API.call('waAudience', { sumber: st.sumber, segmen: st.segmen, statusWA: st.statusWA, teks: st.teks }); st.aud = r.data; const b = document.getElementById('nw-aud'); if (b) b.innerHTML = nwAudHTML(st.aud); nwPreview(); if (!document.querySelector('[data-act="nw.validate"]')) App.refreshCurrent(); }
  catch (e) { UI.toast(e.message, 'err'); }
  UI.busy(el, false);
};
Act['nw.validate'] = async el => {
  const st = ps('notifwa'); if (!st.aud) return;
  const list = st.aud.rows.filter(x => x.valid && !x.ganda && !x.status_wa).map(x => x.hp).slice(0, 50);
  if (!list.length) { UI.toast('Semua nomor sudah dicek', 'ok'); return; }
  UI.busy(el, true);
  try { const r = await API.call('waValidate', { nomor: list }, { timeout: 60000 }); st.aud.rows.forEach(x => { if (r.data[x.hp]) x.status_wa = r.data[x.hp]; }); st.aud.ringkas.terdaftarWA = st.aud.rows.filter(x => x.status_wa === 'Terdaftar').length; document.getElementById('nw-aud').innerHTML = nwAudHTML(st.aud); UI.toast(Object.keys(r.data).length + ' nomor dicek (maks 50 per klik)', 'ok'); }
  catch (e) { UI.toast(e.message, 'err', 7000); }
  UI.busy(el, false);
};
Act['nw.send'] = async el => {
  const st = ps('notifwa');
  if (!st.judul.trim()) { UI.toast('Isi judul blast', 'err'); return; }
  if (!st.pesan.trim()) { UI.toast('Isi pesan', 'err'); return; }
  if (!st.aud) { UI.toast('Klik "Muat & Periksa Penerima" terlebih dahulu', 'err'); return; }
  const ok = st.aud.rows.filter(x => x.valid && !x.ganda && !x.optOut && x.status_wa !== 'Tidak Terdaftar');
  if (!ok.length) { UI.toast('Tidak ada penerima yang siap dikirimi', 'err'); return; }
  const batch = st.batch || 20;
  if (!await UI.confirm('Kirim blast WhatsApp?', `<b>${ok.length}</b> nomor · ${Math.ceil(ok.length / batch)} batch × ${batch} pesan.<br><span class="small muted">Nomor yang terdeteksi bukan WhatsApp dilewati. Blast dapat dihentikan kapan saja.</span>`, { ok: 'Kirim' })) return;
  UI.busy(el, true);
  try {
    const r = await API.call('waBlastCreate', { judul: st.judul.trim(), pesan: st.pesan, ukuranBatch: batch, jeda: st.jeda, sasaran: st.sumber === 'crm' ? [st.segmen || 'Semua', st.statusWA].filter(Boolean).join(' · ') : 'Manual', penerima: ok.map(x => ({ hp: x.hp, nama: x.nama })) });
    UI.toast(r.message, 'ok', 5000); st.aud = null; st.judul = '';
    API.call('waBlastProcess', { blastId: r.data.blast.id }, { timeout: 300000 }).then(nwBlastList).catch(() => { });
    App.refreshCurrent();
  } catch (e) { UI.toast(e.message, 'err', 7000); UI.busy(el, false); }
};
async function nwBlastList() {
  const box = document.getElementById('nw-blasts'); if (!box) return;
  try {
    const r = await API.call('waBlastList');
    if (!document.body.contains(box)) return;
    box.innerHTML = r.data.length ? r.data.slice(0, 20).map(b => `<div class="act-item" style="margin:0 16px 10px"><div class="row wrap" style="gap:6px"><b class="small" style="flex:1">${E(b.judul)}</b>${CHIP(b.status)}</div><div class="xs muted">${UI.tglJam(b.tanggal)} · ${E(b.sasaran || '')} · batch ${E(b.ukuran_batch)}</div>
      <div class="prog-bar mt-s"><i class="${b.gagal > 0 ? 'o' : 'g'}" style="width:${b.persen}%"></i></div><div class="row mono xs mt-s"><span style="flex:1">${b.terkirim} terkirim · ${b.gagal} gagal · ${b.sisa} sisa</span>
      ${b.status === 'Berjalan' ? `<button class="btn btn-ghost btn-xs" data-act="nw.bproc" data-id="${E(b.id)}">Proses</button><button class="btn btn-ghost btn-xs" style="color:var(--danger)" data-act="nw.bstop" data-id="${E(b.id)}">Hentikan</button>` : ''}<button class="btn btn-ghost btn-xs" data-act="nw.bview" data-id="${E(b.id)}">Rincian</button></div></div>`).join('') : `<div style="padding:0 16px 16px">${UI.empty('Belum ada blast', 'wa')}</div>`;
  } catch (e) { box.innerHTML = `<div class="err" style="padding:0 16px 16px">${E(e.message)}</div>`; }
}
Act['nw.blasts'] = nwBlastList;
Act['nw.bproc'] = async el => { UI.busy(el, true); try { const r = await API.call('waBlastProcess', { blastId: el.dataset.id }, { timeout: 300000 }); UI.toast(`Batch diproses: ${(r.data.hasil || {}).terkirim || 0} terkirim`, 'ok'); } catch (e) { UI.toast(e.message, 'err'); } nwBlastList(); };
Act['nw.bstop'] = async el => { if (!await UI.confirm('Hentikan blast?', 'Pesan yang belum terkirim dibatalkan.', { danger: true, ok: 'Hentikan' })) return; try { const r = await API.call('waBlastStop', { blastId: el.dataset.id }); UI.toast(r.message, 'ok'); } catch (e) { UI.toast(e.message, 'err'); } nwBlastList(); };
Act['nw.bview'] = el => { const st = ps('notifwa'); st.tab = 'antrean'; st.qBlast = el.dataset.id; App.refreshCurrent(); };

/* ---------- Tab Antrean ---------- */
function nwQueueShell(st) {
  return `<div class="card pad-0"><div class="filters" style="padding:14px 16px">
    <select class="select tinted" data-ch="nw.q" data-f="qStatus">${UI.opt(['Antri', 'Terkirim', 'Gagal', 'Batal'], st.qStatus, 'Semua status')}</select>
    <select class="select tinted" data-ch="nw.q" data-f="qKanal">${UI.opt([{ v: 'WA', l: 'WhatsApp' }, { v: 'EMAIL', l: 'Email' }], st.qKanal, 'Semua kanal')}</select>
    ${st.qBlast ? `<span class="chip st-blue nodot">Blast ${E(st.qBlast)} <button class="btn btn-ghost btn-xs" data-act="nw.qclr">×</button></span>` : ''}
    <span class="spacer"></span>${can('notifConfig') ? `<button class="btn btn-soft btn-sm" data-act="nw.retry">${I('refresh')} Ulangi yang gagal</button>` : ''}<button class="btn btn-ghost btn-sm" data-act="nw.qload">${I('refresh')} Muat</button></div>
    <div id="nw-qsum" style="padding:0 16px"></div><div id="nw-q"><div class="skel" style="height:200px;margin:0 16px 16px"></div></div></div>`;
}
async function nwQueueLoad() {
  const st = ps('notifwa'), box = document.getElementById('nw-q'); if (!box) return;
  try {
    const r = await API.call('notifQueue', { status: st.qStatus, kanal: st.qKanal, blastId: st.qBlast });
    if (!document.body.contains(box)) return;
    const g = r.data.ringkas;
    document.getElementById('nw-qsum').innerHTML = `<div class="row wrap mb" style="gap:8px">${['Antri', 'Terkirim', 'Gagal', 'Batal'].map(k => `<span class="chip ${k === 'Terkirim' ? 'st-green' : k === 'Gagal' ? 'st-red' : k === 'Antri' ? 'st-blue' : 'st-gray'} nodot">${k}: ${g[k] || 0}</span>`).join('')}<span class="xs muted">Sisa kuota email hari ini: ${E(r.data.kuotaEmail)}</span></div>`;
    box.innerHTML = `<div class="tbl-wrap"><table class="tbl tbl-cards"><thead><tr><th>Waktu</th><th>Kanal</th><th>Tujuan</th><th>Pesan</th><th>Status</th></tr></thead><tbody>${r.data.rows.map(x => `<tr><td class="mono xs" data-l="Waktu">${UI.tglJam(x.dikirim || x.dibuat)}</td><td data-l="Kanal">${x.kanal === 'WA' ? `<span class="chip st-green nodot">${I('wa')} WA</span>` : `<span class="chip nodot">${I('mail')} Email</span>`}</td><td class="small" data-l="Tujuan">${E(x.nama_penerima || '')}<div class="mono xs muted">${E(x.tujuan)}</div></td><td class="small" data-l="Pesan"><b>${E(x.subjek || x.event || '')}</b><div class="xs muted">${E(x.pesan)}</div></td><td data-l="Status">${CHIP(x.status)}${x.percobaan ? `<div class="xs muted">${x.percobaan}× coba</div>` : ''}${x.status === 'Gagal' && x.respon ? `<div class="xs" style="color:var(--danger)">${E(String(x.respon).slice(0, 80))}</div>` : ''}</td></tr>`).join('') || `<tr><td colspan="5">${UI.empty('Antrean kosong', 'send')}</td></tr>`}</tbody></table></div>`;
  } catch (e) { box.innerHTML = `<div class="err" style="padding:16px">${E(e.message)}</div>`; }
}
Act['nw.q'] = el => { ps('notifwa')[el.dataset.f] = el.value; nwQueueLoad(); };
Act['nw.qload'] = nwQueueLoad;
Act['nw.qclr'] = () => { ps('notifwa').qBlast = ''; App.refreshCurrent(); };
Act['nw.retry'] = async el => { UI.busy(el, true); try { const r = await API.call('notifRetry', {}); UI.toast(r.message, 'ok'); nwQueueLoad(); } catch (e) { UI.toast(e.message, 'err'); } UI.busy(el, false); };

/* ---------- Tab Konfigurasi (Admin) ---------- */
async function nwCfgLoad() {
  const box = document.getElementById('nw-body'); if (!box) return;
  try { const r = await API.call('notifConfig'); ps('notifwa').cfg = r.data; if (document.body.contains(box)) box.innerHTML = nwCfgHTML(r.data); }
  catch (e) { box.innerHTML = `<div class="card err">${E(e.message)}</div>`; }
}
function nwSwitch(id, on, label) { return `<label class="switch"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><span class="sl"></span><span class="small">${label}</span></label>`; }
function nwCfgHTML(c) {
  const ev = Object.values(c.matriks);
  return `<div class="grid g2">
    <div class="card"><div class="card-head"><div class="ic" style="background:#d6f5df;color:var(--success)">${I('wa')}</div><div style="flex:1"><h3>WhatsApp (Fonnte)</h3><p>Token disimpan aman di Script Properties server</p></div>${c.wa ? '<span class="chip st-green nodot">Aktif</span>' : '<span class="chip st-gray nodot">Mati</span>'}</div>
      ${nwSwitch('cf-wa', c.wa, 'Aktifkan notifikasi WhatsApp')}
      <div class="field mt"><label>Token Fonnte ${c.hasToken ? `<span class="hint">tersimpan: <span class="mono">${E(c.token)}</span></span>` : ''}</label><div class="row" style="gap:6px"><input class="input mono" id="cf-token" type="password" autocomplete="off" placeholder="${c.hasToken ? 'Kosongkan bila tidak diganti' : 'Tempel token dari fonnte.com'}">${c.hasToken ? `<button class="btn btn-ghost btn-sm" data-act="nw.tokdel" style="color:var(--danger)">Hapus</button>` : ''}</div></div>
      <div class="grid g2 mt" style="gap:12px"><div class="field"><label>Batch bawaan</label><select class="select" id="cf-batch">${UI.opt(['10', '20', '50'], String(c.batch))}</select></div><div class="field"><label>Jeda (detik)</label><input class="input mono" id="cf-jeda" value="${E(c.jeda)}"></div></div>
      <div class="mt">${nwSwitch('cf-det', c.deteksi, 'Deteksi otomatis nomor WhatsApp kontak baru')}</div>
      <div class="row wrap mt" style="gap:6px"><button class="btn btn-outline btn-sm" data-act="nw.device">${I('phone')} Cek perangkat</button><input class="input input-sm mono" id="cf-testno" inputmode="tel" placeholder="08xxxxxxxxxx" style="max-width:170px"><button class="btn btn-outline btn-sm" data-act="nw.watest">${I('send')} Kirim tes</button></div><div id="cf-dev" class="xs muted mt-s"></div></div>
    <div class="card"><div class="card-head"><div class="ic">${I('mail')}</div><div style="flex:1"><h3>Email (Gmail)</h3><p>Sisa kuota hari ini: ${E(c.kuotaEmail)}</p></div>${c.email ? '<span class="chip st-green nodot">Aktif</span>' : '<span class="chip st-gray nodot">Mati</span>'}</div>
      ${nwSwitch('cf-email', c.email, 'Aktifkan notifikasi email')}
      <div class="field mt"><label>Nama pengirim</label><input class="input" id="cf-nama" value="${E(c.namaPengirim)}" placeholder="VMS RSUD HAMBA"></div>
      <div class="field mt"><label>URL aplikasi (tautan {link})</label><input class="input mono" id="cf-url" value="${E(c.appUrl)}" placeholder="https://…github.io/vms/"></div>
      <div class="row wrap mt" style="gap:6px"><button class="btn btn-outline btn-sm" data-act="nw.emtest">${I('mail')} Kirim email tes ke saya</button></div>
      <div class="info-box mt">${I('info')}<span>Trigger pemroses antrean (tiap 1 menit): <b>${c.trigger ? 'terpasang' : 'belum — terpasang otomatis saat Simpan'}</b>.</span></div></div>
  </div>
  <div class="card pad-0 mt"><div style="padding:14px 16px"><h3>Matriks Notifikasi per Kejadian</h3><p class="small muted" style="margin:2px 0 0">Matikan kanal per kejadian, atau ubah isi pesannya. Saklar kanal di atas tetap berlaku.</p></div>
    <div class="tbl-wrap"><table class="tbl tbl-cards"><thead><tr><th>Kejadian</th><th class="center">WhatsApp</th><th class="center">Email</th><th></th></tr></thead><tbody>${ev.map(m => `<tr><td data-l="Kejadian"><b class="small">${E(m.label)}</b><div class="mono xs muted">${E(m.kode)}${m.pesan !== m.pesanDefault || m.subjek !== m.subjekDefault ? ' · <span style="color:var(--primary)">pesan diubah</span>' : ''}</div></td><td class="center" data-l="WhatsApp"><input type="checkbox" data-mx="${m.kode}" data-k="wa" ${m.wa ? 'checked' : ''}></td><td class="center" data-l="Email"><input type="checkbox" data-mx="${m.kode}" data-k="email" ${m.email ? 'checked' : ''}></td><td><button class="btn btn-ghost btn-xs" data-act="nw.tpl" data-k="${m.kode}">${I('edit')} Pesan</button></td></tr>`).join('')}</tbody></table></div></div>
  <div class="sticky-bar"><span class="small muted hide-sm">Token tidak pernah dikirim ke browser.</span><span class="spacer"></span><button class="btn" data-act="nw.cfgsave">${I('check')} Simpan Konfigurasi</button></div>`;
}
Act['nw.tpl'] = el => {
  const c = ps('notifwa').cfg, m = c.matriks[el.dataset.k];
  const md = UI.modal({ title: 'Template pesan', sub: E(m.label), size: 'lg', body: `<div class="field"><label>Subjek email</label><input class="input" id="tp-sub" value="${E(m.subjek)}"></div><div class="field mt"><label>Isi pesan (WA & email)</label><textarea class="textarea" rows="8" id="tp-msg">${E(m.pesan)}</textarea><span class="help">Variabel: {nama} {judul} {pesan} {link} {institusi}${m.vars ? ' ' + m.vars.split(',').map(v => '{' + v.trim() + '}').join(' ') : ''}</span></div>`, foot: `<button class="btn btn-ghost" id="tp-reset">Kembalikan bawaan</button><span class="spacer"></span><button class="btn btn-outline" data-close>Batal</button><button class="btn" id="tp-ok">Terapkan</button>` });
  md.q('#tp-reset').onclick = () => { md.q('#tp-sub').value = m.subjekDefault; md.q('#tp-msg').value = m.pesanDefault; };
  md.q('#tp-ok').onclick = () => { m.subjek = md.q('#tp-sub').value; m.pesan = md.q('#tp-msg').value; md.close(); UI.toast('Diterapkan — klik Simpan Konfigurasi', 'ok'); };
};
Act['nw.tokdel'] = async () => { if (!await UI.confirm('Hapus token Fonnte?', 'Notifikasi WhatsApp akan berhenti.', { danger: true, ok: 'Hapus' })) return; nwCfgSave('__HAPUS__'); };
Act['nw.cfgsave'] = () => nwCfgSave();
async function nwCfgSave(tokenOverride) {
  const c = ps('notifwa').cfg, q = id => document.getElementById(id);
  document.querySelectorAll('[data-mx]').forEach(cb => { c.matriks[cb.dataset.mx][cb.dataset.k] = cb.checked; });
  const d = { wa: tokenOverride === '__HAPUS__' ? false : q('cf-wa').checked, email: q('cf-email').checked, token: tokenOverride || q('cf-token').value.trim(), batch: Number(q('cf-batch').value), jeda: q('cf-jeda').value.trim(), deteksi: q('cf-det').checked, namaPengirim: q('cf-nama').value.trim(), appUrl: q('cf-url').value.trim(), matriks: c.matriks };
  try { const r = await API.call('notifConfigSave', d); ps('notifwa').cfg = r.data; S.settings.NOTIF_WA = r.data.wa ? '1' : '0'; S.settings.NOTIF_EMAIL = r.data.email ? '1' : '0'; S.settings.APP_URL = r.data.appUrl; Store.persist(); UI.toast(r.message, 'ok'); document.getElementById('nw-body').innerHTML = nwCfgHTML(r.data); }
  catch (e) { UI.toast(e.message, 'err', 6000); }
}
Act['nw.device'] = async el => { UI.busy(el, true); try { const r = await API.call('waDevice'); const d = r.data || {}; document.getElementById('cf-dev').innerHTML = `Perangkat: <b>${E(d.device || d.name || '-')}</b> · status <b>${E(d.device_status || d.status || '-')}</b>${d.quota ? ' · kuota ' + E(d.quota) : ''}${d.expired ? ' · aktif s/d ' + E(d.expired) : ''}`; } catch (e) { UI.toast(e.message, 'err', 6000); } UI.busy(el, false); };
Act['nw.watest'] = async el => { const no = document.getElementById('cf-testno').value.trim(); if (!no) { UI.toast('Isi nomor tujuan tes', 'err'); return; } UI.busy(el, true); try { const r = await API.call('waTest', { nomor: no }, { timeout: 60000, retry: false }); UI.toast(r.message, 'ok'); } catch (e) { UI.toast(e.message, 'err', 6000); } UI.busy(el, false); };
Act['nw.emtest'] = async el => { UI.busy(el, true); try { const r = await API.call('emailTest', {}, { retry: false }); UI.toast(r.message, 'ok', 5000); } catch (e) { UI.toast(e.message, 'err', 6000); } UI.busy(el, false); };

/* =====================================================================
   CRM KONTAK
   ===================================================================== */
Pages.crm = {
  title: 'CRM Kontak', roles: CAN.crm,
  render(el) {
    const st = ps('crm', { cari: '', segmen: '', statusWA: '', fl: '', halaman: 1, sel: {}, data: null, stats: null });
    el.innerHTML = pageHead({
      eyebrow: `<span class="tag">CRM</span> • Nama · Email · WhatsApp`, title: 'CRM Kontak',
      sub: 'Kontak gabungan Rekanan, Staf RSUD, Akun Rekanan, PJ Ruangan, dan kontak luar — disinkronkan otomatis dari data master.',
      actions: (can('crmEdit') ? `<button class="btn btn-outline" data-act="crm.sync">${I('refresh')} Sinkron</button><button class="btn btn-outline" data-act="crm.import">${I('upload')} Import CSV</button>` : '') + (can('admin') ? `<button class="btn btn-outline" data-act="crm.export">${I('down')} Ekspor</button>` : '')
    }) + `<div class="grid g4" id="crm-kpi">${st.stats ? crmKpi(st.stats) : '<div class="skel" style="height:96px"></div>'.repeat(4)}</div>
    <div class="card pad-0 mt"><div class="filters" style="padding:14px 16px"><div class="input-ic">${I('search')}<input class="input tinted" placeholder="Cari nama, email, nomor" value="${E(st.cari)}" data-in="crm.q"></div>
      <select class="select tinted" data-ch="crm.f" data-f="segmen" id="crm-seg">${UI.opt(Object.keys((st.data && st.data.facet.segmen) || {}), st.segmen, 'Semua segmen')}</select>
      <select class="select tinted" data-ch="crm.f" data-f="statusWA">${UI.opt([{ v: 'Terdaftar', l: 'Terdaftar WA' }, { v: 'Tidak Terdaftar', l: 'Bukan WA' }, { v: 'belum', l: 'Belum dicek' }], st.statusWA, 'Status WA: semua')}</select>
      <select class="select tinted" data-ch="crm.f" data-f="fl">${UI.opt([{ v: 'duplikat', l: 'Duplikat' }, { v: 'masalah', l: 'Bermasalah' }, { v: 'optout', l: 'Opt-out' }], st.fl, 'Filter cepat')}</select></div>
      <div id="crm-bulk"></div><div id="crm-tbl"><div class="skel" style="height:260px;margin:0 16px 16px"></div></div></div>`;
    crmLoad(); crmStatsLoad();
  }
};
function crmKpi(s) {
  return kpi({ lbl: 'Total Kontak', val: UI.num(s.total), ico: 'contacts', foot: `+${s.baru7} dalam 7 hari`, fc: 'muted' }) +
    kpi({ lbl: 'WhatsApp Valid', val: UI.num(s.waValid), ico: 'wa', ic: 'g', foot: `${s.terdaftarWA} terdaftar · ${s.belumCek} belum dicek`, fc: 'muted', bar: s.total ? s.waValid / s.total * 100 : 0 }) +
    kpi({ lbl: 'Email Valid', val: UI.num(s.emailValid), ico: 'mail', foot: `${s.dihubungi30} dihubungi 30 hari`, fc: 'muted', bar: s.total ? s.emailValid / s.total * 100 : 0 }) +
    kpi({ lbl: 'Perlu Perhatian', val: UI.num(s.duplikat + s.takTerjangkau), ico: 'alert', ic: 'r', foot: `${s.duplikat} duplikat · ${s.takTerjangkau} tak terjangkau · ${s.optOut} opt-out`, fc: 'warn' });
}
async function crmStatsLoad() { try { const r = await API.call('crmStats'); ps('crm').stats = r.data; const b = document.getElementById('crm-kpi'); if (b) b.innerHTML = crmKpi(r.data); } catch (e) { } }
async function crmLoad() {
  const st = ps('crm'), box = document.getElementById('crm-tbl'); if (!box) return;
  try {
    const r = await API.call('crmList', { cari: st.cari, segmen: st.segmen, statusWA: st.statusWA, duplikat: st.fl === 'duplikat', masalah: st.fl === 'masalah', optOut: st.fl === 'optout' ? 'YA' : '', halaman: st.halaman, per: 50 });
    st.data = r.data; if (!document.body.contains(box)) return;
    const seg = document.getElementById('crm-seg'); if (seg && seg.options.length <= 1) seg.innerHTML = UI.opt(Object.keys(r.data.facet.segmen), st.segmen, 'Semua segmen');
    crmTable();
  } catch (e) { box.innerHTML = `<div class="err" style="padding:16px">${E(e.message)}</div>`; }
}
function crmTable() {
  const st = ps('crm'), d = st.data, box = document.getElementById('crm-tbl'); if (!box || !d) return;
  const pages = Math.max(1, Math.ceil(d.total / d.per));
  const all = d.rows.length && d.rows.every(k => st.sel[k.id]);
  box.innerHTML = `<div class="tbl-wrap"><table class="tbl tbl-cards"><thead><tr>${can('crmEdit') ? `<th style="width:36px"><input type="checkbox" data-ch="crm.selAll" ${all ? 'checked' : ''}></th>` : ''}<th>Nama</th><th>WhatsApp</th><th>Email</th><th>Segmen</th><th>Kontak terakhir</th></tr></thead><tbody>
    ${d.rows.map(k => `<tr class="clickable ${k.opt_out === 'YA' ? 'row-dim' : ''}">${can('crmEdit') ? `<td><input type="checkbox" data-ch="crm.sel" data-id="${k.id}" ${st.sel[k.id] ? 'checked' : ''}></td>` : ''}
      <td data-act="crm.open" data-id="${k.id}" data-l="Nama"><b class="small">${E(k.nama || '(tanpa nama)')}</b>${k.duplikat ? ' <span class="chip st-amber nodot">duplikat</span>' : ''}${k.opt_out === 'YA' ? ' <span class="chip st-gray nodot">opt-out</span>' : ''}<div class="row wrap" style="gap:4px;margin-top:2px">${String(k.tag || '').split(',').map(t => t.trim()).filter(Boolean).map(t => `<span class="tag-mini">${E(t)}</span>`).join('')}</div></td>
      <td data-act="crm.open" data-id="${k.id}" data-l="WhatsApp"><span class="mono xs">${E(k.no_wa || '-')}</span> ${k.no_wa ? waChip(k.status_wa) : ''}</td>
      <td data-act="crm.open" data-id="${k.id}" data-l="Email" class="small">${E(k.email || '-')}${k.email_valid === 'TIDAK' ? ' <span class="chip st-red nodot">tidak valid</span>' : ''}</td>
      <td data-act="crm.open" data-id="${k.id}" data-l="Segmen"><span class="chip nodot">${E(k.segmen)}</span></td>
      <td data-act="crm.open" data-id="${k.id}" data-l="Terakhir" class="xs muted">${k.terakhir_dihubungi ? UI.ago(k.terakhir_dihubungi) : '—'}${Number(k.jumlah_pesan) ? ` · ${k.jumlah_pesan} pesan` : ''}</td></tr>`).join('') || `<tr><td colspan="6">${UI.empty('Tidak ada kontak. Klik "Sinkron" untuk menarik kontak dari data master.', 'contacts')}</td></tr>`}
    </tbody></table></div>
    <div class="row wrap" style="padding:12px 16px;gap:8px"><span class="small muted" style="flex:1">${UI.num(d.total)} kontak${d.syncTerakhir ? ' · sinkron ' + UI.ago(new Date(Number(d.syncTerakhir)).toISOString()) : ''}</span>${pages > 1 ? `<button class="btn btn-ghost btn-sm" data-act="crm.page" data-v="-1" ${d.halaman <= 1 ? 'disabled' : ''}>${I('back')}</button><span class="mono xs">${d.halaman} / ${pages}</span><button class="btn btn-ghost btn-sm" data-act="crm.page" data-v="1" ${d.halaman >= pages ? 'disabled' : ''}>${I('next')}</button>` : ''}</div>`;
  crmBulkBar();
}
function crmBulkBar() {
  const st = ps('crm'), n = Object.keys(st.sel).filter(k => st.sel[k]).length, b = document.getElementById('crm-bulk'); if (!b) return;
  b.innerHTML = n ? `<div class="bulk-bar"><b class="small">${n} dipilih</b><span class="spacer"></span><button class="btn btn-soft btn-xs" data-act="crm.bulk" data-a="tag">+ Tag</button><button class="btn btn-soft btn-xs" data-act="crm.bulk" data-a="untag">− Tag</button><button class="btn btn-soft btn-xs" data-act="crm.bulk" data-a="deteksiWA">Cek WA</button><button class="btn btn-soft btn-xs" data-act="crm.bulk" data-a="optout">Opt-out</button><button class="btn btn-soft btn-xs" data-act="crm.bulk" data-a="optin">Opt-in</button>${can('wa') ? `<button class="btn btn-success btn-xs" data-act="crm.blast">${I('wa')} Blast</button>` : ''}${can('admin') && n >= 2 ? `<button class="btn btn-outline btn-xs" data-act="crm.merge">Gabungkan</button>` : ''}<button class="btn btn-ghost btn-xs" style="color:var(--danger)" data-act="crm.bulk" data-a="hapusManual" title="Hanya kontak dari import manual">Hapus</button><button class="btn btn-ghost btn-xs" data-act="crm.selclr">Batal</button></div>` : '';
}
const crmReload = () => { ps('crm').halaman = 1; crmLoad(); };
Act['crm.q'] = UI.debounce(el => { ps('crm').cari = el.value; crmReload(); }, 300);
Act['crm.f'] = el => { ps('crm')[el.dataset.f] = el.value; crmReload(); };
Act['crm.page'] = el => { const st = ps('crm'); st.halaman = Math.max(1, st.halaman + Number(el.dataset.v)); crmLoad(); };
Act['crm.sel'] = el => { ps('crm').sel[el.dataset.id] = el.checked; crmBulkBar(); };
Act['crm.selAll'] = el => { const st = ps('crm'); (st.data ? st.data.rows : []).forEach(k => st.sel[k.id] = el.checked); crmTable(); };
Act['crm.selclr'] = () => { ps('crm').sel = {}; crmTable(); };
Act['crm.sync'] = async el => { UI.busy(el, true); try { const r = await API.call('crmSync', {}, { timeout: 120000 }); UI.toast(r.message, 'ok'); crmLoad(); crmStatsLoad(); } catch (e) { UI.toast(e.message, 'err'); } UI.busy(el, false); };
Act['crm.bulk'] = async el => {
  const st = ps('crm'), ids = Object.keys(st.sel).filter(k => st.sel[k]), a = el.dataset.a;
  let nilai = '';
  if (a === 'tag' || a === 'untag') { nilai = await UI.confirm(a === 'tag' ? 'Tambah tag' : 'Hapus tag', `${ids.length} kontak terpilih`, { ok: 'Terapkan', input: { label: 'Nama tag', required: true, placeholder: 'mis. farmasi, undangan-2026' } }); if (!nilai) return; }
  if (a === 'hapusManual' && !await UI.confirm('Hapus kontak?', 'Hanya kontak hasil import manual yang dihapus. Kontak dari data master dikelola di menu asalnya.', { danger: true, ok: 'Hapus' })) return;
  UI.busy(el, true);
  try { const r = await API.call('crmBulk', { ids, aksi: a, nilai }, { timeout: 60000 }); UI.toast(r.message, 'ok'); if (a === 'hapusManual') st.sel = {}; crmLoad(); crmStatsLoad(); } catch (e) { UI.toast(e.message, 'err', 6000); UI.busy(el, false); }
};
Act['crm.blast'] = () => {
  const st = ps('crm'), rows = (st.data ? st.data.rows : []).filter(k => st.sel[k.id] && k.no_wa);
  if (!rows.length) { UI.toast('Kontak terpilih tidak memiliki nomor WA (di halaman ini)', 'warn'); return; }
  const nw = ps('notifwa', { tab: 'blast' }); nw.tab = 'blast'; nw.sumber = 'manual'; nw.aud = null; nw.teks = rows.map(k => k.no_wa + '|' + (k.nama || '')).join('\n');
  App.go('notifwa');
};
Act['crm.merge'] = async () => {
  const st = ps('crm'), rows = (st.data ? st.data.rows : []).filter(k => st.sel[k.id]);
  if (rows.length < 2) return;
  const m = UI.modal({ title: 'Gabungkan kontak', sub: 'Pilih kontak utama — tag, catatan & riwayat digabung ke kontak ini', body: rows.map((k, i) => `<label class="check check-card"><input type="radio" name="utama" value="${k.id}" ${i ? '' : 'checked'}><div><b>${E(k.nama)}</b><div class="small mono">${E(k.no_wa || '')} ${E(k.email || '')}</div><div class="xs muted">${E(k.segmen)}</div></div></label>`).join(''), foot: `<button class="btn btn-outline" data-close>Batal</button><button class="btn" id="mg-ok">Gabungkan</button>` });
  m.q('#mg-ok').onclick = async () => { const u = m.q('input[name=utama]:checked').value; try { const r = await API.call('crmMerge', { utama: u, gabung: rows.map(k => k.id).filter(i => i !== u) }); UI.toast(r.message, 'ok'); m.close(); st.sel = {}; crmLoad(); crmStatsLoad(); } catch (e) { UI.toast(e.message, 'err'); } };
};
Act['crm.import'] = () => {
  const m = UI.modal({ title: 'Import kontak (CSV)', size: 'lg', body: `<p class="small">Kolom: <span class="mono">nama, wa, email, segmen, tag</span> — baris dengan nomor/email yang sudah ada dilewati.</p><div class="drop" id="ci-drop">${I('upload')}<div><b>Pilih file CSV</b></div><input type="file" accept=".csv,text/csv" hidden id="ci-file"></div><div id="ci-res" class="mt"></div>`, foot: `<button class="btn btn-ghost" id="ci-tpl">${I('down')} Contoh CSV</button><span class="spacer"></span><button class="btn btn-outline" data-close>Batal</button><button class="btn" id="ci-ok" disabled>Import</button>` });
  let rows = [];
  m.q('#ci-drop').onclick = () => m.q('#ci-file').click();
  m.q('#ci-tpl').onclick = () => UI.downloadText('contoh_kontak.csv', UI.toCSV([{ nama: 'Budi Santoso', wa: '081234567890', email: 'budi@contoh.id', segmen: 'Kontak Luar', tag: 'undangan' }]), 'text/csv');
  m.q('#ci-file').onchange = async e => { const f = e.target.files[0]; if (!f) return; rows = UI.parseCSV(await f.text()); m.q('#ci-res').innerHTML = `<div class="info-box">${I('info')}<span>${rows.length} baris terbaca dari <b>${E(f.name)}</b>.</span></div>`; m.q('#ci-ok').disabled = !rows.length; };
  m.q('#ci-ok').onclick = async () => { UI.busy(m.q('#ci-ok'), true); try { const r = await API.call('crmImport', { rows }, { timeout: 120000 }); UI.toast(r.message, 'ok'); m.close(); crmLoad(); crmStatsLoad(); } catch (e) { UI.toast(e.message, 'err'); UI.busy(m.q('#ci-ok'), false); } };
};
Act['crm.export'] = async el => {
  const st = ps('crm'); UI.busy(el, true);
  try { const r = await API.call('crmExport', { cari: st.cari, segmen: st.segmen, statusWA: st.statusWA }, { timeout: 120000 }); UI.exportExcel('CRM_Kontak_' + UI.iso(), { Kontak: r.data }); } catch (e) { UI.toast(e.message, 'err'); }
  UI.busy(el, false);
};
Act['crm.open'] = async el => {
  const id = el.dataset.id, m = UI.modal({ drawer: true, title: 'Kontak', body: '<div class="skel" style="height:300px"></div>' });
  try {
    const r = await API.call('crmDetail', { id }), k = r.data.kontak, ed = can('crmEdit');
    const info = (() => { try { return JSON.parse(k.info || '{}'); } catch (x) { return {}; } })();
    m.el.querySelector('.modal-h h3').textContent = k.nama || 'Kontak';
    m.el.querySelector('.modal-b').innerHTML = `<div class="row wrap" style="gap:6px"><span class="chip nodot">${E(k.segmen)}</span>${k.no_wa ? waChip(k.status_wa) : ''}${k.opt_out === 'YA' ? '<span class="chip st-gray nodot">opt-out</span>' : ''}</div>
      <div class="row wrap mt" style="gap:6px">${k.no_wa ? `<a class="btn btn-success btn-sm" target="_blank" rel="noopener" href="https://wa.me/${E(String(k.no_wa).replace(/^0/, '62'))}">${I('wa')} Chat WA</a>` : ''}${k.email ? `<a class="btn btn-outline btn-sm" href="mailto:${E(k.email)}">${I('mail')} Email</a>` : ''}</div>
      <form class="form-grid mt" id="ck-f"><div class="field full"><label>Nama</label><input class="input" name="nama" value="${E(k.nama)}" ${ed ? '' : 'disabled'}></div><div class="field"><label>WhatsApp</label><input class="input mono" name="no_wa" inputmode="tel" value="${E(k.no_wa)}" ${ed ? '' : 'disabled'}></div><div class="field"><label>Email</label><input class="input" name="email" type="email" value="${E(k.email)}" ${ed ? '' : 'disabled'}></div>
        <div class="field full"><label>Tag <span class="hint">pisahkan dengan koma</span></label><input class="input" name="tag" value="${E(k.tag)}" ${ed ? '' : 'disabled'}></div><div class="field full"><label>Catatan</label><textarea class="textarea" name="catatan" rows="2" ${ed ? '' : 'disabled'}>${E(k.catatan)}</textarea></div>
        <div class="field full"><label class="check"><input type="checkbox" name="optout" ${k.opt_out === 'YA' ? 'checked' : ''} ${ed ? '' : 'disabled'}> <span class="small">Opt-out (tidak menerima blast)</span></label></div></form>
      ${Object.keys(info).length ? `<div class="act-item mt xs">${Object.keys(info).map(x => `<span class="muted">${E(x)}:</span> ${E(info[x])}`).join(' · ')}<div class="muted mt-s">Sumber: ${E(k.sumber)} — perubahan WA/email ditulis balik ke data asal.</div></div>` : ''}
      <h3 class="mt">Catat Interaksi</h3><div class="row wrap" style="gap:6px"><select class="select input-sm" id="ck-kanal" style="max-width:130px">${UI.opt(['Telepon', 'WA', 'Email', 'Tatap muka', 'Catatan'], 'Telepon')}</select><input class="input input-sm" id="ck-ring" placeholder="Ringkasan…" style="flex:1;min-width:160px"><button class="btn btn-soft btn-sm" id="ck-add">Catat</button></div>
      <h3 class="mt">Riwayat</h3><div class="timeline">${r.data.timeline.map(t => `<div class="tl-item"><div class="mono xs muted">${UI.tglJam(t.tanggal)} · ${E(t.kanal)} · ${E(t.arah || '')}${t.status ? ' · ' + E(t.status) : ''}</div><div class="small">${E(t.ringkasan)}</div>${t.oleh ? `<div class="xs muted">oleh ${E(t.oleh)}</div>` : ''}</div>`).join('') || UI.empty('Belum ada riwayat')}</div>`;
    if (ed) { const f = m.el.querySelector('.modal-f') || Object.assign(document.createElement('div'), { className: 'modal-f' }); f.innerHTML = `<span class="spacer"></span><button class="btn" id="ck-save">${I('check')} Simpan</button>`; m.el.querySelector('.modal-b').after(f);
      f.querySelector('#ck-save').onclick = async () => { const x = UI.formData(m.q('#ck-f')); try { const s = await API.call('crmSave', { id, nama: x.nama, no_wa: x.no_wa, email: x.email, tag: x.tag, catatan: x.catatan, opt_out: x.optout ? 'YA' : 'TIDAK' }); UI.toast(s.message, 'ok'); m.close(); crmLoad(); } catch (er) { UI.toast(er.message, 'err'); } }; }
    m.q('#ck-add').onclick = async () => { const ring = m.q('#ck-ring').value.trim(); if (!ring) return; try { await API.call('crmInteraksi', { kontak_id: id, kanal: m.q('#ck-kanal').value, ringkasan: ring }); UI.toast('Interaksi dicatat', 'ok'); m.close(); Act['crm.open'](el); } catch (er) { UI.toast(er.message, 'err'); } };
  } catch (x) { m.el.querySelector('.modal-b').innerHTML = `<div class="err">${E(x.message)}</div>`; }
};
