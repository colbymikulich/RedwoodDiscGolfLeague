/* ============================================================
   Redwood Disc Golf Club — League Tracker
   app.js
   ============================================================ */

'use strict';

// ── DATA LAYER ───────────────────────────────────────────────
const DB_KEY = 'rdgcV3';

let db = JSON.parse(localStorage.getItem(DB_KEY) || '{"events":[]}');
let pending = null; // parsed Excel data waiting to be saved

function saveDb() {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// ── UTILITIES ────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function parPill(diff) {
  if (diff === null) return '';
  if (diff === 0)    return '<span class="pill e">E</span>';
  if (diff > 0)      return `<span class="pill o">+${diff}</span>`;
  return `<span class="pill u">${diff}</span>`;
}

// ── NAVIGATION ───────────────────────────────────────────────

function go(page) {
  document.querySelectorAll('.pg').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('on'));

  document.getElementById('pg-' + page).classList.add('on');
  document.querySelector(`.nav-btn[data-page="${page}"]`).classList.add('on');

  if (page === 'calendar') renderCalendar();
  if (page === 'players')  { renderPlayers(''); document.getElementById('pl-search').value = ''; }
  if (page === 'upload')   resetUpload();
}

// ── CALENDAR ─────────────────────────────────────────────────

function renderCalendar() {
  const listEl   = document.getElementById('cal-list');
  const detailEl = document.getElementById('cal-detail');
  listEl.style.display   = 'block';
  detailEl.style.display = 'none';

  if (!db.events.length) {
    listEl.innerHTML = `
      <div class="empty">
        <span class="ei">🌲</span>
        No events yet.<br>Upload your first score sheet to get started.
      </div>`;
    return;
  }

  const sorted = [...db.events].sort((a, b) => new Date(b.date) - new Date(a.date));
  listEl.innerHTML = sorted.map(ev => {
    const winner = ev.scores[0];
    return `
      <div class="ev-card" data-id="${ev.id}">
        <div class="ec-date">${formatDate(ev.date)}</div>
        <div class="ec-name">${ev.name}</div>
        <div class="ec-meta">${ev.course} · ${ev.holes} holes · ${ev.scores.length} players</div>
        ${winner ? `<div class="ec-winner">🏆 ${winner.player} — ${winner.total}</div>` : ''}
        <span class="ev-badge">${ev.scores.length} players</span>
      </div>`;
  }).join('');

  listEl.querySelectorAll('.ev-card').forEach(card => {
    card.addEventListener('click', () => showEvent(card.dataset.id));
  });
}

function showEvent(id) {
  const ev = db.events.find(e => e.id === id);
  if (!ev) return;

  document.getElementById('cal-list').style.display = 'none';
  const detailEl = document.getElementById('cal-detail');
  detailEl.style.display = 'block';

  const pars      = ev.pars      || [];
  const holeNames = ev.holeNames || Array.from({ length: ev.holes }, (_, i) => 'H' + (i + 1));
  const totalPar  = pars.reduce((s, p) => s + (p || 0), 0);
  const n         = ev.holes;

  // Best / worst per hole for highlighting
  const best = Array.from({ length: n }, (_, hi) => {
    const vals = ev.scores.map(s => s.hs[hi]).filter(v => v != null && !isNaN(v));
    return vals.length ? Math.min(...vals) : null;
  });
  const worst = Array.from({ length: n }, (_, hi) => {
    const vals = ev.scores.map(s => s.hs[hi]).filter(v => v != null && !isNaN(v));
    return vals.length ? Math.max(...vals) : null;
  });

  const headerHoles = holeNames.map((nm, i) =>
    `<th>${nm}${pars[i] ? `<br><span style="color:var(--moss);font-size:8px">P${pars[i]}</span>` : ''}</th>`
  ).join('');

  const medals = ['🥇', '🥈', '🥉'];
  const rows = ev.scores.map((s, ri) => {
    const diff = totalPar && s.total != null ? s.total - totalPar : null;
    const cells = s.hs.map((sc, hi) => {
      let cls = '';
      if (sc != null && !isNaN(sc)) {
        if (sc === best[hi]  && best[hi]  !== worst[hi]) cls = 'best';
        if (sc === worst[hi] && best[hi]  !== worst[hi]) cls = 'worst';
      }
      return `<td class="${cls}">${sc != null ? sc : '-'}</td>`;
    }).join('');

    const rankDisp = ri < 3
      ? medals[ri]
      : `<span style="color:#ccc;font-size:10px">${ri + 1}</span>`;

    return `
      <tr>
        <td class="rank">${rankDisp}</td>
        <td class="nm"><a data-player="${encodeURIComponent(s.player)}">${s.player}</a></td>
        ${cells}
        <td class="tot">${s.total != null ? s.total : '-'}${parPill(diff)}</td>
      </tr>`;
  }).join('');

  const tots = ev.scores.filter(s => s.total != null).map(s => s.total);
  const avg  = tots.length ? (tots.reduce((a, b) => a + b, 0) / tots.length).toFixed(1) : '-';

  detailEl.innerHTML = `
    <button class="back-btn" id="cal-back">← All events</button>
    <div class="ev-dhdr">
      <div class="ed-date">${formatDate(ev.date)}</div>
      <div class="ed-name">${ev.name}</div>
      <div class="ed-course">${ev.course}${totalPar ? ' · Par ' + totalPar : ''}</div>
    </div>
    <div class="stat-grid">
      <div class="stat"><div class="s-lbl">Players</div><div class="s-val">${ev.scores.length}</div></div>
      <div class="stat"><div class="s-lbl">Low</div><div class="s-val">${tots.length ? Math.min(...tots) : '-'}</div></div>
      <div class="stat"><div class="s-lbl">High</div><div class="s-val">${tots.length ? Math.max(...tots) : '-'}</div></div>
      <div class="stat"><div class="s-lbl">Avg</div><div class="s-val">${avg}</div></div>
      ${totalPar ? `<div class="stat"><div class="s-lbl">Par</div><div class="s-val">${totalPar}</div></div>` : ''}
    </div>
    <div class="sec-lbl">Scores — best to worst</div>
    <div class="tbl-wrap">
      <table class="sc-tbl">
        <thead>
          <tr><th></th><th class="lt">Player</th>${headerHoles}<th>Total</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="legend">
      <span><span class="ld" style="background:#D6F0DA"></span>Best per hole</span>
      <span><span class="ld" style="background:#F8D7DA"></span>Highest per hole</span>
      <span>Click a name to view player profile</span>
    </div>`;

  detailEl.querySelector('#cal-back').addEventListener('click', renderCalendar);

  detailEl.querySelectorAll('a[data-player]').forEach(a => {
    a.addEventListener('click', () => showPlayer(a.dataset.player));
  });
}

// ── PLAYERS ──────────────────────────────────────────────────

function renderPlayers(query) {
  document.getElementById('pl-detail').style.display = 'none';
  document.getElementById('pl-list').style.display   = 'block';
  document.getElementById('pl-search').style.display = 'block';

  // Build player map
  const map = {};
  db.events.forEach(ev => {
    ev.scores.forEach(s => {
      if (!map[s.player]) map[s.player] = [];
      map[s.player].push({ ev, score: s });
    });
  });

  let names = Object.keys(map).sort();
  if (query) names = names.filter(n => n.toLowerCase().includes(query.toLowerCase()));

  const listEl = document.getElementById('pl-list');
  if (!names.length) {
    listEl.innerHTML = `<div class="empty"><span class="ei">👤</span>No players found.</div>`;
    return;
  }

  listEl.innerHTML = names.map(name => {
    const evs  = map[name];
    const tots = evs.map(e => e.score.total).filter(v => v != null);
    const best = tots.length ? Math.min(...tots) : null;
    return `
      <div class="pl-card" data-player="${encodeURIComponent(name)}">
        <div class="avatar">${initials(name)}</div>
        <div class="pl-info">
          <div class="pn">${name}</div>
          <div class="pm">${evs.length} event${evs.length !== 1 ? 's' : ''} · Best: ${best !== null ? best : '-'}</div>
        </div>
        <div class="pl-score">${best !== null ? best : '-'}</div>
      </div>`;
  }).join('');

  listEl.querySelectorAll('.pl-card').forEach(card => {
    card.addEventListener('click', () => showPlayer(card.dataset.player));
  });
}

function showPlayer(encodedName) {
  const name = decodeURIComponent(encodedName);
  go('players');

  document.getElementById('pl-list').style.display   = 'none';
  document.getElementById('pl-search').style.display = 'none';
  const detailEl = document.getElementById('pl-detail');
  detailEl.style.display = 'block';

  const evs  = db.events
    .filter(ev => ev.scores.find(s => s.player === name))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const tots = evs.map(ev => ev.scores.find(s => s.player === name)?.total).filter(v => v != null);
  const avg  = tots.length ? (tots.reduce((a, b) => a + b, 0) / tots.length).toFixed(1) : '-';
  const best = tots.length ? Math.min(...tots) : '-';
  const wins = evs.filter(ev => ev.scores[0]?.player === name).length;

  const rows = evs.map(ev => {
    const sc   = ev.scores.find(s => s.player === name);
    const rank = ev.scores.findIndex(s => s.player === name) + 1;
    const tp   = (ev.pars || []).reduce((s, p) => s + (p || 0), 0);
    const diff = tp && sc.total != null ? sc.total - tp : null;
    return `
      <div class="pl-ev-row" data-id="${ev.id}">
        <div>
          <div class="rn">${ev.name}</div>
          <div class="rm">${formatDate(ev.date)} · ${ev.course} · #${rank}/${ev.scores.length}</div>
        </div>
        <div>
          <div class="rs">${sc.total != null ? sc.total : '-'}${parPill(diff)}</div>
          <div class="rk">#${rank} of ${ev.scores.length}</div>
        </div>
      </div>`;
  }).join('');

  detailEl.innerHTML = `
    <button class="back-btn" id="pl-back">← All players</button>
    <div class="pl-dhdr">
      <div class="av-lg">${initials(name)}</div>
      <div>
        <h2>${name}</h2>
        <div class="ps">${evs.length} event${evs.length !== 1 ? 's' : ''} played</div>
      </div>
    </div>
    <div class="stat-grid" style="margin-bottom:1.15rem">
      <div class="stat"><div class="s-lbl">Played</div><div class="s-val">${evs.length}</div></div>
      <div class="stat"><div class="s-lbl">Best</div><div class="s-val">${best}</div></div>
      <div class="stat"><div class="s-lbl">Avg</div><div class="s-val">${avg}</div></div>
      <div class="stat"><div class="s-lbl">Wins 🏆</div><div class="s-val">${wins}</div></div>
    </div>
    <div class="sec-lbl">Event history</div>
    ${rows || '<p style="color:#bbb;font-size:14px">No events yet.</p>'}`;

  detailEl.querySelector('#pl-back').addEventListener('click', () => renderPlayers(''));

  detailEl.querySelectorAll('.pl-ev-row').forEach(row => {
    row.addEventListener('click', () => showEvent(row.dataset.id));
  });
}

// ── UPLOAD ───────────────────────────────────────────────────

function resetUpload() {
  document.getElementById('prev-box').style.display        = 'none';
  document.getElementById('upload-btn-wrap').style.display = 'none';
  document.getElementById('fi').value = '';
  pending = null;
}

function parseXLSX(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const wb   = XLSX.read(e.target.result, { type: 'array' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

    if (!data || data.length < 2) {
      alert('Could not read file. Make sure it has at least one header row and one data row.');
      return;
    }

    const header  = data[0];
    const players = [];

    for (let row = 1; row < data.length; row++) {
      const r = data[row];
      if (!r || !r[0]) continue;
      const name = String(r[0]).trim();
      if (!name || name.toLowerCase() === 'par') continue;

      const hs = [];
      for (let col = 1; col < header.length; col++) {
        const val = r[col];
        const num = (val != null && val !== '') ? Number(val) : null;
        hs.push((num != null && !isNaN(num)) ? num : null);
      }

      players.push({
        player: name,
        hs,
        total: hs.filter(v => v != null).reduce((a, b) => a + b, 0) || null
      });
    }

    const numHoles = Math.max(...players.map(p => p.hs.length));
    pending = { players, numHoles };

    const prevBox = document.getElementById('prev-box');
    prevBox.style.display = 'block';
    prevBox.innerHTML = `
      <strong style="color:var(--forest)">${players.length} players detected · ${numHoles} holes</strong><br>
      <span style="color:#aaa">${players.map(p => p.player).join(' · ')}</span>`;

    document.getElementById('upload-btn-wrap').style.display = 'block';
  };
  reader.readAsArrayBuffer(file);
}

// ── MODAL ────────────────────────────────────────────────────

function openModal() {
  if (!pending) return;

  document.getElementById('c-name').value   = '';
  document.getElementById('c-course').value = '';
  document.getElementById('c-date').value   = new Date().toISOString().slice(0, 10);

  const sel = document.getElementById('c-format');
  const n   = pending.numHoles;
  if      (n === 9)  sel.value = '9';
  else if (n === 18) sel.value = '18';
  else               { sel.value = 'custom'; document.getElementById('c-count').value = n; }

  document.getElementById('c-custom-wrap').style.display = sel.value === 'custom' ? 'block' : 'none';

  buildHoles();
  document.getElementById('modal-ov').classList.add('open');
}

function buildHoles() {
  const sel      = document.getElementById('c-format');
  const isCustom = sel.value === 'custom';
  document.getElementById('c-custom-wrap').style.display = isCustom ? 'block' : 'none';

  const n = isCustom
    ? parseInt(document.getElementById('c-count').value) || 9
    : parseInt(sel.value);

  document.getElementById('par-lbl').textContent = isCustom
    ? 'Hole names & par (optional)'
    : 'Par per hole (optional)';

  document.getElementById('par-grid').innerHTML = Array.from({ length: n }, (_, i) => {
    if (isCustom) {
      return `
        <div class="par-cell" style="min-width:90px">
          <label>Hole ${i + 1} name</label>
          <input class="hole-name-input" type="text" id="hn${i}" placeholder="H${i + 1}" maxlength="10">
          <label style="margin-top:4px">Par</label>
          <input type="number" id="ph${i}" min="2" max="6" placeholder="3">
        </div>`;
    }
    return `
      <div class="par-cell">
        <label>H${i + 1}</label>
        <input type="number" id="ph${i}" min="2" max="6" placeholder="3">
      </div>`;
  }).join('');
}

function closeModal() {
  document.getElementById('modal-ov').classList.remove('open');
}

function saveEvent() {
  const name   = document.getElementById('c-name').value.trim();
  const course = document.getElementById('c-course').value.trim();
  const date   = document.getElementById('c-date').value;

  if (!name || !date) {
    alert('Please enter an event name and date.');
    return;
  }

  const sel      = document.getElementById('c-format');
  const isCustom = sel.value === 'custom';
  const holes    = isCustom
    ? parseInt(document.getElementById('c-count').value) || 9
    : parseInt(sel.value);

  const pars = Array.from({ length: holes }, (_, i) => {
    const v = parseInt(document.getElementById('ph' + i)?.value);
    return isNaN(v) ? null : v;
  });

  const holeNames = Array.from({ length: holes }, (_, i) => {
    if (!isCustom) return 'H' + (i + 1);
    const v = (document.getElementById('hn' + i)?.value || '').trim();
    return v || 'H' + (i + 1);
  });

  const scores = pending.players.map(p => ({
    player: p.player,
    hs:     p.hs.slice(0, holes),
    total:  p.hs.slice(0, holes).filter(v => v != null).reduce((a, b) => a + b, 0) || null
  })).sort((a, b) => (a.total ?? 9999) - (b.total ?? 9999));

  db.events.push({
    id:        Date.now().toString(),
    name,
    course:    course || 'Unknown course',
    date,
    holes,
    pars,
    holeNames,
    scores
  });

  saveDb();
  closeModal();
  resetUpload();
  alert(`✅ "${name}" saved with ${scores.length} players!`);
  go('calendar');
}

// ── EVENT LISTENERS ──────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

  // Nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => go(btn.dataset.page));
  });

  // Upload zone — click
  document.getElementById('dz').addEventListener('click', () => {
    document.getElementById('fi').click();
  });

  // Upload zone — drag & drop
  const dz = document.getElementById('dz');
  dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag'); });
  dz.addEventListener('dragleave', ()  => dz.classList.remove('drag'));
  dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.classList.remove('drag');
    if (e.dataTransfer.files[0]) parseXLSX(e.dataTransfer.files[0]);
  });

  // File input
  document.getElementById('fi').addEventListener('change', e => {
    if (e.target.files[0]) parseXLSX(e.target.files[0]);
  });

  // Open modal button
  document.getElementById('open-modal-btn').addEventListener('click', openModal);

  // Modal — hole format change
  document.getElementById('c-format').addEventListener('change', buildHoles);
  document.getElementById('c-count').addEventListener('input',  buildHoles);

  // Modal — close on overlay click
  document.getElementById('modal-ov').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-ov')) closeModal();
  });

  // Modal — buttons
  document.getElementById('cancel-btn').addEventListener('click', closeModal);
  document.getElementById('save-btn').addEventListener('click',   saveEvent);

  // Player search
  document.getElementById('pl-search').addEventListener('input', e => renderPlayers(e.target.value));

  // Initial render
  renderCalendar();
});
