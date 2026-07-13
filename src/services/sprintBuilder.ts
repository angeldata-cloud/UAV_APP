import type { Question, QuestionProgress } from '../types';
import { shuffle } from './quizBuilder';
/** Prioritise difficult/recent, due/old, unlearned, then fill. Set prevents duplicates. */
export function buildSprint(questions: Question[], progress: Map<number, QuestionProgress>, count: number, now = new Date()): Question[] {
  const days3 = now.getTime() - 3 * 864e5; const old = now.getTime() - 3 * 864e5; const selected: Question[] = []; const used = new Set<number>();
  const take = (pool: Question[], amount: number) => shuffle(pool.filter(q => !used.has(q.id))).slice(0, amount).forEach(q => { used.add(q.id); selected.push(q); });
  const p = (q: Question) => progress.get(q.id);
  take(questions.filter(q => { const x=p(q); return Boolean(x?.lastWrongAt && new Date(x.lastWrongAt).getTime() >= days3) || (x?.wrongCount ?? 0) >= 2; }), Math.ceil(count * .4));
  take(questions.filter(q => { const x=p(q); return Boolean(x?.nextReviewAt && new Date(x.nextReviewAt).getTime() <= now.getTime()) || Boolean(x?.firstStudiedAt && (!x.lastReviewedAt || new Date(x.lastReviewedAt).getTime() < old)); }), Math.ceil(count * .3));
  take(questions.filter(q => !p(q)?.firstStudiedAt), Math.ceil(count * .2));
  take(questions, count - selected.length);
  return shuffle(selected).slice(0, Math.min(count, questions.length));
}
