import React, { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";

/* =========================================================================
   거래처관리 (vendors) — 별도 컬렉션, 모든 담당자 공유
   - 코드: HN0001 부터 자동 순번 (트랜잭션으로 충돌 방지)
   - 구분: settings/vendorMeta.categories  (공장/온라인/업체방문/쿠팡/네이버, 추가 가능)
   - 담당자/연락처 필수
   - 유사중복(거래처명 또는 사업자번호 동일) → 확인창
   - 엑셀 양식 다운로드 / 일괄 업로드(중복 건너뜀) / 담당자 필터 다운로드
   ========================================================================= */

const FIREBASE_SDK_VERSION = "10.12.5";
const DEFAULT_CATEGORIES = ["공장", "온라인", "업체방문", "쿠팡", "네이버"];
const importExternal = (url) => new Function("url", "return import(url)")(url);
const todayStr = () => { const d = new Date(); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const inputCls = "w-full min-w-0 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 bg-white";

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

const vendorsCol = (fs, db) => fs.collection(db, "vendors");
const vendorDoc = (fs, db, code) => fs.doc(db, "vendors", code);
const metaDoc = (fs, db) => fs.doc(db, "settings", "vendorMeta");

// ---------- 실시간 구독 ----------
export function subscribeVendors(onData, onError) {
  let unsub = () => {};
  getDataRuntime().then(({ db, fsModule }) => {
    const q = fsModule.query(vendorsCol(fsModule, db), fsModule.orderBy("code", "asc"));
    unsub = fsModule.onSnapshot(q, (snap) => {
      onData(snap.docs.map((d) => ({ code: d.id, ...d.data() })));
    }, (err) => onError && onError(err));
  }).catch((e) => onError && onError(e));
  return () => unsub();
}

export function subscribeVendorMeta(onData, onError) {
  let unsub = () => {};
  getDataRuntime().then(({ db, fsModule }) => {
    unsub = fsModule.onSnapshot(metaDoc(fsModule, db), (snap) => {
      const data = snap.exists() ? snap.data() : null;
      onData({
        categories: (data && Array.isArray(data.categories) && data.categories.length) ? data.categories : DEFAULT_CATEGORIES,
        lastSeq: (data && Number(data.lastSeq)) || 0,
      });
    }, (err) => onError && onError(err));
  }).catch((e) => onError && onError(e));
  return () => unsub();
}

// ---------- 구분(카테고리) 관리 ----------
export async function setCategories(categories) {
  const { db, fsModule } = await getDataRuntime();
  await fsModule.setDoc(metaDoc(fsModule, db), { categories }, { merge: true });
}

// ---------- 코드 자동발급 + 거래처 생성 (트랜잭션) ----------
function formatVendorCode(n) { return "HN" + String(n).padStart(4, "0"); }

export async function createVendor(data) {
  const { db, fsModule } = await getDataRuntime();
  const code = await fsModule.runTransaction(db, async (tx) => {
    const metaRef = metaDoc(fsModule, db);
    const metaSnap = await tx.get(metaRef);
    const last = (metaSnap.exists() && Number(metaSnap.data().lastSeq)) || 0;
    const next = last + 1;
    const newCode = formatVendorCode(next);
    tx.set(vendorDoc(fsModule, db, newCode), {
      ...data,
      code: newCode,
      createdAt: fsModule.serverTimestamp(),
    });
    tx.set(metaRef, { lastSeq: next }, { merge: true });
    return newCode;
  });
  return code;
}

export async function updateVendor(code, data) {
  const { db, fsModule } = await getDataRuntime();
  await fsModule.updateDoc(vendorDoc(fsModule, db, code), data);
}

export async function deleteVendor(code) {
  const { db, fsModule } = await getDataRuntime();
  await fsModule.deleteDoc(vendorDoc(fsModule, db, code));
}

// 엑셀 일괄 업로드 — 이미 있는(거래처명+사업자번호) 건은 건너뜀
export async function bulkCreateVendors(rows, existing) {
  const norm = (v) => String(v ?? "").trim();
  const key = (name, biz) => `${norm(name)}|${norm(biz)}`;
  const existingKeys = new Set(existing.map((v) => key(v.name, v.bizNo)));
  let added = 0, skipped = 0;
  for (const r of rows) {
    if (!norm(r.name)) { skipped++; continue; }
    const k = key(r.name, r.bizNo);
    if (existingKeys.has(k)) { skipped++; continue; }
    existingKeys.add(k);
    await createVendor(r);
    added++;
  }
  return { added, skipped };
}

/* =========================================================================
   엑셀 양식 / 업로드 파싱 / 다운로드
   ========================================================================= */
const EXCEL_HEADERS = ["거래처명", "구분", "사업자유형", "담당자", "연락처", "기초일", "기초미수금", "사업자번호", "대표자", "업태", "종목", "주소", "기타"];

export function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([EXCEL_HEADERS, ["예시상사", "공장", "사업장", "홍길동", "010-0000-0000", todayStr(), 0, "000-00-00000", "홍길동", "도소매", "철강", "서울시 ...", ""]]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "거래처양식");
  XLSX.writeFile(wb, "거래처_업로드양식.xlsx");
}

export async function parseVendorExcel(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
  return json.map((row) => ({
    name: String(row["거래처명"] ?? "").trim(),
    category: String(row["구분"] ?? "").trim(),
    bizType: String(row["사업자유형"] ?? "").trim() || "사업장",
    manager: String(row["담당자"] ?? "").trim(),
    phone: String(row["연락처"] ?? "").trim(),
    baseDate: String(row["기초일"] ?? "").trim() || todayStr(),
    baseReceivable: Number(String(row["기초미수금"] ?? "0").replace(/[^0-9.-]/g, "")) || 0,
    bizNo: String(row["사업자번호"] ?? "").trim(),
    ceo: String(row["대표자"] ?? "").trim(),
    upTae: String(row["업태"] ?? "").trim(),
    jongMok: String(row["종목"] ?? "").trim(),
    address: String(row["주소"] ?? "").trim(),
    memo: String(row["기타"] ?? "").trim(),
  }));
}

export function downloadVendors(vendors, fileName = "거래처목록.xlsx") {
  const rows = vendors.map((v) => ({
    코드: v.code, 거래처명: v.name, 구분: v.category, 사업자유형: v.bizType,
    담당자: v.manager, 연락처: v.phone, 기초일: v.baseDate, 기초미수금: v.baseReceivable,
    사업자번호: v.bizNo, 대표자: v.ceo, 업태: v.upTae, 종목: v.jongMok, 주소: v.address, 기타: v.memo,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "거래처");
  XLSX.writeFile(wb, fileName);
}

/* =========================================================================
   UI — 자체 완결 (App.jsx 와 순환 의존 방지를 위해 Modal/Field 내장)
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
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? "max-w-3xl" : "max-w-xl"} my-2 sm:my-4 max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] overflow-hidden flex flex-col`}>
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

const emptyForm = (cats) => ({
  name: "", category: (cats && cats[0]) || "", bizType: "사업장",
  manager: "", phone: "", baseDate: todayStr(), baseReceivable: 0,
  bizNo: "", ceo: "", upTae: "", jongMok: "", address: "", memo: "",
});

const wonFmt = (n) => (Number(n) || 0).toLocaleString("ko-KR");

export function VendorManagement({ isMaster }) {
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [topErr, setTopErr] = useState("");

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("전체");
  const [managerFilter, setManagerFilter] = useState("전체");

  const [formOpen, setFormOpen] = useState(false);
  const [editCode, setEditCode] = useState(null);
  const [form, setForm] = useState(emptyForm(DEFAULT_CATEGORIES));
  const [detailOpen, setDetailOpen] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [catOpen, setCatOpen] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [confirmState, setConfirmState] = useState(null); // {message, onYes}
  const [uploadMsg, setUploadMsg] = useState("");
  const fileRef = useRef();

  useEffect(() => {
    const u1 = subscribeVendors((list) => { setVendors(list); setLoading(false); }, (e) => { setTopErr(e?.message || "불러오기 실패"); setLoading(false); });
    const u2 = subscribeVendorMeta((meta) => setCategories(meta.categories), () => {});
    return () => { u1(); u2(); };
  }, []);

  const managers = useMemo(() => Array.from(new Set(vendors.map((v) => v.manager).filter(Boolean))).sort(), [vendors]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vendors.filter((v) => {
      if (catFilter !== "전체" && v.category !== catFilter) return false;
      if (managerFilter !== "전체" && v.manager !== managerFilter) return false;
      if (!q) return true;
      return [v.code, v.name, v.manager, v.phone, v.bizNo].some((s) => String(s || "").toLowerCase().includes(q));
    });
  }, [vendors, search, catFilter, managerFilter]);

  const set = (k, val) => setForm((f) => ({ ...f, [k]: val }));

  const openCreate = () => { setEditCode(null); setForm(emptyForm(categories)); setDetailOpen(false); setFormErr(""); setFormOpen(true); };
  const openEdit = (v) => { setEditCode(v.code); setForm({ ...emptyForm(categories), ...v }); setDetailOpen(Boolean(v.bizNo || v.ceo || v.upTae || v.jongMok || v.address || v.memo)); setFormErr(""); setFormOpen(true); };

  const doSave = async () => {
    setBusy(true); setFormErr("");
    const payload = {
      name: form.name.trim(), category: form.category, bizType: form.bizType,
      manager: form.manager.trim(), phone: form.phone.trim(),
      baseDate: form.baseDate || todayStr(), baseReceivable: Number(form.baseReceivable) || 0,
      bizNo: form.bizNo.trim(), ceo: form.ceo.trim(), upTae: form.upTae.trim(),
      jongMok: form.jongMok.trim(), address: form.address.trim(), memo: form.memo.trim(),
    };
    try {
      if (editCode) await updateVendor(editCode, payload);
      else await createVendor(payload);
      setFormOpen(false);
    } catch (e) { setFormErr(e?.message || "저장 실패"); }
    setBusy(false);
  };

  const trySave = () => {
    setFormErr("");
    if (!form.name.trim()) return setFormErr("거래처명을 입력해주세요.");
    if (!form.category) return setFormErr("구분을 선택해주세요.");
    if (!form.manager.trim()) return setFormErr("담당자를 입력해주세요.");
    if (!form.phone.trim()) return setFormErr("연락처를 입력해주세요.");
    // 유사중복: 거래처명 동일 또는 사업자번호 동일 (본인 제외)
    const dup = vendors.find((v) => v.code !== editCode && (
      v.name.trim() === form.name.trim() ||
      (form.bizNo.trim() && String(v.bizNo || "").trim() === form.bizNo.trim())
    ));
    if (dup) {
      setConfirmState({
        message: `이미 '${dup.name}' (${dup.code}) 거래처가 등록되어 있습니다.\n그래도 추가하시겠습니까?`,
        onYes: () => { setConfirmState(null); doSave(); },
      });
      return;
    }
    doSave();
  };

  const removeVendor = (v) => setConfirmState({
    message: `'${v.name}' (${v.code}) 거래처를 삭제하시겠습니까?`,
    onYes: async () => { setConfirmState(null); try { await deleteVendor(v.code); } catch (e) { setTopErr(e?.message || "삭제 실패"); } },
  });

  const onUpload = async (file) => {
    if (!file) return;
    setUploadMsg("업로드 중...");
    try {
      const rows = await parseVendorExcel(file);
      const { added, skipped } = await bulkCreateVendors(rows, vendors);
      setUploadMsg(`${added}건 추가${skipped ? `, ${skipped}건 중복 제외` : ""} 완료`);
    } catch (e) { setUploadMsg("업로드 실패: " + (e?.message || "")); }
    if (fileRef.current) fileRef.current.value = "";
  };

  const downloadFiltered = () => {
    const label = managerFilter !== "전체" ? `_${managerFilter}` : "";
    downloadVendors(filtered, `거래처목록${label}.xlsx`);
  };

  const addCategory = async () => {
    const c = newCat.trim();
    if (!c || categories.includes(c)) { setNewCat(""); return; }
    await setCategories([...categories, c]);
    setNewCat("");
  };
  const removeCategory = async (c) => { await setCategories(categories.filter((x) => x !== c)); };

  const btn = "h-10 px-3 rounded-xl border text-xs font-bold inline-flex items-center justify-center transition whitespace-nowrap";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-slate-800">거래처관리</h1>
          <p className="text-sm text-slate-500 mt-0.5">거래처를 등록하고 구분·담당자·기초미수금을 관리합니다.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setCatOpen(true)} className={`${btn} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}>구분 설정</button>
          <button onClick={downloadTemplate} className={`${btn} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}>엑셀 양식</button>
          <button onClick={() => fileRef.current?.click()} className={`${btn} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}>엑셀 업로드</button>
          <button onClick={downloadFiltered} className={`${btn} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}>엑셀 다운로드</button>
          <button onClick={openCreate} className={`${btn} border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700`}>+ 거래처 등록</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => onUpload(e.target.files?.[0])} />
        </div>
      </div>

      {uploadMsg && <div className="text-sm rounded-xl bg-indigo-50 text-indigo-700 px-4 py-2.5">{uploadMsg}</div>}
      {topErr && <div className="text-sm rounded-xl bg-rose-50 text-rose-600 px-4 py-2.5">{topErr}</div>}

      <div className="flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1">
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="코드 · 거래처명 · 담당자 · 연락처 · 사업자번호 검색"
            className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-3 pr-3 text-sm outline-none focus:border-indigo-400" />
        </div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
          <option value="전체">구분 전체</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={managerFilter} onChange={(e) => setManagerFilter(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
          <option value="전체">담당자 전체</option>
          {managers.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="overflow-auto rounded-2xl border border-slate-200">
        <table className="w-full text-xs sm:text-sm min-w-[860px]">
          <thead>
            <tr className="bg-slate-50 text-slate-500">
              <th className="text-left px-3 py-2.5 font-semibold">코드</th>
              <th className="text-left px-3 py-2.5 font-semibold">거래처명</th>
              <th className="text-left px-3 py-2.5 font-semibold">구분</th>
              <th className="text-left px-3 py-2.5 font-semibold">담당자</th>
              <th className="text-left px-3 py-2.5 font-semibold">연락처</th>
              <th className="text-left px-3 py-2.5 font-semibold">기초일</th>
              <th className="text-right px-3 py-2.5 font-semibold">기초미수금</th>
              <th className="text-right px-3 py-2.5 font-semibold">작업</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center text-slate-400 py-10">불러오는 중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-slate-400 py-10">등록된 거래처가 없습니다.</td></tr>
            ) : filtered.map((v) => (
              <tr key={v.code} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="px-3 py-2.5 font-mono text-slate-500">{v.code}</td>
                <td className="px-3 py-2.5 font-semibold text-slate-700">{v.name}</td>
                <td className="px-3 py-2.5"><span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">{v.category}</span></td>
                <td className="px-3 py-2.5 text-slate-600">{v.manager}</td>
                <td className="px-3 py-2.5 text-slate-600">{v.phone}</td>
                <td className="px-3 py-2.5 text-slate-500">{v.baseDate}</td>
                <td className="px-3 py-2.5 text-right text-slate-700">{wonFmt(v.baseReceivable)}원</td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(v)} className="text-xs px-2 py-1 rounded-lg border border-slate-200 hover:bg-white mr-1">수정</button>
                  <button onClick={() => removeVendor(v)} className="text-xs px-2 py-1 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50">삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 등록/수정 모달 */}
      <VModal open={formOpen} onClose={() => setFormOpen(false)} wide
        title={editCode ? `거래처 수정 (${editCode})` : "거래처 등록"}
        footer={
          <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2">
            <button onClick={() => setFormOpen(false)} className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600">취소</button>
            <button onClick={trySave} disabled={busy} className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">{busy ? "저장 중..." : (editCode ? "수정 저장" : "등록")}</button>
          </div>
        }>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="거래처명" required><input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="구분" required>
              <select className={inputCls} value={form.category} onChange={(e) => set("category", e.target.value)}>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="담당자" required><input className={inputCls} value={form.manager} onChange={(e) => set("manager", e.target.value)} /></Field>
            <Field label="연락처" required><input className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="010-0000-0000" /></Field>
            <Field label="사업자유형">
              <select className={inputCls} value={form.bizType} onChange={(e) => set("bizType", e.target.value)}>
                <option value="사업장">사업장</option>
                <option value="일반">일반</option>
              </select>
            </Field>
            <Field label="기초일"><input type="date" className={inputCls} value={form.baseDate} onChange={(e) => set("baseDate", e.target.value)} /></Field>
            <Field label="기초미수금"><input type="text" inputMode="numeric" className={inputCls} value={form.baseReceivable} onChange={(e) => set("baseReceivable", e.target.value.replace(/[^0-9.-]/g, ""))} /></Field>
          </div>

          <button type="button" onClick={() => setDetailOpen((o) => !o)} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
            {detailOpen ? "▾ 상세 정보 닫기" : "▸ 상세 정보 입력 (사업자번호 · 대표자 · 업태 · 종목 · 주소 외)"}
          </button>

          {detailOpen && (
            <div className="grid sm:grid-cols-2 gap-3 pt-1">
              <Field label="사업자번호"><input className={inputCls} value={form.bizNo} onChange={(e) => set("bizNo", e.target.value)} placeholder="000-00-00000" /></Field>
              <Field label="대표자"><input className={inputCls} value={form.ceo} onChange={(e) => set("ceo", e.target.value)} /></Field>
              <Field label="업태"><input className={inputCls} value={form.upTae} onChange={(e) => set("upTae", e.target.value)} /></Field>
              <Field label="종목"><input className={inputCls} value={form.jongMok} onChange={(e) => set("jongMok", e.target.value)} /></Field>
              <div className="sm:col-span-2"><Field label="주소"><input className={inputCls} value={form.address} onChange={(e) => set("address", e.target.value)} /></Field></div>
              <div className="sm:col-span-2"><Field label="기타"><input className={inputCls} value={form.memo} onChange={(e) => set("memo", e.target.value)} /></Field></div>
            </div>
          )}
          {formErr && <p className="text-rose-500 text-sm">{formErr}</p>}
        </div>
      </VModal>

      {/* 구분 설정 모달 */}
      <VModal open={catOpen} onClose={() => setCatOpen(false)} title="구분 설정"
        footer={<div className="flex justify-end"><button onClick={() => setCatOpen(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600">닫기</button></div>}>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input className={inputCls} value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCategory()} placeholder="새 구분 이름" />
            <button onClick={addCategory} className="shrink-0 px-4 rounded-xl bg-indigo-600 text-white text-sm font-medium">추가</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <span key={c} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-sm">
                {c}
                <button onClick={() => removeCategory(c)} className="text-slate-400 hover:text-rose-500" title="삭제">✕</button>
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-400">구분을 추가하면 거래처 등록·품목 가격에서 함께 사용됩니다.</p>
        </div>
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
