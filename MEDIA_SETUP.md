# 이미지 저장소 연결

이미지는 Cloudinary 설정 또는 Cloudflare R2 버킷 연결 후 활성화됩니다.

## Cloudinary 연결 (카드 없는 무료 계정)

1. Cloudinary Console의 Settings → API Keys에서 같은 product environment의 Cloud name, API Key, API Secret을 확인합니다. API Secret은 채팅·GitHub·스크린샷에 공개하지 않습니다.
2. Cloudflare → Workers & Pages → **290-playground** → Settings → **Variables and Secrets**에서 아래 세 항목을 모두 **Secret** 유형으로 추가합니다. **Builds 안의 Variables and secrets는 사용하지 않습니다.** 모두 Secret으로 저장하면 코드 배포 시 일반 변수 덮어쓰기의 영향을 받지 않습니다.

| Name (대문자 그대로) | Value |
| --- | --- |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary의 Cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary의 API Key |
| `CLOUDINARY_API_SECRET` | Cloudinary의 API Secret |

3. Save/Deploy로 실행 중인 Worker에 적용합니다. 코드 변경도 GitHub에 커밋/Push하고 새 배포가 성공했는지 확인합니다. 이 방식에서는 R2 버킷 생성, `media:configure`, unsigned upload preset 설정이 필요 없습니다.
4. 사이트를 새로고침하고 JPG/PNG/WebP를 첨부하여 글을 등록합니다. 등록한 글과 새로고침 후 이미지 표시를 확인하고 테스트 글을 삭제합니다.

세 값이 모두 있으면 새 이미지는 Cloudinary에 저장됩니다. 기존 R2 이미지가 있다면 `MEDIA` 바인딩을 유지해야 계속 열고 삭제할 수 있습니다. Cloudinary 환경을 바꾸면 기존 파일도 이전해야 합니다.

서버에서 서명하여 업로드·삭제하며 Secret은 브라우저에 전달하지 않습니다. 이미지 ID는 `astral/` 접두사와 임의 UUID를 사용합니다. Cloudinary에는 공개 이미지로 저장하고 사이트는 게시글 공개 상태를 확인한 뒤 전달합니다. 직접 CDN 주소를 가진 사람은 해당 이미지에 접근할 수 있으므로 비공개 파일 저장 용도로 사용하지 않습니다. 삭제할 때 CDN 무효화도 요청하지만 캐시 반영에 시간이 걸릴 수 있습니다.

Cloudinary 사용 시 사이트 관리 파일 합계 **1,000,000,000바이트**에서 새 업로드를 차단합니다. 이는 서비스의 무료 한도를 보장하는 장치가 아닙니다. Cloudinary의 저장량·전송량·변환량과 다른 프로젝트 사용량을 Console에서 별도로 확인하세요. 실제 업로드/인증은 운영 Secrets 등록 후 확인해야 합니다. 로컬 자동 테스트는 모의 Cloudinary 응답을 사용합니다.

공식 참고: https://cloudinary.com/documentation/authentication_signatures
Cloudflare Secrets: https://developers.cloudflare.com/workers/configuration/secrets/

## Cloudflare R2 연결 (기존 대안)

1. Cloudflare → Storage & databases → R2 Object Storage에서 R2를 활성화합니다. 결제 수단 등록이 요구될 수 있습니다.
2. Standard 등급의 비공개 버킷을 만듭니다. 예: `290-playground-media`. 공개 접근, r2.dev, CORS는 필요하지 않습니다.
3. VS Code 터미널에서 프로젝트 폴더로 이동하고 실행합니다.

```powershell
cd "D:\Codex\290-playground"
npm run media:configure -- 290-playground-media
```

4. 생성된 `wrangler.json` 변경과 사이트 변경을 함께 커밋하고 GitHub에 Push합니다. 설정은 실제 운영 Worker `290-playground`로 배포되어야 합니다.
5. 배포 후 글쓰기에서 이미지 선택 버튼이 활성화되는지 확인합니다.

버킷 생성 전에는 구성 명령을 실행하지 마세요. 기존 설정에 없는 버킷을 추가하면 배포가 실패할 수 있습니다. Dashboard에만 바인딩을 추가하면 다음 코드 배포에서 유실될 수 있어 위 명령으로 설정을 저장합니다.

## 동작과 비용 제한

- 글당 이미지 5장, 댓글당 1장. JPEG/PNG/WebP 원본 20MB 이하를 브라우저에서 긴 변 1,920px 이하, WebP 1MB 이하로 압축합니다. 움직이는 이미지는 지원하지 않습니다.
- 글/댓글을 제출할 때만 업로드하므로 작성 취소 시 파일은 서버에 생기지 않습니다.
- 브라우저는 JPG/PNG/WebP의 MIME·파일 헤더와 디코딩 가능 여부를 검사합니다. 서버도 WebP 컨테이너·이미지 청크 구조, 파일 크기·개수·작성 권한을 검사합니다. 파일 원래 이름과 EXIF는 보관하지 않습니다.
- 새 파일을 저장하기 전에 D1에서 용량을 예약하며 R2 사용 시 총 8,000,000,000바이트, Cloudinary 사용 시 총 1,000,000,000바이트에서 업로드를 차단합니다. 이 한도는 사이트가 관리하는 파일과 업로드 예약의 합계입니다. 저장소에 직접 올린 파일·다른 저장소·전송량·변환량·Workers/D1 요청 비용은 포함하지 않습니다.
- 삭제/관리자 숨김/수정에서 제외한 파일은 정리합니다. 일시적 저장소 오류는 다음 쓰기 요청에서 재시도합니다. 중단된 미완료 업로드는 24시간 후 다음 쓰기 요청에서 정리합니다. 요청이 전혀 없으면 정리가 지연될 수 있습니다.
- 사이트의 이미지 주소는 서버를 통해 열립니다. 숨긴 글의 사이트 이미지 주소는 차단하지만 이미 받은 브라우저 캐시는 최대 5분 남을 수 있습니다. Cloudinary 공개 CDN 주소의 캐시에는 별도의 무효화 시간이 필요합니다.
- 첨부는 이미지 전용입니다. `＋ 이미지 첨부` 버튼으로 선택하고 본문에서 바로 봅니다. 클릭하면 같은 페이지에서 확대하며 닫기 버튼 또는 Esc로 돌아옵니다. 유튜브 링크 입력·재생은 제거했으며 기존 영상도 표시하지 않습니다. 서버는 영상 첨부 요청을 거부합니다.
- 공지는 공지 탭에서만 표시되며 공지글 신고는 불가합니다. 공지의 이용자 댓글은 신고할 수 있습니다. 관리 페이지에서는 공지도 관리할 수 있습니다.

공식 참고: https://developers.cloudflare.com/r2/api/workers/workers-api-usage/
