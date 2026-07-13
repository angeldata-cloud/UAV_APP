import type { Question, QuestionProgress } from '../types';
export type QuizSource = 'all' | 'unlearned' | 'due' | 'random' | 'wrong';
export function shuffle<T>(items: T[]): T[] { const copy = [...items]; for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; }
export function buildQuiz(questions: Question[], progress: Map<number, QuestionProgress>, source: QuizSource, count: number): Question[] {
  const now = Date.now(); let pool = questions;
  if (source === 'unlearned') pool = questions.filter(q => !progress.get(q.id)?.firstStudiedAt);
  if (source === 'due') pool = questions.filter(q => { const at = progress.get(q.id)?.nextReviewAt; return at !== null && at !== undefined && new Date(at).getTime() <= now; });
  if (source === 'wrong') pool = questions.filter(q => progress.get(q.id)?.hasEverBeenWrong);
  return shuffle(pool).slice(0, Math.min(count, pool.length));
}
