export const finalBossQuestions = [
  {
    id: 801,
    question:
      'In Model Selection, what is an important consideration besides performance on the validation set?',
    options: [
      'The size of the training dataset',
      'The variety of features available for the model',
      "The model's simplicity, training time, and resource requirements",
      'The total number of outliers removed during data cleaning',
    ],
    correct_answer: 2,
  },
  {
    id: 802,
    question:
      'What is a key difference between the activation functions in hidden layers and the output layer?',
    options: [
      'Hidden layer functions are always Sigmoid, while output layer functions are always Softmax',
      'Hidden layer functions make the network linear, while output layer functions introduce non-linearity',
      'Hidden layer functions capture complex patterns, while output layer functions format the final output',
      'Hidden layer functions are only used for regression tasks',
    ],
    correct_answer: 2,
  },
  {
    id: 803,
    question:
      'What is the primary mechanism that enables Transformers to process entire sentences concurrently?',
    options: [
      'Recurrent connections between hidden states',
      'Long Short-Term Memory cells',
      'Self-attention mechanism',
      'Convolutional filters applied across the sequence',
    ],
    correct_answer: 2,
  },
  {
    id: 804,
    question:
      'Why does fine-tuning memory usage increase faster with sequence length than inference?',
    options: [
      'Fine-tuning uses a smaller batch size',
      'Fine-tuning requires additional storage of activations, gradients, and optimizer states',
      'Inference requires Flash Attention',
      'Inference uses full 32-bit precision',
    ],
    correct_answer: 1,
  },
  {
    id: 805,
    question:
      'What was the primary limitation of traditional ML methods when dealing with unstructured data?',
    options: [
      'They could not process numerical data efficiently',
      'They required extensive feature engineering and often resulted in subpar performance',
      'They were too expensive to implement for large-scale applications',
      'They could only work with datasets smaller than 1GB',
    ],
    correct_answer: 1,
  },
  {
    id: 806,
    question:
      'What is the final step in the multi-query retrieval process?',
    options: [
      'Deleting the retrieved information to save space',
      'Synthesizing the final answer from the aggregated results',
      'Asking the user if they have more questions',
      'Returning the raw, unaggregated results to the user',
    ],
    correct_answer: 1,
  },
  {
    id: 807,
    question:
      'Which metric is tracked by LangSmith / LangFuse to optimize LLM performance and cost?',
    options: [
      'Number of concurrent user logins and session durations',
      'Time-to-first-token (latency), token usage / cost, and error rates',
      'Model training epochs and validation loss',
      'Server CPU and memory utilization in real-time',
    ],
    correct_answer: 1,
  },
];
