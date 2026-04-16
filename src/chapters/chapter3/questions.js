/**
 * Chapter 3 — NLP, Word Embeddings & Transformers
 * Questions extracted from Exam Question bank.docx
 * (Embeddings in NLP + Transformers sections)
 */
export const chapter3Questions = [
  {
    id: 301,
    question:
      'What is the primary function of embeddings in Natural Language Processing?',
    options: [
      'To increase processing speed by reducing vocabulary size',
      'To convert words or phrases into a numerical vector format that AI models can process',
      'To filter out stop words and punctuation from input text',
      'To assign a unique non-numerical identifier to every word',
    ],
    correct_answer: 1,
  },
  {
    id: 302,
    question: 'What key relationship do word embeddings capture between words?',
    options: [
      'Syntactic relationships such as part of speech',
      'Morphological relationships such as root word forms',
      'Semantic relationships — words with similar meanings have similar representations',
      'Positional relationships indicating where a word appears in a sentence',
    ],
    correct_answer: 2,
  },
  {
    id: 303,
    question:
      'What is the core hypothesis that Word2Vec leverages to learn word representations?',
    options: [
      'All words must have the same vector length',
      'Grammar is more important than context',
      'The distributional hypothesis — words in similar contexts have similar meanings',
      'New words will never emerge in the language',
    ],
    correct_answer: 2,
  },
  {
    id: 304,
    question: 'In the self-attention mechanism, attention scores determine:',
    options: [
      'The order in which tokens should be processed',
      'How much weight each word should give to every other word in the sentence',
      'The embedding dimension size for each token',
      'The number of encoder layers required for processing',
    ],
    correct_answer: 1,
  },
];
