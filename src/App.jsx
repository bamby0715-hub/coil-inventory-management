import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  LayoutDashboard, PackagePlus, Truck, Boxes, BarChart3, Palette,
  Search, Download, Plus, ChevronDown, ChevronRight, Check,
  Trash2, Pencil, X, AlertTriangle, Clock, Menu, ArrowRight,
  Factory, MapPin, LogOut, Layers3, CalendarDays
} from "lucide-react";
import * as XLSX from "xlsx";

/* =========================================================================
   HN메탈릭 코일 재고관리 시스템 (v2)
   · 접속 비밀번호: 0707
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

const COLOR_MASTER = [
  { product: "강판", thickness: "0.4", maker: "동국", color: "차콜" },
  { product: "강판", thickness: "0.45", maker: "동국", color: "검정" },
  { product: "강판", thickness: "0.45", maker: "동국", color: "밤색" },
  { product: "강판", thickness: "0.45", maker: "동국", color: "쑥색" },
  { product: "강판", thickness: "0.45", maker: "동국", color: "적색" },
  { product: "강판", thickness: "0.45", maker: "동국", color: "차콜" },
  { product: "강판", thickness: "0.45", maker: "동국", color: "청색" },
  { product: "강판", thickness: "0.45", maker: "동국", color: "칼그레이" },
  { product: "강판", thickness: "0.45", maker: "동국", color: "백색" },
  { product: "강판", thickness: "0.45", maker: "포스코", color: "검정" },
  { product: "강판", thickness: "0.45", maker: "포스코", color: "밤색" },
  { product: "강판", thickness: "0.45", maker: "포스코", color: "쑥색" },
  { product: "강판", thickness: "0.45", maker: "포스코", color: "연그레이" },
  { product: "강판", thickness: "0.45", maker: "포스코", color: "적색" },
  { product: "강판", thickness: "0.45", maker: "포스코", color: "차콜" },
  { product: "강판", thickness: "0.45", maker: "포스코", color: "청색" },
  { product: "강판", thickness: "0.45", maker: "포스코", color: "황토" },
  { product: "징크", thickness: "0.45", maker: "동국", color: "다크그레이" },
  { product: "징크", thickness: "0.5", maker: "동국", color: "다크그레이" },
  { product: "징크", thickness: "0.45", maker: "동국", color: "라이트그레이" },
  { product: "징크", thickness: "0.5", maker: "동국", color: "라이트그레이" },
  { product: "징크", thickness: "0.45", maker: "동국", color: "차콜" },
  { product: "징크", thickness: "0.5", maker: "동국", color: "차콜" },
  { product: "징크", thickness: "0.45", maker: "동국", color: "칼그레이" },
  { product: "징크", thickness: "0.5", maker: "동국", color: "칼그레이" },
  { product: "징크", thickness: "0.45", maker: "동국", color: "메탈그레이" },
  { product: "징크", thickness: "0.5", maker: "동국", color: "메탈그레이" },
  { product: "징크", thickness: "0.45", maker: "동국", color: "백색" },
  { product: "징크", thickness: "0.5", maker: "동국", color: "백색" },
  { product: "징크", thickness: "0.45", maker: "세아", color: "메탈실버" },
  { product: "징크", thickness: "0.5", maker: "세아", color: "메탈실버" },
  { product: "징크", thickness: "0.45", maker: "세아", color: "베이지우드" },
  { product: "징크", thickness: "0.5", maker: "세아", color: "베이지우드" },
  { product: "징크", thickness: "0.45", maker: "세아", color: "브론즈우드" },
  { product: "징크", thickness: "0.5", maker: "세아", color: "브론즈우드" },
  { product: "징크", thickness: "0.45", maker: "DK동신", color: "월넛우드" },
  { product: "징크", thickness: "0.5", maker: "DK동신", color: "월넛우드" },
  { product: "징크", thickness: "0.5", maker: "해외", color: "백색" },
  { product: "징크", thickness: "0.5", maker: "세아", color: "코르텐" },
  { product: "징크", thickness: "0.5", maker: "포스코", color: "라이트그레이" },
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
const rand4 = () => String(Math.floor(1000 + Math.random() * 9000));
const makeCoilNo = (dateStr) => `C-${(dateStr || todayStr()).replace(/-/g, "")}-${rand4()}`;

/* ---------- 저장소 훅 (미리보기=메모리 / 다운로드HTML=localStorage 자동교체) ---------- */
function useStore(key, initialValue) {
  return useState(initialValue);
}

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
function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto bg-slate-900/50 backdrop-blur-sm no-print">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? "max-w-3xl" : "max-w-xl"} my-2 sm:my-6 max-h-[96vh] overflow-y-auto`}>
        <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100">
          <h3 className="text-base sm:text-lg font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X size={20} /></button>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-5">{children}</div>
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
function ExcelBtn({ onClick }) {
  return (
    <button onClick={onClick} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 inline-flex items-center gap-1.5 hover:bg-slate-50 no-print">
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
  { key: "inventory", label: "재고현황", icon: Boxes, group: "현황", desc: "M 기준 재고" },
  { key: "sales", label: "거래처별 현황", icon: BarChart3, group: "분석", desc: "매입·출고 분석" },
  { key: "colors", label: "색상표", icon: Palette, group: "기타", desc: "강판·징크 색상" },
];

export default function CoilInventory() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [menu, setMenu] = useState("dashboard");
  const [drawer, setDrawer] = useState(false);

  const initial = useMemo(seed, []);
  const [coils, setCoils] = useStore("coils", initial.coils);
  const [inbound, setInbound] = useStore("inbound", initial.inbound);
  const [outbound, setOutbound] = useStore("outbound", initial.outbound);

  const tryLogin = () => { if (pw === "0707") { setAuthed(true); setPwErr(""); } else setPwErr("비밀번호가 일치하지 않습니다."); };

  if (!authed) return <Login pw={pw} setPw={setPw} pwErr={pwErr} tryLogin={tryLogin} />;

  const ctx = { coils, setCoils, inbound, setInbound, outbound, setOutbound };
  const goto = (k) => { setMenu(k); setDrawer(false); };
  const current = NAV.find((n) => n.key === menu);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <GlobalStyle />
      {/* 상단 바 */}
      <header className="sticky top-0 z-50 bg-white/65 backdrop-blur-xl border-b border-white/70 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-3 md:px-8 h-16 md:h-20 flex items-center justify-between">
          <button onClick={() => goto("dashboard")} className="h-11 md:h-13">
            <img src="/coil-inventory-management/assets/hnmt-logo.png" alt="HNMT" className="w-36 md:w-48 h-full object-contain" style={{ filter: "brightness(0) saturate(100%) invert(17%) sepia(26%) saturate(1412%) hue-rotate(190deg) brightness(86%) contrast(91%)" }} />
          </button>
          <button onClick={() => setDrawer(true)} aria-label="메뉴 열기"
            className="w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-white/25 border border-white/60 backdrop-blur-xl shadow-lg shadow-indigo-200/30 flex items-center justify-center transition hover:bg-white/45 hover:-translate-y-0.5">
            <Menu size={22} className="text-indigo-500/80" />
          </button>
        </div>
      </header>

      {/* 상단에서 아래로 펼쳐지는 드로어 */}
      <Drawer open={drawer} onClose={() => setDrawer(false)} menu={menu} goto={goto} onLogout={() => { setAuthed(false); setPw(""); setDrawer(false); }} />

      <main className="max-w-[1400px] mx-auto p-4 md:p-8">
        {menu === "dashboard" && <Dashboard ctx={ctx} goto={goto} />}
        {menu === "inbound" && <Inbound ctx={ctx} />}
        {menu === "outbound" && <Outbound ctx={ctx} />}
        {menu === "inventory" && <Inventory ctx={ctx} />}
        {menu === "sales" && <Sales ctx={ctx} />}
        {menu === "colors" && <Colors ctx={ctx} />}
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
      .glow-lock{ animation:glowPulse 2.6s ease-in-out infinite; }
      .twinkle{ animation:twinkle 3s ease-in-out infinite; }
      .drawer-anim{ animation:slideDown .28s ease-out; }
      .menu-card{ animation:cardSlide .38s ease-out both; }
      .gradient-icon svg{ stroke:url(#menuIconGradient); }
      .metric-icon svg{ stroke:url(#metricIconGradient); }
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
          <input autoFocus type="password" inputMode="numeric" maxLength={4} value={pw}
            onChange={(e) => setPw(e.target.value.replace(/\D/g, "").slice(0, 4))}
            onKeyDown={(e) => e.key === "Enter" && tryLogin()} placeholder="•  •  •  •"
            aria-label="비밀번호 4자리"
            className="block w-60 sm:w-64 mx-auto text-center tracking-[0.55em] text-xl font-medium text-slate-300 placeholder:text-slate-300 py-2.5 pl-[0.55em] rounded-2xl border border-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-300/60 bg-white/70 shadow-inner" />
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
      <div onClick={(e) => e.stopPropagation()} className="drawer-anim absolute top-0 inset-x-0 text-slate-700 shadow-2xl rounded-b-[2rem] border-b border-white/70"
        style={{ background: "linear-gradient(135deg,rgba(247,202,201,.94),rgba(225,207,228,.94),rgba(146,168,209,.94))" }}>
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-5 md:py-7">
          <svg width="0" height="0" aria-hidden="true"><defs><linearGradient id="menuIconGradient" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ef9aaf" /><stop offset=".5" stopColor="#a78bfa" /><stop offset="1" stopColor="#6387ca" /></linearGradient></defs></svg>
          <div className="flex items-center justify-between mb-5">
            <div className="h-11">
              <img src="/coil-inventory-management/assets/hnmt-logo.png" alt="HNMT" className="w-40 h-full object-contain" style={{ filter: "brightness(0) saturate(100%) invert(17%) sepia(26%) saturate(1412%) hue-rotate(190deg) brightness(86%) contrast(91%)" }} />
            </div>
            <button onClick={onClose} className="p-2 rounded-xl bg-white/25 hover:bg-white/45"><X size={22} /></button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {NAV.map((n) => {
              const Icon = n.icon; const active = menu === n.key;
              return (
                <button key={n.key} onClick={() => goto(n.key)} title={n.label} aria-label={n.label}
                  style={{ animationDelay: `${NAV.indexOf(n) * 45}ms` }}
                  className={`menu-card group rounded-2xl p-3 md:p-4 border transition flex flex-col items-center gap-2 ${active ? "bg-white/60 border-white shadow-xl" : "bg-white/25 border-white/45 hover:bg-white/45 hover:-translate-y-1"}`}>
                  <div className="gradient-icon w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center bg-white/35 border border-white/50 shadow-lg backdrop-blur">
                    <Icon size={26} />
                  </div>
                  <div className="text-xs font-semibold text-slate-700 text-center">{n.label}</div>
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex justify-end">
            <button onClick={onLogout} className="text-xs text-slate-600 hover:text-rose-600 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/40 inline-flex items-center gap-1"><LogOut size={13} />로그아웃</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   대시보드
   ========================================================================= */
function completeOutboundRecord(o, coils, setCoils, setOutbound) {
  const pool = coils
    .filter((c) => c.product_type === o.product_type && c.current_meter > 0)
    .sort((a, b) => {
      if (cFirst(a, o.coil_number) !== cFirst(b, o.coil_number)) return cFirst(a, o.coil_number) - cFirst(b, o.coil_number);
      return (a.inbound_date || a.created_at).localeCompare(b.inbound_date || b.created_at);
    });
  const avail = pool.reduce((a, c) => a + c.current_meter, 0);
  if (o.outbound_meter > avail) {
    alert("현재 재고 M보다 출고 예정 M이 커서 완료할 수 없습니다.");
    return;
  }
  if (!confirm("이 출고 건을 출고 완료 처리하시겠습니까? 재고가 차감됩니다.")) return;

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
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
              {group.colors.map((item) => (
                <div key={item.color} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white border border-slate-200/70 text-sm">
                  <Swatch name={item.color} size={12} />
                  <span className="font-bold text-indigo-800 whitespace-nowrap">{fmt(item.meter)} M</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Dashboard({ ctx }) {
  const { coils, setCoils, outbound, setOutbound } = ctx;
  const [slide, setSlide] = useState(0);
  const [mobileProduct, setMobileProduct] = useState("");
  const [selectedTodo, setSelectedTodo] = useState(null);
  const t = useRef();
  const slides = [
    { label: "HN메탈릭 홈페이지", image: "/coil-inventory-management/assets/slide-shop.png", link: "https://hnmt.co.kr/" },
    { label: "HN메탈릭 유튜브", image: "/coil-inventory-management/assets/slide-youtube-new.png", link: "https://www.youtube.com/@hn메탈릭" },
    { label: "HN메탈릭 인스타그램", image: "/coil-inventory-management/assets/slide-instagram.png", link: "https://www.instagram.com/hnmt1555" },
  ];

  useEffect(() => {
    t.current = setInterval(() => setSlide((s) => (s + 1) % slides.length), 4500);
    return () => clearInterval(t.current);
  }, [slides.length]);

  const totalMeter = coils.reduce((a, c) => a + (c.current_meter || 0), 0);
  const incomplete = outbound.filter((o) => !o.is_completed);
  const currentDate = todayStr();
  const todayShip = incomplete.filter((o) => o.outbound_date === currentDate).length;
  const held = incomplete.filter((o) => o.outbound_date < currentDate).length;
  const productStats = ["강판", "징크"].map((product) => {
    const rows = coils.filter((c) => c.product_type === product && c.current_meter > 0);
    const manufacturers = [...new Set(rows.map((c) => c.manufacturer || "미지정"))].sort((a, b) => a.localeCompare(b, "ko"));
    return {
      product,
      kinds: new Set(rows.map((c) => `${c.manufacturer}-${c.color_name}-${c.thickness}`)).size,
      meter: rows.reduce((sum, c) => sum + (Number(c.current_meter) || 0), 0),
      groups: manufacturers.map((manufacturer) => {
        const makerRows = rows.filter((c) => (c.manufacturer || "미지정") === manufacturer);
        const colors = [...new Set(makerRows.map((c) => c.color_name || "미지정"))]
          .sort((a, b) => a.localeCompare(b, "ko"))
          .map((color) => ({
            color,
            meter: makerRows.filter((c) => (c.color_name || "미지정") === color)
              .reduce((sum, c) => sum + (Number(c.current_meter) || 0), 0),
          }));
        return { manufacturer, colors };
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
    { label: "미완료 출고", value: incomplete.length, unit: "건", icon: Clock },
    { label: "출고 보류", value: held, unit: "건", icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <svg width="0" height="0" aria-hidden="true"><defs><linearGradient id="metricIconGradient" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ef9aaf" /><stop offset=".52" stopColor="#b49ad7" /><stop offset="1" stopColor="#7897cf" /></linearGradient></defs></svg>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">대시보드</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">입고·출고·재고 현황을 한눈에 확인하세요</p>
        </div>
        <div className="text-[11px] sm:text-sm font-semibold text-slate-500 whitespace-nowrap pt-1">{todayLabel()}</div>
      </div>

      {/* 슬라이더 */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm h-52 md:h-72 bg-white">
        {slides.map((s, i) => (
          <a key={i} href={s.link} target="_blank" rel="noreferrer" aria-label={s.label}
            className={`group absolute inset-0 transition-opacity duration-700 ${i === slide ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            style={{ backgroundImage: `url(${s.image})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        ))}
        <button onClick={() => setSlide((slide - 1 + slides.length) % slides.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/30 hover:bg-white/50 text-white backdrop-blur">‹</button>
        <button onClick={() => setSlide((slide + 1) % slides.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/30 hover:bg-white/50 text-white backdrop-blur">›</button>
        <div className="absolute bottom-4 right-5 flex gap-1.5">
          {slides.map((_, i) => <button key={i} onClick={() => setSlide(i)} className={`h-2 rounded-full transition-all ${i === slide ? "w-6 bg-white" : "w-2 bg-white/50"}`} />)}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 md:gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return <Card key={card.label} className="p-2.5 sm:p-3 md:p-5">
            <div className="flex flex-col md:flex-row items-center gap-1.5 md:gap-3 text-center md:text-left">
              <div className="metric-icon flex items-center justify-center shrink-0"><Icon size={20} /></div>
              <div><div className="text-[10px] sm:text-xs md:text-sm font-semibold text-slate-500 leading-tight">{card.label}</div><div className="text-xl sm:text-2xl md:text-3xl font-black mt-0.5">{card.value}<span className="text-[10px] sm:text-xs md:text-sm text-slate-400 ml-0.5">{card.unit}</span></div></div>
            </div>
          </Card>;
        })}
      </div>

      <div className="space-y-3">
        {productStats.map((stat) => (
          <ProductStockCard key={stat.product} stat={stat} open={mobileProduct === stat.product}
            onToggle={() => setMobileProduct((current) => current === stat.product ? "" : stat.product)} />
        ))}
      </div>

      {/* 미완료 출고 투두리스트 */}
      <Card className="overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="metric-icon shrink-0"><Clock size={22} /></div>
          <div><div className="flex items-center gap-2"><h3 className="font-bold">미완료 내역</h3><span className="text-xs text-slate-400">{todo.length}건</span></div><p className="text-xs text-slate-400 mt-0.5">출고일 기준 오름차순으로 표시됩니다.</p></div>
        </div>
        <div className="divide-y divide-slate-50">
          {todo.length === 0 && <div className="px-5 py-8 text-center text-slate-400 text-sm">미완료 출고 건이 없습니다.</div>}
          {todo.map((o) => {
            const overdue = o.outbound_date < currentDate; const today = o.outbound_date === currentDate;
            return (
              <div key={o.id} className={`px-4 sm:px-5 py-3.5 flex items-center gap-3 ${overdue ? "bg-rose-50/40" : today ? "bg-amber-50/40" : ""}`}>
                <div className="metric-icon shrink-0"><Truck size={20} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0 text-sm sm:text-base">
                    <button onClick={() => setSelectedTodo(o)} className="font-extrabold text-indigo-800 hover:underline truncate">{o.customer || "거래처 미입력"}</button>
                    <span className="text-slate-500 truncate">{o.manufacturer || "-"} / {o.color_name || "-"}</span>
                    <span className="font-black text-slate-800 whitespace-nowrap">{fmt(o.outbound_meter)} M</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">출고일 {o.outbound_date} · 도착 {o.arrival_date} {o.arrival_time}</div>
                </div>
                <button onClick={() => completeOutboundRecord(o, coils, setCoils, setOutbound)} className="shrink-0 px-2.5 sm:px-3 py-2 rounded-xl bg-gradient-to-r from-rose-300 via-violet-400 to-blue-400 text-white text-xs sm:text-sm font-bold shadow-sm"><Check size={14} className="inline mr-1" />완료</button>
              </div>
            );
          })}
        </div>
      </Card>

      <Modal open={!!selectedTodo} onClose={() => setSelectedTodo(null)} title={`${selectedTodo?.customer || "거래처"} 출고 요약`}>
        {selectedTodo && <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
          {[
            ["출고일", selectedTodo.outbound_date], ["거래처", selectedTodo.customer || "-"],
            ["도착일", selectedTodo.arrival_date], ["도착시간", selectedTodo.arrival_time],
            ["제품 구분", selectedTodo.product_type], ["코일번호", selectedTodo.coil_number || "-"],
            ["제조사", selectedTodo.manufacturer || "-"], ["색상명", selectedTodo.color_name || "-"],
            ["출고량", `${fmt(selectedTodo.outbound_meter)} M`], ["현장주소", selectedTodo.site_address || "-"],
            ["비고", selectedTodo.memo || "-"],
          ].map(([label, value]) => <div key={label} className={label === "현장주소" || label === "비고" ? "col-span-2" : ""}><div className="text-xs text-slate-400">{label}</div><div className="font-semibold mt-0.5">{value}</div></div>)}
        </div>}
      </Modal>
    </div>
  );
}

/* =========================================================================
   제품구분→제조사 필터 + 색상 자동완성 (입고 폼에서 사용)
   ========================================================================= */
function ColorPicker({ product, maker, value, onPick }) {
  const [focus, setFocus] = useState(false);
  const opts = colorsFor(product, maker);
  const list = value ? opts.filter((o) => o.color.includes(value)) : opts;
  const uniq = [...new Map(list.map((o) => [o.color, o])).values()];
  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <span style={{ background: hexOf(value) }} className="w-8 h-8 rounded-lg border border-slate-300 shrink-0" />
        <input className={inputCls} value={value} placeholder="색상명 입력 시 자동 검색"
          onChange={(e) => onPick(e.target.value, null)} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)} />
      </div>
      {focus && uniq.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg">
          {uniq.map((o, i) => (
            <button key={i} type="button" onMouseDown={() => onPick(o.color, o.thickness)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-indigo-50 text-left">
              <span style={{ background: hexOf(o.color) }} className="w-5 h-5 rounded-md border border-slate-300" />
              <span className="font-medium">{o.color}</span>
              <span className="text-xs text-slate-400 ml-auto">{o.thickness}T</span>
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
const blankInbound = () => ({ inbound_date: todayStr(), product_type: "강판", manufacturer: "", color_name: "", thickness: "", coil_meter: 0, purchaser: "", memo: "" });

function Inbound({ ctx }) {
  const { inbound, setInbound, coils, setCoils } = ctx;
  const [q, setQ] = useState("");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blankInbound());
  const [editId, setEditId] = useState(null);
  const [detail, setDetail] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const makers = makersFor(form.product_type);

  const onProduct = (p) => setForm((f) => ({ ...f, product_type: p, manufacturer: "", color_name: "", thickness: "" }));
  const onColor = (name, thick) => setForm((f) => ({ ...f, color_name: name, thickness: thick != null ? thick : f.thickness }));

  const submit = () => {
    const meter = Number(form.coil_meter) || 0;
    if (!form.inbound_date || !form.product_type || !form.manufacturer || !form.color_name || !form.thickness || meter <= 0) {
      alert("*필수입력을 작성해주세요");
      return;
    }
    if (editId) {
      setInbound((l) => l.map((r) => r.id === editId ? { ...r, ...form, coil_meter: meter, updated_at: todayStr() } : r));
      const original = inbound.find((r) => r.id === editId);
      if (original) {
        setCoils((l) => l.map((c) => c.id === original.coil_id || c.coil_number === original.coil_number ? {
          ...c, product_type: form.product_type, manufacturer: form.manufacturer, color_name: form.color_name,
          thickness: form.thickness, purchaser: form.purchaser, memo: form.memo, inbound_date: form.inbound_date,
          initial_meter: meter, current_meter: Math.max(0, meter - (c.total_outbound_meter || 0)), updated_at: todayStr(),
        } : c));
      }
    } else {
      const coilNo = makeCoilNo(form.inbound_date);
      const coilId = uid();
      setInbound((l) => [{ id: uid(), coil_id: coilId, coil_number: coilNo, ...form, coil_meter: meter, created_at: todayStr(), updated_at: todayStr() }, ...l]);
      setCoils((l) => [{
        id: coilId, coil_number: coilNo, product_type: form.product_type, manufacturer: form.manufacturer,
        color_name: form.color_name, thickness: form.thickness, purchaser: form.purchaser,
        initial_meter: meter, current_meter: meter, total_outbound_meter: 0, current_roll_count: 1,
        status: "정상", memo: form.memo, inbound_date: form.inbound_date, created_at: todayStr(), updated_at: todayStr(),
      }, ...l]);
    }
    setOpen(false); setForm(blankInbound()); setEditId(null);
  };
  const startEdit = (r) => { setForm({ ...r }); setEditId(r.id); setOpen(true); };
  const remove = (id) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const target = inbound.find((r) => r.id === id);
    setInbound((l) => l.filter((r) => r.id !== id));
    if (target) setCoils((l) => l.filter((c) => c.id !== target.coil_id && c.coil_number !== target.coil_number));
    if (detail?.id === id) setDetail(null);
  };

  const rows = inbound
    .filter((r) => inRange(r.inbound_date, from, to))
    .filter((r) => [r.coil_number, r.manufacturer, r.color_name, r.purchaser].join(" ").toLowerCase().includes(q.toLowerCase()));

  const exportXlsx = () => downloadXlsx(rows.map((r) => ({
    입고일: r.inbound_date, 코일번호: r.coil_number, 제품구분: r.product_type, 제조사: r.manufacturer,
    색상명: r.color_name, 두께: r.thickness, 코일M: r.coil_meter, 매입처: r.purchaser, 비고: r.memo,
  })), "입고내역", "입고내역.xlsx");

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div><h2 className="text-2xl font-extrabold tracking-tight">입고관리</h2><p className="text-slate-500 text-sm mt-0.5">코일번호는 자동 생성됩니다 (C-YYYYMMDD-####)</p></div>
        <div className="flex gap-2">
          <ExcelBtn onClick={exportXlsx} />
          <button onClick={() => { setForm(blankInbound()); setEditId(null); setOpen(true); }} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium inline-flex items-center gap-1.5 hover:bg-indigo-700 no-print"><Plus size={16} />입고 등록</button>
        </div>
      </div>
      <Toolbar q={q} setQ={setQ}><DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} /></Toolbar>

      <Card className="overflow-hidden print-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>{["입고일", "코일번호", "구분", "제조사", "색상", "두께", "코일M", "매입처", "비고", ""].map((h) => <th key={h} className="px-3 py-2.5 text-left font-medium whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2.5 whitespace-nowrap">{r.inbound_date}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <button onClick={() => setDetail(r)} className="font-semibold text-indigo-700 hover:text-rose-500 hover:underline">{r.coil_number}</button>
                    </td>
                    <td className="px-3 py-2.5">{r.product_type}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{r.manufacturer}</td>
                    <td className="px-3 py-2.5"><Swatch name={r.color_name} /></td>
                    <td className="px-3 py-2.5">{r.thickness}</td>
                    <td className="px-3 py-2.5 font-medium">{fmt(r.coil_meter)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{r.purchaser}</td>
                    <td className="px-3 py-2.5 text-slate-500 max-w-[160px] truncate">{r.memo}</td>
                    <td className="px-3 py-2.5 no-print">
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(r)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Pencil size={15} /></button>
                        <button onClick={() => remove(r.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-400">입고 내역이 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

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

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? "입고 수정" : "입고 등록"} wide>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="입고일" required><input type="date" className={inputCls} value={form.inbound_date} onChange={(e) => set("inbound_date", e.target.value)} /></Field>
          <Field label="제품 구분" required>
            <div className="flex gap-2">
              {["강판", "징크"].map((p) => (
                <button key={p} type="button" onClick={() => onProduct(p)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border ${form.product_type === p ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>{p}</button>
              ))}
            </div>
          </Field>
          <Field label="제조사 (구분에 따라 자동 필터)" required>
            <select className={inputCls} value={form.manufacturer} onChange={(e) => set("manufacturer", e.target.value)}>
              <option value="">선택하세요</option>
              {makers.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="두께 (자동 입력 · 수정 가능)"><input className={inputCls} value={form.thickness} onChange={(e) => set("thickness", e.target.value)} placeholder="색상 선택 시 자동" /></Field>
          <Field label="색상명 (자동 검색)" required>
            <ColorPicker product={form.product_type} maker={form.manufacturer} value={form.color_name} onPick={onColor} />
          </Field>
          <Field label="코일 M" required><input type="number" className={inputCls} value={form.coil_meter} onChange={(e) => set("coil_meter", e.target.value)} /></Field>
          <Field label="매입처"><input className={inputCls} value={form.purchaser} onChange={(e) => set("purchaser", e.target.value)} placeholder="예: 동국제강" /></Field>
          <Field label="비고"><input className={inputCls} value={form.memo} onChange={(e) => set("memo", e.target.value)} /></Field>
        </div>
        <div className="mt-5 grid grid-cols-2 sm:flex sm:justify-end gap-2">
          <button onClick={() => setOpen(false)} className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600">취소</button>
          <button onClick={submit} className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">{editId ? "저장" : "등록"}</button>
        </div>
      </Modal>
    </div>
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
  outbound_date: todayStr(), customer: "", arrival_date: todayStr(), arrival_time: "09:00",
  product_type: "강판", coil_number: "", manufacturer: "", color_name: "",
  site_address: "", outbound_meter: 0, memo: "",
});

function Outbound({ ctx }) {
  const { outbound, setOutbound, coils, setCoils } = ctx;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blankOutbound());
  const [editId, setEditId] = useState(null);
  const [pendingOpen, setPendingOpen] = useState(true);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const availOf = (pt) => coils.filter((c) => c.product_type === pt && c.current_meter > 0).reduce((a, c) => a + c.current_meter, 0);
  const customerList = [...new Set(outbound.map((o) => o.customer).filter(Boolean))];
  const availableCoils = coils.filter((c) => c.product_type === form.product_type && c.current_meter > 0);
  const chooseCoil = (coilNumber) => {
    const coil = coils.find((c) => c.coil_number === coilNumber);
    setForm((f) => coil ? {
      ...f, coil_number: coil.coil_number, product_type: coil.product_type,
      manufacturer: coil.manufacturer, color_name: coil.color_name,
    } : { ...f, coil_number: coilNumber });
  };

  const submit = () => {
    if (!form.outbound_date || !form.customer || !form.arrival_date || !form.arrival_time ||
      !form.product_type || !form.coil_number || !form.manufacturer || !form.color_name || !form.site_address) {
      alert("*필수입력을 작성해주세요");
      return;
    }
    const m = Number(form.outbound_meter) || 0;
    if (m <= 0) { alert("*필수입력을 작성해주세요"); return; }
    const avail = availOf(form.product_type);
    if (editId) {
      setOutbound((list) => list.map((o) => o.id === editId ? { ...o, ...form, outbound_meter: m, updated_at: todayStr() } : o));
    } else {
      const rec = {
        id: uid(), ...form, outbound_meter: m, before_meter: avail, after_meter: avail - m,
        is_completed: false, completed_at: null, created_at: todayStr(), updated_at: todayStr(),
      };
      setOutbound((list) => [rec, ...list]);
    }
    setOpen(false); setEditId(null); setForm(blankOutbound());
  };

  const approve = (o) => completeOutboundRecord(o, coils, setCoils, setOutbound);
  const startEdit = (o) => { setForm({ ...blankOutbound(), ...o }); setEditId(o.id); setOpen(true); };
  const remove = (id) => { if (confirm("정말 삭제하시겠습니까?")) setOutbound((l) => l.filter((x) => x.id !== id)); };

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
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div><h2 className="text-2xl font-extrabold tracking-tight">출고관리</h2><p className="text-slate-500 text-sm mt-0.5">출고는 미완료로 홀드되고 [완료 승인] 시 재고가 차감됩니다</p></div>
        <div className="flex gap-2">
          <ExcelBtn onClick={exportXlsx} />
          <button onClick={() => { setEditId(null); setForm(blankOutbound()); setOpen(true); }} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium inline-flex items-center gap-1.5 hover:bg-indigo-700 no-print"><Plus size={16} />출고등록</button>
        </div>
      </div>

      {/* 상단: 미완료(승인대기) */}
      <Card className="overflow-hidden print-card">
        <button onClick={() => setPendingOpen((v) => !v)} className="w-full px-5 py-4 flex items-center gap-2 no-print">
          <AlertTriangle size={18} className="text-amber-500" /><h3 className="font-semibold">승인 대기</h3><span className="text-xs text-slate-400">{incomplete.length}건</span>
          <span className="ml-auto w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500">{pendingOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
        </button>
        {pendingOpen && <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>{["출고일", "거래처", "구분", "색상명", "도착일", "도착시간", "현장주소", "출고량M", "승인"].map((h) => <th key={h} className="px-3 py-2.5 text-left font-medium whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {incomplete.map((o) => {
                const overdue = o.outbound_date < todayStr(); const today = o.outbound_date === todayStr();
                return (
                  <tr key={o.id} className={overdue ? "bg-rose-50/50" : today ? "bg-amber-50/40" : ""}>
                    <td className="px-3 py-2.5 whitespace-nowrap font-medium">{overdue && <AlertTriangle size={13} className="inline text-rose-500 mr-1" />}{o.outbound_date}</td>
                    <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{o.customer || "-"}</td>
                    <td className="px-3 py-2.5">{o.product_type}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{o.color_name || "-"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{o.arrival_date}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{o.arrival_time}</td>
                    <td className="px-3 py-2.5 text-slate-600 max-w-[320px]">{o.site_address}</td>
                    <td className="px-3 py-2.5 font-medium">{fmt(o.outbound_meter)}</td>
                    <td className="px-3 py-2.5 no-print"><button onClick={() => approve(o)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium inline-flex items-center gap-1 hover:bg-emerald-700"><Check size={13} />완료 승인</button></td>
                  </tr>
                );
              })}
              {incomplete.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-400">승인 대기 건이 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>}
      </Card>

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

      <Modal open={open} onClose={() => { setOpen(false); setEditId(null); }} title={editId ? "출고 내역 수정" : "출고 등록"} wide>
        <datalist id="customer-options">{customerList.map((customer) => <option key={customer} value={customer} />)}</datalist>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="출고일" required><input type="date" className={inputCls} value={form.outbound_date} onChange={(e) => set("outbound_date", e.target.value)} /></Field>
          <Field label="거래처" required><input list="customer-options" className={inputCls} value={form.customer} onChange={(e) => set("customer", e.target.value)} placeholder="직접 입력 또는 등록 거래처 선택" /></Field>
          <Field label="도착일"><input type="date" className={inputCls} value={form.arrival_date} onChange={(e) => set("arrival_date", e.target.value)} /></Field>
          <Field label="도착 시간"><input type="time" className={inputCls} value={form.arrival_time} onChange={(e) => set("arrival_time", e.target.value)} /></Field>
          <Field label="제품 구분" required><select className={inputCls} value={form.product_type} onChange={(e) => setForm((f) => ({ ...f, product_type: e.target.value, coil_number: "", manufacturer: "", color_name: "" }))}><option>강판</option><option>징크</option></select></Field>
          <Field label="코일" required><select className={inputCls} value={form.coil_number} onChange={(e) => chooseCoil(e.target.value)}><option value="">코일 선택</option>{availableCoils.map((c) => <option key={c.id} value={c.coil_number}>{c.coil_number} · {fmt(c.current_meter)} M</option>)}</select></Field>
          <Field label="제조사" required><input className={inputCls} value={form.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} /></Field>
          <Field label="색상명" required><ColorPicker product={form.product_type} maker={form.manufacturer} value={form.color_name} onPick={(name) => set("color_name", name)} /></Field>
          <Field label="출고량 M" required><input type="number" className={inputCls} value={form.outbound_meter} onChange={(e) => set("outbound_meter", e.target.value)} /></Field>
          <div className="sm:col-span-2"><Field label="현장주소" required><input className={inputCls} value={form.site_address} onChange={(e) => set("site_address", e.target.value)} placeholder="예: 서울 강남구 역삼로 123 ○○현장" /></Field></div>
          <div className="sm:col-span-2"><Field label="비고"><textarea rows={3} className={inputCls} value={form.memo} onChange={(e) => set("memo", e.target.value)} /></Field></div>
        </div>
        <div className="mt-4 p-3 rounded-xl bg-slate-50 flex items-center justify-between text-sm">
          <span className="text-slate-600">현재 {form.product_type} 가용 재고</span>
          <span className="font-bold text-slate-700">{fmt(availOf(form.product_type))} M</span>
        </div>
        {Number(form.outbound_meter) > availOf(form.product_type) && <p className="text-rose-500 text-sm mt-2">출고량이 가용 재고보다 큽니다. (승인 시 제한됩니다)</p>}
        <div className="mt-5 grid grid-cols-2 sm:flex sm:justify-end gap-2">
          <button onClick={() => { setOpen(false); setEditId(null); }} className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600">취소</button>
          <button onClick={submit} className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">{editId ? "수정 저장" : "미완료로 저장"}</button>
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

  const remove = (id) => { if (confirm("정말 삭제하시겠습니까?")) setCoils((l) => l.filter((c) => c.id !== id)); };

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
      <div className="flex items-end justify-between gap-3 flex-wrap">
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
      <div className="flex items-end justify-between gap-3 flex-wrap">
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
  const rows = COLOR_MASTER.filter((c) => (pf === "전체" || c.product === pf) && [c.product, c.maker, c.color, c.thickness].join(" ").toLowerCase().includes(q.toLowerCase()));

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

  const removeInbound = (r) => {
    if (!confirm("선택한 입고 내역을 삭제하시겠습니까?")) return;
    setInbound((list) => list.filter((x) => x.id !== r.id));
    setCoils((list) => list.filter((c) => c.id !== r.coil_id && c.coil_number !== r.coil_number));
  };
  const removeOutbound = (o) => {
    if (!confirm("선택한 출고 내역을 삭제하시겠습니까?")) return;
    setOutbound((list) => list.filter((x) => x.id !== o.id));
  };
  const saveEditing = () => {
    if (!editing) return;
    if (editing.type === "inbound") {
      const meter = Number(editing.data.coil_meter) || 0;
      if (!editing.data.inbound_date || !editing.data.manufacturer || !editing.data.color_name || !editing.data.thickness || meter <= 0) {
        alert("*필수입력을 작성해주세요");
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
        alert("*필수입력을 작성해주세요");
        return;
      }
      setOutbound((list) => list.map((o) => o.id === editing.data.id ? { ...editing.data, outbound_meter: meter, updated_at: todayStr() } : o));
    }
    setEditing(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
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
              <div className="text-xs text-slate-400">{c.maker}</div>
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
