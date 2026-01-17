export type Chunk = {
	id: string;
	content: string;
	metadata: {
		source: string;
		chunkIndex: number;
		totalChunks: number;
		startChar: number;
		endChar: number;
		[key: string]: string | number | boolean | string[];
	};
};

// TODO: Define LinkedInPost type
// Should have: text (string), date (string), url (string), likes (number)
export type LinkedInPost = {
	text: string;
	date: string;
	url: string;
	likes: number;
};

// TODO: Define MediumArticle type
// Should have: title (string), text (string), date (string), url (string)
export type MediumArticle = {
	// metadata
	text: string;
	url: string;
	author: string;
	title: string;
	date: string;
	source: string;
	language: string;
};

/**
 * Splits text into smaller chunks for processing
 * @param text The text to chunk
 * @param chunkSize Maximum size of each chunk
 * @param overlap Number of characters to overlap between chunks
 * @param source Source identifier (typically URL)
 * @returns Array of text chunks
 */
export function chunkText(
	text: string,
	chunkSize: number = 500,
	overlap: number = 50,
	source: string = 'unknown'
): Chunk[] {
	const chunks: Chunk[] = [];
	const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

	let currentChunk = '';
	let chunkStart = 0;
	let chunkIndex = 0;

	for (let i = 0; i < sentences.length; i++) {
		const sentence = sentences[i].trim() + '.';

		// If adding this sentence would exceed chunk size, create a chunk
		if (
			currentChunk.length + sentence.length > chunkSize &&
			currentChunk.length > 0
		) {
			const chunk: Chunk = {
				id: `${source}-chunk-${chunkIndex}`,
				content: currentChunk.trim(),
				metadata: {
					source,
					chunkIndex,
					totalChunks: 0, // Will be updated later
					startChar: chunkStart,
					endChar: chunkStart + currentChunk.length,
				},
			};

			chunks.push(chunk);

			// Start new chunk with overlap
			const overlapText = getLastWords(currentChunk, overlap);
			currentChunk = overlapText + ' ' + sentence;
			chunkStart = chunk.metadata.endChar - overlapText.length;
			chunkIndex++;
		} else {
			currentChunk += (currentChunk ? ' ' : '') + sentence;
		}
	}

	// Add final chunk if it has content
	if (currentChunk.trim()) {
		chunks.push({
			id: `${source}-chunk-${chunkIndex}`,
			content: currentChunk.trim(),
			metadata: {
				source,
				chunkIndex,
				totalChunks: 0,
				startChar: chunkStart,
				endChar: chunkStart + currentChunk.length,
			},
		});
	}

	// Update total chunks count
	chunks.forEach((chunk) => {
		chunk.metadata.totalChunks = chunks.length;
	});

	return chunks;
}

/**
 * Gets the last N characters worth of words from a text
 *
 * This is used to create overlap between chunks. We want complete words,
 * not cut-off characters, so we work backwards from the end.
 *
 * @param text The source text
 * @param maxLength Maximum length to return
 * @returns The last words up to maxLength
 *
 * @example
 * getLastWords("React Hooks are awesome", 10)
 * // Returns: "are awesome" (10 chars)
 * // NOT: "re awesome" (cut off "are")
 *

 *
 * Requirements:
 * 1. If text is shorter than maxLength, return the whole text
 * 2. Otherwise, return the last maxLength characters worth of COMPLETE words
 * 3. Build the result backwards to ensure you get the last words
 *
 * Steps:
 * 1. Check if text.length <= maxLength, if so return text
 * 2. Split text into words using .split(' ')
 * 3. Start with empty result string
 * 4. Loop through words BACKWARDS (from end to start)
 * 5. For each word, check if adding it would exceed maxLength
 * 6. If it would exceed, break the loop
 * 7. Otherwise, prepend the word to result (word + ' ' + result)
 * 8. Return the result
 */
function getLastWords(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	const wordList = text.split(' ');
	let resultString = '';
	for (let i = wordList.length - 1; i >= 0; i--) {
		let newWord = wordList[i];
		if (resultString.length + newWord.length > maxLength) {
			break;
		}
		resultString = newWord + resultString;
	}
	return resultString;
}

/**
 * TODO: Implement extractLinkedInPosts function
 *
 * This function should extract LinkedIn posts from CSV data.
 *
 * @param csvContent The CSV file content as a string
 * @returns Array of LinkedInPost objects with text, date, url, and likes
 *
 * Requirements:
 * 1. Parse the CSV header to find column indices for:
 *    - text: the post content
 *    - createdAt (TZ=America/Los_Angeles): the date
 *    - link: the URL
 *    - numReactions: the number of likes
 *
 * 2. Handle CSV parsing properly:
 *    - Fields can be quoted with double quotes
 *    - Quoted fields can contain commas
 *    - Use a simple parser or handle quoted fields manually
 *
 * 3. Skip the header row and process each data row
 *
 * 4. Return an array of LinkedInPost objects
 *
 * Hints:
 * - Split by newlines to get rows
 * - For each row, carefully parse considering quoted fields
 * - Extract the values at the correct column indices
 * - Convert numReactions to a number using parseInt()
 */
export function extractLinkedInPosts(csvContent: string): LinkedInPost[] {
	const lines = csvContent.split('\n');
	if (lines.length < 2) return [];

	// Parse header to find column indices
	const header = parseCSVLine(lines[0]);
	const textIndex = header.indexOf('text');
	const dateIndex = header.indexOf('createdAt (TZ=America/Los_Angeles)');
	const urlIndex = header.indexOf('link');
	const likesIndex = header.indexOf('numReactions');

	// Validate that we found all required columns
	if (textIndex === -1 || dateIndex === -1 || urlIndex === -1 || likesIndex === -1) {
		throw new Error('Missing required columns in CSV');
	}

	const posts: LinkedInPost[] = [];

	// Process each data row (skip header)
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue; // Skip empty lines

		const fields = parseCSVLine(line);

		// Make sure we have enough fields
		if (fields.length <= Math.max(textIndex, dateIndex, urlIndex, likesIndex)) {
			continue;
		}

		const post: LinkedInPost = {
			text: fields[textIndex],
			date: fields[dateIndex],
			url: fields[urlIndex],
			likes: parseInt(fields[likesIndex]) || 0,
		};

		posts.push(post);
	}

	return posts;
}

/**
 * Parses a single CSV line, handling quoted fields that may contain commas
 */
function parseCSVLine(line: string): string[] {
	const fields: string[] = [];
	let currentField = '';
	let insideQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		const nextChar = line[i + 1];

		if (char === '"') {
			// Handle escaped quotes ("")
			if (insideQuotes && nextChar === '"') {
				currentField += '"';
				i++; // Skip next quote
			} else {
				// Toggle quote state
				insideQuotes = !insideQuotes;
			}
		} else if (char === ',' && !insideQuotes) {
			// End of field
			fields.push(currentField);
			currentField = '';
		} else {
			currentField += char;
		}
	}

	// Add the last field
	fields.push(currentField);

	return fields;
}

/**
 * TODO: Implement extractMediumArticle function
 *
 * This function should extract a Medium article from HTML content.
 *
 * @param htmlContent The HTML file content as a string
 * @returns MediumArticle object with title, text, date, and url (or null if extraction fails)
 *
 * Requirements:
 * 1. Extract the title from the <title> tag
 *    - Use regex: /<title>(.*?)<\/title>/
 *
 * 2. Extract the date from the <time> tag's datetime attribute
 *    - Look for: <time class="dt-published" datetime="...">
 *    - Use regex to capture the datetime value
 *
 * 3. Extract the URL from the canonical link
 *    - Look for: <a href="..." class="p-canonical">
 *    - Should be a medium.com URL
 *
 * 4. Extract the text content from the body section
 *    - Find: <section data-field="body" class="e-content">...</section>
 *    - Remove all HTML tags but keep the text
 *    - Clean up whitespace (replace multiple spaces with single space)
 *    - Trim the result
 *
 * 5. Return null if extraction fails (use try/catch)
 *
 * Hints:
 * - Use .match() with regex to extract values
 * - Use .replace() to remove HTML tags: /<[^>]+>/g
 * - Use .replace(/\s+/g, ' ') to normalize whitespace
 * - Use try/catch to handle errors and return null
 */
export function extractMediumArticle(
	htmlContent: string
): MediumArticle | null {
	// 1. Extract title from <title> tag
	const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/);
	if (!titleMatch) return null;
	const title = titleMatch[1];

	// 2. Extract date from <time> tag's datetime attribute
	const dateMatch = htmlContent.match(
		/<time[^>]*class="dt-published"[^>]*datetime="([^"]*)"/
	);
	if (!dateMatch) return null;
	const date = dateMatch[1];

	// 3. Extract URL from canonical link
	const urlMatch = htmlContent.match(
		/<a[^>]*href="([^"]*)"[^>]*class="p-canonical"/
	);
	if (!urlMatch) return null;
	const url = urlMatch[1];

	// 4. Extract text content from body section
	const bodyMatch = htmlContent.match(
		/<section[^>]*data-field="body"[^>]*class="e-content"[^>]*>([\s\S]*?)<\/section>/
	);
	if (!bodyMatch) return null;

	// Remove HTML tags
	let text = bodyMatch[1].replace(/<[^>]+>/g, '');
	// Normalize whitespace
	text = text.replace(/\s+/g, ' ').trim();

	// Extract author from footer anchor tag with class p-author h-card
	const authorMatch = htmlContent.match(
		/<a[^>]*class="p-author h-card"[^>]*>([^<]*)<\/a>/
	);
	const author = authorMatch ? authorMatch[1] : 'Unknown';

	// Extract language (optional, from html lang attribute or default)
	const langMatch = htmlContent.match(/<html[^>]*lang="([^"]*)"/);
	const language = langMatch ? langMatch[1] : 'en';

	return {
		text,
		url,
		author,
		title,
		date,
		source: 'medium',
		language,
	};
}
