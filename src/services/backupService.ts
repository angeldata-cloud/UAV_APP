import { dbPromise } from '../db/database';
import { defaultProgress } from './reviewScheduler';
import type { AppSettings, QuestionProgress, StudySession } from '../types';

export interface BackupData {
  exportVersion: 1 | 2;
  exportedAt?: string;
  databaseVersion: number;
  questionBankVersion?: string;
  progress: QuestionProgress[];
  sessions: StudySession[];
  settings: AppSettings[];
}

const protectedSettingKeys = new Set(['databaseVersion', 'questionBankVersion', 'initialized', 'initializedAt', 'lastQuestionBankUpdate']);

export async function exportBackup(): Promise<BackupData> {
  const db = await dbPromise;
  return {
    exportVersion: 2,
    exportedAt: new Date().toISOString(),
    databaseVersion: Number((await db.get('settings', 'databaseVersion'))?.value ?? 1),
    questionBankVersion: (await db.get('settings', 'questionBankVersion'))?.value as string | undefined,
    progress: await db.getAll('progress'),
    sessions: await db.getAll('sessions'),
    settings: await db.getAll('settings'),
  };
}

export function validBackup(value: unknown): value is BackupData {
  const backup = value as Partial<BackupData>;
  return (backup?.exportVersion === 1 || backup?.exportVersion === 2)
    && typeof backup.databaseVersion === 'number'
    && Array.isArray(backup.progress)
    && Array.isArray(backup.sessions)
    && Array.isArray(backup.settings);
}

export async function importBackup(backup: BackupData) {
  const db = await dbPromise;
  const questions = await db.getAll('questions');
  const backupProgress = new Map(backup.progress.map(progress => [progress.questionId, progress]));
  const tx = db.transaction(['progress', 'sessions', 'settings'], 'readwrite');
  await tx.objectStore('progress').clear();
  await tx.objectStore('sessions').clear();
  for (const progress of backup.progress) await tx.objectStore('progress').put(progress);
  for (const question of questions) {
    if (!backupProgress.has(question.id)) await tx.objectStore('progress').put(defaultProgress(question.id));
  }
  for (const session of backup.sessions) await tx.objectStore('sessions').put(session);
  for (const setting of backup.settings) {
    if (!protectedSettingKeys.has(setting.key)) await tx.objectStore('settings').put(setting);
  }
  await tx.done;
}

export async function resetLearning() {
  const db = await dbPromise;
  const questions = await db.getAll('questions');
  const tx = db.transaction(['progress', 'sessions', 'settings'], 'readwrite');
  await tx.objectStore('progress').clear();
  await tx.objectStore('sessions').clear();
  for (const question of questions) await tx.objectStore('progress').put(defaultProgress(question.id));
  await tx.objectStore('settings').put({ key: 'dailyCompleted', value: {} });
  await tx.done;
}
