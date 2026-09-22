# interior3d

## 실존 디자인 · Blender MCP 재제작

기존 가구 15종을 실제 Blender MCP로 새로 모델링했고 POÄNG·LAUTERS·FADO·SINNERLIG 4종을 추가했습니다. `public/models/catalog.json`이 제품명, SKU, 공식 출처, `[W,H,D]` 치수와 피벗을 함께 관리합니다. 제조사 공식 CAD가 아닌 비공식 참고 재제작입니다. 샤워존은 자체 설계이며 수전만 Crometta E를 참고했습니다.

새 첫 화면은 가구가 배치된 거실·다이닝입니다. 침실·작업실, 욕실·다용도실 예시와 제품 검색/미리보기 카탈로그를 제공합니다. 가구는 공개 기본치수로 시작하며 변경하면 사용자 변형 치수임을 표시합니다. TV·인덕션·탁상/펜던트 조명은 높이 배치를 지원합니다. 제품의 문·서랍은 실제 모델 피벗으로 움직이고, 패브릭·도장 부분만 색상 편집됩니다. 원목/금속/유리는 고유 마감을 보존합니다.

GLB 19종은 원점/축/치수와 Khronos glTF Validator 오류·경고 0건을 확인했습니다. CPU 회귀 검사는 원본 GLB 형상을 로드해 복제·재질·피벗·크기 변경·예시 배치와 공유/undo를 검사합니다. 텍스처/브라우저/GPU/실제 조작 검증과는 구분합니다. 자세한 모델별 추정 범위는 `docs/assets/manifest.json`에 있습니다. 아래 기존 배포 링크에 이 작업이 반영됐다는 뜻은 아닙니다.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-brightgreen?style=for-the-badge&logo=github)](https://minwoo19930301.github.io/interior3d/)


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
git clone https://github.com/minwoo19930301/interior3d.git
cd interior3d
npm ci
npm run dev
```

브라우저에서 `http://localhost:5173`를 열면 됩니다.

## 검증

```bash
npm test
npm run lint
npm run build
```

회귀 검사는 세 아파트 템플릿의 8cm 벽·좁은 바닥/천장 치수, 공유 링크,
브라우저 URL 갱신 실패, 복사·삭제·되돌리기·다시 실행을 확인합니다.
정지한 장면은 필요할 때만 렌더링하며 카메라나 오브젝트를 조작하면 다시 그립니다.

Chrome과 Playwright가 설치된 환경에서는 `npm run dev -- --port 4174` 실행 후
`node tests/browser-smoke.mjs`로 1440/390/820px 조작과 템플릿 공유·복원을 확인할 수 있습니다.
`PLAYWRIGHT_MODULE`로 기존 Playwright 모듈 경로를, `TEST_URL`로 로컬 주소를,
`EVIDENCE_DIR`로 스크린샷 저장 폴더를 지정할 수 있습니다.

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
