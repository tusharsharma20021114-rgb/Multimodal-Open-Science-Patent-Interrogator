import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabaseClient = await createClient();
    const serviceSupabase = createServiceClient();

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    const { count: totalDocs } = await serviceSupabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    const { count: totalChunks } = await serviceSupabase
      .from("document_chunks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    const { count: totalQueries } = await serviceSupabase
      .from("query_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    const { count: totalDiagrams } = await serviceSupabase
      .from("diagrams")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentQueries } = await serviceSupabase
      .from("query_logs")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    const queryByDay: Record<string, number> = {};
    recentQueries?.forEach((q) => {
      const day = new Date(q.created_at).toISOString().split("T")[0];
      queryByDay[day] = (queryByDay[day] || 0) + 1;
    });

    const queryTimeSeries = Object.entries(queryByDay).map(([date, count]) => ({
      date,
      queries: count,
    }));

    const { data: recentDocs } = await serviceSupabase
      .from("documents")
      .select("id, title, total_chunks, diagrams_extracted, upload_date")
      .eq("user_id", userId)
      .order("upload_date", { ascending: false })
      .limit(10);

    return NextResponse.json({
      totals: {
        documents: totalDocs || 0,
        chunks: totalChunks || 0,
        queries: totalQueries || 0,
        diagrams: totalDiagrams || 0,
      },
      queryTimeSeries,
      recentDocuments: recentDocs || [],
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
