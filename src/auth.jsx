import React, { useState, useEffect, useCallback, useRef } from "react";

/* =========================================================================
   HNMT 로그인/계정 모듈 (Firebase Authentication 기반)
   - 인증: 이메일/비밀번호 (Firebase Auth)
   - 프로필/권한: Firestore  users/{uid}  문서
       { name, email, role, status, createdAt, lastLoginAt, lastLoginIP }
       role:   마스터 / 관리자 / 담당자   (가입 기본값 = 담당자)
       status: 승인 / 승인대기 / 정지       (가입 기본값 = 승인대기)
   - 비밀번호는 Firebase Auth가 전담. 코드/Firestore에 절대 저장하지 않음.
   - App.jsx 의 "hnmt-coil" 앱 인스턴스를 그대로 재사용한다.
   ========================================================================= */

const FIREBASE_SDK_VERSION = "10.12.5";
const USERS_COLLECTION = "users";
const importExternal = (url) => new Function("url", "return import(url)")(url);

// App.jsx 와 동일한 설정 소스(window.HNMT_FIREBASE_CONFIG)를 사용
const getFirebaseConfig = () => {
  const cfg = typeof window !== "undefined" ? window.HNMT_FIREBASE_CONFIG : null;
  if (!cfg || typeof cfg !== "object" || !cfg.apiKey) {
    throw new Error("Firebase 설정(window.HNMT_FIREBASE_CONFIG)을 찾을 수 없습니다.");
  }
  return cfg;
};

let authRuntimePromise = null;
const getAuthRuntime = async () => {
  if (authRuntimePromise) return authRuntimePromise;
  authRuntimePromise = (async () => {
    const config = getFirebaseConfig();
    const appModule = await importExternal(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`);
    const authModule = await importExternal(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`);
    const fsModule = await importExternal(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`);

    // App.jsx 가 먼저 만들었으면 그 인스턴스를 재사용, 아니면 새로 생성
    const app = appModule.getApps().find((a) => a.name === "hnmt-coil") ||
      appModule.initializeApp(config, "hnmt-coil");

    // App Check (index.html 의 HNMT_APPCHECK_SITE_KEY) — 로그인 화면에서도 토큰이 붙도록 초기화.
    // App.jsx 와 동일 인스턴스이므로 __appCheckReady 플래그로 중복 초기화 방지.
    const appCheckSiteKey = (typeof window !== "undefined" && window.HNMT_APPCHECK_SITE_KEY) || "";
    if (appCheckSiteKey && !app.__appCheckReady) {
      try {
        const appCheckModule = await importExternal(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app-check.js`);
        appCheckModule.initializeAppCheck(app, {
          provider: new appCheckModule.ReCaptchaV3Provider(appCheckSiteKey),
          isTokenAutoRefreshEnabled: true,
        });
        app.__appCheckReady = true;
      } catch (e) { console.warn("App Check 초기화 실패(로그인은 계속 시도):", e); }
    }

    const auth = authModule.getAuth(app);
    const db = fsModule.getFirestore(app);

    // 탭/브라우저를 닫으면 자동 로그아웃 (기존 PIN 방식의 UX 유지)
    try { await authModule.setPersistence(auth, authModule.browserSessionPersistence); } catch { /* 무시 */ }

    return { app, auth, db, authModule, fsModule };
  })();
  return authRuntimePromise;
};

// ---------- 저수준 동작 ----------
const userDocRef = (fsModule, db, uid) => fsModule.doc(db, USERS_COLLECTION, uid);

const fetchProfile = async (uid) => {
  const { db, fsModule } = await getAuthRuntime();
  const snap = await fsModule.getDoc(userDocRef(fsModule, db, uid));
  return snap.exists() ? snap.data() : null;
};

// 참고용 IP (위조 가능 전제, 무료/베스트에포트)
const fetchClientIp = async () => {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data?.ip || "";
  } catch { return ""; }
};

export async function signUp({ name, email, password }) {
  const { auth, db, authModule, fsModule } = await getAuthRuntime();
  const cred = await authModule.createUserWithEmailAndPassword(auth, email.trim(), password);
  try { await authModule.updateProfile(cred.user, { displayName: name.trim() }); } catch { /* 무시 */ }
  // role/status 는 코드에서 기본값 고정 (보안 규칙으로도 강제됨)
  await fsModule.setDoc(userDocRef(fsModule, db, cred.user.uid), {
    name: name.trim(),
    email: email.trim(),
    role: "담당자",
    status: "승인대기",
    createdAt: fsModule.serverTimestamp(),
  });
  // 승인 전이므로 즉시 로그아웃 → "승인 대기" 안내로 흐름 차단
  await authModule.signOut(auth);
}

export async function signIn({ email, password }) {
  const { auth, authModule } = await getAuthRuntime();
  await authModule.signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function sendReset(email) {
  const { auth, authModule } = await getAuthRuntime();
  await authModule.sendPasswordResetEmail(auth, email.trim());
}

export async function signOutNow() {
  const { auth, authModule } = await getAuthRuntime();
  await authModule.signOut(auth);
}

async function touchLastLogin(uid) {
  const { db, fsModule } = await getAuthRuntime();
  const ip = await fetchClientIp();
  try {
    await fsModule.updateDoc(userDocRef(fsModule, db, uid), {
      lastLoginAt: fsModule.serverTimestamp(),
      lastLoginIP: ip,
    });
  } catch { /* 참고용이므로 실패해도 무시 */ }
}

// ---------- 마스터 전용 동작 ----------
export async function listUsers() {
  const { db, fsModule } = await getAuthRuntime();
  const q = fsModule.query(fsModule.collection(db, USERS_COLLECTION), fsModule.orderBy("createdAt", "asc"));
  const snap = await fsModule.getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

export async function setUserStatus(uid, status) {
  const { db, fsModule } = await getAuthRuntime();
  await fsModule.updateDoc(userDocRef(fsModule, db, uid), { status });
}

export async function setUserRole(uid, role) {
  const { db, fsModule } = await getAuthRuntime();
  await fsModule.updateDoc(userDocRef(fsModule, db, uid), { role });
}

/* =========================================================================
   useAuth() : 현재 로그인/프로필/상태 추적
   status 값:
     loading    초기 로딩
     signedout  미로그인
     no-profile 인증은 됐으나 프로필 문서 없음(이례적)
     pending    승인대기
     suspended  정지
     active     정상 입장 가능
   ========================================================================= */
export function useAuth() {
  const [state, setState] = useState({ status: "loading", user: null, profile: null });
  const unsubRef = useRef(null);

  const resolveProfile = useCallback(async (user) => {
    if (!user) { setState({ status: "signedout", user: null, profile: null }); return; }
    let profile = null;
    try { profile = await fetchProfile(user.uid); } catch { profile = null; }
    if (!profile) { setState({ status: "no-profile", user, profile: null }); return; }
    if (profile.status === "정지") { setState({ status: "suspended", user, profile }); return; }
    if (profile.status !== "승인") { setState({ status: "pending", user, profile }); return; }
    setState({ status: "active", user, profile });
    touchLastLogin(user.uid); // 입장 성공 시에만 기록
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { auth, authModule } = await getAuthRuntime();
      if (!alive) return;
      unsubRef.current = authModule.onAuthStateChanged(auth, (user) => { resolveProfile(user); });
    })().catch(() => setState({ status: "signedout", user: null, profile: null }));
    return () => { alive = false; unsubRef.current?.(); };
  }, [resolveProfile]);

  const role = state.profile?.role || "";
  return {
    ...state,
    role,
    isMaster: role === "마스터",
    isAdmin: role === "마스터" || role === "관리자",
    signOutNow,
    refresh: () => state.user && resolveProfile(state.user),
  };
}

/* =========================================================================
   UI : 공통 셸 + 로그인/가입/재설정 + 대기/정지 화면
   기존 Login 화면의 파스텔 테마를 맞춤
   ========================================================================= */
function Shell({ children }) {
  const stars = React.useMemo(() => Array.from({ length: 26 }, () => ({
    top: Math.random() * 100, left: Math.random() * 100, s: 4 + Math.random() * 7, d: Math.random() * 3,
  })), []);
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg,#F7CAC9 0%,#e7c8da 38%,#b9c0e0 70%,#92A8D1 100%)" }}>
      {/* 로그인 화면 전용 애니메이션 (GlobalStyle 적용 전 단계라 여기서 직접 정의) */}
      <style>{`
        @keyframes hnmtTwinkle { 0%,100%{opacity:.15; transform:scale(.7);} 50%{opacity:.9; transform:scale(1.15);} }
        @keyframes hnmtGlow { 0%,100%{box-shadow:0 0 0 0 rgba(146,168,209,.55),0 0 22px 4px rgba(247,202,201,.45);} 50%{box-shadow:0 0 0 10px rgba(146,168,209,0),0 0 34px 10px rgba(247,202,201,.65);} }
        .hnmt-twinkle{ animation:hnmtTwinkle 3s ease-in-out infinite; }
        .hnmt-glow{ animation:hnmtGlow 2.6s ease-in-out infinite; }
      `}</style>
      {stars.map((st, i) => (
        <span key={i} className="hnmt-twinkle absolute rounded-full bg-white"
          style={{ top: `${st.top}%`, left: `${st.left}%`, width: st.s, height: st.s, animationDelay: `${st.d}s` }} />
      ))}
      <div className="w-full max-w-sm relative">
        <div className="text-center mb-5">
          <div className="hnmt-glow inline-flex items-center justify-center w-28 h-28 rounded-[2rem] bg-white/35 backdrop-blur mb-3 border border-white/60">
            <img src="/coil-inventory-management/assets/mascot.gif" alt="HN 마스코트" className="w-24 h-24 object-contain"
              onError={(e) => { e.currentTarget.style.display = "none"; }} />
          </div>
          <p className="text-white/90 text-sm font-bold tracking-[0.16em]">HNMT COIL SYSTEM</p>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl px-6 py-6 shadow-2xl border border-white/60">
          {children}
        </div>
        <p className="mt-5 text-center text-[11px] tracking-[0.16em] text-white/75">© 2026 HNMT COIL SYSTEM</p>
      </div>
    </div>
  );
}

const field = "block w-full text-sm py-2.5 px-3 rounded-2xl border border-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-300/60 bg-white/80 shadow-inner";
const primaryBtn = "block w-full mt-4 py-2.5 rounded-full text-sm font-bold text-white tracking-[0.12em] shadow-lg shadow-indigo-300/35 transition hover:-translate-y-0.5 disabled:opacity-60";
const primaryStyle = { background: "linear-gradient(90deg,#efa8b7 0%,#b79bd5 52%,#7795cc 100%)" };

function mapAuthError(err) {
  const code = err?.code || "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found"))
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (code.includes("email-already-in-use")) return "이미 가입된 이메일입니다.";
  if (code.includes("weak-password")) return "비밀번호는 6자 이상이어야 합니다.";
  if (code.includes("invalid-email")) return "이메일 형식이 올바르지 않습니다.";
  if (code.includes("too-many-requests")) return "시도가 많습니다. 잠시 후 다시 시도해주세요.";
  return err?.message || "처리 중 오류가 발생했습니다.";
}

function LoginForm({ onSwitch, onForgot }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setErr(""); setBusy(true);
    try { await signIn({ email, password: pw }); }
    catch (e) { setErr(mapAuthError(e)); setBusy(false); }
    // 성공 시 onAuthStateChanged 가 화면을 전환하므로 busy 유지
  };
  return (
    <>
      <h2 className="text-center text-slate-600 text-sm mb-4">이메일로 로그인</h2>
      <input className={field} type="email" placeholder="이메일" value={email} autoFocus
        onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
      <input className={`${field} mt-2`} type="password" placeholder="비밀번호" value={pw}
        onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
      {err && <p className="text-rose-500 text-sm mt-2 text-center">{err}</p>}
      <button className={primaryBtn} style={primaryStyle} onClick={submit} disabled={busy}>
        {busy ? "로그인 중..." : "로그인"}
      </button>
      <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
        <button className="hover:text-indigo-600" onClick={onForgot}>비밀번호 재설정</button>
        <button className="hover:text-indigo-600 font-semibold" onClick={onSwitch}>담당자 가입</button>
      </div>
    </>
  );
}

function SignupForm({ onSwitch }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setErr("");
    if (!name.trim()) return setErr("이름을 입력해주세요.");
    if (pw.length < 6) return setErr("비밀번호는 6자 이상이어야 합니다.");
    setBusy(true);
    try { await signUp({ name, email, password: pw }); setDone(true); }
    catch (e) { setErr(mapAuthError(e)); }
    setBusy(false);
  };
  if (done) return (
    <>
      <h2 className="text-center text-slate-700 font-bold mb-2">가입 신청 완료</h2>
      <p className="text-center text-slate-600 text-sm leading-relaxed">
        계정이 <b>승인 대기</b> 상태로 등록되었습니다.<br />최고관리자 승인 후 로그인할 수 있습니다.
      </p>
      <button className={primaryBtn} style={primaryStyle} onClick={onSwitch}>로그인 화면으로</button>
    </>
  );
  return (
    <>
      <h2 className="text-center text-slate-600 text-sm mb-4">담당자 계정 가입</h2>
      <input className={field} placeholder="이름" value={name} autoFocus onChange={(e) => setName(e.target.value)} />
      <input className={`${field} mt-2`} type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={`${field} mt-2`} type="password" placeholder="비밀번호 (6자 이상)" value={pw} onChange={(e) => setPw(e.target.value)} />
      {err && <p className="text-rose-500 text-sm mt-2 text-center">{err}</p>}
      <button className={primaryBtn} style={primaryStyle} onClick={submit} disabled={busy}>
        {busy ? "가입 중..." : "가입 신청"}
      </button>
      <p className="text-center text-xs text-slate-500 mt-3">가입 후 최고관리자 승인이 필요합니다.</p>
      <button className="block w-full mt-2 text-xs text-slate-500 hover:text-indigo-600" onClick={onSwitch}>← 로그인으로</button>
    </>
  );
}

function ResetForm({ onSwitch }) {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setErr(""); setBusy(true);
    try { await sendReset(email); setDone(true); }
    catch (e) { setErr(mapAuthError(e)); }
    setBusy(false);
  };
  if (done) return (
    <>
      <h2 className="text-center text-slate-700 font-bold mb-2">메일 발송 완료</h2>
      <p className="text-center text-slate-600 text-sm">입력하신 이메일로 비밀번호 재설정 링크를 보냈습니다.</p>
      <button className={primaryBtn} style={primaryStyle} onClick={onSwitch}>로그인 화면으로</button>
    </>
  );
  return (
    <>
      <h2 className="text-center text-slate-600 text-sm mb-4">비밀번호 재설정</h2>
      <input className={field} type="email" placeholder="가입한 이메일" value={email} autoFocus
        onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
      {err && <p className="text-rose-500 text-sm mt-2 text-center">{err}</p>}
      <button className={primaryBtn} style={primaryStyle} onClick={submit} disabled={busy}>
        {busy ? "발송 중..." : "재설정 메일 보내기"}
      </button>
      <button className="block w-full mt-3 text-xs text-slate-500 hover:text-indigo-600" onClick={onSwitch}>← 로그인으로</button>
    </>
  );
}

function Notice({ title, desc, onSignOut }) {
  return (
    <>
      <h2 className="text-center text-slate-700 font-bold mb-2">{title}</h2>
      <p className="text-center text-slate-600 text-sm leading-relaxed">{desc}</p>
      <button className={primaryBtn} style={primaryStyle} onClick={onSignOut}>로그아웃</button>
    </>
  );
}

/* AuthGate : status 가 active 가 아니면 인증 UI, active 면 children 렌더 */
export function AuthGate({ auth, children }) {
  const [view, setView] = useState("login"); // login | signup | reset
  const { status } = auth;

  if (status === "active") return children;

  if (status === "loading") {
    return <Shell><p className="text-center text-slate-500 text-sm py-6">불러오는 중...</p></Shell>;
  }
  if (status === "pending") {
    return <Shell><Notice title="승인 대기 중" desc="최고관리자 승인 후 이용할 수 있습니다." onSignOut={auth.signOutNow} /></Shell>;
  }
  if (status === "suspended") {
    return <Shell><Notice title="정지된 계정" desc="계정이 정지되었습니다. 최고관리자에게 문의해주세요." onSignOut={auth.signOutNow} /></Shell>;
  }
  if (status === "no-profile") {
    return <Shell><Notice title="프로필 없음" desc="계정 정보가 없습니다. 다시 가입하거나 관리자에게 문의해주세요." onSignOut={auth.signOutNow} /></Shell>;
  }
  // signedout
  return (
    <Shell>
      {view === "login" && <LoginForm onSwitch={() => setView("signup")} onForgot={() => setView("reset")} />}
      {view === "signup" && <SignupForm onSwitch={() => setView("login")} />}
      {view === "reset" && <ResetForm onSwitch={() => setView("login")} />}
    </Shell>
  );
}

/* =========================================================================
   MasterUserPanel : 최고관리자 전용 담당자 승인/정지/권한 관리
   ========================================================================= */
const ROLE_OPTIONS = ["담당자", "관리자", "마스터"];
const fmtTime = (ts) => {
  try { const d = ts?.toDate ? ts.toDate() : null; return d ? d.toLocaleString("ko-KR") : "-"; } catch { return "-"; }
};

export function MasterUserPanel({ open, onClose, myUid }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try { setRows(await listUsers()); }
    catch (e) { setErr(e?.message || "불러오기 실패"); }
    setLoading(false);
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  if (!open) return null;

  const act = async (fn) => { try { await fn(); await load(); } catch (e) { setErr(e?.message || "처리 실패"); } };
  const badge = (s) => s === "승인" ? "bg-emerald-50 text-emerald-600 border-emerald-200"
    : s === "정지" ? "bg-rose-50 text-rose-600 border-rose-200"
    : "bg-amber-50 text-amber-600 border-amber-200";

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-3 md:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-700/25 backdrop-blur-sm" />
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 max-h-[88vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-700">담당자 관리</h2>
          <div className="flex items-center gap-2">
            <button onClick={load} className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50">새로고침</button>
            <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50">닫기</button>
          </div>
        </div>
        {err && <p className="text-rose-500 text-sm px-5 py-2">{err}</p>}
        <div className="overflow-auto p-3">
          {loading ? <p className="text-center text-slate-400 text-sm py-8">불러오는 중...</p> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs border-b border-slate-100">
                  <th className="text-left py-2 px-2">이름</th>
                  <th className="text-left py-2 px-2">이메일</th>
                  <th className="text-left py-2 px-2">권한</th>
                  <th className="text-left py-2 px-2">상태</th>
                  <th className="text-left py-2 px-2">최근 로그인</th>
                  <th className="text-right py-2 px-2">처리</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const me = u.uid === myUid;
                  return (
                    <tr key={u.uid} className="border-b border-slate-50">
                      <td className="py-2 px-2 font-medium text-slate-700">{u.name}{me && <span className="ml-1 text-[10px] text-indigo-500">(나)</span>}</td>
                      <td className="py-2 px-2 text-slate-500">{u.email}</td>
                      <td className="py-2 px-2">
                        <select value={u.role} disabled={me}
                          onChange={(e) => act(() => setUserRole(u.uid, e.target.value))}
                          className="text-xs border border-slate-200 rounded-lg px-1.5 py-1 disabled:opacity-50">
                          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${badge(u.status)}`}>{u.status}</span>
                      </td>
                      <td className="py-2 px-2 text-slate-400 text-xs">{fmtTime(u.lastLoginAt)}
                        {u.lastLoginIP ? <div className="text-[10px] text-slate-300">{u.lastLoginIP}</div> : null}
                      </td>
                      <td className="py-2 px-2 text-right whitespace-nowrap">
                        {u.status !== "승인" && (
                          <button disabled={me} onClick={() => act(() => setUserStatus(u.uid, "승인"))}
                            className="text-xs px-2 py-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40">승인</button>
                        )}
                        {u.status === "승인" && (
                          <button disabled={me} onClick={() => act(() => setUserStatus(u.uid, "정지"))}
                            className="text-xs px-2 py-1 rounded-lg bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-40">정지</button>
                        )}
                        {u.status === "정지" && (
                          <button disabled={me} onClick={() => act(() => setUserStatus(u.uid, "승인"))}
                            className="text-xs px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 ml-1">정지해제</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-slate-400 py-8 text-sm">등록된 사용자가 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <p className="px-5 py-3 text-[11px] text-slate-400 border-t border-slate-100">
          ※ 본인 계정의 권한/상태는 안전을 위해 이 화면에서 변경할 수 없습니다.
        </p>
      </div>
    </div>
  );
}
