# Firebase Firestore 공용 저장 설정

이 앱은 Firebase Firestore를 공용 저장소로 사용합니다. 기존 브라우저 `localStorage` 데이터는 삭제하지 않고, 먼저 JSON 백업을 만든 뒤 Firestore로 이전할 수 있습니다.

## 1. Firebase 프로젝트 만들기

1. <https://console.firebase.google.com/> 에 접속합니다.
2. 새 프로젝트를 생성합니다.
3. 왼쪽 메뉴 `빌드 > Firestore Database` 를 엽니다.
4. `데이터베이스 만들기` 를 누릅니다.
5. 위치는 가능하면 `asia-northeast3` 서울 리전을 선택합니다.
6. 처음 테스트할 때는 테스트 모드로 시작할 수 있습니다. 운영 전에는 반드시 규칙을 제한해야 합니다.

## 2. 자동 연결용 config 넣기

1. Firebase 프로젝트 설정에서 웹 앱을 추가합니다.
2. 화면에 표시되는 `firebaseConfig` 객체를 복사합니다.
3. 저장소의 `public/firebase-config.js` 파일을 엽니다.
4. `window.HNMT_FIREBASE_CONFIG = null;` 부분을 복사한 config 객체로 교체합니다.
5. 배포하면 직원들은 별도 설정 없이 같은 링크 접속만으로 Firestore에 자동 연결됩니다.

예시 형식:

```js
window.HNMT_FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

Firebase config 값은 브라우저 앱에 공개되는 값입니다. 실제 보안은 Firestore Rules로 관리합니다.

## 3. 기존 데이터 이전 순서

자동 config가 아직 비어 있거나 관리자 브라우저에만 config를 넣은 경우에는 앱의 `공용저장` 창에서 아래 순서대로 진행할 수 있습니다.

1. `1. 기존 데이터 JSON 백업`
2. `2. 로컬 데이터를 Firestore로 이전`
3. `Firestore 사용 중` 상태 확인

자동 config가 `public/firebase-config.js`에 들어간 뒤 배포되면, 같은 GitHub Pages 주소로 접속한 PC와 모바일이 같은 Firestore 데이터를 공유합니다.

## 4. 저장 위치

Firestore에는 아래 문서 하나를 사용합니다.

- 컬렉션: `hnmtCoilSystem`
- 문서: `sharedState`

현재 구조는 소규모 공동 사용을 위한 단일 문서 스냅샷 방식입니다. 데이터가 크게 늘어나면 컬렉션을 분리하는 방식으로 확장하는 것이 좋습니다.

## 5. 임시 테스트 규칙

처음 연결 확인용으로만 사용할 수 있는 예시입니다. 운영 전에는 인증 기반 규칙으로 제한하세요.

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /hnmtCoilSystem/{docId} {
      allow read, write: if true;
    }
  }
}
```

## 6. 주의사항

- 기존 `localStorage` 데이터는 자동 삭제하지 않습니다.
- Firestore 이전 전 JSON 백업을 먼저 받으세요.
- 초기화는 운영 데이터에 영향을 주는 작업이므로 앱 안에서 2단계 확인 후 실행됩니다.
- 테스트 모드 규칙은 공개 쓰기를 허용하므로 운영용으로 오래 두면 안 됩니다.
