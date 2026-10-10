'use client';

import { useState, useEffect } from 'react';
import {
  GraduationCap,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Lock,
  Unlock,
  BookOpen,
  Award,
  ChevronRight,
  HelpCircle,
  Layers,
  ArrowUpRight,
  Check,
} from 'lucide-react';

export default function DemoBcqs({
  onExit,
  onSignUp,
  user,
}: {
  onExit?: () => void;
  onSignUp?: () => void;
  user?: any;
}) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [showSummary, setShowSummary] = useState(false);

  const fetchDemoQuestions = (year?: string) => {
    setLoading(true);
    setError('');
    const query = year && year !== 'all' ? `?year=${year}` : '';
    fetch(`/api/questions/demo${query}`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load demo questions');
        return res.json();
      })
      .then((data) => {
        setQuestions(data.data || data || []);
        setCurrentIndex(0);
        setUserAnswers({});
        setShowSummary(false);
      })
      .catch((err) => {
        setError(err.message || 'Unable to load demo BCQs.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDemoQuestions(selectedYear);
  }, [selectedYear]);

  const handleSelectOption = (qId: string, optionIndex: number) => {
    if (userAnswers[qId] !== undefined) return; // already answered
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: optionIndex,
    }));
  };

  const currentQ = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(userAnswers).length;

  // Calculate score stats
  let correctCount = 0;
  let incorrectCount = 0;
  questions.forEach((q) => {
    const ans = userAnswers[q.id];
    if (ans !== undefined) {
      if (ans === q.correct) correctCount++;
      else incorrectCount++;
    }
  });

  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const handleRestart = () => {
    setUserAnswers({});
    setCurrentIndex(0);
    setShowSummary(false);
  };

  return (
    <div className="demo-bcq-container" style={{ maxWidth: '1080px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Top Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid var(--line)',
          paddingBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #087c80, #06585e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 12px rgba(8, 124, 128, 0.25)',
            }}
          >
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--ink)' }}>
                Demo BCQs Practice
              </h2>
              <span
                style={{
                  background: '#e6f5f1',
                  color: '#087c80',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '3px 8px',
                  borderRadius: '20px',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
              >
                15 Real Questions Free
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
              Experience authentic MBBS exam BCQs with explanations from our 5,000+ question bank
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Year Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--muted)', margin: 0 }}>
              MBBS Year:
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{
                fontSize: '13px',
                padding: '6px 10px',
                minHeight: '34px',
                width: 'auto',
                margin: 0,
                borderRadius: '6px',
              }}
            >
              <option value="all">All Years</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
              <option value="5">Year 5</option>
            </select>
          </div>

          {onExit && (
            <button
              onClick={onExit}
              className="btn"
              style={{ padding: '6px 14px', minHeight: '34px', fontSize: '13px' }}
            >
              {user ? 'Back to Workspace' : 'Back to Login'}
            </button>
          )}

          {onSignUp && (
            <button
              onClick={onSignUp}
              className="btn primary"
              style={{ padding: '6px 14px', minHeight: '34px', fontSize: '13px' }}
            >
              <Unlock size={14} />
              {user ? 'View Packages' : 'Sign Up for Full Access'}
            </button>
          )}
        </div>
      </header>

      {/* Loading State */}
      {loading && (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 20px',
            background: 'white',
            borderRadius: '12px',
            border: '1px solid var(--line)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 16px',
              borderRadius: '50%',
              border: '3px solid #e0e9ed',
              borderTopColor: 'var(--teal)',
              animation: 'spin 1s linear infinite',
            }}
          />
          <h3 style={{ fontSize: '17px', color: 'var(--ink)' }}>Loading authentic demo BCQs…</h3>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '4px' }}>
            Pulling published questions and high-yield explanations from the database.
          </p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="notice error" style={{ textAlign: 'center', padding: '30px' }}>
          <h3>Unable to load demo questions</h3>
          <p style={{ marginTop: '6px' }}>{error}</p>
          <button
            className="btn primary"
            style={{ marginTop: '16px' }}
            onClick={() => fetchDemoQuestions(selectedYear)}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && questions.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'white',
            borderRadius: '12px',
            border: '1px dashed var(--line)',
          }}
        >
          <BookOpen size={40} style={{ margin: '0 auto 12px', color: 'var(--teal)' }} />
          <h3>No published questions available yet</h3>
          <p style={{ color: 'var(--muted)', maxWidth: '420px', margin: '8px auto 20px' }}>
            Questions are currently being uploaded and published by the administrator. Please check back shortly!
          </p>
          {onExit && (
            <button className="btn" onClick={onExit}>
              Return
            </button>
          )}
        </div>
      )}

      {/* Main Interactive Demo Quiz */}
      {!loading && !error && questions.length > 0 && !showSummary && (
        <div>
          {/* Progress & Navigator Bar */}
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              border: '1px solid var(--line)',
              padding: '16px 20px',
              marginBottom: '20px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: '700', fontSize: '15px', color: 'var(--ink)' }}>
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    color: 'var(--muted)',
                    background: 'var(--paper)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}
                >
                  {answeredCount} of {totalQuestions} Answered
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#207d6c' }}>
                  Score: {correctCount} Correct
                </span>
                <button
                  onClick={() => setShowSummary(true)}
                  className="btn"
                  style={{ padding: '4px 10px', minHeight: '30px', fontSize: '12px' }}
                >
                  Finish Demo
                </button>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div
              style={{
                height: '6px',
                background: '#eef3f6',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '14px',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${(answeredCount / totalQuestions) * 100}%`,
                  background: 'var(--teal)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>

            {/* Question Quick Jump Badges */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = userAnswers[q.id] !== undefined;
                const isCorrect = isAnswered && userAnswers[q.id] === q.correct;

                let bg = 'white';
                let color = 'var(--ink)';
                let border = '1px solid var(--line)';

                if (isCurrent) {
                  border = '2px solid var(--teal)';
                  bg = '#eef9f7';
                }
                if (isAnswered) {
                  if (isCorrect) {
                    bg = '#eaf8f0';
                    color = '#1e7555';
                    border = '1px solid #7bc69e';
                  } else {
                    bg = '#fdf0ef';
                    color = '#a0383b';
                    border = '1px solid #f1a8aa';
                  }
                }

                return (
                  <button
                    key={q.id || idx}
                    onClick={() => setCurrentIndex(idx)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: bg,
                      color: color,
                      border: border,
                      fontWeight: isCurrent ? '700' : '500',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    title={`Question ${idx + 1}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question Card */}
          {currentQ && (
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                border: '1px solid var(--line)',
                padding: '28px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                position: 'relative',
              }}
            >
              {/* Question Metadata Chips */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  marginBottom: '16px',
                }}
              >
                {currentQ.year && (
                  <span
                    style={{
                      background: '#122f3a',
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '3px 9px',
                      borderRadius: '4px',
                      letterSpacing: '0.4px',
                    }}
                  >
                    YEAR {currentQ.year} MBBS
                  </span>
                )}
                {currentQ.subject && (
                  <span
                    style={{
                      background: '#eef4f6',
                      color: '#2d5261',
                      fontSize: '12px',
                      fontWeight: '600',
                      padding: '3px 9px',
                      borderRadius: '4px',
                    }}
                  >
                    {currentQ.subject}
                  </span>
                )}
                {currentQ.module && (
                  <span
                    style={{
                      background: '#f4f7f9',
                      color: 'var(--muted)',
                      fontSize: '12px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    {currentQ.module}
                  </span>
                )}
                {currentQ.topic && (
                  <span
                    style={{
                      background: '#f4f7f9',
                      color: 'var(--muted)',
                      fontSize: '12px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    {currentQ.topic}
                  </span>
                )}
                {currentQ.difficulty && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      color: '#768d99',
                      fontWeight: '600',
                    }}
                  >
                    {currentQ.difficulty} difficulty
                  </span>
                )}
              </div>

              {/* Question Stem */}
              <div
                style={{
                  fontSize: '19px',
                  lineHeight: '1.6',
                  fontWeight: '600',
                  color: 'var(--ink)',
                  marginBottom: '24px',
                }}
              >
                {currentQ.stem}
              </div>

              {/* Question Image (if any) */}
              {currentQ.image && (
                <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                  <img
                    src={currentQ.image}
                    alt="Clinical Vignette Illustration"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '360px',
                      borderRadius: '8px',
                      border: '1px solid var(--line)',
                      objectFit: 'contain',
                    }}
                  />
                </div>
              )}

              {/* Options */}
              <div style={{ display: 'grid', gap: '10px', marginBottom: '24px' }}>
                {currentQ.options?.map((opt: string, optIdx: number) => {
                  const isSelected = userAnswers[currentQ.id] === optIdx;
                  const isAnswered = userAnswers[currentQ.id] !== undefined;
                  const isCorrect = optIdx === currentQ.correct;

                  let border = '1px solid #d5e1e5';
                  let bg = 'white';
                  let icon = null;

                  if (isAnswered) {
                    if (isCorrect) {
                      border = '2px solid #28835f';
                      bg = '#eefbf4';
                      icon = <CheckCircle2 size={18} color="#28835f" />;
                    } else if (isSelected && !isCorrect) {
                      border = '2px solid #cf5356';
                      bg = '#fdf2f2';
                      icon = <XCircle size={18} color="#cf5356" />;
                    } else {
                      bg = '#fafbfb';
                      border = '1px solid #e2eaed';
                    }
                  } else if (isSelected) {
                    border = '2px solid var(--teal)';
                    bg = '#eef9f7';
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectOption(currentQ.id, optIdx)}
                      disabled={isAnswered}
                      style={{
                        padding: '14px 18px',
                        borderRadius: '9px',
                        border: border,
                        background: bg,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        fontSize: '15px',
                        lineHeight: '1.45',
                        textAlign: 'left',
                        color: 'var(--ink)',
                        cursor: isAnswered ? 'default' : 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.03)' : 'none',
                      }}
                    >
                      <span
                        style={{
                          width: '28px',
                          height: '28px',
                          flexShrink: 0,
                          borderRadius: '6px',
                          display: 'grid',
                          placeItems: 'center',
                          fontWeight: '700',
                          fontSize: '13px',
                          background: isAnswered
                            ? isCorrect
                              ? '#28835f'
                              : isSelected
                              ? '#cf5356'
                              : '#eaeff2'
                            : '#f0f4f6',
                          color: isAnswered && (isCorrect || isSelected) ? 'white' : 'var(--ink)',
                        }}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span style={{ flex: 1 }}>{opt}</span>
                      {icon}
                    </button>
                  );
                })}
              </div>

              {/* Rationale & Explanation (Revealed when answered) */}
              {userAnswers[currentQ.id] !== undefined && (
                <div
                  style={{
                    background: '#f4f9fb',
                    border: '1px solid #c9dfe8',
                    borderRadius: '10px',
                    padding: '20px 22px',
                    marginBottom: '24px',
                    animation: 'fadeIn 0.25s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '10px',
                      color:
                        userAnswers[currentQ.id] === currentQ.correct ? '#1e7555' : '#b2393d',
                      fontWeight: '700',
                      fontSize: '15px',
                    }}
                  >
                    {userAnswers[currentQ.id] === currentQ.correct ? (
                      <>
                        <CheckCircle2 size={18} /> Correct Answer: Option{' '}
                        {String.fromCharCode(65 + currentQ.correct)}
                      </>
                    ) : (
                      <>
                        <XCircle size={18} /> Correct Option is{' '}
                        {String.fromCharCode(65 + currentQ.correct)}
                      </>
                    )}
                  </div>

                  <div style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--ink)' }}>
                    <strong>Clinical Rationale:</strong>
                    <div style={{ marginTop: '6px', whiteSpace: 'pre-wrap' }}>
                      {currentQ.explanation || 'Detailed high-yield clinical explanation.'}
                    </div>
                  </div>

                  {/* Specific option distractor breakdown if available */}
                  {userAnswers[currentQ.id] !== undefined &&
                    currentQ.incorrect &&
                    currentQ.incorrect[userAnswers[currentQ.id]] && (
                      <div
                        style={{
                          marginTop: '12px',
                          padding: '10px 14px',
                          background: 'white',
                          borderRadius: '6px',
                          border: '1px solid #e1e9ee',
                          fontSize: '13px',
                          color: '#49606d',
                        }}
                      >
                        <strong>Why Option {String.fromCharCode(65 + userAnswers[currentQ.id])} is incorrect: </strong>
                        {currentQ.incorrect[userAnswers[currentQ.id]]}
                      </div>
                    )}

                  {currentQ.source && (
                    <div
                      style={{
                        marginTop: '12px',
                        fontSize: '12px',
                        color: 'var(--muted)',
                        borderTop: '1px solid #dbe6ec',
                        paddingTop: '8px',
                      }}
                    >
                      📚 <strong>High-Yield Source:</strong> {currentQ.source}
                    </div>
                  )}
                </div>
              )}

              {/* Navigation Controls */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  borderTop: '1px solid var(--line)',
                  paddingTop: '20px',
                }}
              >
                <button
                  type="button"
                  className="btn"
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                >
                  <ArrowLeft size={16} />
                  Previous
                </button>

                <div style={{ display: 'flex', gap: '10px' }}>
                  {currentIndex < totalQuestions - 1 ? (
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => setCurrentIndex((prev) => prev + 1)}
                    >
                      Next Question
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => setShowSummary(true)}
                    >
                      Complete & View Score
                      <Award size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Upgrade Teaser below Question */}
          <div
            style={{
              marginTop: '20px',
              background: 'linear-gradient(135deg, #122f3a 0%, #173f4e 100%)',
              color: 'white',
              borderRadius: '12px',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    background: '#69d0c4',
                    color: '#122f3a',
                    fontWeight: '800',
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    letterSpacing: '0.5px',
                  }}
                >
                  FULL ACCESS
                </span>
                <strong style={{ fontSize: '15px' }}>
                  Ready to practice all 5,000+ MBBS BCQs?
                </strong>
              </div>
              <p style={{ fontSize: '13px', color: '#b2c8cf', marginTop: '4px' }}>
                Unlock subject filters, timed exam modes, mistake revision, and complete answer keys.
              </p>
            </div>
            {onSignUp && (
              <button
                type="button"
                onClick={onSignUp}
                className="btn"
                style={{
                  background: '#69d0c4',
                  color: '#122f3a',
                  border: 0,
                  fontWeight: '700',
                  fontSize: '13px',
                }}
              >
                {user ? 'View Packages & Subscribe' : 'Register for Full Access'}
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Score Summary & Upgrade Pitch Screen */}
      {!loading && !error && showSummary && (
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            border: '1px solid var(--line)',
            padding: '36px 30px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '580px', margin: '0 auto 32px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: percentage >= 70 ? '#eaf8f0' : '#eff6f9',
                color: percentage >= 70 ? '#1e7555' : 'var(--teal)',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Award size={36} />
            </div>

            <span
              style={{
                background: '#e6f5f1',
                color: '#087c80',
                fontSize: '12px',
                fontWeight: '700',
                padding: '4px 12px',
                borderRadius: '20px',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              DEMO SESSION FINISHED
            </span>

            <h1
              style={{
                fontSize: '44px',
                fontWeight: '800',
                color: 'var(--teal)',
                margin: '12px 0 6px',
                letterSpacing: '-1px',
              }}
            >
              {percentage}%
            </h1>
            <p style={{ fontSize: '16px', color: 'var(--ink)', fontWeight: '600' }}>
              You answered {correctCount} out of {totalQuestions} questions correctly
            </p>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '4px' }}>
              {percentage >= 80
                ? 'Outstanding performance! Your clinical concepts are sharp.'
                : percentage >= 60
                ? 'Solid clinical foundation! A quick review of rationales will sharpen your recall.'
                : 'Good start! Practicing clinical rationales regularly will quickly boost your exam scores.'}
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '12px',
              marginBottom: '36px',
            }}
          >
            <div
              style={{
                background: 'var(--paper)',
                padding: '16px',
                borderRadius: '10px',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block' }}>
                Total Questions
              </span>
              <strong style={{ fontSize: '24px', color: 'var(--ink)' }}>{totalQuestions}</strong>
            </div>
            <div
              style={{
                background: '#eaf8f0',
                padding: '16px',
                borderRadius: '10px',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '12px', color: '#1e7555', display: 'block' }}>Correct</span>
              <strong style={{ fontSize: '24px', color: '#1e7555' }}>{correctCount}</strong>
            </div>
            <div
              style={{
                background: '#fdf0ef',
                padding: '16px',
                borderRadius: '10px',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '12px', color: '#a0383b', display: 'block' }}>Incorrect</span>
              <strong style={{ fontSize: '24px', color: '#a0383b' }}>{incorrectCount}</strong>
            </div>
            <div
              style={{
                background: 'var(--paper)',
                padding: '16px',
                borderRadius: '10px',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block' }}>
                Unanswered
              </span>
              <strong style={{ fontSize: '24px', color: 'var(--ink)' }}>
                {totalQuestions - answeredCount}
              </strong>
            </div>
          </div>

          {/* High-Converting Upgrade Card */}
          <div
            style={{
              background: 'linear-gradient(145deg, #122f3a 0%, #0d222b 100%)',
              color: 'white',
              borderRadius: '14px',
              padding: '32px 28px',
              boxShadow: '0 12px 36px rgba(18, 47, 58, 0.15)',
              marginBottom: '32px',
            }}
          >
            <div style={{ maxWidth: '640px' }}>
              <span
                style={{
                  color: '#69d0c4',
                  fontSize: '12px',
                  fontWeight: '700',
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                }}
              >
                JOIN HUNDREDS OF MEDICAL STUDENTS
              </span>
              <h2 style={{ fontSize: '26px', margin: '8px 0 12px', color: 'white' }}>
                Unlock Complete Access to 5,000+ MBBS BCQs
              </h2>
              <p style={{ color: '#b8ced5', fontSize: '15px', lineHeight: '1.6', marginBottom: '20px' }}>
                You have just sampled 15 questions. The complete MedPrep platform gives you unlimited
                access to all 5,000+ high-yield questions categorized by Year, Subject, and Module.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '12px',
                  marginBottom: '26px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#194959',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#69d0c4',
                    }}
                  >
                    <Check size={13} />
                  </div>
                  <span>5,000+ authentic university BCQs</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#194959',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#69d0c4',
                    }}
                  >
                    <Check size={13} />
                  </div>
                  <span>Subject & module-based practice</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#194959',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#69d0c4',
                    }}
                  >
                    <Check size={13} />
                  </div>
                  <span>Timed examination simulations</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#194959',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#69d0c4',
                    }}
                  >
                    <Check size={13} />
                  </div>
                  <span>Smart mistake revision engine</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {onSignUp && (
                  <button
                    type="button"
                    onClick={onSignUp}
                    className="btn"
                    style={{
                      background: '#69d0c4',
                      color: '#122f3a',
                      border: 0,
                      fontWeight: '700',
                      fontSize: '15px',
                      padding: '12px 24px',
                    }}
                  >
                    <Unlock size={17} />
                    {user ? 'View Packages & Subscribe' : 'Get Full Access Now'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowSummary(false)}
                  className="btn"
                  style={{
                    background: 'transparent',
                    color: 'white',
                    borderColor: '#2b5768',
                    fontSize: '14px',
                  }}
                >
                  Review Demo Questions
                </button>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" onClick={handleRestart} className="btn">
              <RotateCcw size={15} />
              Retake Demo Questions
            </button>

            {onExit && (
              <button type="button" onClick={onExit} className="text-button">
                {user ? 'Return to Workspace' : 'Return to Login'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
