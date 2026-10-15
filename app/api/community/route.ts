// The original member/admin API is retired for the public character community.
// Original source was backed up before migration. Existing database tables are untouched.
export const dynamic = "force-dynamic";
function retired() {
  return Response.json({ error: "이전 커뮤니티 API는 종료되었습니다." },
    { status: 410, headers: { "Cache-Control": "no-store" } });
}
export const GET = retired;
export const POST = retired;
