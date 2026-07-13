export type Answer = 'A' | 'B' | 'C' | 'D';
export type StudyMode = 'quiz' | 'sprint' | 'wrong-review';
export interface Question { id: number; sourceQuestionNo: string; question: string; options: Record<Answer, string>; answer: Answer; explanation: string; }
export interface QuestionProgress { questionId: number; memoryLevel: number; nextReviewAt: string | null; lastReviewedAt: string | null; firstStudiedAt: string | null; reviewCount: number; correctCount: number; wrongCount: number; consecutiveCorrect: number; lastResult: 'correct' | 'wrong' | null; isBookmarked: boolean; hasEverBeenWrong: boolean; lastWrongAt: string | null; updatedAt: string; }
export interface StudySession { id: string; mode: StudyMode; startedAt: string; completedAt: string | null; totalQuestions: number; correctCount: number; wrongCount: number; questionIds: number[]; results: SessionResult[]; }
export interface SessionResult { questionId: number; selectedAnswer: Answer; correctAnswer: Answer; isCorrect: boolean; }
export interface AppSettings { key: string; value: unknown; }
export interface QuestionFile { metadata: { databaseVersion: number; questionCount: number }; questions: Question[]; }
export interface AppStats { total: number; studied: number; completed: number; due: number; todayCompleted: number; answers: number; correctAnswers: number; stages: number[]; }
