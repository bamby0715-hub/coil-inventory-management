# HN메탈릭 코일 재고관리

코일 입고, 출고, 재고, 거래처별 현황과 색상표를 관리하는 React 애플리케이션입니다.

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 Vite가 안내하는 로컬 주소를 열고 비밀번호 `0707`로 로그인합니다.

## 주요 기능

- 코일 입고 및 자동 코일번호 생성
- 출고 등록과 완료 승인
- 예약 등록과 가용 재고 확인
- Firebase Firestore 공용 저장 및 기존 데이터 JSON 백업/이전
- 제품 구분별 FIFO 재고 차감
- 재고 및 거래처별 현황 조회
- Excel 다운로드와 인쇄/PDF 출력
- 색상표 조회

## 공용 저장 설정

여러 PC와 모바일에서 같은 데이터를 보려면 Firebase Firestore 설정이 필요합니다.

설정 순서는 [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)를 확인하세요.

## 빌드

```bash
npm run build
npm run preview
```

> 현재 스타일은 Tailwind CSS CDN을 사용하므로 실행 시 인터넷 연결이 필요합니다.
