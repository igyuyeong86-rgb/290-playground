# VS Code에서 Cloudflare에 배포하기

현재 단계: 프로젝트 수정과 로컬 검증 완료. Cloudflare 로그인·DB 생성·실제 배포·DNS 변경은 미실행.

## 1. 준비

VS Code에서 `D:\Codex\290-playground` 폴더를 열고 새 터미널을 엽니다.
Node.js 22.13 이상과 npm이 PATH에 있어야 합니다. `node --version`, `npm --version`으로 확인하세요.
Node가 인식되지 않으면 Node.js를 설치한 후 VS Code를 다시 여세요. 기존 `사이트 시작.cmd`는 Codex에 포함된 Node도 찾아 실행합니다.
PowerShell에서 npm.ps1 실행 정책 오류가 나면 같은 명령의 `npm`을 `npm.cmd`로 바꾸거나 터미널을 CMD로 선택하세요.

```sh
npm ci
npm run dev
```

터미널이 출력하는 주소로 접속합니다. 기본 포트는 5173입니다. Ctrl+C로 종료합니다.
이미 node_modules가 설치되어 있으면 이번 수정 때문에 npm ci를 다시 실행할 필요는 없습니다.

## 2. 계정 로그인과 D1 생성 (최초 한 번)

```sh
npm run cf:login
npm run db:create
```

브라우저에서 본인의 Cloudflare 계정으로 로그인합니다. 비밀번호나 API 토큰을 코드에 적지 마세요.
DB 생성 결과의 `database_id` UUID를 복사한 뒤 다음을 실행합니다. `<발급된-ID>` 부분은 실제 UUID로 대체하며 꺾쇠는 넣지 않습니다.

```sh
npm run db:configure -- <발급된-ID>
```

이 명령은 `wrangler.json`의 `DB` 바인딩 ID만 변경합니다. DB ID는 비밀키가 아니므로 설정 파일을 GitHub에 저장할 수 있습니다.
`database_name`은 `playground-290-db`입니다. 같은 이름의 DB를 이미 만들었다면 재생성하지 말고 기존 ID를 사용하세요.
여러 Cloudflare 계정에 가입되어 있으면 Wrangler가 배포 계정을 선택하도록 안내할 수 있습니다. DB를 만든 계정을 사용하세요.

별도 SQL 실행은 필요 없습니다. `/api/astral` 첫 요청에서 테이블과 기본 게시글 105개를 자동 생성합니다.
기존 로컬 `.wrangler` 데이터나 기존 Sites 데이터가 원격 DB로 자동 이전되지는 않습니다.
DB ID를 바꾸면 로컬 개발에서도 다른 저장소가 보일 수 있지만 기존 로컬 파일은 삭제하지 않습니다.

## 3. 확인 후 배포

```sh
npm run typecheck
npm test
npm run deploy:dry-run
npm run deploy
```

`deploy:dry-run`은 업로드하지 않습니다. `deploy`는 실제 공개 Worker를 생성/갱신합니다.
자리표시자 DB ID 상태에서는 `deploy`가 중단되어 설정을 안내합니다.
배포는 소스용 `wrangler.json`이 아니라 빌드가 생성한 `dist/server/wrangler.json`을 사용합니다.
`dist`의 파일을 직접 편집하지 마세요. 배포 명령은 매번 새로 빌드합니다.

배포 후 터미널에 표시된 workers.dev 주소를 열어 확인합니다.
캐릭터 선택 → 글 작성 → 새로고침 → 수정/삭제를 확인하고, 별도의 시크릿 창에서 같은 캐릭터를 골라도 다른 방문자의 글을 수정할 수 없는지 확인하세요.

## 4. GitHub 자동 배포를 연결할 때

GitHub는 코드 저장소이고 실행은 Cloudflare Workers가 담당합니다. GitHub Pages로 배포하지 않습니다.
Cloudflare의 Git 저장소 연결에서 프로젝트 루트를 이 폴더로 지정합니다.
- 설치: `npm ci`
- 빌드: `npm run typecheck && npm test`
- 배포: `npm run deploy` (이 명령 안에서 실제 프로덕션 빌드 실행)
- Node.js: 22.13 이상
- Worker 이름: `playground-290`

DB ID를 설정한 wrangler.json과 package-lock.json을 포함하세요.
.env*, .dev.vars*, node_modules, .wrangler, dist, outputs는 업로드하지 않습니다.
.gitignore는 새 파일에 적용되므로 이미 추적 중인 비밀 파일은 업로드 전에 별도로 확인하세요.
Sites 보조 소스는 실행 경로에서 제외되어 있으며 Cloudflare 빌드에는 Sites 인증서나 커넥터 바인딩이 필요 없습니다.

## 5. 구매한 도메인은 배포 이후 연결

대상: `playgroundandsandboxof290.xyz` (호스트케이알에서 구매).
먼저 workers.dev 주소에서 동작을 확인한 후 Cloudflare에 도메인 영역을 추가하고 안내된 네임서버를 호스트케이알에 설정합니다.
기존 메일 등 DNS 레코드가 있으면 Cloudflare에도 유지해야 합니다.
Worker의 사용자 지정 도메인 설정에서 구매한 도메인을 연결합니다. 현재 설정에는 실제 도메인 라우트를 추가하지 않았습니다.

## 현재 구성과 제한

- 73개 캐릭터/형태 프로필, 105개 기본 스토리 글, 22개 스토리 시점.
- 가입 없이 선택 가능. 글 소유권은 캐릭터가 아닌 브라우저의 HttpOnly 세션으로 구분합니다.
- 세션은 30일이며 쿠키가 삭제되면 기존 소유권을 복구할 수 없습니다. 도메인 변경 시 기존 주소의 쿠키는 새 주소로 이동하지 않습니다.
- 이전 `/api/community`는 410 응답으로 종료했고, 이전 관리자 로그인은 제공하지 않습니다.
- 검증한 vinext 1.0.0-beta.5 / Cloudflare Vite plugin 1.37.1 / Wrangler 4.92.0을 유지합니다. 최신 문서의 v2 초기화 명령으로 덮어쓰지 마세요.

참고: https://developers.cloudflare.com/d1/get-started/
https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/
https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
