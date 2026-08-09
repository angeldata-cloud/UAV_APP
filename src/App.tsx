import { HashRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { FlashcardsPage } from './pages/FlashcardsPage';
import { QuizPlay, QuizSetup, ResultPage, SprintSetup } from './pages/QuizPages';
import { SearchPage, WrongPage } from './pages/LibraryPages';
import { ProgressPage } from './pages/ProgressPage';
import { ManagePage } from './pages/ManagePage';

function LoadingGate() {
  const { loading, error, retry, questionBankUpdate, dismissQuestionBankUpdate } = useApp();
  const navigate = useNavigate();
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({ immediate: import.meta.env.PROD });
  if (loading) return <main className="loading"><h1>正在準備題庫……</h1><p>第一次開啟時會將題庫安全儲存在這台裝置。</p></main>;
  if (error) return <main className="loading"><h1>題庫準備失敗</h1><p className="error">{error}</p><button className="primary" onClick={() => void retry()}>重新載入題庫</button></main>;

  const startUpdatedReview = () => {
    if (!questionBankUpdate?.needsReviewQuestionIds.length) return;
    const ids = questionBankUpdate.needsReviewQuestionIds;
    dismissQuestionBankUpdate();
    navigate('/flashcards', { state: { ids } });
  };

  return <>
    <Routes>
      <Route path="*" element={<Layout><Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/flashcards" element={<FlashcardsPage />} />
        <Route path="/quiz" element={<QuizSetup />} />
        <Route path="/quiz/play" element={<QuizPlay />} />
        <Route path="/sprint" element={<SprintSetup />} />
        <Route path="/sprint/play" element={<QuizPlay />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/wrong" element={<WrongPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/manage" element={<ManagePage />} />
      </Routes></Layout>} />
    </Routes>
    {questionBankUpdate && <div className="modal-backdrop" role="presentation">
      <section className="bank-update-dialog" role="dialog" aria-modal="true" aria-labelledby="bank-update-title">
        <h2 id="bank-update-title">題庫已更新</h2>
        <dl>
          <div><dt>更新題目</dt><dd>{questionBankUpdate.updatedQuestionCount} 題</dd></div>
          <div><dt>答案變更</dt><dd>{questionBankUpdate.answerChangedQuestionCount} 題</dd></div>
          <div><dt>新增</dt><dd>{questionBankUpdate.addedQuestionCount} 題</dd></div>
          <div><dt>移除</dt><dd>{questionBankUpdate.removedQuestionCount} 題</dd></div>
          <div><dt>需要重新複習</dt><dd>{questionBankUpdate.needsReviewQuestionIds.length} 題</dd></div>
        </dl>
        {questionBankUpdate.needsReviewQuestionIds.length > 0 && <button className="primary" onClick={startUpdatedReview}>開始複習更新題目</button>}
        <button className="secondary" onClick={dismissQuestionBankUpdate}>稍後再說</button>
      </section>
    </div>}
    {import.meta.env.PROD && needRefresh && <aside className="update">有新版本可使用 <button onClick={() => void updateServiceWorker(true)}>更新 App</button></aside>}
  </>;
}

export default function App() {
  return <HashRouter><AppProvider><LoadingGate /></AppProvider></HashRouter>;
}
