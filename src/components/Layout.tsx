import { Link, NavLink, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
const nav=[['/','首頁'],['/flashcards','記憶卡'],['/quiz','測驗'],['/wrong','錯題'],['/progress','進度']];
export function Layout({children}:{children:ReactNode}) { const {pathname}=useLocation(); const hidden=['/quiz/play','/sprint/play'].includes(pathname);return <><header className="top"><Link to="/" className="brand">無人機考照衝刺</Link><Link to="/manage" className="small-link">資料管理</Link></header><main className="page">{children}</main>{!hidden&&<nav className="bottom" aria-label="主要導覽">{nav.map(([to,name])=><NavLink end={to==='/'} to={to} key={to}>{name}</NavLink>)}</nav>}</> }
