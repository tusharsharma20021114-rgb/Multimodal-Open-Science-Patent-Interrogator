import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = getServiceSupabase();

    // Get totals
    const { count: totalDocs } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true });

    const { count: totalChunks } = await supabase
      .from("document_chunks")
      .select("*", { count: "exact", head: true });

    const { count: totalQueries } = await supabase
      .from("query_logs")
      .select("*", { count: "exact", head: true });

    const { data: diagData } = await supabase
      .from("documents")
      .select("diagrams_extracted");

    const totalDiagrams =
      diagData?.reduce((sum, d) => sum + (d.diagrams_extracted || 0), 0) || 0;

    // Get queries over time (last 30 days, grouped by day)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentQueries } = await supabase
      .from("query_logs")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    // Group by day
    const queryByDay: Record<string, number> = {};
    recentQueries?.forEach((q) => {
      const day = new Date(q.created_at).toISOString().split("T")[0];
      queryByDay[day] = (queryByDay[day] || 0) + 1;
    });

    const queryTimeSeries = Object.entries(queryByDay).map(([date, count]) => ({
      date,
      queries: count,
    }));

    // Get recent documents
    const { data: recentDocs } = await supabase
      .from("documents")
      .select("id, title, total_chunks, diagrams_extracted, upload_date")
      .order("upload_date", { ascending: false })
      .limit(10);

    // Get top queried documents
    const { data: topQueried } = await supabase
      .from("query_logs")
      .select("document_id")
      .not("document_id", "is", null);

    const docQueryCounts: Record<string, number> = {};
    topQueried?.forEach((q) => {
      if (q.document_id) {
        docQueryCounts[q.document_id] =
          (docQueryCounts[q.document_id] || 0) + 1;
      }
    });

    return NextResponse.json({
      totals: {
        documents: totalDocs || 0,
        chunks: totalChunks || 0,
        queries: totalQueries || 0,
        diagrams: totalDiagrams,
      },
      queryTimeSeries,
      recentDocuments: recentDocs || [],
      topQueriedDocuments: docQueryCounts,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
