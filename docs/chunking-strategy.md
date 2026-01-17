# Chunking Strategy

Explore approaches to parsing long articles (in CSV or HTML) versus short content, such as LinkedIn posts.

## CSV

Goal: Chunk rows while preserving structure, headers, and traceability.

### Implementation

1. Parse CSV and identify column types (categorical, numeric, text).
2. Determine your chunk size based on:
   - Number of columns (≤30: 20-row chunks; 31-100: 5-10 rows; >100: column grouping)
   - Average tokens per row (test with your embedding model)
   - Query patterns (what rows/columns do users typically search?)
3. For each chunk, include:
   - Column headers (always)
   - Row identifiers/keys (for reference)
   - Row data
   - Optional: semantic category/tags if applicable

Pro: Maintains row integrity and context.

Con: Ignores column semantics and createS semantically incoherent chunks if rows don't have strong internal relationships.

## HTML

## Short Content

