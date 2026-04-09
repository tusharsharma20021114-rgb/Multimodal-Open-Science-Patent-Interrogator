import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const documentId = request.nextUrl.searchParams.get("documentId");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let query = supabase
      .from("diagrams")
      .select("*")
      .eq("user_id", user.id)
      .order("page_number", { ascending: true });

    if (documentId) {
      query = query.eq("document_id", documentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching diagrams:", error);
      return NextResponse.json(
        { error: "Failed to fetch diagrams" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, diagrams: data || [] });
  } catch (error) {
    console.error("Diagram list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
