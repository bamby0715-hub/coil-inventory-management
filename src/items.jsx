import React, { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet, ChevronDown, ChevronRight, Plus, History } from "lucide-react";

/* =========================================================================
   품목관리 (items) — 별도 컬렉션, 모든 담당자 공유 / 본인 등록분만 수정·삭제
   - 제품ID: 대분류 접두어(A~L) + 순번 자동 (절곡·기타절곡 = J 공유)
   - 가격: 매입가 · 공장가 · 온라인가 · 쿠팡 · 네이버  (업체방문 = 공장가 기준)
   - 기초일 · 기초재고량
   - 품절: 토글 + 품절일/사유 + 제품별 이력(타임라인)
   - 색상은 여기서 다루지 않음 (거래명세표 단계)
   ========================================================================= */

const FIREBASE_SDK_VERSION = "10.12.5";
const importExternal = (url) => new Function("url", "return import(url)")(url);
const todayStr = () => { const d = new Date(); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const inputCls = "w-full min-w-0 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 bg-white";

// 대분류 → 제품ID 접두어 (업로드 파일 기준)
export const DEFAULT_PREFIX = {
  "강판": "A", "징크": "B", "메탈사이딩": "C", "부자재": "D", "강판물받이": "E",
  "징크물받이": "F", "피스": "G", "볼트": "H", "실리콘": "I",
  "절곡": "J", "기타절곡": "J", "기타": "K", "AL": "L",
};
export const DEFAULT_CATEGORIES = Object.keys(DEFAULT_PREFIX);
export const COMMON_UNITS = ["M", "EA", "단", "본", "R/L", "BOX", "SET", "봉"];
const COIL_CATEGORIES = ["강판", "징크", "절곡", "기타절곡", "AL"]; // 명세표에서 코일색상이 뜨는 대분류

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

const itemsCol = (fs, db) => fs.collection(db, "items");
const itemDoc = (fs, db, id) => fs.doc(db, "items", id);
const itemMetaDoc = (fs, db) => fs.doc(db, "settings", "itemMeta");

// ---------- 실시간 구독 ----------
export function subscribeItems(onData, onError) {
  let unsub = () => {};
  getDataRuntime().then(({ db, fsModule }) => {
    const q = fsModule.query(itemsCol(fsModule, db), fsModule.orderBy("id", "asc"));
    unsub = fsModule.onSnapshot(q, (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), (e) => onError && onError(e));
  }).catch((e) => onError && onError(e));
  return () => unsub();
}
export function subscribeItemMeta(onData, onError) {
  let unsub = () => {};
  getDataRuntime().then(({ db, fsModule }) => {
    unsub = fsModule.onSnapshot(itemMetaDoc(fsModule, db), (snap) => {
      const data = snap.exists() ? snap.data() : null;
      onData({
        prefixes: { ...DEFAULT_PREFIX, ...((data && data.prefixes) || {}) },
        categories: (data && Array.isArray(data.categories) && data.categories.length) ? data.categories : DEFAULT_CATEGORIES,
        units: (data && Array.isArray(data.units) && data.units.length) ? data.units : COMMON_UNITS,
      });
    }, (e) => onError && onError(e));
  }).catch((e) => onError && onError(e));
  return () => unsub();
}

export function isCoilCategory(category) { return COIL_CATEGORIES.includes(category); }

// 대분류에 접두어가 없으면 안 쓰인 알파벳을 새로 배정해 저장
async function ensurePrefix(category, prefixes) {
  if (prefixes[category]) return prefixes[category];
  const used = new Set(Object.values(prefixes));
  let letter = "M";
  for (let i = 77; i <= 90; i++) { const ch = String.fromCharCode(i); if (!used.has(ch)) { letter = ch; break; } }
  const { db, fsModule } = await getDataRuntime();
  await fsModule.setDoc(itemMetaDoc(fsModule, db), { prefixes: { ...prefixes, [category]: letter } }, { merge: true });
  return letter;
}

// 대분류 기준 다음 제품ID (기존 항목 중 같은 접두어의 최대 순번 +1)
export function nextItemCode(category, prefixes, items) {
  const letter = prefixes[category] || "Z";
  let max = 0;
  items.forEach((it) => {
    const m = String(it.id || "").match(/^([A-Za-z]+)(\d+)$/);
    if (m && m[1] === letter) max = Math.max(max, Number(m[2]));
  });
  return letter + String(max + 1).padStart(3, "0");
}

export async function createItem(data, prefixes, items) {
  const { db, fsModule } = await getDataRuntime();
  const letter = await ensurePrefix(data.category, prefixes);
  const code = nextItemCode(data.category, { ...prefixes, [data.category]: letter }, items);
  await fsModule.setDoc(itemDoc(fsModule, db, code), {
    ...data, id: code, updatedAt: fsModule.serverTimestamp(),
  });
  return code;
}

export async function updateItem(id, data) {
  const { db, fsModule } = await getDataRuntime();
  await fsModule.updateDoc(itemDoc(fsModule, db, id), { ...data, updatedAt: fsModule.serverTimestamp() });
}

export async function deleteItem(id) {
  const { db, fsModule } = await getDataRuntime();
  await fsModule.deleteDoc(itemDoc(fsModule, db, id));
}

// 품절/판매재개 — 상태 변경 + 이력(history)에 기록
export async function setSoldOut(item, { soldOut, date, reason, by }) {
  const { db, fsModule } = await getDataRuntime();
  const history = Array.isArray(item.history) ? item.history.slice() : (Array.isArray(item.soldOutLog) ? item.soldOutLog.slice() : []);
  history.unshift({
    type: soldOut ? "품절" : "판매재개",
    date: date || todayStr(),
    reason: reason || "",
    by: by || "",
    at: new Date().toISOString(),
  });
  await fsModule.updateDoc(itemDoc(fsModule, db, item.id), {
    soldOut: Boolean(soldOut),
    soldOutDate: soldOut ? (date || todayStr()) : "",
    soldOutReason: soldOut ? (reason || "") : "",
    history,
    updatedAt: fsModule.serverTimestamp(),
  });
}

// 가격 등 수정 시 변경 이력을 history 앞에 추가하여 저장
export async function updateItemWithHistory(id, data, changeEntries, prevHistory) {
  const { db, fsModule } = await getDataRuntime();
  const history = [...(changeEntries || []), ...(Array.isArray(prevHistory) ? prevHistory : [])];
  await fsModule.updateDoc(itemDoc(fsModule, db, id), { ...data, history, updatedAt: fsModule.serverTimestamp() });
}

// 엑셀 업로드 — 파일의 제품ID 그대로 사용, 이미 있는 ID/누락은 사유와 함께 건너뜀
export async function bulkCreateItems(rows, existing, owner = {}) {
  const { db, fsModule } = await getDataRuntime();
  const existingIds = new Set(existing.map((i) => i.id));
  const seen = new Set();
  let added = 0;
  const skipped = [];
  for (const r of rows) {
    const id = String(r.id || "").trim();
    if (!id) { skipped.push({ id: "(빈칸)", name: r.name || "", reason: "제품ID 없음" }); continue; }
    if (existingIds.has(id)) { skipped.push({ id, name: r.name || "", reason: "이미 등록됨" }); continue; }
    if (seen.has(id)) { skipped.push({ id, name: r.name || "", reason: "파일 내 ID 중복" }); continue; }
    seen.add(id); existingIds.add(id);
    await fsModule.setDoc(itemDoc(fsModule, db, id), {
      ...r, id, ...owner, soldOut: false, history: [], updatedAt: fsModule.serverTimestamp(),
    });
    added++;
  }
  return { added, skipped };
}

/* ---------- 엑셀 양식 / 파싱 / 다운로드 ---------- */
const EXCEL_HEADERS = ["제품ID", "대분류", "품목명", "규격", "상세정보", "단위", "매입가", "공장가", "온라인가", "쿠팡", "네이버", "기초일", "기초재고량"];
const num = (v) => Number(String(v ?? "").replace(/[^0-9.-]/g, "")) || 0;

export function downloadItemTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([EXCEL_HEADERS, ["A001", "강판", "징크형", "0.45*914*750", "", "M", 6800, 8000, 10000, "", "", todayStr(), 0]]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "품목양식");
  XLSX.writeFile(wb, "품목_업로드양식.xlsx");
}

export async function parseItemExcel(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
  return json.map((row) => ({
    id: String(row["제품ID"] ?? "").trim(),
    category: String(row["대분류"] ?? "").trim(),
    name: String(row["품목명"] ?? "").trim(),
    spec: String(row["규격"] ?? "").trim(),
    detail: String(row["상세정보"] ?? "").trim(),
    unit: String(row["단위"] ?? "").trim(),
    buyPrice: num(row["매입가"]),
    factoryPrice: num(row["공장가"]),
    onlinePrice: num(row["온라인가"]),
    coupangPrice: num(row["쿠팡"]),
    naverPrice: num(row["네이버"]),
    baseDate: String(row["기초일"] ?? "").trim() || todayStr(),
    baseQty: num(row["기초재고량"]),
  })).filter((r) => r.id);
}

export function downloadItems(items, fileName = "품목목록.xlsx") {
  const rows = items.map((i) => ({
    제품ID: i.id, 대분류: i.category, 품목명: i.name, 규격: i.spec, 상세정보: i.detail, 단위: i.unit,
    매입가: i.buyPrice, 공장가: i.factoryPrice, 온라인가: i.onlinePrice, 쿠팡: i.coupangPrice, 네이버: i.naverPrice,
    기초일: i.baseDate, 기초재고량: i.baseQty, 품절: i.soldOut ? "품절" : "정상", 품절일: i.soldOutDate || "", 품절사유: i.soldOutReason || "",
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "품목");
  XLSX.writeFile(wb, fileName);
}

/* =========================================================================
   UI
   ========================================================================= */
function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}{required && <span className="text-rose-500"> *</span>}</span>
      {children}
    </label>
  );
}
function VModal({ open, onClose, title, children, footer, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto bg-slate-900/50 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? "max-w-3xl" : "max-w-md"} my-2 sm:my-4 max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] overflow-hidden flex flex-col`}>
        <div className="shrink-0 bg-white flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100">
          <h3 className="min-w-0 text-base sm:text-lg font-semibold text-slate-800 truncate">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">✕</button>
        </div>
        <div className="min-h-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4 sm:py-5">{children}</div>
        {footer && <div className="shrink-0 bg-white border-t border-slate-100 px-4 sm:px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

const wonFmt = (n) => (Number(n) || 0).toLocaleString("ko-KR");
const emptyItem = (cats) => ({
  category: (cats && cats[0]) || "강판", name: "", spec: "", detail: "", unit: "EA",
  buyPrice: 0, factoryPrice: 0, onlinePrice: 0, coupangPrice: 0, naverPrice: 0,
  baseDate: todayStr(), baseQty: 0,
});

// 천단위 콤마 입력 헬퍼
function MoneyInput({ value, onChange }) {
  const shown = (value === "" || value === null || value === undefined) ? "" : (Number(String(value).replace(/[^0-9-]/g, "")) || 0).toLocaleString("ko-KR");
  return <input type="text" inputMode="numeric" className={inputCls} value={shown} onChange={(e) => onChange(e.target.value.replace(/[^0-9-]/g, ""))} />;
}

function Toggle({ on, onClick, title }) {
  return (
    <button type="button" onClick={onClick} title={title} aria-pressed={on}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${on ? "bg-rose-500" : "bg-slate-200"}`}>
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${on ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

export function ItemManagement({ isMaster, myUid = "", myName = "" }) {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ prefixes: DEFAULT_PREFIX, categories: DEFAULT_CATEGORIES, units: COMMON_UNITS });
  const [loading, setLoading] = useState(true);
  const [topErr, setTopErr] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("전체");

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editOrig, setEditOrig] = useState(null);
  const [form, setForm] = useState(emptyItem(DEFAULT_CATEGORIES));
  const [formErr, setFormErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [skippedList, setSkippedList] = useState([]);

  const [excelOpen, setExcelOpen] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [soldOutTarget, setSoldOutTarget] = useState(null); // 품절 처리할 item
  const [soDate, setSoDate] = useState(todayStr());
  const [soReason, setSoReason] = useState("");
  const [logItem, setLogItem] = useState(null); // 이력 볼 item
  const [logTab, setLogTab] = useState("전체");
  const fileRef = useRef();

  useEffect(() => {
    const u1 = subscribeItems((list) => { setItems(list); setLoading(false); }, (e) => { setTopErr(e?.message || "불러오기 실패"); setLoading(false); });
    const u2 = subscribeItemMeta((m) => setMeta(m), () => {});
    return () => { u1(); u2(); };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (catFilter !== "전체" && it.category !== catFilter) return false;
      if (!q) return true;
      return [it.id, it.name, it.spec, it.detail, it.category].some((s) => String(s || "").toLowerCase().includes(q));
    });
  }, [items, search, catFilter]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  // 품목 수정·품절 = 승인된 모든 담당자 가능 / 품목 삭제 = 마스터만 가능
  const canDelete = isMaster;

  const openCreate = () => { setEditId(null); setEditOrig(null); setForm(emptyItem(meta.categories)); setFormErr(""); setFormOpen(true); };
  const openEdit = (it) => { setEditId(it.id); setEditOrig(it); setForm({ ...emptyItem(meta.categories), ...it }); setFormErr(""); setFormOpen(true); };

  const trySave = async () => {
    setFormErr("");
    if (!form.category.trim()) return setFormErr("대분류를 입력/선택해주세요.");
    if (!form.name.trim()) return setFormErr("품목명을 입력해주세요.");
    if (!form.unit.trim()) return setFormErr("단위를 입력해주세요.");
    setBusy(true);
    const payload = {
      category: form.category.trim(), name: form.name.trim(), spec: form.spec.trim(), detail: form.detail.trim(),
      unit: form.unit.trim(), buyPrice: Number(form.buyPrice) || 0, factoryPrice: Number(form.factoryPrice) || 0,
      onlinePrice: Number(form.onlinePrice) || 0, coupangPrice: Number(form.coupangPrice) || 0, naverPrice: Number(form.naverPrice) || 0,
      baseDate: form.baseDate || todayStr(), baseQty: Number(form.baseQty) || 0,
    };
    try {
      if (editId) {
        // 가격 변경 이력 생성
        const priceFields = [["매입가", "buyPrice"], ["공장가", "factoryPrice"], ["온라인가", "onlinePrice"], ["쿠팡", "coupangPrice"], ["네이버", "naverPrice"]];
        const now = new Date().toISOString();
        const changes = priceFields
          .filter(([, key]) => (Number(editOrig?.[key]) || 0) !== (Number(payload[key]) || 0))
          .map(([label, key]) => ({ type: "가격변경", field: label, from: Number(editOrig?.[key]) || 0, to: Number(payload[key]) || 0, by: myName, date: todayStr(), at: now }));
        const prevHistory = editOrig?.history || editOrig?.soldOutLog || [];
        await updateItemWithHistory(editId, payload, changes, prevHistory);
      } else {
        await createItem({ ...payload, ownerUid: myUid, ownerName: myName, soldOut: false, history: [] }, meta.prefixes, items);
      }
      setFormOpen(false);
    } catch (e) { setFormErr(e?.message || "저장 실패"); }
    setBusy(false);
  };

  const removeItem = (it) => {
    if (!isMaster) { setTopErr("품목 삭제는 마스터만 가능합니다."); return; }
    setConfirmState({
      message: `'${it.name}' (${it.id}) 품목을 삭제하시겠습니까?`,
      onYes: async () => { setConfirmState(null); try { await deleteItem(it.id); } catch (e) { setTopErr(e?.message || "삭제 실패"); } },
    });
  };

  const onToggleSoldOut = (it) => {
    if (it.soldOut) {
      // 판매재개
      setConfirmState({
        message: `'${it.name}' 품절을 해제하고 판매를 재개하시겠습니까?`,
        onYes: async () => { setConfirmState(null); try { await setSoldOut(it, { soldOut: false, date: todayStr(), by: myName }); } catch (e) { setTopErr(e?.message || "실패"); } },
      });
    } else {
      setSoldOutTarget(it); setSoDate(todayStr()); setSoReason("");
    }
  };
  const confirmSoldOut = async () => {
    if (!soReason.trim()) return;
    try { await setSoldOut(soldOutTarget, { soldOut: true, date: soDate, reason: soReason.trim(), by: myName }); setSoldOutTarget(null); }
    catch (e) { setTopErr(e?.message || "실패"); }
  };

  const onUpload = async (file) => {
    if (!file) return;
    setUploadMsg("업로드 중..."); setSkippedList([]);
    try {
      const rows = await parseItemExcel(file);
      const { added, skipped } = await bulkCreateItems(rows, items, { ownerUid: myUid, ownerName: myName });
      setUploadMsg(`${added}건 추가${skipped.length ? `, ${skipped.length}건 제외` : ""} 완료`);
      setSkippedList(skipped);
    } catch (e) { setUploadMsg("업로드 실패: " + (e?.message || "")); }
    if (fileRef.current) fileRef.current.value = "";
  };

  const btn = "h-10 px-3 rounded-xl border text-xs font-bold inline-flex items-center justify-center transition whitespace-nowrap";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">품목관리</h1>
          <p className="text-sm text-slate-500 mt-0.5">품목·가격·기초재고를 관리하고 품절을 처리합니다. (색상은 거래명세표 단계)</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <button onClick={() => setExcelOpen((o) => !o)} className={`${btn} border-slate-200 bg-white text-slate-600 hover:bg-slate-50 gap-1.5`}>
              <FileSpreadsheet size={15} /> 엑셀 <ChevronDown size={14} />
            </button>
            {excelOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setExcelOpen(false)} />
                <div className="absolute right-0 mt-1 z-20 w-40 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                  <button onClick={() => { setExcelOpen(false); downloadItemTemplate(); }} className="block w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50">엑셀 양식</button>
                  <button onClick={() => { setExcelOpen(false); fileRef.current?.click(); }} className="block w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 border-t border-slate-100">엑셀 업로드</button>
                  <button onClick={() => { setExcelOpen(false); downloadItems(filtered); }} className="block w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 border-t border-slate-100">엑셀 다운로드</button>
                </div>
              </>
            )}
          </div>
          <button onClick={openCreate} className={`${btn} border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700`}>+ 품목 등록</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => onUpload(e.target.files?.[0])} />
        </div>
      </div>

      {uploadMsg && <div className="text-sm rounded-xl bg-indigo-50 text-indigo-700 px-4 py-2.5">{uploadMsg}</div>}
      {skippedList.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-amber-700">제외된 {skippedList.length}건 (등록 안 됨)</span>
            <button onClick={() => setSkippedList([])} className="text-xs text-amber-600 hover:text-amber-800">닫기</button>
          </div>
          <ul className="space-y-0.5 text-amber-800/90 max-h-44 overflow-auto">
            {skippedList.map((s, i) => (
              <li key={i}>· <span className="font-mono">{s.id}</span>{s.name ? ` (${s.name})` : ""} — {s.reason}</li>
            ))}
          </ul>
        </div>
      )}
      {topErr && <div className="text-sm rounded-xl bg-rose-50 text-rose-600 px-4 py-2.5">{topErr}</div>}

      <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-0">
        <div className="relative flex-1 lg:mr-1.5">
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="제품ID · 품목명 · 규격 · 상세정보 검색"
            className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-3 pr-3 text-sm outline-none focus:border-indigo-400" />
        </div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
          <option value="전체">대분류 전체</option>
          {meta.categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 text-center text-slate-400 py-12">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 text-center text-slate-400 py-12">등록된 품목이 없습니다. 엑셀 업로드 또는 품목 등록으로 추가하세요.</div>
      ) : (
        <div className="space-y-4">
          {(() => {
            const order = meta.categories;
            const map = {};
            filtered.forEach((it) => { (map[it.category] = map[it.category] || []).push(it); });
            const cats = [...order.filter((c) => map[c]), ...Object.keys(map).filter((c) => !order.includes(c))];
            return cats.map((cat) => (
              <div key={cat} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                  <h4 className="font-bold text-slate-800">{cat}</h4>
                  <span className="text-xs text-slate-400">{map[cat].length}건</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed text-xs sm:text-sm min-w-[1000px]">
                    <colgroup>
                      <col className="w-[80px]" />
                      <col className="w-[260px]" />
                      <col className="w-[150px]" />
                      <col className="w-[56px]" />
                      <col className="w-[84px]" />
                      <col className="w-[84px]" />
                      <col className="w-[84px]" />
                      <col className="w-[70px]" />
                      <col className="w-[70px]" />
                      <col className="w-[84px]" />
                      <col className="w-[64px]" />
                      <col className="w-[120px]" />
                    </colgroup>
                    <thead>
                      <tr className="bg-slate-50 text-slate-500">
                        <th className="text-center px-3 py-2.5 font-semibold">제품ID</th>
                        <th className="text-left px-3 py-2.5 font-semibold">품목명</th>
                        <th className="text-left px-3 py-2.5 font-semibold">규격</th>
                        <th className="text-center px-2 py-2.5 font-semibold">단위</th>
                        <th className="text-right px-3 py-2.5 font-semibold">매입가</th>
                        <th className="text-right px-3 py-2.5 font-semibold">공장가</th>
                        <th className="text-right px-3 py-2.5 font-semibold">온라인</th>
                        <th className="text-right px-2 py-2.5 font-semibold">쿠팡</th>
                        <th className="text-right px-2 py-2.5 font-semibold">네이버</th>
                        <th className="text-right px-3 py-2.5 font-semibold">기초재고</th>
                        <th className="text-center px-2 py-2.5 font-semibold">품절</th>
                        <th className="text-center px-3 py-2.5 font-semibold">작업</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {map[cat].map((it) => (
                        <tr key={it.id} className={`hover:bg-slate-50/60 ${it.soldOut ? "bg-rose-50/40" : ""}`}>
                          <td className="px-3 py-2.5 text-center font-mono text-slate-500">{it.id}</td>
                          <td className="px-3 py-2.5 font-semibold text-slate-700 truncate" title={it.name}>{it.name}{it.soldOut && <span className="ml-1 text-[10px] text-rose-500">품절</span>}</td>
                          <td className="px-3 py-2.5 text-slate-500 truncate" title={it.spec}>{it.spec}</td>
                          <td className="px-2 py-2.5 text-center text-slate-500">{it.unit}</td>
                          <td className="px-3 py-2.5 text-right text-slate-500">{wonFmt(it.buyPrice)}</td>
                          <td className="px-3 py-2.5 text-right text-slate-700">{wonFmt(it.factoryPrice)}</td>
                          <td className="px-3 py-2.5 text-right text-slate-700">{wonFmt(it.onlinePrice)}</td>
                          <td className="px-2 py-2.5 text-right text-slate-700">{wonFmt(it.coupangPrice)}</td>
                          <td className="px-2 py-2.5 text-right text-slate-700">{wonFmt(it.naverPrice)}</td>
                          <td className="px-3 py-2.5 text-right text-slate-600">{wonFmt(it.baseQty)}</td>
                          <td className="px-2 py-2.5">
                            <div className="flex items-center justify-center gap-1.5">
                              <Toggle on={Boolean(it.soldOut)} onClick={() => onToggleSoldOut(it)} title={it.soldOut ? "판매재개" : "품절 처리"} />
                              {((it.history || it.soldOutLog || []).length > 0) && (
                                <button onClick={() => setLogItem(it)} title="변경 이력" className="text-slate-400 hover:text-indigo-600"><History size={14} /></button>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            <button onClick={() => openEdit(it)} className="text-xs px-2 py-1 rounded-lg border border-slate-200 hover:bg-white mr-1">수정</button>
                            {canDelete && (
                              <button onClick={() => removeItem(it)} className="text-xs px-2 py-1 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50">삭제</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      {/* 등록/수정 모달 */}
      <VModal open={formOpen} onClose={() => setFormOpen(false)} wide
        title={editId ? `품목 수정 (${editId})` : "품목 등록"}
        footer={
          <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2">
            <button onClick={() => setFormOpen(false)} className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600">취소</button>
            <button onClick={trySave} disabled={busy} className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">{busy ? "저장 중..." : (editId ? "수정 저장" : "등록")}</button>
          </div>
        }>
        <div className="space-y-4">
          {!editId && <p className="text-xs text-slate-400">제품ID는 대분류에 따라 자동 생성됩니다. (예: 강판 → A0xx)</p>}
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="대분류" required>
              <input className={inputCls} list="item-cats" value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="선택 또는 새 대분류 입력" />
              <datalist id="item-cats">{meta.categories.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="품목명" required><input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="규격"><input className={inputCls} value={form.spec} onChange={(e) => set("spec", e.target.value)} placeholder="0.45*914*750" /></Field>
            <Field label="단위" required>
              <input className={inputCls} list="item-units" value={form.unit} onChange={(e) => set("unit", e.target.value)} />
              <datalist id="item-units">{meta.units.map((u) => <option key={u} value={u} />)}</datalist>
            </Field>
            <div className="sm:col-span-2"><Field label="상세정보"><input className={inputCls} value={form.detail} onChange={(e) => set("detail", e.target.value)} /></Field></div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs font-bold text-slate-500 mb-2">가격 (업체방문은 공장가 기준)</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="매입가"><MoneyInput value={form.buyPrice} onChange={(v) => set("buyPrice", v)} /></Field>
              <Field label="공장가"><MoneyInput value={form.factoryPrice} onChange={(v) => set("factoryPrice", v)} /></Field>
              <Field label="온라인가"><MoneyInput value={form.onlinePrice} onChange={(v) => set("onlinePrice", v)} /></Field>
              <Field label="쿠팡"><MoneyInput value={form.coupangPrice} onChange={(v) => set("coupangPrice", v)} /></Field>
              <Field label="네이버"><MoneyInput value={form.naverPrice} onChange={(v) => set("naverPrice", v)} /></Field>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="기초일"><input type="date" className={inputCls} value={form.baseDate} onChange={(e) => set("baseDate", e.target.value)} /></Field>
            <Field label="기초재고량"><MoneyInput value={form.baseQty} onChange={(v) => set("baseQty", v)} /></Field>
          </div>
          {formErr && <p className="text-rose-500 text-sm">{formErr}</p>}
        </div>
      </VModal>

      {/* 품절 처리 모달 */}
      <VModal open={Boolean(soldOutTarget)} onClose={() => setSoldOutTarget(null)} title={`품절 처리 — ${soldOutTarget?.name || ""}`}
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setSoldOutTarget(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600">취소</button>
            <button onClick={confirmSoldOut} disabled={!soReason.trim()} className="px-5 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 disabled:opacity-50">품절 처리</button>
          </div>
        }>
        <div className="space-y-3">
          <Field label="품절일" required><input type="date" className={inputCls} value={soDate} onChange={(e) => setSoDate(e.target.value)} /></Field>
          <Field label="품절 사유" required><textarea className={`${inputCls} h-24 resize-none`} value={soReason} onChange={(e) => setSoReason(e.target.value)} placeholder="예: 자재 단종 / 매입처 공급 중단 등" /></Field>
          <p className="text-xs text-slate-400">품절 처리하면 거래명세표 작성 시 이 사유로 경고가 표시됩니다.</p>
        </div>
      </VModal>

      {/* 변경 이력(타임라인) 모달 — 탭 구분 */}
      <VModal open={Boolean(logItem)} onClose={() => { setLogItem(null); setLogTab("전체"); }} title={`변경 이력 — ${logItem?.name || ""}`}
        footer={<div className="flex justify-end"><button onClick={() => { setLogItem(null); setLogTab("전체"); }} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600">닫기</button></div>}>
        {(() => {
          const all = logItem?.history || logItem?.soldOutLog || [];
          const tabs = ["전체", "가격변경", "품절"];
          const list = all.filter((l) => logTab === "전체" ? true : logTab === "가격변경" ? l.type === "가격변경" : (l.type === "품절" || l.type === "판매재개"));
          return (
            <div>
              <div className="flex gap-1 border-b border-slate-100 mb-4">
                {tabs.map((t) => (
                  <button key={t} onClick={() => setLogTab(t)}
                    className={`relative px-3 py-2 text-sm font-bold transition ${logTab === t ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}>
                    {t}
                    {logTab === t && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-indigo-600" />}
                  </button>
                ))}
              </div>
              {list.length === 0 ? <p className="text-sm text-slate-400 py-4 text-center">이력이 없습니다.</p> : (
                <ol className="relative border-l-2 border-slate-100 pl-4 space-y-4">
                  {list.map((l, i) => {
                    const isPrice = l.type === "가격변경";
                    const dot = l.type === "품절" ? "bg-rose-500" : l.type === "판매재개" ? "bg-emerald-500" : "bg-indigo-500";
                    return (
                      <li key={i} className="relative">
                        <span className={`absolute -left-[1.35rem] top-1 w-3 h-3 rounded-full ${dot}`} />
                        <div className="text-sm font-semibold text-slate-700">{isPrice ? `${l.field} 변경` : l.type} · {l.date}</div>
                        {isPrice ? (
                          <div className="text-sm text-slate-500 mt-0.5">{wonFmt(l.from)} → <span className="font-semibold text-slate-700">{wonFmt(l.to)}</span></div>
                        ) : (l.reason && <div className="text-sm text-slate-500 mt-0.5">사유: {l.reason}</div>)}
                        {l.by && <div className="text-xs text-slate-400 mt-0.5">처리: {l.by}</div>}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          );
        })()}
      </VModal>

      {/* 확인 다이얼로그 */}
      <VModal open={Boolean(confirmState)} onClose={() => setConfirmState(null)} title="확인"
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirmState(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600">취소</button>
            <button onClick={() => confirmState?.onYes?.()} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium">확인</button>
          </div>
        }>
        <p className="text-sm text-slate-700 whitespace-pre-line">{confirmState?.message}</p>
      </VModal>
    </div>
  );
}
