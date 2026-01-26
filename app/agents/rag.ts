import { AgentRequest, AgentResponse } from './types';
import { openaiClient } from '@/app/libs/openai/openai';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { qdrantClient } from '../libs/qdrant';
import { cohereClient } from '../libs/cohere';

export async function ragAgent(request: AgentRequest): Promise<AgentResponse> {
	const { query } = request;

	const embedding = await openaiClient.embeddings.create({
		model: 'text-embedding-3-small',
		dimensions: 512,
		input: query,
	});

	const linkedInPosts = await qdrantClient.search('linkedin', {
		vector: embedding.data[0].embedding,
		limit: 10,
		with_payload: true,
	});

	const articles = await qdrantClient.search('articles', {
		vector: embedding.data[0].embedding,
		limit: 10,
		with_payload: true,
	});

	console.log('linkedInPosts', JSON.stringify(linkedInPosts, null, 2));
	console.log('articles', JSON.stringify(articles, null, 2));

	const rerankedDocuments = await cohereClient.rerank({
		model: 'rerank-english-v3.0',
		query: query,
		documents: [
			...linkedInPosts.map((post) => post.payload?.content as string),
			...articles.map((article) => article.payload?.content as string),
		],
		topN: 10,
		returnDocuments: true,
	});

	console.log(
		'rerankedDocuments',
		JSON.stringify(rerankedDocuments, null, 2)
	);

	// we want to generate a linkedin post based on a user query
	return streamText({
		model: openai('gpt-5'),
		messages: [
			{
				role: 'system',
				content: `
				Generate a LinkedIn post based on a user query.
				Use the style, tone and experiences from these documents to generate the post.
				Documents: ${JSON.stringify(
					rerankedDocuments.results.map(
						(result) => result.document?.text
					),
					null,
					2
				)}
				`,
			},
			{
				role: 'user',
				content: query,
			},
		],
		temperature: 0.8,
	});

	// TODO: Step 1 - Generate embedding for the refined query
	// Use openaiClient.embeddings.create()
	// Model: 'text-embedding-3-small'
	// Dimensions: 512
	// Input: request.query
	// Extract the embedding from response.data[0].embedding

	// TODO: Step 2 - Query Pinecone for similar documents
	// Get the index: pineconeClient.Index(process.env.PINECONE_INDEX!)
	// Query parameters:
	//   - vector: the embedding from step 1
	//   - topK: 10 (to over-fetch for reranking)
	//   - includeMetadata: true

	// TODO: Step 3 - Extract text from results
	// Map over queryResponse.matches
	// Get metadata?.text (or metadata?.content as fallback)
	// Filter out any null/undefined values

	// TODO: Step 4 - Rerank with Pinecone inference API
	// Use pineconeClient.inference.rerank()
	// Model: 'bge-reranker-v2-m3'
	// Pass the query and documents array
	// This gives you better quality results

	// TODO: Step 5 - Build context from reranked results
	// Map over reranked.data
	// Extract result.document?.text from each
	// Join with '\n\n' separator

	// TODO: Step 6 - Create system prompt
	// Include:
	//   - Instructions to answer based on context
	//   - Original query (request.originalQuery)
	//   - Refined query (request.query)
	//   - The retrieved context
	//   - Instruction to say if context is insufficient

	// TODO: Step 7 - Stream the response
	// Use streamText()
	// Model: openai('gpt-4o')
	// System: your system prompt
	// Messages: request.messages
	// Return the stream

	throw new Error('RAG agent not implemented yet!');
}