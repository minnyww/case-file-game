import * as THREE from 'three';
import {
  CASE_META, VICTIM, SUSPECTS, EVIDENCE, INTERROGATION,
  COMPUTER_APPS, ACCUSATION_FIELDS, LOCATIONS,
} from './case-data.js';
import { gradeAccusation } from './solution.js';
import { buildOffice } from './room.js';
import { Player } from './player.js';
import { OfficeAudio } from './audio.js';

// ---------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const canvas = $('game');
const hud = $('hud');
const promptEl = $('prompt');
const interactLabel = $('interact-label');

const panels = {
  evidence: $('panel-evidence'),
  file: $('panel-file'),
  board: $('panel-board'),
  timeline: $('panel-timeline'),
  summary: $('panel-summary'),
  interrogate: $('panel-interrogate'),
  computer: $('panel-computer'),
  accuse: $('panel-accuse'),
  verdict: $('panel-verdict'),
};

const audio = new OfficeAudio();

// ---------------------------------------------------------------------------
// Three
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.45;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x151820);
scene.fog = new THREE.Fog(0x151820, 12, 30);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 50);
scene.add(camera);

const office = buildOffice(scene);
const player = new Player(camera, office.bounds);

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------
const state = {
  mode: 'menu',
  examined: new Set(),
  pinned: [],
  links: [],
  timeline: [],
  linkMode: false,
  selectedPin: null,
  interrogation: {},
  accusationEvidence: new Set(),
  summary: {
    overview: '',
    conflicts: '',
    suspects: '',
    key: '',
    gaps: '',
  },
  muted: false,
};

SUSPECTS.forEach((s) => {
  state.interrogation[s.id] = { asked: new Set(), unlocked: new Set(), log: [] };
});

function openPanel(name) {
  Object.entries(panels).forEach(([k, el]) => el.classList.toggle('hidden', k !== name));
  if (name) {
    state.mode = 'ui';
    player.setFrozen(true);
    document.exitPointerLock?.();
  }
}

function closeAllPanels() {
  Object.values(panels).forEach((el) => el.classList.add('hidden'));
  state.mode = 'play';
  player.setFrozen(false);
}

function unlockEvidence(id) {
  if (!id) return;
  state.examined.add(id);
  refreshFile();
}

function evidenceById(id) {
  return EVIDENCE.find((e) => e.id === id);
}

// ---------------------------------------------------------------------------
// Evidence UI
// ---------------------------------------------------------------------------
function showEvidence(id) {
  const ev = evidenceById(id);
  if (!ev) return;
  unlockEvidence(id);
  audio.evidenceReveal();
  if (id === 'ev-usb') {
    state.examined.add('ev-burner-sms');
    refreshFile();
  }
  if (id === 'ev-key-ring' || id === 'ev-email-invite') {
    state.examined.add('ev-keycard');
  }
  const typeTh = {
    photo: 'ภาพถ่าย',
    document: 'เอกสาร',
    phone: 'โทรศัพท์',
    cctv: 'กล้องวงจรปิด',
    object: 'วัตถุ',
  };
  $('ev-type').textContent = typeTh[ev.type] || ev.type.toUpperCase();
  $('ev-title').textContent = ev.title;
  $('ev-source').textContent = ev.source;
  $('ev-body').textContent = ev.body;
  $('ev-status').textContent = ev.short;
  renderEvidenceVisual(ev);
  $('btn-pin-evidence').onclick = () => {
    audio.boardPin();
    pinCard({ id: ev.id, kind: 'evidence', title: ev.title });
    openPanel('board');
    renderBoard();
  };
  openPanel('evidence');
}

function renderEvidenceVisual(ev) {
  const v = $('ev-visual');
  v.innerHTML = '';
  if (ev.type === 'photo') {
    const d = document.createElement('div');
    d.className = 'photo';
    d.innerHTML = `<span>SCENE — ${VICTIM.foundAt}</span>`;
    v.appendChild(d);
  } else if (ev.type === 'cctv') {
    const d = document.createElement('div');
    d.className = 'cctv';
    d.innerHTML = `<div class="stamp">CAM ${ev.id.includes('stair') ? 'S-12' : 'G-3'} · REC</div>`;
    v.appendChild(d);
  } else if (ev.type === 'phone') {
    const d = document.createElement('div');
    d.className = 'phone-ui';
    d.textContent = ev.body.split('\n').slice(0, 12).join('\n');
    v.appendChild(d);
  } else if (ev.type === 'object') {
    const d = document.createElement('div');
    d.className = 'object';
    d.textContent = ev.id.includes('usb') ? 'USB' : ev.id.includes('key') ? 'KEYS' : 'OBJ';
    v.appendChild(d);
  } else {
    const d = document.createElement('div');
    d.className = 'doc';
    d.textContent = ev.body;
    v.appendChild(d);
  }
}

// ---------------------------------------------------------------------------
// Case file
// ---------------------------------------------------------------------------
function refreshFile() {
  $('file-victim').innerHTML = `
    <strong>${VICTIM.name}</strong>
    <div class="role">${VICTIM.occupation}</div>
    <p>Found ${VICTIM.foundTime} at ${VICTIM.foundAt}. By ${VICTIM.foundBy}.</p>
    <p>TOD window: <strong>${VICTIM.todWindow}</strong></p>
    <p>${VICTIM.cause}</p>
  `;
  $('file-suspects').innerHTML = SUSPECTS.map(
    (s) => `
    <div class="suspect-card">
      <strong>${s.name}</strong>
      <span class="role">${s.role} · ${s.age}</span>
      <p>${s.relationship}</p>
      <p><em>Alibi:</em> ${s.alibiOfficial}</p>
      <p><em>Money:</em> ${s.financialNote}</p>
      <div class="suspect-actions">
        <button class="btn small" data-suspect="${s.id}">INTERROGATE</button>
      </div>
    </div>`
  ).join('');
  const list = EVIDENCE.filter((e) => state.examined.has(e.id));
  $('file-evidence').innerHTML = list.length
    ? list
        .map(
          (e) => `
    <button data-ev="${e.id}">
      <span class="t">${e.type.toUpperCase()}</span>
      ${e.title}
      <span class="s">${e.short}</span>
    </button>`
        )
        .join('')
    : '<p class="dim">ยังไม่มีหลักฐานที่เก็บได้ เดินตรวจวัตถุในห้องก่อน</p>';

  $('file-evidence').querySelectorAll('[data-ev]').forEach((btn) => {
    btn.onclick = () => showEvidence(btn.dataset.ev);
  });
  $('file-suspects').querySelectorAll('[data-suspect]').forEach((btn) => {
    btn.onclick = () => startInterrogation(btn.dataset.suspect);
  });
}

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------
function pinCard(card) {
  const existing = state.pinned.find((p) => p.id === card.id && p.kind === card.kind);
  if (existing) {
    if (typeof card.x === 'number') existing.x = card.x;
    if (typeof card.y === 'number') existing.y = card.y;
    return;
  }
  state.pinned.push({
    ...card,
    x: card.x ?? 40 + (state.pinned.length % 5) * 150,
    y: card.y ?? 40 + Math.floor(state.pinned.length / 5) * 90,
  });
}

function renderBoard() {
  const palette = $('board-palette');
  const canvasEl = $('board-canvas');
  const pinnedIds = new Set(state.pinned.map((p) => p.kind + ':' + p.id));

  const items = [];
  EVIDENCE.forEach((e) => {
    if (state.examined.has(e.id) && !pinnedIds.has('evidence:' + e.id)) {
      items.push({ id: e.id, kind: 'evidence', title: e.title });
    }
  });
  SUSPECTS.forEach((s) => {
    if (!pinnedIds.has('suspect:' + s.id)) {
      items.push({ id: s.id, kind: 'suspect', title: s.name });
    }
  });
  ['20:37 Last call', '20:47 Stair IN', '20:51 Sedan CCTV', '21:03 Figure', '21:10 Argument', '21:40 Stair OUT'].forEach(
    (t, i) => {
      const id = 'time-' + i;
      if (!pinnedIds.has('time:' + id)) items.push({ id, kind: 'time', title: t });
    }
  );

  palette.innerHTML = items.length
    ? ''
    : '<p class="dim">All discovered items are on the board.</p>';
  items.forEach((it) => {
    const el = document.createElement('div');
    el.className = 'palette-item';
    el.textContent = it.title;
    el.draggable = true;
    el.ondragstart = (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify(it));
    };
    el.onclick = () => {
      audio.boardPin();
      pinCard(it);
      renderBoard();
    };
    palette.appendChild(el);
  });

  canvasEl.innerHTML = '';
  state.pinned.forEach((p) => {
    const el = document.createElement('div');
    el.className = `pin-card ${p.kind}${state.selectedPin === p.id ? ' selected' : ''}`;
    el.style.left = p.x + 'px';
    el.style.top = p.y + 'px';
    el.dataset.id = p.id;
    el.innerHTML = `<div class="kind">${p.kind.toUpperCase()}</div>${p.title}`;
    el.onpointerdown = (e) => {
      if (state.linkMode) {
        if (!state.selectedPin) state.selectedPin = p.id;
        else if (state.selectedPin !== p.id) {
          const pair = [state.selectedPin, p.id];
          const exists = state.links.some(
            (l) => (l[0] === pair[0] && l[1] === pair[1]) || (l[0] === pair[1] && l[1] === pair[0])
          );
          if (!exists) state.links.push(pair);
          state.selectedPin = null;
          renderBoardLines();
        }
        renderBoard();
        return;
      }
      const startX = e.clientX;
      const startY = e.clientY;
      const ox = p.x;
      const oy = p.y;
      const move = (ev) => {
        p.x = ox + (ev.clientX - startX);
        p.y = oy + (ev.clientY - startY);
        el.style.left = p.x + 'px';
        el.style.top = p.y + 'px';
        renderBoardLines();
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    };
    canvasEl.appendChild(el);
  });
  renderBoardLines();
}

function renderBoardLines() {
  const svg = $('board-lines');
  const wrap = svg.parentElement;
  svg.setAttribute('viewBox', `0 0 ${wrap.clientWidth} ${wrap.clientHeight}`);
  svg.innerHTML = '';
  const byId = Object.fromEntries(state.pinned.map((p) => [p.id, p]));
  state.links.forEach(([a, b]) => {
    const pa = byId[a];
    const pb = byId[b];
    if (!pa || !pb) return;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', pa.x + 70);
    line.setAttribute('y1', pa.y + 30);
    line.setAttribute('x2', pb.x + 70);
    line.setAttribute('y2', pb.y + 30);
    line.setAttribute('stroke', '#b33a3a');
    line.setAttribute('stroke-width', '2');
    svg.appendChild(line);
  });
}

$('board-canvas').addEventListener('dragover', (e) => e.preventDefault());
$('board-canvas').addEventListener('drop', (e) => {
  e.preventDefault();
  try {
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    const rect = $('board-canvas').getBoundingClientRect();
    pinCard({ ...data, x: e.clientX - rect.left - 70, y: e.clientY - rect.top - 30 });
    // overwrite position if already pinned
    const existing = state.pinned.find((p) => p.id === data.id);
    if (existing) {
      existing.x = e.clientX - rect.left - 70;
      existing.y = e.clientY - rect.top - 30;
    }
    renderBoard();
  } catch (_) {}
});

$('btn-link-mode').onclick = () => {
  state.linkMode = !state.linkMode;
  state.selectedPin = null;
  $('btn-link-mode').classList.toggle('active', state.linkMode);
  renderBoard();
};
$('btn-clear-links').onclick = () => {
  state.links = [];
  renderBoardLines();
};

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------
function refreshTimeline() {
  const list = $('timeline-list');
  if (!state.timeline.length) {
    list.innerHTML = '<p class="dim">ยังไม่มีเหตุการณ์ ร้อยเรียงคืนนั้นจากหลักฐาน</p>';
  } else {
    list.innerHTML = state.timeline
      .map(
        (t, i) => `
      <div class="tl-item">
        <div class="t">${t.time}</div>
        <div>${t.text}<div class="src">${t.source || '—'}</div></div>
        <button data-rm="${i}">×</button>
      </div>`
      )
      .join('');
    list.querySelectorAll('[data-rm]').forEach((b) => {
      b.onclick = () => {
        state.timeline.splice(+b.dataset.rm, 1);
        refreshTimeline();
      };
    });
  }
  const sel = $('tl-source');
  sel.innerHTML =
    '<option value="">—</option>' +
    EVIDENCE.filter((e) => state.examined.has(e.id))
      .map((e) => `<option value="${e.id}">${e.title}</option>`)
      .join('');
}

$('btn-tl-add').onclick = () => {
  const time = $('tl-time').value.trim() || '??';
  const text = $('tl-text').value.trim();
  if (!text) return;
  const srcId = $('tl-source').value;
  const src = srcId ? evidenceById(srcId)?.title : '';
  state.timeline.push({ time, text, source: src });
  state.timeline.sort((a, b) => a.time.localeCompare(b.time));
  $('tl-text').value = '';
  audio.uiPaper();
  refreshTimeline();
};

// ---------------------------------------------------------------------------
// Interrogation
// ---------------------------------------------------------------------------
let currentSuspect = null;

function startInterrogation(suspectId) {
  currentSuspect = suspectId;
  const s = SUSPECTS.find((x) => x.id === suspectId);
  const iq = state.interrogation[suspectId];
  if (!iq.log.length) {
    iq.log.push({ who: s.name, text: INTERROGATION[suspectId].intro });
  }
  $('iq-name').textContent = s.name;
  renderInterrogation();
  openPanel('interrogate');
}

function renderInterrogation() {
  const s = SUSPECTS.find((x) => x.id === currentSuspect);
  const data = INTERROGATION[currentSuspect];
  const iq = state.interrogation[currentSuspect];
  $('iq-log').innerHTML = iq.log
    .map((m) => {
      const det = m.who === 'You' || m.who === 'DET';
      return `<span class="who ${det ? 'det' : ''}">${m.who}</span>${m.text}`;
    })
    .join('');
  $('iq-log').scrollTop = 1e9;

  const choices = $('iq-choices');
  choices.innerHTML = '';
  data.topics.forEach((t) => {
    const btn = document.createElement('button');
    const already = iq.asked.has(t.id);
    const needsEv = t.requiresEvidence && !state.examined.has(t.requiresEvidence);
    btn.innerHTML = `${t.label}${already ? '' : ''}${
      needsEv ? `<span class="need">requires examined evidence in your file</span>` : ''
    }`;
    btn.disabled = !!needsEv;
    btn.onclick = () => {
      audio.uiClick();
      const stateShown = {
        shown: [...state.examined],
      };
      const text =
        typeof t.response === 'function' ? t.response(stateShown) : t.response;
      iq.log.push({ who: 'You', text: t.label });
      iq.log.push({ who: s.name, text });
      iq.asked.add(t.id);
      if (t.unlocks) {
        state.examined.add(t.unlocks);
        refreshFile();
        renderEvidenceVisual(evidenceById(t.unlocks));
      }
      // Special: James confession requires both USB + burner
      if (currentSuspect === 'james' && t.id === 'final') {
        if (
          state.examined.has('ev-usb') &&
          state.examined.has('ev-burner-sms')
        ) {
          iq.log.push({
            who: 'NOTE',
            text: 'Subject has admitted presence at the office and a physical altercation. Formal charge recommendation available.',
          });
          pinCard({ id: 'james-confession', kind: 'event', title: 'James admits argument / blow' });
        }
      }
      renderInterrogation();
    };
    choices.appendChild(btn);
  });
}

// ---------------------------------------------------------------------------
// Computer
// ---------------------------------------------------------------------------
let currentApp = null;

function openComputer(appId = null) {
  const nav = $('computer-apps');
  nav.innerHTML = COMPUTER_APPS.map(
    (a) =>
      `<button data-app="${a.id}" class="${a.id === appId ? 'active' : ''}">${a.name}<small>${a.desc}</small></button>`
  ).join('');
  nav.querySelectorAll('[data-app]').forEach((b) => {
    b.onclick = () => openComputer(b.dataset.app);
  });
  currentApp = appId;
  renderComputerScreen(appId);
  openPanel('computer');
}

function renderComputerScreen(appId) {
  const el = $('computer-screen');
  if (!appId) {
    el.innerHTML = '<p class="dim">Select an application.</p>';
    return;
  }
  if (appId === 'case-db') {
    el.innerHTML = `
      <h4>CASE DATABASE</h4>
      <p>ID: ${CASE_META.id}</p>
      <p>TITLE: ${CASE_META.title}</p>
      <p>STATUS: ${CASE_META.status}</p>
      <p>CLASS: ${CASE_META.classification}</p>
      <p>RECEIVED: ${CASE_META.received}</p>
      <p class="warn">Officer notes are not auto-summarized. Build your own file.</p>`;
  } else if (appId === 'police-db') {
    el.innerHTML = `
      <h4>POLICE DATABASE</h4>
      <table>
        <tr><th>NAME</th><th>ROLE</th><th>HISTORY</th></tr>
        ${SUSPECTS.map(
          (s) => `<tr><td>${s.name}</td><td>${s.role}</td><td>${s.criminalHistory}</td></tr>`
        ).join('')}
        <tr><td>Marcus Chen</td><td>Victim</td><td>None</td></tr>
      </table>
      <p class="warn" style="margin-top:12px">Plate ****882 → rental, agency Hertz Downtown. Renter on file: E. Vargas.</p>`;
  } else if (appId === 'cctv') {
    el.innerHTML = `
      <h4>CCTV INDEX</h4>
      <p>› Garage G-3 20:51 — black sedan</p>
      <p>› Fire stair S-12 21:03 — hooded figure</p>
      <p>› Lobby L-1 after 18:00 — no J. Park</p>
      <p>› Elevator E-12 — no after-hours use</p>
      <p class="warn">Open physical prints on the desk for full frames.</p>`;
  } else if (appId === 'phone-records') {
    el.innerHTML = `
      <h4>PHONE RECORDS</h4>
      <p>Marcus Chen last calls:</p>
      <p>20:12 in Elena Vargas 4m</p>
      <p>20:37 out James Park 1m <span class="bad">LAST</span></p>
      <p>20:41 SMS → burner ****0142</p>
      <p style="margin-top:10px">Tower HARBOUR-12 21:03–21:15: VARGAS, BURNER, CHEN</p>
      <p class="warn">Handset offline 21:18.</p>`;
  } else if (appId === 'email') {
    el.innerHTML = `
      <h4>EMAIL ARCHIVE</h4>
      <p>› 14 Nov 16:44 M.Chen → J.Park “Tonight — 20:00, my office”</p>
      <p>› 13 Nov M.Chen → Legal (draft, unsent) “Assistant embezzlement…”</p>
      <p>› 12 Nov Meridian Capital → Board “Revised offer…”</p>
      <p class="warn">Draft unsent email is on the USB, not the mail server.</p>`;
  } else if (appId === 'map') {
    el.innerHTML = `
      <h4>CITY MAP — INCIDENT POINTS</h4>
      <table>
        <tr><th>SITE</th><th>ADDRESS</th><th>RELEVANCE</th></tr>
        ${LOCATIONS.map(
          (l) => `<tr><td>${l.name}</td><td>${l.address}</td><td>${l.id === 'office' ? 'PRIMARY SCENE' : '—'}</td></tr>`
        ).join('')}
      </table>`;
  } else if (appId === 'forensics') {
    el.innerHTML = `
      <h4>FORENSICS</h4>
      <p>ME M-88421 · Blunt force · TOD 21:00–21:30</p>
      <p>Footwear: partial size 10 common tread</p>
      <p>No foreign DNA under nails</p>
      <p>USB prints: smudged; phone burned handset: J. Park partial</p>`;
  } else if (appId === 'search') {
    el.innerHTML = `
      <h4>SEARCH</h4>
      <input type="search" id="db-search" placeholder="keyword…" />
      <div id="db-results"></div>`;
    const input = $('db-search');
    const run = () => {
      const q = input.value.toLowerCase().trim();
      const hits = [];
      if (!q) {
        $('db-results').innerHTML = '';
        return;
      }
      EVIDENCE.forEach((e) => {
        if ((e.title + e.body + e.short).toLowerCase().includes(q)) {
          hits.push(`<div class="hit"><strong>${e.title}</strong><br/>${e.short}</div>`);
        }
      });
      SUSPECTS.forEach((s) => {
        if ((s.name + s.role + s.alibiOfficial + s.relationship + s.financialNote).toLowerCase().includes(q)) {
          hits.push(`<div class="hit"><strong>${s.name}</strong><br/>${s.role} — ${s.financialNote}</div>`);
        }
      });
      $('db-results').innerHTML = hits.length ? hits.join('') : '<p class="dim">No hits.</p>';
    };
    input.oninput = run;
  }
}

// ---------------------------------------------------------------------------
// Accusation
// ---------------------------------------------------------------------------
function openAccusation() {
  const form = $('accuse-form');
  form.innerHTML = Object.entries(ACCUSATION_FIELDS)
    .map(
      ([key, field]) => `
      <label>${field.label}
        <select data-field="${key}">
          <option value="">— select —</option>
          ${field.options.map((o) => `<option value="${o.id}">${o.name}</option>`).join('')}
        </select>
      </label>`
    )
    .join('');
  const list = EVIDENCE.filter((e) => state.examined.has(e.id));
  $('accuse-evidence').innerHTML = list.length
    ? list
        .map(
          (e) => `
      <label>
        <input type="checkbox" value="${e.id}" ${state.accusationEvidence.has(e.id) ? 'checked' : ''} />
        <span><strong>${e.title}</strong><br/>${e.short}</span>
      </label>`
        )
        .join('')
    : '<p class="dim">You have not examined any evidence yet.</p>';
  $('accuse-evidence').querySelectorAll('input').forEach((cb) => {
    cb.onchange = () => {
      if (cb.checked) state.accusationEvidence.add(cb.value);
      else state.accusationEvidence.delete(cb.value);
    };
  });
  openPanel('accuse');
}

$('btn-submit-case').onclick = () => {
  const acc = {};
  document.querySelectorAll('[data-field]').forEach((sel) => {
    acc[sel.dataset.field] = sel.value;
  });
  if (!acc.who) {
    alert('Select a suspect before submitting.');
    return;
  }
  const evidenceIds = [...state.accusationEvidence];
  if (evidenceIds.length < 3) {
    alert('Attach at least 3 pieces of key evidence.');
    return;
  }
  const result = gradeAccusation(acc, evidenceIds, {
    links: state.links.length,
    pins: state.pinned.length,
  });
  $('verdict-title').textContent = result.title;
  $('verdict-rank').textContent = result.rank;
  $('verdict-summary').textContent = result.summary;
  audio.verdict(result.rank);
  openPanel('verdict');
};

$('btn-verdict-close').onclick = () => {
  closeAllPanels();
};

// ---------------------------------------------------------------------------
// Interaction / raycast
// ---------------------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);
let hover = null;

function updateInteraction() {
  if (state.mode !== 'play') {
    interactLabel.classList.add('hidden');
    hover = null;
    return;
  }
  raycaster.setFromCamera(center, camera);
  let best = null;
  let bestDist = Infinity;
  for (const item of office.interactables) {
    const pos = new THREE.Vector3();
    item.object.getWorldPosition(pos);
    const dist = player.position.distanceTo(pos);
    if (dist > (item.radius || 2)) continue;
    // Angle check: object roughly in front
    const toObj = pos.clone().sub(player.position).normalize();
    const fwd = player.getForward();
    const dot = toObj.dot(fwd);
    if (dot < 0.35) continue;
    const score = dist - dot;
    if (score < bestDist) {
      bestDist = score;
      best = item;
    }
  }
  hover = best;
  if (hover) {
    interactLabel.textContent = `[E] ${hover.label}`;
    interactLabel.classList.remove('hidden');
  } else {
    interactLabel.classList.add('hidden');
  }
  promptEl.textContent = hover
    ? hover.label
    : 'WASD เดิน · E โต้ตอบ · Tab แฟ้ม · B กระดาน · T ไทม์ไลน์ · Y สรุปคดี';
}

function onInteract() {
  if (!hover || state.mode !== 'play') return;
  audio.uiClick();
  const a = hover.action;
  if (a === 'evidence') showEvidence(hover.evidenceId);
  else if (a === 'computer' || a === 'computer-app') openComputer(hover.app || 'case-db');
  else if (a === 'board') {
    renderBoard();
    openPanel('board');
  }
  else if (a === 'file') {
    refreshFile();
    openPanel('file');
  }
  else if (a === 'interrogate') {
    refreshFile();
    openPanel('file');
    promptEl.textContent = 'เลือกผู้ต้องสงสัยจากแฟ้มคดีเพื่อสอบปากคำ';
  }
}

// ---------------------------------------------------------------------------
// Input chrome
// ---------------------------------------------------------------------------
// Case summary (player-written synthesis)
// ---------------------------------------------------------------------------
const summaryFields = [
  ['overview', 'sum-overview'],
  ['conflicts', 'sum-conflicts'],
  ['suspects', 'sum-suspects'],
  ['key', 'sum-key'],
  ['gaps', 'sum-gaps'],
];

function openSummary() {
  summaryFields.forEach(([key, id]) => {
    const el = $(id);
    if (el) el.value = state.summary[key] || '';
  });
  $('sum-saved-note').textContent = state.summary._saved
    ? `บันทึกล่าสุด: ${state.summary._saved}`
    : 'ยังไม่ได้บันทึกสำนวนรอบนี้';
  openPanel('summary');
}

function saveSummary() {
  summaryFields.forEach(([key, id]) => {
    const el = $(id);
    if (el) state.summary[key] = el.value;
  });
  state.summary._saved = new Date().toLocaleString('th-TH');
  $('sum-saved-note').textContent = `บันทึกแล้ว: ${state.summary._saved}`;
  audio.uiPaper();
}

$('btn-sum-save')?.addEventListener('click', saveSummary);
$('btn-sum-to-accuse')?.addEventListener('click', () => {
  saveSummary();
  openAccusation();
});

// ---------------------------------------------------------------------------
// Input chrome
// ---------------------------------------------------------------------------
$('btn-start').onclick = async () => {
  await audio.resume();
  closeAllPanels();
  hud.classList.remove('hidden');
  $('overlay-start').classList.add('hidden');
  state.mode = 'play';
  player.setFrozen(false);
  refreshFile();
  canvas.requestPointerLock?.();
};

canvas.addEventListener('click', () => {
  if (state.mode === 'play' && !document.pointerLockElement) canvas.requestPointerLock?.();
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyE') onInteract();
  if (e.code === 'KeyM') {
    state.muted = !state.muted;
    audio.setMuted(state.muted);
    $('btn-mute').textContent = state.muted ? 'ปิดเสียงอยู่' : 'เสียง';
  }
  if (e.code === 'Tab') {
    e.preventDefault();
    if (state.mode === 'ui' && !panels.file.classList.contains('hidden')) closeAllPanels();
    else {
      refreshFile();
      openPanel('file');
    }
  }
  if (e.code === 'KeyB') {
    if (state.mode === 'ui' && !panels.board.classList.contains('hidden')) closeAllPanels();
    else {
      renderBoard();
      openPanel('board');
    }
  }
  if (e.code === 'KeyT') {
    if (state.mode === 'ui' && !panels.timeline.classList.contains('hidden')) closeAllPanels();
    else {
      refreshTimeline();
      openPanel('timeline');
    }
  }
  if (e.code === 'KeyY') {
    if (state.mode === 'ui' && !panels.summary.classList.contains('hidden')) closeAllPanels();
    else openSummary();
  }
  if (e.code === 'Escape' && state.mode === 'ui') closeAllPanels();
});

document.querySelectorAll('[data-close]').forEach((btn) => {
  btn.onclick = () => closeAllPanels();
});
$('btn-notes').onclick = () => {
  audio.uiClick();
  refreshFile();
  openPanel('file');
};
$('btn-board').onclick = () => {
  audio.uiClick();
  renderBoard();
  openPanel('board');
};
$('btn-timeline').onclick = () => {
  audio.uiClick();
  refreshTimeline();
  openPanel('timeline');
};
$('btn-summary').onclick = () => {
  audio.uiClick();
  openSummary();
};
$('btn-accuse').onclick = () => {
  audio.uiClick();
  openAccusation();
};
$('btn-mute').onclick = () => {
  state.muted = !state.muted;
  audio.setMuted(state.muted);
  $('btn-mute').textContent = state.muted ? 'ปิดเสียงอยู่' : 'เสียง';
};

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------
let last = performance.now();
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state.mode !== 'menu') {
    player.update(dt);
  }
  office.update(dt);
  updateInteraction();
  renderer.render(scene, camera);
}
requestAnimationFrame(tick);

refreshFile();
