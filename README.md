# 또또의 별 산책

5~7세 아이가 작은 로봇과 별을 찾아가는 Three.js 코딩 퍼즐이야. React + TypeScript + Vite로 만들었고, 모델·이미지·폰트·API 키·로그인이 필요 없어.

[게임 하기](https://hosoojeong.github.io/kibogame/) · [배포 상태](https://github.com/HosooJeong/kibogame/actions/workflows/deploy.yml)

## 실행

Node.js 22.12 이상에서:

```sh
npm install
npm run dev
```

이 PC에서는 `http://localhost:5173`, 다른 기기에서는 터미널에 표시되는 Network 주소를 열어. 서버는 기본 `0.0.0.0`에 바인딩돼. 휴대폰에서 `localhost`는 휴대폰 자신을 가리키므로 PC의 로컬 또는 Tailscale IP를 사용해.

```sh
npm test                    # 이동, 실행기, 전체 맵, 생성기 검증
npm run build               # TypeScript 검사 + dist 빌드
npm run preview             # dist 확인, 기본 포트 4173
npx playwright install chromium
npm run test:browser         # 개발 서버가 켜진 상태에서 실행
npm run test:feedback        # 첫 터치 레이아웃, 실패 표시와 재시도 검증
```

빌드 미리보기는 `http://localhost:4173/kibogame/`에서 열어. 브라우저 검증 주소는 `GAME_URL` 환경 변수로 바꿀 수 있어.

## GitHub Actions 자동 배포

공개 저장소 `HosooJeong/kibogame`의 `main`에 push하면 `.github/workflows/deploy.yml`이 의존성 설치 → 로직/맵 테스트 → 빌드 → Chromium 브라우저 검사 → GitHub Pages 배포를 실행해. 실패한 버전은 배포하지 않아. Pull Request에서는 테스트까지만 실행하고, Actions 화면에서 수동 실행도 가능해.

GitHub 저장소의 **Settings → Pages → Source**는 **GitHub Actions**로 설정해. 별도 API 키나 배포 토큰은 필요 없어. 배포 작업에만 Pages 쓰기와 OIDC 권한을 부여했어.

개발 서버는 `/`, 배포 빌드는 `/kibogame/`을 사용해. 저장소 이름을 바꾸면 `vite.config.ts`의 `base`와 워크플로의 `GAME_URL` 경로도 맞춰 줘. 설정은 [Vite 배포 안내](https://vite.dev/guide/static-deploy.html#github-pages)와 [GitHub Pages 워크플로 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)를 따랐어.

## 놀이 화면과 조작

- 기본 화면에는 메뉴·초기화와 큰 명령 버튼 네 개만 보여. 직접 움직인 기록은 작은 아이콘으로 남아.
- 왼쪽 위 **놀이 메뉴**에서 직접 움직이기/순서 만들기, 난이도·맵과 소리를 선택해. 맵은 작은 놀이판 그림으로 고를 수 있어.
- ↑ 앞으로, ↓ 뒤로, ← 왼쪽 회전, → 오른쪽 회전. 회전은 제자리에서, 이동은 항상 로봇의 현재 방향을 기준으로 해. 길게 눌러도 한 번만 입력돼.
- 모든 맵에서 로봇은 아래쪽 가로 중앙에서 화면 위를 바라보고 출발해. 카메라는 고정되어 있고 화면 위/오른쪽은 격자의 북/동과 일치해. 성공하면 로봇이 아이 쪽으로 돌아보고 인사하지만 논리 방향은 그대로야.
- 코딩 모드에서는 목록을 최대 20개까지 만들고 **실행**을 눌러. 카드의 × 또는 카드 자체를 누르면 삭제돼. 휴지통 버튼은 모두 지우기야.
- 실행은 항상 출발점에서 시작해. **멈추기**는 지금 동작을 마치고 멈춰. 막히면 해당 카드를 표시하고 목록을 남겨. 목표에 도착하면 남은 명령은 실행하지 않아.
- 코딩 중 막히거나 순서가 끝나도 별에 닿지 못하면 **별에 닿지 못했어** 안내와 **다시 실행** 버튼이 나와. 주황 테두리와 느낌표가 멈춘 칸을 표시해. 순서를 고치는 동안에도 로봇은 그 자리에 남고, 다시 실행할 때 출발점으로 돌아가. 직접 누른 멈추기는 실패로 표시하지 않아.
- 첫 명령 기록과 실패 안내는 미리 확보한 공간에 표시해. 첫 터치나 실패 표시 때문에 놀이판 크기와 카메라 배율이 바뀌지 않아.
- 메뉴를 열면 진행 중인 프로그램은 현재 동작 뒤에 멈춰. 모드나 맵을 바꾸면 기존 실행은 취소돼. 메뉴가 열려 있을 때 방향키는 로봇을 움직이지 않아.
- **처음부터**는 로봇과 직접 기록을 초기화해. 코딩 목록은 남아 있어. 직접 기록을 코딩으로 복사하는 버튼은 성공 화면과 메뉴 안에 있어. 20개가 넘는 기록을 임의로 잘라 복사하지 않아.
- **다음 놀이**는 같은 난이도의 다음 맵으로 이어지고, 마지막 맵 뒤에 다음 난이도로 넘어가. 모든 맵은 처음부터 선택 가능해.
- `F` 전체 화면, `Esc` 메뉴/전체 화면 닫기. 소리는 첫 사용자 입력 이후 활성화되고, 소리가 없어도 모든 상태를 알 수 있어.

소리와 찾은 별은 이 브라우저의 `localStorage`에 저장돼. 저장을 막은 환경에서도 게임은 실행되고 메뉴에 저장 실패를 알려 줘. 기기 간 동기화는 없어.

## 120개 맵과 대량 제작

6개 학습 난이도에 각각 20개씩 있어.

| 묶음      | 배우는 것                |
| --------- | ------------------------ |
| 한 걸음   | 앞으로 이동              |
| 빙글      | 한 번 회전               |
| 꼬불꼬불  | 여러 번 회전             |
| 블록 사이 | 장애물 우회              |
| 뒤로 쏙   | 방향을 유지한 후진       |
| 별 모험   | 여러 조작을 조합한 긴 길 |

생성기는 경로·목표·장애물을 조합한 뒤, 실제 이동 규칙으로 BFS 검증을 해. 풀리지 않거나 명령 제한을 넘는 맵, 학습 조건에 맞지 않는 맵, 기하 구조가 완전히 같은 맵은 제외해. 직진 단계는 여러 거리와 주변 블록 배치를 연습해. 최단 경로는 제작 검증에만 쓰고 아이에게 점수로 요구하지 않아.

```sh
npm run generate:levels
node scripts/generate-levels.mjs --per-tier 50
```

두 번째 명령은 난이도당 50개, 총 300개를 만들어 `src/game/levels.generated.json`에 저장해. 생성 수는 난이도당 1~200 사이에서 지정할 수 있어. 기본 seed는 `20260913`이야. 같은 seed에서 개수만 늘리면 기존 맵과 고유 ID가 유지돼. 새 seed는 다른 맵 묶음을 만드는 용도이므로 배포 중인 게임의 seed를 바꿀 때는 저장 기록 버전도 함께 바꿔야 해.

원래 6개 학습 개념의 ID 1~6을 유지했고, 새 맵의 ID는 난이도와 순번으로 정해져. 테스트의 기본 개수 검증은 120개를 기준으로 하므로 영구적으로 수를 바꿀 때는 개수 관련 기대값도 갱신해.

## 소스 구조

| 파일                                    | 역할                                       |
| --------------------------------------- | ------------------------------------------ |
| `src/game/types.ts`, `grid.ts`          | 정수 격자, 네 명령, 이동과 BFS             |
| `src/game/controller.ts`                | 입력 잠금, 실행·정지·취소, 승리 처리       |
| `src/game/levelGenerator.ts`            | 재현 가능한 맵 생산과 학습 조건 필터       |
| `src/game/levels.generated.json`        | 실제 게임이 읽는 고정된 맵 데이터          |
| `src/game/stages.ts`, `difficulties.ts` | 맵 묶음과 다음 놀이 순서                   |
| `src/ui/PlayMenu.tsx`                   | 모드·난이도·맵 그림·소리 메뉴              |
| `src/App.tsx`, `style.css`              | 간결한 플레이 화면과 HTML 조작 UI          |
| `src/world/World.ts`                    | 실시간 3D, 카메라 맞춤, 조명과 애니메이션  |
| `src/world/RobotView.ts`                | 로봇 지오메트리와 표정, 향후 GLB 교체 지점 |

논리 격자는 왼쪽 위 `(0,0)`, 오른쪽 `+x`, 아래쪽 `+y`, 방향은 `0=북, 1=동, 2=남, 3=서`야. 렌더러에서만 가운데를 원점으로 하는 Three.js X/Z 좌표로 바꿔. 정수 이동 판정과 애니메이션을 분리했고 매 프레임 React 상태를 갱신하지 않아.

GLB로 바꿀 때는 `RobotView`의 `root`(위치·방향), `rig`(기울기·점프), `animate()`(표정) 인터페이스를 유지해. 모델 앞면은 로컬 +Z, 발바닥은 Y=0 부근으로 맞춰.

## 검증 범위와 제한

픽셀 비율은 최대 1.75, 그림자 맵은 1024px로 제한했어. 물리 엔진과 후처리를 쓰지 않아. WebGL 초기화 실패 시 한국어 안내를 보여 줘.

테스트 상태/좌표는 `window.render_game_to_text()`, 시간 제어는 `window.advanceTime(ms)`, 실제 투영된 맵·로봇·카메라는 `window.game_world_bounds()`와 `window.game_world_view()`에서 읽을 수 있어.

검증을 실행하면 캡처와 보고서가 `output/playwright/refinement/`와 `output/playwright/feedback/`에 생성돼. 생성 파일과 로컬 작업 기록은 저장소에 올리지 않아. Chromium·터치 에뮬레이션에서 검증하며 실제 iOS/Android 기기 GPU, Safari/Firefox와 스피커 청취는 별도 확인이 필요해. 작은 화면에서는 필요한 만큼 세로 스크롤해.
