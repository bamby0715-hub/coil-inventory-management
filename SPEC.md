# HN메탈릭 코일 재고관리 시스템 — 작업현황 및 다음 작업 지시서

- 문서 버전: v2
- 작성일: 2026-07-02
- 대상 저장소: `coil-inventory-management-main`
- 범위: Firebase / GitHub 관련 작업현황 정리 + 다음 작업 지시

## 1. Firebase 작업현황

### 1.1 인증 (Firebase Auth)

- `auth.jsx`: 이메일/비밀번호 방식. Firebase SDK는 npm 의존성이 아니라 `index.html`에서 CDN(`gstatic.com/firebasejs`)을 동적 `import()`로 로드.
- 가입 시 `users/{uid}` 문서를 `role: "담당자"`, `status: "승인대기"`로 고정 생성 후 즉시 로그아웃 — 마스터 승인 전에는 앱 진입 불가.
- `useAuth()` 훅이 `onAuthStateChanged` + `users/{uid}` 문서를 조합해 `loading/signedout/no-profile/pending/suspended/active` 상태를 판정.
- `MasterUserPanel`: 마스터가 사용자 목록 조회, 역할 변경(담당자/관리자/마스터), 승인/정지 처리.
- App Check(reCAPTCHA v3)가 `window.HNMT_APPCHECK_SITE_KEY`로 연동되어 있음 (`index.html`).

### 1.2 Firestore 데이터 구조 및 보안 규칙

`Firestore.txt`에 정의된 규칙과 코드가 사용하는 컬렉션이 1:1로 일치함(누락/불일치 없음 확인됨):

| 컬렉션 | 용도 | 권한 |
|---|---|---|
| `users/{uid}` | 사용자 프로필/승인상태 | 본인+마스터만 read, role/status는 본인 수정 불가 |
| `vendors/{code}` | 거래처 | 승인 사용자 read/write, 수정·삭제는 소유자 또는 마스터 |
| `items/{id}` | 품목 | 승인 사용자 read/create/update, 삭제는 마스터만 |
| `settings/{docId}` | 채번용 메타(vendorMeta/itemMeta 등) | 승인 사용자 read/write |
| `inbound/{id}` | 입고 기록 (건별 문서) | 승인 사용자 전체 권한 |
| `outbound/{id}` | 출고 기록 (건별 문서) | 승인 사용자 전체 권한 |
| `reservations/{id}` | 예약 (건별 문서) | 승인 사용자 전체 권한 |
| `statements/{id}` | 거래명세표 (헤더+lines) | 승인 사용자 read/create/update, 삭제는 마스터만 |
| `counters/{id}` | 문서번호 채번(트랜잭션) | 승인 사용자 read/write |
| `coils/{id}` | 코일 재고 등록 내역 (건별 문서) | 승인 사용자 전체 권한 |
| `stockHistory/{id}` | 기초재고 등록/변경 이력 (건별 문서) | 승인 사용자 전체 권한 |
| `settings/coilMeta` | baseStock/customColors/discontinuedColors/zoneStock/baseStockDates/deletedBaseStockKeys 묶음 | `settings/{docId}` 규칙에 포함 |

### 1.3 저장 구조 마이그레이션 — 완료 (2026-07-02)

- **이전(레거시)**: 코일/기초재고/이력/커스텀색상 전체를 `hnmtCoilSystem/sharedState` 문서 하나에 몰아넣고 클라이언트 3-way 병합(`mergeSharedSnapshots`)하는 방식. Firebase 번들 설정이 있으면 자동으로 항상 켜져서(`activeFirebaseEnabled` 상시 true) 실시간 동기화는 되고 있었지만, **문서 1개에 계속 쌓이는 구조라 Firestore 1MiB 문서 크기 한계에 걸릴 위험**이 있었음(= "나중에 문제 될 것" 리스크).
- **변경 후**: `src/coil.jsx` 신규 작성.
  - `useCoilsStore()` / `useStockHistoryStore()` — `inbound`/`outbound`와 동일하게 건별 문서 컬렉션(`coils`, `stockHistory`)으로 분리, `onSnapshot` 구독 + diff 저장.
  - `useCoilMetaStore()` — baseStock/customColors/discontinuedColors/zoneStock/baseStockDates/deletedBaseStockKeys는 계속 자라지 않는 "설정" 성격이라 `settings/coilMeta` 문서 하나에 필드별로 merge 저장(vendors/items의 settings 패턴과 동일).
  - `App.jsx`에서 레거시 코드 전량 제거: `hnmtCoilSystem`, `mergeSharedSnapshots`류 병합 함수, `CloudStorageModal`(공용저장 버튼), `getFirebaseRuntime`, `seed()` 데모 데이터. **412줄 삭제, 19줄 추가** (`git diff --stat` 기준).
  - `resetAllData`(전체 초기화)도 단순화 — 각 setter가 이미 Firestore에 직접 반영되므로 별도 스냅샷 오버라이트 로직 불필요.
  - 테스트 단계라 기존 `hnmtCoilSystem/sharedState`에 있던 데이터는 별도 마이그레이션 없이 폐기(사용자 확인 완료).
- **Firestore 규칙 갱신**: `coils/{id}`, `stockHistory/{id}` 규칙 추가, `hnmtCoilSystem/{docId}` 규칙 제거. 저장소 루트에 `firestore.rules` 파일로 새로 커밋(기존엔 저장소 밖 `Firestore.txt`에만 있어서 버전관리가 안 되고 있었음).

## 2. GitHub 작업현황

- 리포지토리: `coil-inventory-management` (https://github.com/bamby0715-hub/coil-inventory-management)
- **2026-07-02: 로컬에 `git init` + `remote add origin` + `fetch` 완료, `main` 브랜치를 `origin/main`에 연결함.** 연결 시점 확인 결과 로컬 파일과 `origin/main`의 최신 커밋(`2d44976 Update statements.jsx`) 사이에 `SPEC.md`(신규 작성분) 외 차이 없음 — 기존 작업은 이미 전부 push된 상태였음.
- 배포 워크플로우: `.github/workflows/pages.yml`
  - 트리거: `main` push 또는 수동 실행
  - `build` job: Node 24 → `npm install` → `npm run build -- --base=/coil-inventory-management/` → Pages 아티팩트 업로드
  - `deploy` job: `actions/deploy-pages@v4`로 `github-pages` 환경에 배포, `concurrency: pages`로 중복 실행 취소
  - `vite.config.js` 자체에는 `base` 설정이 없고 워크플로우 CLI 플래그로만 주입됨 → **로컬 `npm run dev`/`vite build`는 base 플래그 없이 실행되므로 하드코딩된 `/coil-inventory-management/assets/...` 경로가 깨질 수 있음** (로고, 마스코트 이미지 등).
- CI 단계에 테스트/린트 실행 없음 (빌드 성공 여부만 게이트).

## 3. 작업 지시서 (체크리스트)

- [x] **git 저장소 연결** — `git init` + `remote add origin` + `fetch`, `main`을 `origin/main`에 연결 (2026-07-02)
- [x] **vite base 경로 고정** — `vite.config.js`에 `base` 지정, `pages.yml`의 중복 `--base` 플래그 제거
- [x] **코일 재고 저장구조 분리** — `src/coil.jsx` 신규 작성 (`useCoilsStore`/`useStockHistoryStore`/`useCoilMetaStore`)
- [x] **App.jsx 레거시 코드 제거** — `hnmtCoilSystem`, `CloudStorageModal`, 병합 함수, `seed()` 데모 데이터 삭제
- [x] **Firestore 규칙 갱신** — `coils`/`stockHistory` 규칙 추가, `hnmtCoilSystem` 규칙 제거, `firestore.rules`로 저장소에 편입
- [x] **Firebase 콘솔에 규칙 반영** — 사용자가 `firestore.rules` 내용을 콘솔 규칙 탭에 붙여넣고 게시 완료 (2026-07-02)
- [x] **git commit / push** — `06cf140` 커밋을 `origin/main`에 push 완료 (2026-07-02)
- [x] **배포 확인** — GitHub Actions 빌드/배포 성공(`06cf140`, 41s). 실사이트에서 커스텀 색상 등록 → `settings/coilMeta.customColors` 반영, 기초재고 등록 → `zoneStock` 반영, 입고 등록 → `coils/{id}` 문서 생성(coil_number `C-260702-79` 등 필드 정상), 출고 등록까지 사용자가 직접 확인 완료 (2026-07-02)
- [ ] **거래명세표 공급자 정보 채우기** — `statements.jsx`의 `SUPPLIER.사업자등록번호/대표자/연락처` 공란. 실제 사업자등록증 정보 필요.
- [ ] **`Sales`/`Colors` 화면 처리** — 구현은 됐지만 메뉴에 연결 안 돼 접근 불가. 노출할지 삭제할지 결정 필요.
- [ ] **CI에 최소 검증 단계 추가 검토** — 현재 `pages.yml`은 빌드 성공 여부만 게이트.

## 4. 코일 재고구조 통합 재설계 (진행중, 2026-07-02 착수)

### 배경 — 왜 하는가
지금은 같은 "코일 롤 한 덩어리"를 두 화면에서 다른 방식으로 저장해 **이중 장부**가 생김:
- 입고관리: 매입처 입고 → `coils` 문서 (롤 개념 없음)
- 코일관리 기초등록: 실사 A/B/C 수량 → `zoneStock/baseStock` 숫자 (코일 문서 아님)

또한 출고 완료(`completeOutboundRecord`)가 제품구분(강판/징크)만 매칭하고 색상/제조사/두께는 안 봐서, 다른 색상 재고가 차감될 수 있는 **매칭 버그**가 있음.

### 확정된 목표 설계
- **`coils` = 재고의 유일한 원천. 코일 1개 = 물리적 롤 1덩어리.**
- 입고·실사 등록을 **"롤 추가" 하나로 통합** — 매입처는 실사면 비움(`source: 입고|실사`).
- 롤은 고정 A/B/C 3칸이 아니라 **덩어리 개수만큼 자유롭게** (롤 목록 UI로 재설계 — 사용자 승인 완료).
- 코일관리 = 색상별로 롤들을 묶어 보여주고, 총합/롤별 수량을 `coils`에서 계산.
- 출고 = 해당 색상 코일에서 **오래된 롤부터 FIFO 차감**, 색상키 정확 매칭(위 버그 수정).
- `baseStock`/`zoneStock`/`baseStockDates` **저장 제거** → `coils`에서 파생 계산.
- `settings/coilMeta`는 색상 카탈로그 설정만 유지(`customColors`/`discontinuedColors`/`deletedBaseStockKeys`).
- 테스트 단계이므로 기존 데이터는 **전체 초기화 후** 새 구조로 진행(마이그레이션 불필요).

### 체크리스트
- [x] 목표 설계 문서화 + 커밋
- [ ] `coils` 스키마 확정(롤 라벨/source 필드) + 색상키 헬퍼 + `coils`에서 baseStock/zoneStock 파생
- [ ] 코일관리 화면을 롤 목록 기반으로 재설계 (입고/실사 등록 → `coils` 문서 생성으로 통합)
- [ ] 출고 차감을 `coils` 색상키 FIFO로 정정 (느슨한 제품구분 매칭 버그 수정)
- [ ] `baseStock`/`zoneStock`/`baseStockDates`를 `coilMeta`에서 제거
- [ ] 대시보드/재고현황 집계를 `coils` 기준으로 통일
- [ ] 배포 후 실사이트 테스트 (등록→출고→재고 일관성 확인)

## 5. 참고

- 본 문서는 `src/App.jsx`, `auth.jsx`, `inbound.jsx`, `outbound.jsx`, `reservations.jsx`, `vendors.jsx`, `items.jsx`, `statements.jsx`, `coil.jsx`, `firestore.rules`, `.github/workflows/pages.yml`, `vite.config.js`, `package.json` 코드 스캔(2026-07-02) 기준.
- 이전 버전(v1)에 있던 구글드라이브 "HN메탈릭 업무 계획서" 연관 서술은 요청에 따라 제거함 — 이번 작업 범위는 Firebase/GitHub 기술 현황에 한정.
