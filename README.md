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
- 제품 구분별 FIFO 재고 차감
- 재고 및 거래처별 현황 조회
- Excel 다운로드와 인쇄/PDF 출력
- 색상표 조회

## 빌드

```bash
npm run build
npm run preview
```

> 현재 스타일은 Tailwind CSS CDN을 사용하므로 실행 시 인터넷 연결이 필요합니다.
