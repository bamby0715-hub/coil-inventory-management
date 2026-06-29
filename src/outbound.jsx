import { useState, useEffect, useRef, useCallback } from "react";

/* =========================================================================
   출고(outbound) — 건별 개별 문서 컬렉션 (B 구조)
   - 컬렉션: outbound/{id}   (id = 기존 레코드의 uid)
   - 한 문서에 모아두던 방식(hnmtCoilSystem/sharedState.snapshot.outbound)을
     대체한다. 이제 출고 1건 = 문서 1건.
   - 화면/재고 로직은 그대로: useOutboundStore() 가 기존 useStore("outbound")와
     똑같이 [outbound, setOutbound] 를 돌려준다. setOutbound 호출부는 수정 불필요.
   - 동시 편집 충돌(다른 건)·1MiB 한계가 사라지고, 규칙으로 컬렉션 단위 잠금 가능.
   ========================================================================= */

const FIREBASE_SDK_VERSION = "10.12.5";
const importExternal = (url) => new Function("url", "return import(url)")(url);

const getFirebaseConfig = () => {
  const cfg = typeof window !== "undefined" ? window.HNMT_FIREBASE_CONFIG : null;
  if (!cfg || !cfg.apiKey) throw new Error("Firebase 설정을 찾을 수 없습니다.");
  return cfg;
};

let runtimePromise = null;
const getDataRuntime = async () => {
  if (runtimePromise) return runtimePromise;
  runtimePromise = (async () => {
    const config = getFirebaseConfig();
    const appModule = await importExternal(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`);
    const fsModule = await importExternal(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`);
    const app = appModule.getApps().find((a) => a.name === "hnmt-coil") || appModule.initializeApp(config, "hnmt-coil");
    const db = fsModule.getFirestore(app);
    return { db, fsModule };
  })();
  return runtimePromise;
};

const outboundCol = (fs, db) => fs.collection(db, "outbound");
const outboundDocRef = (fs, db, id) => fs.doc(db, "outbound", id);

// ---------- 실시간 구독 ----------
// 정렬은 쿼리에서 하지 않는다(필드 누락 문서가 빠질 수 있으므로). 화면 쪽 기존
// 클라이언트 정렬(outbound_date 등)이 그대로 처리한다.
export function subscribeOutbound(onData, onError) {
  let unsub = () => {};
  getDataRuntime().then(({ db, fsModule }) => {
    unsub = fsModule.onSnapshot(
      outboundCol(fsModule, db),
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => onError && onError(e),
    );
  }).catch((e) => onError && onError(e));
  return () => unsub();
}

// ---------- 단건 쓰기 ----------
export async function writeOutbound(id, record) {
  const { db, fsModule } = await getDataRuntime();
  // 레코드 전체를 그대로 저장(필드 비종속). updatedAt 만 서버 시각으로 덧붙인다.
  await fsModule.setDoc(outboundDocRef(fsModule, db, id), {
    ...record,
    id,
    updatedAt: fsModule.serverTimestamp(),
  });
}

export async function deleteOutbound(id) {
  const { db, fsModule } = await getDataRuntime();
  await fsModule.deleteDoc(outboundDocRef(fsModule, db, id));
}

// ---------- prev → next 차이만 Firestore에 반영 ----------
const indexById = (arr) => {
  const m = new Map();
  (Array.isArray(arr) ? arr : []).forEach((x) => { if (x && x.id != null) m.set(x.id, x); });
  return m;
};

async function syncOutboundDiff(prev, next) {
  const p = indexById(prev);
  const n = indexById(next);
  const ops = [];
  // 삭제: prev 에는 있고 next 에는 없는 건
  for (const id of p.keys()) {
    if (!n.has(id)) ops.push(deleteOutbound(id));
  }
  // 생성/수정: next 기준으로, 새 건이거나 내용이 바뀐 건만
  for (const [id, rec] of n) {
    const before = p.get(id);
    if (!before || JSON.stringify(before) !== JSON.stringify(rec)) {
      ops.push(writeOutbound(id, rec));
    }
  }
  await Promise.all(ops);
}

/* -------------------------------------------------------------------------
   useOutboundStore — 기존 useStore("outbound") 자리에 그대로 끼우는 어댑터.
   반환: [outbound, setOutbound]  (setOutbound 는 값 또는 (prev)=>next 둘 다 지원)
   - 마운트 시 컬렉션을 구독해 항상 최신 상태 유지(다른 사람 변경도 실시간 반영).
   - setOutbound 호출 시 즉시 화면 반영(낙관적) + 바뀐 건만 Firestore 에 기록.
   - 구독으로 들어온 갱신은 다시 쓰지 않는다(되먹임 방지).
   ------------------------------------------------------------------------- */
export function useOutboundStore() {
  const [outbound, setLocal] = useState([]);
  const ref = useRef([]);
  ref.current = outbound;

  useEffect(() => {
    const unsub = subscribeOutbound(
      (list) => { ref.current = list; setLocal(list); },
      (e) => { console.error("출고 구독 실패:", e?.message || e); },
    );
    return unsub;
  }, []);

  const setOutbound = useCallback((updater) => {
    const prev = ref.current;
    const next = typeof updater === "function" ? updater(prev) : updater;
    ref.current = next;
    setLocal(next); // 즉시 화면 반영
    syncOutboundDiff(prev, next).catch((e) => {
      console.error("출고 동기화 실패:", e?.message || e);
    });
  }, []);

  return [outbound, setOutbound];
}
