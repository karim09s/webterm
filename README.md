# WebTerm - Persistent Web Terminal Sessions

웹 브라우저에서 실행되는 터미널 에뮬레이터로, **세션 지속성**과 **다중 세션 관리** 기능을 제공합니다.

## 주요 기능

### 🔄 세션 지속성 (Persistent Sessions)
- 브라우저를 닫아도 터미널 세션이 유지됩니다
- 다시 접속하면 이전 세션에 재연결 가능
- 세션별 출력 버퍼 보관 (최근 1000줄)

### 📋 다중 세션 관리
- 여러 개의 독립적인 터미널 세션 생성
- 세션 간 빠른 전환
- 세션별 이름 설정 가능
- 마지막 접속 시간 표시

### 🎨 사용자 인터페이스
- 왼쪽 상단 햄버거 메뉴로 세션 관리
- VSCode 스타일 다크 테마
- 실시간 연결 상태 표시
- 세션 이름 변경 기능

### 📁 파일 업로드
- Drag & Drop으로 파일 업로드
- 자동으로 파일 경로 삽입
- 최대 100MB 파일 지원

### ⌨️ 멀티라인 입력
- `Enter`: 명령 전송
- `Cmd/Ctrl + Enter`: 줄바꿈

## 설치 및 실행

### 1. 의존성 설치
```bash
cd webterm
npm install
```

### 2. 서버 실행
```bash
npm start
```

또는 개발 모드 (자동 재시작):
```bash
npm run dev
```

### 3. 브라우저에서 접속
```
http://localhost:3000
```

## 사용 방법

### 세션 생성
1. 햄버거 메뉴 클릭
2. "+ New Session" 버튼 클릭
3. 세션 이름 입력 (선택사항)

### 세션 전환
1. 햄버거 메뉴 클릭
2. 원하는 세션 클릭

### 세션 관리
- **이름 변경**: 세션 옆 연필 아이콘 클릭
- **세션 종료**: 세션 옆 X 아이콘 클릭
- **창 닫기**: 세션은 유지되며, 나중에 재연결 가능

## 기술 스택

- **Backend**: Node.js, Express.js, Socket.io, node-pty
- **Frontend**: HTML5, CSS3, JavaScript, xterm.js
- **세션 관리**: UUID 기반 세션 ID, Map 자료구조

## 구조

```
webterm/
├── server.js      # Express 서버 및 세션 관리 로직
├── index.html     # 프론트엔드 UI
├── package.json   # 프로젝트 설정
├── README.md      # 문서
└── uploads/       # 업로드된 파일 저장 (자동 생성)
```

## 특징

- **실제 터미널**: node-pty를 사용한 진짜 pseudo-terminal
- **자동 정리**: 24시간 이상 비활성 세션 자동 삭제
- **브라우저 저장소**: localStorage에 마지막 세션 ID 저장
- **실시간 통신**: Socket.io로 양방향 실시간 통신

## 포트 설정

기본 포트는 3000입니다. 환경변수로 변경 가능:

```bash
PORT=8080 npm start
```

## 라이선스

MIT