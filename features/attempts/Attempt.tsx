'use client';
import { useEffect, useState } from 'react';
import { Bookmark, Flag, CheckCircle2, Clock3 } from 'lucide-react';
import { api } from '../api';
import { Head, Modal, Status } from '../../components/Common';
export default function Attempt({ id, navigate, refresh }: {
    id: string;
    navigate: (s: string) => void;
    refresh: () => void;
}) { const [attempt, setAttempt] = useState<any>(null); const [index, setIndex] = useState(0); const [choice, setChoice] = useState<number | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [confirm, setConfirm] = useState(false); const [clock, setClock] = useState(Date.now()); const [bookmarked, setBookmarked] = useState<string[]>([]); async function load() { try {
    const a = await api('attempts/get?id=' + id);
    setAttempt(a);
    setChoice(a.answers[a.items[index]?.id]?.choice ?? null);
    api('attempts/revision?mode=bookmarks').then(q => setBookmarked(q.map((v: any) => v.id))).catch(() => { });
}
catch (e: any) {
    setError(e.message);
} } useEffect(() => { load(); const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer); }, [id]); useEffect(() => { if (attempt?.deadline && !attempt.finished && clock >= attempt.deadline) {
    finish();
} }, [clock]); const q = attempt?.items[index]; useEffect(() => { if (q)
    setChoice(attempt.answers[q.id]?.choice ?? null); }, [index, attempt?.id]); async function answer(option: number) { setBusy(true); setError(''); try {
    const a = await api('attempts/answer', { id, question_id: q.id, choice: option });
    setAttempt(a);
    setChoice(a.answers[q.id]?.choice ?? null);
    refresh();
}
catch (e: any) {
    setError(e.message);
    await load();
}
finally {
    setBusy(false);
} } async function finish() { if (busy)
    return; setBusy(true); setError(''); try {
    setAttempt(await api('attempts/finish', { id }));
    setConfirm(false);
    refresh();
}
catch (e: any) {
    setError(e.message);
}
finally {
    setBusy(false);
} } async function bookmark() { try {
    const saved = !bookmarked.includes(q.id);
    await api('attempts/bookmark', { question_id: q.id, saved });
    setBookmarked(saved ? [...bookmarked, q.id] : bookmarked.filter(v => v !== q.id));
    refresh();
}
catch (e: any) {
    setError(e.message);
} } async function flag() { try {
    const flags = attempt.flags.includes(q.id) ? attempt.flags.filter((v: string) => v !== q.id) : [...attempt.flags, q.id];
    await api('attempts/flags', { id, flags });
    setAttempt({ ...attempt, flags });
}
catch (e: any) {
    setError(e.message);
} } if (!attempt)
    return <>{error && <div className="notice error">{error}</div>}<button className="btn" onClick={() => navigate('results')}>Back to sessions</button><p className="subtitle">{!error ? 'Loading your session…' : ''}</p></>; const isPractice = attempt.mode === 'practice', answered = attempt.answers[q.id], feedback = attempt.finished || (isPractice && answered); const seconds = Math.max(0, Math.ceil(((attempt.deadline || clock) - clock) / 1000)); return <><Head title={attempt.title} description={attempt.finished ? 'Review your answers and explanations.' : 'Your progress is saved as you answer.'} action={attempt.deadline && !attempt.finished ? <span className="timer"><Clock3 size={15} style={{ verticalAlign: 'middle', marginRight: 6 }}/>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span> : <Status value={attempt.finished ? 'completed' : 'in_progress'}/>}/>{error && <div className="notice error">{error}</div>}{attempt.finished && <section className="panel"><div className="result-score"><span className="pill">SESSION COMPLETE</span><strong>{attempt.result.percentage}%</strong><p>{attempt.result.correct} of {attempt.result.total} questions correct</p></div><div className="stats" style={{ marginBottom: 0 }}>{[['Correct', attempt.result.correct], ['Incorrect', attempt.result.incorrect], ['Unanswered', attempt.result.unanswered], ['Time taken', Math.ceil((attempt.finished - attempt.created) / 60000) + ' min']].map(([name, value]) => <div className="stat" key={name}><span className="stat-top">{name}</span><strong>{value}</strong></div>)}</div></section>}<div className="grid-two"><section className="panel"><div className="panel-head"><span className="pill">QUESTION {index + 1} OF {attempt.items.length}</span><div className="row"><button className="icon-btn" aria-label={bookmarked.includes(q.id) ? 'Remove bookmark' : 'Bookmark question'} onClick={bookmark}><Bookmark size={18} fill={bookmarked.includes(q.id) ? 'var(--teal)' : 'none'} color={bookmarked.includes(q.id) ? 'var(--teal)' : undefined}/></button>{!attempt.finished && <button className="icon-btn" aria-label="Flag for review" onClick={flag}><Flag size={18} fill={attempt.flags.includes(q.id) ? '#d7b467' : 'none'}/></button>}</div></div><small>{q.subject} / {q.module} / {q.topic}</small><div className="question">{q.stem}</div>{q.image && <img src={q.image} alt="Question illustration" className="proof"/>}{q.options.map((o: string, i: number) => <button key={i} className={'option ' + (choice === i ? 'selected ' : '') + (feedback && q.correct === i ? 'correct' : feedback && answered?.choice === i && i !== q.correct ? 'wrong' : '')} disabled={busy || !!feedback} onClick={() => { setChoice(i); if (!isPractice)
    answer(i); }}><span className="option-letter">{String.fromCharCode(65 + i)}</span>{o}</button>)}{feedback && <div className="notice"><strong>{!answered ? 'Unanswered' : answered.choice === q.correct ? 'Correct answer' : 'Best answer: option ' + String.fromCharCode(65 + q.correct)}</strong><p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{q.explanation}</p>{answered && q.incorrect?.[answered.choice] && <p style={{ marginTop: 8 }}>{q.incorrect[answered.choice]}</p>}{q.source && <small style={{ display: 'block', marginTop: 12 }}>Reference: {q.source}</small>}</div>}<div className="form-actions" style={{ justifyContent: 'space-between' }}><button className="btn" disabled={index === 0 || busy} onClick={() => setIndex(index - 1)}>Previous</button>{isPractice && !feedback ? <button className="btn primary" disabled={choice === null || busy} onClick={() => choice !== null && answer(choice)}>{busy ? 'Saving…' : 'Submit answer'}</button> : index < attempt.items.length - 1 ? <button className="btn primary" disabled={busy} onClick={() => setIndex(index + 1)}>Next question</button> : <button className="btn primary" disabled={busy} onClick={() => attempt.finished ? navigate('results') : setConfirm(true)}>{attempt.finished ? 'Back to results' : 'Finish session'}</button>}</div></section><div><section className="panel"><h3>Question navigator</h3><p className="subtitle">{Object.keys(attempt.answers).length} of {attempt.items.length} answered</p><div className="progress-track"><span style={{ width: Object.keys(attempt.answers).length / attempt.items.length * 100 + '%' }}/></div><div className="q-navigation">{attempt.items.map((q: any, i: number) => <button key={q.id} className={(i === index ? 'current ' : '') + (attempt.answers[q.id] ? 'answered ' : '') + (attempt.flags.includes(q.id) ? 'flagged' : '')} onClick={() => setIndex(i)} disabled={busy}>{i + 1}</button>)}</div><small>Filled: answered · Gold underline: flagged</small>{!attempt.finished && <button className="btn primary wide" style={{ marginTop: 24 }} disabled={busy} onClick={() => setConfirm(true)}>Submit {isPractice ? 'practice' : 'exam'}</button>}<button className="text-button" onClick={() => navigate('results')}>Save and leave</button></section>{attempt.finished && <section className="panel"><h3>Topics to revise</h3>{Object.entries(attempt.result.topics).filter(([_, v]: any) => v.incorrect > 0).length ? Object.entries(attempt.result.topics).filter(([_, v]: any) => v.incorrect > 0).map(([topic, v]: any) => <div className="list-row" key={topic}><span>{topic}</span><small>{v.incorrect} incorrect</small></div>) : <p className="subtitle">No incorrect answers in this session.</p>}</section>}</div></div>{confirm && <Modal title="Submit your session?" close={() => setConfirm(false)}><p>You have answered {Object.keys(attempt.answers).length} of {attempt.items.length} questions. Unanswered questions receive zero marks. Submitted answers cannot be changed.</p><div className="form-actions"><button className="btn" onClick={() => setConfirm(false)}>Keep answering</button><button className="btn primary" onClick={finish} disabled={busy}>{busy ? 'Submitting…' : 'Submit session'}</button></div></Modal>}</>; }
