import { NextRequest, NextResponse } from 'next/server';
import { openaiClient } from '@/app/libs/openai/openai';
import { qdrantClient } from '@/app/libs/qdrant';
import { z } from 'zod';

const uploadLinkedInPostSchema = z.object({
	content: z.string().min(1),
	metadata: z.object({
		url: z.string().optional(),
		date: z.string().optional(),
		likes: z.number().optional(),
	}).optional(),
});

const COLLECTION_NAME = 'linkedin-posts';

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { content, metadata } = uploadLinkedInPostSchema.parse(body);

		const embeddings = await openaiClient.embeddings.create({
			model: 'text-embedding-3-small',
			dimensions: 512,
			input: content,
		});

		const point = {
			id: crypto.randomUUID(),
			vector: embeddings.data[0].embedding,
			payload: {
				content,
				url: metadata?.url || '',
				date: metadata?.date || '',
				likes: metadata?.likes || 0,
				contentType: 'linkedin',
			},
		};

		await qdrantClient.upsert(COLLECTION_NAME, {
			wait: true,
			points: [point],
		});

		return NextResponse.json({
			success: true,
			vectorsUploaded: 1,
			contentLength: content.length,
		});
	} catch (error) {
		console.error('Error uploading LinkedIn post:', error);
		return NextResponse.json(
			{
				error: 'Failed to upload LinkedIn post',
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
