/**
 * Global game state — single source of truth.
 * Import and mutate through exported helpers only.
 */

const state = {
  currentChapter: 0,
  score: 0,
  lives: 3,
  answeredQuestions: [],
};

export function getState() {
  return state;
}

export function resetState() {
  state.currentChapter = 0;
  state.score = 0;
  state.lives = 3;
  state.answeredQuestions = [];
}

export function addScore(points) {
  state.score += points;
}

export function loseLife() {
  state.lives = Math.max(0, state.lives - 1);
}

export function setChapter(chapter) {
  state.currentChapter = chapter;
}

export function markAnswered(questionId) {
  if (!state.answeredQuestions.includes(questionId)) {
    state.answeredQuestions.push(questionId);
  }
}
