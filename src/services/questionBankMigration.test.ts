import { describe, expect, it } from 'vitest';
import type { Question } from '../types';
import { defaultProgress } from './reviewScheduler';
import { planQuestionBankMigration } from './questionBankMigration';
import legacyBankJson from '../../無人機考照問題.json';
import generatedBankJson from '../../public/data/questions.json';

const question = (id: number, answer: Question['answer'] = 'A', text = `題目 ${id}`): Question => ({
  id,
  stableQuestionId: id,
  sourceQuestionNo: String(id),
  question: text,
  options: { A: '甲', B: '乙', C: '丙', D: '丁' },
  answer,
  explanation: '',
});

describe('題庫安全 migration', () => {
  it('答案改變時保留歷史次數，但重設記憶階段並要求複習', () => {
    const before = { ...defaultProgress(1), memoryLevel: 8, correctCount: 12, wrongCount: 3, consecutiveCorrect: 5, isBookmarked: true, hasEverBeenWrong: true };
    const plan = planQuestionBankMigration([question(1, 'A')], [question(1, 'C')], [before], 'v2', new Date('2026-08-09T01:00:00.000Z'));
    const after = plan.progressToPut[0];
    expect(after.correctCount).toBe(12);
    expect(after.wrongCount).toBe(3);
    expect(after.isBookmarked).toBe(true);
    expect(after.hasEverBeenWrong).toBe(true);
    expect(after.memoryLevel).toBe(1);
    expect(after.consecutiveCorrect).toBe(0);
    expect(after.nextReviewAt).toBe('2026-08-09T01:00:00.000Z');
    expect(after.needsReview).toBe(true);
    expect(plan.summary.needsReviewQuestionIds).toEqual([1]);
  });

  it('只修改題目文字時完整保留記憶狀態', () => {
    const before = { ...defaultProgress(1), memoryLevel: 7, correctCount: 9, consecutiveCorrect: 4 };
    const plan = planQuestionBankMigration([question(1)], [question(1, 'A', '修正錯字')], [before], 'v2');
    expect(plan.progressToPut[0].memoryLevel).toBe(7);
    expect(plan.progressToPut[0].correctCount).toBe(9);
    expect(plan.progressToPut[0].consecutiveCorrect).toBe(4);
    expect(plan.summary.updatedQuestionCount).toBe(1);
    expect(plan.summary.answerChangedQuestionCount).toBe(0);
  });

  it('新增題目建立全新進度，移除題目只封存進度並保留歷史', () => {
    const removed = { ...defaultProgress(1), reviewCount: 6, wrongCount: 2 };
    const plan = planQuestionBankMigration([question(1)], [question(2)], [removed], 'v2');
    expect(plan.questionIdsToDelete).toEqual([1]);
    expect(plan.progressToPut.find(item => item.questionId === 1)).toMatchObject({ isArchived: true, reviewCount: 6, wrongCount: 2 });
    expect(plan.progressToPut.find(item => item.questionId === 2)).toMatchObject({ memoryLevel: 0, firstStudiedAt: null, isArchived: false });
    expect(plan.summary).toMatchObject({ addedQuestionCount: 1, removedQuestionCount: 1 });
  });

  it('實際新版題庫只讓 stableQuestionId 214 立即重新複習', () => {
    const legacyBank = legacyBankJson as unknown as { questions: Question[] };
    const generatedBank = generatedBankJson as unknown as { metadata: { questionBankVersion: string }; questions: Question[] };
    const existingProgress = legacyBank.questions.map(item => item.id === 214
      ? { ...defaultProgress(item.id), memoryLevel: 8, firstStudiedAt: '2026-07-01T02:00:00.000Z', lastReviewedAt: '2026-08-01T02:00:00.000Z', lastWrongAt: '2026-07-20T02:00:00.000Z', reviewCount: 20, correctCount: 15, wrongCount: 5, consecutiveCorrect: 4, isBookmarked: true, hasEverBeenWrong: true }
      : defaultProgress(item.id));
    const now = new Date('2026-08-09T04:00:00.000Z');
    const plan = planQuestionBankMigration(
      legacyBank.questions,
      generatedBank.questions,
      existingProgress,
      generatedBank.metadata.questionBankVersion,
      now,
    );
    const updated = plan.progressToPut.find(item => item.questionId === 214)!;
    expect(plan.summary).toMatchObject({
      updatedQuestionCount: 184,
      answerChangedQuestionCount: 1,
      addedQuestionCount: 0,
      removedQuestionCount: 0,
      needsReviewQuestionIds: [214],
    });
    expect(updated).toMatchObject({
      memoryLevel: 1,
      nextReviewAt: now.toISOString(),
      consecutiveCorrect: 0,
      lastResult: null,
      needsReview: true,
      reviewCount: 20,
      correctCount: 15,
      wrongCount: 5,
      firstStudiedAt: '2026-07-01T02:00:00.000Z',
      lastReviewedAt: '2026-08-01T02:00:00.000Z',
      lastWrongAt: '2026-07-20T02:00:00.000Z',
      isBookmarked: true,
      hasEverBeenWrong: true,
    });
  });
});
