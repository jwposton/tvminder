import { NextRequest, NextResponse } from "next/server";
import { isAuthError, requireApiUser } from "@/lib/api-auth";
import { commitImport, type ImportCommitRow, type TagMapping } from "@/lib/import";

export async function POST(request: NextRequest) {
  const userResult = await requireApiUser();
  if (isAuthError(userResult)) return userResult;
  const user = userResult;

  const body = await request.json();
  const { rows, tagMapping } = body as {
    rows?: ImportCommitRow[];
    tagMapping?: TagMapping;
  };

  if (!rows?.length) {
    return NextResponse.json({ error: "rows is required" }, { status: 400 });
  }

  if (rows.length > 100) {
    return NextResponse.json(
      { error: "Import limited to 100 shows per batch." },
      { status: 400 }
    );
  }

  const results = await commitImport(user, rows, tagMapping ?? {});
  const ok = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  return NextResponse.json({
    ok,
    failed: failed.length,
    results,
  });
}
