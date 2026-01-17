/**
 * LinkedIn Posts Upload Script
 *
 * This script processes LinkedIn posts from the CSV file and uploads them to Qdrant
 * WITHOUT chunking (unlike Medium articles which are chunked).
 *
 * WORKFLOW:
 * 1. Read LinkedIn posts from data/brian_posts.csv
 * 2. Parse them using extractLinkedInPosts
 * 3. Generate embeddings for each post
 * 4. Upload to Qdrant (full posts, no chunking)
 *
 * USAGE:
 * Run: npx tsx app/scripts/upload-linkedin.ts
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { extractLinkedInPosts, type LinkedInPost } from '../libs/chunking';

// Load environment variables BEFORE importing clients
dotenv.config();

import { qdrantClient } from '../libs/qdrant';
import { openaiClient } from '../libs/openai/openai';

const DATA_DIR = path.join(process.cwd(), 'app/scripts/data');
const LINKEDIN_CSV = path.join(DATA_DIR, 'brian_posts.csv');
const COLLECTION_NAME = 'linkedin-posts';

/**
 * Processes LinkedIn posts from CSV file and uploads to Qdrant
 */
async function processLinkedInPosts(): Promise<void> {
	console.log('💼 Processing LinkedIn posts...');

	// Read and parse CSV
	const csvContent = fs.readFileSync(LINKEDIN_CSV, 'utf-8');
	const posts = extractLinkedInPosts(csvContent);

	console.log(`Found ${posts.length} LinkedIn posts`);

	let successCount = 0;
	let failCount = 0;

	for (const post of posts) {
		try {
			// Generate embedding for the full post text (no chunking)
			const embeddings = await openaiClient.embeddings.create({
				model: 'text-embedding-3-small',
				dimensions: 512,
				input: post.text,
			});

			// Upload to Qdrant
			await qdrantClient.upsert(COLLECTION_NAME, {
				wait: true,
				points: [
					{
						id: crypto.randomUUID(),
						vector: embeddings.data[0].embedding,
						payload: {
							content: post.text,
							url: post.url,
							date: post.date,
							likes: post.likes,
							contentType: 'linkedin',
						},
					},
				],
			});

			successCount++;
			console.log(`✅ Uploaded post ${successCount}/${posts.length}`);
		} catch (error) {
			console.error(`❌ Failed to upload post: ${post.url}`, error);
			failCount++;
		}
	}

	console.log(`\n📊 Summary:`);
	console.log(`   Successfully uploaded: ${successCount}`);
	console.log(`   Failed: ${failCount}`);
	console.log(`   Total: ${posts.length}`);
}

/**
 * Ensures the Qdrant collection exists with proper configuration
 */
async function ensureCollection() {
	console.log('🔍 Checking if collection exists...');

	try {
		// Try to get collection info
		await qdrantClient.getCollection(COLLECTION_NAME);
		console.log('✅ Collection already exists');
	} catch (error) {
		// Collection doesn't exist, create it
		console.log('📦 Creating collection...');
		await qdrantClient.createCollection(COLLECTION_NAME, {
			vectors: {
				size: 512, // text-embedding-3-small with dimensions=512
				distance: 'Cosine',
			},
		});
		console.log('✅ Collection created successfully');
	}
}

/**
 * Main function
 */
async function main() {
	console.log('🚀 Starting LinkedIn posts upload...\n');

	try {
		// Ensure collection exists
		await ensureCollection();

		// Process and upload posts
		await processLinkedInPosts();
		console.log('\n✅ Upload complete!');
	} catch (error) {
		console.error('❌ Error processing LinkedIn posts:', error);
		process.exit(1);
	}
}

main();
