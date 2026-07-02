import { useState, useEffect, useRef, useCallback } from "react";

/* =========================================================================
   코일재고(coils) / 재고이력(stockHistory) — 건별 개별 문서 컬렉션.
   inbound.jsx와 동일한 이유: 계속 쌓이는 데이터를 문서 하나(hnmtCoilSystem/
   sharedState)에 몰아넣으면 Firestore 1MiB 문서 크기 한계에 걸릴 수 있어
   inbound/outbound처럼 컬렉션으로 분리한다. (한 건 = 문서 1개)

   코일메타(coilMeta) — baseStock/customColors/discontinuedColors/zoneStock/
   baseStockDates/deletedBaseStockKeys 는 크기가 작고 계속 자라지 않는 "설정"
   성격이라 vendors/items의 settings/{docId} 패턴처럼 settings/coilMeta 문서
   하나에 모아 저장한다.
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

// ---------- 공용: 건별 컬렉션 구독 + diff 저장 (inbound.jsx와 동일 패턴) ----------
function makeRecordCollectionStore(collectionName) {
  const colRef = (fs, db) => fs.collection(db, collectionName);
  const docRef = (fs, db, id) => fs.doc(db, collectionName, id);

  const subscribe = (onData, onError) => {
    let unsub = () => {};
    getDataRuntime().then(({ db, fsModule }) => {
      unsub = fsModule.onSnapshot(
        colRef(fsModule, db),
        (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (e) => onError && onError(e),
      );
    }).catch((e) => onError && onError(e));
    return () => unsub();
  };

  const writeOne = async (id, record) => {
    const { db, fsModule } = await getDataRuntime();
    await fsModule.setDoc(docRef(fsModule, db, id), { ...record, id, updatedAt: fsModule.serverTimestamp() });
  };

  const deleteOne = async (id) => {
    const { db, fsModule } = await getDataRuntime();
    await fsModule.deleteDoc(docRef(fsModule, db, id));
  };

  const indexById = (arr) => {
    const m = new Map();
    (Array.isArray(arr) ? arr : []).forEach((x) => { if (x && x.id != null) m.set(x.id, x); });
    return m;
  };

  const syncDiff = async (prev, next) => {
    const p = indexById(prev);
    const n = indexById(next);
    const ops = [];
    for (const id of p.keys()) {
      if (!n.has(id)) ops.push(deleteOne(id));
    }
    for (const [id, rec] of n) {
      const before = p.get(id);
      if (!before || JSON.stringify(before) !== JSON.stringify(rec)) ops.push(writeOne(id, rec));
    }
    await Promise.all(ops);
  };

  return function useRecordCollectionStore() {
    const [list, setLocal] = useState([]);
    const ref = useRef([]);
    ref.current = list;

    useEffect(() => {
      const unsub = subscribe(
        (data) => { ref.current = data; setLocal(data); },
        (e) => console.error(`${collectionName} 구독 실패:`, e?.message || e),
      );
      return unsub;
    }, []);

    const setList = useCallback((updater) => {
      const prev = ref.current;
      const next = typeof updater === "function" ? updater(prev) : updater;
      ref.current = next;
      setLocal(next); // 즉시 화면 반영
      syncDiff(prev, next).catch((e) => console.error(`${collectionName} 동기화 실패:`, e?.message || e));
    }, []);

    return [list, setList];
  };
}

export const useCoilsStore = makeRecordCollectionStore("coils");
export const useStockHistoryStore = makeRecordCollectionStore("stockHistory");

/* =========================================================================
   재고 계산 헬퍼 — coils 가 재고의 유일한 원천(source of truth).
   코일 1개 = 물리적 롤(덩어리) 1개. baseStock/zoneStock 은 저장하지 않고
   여기서 coils 로부터 계산해서 쓴다.
   - 색상키: `${product}|${maker}|${code}|${color}|${thickness}` (앱 전역 공통 포맷)
   - roll_label: 같은 색상 안에서 덩어리를 구분("A","B","C"...). 단일이면 "A".
   ========================================================================= */
export const ROLL_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// coils 문서의 필드로부터 색상키 생성 (product_type/manufacturer/color_code/color_name/thickness)
export const coilStockKey = (coil) =>
  `${coil.product_type || ""}|${coil.manufacturer || ""}|${coil.color_code || ""}|${coil.color_name || ""}|${coil.thickness || ""}`;

// 이미 쓰인 롤 라벨 목록에서 다음 빈 라벨을 반환 (A→B→C...)
export const nextRollLabel = (usedLabels = []) => {
  const used = new Set(usedLabels);
  return ROLL_LABELS.find((label) => !used.has(label)) || `R${usedLabels.length + 1}`;
};

// coils 배열 → { baseStock[key]=총M, zoneStock[key]={라벨:M}, baseStockDates[key]=최근일, rollsByKey[key]=[코일...] }
export const deriveCoilStock = (coils = []) => {
  const baseStock = {};
  const zoneStock = {};
  const baseStockDates = {};
  const rollsByKey = {};
  (Array.isArray(coils) ? coils : []).forEach((coil) => {
    if (!coil) return;
    const key = coilStockKey(coil);
    const meter = Number(coil.current_meter) || 0;
    const label = coil.roll_label || "A";
    baseStock[key] = (baseStock[key] || 0) + meter;
    if (!zoneStock[key]) zoneStock[key] = {};
    zoneStock[key][label] = (zoneStock[key][label] || 0) + meter;
    const date = coil.inbound_date || coil.created_at || "";
    if (date && (!baseStockDates[key] || date > baseStockDates[key])) baseStockDates[key] = date;
    if (!rollsByKey[key]) rollsByKey[key] = [];
    rollsByKey[key].push(coil);
  });
  // 롤 목록은 라벨순 정렬
  Object.values(rollsByKey).forEach((list) =>
    list.sort((a, b) => String(a.roll_label || "A").localeCompare(String(b.roll_label || "A"))));
  return { baseStock, zoneStock, baseStockDates, rollsByKey };
};

// ---------- coilMeta: 색상 카탈로그 설정만 저장(재고 수량은 coils 에서 계산) ----------
const COIL_META_DEFAULTS = {
  customColors: [], discontinuedColors: [], deletedBaseStockKeys: [],
};
const coilMetaDoc = (fs, db) => fs.doc(db, "settings", "coilMeta");

function subscribeCoilMeta(onData, onError) {
  let unsub = () => {};
  getDataRuntime().then(({ db, fsModule }) => {
    unsub = fsModule.onSnapshot(coilMetaDoc(fsModule, db), (snap) => {
      const data = snap.exists() ? snap.data() : {};
      onData({ ...COIL_META_DEFAULTS, ...data });
    }, (e) => onError && onError(e));
  }).catch((e) => onError && onError(e));
  return () => unsub();
}

async function writeCoilMetaField(field, value) {
  const { db, fsModule } = await getDataRuntime();
  await fsModule.setDoc(coilMetaDoc(fsModule, db), { [field]: value }, { merge: true });
}

// 구(舊) 저장방식 잔재 필드 제거 — 재고는 이제 coils 에서 계산하므로 불필요.
export async function purgeLegacyCoilMetaFields() {
  const { db, fsModule } = await getDataRuntime();
  await fsModule.setDoc(coilMetaDoc(fsModule, db), {
    baseStock: fsModule.deleteField(),
    zoneStock: fsModule.deleteField(),
    baseStockDates: fsModule.deleteField(),
  }, { merge: true });
}

export function useCoilMetaStore() {
  const [meta, setLocalMeta] = useState(COIL_META_DEFAULTS);
  const ref = useRef(COIL_META_DEFAULTS);
  ref.current = meta;

  useEffect(() => {
    const unsub = subscribeCoilMeta(
      (data) => { ref.current = data; setLocalMeta(data); },
      (e) => console.error("coilMeta 구독 실패:", e?.message || e),
    );
    return unsub;
  }, []);

  const makeFieldSetter = useCallback((field) => (updater) => {
    const prev = ref.current[field];
    const next = typeof updater === "function" ? updater(prev) : updater;
    const nextMeta = { ...ref.current, [field]: next };
    ref.current = nextMeta;
    setLocalMeta(nextMeta);
    writeCoilMetaField(field, next).catch((e) => console.error("coilMeta 저장 실패:", e?.message || e));
  }, []);

  // 필드별 setter 함수는 참조가 바뀌면 안 되므로(의존 배열에 들어감) 최초 1회만 생성
  const settersRef = useRef(null);
  if (!settersRef.current) {
    settersRef.current = {
      setCustomColors: makeFieldSetter("customColors"),
      setDiscontinuedColors: makeFieldSetter("discontinuedColors"),
      setDeletedBaseStockKeys: makeFieldSetter("deletedBaseStockKeys"),
    };
  }

  return {
    customColors: meta.customColors,
    discontinuedColors: meta.discontinuedColors,
    deletedBaseStockKeys: meta.deletedBaseStockKeys,
    ...settersRef.current,
  };
}
