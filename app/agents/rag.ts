import { AgentRequest, AgentResponse } from './types';
import { pineconeClient } from '@/app/libs/pinecone';
import { openaiClient } from '@/app/libs/openai/openai';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export async function ragAgent(request: AgentRequest): Promise<AgentResponse> {
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
