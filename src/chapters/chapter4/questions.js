/**
 * Chapter 4 — LLMs, Fine-tuning & Parameter-Efficient Methods
 * Questions extracted from Exam Question bank.docx
 */
export const chapter4Questions = [
  {
    id: 401,
    question: 'What is the primary goal of model quantization?',
    options: [
      'To increase the accuracy of predictions',
      'To reduce computational complexity and memory usage by lowering precision',
      'To add more parameters to the model',
      'To enable domain-specific adaptation',
    ],
    correct_answer: 1,
  },
  {
    id: 402,
    question:
      'What percentage of a model\'s parameters does PEFT typically update?',
    options: ['100%', '50–75%', '10–25%', 'Often under 1%'],
    correct_answer: 3,
  },
  {
    id: 403,
    question:
      'In LoRA (Low-Rank Adaptation), what is the key mechanism for achieving parameter efficiency?',
    options: [
      'Freezing all layers except the output layer',
      'Decomposing weight updates into low-rank matrices',
      'Quantizing the model to 4-bit precision',
      'Adding trainable tokens to the input sequence',
    ],
    correct_answer: 1,
  },
  {
    id: 404,
    question:
      'In the context of fine-tuning, what happens to the model\'s weights?',
    options: [
      'They are frozen and never updated',
      'They are adjusted based on specific training data',
      'They are compressed to lower precision',
      'They are replaced with task-specific prefixes',
    ],
    correct_answer: 1,
  },
];
