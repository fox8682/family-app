// שכבת הענן: חשבונות (Firebase Auth) ונתוני המשפחה (Cloud Firestore).
//
// מבנה הנתונים:
//   users/{uid}            → { familyId }
//   invites/{code}         → { familyId }                      (קוד הזמנה לבן/בת הזוג)
//   families/{familyId}    → { name, inviteCode, members:{uid:role}, joins:{uid:code},
//                              parents:{mom,dad}, kids:{id:…}, activities:{…}, doctors:{…},
//                              appointments:{…}, meds:{…}, done:{…}, xp:{mom,dad}, stars:{kidId:n} }
//   families/{id}/log/{id} → { medId, date, slot, ts, by }     (יומן נתינת תרופות)
//
// כל פריט נשמר כשדה נפרד במפה (kids.<id>), כך ששני טלפונים שעורכים בו-זמנית לא דורסים זה את זה.

const V = '10.12.2';
const BASE = `https://www.gstatic.com/firebasejs/${V}`;

export async function initCloud(config, { emulator = false } = {}) {
  const [appM, authM, fsM] = await Promise.all([
    import(`${BASE}/firebase-app.js`),
    import(`${BASE}/firebase-auth.js`),
    import(`${BASE}/firebase-firestore.js`),
  ]);
  const { initializeApp } = appM;
  const {
    getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword,
    signInWithEmailAndPassword, sendPasswordResetEmail, signOut, connectAuthEmulator, updateProfile,
    setPersistence, browserLocalPersistence,
  } = authM;
  const {
    initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache, connectFirestoreEmulator,
    doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, orderBy, limit,
    writeBatch, deleteField, increment, serverTimestamp,
  } = fsM;

  const app = initializeApp(config);
  const auth = getAuth(app);
  auth.languageCode = 'he';
  let db;
  try {
    db = initializeFirestore(app, emulator
      ? { localCache: memoryLocalCache() }
      : { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  } catch (e) {
    db = initializeFirestore(app, { localCache: memoryLocalCache() });
  }
  if (emulator) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  try { await setPersistence(auth, browserLocalPersistence); } catch (e) {}

  let famRef = null, unsubFam = null, unsubLog = null;

  const CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const newCode = () => Array.from(crypto.getRandomValues(new Uint32Array(8)), n => CODE_ABC[n % CODE_ABC.length]).join('');
  const newId = () => doc(collection(db, 'families')).id;

  const api = {
    mode: 'cloud',

    /* ---------- auth ---------- */
    onAuth(cb) { return onAuthStateChanged(auth, cb); },
    user: () => auth.currentUser,
    google: () => signInWithPopup(auth, new GoogleAuthProvider()),
    signUp: async (email, pass, name) => {
      const c = await createUserWithEmailAndPassword(auth, email, pass);
      if (name) try { await updateProfile(c.user, { displayName: name }); } catch (e) {}
      return c;
    },
    signIn: (email, pass) => signInWithEmailAndPassword(auth, email, pass),
    reset: email => sendPasswordResetEmail(auth, email),
    async signOut() { api.unwatch(); await signOut(auth); },

    /* ---------- family membership ---------- */
    async myFamilyId() {
      const s = await getDoc(doc(db, 'users', auth.currentUser.uid));
      return s.exists() ? s.data().familyId || null : null;
    },
    async createFamily({ name, role, parents }) {
      const uid = auth.currentUser.uid, fid = newId(), code = newCode();
      const b = writeBatch(db);
      b.set(doc(db, 'families', fid), {
        name, inviteCode: code, createdAt: serverTimestamp(), createdBy: uid,
        members: { [uid]: role }, joins: {}, parents,
        kids: {}, activities: {}, doctors: {}, appointments: {}, meds: {}, done: {}, xp: { mom: 0, dad: 0 }, stars: {},
      });
      b.set(doc(db, 'invites', code), { familyId: fid });
      b.set(doc(db, 'users', uid), { familyId: fid });
      await b.commit();
      return fid;
    },
    async joinFamily(code, role) {
      code = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const inv = await getDoc(doc(db, 'invites', code));
      if (!inv.exists()) throw Object.assign(new Error('bad code'), { code: 'app/bad-code' });
      const fid = inv.data().familyId, uid = auth.currentUser.uid;
      await updateDoc(doc(db, 'families', fid), { [`members.${uid}`]: role, [`joins.${uid}`]: code });
      await setDoc(doc(db, 'users', uid), { familyId: fid });
      return fid;
    },
    async leaveFamily() {
      const uid = auth.currentUser.uid;
      if (famRef) await updateDoc(famRef, { [`members.${uid}`]: deleteField(), [`joins.${uid}`]: deleteField() });
      api.unwatch();
      await setDoc(doc(db, 'users', uid), { familyId: null });
    },

    /* ---------- live data ---------- */
    watch(fid, onFamily, onLog, onError) {
      api.unwatch();
      famRef = doc(db, 'families', fid);
      unsubFam = onSnapshot(famRef, s => s.exists() ? onFamily({ id: s.id, ...s.data() }) : onError({ code: 'not-found' }), onError);
      unsubLog = onSnapshot(query(collection(famRef, 'log'), orderBy('ts', 'desc'), limit(500)),
        s => onLog(s.docs.map(d => d.data())), () => {});
    },
    unwatch() { unsubFam?.(); unsubLog?.(); unsubFam = unsubLog = null; famRef = null; },

    /* ---------- writes ---------- */
    put: (coll, obj) => updateDoc(famRef, { [`${coll}.${obj.id}`]: obj }),
    del: (coll, id) => updateDoc(famRef, { [`${coll}.${id}`]: deleteField() }),
    setParent: (role, p) => updateDoc(famRef, { [`parents.${role}`]: p }),
    setFamilyName: name => updateDoc(famRef, { name }),
    xp(role, n, kidId) {
      const u = { [`xp.${role}`]: increment(n) };
      if (kidId) u[`stars.${kidId}`] = increment(n > 0 ? 1 : -1);
      return updateDoc(famRef, u);
    },
    setDone: (key, val) => updateDoc(famRef, { [`done.${key}`]: val || deleteField() }),
    addLog: e => setDoc(doc(famRef, 'log', e.id), e),
    delLog: id => deleteDoc(doc(famRef, 'log', id)),
    async deleteKid(kid, medIds, logIds, related) {
      const b = writeBatch(db);
      const u = { [`kids.${kid}`]: deleteField(), [`stars.${kid}`]: deleteField() };
      for (const [coll, ids] of Object.entries(related)) ids.forEach(id => { u[`${coll}.${id}`] = deleteField(); });
      b.update(famRef, u);
      logIds.forEach(id => b.delete(doc(famRef, 'log', id)));
      await b.commit();
    },
    async replaceAll(data, logIds) {
      // כותב את כל הנתונים מחדש (טעינת גיבוי או מחיקת הכל)
      const map = arr => Object.fromEntries((arr || []).map(x => [x.id, x]));
      await updateDoc(famRef, {
        kids: map(data.kids), activities: map(data.activities), doctors: map(data.doctors),
        appointments: map(data.appointments), meds: map(data.meds),
        done: data.done || {}, xp: { mom: 0, dad: 0, ...(data.xp || {}) }, stars: data.stars || {},
        ...(data.parents ? { parents: data.parents } : {}),
      });
      const ops = [...logIds.map(id => ['del', id]), ...(data.log || []).map(l => ['set', l])];
      for (let i = 0; i < ops.length; i += 400) {
        const b = writeBatch(db);
        ops.slice(i, i + 400).forEach(([t, x]) => t === 'del' ? b.delete(doc(famRef, 'log', x)) : b.set(doc(famRef, 'log', x.id), x));
        await b.commit();
      }
    },
  };
  return api;
}
