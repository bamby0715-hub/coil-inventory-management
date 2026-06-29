import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Plus, Trash2, Pencil, X, Printer, Calculator, FileText, Search,
  ChevronDown, Check, Building2, Download,
} from "lucide-react";

/* =========================================================================
   거래명세표 (statements) — HNMT Coil System
   - 0부 공통정의서 §4(계산) / 2부(거래명세표·절곡) 확정 규칙 구현.
   - 절곡 치수 구분자 = '+'(합=유효폭), 판(일반 M) 길이×수량 = '*'(곱÷1000, 0.4 반올림).
   - 저장: Firestore `statements/{문서ID}` (헤더 + 상세 lines 배열).
   - 채번: 트랜잭션으로 `counters/stmt_YYYYMMDD` 직렬화 → 문서번호 HN-YYYYMMDD-0001.
   - 거래처·품목 자동 불러오기는 ADAPTER 영역에서 컬렉션/필드명만 맞추면 됨.
     (현재는 수동 입력으로 완전 동작. vendors/items 실제 스키마 확인 후 매핑 교체.)
   ========================================================================= */

/* ---------------- 회사 정보 (스킬 기준, 사업자번호는 확인 필요) ---------------- */
const SUPPLIER = {
  상호: "(주)에이치엔메탈릭",
  사업자등록번호: "", // 확인 필요
  대표자: "", // 확인 필요
  주소: "경기 화성시 동탄기흥로 570-6 3층 304호",
  업태: "제조·도소매",
  종목: "금속 건축 외장재",
  연락처: "",
};

/* ---------------- enum (0부 §2,3,4-3) ---------------- */
export const 대분류목록 = ["강판", "징크", "절곡", "메탈사이딩", "강판물받이", "징크물받이", "피스", "볼트", "기타", "외부"];
export const 부가세구분목록 = ["별도", "포함", "없음"];
const 코일대분류 = new Set(["강판", "징크", "절곡"]); // 색상구분=코일

/* ===================== 계산 엔진 (검증 완료) ===================== */
export const floorWon = (n) => Math.floor(Number(n) || 0);
export const round04 = (x) => (x - Math.floor(x) >= 0.4 ? Math.ceil(x) : Math.floor(x));

// 절곡: '+' 구분 → 유효폭 = 합
export const bendWidth = (dims) =>
  String(dims || "").split("+").map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n)).reduce((a, b) => a + b, 0);
export const bendUnitPrice = (width, unitPrice, gok = 0, online = false) =>
  floorWon(width * unitPrice + (online ? (Number(gok) || 0) * 1000 : 0));

// 판(일반 M): 길이×수량 ÷1000, 0.4 반올림
export const sumQtyByLen = (len, qty) => round04(((Number(len) || 0) * (Number(qty) || 0)) / 1000);
// '*' 식 입력 파서 (예: "1230*10")
export const panParse = (expr) => {
  const raw = String(expr || "").trim();
  const parts = raw.split("*").map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n));
  if (!parts.length) return 0;
  const product = parts.reduce((a, b) => a * b, 1);
  return round04(raw.includes("*") ? product / 1000 : product);
};

// 라인 공급가액/세액 (부가세구분) — 라인 공급가액은 항상 세전
export const lineCalc = (lineAmount, vatType) => {
  const amt = floorWon(lineAmount);
  if (vatType === "포함") { const supply = Math.floor((amt * 10) / 11); return { supply, tax: amt - supply }; }
  if (vatType === "없음") return { supply: amt, tax: 0 };
  return { supply: amt, tax: floorWon(amt * 0.1) }; // 별도
};
// 헤더 합계 (운반비 과세 포함)
export const headerTotals = (lineSupplies, freight, vatType, paid) => {
  const supply = floorWon(lineSupplies.reduce((a, b) => a + b, 0) + (Number(freight) || 0));
  const tax = vatType === "없음" ? 0 : floorWon(supply * 0.1);
  const total = supply + tax;
  return { supply, tax, total, unpaid: total - (Number(paid) || 0) };
};

// 라인 1건의 금액 계산 (단위·부가세구분 반영)
export const computeLine = (line, vatType) => {
  const isM = String(line.unit || "").toUpperCase() === "M";
  const base = isM
    ? (Number(line.sum_qty) || 0) * (Number(line.unit_price) || 0)
    : (Number(line.qty) || 0) * (Number(line.unit_price) || 0);
  return lineCalc(base, vatType);
};

const fmtWon = (n) => (Math.floor(Number(n) || 0)).toLocaleString("ko-KR");
const todayStr = () => new Date().toISOString().slice(0, 10);

/* ===================== Firebase 런타임 ===================== */
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

/* ---------------- 거래명세표 store ---------------- */
function subscribeStatements(onData, onError) {
  let unsub = () => {};
  getDataRuntime().then(({ db, fsModule }) => {
    unsub = fsModule.onSnapshot(
      fsModule.collection(db, "statements"),
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => onError && onError(e),
    );
  }).catch((e) => onError && onError(e));
  return () => unsub();
}
async function writeStatement(id, record) {
  const { db, fsModule } = await getDataRuntime();
  await fsModule.setDoc(fsModule.doc(db, "statements", id), { ...record, id, updatedAt: fsModule.serverTimestamp() });
}
async function deleteStatement(id) {
  const { db, fsModule } = await getDataRuntime();
  await fsModule.deleteDoc(fsModule.doc(db, "statements", id));
}
// 문서번호 채번 (트랜잭션 직렬화) — HN-YYYYMMDD-0001
async function nextDocNo() {
  const { db, fsModule } = await getDataRuntime();
  const ymd = todayStr().replace(/-/g, "");
  const ref = fsModule.doc(db, "counters", `stmt_${ymd}`);
  const seq = await fsModule.runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const cur = snap.exists() ? (snap.data().seq || 0) : 0;
    const next = cur + 1;
    tx.set(ref, { seq: next, updatedAt: fsModule.serverTimestamp() }, { merge: true });
    return next;
  });
  return `HN-${ymd}-${String(seq).padStart(4, "0")}`;
}

function useStatementsStore() {
  const [rows, setRows] = useState([]);
  useEffect(() => subscribeStatements((list) => setRows(list), (e) => console.error("거래명세표 구독 실패:", e?.message || e)), []);
  return rows;
}

/* ---------------- ADAPTER: 거래처·품목 자동 불러오기 (옵션) ----------------
   실제 vendors/items 컬렉션·필드명 확인되면 아래만 교체하면 자동완성 활성화.
   현재는 빈 목록(수동 입력으로 동작). ---------------------------------- */
function useVendors() {
  const [v, setV] = useState([]);
  useEffect(() => {
    let unsub = () => {};
    getDataRuntime().then(({ db, fsModule }) => {
      unsub = fsModule.onSnapshot(fsModule.collection(db, "vendors"),
        (snap) => setV(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        () => {});
    }).catch(() => {});
    return () => unsub();
  }, []);
  return v;
}

/* ===================== UI ===================== */
const blankLine = () => ({
  uid: Math.random().toString(36).slice(2),
  category: "강판", name: "", spec: "", color: "", thickness: "",
  unit: "M", length: "", qty: "", sum_qty: "", unit_price: "", memo: "",
});

const blankHeader = () => ({
  doc_no: "", date: todayStr(), vendor_name: "", site_address: "",
  vat_type: "별도", freight: "", paid: "", memo: "", status: "작성중",
});

export function StatementManagement({ isMaster = false, myUid = "", myName = "" }) {
  const statements = useStatementsStore();
  const vendors = useVendors();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [header, setHeader] = useState(blankHeader());
  const [lines, setLines] = useState([blankLine()]);
  const [calcLine, setCalcLine] = useState(null); // 절곡 계산기 대상 라인 uid
  const [preview, setPreview] = useState(null);    // 인쇄 미리보기 대상 문서
  const [query, setQuery] = useState("");

  const vendorNames = useMemo(() =>
    [...new Set(vendors.map((v) => v.거래처명 || v.name || v.vendor_name).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko")),
    [vendors]);
  const siteSuggest = useMemo(() =>
    [...new Set(statements.map((s) => s.site_address).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko")),
    [statements]);

  // 라인 금액 계산
  const linesComputed = useMemo(() => lines.map((ln) => {
    const { supply, tax } = computeLine(ln, header.vat_type);
    return { ...ln, _supply: supply, _tax: tax };
  }), [lines, header.vat_type]);
  const totals = useMemo(() =>
    headerTotals(linesComputed.map((l) => l._supply), header.freight, header.vat_type, header.paid),
    [linesComputed, header.freight, header.vat_type, header.paid]);

  const visibleRows = useMemo(() => {
    const q = query.trim();
    const list = [...statements].sort((a, b) => String(b.doc_no || "").localeCompare(String(a.doc_no || "")));
    if (!q) return list;
    return list.filter((s) => [s.doc_no, s.vendor_name, s.site_address].some((f) => String(f || "").includes(q)));
  }, [statements, query]);

  const startNew = () => { setEditId(null); setHeader(blankHeader()); setLines([blankLine()]); setOpen(true); };
  const startEdit = (s) => {
    setEditId(s.id);
    setHeader({ ...blankHeader(), ...s, lines: undefined });
    setLines((s.lines || []).map((l) => ({ ...blankLine(), ...l })));
    setOpen(true);
  };

  const updateLine = (uid, patch) => setLines((arr) => arr.map((l) => {
    if (l.uid !== uid) return l;
    const next = { ...l, ...patch };
    // 단위 M: 길이/수량 변경 시 합계수량 자동(미수정 상태에서만 갱신은 단순화 위해 항상 제안값 표시)
    if (String(next.unit || "").toUpperCase() === "M" && ("length" in patch || "qty" in patch)) {
      next.sum_qty = sumQtyByLen(next.length, next.qty);
    }
    if (String(next.unit || "").toUpperCase() !== "M") next.sum_qty = Number(next.qty) || 0;
    return next;
  }));
  const addLine = () => setLines((arr) => [...arr, blankLine()]);
  const removeLine = (uid) => setLines((arr) => (arr.length > 1 ? arr.filter((l) => l.uid !== uid) : arr));

  const validate = () => {
    if (!header.vendor_name.trim()) return "거래처명을 입력해주세요.";
    if (!header.site_address.trim()) return "현장주소를 입력해주세요.";
    if (!부가세구분목록.includes(header.vat_type)) return "부가세구분을 확인해주세요.";
    for (const l of lines) {
      if (!대분류목록.includes(l.category)) return "대분류를 확인해주세요.";
      if (!l.name.trim()) return "품목명을 입력해주세요.";
      if (코일대분류.has(l.category) && !String(l.color).trim()) return `${l.name}: 색상을 입력해주세요.`;
      if (!l.thickness && 코일대분류.has(l.category)) return `${l.name}: 두께를 입력해주세요.`;
      const isM = String(l.unit).toUpperCase() === "M";
      const qtyVal = isM ? Number(l.sum_qty) : Number(l.qty);
      if (!(qtyVal > 0)) return `${l.name}: 수량(합계수량)이 0 또는 음수입니다.`;
      if (!(Number(l.unit_price) > 0)) return `${l.name}: 단가를 입력해주세요.`;
    }
    return "";
  };

  const save = async (statusOverride) => {
    const err = validate();
    if (err) { alert(err); return; }
    try {
      let doc_no = header.doc_no;
      let id = editId;
      if (!editId) { doc_no = await nextDocNo(); id = `DOC_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }
      const cleanLines = linesComputed.map((l, i) => ({
        seq: i + 1, category: l.category, name: l.name, spec: l.spec, color: l.color,
        thickness: l.thickness, unit: l.unit, length: l.length, qty: l.qty, sum_qty: l.sum_qty,
        unit_price: l.unit_price, supply: l._supply, tax: l._tax, memo: l.memo,
      }));
      const record = {
        ...header, doc_no, status: statusOverride || header.status,
        lines: cleanLines, supply: totals.supply, vat: totals.tax, total: totals.total,
        unpaid: totals.unpaid, author_uid: editId ? header.author_uid || myUid : myUid,
        author_name: editId ? header.author_name || myName : myName,
        site_address: header.site_address.trim().replace(/\s+/g, " "),
        created_at: editId ? header.created_at || todayStr() : todayStr(),
      };
      await writeStatement(id, record);
      setOpen(false); setEditId(null);
    } catch (e) { alert("저장 실패: " + (e?.message || e)); }
  };

  const remove = async (s) => {
    if (!isMaster) { alert("취소·삭제 권한이 없습니다."); return; }
    if (!confirm(`${s.doc_no} 문서를 삭제할까요?`)) return;
    try { await deleteStatement(s.id); } catch (e) { alert("삭제 실패: " + (e?.message || e)); }
  };

  const exportExcel = async () => {
    const XLSX = await importExternal("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm").catch(() => null);
    if (!XLSX) { alert("엑셀 모듈 로드 실패"); return; }
    const rows = [];
    visibleRows.forEach((s) => (s.lines || []).forEach((l) => rows.push({
      문서번호: s.doc_no, 작성일: s.date, 거래처: s.vendor_name, 현장주소: s.site_address,
      대분류: l.category, 품목명: l.name, 규격: l.spec, 색상: l.color, 두께: l.thickness,
      단위: l.unit, 길이: l.length, 수량: l.qty, 합계수량: l.sum_qty, 단가: l.unit_price,
      공급가액: l.supply, 세액: l.tax, 부가세구분: s.vat_type,
    })));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "거래명세표");
    XLSX.writeFile(wb, `거래명세표_${todayStr()}.xlsx`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">거래명세표</h2>
          <p className="text-slate-500 text-sm mt-0.5">거래처·품목을 담아 명세표를 작성하고 인쇄·저장합니다.</p>
        </div>
        <div className="flex gap-2 no-print">
          <button onClick={exportExcel} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium inline-flex items-center gap-1.5 hover:bg-slate-50"><Download size={16} />엑셀</button>
          <button onClick={startNew} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium inline-flex items-center gap-1.5 hover:bg-indigo-700"><Plus size={16} />명세표 작성</button>
        </div>
      </div>

      <div className="relative no-print">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="문서번호 · 거래처 · 현장주소 검색"
          className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>{["문서번호", "작성일", "거래처", "현장주소", "합계금액", "미수금", "상태", ""].map((h) =>
                <th key={h} className="px-3 py-2.5 text-left font-medium whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibleRows.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2.5 font-semibold text-indigo-700 whitespace-nowrap">{s.doc_no}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-500">{s.date}</td>
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap">{s.vendor_name}</td>
                  <td className="px-3 py-2.5 text-slate-600 min-w-[200px]">{s.site_address}</td>
                  <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">{fmtWon(s.total)}</td>
                  <td className={`px-3 py-2.5 text-right whitespace-nowrap ${Number(s.unpaid) > 0 ? "text-rose-600 font-medium" : "text-slate-400"}`}>{fmtWon(s.unpaid)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${s.status === "완료" ? "bg-emerald-50 text-emerald-700" : s.status === "취소" ? "bg-slate-100 text-slate-500" : "bg-amber-50 text-amber-700"}`}>{s.status || "작성중"}</span>
                  </td>
                  <td className="px-3 py-2.5 no-print whitespace-nowrap">
                    <button onClick={() => setPreview(s)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600" title="인쇄 미리보기"><Printer size={15} /></button>
                    <button onClick={() => startEdit(s)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600" title="수정"><Pencil size={15} /></button>
                    {isMaster && <button onClick={() => remove(s)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500" title="삭제"><Trash2 size={15} /></button>}
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && <tr><td colSpan={8} className="px-3 py-10 text-center text-slate-400">작성된 거래명세표가 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <Overlay onClose={() => setOpen(false)} title={editId ? "거래명세표 수정" : "거래명세표 작성"} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="거래처명">
                <input list="vendor-list" value={header.vendor_name} onChange={(e) => setHeader((h) => ({ ...h, vendor_name: e.target.value }))} className="ipt" placeholder="거래처명" />
                <datalist id="vendor-list">{vendorNames.map((n) => <option key={n} value={n} />)}</datalist>
              </Field>
              <Field label="작성일"><input type="date" value={header.date} onChange={(e) => setHeader((h) => ({ ...h, date: e.target.value }))} className="ipt" /></Field>
              <Field label="현장주소" full>
                <input list="site-list" value={header.site_address} onChange={(e) => setHeader((h) => ({ ...h, site_address: e.target.value }))} className="ipt" placeholder="현장주소" />
                <datalist id="site-list">{siteSuggest.map((n) => <option key={n} value={n} />)}</datalist>
              </Field>
              <Field label="부가세구분">
                <select value={header.vat_type} onChange={(e) => setHeader((h) => ({ ...h, vat_type: e.target.value }))} className="ipt">
                  {부가세구분목록.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </Field>
              <Field label="운반비 (과세)"><input type="number" value={header.freight} onChange={(e) => setHeader((h) => ({ ...h, freight: e.target.value }))} className="ipt" placeholder="0" /></Field>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>{["대분류", "품목명", "규격", "색상", "두께", "단위", "길이", "수량", "합계수량", "단가", "공급가액", "세액", ""].map((h) =>
                      <th key={h} className="px-2 py-2 text-left font-medium whitespace-nowrap">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {linesComputed.map((l) => {
                      const isBend = l.category === "절곡";
                      const isM = String(l.unit).toUpperCase() === "M";
                      return (
                        <tr key={l.uid} className="align-top">
                          <td className="px-1.5 py-1.5"><select value={l.category} onChange={(e) => updateLine(l.uid, { category: e.target.value, unit: e.target.value === "절곡" ? "EA" : l.unit })} className="ipt-sm w-24">{대분류목록.map((c) => <option key={c} value={c}>{c}</option>)}</select></td>
                          <td className="px-1.5 py-1.5"><input value={l.name} onChange={(e) => updateLine(l.uid, { name: e.target.value })} className="ipt-sm w-28" /></td>
                          <td className="px-1.5 py-1.5"><input value={l.spec} onChange={(e) => updateLine(l.uid, { spec: e.target.value })} className="ipt-sm w-24" placeholder={isBend ? "225W" : ""} /></td>
                          <td className="px-1.5 py-1.5"><input value={l.color} onChange={(e) => updateLine(l.uid, { color: e.target.value })} className="ipt-sm w-20" /></td>
                          <td className="px-1.5 py-1.5"><input value={l.thickness} onChange={(e) => updateLine(l.uid, { thickness: e.target.value })} className="ipt-sm w-14" /></td>
                          <td className="px-1.5 py-1.5"><input value={l.unit} onChange={(e) => updateLine(l.uid, { unit: e.target.value })} className="ipt-sm w-14" /></td>
                          <td className="px-1.5 py-1.5"><input type="number" disabled={!isM} value={l.length} onChange={(e) => updateLine(l.uid, { length: e.target.value })} className="ipt-sm w-16 disabled:bg-slate-50" /></td>
                          <td className="px-1.5 py-1.5"><input type="number" value={l.qty} onChange={(e) => updateLine(l.uid, { qty: e.target.value })} className="ipt-sm w-16" /></td>
                          <td className="px-1.5 py-1.5"><input type="number" value={l.sum_qty} onChange={(e) => updateLine(l.uid, { sum_qty: e.target.value })} className="ipt-sm w-16" /></td>
                          <td className="px-1.5 py-1.5">
                            <div className="flex items-center gap-1">
                              <input type="number" value={l.unit_price} onChange={(e) => updateLine(l.uid, { unit_price: e.target.value })} className="ipt-sm w-20" />
                              {isBend && <button onClick={() => setCalcLine(l.uid)} className="p-1 rounded-md text-violet-600 hover:bg-violet-50" title="절곡 계산기"><Calculator size={15} /></button>}
                            </div>
                          </td>
                          <td className="px-1.5 py-1.5 text-right font-medium whitespace-nowrap">{fmtWon(l._supply)}</td>
                          <td className="px-1.5 py-1.5 text-right text-slate-500 whitespace-nowrap">{fmtWon(l._tax)}</td>
                          <td className="px-1.5 py-1.5"><button onClick={() => removeLine(l.uid)} className="p-1 rounded-md text-rose-500 hover:bg-rose-50"><Trash2 size={14} /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button onClick={addLine} className="w-full py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 inline-flex items-center justify-center gap-1.5 border-t border-slate-100"><Plus size={15} />품목 추가</button>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex gap-2">
                <Field label="입금액"><input type="number" value={header.paid} onChange={(e) => setHeader((h) => ({ ...h, paid: e.target.value }))} className="ipt w-32" placeholder="0" /></Field>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm min-w-[240px]">
                <Row k="공급가액" v={fmtWon(totals.supply)} />
                <Row k={`부가세 (${header.vat_type})`} v={fmtWon(totals.tax)} />
                <Row k="합계금액" v={fmtWon(totals.total)} strong />
                <Row k="미수금" v={fmtWon(totals.unpaid)} danger={totals.unpaid > 0} />
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:flex sm:justify-end gap-2">
            <button onClick={() => setOpen(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium hover:bg-slate-50">취소</button>
            <button onClick={() => save("작성중")} className="px-4 py-2.5 rounded-xl border border-indigo-200 text-indigo-700 text-sm font-medium hover:bg-indigo-50">작성중 저장</button>
            <button onClick={() => save("완료")} className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">완료 저장</button>
          </div>
        </Overlay>
      )}

      {calcLine && (
        <BendCalculator
          onClose={() => setCalcLine(null)}
          onApply={({ spec, unit_price, qty, memo }) => {
            updateLine(calcLine, { spec, unit_price, qty, sum_qty: Number(qty) || 0, memo });
            setCalcLine(null);
          }}
        />
      )}

      {preview && <StatementPrint statement={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

/* ---------------- 절곡 계산기 모달 ---------------- */
function BendCalculator({ onClose, onApply }) {
  const [dims, setDims] = useState("");
  const [jjam, setJjam] = useState("");
  const [gok, setGok] = useState("");
  const [qty, setQty] = useState("");
  const [priceType, setPriceType] = useState("공장가");
  const [upFactory, setUpFactory] = useState("");
  const [upOnline, setUpOnline] = useState("");

  const width = bendWidth(dims);
  const unitFactory = bendUnitPrice(width, Number(upFactory) || 0, gok, false);
  const unitOnline = bendUnitPrice(width, Number(upOnline) || 0, gok, true);
  const unit = priceType === "온라인가" ? unitOnline : unitFactory;
  const supply = floorWon(unit * (Number(qty) || 0));
  const disp = `${Math.round(width)}W`;
  const memo = `치수 ${dims} · 유효폭 ${Math.round(width)} · 곡수 ${Number(gok) || 0} · 짬 ${jjam || "-"}`;

  return (
    <Overlay onClose={onClose} title="절곡 계산기">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="치수입력 (+ 구분)"><input value={dims} onChange={(e) => setDims(e.target.value)} className="ipt" placeholder="50+60+55+60" /></Field>
          <Field label="짬 (확인용)"><input value={jjam} onChange={(e) => setJjam(e.target.value)} className="ipt" /></Field>
          <Field label="곡수 (공백=0)"><input type="number" value={gok} onChange={(e) => setGok(e.target.value)} className="ipt" /></Field>
          <Field label="수량"><input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="ipt" /></Field>
          <Field label="공장가단가"><input type="number" value={upFactory} onChange={(e) => setUpFactory(e.target.value)} className="ipt" /></Field>
          <Field label="온라인가단가"><input type="number" value={upOnline} onChange={(e) => setUpOnline(e.target.value)} className="ipt" /></Field>
        </div>
        <div className="flex gap-2">
          {["공장가", "온라인가"].map((t) => (
            <button key={t} onClick={() => setPriceType(t)} className={`px-3 py-1.5 rounded-lg text-sm border ${priceType === t ? "border-violet-300 bg-violet-50 text-violet-700 font-medium" : "border-slate-200 text-slate-500"}`}>{t}</button>
          ))}
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm space-y-1">
          <Row k="유효폭" v={`${Math.round(width)} mm`} />
          <Row k="출력표시값" v={disp} />
          <Row k={`적용 단가 (${priceType})`} v={`${fmtWon(unit)}원`} />
          <Row k="공급가액" v={`${fmtWon(supply)}원`} strong />
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium hover:bg-slate-50">닫기</button>
        <button onClick={() => onApply({ spec: disp, unit_price: unit, qty, memo })} className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700">적용</button>
      </div>
    </Overlay>
  );
}

/* ---------------- 인쇄용 거래명세표 ---------------- */
function StatementPrint({ statement: s, onClose }) {
  const lines = s.lines || [];
  return (
    <Overlay onClose={onClose} title="거래명세표 미리보기" wide
      actions={<button onClick={() => window.print()} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium inline-flex items-center gap-1.5 hover:bg-indigo-700 no-print"><Printer size={15} />인쇄</button>}>
      <div className="print-area text-[12px] text-slate-800">
        <div className="text-center text-xl font-bold mb-3">거 래 명 세 표</div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="border border-slate-300 rounded-lg p-3">
            <div className="text-[11px] text-slate-400 mb-1">공급받는자</div>
            <div className="font-semibold">{s.vendor_name}</div>
            <div className="text-slate-500 mt-1">현장: {s.site_address}</div>
            <div className="text-slate-500">작성일: {s.date} · 문서번호: {s.doc_no}</div>
          </div>
          <div className="border border-slate-300 rounded-lg p-3">
            <div className="text-[11px] text-slate-400 mb-1">공급자</div>
            <div className="font-semibold">{SUPPLIER.상호}</div>
            <div className="text-slate-500 mt-1">{SUPPLIER.주소}</div>
            <div className="text-slate-500">사업자번호: {SUPPLIER.사업자등록번호 || "(확인 필요)"} · {SUPPLIER.업태}/{SUPPLIER.종목}</div>
          </div>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100">{["품목", "규격", "색상", "두께", "수량", "단위", "단가", "공급가액", "세액"].map((h) =>
              <th key={h} className="border border-slate-300 px-2 py-1 text-left">{h}</th>)}</tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td className="border border-slate-300 px-2 py-1">{l.name}</td>
                <td className="border border-slate-300 px-2 py-1">{l.spec}</td>
                <td className="border border-slate-300 px-2 py-1">{l.color}</td>
                <td className="border border-slate-300 px-2 py-1">{l.thickness}</td>
                <td className="border border-slate-300 px-2 py-1 text-right">{String(l.unit).toUpperCase() === "M" ? l.sum_qty : l.qty}</td>
                <td className="border border-slate-300 px-2 py-1">{l.unit}</td>
                <td className="border border-slate-300 px-2 py-1 text-right">{fmtWon(l.unit_price)}</td>
                <td className="border border-slate-300 px-2 py-1 text-right">{fmtWon(l.supply)}</td>
                <td className="border border-slate-300 px-2 py-1 text-right">{fmtWon(l.tax)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end mt-3">
          <div className="w-64 text-[12px]">
            <Row k="공급가액" v={fmtWon(s.supply)} />
            <Row k={`부가세 (${s.vat_type})`} v={fmtWon(s.vat)} />
            <Row k="합계금액" v={fmtWon(s.total)} strong />
            <Row k="입금액" v={fmtWon(s.paid)} />
            <Row k="미수금" v={fmtWon(s.unpaid)} danger={Number(s.unpaid) > 0} />
          </div>
        </div>
      </div>
    </Overlay>
  );
}

/* ---------------- 공통 UI 헬퍼 ---------------- */
function Overlay({ children, onClose, title, wide, actions }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto bg-slate-900/50 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl shadow-xl w-full ${wide ? "max-w-5xl" : "max-w-lg"} my-4`}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 no-print">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <div className="flex items-center gap-2">
            {actions}
            <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"><X size={18} /></button>
          </div>
        </div>
        <div className="p-5">{children}</div>
      </div>
      <style>{`
        .ipt{width:100%;height:40px;padding:0 12px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;background:#fff}
        .ipt-sm{height:34px;padding:0 8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;background:#fff}
        @media print{.no-print{display:none!important}body *{visibility:hidden}.print-area,.print-area *{visibility:visible}.print-area{position:absolute;left:0;top:0;width:100%}}
      `}</style>
    </div>
  );
}
function Field({ label, children, full }) {
  return <label className={`block ${full ? "sm:col-span-2" : ""}`}><span className="block text-xs text-slate-500 mb-1">{label}</span>{children}</label>;
}
function Row({ k, v, strong, danger }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-slate-500">{k}</span>
      <span className={`${strong ? "font-bold text-slate-800" : danger ? "text-rose-600 font-medium" : "text-slate-700"}`}>{v}</span>
    </div>
  );
}
