/**
 * Chapter 5 — NLP Sampling Methods & Evaluation Metrics
 * Questions extracted from Exam Question bank.docx
 */
export const chapter5Questions = [
  {
    id: 501,
    question:
      "In Top-k sampling, the parameter 'k' determines:",
    options: [
      'The temperature of the softmax function',
      'The number of beams used to search for sequences',
      'The number of most likely tokens to sample from at each step',
      'The cumulative probability threshold for candidate tokens',
    ],
    correct_answer: 2,
  },
  {
    id: 502,
    question:
      'How does a lower temperature (e.g., 0.5) affect the model\'s probability distribution?',
    options: [
      'It smooths the distribution, making all tokens more equally likely',
      'It sharpens the distribution, making high-probability tokens more dominant',
      'It inverts the distribution, making low-probability tokens more likely',
      'It has no effect on the distribution',
    ],
    correct_answer: 1,
  },
  {
    id: 503,
    question: 'What is the primary purpose of the BLEU score?',
    options: [
      'To evaluate text summarization by comparing n-gram recall',
      'To evaluate machine-translated text by comparing it to human reference translations',
      'To measure semantic similarity using embeddings',
      'To assess general knowledge and reasoning of language models',
    ],
    correct_answer: 1,
  },
  {
    id: 504,
    question: 'The ROUGE-N metric is primarily based on which of the following?',
    options: [
      'The longest common subsequence between texts',
      'The overlap of skip-bigrams between texts',
      'The cosine similarity of sentence embeddings',
      'The overlap of n-grams between texts',
    ],
    correct_answer: 3,
  },
];
