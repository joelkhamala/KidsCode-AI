import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { parentAPI, approvalAPI, curriculumAPI } from '../services/api';
import ChildAccountManager from '../components/ChildAccountManager';
import ApprovalQueue from '../components/ApprovalQueue';
import ParentFriendsPanel from '../components/ParentFriendsPanel';
import { LearnerCard, LearnerDetail, activityStatus } from '../components/LearnerCard';

const ParentDashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentUser, accountType, switchToChild } = useAuth();
  const { notify, confirm } = useToast();
  const [children, setChildren] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateChild, setShowCreateChild] = useState(false);
  const [selected, setSelected] = useState(null); // { progress, name }
  const [activeTab, setActiveTab] = useState('overview');
  const [pendingCount, setPendingCount] = useState(0);
  const [totalLessons, setTotalLessons] = useState(0);
  const [switching, setSwitching] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [childrenRes, dashboardRes] = await Promise.all([
        parentAPI.getChildren(),
        parentAPI.getDashboard(),
      ]);
      setChildren(childrenRes.data.children || []);
      setDashboardData(dashboardRes.data.dashboard);
    } catch (err) {
      console.error('Failed to load parent dashboard:', err);
      notify(t('adultUi.loadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  }, [notify, t]);

  const loadPending = useCallback(() => {
    approvalAPI.getParentRequests()
      .then(res => setPendingCount((res.data.requests || []).filter(r => r.status === 'pending').length))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (accountType !== 'parent') {
      navigate('/');
      return;
    }
    loadData();
    loadPending();
    curriculumAPI.getCurriculum()
      .then(res => setTotalLessons((res.data.curriculum || []).reduce((s, m) => s + m.lessons.length, 0)))
      .catch(() => {});
  }, [accountType, navigate, loadData, loadPending]);

  const handleChildCreated = () => {
    loadData();
    notify(t('adultUi.childAdded'), 'success');
  };

  const handleDeleteChild = async (child) => {
    const ok = await confirm({
      title: t('adultUi.deleteTitle', { name: child.displayName || child.username }),
      message: t('adultUi.deleteText'),
      confirmLabel: t('adultUi.deleteYes'),
      danger: true,
    });
    if (!ok) return;
    try {
      await parentAPI.deleteChild(child.id);
      if (selected?.progress?.childId === child.id) setSelected(null);
      notify(t('adultUi.deleted'), 'success');
      loadData();
    } catch (err) {
      notify(err.response?.data?.error || t('adultUi.actionFailed'), 'error');
    }
  };

  const handleStartLearning = async (child) => {
    const name = child.displayName || child.username;
    const ok = await confirm({
      title: t('adultUi.switchTitle', { name }),
      message: t('adultUi.switchText', { name }),
      confirmLabel: t('adultUi.switchYes'),
      icon: '🚀',
    });
    if (!ok) return;
    setSwitching(true);
    const result = await switchToChild(child.id);
    setSwitching(false);
    if (result.success) navigate('/');
    else notify(result.error || t('adultUi.actionFailed'), 'error');
  };

  const viewChildProgress = async (child) => {
    try {
      const res = await parentAPI.getChildProgress(child.id);
      setActiveTab('overview');
      setSelected({ progress: res.data.progress, name: child.displayName || child.username });
      setTimeout(() => {
        document.querySelector('[data-progress-section]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    } catch (err) {
      const msg = err.response?.status === 403 ? t('adultUi.notLinked') : (err.response?.data?.error || t('adultUi.actionFailed'));
      notify(msg, 'error');
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4 animate-float" aria-hidden="true">👨‍👩‍👧</div>
        <h2 className="font-display text-2xl text-slate-800">{t('teacher.loading')}</h2>
      </div>
    );
  }

  const notStarted = children.filter(c => activityStatus(c.lastActive, c).key === 'never');
  const inactive = children.filter(c => activityStatus(c.lastActive, c).key === 'away');
  const nameList = (list) => list.map(c => c.displayName || c.username).join(', ');

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title mb-1">{t('adultUi.hello', { name: currentUser?.firstName || t('adultUi.parent') })} 👋</h1>
          <p className="text-slate-600 font-semibold">{t('adultUi.parentSubtitle')}</p>
        </div>
        {children.length > 0 && (
          <button type="button" onClick={() => setShowCreateChild(true)} className="btn-primary self-start md:self-auto">
            ➕ {t('parent.addChild')}
          </button>
        )}
      </header>

      {/* Tabs */}
      <nav className="tab-bar" aria-label={t('parent.dashboard')}>
        <button type="button" onClick={() => setActiveTab('overview')} className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}>
          👨‍👩‍👧 {t('adultUi.myChildren')}
        </button>
        <button type="button" onClick={() => setActiveTab('approvals')} className={`tab-btn ${activeTab === 'approvals' ? 'active' : ''}`}>
          📬 {t('parent.approvals')}
          {pendingCount > 0 && <span className="tab-count">{pendingCount}</span>}
        </button>
      </nav>

      {activeTab === 'approvals' ? (
        <ApprovalQueue onChange={loadPending} />
      ) : children.length === 0 ? (
        /* First-time parent: explain the 3 steps */
        <section className="card p-6 md:p-10 text-center" aria-labelledby="getting-started">
          <div className="text-6xl mb-3" aria-hidden="true">🌱</div>
          <h2 id="getting-started" className="font-display text-3xl text-slate-800 mb-2">{t('adultUi.parentStartTitle')}</h2>
          <p className="text-slate-600 font-semibold mb-8 max-w-xl mx-auto">{t('adultUi.parentStartText')}</p>
          <ol className="grid sm:grid-cols-3 gap-4 mb-8 text-left">
            {[
              { icon: '➕', title: t('adultUi.pStep1'), text: t('adultUi.pStep1Text'), color: 'kid-step-blue' },
              { icon: '▶️', title: t('adultUi.pStep2'), text: t('adultUi.pStep2Text'), color: 'kid-step-green' },
              { icon: '📊', title: t('adultUi.pStep3'), text: t('adultUi.pStep3Text'), color: 'kid-step-yellow' },
            ].map((s, i) => (
              <li key={s.title} className={`kid-step ${s.color}`}>
                <div className="kid-step-num">{i + 1}</div>
                <div className="text-3xl mb-1" aria-hidden="true">{s.icon}</div>
                <div className="font-extrabold text-slate-800">{s.title}</div>
                <p className="text-sm text-slate-600">{s.text}</p>
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => setShowCreateChild(true)} className="kid-go-btn">
            ➕ {t('parent.createFirstBtn')}
          </button>
        </section>
      ) : (
        <>
          {/* Family summary */}
          {dashboardData && (
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6" aria-label={t('parent.overview')}>
              <div className="stat-card"><div className="stat-value text-indigo-600">{dashboardData.childCount}</div><div className="text-slate-600 text-xs font-bold mt-1">{t('parent.children')}</div></div>
              <div className="stat-card"><div className="stat-value text-amber-500">{dashboardData.totalFamilyXP}</div><div className="text-slate-600 text-xs font-bold mt-1">{t('parent.familyXP')}</div></div>
              <div className="stat-card"><div className="stat-value text-green-600">{dashboardData.children.reduce((s, c) => s + c.completedLessons, 0)}</div><div className="text-slate-600 text-xs font-bold mt-1">{t('parent.totalLessons')}</div></div>
              <div className="stat-card"><div className="stat-value text-orange-500">{Math.max(...dashboardData.children.map(c => c.streak), 0)}</div><div className="text-slate-600 text-xs font-bold mt-1">{t('parent.bestStreak')}</div></div>
            </section>
          )}

          {(pendingCount > 0 || notStarted.length > 0 || inactive.length > 0) && (
            <section className="space-y-2 mb-6" aria-label={t('adultUi.todo')}>
              {pendingCount > 0 && (
                <button type="button" onClick={() => setActiveTab('approvals')} className="w-full text-left toast toast-warning" style={{ animation: 'none' }}>
                  <span className="text-2xl" aria-hidden="true">📬</span>
                  <span className="flex-1">{t('adultUi.pendingBanner', { count: pendingCount })}</span>
                  <span className="font-extrabold text-amber-700">{t('adultUi.review')} →</span>
                </button>
              )}
              {notStarted.length > 0 && (
                <div className="toast toast-info" style={{ animation: 'none' }}>
                  <span className="text-2xl" aria-hidden="true">🚀</span>
                  <span className="flex-1">{t('adultUi.notStartedBanner', { names: nameList(notStarted) })}</span>
                </div>
              )}
              {inactive.length > 0 && (
                <div className="toast toast-info" style={{ animation: 'none' }}>
                  <span className="text-2xl" aria-hidden="true">💡</span>
                  <span className="flex-1">{t('adultUi.nudgeBanner', { names: nameList(inactive) })}</span>
                </div>
              )}
            </section>
          )}

          {selected && (
            <LearnerDetail progress={selected.progress} name={selected.name} onClose={() => setSelected(null)} />
          )}

          <section aria-labelledby="kids-title" className="mb-8">
            <h2 id="kids-title" className="font-display text-2xl text-slate-800 mb-4">{t('parent.yourChildren')}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {children.map(child => (
                <LearnerCard
                  key={child.id}
                  learner={child}
                  totalLessons={totalLessons}
                  busy={switching}
                  onStartLearning={() => handleStartLearning(child)}
                  onViewProgress={() => viewChildProgress(child)}
                  onRemove={() => handleDeleteChild(child)}
                />
              ))}
            </div>
          </section>

          {/* Who each child is friends with, plus switches for friends and sharing. */}
          <ParentFriendsPanel children={children} />
        </>
      )}

      {showCreateChild && (
        <ChildAccountManager onChildCreated={handleChildCreated} onClose={() => setShowCreateChild(false)} />
      )}
    </div>
  );
};

export default ParentDashboard;
