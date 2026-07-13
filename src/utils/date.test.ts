import { describe,expect,it } from 'vitest';import { getLocalDateKey,isToday } from './date';
describe('本地日期',()=>{it('使用本地日期鍵',()=>{const d=new Date(2026,6,13,0,10);expect(getLocalDateKey(d)).toBe('2026-07-13');expect(isToday(new Date().toISOString())).toBe(true)})});
