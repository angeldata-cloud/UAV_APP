import { dbPromise } from './database';
import { defaultProgress } from '../services/reviewScheduler';
import { planQuestionBankMigration } from '../services/questionBankMigration';
import type { Answer, QuestionBankUpdateSummary, QuestionFile } from '../types';

const dataPath = () => `${import.meta.env.BASE_URL}data/questions.json`;
const answers: Answer[] = ['A', 'B', 'C', 'D'];

function valid(file: unknown): file is QuestionFile {
  const value = file as QuestionFile;
  if (!value?.metadata || !Array.isArray(value.questions) || value.questions.length === 0) return false;
  if (value.metadata.questionCount !== value.questions.length) return false;
  const ids = new Set<number>();
  for (const question of value.questions) {
    if (!Number.isInteger(question.id) || question.id < 1 || ids.has(question.id)) return false;
    ids.add(question.id);
    if (typeof question.sourceQuestionNo !== 'string' || !question.sourceQuestionNo.trim()) return false;
    if (typeof question.question !== 'string' || !question.question.trim() || !answers.includes(question.answer)) return false;
    if (!question.options || answers.some(answer => typeof question.options[answer] !== 'string' || !question.options[answer].trim())) return false;
    if (typeof question.explanation !== 'string') return false;
  }
  return true;
}

function versionOf(file: QuestionFile): string {
  return file.metadata.questionBankVersion ?? `legacy-${file.metadata.databaseVersion}`;
}

async function fetchQuestionFile(): Promise<QuestionFile> {
  let response: Response;
  try {
    response = await fetch(dataPath(), { cache: 'no-cache' });
  } catch (error) {
    console.error(error);
    throw new Error('無法載入題庫。若是第一次開啟，請先連上網路完成初始化。');
  }
  if (!response.ok) throw new Error('讀取題庫檔案失敗，請稍後再試。');
  let file: unknown;
  try {
    file = await response.json();
  } catch (error) {
    console.error(error);
    throw new Error('題庫資料格式錯誤。');
  }
  if (!valid(file)) throw new Error('題庫資料不完整、重複或為空。');
  return file;
}

export async function initializeQuestionBank(force = false): Promise<QuestionBankUpdateSummary | null> {
  const db = await dbPromise;
  const existingCount = await db.count('questions');
  let file: QuestionFile;
  try {
    file = await fetchQuestionFile();
  } catch (error) {
    if (existingCount > 0) {
      console.warn('目前離線或新版題庫暫時無法取得，繼續使用裝置內既有題庫。', error);
      return null;
    }
    throw error;
  }

  const incomingVersion = versionOf(file);
  const storedVersionSetting = await db.get('settings', 'questionBankVersion');
  const storedDatabaseVersion = await db.get('settings', 'databaseVersion');
  const storedVersion = storedVersionSetting?.value
    ?? (storedDatabaseVersion ? `legacy-${storedDatabaseVersion.value}` : undefined);
  if (!force && existingCount > 0 && storedVersion === incomingVersion) return null;

  if (existingCount === 0) {
    const hasDailyCompleted = Boolean(await db.get('settings', 'dailyCompleted'));
    const tx = db.transaction(['questions', 'progress', 'settings'], 'readwrite');
    for (const question of file.questions) {
      await tx.objectStore('questions').put(question);
      await tx.objectStore('progress').put(defaultProgress(question.id));
    }
    await tx.objectStore('settings').put({ key: 'databaseVersion', value: file.metadata.databaseVersion });
    await tx.objectStore('settings').put({ key: 'questionBankVersion', value: incomingVersion });
    await tx.objectStore('settings').put({ key: 'initialized', value: true });
    await tx.objectStore('settings').put({ key: 'initializedAt', value: new Date().toISOString() });
    if (!hasDailyCompleted) {
      await tx.objectStore('settings').put({ key: 'dailyCompleted', value: {} });
    }
    await tx.done;
    return null;
  }

  const [previousQuestions, previousProgress] = await Promise.all([
    db.getAll('questions'),
    db.getAll('progress'),
  ]);
  const plan = planQuestionBankMigration(
    previousQuestions,
    file.questions,
    previousProgress,
    incomingVersion,
  );
  const tx = db.transaction(['questions', 'progress', 'settings'], 'readwrite');
  for (const question of plan.questionsToPut) await tx.objectStore('questions').put(question);
  for (const questionId of plan.questionIdsToDelete) await tx.objectStore('questions').delete(questionId);
  for (const progress of plan.progressToPut) await tx.objectStore('progress').put(progress);
  await tx.objectStore('settings').put({ key: 'databaseVersion', value: file.metadata.databaseVersion });
  await tx.objectStore('settings').put({ key: 'questionBankVersion', value: incomingVersion });
  await tx.objectStore('settings').put({ key: 'lastQuestionBankUpdate', value: plan.summary });
  await tx.objectStore('settings').put({ key: 'initialized', value: true });
  await tx.done;

  const totalChanges = plan.summary.updatedQuestionCount
    + plan.summary.addedQuestionCount
    + plan.summary.removedQuestionCount;
  return totalChanges > 0 ? plan.summary : null;
}

export async function getQuestions() { return (await dbPromise).getAll('questions'); }
export async function getProgress() { return (await dbPromise).getAll('progress'); }
export async function setProgress(value: import('../types').QuestionProgress) { return (await dbPromise).put('progress', value); }
export async function setSetting(key: string, value: unknown) { return (await dbPromise).put('settings', { key, value }); }
export async function getSetting<T>(key: string): Promise<T | undefined> { return ((await dbPromise).get('settings', key)).then(x => x?.value as T | undefined); }
