/**
 * Chapter 6 — Retrieval-Augmented Generation & Semantic Search
 * Questions extracted from Exam Question bank.docx
 */
export const chapter6Questions = [
  {
    id: 601,
    question:
      'In the context of RAG, what is the purpose of the "chunking" step during data pre-processing?',
    options: [
      'To translate text into numerical vectors',
      'To break down large texts into smaller, manageable pieces for efficient retrieval',
      'To generate the final answer for the user\'s query',
      'To store data in a traditional relational database',
    ],
    correct_answer: 1,
  },
  {
    id: 602,
    question:
      'What is the first step in the "Multi-query retrieval" process?',
    options: [
      'Synthesizing the final answer from all retrieved information',
      'Decomposing the complex query into simpler sub-questions',
      'Sending all sub-queries to the vector database in sequence',
      'Generating a single, more complex embedding for the entire query',
    ],
    correct_answer: 1,
  },
  {
    id: 603,
    question:
      'What is the primary limitation of pure vector similarity search that rerankers aim to address?',
    options: [
      'It cannot process numerical data from financial filings',
      'It requires constant fine-tuning to remain effective',
      'It is too computationally expensive for any application',
      'It can miss nuanced semantic relationships in returned chunks',
    ],
    correct_answer: 3,
  },
  {
    id: 604,
    question:
      'Why is cosine similarity typically used as first-stage retrieval rather than applying a reranker directly?',
    options: [
      'Cosine similarity captures deeper semantic relationships',
      'Rerankers cannot handle text beyond a certain token limit',
      'Computing reranker scores for millions of documents is too slow',
      'Cosine similarity produces more accurate relevance scores',
    ],
    correct_answer: 2,
  },
];
