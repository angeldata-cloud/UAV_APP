import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppStats, Question, QuestionProgress, StudySession } from '../types';
import { getProgress, getQuestions, getSetting, initializeQuestionBank, setProgress, setSetting } from '../db/questions';
import { dbPromise } from '../db/database';
import { getLocalDateKey, isToday } from '../utils/date';

interface AppContextValue { questions: Question[]; progress: Map<number, QuestionProgress>; loading: boolean; error: string | null; stats: AppStats; refresh: () => Promise<void>; retry: () => Promise<void>; saveProgress: (p: QuestionProgress) => Promise<void>; saveSession: (s: StudySession) => Promise<void>; toggleBookmark: (id: number) => Promise<void>; }
const Ctx=createContext<AppContextValue | null>(null);
const blank: AppStats={total:0,studied:0,completed:0,due:0,todayCompleted:0,answers:0,correctAnswers:0,stages:[0,0,0,0,0]};
export function AppProvider({children}:{children:ReactNode}) { const [questions,setQuestions]=useState<Question[]>([]); const [items,setItems]=useState<QuestionProgress[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null);
  const refresh=useCallback(async()=>{ const [q,p]=await Promise.all([getQuestions(),getProgress()]); setQuestions(q);setItems(p); },[]);
  const boot=useCallback(async(force=false)=>{setLoading(true);setError(null);try{await initializeQuestionBank(force);await setSetting('lastUsedDate',new Date().toISOString());await refresh();}catch(e){console.error(e);setError(e instanceof Error?e.message:'題庫初始化失敗。');}finally{setLoading(false);}},[refresh]); useEffect(()=>{void boot();},[boot]);
  const saveProgress=useCallback(async(p:QuestionProgress)=>{await setProgress(p);setItems(x=>x.map(v=>v.questionId===p.questionId?p:v)); const key=getLocalDateKey(); const daily=await getSetting<Record<string,number[]>>('dailyCompleted')??{}; const ids=new Set(daily[key]??[]);ids.add(p.questionId); daily[key]=[...ids];await setSetting('dailyCompleted',daily);},[]);
  const saveSession=useCallback(async(s:StudySession)=>{await (await dbPromise).put('sessions',s);},[]);
  const toggleBookmark=useCallback(async(id:number)=>{const p=items.find(x=>x.questionId===id);if(p)await saveProgress({...p,isBookmarked:!p.isBookmarked,updatedAt:new Date().toISOString()});},[items,saveProgress]);
  const progress=useMemo(()=>new Map(items.map(x=>[x.questionId,x])),[items]); const stats=useMemo(()=>{if(!items.length)return blank;const now=Date.now();let studied=0,completed=0,due=0,answers=0,correctAnswers=0;const stages=[0,0,0,0,0];for(const p of items){if(p.firstStudiedAt)studied++;if(p.firstStudiedAt&&p.lastResult!=='wrong'&&p.memoryLevel>=6)completed++;if(p.nextReviewAt&&new Date(p.nextReviewAt).getTime()<=now)due++;answers+=p.correctCount+p.wrongCount;correctAnswers+=p.correctCount;stages[p.memoryLevel===0?0:p.memoryLevel<=3?1:p.memoryLevel<=5?2:p.memoryLevel<=7?3:4]++;}const day=items.filter(p=>isToday(p.lastReviewedAt)).map(p=>p.questionId);return{total:items.length,studied,completed,due,todayCompleted:new Set(day).size,answers,correctAnswers,stages};},[items]);
  return <Ctx.Provider value={{questions,progress,loading,error,stats,refresh,retry:()=>boot(true),saveProgress,saveSession,toggleBookmark}}>{children}</Ctx.Provider>;
}
export const useApp=()=>{const v=useContext(Ctx);if(!v)throw new Error('AppProvider 缺失');return v;};
