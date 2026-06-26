import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  LayoutDashboard, PackagePlus, Truck, Boxes, BarChart3, Palette,
  Search, Download, Plus, ChevronDown, ChevronRight, Check,
  Trash2, Pencil, X, AlertTriangle, Clock, Menu, ArrowRight,
  Factory, MapPin, LogOut, Layers3, CalendarDays, Package, Eye, EyeOff, ClipboardCheck, RotateCcw
} from "lucide-react";
import * as XLSX from "xlsx";

/* =========================================================================
   HN메탈릭 코일 재고관리 시스템 (v2)
   · 관리자 비밀번호: 0707 / 담당자 비밀번호: 1555
   · M(미터) 중심 관리 / 중량(kg) 미표시
   · 코일번호 자동생성  C-YYYYMMDD-####
   · 출고 홀딩 + 완료승인 정산 (제품구분별 FIFO 차감)
   · 상단 우측 메뉴 버튼 → 위에서 아래로 펼쳐지는 드로어
   · YouTube RSS 자동 연동 (HN METALIC TV)
   ========================================================================= */

/* ---------- 색상 마스터 (회사 색상표 PDF 기준) ---------- */
const COLOR_HEX = {
  "차콜": "#3a3f44", "검정": "#1b1b1b", "밤색": "#5a3e2b", "쑥색": "#7c7f54",
  "적색": "#a52a2a", "청색": "#1f4e79", "칼그레이": "#4b4f54", "백색": "#f3f3f0",
  "연그레이": "#b8bcc0", "황토": "#c19a6b", "다크그레이": "#3f4346",
  "라이트그레이": "#c4c8cc", "메탈그레이": "#71797e", "메탈실버": "#c7ccd1",
  "베이지우드": "#d2b48c", "브론즈우드": "#7a6a4f", "월넛우드": "#5c4631",
  "코르텐": "#8a4b2d",
};
const hexOf = (n) => COLOR_HEX[n] || "#9aa0a6";

const LOGIN_PASSWORDS = {
  admin: "0707",
  staff: "1555",
};

const COLOR_MASTER = [
  { product: "강판", maker: "동국", code: "SU090", thickness: "0.4", color: "차콜" },
  { product: "강판", maker: "동국", code: "K0450", thickness: "0.45", color: "검정" },
  { product: "강판", maker: "동국", code: "Q4611", thickness: "0.45", color: "밤색" },
  { product: "강판", maker: "동국", code: "D2990", thickness: "0.45", color: "쑥색" },
  { product: "강판", maker: "동국", code: "Q4171", thickness: "0.45", color: "적색" },
  { product: "강판", maker: "동국", code: "SU090", thickness: "0.45", color: "차콜" },
  { product: "강판", maker: "동국", code: "A4170", thickness: "0.45", color: "청색" },
  { product: "강판", maker: "동국", code: "SU100", thickness: "0.45", color: "칼그레이" },
  { product: "강판", maker: "동국", code: "H4406", thickness: "0.45", color: "백색" },
  { product: "강판", maker: "포스코", code: "KS2", thickness: "0.45", color: "검정" },
  { product: "강판", maker: "포스코", code: "KM6", thickness: "0.45", color: "밤색" },
  { product: "강판", maker: "포스코", code: "GP4", thickness: "0.45", color: "쑥색" },
  { product: "강판", maker: "포스코", code: "N08", thickness: "0.45", color: "연그레이" },
  { product: "강판", maker: "포스코", code: "RB2", thickness: "0.45", color: "적색" },
  { product: "강판", maker: "포스코", code: "R01", thickness: "0.45", color: "차콜" },
  { product: "강판", maker: "포스코", code: "KT4", thickness: "0.45", color: "차콜" },
  { product: "강판", maker: "포스코", code: "BW2", thickness: "0.45", color: "청색" },
  { product: "강판", maker: "포스코", code: "", thickness: "0.45", color: "황토" },
  { product: "강판", maker: "동국", code: "SU090", thickness: "0.5", color: "차콜" },
  { product: "징크", maker: "동국", code: "N6250", thickness: "0.45", color: "다크그레이" },
  { product: "징크", maker: "동국", code: "N6250", thickness: "0.5", color: "다크그레이" },
  { product: "징크", maker: "동국", code: "PZ102", thickness: "0.45", color: "라이트그레이" },
  { product: "징크", maker: "동국", code: "PZ102", thickness: "0.5", color: "라이트그레이" },
  { product: "징크", maker: "동국", code: "SU090", thickness: "0.45", color: "차콜" },
  { product: "징크", maker: "동국", code: "SU090", thickness: "0.5", color: "차콜" },
  { product: "징크", maker: "동국", code: "SU100", thickness: "0.45", color: "칼그레이" },
  { product: "징크", maker: "동국", code: "SU100", thickness: "0.5", color: "칼그레이" },
  { product: "징크", maker: "동국", code: "PZ104", thickness: "0.45", color: "메탈그레이" },
  { product: "징크", maker: "동국", code: "PZ104", thickness: "0.5", color: "메탈그레이" },
  { product: "징크", maker: "동국", code: "H4406", thickness: "0.45", color: "백색" },
  { product: "징크", maker: "동국", code: "H4406", thickness: "0.5", color: "백색" },
  { product: "징크", maker: "세아", code: "I022", thickness: "0.45", color: "메탈실버" },
  { product: "징크", maker: "세아", code: "I022", thickness: "0.5", color: "메탈실버" },
  { product: "징크", maker: "세아", code: "I606", thickness: "0.45", color: "베이지우드" },
  { product: "징크", maker: "세아", code: "I606", thickness: "0.5", color: "베이지우드" },
  { product: "징크", maker: "세아", code: "I605", thickness: "0.45", color: "브론즈우드" },
  { product: "징크", maker: "세아", code: "I605", thickness: "0.5", color: "브론즈우드" },
  { product: "징크", maker: "DK동신", code: "", thickness: "0.45", color: "월넛우드" },
  { product: "징크", maker: "DK동신", code: "", thickness: "0.5", color: "월넛우드" },
  { product: "징크", maker: "해외", code: "", thickness: "0.5", color: "백색" },
  { product: "징크", maker: "세아", code: "I098", thickness: "0.5", color: "코르텐" },
  { product: "징크", maker: "포스코", code: "Z14", thickness: "0.5", color: "라이트그레이" },
];

const makersFor = (product) => [...new Set(COLOR_MASTER.filter((c) => c.product === product).map((c) => c.maker))];
const colorsFor = (product, maker) => COLOR_MASTER.filter((c) => c.product === product && (!maker || c.maker === maker));
const matchColor = (product, maker, name) =>
  COLOR_MASTER.find((c) => c.product === product && c.maker === maker && c.color === name) ||
  COLOR_MASTER.find((c) => c.product === product && c.color === name);

/* ---------- 유틸 ---------- */
const pad = (n) => String(n).padStart(2, "0");
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const todayLabel = () => {
  const d = new Date();
  return `${d.getFullYear()}년 ${pad(d.getMonth() + 1)}월 ${pad(d.getDate())}일 ${["일", "월", "화", "수", "목", "금", "토"][d.getDay()]}요일 기준`;
};
const fmt = (n) => (Number(n) || 0).toLocaleString("ko-KR");
const uid = () => Math.random().toString(36).slice(2, 10);
const comboNo = (...parts) => String(parts.join("|").split("").reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) % 100, 0)).padStart(2, "0");
const makeCoilNo = (dateStr, product, maker, color, thickness) =>
  `C-${(dateStr || todayStr()).replace(/-/g, "").slice(2)}-${comboNo(product, maker, color, thickness)}`;

const DIALOG_EVENT = "hnmt-app-dialog";
const appAlert = (message, options = {}) => {
  window.dispatchEvent(new CustomEvent(DIALOG_EVENT, {
    detail: { mode: "alert", message, submessage: options.submessage || "", title: options.title || "알림", type: options.type || "success" },
  }));
};
const appConfirm = (message, options = {}) => new Promise((resolve) => {
  window.dispatchEvent(new CustomEvent(DIALOG_EVENT, {
    detail: { mode: "confirm", message, title: options.title || "확인", type: options.type || "warning", resolve },
  }));
});

function AppDialog() {
  const [dialog, setDialog] = useState(null);
  useEffect(() => {
    const open = (event) => setDialog(event.detail);
    window.addEventListener(DIALOG_EVENT, open);
    return () => window.removeEventListener(DIALOG_EVENT, open);
  }, []);
  if (!dialog) return null;
  const close = (result) => {
    dialog.resolve?.(result);
    setDialog(null);
  };
  const Icon = dialog.type === "success" ? Check : dialog.type === "danger" ? Trash2 : AlertTriangle;
  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center overflow-y-auto p-2 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-xl my-2 sm:my-4 rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] flex flex-col">
        <div className="shrink-0 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <h3 className="text-base sm:text-lg font-bold text-slate-800 break-keep">{dialog.title}</h3>
          <button onClick={() => close(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto px-4 sm:px-6 py-5 sm:py-7 text-center">
          <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
            <Icon size={36} className={dialog.type === "success" ? "text-indigo-400" : dialog.type === "danger" ? "text-rose-400" : "text-amber-400"} />
          </div>
          <p className="mt-3 text-sm sm:text-base font-medium leading-relaxed text-slate-800 break-keep">{dialog.message}</p>
          {dialog.submessage && <p className="mt-2 text-xs font-medium text-rose-500">{dialog.submessage}</p>}
          <div className={`mt-5 sm:mt-6 grid gap-2 ${dialog.mode === "confirm" ? "grid-cols-2" : "grid-cols-1"}`}>
            {dialog.mode === "confirm" && (
              <button onClick={() => close(false)} className="h-11 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50">취소</button>
            )}
            <button onClick={() => close(true)} className="h-11 rounded-xl border border-indigo-200 bg-white text-sm font-bold text-indigo-600 hover:bg-indigo-50">
              {dialog.mode === "confirm" ? "확인" : "확인"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- 브라우저 저장소 훅 ---------- */
function useStore(key, initialValue) {
  const storageKey = `hnmt-coil-${key}`;
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }
  }, [storageKey, value]);
  return [value, setValue];
}

const STORE_KEYS = [
  "coils", "inbound", "outbound", "reservations", "baseStock", "stockHistory",
  "customColors", "discontinuedColors", "zoneStock", "baseStockDates", "deletedBaseStockKeys",
];
const OBJECT_STORE_KEYS = new Set(["baseStock", "zoneStock", "baseStockDates"]);
const sheetKeyOf = (item) => `${item.product}|${item.maker}|${item.code || ""}|${item.color}|${item.thickness}`;
const localStorageKey = (key) => `hnmt-coil-${key}`;
const safeJsonParse = (value, fallback) => {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
};
const readLocalSnapshot = () => Object.fromEntries(
  STORE_KEYS.map((key) => [key, safeJsonParse(localStorage.getItem(localStorageKey(key)), OBJECT_STORE_KEYS.has(key) ? {} : [])])
);
const downloadJson = (data, fileName) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

const byRecordId = (item) => item?.id || "";
const byColorKey = (item) => sheetKeyOf(item || {});
const mergeRecordList = (latest = [], local = [], base = [], idOf = byRecordId) => {
  const baseIds = new Set(base.map(idOf).filter(Boolean));
  const localById = new Map(local.map((item) => [idOf(item), item]).filter(([id]) => id));
  const latestById = new Map(latest.map((item) => [idOf(item), item]).filter(([id]) => id));
  const merged = [];
  latestById.forEach((item, id) => {
    if (localById.has(id)) merged.push(localById.get(id));
    else if (!baseIds.has(id)) merged.push(item);
  });
  localById.forEach((item, id) => {
    if (!latestById.has(id)) merged.push(item);
  });
  return merged;
};
const mergeObjectMap = (latest = {}, local = {}, base = {}) => {
  const next = { ...latest };
  Object.keys(base || {}).forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(local || {}, key)) delete next[key];
    else if (JSON.stringify(local[key]) !== JSON.stringify(base[key])) next[key] = local[key];
  });
  Object.keys(local || {}).forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(base || {}, key)) next[key] = local[key];
  });
  return next;
};
const mergePrimitiveList = (latest = [], local = [], base = []) => {
  const baseSet = new Set(base);
  const localSet = new Set(local);
  const next = latest.filter((item) => localSet.has(item) || !baseSet.has(item));
  local.forEach((item) => {
    if (!next.includes(item)) next.push(item);
  });
  return next;
};
const mergeSharedSnapshots = (latest = {}, local = {}, base = {}) => ({
  ...latest,
  coils: mergeRecordList(latest.coils, local.coils, base.coils),
  inbound: mergeRecordList(latest.inbound, local.inbound, base.inbound),
  outbound: mergeRecordList(latest.outbound, local.outbound, base.outbound),
  reservations: mergeRecordList(latest.reservations, local.reservations, base.reservations),
  stockHistory: mergeRecordList(latest.stockHistory, local.stockHistory, base.stockHistory),
  customColors: mergeRecordList(latest.customColors, local.customColors, base.customColors, byColorKey),
  discontinuedColors: mergePrimitiveList(latest.discontinuedColors, local.discontinuedColors, base.discontinuedColors),
  deletedBaseStockKeys: mergePrimitiveList(latest.deletedBaseStockKeys, local.deletedBaseStockKeys, base.deletedBaseStockKeys),
  baseStock: mergeObjectMap(latest.baseStock, local.baseStock, base.baseStock),
  zoneStock: mergeObjectMap(latest.zoneStock, local.zoneStock, base.zoneStock),
  baseStockDates: mergeObjectMap(latest.baseStockDates, local.baseStockDates, base.baseStockDates),
});
const FIREBASE_SDK_VERSION = "10.12.5";
const FIREBASE_COLLECTION = "hnmtCoilSystem";
const FIREBASE_DOC_ID = "sharedState";
const importExternal = (url) => new Function("url", "return import(url)")(url);
const cleanForFirestore = (value) => JSON.parse(JSON.stringify(value || {}));
const getBundledFirebaseConfigText = () => {
  const windowConfig = typeof window !== "undefined" ? window.HNMT_FIREBASE_CONFIG : null;
  if (windowConfig && typeof windowConfig === "object" && Object.keys(windowConfig).length) {
    return JSON.stringify(windowConfig);
  }
  const envConfig = import.meta.env?.VITE_FIREBASE_CONFIG;
  return typeof envConfig === "string" ? envConfig.trim() : "";
};
const firebaseClientId = () => {
  const key = "hnmt-coil-firebase-client-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = uid();
    localStorage.setItem(key, id);
  }
  return id;
};
const parseFirebaseConfig = (text) => {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("Firebase 설정값을 입력해주세요.");
  try {
    return JSON.parse(raw);
  } catch {
    const objectMatch = raw.match(/\{[\s\S]*\}/);
    if (!objectMatch) throw new Error("Firebase 설정 객체를 찾을 수 없습니다.");
    const objectText = objectMatch[0];
    const config = {};
    ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId", "measurementId"].forEach((key) => {
      const match = objectText.match(new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`));
      if (match) config[key] = match[1];
    });
    if (!config.apiKey || !config.projectId || !config.appId) {
      throw new Error("apiKey, projectId, appId가 포함된 Firebase config를 붙여넣어주세요.");
    }
    return config;
  }
};
let firebaseRuntimePromise = null;
let firebaseRuntimeKey = "";
const getFirebaseRuntime = async (configText) => {
  const config = parseFirebaseConfig(configText);
  const runtimeKey = `${config.projectId}|${config.appId}`;
  if (firebaseRuntimePromise && firebaseRuntimeKey === runtimeKey) return firebaseRuntimePromise;
  firebaseRuntimeKey = runtimeKey;
  firebaseRuntimePromise = (async () => {
    const appModule = await importExternal(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`);
    const firestoreModule = await importExternal(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`);
    const app = appModule.getApps().find((item) => item.name === "hnmt-coil") ||
      appModule.initializeApp(config, "hnmt-coil");
    // App Check (외부 무단 접근 차단) — index.html의 HNMT_APPCHECK_SITE_KEY가 있을 때만 활성화
    const appCheckSiteKey = (typeof window !== "undefined" && window.HNMT_APPCHECK_SITE_KEY) || "";
    if (appCheckSiteKey && !app.__appCheckReady) {
      try {
        const appCheckModule = await importExternal(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app-check.js`);
        appCheckModule.initializeAppCheck(app, {
          provider: new appCheckModule.ReCaptchaV3Provider(appCheckSiteKey),
          isTokenAutoRefreshEnabled: true,
        });
        app.__appCheckReady = true;
      } catch (appCheckError) {
        console.warn("App Check 초기화 실패(공유 기능은 계속 동작):", appCheckError);
      }
    }
    const db = firestoreModule.getFirestore(app);
    const docRef = firestoreModule.doc(db, FIREBASE_COLLECTION, FIREBASE_DOC_ID);
    const readSnapshot = (docSnap) => docSnap.exists() ? (docSnap.data()?.snapshot || null) : null;
    return {
      async getSharedSnapshot() {
        return readSnapshot(await firestoreModule.getDoc(docRef));
      },
      async saveSharedSnapshot(localSnapshot, baseSnapshot) {
        const clientId = firebaseClientId();
        return firestoreModule.runTransaction(db, async (transaction) => {
          const currentDoc = await transaction.get(docRef);
          const latestSnapshot = readSnapshot(currentDoc) || {};
          const mergedSnapshot = mergeSharedSnapshots(latestSnapshot, localSnapshot, baseSnapshot || {});
          transaction.set(docRef, {
            snapshot: cleanForFirestore(mergedSnapshot),
            updatedAt: firestoreModule.serverTimestamp(),
            updatedBy: clientId,
          }, { merge: true });
          return mergedSnapshot;
        });
      },
      async overwriteSharedSnapshot(snapshot) {
        const cleanSnapshot = cleanForFirestore(snapshot);
        await firestoreModule.setDoc(docRef, {
          snapshot: cleanSnapshot,
          updatedAt: firestoreModule.serverTimestamp(),
          updatedBy: firebaseClientId(),
        }, { merge: true });
        return cleanSnapshot;
      },
      subscribe(onData, onError) {
        return firestoreModule.onSnapshot(docRef, (docSnap) => onData(readSnapshot(docSnap)), onError);
      },
    };
  })();
  return firebaseRuntimePromise;
};
/* ---------- 초기 샘플 데이터 ---------- */
function seed() {
  const base = (o) => ({ id: uid(), created_at: o.inbound_date || todayStr(), updated_at: todayStr(), ...o });
  const coils = [
    base({ coil_number: "C-20260601-1043", product_type: "강판", manufacturer: "동국", color_name: "차콜", thickness: "0.45", purchaser: "동국제강", initial_meter: 600, current_meter: 380, total_outbound_meter: 220, current_roll_count: 1, status: "정상", memo: "", inbound_date: "2026-06-01" }),
    base({ coil_number: "C-20260603-7720", product_type: "강판", manufacturer: "포스코", color_name: "백색", thickness: "0.45", purchaser: "포스코강판", initial_meter: 500, current_meter: 500, total_outbound_meter: 0, current_roll_count: 1, status: "정상", memo: "", inbound_date: "2026-06-03" }),
    base({ coil_number: "C-20260528-3391", product_type: "징크", manufacturer: "동국", color_name: "다크그레이", thickness: "0.5", purchaser: "동국제강", initial_meter: 800, current_meter: 120, total_outbound_meter: 680, current_roll_count: 1, status: "부족", memo: "", inbound_date: "2026-05-28" }),
    base({ coil_number: "C-20260605-9912", product_type: "징크", manufacturer: "세아", color_name: "메탈실버", thickness: "0.45", purchaser: "세아씨엠", initial_meter: 400, current_meter: 400, total_outbound_meter: 0, current_roll_count: 1, status: "정상", memo: "", inbound_date: "2026-06-05" }),
  ];
  const inbound = coils.map((c) => base({
    inbound_date: c.inbound_date, coil_number: c.coil_number, product_type: c.product_type, manufacturer: c.manufacturer,
    color_name: c.color_name, thickness: c.thickness, coil_meter: c.initial_meter, purchaser: c.purchaser, memo: "",
  }));
  const outbound = [
    base({ outbound_date: "2026-06-10", arrival_date: "2026-06-12", arrival_time: "10:00", customer: "한빛건설", product_type: "강판", coil_number: "C-20260601-1043", manufacturer: "동국", color_name: "차콜", site_address: "서울 강남구 역삼로 123 역삼 신축현장", outbound_meter: 120, before_meter: 880, after_meter: 760, is_completed: false, completed_at: null, memo: "오전 배송" }),
    base({ outbound_date: "2026-06-08", arrival_date: "2026-06-09", arrival_time: "14:00", customer: "판교물류", product_type: "징크", coil_number: "C-20260528-3391", manufacturer: "동국", color_name: "다크그레이", site_address: "경기 성남시 분당구 판교로 50 판교 물류센터", outbound_meter: 80, before_meter: 1280, after_meter: 1200, is_completed: true, completed_at: "2026-06-08", memo: "" }),
  ];
  return { coils, inbound, outbound };
}

/* =========================================================================
   공통 UI
   ========================================================================= */
function Card({ children, className = "" }) {
  return <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm ${className}`}>{children}</div>;
}
function Swatch({ name, size = 16 }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span style={{ width: size, height: size, background: hexOf(name) }} className="inline-block rounded-md border border-slate-300 shrink-0" />
      <span className="whitespace-nowrap">{name}</span>
    </span>
  );
}
function StatusBadge({ status }) {
  const map = {
    정상: "bg-emerald-50 text-emerald-700 border-emerald-200",
    부족: "bg-amber-50 text-amber-700 border-amber-200",
    사용완료: "bg-slate-100 text-slate-500 border-slate-200",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${map[status] || map.정상}`}>{status}</span>;
}
function Modal({ open, onClose, title, children, wide, plainHeader = false, hideClose = false, headerActions }) {
  if (!open) return null;
  const widthClass = wide === "inventory" ? "max-w-[1240px]" : wide === "medium" ? "max-w-3xl" : wide ? "max-w-5xl" : "max-w-xl";
  return (
    <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto bg-slate-900/50 backdrop-blur-sm no-print">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${widthClass} my-2 sm:my-4 max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] overflow-hidden flex flex-col`}>
        <div className={`shrink-0 bg-white flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 ${plainHeader ? "" : "border-b border-slate-100"}`}>
          <h3 className="min-w-0 text-base sm:text-lg font-semibold text-slate-800 truncate">{title}</h3>
          <div className="flex items-center gap-2">
            {headerActions}
            {!hideClose && <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X size={20} /></button>}
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 sm:py-5">{children}</div>
      </div>
    </div>
  );
}
function Field({ label, children, required }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}{required && <span className="text-rose-500"> *</span>}</span>
      {children}
    </label>
  );
}
function PastelClock({ size = 20, className = "" }) {
  const gradientId = useMemo(() => `pastel-clock-${uid()}`, []);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F1A3BE" />
          <stop offset="1" stopColor="#829BE5" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="9" stroke={`url(#${gradientId})`} strokeWidth="2" />
      <path d="M12 7v5l3 2" stroke={`url(#${gradientId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PastelTruck({ size = 20, className = "" }) {
  const gradientId = useMemo(() => `pastel-truck-${uid()}`, []);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="3" y1="4" x2="21" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F1A3BE" />
          <stop offset="1" stopColor="#829BE5" />
        </linearGradient>
      </defs>
      <path d="M3.5 6.5h10v10h-10zM13.5 10h3.2l3.8 3.8v2.7h-7z" stroke={`url(#${gradientId})`} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="7" cy="18" r="1.8" stroke={`url(#${gradientId})`} strokeWidth="2" />
      <circle cx="17.5" cy="18" r="1.8" stroke={`url(#${gradientId})`} strokeWidth="2" />
    </svg>
  );
}
function PastelCalendar({ size = 20, className = "" }) {
  const gradientId = useMemo(() => `pastel-calendar-${uid()}`, []);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F1A3BE" />
          <stop offset="1" stopColor="#829BE5" />
        </linearGradient>
      </defs>
      <rect x="3.5" y="5.5" width="17" height="15" rx="3" stroke={`url(#${gradientId})`} strokeWidth="2" />
      <path d="M8 3.5v4M16 3.5v4M3.5 10h17" stroke={`url(#${gradientId})`} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function AutoGrowTextarea({ value, onChange, className = "", placeholder = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "42px";
    ref.current.style.height = `${Math.min(ref.current.scrollHeight, 128)}px`;
  }, [value]);
  return (
    <textarea ref={ref} rows={1} value={value} onChange={onChange} placeholder={placeholder}
      className={`${className} min-h-[42px] max-h-32 resize-none overflow-y-auto leading-5`} />
  );
}
const inputCls = "w-full min-w-0 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 bg-white";

function DateRange({ from, to, setFrom, setTo }) {
  return (
    <div className="flex items-center gap-1.5 text-sm no-print">
      <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white" />
      <span className="text-slate-400">~</span>
      <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white" />
      {(from || to) && <button onClick={() => { setFrom(""); setTo(""); }} className="text-xs text-slate-400 hover:text-slate-600 px-1">초기화</button>}
    </div>
  );
}
const inRange = (d, from, to) => (!from || d >= from) && (!to || d <= to);
const outboundDayStatus = (date) => {
  if (!date) return "-";
  const target = new Date(`${date}T00:00:00`);
  const today = new Date(`${todayStr()}T00:00:00`);
  const diff = Math.round((target - today) / 86400000);
  if (diff === 0) return "D-Day";
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
};

function Toolbar({ q, setQ, children, placeholder = "코일번호 · 제조사 · 색상 · 매입처 · 현장 검색" }) {
  return (
    <div className="flex items-center gap-2 flex-wrap no-print">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
      </div>
      {children}
    </div>
  );
}
function ExcelBtn({ onClick, className = "" }) {
  return (
    <button onClick={onClick} className={`h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 inline-flex items-center justify-center gap-1.5 hover:bg-slate-50 no-print ${className}`}>
      <Download size={16} />엑셀
    </button>
  );
}
function downloadXlsx(rows, sheetName, fileName) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

/* =========================================================================
   메인 앱
   ========================================================================= */
const NAV = [
  { key: "dashboard", label: "대시보드", icon: LayoutDashboard, group: "현황", desc: "전체 요약 보기" },
  { key: "inbound", label: "입고관리", icon: PackagePlus, group: "입출고", desc: "신규 코일 입고" },
  { key: "outbound", label: "출고관리", icon: Truck, group: "입출고", desc: "출고 등록·승인" },
  { key: "coil", label: "코일관리", icon: Layers3, group: "현황", desc: "코일 재고 등록" },
  { key: "inventory", label: "재고현황", icon: Boxes, group: "현황", desc: "M 기준 재고" },
];

export default function CoilInventory() {
  const [authed, setAuthed] = useState(() => {
    try { return sessionStorage.getItem("hnmt-coil-authed") === "1"; } catch { return false; }
  });
  const [userRole, setUserRole] = useState(() => {
    try { return sessionStorage.getItem("hnmt-coil-role") || ""; } catch { return ""; }
  });
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [menu, setMenu] = useState("dashboard");
  const [drawer, setDrawer] = useState(false);
  const [quickAction, setQuickAction] = useState(null);
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [outboundPendingOpen, setOutboundPendingOpen] = useState(false);
  const [outboundDetailId, setOutboundDetailId] = useState("");

  const initial = useMemo(seed, []);
  const [coils, setCoils] = useStore("coils", initial.coils);
  const [inbound, setInbound] = useStore("inbound", initial.inbound);
  const [outbound, setOutbound] = useStore("outbound", initial.outbound);
  const [reservations, setReservations] = useStore("reservations", []);
  const [baseStock, setBaseStock] = useStore("baseStock", {});
  const [stockHistory, setStockHistory] = useStore("stockHistory", []);
  const [customColors, setCustomColors] = useStore("customColors", []);
  const [discontinuedColors, setDiscontinuedColors] = useStore("discontinuedColors", []);
  const [zoneStock, setZoneStock] = useStore("zoneStock", {});
  const [baseStockDates, setBaseStockDates] = useStore("baseStockDates", {});
  const [deletedBaseStockKeys, setDeletedBaseStockKeys] = useStore("deletedBaseStockKeys", []);
  const [firebaseConfigText, setFirebaseConfigText] = useStore("firebaseConfigText", "");
  const [firebaseEnabled, setFirebaseEnabled] = useStore("firebaseEnabled", false);
  const bundledFirebaseConfigText = useMemo(() => getBundledFirebaseConfigText(), []);
  const activeFirebaseConfigText = bundledFirebaseConfigText || firebaseConfigText;
  const activeFirebaseEnabled = Boolean(bundledFirebaseConfigText) || firebaseEnabled;
  const [cloudOpen, setCloudOpen] = useState(false);
  const [cloudStatus, setCloudStatus] = useState("");
  const cloudLoadedRef = useRef(false);
  const cloudApplyingRef = useRef(false);
  const cloudBaseSnapshotRef = useRef(null);
  const firebaseUnsubscribeRef = useRef(null);
  useEffect(() => {
    const masterKeys = new Set(COLOR_MASTER.map((item) =>
      `${item.product}|${item.maker}|${item.code}|${item.color}|${item.thickness}`
    ));
    setDeletedBaseStockKeys((current) => current.filter((key) => !masterKeys.has(key)));
  }, [setDeletedBaseStockKeys]);

  // 로그인 상태 유지(새로고침해도 풀리지 않음). 브라우저/탭을 닫으면 자동 로그아웃.
  useEffect(() => {
    try {
      if (authed) {
        sessionStorage.setItem("hnmt-coil-authed", "1");
        sessionStorage.setItem("hnmt-coil-role", userRole);
      } else {
        sessionStorage.removeItem("hnmt-coil-authed");
        sessionStorage.removeItem("hnmt-coil-role");
      }
    } catch { /* 비공개 모드 등에서 sessionStorage 불가 시 무시 */ }
  }, [authed, userRole]);

  const tryLogin = () => {
    const nextRole = pw === LOGIN_PASSWORDS.admin ? "admin" : pw === LOGIN_PASSWORDS.staff ? "staff" : "";
    if (nextRole) {
      setAuthed(true);
      setUserRole(nextRole);
      setMenu("dashboard");
      setBriefingOpen(true);
      setOutboundPendingOpen(false);
      setPwErr("");
    } else setPwErr("비밀번호가 일치하지 않습니다.");
  };

  const localSnapshot = useMemo(() => ({
    coils, inbound, outbound, reservations, baseStock, stockHistory, customColors,
    discontinuedColors, zoneStock, baseStockDates, deletedBaseStockKeys,
  }), [coils, inbound, outbound, reservations, baseStock, stockHistory, customColors, discontinuedColors, zoneStock, baseStockDates, deletedBaseStockKeys]);

  const applySnapshot = (snapshot) => {
    cloudApplyingRef.current = true;
    if (snapshot.coils) setCoils(snapshot.coils);
    if (snapshot.inbound) setInbound(snapshot.inbound);
    if (snapshot.outbound) setOutbound(snapshot.outbound);
    if (snapshot.reservations) setReservations(snapshot.reservations);
    if (snapshot.baseStock) setBaseStock(snapshot.baseStock);
    if (snapshot.stockHistory) setStockHistory(snapshot.stockHistory);
    if (snapshot.customColors) setCustomColors(snapshot.customColors);
    if (snapshot.discontinuedColors) setDiscontinuedColors(snapshot.discontinuedColors);
    if (snapshot.zoneStock) setZoneStock(snapshot.zoneStock);
    if (snapshot.baseStockDates) setBaseStockDates(snapshot.baseStockDates);
    if (snapshot.deletedBaseStockKeys) setDeletedBaseStockKeys(snapshot.deletedBaseStockKeys);
    window.setTimeout(() => { cloudApplyingRef.current = false; }, 500);
  };

  const loadSharedData = async (configText = activeFirebaseConfigText) => {
    setCloudStatus("Firestore 데이터를 불러오는 중입니다...");
    const runtime = await getFirebaseRuntime(configText);
    const sharedSnapshot = await runtime.getSharedSnapshot();
    if (!sharedSnapshot) {
      cloudBaseSnapshotRef.current = localSnapshot;
      cloudLoadedRef.current = true;
      setCloudStatus("Firestore 문서가 비어 있습니다. 먼저 로컬 데이터를 이전해주세요.");
      return;
    }
    cloudBaseSnapshotRef.current = sharedSnapshot;
    applySnapshot(sharedSnapshot);
    cloudLoadedRef.current = true;
    setCloudStatus("Firestore 데이터 불러오기 완료");
  };

  const saveSharedData = async (snapshot = localSnapshot, configText = activeFirebaseConfigText) => {
    setCloudStatus("Firestore에 저장 중입니다...");
    const runtime = await getFirebaseRuntime(configText);
    const mergedSnapshot = await runtime.saveSharedSnapshot(snapshot, cloudBaseSnapshotRef.current || {});
    cloudBaseSnapshotRef.current = mergedSnapshot;
    setCloudStatus("Firestore 저장 완료");
  };

  useEffect(() => {
    if (!authed || !activeFirebaseEnabled || !activeFirebaseConfigText) return;
    let cancelled = false;
    cloudLoadedRef.current = false;
    setCloudStatus("Firestore 실시간 연결 중입니다...");
    getFirebaseRuntime(activeFirebaseConfigText).then((runtime) => {
      if (cancelled) return;
      firebaseUnsubscribeRef.current?.();
      firebaseUnsubscribeRef.current = runtime.subscribe((sharedSnapshot) => {
        if (!sharedSnapshot) {
          cloudBaseSnapshotRef.current = readLocalSnapshot();
          cloudLoadedRef.current = true;
          setCloudStatus("Firestore 문서가 비어 있습니다. 로컬 이전을 먼저 실행해주세요.");
          return;
        }
        const previousBase = cloudBaseSnapshotRef.current || {};
        const currentLocal = readLocalSnapshot();
        const nextSnapshot = cloudLoadedRef.current
          ? mergeSharedSnapshots(sharedSnapshot, currentLocal, previousBase)
          : sharedSnapshot;
        cloudBaseSnapshotRef.current = sharedSnapshot;
        applySnapshot(nextSnapshot);
        cloudLoadedRef.current = true;
        setCloudStatus("Firestore 실시간 연결됨");
      }, (error) => {
        setCloudStatus(error.message || "Firestore 실시간 연결 오류");
        cloudLoadedRef.current = true;
      });
    }).catch((error) => {
      setCloudStatus(error.message);
      cloudLoadedRef.current = true;
    });
    return () => {
      cancelled = true;
      firebaseUnsubscribeRef.current?.();
      firebaseUnsubscribeRef.current = null;
    };
  }, [authed, activeFirebaseEnabled, activeFirebaseConfigText]);

  useEffect(() => {
    if (!authed || !activeFirebaseEnabled || !activeFirebaseConfigText || !cloudLoadedRef.current || cloudApplyingRef.current) return;
    const timer = window.setTimeout(() => {
      saveSharedData(localSnapshot, activeFirebaseConfigText).catch((error) => setCloudStatus(error.message));
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [authed, activeFirebaseEnabled, activeFirebaseConfigText, localSnapshot]);

  if (!authed) return <Login pw={pw} setPw={setPw} pwErr={pwErr} tryLogin={tryLogin} />;

  const ctx = { coils, setCoils, inbound, setInbound, outbound, setOutbound, reservations, setReservations, baseStock, setBaseStock, stockHistory, setStockHistory, customColors, setCustomColors, discontinuedColors, setDiscontinuedColors, zoneStock, setZoneStock, baseStockDates, setBaseStockDates, deletedBaseStockKeys, setDeletedBaseStockKeys };
  const goto = (k) => { setMenu(k); setDrawer(false); };
  const openQuick = (kind) => { setQuickAction(kind); setMenu(kind); setDrawer(false); };
  const openOutboundDetail = (id = "") => {
    setOutboundDetailId(id);
    setOutboundPendingOpen(true);
    setMenu("outbound");
    setDrawer(false);
  };
  const resetAllData = async () => {
    const resetSnapshot = {
      ...localSnapshot,
      coils: [],
      inbound: [],
      outbound: [],
      reservations: [],
      baseStock: {},
      stockHistory: [],
      zoneStock: {},
      baseStockDates: {},
    };
    downloadJson({ exportedAt: new Date().toISOString(), data: localSnapshot }, `HNMT_COIL_before_reset_${todayStr()}.json`);
    cloudApplyingRef.current = true;
    try {
      if (activeFirebaseEnabled && activeFirebaseConfigText) {
        setCloudStatus("Firestore 운영 데이터를 초기화하는 중입니다...");
        const runtime = await getFirebaseRuntime(activeFirebaseConfigText);
        await runtime.overwriteSharedSnapshot(resetSnapshot);
        setCloudStatus("Firestore 운영 데이터 초기화 완료");
      }
    } catch (error) {
      cloudApplyingRef.current = false;
      throw error;
    }
    cloudBaseSnapshotRef.current = resetSnapshot;
    applySnapshot(resetSnapshot);
    localStorage.removeItem("hnmt-coil-inboundTodos");
    setQuickAction(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <GlobalStyle />
      <AppDialog />
      {/* 상단 바 */}
      <header className="sticky top-0 z-50 bg-white/65 backdrop-blur-xl border-b border-white/70 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-3 md:px-8 h-16 md:h-20 flex items-center justify-between">
          <button onClick={() => goto("dashboard")} className="h-11 md:h-13">
            <img src="/coil-inventory-management/assets/hnmt-logo.png" alt="HNMT" className="w-36 md:w-48 h-full object-contain" style={{ filter: "brightness(0) saturate(100%) invert(17%) sepia(26%) saturate(1412%) hue-rotate(190deg) brightness(86%) contrast(91%)" }} />
          </button>
          <div className="flex items-center gap-2">
            {!bundledFirebaseConfigText && (
              <button onClick={() => setCloudOpen(true)}
                className={`hidden sm:inline-flex h-10 px-3 rounded-xl border text-xs font-bold items-center justify-center transition ${activeFirebaseEnabled ? "border-indigo-200 bg-indigo-50 text-indigo-600" : "border-slate-200 bg-white text-slate-500 hover:text-indigo-600"}`}>
                공용저장
              </button>
            )}
            <button onClick={() => setDrawer(true)} aria-label="메뉴 열기"
              className="w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-white/25 border border-white/60 backdrop-blur-xl shadow-lg shadow-indigo-200/30 flex items-center justify-center transition hover:bg-white/45 hover:-translate-y-0.5">
              <Menu size={22} className="text-indigo-500/80" />
            </button>
          </div>
        </div>
      </header>

      {/* 상단에서 아래로 펼쳐지는 드로어 */}
      <Drawer open={drawer} onClose={() => setDrawer(false)} menu={menu} goto={goto} onLogout={() => { setAuthed(false); setUserRole(""); setPw(""); setDrawer(false); }} />
      {briefingOpen && <TodayBriefing ctx={ctx} onClose={() => setBriefingOpen(false)} />}
      <CloudStorageModal
        open={cloudOpen}
        onClose={() => setCloudOpen(false)}
        configText={activeFirebaseConfigText}
        setConfigText={setFirebaseConfigText}
        enabled={activeFirebaseEnabled}
        setEnabled={(value) => { cloudLoadedRef.current = false; setFirebaseEnabled(value); }}
        status={cloudStatus}
        snapshot={localSnapshot}
        onBackup={() => downloadJson({ exportedAt: new Date().toISOString(), data: readLocalSnapshot() }, `HNMT_COIL_backup_${todayStr()}.json`)}
        onLoad={loadSharedData}
        onMigrate={async (configText) => {
          const snapshot = readLocalSnapshot();
          downloadJson({ exportedAt: new Date().toISOString(), data: snapshot }, `HNMT_COIL_before_firestore_${todayStr()}.json`);
          await saveSharedData(snapshot, configText || activeFirebaseConfigText);
          setFirebaseEnabled(true);
          cloudLoadedRef.current = true;
        }}
        onSaveNow={(configText) => saveSharedData(localSnapshot, configText || activeFirebaseConfigText)}
      />

      <main className="max-w-[1400px] mx-auto p-4 md:p-8">
        {menu === "dashboard" && <Dashboard ctx={ctx} openQuick={openQuick} openOutboundDetail={openOutboundDetail} resetAllData={resetAllData} isAdmin={userRole === "admin"} />}
        {menu === "inbound" && <Inbound ctx={ctx} quickOpen={quickAction === "inbound"} clearQuick={() => setQuickAction(null)} />}
        {menu === "outbound" && <Outbound ctx={ctx} quickOpen={quickAction === "outbound"} clearQuick={() => setQuickAction(null)}
          pendingOpen={outboundPendingOpen} setPendingOpen={setOutboundPendingOpen}
          initialDetailId={outboundDetailId} clearInitialDetail={() => setOutboundDetailId("")} />}
        {menu === "coil" && <CoilManagement ctx={ctx} />}
        {menu === "inventory" && <Inventory ctx={ctx} />}
      </main>
    </div>
  );
}

/* ---------- 전역 스타일(애니메이션 / 인쇄) ---------- */
function GlobalStyle() {
  return (
    <style>{`
      @keyframes glowPulse { 0%,100%{box-shadow:0 0 0 0 rgba(146,168,209,.55),0 0 22px 4px rgba(247,202,201,.45);} 50%{box-shadow:0 0 0 10px rgba(146,168,209,0),0 0 34px 10px rgba(247,202,201,.65);} }
      @keyframes twinkle { 0%,100%{opacity:.15; transform:scale(.7);} 50%{opacity:.9; transform:scale(1.15);} }
      @keyframes slideDown { from{transform:translateY(-12px); opacity:0;} to{transform:translateY(0); opacity:1;} }
      @keyframes cardSlide { from{transform:translateY(-18px) scale(.96); opacity:0;} to{transform:translateY(0) scale(1); opacity:1;} }
      @keyframes rankingRise { from{transform:translateY(18px); opacity:0;} to{transform:translateY(0); opacity:1;} }
      @keyframes pendingPulse { 0%,100%{border-color:#d8dee9;box-shadow:0 0 0 0 rgba(167,139,250,0);} 50%{border-color:#a78bfa;box-shadow:0 0 0 4px rgba(247,202,201,.22),0 5px 16px rgba(146,168,209,.14);} }
      @keyframes pendingStrong { 0%,100%{box-shadow:0 5px 18px rgba(146,168,209,.22),0 0 12px 1px rgba(247,202,201,.34),0 0 0 0 rgba(146,168,209,.22);} 50%{box-shadow:0 10px 30px rgba(128,142,220,.38),0 0 24px 5px rgba(247,202,201,.42),0 0 0 5px rgba(146,168,209,.12);} }
      .glow-lock{ animation:glowPulse 2.6s ease-in-out infinite; }
      .twinkle{ animation:twinkle 3s ease-in-out infinite; }
      .drawer-anim{ animation:slideDown .28s ease-out; }
      .menu-card{ animation:cardSlide .38s ease-out both; }
      .ranking-rise{ animation:rankingRise .42s ease-out both; }
      .gradient-icon svg{ stroke:url(#menuIconGradient); }
      .metric-icon svg{ stroke:url(#metricIconGradient); }
      .pastel-outline{
        border:1px solid #d8dee9;
        background:#fff;
      }
      .pastel-outline:hover,.pastel-outline:focus-visible{
        border-color:transparent;
        background:linear-gradient(#fff,#fff) padding-box,linear-gradient(135deg,#c89bf0,#758df1) border-box;
      }
      .pending-active{
        background:#fff;
        animation:pendingPulse 2.3s ease-in-out infinite;
      }
      .outbound-pending-trigger{
        border:1px solid #d8dee9;
        background:#fff;
        transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease;
      }
      .outbound-pending-trigger:hover,.outbound-pending-trigger:focus-visible{
        transform:translateY(-2px);
        border-color:transparent;
        background:linear-gradient(#fff,#fff) padding-box,linear-gradient(135deg,#f2a9c2,#8ea7f3,#b88ae8) border-box;
        box-shadow:0 9px 26px rgba(128,142,220,.24);
      }
      .outbound-pending-trigger.has-pending{
        border-color:transparent;
        background:linear-gradient(110deg,rgba(255,255,255,.99),rgba(253,247,250,.99),rgba(248,249,255,.99)) padding-box,linear-gradient(135deg,#ef9fbd,#91a8ef,#b98be8) border-box;
        animation:pendingStrong 2s ease-in-out infinite;
      }
      .outbound-pending-panel{ animation:slideDown .3s ease-out both; }
      .soft-pink-marker{
        display:inline;
        padding:0 .12rem;
        background:linear-gradient(transparent 52%,rgba(247,202,201,.38) 52%,rgba(247,202,201,.38) 91%,transparent 91%);
        box-decoration-break:clone;
        -webkit-box-decoration-break:clone;
      }
      input[type="password"]::-ms-reveal,
      input[type="password"]::-ms-clear{ display:none; }
      @media (max-width: 639px) {
        input, select, textarea{ font-size:16px !important; }
        .mobile-safe-actions{ position:sticky; bottom:0; background:#fff; border-top:1px solid #eef0f3; box-shadow:0 -8px 16px -8px rgba(15,23,42,.12); padding-top:.625rem; padding-bottom:max(.5rem,env(safe-area-inset-bottom)); }
      }
      @media print {
        .no-print{ display:none !important; }
        body{ background:#fff !important; }
        main{ padding:0 !important; max-width:none !important; }
        table{ font-size:11px; }
        .print-card{ box-shadow:none !important; border:1px solid #cbd5e1 !important; }
      }
    `}</style>
  );
}

/* =========================================================================
   로그인 (로즈쿼츠 & 세레니티 파스텔 테마)
   ========================================================================= */
function Login({ pw, setPw, pwErr, tryLogin }) {
  const [showPw, setShowPw] = useState(false);
  const stars = useMemo(() => Array.from({ length: 26 }, () => ({
    top: Math.random() * 100, left: Math.random() * 100, s: 4 + Math.random() * 7, d: Math.random() * 3,
  })), []);
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg,#F7CAC9 0%,#e7c8da 38%,#b9c0e0 70%,#92A8D1 100%)" }}>
      <GlobalStyle />
      {stars.map((st, i) => (
        <span key={i} className="twinkle absolute rounded-full bg-white" style={{ top: `${st.top}%`, left: `${st.left}%`, width: st.s, height: st.s, animationDelay: `${st.d}s` }} />
      ))}
      <div className="w-full max-w-sm relative">
        <div className="text-center mb-5">
          <div className="glow-lock inline-flex items-center justify-center w-36 h-36 rounded-[2.5rem] bg-white/35 backdrop-blur mb-4 border border-white/60">
            <img src="/coil-inventory-management/assets/mascot.gif" alt="HN 마스코트" className="w-32 h-32 object-contain" />
          </div>
          <p className="text-slate-600/75 text-sm">접속 비밀번호 4자리를 입력하세요</p>
        </div>
        <div className="bg-white/75 backdrop-blur-xl rounded-3xl px-6 py-5 shadow-2xl border border-white/60">
          <div className="relative w-60 sm:w-64 mx-auto">
            <input autoFocus type={showPw ? "text" : "password"} inputMode="numeric" maxLength={4} value={pw}
              onChange={(e) => setPw(e.target.value.replace(/\D/g, "").slice(0, 4))}
              onKeyDown={(e) => e.key === "Enter" && tryLogin()} placeholder="•  •  •  •"
              aria-label="비밀번호 4자리"
              className="block w-full text-center tracking-[0.45em] text-xl font-medium text-slate-300 placeholder:text-slate-300 py-2.5 px-11 rounded-2xl border border-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-300/60 bg-white/70 shadow-inner" />
            {pw.length > 0 && (
              <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-slate-300 hover:text-slate-400">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            )}
          </div>
          {pwErr && <p className="text-rose-500 text-sm mt-2 text-center">{pwErr}</p>}
          <button onClick={tryLogin}
            className="block w-60 sm:w-64 mx-auto mt-4 py-2.5 rounded-full text-sm font-bold text-white tracking-[0.18em] shadow-lg shadow-indigo-300/35 transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
            style={{ background: "linear-gradient(90deg,#efa8b7 0%,#b79bd5 52%,#7795cc 100%)" }}>
            로그인
          </button>
        </div>
        <p className="mt-5 text-center text-[11px] tracking-[0.16em] text-white/75">© 2026 HNMT COIL SYSTEM</p>
      </div>
    </div>
  );
}

/* =========================================================================
   드로어 (상단에서 아래로 펼쳐짐, 쇼핑몰풍 아이콘 그리드)
   ========================================================================= */
function Drawer({ open, onClose, menu, goto, onLogout }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[55]" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-700/15 backdrop-blur-sm" />
      <div onClick={(e) => e.stopPropagation()} className="drawer-anim absolute top-0 inset-x-0 text-slate-700 shadow-2xl rounded-b-[2rem] border-b border-slate-200 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-5 md:py-7">
          <svg width="0" height="0" aria-hidden="true"><defs><linearGradient id="menuIconGradient" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ef9aaf" /><stop offset=".5" stopColor="#a78bfa" /><stop offset="1" stopColor="#6387ca" /></linearGradient></defs></svg>
          <div className="flex items-center justify-between mb-5">
            <div className="h-11">
              <img src="/coil-inventory-management/assets/hnmt-logo.png" alt="HNMT" className="w-40 h-full object-contain" style={{ filter: "brightness(0) saturate(100%) invert(17%) sepia(26%) saturate(1412%) hue-rotate(190deg) brightness(86%) contrast(91%)" }} />
            </div>
            <button onClick={onClose} className="p-2 rounded-xl bg-white/25 hover:bg-white/45"><X size={22} /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {NAV.map((n) => {
              const Icon = n.icon; const active = menu === n.key;
              return (
                <button key={n.key} onClick={() => goto(n.key)} title={n.label} aria-label={n.label}
                  style={{ animationDelay: `${NAV.indexOf(n) * 45}ms` }}
                  className={`menu-card group h-[114px] md:h-[126px] w-full rounded-2xl p-3 md:p-4 border transition flex flex-col items-center justify-center gap-2 backdrop-blur-xl ${active ? "bg-gradient-to-br from-rose-100/65 to-indigo-100/65 border-white/75 shadow-xl" : "bg-gradient-to-br from-white/45 to-indigo-50/35 border-white/65 hover:from-rose-50/65 hover:to-blue-50/65 hover:-translate-y-1"}`}>
                  <div className="gradient-icon w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center bg-white/35 border border-white/50 shadow-lg backdrop-blur">
                    <Icon size={26} />
                  </div>
                  <div className="text-xs font-semibold text-slate-700 text-center">{n.label}</div>
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex justify-end">
            <button onClick={onLogout} className="text-xs text-slate-600 hover:text-rose-600 px-3 py-1.5 rounded-lg bg-white/25 border border-white/60 hover:bg-white/45 inline-flex items-center gap-1 backdrop-blur"><LogOut size={13} />로그아웃</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CloudStorageModal({ open, onClose, configText, setConfigText, enabled, setEnabled, status, onBackup, onLoad, onMigrate, onSaveNow }) {
  const [draftConfig, setDraftConfig] = useState(configText || "");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setDraftConfig(configText || "");
  }, [open, configText]);
  const run = async (fn) => {
    try {
      setBusy(true);
      await fn();
    } catch (error) {
      appAlert(error.message || "공용 저장 작업에 실패했습니다.", { title: "공용 저장 오류", type: "warning" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Firebase Firestore 공용 저장" wide="medium">
      <div className="space-y-5">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 leading-relaxed">
          기존 브라우저 데이터는 삭제하지 않습니다. 먼저 JSON 백업을 받은 뒤, Firebase config를 연결하면 여러 기기에서 같은 Firestore 데이터를 실시간 공유합니다.
        </div>
        <Field label="Firebase 웹앱 config">
          <textarea className={`${inputCls} min-h-36 font-mono text-xs`} value={draftConfig} onChange={(e) => setDraftConfig(e.target.value)}
            placeholder={`const firebaseConfig = {\n  apiKey: \"...\",\n  authDomain: \"...\",\n  projectId: \"...\",\n  storageBucket: \"...\",\n  messagingSenderId: \"...\",\n  appId: \"...\"\n};`} />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => { setConfigText(draftConfig.trim()); setEnabled(Boolean(draftConfig.trim())); }}
            className="h-10 px-4 rounded-xl border border-indigo-200 bg-indigo-50 text-sm font-bold text-indigo-700">
            설정 저장
          </button>
          <button type="button" onClick={() => setEnabled(!enabled)}
            disabled={!configText && !draftConfig.trim()}
            className={`h-10 px-4 rounded-xl border text-sm font-bold disabled:opacity-40 ${enabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>
            {enabled ? "Firestore 사용 중" : "Firestore 꺼짐"}
          </button>
          <span className="text-xs text-slate-400">{status || "대기 중"}</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <button type="button" onClick={onBackup}
            className="h-12 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-indigo-200">
            1. 기존 데이터 JSON 백업
          </button>
          <button type="button" disabled={busy} onClick={() => run(async () => { const config = draftConfig.trim(); setConfigText(config); await onMigrate(config); })}
            className="h-12 rounded-xl border border-indigo-200 bg-indigo-600 text-sm font-bold text-white disabled:opacity-50">
            2. 로컬 데이터를 Firestore로 이전
          </button>
          <button type="button" disabled={busy} onClick={() => run(async () => { const config = draftConfig.trim(); setConfigText(config); await onLoad(config || configText); })}
            className="h-12 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 disabled:opacity-50">
            Firestore에서 불러오기
          </button>
          <button type="button" disabled={busy} onClick={() => run(async () => { const config = draftConfig.trim(); setConfigText(config); await onSaveNow(config); })}
            className="h-12 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 disabled:opacity-50">
            현재 화면 데이터 저장
          </button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">
          Firestore 경로는 <b>hnmtCoilSystem/sharedState</b> 문서를 사용합니다.
          저장 전 최신 문서를 트랜잭션으로 읽고 병합하므로 여러 기기 입력 충돌 위험을 줄입니다.
          기존 localStorage는 캐시와 백업 용도로 유지됩니다.
        </div>
      </div>
    </Modal>
  );
}

/* =========================================================================
   대시보드
   ========================================================================= */
function TodayBriefing({ ctx, onClose }) {
  const { inbound, outbound, reservations, baseStock, stockHistory, baseStockDates, customColors, discontinuedColors } = ctx;
  const [runtimeError, setRuntimeError] = useState(false);
  useEffect(() => {
    const reportError = () => setRuntimeError(true);
    window.addEventListener("error", reportError);
    window.addEventListener("unhandledrejection", reportError);
    return () => {
      window.removeEventListener("error", reportError);
      window.removeEventListener("unhandledrejection", reportError);
    };
  }, []);
  const catalog = [...COLOR_MASTER, ...customColors];
  const today = todayStr();
  const previousStock = stockHistory.reduce((latest, record) => {
    if (record.registered_at >= today) return latest;
    const current = latest[record.key];
    if (!current ||
      String(record.registered_at).localeCompare(String(current.registered_at)) > 0 ||
      (record.registered_at === current.registered_at && String(record.created_at || "").localeCompare(String(current.created_at || "")) > 0)) {
      latest[record.key] = record;
    }
    return latest;
  }, {});
  const stockRows = catalog
    .map((item) => {
      const key = `${item.product}|${item.maker}|${item.code}|${item.color}|${item.thickness}`;
      const meter = Number(baseStock[key]) || 0;
      const previousMeter = previousStock[key]
        ? Number(previousStock[key].meter) || 0
        : baseStockDates[key] && baseStockDates[key] < today ? meter : 0;
      return { ...item, key, meter, previousMeter, change: meter - previousMeter };
    })
    .filter((item) => item.meter > 0 && !discontinuedColors.includes(item.key));
  const total = stockRows.reduce((sum, item) => sum + item.meter, 0);
  const previousTotal = stockRows.reduce((sum, item) => sum + item.previousMeter, 0);
  const totalChange = total - previousTotal;
  const productBriefRows = ["강판", "징크", "절곡"].map((product) => ({
    product,
    meter: stockRows.filter((item) => item.product === product).reduce((sum, item) => sum + item.meter, 0),
    previousMeter: stockRows.filter((item) => item.product === product).reduce((sum, item) => sum + item.previousMeter, 0),
    top: [...stockRows].filter((item) => item.product === product).sort((a, b) => b.meter - a.meter).slice(0, 5),
  }));
  const pending = outbound.filter((item) => !item.is_completed);
  const todayShip = pending.filter((item) => item.outbound_date === today).length;
  const overdue = pending.filter((item) => item.outbound_date < today && item.arrival_date < today).length;
  const inboundToday = inbound.filter((item) => item.inbound_date === today).length;
  const reservationCount = reservations.filter((item) => !item.is_completed).length;
  return (
    <div onClick={onClose} className="fixed inset-0 z-[90] overflow-y-auto bg-black/30 backdrop-blur-sm flex items-center justify-center">
      <div onClick={onClose}
        className="relative min-h-[100dvh] w-full bg-black/75 text-white flex items-center justify-center">
        <button type="button" onClick={(event) => { event.stopPropagation(); onClose(); }} aria-label="오늘의 브리핑 닫기"
          className="fixed z-20 top-[max(.75rem,env(safe-area-inset-top))] right-[max(.75rem,env(safe-area-inset-right))] w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-white/20 bg-black/35 text-white/75 backdrop-blur-md flex items-center justify-center transition hover:bg-white/15 hover:text-white">
          <X size={18} />
        </button>
        <div onClick={(event) => event.stopPropagation()} className="w-full max-w-6xl px-5 py-10 sm:px-10">
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-5xl font-black tracking-[0.08em] text-[#ff4f91]">HNMT COIL SYSTEM BRIEFING</h2>
            <p className="mt-5 text-sm sm:text-xl font-semibold text-white">{todayLabel()} 확인해야 할 내용입니다.</p>
            <p className="mt-3 text-base sm:text-lg font-medium text-white/80">
              <span className="font-bold text-[#ff4f91]">입고</span> {inboundToday}건
              <span className="mx-2 text-white/30">·</span>
              <span className="font-bold text-[#ff4f91]">대기</span> {pending.length}건
              <span className="mx-2 text-white/30">·</span>
              <span className="font-bold text-[#ff4f91]">예약</span> {reservationCount}건
            </p>
          </div>

          <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-4 mt-10">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
              <h3 className="font-bold">제품별 재고 비중</h3>
              {productBriefRows.map(({ product: label, meter, previousMeter }, index) => {
                const change = meter - previousMeter;
                const color = index === 0 ? "from-rose-300 to-indigo-400" : index === 1 ? "from-indigo-300 to-blue-500" : "from-sky-200 to-violet-300";
                return (
                <div key={label} className="mt-5">
                  <div className="flex justify-between gap-3 text-sm">
                    <span>{label}</span>
                    <span className="text-right">
                      <strong>{fmt(meter)} M</strong>
                      <span className={`ml-2 text-[11px] ${change > 0 ? "text-rose-300" : change < 0 ? "text-blue-300" : "text-white/35"}`}>
                        {change > 0 ? "▲" : change < 0 ? "▼" : "−"} {change === 0 ? "변동 없음" : `${fmt(Math.abs(change))} M`}
                      </span>
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${total ? meter / total * 100 : 0}%` }} />
                  </div>
                </div>
              )})}
              <div className="mt-6 pt-4 border-t border-white/10 text-xs leading-6 text-white/55">
                {total > 0 ? `현재 총 재고는 ${fmt(total)} M입니다.` : "현재 등록된 재고가 없습니다."}
                <br />
                {total > 0
                  ? totalChange > 0
                    ? `전일보다 총 재고가 ${fmt(totalChange)} M 증가했습니다.`
                    : totalChange < 0
                      ? `전일보다 총 재고가 ${fmt(Math.abs(totalChange))} M 감소했습니다.`
                      : "전일과 비교해 총 재고 변동이 없습니다."
                  : "전일 비교가 필요한 재고 데이터가 없습니다."}
                <br />
                {todayShip > 0 ? `오늘 출고 대기는 ${todayShip}건입니다.` : "오늘 출고 대기가 없습니다."}
                <br />
                {overdue > 0 ? `출고 일정이 지난 보류 건이 ${overdue}건 있습니다.` : "현재 일정이 지난 출고 보류 건은 없습니다."}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">보유 재고 TOP 5</h3>
                <span className="text-[11px] text-white/40">실시간 M 기준</span>
              </div>
              <div className="mt-4 grid md:grid-cols-3 gap-3">
                {productBriefRows.map((group) => {
                  const maxMeter = Math.max(...group.top.map((item) => item.meter), 1);
                  return (
                    <div key={group.product} className="rounded-xl bg-white/[0.04] p-3">
                      <div className="mb-2 text-xs font-bold text-white/75">{group.product}</div>
                      <div className="space-y-2">
                        {group.top.map((item, index) => (
                          <div key={item.key} className="grid grid-cols-[16px_minmax(0,1fr)_58px] gap-2 items-center text-xs">
                            <span className="font-black text-indigo-300">{index + 1}</span>
                            <div className="min-w-0">
                              <div className="truncate">{item.color} <span className="text-white/35">({item.maker}/{item.thickness}T)</span></div>
                              <div className="mt-1 h-1 rounded-full bg-white/10 overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-rose-300 to-indigo-400" style={{ width: `${item.meter / maxMeter * 100}%` }} />
                              </div>
                            </div>
                            <span className="text-right font-bold">{fmt(item.meter)} M</span>
                          </div>
                        ))}
                        {group.top.length === 0 && <div className="py-6 text-center text-xs text-white/35">없음</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <p className={`mt-7 text-center text-[10px] sm:text-xs ${runtimeError ? "text-rose-300" : "text-white/35"}`}>
            {runtimeError ? "화면 오류가 감지되었습니다. 관리자에게 점검을 요청해주세요." : "웹 화면 오류를 실시간 확인 중이며, 이상 발생 시 관리자에게 점검을 요청해주세요."}
          </p>
        </div>
      </div>
    </div>
  );
}

async function completeOutboundRecord(o, coils, setCoils, setOutbound, confirmed = false) {
  const pool = coils
    .filter((c) => c.product_type === o.product_type && c.current_meter > 0)
    .sort((a, b) => {
      if (cFirst(a, o.coil_number) !== cFirst(b, o.coil_number)) return cFirst(a, o.coil_number) - cFirst(b, o.coil_number);
      return (a.inbound_date || a.created_at).localeCompare(b.inbound_date || b.created_at);
    });
  const avail = pool.reduce((a, c) => a + c.current_meter, 0);
  if (o.outbound_meter > avail) {
    appAlert("현재 재고 M보다 출고 예정 M이 커서 완료할 수 없습니다.", { title: "출고 처리 안내", type: "warning" });
    return;
  }
  if (!confirmed && !await appConfirm("이 출고 건을 출고 완료 처리하시겠습니까? 재고가 차감됩니다.", { title: "출고 완료 확인" })) return;

  let remain = o.outbound_meter;
  const updates = {};
  for (const c of pool) {
    if (remain <= 0) break;
    const take = Math.min(remain, c.current_meter);
    const nextMeter = c.current_meter - take;
    const ratio = c.initial_meter ? nextMeter / c.initial_meter : 0;
    updates[c.id] = {
      current_meter: nextMeter,
      total_outbound_meter: c.total_outbound_meter + take,
      current_roll_count: nextMeter <= 0 ? 0 : c.current_roll_count,
      status: nextMeter <= 0 ? "사용완료" : ratio <= 0.2 ? "부족" : "정상",
      updated_at: todayStr(),
    };
    remain -= take;
  }
  setCoils((list) => list.map((c) => updates[c.id] ? { ...c, ...updates[c.id] } : c));
  setOutbound((list) => list.map((x) => x.id === o.id ? {
    ...x, is_completed: true, completed_at: todayStr(), before_meter: avail, after_meter: avail - o.outbound_meter,
  } : x));
}

function cFirst(coil, coilNumber) {
  return coil.coil_number === coilNumber ? 0 : 1;
}

function ProductStockCard({ stat, open, onToggle }) {
  return (
    <Card className="overflow-hidden">
      <button onClick={onToggle} className="w-full px-4 sm:px-5 py-4 text-left md:cursor-default">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-extrabold text-base sm:text-lg">{stat.product}</div>
            <div className="text-xs text-slate-400 mt-0.5">실시간 보유 재고</div>
          </div>
          <div className="flex items-center gap-2 text-right">
            <div className="text-lg sm:text-2xl font-black text-indigo-800">{stat.kinds}<span className="text-xs text-slate-400 ml-1">종류</span> · {fmt(stat.meter)}<span className="text-xs text-slate-400 ml-1">M</span></div>
            <span className="md:hidden text-slate-400">{open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
          </div>
        </div>
      </button>
      <div className={`${open ? "block" : "hidden"} md:block border-t border-slate-100 bg-slate-50/60`}>
        {stat.groups.length === 0 && <div className="px-5 py-5 text-sm text-slate-400">현재 보유 재고가 없습니다.</div>}
        {stat.groups.map((group) => (
          <div key={group.manufacturer} className="px-4 sm:px-5 py-3 border-b last:border-b-0 border-slate-100">
            <div className="font-bold text-sm text-slate-700 mb-2">{group.manufacturer}</div>
            <div className={group.specs.length === 1 ? "" : "space-y-2"}>
              {group.specs.map((spec) => (
                <div key={spec.thickness} className={`flex ${group.specs.length === 1 ? "items-center" : "items-start"} gap-2`}>
                  <span className="shrink-0 min-w-[42px] px-2 py-1 rounded-md bg-slate-200/70 text-[11px] font-bold text-slate-600 text-center">{spec.thickness}T</span>
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {spec.colors.map((item) => (
                      <div key={`${spec.thickness}-${item.color}`} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-slate-200/70 text-xs">
                        <Swatch name={item.color} size={10} />
                        <span className="font-bold text-indigo-800 whitespace-nowrap">{fmt(item.meter)}M</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Dashboard({ ctx, openQuick, openOutboundDetail, resetAllData, isAdmin = false }) {
  const { coils, setCoils, outbound, setOutbound, reservations, baseStock, customColors, discontinuedColors } = ctx;
  const [slide, setSlide] = useState(0);
  const [mobileProduct, setMobileProduct] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPhrase, setResetPhrase] = useState("");
  const t = useRef();
  const slides = [
    { label: "HN Shop", description: "HN메탈릭 공식 쇼핑몰입니다.", image: "/coil-inventory-management/assets/slide-shop.png", link: "https://hnmt.co.kr/" },
    { label: "YouTube", description: "HN메탈릭 공식 영상 채널입니다.", image: "/coil-inventory-management/assets/slide-youtube-new.png", link: "https://www.youtube.com/@hn메탈릭" },
    { label: "Instagram", description: "HN메탈릭의 새로운 소식을 확인하세요.", image: "/coil-inventory-management/assets/slide-instagram.png", link: "https://www.instagram.com/hnmt1555" },
  ];

  useEffect(() => {
    t.current = setInterval(() => setSlide((s) => (s + 1) % slides.length), 4500);
    return () => clearInterval(t.current);
  }, [slides.length]);

  const stockCatalog = [...COLOR_MASTER, ...customColors];
  const stockRows = stockCatalog
    .map((c) => ({
      ...c,
      current_meter: Number(baseStock[`${c.product}|${c.maker}|${c.code}|${c.color}|${c.thickness}`]) || 0,
    }))
    .filter((c) => c.current_meter > 0 && !discontinuedColors.includes(`${c.product}|${c.maker}|${c.code}|${c.color}|${c.thickness}`));
  const totalMeter = stockRows.reduce((a, c) => a + c.current_meter, 0);
  const incomplete = outbound.filter((o) => !o.is_completed);
  const currentDate = todayStr();
  const todayShip = incomplete.filter((o) => o.outbound_date === currentDate).length;
  const held = incomplete.filter((o) => o.outbound_date < currentDate && o.arrival_date < currentDate).length;
  const productStats = ["강판", "징크", "절곡"].map((product) => {
    const rows = stockRows.filter((c) => c.product === product);
    const manufacturers = [...new Set(rows.map((c) => c.maker || "미지정"))].sort((a, b) => a.localeCompare(b, "ko"));
    return {
      product,
      kinds: new Set(rows.map((c) => `${c.maker}-${c.color}-${c.code}-${c.thickness}`)).size,
      meter: rows.reduce((sum, c) => sum + (Number(c.current_meter) || 0), 0),
      groups: manufacturers.map((manufacturer) => {
        const makerRows = rows.filter((c) => (c.maker || "미지정") === manufacturer);
        const specs = [...new Set(makerRows.map((c) => String(c.thickness || "-")))]
          .sort((a, b) => Number(a) - Number(b))
          .map((thickness) => {
            const specRows = makerRows.filter((c) => String(c.thickness || "-") === thickness);
            const colors = [...new Set(specRows.map((c) => c.color || "미지정"))]
              .sort((a, b) => a.localeCompare(b, "ko"))
              .map((color) => ({
                color,
                meter: specRows.filter((c) => (c.color || "미지정") === color)
                  .reduce((sum, c) => sum + (Number(c.current_meter) || 0), 0),
              }));
            return { thickness, colors };
          });
        return { manufacturer, specs };
      }),
    };
  });

  const todo = [...incomplete].sort((a, b) =>
    a.outbound_date.localeCompare(b.outbound_date) ||
    String(a.created_at || "").localeCompare(String(b.created_at || ""))
  );

  const summaryCards = [
    { label: "총 보유 재고", value: fmt(totalMeter), unit: "M", icon: Layers3 },
    { label: "오늘 출고 예정", value: todayShip, unit: "건", icon: CalendarDays },
    { label: "출고 대기", value: incomplete.length, unit: "건", icon: Clock },
    { label: "예약 현황", value: reservations.length, unit: "건", icon: CalendarDays },
  ];

  const handleBackup = () => {
    const data = {
      coils: ctx.coils, inbound: ctx.inbound, outbound: ctx.outbound,
      reservations: ctx.reservations, baseStock: ctx.baseStock, stockHistory: ctx.stockHistory,
      customColors: ctx.customColors, discontinuedColors: ctx.discontinuedColors,
      zoneStock: ctx.zoneStock, baseStockDates: ctx.baseStockDates,
      deletedBaseStockKeys: ctx.deletedBaseStockKeys,
    };
    downloadJson({ exportedAt: new Date().toISOString(), data }, `HNMT_COIL_backup_${todayStr()}.json`);
  };

  return (
    <div className="space-y-6">
      <svg width="0" height="0" aria-hidden="true"><defs><linearGradient id="metricIconGradient" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ef9aaf" /><stop offset=".52" stopColor="#b49ad7" /><stop offset="1" stopColor="#7897cf" /></linearGradient></defs></svg>
      <div className="h-[108px] flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">대시보드</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">입고·출고·재고 현황을 한눈에 확인하세요</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-[11px] sm:text-sm font-semibold text-slate-500 whitespace-nowrap">{todayLabel()}</div>
          {isAdmin && (
            <div className="flex items-center gap-3">
              <button onClick={handleBackup}
                className="text-xs font-medium text-slate-400 transition-colors hover:text-indigo-500">
                백업
              </button>
              <button onClick={() => setResetOpen(true)}
                className="text-xs font-medium text-slate-400 transition-colors hover:text-rose-500">
                초기화
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 슬라이더 */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm h-52 md:h-72 bg-white">
        {slides.map((s, i) => (
          <a key={i} href={s.link} target="_blank" rel="noreferrer" aria-label={s.label}
            className={`group absolute inset-0 transition-opacity duration-700 bg-white ${i === slide ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            <img src={s.image} alt="" className="w-full h-full object-cover md:object-contain bg-white" />
            <div className="absolute inset-x-0 bottom-0 h-16 sm:h-20 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out flex items-center px-5 sm:px-8 py-3 sm:py-4">
              <div>
                <div className="text-white text-lg sm:text-xl font-semibold tracking-tight">{s.label}</div>
                <div className="text-white/75 text-[11px] sm:text-xs mt-1">{s.description}</div>
              </div>
            </div>
          </a>
        ))}
        <button onClick={() => setSlide((slide - 1 + slides.length) % slides.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/30 hover:bg-white/50 text-white backdrop-blur">‹</button>
        <button onClick={() => setSlide((slide + 1) % slides.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/30 hover:bg-white/50 text-white backdrop-blur">›</button>
        <div className="absolute bottom-4 right-5 flex gap-1.5">
          {slides.map((_, i) => <button key={i} onClick={() => setSlide(i)} className={`h-2 rounded-full transition-all ${i === slide ? "w-6 bg-white" : "w-2 bg-white/50"}`} />)}
        </div>
      </div>
      <Modal open={isAdmin && resetOpen} onClose={() => setResetOpen(false)} title="전체 초기화" hideClose>
        <div className="text-center py-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
            <AlertTriangle size={28} />
          </div>
          <p className="mt-4 text-base font-bold text-slate-800">전체 초기화 하시겠습니까?</p>
          <p className="mt-2 text-xs text-slate-400">입고·출고·예약·재고·타임라인 운영 데이터만 초기화됩니다. 색상마스터와 PDF 기본 색상은 유지됩니다.</p>
          <div className="mt-4 text-left">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">확인 문구</label>
            <input value={resetPhrase} onChange={(e) => setResetPhrase(e.target.value)}
              placeholder="초기화 라고 입력"
              className={`${inputCls} text-center`} />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-6">
            <button onClick={() => { setResetOpen(false); setResetPhrase(""); }}
              className="h-11 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50">
              아니오
            </button>
            <button disabled={resetPhrase !== "초기화"} onClick={async () => {
              try {
                await resetAllData();
                setResetOpen(false);
                setResetPhrase("");
              } catch (error) {
                appAlert(error.message || "초기화에 실패했습니다.", { title: "초기화 오류", type: "warning" });
              }
            }}
              className="h-11 rounded-xl border border-rose-200 bg-rose-50 text-sm font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-40 disabled:hover:bg-rose-50">
              네
            </button>
          </div>
        </div>
      </Modal>

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => openQuick("inbound")} className="pastel-outline h-11 min-w-32 px-5 rounded-xl text-sm font-medium text-slate-700 transition inline-flex items-center justify-center gap-2 focus-visible:outline-none">
          <span className="metric-icon w-[18px] h-[18px] flex items-center justify-center shrink-0"><PackagePlus size={18} strokeWidth={2} /></span>
          <span className="leading-none">입고등록</span>
        </button>
        <button onClick={() => openQuick("outbound")} className="pastel-outline h-11 min-w-32 px-5 rounded-xl text-sm font-medium text-slate-700 transition inline-flex items-center justify-center gap-2 focus-visible:outline-none">
          <span className="metric-icon w-[18px] h-[18px] flex items-center justify-center shrink-0"><Truck size={18} strokeWidth={2} /></span>
          <span className="leading-none">출고등록</span>
        </button>
        <button onClick={() => openQuick("coil")} className="pastel-outline h-11 min-w-32 px-5 rounded-xl text-sm font-medium text-slate-700 transition inline-flex items-center justify-center gap-2 focus-visible:outline-none">
          <span className="metric-icon w-[18px] h-[18px] flex items-center justify-center shrink-0"><Layers3 size={18} strokeWidth={2} /></span>
          <span className="leading-none">코일관리</span>
        </button>
        <button onClick={() => openOutboundDetail(todo[0]?.id || "")} className={`pastel-outline h-11 min-w-[188px] px-4 rounded-xl text-sm font-medium text-slate-700 transition inline-flex items-center justify-center gap-2 focus-visible:outline-none ${todo.length > 0 ? "pending-active" : ""}`}>
          <span className="metric-icon w-[18px] h-[18px] flex items-center justify-center shrink-0"><Clock size={18} strokeWidth={2} /></span>
          <span className="leading-none">미완료 내역 <span className="ml-1.5 text-indigo-700">{todo.length}건</span></span>
          <span className="text-base leading-none text-slate-400">&gt;</span>
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 md:gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return <Card key={card.label} className="p-3.5 sm:p-5 md:p-6 min-h-[104px] md:min-h-[132px] flex items-center">
            <div className="w-full flex flex-col md:flex-row items-center justify-center md:justify-start gap-2.5 md:gap-4 text-center md:text-left">
              <div className="metric-icon w-11 h-11 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-rose-50/90 to-indigo-50/90 border border-white shadow-sm flex items-center justify-center shrink-0">
                <Icon size={26} className="md:hidden" strokeWidth={1.9} />
                <Icon size={31} className="hidden md:block" strokeWidth={1.9} />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm md:text-base font-semibold text-slate-600 leading-tight">{card.label}</div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 mt-1 leading-none">{card.value}<span className="text-xs sm:text-sm md:text-base font-semibold text-slate-400 ml-1">{card.unit}</span></div>
              </div>
            </div>
          </Card>;
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 items-start">
        {productStats.map((stat) => (
          <ProductStockCard key={stat.product} stat={stat} open={mobileProduct === stat.product}
            onToggle={() => setMobileProduct((current) => current === stat.product ? "" : stat.product)} />
        ))}
      </div>

    </div>
  );
}

/* =========================================================================
   제품구분→제조사 필터 + 색상 자동완성 (입고 폼에서 사용)
   ========================================================================= */
function ColorPicker({ product, maker, value, onPick, catalog = COLOR_MASTER }) {
  const [focus, setFocus] = useState(false);
  const opts = catalog.filter((c) => c.product === product && (!maker || c.maker === maker));
  const list = value ? opts.filter((o) => o.color.includes(value)) : opts;
  const uniq = [...new Map(list.map((o) => [`${o.color}-${o.code}-${o.thickness}`, o])).values()];
  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <span style={{ background: hexOf(value) }} className="w-8 h-8 rounded-lg border border-slate-300 shrink-0" />
        <input className={inputCls} value={value} placeholder="색상명 입력 시 자동 검색"
          onChange={(e) => onPick(e.target.value, null)} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)} />
      </div>
      {focus && uniq.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl">
          {uniq.map((o, i) => (
            <button key={i} type="button" onMouseDown={() => onPick(o.color, o.thickness, o.code)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-indigo-50 text-left">
              <span style={{ background: hexOf(o.color) }} className="w-5 h-5 rounded-md border border-slate-300" />
              <span className="font-medium">{o.color}</span>
              <span className="text-xs text-slate-400 ml-auto">{o.code || "코드없음"} · {o.thickness}T</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   입고관리
   ========================================================================= */
const blankInbound = () => ({
  inbound_date: todayStr(), product_type: "강판", manufacturer: "", color_name: "",
  color_code: "", thickness: "", coil_meter: 0, purchaser: "", memo: "", attachments: [],
});

function Inbound({ ctx, quickOpen, clearQuick }) {
  const { inbound, setInbound, coils, setCoils, baseStock, setBaseStock, stockHistory, setStockHistory, customColors, setCustomColors, discontinuedColors, setDiscontinuedColors, deletedBaseStockKeys } = ctx;
  const [q, setQ] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [purchaserFilter, setPurchaserFilter] = useState("전체");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blankInbound());
  const [editId, setEditId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [colorStockOpen, setColorStockOpen] = useState(false);
  const [stockDate, setStockDate] = useState("");
  const [todos, setTodos] = useStore("inboundTodos", []);
  const [todoInputOpen, setTodoInputOpen] = useState(false);
  const [todoText, setTodoText] = useState("");
  const [colorMenuOpen, setColorMenuOpen] = useState(false);

  useEffect(() => {
    if (!quickOpen) return;
    setForm(blankInbound());
    setEditId(null);
    setOpen(true);
    clearQuick();
  }, [quickOpen, clearQuick]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const registrationCatalog = [...new Map([...COLOR_MASTER, ...customColors].map((item) => [
    `${item.product}|${item.maker}|${item.code}|${item.color}|${item.thickness}`,
    item,
  ])).values()].filter((item) => {
    const key = `${item.product}|${item.maker}|${item.code}|${item.color}|${item.thickness}`;
    const isPdfDefault = COLOR_MASTER.some((master) =>
      `${master.product}|${master.maker}|${master.code}|${master.color}|${master.thickness}` === key
    );
    return isPdfDefault || (Object.prototype.hasOwnProperty.call(baseStock, key) && !deletedBaseStockKeys.includes(key));
  });
  const productOptions = [...new Set(registrationCatalog.map((item) => item.product).filter(Boolean))];
  const stockKey = (item) => `${item.product}|${item.maker}|${item.code}|${item.color}|${item.thickness}`;
  const colorCatalog = registrationCatalog
    .filter((item) => item.product === form.product_type && !discontinuedColors.includes(stockKey(item)));
  const colorMatches = form.color_name.trim()
    ? colorCatalog.filter((item) => item.color.includes(form.color_name.trim())).slice(0, 12)
    : colorCatalog.slice(0, 12);
  const selectedColor = colorCatalog.find((item) =>
    item.color === form.color_name && item.maker === form.manufacturer &&
    String(item.code || "") === String(form.color_code || "") && String(item.thickness) === String(form.thickness)
  );
  const purchaserOptions = [...new Set(inbound.map((r) => r.purchaser).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "ko"));

  const onProduct = (p) => {
    setForm((f) => ({ ...f, product_type: p, manufacturer: "", color_name: "", color_code: "", thickness: "" }));
    setColorMenuOpen(false);
  };
  const chooseColor = (item) => {
    setForm((current) => ({
      ...current,
      color_name: item.color,
      manufacturer: item.maker,
      color_code: item.code || "",
      thickness: item.thickness,
    }));
    setColorMenuOpen(false);
  };
  const attachFiles = (files) => {
    [...files].forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setForm((current) => ({
        ...current,
        attachments: [...(current.attachments || []), {
          id: uid(), name: file.name, type: file.type, size: file.size, data: reader.result,
        }],
      }));
      reader.readAsDataURL(file);
    });
  };
  const removeAttachment = (id) => setForm((current) => ({
    ...current,
    attachments: (current.attachments || []).filter((file) => file.id !== id),
  }));

  const submit = () => {
    const meter = Number(form.coil_meter) || 0;
    if (!form.inbound_date || !form.product_type || !form.manufacturer || !form.color_name || !form.thickness) {
      appAlert("*필수입력을 작성해주세요", { title: "필수입력 안내", type: "warning" });
      return;
    }
    if (editId) {
      setInbound((l) => l.map((r) => r.id === editId ? { ...r, ...form, coil_meter: meter, updated_at: todayStr() } : r));
      const original = inbound.find((r) => r.id === editId);
      if (original) {
        setCoils((l) => l.map((c) => c.id === original.coil_id || c.coil_number === original.coil_number ? {
          ...c, product_type: form.product_type, manufacturer: form.manufacturer, color_name: form.color_name,
          color_code: form.color_code, thickness: form.thickness, purchaser: form.purchaser, memo: form.memo, inbound_date: form.inbound_date,
          initial_meter: meter, current_meter: Math.max(0, meter - (c.total_outbound_meter || 0)), updated_at: todayStr(),
        } : c));
      }
    } else {
      const coilNo = makeCoilNo(form.inbound_date, form.product_type, form.manufacturer, form.color_name, form.thickness);
      const coilId = uid();
      setInbound((l) => [{ id: uid(), coil_id: coilId, coil_number: coilNo, ...form, coil_meter: meter, created_at: todayStr(), updated_at: todayStr() }, ...l]);
      setCoils((l) => [{
        id: coilId, coil_number: coilNo, product_type: form.product_type, manufacturer: form.manufacturer,
        color_name: form.color_name, color_code: form.color_code, thickness: form.thickness, purchaser: form.purchaser,
        initial_meter: meter, current_meter: meter, total_outbound_meter: 0, current_roll_count: 1,
        status: "정상", memo: form.memo, inbound_date: form.inbound_date, created_at: todayStr(), updated_at: todayStr(),
      }, ...l]);
    }
    setOpen(false); setForm(blankInbound()); setEditId(null);
  };
  const startEdit = (r) => { setForm({ ...r, attachments: r.attachments || [] }); setEditId(r.id); setOpen(true); };
  const remove = async (id) => {
    if (!await appConfirm("정말 삭제하시겠습니까?", { title: "입고 내역 삭제", type: "danger" })) return;
    const target = inbound.find((r) => r.id === id);
    setInbound((l) => l.filter((r) => r.id !== id));
    if (target) setCoils((l) => l.filter((c) => c.id !== target.coil_id && c.coil_number !== target.coil_number));
    if (detail?.id === id) setDetail(null);
  };

  const rows = inbound
    .filter((r) => purchaserFilter === "전체" || r.purchaser === purchaserFilter)
    .filter((r) => inRange(r.inbound_date, from, to))
    .filter((r) => [r.coil_number, r.manufacturer, r.color_name, r.purchaser].join(" ").toLowerCase().includes(searchQ.toLowerCase()));
  const groupedRows = [...new Set([...productOptions, ...rows.map((row) => row.product_type)])].map((product) => ({
    product,
    rows: rows.filter((r) => r.product_type === product),
  }));
  const summaryGroups = groupedRows.filter((group) => group.rows.length > 0);
  const resetInboundFilters = () => {
    setPurchaserFilter("전체");
    setFrom("");
    setTo("");
    setQ("");
    setSearchQ("");
  };
  const stockSource = stockDate ? stockHistory.filter((item) => item.registered_at === stockDate) : stockHistory;
  const latestStockHistory = Object.values(stockSource.reduce((latest, item) => {
    if (!latest[item.key] || item.registered_at > latest[item.key].registered_at) latest[item.key] = item;
    return latest;
  }, {}))
    .filter((item) => !discontinuedColors.includes(item.key))
    .sort((a, b) =>
      b.registered_at.localeCompare(a.registered_at) ||
      a.product.localeCompare(b.product, "ko") ||
      a.maker.localeCompare(b.maker, "ko") ||
      a.color.localeCompare(b.color, "ko") ||
      Number(a.thickness) - Number(b.thickness)
    );

  const exportXlsx = () => downloadXlsx(rows.map((r) => ({
    입고일: r.inbound_date, 코일번호: r.coil_number, 제품구분: r.product_type, 제조사: r.manufacturer,
    색상명: r.color_name, 두께: r.thickness, 코일M: r.coil_meter, 매입처: r.purchaser, 비고: r.memo,
  })), "입고내역", "입고내역.xlsx");
  const exportStockXlsx = () => downloadXlsx(latestStockHistory.map((item) => ({
    등록일: item.registered_at, 구분: item.product, 제조사: item.maker, 색상명: item.color,
    코드: item.code, 두께: item.thickness, 재고M: item.meter,
  })), "코일재고", "코일재고내역.xlsx");
  const addTodo = () => {
    const text = todoText.trim();
    if (!text) return;
    setTodos((current) => [...current, { id: uid(), text }]);
    setTodoText("");
    setTodoInputOpen(false);
  };
  const completeTodo = async (id) => {
    if (!await appConfirm("체크하면 입력한 할 일이 삭제됩니다. 삭제하시겠습니까?", { title: "할 일 삭제", type: "danger" })) return;
    setTodos((current) => current.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-5">
      <div className="h-[108px] flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">입고관리</h2>
          <div className="flex flex-wrap items-center gap-x-2 text-sm mt-0.5">
            <p className="text-slate-500">입고된 매입처를 기록하고 확인합니다.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExcelBtn onClick={exportXlsx} />
          <button onClick={() => { setForm(blankInbound()); setEditId(null); setOpen(true); }} className="h-10 min-w-[108px] px-4 rounded-xl bg-indigo-600 text-white text-sm font-medium inline-flex items-center justify-center gap-1.5 hover:bg-indigo-700 no-print"><Plus size={16} />입고등록</button>
        </div>
      </div>

      <Card className="hidden p-4 sm:p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3"><ClipboardCheck size={18} className="text-indigo-500" />주의사항 · 할 일</div>
        <div className="space-y-2">
          {todos.map((todo) => (
            <label key={todo.id} className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" onChange={() => completeTodo(todo.id)} className="w-4 h-4 accent-indigo-500" />
              {todo.text}
            </label>
          ))}
          <div className="flex items-center gap-2">
            <button onClick={() => setTodoInputOpen(true)} aria-label="할 일 추가" className="w-4 h-4 rounded border border-slate-300 bg-white hover:border-indigo-400 shrink-0" />
            {todoInputOpen && <input autoFocus value={todoText} onChange={(e) => setTodoText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTodo()} onBlur={() => !todoText && setTodoInputOpen(false)} className="flex-1 border-b border-indigo-200 bg-transparent px-1 py-1 text-sm focus:outline-none focus:border-indigo-500" placeholder="할 일을 입력하고 Enter를 누르세요" />}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
        <section className="hidden space-y-4">
          <div className="min-h-[45px] flex items-center justify-between gap-3 border-b border-slate-300 pb-3">
            <h3 className="text-lg font-extrabold text-slate-800">코일목록</h3>
            <div className="flex gap-2">
              <ExcelBtn onClick={exportStockXlsx} />
              <button onClick={() => setColorStockOpen(true)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium inline-flex items-center gap-1.5 hover:bg-indigo-700"><Plus size={16} />코일등록</button>
            </div>
          </div>
          <button onClick={() => setColorStockOpen(true)} className="w-full text-left rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm hover:border-indigo-300 transition flex items-center gap-3">
            <div className="metric-icon w-10 h-10 rounded-xl bg-gradient-to-br from-rose-50 to-indigo-50 flex items-center justify-center"><Palette size={22} /></div>
            <div>
              <div className="font-bold text-slate-800">코일 재고표</div>
              <div className="text-xs text-slate-400 mt-0.5">코일 색상별 재고를 확인하고 수정·등록합니다.</div>
            </div>
            <ChevronRight size={18} className="ml-auto text-slate-400" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">등록일</span>
            <input type="date" value={stockDate} onChange={(e) => setStockDate(e.target.value)} className={`${inputCls} w-auto text-center`} />
            {stockDate && <button onClick={() => setStockDate("")} className="text-xs text-slate-400 hover:text-slate-600">전체</button>}
          </div>
          <div className="border-t border-slate-300" />
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h4 className="font-bold text-slate-800">코일 재고내역</h4>
              <span className="text-xs text-slate-400">{latestStockHistory.length}건</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs">
                  <tr>{["등록일", "구분", "제조사", "색상 / 규격", "재고 M"].map((h) => <th key={h} className="px-3 py-2.5 text-left font-medium whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {latestStockHistory.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2.5 whitespace-nowrap">{item.registered_at}</td>
                      <td className="px-3 py-2.5">{item.product}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{item.maker}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap"><Swatch name={item.color} /> <span className="text-slate-400 ml-1">{item.code || "코드없음"} · {item.thickness}T</span></td>
                      <td className="px-3 py-2.5 font-bold text-indigo-700 whitespace-nowrap">{fmt(item.meter)} M</td>
                    </tr>
                  ))}
                  {latestStockHistory.length === 0 && <tr><td colSpan={5} className="px-3 py-7 text-center text-slate-400">해당 등록일의 코일 재고가 없습니다.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        <section className="space-y-4 xl:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(240px,300px)_170px_18px_170px_minmax(180px,1fr)_72px_88px] gap-2 items-center no-print">
            <select value={purchaserFilter} onChange={(e) => setPurchaserFilter(e.target.value)} className={inputCls}>
              <option>전체</option>
              {purchaserOptions.map((purchaser) => <option key={purchaser} value={purchaser}>{purchaser}</option>)}
            </select>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${inputCls} text-center`} />
            <span className="hidden lg:block text-center text-slate-400">~</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${inputCls} text-center`} />
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setSearchQ(q)}
                placeholder="제조사 색상 검색" className={`${inputCls} pl-9`} />
            </div>
            <button type="button" onClick={() => setSearchQ(q)}
              className="h-[42px] rounded-xl border border-indigo-200 bg-white text-sm font-bold text-indigo-600 hover:bg-indigo-50">조회</button>
            <button type="button" onClick={resetInboundFilters}
              className="h-[42px] rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-500 hover:border-rose-200 hover:text-rose-500 inline-flex items-center justify-center gap-1.5">
              <RotateCcw size={14} />초기화
            </button>
          </div>
          {groupedRows.map((group) => (
            <Card key={group.product} className="overflow-hidden print-card">
              <div className="px-4 py-3 border-b border-slate-200">
                <h4 className="font-bold text-slate-800">{group.product} <span className="ml-1 text-xs font-normal text-slate-400">{group.rows.length}건</span></h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] table-fixed text-xs sm:text-sm">
                  <colgroup>
                    <col className="w-[11%]" />
                    <col className="w-[8%]" />
                    <col className="w-[10%]" />
                    <col className="w-[15%]" />
                    <col className="w-[28%]" />
                    <col className="w-[20%]" />
                    <col className="w-[8%]" />
                  </colgroup>
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>{["입고일", "구분", "제조사", "색상 / 두께", "매입처", "비고", ""].map((h) => <th key={h} className={`px-3 py-2.5 font-semibold whitespace-nowrap ${h === "비고" ? "text-left" : "text-center"}`}>{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                  {group.rows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">{r.inbound_date}</td>
                      <td className="px-3 py-2.5 text-center">{r.product_type}</td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">{r.manufacturer}</td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap"><span className="font-medium text-slate-700">{r.color_name}</span> <span className="text-slate-400 text-xs ml-1">{r.thickness}T</span></td>
                      <td className="px-3 py-2.5 text-center leading-relaxed break-words" title={r.purchaser}>{r.purchaser || "-"}</td>
                      <td className="px-3 py-2.5 text-left text-slate-500 leading-relaxed break-words" title={r.memo}>{r.memo || "-"}</td>
                      <td className="px-3 py-2.5 no-print">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => startEdit(r)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Pencil size={15} /></button>
                          <button onClick={() => remove(r.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500"><Trash2 size={15} /></button>
                        </div>
                      </td>
                  </tr>
                  ))}
                  {group.rows.length === 0 && <tr><td colSpan={7} className="px-3 py-5 text-center text-xs text-slate-400">등록된 {group.product} 입고 내역이 없습니다.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
          {summaryGroups.length > 0 && (
          <div className="mx-auto max-w-full border-t border-slate-200 px-2 pt-3">
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-slate-500">
              {summaryGroups.map((group) => {
                const purchaserCount = new Set(group.rows.map((row) => row.purchaser).filter(Boolean)).size;
                return (
                  <span key={group.product}>
                    <b className="font-semibold text-slate-700">{group.product}</b>
                    <span className="ml-1.5">{group.rows.length}/{purchaserCount || "-"}</span>
                  </span>
                );
              })}
            </div>
          </div>
          )}
        </section>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={`코일 상세 · ${detail?.coil_number || ""}`}>
        {detail && (
          <>
            <DetailPanel rows={[
              ["제품 구분", detail.product_type], ["제조사", detail.manufacturer], ["매입처", detail.purchaser || "-"],
              ["입고일", detail.inbound_date], ["색상", detail.color_name], ["두께", detail.thickness + "T"],
              ["코일 M", fmt(detail.coil_meter) + " M"], ["비고", detail.memo || "-"],
            ]} />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { setDetail(null); startEdit(detail); }} className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-semibold inline-flex items-center gap-1"><Pencil size={14} />수정</button>
              <button onClick={() => remove(detail.id)} className="px-4 py-2 rounded-xl bg-rose-50 text-rose-600 text-sm font-semibold inline-flex items-center gap-1"><Trash2 size={14} />삭제</button>
            </div>
          </>
        )}
      </Modal>

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? "입고 수정" : "입고 등록"} wide="medium">
        <div className="space-y-4 min-h-[430px] sm:min-h-[480px]">
          <div className="grid sm:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] gap-3">
            <Field label="입고일" required><input type="date" className={`${inputCls} text-center`} value={form.inbound_date} onChange={(e) => set("inbound_date", e.target.value)} /></Field>
            <Field label="매입처"><input className={inputCls} value={form.purchaser} onChange={(e) => set("purchaser", e.target.value)} placeholder="예: 동국제강" /></Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] gap-3">
            <Field label="제품 구분" required>
              <select className={`${inputCls} h-[42px]`} value={form.product_type} onChange={(e) => onProduct(e.target.value)}>
                {productOptions.map((product) => <option key={product}>{product}</option>)}
              </select>
            </Field>
            <div className="relative min-w-0">
              <Field label="코일 색상" required>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg border border-slate-300 shrink-0" style={{ background: hexOf(form.color_name) }} />
                  <input className={inputCls} value={form.color_name}
                    onFocus={() => setColorMenuOpen(true)}
                    onChange={(e) => {
                      setForm((current) => ({
                        ...current, color_name: e.target.value, manufacturer: "",
                        color_code: "", thickness: "",
                      }));
                      setColorMenuOpen(true);
                    }}
                    placeholder="등록된 코일 색상 검색" />
                </div>
              </Field>
              {colorMenuOpen && (
                <div className="absolute z-30 left-10 right-0 top-full mt-1 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                  {colorMatches.map((item) => (
                    <button type="button" key={stockKey(item)} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseColor(item)}
                      className="w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-indigo-50">
                      <span className="w-6 h-6 rounded-lg border border-slate-200 shrink-0" style={{ background: hexOf(item.color) }} />
                      <span className="font-medium text-sm">{item.color}</span>
                      <span className="ml-auto text-xs text-slate-400">{item.maker} · {item.code || "코드없음"} · {item.thickness}T</span>
                    </button>
                  ))}
                  {colorMatches.length === 0 && <div className="px-3 py-6 text-center text-sm text-slate-400">일치하는 등록 색상이 없습니다.</div>}
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <Field label="선택 코일 정보">
                <div className="min-h-[42px] px-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center text-sm text-slate-600">
                  {selectedColor ? `${selectedColor.maker} · ${selectedColor.code || "코드없음"} · ${selectedColor.thickness}T` : "코일 색상을 선택하면 자동 표시됩니다."}
                </div>
              </Field>
            </div>
          </div>
          <Field label="비고">
            <AutoGrowTextarea className={inputCls} value={form.memo} onChange={(e) => set("memo", e.target.value)} placeholder="비고를 입력하세요" />
          </Field>
          <Field label="첨부파일 / 이미지">
            <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); attachFiles(e.dataTransfer.files); }}
              className="min-h-28 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/40 transition">
              <Download size={22} className="text-indigo-400" />
              <span className="mt-2 text-sm font-medium text-slate-600">파일을 끌어놓거나 클릭해 첨부하세요</span>
              <span className="mt-1 text-xs text-slate-400">이미지와 일반 파일을 등록할 수 있습니다.</span>
              <input type="file" multiple className="hidden" onChange={(e) => { attachFiles(e.target.files); e.target.value = ""; }} />
            </label>
          </Field>
          {(form.attachments || []).length > 0 && <div className="space-y-2">
            {form.attachments.map((file) => (
              <div key={file.id} className="min-h-10 px-3 py-2 rounded-xl border border-slate-200 bg-white flex items-center gap-2 text-sm">
                <span className="min-w-0 break-all text-slate-600">{file.name}</span>
                <span className="ml-auto shrink-0 text-xs text-slate-400">{Math.max(1, Math.round(file.size / 1024))} KB</span>
                <button type="button" onClick={() => removeAttachment(file.id)} className="p-1 shrink-0 text-slate-400 hover:text-rose-500"><X size={16} /></button>
              </div>
            ))}
          </div>}
        </div>
        <div className="mobile-safe-actions z-10 mt-5 -mx-1 px-1 pt-2 grid grid-cols-2 sm:flex sm:justify-end gap-2">
          <button onClick={() => setOpen(false)} className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600">취소</button>
          <button onClick={submit} className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">{editId ? "저장" : "등록"}</button>
        </div>
      </Modal>

      <ColorStockModal open={colorStockOpen} onClose={() => setColorStockOpen(false)} values={baseStock} setValues={setBaseStock} history={stockHistory} setHistory={setStockHistory} customColors={customColors} setCustomColors={setCustomColors} discontinued={discontinuedColors} setDiscontinued={setDiscontinuedColors} />
    </div>
  );
}

function CoilManagement({ ctx }) {
  const {
    baseStock, setBaseStock, stockHistory, setStockHistory,
    customColors, setCustomColors, discontinuedColors, setDiscontinuedColors,
    zoneStock, setZoneStock,
    baseStockDates, setBaseStockDates,
    deletedBaseStockKeys, setDeletedBaseStockKeys,
    reservations,
  } = ctx;
  const emptyFilters = { product: "전체", maker: "전체", thickness: "전체", color: "", soldOut: false };
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [searched, setSearched] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addCoilOpen, setAddCoilOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTab, setHistoryTab] = useState("base");
  const [baseInfoOpen, setBaseInfoOpen] = useState(false);
  const [baseEditing, setBaseEditing] = useState(false);
  const [selectedBaseKeys, setSelectedBaseKeys] = useState([]);
  const [openBaseEditorAfterAdd, setOpenBaseEditorAfterAdd] = useState(false);
  const [baseSearch, setBaseSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [baseDraft, setBaseDraft] = useState({});
  const [historyDraft, setHistoryDraft] = useState([]);
  const [rankingProduct, setRankingProduct] = useState("강판");
  const [newCoil, setNewCoil] = useState({ product: "강판", maker: "동국", color: "", code: "", thickness: "0.45" });
  const [zoneDraft, setZoneDraft] = useState(zoneStock);
  const fullCatalog = [...new Map([...COLOR_MASTER, ...customColors].map((item) => [
    `${item.product}|${item.maker}|${item.code}|${item.color}|${item.thickness}`,
    item,
  ])).values()];
  const catalog = fullCatalog.filter((item) => {
    const key = `${item.product}|${item.maker}|${item.code}|${item.color}|${item.thickness}`;
    const isPdfDefault = COLOR_MASTER.some((master) =>
      `${master.product}|${master.maker}|${master.code}|${master.color}|${master.thickness}` === key
    );
    return isPdfDefault || !deletedBaseStockKeys.includes(key);
  });
  const catalogProducts = [...new Set(catalog.map((item) => item.product).filter(Boolean))];
  const catalogMakers = [...new Set(catalog
    .filter((item) => !newCoil.product || item.product === newCoil.product)
    .map((item) => item.maker)
    .filter(Boolean))];
  const keyOf = (c) => `${c.product}|${c.maker}|${c.code}|${c.color}|${c.thickness}`;
  const latestByKey = stockHistory.reduce((latest, item) => {
    if (!latest[item.key] || item.registered_at > latest[item.key].registered_at) latest[item.key] = item;
    return latest;
  }, {});
  const allRows = catalog
    .map((item) => {
      const key = keyOf(item);
      const registered = latestByKey[key];
      return {
        id: registered?.id || key,
        key,
        registered_at: registered?.registered_at || "",
        product: item.product,
        maker: item.maker,
        color: item.color,
        code: item.code,
        thickness: item.thickness,
        meter: registered?.meter ?? baseStock[key] ?? 0,
        baseDate: baseStockDates[key] || "",
        soldOut: discontinuedColors.includes(key),
      };
    })
    .sort((a, b) =>
      a.product.localeCompare(b.product, "ko") ||
      a.maker.localeCompare(b.maker, "ko") ||
      a.color.localeCompare(b.color, "ko") ||
      Number(a.thickness) - Number(b.thickness)
    );
  const searchedBaseRows = allRows.filter((item) => {
    const keyword = baseSearch.trim().toLocaleLowerCase();
    if (!keyword) return true;
    return [item.product, item.maker, item.color, item.code, item.thickness, `${item.thickness}T`]
      .join(" ")
      .toLocaleLowerCase()
      .includes(keyword);
  });
  const searchedHistoryRows = historyDraft.filter((item) => {
    const keyword = historySearch.trim().toLocaleLowerCase();
    if (!keyword) return true;
    return [
      item.registered_at,
      item.product,
      item.maker,
      item.color,
      item.code,
      item.thickness,
      `${item.thickness}T`,
    ].join(" ").toLocaleLowerCase().includes(keyword);
  });
  const rows = allRows.filter((item) => !item.soldOut);
  const filteredRows = allRows.filter((item) =>
    item.soldOut === appliedFilters.soldOut &&
    (appliedFilters.product === "전체" || item.product === appliedFilters.product) &&
    (appliedFilters.maker === "전체" || item.maker === appliedFilters.maker) &&
    (appliedFilters.thickness === "전체" || item.thickness === appliedFilters.thickness) &&
    (!appliedFilters.color.trim() || item.color.toLocaleLowerCase().includes(appliedFilters.color.trim().toLocaleLowerCase()))
  );
  const colorSuggestions = filters.color.trim()
    ? [...new Set(allRows
      .filter((item) => item.soldOut === filters.soldOut)
      .map((item) => item.color)
      .filter((color) => color.includes(filters.color.trim())))]
      .sort((a, b) => a.localeCompare(b, "ko"))
      .slice(0, 8)
    : [];
  const thicknessOptions = ["전체", ...[...new Set(catalog.map((item) => item.thickness))]
    .sort((a, b) => Number(a) - Number(b))];
  const currentDate = todayStr();
  const rankingRows = allRows
    .filter((item) => item.product === rankingProduct && !item.soldOut)
    .map((item) => {
      const previous = stockHistory
        .filter((record) => record.key === item.key && record.registered_at < currentDate)
        .sort((a, b) =>
          String(b.registered_at).localeCompare(String(a.registered_at)) ||
          String(b.created_at || "").localeCompare(String(a.created_at || ""))
        )[0];
      const previousMeter = previous ? Number(previous.meter) || 0 : Number(item.meter) || 0;
      const currentMeter = Number(item.meter) || 0;
      const change = currentMeter - previousMeter;
      const changeRate = previousMeter === 0 ? (currentMeter > 0 ? 100 : 0) : Math.abs(change / previousMeter * 100);
      return { ...item, previousMeter, currentMeter, change, changeRate };
    })
    .filter((item) => item.previousMeter !== 0 || item.currentMeter !== 0)
    .sort((a, b) => Number(b.meter) - Number(a.meter) || a.color.localeCompare(b.color, "ko"))
    .slice(0, 5);
  const displayDate = (date) => {
    return date || "-";
  };
  useEffect(() => {
    setZoneDraft((current) => {
      const next = { ...current };
      catalog.forEach((item) => {
        const key = keyOf(item);
        if (!next[key]) next[key] = { A: baseStock[key] || "", B: "", C: "" };
      });
      return next;
    });
  }, [baseStock, zoneStock, customColors]);
  useEffect(() => {
    if (historyOpen) {
      setHistoryTab("base");
      setBaseInfoOpen(true);
      const validHistory = stockHistory.filter((item) =>
        item.created_at && (!baseStockDates[item.key] || item.registered_at >= baseStockDates[item.key])
      );
      setHistoryDraft(validHistory.map((item) => ({
        ...item,
        zones: { A: "", B: "", C: "", ...(item.zones || {}) },
      })));
      const nextBaseDraft = {};
      catalog.forEach((item) => {
        const key = keyOf(item);
        nextBaseDraft[key] = {
          zones: { A: baseStock[key] || "", B: "", C: "", ...(zoneStock[key] || {}) },
          date: baseStockDates[key] || todayStr(),
        };
      });
      setBaseDraft(nextBaseDraft);
      setBaseEditing(openBaseEditorAfterAdd);
    }
  }, [historyOpen, stockHistory, baseStock, zoneStock, baseStockDates, customColors, openBaseEditorAfterAdd]);
  useEffect(() => {
    const timer = setInterval(() => setRankingProduct((current) => current === "강판" ? "징크" : "강판"), 5000);
    return () => clearInterval(timer);
  }, []);
  const setZoneValue = (key, zone, value) => {
    setZoneDraft((current) => ({
      ...current,
      [key]: { A: "", B: "", C: "", ...(current[key] || {}), [zone]: value },
    }));
  };
  const registerStock = (item) => {
    const zones = { A: "", B: "", C: "", ...(zoneDraft[item.key] || {}) };
    const meter = ["A", "B", "C"].reduce((sum, zone) => sum + (Number(zones[zone]) || 0), 0);
    setZoneStock((current) => ({ ...current, [item.key]: zones }));
    setBaseStock((current) => ({ ...current, [item.key]: meter }));
    setStockHistory((current) => [{
      id: `${item.key}-${Date.now()}`,
      key: item.key,
      registered_at: todayStr(),
      created_at: new Date().toISOString(),
      product: item.product,
      maker: item.maker,
      color: item.color,
      code: item.code,
      thickness: item.thickness,
      meter,
      zones,
    }, ...current]);
    appAlert(`${item.color} 재고 ${fmt(meter)} M가 등록되었습니다.`, { title: "재고 등록 완료", type: "success" });
  };
  const numericValue = (value) => value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
  const setBaseDraftValue = (key, field, value) => {
    setBaseDraft((current) => ({
      ...current,
      [key]: field === "date"
        ? { ...(current[key] || {}), date: value }
        : {
          ...(current[key] || {}),
          zones: { A: "", B: "", C: "", ...(current[key]?.zones || {}), [field]: numericValue(value) },
        },
    }));
  };
  const saveSelectedBaseStocks = async () => {
    if (selectedBaseKeys.length === 0) {
      appAlert("수정할 항목을 선택해주세요.", { title: "선택 안내", type: "warning" });
      return;
    }
    if (!await appConfirm(`선택된 ${selectedBaseKeys.length}건의 재고를 수정하시겠습니까?`, {
      title: "기초재고 수정 확인",
    })) return;

    const selectedItems = allRows.filter((item) => selectedBaseKeys.includes(item.key));
    const now = Date.now();
    const records = selectedItems.map((item, index) => {
      const draft = baseDraft[item.key] || {};
      const zones = { A: "", B: "", C: "", ...(draft.zones || {}) };
      const meter = ["A", "B", "C"].reduce((sum, zone) => sum + (Number(zones[zone]) || 0), 0);
      return {
        id: `${item.key}-${now + index}`,
        key: item.key,
        registered_at: draft.date || todayStr(),
        created_at: new Date(now + index).toISOString(),
        product: item.product,
        maker: item.maker,
        color: item.color,
        code: item.code,
        thickness: item.thickness,
        meter,
        zones,
      };
    });
    const recordsByKey = Object.fromEntries(records.map((record) => [record.key, record]));

    setZoneStock((current) => ({
      ...current,
      ...Object.fromEntries(records.map((record) => [record.key, record.zones])),
    }));
    setBaseStock((current) => ({
      ...current,
      ...Object.fromEntries(records.map((record) => [record.key, record.meter])),
    }));
    setBaseStockDates((current) => ({
      ...current,
      ...Object.fromEntries(records.map((record) => [record.key, record.registered_at])),
    }));
    setZoneDraft((current) => ({
      ...current,
      ...Object.fromEntries(records.map((record) => [record.key, record.zones])),
    }));
    setStockHistory((current) => [...records].reverse().concat(current));
    setHistoryDraft((current) => [...records].reverse().concat(current));
    setBaseDraft(Object.fromEntries(allRows.map((item) => {
      const saved = recordsByKey[item.key];
      return [item.key, saved ? {
        zones: saved.zones,
        date: saved.registered_at,
      } : {
        zones: { A: baseStock[item.key] || "", B: "", C: "", ...(zoneStock[item.key] || {}) },
        date: baseStockDates[item.key] || todayStr(),
      }];
    })));
    setSelectedBaseKeys([]);
    setBaseEditing(false);
    appAlert(`선택된 ${records.length}건의 기초재고가 수정되었습니다.`, { title: "기초재고 수정 완료", type: "success" });
  };
  const deleteSelectedBaseStocks = async () => {
    const deletable = selectedBaseKeys.filter((key) => customColors.some((color) => keyOf(color) === key));
    if (deletable.length === 0) {
      appAlert("선택한 항목 중 삭제 가능한 추가 코일이 없습니다.", { title: "선택 삭제 안내", type: "warning" });
      return;
    }
    if (!await appConfirm(`선택한 추가 코일 ${deletable.length}개를 삭제하시겠습니까?`, {
      title: "기초재고 선택 삭제",
      type: "danger",
      submessage: "PDF 기본 색상은 영구 유지되며 선택삭제 대상에서 제외됩니다.",
    })) return;
    const removeKeys = (current) => Object.fromEntries(Object.entries(current).filter(([key]) => !deletable.includes(key)));
    setBaseStock(removeKeys);
    setZoneStock(removeKeys);
    setBaseStockDates(removeKeys);
    setBaseDraft(removeKeys);
    setZoneDraft(removeKeys);
    setStockHistory((current) => current.filter((record) => !deletable.includes(record.key)));
    setHistoryDraft((current) => current.filter((record) => !deletable.includes(record.key)));
    setCustomColors((current) => current.filter((color) => !deletable.includes(keyOf(color))));
    setDeletedBaseStockKeys((current) => [...new Set([...current, ...deletable])]);
    setSelectedBaseKeys([]);
  };
  const deleteBaseStock = async (item) => {
    const isCustomColor = customColors.some((color) => keyOf(color) === item.key);
    if (!isCustomColor) {
      appAlert("PDF 기본 색상은 삭제할 수 없습니다.", {
        title: "기본 색상 보호",
        type: "warning",
        submessage: "기초재고 숫자는 수정할 수 있으며 전체 초기화 후에도 기본 목록은 유지됩니다.",
      });
      return;
    }
    const confirmed = await appConfirm(
      `${item.color} 기초재고를 삭제하시겠습니까?`,
      {
        title: "기초재고 삭제",
        type: "danger",
        submessage: "해당 코일 색상은 기초재고와 입고·출고 검색 목록에서 완전히 제외됩니다.",
      }
    );
    if (!confirmed) return;
    const removeKey = (current) => {
      const next = { ...current };
      delete next[item.key];
      return next;
    };
    setBaseStock(removeKey);
    setZoneStock(removeKey);
    setBaseStockDates(removeKey);
    setBaseDraft(removeKey);
    setZoneDraft(removeKey);
    setStockHistory((current) => current.filter((record) => record.key !== item.key));
    setHistoryDraft((current) => current.filter((record) => record.key !== item.key));
    setDeletedBaseStockKeys((current) => current.includes(item.key) ? current : [...current, item.key]);
  };
  const toggleDiscontinue = async (item) => {
    const message = item.soldOut
      ? `${item.color} 코일의 품절 상태를 해제하시겠습니까?`
      : `${item.color} 코일을 품절 처리하시겠습니까?`;
    if (!await appConfirm(message, { title: item.soldOut ? "품절 해제 확인" : "품절 처리 확인", type: "warning" })) return;
    setDiscontinuedColors((current) => item.soldOut
      ? current.filter((key) => key !== item.key)
      : current.includes(item.key) ? current : [...current, item.key]);
  };
  const resetSearch = () => {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setSearched(false);
    setShowSuggestions(false);
  };
  const addCoil = () => {
    if (!newCoil.product.trim() || !newCoil.maker.trim() || !newCoil.color.trim() || !newCoil.thickness) {
      appAlert("구분, 제조사, 색상명, 두께를 모두 입력해주세요.", { title: "필수입력 안내", type: "warning" });
      return;
    }
    const item = {
      ...newCoil,
      product: newCoil.product.trim(),
      maker: newCoil.maker.trim(),
      color: newCoil.color.trim(),
      code: newCoil.code.trim(),
    };
    const key = keyOf(item);
    if (fullCatalog.some((color) => keyOf(color) === key)) {
      if (deletedBaseStockKeys.includes(key)) {
        setDeletedBaseStockKeys((current) => current.filter((deletedKey) => deletedKey !== key));
        setNewCoil({ product: "강판", maker: "동국", color: "", code: "", thickness: "0.45" });
        setAddCoilOpen(false);
        setOpenBaseEditorAfterAdd(true);
        setHistoryOpen(true);
        appAlert(`${item.color} 색상이 다시 추가되었습니다.`, {
          title: "코일 복원 완료",
          type: "success",
          submessage: "기초재고를 설정해주세요.",
        });
        return;
      }
      appAlert("이미 등록된 코일 색상과 규격입니다.", { title: "중복 등록 안내", type: "warning" });
      return;
    }
    setDeletedBaseStockKeys((current) => current.filter((deletedKey) => deletedKey !== key));
    setCustomColors((current) => [...current, item]);
    setNewCoil({ product: "강판", maker: "동국", color: "", code: "", thickness: "0.45" });
    setAddCoilOpen(false);
    setOpenBaseEditorAfterAdd(true);
    setHistoryOpen(true);
    appAlert(`${item.color} 색상이 추가되었습니다.`, {
      title: "코일 추가 완료",
      type: "success",
      submessage: "기초재고를 설정해주세요.",
    });
  };
  const exportXlsx = () => downloadXlsx(rows.map((item) => ({
    등록일: item.registered_at, 구분: item.product, 제조사: item.maker, 색상명: item.color,
    코드: item.code, 두께: item.thickness, 재고M: item.meter,
  })), "코일재고", "코일재고내역.xlsx");

  return (
    <div className="space-y-5">
      <div className="h-[108px] flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">코일관리</h2>
          <p className="text-slate-500 text-sm mt-0.5">등록된 코일 색상별 재고와 등록일을 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <ExcelBtn onClick={exportXlsx} />
        </div>
      </div>
      <div className="grid lg:grid-cols-[310px_minmax(0,1fr)] gap-5 items-start">
        <div className="space-y-3 lg:sticky lg:top-24">
          <Card className="p-5">
            <h3 className="text-xl font-extrabold text-slate-900 mb-5">카테고리</h3>
            <div className="space-y-4">
            <label className="block">
              <span className="flex items-center justify-between gap-3 text-sm font-bold text-slate-600 mb-1.5">
                <span>구분</span>
                <span className="inline-flex items-center gap-2 font-medium">
                  품절
                  <button type="button" role="switch" aria-checked={filters.soldOut}
                    onClick={() => setFilters({ ...filters, soldOut: !filters.soldOut })}
                    className={`relative w-10 h-6 rounded-full transition ${filters.soldOut ? "bg-indigo-500" : "bg-slate-200"}`}>
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition ${filters.soldOut ? "left-5" : "left-1"}`} />
                  </button>
                </span>
              </span>
              <select value={filters.product} onChange={(e) => setFilters({ ...filters, product: e.target.value })}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400">
                {["전체", ...catalogProducts].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="block text-sm font-bold text-slate-600 mb-1.5">제조사</span>
              <select value={filters.maker} onChange={(e) => setFilters({ ...filters, maker: e.target.value })}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400">
                {["전체", ...[...new Set(catalog.map((item) => item.maker).filter(Boolean))]].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="block text-sm font-bold text-slate-600 mb-1.5">두께</span>
              <select value={filters.thickness} onChange={(e) => setFilters({ ...filters, thickness: e.target.value })}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400">
                {thicknessOptions.map((item) => <option key={item} value={item}>{item === "전체" ? item : `${item}T`}</option>)}
              </select>
            </label>
            <label className="block relative">
              <span className="block text-sm font-bold text-slate-600 mb-1.5">색상명</span>
              <input value={filters.color} onChange={(e) => { setFilters({ ...filters, color: e.target.value }); setShowSuggestions(true); }}
                onFocus={() => filters.color.trim() && setShowSuggestions(true)}
                placeholder="색상명을 입력하세요"
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400" />
              {showSuggestions && colorSuggestions.length > 0 && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                  {colorSuggestions.map((color) => (
                    <button type="button" key={color} onClick={() => { setFilters({ ...filters, color }); setShowSuggestions(false); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 hover:text-indigo-700">
                      {color}
                    </button>
                  ))}
                </div>
              )}
            </label>
            </div>
            <div className="mt-9 pt-4 border-t border-slate-100 flex items-center gap-2">
            <button onClick={resetSearch} title="초기화" className="w-11 h-11 rounded-xl border border-slate-200 bg-white text-slate-500 inline-flex items-center justify-center hover:border-indigo-300 hover:text-indigo-600">
              <RotateCcw size={18} />
            </button>
            <button onClick={() => setAddCoilOpen(true)} title="코일 색상 추가" className="ml-auto w-11 h-11 rounded-xl border border-slate-200 bg-white text-slate-500 inline-flex items-center justify-center hover:border-indigo-300 hover:text-indigo-600">
              <Plus size={19} />
            </button>
            <button onClick={() => { setAppliedFilters(filters); setSearched(true); setShowSuggestions(false); }} className="h-11 w-[104px] px-3 rounded-xl bg-indigo-600 text-white text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-indigo-700">
              <Search size={17} />검색
            </button>
            </div>
          </Card>
          <button onClick={() => setHistoryOpen(true)} className="w-full text-left rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm hover:border-indigo-300 transition flex items-center gap-3">
            <div className="metric-icon w-10 h-10 rounded-xl bg-gradient-to-br from-rose-50 to-indigo-50 flex items-center justify-center"><Palette size={22} /></div>
            <div>
              <div className="font-bold text-slate-800">코일 재고내역</div>
              <div className="text-xs text-slate-400 mt-0.5">등록된 재고를 확인해주세요.</div>
            </div>
            <ChevronRight size={18} className="ml-auto text-slate-400" />
          </button>
          <Card className="overflow-hidden">
            <div className="mx-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-extrabold text-slate-800">코일 색상 종목</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{rankingProduct} 실시간 재고 TOP 5</div>
              </div>
              <button onClick={() => setRankingProduct((current) => current === "강판" ? "징크" : "강판")}
                className="text-xs text-slate-400 hover:text-indigo-600 inline-flex items-center gap-0.5">
                다음 <ChevronRight size={13} />
              </button>
            </div>
            <div key={rankingProduct} className="px-4 py-3 ranking-rise">
              <div className="grid grid-cols-[22px_minmax(0,1fr)_42px_42px_64px] gap-1 text-[10px] text-slate-400 pb-2 border-b border-slate-100 text-right">
                <span />
                <span className="text-left">색상명</span>
                <span>전일</span>
                <span>금일</span>
                <span>-</span>
              </div>
              <div className="divide-y divide-slate-100">
                {rankingRows.map((item, index) => (
                  <div key={item.key} className="grid grid-cols-[22px_minmax(0,1fr)_42px_42px_64px] gap-1 items-center py-2 text-xs">
                    <span className={`font-extrabold ${index < 3 ? "text-indigo-600" : "text-slate-400"}`}>{index + 1}.</span>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-700 truncate">{item.color}</div>
                      <div className="text-[10px] text-slate-400 truncate">{item.maker} / {item.thickness}T</div>
                    </div>
                    <span className="text-right text-slate-500">{fmt(item.previousMeter)}</span>
                    <span className="text-right font-bold text-slate-700">{fmt(item.currentMeter)}</span>
                    <span className={`text-right font-bold ${item.change > 0 ? "text-red-500" : item.change < 0 ? "text-blue-500" : "text-slate-500"}`}>
                      {item.change > 0 ? "▲" : item.change < 0 ? "▼" : "-"}{item.change === 0 ? "" : `${item.changeRate.toFixed(1)}%`}
                    </span>
                  </div>
                ))}
                {rankingRows.length === 0 && <div className="py-8 text-center text-xs text-slate-400">등록된 재고가 없습니다.</div>}
              </div>
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden self-start w-full">
          <div className="h-[57px] px-4 md:px-5 border-b border-slate-200 flex items-center justify-between gap-3">
            <h3 className="font-extrabold text-slate-900">{searched ? "코일 색상 검색결과" : "코일 색상 검색"}</h3>
            <span className="text-sm text-indigo-600 font-bold">
              {searched ? `${filteredRows.length} / ${allRows.length}` : `${allRows.length}`}
            </span>
          </div>
          {!searched ? (
            <div className="min-h-[461px] flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-cyan-50 to-indigo-50">
              <div className="w-20 h-20 rounded-3xl bg-white/80 border border-white shadow-lg flex items-center justify-center text-indigo-500">
                <Search size={38} />
              </div>
              <h3 className="mt-6 text-xl font-extrabold text-slate-800">원하는 코일 색상을 검색해보세요</h3>
              <p className="mt-2 text-sm text-slate-500">왼쪽 카테고리에서 조건을 선택한 뒤 검색 버튼을 눌러주세요.</p>
            </div>
          ) : (
            <>
              <div className="p-3 md:p-4 space-y-2.5 bg-slate-50/50">
              {filteredRows.length === 0 && (
              <div className="py-16 text-center text-sm text-slate-400">검색 조건에 맞는 코일 색상이 없습니다.</div>
            )}
            {filteredRows.map((item) => {
              const zones = { A: "", B: "", C: "", ...(zoneDraft[item.key] || {}) };
              return (
                <div key={item.key} className="rounded-2xl border border-slate-200 bg-white p-3 md:p-4 shadow-sm">
                  <div className="grid md:grid-cols-[minmax(190px,1fr)_repeat(3,74px)_84px] gap-2 items-center">
                    <div className="flex items-center min-w-0 gap-3">
                      <span className="w-11 h-11 rounded-xl border border-slate-200 shadow-inner shrink-0" style={{ background: hexOf(item.color) }} />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{item.color}</div>
                        <div className="text-xs text-slate-400 mt-0.5 truncate">{item.code || "코드없음"} · {item.thickness}T · {item.maker}</div>
                      </div>
                    </div>
                    {["A", "B", "C"].map((zone) => (
                      <label key={zone} className="grid grid-cols-[22px_1fr] md:grid-cols-1 gap-1 items-center text-center">
                        <span className="text-xs font-bold text-slate-500 md:text-center md:mb-0.5">{zone}</span>
                        <div className="relative">
                          <input type="text" inputMode="decimal" value={zones[zone]} onChange={(e) => setZoneValue(item.key, zone, numericValue(e.target.value))}
                            className="w-full h-9 rounded-xl border border-slate-200 bg-white px-6 text-center text-sm outline-none focus:border-indigo-400" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">M</span>
                        </div>
                      </label>
                    ))}
                    <div className="grid gap-0 items-center">
                      <button type="button" role="switch" aria-checked={item.soldOut} onClick={() => toggleDiscontinue(item)}
                        className="h-7 px-1 rounded-xl bg-transparent inline-flex items-center justify-center gap-1 text-[11px] text-slate-500 self-start">
                        <span>품절</span>
                        <span className={`relative w-8 h-[18px] rounded-full transition ${item.soldOut ? "bg-indigo-500" : "bg-slate-200"}`}>
                          <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition ${item.soldOut ? "left-4" : "left-0.5"}`} />
                        </span>
                      </button>
                      <button onClick={() => registerStock(item)} className="h-8 w-full rounded-xl border border-indigo-200 bg-indigo-50 text-sm font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white inline-flex items-center justify-center">등록</button>
                    </div>
                  </div>
                </div>
              );
            })}
              </div>
            </>
          )}
        </Card>
      </div>
      <Modal open={addCoilOpen} onClose={() => setAddCoilOpen(false)} title="코일 색상 추가">
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="구분 *">
              <select value={catalogProducts.includes(newCoil.product) ? newCoil.product : "직접입력"}
                onChange={(e) => setNewCoil({ ...newCoil, product: e.target.value === "직접입력" ? "" : e.target.value, maker: "" })}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-indigo-400">
                {catalogProducts.map((product) => <option key={product}>{product}</option>)}
                <option value="직접입력">직접입력</option>
              </select>
              {!catalogProducts.includes(newCoil.product) && (
                <input autoFocus value={newCoil.product} onChange={(e) => setNewCoil({ ...newCoil, product: e.target.value, maker: "" })}
                  placeholder="새 구분명을 입력하세요"
                  className="mt-2 w-full h-11 rounded-xl border border-indigo-200 bg-white px-3 outline-none focus:border-indigo-400" />
              )}
            </Field>
            <Field label="제조사 *">
              <select value={catalogMakers.includes(newCoil.maker) ? newCoil.maker : "직접입력"}
                onChange={(e) => setNewCoil({ ...newCoil, maker: e.target.value === "직접입력" ? "" : e.target.value })}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-indigo-400">
                {catalogMakers.map((maker) => <option key={maker}>{maker}</option>)}
                <option value="직접입력">직접입력</option>
              </select>
              {!catalogMakers.includes(newCoil.maker) && (
                <input value={newCoil.maker} onChange={(e) => setNewCoil({ ...newCoil, maker: e.target.value })}
                  placeholder="새 제조사명을 입력하세요"
                  className="mt-2 w-full h-11 rounded-xl border border-indigo-200 bg-white px-3 outline-none focus:border-indigo-400" />
              )}
            </Field>
          </div>
          <Field label="색상명 *">
            <input value={newCoil.color} onChange={(e) => setNewCoil({ ...newCoil, color: e.target.value })}
              className="w-full h-11 rounded-xl border border-slate-200 px-3 outline-none focus:border-indigo-400" />
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="제조코드">
              <input value={newCoil.code} onChange={(e) => setNewCoil({ ...newCoil, code: e.target.value })}
                className="w-full h-11 rounded-xl border border-slate-200 px-3 outline-none focus:border-indigo-400" />
            </Field>
            <Field label="두께 *">
              <input type="number" min="0" step="0.01" value={newCoil.thickness} onChange={(e) => setNewCoil({ ...newCoil, thickness: e.target.value })}
                className="w-full h-11 rounded-xl border border-slate-200 px-3 outline-none focus:border-indigo-400" />
            </Field>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button onClick={() => setAddCoilOpen(false)} className="h-10 px-5 rounded-xl border border-slate-200 bg-white text-sm">취소</button>
            <button onClick={addCoil} className="h-10 px-5 rounded-xl bg-indigo-600 text-white text-sm font-bold">추가</button>
          </div>
        </div>
      </Modal>
      <Modal open={historyOpen} onClose={() => {
        setHistoryOpen(false);
        setOpenBaseEditorAfterAdd(false);
        setBaseEditing(false);
        setSelectedBaseKeys([]);
      }} title="코일 재고내역" wide="inventory">
        <div className="min-h-[620px] sm:min-h-[700px] flex flex-col">
          <div className="-mx-4 sm:-mx-6 -mt-4 sm:-mt-5 flex justify-start border-b border-slate-200 px-4 sm:px-8">
            <div className="flex items-center gap-8">
              {[["base", "기초재고"], ["timeline", "타임라인"]].map(([key, label]) => (
                <button key={key} type="button" onClick={() => setHistoryTab(key)}
                  className={`relative h-14 px-1 text-sm sm:text-base font-bold transition ${historyTab === key ? "text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}>
                  {label}
                  {historyTab === key && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-600" />}
                </button>
              ))}
            </div>
          </div>

          {historyTab === "base" ? (
            <div className="flex-1 flex flex-col pt-5">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="min-h-10 flex-1 rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-600 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs inline-flex items-center justify-center">i</span>
                  작업에서 항목을 체크한 뒤 수정 버튼을 눌러주세요.
                </div>
                <div className="w-full lg:w-[430px] relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="search" value={baseSearch} onChange={(event) => setBaseSearch(event.target.value)}
                    placeholder="구분 · 제조사 · 색상 · 두께 검색"
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-indigo-400" />
                </div>
                <button type="button" onClick={() => {
                  if (baseEditing) {
                    saveSelectedBaseStocks();
                    return;
                  }
                  setSelectedBaseKeys([]);
                  setBaseEditing(true);
                }}
                  className="h-10 px-4 rounded-xl border border-indigo-200 bg-white text-xs font-bold text-indigo-600 hover:bg-indigo-50 whitespace-nowrap">
                  수정
                </button>
                <button type="button" onClick={deleteSelectedBaseStocks}
                  disabled={!selectedBaseKeys.some((key) => customColors.some((color) => keyOf(color) === key))}
                  title="새로 추가한 코일을 선택하면 삭제할 수 있습니다."
                  className="h-10 px-4 rounded-xl border border-rose-200 bg-white text-xs font-bold text-rose-500 hover:bg-rose-50 disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-white whitespace-nowrap">
                  삭제
                </button>
              </div>

              <div className="mt-5 flex-1 min-h-[470px] max-h-[550px] overflow-auto rounded-2xl border border-slate-200">
                <table className="w-full text-xs sm:text-sm min-w-[920px] table-fixed">
                  <colgroup>
                    <col className="w-[15%]" /><col className="w-[15%]" /><col className="w-[11%]" />
                    <col className="w-[16%]" /><col className="w-[8%]" /><col className="w-[8%]" />
                    <col className="w-[8%]" /><col className="w-[11%]" /><col className="w-[8%]" />
                  </colgroup>
                  <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500">
                    <tr>
                      {["색상", "코드 / 두께", "제조사", "기준일", "A", "B", "C", "기초재고 M", "작업"].map((heading, index) => (
                        <th key={`${heading}-${index}`} className="px-2 py-2.5 text-center font-medium whitespace-nowrap">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {searchedBaseRows.map((item) => {
                      const selected = selectedBaseKeys.includes(item.key);
                      const draftTotal = ["A", "B", "C"].reduce((sum, zone) => sum + (Number(baseDraft[item.key]?.zones?.[zone]) || 0), 0);
                      return (
                        <tr key={item.key} className={selected ? "bg-indigo-50/60" : ""}>
                          <td className="px-3 py-3 text-left">
                            <div className="flex items-center gap-2">
                              <span className="w-3.5 h-3.5 rounded border border-slate-200 shrink-0" style={{ background: hexOf(item.color) }} />
                              <span className="font-bold truncate">{item.color}</span>
                            </div>
                          </td>
                          <td className="px-1.5 py-2 text-center text-slate-400 whitespace-nowrap">{item.code || "코드없음"} · {item.thickness}T</td>
                          <td className="px-1.5 py-2 text-center whitespace-nowrap">{item.maker}</td>
                          <td className="px-2 py-2 text-center">
                            {baseEditing
                              ? <input type="date" value={baseDraft[item.key]?.date || todayStr()} onChange={(e) => setBaseDraftValue(item.key, "date", e.target.value)}
                                  className="h-9 w-[132px] rounded-xl border border-slate-200 px-1 text-center outline-none focus:border-indigo-400" />
                              : displayDate(baseStockDates[item.key])}
                          </td>
                          {["A", "B", "C"].map((zone) => (
                            <td key={zone} className="px-1 py-2 text-center">
                              {baseEditing
                                ? <input type="text" inputMode="decimal" value={baseDraft[item.key]?.zones?.[zone] || ""}
                                    onChange={(e) => setBaseDraftValue(item.key, zone, e.target.value)}
                                    className="h-9 w-16 rounded-xl border border-slate-200 px-1 text-center outline-none focus:border-indigo-400" />
                                : fmt(zoneStock[item.key]?.[zone] || 0)}
                            </td>
                          ))}
                          <td className="px-2 py-2 text-center font-bold text-indigo-700">{fmt(baseEditing ? draftTotal : baseStock[item.key] || 0)} M</td>
                          <td className="px-1 py-2 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <input type="checkbox" checked={selected}
                                onChange={() => {
                                  if (selected) {
                                    setSelectedBaseKeys((current) => current.filter((key) => key !== item.key));
                                  } else {
                                    setSelectedBaseKeys((current) => [...current, item.key]);
                                  }
                                }}
                                aria-label={`${item.color} 선택`}
                                title={selected ? "선택 해제" : baseEditing ? "수정할 항목 선택" : "삭제할 항목 선택"}
                                className="w-4 h-4 accent-indigo-600" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {searchedBaseRows.length === 0 && <tr><td colSpan={9} className="px-3 py-10 text-center text-sm text-slate-400">검색 조건에 맞는 기초재고가 없습니다.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex-1 pt-5 space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="min-h-10 flex-1 rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-600 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs inline-flex items-center justify-center shrink-0">i</span>
                  기초재고에서 저장한 변경 내용이 최신순으로 표시됩니다.
                </div>
                <div className="w-full lg:w-[430px] relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="search" value={historySearch} onChange={(event) => setHistorySearch(event.target.value)}
                    placeholder="구분 · 제조사 · 색상 · 두께 검색"
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-indigo-400" />
                </div>
              </div>
              <div className="space-y-2">
                {searchedHistoryRows.map((item) => (
                  <div key={item.id} className="relative pl-6 w-full">
                    <span className="absolute left-1.5 top-2 bottom-[-14px] w-px bg-indigo-100" />
                    <span className="absolute left-0 top-2 w-4 h-4 rounded-full bg-white border-4 border-indigo-300" />
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 grid md:grid-cols-[96px_minmax(210px,1fr)_repeat(3,64px)_110px] gap-2 items-center text-center">
                      <div className="text-xs text-slate-500">{displayDate(item.registered_at)}</div>
                      <div className="font-bold text-left truncate" title={`${item.color} (${item.code || "코드없음"} · ${item.thickness}T)`}>
                        {item.color} <span className="text-xs font-normal text-slate-400">({item.code || "코드없음"} · {item.thickness}T)</span>
                      </div>
                      {["A", "B", "C"].map((zone) => <div key={zone} className="text-sm"><span className="text-xs text-slate-400 mr-1">{zone}</span>{fmt(item.zones?.[zone] || 0)}</div>)}
                      <div className="font-bold text-indigo-700">총 {fmt(item.meter)} M</div>
                    </div>
                  </div>
                ))}
                {searchedHistoryRows.length === 0 && (
                  <div className="py-16 text-center text-sm text-slate-400">
                    {historyDraft.length === 0 ? "등록된 변경 기록이 없습니다." : "검색 조건에 맞는 변경 기록이 없습니다."}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

function ColorStockModal({ open, onClose, values, setValues, history, setHistory, customColors, setCustomColors, discontinued, setDiscontinued }) {
  const [product, setProduct] = useState("강판");
  const [draft, setDraft] = useState({});
  const [adding, setAdding] = useState(false);
  const [newColor, setNewColor] = useState({ maker: "", color: "", code: "", thickness: "" });
  const keyOf = (c) => `${c.product}|${c.maker}|${c.code}|${c.color}|${c.thickness}`;
  useEffect(() => {
    if (open) setDraft(values);
  }, [open, values]);
  const catalog = [...COLOR_MASTER, ...customColors];
  const visibleCatalog = product === "품절"
    ? catalog.filter((c) => discontinued.includes(keyOf(c)))
    : catalog.filter((c) => c.product === product && !discontinued.includes(keyOf(c)));
  const makers = [...new Set(visibleCatalog.map((c) => c.maker))].sort((a, b) => a.localeCompare(b, "ko"));
  const groups = makers.map((maker) => {
    const makerRows = visibleCatalog.filter((c) => c.maker === maker);
    const colors = [...new Set(makerRows.map((c) => c.color))].sort((a, b) => a.localeCompare(b, "ko"));
    return {
      maker,
      colors: colors.map((color) => ({
        color,
        variants: makerRows.filter((c) => c.color === color)
          .sort((a, b) => Number(a.thickness) - Number(b.thickness) || String(a.code).localeCompare(String(b.code))),
      })),
    };
  });
  const register = () => {
    const entries = visibleCatalog
      .map((color) => ({ color, key: keyOf(color), meter: Number(draft[keyOf(color)]) }))
      .filter((item) => Number.isFinite(item.meter) && item.meter >= 0 && draft[item.key] !== "");
    if (entries.length === 0) {
      appAlert("등록할 기초재고 M를 입력해주세요.", { title: "재고 입력 안내", type: "warning" });
      return;
    }
    const additions = entries.map(({ color, key, meter }) => ({
      id: uid(), registered_at: todayStr(), key, meter,
      product: color.product, maker: color.maker, color: color.color, code: color.code, thickness: color.thickness,
    }));
    const nextHistory = [...additions, ...history];
    const latestByKey = {};
    nextHistory.forEach((item) => {
      const current = latestByKey[item.key];
      if (!current || item.registered_at > current.registered_at) latestByKey[item.key] = item;
    });
    setValues(Object.fromEntries(Object.values(latestByKey).map((item) => [item.key, item.meter])));
    setHistory(nextHistory);
    appAlert("코일 재고가 등록되었습니다.", { title: "재고 등록 완료", type: "success" });
  };
  const addColor = () => {
    if (!newColor.maker || !newColor.color || !newColor.thickness) {
      appAlert("제조사, 색상명, 두께를 입력해주세요.", { title: "필수입력 안내", type: "warning" });
      return;
    }
    const item = { product, ...newColor };
    const key = keyOf(item);
    if (catalog.some((c) => keyOf(c) === key)) {
      appAlert("이미 등록된 색상·코드·두께입니다.", { title: "중복 등록 안내", type: "warning" });
      return;
    }
    setCustomColors((current) => [...current, item]);
    setNewColor({ maker: "", color: "", code: "", thickness: "" });
    setAdding(false);
  };
  const changeSoldOut = async (variants, restore) => {
    const keys = variants.map(keyOf);
    if (restore) {
      setDiscontinued((current) => current.filter((key) => !keys.includes(key)));
      return;
    }
    if (!await appConfirm("선택한 색상을 품절 처리하시겠습니까? 재고표와 재고내역에서 숨겨집니다.", { title: "품절 처리 확인", type: "warning" })) return;
    setDiscontinued((current) => [...new Set([...current, ...keys])]);
  };
  const latestHistory = Object.values(history.reduce((latest, item) => {
    if (!latest[item.key] || item.registered_at > latest[item.key].registered_at) latest[item.key] = item;
    return latest;
  }, {}))
    .filter((item) => !discontinued.includes(item.key))
    .sort((a, b) =>
      b.registered_at.localeCompare(a.registered_at) ||
      a.maker.localeCompare(b.maker, "ko") ||
      a.color.localeCompare(b.color, "ko") ||
      Number(a.thickness) - Number(b.thickness)
    );
  return (
    <Modal open={open} onClose={onClose} title="코일 재고표" wide hideClose>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {["강판", "징크", "품절"].map((item) => <button key={item} onClick={() => setProduct(item)} className={`px-4 py-2 rounded-xl text-sm border ${product === item ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>{item}</button>)}
      </div>
      {adding && (
        <div className="mb-5 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
          <div className="grid sm:grid-cols-4 gap-2">
            <input className={inputCls} value={newColor.maker} onChange={(e) => setNewColor((v) => ({ ...v, maker: e.target.value }))} placeholder="제조사" />
            <input className={inputCls} value={newColor.color} onChange={(e) => setNewColor((v) => ({ ...v, color: e.target.value }))} placeholder="색상명" />
            <input className={inputCls} value={newColor.code} onChange={(e) => setNewColor((v) => ({ ...v, code: e.target.value }))} placeholder="코드명" />
            <input className={inputCls} value={newColor.thickness} onChange={(e) => setNewColor((v) => ({ ...v, thickness: e.target.value }))} placeholder="두께" />
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setAdding(false)} className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm">취소</button>
            <button onClick={addColor} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm">추가</button>
          </div>
        </div>
      )}
      <div className="space-y-5">
        {groups.map((group) => (
          <section key={group.maker}>
            <h4 className="font-bold text-slate-800 mb-2 pb-2 border-b border-slate-200">{group.maker}</h4>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {group.colors.map((item) => (
                <div key={`${group.maker}-${item.color}`} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="h-2.5 w-full" style={{ background: hexOf(item.color) }} />
                  <div className="p-2.5">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-bold text-slate-800">{item.color}</div>
                      <button type="button" onClick={() => changeSoldOut(item.variants, product === "품절")} className={`ml-auto text-[10px] px-2 py-1 rounded-lg border ${product === "품절" ? "border-indigo-200 text-indigo-600" : "border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-500"}`}>
                        {product === "품절" ? "복구" : "품절하기"}
                      </button>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {item.variants.map((variant) => {
                        const key = keyOf(variant);
                        return (
                          <label key={key} className="grid grid-cols-[1fr_78px_auto] items-center gap-1.5">
                            <span className="text-[10px] text-slate-500">{variant.code || "코드없음"} · {variant.thickness}T</span>
                            <input type="number" min="0" disabled={product === "품절"} value={draft[key] ?? ""} onChange={(e) => setDraft((current) => ({ ...current, [key]: e.target.value }))} className={`${inputCls} text-right px-2 py-1.5 text-xs disabled:bg-slate-50`} placeholder="0" />
                            <span className="text-[10px] text-slate-400">M</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
        {groups.length === 0 && <div className="py-10 text-center text-sm text-slate-400">{product === "품절" ? "품절 처리된 색상이 없습니다." : "표시할 색상이 없습니다."}</div>}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-semibold">닫기</button>
        {product !== "품절" && <button onClick={() => setAdding(true)} className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:border-indigo-300">추가하기</button>}
        {product !== "품절" && <button onClick={register} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">등록하기</button>}
      </div>
    </Modal>
  );
}

/* 상세 패널 (중량 제거 · 일반 정보) */
function DetailPanel({ rows, extra }) {
  return (
    <div className="bg-indigo-50/40 border-t border-indigo-100 p-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
        {rows.map(([k, v], i) => (
          <div key={i}><div className="text-xs text-slate-500">{k}</div><div className="font-medium">{v}</div></div>
        ))}
      </div>
      {extra}
    </div>
  );
}

/* =========================================================================
   출고관리  (제품구분별 FIFO 차감)
   ========================================================================= */
const blankOutbound = () => ({
  registration_type: "outbound",
  outbound_date: todayStr(), customer: "", arrival_date: todayStr(), arrival_time: "09:00",
  reservation_date: todayStr(), planned_date: todayStr(),
  product_type: "강판", coil_number: "", manufacturer: "", color_name: "", thickness: "",
  color_code: "", site_address: "", manager: "", outbound_meter: "", memo: "", attachments: [],
});

function Outbound({ ctx, quickOpen, clearQuick, pendingOpen, setPendingOpen, initialDetailId, clearInitialDetail }) {
  const {
    outbound, setOutbound, reservations, setReservations, coils, setCoils,
    baseStock, setBaseStock, stockHistory, setStockHistory, zoneStock, setZoneStock,
    customColors, discontinuedColors, deletedBaseStockKeys,
  } = ctx;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blankOutbound());
  const [editId, setEditId] = useState(null);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [customerMenuOpen, setCustomerMenuOpen] = useState(false);
  const [reservationOpen, setReservationOpen] = useState(false);
  const [detailKey, setDetailKey] = useState("");
  const [, setDetailRefreshTick] = useState(0);
  const [pendingDetail, setPendingDetail] = useState(null);

  useEffect(() => {
    if (!quickOpen) return;
    setEditId(null);
    setForm(blankOutbound());
    setOpen(true);
    clearQuick();
  }, [quickOpen, clearQuick]);
  useEffect(() => {
    if (!initialDetailId) return;
    const target = outbound.find((item) => item.id === initialDetailId && !item.is_completed);
    if (target) setPendingDetail(target);
    clearInitialDetail();
  }, [initialDetailId, outbound, clearInitialDetail]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const availOf = (pt) => coils.filter((c) => c.product_type === pt && c.current_meter > 0).reduce((a, c) => a + c.current_meter, 0);
  const stockKey = (item) => `${item.product}|${item.maker}|${item.code}|${item.color}|${item.thickness}`;
  const registrationCatalog = [...new Map([...COLOR_MASTER, ...customColors].map((item) => [stockKey(item), item])).values()]
    .filter((item) => {
      const key = stockKey(item);
      const isPdfDefault = COLOR_MASTER.some((master) => stockKey(master) === key);
      return isPdfDefault || (Object.prototype.hasOwnProperty.call(baseStock, key) && !deletedBaseStockKeys.includes(key));
    });
  const productOptions = [...new Set(registrationCatalog.map((item) => item.product).filter(Boolean))];
  const colorCatalog = registrationCatalog
    .filter((item) => item.product === form.product_type && !discontinuedColors.includes(stockKey(item)));
  const colorMatches = form.color_name.trim()
    ? colorCatalog.filter((item) => item.color.includes(form.color_name.trim())).slice(0, 10)
    : colorCatalog.slice(0, 10);
  const selectedColor = colorCatalog.find((item) =>
    item.color === form.color_name && item.maker === form.manufacturer &&
    String(item.code || "") === String(form.color_code || "") && String(item.thickness) === String(form.thickness)
  );
  const selectedKey = selectedColor ? stockKey(selectedColor) : "";
  const selectedZones = selectedKey && zoneStock[selectedKey]
    ? { A: 0, B: 0, C: 0, ...zoneStock[selectedKey] }
    : { A: selectedKey ? Number(baseStock[selectedKey]) || 0 : 0, B: 0, C: 0 };
  const selectedZoneTotal = ["A", "B", "C"].reduce((sum, zone) => sum + (Number(selectedZones[zone]) || 0), 0);
  const selectedTotal = selectedZoneTotal;
  const currentForKey = (key) => zoneStock[key]
    ? ["A", "B", "C"].reduce((sum, zone) => sum + (Number(zoneStock[key]?.[zone]) || 0), 0)
    : Number(baseStock[key]) || 0;
  const reservedForKey = (key, excludeId = "") => reservations
    .filter((item) => item.coil_key === key && item.id !== excludeId)
    .reduce((sum, item) => sum + (Number(item.reserved_meter) || 0), 0);
  const selectedReserved = selectedKey ? reservedForKey(selectedKey) : 0;
  const selectedAvailable = Math.max(0, selectedTotal - selectedReserved);
  const customerList = [...new Set([...outbound, ...reservations].map((o) => o.customer?.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "ko"));
  const customerMatches = form.customer.trim()
    ? customerList.filter((customer) => customer.toLocaleLowerCase().includes(form.customer.trim().toLocaleLowerCase())).slice(0, 8)
    : customerList.slice(0, 8);
  const chooseColor = (item) => {
    setForm((current) => ({
      ...current,
      color_name: item.color,
      manufacturer: item.maker,
      color_code: item.code || "",
      thickness: item.thickness,
      coil_number: stockKey(item),
    }));
    setColorMenuOpen(false);
  };
  const attachFiles = (files) => {
    [...files].forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setForm((current) => ({
        ...current,
        attachments: [...(current.attachments || []), {
          id: uid(), name: file.name, type: file.type, size: file.size, data: reader.result,
        }],
      }));
      reader.readAsDataURL(file);
    });
  };
  const removeAttachment = (id) => setForm((current) => ({
    ...current, attachments: (current.attachments || []).filter((file) => file.id !== id),
  }));

  const submit = () => {
    const isReservation = form.registration_type === "reservation";
    const commonMissing = !form.customer || !selectedKey;
    const typeMissing = isReservation ? !form.reservation_date : !form.outbound_date;
    if (commonMissing || typeMissing) {
      appAlert("*필수입력을 작성해주세요", { title: "필수입력 안내", type: "warning" });
      return;
    }
    const m = Number(form.outbound_meter) || 0;
    if (isReservation) {
      if (m > selectedAvailable) {
        appAlert(`가용 재고 ${fmt(selectedAvailable)} M를 초과할 수 없습니다.`, { title: "예약 수량 확인", type: "warning" });
        return;
      }
      const rec = {
        id: uid(),
        coil_key: selectedKey,
        reservation_date: form.reservation_date,
        planned_date: form.planned_date,
        customer: form.customer,
        product_type: form.product_type,
        manufacturer: form.manufacturer,
        color_name: form.color_name,
        color_code: form.color_code,
        thickness: form.thickness,
        site_address: form.site_address,
        manager: form.manager,
        memo: form.memo,
        reserved_meter: m,
        created_at: todayStr(),
        updated_at: todayStr(),
      };
      setReservations((list) => [rec, ...list]);
      setOpen(false);
      setEditId(null);
      setForm(blankOutbound());
      setReservationOpen(true);
      appAlert("예약 현황에 등록되었습니다.", {
        title: "예약 등록 완료",
        type: "success",
        submessage: "실제 재고는 차감되지 않고 가용 재고에만 반영됩니다.",
      });
      return;
    }
    const editingRecord = editId ? outbound.find((item) => item.id === editId) : null;
    const editingMeter = Number(editingRecord?.outbound_meter) || 0;
    const editingDeducted = editingRecord?.stock_deducted === true ||
      (editingRecord?.stock_deducted !== false && editingRecord?.registration_type !== "reservation-converted");
    const additionalMeter = editingRecord && editingDeducted ? Math.max(0, m - editingMeter) : m;
    if (additionalMeter > 0 && additionalMeter > selectedAvailable) {
      appAlert(`예약량을 제외한 가용 재고는 ${fmt(selectedAvailable)} M입니다.`, { title: "출고 수량 확인", type: "warning" });
      return;
    }
    if (editId) {
      const original = outbound.find((item) => item.id === editId);
      const originalCatalogItem = original ? registrationCatalog.find((item) =>
        stockKey(item) === original.coil_number ||
        (item.product === original.product_type && item.maker === original.manufacturer &&
          item.color === original.color_name && String(item.thickness) === String(original.thickness))
      ) : null;
      const originalKey = originalCatalogItem ? stockKey(originalCatalogItem) : "";
      if (originalKey && originalKey !== selectedKey) {
        appAlert("출고 대기 수정에서는 코일 색상을 변경할 수 없습니다.", {
          title: "코일 색상 확인",
          type: "warning",
          submessage: "다른 코일로 변경하려면 기존 내역을 삭제한 뒤 다시 등록해주세요.",
        });
        return;
      }
      const originalMeter = Number(original?.outbound_meter) || 0;
      const current = selectedKey ? currentForKey(selectedKey) : 0;
      const wasDeducted = original?.stock_deducted === true ||
        (original?.stock_deducted !== false && original?.registration_type !== "reservation-converted");
      let nextTotal = current;
      if (wasDeducted && selectedKey) {
        const delta = m - originalMeter;
        if (delta > current) {
          appAlert(`추가 출고량 ${fmt(delta)} M이 현재 재고 ${fmt(current)} M보다 큽니다.`, {
            title: "출고량 수정 불가",
            type: "warning",
          });
          return;
        }
        if (delta !== 0) {
          const nextZones = { ...selectedZones };
          if (delta > 0) {
            let remain = delta;
            ["A", "B", "C"].forEach((zone) => {
              const zoneMeter = Number(nextZones[zone]) || 0;
              const used = Math.min(zoneMeter, remain);
              nextZones[zone] = zoneMeter - used;
              remain -= used;
            });
          } else {
            nextZones.A = (Number(nextZones.A) || 0) + Math.abs(delta);
          }
          nextTotal = Math.max(0, current - delta);
          setZoneStock((values) => ({ ...values, [selectedKey]: nextZones }));
          setBaseStock((values) => ({ ...values, [selectedKey]: nextTotal }));
          setStockHistory((history) => [{
            id: uid(),
            key: selectedKey,
            registered_at: form.outbound_date || todayStr(),
            created_at: new Date().toISOString(),
            product: selectedColor.product,
            maker: selectedColor.maker,
            color: selectedColor.color,
            code: selectedColor.code,
            thickness: selectedColor.thickness,
            zones: nextZones,
            meter: nextTotal,
            source: "outbound-edit",
          }, ...history]);
        }
      }
      setOutbound((list) => list.map((o) => o.id === editId ? {
        ...o,
        ...form,
        outbound_meter: m,
        before_meter: wasDeducted ? nextTotal + m : current,
        after_meter: wasDeducted ? nextTotal : Math.max(0, current - m),
        stock_deducted: wasDeducted,
        updated_at: todayStr(),
      } : o));
    } else {
      const rec = {
        id: uid(), ...form, outbound_meter: m, before_meter: selectedTotal, after_meter: Math.max(0, selectedTotal - m),
        stock_deducted: m > 0, is_completed: false, completed_at: null, created_at: todayStr(), updated_at: todayStr(),
      };
      setOutbound((list) => [rec, ...list]);
      if (m > 0 && selectedKey) {
        let remain = m;
        const nextZones = { ...selectedZones };
        ["A", "B", "C"].forEach((zone) => {
          const current = Number(nextZones[zone]) || 0;
          const used = Math.min(current, remain);
          nextZones[zone] = current - used;
          remain -= used;
        });
        const nextTotal = Math.max(0, selectedTotal - m);
        setZoneStock((values) => ({ ...values, [selectedKey]: nextZones }));
        setBaseStock((values) => ({ ...values, [selectedKey]: nextTotal }));
        setStockHistory((history) => [{
          id: uid(),
          key: selectedKey,
          registered_at: form.outbound_date || todayStr(),
          created_at: new Date().toISOString(),
          product: selectedColor.product,
          maker: selectedColor.maker,
          color: selectedColor.color,
          code: selectedColor.code,
          thickness: selectedColor.thickness,
          zones: nextZones,
          meter: nextTotal,
          source: "outbound-registration",
        }, ...history]);
      }
    }
    setOpen(false); setEditId(null); setForm(blankOutbound());
    appAlert("출고 대기로 자동 등록됩니다.", {
      title: "출고 등록 완료",
      type: "success",
      submessage: "완료 버튼을 눌러 출고 완료해주세요.",
    });
  };

  const approve = async (o) => {
    const catalogItem = registrationCatalog.find((item) =>
      stockKey(item) === o.coil_number ||
      (item.product === o.product_type && item.maker === o.manufacturer &&
        item.color === o.color_name && String(item.thickness) === String(o.thickness))
    );
    const key = catalogItem ? stockKey(catalogItem) : "";
    const current = key ? currentForKey(key) : 0;
    const meter = Number(o.outbound_meter) || 0;
    const alreadyDeducted = o.stock_deducted === true ||
      (o.stock_deducted !== false && o.registration_type !== "reservation-converted");

    if (!alreadyDeducted && meter > current) {
      appAlert(`현재 재고 ${fmt(current)} M보다 출고 예정 ${fmt(meter)} M이 커서 완료할 수 없습니다.`, {
        title: "출고 처리 안내",
        type: "warning",
        submessage: "상세정보의 수정 아이콘에서 출고 예정 M을 확인해주세요.",
      });
      return;
    }
    if (!await appConfirm("이 출고 건을 출고 완료 처리하시겠습니까?", {
      title: "출고 완료 확인",
      submessage: alreadyDeducted ? "등록 시 반영된 재고는 다시 차감되지 않습니다." : "완료 처리 시 재고가 차감됩니다.",
    })) return;

    let after = current;
    if (!alreadyDeducted && meter > 0 && key) {
      let remain = meter;
      const currentZones = zoneStock[key]
        ? { A: 0, B: 0, C: 0, ...zoneStock[key] }
        : { A: current, B: 0, C: 0 };
      const nextZones = { ...currentZones };
      ["A", "B", "C"].forEach((zone) => {
        const zoneMeter = Number(nextZones[zone]) || 0;
        const used = Math.min(zoneMeter, remain);
        nextZones[zone] = zoneMeter - used;
        remain -= used;
      });
      after = Math.max(0, current - meter);
      setZoneStock((values) => ({ ...values, [key]: nextZones }));
      setBaseStock((values) => ({ ...values, [key]: after }));
      setStockHistory((history) => [{
        id: uid(),
        key,
        registered_at: o.outbound_date || todayStr(),
        created_at: new Date().toISOString(),
        product: catalogItem.product,
        maker: catalogItem.maker,
        color: catalogItem.color,
        code: catalogItem.code,
        thickness: catalogItem.thickness,
        zones: nextZones,
        meter: after,
        source: "outbound-completion",
      }, ...history]);
    }
    setOutbound((list) => list.map((item) => item.id === o.id ? {
      ...item,
      is_completed: true,
      completed_at: todayStr(),
      before_meter: alreadyDeducted ? current + meter : current,
      after_meter: after,
      stock_deducted: true,
      updated_at: todayStr(),
    } : item));
    setPendingDetail(null);
  };
  const startEdit = (o) => { setForm({ ...blankOutbound(), ...o }); setEditId(o.id); setOpen(true); };
  const remove = async (id) => {
    if (await appConfirm("정말 삭제하시겠습니까?", { title: "출고 내역 삭제", type: "danger" })) {
      setOutbound((l) => l.filter((x) => x.id !== id));
    }
  };

  const processReservation = async (reservation) => {
    const key = reservation.coil_key;
    const current = currentForKey(key);
    const meter = Number(reservation.reserved_meter) || 0;
    if (meter > current) {
      appAlert(`현재 재고 ${fmt(current)} M보다 예약량이 큽니다.`, { title: "출고 처리 불가", type: "warning" });
      return;
    }
    if (!await appConfirm("예약 항목을 출고 대기로 전환하시겠습니까?", {
      title: "출고 대기 전환",
      submessage: "재고는 출고 완료 처리 시 차감됩니다.",
    })) return;

    setReservations((list) => list.filter((item) => item.id !== reservation.id));
    setOutbound((list) => [{
      id: uid(),
      registration_type: "reservation-converted",
      outbound_date: reservation.planned_date || todayStr(),
      arrival_date: reservation.planned_date,
      arrival_time: "",
      customer: reservation.customer,
      product_type: reservation.product_type,
      coil_number: reservation.coil_key,
      manufacturer: reservation.manufacturer,
      color_name: reservation.color_name,
      color_code: reservation.color_code,
      thickness: reservation.thickness,
      site_address: reservation.site_address,
      outbound_meter: meter,
      manager: reservation.manager || "",
      memo: reservation.memo,
      attachments: [],
      before_meter: current,
      after_meter: Math.max(0, current - meter),
      stock_deducted: false,
      is_completed: false,
      completed_at: null,
      created_at: todayStr(),
      updated_at: todayStr(),
    }, ...list]);
    setPendingOpen(true);
    appAlert("예약 항목이 출고 대기로 전환되었습니다.", {
      title: "출고 대기 등록 완료",
      type: "success",
      submessage: "트럭 아이콘에서 출고 완료 처리할 수 있습니다.",
    });
  };

  const reservationRows = [...reservations].sort((a, b) =>
    String(a.planned_date).localeCompare(String(b.planned_date)) ||
    String(a.created_at).localeCompare(String(b.created_at))
  );
  const detailReservations = detailKey ? reservationRows.filter((item) => item.coil_key === detailKey) : [];
  const detailCatalogItem = detailKey ? registrationCatalog.find((item) => stockKey(item) === detailKey) : null;
  const detailCurrent = detailKey ? currentForKey(detailKey) : 0;
  const detailReserved = detailKey ? reservedForKey(detailKey) : 0;
  const detailOutbound = detailKey ? outbound
    .filter((item) => item.coil_number === detailKey ||
      (item.product_type === detailCatalogItem?.product && item.manufacturer === detailCatalogItem?.maker &&
        item.color_name === detailCatalogItem?.color && String(item.thickness) === String(detailCatalogItem?.thickness)))
    .sort((a, b) => String(b.outbound_date).localeCompare(String(a.outbound_date)))
    .slice(0, 5) : [];
  const detailEditableOutbound = detailOutbound.find((item) => !item.is_completed);
  const livePendingDetail = pendingDetail
    ? outbound.find((item) => item.id === pendingDetail.id) || pendingDetail
    : null;
  const pendingDetailCatalogItem = livePendingDetail ? registrationCatalog.find((item) =>
    stockKey(item) === livePendingDetail.coil_number ||
    (item.product === livePendingDetail.product_type && item.maker === livePendingDetail.manufacturer &&
      item.color === livePendingDetail.color_name && String(item.thickness) === String(livePendingDetail.thickness))
  ) : null;
  const pendingDetailKey = pendingDetailCatalogItem ? stockKey(pendingDetailCatalogItem) : "";
  const pendingDetailCurrent = pendingDetailKey ? currentForKey(pendingDetailKey) : Number(livePendingDetail?.after_meter) || 0;
  const pendingDetailMeter = Number(livePendingDetail?.outbound_meter) || 0;
  const pendingDetailDeducted = livePendingDetail?.stock_deducted === true ||
    (livePendingDetail?.stock_deducted !== false && livePendingDetail?.registration_type !== "reservation-converted");
  const pendingDetailAfter = pendingDetailDeducted
    ? pendingDetailCurrent
    : Math.max(0, pendingDetailCurrent - pendingDetailMeter);

  const incomplete = outbound.filter((o) => !o.is_completed).sort((a, b) => a.outbound_date.localeCompare(b.outbound_date));
  const all = outbound
    .filter((o) => inRange(o.outbound_date, from, to))
    .filter((o) => [o.product_type, o.customer, o.site_address, o.color_name, o.coil_number, o.memo].join(" ").toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.outbound_date.localeCompare(a.outbound_date));
  const allMeters = all.reduce((sum, o) => sum + (Number(o.outbound_meter) || 0), 0);
  const steel = all.filter((o) => o.product_type === "강판");
  const zinc = all.filter((o) => o.product_type === "징크");

  const exportXlsx = () => downloadXlsx(all.map((o) => ({
    출고일: o.outbound_date, 도착일: o.arrival_date, 도착시간: o.arrival_time, 제품구분: o.product_type,
    거래처: o.customer, 현장주소: o.site_address, 코일번호: o.coil_number, 제조사: o.manufacturer,
    색상명: o.color_name, 출고량M: o.outbound_meter, 완료여부: o.is_completed ? "완료" : "미완료",
    완료일: o.completed_at || "", 비고: o.memo,
  })), "출고내역", "출고내역.xlsx");

  return (
    <div className="space-y-5">
      <div className="h-[108px] flex items-center justify-between gap-3 flex-wrap">
        <div><h2 className="text-2xl font-extrabold tracking-tight">출고관리</h2><p className="text-slate-500 text-sm mt-0.5">출고 대기 건을 확인하고 완료 처리하면 재고가 차감됩니다.</p></div>
        <div className="flex gap-2">
          <ExcelBtn onClick={exportXlsx} />
          <button onClick={() => { setEditId(null); setForm(blankOutbound()); setOpen(true); }} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium inline-flex items-center gap-1.5 hover:bg-indigo-700 no-print"><Plus size={16} />출고등록</button>
        </div>
      </div>

      {/* 상단: 미완료(출고 대기) */}
      <button onClick={() => setPendingOpen((value) => !value)}
        className={`outbound-pending-trigger w-full sm:w-[340px] h-11 px-3 rounded-xl flex items-center gap-2 text-left no-print ${incomplete.length > 0 ? "has-pending" : ""}`}>
        <span className="w-6 h-6 flex items-center justify-center shrink-0">
          <PastelClock size={20} />
        </span>
        <span className="font-semibold text-slate-700 whitespace-nowrap">출고 대기</span>
        <span className="ml-auto text-sm font-bold text-indigo-600">{incomplete.length}건</span>
        <span className={`text-lg leading-none text-slate-400 transition-transform ${pendingOpen ? "rotate-90" : ""}`}>&gt;</span>
      </button>

      {pendingOpen && (
        <Card className="outbound-pending-panel w-full max-w-2xl overflow-hidden border-violet-200/80 print-card">
          <div className="divide-y divide-violet-100">
            {incomplete.length === 0 && <div className="px-5 py-9 text-center text-sm text-slate-400">미완료 출고 건이 없습니다.</div>}
            {incomplete.map((o, index) => {
              const productText = `${o.product_type || "-"} · ${o.manufacturer || "-"} · ${o.color_name || "-"}${o.thickness ? `(${o.thickness}T)` : ""}`;
              return (
                <div key={o.id} className={`px-4 py-2.5 overflow-hidden ${index % 2 === 0 ? "bg-violet-50/60" : "bg-white"}`}>
                  <div className="grid grid-cols-[minmax(0,1fr)_72px_38px] items-center gap-2 min-w-0">
                    <button type="button" onClick={() => setPendingDetail(o)} className="min-w-0 overflow-hidden text-left">
                      <div className="flex items-center gap-2 min-w-0 overflow-hidden whitespace-nowrap text-sm">
                        <span title={o.customer || "거래처 미입력"} className="inline-block max-w-[38%] shrink-0 truncate rounded px-1 font-bold text-indigo-800"
                          style={{ backgroundColor: "rgba(167, 139, 250, 0.2)" }}>
                          {o.customer || "거래처 미입력"}
                        </span>
                        <span title={productText} className="min-w-0 flex-1 truncate text-slate-700">{productText}</span>
                      </div>
                      <div className="mt-1 truncate text-[11px] text-slate-400" title={`${o.outbound_date || "-"} → ${o.arrival_date || "-"} ${o.arrival_time || ""}`}>
                        {o.outbound_date || "-"} → {o.arrival_date || "-"}{o.arrival_time ? ` ${o.arrival_time}` : ""}
                      </div>
                    </button>
                    <span className="text-center text-sm font-semibold text-violet-700">
                      {fmt(o.outbound_meter || 0)} M
                    </span>
                    <button type="button" onClick={() => approve(o)} title="출고 완료 처리" aria-label="출고 완료 처리"
                      className="pastel-outline w-9 h-9 rounded-xl inline-flex items-center justify-center">
                      <PastelTruck size={19} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <button onClick={() => setReservationOpen((value) => !value)}
        className={`outbound-pending-trigger w-full sm:w-[340px] h-11 px-3 rounded-xl flex items-center gap-2 text-left no-print ${reservationRows.length > 0 ? "has-pending" : ""}`}>
        <span className="w-6 h-6 flex items-center justify-center shrink-0">
          <PastelCalendar size={20} />
        </span>
        <span className="font-semibold text-slate-700">예약 현황</span>
        <span className="ml-auto text-sm font-bold text-indigo-600">{reservationRows.length}건</span>
        <span className={`text-lg leading-none text-slate-400 transition-transform ${reservationOpen ? "rotate-90" : ""}`}>&gt;</span>
      </button>

      {reservationOpen && (
        <Card className="outbound-pending-panel w-full max-w-2xl overflow-hidden border-violet-200/80 print-card">
          <div className="divide-y divide-violet-100">
            {reservationRows.length === 0 && <div className="px-5 py-9 text-center text-sm text-slate-400">등록된 예약이 없습니다.</div>}
            {reservationRows.map((reservation, index) => {
              const current = currentForKey(reservation.coil_key);
              const reserved = reservedForKey(reservation.coil_key);
              const available = Math.max(0, current - reserved);
              const productText = `${reservation.product_type} · ${reservation.manufacturer} · ${reservation.color_name}${reservation.thickness ? `(${reservation.thickness}T)` : ""}`;
              return (
                <div key={reservation.id} className={`px-4 py-2.5 overflow-hidden ${index % 2 === 0 ? "bg-violet-50/60" : "bg-white"}`}>
                  <div className="grid grid-cols-[minmax(0,1fr)_96px_38px] items-center gap-2 min-w-0">
                    <button type="button" onClick={() => setDetailKey(reservation.coil_key)} className="flex-1 min-w-0 overflow-hidden text-left">
                      <div className="flex items-center gap-2 min-w-0 overflow-hidden whitespace-nowrap text-sm">
                        <span title={reservation.customer} className="inline-block max-w-[38%] shrink-0 truncate rounded px-1 font-bold text-indigo-800"
                          style={{ backgroundColor: "rgba(167, 139, 250, 0.2)" }}>
                          {reservation.customer}
                        </span>
                        <span title={productText} className="min-w-0 flex-1 truncate text-slate-700">{productText}</span>
                      </div>
                      <div className="mt-1 truncate text-[11px] text-slate-400" title={`사용 예정일 ${reservation.planned_date} / 현재 ${fmt(current)} M · 가용 ${fmt(available)} M`}>
                        사용 예정일 {reservation.planned_date} / 현재 {fmt(current)} M · 가용 {fmt(available)} M
                      </div>
                    </button>
                    <span className="text-center text-sm font-semibold text-violet-700">예약 {fmt(reservation.reserved_meter)} M</span>
                    <button type="button" onClick={() => processReservation(reservation)}
                      title="예약 출고 처리" aria-label="예약 출고 처리"
                      className="pastel-outline w-9 h-9 rounded-xl inline-flex items-center justify-center">
                      <PastelTruck size={19} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 하단: 전체 이력 */}
      <div className="border-t border-slate-300/80" />
      <Toolbar q={q} setQ={setQ} placeholder="거래처 · 현장주소 · 색상명 · 코일번호 검색"><DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} /></Toolbar>
      <Card className="overflow-hidden print-card">
        <div className="px-5 py-4 border-b border-slate-100 no-print">
          <h3 className="font-semibold">전체 출고 이력</h3>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500 mt-2">
            <span>전체 <b className="text-slate-800">{all.length}건 · {fmt(allMeters)} M</b></span>
            <span>강판 <b className="text-indigo-700">{steel.length}건 · {fmt(steel.reduce((s, o) => s + Number(o.outbound_meter || 0), 0))} M</b></span>
            <span>징크 <b className="text-violet-700">{zinc.length}건 · {fmt(zinc.reduce((s, o) => s + Number(o.outbound_meter || 0), 0))} M</b></span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>{["출고일", "도착일", "도착시간", "구분", "거래처", "현장주소", "색상명", "출고량", "완료여부", ""].map((h) => <th key={h} className="px-3 py-2.5 text-left font-medium whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {all.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2.5 whitespace-nowrap">{o.outbound_date}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{o.arrival_date}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{o.arrival_time}</td>
                  <td className="px-3 py-2.5">{o.product_type}</td>
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap">{o.customer || "-"}</td>
                  <td className="px-3 py-2.5 text-slate-600 min-w-[220px]">{o.site_address}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{o.color_name || "-"}</td>
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap">{fmt(o.outbound_meter)} M</td>
                  <td className="px-3 py-2.5">{o.is_completed ? <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">완료</span> : <span className="px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-200">미완료</span>}</td>
                  <td className="px-3 py-2.5 no-print whitespace-nowrap">
                    <button onClick={() => startEdit(o)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600"><Pencil size={15} /></button>
                    <button onClick={() => remove(o.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
              {all.length === 0 && <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-400">출고 이력이 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={open} onClose={() => { setOpen(false); setEditId(null); }} title={editId ? "출고 내역 수정" : "출고 등록"} wide="medium">
        <div className="space-y-4">
          {!editId && (
            <div className="-mx-4 sm:-mx-6 -mt-4 sm:-mt-5 mb-5 border-b border-slate-200 px-4 sm:px-6">
              <div className="flex items-center gap-8">
                {[["outbound", "출고 등록"], ["reservation", "예약 등록"]].map(([value, label]) => (
                  <button key={value} type="button" onClick={() => set("registration_type", value)}
                    className={`relative h-14 px-1 text-sm sm:text-base font-bold transition ${form.registration_type === value ? "text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}>
                    {label}
                    {form.registration_type === value && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-600" />}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] gap-4">
            {form.registration_type === "reservation"
              ? <Field label="예약일" required><input type="date" className={inputCls} value={form.reservation_date} onChange={(e) => set("reservation_date", e.target.value)} /></Field>
              : <Field label="출고일" required><input type="date" className={inputCls} value={form.outbound_date} onChange={(e) => set("outbound_date", e.target.value)} /></Field>}
            <div className="relative min-w-0">
              <Field label="거래처" required>
                <input className={inputCls} value={form.customer}
                  onFocus={() => setCustomerMenuOpen(true)}
                  onBlur={() => setTimeout(() => setCustomerMenuOpen(false), 120)}
                  onChange={(e) => {
                    set("customer", e.target.value);
                    setCustomerMenuOpen(true);
                  }}
                  placeholder="직접 입력 또는 등록 거래처 선택" />
              </Field>
              {customerMenuOpen && customerMatches.length > 0 && (
                <div className="absolute z-40 left-0 right-0 top-full mt-1 max-h-48 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                  {customerMatches.map((customer) => (
                    <button type="button" key={customer}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        set("customer", customer);
                        setCustomerMenuOpen(false);
                      }}
                      className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">
                      {customer}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {form.registration_type === "outbound" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="도착일"><input type="date" className={inputCls} value={form.arrival_date} onChange={(e) => set("arrival_date", e.target.value)} /></Field>
              <Field label="도착 시간"><input type="time" className={inputCls} value={form.arrival_time} onChange={(e) => set("arrival_time", e.target.value)} /></Field>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] gap-4">
            <div className="min-w-0">
              <Field label="제품 구분" required><select className={`${inputCls} h-[42px]`} value={form.product_type} onChange={(e) => setForm((f) => ({ ...f, product_type: e.target.value, coil_number: "", manufacturer: "", color_name: "", color_code: "", thickness: "" }))}>{productOptions.map((product) => <option key={product}>{product}</option>)}</select></Field>
            </div>
            <div className="relative min-w-0">
              <Field label="코일 색상" required>
                <div className="flex items-center gap-2">
                  <Swatch name={form.color_name} />
                  <input className={inputCls} value={form.color_name}
                    onFocus={() => setColorMenuOpen(true)}
                    onChange={(e) => {
                      setForm((current) => ({ ...current, color_name: e.target.value, manufacturer: "", color_code: "", thickness: "", coil_number: "" }));
                      setColorMenuOpen(true);
                    }}
                    placeholder="등록된 코일 색상 검색" />
                </div>
              </Field>
              {colorMenuOpen && (
                <div className="absolute z-30 left-8 right-0 top-full mt-1 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                  {colorMatches.map((item) => (
                    <button type="button" key={stockKey(item)} onClick={() => chooseColor(item)}
                      className="w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-indigo-50">
                      <span className="w-6 h-6 rounded-lg border border-slate-200 shrink-0" style={{ background: hexOf(item.color) }} />
                      <span className="font-medium text-sm">{item.color}</span>
                      <span className="ml-auto text-xs text-slate-400">{item.maker} · {item.code || "코드없음"} · {item.thickness}T</span>
                    </button>
                  ))}
                  {colorMatches.length === 0 && <div className="px-3 py-6 text-center text-sm text-slate-400">일치하는 등록 색상이 없습니다.</div>}
                </div>
              )}
            </div>
          </div>
          <div className={`grid grid-cols-1 gap-4 ${form.registration_type === "reservation" ? "md:grid-cols-2" : "md:grid-cols-[minmax(0,0.64fr)_minmax(0,1.36fr)]"}`}>
            <Field label={form.registration_type === "reservation" ? "예약량 M" : "출고량 M"}>
              <div className="relative">
                <input type="text" inputMode="decimal" className={`${inputCls} pr-9`} value={form.outbound_meter}
                  onChange={(e) => set("outbound_meter", e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="선택 입력" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">M</span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">
                {form.registration_type === "reservation"
                  ? "예약량은 선택 입력입니다. 입력하지 않으면 0M으로 등록됩니다."
                  : "출고량은 선택 입력입니다. 입력하지 않으면 0M으로 등록됩니다."}
              </p>
            </Field>
            {form.registration_type === "reservation"
              ? <Field label="사용 예정일"><input type="date" className={inputCls} value={form.planned_date} onChange={(e) => set("planned_date", e.target.value)} /></Field>
              : <Field label="선택 코일 정보">
                  <div className="h-[42px] px-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center text-sm text-slate-600">
                    {selectedColor ? `${selectedColor.maker} · ${selectedColor.code || "코드없음"} · ${selectedColor.thickness}T` : "코일 색상을 선택하면 자동 표시됩니다."}
                  </div>
                </Field>}
          </div>
          {form.registration_type === "reservation" && (
            <Field label="선택 코일 정보">
              <div className="h-[42px] px-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center text-sm text-slate-600">
                {selectedColor ? `${selectedColor.maker} · ${selectedColor.code || "코드없음"} · ${selectedColor.thickness}T` : "코일 색상을 선택하면 자동 표시됩니다."}
              </div>
            </Field>
          )}
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.5fr)_minmax(0,0.5fr)] gap-4">
            <Field label="현장주소"><input className={inputCls} value={form.site_address} onChange={(e) => set("site_address", e.target.value)} placeholder="예: 서울 강남구 역삼로 123 ○○현장" /></Field>
            <Field label="담당자"><input className={inputCls} value={form.manager || ""} onChange={(e) => set("manager", e.target.value)} placeholder="담당자 입력" /></Field>
          </div>
          <Field label="메모"><AutoGrowTextarea className={inputCls} value={form.memo} onChange={(e) => set("memo", e.target.value)}
            placeholder={form.registration_type === "reservation" ? "예약 관련 메모를 입력하세요" : "출고 관련 메모를 입력하세요"} /></Field>
          {form.registration_type === "outbound" && <div>
            <Field label="첨부파일 / 이미지">
              <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); attachFiles(e.dataTransfer.files); }}
                className="min-h-28 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/40 transition">
                <Download size={22} className="text-indigo-400" />
                <span className="mt-2 text-sm font-medium text-slate-600">파일을 끌어놓거나 클릭해 첨부하세요</span>
                <span className="mt-1 text-xs text-slate-400">이미지와 일반 파일을 등록할 수 있습니다.</span>
                <input type="file" multiple className="hidden" onChange={(e) => { attachFiles(e.target.files); e.target.value = ""; }} />
              </label>
            </Field>
            {(form.attachments || []).length > 0 && <div className="mt-2 space-y-2">
              {form.attachments.map((file) => (
                <div key={file.id} className="h-10 px-3 rounded-xl border border-slate-200 bg-white flex items-center gap-2 text-sm">
                  <span className="truncate text-slate-600">{file.name}</span>
                  <span className="ml-auto text-xs text-slate-400">{Math.max(1, Math.round(file.size / 1024))} KB</span>
                  <button type="button" onClick={() => removeAttachment(file.id)} className="p-1 text-slate-400 hover:text-rose-500"><X size={16} /></button>
                </div>
              ))}
            </div>}
          </div>}
        </div>
        <div className="mt-4 p-3 rounded-xl bg-slate-50 flex items-center justify-between text-sm">
          <span className="text-slate-600">{selectedColor ? `${selectedColor.color} 기초재고 기준` : `현재 ${form.product_type} 기초재고 기준`}</span>
          <span className="text-right">
            <strong className="text-slate-700">{fmt(selectedColor ? selectedTotal : availOf(form.product_type))} M</strong>
            {selectedColor && (
              <span className="ml-2 text-xs font-medium text-slate-400">
                A({fmt(selectedZones.A)}) + B({fmt(selectedZones.B)}) + C({fmt(selectedZones.C)})
              </span>
            )}
            {selectedColor && (
              <span className="block mt-1 text-xs font-medium text-violet-600">
                예약 {fmt(selectedReserved)} M · 가용 {fmt(selectedAvailable)} M
              </span>
            )}
          </span>
        </div>
        {form.registration_type === "reservation" && Number(form.outbound_meter) > selectedAvailable && <p className="text-rose-500 text-sm mt-2">예약 예정량이 가용 재고보다 큽니다.</p>}
        {form.registration_type === "outbound" && Number(form.outbound_meter) > (selectedColor ? selectedAvailable : availOf(form.product_type)) && <p className="text-rose-500 text-sm mt-2">출고량이 예약량을 제외한 가용 재고보다 큽니다.</p>}
        <div className="mobile-safe-actions z-10 mt-5 -mx-1 px-1 pt-2 grid grid-cols-2 sm:flex sm:justify-end gap-2">
          <button onClick={() => { setOpen(false); setEditId(null); }} className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600">취소</button>
          <button onClick={submit} className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
            {editId ? "수정 저장" : form.registration_type === "reservation" ? "예약 등록" : "출고 등록"}
          </button>
        </div>
      </Modal>

      <Modal
        open={Boolean(detailKey)}
        onClose={() => setDetailKey("")}
        title="코일 상세정보"
        wide="medium"
        headerActions={detailKey && (
          <div className="flex items-center gap-1">
            <button type="button"
              onClick={() => setDetailRefreshTick((value) => value + 1)}
              className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
              title="최신 재고 다시 계산" aria-label="최신 재고 다시 계산">
              <RotateCcw size={16} />
            </button>
            <button type="button"
              onClick={() => {
                if (!detailEditableOutbound) {
                  appAlert("수정 가능한 출고 대기 내역이 없습니다.", {
                    title: "출고 예정 수정",
                    type: "info",
                  });
                  return;
                }
                setDetailKey("");
                startEdit(detailEditableOutbound);
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
              title="출고 예정 수정" aria-label="출고 예정 수정">
              <Pencil size={16} />
            </button>
          </div>
        )}
      >
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg border border-slate-200" style={{ background: hexOf(detailCatalogItem?.color) }} />
              <div>
                <div className="font-bold text-slate-800">{detailCatalogItem?.color || "코일"}</div>
                <div className="text-xs text-slate-400">
                  {detailCatalogItem ? `${detailCatalogItem.product} · ${detailCatalogItem.maker} · ${detailCatalogItem.code || "코드없음"} · ${detailCatalogItem.thickness}T` : detailKey}
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              ["현재 재고", detailCurrent, "text-slate-800"],
              ["예약 예정", detailReserved, "text-violet-700"],
              ["가용 재고", Math.max(0, detailCurrent - detailReserved), "text-indigo-700"],
            ].map(([label, value, color]) => (
              <div key={label} className="rounded-xl border bg-slate-50 px-2 sm:px-4 py-3 text-center"
                style={{ borderColor: "#c9b6dc" }}>
                <div className="text-[11px] sm:text-xs text-slate-500">{label}</div>
                <div className={`mt-1 text-base sm:text-xl font-extrabold ${color}`}>{fmt(value)} M</div>
              </div>
            ))}
          </div>

          <div>
            <h4 className="font-semibold text-slate-800 mb-2">예약 내역</h4>
            <div className="space-y-2">
              {detailReservations.map((item) => (
                <div key={item.id} className="rounded-xl border border-violet-100 bg-violet-50/50 px-3 py-3 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span title={item.customer} className="min-w-0 flex-1 truncate font-semibold text-indigo-800">{item.customer}</span>
                    <span className="shrink-0 font-bold text-violet-700">{fmt(item.reserved_meter)} M</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">사용 예정일 {item.planned_date}</div>
                  <div className="mt-1 truncate text-xs text-slate-500" title={item.site_address}>현장 {item.site_address}</div>
                  {item.memo && <div className="mt-1 text-xs text-slate-500">메모 {item.memo}</div>}
                </div>
              ))}
              {detailReservations.length === 0 && <div className="rounded-xl bg-slate-50 px-3 py-5 text-center text-sm text-slate-400">예약 내역이 없습니다.</div>}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-800 mb-2">최근 출고 내역</h4>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
              {detailOutbound.map((item) => (
                <div key={item.id}
                  className="grid grid-cols-[76px_minmax(0,1fr)_auto_auto] items-center gap-2 px-3 py-2.5 text-xs sm:text-sm">
                  <span className="text-slate-400 whitespace-nowrap">{item.outbound_date || "-"}</span>
                  <span className="min-w-0 truncate text-slate-700" title={item.customer || "거래처 미입력"}>
                    {item.customer || "거래처 미입력"}
                  </span>
                  <span className="shrink-0 font-semibold text-indigo-700 whitespace-nowrap">
                    {fmt(item.outbound_meter || 0)} M
                  </span>
                  <span
                    title={item.is_completed && item.completed_at ? `완료일 ${item.completed_at}` : "출고 완료 전"}
                    className={`shrink-0 whitespace-nowrap text-[11px] font-medium ${
                      item.is_completed
                        ? "text-emerald-700 underline decoration-emerald-300 underline-offset-4"
                        : "rounded-full bg-amber-50 px-2 py-1 text-amber-700"
                    }`}>
                    {item.is_completed ? "출고 완료" : "출고 대기"}
                  </span>
                </div>
              ))}
              {detailOutbound.length === 0 && <div className="bg-slate-50 px-3 py-5 text-center text-sm text-slate-400">최근 출고 내역이 없습니다.</div>}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(pendingDetail)}
        onClose={() => setPendingDetail(null)}
        title="출고 대기 상세정보"
        wide="medium"
        headerActions={livePendingDetail && (
          <div className="flex items-center gap-1">
            <button type="button"
              onClick={() => setPendingDetail({ ...livePendingDetail })}
              className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
              title="최신 재고 다시 계산" aria-label="최신 재고 다시 계산">
              <RotateCcw size={16} />
            </button>
            <button type="button"
              onClick={() => {
                setPendingDetail(null);
                startEdit(livePendingDetail);
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
              title="출고 예정 수정" aria-label="출고 예정 수정">
              <Pencil size={16} />
            </button>
          </div>
        )}
      >
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl border border-slate-200 shrink-0"
              style={{ background: hexOf(pendingDetailCatalogItem?.color || livePendingDetail?.color_name) }} />
            <div className="min-w-0">
              <div className="font-bold text-slate-800 truncate">{livePendingDetail?.color_name || "코일"}</div>
              <div className="text-xs text-slate-400 truncate">
                {livePendingDetail?.product_type || "-"} · {livePendingDetail?.manufacturer || "-"} · {livePendingDetail?.color_code || "코드없음"} · {livePendingDetail?.thickness || "-"}T
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              ["현재 재고", pendingDetailCurrent, "text-slate-800"],
              ["출고 예정", pendingDetailMeter, "text-violet-700"],
              ["출고 후 예상", pendingDetailAfter, "text-indigo-700"],
            ].map(([label, value, color]) => (
              <div key={label} className="rounded-xl border bg-slate-50 px-2 sm:px-4 py-3 text-center"
                style={{ borderColor: "#c9b6dc" }}>
                <div className="text-[11px] sm:text-xs text-slate-500">{label}</div>
                <div className={`mt-1 text-base sm:text-xl font-extrabold ${color}`}>{fmt(value)} M</div>
              </div>
            ))}
          </div>
          <div>
            <h4 className="font-semibold text-slate-800 mb-2">출고 대기 정보</h4>
            <div className="rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-4 text-sm space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-16 shrink-0">거래처</span>
                <span className="min-w-0 truncate font-semibold text-indigo-800" title={livePendingDetail?.customer}>{livePendingDetail?.customer || "-"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-16 shrink-0">일정</span>
                <span>{livePendingDetail?.outbound_date || "-"} → {livePendingDetail?.arrival_date || "-"}{livePendingDetail?.arrival_time ? ` ${livePendingDetail.arrival_time}` : ""}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs text-slate-400 w-16 shrink-0 pt-0.5">현장</span>
                <span className="min-w-0 break-words">{livePendingDetail?.site_address || "-"}</span>
              </div>
              {livePendingDetail?.manager && <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-16 shrink-0">담당자</span>
                <span>{livePendingDetail.manager}</span>
              </div>}
              {livePendingDetail?.memo && <div className="flex items-start gap-2 border-t border-violet-100 pt-3">
                <span className="text-xs text-slate-400 w-16 shrink-0 pt-0.5">메모</span>
                <span className="min-w-0 break-words text-slate-600">{livePendingDetail.memo}</span>
              </div>}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* =========================================================================
   재고현황
   ========================================================================= */
function Inventory({ ctx }) {
  const { coils, setCoils, outbound } = ctx;
  const [q, setQ] = useState("");
  const [pf, setPf] = useState("전체"); const [sf, setSf] = useState("전체");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState(null);

  const remove = async (id) => {
    if (await appConfirm("정말 삭제하시겠습니까?", { title: "코일 삭제", type: "danger" })) {
      setCoils((l) => l.filter((c) => c.id !== id));
    }
  };

  const rows = coils
    .filter((c) => inRange(c.inbound_date || c.created_at, from, to))
    .filter((c) => (pf === "전체" || c.product_type === pf) && (sf === "전체" || c.status === sf))
    .filter((c) => [c.coil_number, c.manufacturer, c.color_name, c.purchaser].join(" ").toLowerCase().includes(q.toLowerCase()));

  const lastOut = (pt) => outbound.filter((o) => o.product_type === pt && o.is_completed).sort((a, b) => b.outbound_date.localeCompare(a.outbound_date))[0];

  const exportXlsx = () => downloadXlsx(rows.map((c) => {
    const use = c.initial_meter ? (c.total_outbound_meter / c.initial_meter) * 100 : 0;
    return { 코일번호: c.coil_number, 제품구분: c.product_type, 제조사: c.manufacturer, 색상명: c.color_name, 두께: c.thickness, 최초입고M: c.initial_meter, 현재재고M: c.current_meter, 누적출고M: c.total_outbound_meter, 사용률: use.toFixed(1) + "%", 상태: c.status, 매입처: c.purchaser };
  }), "재고현황", "재고현황.xlsx");

  return (
    <div className="space-y-5">
      <div className="h-[108px] flex items-center justify-between gap-3 flex-wrap">
        <div><h2 className="text-2xl font-extrabold tracking-tight">재고현황</h2><p className="text-slate-500 text-sm mt-0.5">현재 남은 코일을 M 기준으로 확인합니다</p></div>
        <div className="flex gap-2"><ExcelBtn onClick={exportXlsx} /></div>
      </div>
      <Toolbar q={q} setQ={setQ}>
        <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <select className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white no-print" value={pf} onChange={(e) => setPf(e.target.value)}><option>전체</option><option>강판</option><option>징크</option></select>
        <select className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white no-print" value={sf} onChange={(e) => setSf(e.target.value)}><option>전체</option><option>정상</option><option>부족</option><option>사용완료</option></select>
      </Toolbar>

      <Card className="overflow-hidden print-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>{["코일번호", "구분", "제조사", "색상", "두께", "최초입고M", "현재재고M", "누적출고M", "사용률", "상태", "매입처", ""].map((h) => <th key={h} className="px-3 py-2.5 text-left font-medium whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((c) => {
                const use = c.initial_meter ? (c.total_outbound_meter / c.initial_meter) * 100 : 0;
                const lo = lastOut(c.product_type);
                return (
                  <React.Fragment key={c.id}>
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-3 py-2.5 whitespace-nowrap font-medium text-indigo-700">{c.coil_number}</td>
                      <td className="px-3 py-2.5">{c.product_type}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{c.manufacturer}</td>
                      <td className="px-3 py-2.5"><Swatch name={c.color_name} /></td>
                      <td className="px-3 py-2.5">{c.thickness}</td>
                      <td className="px-3 py-2.5">{fmt(c.initial_meter)}</td>
                      <td className="px-3 py-2.5 font-bold text-indigo-700">{fmt(c.current_meter)}</td>
                      <td className="px-3 py-2.5 text-slate-500">{fmt(c.total_outbound_meter)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2 min-w-[90px]">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, use)}%` }} /></div>
                          <span className="text-xs text-slate-500 w-9 text-right">{use.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5"><StatusBadge status={c.status} /></td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{c.purchaser}</td>
                      <td className="px-3 py-2.5 no-print">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setExpanded(expanded === c.id ? null : c.id)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">{expanded === c.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>
                          <button onClick={() => remove(c.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                    {expanded === c.id && (
                      <tr><td colSpan={12} className="p-0">
                        <DetailPanel rows={[
                          ["제품 구분", c.product_type], ["제조사", c.manufacturer], ["매입처", c.purchaser || "-"], ["입고일", c.inbound_date || "-"],
                          ["최초 입고 M", fmt(c.initial_meter) + " M"], ["현재 재고 M", fmt(c.current_meter) + " M"], ["누적 출고 M", fmt(c.total_outbound_meter) + " M"],
                          ["잔량률", (100 - use).toFixed(1) + "%"], ["출고 가능 M", fmt(c.current_meter) + " M"],
                          ["최근 출고일", lo?.outbound_date || "-"], ["최근 출고 현장", lo?.site_address || "-"], ["비고", c.memo || "-"],
                        ]} />
                      </td></tr>
                    )}
                  </React.Fragment>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={12} className="px-3 py-8 text-center text-slate-400">재고가 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* =========================================================================
   거래처별 현황 (매입처별 입고 + 현장별 출고)
   ========================================================================= */
function Sales({ ctx }) {
  const { inbound, outbound } = ctx;

  const byPurchaser = useMemo(() => {
    const map = {};
    inbound.forEach((r) => {
      const k = r.purchaser || "(미지정)";
      if (!map[k]) map[k] = { name: k, meter: 0, count: 0, products: new Set() };
      map[k].meter += Number(r.coil_meter) || 0; map[k].count += 1; map[k].products.add(r.product_type);
    });
    return Object.values(map).map((r) => ({ ...r, products: [...r.products].join(", ") })).sort((a, b) => b.meter - a.meter);
  }, [inbound]);

  const bySite = useMemo(() => {
    const map = {};
    outbound.filter((o) => o.is_completed).forEach((o) => {
      const k = o.site_address || "(미지정)";
      if (!map[k]) map[k] = { name: k, meter: 0, count: 0, last: "", products: new Set() };
      map[k].meter += Number(o.outbound_meter) || 0; map[k].count += 1;
      if (o.outbound_date > map[k].last) map[k].last = o.outbound_date; map[k].products.add(o.product_type);
    });
    return Object.values(map).map((r) => ({ ...r, products: [...r.products].join(", ") })).sort((a, b) => b.meter - a.meter);
  }, [outbound]);

  const exportXlsx = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(byPurchaser.map((r) => ({ 매입처: r.name, 제품: r.products, 입고건수: r.count, 총입고M: r.meter }))), "매입처별");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bySite.map((r) => ({ 현장주소: r.name, 제품: r.products, 출고건수: r.count, 총출고M: r.meter, 최근출고일: r.last }))), "현장별");
    XLSX.writeFile(wb, "거래처별_현황.xlsx");
  };

  return (
    <div className="space-y-5">
      <div className="h-[108px] flex items-center justify-between gap-3 flex-wrap">
        <div><h2 className="text-2xl font-extrabold tracking-tight">거래처별 현황</h2><p className="text-slate-500 text-sm mt-0.5">매입처별 입고 · 현장별 출고 (완료 기준) · M 집계</p></div>
        <div className="flex gap-2"><ExcelBtn onClick={exportXlsx} /></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="overflow-hidden print-card">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2"><Factory size={18} className="text-indigo-600" /><h3 className="font-semibold">매입처별 입고 현황</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs"><tr>{["매입처", "제품", "입고건수", "총 입고 M"].map((h) => <th key={h} className="px-3 py-2.5 text-left font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-50">
                {byPurchaser.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2.5 font-medium">{r.name}</td>
                    <td className="px-3 py-2.5 text-slate-500">{r.products}</td>
                    <td className="px-3 py-2.5">{r.count}</td>
                    <td className="px-3 py-2.5 font-bold text-indigo-700">{fmt(r.meter)}</td>
                  </tr>
                ))}
                {byPurchaser.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-400">입고 데이터가 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="overflow-hidden print-card">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2"><MapPin size={18} className="text-violet-600" /><h3 className="font-semibold">현장별 출고 현황</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs"><tr>{["현장주소", "제품", "출고건수", "총 출고 M", "최근출고일"].map((h) => <th key={h} className="px-3 py-2.5 text-left font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-50">
                {bySite.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2.5 max-w-[240px]">{r.name}</td>
                    <td className="px-3 py-2.5 text-slate-500">{r.products}</td>
                    <td className="px-3 py-2.5">{r.count}</td>
                    <td className="px-3 py-2.5 font-bold text-violet-700">{fmt(r.meter)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{r.last}</td>
                  </tr>
                ))}
                {bySite.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">완료된 출고 데이터가 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* =========================================================================
   색상표
   ========================================================================= */
function Colors({ ctx }) {
  const { inbound, setInbound, outbound, setOutbound, coils, setCoils } = ctx;
  const [q, setQ] = useState(""); const [pf, setPf] = useState("전체");
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const rows = COLOR_MASTER.filter((c) => (pf === "전체" || c.product === pf) && [c.product, c.maker, c.code, c.color, c.thickness].join(" ").toLowerCase().includes(q.toLowerCase()));

  const relatedInbound = selected ? inbound.filter((r) =>
    r.product_type === selected.product && r.manufacturer === selected.maker &&
    r.color_name === selected.color && String(r.thickness) === String(selected.thickness)
  ) : [];
  const relatedCoils = selected ? coils.filter((c) =>
    c.product_type === selected.product && c.manufacturer === selected.maker &&
    c.color_name === selected.color && String(c.thickness) === String(selected.thickness)
  ) : [];
  const relatedOutbound = selected ? outbound.filter((o) => o.product_type === selected.product) : [];
  const currentMeter = relatedCoils.reduce((sum, c) => sum + (Number(c.current_meter) || 0), 0);

  const removeInbound = async (r) => {
    if (!await appConfirm("선택한 입고 내역을 삭제하시겠습니까?", { title: "입고 내역 삭제", type: "danger" })) return;
    setInbound((list) => list.filter((x) => x.id !== r.id));
    setCoils((list) => list.filter((c) => c.id !== r.coil_id && c.coil_number !== r.coil_number));
  };
  const removeOutbound = async (o) => {
    if (!await appConfirm("선택한 출고 내역을 삭제하시겠습니까?", { title: "출고 내역 삭제", type: "danger" })) return;
    setOutbound((list) => list.filter((x) => x.id !== o.id));
  };
  const saveEditing = () => {
    if (!editing) return;
    if (editing.type === "inbound") {
      const meter = Number(editing.data.coil_meter) || 0;
      if (!editing.data.inbound_date || !editing.data.manufacturer || !editing.data.color_name || !editing.data.thickness || meter <= 0) {
        appAlert("*필수입력을 작성해주세요", { title: "필수입력 안내", type: "warning" });
        return;
      }
      setInbound((list) => list.map((r) => r.id === editing.data.id ? { ...editing.data, coil_meter: meter, updated_at: todayStr() } : r));
      setCoils((list) => list.map((c) => c.id === editing.data.coil_id || c.coil_number === editing.data.coil_number ? {
        ...c, manufacturer: editing.data.manufacturer, color_name: editing.data.color_name, thickness: editing.data.thickness,
        purchaser: editing.data.purchaser, memo: editing.data.memo, inbound_date: editing.data.inbound_date,
        initial_meter: meter, current_meter: Math.max(0, meter - (c.total_outbound_meter || 0)), updated_at: todayStr(),
      } : c));
    } else {
      const meter = Number(editing.data.outbound_meter) || 0;
      if (!editing.data.outbound_date || !editing.data.site_address || meter <= 0) {
        appAlert("*필수입력을 작성해주세요", { title: "필수입력 안내", type: "warning" });
        return;
      }
      setOutbound((list) => list.map((o) => o.id === editing.data.id ? { ...editing.data, outbound_meter: meter, updated_at: todayStr() } : o));
    }
    setEditing(null);
  };

  return (
    <div className="space-y-5">
      <div className="h-[108px] flex items-center justify-between gap-3 flex-wrap">
        <div><h2 className="text-2xl font-extrabold tracking-tight">색상표</h2><p className="text-slate-500 text-sm mt-0.5">색상을 클릭하면 관련 입고·출고·재고 현황을 확인하고 수정할 수 있습니다</p></div>
      </div>
      <Toolbar q={q} setQ={setQ}>
        <select className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white no-print" value={pf} onChange={(e) => setPf(e.target.value)}><option>전체</option><option>강판</option><option>징크</option></select>
      </Toolbar>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {rows.map((c, i) => (
          <button key={i} onClick={() => setSelected(c)} className="text-left group">
          <Card className="overflow-hidden transition group-hover:-translate-y-1 group-hover:shadow-lg">
            <div className="h-20 relative" style={{ background: hexOf(c.color) }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-white/20 flex items-center justify-center text-xs font-bold text-white drop-shadow">현황 보기</div>
            </div>
            <div className="p-3">
              <div className="font-semibold text-slate-800 text-sm">{c.color}</div>
              <div className="text-xs text-slate-500 mt-0.5">{c.product} · {c.thickness}T</div>
              <div className="text-xs text-slate-400">{c.maker} · {c.code || "코드없음"}</div>
            </div>
          </Card>
          </button>
        ))}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.color} · ${selected.product} ${selected.thickness}T` : ""} wide>
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3 text-center"><div className="text-xs text-slate-400">입고 건수</div><div className="text-xl font-extrabold">{relatedInbound.length}</div></Card>
              <Card className="p-3 text-center"><div className="text-xs text-slate-400">현재 재고</div><div className="text-xl font-extrabold text-indigo-600">{fmt(currentMeter)} M</div></Card>
              <Card className="p-3 text-center"><div className="text-xs text-slate-400">관련 출고</div><div className="text-xl font-extrabold">{relatedOutbound.length}</div></Card>
            </div>

            <div>
              <h4 className="font-bold text-sm mb-2">입고 내역</h4>
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50"><tr>{["입고일","코일번호","제조사","M","매입처",""].map((h) => <th key={h} className="px-2 py-2 text-left whitespace-nowrap">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {relatedInbound.map((r) => <tr key={r.id}>
                      <td className="px-2 py-2 whitespace-nowrap">{r.inbound_date}</td><td className="px-2 py-2 font-semibold text-indigo-600 whitespace-nowrap">{r.coil_number}</td>
                      <td className="px-2 py-2">{r.manufacturer}</td><td className="px-2 py-2">{fmt(r.coil_meter)}</td><td className="px-2 py-2">{r.purchaser || "-"}</td>
                      <td className="px-2 py-2 whitespace-nowrap"><button onClick={() => setEditing({ type: "inbound", data: { ...r } })} className="p-1 text-indigo-600"><Pencil size={14} /></button><button onClick={() => removeInbound(r)} className="p-1 text-rose-500"><Trash2 size={14} /></button></td>
                    </tr>)}
                    {!relatedInbound.length && <tr><td colSpan={6} className="p-5 text-center text-slate-400">관련 입고 내역이 없습니다.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-sm mb-2">제품 구분 관련 출고 내역</h4>
              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-56">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0"><tr>{["출고일","현장","M","상태",""].map((h) => <th key={h} className="px-2 py-2 text-left whitespace-nowrap">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {relatedOutbound.map((o) => <tr key={o.id}>
                      <td className="px-2 py-2 whitespace-nowrap">{o.outbound_date}</td><td className="px-2 py-2 max-w-[220px] truncate">{o.site_address}</td>
                      <td className="px-2 py-2">{fmt(o.outbound_meter)}</td><td className="px-2 py-2">{o.is_completed ? "완료" : "미완료"}</td>
                      <td className="px-2 py-2 whitespace-nowrap"><button onClick={() => setEditing({ type: "outbound", data: { ...o } })} className="p-1 text-indigo-600"><Pencil size={14} /></button><button onClick={() => removeOutbound(o)} className="p-1 text-rose-500"><Trash2 size={14} /></button></td>
                    </tr>)}
                    {!relatedOutbound.length && <tr><td colSpan={5} className="p-5 text-center text-slate-400">관련 출고 내역이 없습니다.</td></tr>}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">출고 데이터에는 색상값이 없어 같은 제품 구분의 출고 내역을 표시합니다.</p>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.type === "inbound" ? "입고 내역 수정" : "출고 내역 수정"}>
        {editing && (
          <div className="space-y-3">
            {editing.type === "inbound" ? <>
              <Field label="입고일" required><input type="date" className={inputCls} value={editing.data.inbound_date} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, inbound_date: e.target.value } })} /></Field>
              <Field label="제조사" required><input className={inputCls} value={editing.data.manufacturer} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, manufacturer: e.target.value } })} /></Field>
              <Field label="색상" required><input className={inputCls} value={editing.data.color_name} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, color_name: e.target.value } })} /></Field>
              <div className="grid grid-cols-2 gap-3"><Field label="두께" required><input className={inputCls} value={editing.data.thickness} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, thickness: e.target.value } })} /></Field><Field label="코일 M" required><input type="number" className={inputCls} value={editing.data.coil_meter} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, coil_meter: e.target.value } })} /></Field></div>
              <Field label="매입처"><input className={inputCls} value={editing.data.purchaser || ""} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, purchaser: e.target.value } })} /></Field>
            </> : <>
              <Field label="출고일" required><input type="date" className={inputCls} value={editing.data.outbound_date} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, outbound_date: e.target.value } })} /></Field>
              <Field label="현장주소" required><input className={inputCls} value={editing.data.site_address} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, site_address: e.target.value } })} /></Field>
              <Field label="출고 M" required><input type="number" className={inputCls} value={editing.data.outbound_meter} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, outbound_meter: e.target.value } })} /></Field>
              <Field label="비고"><input className={inputCls} value={editing.data.memo || ""} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, memo: e.target.value } })} /></Field>
            </>}
            <div className="flex justify-end gap-2 pt-2"><button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl border text-sm">취소</button><button onClick={saveEditing} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold">저장</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
