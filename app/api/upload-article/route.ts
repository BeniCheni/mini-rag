import { NextRequest, NextResponse } from 'next/server';
import { chunkText } from '@/app/libs/chunking';
import { openaiClient } from '@/app/libs/openai/openai';
import { qdrantClient } from '@/app/libs/qdrant';
import { z } from 'zod';

const uploadArticleSchema = z.object({
	content: z.string().min(1),
	metadata: z.object({
		title: z.string().optional(),
		author: z.string().optional(),
		date: z.string().optional(),
		url: z.string().optional(),
		language: z.string().optional(),
	}).optional(),
});

const COLLECTION_NAME = 'articles';

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { content, metadata } = uploadArticleSchema.parse(body);

		const source = metadata?.url || 'user-upload';
		const chunks = chunkText(content, 500, 50, source);

		if (chunks.length === 0) {
			return NextResponse.json(
				{ error: 'No chunks created from content' },
				{ status: 400 }
			);
		}
		chunks.forEach((chunk) => {
			if (metadata?.title) chunk.metadata.title = metadata.title;
			if (metadata?.author) chunk.metadata.author = metadata.author;
			if (metadata?.date) chunk.metadata.date = metadata.date;
			if (metadata?.language) chunk.metadata.language = metadata.language;
			chunk.metadata.contentType = 'article';
		});

		const embeddings = await openaiClient.embeddings.create({
			model: 'text-embedding-3-small',
			dimensions: 512,
			input: chunks.map((c) => c.content),
		});

		const points = chunks.map((chunk, idx) => ({
			id: crypto.randomUUID(),
			vector: embeddings.data[idx].embedding,
			payload: {
				...chunk.metadata,
				content: chunk.content,
			},
		}));

		await qdrantClient.upsert(COLLECTION_NAME, {
			wait: true,
			points,
		});

		return NextResponse.json({
			success: true,
			chunksCreated: chunks.length,
			vectorsUploaded: points.length,
			contentLength: content.length,
		});
	} catch (error) {
		console.error('Error uploading article:', error);
		return NextResponse.json(
			{
				error: 'Failed to upload article',
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
