import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import pdf from "pdf-parse";

import { getEmbeddingsTransformer, searchArgs } from '@/utils/openai';
import { MongoDBAtlasVectorSearch } from '@langchain/community/vectorstores/mongodb_atlas';
import { CharacterTextSplitter } from 'langchain/text_splitter';


export async function POST(req: NextRequest) {
  try {
    const formData: FormData = await req.formData();
    const uploadedFiles = formData.getAll('filepond');
    let fileName = '';
    let parsedText = '';

    if (uploadedFiles && uploadedFiles.length > 0) {
      // Parse the data from uploaded file 
      const uploadedFile = uploadedFiles[0];
      console.log('Uploaded file:', uploadedFile);

      if (uploadedFile instanceof File) {
        fileName = uploadedFile.name.toLowerCase();
        const fileContent = await uploadedFile.arrayBuffer();

        if (fileName.endsWith('.pdf')) {
          const data = await pdf(Buffer.from(fileContent));
          parsedText = data.text;
        } else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
          const text = new TextDecoder().decode(fileContent);
          parsedText = text.replace(/<[^>]*>?/gm, ''); // Basic HTML strip
        } else {
          parsedText = new TextDecoder().decode(fileContent); // Default to Text
        }

        if (parsedText.trim().length > 0) {
          const chunks = await new CharacterTextSplitter({
            separator: "\n", chunkSize: 1000, chunkOverlap: 100
          }).splitText(parsedText);

          await MongoDBAtlasVectorSearch.fromTexts(
            chunks, 
            chunks.map(() => ({ fileName })), 
            getEmbeddingsTransformer(),
            searchArgs()
          );

          return NextResponse.json({ message: "Resourced anchored to MongoDB" }, { status: 200 });
        } else {
           return NextResponse.json({ message: "No text extracted" }, { status: 400 });
        }
      } else {
        console.log('Uploaded file is not in the expected format.');
        return NextResponse.json({ message: 'Uploaded file is not in the expected format' }, { status: 500 });
      }
    } else {
      console.log('No files found.');
      return NextResponse.json({ message: 'No files found' }, { status: 500 });

    }

  } catch (error) {
    console.error('Error processing request:', error);
    // Handle the error accordingly, for example, return an error response.
    return new NextResponse("An error occurred during processing.", { status: 500 });
  }

}


