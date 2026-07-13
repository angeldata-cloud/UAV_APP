import { REVIEW_INTERVALS } from '../constants/reviewIntervals';
import type { QuestionProgress } from '../types';
import { addMilliseconds } from '../utils/date';

export type ReviewRating = 'again' | 'normal' | 'easy';
export const defaultProgress = (questionId: number): QuestionProgress => ({ questionId, memoryLevel: 0, nextReviewAt: null, lastReviewedAt: null, firstStudiedAt: null, reviewCount: 0, correctCount: 0, wrongCount: 0, consecutiveCorrect: 0, lastResult: null, isBookmarked: false, hasEverBeenWrong: false, lastWrongAt: null, updatedAt: new Date().toISOString() });
export const isCompleted = (p: QuestionProgress) => Boolean(p.firstStudiedAt && p.lastResult !== 'wrong' && p.memoryLevel >= 6);
/** One shared implementation keeps flashcard and test rules consistent. */
export function applyReview(progress: QuestionProgress, rating: ReviewRating, now = new Date()): QuestionProgress {
  const stamp = now.toISOString(); let level = progress.memoryLevel; let correct = false;
  if (rating === 'again') level = 1;
  else if (rating === 'normal') { correct = true; level = level === 0 ? 1 : level <= 2 ? level + 1 : level; }
  else { correct = true; level = Math.min(9, level + (progress.consecutiveCorrect >= 2 ? 2 : 1)); }
  return { ...progress, memoryLevel: level, nextReviewAt: addMilliseconds(REVIEW_INTERVALS[level], now), lastReviewedAt: stamp, firstStudiedAt: progress.firstStudiedAt ?? stamp, reviewCount: progress.reviewCount + 1, correctCount: progress.correctCount + (correct ? 1 : 0), wrongCount: progress.wrongCount + (!correct ? 1 : 0), consecutiveCorrect: correct ? progress.consecutiveCorrect + 1 : 0, lastResult: correct ? 'correct' : 'wrong', hasEverBeenWrong: progress.hasEverBeenWrong || !correct, lastWrongAt: !correct ? stamp : progress.lastWrongAt, updatedAt: stamp };
}
export function applyQuizResult(progress: QuestionProgress, correct: boolean, now = new Date()): QuestionProgress {
  if (!correct) return applyReview(progress, 'again', now);
  const recentWrong = progress.lastWrongAt && now.getTime() - new Date(progress.lastWrongAt).getTime() < 7 * 24 * 60 * 60 * 1000;
  return applyReview(progress, progress.wrongCount >= 2 || Boolean(recentWrong) || progress.memoryLevel <= 2 ? 'normal' : 'easy', now);
}
