import { NextRequest, NextResponse } from "next/server";
import { isAuthError, requireApiUser } from "@/lib/api-auth";
import { matchImportRows, parseImportCsv } from "@/lib/import";

export async function POST(request: NextRequest) {
  const userResult = await requireApiUser();
  if (isAuthError(userResult)) return userResult;

  const body = await request.json();
  const { csv } = body as { csv?: string };

  if (!csv?.trim()) {
    return NextResponse.json({ error: "csv is required" }, { status: 400 });
  }

  const rows = parseImportCsv(csv);
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No valid rows found. Expected: show name, status (0 or 1), optional tag value." },
      { status: 400 }
    );
  }

  if (rows.length > 100) {
    return NextResponse.json(
      { error: "Import limited to 100 shows per batch." },
      { status: 400 }
    );
  }

  try {
    const matches = await matchImportRows(rows);
    const tagValues = [...new Set(rows.map((r) => r.tagValue).filter(Boolean))];
    return NextResponse.json({ matches, tagValues });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Match failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
