import { dbPromise } from './database';
import { defaultProgress } from '../services/reviewScheduler';
import type { QuestionFile } from '../types';
import { APP_DB_VERSION } from '../constants/reviewIntervals';

const dataPath = () => `${import.meta.env.BASE_URL}data/questions.json`;
function valid(file: unknown): file is QuestionFile { const x = file as QuestionFile; return Boolean(x?.metadata && Array.isArray(x.questions) && x.questions.length && x.questions.every(q => q.id && q.question && q.options && q.answer)); }
export async function initializeQuestionBank(force = false): Promise<void> {
  const db = await dbPromise; const initialized = await db.get('settings', 'initialized'); const version = await db.get('settings', 'databaseVersion');
  if (!force && initialized?.value === true && version?.value === APP_DB_VERSION && await db.count('questions') > 0) return;
  let response: Response; try { response = await fetch(dataPath()); } catch (e) { console.error(e); throw new Error('無法載入題庫。若是第一次開啟，請先連上網路完成初始化。'); }
  if (!response.ok) throw new Error('讀取題庫檔案失敗，請重新載入題庫。');
  let file: unknown; try { file = await response.json(); } catch (e) { console.error(e); throw new Error('題庫資料格式錯誤。'); }
  if (!valid(file)) throw new Error('題庫資料不完整或為空。');
  const tx = db.transaction(['questions', 'progress', 'settings'], 'readwrite');
  if (force) { await tx.objectStore('questions').clear(); await tx.objectStore('progress').clear(); }
  await Promise.all(file.questions.map(q => tx.objectStore('questions').put(q)));
  await Promise.all(file.questions.map(q => tx.objectStore('progress').put(defaultProgress(q.id))));
  await tx.objectStore('settings').put({ key: 'databaseVersion', value: file.metadata.databaseVersion });
  await tx.objectStore('settings').put({ key: 'initialized', value: true });
  await tx.objectStore('settings').put({ key: 'initializedAt', value: new Date().toISOString() });
  await tx.objectStore('settings').put({ key: 'dailyCompleted', value: {} });
  await tx.objectStore('settings').put({ key: 'lastUsedDate', value: new Date().toISOString() });
  await tx.done;
}
export async function getQuestions() { return (await dbPromise).getAll('questions'); }
export async function getProgress() { return (await dbPromise).getAll('progress'); }
export async function setProgress(value: import('../types').QuestionProgress) { return (await dbPromise).put('progress', value); }
export async function setSetting(key: string, value: unknown) { return (await dbPromise).put('settings', { key, value }); }
export async function getSetting<T>(key: string): Promise<T | undefined> { return ((await dbPromise).get('settings', key)).then(x => x?.value as T | undefined); }
