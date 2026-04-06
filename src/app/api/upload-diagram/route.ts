import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File | null;
    const documentId = formData.get("documentId") as string | null;
    const chunkIndex = formData.get("chunkIndex") as string | null;

    if (!image || !documentId) {
      return NextResponse.json(
        { error: "Image and documentId are required" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    const fileName = `diagrams/${documentId}/${Date.now()}-diagram.png`;

    const buffer = Buffer.from(await image.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("document-assets")
      .upload(fileName, buffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "Failed to upload diagram" },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("document-assets").getPublicUrl(fileName);

    // Link diagram to nearest chunk
    if (chunkIndex) {
      const { error: updateError } = await supabase
        .from("document_chunks")
        .update({ image_url: publicUrl })
        .eq("document_id", documentId)
        .eq("chunk_index", parseInt(chunkIndex))
        .is("image_url", null);

      if (updateError) {
        console.error("Chunk update error:", updateError);
      }
    }

    // Increment diagrams_extracted count
    const { data: doc } = await supabase
      .from("documents")
      .select("diagrams_extracted")
      .eq("id", documentId)
      .single();

    if (doc) {
      await supabase
        .from("documents")
        .update({ diagrams_extracted: (doc.diagrams_extracted || 0) + 1 })
        .eq("id", documentId);
    }

    return NextResponse.json({ success: true, imageUrl: publicUrl });
  } catch (error) {
    console.error("Diagram upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
