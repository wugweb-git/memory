import { NextRequest, NextResponse } from 'next/server';
import pdf from "pdf-parse";
import { MemoryService } from '@/lib/memory/service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData: FormData = await req.formData();
    const uploadedFiles = formData.getAll('filepond');

    if (!uploadedFiles || uploadedFiles.length === 0) {
      return NextResponse.json({ message: 'No files found' }, { status: 400 });
    }

    const uploadedFile = uploadedFiles[0];

    if (!(uploadedFile instanceof File)) {
      return NextResponse.json({ message: 'Uploaded file is not in the expected format' }, { status: 400 });
    }

    const fileName = uploadedFile.name.toLowerCase();
    const fileContent = await uploadedFile.arrayBuffer();
    let parsedText = '';

    // 1. Parse File Content
    if (fileName.endsWith('.pdf')) {
      const data = await pdf(Buffer.from(fileContent));
      parsedText = data.text;
    } else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
      const text = new TextDecoder().decode(fileContent);
      parsedText = text.replace(/<[^>]*>?/gm, ''); // Basic HTML strip
    } else {
      parsedText = new TextDecoder().decode(fileContent); // Default to Text
    }

    if (!parsedText.trim()) {
      return NextResponse.json({ message: "No text extracted from file" }, { status: 400 });
    }

    // 2. CONSOLIDATED INGESTION: Pass to MemoryService
    // This handles Gating, Normalization, Noise Filtering, and Persistence
    const result = await MemoryService.ingest({
      source: 'manual',
      source_id: `file_${Date.now()}`,
      type: 'document',
      content: parsedText,
      metadata: {
        file_name: fileName,
        file_size: uploadedFile.size,
        file_type: uploadedFile.type,
        ingestion_path: 'api/upload/consolidated_v1'
      },
      trace: {
        origin: 'user_upload',
        ingestion_path: ['browser', 'api/upload', 'MemoryService']
      }
    }, 'system_user'); // TODO: Pass real user ID from auth

    if (result.status !== 'ACCEPTED') {
      return NextResponse.json({ 
        message: 'File processing stalled by Ingestion Gate', 
        reason: result.reason 
      }, { status: 202 });
    }

    return NextResponse.json({ 
      message: "Resource anchored to Memory Store", 
      packetId: result.packet_id 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing upload:', error);
    return NextResponse.json({ error: error.message || "An error occurred during processing." }, { status: 500 });
  }
}
