import type { Question, QuestionBankUpdateSummary, QuestionProgress } from '../types';
import { defaultProgress } from './reviewScheduler';

export interface QuestionBankMigrationPlan {
  questionsToPut: Question[];
  questionIdsToDelete: number[];
  progressToPut: QuestionProgress[];
  summary: QuestionBankUpdateSummary;
}

function contentSignature(question: Question): string {
  return JSON.stringify({
    question: question.question,
    options: question.options,
    answer: question.answer,
    explanation: question.explanation,
  });
}

export function planQuestionBankMigration(
  previousQuestions: Question[],
  incomingQuestions: Question[],
  previousProgress: QuestionProgress[],
  questionBankVersion: string,
  now = new Date(),
): QuestionBankMigrationPlan {
  const stamp = now.toISOString();
  const previousById = new Map(previousQuestions.map(question => [question.id, question]));
  const incomingById = new Map(incomingQuestions.map(question => [question.id, question]));
  const progressById = new Map(previousProgress.map(progress => [progress.questionId, progress]));
  const progressToPut: QuestionProgress[] = [];
  const needsReviewQuestionIds: number[] = [];
  let updatedQuestionCount = 0;
  let answerChangedQuestionCount = 0;
  let addedQuestionCount = 0;

  for (const incoming of incomingQuestions) {
    const previous = previousById.get(incoming.id);
    let progress = progressById.get(incoming.id) ?? defaultProgress(incoming.id);
    if (!previous) {
      addedQuestionCount += 1;
    } else if (contentSignature(previous) !== contentSignature(incoming)) {
      updatedQuestionCount += 1;
      if (previous.answer !== incoming.answer) {
        answerChangedQuestionCount += 1;
        needsReviewQuestionIds.push(incoming.id);
        progress = {
          ...progress,
          memoryLevel: 1,
          nextReviewAt: stamp,
          consecutiveCorrect: 0,
          lastResult: null,
          needsReview: true,
          questionUpdatedAt: stamp,
          updatedAt: stamp,
        };
      }
    }
    progressToPut.push({ ...progress, isArchived: false, archivedAt: null });
  }

  const questionIdsToDelete = previousQuestions
    .filter(question => !incomingById.has(question.id))
    .map(question => question.id);
  for (const questionId of questionIdsToDelete) {
    const progress = progressById.get(questionId);
    if (progress) {
      progressToPut.push({ ...progress, isArchived: true, archivedAt: stamp, updatedAt: stamp });
    }
  }

  return {
    questionsToPut: incomingQuestions,
    questionIdsToDelete,
    progressToPut,
    summary: {
      questionBankVersion,
      updatedQuestionCount,
      answerChangedQuestionCount,
      addedQuestionCount,
      removedQuestionCount: questionIdsToDelete.length,
      needsReviewQuestionIds,
    },
  };
}
