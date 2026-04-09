import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase";
import { explainDiagram, explainMultipleDiagrams } from "@/lib/rag";
import { diagramChatSchema } from "@/lib/validations";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { diagramId, diagramIds, question } = diagramChatSchema.parse(body);

    const supabaseClient = await createClient();
    const serviceSupabase = createServiceClient();

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    let diagrams: { id: string; image_url: string; document_id: string }[] = [];

    if (diagramIds && diagramIds.length > 0) {
      const { data } = await serviceSupabase
        .from("diagrams")
        .select("id, image_url, document_id")
        .eq("user_id", userId)
        .in("id", diagramIds);

      diagrams = data || [];
    } else if (diagramId) {
      const { data } = await serviceSupabase
        .from("diagrams")
        .select("id, image_url, document_id")
        .eq("user_id", userId)
        .eq("id", diagramId)
        .single();

      if (data) diagrams = [data];
    }

    if (diagrams.length === 0) {
      return NextResponse.json(
        { error: "No diagrams found" },
        { status: 404 }
      );
    }

    let documentContext: string | undefined;
    if (diagrams.length > 0) {
      const { data: chunks } = await serviceSupabase
        .from("document_chunks")
        .select("text_content")
        .eq("user_id", userId)
        .eq("document_id", diagrams[0].document_id)
        .limit(3);

      if (chunks && chunks.length > 0) {
        documentContext = chunks
          .map((c) => c.text_content)
          .join("\n\n");
      }
    }

    let explanation: string;

    if (diagrams.length === 1) {
      explanation = await explainDiagram(
        diagrams[0].image_url,
        question,
        documentContext
      );
    } else {
      explanation = await explainMultipleDiagrams(
        diagrams.map((d) => d.image_url),
        question,
        documentContext
      );
    }

    return NextResponse.json({
      success: true,
      explanation,
      diagramsCount: diagrams.length,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("Diagram chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
