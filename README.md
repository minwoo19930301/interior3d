# interior3d

브라우저에서 바로 열어 한국식 아파트 평면을 만들고 가구를 3D로 배치해볼 수 있는 인테리어 플래너입니다. `59A`, `84A`, `84B` 같은 대표 평면에서 시작할 수도 있고, 방 타일을 직접 칠해서 커스텀 구조를 만든 뒤 가구를 배치할 수도 있습니다.

## 링크

- 서비스: [interior3d](https://minwoo19930301.github.io/interior3d/)
- GitHub: [minwoo19930301/interior3d](https://github.com/minwoo19930301/interior3d)

## 주요 기능

- `59A`, `84A`, `84B` 한국식 아파트 템플릿 제공
- 방 타일 기반 커스텀 평면 생성
- 구조물과 가구 오브젝트 추가
- 오브젝트 이동, 회전, 크기 조절, 색상 수정
- 문 열림 방향과 상태 조절
- `m`, `cm`, `ft` 단위 전환
- `Orbit` / `Pan` 카메라 모드 전환
- 공유 링크 복사로 현재 장면 URL 공유
- `Undo`, `Redo`, 복사, 붙여넣기 지원
- 한국어/영어 자동 전환
- 모바일 레이아웃 대응

## 사용하는 방법

1. 서비스에 접속합니다.
2. 왼쪽 구조 패널에서 아파트 템플릿을 열거나 구조물/가구를 추가합니다.
3. `59A`, `84A`, `84B` 템플릿 중 하나를 고르거나 사용자 템플릿으로 평면을 직접 만듭니다.
4. 오브젝트를 클릭한 뒤 속성 패널에서 위치, 회전, 크기, 색상을 수정합니다.
5. 상단 툴바에서 이동/회전 모드와 카메라 모드, 단위를 바꿉니다.
6. 장면이 정리되면 공유 링크 복사 버튼으로 현재 상태를 URL로 전달합니다.

## 조작 가이드

- 클릭: 오브젝트 선택
- 더블 클릭: 문 열기/닫기 토글
- `Delete` 또는 `Backspace`: 선택 오브젝트 삭제
- `Cmd/Ctrl + C`: 선택 오브젝트 복사
- `Cmd/Ctrl + V`: 붙여넣기
- `Cmd/Ctrl + Z`: 되돌리기
- `Cmd/Ctrl + Shift + Z` 또는 `Cmd/Ctrl + Y`: 다시 실행
- `Escape`: 모바일 패널 닫기

## 로컬 개발

```bash
cd "/Users/minwokim/Documents/New project/interior3d"
npm install
npm run dev
```

브라우저에서 `http://localhost:5173`를 열면 됩니다.

## 빌드와 배포

```bash
npm run build
npm run preview
npm run deploy
```

- 배포 URL: [https://minwoo19930301.github.io/interior3d/](https://minwoo19930301.github.io/interior3d/)
- `gh-pages`로 `dist` 디렉터리를 GitHub Pages에 배포합니다.

## 기술 스택

- `React 19`
- `Vite 7`
- `three`
- `@react-three/fiber`
- `@react-three/drei`
- `Zustand`

## 구현 포인트

- 대표 한국식 아파트 구조는 `src/lib/roomBuilder.js`에서 생성합니다.
- 공유 링크는 현재 장면 데이터를 URL 파라미터로 직렬화해 보관합니다.
- UI 언어는 브라우저 로케일에 따라 한국어/영어로 전환됩니다.
