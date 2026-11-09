/* =========================================================
   משפחה במשימה – ניהול חוגים, רופאים, תורים ותרופות לילדים
   שני מצבים:
   • ענן (Firebase): חשבונות, משפחה משותפת לאמא ואבא, סנכרון בזמן אמת.
   • מקומי: כשאין הגדרות Firebase. הנתונים נשמרים רק בטלפון.
   ========================================================= */
import { firebaseConfig } from './firebase-config.js';

const params = new URLSearchParams(location.search);
const EMU = params.has('emulator') && ['localhost', '127.0.0.1'].includes(location.hostname);
const CONFIG = firebaseConfig || (EMU ? { apiKey: 'demo-key', authDomain: 'localhost', projectId: 'demo-family' } : null);
const APP_URL = location.origin + location.pathname.replace(/index\.html$/, '');

const KEY = 'family-quest-v1';
const USER_KEY = 'family-quest-user';
const DISMISS_KEY = 'family-quest-install-dismissed';

const DAYS = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
const DAYS_S = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
const KID_EMOJI = ['👦','👧','🧒','👶','🧑','👱','🦸','🧚','🦄','🐯','🐼','🦊','🐸','🐵','🚀','⚽'];
const COLORS = ['#ff6fb5','#3fa9ff','#22c97a','#ff9f1c','#a35cff','#14c8b8','#ff5d73','#ffd23f'];
const ACT_EMOJI = ['⚽','🏀','🎾','🏊','🤸','🥋','🩰','💃','🎨','🎹','🎸','🥁','🎤','♟️','🧪','🤖','📚','🐴','🛹','🎭'];
const DOC_EMOJI = ['🩺','🦷','👁️','👂','🧠','❤️','🦴','🧴','🤧','🧑‍⚕️'];
const UNITS = ['מ״ל','כדור','חצי כדור','טיפות','שקית','מ״ג','פאף','כפית','מריחה'];
const LEVELS = ['הורה מתחיל','הורה מתמיד','הורה מנוסה','סופר-הורה','אלוף המשפחה','מאסטר הלוגיסטיקה','אגדה חיה'];
const MOM_AV = ['👩','👩‍🦰','👩‍🦱','👩‍🦳','👱‍♀️','🧕','👸','🦸‍♀️','🧙‍♀️','🐱'];
const DAD_AV = ['👨','👨‍🦰','👨‍🦱','👨‍🦳','👱‍♂️','🧔','🤴','🦸‍♂️','🧙‍♂️','🐻'];
const XP_DOSE = 10, XP_ACT = 5, XP_APPT = 20;

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const dstr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => dstr(new Date());
const addDays = (s, n) => { const d = new Date(s + 'T12:00'); d.setDate(d.getDate() + n); return dstr(d); };
const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const hm = ts => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const dm = s => { const [, m, d] = s.split('-'); return `${+d}/${+m}`; };
const toMin = t => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + m; };
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 864e5);
const dayName = s => DAYS[new Date(s + 'T12:00').getDay()];
const byTime = (a, b) => (a.time || '').localeCompare(b.time || '');
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };

function fmtTs(ts) {
  const s = dstr(new Date(ts));
  if (s === today()) return `היום ${hm(ts)}`;
  if (s === addDays(today(), -1)) return `אתמול ${hm(ts)}`;
  return `${dm(s)} ${hm(ts)}`;
}
function fmtAgo(ts) {
  const m = Math.round((Date.now() - ts) / 6e4);
  if (m < 1) return 'ממש עכשיו';
  if (m < 60) return `לפני ${m} דק׳`;
  const h = Math.floor(m / 60), r = m % 60;
  if (h < 24) return `לפני ${h === 1 ? 'שעה' : h === 2 ? 'שעתיים' : h + ' שעות'}${r ? ` ו-${r} דק׳` : ''}`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'לפני יום' : `לפני ${d} ימים`;
}
function countdown(dateStr) {
  const n = daysBetween(today(), dateStr);
  if (n < 0) return n === -1 ? 'אתמול' : `לפני ${-n} ימים`;
  if (n === 0) return 'היום!';
  if (n === 1) return 'מחר';
  if (n === 2) return 'מחרתיים';
  return `בעוד ${n} ימים`;
}

/* =========================================================
   STATE
   ========================================================= */
function emptyData() {
  return {
    parents: { mom: { name: 'אמא', avatar: '👩' }, dad: { name: 'אבא', avatar: '👨' } },
    kids: [], activities: [], doctors: [], appointments: [], meds: [],
    log: [], done: {}, xp: { mom: 0, dad: 0 }, stars: {},
  };
}
let state = emptyData();
let family = null;          // בענן: {id, name, inviteCode, members}
let me = null;              // 'mom' | 'dad'
let S = null;               // שכבת הנתונים (מקומית או ענן)
const ui = { phase: 'loading', tab: 'home', kidFilter: 'all', docTab: 'appts', authMode: 'signin', authErr: '', onbTab: 'create', busy: false };

const parent = p => state.parents[p] || { name: '—', avatar: '🙂' };
const pname = p => p === 'both' ? 'שניהם' : p ? parent(p).name : '';
const kidOf = id => state.kids.find(k => k.id === id) || { name: 'ילד/ה', avatar: '🙂', color: '#b9b4d6' };
const doctorOf = id => state.doctors.find(d => d.id === id);
const xpOf = p => Math.max(0, state.xp[p] || 0);
const level = xp => Math.floor(xp / 100) + 1;
const levelName = xp => LEVELS[Math.min(level(xp) - 1, LEVELS.length - 1)];
const isCloud = () => S?.mode === 'cloud';

/* ---------- local backend ---------- */
function makeLocal() {
  const persist = () => {
    try { localStorage.setItem(KEY, JSON.stringify({ version: 2, ...state })); }
    catch (e) { toast('לא הצלחתי לשמור במכשיר 😕'); }
    scheduleRender();
  };
  return {
    mode: 'local',
    put(c, o) { const a = state[c], i = a.findIndex(x => x.id === o.id); i >= 0 ? (a[i] = o) : a.push(o); persist(); },
    del(c, id) { state[c] = state[c].filter(x => x.id !== id); persist(); },
    setParent(r, p) { state.parents[r] = p; persist(); },
    xp(r, n, k) {
      state.xp[r] = (state.xp[r] || 0) + n;
      if (k) state.stars[k] = (state.stars[k] || 0) + (n > 0 ? 1 : -1);
      persist();
    },
    setDone(key, v) { if (v) state.done[key] = v; else delete state.done[key]; persist(); },
    addLog(e) { state.log = [e, ...state.log.filter(l => l.id !== e.id)]; persist(); },
    delLog(id) { state.log = state.log.filter(l => l.id !== id); persist(); },
    deleteKid(kid, medIds, logIds, related) {
      state.kids = state.kids.filter(x => x.id !== kid);
      for (const [c, ids] of Object.entries(related)) state[c] = state[c].filter(x => !ids.includes(x.id));
      state.log = state.log.filter(l => !logIds.includes(l.id));
      delete state.stars[kid];
      persist();
    },
    replaceAll(data) { state = { ...emptyData(), ...data }; persist(); },
  };
}
function loadLocal() {
  try {
    const raw = JSON.parse(lsGet(KEY) || 'null');
    if (raw) {
      state = { ...emptyData(), ...raw };
      // גרסה 1 השתמשה ב-":" במפתחות של חוגים שבוצעו
      state.done = Object.fromEntries(Object.entries(state.done || {}).map(([k, v]) => [k.replace(':', '_'), v]));
    }
  } catch (e) {}
  const u = lsGet(USER_KEY);
  me = u === 'mom' || u === 'dad' ? u : null;
}

/* ---------- cloud snapshots → state ---------- */
const arr = m => Object.values(m || {}).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
function applyFamily(d) {
  const def = emptyData();
  family = { id: d.id, name: d.name, inviteCode: d.inviteCode, members: d.members || {} };
  state = {
    ...state,
    parents: { mom: { ...def.parents.mom, ...(d.parents?.mom || {}) }, dad: { ...def.parents.dad, ...(d.parents?.dad || {}) } },
    kids: arr(d.kids), activities: arr(d.activities), doctors: arr(d.doctors), appointments: arr(d.appointments), meds: arr(d.meds),
    done: d.done || {}, xp: { mom: 0, dad: 0, ...(d.xp || {}) }, stars: d.stars || {},
  };
  me = family.members[S.user()?.uid] || null;
}

/* ---------- writes (catch errors so nothing fails silently) ---------- */
function w(p) {
  if (p && typeof p.catch === 'function') p.catch(e => { console.error(e); toast('לא נשמר: ' + errMsg(e)); });
  return p;
}
const put = (c, o) => w(S.put(c, { createdAt: Date.now(), ...o }));

/* ---------- meds logic ---------- */
const medActive = (m, date) => !m.archived && (!m.start || m.start <= date) && (!m.end || date <= m.end);
function dosesFor(date) {
  const out = [];
  for (const m of state.meds) {
    if (m.mode !== 'scheduled' || !medActive(m, date)) continue;
    for (const t of m.times || []) {
      const taken = state.log.find(l => l.medId === m.id && l.date === date && l.slot === t);
      out.push({ m, t, taken });
    }
  }
  return out.sort((a, b) => a.t.localeCompare(b.t));
}
const lastGiven = medId => state.log.filter(l => l.medId === medId).sort((a, b) => b.ts - a.ts)[0];
function prnStatus(m) {
  const last = lastGiven(m.id);
  if (!last) return { last: null, ok: true };
  const next = last.ts + (Number(m.minHours) || 0) * 36e5;
  return { last, next, ok: Date.now() >= next };
}
const isLate = (date, t) => date === today() && toMin(nowHM()) > toMin(t) + 30;

/* =========================================================
   UI PRIMITIVES: toast, confetti, ask, share
   ========================================================= */
let toastTimer;
function toast(msg, cls = '') {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast ' + cls; t.textContent = msg; t.setAttribute('role', 'status');
  document.body.appendChild(t);
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), 2400);
}
function confetti(rect) {
  const r = rect || { left: innerWidth / 2, top: innerHeight / 3, width: 0, height: 0 };
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  for (let i = 0; i < 26; i++) {
    const c = document.createElement('i');
    c.className = 'cf';
    c.style.left = x + 'px'; c.style.top = y + 'px';
    c.style.background = COLORS[i % COLORS.length];
    c.style.setProperty('--dx', (Math.random() * 260 - 130) + 'px');
    c.style.setProperty('--dy', (Math.random() * 220 - 160) + 'px');
    c.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 1000);
  }
  try { navigator.vibrate?.(30); } catch (e) {}
}
const reward = (rect, n, extra = '') => { confetti(rect); toast(`⚡ קיבלת ${n} נקודות! ${extra}`, 'xp'); };

// חלון שאלה בעיצוב האפליקציה (במקום confirm של הדפדפן)
function ask(title, text, buttons = [{ label: 'כן', value: true, cls: 'primary' }, { label: 'ביטול', value: false, cls: 'ghost' }]) {
  return new Promise(resolve => {
    const back = document.createElement('div');
    back.className = 'modal-back ask-back';
    back.innerHTML = `<div class="modal ask" role="alertdialog" aria-modal="true" aria-label="${esc(title)}">
      <h2>${esc(title)}</h2>${text ? `<p>${esc(text)}</p>` : ''}
      <div class="form-actions">${buttons.map((b, i) => `<button type="button" class="btn ${b.cls || ''}" data-i="${i}">${esc(b.label)}</button>`).join('')}</div></div>`;
    const done = v => { back.remove(); document.removeEventListener('keydown', onKey, true); resolve(v); };
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); done(null); } };
    back.addEventListener('click', e => {
      if (e.target === back) return done(null);
      const b = e.target.closest('[data-i]');
      if (b) { e.stopPropagation(); done(buttons[+b.dataset.i].value); }
    });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(back);
    back.querySelector('.btn')?.focus();
  });
}
async function share(text, url) {
  if (navigator.share) {
    try { await navigator.share({ title: 'משפחה במשימה', text, url }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  window.open('https://wa.me/?text=' + encodeURIComponent(url ? `${text}\n${url}` : text), '_blank', 'noopener');
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('הועתק 📋'); }
  catch (e) { toast(text); }
}

/* ---------- install to home screen ---------- */
let installPrompt = null;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; scheduleRender(); });
addEventListener('appinstalled', () => { installPrompt = null; toast('האפליקציה הותקנה 🎉'); scheduleRender(); });
function installCard(force) {
  if (isStandalone() || (!force && lsGet(DISMISS_KEY))) return '';
  if (installPrompt) return `<div class="install"><div style="font-size:30px">📲</div>
    <div class="t"><b>להתקין על הטלפון?</b>האפליקציה תופיע במסך הבית ותיפתח במסך מלא.</div>
    <button class="btn gold small" data-act="install">התקנה</button>
    ${force ? '' : '<button class="icon-btn" data-act="dismissInstall" aria-label="סגירה">✖</button>'}</div>`;
  if (isIOS) return `<div class="install"><div style="font-size:30px">📲</div>
    <div class="t"><b>להוסיף למסך הבית</b>ב-Safari לוחצים על כפתור השיתוף <b style="display:inline">⬆️</b> ואז ״הוספה למסך הבית״.</div>
    ${force ? '' : '<button class="icon-btn" data-act="dismissInstall" aria-label="סגירה">✖</button>'}</div>`;
  return '';
}

/* =========================================================
   RENDER
   ========================================================= */
let rq = 0;
function scheduleRender() { if (!rq) rq = requestAnimationFrame(() => { rq = 0; render(); }); }

function render() {
  const app = $('#app'), tabs = $('#tabs');
  const inApp = ui.phase === 'app' && me;
  tabs.hidden = !inApp;
  if (ui.phase === 'loading') { app.innerHTML = `<div class="splash"><span>🏰</span></div>`; return; }
  if (ui.phase === 'error') { app.innerHTML = viewError(); return; }
  if (ui.phase === 'auth') { app.innerHTML = viewAuth(); return; }
  if (ui.phase === 'onboard') { app.innerHTML = viewOnboard(); return; }
  if (!me) { app.innerHTML = isCloud() ? viewOnboard() : viewPick(); return; }
  const views = { home: viewHome, acts: viewActs, docs: viewDocs, meds: viewMeds, family: viewFamily };
  app.innerHTML = viewTop() + (views[ui.tab] || viewHome)();
  renderTabs();
}

/* ---------- auth screens (cloud) ---------- */
const GOOGLE_SVG = `<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;

function viewAuth() {
  const up = ui.authMode === 'signup';
  const joining = lsGet('fq-pending-join');
  return `<section class="auth">
    <div class="hero"><div class="logo">🏰</div><h1>משפחה במשימה</h1>
      <p>חוגים, רופאים, תורים ותרופות של הילדים.<br>במקום אחד, כמו משחק.</p></div>
    ${joining ? `<div class="install"><div style="font-size:28px">💌</div><div class="t"><b>הוזמנת להצטרף למשפחה!</b>נכנסים או נרשמים, ומיד אחר כך מצטרפים.</div></div>` : ''}
    <div class="card">
      <h2>${up ? '✨ פתיחת חשבון' : '👋 כניסה'}</h2>
      ${ui.authErr ? `<div class="err" role="alert">${esc(ui.authErr)}</div>` : ''}
      <button class="btn gbtn block" data-act="google" ${ui.busy ? 'disabled' : ''}>${GOOGLE_SVG} המשך עם Google</button>
      <div class="or">או עם אימייל</div>
      <form data-form="auth" novalidate>
        ${up ? `<div class="field"><label for="a-name">השם שלך</label><input id="a-name" name="name" autocomplete="given-name" placeholder="למשל: מיכל"></div>` : ''}
        <div class="field"><label for="a-email">אימייל</label><input id="a-email" name="email" type="email" autocomplete="email" inputmode="email" dir="ltr" required></div>
        <div class="field"><label for="a-pass">סיסמה</label><input id="a-pass" name="pass" type="password" autocomplete="${up ? 'new-password' : 'current-password'}" dir="ltr" required minlength="6">
          ${up ? '<small>לפחות 6 תווים</small>' : ''}</div>
        <button class="btn primary block" type="submit" ${ui.busy ? 'disabled' : ''}>${ui.busy ? '⏳ רגע…' : up ? 'פתיחת חשבון' : 'כניסה'}</button>
      </form>
      <div class="row wrap" style="justify-content:space-between;margin-top:10px">
        <button class="linkish" data-act="authMode">${up ? 'כבר יש לי חשבון' : 'אין לי חשבון, להרשמה'}</button>
        ${up ? '' : '<button class="linkish" data-act="forgot">שכחתי סיסמה</button>'}
      </div>
    </div>
  </section>`;
}

function viewOnboard() {
  const u = S.user();
  const pending = lsGet('fq-pending-join') || '';
  const tab = pending ? 'join' : ui.onbTab;
  const myName = (u?.displayName || '').split(' ')[0];
  return `<section class="auth">
    <div class="hero"><div class="logo">🏡</div><h1>${myName ? `היי ${esc(myName)}!` : 'כמעט סיימנו!'}</h1>
      <p>יוצרים משפחה חדשה, או מצטרפים למשפחה שבן/בת הזוג כבר פתח/ה.</p></div>
    <div class="seg">
      <button class="${tab === 'create' ? 'on' : ''}" data-act="onbTab" data-v="create">🏠 משפחה חדשה</button>
      <button class="${tab === 'join' ? 'on' : ''}" data-act="onbTab" data-v="join">🔑 יש לי קוד</button>
    </div>
    <div class="card">
      ${ui.authErr ? `<div class="err" role="alert">${esc(ui.authErr)}</div>` : ''}
      ${tab === 'create' ? `
      <form data-form="create" novalidate>
        <div class="field"><label for="o-fam">שם המשפחה</label><input id="o-fam" name="fam" placeholder="למשל: משפחת כהן" required></div>
        <div class="field"><label>אני…</label><div class="opts">
          <label><input type="radio" name="role" value="mom" checked><span>👩 אמא</span></label>
          <label><input type="radio" name="role" value="dad"><span>👨 אבא</span></label></div></div>
        <div class="field"><label for="o-me">השם שלי באפליקציה</label><input id="o-me" name="me" value="${esc(myName)}" placeholder="אפשר גם ״אמא״"></div>
        <div class="field"><label for="o-partner">השם של בן/בת הזוג</label><input id="o-partner" name="partner" placeholder="אפשר גם ״אבא״"></div>
        <button class="btn primary block" type="submit" ${ui.busy ? 'disabled' : ''}>${ui.busy ? '⏳ רגע…' : '🚀 יוצאים לדרך'}</button>
      </form>` : `
      <form data-form="join" novalidate>
        <div class="field"><label for="o-code">קוד ההזמנה</label><input id="o-code" name="code" value="${esc(pending)}" dir="ltr" autocapitalize="characters" autocomplete="off" placeholder="ABCD2345" style="letter-spacing:3px;font-weight:700;text-align:center" required>
          <small>את הקוד מוצאים במסך ״משפחה״ בטלפון של בן/בת הזוג</small></div>
        <div class="field"><label>אני…</label><div class="opts">
          <label><input type="radio" name="role" value="mom"><span>👩 אמא</span></label>
          <label><input type="radio" name="role" value="dad" checked><span>👨 אבא</span></label></div></div>
        <button class="btn primary block" type="submit" ${ui.busy ? 'disabled' : ''}>${ui.busy ? '⏳ רגע…' : '🔑 הצטרפות למשפחה'}</button>
      </form>`}
    </div>
    <div style="text-align:center"><button class="btn white small" data-act="signOut">יציאה מהחשבון ${u?.email ? `(${esc(u.email)})` : ''}</button></div>
  </section>`;
}

function viewError() {
  return `<section class="auth"><div class="hero"><div class="logo">📡</div><h1>אין חיבור</h1>
    <p>${esc(ui.authErr || 'לא הצלחתי להתחבר לשרת. בדקו את החיבור לאינטרנט.')}</p></div>
    <button class="btn white block" data-act="reload">🔄 לנסות שוב</button></section>`;
}

/* ---------- local mode: pick player ---------- */
function viewPick() {
  const p = k => `<button class="player" data-act="pick" data-who="${k}">
      <span class="a">${esc(parent(k).avatar)}</span><span class="n">${esc(parent(k).name)}</span>
      <span class="l">רמה ${level(xpOf(k))} · ${esc(levelName(xpOf(k)))}</span></button>`;
  return `<section class="login">
    <div class="logo">🏰</div>
    <h1>משפחה במשימה</h1>
    <p>חוגים, רופאים, תורים ותרופות. במקום אחד, כמו משחק.</p>
    <p style="font-weight:700;margin-bottom:14px">מי משחק/ת עכשיו?</p>
    <div class="players">${p('mom')}${p('dad')}</div>
  </section>`;
}

/* ---------- header + tabs ---------- */
function viewTop() {
  const xp = xpOf(me), pr = xp % 100;
  return `<header class="top">
    <button class="me" data-act="meBtn" aria-label="${isCloud() ? 'המשפחה והחשבון' : 'החלפת משתמש'}">${esc(parent(me).avatar)}<b>רמה ${level(xp)}</b></button>
    <div class="who">
      <div class="hello">היי ${esc(parent(me).name)}! 👋</div>
      <div class="lvl">${esc(levelName(xp))} · עוד ${100 - pr} נק׳ לרמה הבאה</div>
      <div class="bar"><i style="width:${pr}%"></i></div>
    </div>
    <div class="xp">⚡${xp}<small>נקודות</small></div>
  </header>`;
}
function renderTabs() {
  const late = dosesFor(today()).filter(d => !d.taken && isLate(today(), d.t)).length;
  const t = [['home','🏠','הבית'],['acts','🎨','חוגים'],['docs','🩺','רופאים'],['meds','💊','תרופות'],['family','👨‍👩‍👧','משפחה']];
  $('#tabs').innerHTML = `<div class="in">${t.map(([k, e, l]) =>
    `<button class="${ui.tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}" ${ui.tab === k ? 'aria-current="page"' : ''}>
      <span class="e">${e}</span>${l}${k === 'meds' && late ? `<span class="dot">${late}</span>` : ''}</button>`).join('')}</div>`;
}
function kidsStrip() {
  return `<div class="kids">${state.kids.map(k => `
    <div class="kid" style="--kc:${esc(k.color)}">
      <div class="face">${esc(k.avatar)}</div><div class="nm">${esc(k.name)}</div>
      <div class="st">⭐ ${Math.max(0, state.stars[k.id] || 0)}</div></div>`).join('')}
    <div class="kid add" data-act="addKid" role="button" tabindex="0">＋<br>ילד/ה</div></div>`;
}

/* ---------- HOME ---------- */
function viewHome() {
  const t = today(), dow = new Date().getDay();
  if (!state.kids.length) {
    return `${installCard()}<div class="card" style="text-align:center">
      <div style="font-size:56px">🧸</div>
      <h2 style="justify-content:center">ברוכים הבאים למשחק!</h2>
      <p class="muted">המשימה הראשונה: להוסיף את הילדים.<br>אחר כך מוסיפים חוגים, רופאים ותרופות.</p>
      <button class="btn primary block" data-act="addKid">＋ הוספת ילד/ה ראשון/ה</button>
      ${isCloud() && Object.keys(family?.members || {}).length < 2 ? `<button class="btn block" style="margin-top:10px" data-act="invitePartner">💌 הזמנת בן/בת הזוג</button>` : ''}</div>`;
  }
  const doses = dosesFor(t);
  const acts = state.activities.filter(a => (a.days || []).includes(dow)).sort(byTime);
  const actDone = a => state.done[`${a.id}_${t}`];
  const total = doses.length + acts.length;
  const doneN = doses.filter(d => d.taken).length + acts.filter(actDone).length;
  const pct = total ? Math.round(doneN / total * 100) : 100;
  const prn = state.meds.filter(m => m.mode === 'prn' && medActive(m, t));
  const appts = state.appointments.filter(a => !a.done && a.date >= t && a.date <= addDays(t, 7))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const items = [
    ...doses.map(d => ({ time: d.t, html: doseItem(d, t) })),
    ...acts.map(a => ({ time: a.time, html: actItem(a, t) })),
  ].sort(byTime);
  const msg = !total ? 'אין משימות היום. יום חופשי! 🏖️' : pct === 100 ? 'כל המשימות הושלמו! אלופים 🏆' : `נשארו ${total - doneN} משימות`;
  const [mx, dx] = [xpOf('mom'), xpOf('dad')];
  return `
  ${installCard()}
  ${kidsStrip()}
  <div class="card">
    <div class="quest-head">
      <div class="ring" style="--p:${pct}"><span>${pct}%</span></div>
      <div><div class="t">המשימות של היום</div><div class="s">יום ${DAYS[dow]}, ${dm(t)} · ${msg}</div></div>
    </div>
    ${items.map(i => i.html).join('')}
  </div>
  ${prn.length ? `<div class="card"><h2>🆘 לפי הצורך</h2>${prn.map(prnItem).join('')}</div>` : ''}
  <div class="card">
    <h2>📅 תורים בשבוע הקרוב <span class="count">${appts.length}</span></h2>
    ${appts.map(apptItem).join('') || `<div class="empty">אין תורים בשבוע הקרוב 🎉</div>`}
  </div>
  <div class="card">
    <h2>🏆 טבלת ההורים</h2>
    <div class="vs">
      <div class="p ${mx > dx ? 'lead' : ''}"><div class="a">${esc(parent('mom').avatar)}</div><div class="n">${esc(parent('mom').name)}</div><div class="x">⚡${mx} · רמה ${level(mx)}</div></div>
      <div class="mid">VS</div>
      <div class="p ${dx > mx ? 'lead' : ''}"><div class="a">${esc(parent('dad').avatar)}</div><div class="n">${esc(parent('dad').name)}</div><div class="x">⚡${dx} · רמה ${level(dx)}</div></div>
    </div>
    <p class="muted" style="font-size:13px;margin:10px 0 0">תרופה שניתנה: ${XP_DOSE} נק׳ · הסעה לחוג: ${XP_ACT} נק׳ · תור שבוצע: ${XP_APPT} נק׳</p>
  </div>
  <button class="btn white block" data-act="shareDay">📤 שליחת סיכום היום בוואטסאפ</button>`;
}
function doseItem(d, date) {
  const k = kidOf(d.m.kidId), late = !d.taken && isLate(date, d.t);
  return `<div class="item ${d.taken ? 'done' : late ? 'late' : ''}" style="--kc:${esc(k.color)}">
    <div class="em">💊</div>
    <div class="body">
      <div class="t1">${esc(d.m.name)} ל${esc(k.name)} ${late ? '<span class="tag red">באיחור</span>' : ''}</div>
      <div class="t2">🕒 ${d.t} · ${esc(d.m.dose)} ${esc(d.m.unit)}${d.taken ? ` · ✅ ${esc(pname(d.taken.by))} נתן/ה ב-${hm(d.taken.ts)}` : ''}</div>
    </div>
    <button class="check ${d.taken ? 'on' : ''}" data-act="toggleDose" data-med="${d.m.id}" data-slot="${d.t}" data-date="${date}"
      aria-label="${d.taken ? 'ביטול סימון' : 'סימון שניתן'}">${d.taken ? '✓' : ''}</button>
  </div>`;
}
function actItem(a, date) {
  const k = kidOf(a.kidId), dn = state.done[`${a.id}_${date}`];
  return `<div class="item ${dn ? 'done' : ''}" style="--kc:${esc(k.color)}">
    <div class="em">${esc(a.emoji || '🎨')}</div>
    <div class="body">
      <div class="t1">${esc(a.name)} – ${esc(k.name)}</div>
      <div class="t2">🕒 ${esc(a.time)}${a.endTime ? '–' + esc(a.endTime) : ''}${a.place ? ' · 📍 ' + esc(a.place) : ''}${a.driver ? ' · 🚗 ' + esc(pname(a.driver)) : ''}${dn ? ` · ✅ ${esc(pname(dn.by))}` : ''}</div>
    </div>
    <button class="check ${dn ? 'on' : ''}" data-act="toggleAct" data-id="${a.id}" data-date="${date}" aria-label="סימון שהגענו">${dn ? '✓' : ''}</button>
  </div>`;
}
function prnItem(m) {
  const k = kidOf(m.kidId), s = prnStatus(m);
  return `<div class="item" style="--kc:${esc(k.color)}">
    <div class="em">🧃</div>
    <div class="body">
      <div class="t1">${esc(m.name)} ל${esc(k.name)}</div>
      <div class="t2">${esc(m.dose)} ${esc(m.unit)}${m.minHours ? ` · מרווח ${esc(m.minHours)} שעות` : ''}<br>
      ${s.last ? `אחרון: ${fmtTs(s.last.ts)} (${fmtAgo(s.last.ts)}) ע״י ${esc(pname(s.last.by))}` : 'עוד לא ניתן'}
      ${s.last && m.minHours ? (s.ok ? ' <span class="tag green">אפשר לתת</span>' : ` <span class="tag orange">שוב ב-${hm(s.next)}</span>`) : ''}</div>
    </div>
    <button class="btn go small" data-act="givePrn" data-med="${m.id}">נתתי</button>
  </div>`;
}
function apptItem(a) {
  const k = kidOf(a.kidId), d = doctorOf(a.doctorId), cd = countdown(a.date);
  return `<div class="item ${a.done ? 'done' : ''}" style="--kc:${esc(k.color)}">
    <div class="em">${esc(d?.emoji || '🩺')}</div>
    <div class="body">
      <div class="t1">${esc(k.name)} ${d ? '· ' + esc(d.name) : ''} ${!a.done ? `<span class="tag ${cd === 'היום!' ? 'red' : cd === 'מחר' ? 'orange' : 'yellow'}">${cd}</span>` : '<span class="tag green">בוצע</span>'}</div>
      <div class="t2">📆 יום ${dayName(a.date)} ${dm(a.date)} · ${esc(a.time)}${a.reason ? ' · ' + esc(a.reason) : ''}${a.escort ? ' · 🚗 ' + esc(pname(a.escort)) : ''}${a.done && a.summary ? '<br>📝 ' + esc(a.summary) : ''}</div>
    </div>
    <button class="icon-btn" data-act="editAppt" data-id="${a.id}" aria-label="עריכה">✏️</button>
  </div>`;
}

/* ---------- ACTIVITIES ---------- */
function kidFilterBar() {
  if (state.kids.length < 2) return '';
  return `<div class="filter">
    <button class="fbtn ${ui.kidFilter === 'all' ? 'on' : ''}" data-act="kidFilter" data-id="all">כולם</button>
    ${state.kids.map(k => `<button class="fbtn ${ui.kidFilter === k.id ? 'on' : ''}" data-act="kidFilter" data-id="${k.id}">${esc(k.avatar)} ${esc(k.name)}</button>`).join('')}
  </div>`;
}
const passFilter = x => ui.kidFilter === 'all' || x.kidId === ui.kidFilter;

function viewActs() {
  const dow = new Date().getDay();
  const list = state.activities.filter(passFilter);
  return `<div class="page-title">🎨 חוגים <button class="btn gold small" data-act="addAct">＋ חוג</button></div>
  ${kidFilterBar()}
  ${!list.length ? `<div class="card"><div class="empty"><span class="big">🎯</span>עוד אין חוגים. לוחצים על ״＋ חוג״ ומתחילים!</div></div>` : ''}
  ${DAYS.map((name, i) => {
    const day = list.filter(a => (a.days || []).includes(i)).sort(byTime);
    if (!day.length) return '';
    return `<div class="card day ${i === dow ? 'today' : ''}">
      <h3>יום ${name} ${i === dow ? '<span class="tag yellow">היום</span>' : ''}</h3>
      ${day.map(a => { const k = kidOf(a.kidId); return `<div class="item" style="--kc:${esc(k.color)}">
        <div class="em">${esc(a.emoji || '🎨')}</div>
        <div class="body"><div class="t1">${esc(a.name)} <span class="tag">${esc(k.avatar)} ${esc(k.name)}</span></div>
        <div class="t2">🕒 ${esc(a.time)}${a.endTime ? '–' + esc(a.endTime) : ''}${a.place ? ' · 📍 ' + esc(a.place) : ''}${a.driver ? ' · 🚗 ' + esc(pname(a.driver)) : ''}${a.notes ? '<br>📝 ' + esc(a.notes) : ''}</div></div>
        <button class="icon-btn" data-act="editAct" data-id="${a.id}" aria-label="עריכה">✏️</button></div>`; }).join('')}
    </div>`;
  }).join('')}
  ${list.length ? `<div class="card"><h2>📊 סיכום שבועי</h2>${state.kids.filter(k => ui.kidFilter === 'all' || k.id === ui.kidFilter).map(k => {
    const n = state.activities.filter(a => a.kidId === k.id).reduce((s, a) => s + (a.days || []).length, 0);
    return `<div class="row" style="margin-top:8px"><span style="font-size:22px">${esc(k.avatar)}</span><b>${esc(k.name)}</b><span class="spacer"></span><span class="chip">${n} מפגשים בשבוע</span></div>`;
  }).join('')}</div>` : ''}`;
}

/* ---------- DOCTORS & APPOINTMENTS ---------- */
function viewDocs() {
  const seg = `<div class="seg">
    <button class="${ui.docTab === 'appts' ? 'on' : ''}" data-act="docTab" data-v="appts">📅 תורים</button>
    <button class="${ui.docTab === 'docs' ? 'on' : ''}" data-act="docTab" data-v="docs">🩺 הרופאים שלנו</button></div>`;
  if (ui.docTab === 'docs') {
    return `<div class="page-title">🩺 רופאים <button class="btn gold small" data-act="addDoc">＋ רופא/ה</button></div>${seg}
    <div class="card">${state.doctors.map(d => `<div class="item">
      <div class="em">${esc(d.emoji || '🩺')}</div>
      <div class="body"><div class="t1">${esc(d.name)}</div>
      <div class="t2">${esc(d.specialty)}${d.phone ? ` · <span dir="ltr">${esc(d.phone)}</span>` : ''}${d.address ? '<br>📍 ' + esc(d.address) : ''}${d.notes ? '<br>📝 ' + esc(d.notes) : ''}</div></div>
      ${d.phone ? `<a class="icon-btn" href="tel:${esc(d.phone.replace(/[^\d+]/g, ''))}" aria-label="חיוג">📞</a>` : ''}
      ${d.address ? `<a class="icon-btn" href="https://waze.com/ul?q=${encodeURIComponent(d.address)}" target="_blank" rel="noopener" aria-label="ניווט">🧭</a>` : ''}
      <button class="icon-btn" data-act="editDoc" data-id="${d.id}" aria-label="עריכה">✏️</button></div>`).join('')
      || `<div class="empty"><span class="big">🧑‍⚕️</span>עוד אין רופאים. מוסיפים פעם אחת ומשתמשים בכל תור.</div>`}</div>`;
  }
  const t = today();
  const list = state.appointments.filter(passFilter);
  const up = list.filter(a => !a.done && a.date >= t).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const missed = list.filter(a => !a.done && a.date < t).sort((a, b) => b.date.localeCompare(a.date));
  const past = list.filter(a => a.done).sort((a, b) => b.date.localeCompare(a.date));
  return `<div class="page-title">🩺 תורים <button class="btn gold small" data-act="addAppt">＋ תור</button></div>${seg}
  ${kidFilterBar()}
  <div class="card"><h2>⏳ תורים קרובים <span class="count">${up.length}</span></h2>
    ${up.map(a => apptItem(a) + `<div class="row wrap" style="margin:6px 0 4px;justify-content:flex-end">
        <button class="btn small" data-act="ics" data-id="${a.id}">🗓️ ליומן</button>
        <button class="btn go small" data-act="apptDone" data-id="${a.id}">✓ היינו בתור</button></div>`).join('')
    || `<div class="empty"><span class="big">🌈</span>אין תורים קרובים</div>`}</div>
  ${missed.length ? `<div class="card"><h2>❓ עבר התאריך <span class="count">${missed.length}</span></h2>
    <p class="muted" style="margin:0;font-size:13px">היינו בתור? מסמנים ומקבלים נקודות.</p>
    ${missed.map(a => apptItem(a) + `<div class="row" style="margin:6px 0 4px;justify-content:flex-end"><button class="btn go small" data-act="apptDone" data-id="${a.id}">✓ היינו בתור</button></div>`).join('')}</div>` : ''}
  ${past.length ? `<div class="card"><details><summary>📁 היסטוריית תורים (${past.length})</summary>${past.map(apptItem).join('')}</details></div>` : ''}`;
}

/* ---------- MEDS ---------- */
function viewMeds() {
  const t = today();
  const list = state.meds.filter(passFilter);
  const active = list.filter(m => medActive(m, t));
  const other = list.filter(m => !medActive(m, t));
  const logs = state.log.filter(l => { const m = state.meds.find(x => x.id === l.medId); return m && passFilter(m); })
    .sort((a, b) => b.ts - a.ts).slice(0, 60);
  const groups = [];
  for (const l of logs) {
    const d = dstr(new Date(l.ts));
    if (!groups.length || groups[groups.length - 1].d !== d) groups.push({ d, items: [] });
    groups[groups.length - 1].items.push(l);
  }
  return `<div class="page-title">💊 תרופות <button class="btn gold small" data-act="addMed">＋ תרופה</button></div>
  ${kidFilterBar()}
  <div class="card"><h2>🧪 טיפולים פעילים <span class="count">${active.length}</span></h2>
    ${active.map(m => medCard(m, t)).join('') || `<div class="empty"><span class="big">💪</span>אין תרופות פעילות. כולם בריאים!</div>`}
  </div>
  <div class="card"><h2>📖 יומן נתינות</h2>
    ${groups.length ? groups.map(g => `<div class="grp">יום ${dayName(g.d)} ${dm(g.d)}</div><ul class="hist">${g.items.map(l => {
      const m = state.meds.find(x => x.id === l.medId), k = kidOf(m.kidId);
      return `<li><span class="when">🕒 ${hm(l.ts)}</span><span>${esc(k.avatar)} <b>${esc(m.name)}</b> ל${esc(k.name)} · ${esc(m.dose)} ${esc(m.unit)} · ע״י ${esc(pname(l.by))}${l.slot && l.slot !== hm(l.ts) ? ` <span class="muted">(מנה של ${l.slot})</span>` : ''}</span></li>`;
    }).join('')}</ul>`).join('') : `<div class="empty">היומן ריק. כל ״ניתן ✓״ נרשם כאן עם השעה ומי נתן.</div>`}
  </div>
  ${other.length ? `<div class="card"><details><summary>🗂️ טיפולים שהסתיימו או שעוד לא התחילו (${other.length})</summary>
    ${other.map(m => { const k = kidOf(m.kidId); return `<div class="item" style="--kc:${esc(k.color)}"><div class="em">💊</div>
      <div class="body"><div class="t1">${esc(m.name)} – ${esc(k.name)}</div><div class="t2">${m.start ? 'מ-' + dm(m.start) : ''} ${m.end ? 'עד ' + dm(m.end) : ''} ${m.archived ? '· הסתיים' : ''}</div></div>
      <button class="icon-btn" data-act="editMed" data-id="${m.id}" aria-label="עריכה">✏️</button></div>`; }).join('')}</details></div>` : ''}`;
}
function medCard(m, t) {
  const k = kidOf(m.kidId);
  let status;
  if (m.mode === 'scheduled') {
    const ds = dosesFor(t).filter(d => d.m.id === m.id);
    status = `<div class="chips">${ds.map(d => `<button class="chip ${d.taken ? 'ok' : ''}" style="cursor:pointer" data-act="toggleDose" data-med="${m.id}" data-slot="${d.t}" data-date="${t}">${d.taken ? '✅' : isLate(t, d.t) ? '⏰' : '⬜'} ${d.t}</button>`).join('')}</div>
      <div class="t2" style="margin-top:6px">היום: ${ds.filter(d => d.taken).length}/${ds.length} מנות${m.end ? ` · נשארו ${daysBetween(t, m.end) + 1} ימים` : ''}</div>`;
  } else {
    const s = prnStatus(m);
    status = `<div class="t2">לפי הצורך${m.minHours ? ` · לפחות ${esc(m.minHours)} שעות בין מנות` : ''}</div>
      ${s.last ? `<div class="${s.ok ? 'okbox' : 'warn'}">אחרון: ${fmtTs(s.last.ts)} ע״י ${esc(pname(s.last.by))}. ${s.ok ? 'אפשר לתת שוב ✅' : `אפשר שוב רק ב-${hm(s.next)} ⏳`}</div>` : ''}
      <div class="row" style="margin-top:8px"><button class="btn go small" data-act="givePrn" data-med="${m.id}">נתתי עכשיו</button></div>`;
  }
  return `<div class="item" style="--kc:${esc(k.color)};align-items:flex-start">
    <div class="em">${esc(k.avatar)}</div>
    <div class="body">
      <div class="t1">${esc(m.name)} <span class="tag">${esc(k.name)}</span></div>
      <div class="t2">💧 ${esc(m.dose)} ${esc(m.unit)}${m.notes ? ' · 📝 ' + esc(m.notes) : ''}</div>
      ${status}
    </div>
    <button class="icon-btn" data-act="editMed" data-id="${m.id}" aria-label="עריכה">✏️</button>
  </div>`;
}

/* ---------- FAMILY ---------- */
function viewFamily() {
  const u = isCloud() ? S.user() : null;
  const roles = Object.values(family?.members || {});
  return `<div class="page-title">👨‍👩‍👧 ${esc(family?.name || 'המשפחה')}
    ${isCloud() ? '<button class="btn white small" data-act="renameFamily">✏️ שם</button>' : ''}</div>

  ${isCloud() && roles.length < 2 ? inviteCard(true) : ''}

  <div class="card"><h2>🧒 הילדים <span class="count">${state.kids.length}</span></h2>
    ${state.kids.map(k => `<div class="item" style="--kc:${esc(k.color)}">
      <div class="em">${esc(k.avatar)}</div>
      <div class="body"><div class="t1">${esc(k.name)}</div><div class="t2">${k.birth ? `גיל ${age(k.birth)} · ` : ''}⭐ ${Math.max(0, state.stars[k.id] || 0)} כוכבים</div></div>
      <button class="icon-btn" data-act="editKid" data-id="${k.id}" aria-label="עריכה">✏️</button></div>`).join('')}
    <button class="btn primary block" style="margin-top:12px" data-act="addKid">＋ הוספת ילד/ה</button>
  </div>

  <div class="card"><h2>🎮 השחקנים</h2>
    ${['mom', 'dad'].map(p => `<div class="item"><div class="em">${esc(parent(p).avatar)}</div>
      <div class="body"><div class="t1">${esc(parent(p).name)} ${p === me ? '<span class="tag green">זה/זו אני</span>' : isCloud() && roles.includes(p) ? '<span class="tag">מחובר/ת</span>' : isCloud() ? '<span class="tag yellow">עוד לא הצטרף/ה</span>' : ''}</div>
      <div class="t2">רמה ${level(xpOf(p))} · ${esc(levelName(xpOf(p)))} · ⚡${xpOf(p)}</div></div>
      <button class="icon-btn" data-act="editParent" data-p="${p}" aria-label="עריכה">✏️</button></div>`).join('')}
    ${isCloud() ? '' : '<button class="btn block" style="margin-top:12px" data-act="switchUser">🔄 החלפת משתמש</button>'}
  </div>

  ${isCloud() && roles.length >= 2 ? inviteCard(false) : ''}

  <div class="card"><h2>🎁 ספרו לחברים</h2>
    <p class="muted" style="margin:0 0 10px;font-size:14px">שולחים קישור לחברים. כל משפחה פותחת חשבון משלה, והנתונים שלכם נשארים רק אצלכם.</p>
    <button class="btn gold block" data-act="shareApp">📣 שיתוף האפליקציה</button>
  </div>

  ${installCard(true) ? `<div class="card"><h2>📲 התקנה בטלפון</h2>${installCard(true)}</div>` : ''}

  <div class="card"><h2>💾 גיבוי</h2>
    <p class="muted" style="margin:0 0 10px;font-size:14px">${isCloud()
      ? 'הנתונים שמורים בענן ומסונכרנים בין הטלפונים. אפשר גם להוריד עותק לגיבוי, או לטעון גיבוי מהגרסה המקומית.'
      : 'הנתונים שמורים בטלפון הזה בלבד. כדי להעביר לטלפון אחר: מורידים גיבוי, שולחים את הקובץ, ובטלפון השני לוחצים ״טעינת גיבוי״.'}</p>
    <div class="row wrap"><button class="btn primary" data-act="export">⬇️ הורדת גיבוי</button><button class="btn" data-act="import">⬆️ טעינת גיבוי</button></div>
  </div>

  ${isCloud() ? `<div class="card"><h2>👤 החשבון שלי</h2>
    <div class="muted" style="font-size:14px;margin-bottom:10px">מחובר/ת בתור <b dir="ltr">${esc(u?.email || u?.displayName || '')}</b></div>
    <div class="row wrap"><button class="btn" data-act="signOut">🚪 יציאה מהחשבון</button><button class="btn ghost" data-act="leaveFamily">עזיבת המשפחה</button></div></div>`
  : `<div class="card"><span class="badge-mode">📱 מצב מקומי</span><p class="muted" style="font-size:13px;margin:8px 0 0">חשבונות וסנכרון בין טלפונים יופעלו אחרי חיבור ל-Firebase.</p></div>`}

  <div class="card"><details><summary>⚠️ אזור מסוכן</summary>
    <button class="btn danger" style="margin-top:8px" data-act="reset">מחיקת כל הנתונים של המשפחה</button></details></div>`;
}
function inviteCard(prominent) {
  return `<div class="card" ${prominent ? 'style="outline:4px solid var(--yellow);outline-offset:-4px"' : ''}>
    <h2>💌 ${prominent ? 'הזמנת בן/בת הזוג' : 'קוד ההזמנה של המשפחה'}</h2>
    ${prominent ? '<p class="muted" style="margin:0 0 10px;font-size:14px">שולחים את ההזמנה. בן/בת הזוג פותח/ת חשבון, מצטרף/ת עם הקוד, ומאותו רגע שניכם רואים את אותם נתונים בזמן אמת.</p>' : ''}
    <div class="code">${esc(family?.inviteCode || '')}</div>
    <div class="row wrap" style="margin-top:10px"><button class="btn go" style="flex:1" data-act="invitePartner">📤 שליחת הזמנה</button><button class="btn" data-act="copyCode">📋 העתקה</button></div>
  </div>`;
}
function age(b) {
  const d = new Date(b + 'T12:00'), n = new Date();
  let y = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) y--;
  if (y < 1) { const m = (n.getFullYear() - d.getFullYear()) * 12 + n.getMonth() - d.getMonth(); return `${Math.max(m, 0)} חודשים`; }
  return y;
}

/* =========================================================
   FORMS (generic modal)
   ========================================================= */
let formCtx = null;
const kidOpts = () => state.kids.map(k => [k.id, `${k.avatar} ${k.name}`]);
const whoOpts = (blank = 'לא נקבע') => [['', blank], ['mom', parent('mom').name], ['dad', parent('dad').name], ['both', 'שניהם']];

function fieldHtml(f, v) {
  const id = 'f-' + f.k;
  const show = f.showIf ? `data-showif="${f.showIf[0]}=${f.showIf[1]}"` : '';
  const wrap = (inner, labelFor = true) => `<div class="field" ${show}><label ${labelFor ? `for="${id}"` : ''}>${esc(f.label)}</label>${inner}${f.hint ? `<small>${esc(f.hint)}</small>` : ''}</div>`;
  const radios = (cls, opts, rnd) => `<div class="opts ${cls}" role="radiogroup" aria-label="${esc(f.label)}">${opts.map(o => {
    const [val, lab] = Array.isArray(o) ? o : [o, o];
    return `<label><input type="radio" name="${f.k}" value="${esc(val)}" ${String(val) === String(v ?? '') ? 'checked' : ''}>${rnd(val, lab)}</label>`;
  }).join('')}</div>`;
  switch (f.type) {
    case 'select': return wrap(`<select id="${id}" name="${f.k}">${f.options.map(([val, lab]) => `<option value="${esc(val)}" ${String(val) === String(v ?? '') ? 'selected' : ''}>${esc(lab)}</option>`).join('')}</select>`);
    case 'textarea': return wrap(`<textarea id="${id}" name="${f.k}" placeholder="${esc(f.ph || '')}">${esc(v)}</textarea>`);
    case 'seg': return wrap(radios('', f.options, (val, lab) => `<span>${esc(lab)}</span>`), false);
    case 'emoji': return wrap(radios('emo', f.options, val => `<span>${esc(val)}</span>`), false);
    case 'color': return wrap(radios('colors', f.options, val => `<span style="background:${esc(val)}" aria-label="${esc(val)}"></span>`), false);
    case 'days': return wrap(`<div class="opts">${DAYS.map((d, i) => `<label><input type="checkbox" name="${f.k}" value="${i}" ${(v || []).includes(i) ? 'checked' : ''} aria-label="${d}"><span>${DAYS_S[i]}</span></label>`).join('')}</div>`, false);
    case 'times': return wrap(`<div class="times">${(v && v.length ? v : ['08:00']).map(timeRow).join('')}</div><button type="button" class="btn small" data-act="addTime">＋ הוספת שעה</button>`, false);
    default: return wrap(`<input id="${id}" type="${f.type || 'text'}" name="${f.k}" value="${esc(v)}" placeholder="${esc(f.ph || '')}" ${f.attrs || ''}>`);
  }
}
const timeRow = t => `<div class="trow"><input type="time" value="${esc(t)}" aria-label="שעה"><button type="button" class="icon-btn" data-act="rmTime" aria-label="הסרה">✖</button></div>`;

function openForm({ title, fields, values = {}, onSave, onDelete, deleteLabel = '🗑️ מחיקה' }) {
  closeModal();
  formCtx = { fields, onSave, onDelete };
  const back = document.createElement('div');
  back.className = 'modal-back'; back.id = 'modal';
  back.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <h2>${esc(title)}</h2>
    <form id="mform" novalidate>${fields.map(f => fieldHtml(f, values[f.k])).join('')}
      <div class="form-actions">
        <button class="btn primary" type="submit">💾 שמירה</button>
        ${onDelete ? `<button type="button" class="btn danger" data-act="formDelete">${deleteLabel}</button>` : ''}
        <button type="button" class="btn ghost" data-act="closeModal">ביטול</button>
      </div></form></div>`;
  document.body.appendChild(back);
  const form = $('#mform');
  const applyShow = () => form.querySelectorAll('[data-showif]').forEach(el => {
    const [k, v] = el.dataset.showif.split('=');
    el.hidden = (form.elements[k]?.value || '') !== v;
  });
  form.addEventListener('change', applyShow); applyShow();
  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = readForm(form, fields);
    const miss = fields.find(f => f.required && (!data[f.k] || (Array.isArray(data[f.k]) && !data[f.k].length))
      && !form.querySelector(`[name="${f.k}"]`)?.closest('[hidden]'));
    if (miss) { toast(`חסר: ${miss.label}`); return; }
    if (onSave(data) === false) return;
    closeModal(); render();
  });
  back.addEventListener('click', e => { if (e.target === back) closeModal(); });
  if (matchMedia('(hover:hover)').matches) setTimeout(() => form.querySelector('input:not([type=radio]):not([type=checkbox])')?.focus({ preventScroll: true }), 50);
}
function readForm(form, fields) {
  const out = {};
  for (const f of fields) {
    if (f.type === 'days') out[f.k] = [...form.querySelectorAll(`[name="${f.k}"]:checked`)].map(x => +x.value);
    else if (f.type === 'times') out[f.k] = [...new Set([...form.querySelectorAll('.times input')].map(x => x.value).filter(Boolean))].sort();
    else out[f.k] = (form.elements[f.k]?.value ?? '').trim();
  }
  return out;
}
function closeModal() { $('#modal')?.remove(); formCtx = null; }
function needKids() { if (state.kids.length) return false; toast('קודם מוסיפים ילד/ה 🧒'); kidForm(); return true; }

/* ---------- specific forms ---------- */
function kidForm(k) {
  openForm({
    title: k ? `עריכת ${k.name}` : 'ילד/ה חדש/ה 🎉',
    values: k || { avatar: KID_EMOJI[state.kids.length % KID_EMOJI.length], color: COLORS[state.kids.length % COLORS.length] },
    fields: [
      { k: 'name', label: 'שם', required: true, ph: 'למשל: נועה' },
      { k: 'avatar', label: 'הדמות', type: 'emoji', options: KID_EMOJI },
      { k: 'color', label: 'הצבע', type: 'color', options: COLORS },
      { k: 'birth', label: 'תאריך לידה (לא חובה)', type: 'date' },
    ],
    onSave: d => {
      if (k) put('kids', { ...k, ...d });
      else { put('kids', { id: uid(), ...d }); setTimeout(() => toast(`${d.name} הצטרף/ה למשחק! ⭐`, 'xp'), 50); }
    },
    onDelete: k && (async () => {
      const ok = await ask(`למחוק את ${k.name}?`, 'יימחקו גם החוגים, התורים והתרופות שלו/ה.', [
        { label: '🗑️ כן, למחוק', value: true, cls: 'danger' }, { label: 'ביטול', value: false, cls: 'ghost' }]);
      if (!ok) return;
      const related = {
        activities: state.activities.filter(x => x.kidId === k.id).map(x => x.id),
        appointments: state.appointments.filter(x => x.kidId === k.id).map(x => x.id),
        meds: state.meds.filter(x => x.kidId === k.id).map(x => x.id),
      };
      const logIds = state.log.filter(l => related.meds.includes(l.medId)).map(l => l.id);
      w(S.deleteKid(k.id, related.meds, logIds, related));
      if (ui.kidFilter === k.id) ui.kidFilter = 'all';
      closeModal(); render();
    }),
  });
}
function parentForm(p) {
  const v = parent(p);
  openForm({
    title: `עריכת ${v.name}`, values: v,
    fields: [
      { k: 'name', label: 'שם תצוגה', required: true },
      { k: 'avatar', label: 'דמות', type: 'emoji', options: p === 'mom' ? MOM_AV : DAD_AV },
    ],
    onSave: d => { w(S.setParent(p, { ...v, ...d })); },
  });
}
function actForm(a) {
  if (!a && needKids()) return;
  openForm({
    title: a ? 'עריכת חוג' : 'חוג חדש 🎯',
    values: a || { kidId: ui.kidFilter !== 'all' ? ui.kidFilter : state.kids[0]?.id, emoji: '⚽', days: [], time: '16:00' },
    fields: [
      { k: 'kidId', label: 'למי?', type: 'select', options: kidOpts() },
      { k: 'name', label: 'שם החוג', required: true, ph: 'למשל: כדורגל' },
      { k: 'emoji', label: 'אייקון', type: 'emoji', options: ACT_EMOJI },
      { k: 'days', label: 'ימים', type: 'days', required: true },
      { k: 'time', label: 'שעת התחלה', type: 'time', required: true },
      { k: 'endTime', label: 'שעת סיום', type: 'time' },
      { k: 'place', label: 'מקום', ph: 'למשל: המתנ״ס' },
      { k: 'driver', label: 'מי מסיע/ה?', type: 'select', options: whoOpts() },
      { k: 'notes', label: 'הערות', type: 'textarea', ph: 'מה להביא, טלפון של המדריך…' },
    ],
    onSave: d => { put('activities', a ? { ...a, ...d } : { id: uid(), ...d }); },
    onDelete: a && (async () => {
      if (!await ask('למחוק את החוג?', a.name, [{ label: '🗑️ מחיקה', value: true, cls: 'danger' }, { label: 'ביטול', value: false, cls: 'ghost' }])) return;
      w(S.del('activities', a.id)); closeModal(); render();
    }),
  });
}
function docForm(d, after) {
  openForm({
    title: d ? 'עריכת רופא/ה' : 'רופא/ה חדש/ה',
    values: d || { emoji: '🩺' },
    fields: [
      { k: 'name', label: 'שם', required: true, ph: 'למשל: ד״ר כהן' },
      { k: 'specialty', label: 'תחום', ph: 'רופאת ילדים, שיניים, עיניים…' },
      { k: 'emoji', label: 'אייקון', type: 'emoji', options: DOC_EMOJI },
      { k: 'phone', label: 'טלפון', type: 'tel', ph: '03-1234567', attrs: 'dir="ltr" inputmode="tel"' },
      { k: 'address', label: 'כתובת או מרפאה', ph: 'למשל: מכבי, הרצל 10 רחובות' },
      { k: 'notes', label: 'הערות', type: 'textarea' },
    ],
    onSave: v => {
      if (d) put('doctors', { ...d, ...v });
      else { const nd = { id: uid(), ...v }; put('doctors', nd); if (after) setTimeout(() => after(nd.id), 30); }
    },
    onDelete: d && (async () => {
      if (!await ask('למחוק את הרופא/ה?', 'התורים הקיימים יישארו.', [{ label: '🗑️ מחיקה', value: true, cls: 'danger' }, { label: 'ביטול', value: false, cls: 'ghost' }])) return;
      w(S.del('doctors', d.id)); closeModal(); render();
    }),
  });
}
function apptForm(a, preset) {
  if (!a && needKids()) return;
  if (!a && !state.doctors.length && !preset) {
    toast('קודם מוסיפים רופא/ה 🩺');
    docForm(null, id => apptForm(null, { doctorId: id }));
    return;
  }
  const doctors = state.doctors.map(d => [d.id, `${d.emoji || '🩺'} ${d.name}${d.specialty ? ' – ' + d.specialty : ''}`]);
  // רופא שנוסף הרגע עוד לא הגיע מהענן, לכן מוסיפים אותו לרשימה ידנית
  if (preset?.doctorId && !doctors.find(x => x[0] === preset.doctorId)) doctors.push([preset.doctorId, '🩺 הרופא/ה החדש/ה']);
  const fields = [
    { k: 'kidId', label: 'למי?', type: 'select', options: kidOpts() },
    { k: 'doctorId', label: 'רופא/ה', type: 'select', options: doctors },
    { k: 'date', label: 'תאריך', type: 'date', required: true },
    { k: 'time', label: 'שעה', type: 'time', required: true },
    { k: 'reason', label: 'סיבה', ph: 'ביקורת, חיסון, כאב אוזן…' },
    { k: 'escort', label: 'מי לוקח/ת?', type: 'select', options: whoOpts() },
  ];
  if (a) fields.push({ k: 'summary', label: 'סיכום הביקור', type: 'textarea', ph: 'מה הרופא/ה אמר/ה, המלצות, הפניות…' });
  openForm({
    title: a ? 'עריכת תור' : 'תור חדש 📅',
    values: a || { kidId: ui.kidFilter !== 'all' ? ui.kidFilter : state.kids[0]?.id, date: addDays(today(), 1), time: '09:00', ...preset },
    fields,
    onSave: d => { put('appointments', a ? { ...a, ...d } : { id: uid(), done: false, ...d }); },
    onDelete: a && (async () => {
      if (!await ask('למחוק את התור?', '', [{ label: '🗑️ מחיקה', value: true, cls: 'danger' }, { label: 'ביטול', value: false, cls: 'ghost' }])) return;
      w(S.del('appointments', a.id)); closeModal(); render();
    }),
  });
}
function medForm(m) {
  if (!m && needKids()) return;
  openForm({
    title: m ? 'עריכת תרופה' : 'תרופה חדשה 💊',
    values: m ? { ...m, minHours: m.minHours ?? '' } : { kidId: ui.kidFilter !== 'all' ? ui.kidFilter : state.kids[0]?.id, mode: 'scheduled', unit: 'מ״ל', times: ['08:00', '20:00'], start: today(), minHours: 6 },
    fields: [
      { k: 'kidId', label: 'למי?', type: 'select', options: kidOpts() },
      { k: 'name', label: 'שם התרופה', required: true, ph: 'למשל: מוקסיפן' },
      { k: 'dose', label: 'כמה בכל פעם?', required: true, ph: 'למשל: 5', attrs: 'inputmode="decimal"' },
      { k: 'unit', label: 'יחידה', type: 'seg', options: UNITS },
      { k: 'mode', label: 'מתי נותנים?', type: 'seg', options: [['scheduled', '⏰ בשעות קבועות'], ['prn', '🆘 לפי הצורך']] },
      { k: 'times', label: 'שעות נתינה', type: 'times', showIf: ['mode', 'scheduled'] },
      { k: 'minHours', label: 'מינימום שעות בין מנות', type: 'number', showIf: ['mode', 'prn'], attrs: 'min="0" step="0.5" inputmode="decimal"', hint: 'האפליקציה מזהירה אם נותנים מוקדם מדי' },
      { k: 'start', label: 'מתאריך', type: 'date' },
      { k: 'end', label: 'עד תאריך (סוף הטיפול)', type: 'date', hint: 'אפשר להשאיר ריק לטיפול קבוע' },
      { k: 'notes', label: 'הערות', type: 'textarea', ph: 'עם אוכל, לשמור במקרר…' },
    ],
    onSave: d => {
      if (d.mode === 'scheduled' && !d.times.length) { toast('חסרה לפחות שעה אחת'); return false; }
      put('meds', m ? { ...m, ...d } : { id: uid(), archived: false, ...d });
    },
    onDelete: m && (async () => {
      const choice = await ask(`מה לעשות עם ${m.name}?`, 'סיום הטיפול מעביר את התרופה ל״טיפולים שהסתיימו״, והיומן נשמר.', [
        ...(m.archived ? [] : [{ label: '🏁 סיום הטיפול', value: 'archive', cls: 'primary' }]),
        { label: '🗑️ מחיקה מלאה כולל היומן', value: 'delete', cls: 'danger' },
        { label: 'ביטול', value: null, cls: 'ghost' }]);
      if (!choice) return;
      if (choice === 'archive') put('meds', { ...m, archived: true });
      else {
        w(S.del('meds', m.id));
        state.log.filter(l => l.medId === m.id).forEach(l => w(S.delLog(l.id)));
      }
      closeModal(); render();
    }),
    deleteLabel: m?.archived ? '🗑️ מחיקה' : '🏁 סיום / מחיקה',
  });
}

/* =========================================================
   ACTIONS
   ========================================================= */
const rectOf = el => el?.getBoundingClientRect();
const A = {
  pick: el => { me = el.dataset.who; lsSet(USER_KEY, me); ui.tab = 'home'; render(); toast(`שלום ${parent(me).name}! המשחק מתחיל 🎮`); },
  switchUser: () => { me = null; lsSet(USER_KEY, null); render(); scrollTo(0, 0); },
  meBtn: () => isCloud() ? A.tab({ dataset: { tab: 'family' } }) : A.switchUser(),
  tab: el => { ui.tab = el.dataset.tab; render(); scrollTo(0, 0); },
  kidFilter: el => { ui.kidFilter = el.dataset.id; render(); },
  docTab: el => { ui.docTab = el.dataset.v; render(); },
  reload: () => location.reload(),

  /* auth */
  authMode: () => { ui.authMode = ui.authMode === 'signin' ? 'signup' : 'signin'; ui.authErr = ''; render(); },
  google: async () => {
    ui.authErr = ''; ui.busy = true; render();
    try { await S.google(); } catch (e) { ui.authErr = errMsg(e); }
    ui.busy = false; if (ui.phase === 'auth') render();
  },
  forgot: async () => {
    const email = $('#a-email')?.value.trim();
    if (!email) { ui.authErr = 'כותבים קודם את האימייל, ואז לוחצים ״שכחתי סיסמה״.'; render(); return; }
    try { await S.reset(email); toast('שלחנו מייל לאיפוס הסיסמה 📧'); } catch (e) { ui.authErr = errMsg(e); render(); }
  },
  signOut: async () => { await S.signOut(); me = null; family = null; state = emptyData(); ui.tab = 'home'; },
  onbTab: el => { ui.onbTab = el.dataset.v; ui.authErr = ''; if (el.dataset.v === 'create') lsSet('fq-pending-join', null); render(); },
  leaveFamily: async () => {
    const ok = await ask('לעזוב את המשפחה?', 'הנתונים יישארו אצל שאר בני המשפחה. אפשר לחזור בכל זמן עם קוד ההזמנה.', [
      { label: 'עזיבה', value: true, cls: 'danger' }, { label: 'ביטול', value: false, cls: 'ghost' }]);
    if (!ok) return;
    try { await S.leaveFamily(); } catch (e) { toast(errMsg(e)); return; }
    lsSet('fq-fam-' + S.user().uid, null);
    family = null; me = null; state = emptyData(); ui.phase = 'onboard'; ui.tab = 'home'; render();
  },
  renameFamily: () => openForm({
    title: 'שם המשפחה', values: { name: family?.name || '' }, fields: [{ k: 'name', label: 'שם המשפחה', required: true }],
    onSave: d => { w(S.setFamilyName(d.name)); },
  }),
  invitePartner: () => {
    const code = family.inviteCode;
    share(`💌 הצטרפו אליי ל״משפחה במשימה״, האפליקציה שלנו לחוגים, רופאים ותרופות של הילדים.\nפותחים חשבון ומצטרפים עם הקוד: ${code}`, `${APP_URL}?join=${code}`);
  },
  copyCode: () => copy(family.inviteCode),
  shareApp: () => share('🏰 מצאתי אפליקציה מגניבה לניהול הילדים: חוגים, רופאים, תורים ותרופות. הכל בעיצוב של משחק! פותחים חשבון משפחתי בחינם:', APP_URL),
  install: async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice.catch(() => {}); installPrompt = null; render(); },
  dismissInstall: () => { lsSet(DISMISS_KEY, '1'); render(); },

  addKid: () => kidForm(),
  editKid: el => kidForm(state.kids.find(k => k.id === el.dataset.id)),
  editParent: el => parentForm(el.dataset.p),
  addAct: () => actForm(),
  editAct: el => actForm(state.activities.find(x => x.id === el.dataset.id)),
  addDoc: () => docForm(),
  editDoc: el => docForm(state.doctors.find(x => x.id === el.dataset.id)),
  addAppt: () => apptForm(),
  editAppt: el => apptForm(state.appointments.find(x => x.id === el.dataset.id)),
  addMed: () => medForm(),
  editMed: el => medForm(state.meds.find(x => x.id === el.dataset.id)),

  addTime: () => $('#mform .times').insertAdjacentHTML('beforeend', timeRow('')),
  rmTime: el => el.closest('.trow').remove(),
  closeModal: () => closeModal(),
  formDelete: () => formCtx?.onDelete?.(),

  toggleDose: async el => {
    const { med, slot, date } = el.dataset;
    const m = state.meds.find(x => x.id === med);
    const l = state.log.find(x => x.medId === med && x.date === date && x.slot === slot);
    if (l) {
      const ok = await ask('לבטל את הסימון?', `${pname(l.by)} סימן/ה שניתן ב-${hm(l.ts)}.`, [
        { label: 'כן, לבטל', value: true, cls: 'danger' }, { label: 'השאירו', value: false, cls: 'ghost' }]);
      if (!ok) return;
      w(S.delLog(l.id)); w(S.xp(l.by, -XP_DOSE, m.kidId)); toast('הסימון בוטל');
      return;
    }
    const r = rectOf(el);
    // מזהה קבוע למנה, כדי ששני הורים שלוחצים יחד לא ירשמו פעמיים
    w(S.addLog({ id: `${med}_${date}_${slot.replace(':', '')}`, medId: med, date, slot, ts: Date.now(), by: me }));
    w(S.xp(me, XP_DOSE, m.kidId));
    reward(r, XP_DOSE, `⭐ ל${kidOf(m.kidId).name}`);
  },
  givePrn: async el => {
    const m = state.meds.find(x => x.id === el.dataset.med), s = prnStatus(m), r = rectOf(el);
    if (!s.ok) {
      const ok = await ask('⚠️ זהירות, מוקדם מדי', `המנה הקודמת ניתנה ${fmtAgo(s.last.ts)} ע״י ${pname(s.last.by)}.\nהמרווח שנקבע: ${m.minHours} שעות. אפשר שוב ב-${hm(s.next)}.`, [
        { label: 'לא לתת עכשיו', value: false, cls: 'primary' }, { label: 'לרשום בכל זאת', value: true, cls: 'ghost' }]);
      if (!ok) return;
    }
    w(S.addLog({ id: uid(), medId: m.id, date: today(), slot: null, ts: Date.now(), by: me }));
    w(S.xp(me, XP_DOSE, m.kidId));
    reward(r, XP_DOSE, `נרשם: ${m.name} ל${kidOf(m.kidId).name}`);
  },
  toggleAct: el => {
    const key = `${el.dataset.id}_${el.dataset.date}`, a = state.activities.find(x => x.id === el.dataset.id);
    const cur = state.done[key];
    if (cur) { w(S.setDone(key, null)); w(S.xp(cur.by, -XP_ACT)); return; }
    const r = rectOf(el);
    w(S.setDone(key, { by: me, ts: Date.now() })); w(S.xp(me, XP_ACT));
    reward(r, XP_ACT, `${a?.emoji || ''} ${a?.name || ''}`);
  },
  apptDone: el => {
    const a = state.appointments.find(x => x.id === el.dataset.id);
    openForm({
      title: 'איך היה בתור? 📝',
      fields: [{ k: 'summary', label: 'סיכום קצר (לא חובה)', type: 'textarea', ph: 'מה נאמר, המלצות, תור המשך…' }],
      values: { summary: a.summary || '' },
      onSave: d => {
        put('appointments', { ...a, done: true, summary: d.summary, doneBy: me });
        w(S.xp(me, XP_APPT, a.kidId));
        setTimeout(() => reward(null, XP_APPT, 'כל הכבוד על התור!'), 50);
      },
    });
  },
  ics: el => {
    const a = state.appointments.find(x => x.id === el.dataset.id), d = doctorOf(a.doctorId), k = kidOf(a.kidId);
    const st = new Date(`${a.date}T${a.time || '09:00'}`), en = new Date(st.getTime() + 30 * 6e4);
    const f = x => `${x.getFullYear()}${pad(x.getMonth() + 1)}${pad(x.getDate())}T${pad(x.getHours())}${pad(x.getMinutes())}00`;
    const clean = s => String(s || '').replace(/[,;\\]/g, ' ').replace(/\n/g, ' ');
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FamilyQuest//HE', 'BEGIN:VEVENT', `UID:${a.id}@family-quest`,
      `DTSTAMP:${f(new Date())}`, `DTSTART:${f(st)}`, `DTEND:${f(en)}`,
      `SUMMARY:${clean(`תור ל${k.name}${d ? ' – ' + d.name : ''}`)}`, `LOCATION:${clean(d?.address)}`, `DESCRIPTION:${clean(a.reason)}`,
      'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:תזכורת לתור', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    download(new Blob([ics], { type: 'text/calendar' }), `appointment-${a.date}.ics`);
  },
  shareDay: () => {
    const t = today(), dow = new Date().getDay();
    const lines = [`🏰 סיכום היום (${DAYS[dow]} ${dm(t)}):`];
    const doses = dosesFor(t);
    if (doses.length) {
      lines.push('', '💊 תרופות:');
      doses.forEach(d => lines.push(`${d.taken ? '✅' : '⬜'} ${d.t} ${d.m.name} ל${kidOf(d.m.kidId).name}${d.taken ? ` (${pname(d.taken.by)} ${hm(d.taken.ts)})` : ''}`));
    }
    state.log.filter(l => !l.slot && l.date === t).forEach(l => {
      const m = state.meds.find(x => x.id === l.medId);
      if (m) lines.push(`🆘 ${hm(l.ts)} ${m.name} ל${kidOf(m.kidId).name} (${pname(l.by)})`);
    });
    const acts = state.activities.filter(a => (a.days || []).includes(dow)).sort(byTime);
    if (acts.length) {
      lines.push('', '🎨 חוגים:');
      acts.forEach(a => lines.push(`${state.done[`${a.id}_${t}`] ? '✅' : '⬜'} ${a.time} ${a.name} – ${kidOf(a.kidId).name}${a.driver ? ` (🚗 ${pname(a.driver)})` : ''}`));
    }
    const ap = state.appointments.filter(a => !a.done && a.date >= t && a.date <= addDays(t, 2));
    if (ap.length) { lines.push('', '🩺 תורים קרובים:'); ap.forEach(a => lines.push(`${countdown(a.date)} ${a.time} ${kidOf(a.kidId).name}${doctorOf(a.doctorId) ? ' – ' + doctorOf(a.doctorId).name : ''}`)); }
    if (lines.length === 1) lines.push('אין משימות היום 🏖️');
    window.open('https://wa.me/?text=' + encodeURIComponent(lines.join('\n')), '_blank', 'noopener');
  },
  export: () => {
    const { parents, kids, activities, doctors, appointments, meds, log, done, xp, stars } = state;
    download(new Blob([JSON.stringify({ version: 2, parents, kids, activities, doctors, appointments, meds, log, done, xp, stars }, null, 1)], { type: 'application/json' }), `family-backup-${today()}.json`);
  },
  import: () => $('#importFile').click(),
  reset: async () => {
    const ok = await ask('למחוק את כל הנתונים?', isCloud() ? 'הנתונים יימחקו לכל בני המשפחה, בכל הטלפונים. אי אפשר לבטל.' : 'כל הנתונים יימחקו מהטלפון הזה. אי אפשר לבטל.', [
      { label: '🗑️ כן, למחוק הכל', value: true, cls: 'danger' }, { label: 'ביטול', value: false, cls: 'ghost' }]);
    if (!ok) return;
    const { parents } = state;
    w(S.replaceAll({ ...emptyData(), parents }, state.log.map(l => l.id)));
    toast('הכל נמחק. מתחילים מחדש 🌱');
  },
};
function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ---------- error messages ---------- */
function errMsg(e) {
  const c = e?.code || '';
  const map = {
    'auth/invalid-email': 'כתובת האימייל לא תקינה.',
    'auth/missing-email': 'חסר אימייל.',
    'auth/missing-password': 'חסרה סיסמה.',
    'auth/weak-password': 'הסיסמה צריכה להיות לפחות 6 תווים.',
    'auth/email-already-in-use': 'כבר יש חשבון עם האימייל הזה. לוחצים ״כבר יש לי חשבון״ ונכנסים.',
    'auth/invalid-credential': 'האימייל או הסיסמה לא נכונים.',
    'auth/wrong-password': 'האימייל או הסיסמה לא נכונים.',
    'auth/user-not-found': 'אין חשבון עם האימייל הזה.',
    'auth/popup-blocked': 'הדפדפן חסם את חלון הכניסה של Google. נסו שוב, או היכנסו עם אימייל וסיסמה.',
    'auth/popup-closed-by-user': '',
    'auth/cancelled-popup-request': '',
    'auth/unauthorized-domain': 'הכתובת של האתר עוד לא אושרה ב-Firebase (Authentication → Settings → Authorized domains).',
    'auth/operation-not-allowed': 'שיטת הכניסה הזו לא הופעלה ב-Firebase.',
    'auth/network-request-failed': 'אין חיבור לאינטרנט.',
    'auth/too-many-requests': 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.',
    'app/bad-code': 'הקוד לא נמצא. בדקו שהעתקתם אותו נכון.',
    'permission-denied': 'אין הרשאה. אולי הקוד לא נכון, או שהוצאתם מהמשפחה.',
    'unavailable': 'אין חיבור לשרת כרגע.',
  };
  return c in map ? map[c] : (e?.message || 'משהו השתבש');
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || !A[el.dataset.act] || el.disabled) return;
  e.preventDefault();
  A[el.dataset.act](el, e);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !document.querySelector('.ask-back')) closeModal();
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role=button][data-act]')) { e.preventDefault(); e.target.click(); }
});
$('#app').addEventListener('submit', async e => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  const f = Object.fromEntries(new FormData(form));
  ui.authErr = '';
  try {
    if (form.dataset.form === 'auth') {
      if (!f.email || !f.pass) { ui.authErr = 'צריך אימייל וסיסמה.'; render(); return; }
      ui.busy = true; render();
      if (ui.authMode === 'signup') await S.signUp(f.email.trim(), f.pass, (f.name || '').trim());
      else await S.signIn(f.email.trim(), f.pass);
    } else if (form.dataset.form === 'create') {
      if (!f.fam?.trim()) { ui.authErr = 'חסר שם משפחה.'; render(); return; }
      const role = f.role === 'dad' ? 'dad' : 'mom', other = role === 'mom' ? 'dad' : 'mom';
      const parents = emptyData().parents;
      if (f.me?.trim()) parents[role].name = f.me.trim();
      if (f.partner?.trim()) parents[other].name = f.partner.trim();
      ui.busy = true; render();
      const fid = await S.createFamily({ name: f.fam.trim(), role, parents });
      ui.busy = false;
      startFamily(fid, true);
    } else if (form.dataset.form === 'join') {
      if (!f.code?.trim()) { ui.authErr = 'חסר קוד הזמנה.'; render(); return; }
      ui.busy = true; render();
      const fid = await S.joinFamily(f.code, f.role === 'mom' ? 'mom' : 'dad');
      lsSet('fq-pending-join', null);
      ui.busy = false;
      startFamily(fid);
      setTimeout(() => { confetti(); toast('הצטרפת למשפחה! 🎉', 'xp'); }, 300);
    }
  } catch (err) {
    console.error(err);
    ui.busy = false; ui.authErr = errMsg(err); render();
  }
});
$('#importFile').addEventListener('change', async e => {
  const file = e.target.files[0]; e.target.value = '';
  if (!file) return;
  let data;
  try { data = JSON.parse(await file.text()); if (!data || !Array.isArray(data.kids)) throw 0; }
  catch (err) { toast('הקובץ לא נראה כמו גיבוי של האפליקציה'); return; }
  const ok = await ask('לטעון את הגיבוי?', `בגיבוי: ${data.kids.length} ילדים, ${(data.meds || []).length} תרופות, ${(data.activities || []).length} חוגים.\nהנתונים הנוכחיים יוחלפו${isCloud() ? ' לכל בני המשפחה' : ''}.`);
  if (!ok) return;
  data.done = Object.fromEntries(Object.entries(data.done || {}).map(([k, v]) => [k.replace(':', '_'), v]));
  w(S.replaceAll({ ...emptyData(), ...data }, state.log.map(l => l.id)));
  toast('הגיבוי נטען ✅');
});

// רענון כל דקה (כדי שסימוני ״באיחור״ יתעדכנו), רק כשאין חלון פתוח
setInterval(() => { if (!$('#modal') && ui.phase === 'app' && me) render(); }, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && !$('#modal') && ui.phase === 'app') render(); });

/* =========================================================
   BOOT
   ========================================================= */
function startFamily(fid, fresh) {
  const u = S.user();
  lsSet('fq-fam-' + u.uid, fid);
  S.watch(fid,
    d => {
      applyFamily(d);
      if (!me) { lsSet('fq-fam-' + u.uid, null); S.unwatch(); ui.phase = 'onboard'; scheduleRender(); return; }
      if (ui.phase !== 'app') { ui.phase = 'app'; if (fresh) setTimeout(() => toast('המשפחה נוצרה! 🎉 עכשיו מוסיפים ילדים', 'xp'), 200); }
      scheduleRender();
    },
    logs => { state.log = logs; scheduleRender(); },
    err => {
      console.error(err);
      lsSet('fq-fam-' + u.uid, null);
      S.unwatch(); family = null; me = null; state = emptyData();
      ui.phase = 'onboard'; ui.authErr = err?.code === 'permission-denied' || err?.code === 'not-found' ? 'אין לך גישה למשפחה הזו יותר. אפשר ליצור משפחה חדשה או להצטרף עם קוד.' : errMsg(err);
      scheduleRender();
    });
}

async function boot() {
  const join = params.get('join');
  if (join) { lsSet('fq-pending-join', join.toUpperCase()); history.replaceState(null, '', location.pathname + (EMU ? '?emulator' : '')); }

  if (!CONFIG) {
    S = makeLocal(); loadLocal(); ui.phase = 'app'; render(); return;
  }
  try {
    const { initCloud } = await import('./cloud.js');
    S = await initCloud(CONFIG, { emulator: EMU });
  } catch (e) {
    console.error(e); ui.phase = 'error'; ui.authErr = 'לא הצלחתי לטעון את האפליקציה. בדקו את החיבור לאינטרנט.'; render(); return;
  }
  S.onAuth(async u => {
    if (!u) { S.unwatch(); family = null; me = null; ui.phase = 'auth'; ui.busy = false; render(); return; }
    ui.busy = false; ui.authErr = '';
    const cached = lsGet('fq-fam-' + u.uid);
    if (cached) { ui.phase = 'loading'; render(); startFamily(cached); return; }
    ui.phase = 'loading'; render();
    try {
      const fid = await S.myFamilyId();
      if (fid) startFamily(fid);
      else { ui.phase = 'onboard'; render(); }
    } catch (e) {
      console.error(e); ui.phase = 'error'; ui.authErr = errMsg(e); render();
    }
  });
}

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();
