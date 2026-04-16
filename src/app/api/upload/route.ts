import { NextRequest, NextResponse } from 'next/server';
import pdf from "pdf-parse";
import { PrismaClient } from '@prisma/client';
import { CharacterTextSplitter } from 'langchain/text_splitter';

const prisma = new PrismaClient();

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

    // 2. Persist File Metadata (Document Table)
    const doc = await prisma.document.create({
      data: {
        file_name: fileName,
        file_type: uploadedFile.type || 'unknown',
        file_url: 'local://uploads/' + fileName, // Placeholder for local upload
        size_bytes: uploadedFile.size,
        metadata: {
          last_modified: (uploadedFile as any).lastModified,
          ingestion_path: 'api/upload_v3'
        }
      }
    });

    // 3. Persist to Memory (MemoryPacket Table)
    // We split into chunks and store in MemoryPacket for RAG capability
    const chunks = await new CharacterTextSplitter({
      separator: "\n", chunkSize: 1000, chunkOverlap: 100
    }).splitText(parsedText);

    // Create a MemoryPacket for the document
    const packet = await prisma.memoryPacket.create({
      data: {
        type: 'document',
        content: parsedText,
        priority: 'medium',
        status: 'accepted',
        metadata: {
          file_id: doc.id,
          file_name: fileName,
          chunk_count: chunks.length
        }
      }
    });

    // 4. Log Activity
    await prisma.activityStream.create({
      data: {
        event: 'DOCUMENT_UPLOADED',
        target: doc.id
      }
    });

    return NextResponse.json({ 
      message: "Resourced anchored to Postgres", 
      docId: doc.id, 
      packetId: packet.id 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing upload:', error);
    return NextResponse.json({ error: error.message || "An error occurred during processing." }, { status: 500 });
  }
}
