# 은하열차 통신

기존 290의 놀이터를 개편한 붕괴: 스타레일 팬 역할극 게시판. 6개 지역, 22개 편집 시점, 90개 창작 게시글, 73개 캐릭터/형태 프로필을 제공합니다.

- 가입 없이 캐릭터 선택, 글 작성·수정·삭제, 댓글·댓글 삭제, 공감, 검색·정렬·페이지 이동.
- 같은 캐릭터를 고른 방문자도 작성 권한은 독립적입니다. HttpOnly 세션 30일. 쿠키를 지우거나 만료되면 기존 권한을 복구할 수 없습니다.
- 스토리 시점 필터는 글/댓글 메타데이터 기준이며 내용 자동 스포일러 판독은 아닙니다.
- 신규 `/api/astral`은 기존 D1 DB에 `astral_*` 테이블을 처음 요청 시 생성하고 고유 ID로 90개 초기 글을 삽입합니다. 기존 members/posts 테이블은 보존합니다.
- 기존 `/api/community`는 공개 배포에서 사용하지 않도록 410 응답으로 비활성화했습니다. 과거 데이터베이스 테이블은 삭제하지 않습니다. `/login`은 캐릭터 선택 안내로 변경했습니다.
- 창작 게시글은 `lib/astral-data.ts`와 `lib/astral-extra.ts`, 인물 목록은 `lib/astral-characters.json`, 이미지 출처는 `public/characters/attribution.json`입니다. 편집자가 제공한 초기 글의 제목·본문·시점은 초기화 때 동기화하며 방문자 글은 덮어쓰지 않습니다. 모든 73개 프로필에 최소 한 개의 창작 글이 있습니다.

## 실행·검증

`npm run dev` / `npm run build` / `node tests/astral.test.mjs` / `node node_modules/typescript/bin/tsc --noEmit`

로컬 실행의 D1 데이터와 호스팅 데이터는 서로 별개입니다. 현재 기본 실행·빌드는 Cloudflare Workers 직접 배포용입니다. Sites 플러그인·로그인·커넥터를 실행 경로에서 분리했습니다. `.openai`와 기존 Sites 보조 파일은 과거 작업 이력으로 남아 있으며 현재 빌드에서는 사용하지 않습니다.

배포 절차는 [Cloudflare 배포 안내](./CLOUDFLARE_DEPLOY.md)를 참고하세요. 실제 Cloudflare 계정 연결, 원격 D1 생성, 배포, 도메인 변경은 아직 실행하지 않았습니다. `wrangler.json`의 DB ID는 로컬 검증용 자리표시자입니다.

- `npm run typecheck`: 타입 검사
- `npm test`: 게시판 API·권한 테스트
- `npm run deploy:dry-run`: 빌드와 업로드 구성 검증 (업로드 없음)
- `npm start`: 빌드된 Worker를 로컬에서 실행
- `npm run deploy`: D1 ID 검사 후 빌드·실제 배포

의존성은 검증한 lockfile 버전을 유지합니다. 신규 설치는 Node.js 22.13 이상에서 `npm ci`를 사용하세요. 프로젝트에는 `node:sqlite` 기반 테스트가 있으므로 Node.js 22.13 이상이 필요합니다.
