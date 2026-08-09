import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppStats, Question, QuestionBankUpdateSummary, QuestionProgress, StudySession } from '../types';
import { getProgress, getQuestions, getSetting, initializeQuestionBank, setProgress, setSetting } from '../db/questions';
import { dbPromise } from '../db/database';
import { getLocalDateKey, isToday } from '../utils/date';

interface AppContextValue {
  questions: Question[];
  progress: Map<number, QuestionProgress>;
  loading: boolean;
  error: string | null;
  stats: AppStats;
  questionBankUpdate: QuestionBankUpdateSummary | null;
  dismissQuestionBankUpdate: () => void;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
  saveProgress: (progress: QuestionProgress) => Promise<void>;
  saveSession: (session: StudySession) => Promise<void>;
  toggleBookmark: (id: number) => Promise<void>;
}

const Ctx = createContext<AppContextValue | null>(null);
const blank: AppStats = { total: 0, studied: 0, completed: 0, due: 0, todayCompleted: 0, answers: 0, correctAnswers: 0, stages: [0, 0, 0, 0, 0] };

export function AppProvider({ children }: { children: ReactNode }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [items, setItems] = useState<QuestionProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questionBankUpdate, setQuestionBankUpdate] = useState<QuestionBankUpdateSummary | null>(null);

  const refresh = useCallback(async () => {
    const [nextQuestions, allProgress] = await Promise.all([getQuestions(), getProgress()]);
    const activeIds = new Set(nextQuestions.map(question => question.id));
    setQuestions(nextQuestions);
    setItems(allProgress.filter(progress => activeIds.has(progress.questionId) && !progress.isArchived));
  }, []);

  const boot = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const update = await initializeQuestionBank(force);
      if (update) setQuestionBankUpdate(update);
      await setSetting('lastUsedDate', new Date().toISOString());
      await refresh();
    } catch (caught) {
      console.error(caught);
      setError(caught instanceof Error ? caught.message : '題庫初始化失敗。');
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => { void boot(); }, [boot]);

  const saveProgress = useCallback(async (progress: QuestionProgress) => {
    await setProgress(progress);
    setItems(current => current.map(value => value.questionId === progress.questionId ? progress : value));
    const key = getLocalDateKey();
    const daily = await getSetting<Record<string, number[]>>('dailyCompleted') ?? {};
    const ids = new Set(daily[key] ?? []);
    ids.add(progress.questionId);
    daily[key] = [...ids];
    await setSetting('dailyCompleted', daily);
  }, []);

  const saveSession = useCallback(async (session: StudySession) => {
    await (await dbPromise).put('sessions', session);
  }, []);

  const toggleBookmark = useCallback(async (id: number) => {
    const progress = items.find(value => value.questionId === id);
    if (progress) await saveProgress({ ...progress, isBookmarked: !progress.isBookmarked, updatedAt: new Date().toISOString() });
  }, [items, saveProgress]);

  const progress = useMemo(() => new Map(items.map(value => [value.questionId, value])), [items]);
  const stats = useMemo(() => {
    if (!items.length) return blank;
    const now = Date.now();
    let studied = 0;
    let completed = 0;
    let due = 0;
    let answers = 0;
    let correctAnswers = 0;
    const stages = [0, 0, 0, 0, 0];
    for (const item of items) {
      if (item.firstStudiedAt) studied += 1;
      if (item.firstStudiedAt && item.lastResult !== 'wrong' && item.memoryLevel >= 6) completed += 1;
      if (item.nextReviewAt && new Date(item.nextReviewAt).getTime() <= now) due += 1;
      answers += item.correctCount + item.wrongCount;
      correctAnswers += item.correctCount;
      stages[item.memoryLevel === 0 ? 0 : item.memoryLevel <= 3 ? 1 : item.memoryLevel <= 5 ? 2 : item.memoryLevel <= 7 ? 3 : 4] += 1;
    }
    const day = items.filter(item => isToday(item.lastReviewedAt)).map(item => item.questionId);
    return { total: items.length, studied, completed, due, todayCompleted: new Set(day).size, answers, correctAnswers, stages };
  }, [items]);

  return <Ctx.Provider value={{
    questions,
    progress,
    loading,
    error,
    stats,
    questionBankUpdate,
    dismissQuestionBankUpdate: () => setQuestionBankUpdate(null),
    refresh,
    retry: () => boot(true),
    saveProgress,
    saveSession,
    toggleBookmark,
  }}>{children}</Ctx.Provider>;
}

export const useApp = () => {
  const value = useContext(Ctx);
  if (!value) throw new Error('AppProvider 缺失');
  return value;
};
