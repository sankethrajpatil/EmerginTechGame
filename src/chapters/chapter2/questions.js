/**
 * Chapter 2 — Neural Networks and Training Process
 * Questions extracted from Exam Question bank.docx (Q94-101)
 */
export const chapter2Questions = [
  {
    id: 201,
    question:
      'What is the primary purpose of activation functions in neural networks?',
    options: [
      'To reduce computational complexity',
      'To introduce non-linearity into the output of neurons',
      'To store training data',
      'To increase the size of the network',
    ],
    correct_answer: 1,
  },
  {
    id: 202,
    question:
      'What does the backward pass (backpropagation) calculate?',
    options: [
      'The final output of the network',
      'The input features for the next iteration',
      'The gradient of the loss function with respect to each weight',
      'The accuracy of the model',
    ],
    correct_answer: 2,
  },
  {
    id: 203,
    question: 'What is an epoch in neural network training?',
    options: [
      'A single forward pass through one data sample',
      'One complete pass through the entire training dataset',
      'The time it takes to train the model',
      'A single weight update',
    ],
    correct_answer: 1,
  },
  {
    id: 204,
    question:
      'Which activation function maps real-valued numbers to values between 0 and 1?',
    options: ['ReLU', 'Tanh', 'Sigmoid', 'Linear'],
    correct_answer: 2,
  },
];
