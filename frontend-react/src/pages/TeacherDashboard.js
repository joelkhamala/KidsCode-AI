import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { teacherAPI, curriculumAPI } from '../services/api';
import { ClassInsights } from '../components/ai/LearnerInsights';
import { LearnerCard, LearnerDetail, activityStatus } from '../components/LearnerCard';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentUser, accountType } = useAuth();
  const { notify, confirm } = useToast();
  const [students, setStudents] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('class');
  const [selected, setSelected] = useState(null); // { progress, name }
  const [totalLessons, setTotalLessons] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ email: '', className: '' });
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState('all'); // all | attention

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [studentsRes, dashboardRes] = await Promise.all([
        teacherAPI.getStudents(),
        teacherAPI.getDashboard(),
      ]);
      setStudents(studentsRes.data.children || []);
      setDashboardData(dashboardRes.data.dashboard);
    } catch (err) {
      console.error('Failed to load teacher dashboard:', err);
      notify(t('adultUi.loadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  }, [notify, t]);

  useEffect(() => {
    if (accountType !== 'teacher') {
      navigate('/');
      return;
    }
    loadData();
    curriculumAPI.getCurriculum()
      .then(res => setTotalLessons((res.data.curriculum || []).reduce((s, m) => s + m.lessons.length, 0)))
      .catch(() => {});
  }, [accountType, navigate, loadData]);

  const viewStudentProgress = async (student) => {
    try {
      const res = await teacherAPI.getStudentProgress(student.id);
      setActiveTab('class');
      setSelected({ progress: res.data.progress, name: student.displayName || student.username });
      setTimeout(() => {
        document.querySelector('[data-progress-section]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    } catch (err) {
      notify(err.response?.data?.error || t('adultUi.actionFailed'), 'error');
    }
  };

  const addStudent = async (e) => {
    e.preventDefault();
    if (!addForm.email.trim()) return;
    setAdding(true);
    try {
      await teacherAPI.enrollStudent(addForm.email.trim(), addForm.className.trim() || undefined);
      notify(t('adultUi.studentAdded'), 'success');
      setAddForm({ email: '', className: addForm.className });
      setShowAdd(false);
      loadData();
    } catch (err) {
      notify(err.response?.data?.error || t('adultUi.actionFailed'), 'error');
    } finally {
      setAdding(false);
    }
  };

  const removeStudent = async (student) => {
    const name = student.displayName || student.username;
    const ok = await confirm({
      title: t('adultUi.removeStudentTitle', { name }),
      message: t('adultUi.removeStudentText'),
      confirmLabel: t('adultUi.removeStudentYes'),
      danger: true,
    });
    if (!ok) return;
    try {
      await teacherAPI.removeStudent(student.id);
      if (selected?.progress?.childId === student.id) setSelected(null);
      notify(t('adultUi.studentRemoved'), 'success');
      loadData();
    } catch (err) {
      notify(err.response?.data?.error || t('adultUi.actionFailed'), 'error');
    }
  };

  const attention = useMemo(() => students.filter(s => activityStatus(s.lastActive, s).attention), [students]);
  const shown = filter === 'attention' ? attention : students;

  if (loading && !dashboardData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4 animate-float" aria-hidden="true">👩‍🏫</div>
        <h2 className="font-display text-2xl text-slate-800">{t('teacher.loading')}</h2>
      </div>
    );
  }

  const addPanel = (
    <form onSubmit={addStudent} className="card p-5 mb-6" aria-labelledby="add-title">
      <h2 id="add-title" className="font-display text-xl text-slate-800 mb-1">➕ {t('adultUi.addStudent')}</h2>
      <p className="text-sm text-slate-600 mb-4">{t('adultUi.addStudentHelp')}</p>
      <div className="grid sm:grid-cols-[2fr_1fr_auto] gap-3 items-end">
        <div>
          <label className="form-label" htmlFor="student-email">{t('adultUi.studentEmail')}</label>
          <input
            id="student-email"
            type="email"
            required
            className="form-input"
            value={addForm.email}
            onChange={e => setAddForm({ ...addForm, email: e.target.value })}
            placeholder="student@example.com"
          />
        </div>
        <div>
          <label className="form-label" htmlFor="class-name">{t('adultUi.className')}</label>
          <input
            id="class-name"
            type="text"
            className="form-input"
            value={addForm.className}
            onChange={e => setAddForm({ ...addForm, className: e.target.value })}
            placeholder={t('adultUi.classPlaceholder')}
          />
        </div>
        <button type="submit" disabled={adding} className="btn-primary justify-center">
          {adding ? t('kidHome.gettingReady') : t('adultUi.add')}
        </button>
      </div>
    </form>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title mb-1">{t('adultUi.hello', { name: currentUser?.firstName || t('adultUi.teacher') })} 👋</h1>
          <p className="text-slate-600 font-semibold">{t('adultUi.teacherSubtitle')}</p>
        </div>
        {students.length > 0 && (
          <button type="button" onClick={() => setShowAdd(v => !v)} className="btn-primary self-start md:self-auto">
            {showAdd ? '✕ ' + t('ui.close') : '➕ ' + t('adultUi.addStudent')}
          </button>
        )}
      </header>

      <nav className="tab-bar" aria-label={t('teacher.dashboard')}>
        <button type="button" onClick={() => setActiveTab('class')} className={`tab-btn ${activeTab === 'class' ? 'active' : ''}`}>
          👥 {t('adultUi.myClass')}
        </button>
        <button type="button" onClick={() => setActiveTab('insights')} className={`tab-btn ${activeTab === 'insights' ? 'active' : ''}`}>
          🧠 {t('adultUi.classInsights')}
        </button>
      </nav>

      {activeTab === 'insights' ? (
        <ClassInsights />
      ) : students.length === 0 ? (
        <>
          <section className="card p-6 md:p-10 text-center mb-6">
            <div className="text-6xl mb-3" aria-hidden="true">🏫</div>
            <h2 className="font-display text-3xl text-slate-800 mb-2">{t('adultUi.teacherStartTitle')}</h2>
            <p className="text-slate-600 font-semibold max-w-xl mx-auto">{t('adultUi.teacherStartText')}</p>
          </section>
          {addPanel}
        </>
      ) : (
        <>
          {showAdd && addPanel}

          {dashboardData && (
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6" aria-label={t('teacher.overview')}>
              <div className="stat-card"><div className="stat-value text-indigo-600">{dashboardData.childCount}</div><div className="text-slate-600 text-xs font-bold mt-1">{t('teacher.studentCount')}</div></div>
              <div className="stat-card"><div className="stat-value text-amber-500">{dashboardData.totalFamilyXP}</div><div className="text-slate-600 text-xs font-bold mt-1">{t('teacher.classXP')}</div></div>
              <div className="stat-card"><div className="stat-value text-green-600">{dashboardData.children.reduce((s, c) => s + c.completedLessons, 0)}</div><div className="text-slate-600 text-xs font-bold mt-1">{t('teacher.totalLessons')}</div></div>
              <div className="stat-card"><div className="stat-value text-orange-500">{attention.length}</div><div className="text-slate-600 text-xs font-bold mt-1">{t('adultUi.needAttention')}</div></div>
            </section>
          )}

          {selected && (
            <LearnerDetail progress={selected.progress} name={selected.name} onClose={() => setSelected(null)} />
          )}

          <section aria-labelledby="students-title" className="mb-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 id="students-title" className="font-display text-2xl text-slate-800">{t('teacher.students')}</h2>
              <div className="flex gap-2" role="group" aria-label={t('adultUi.filter')}>
                <button type="button" onClick={() => setFilter('all')} className={`tab-btn text-sm ${filter === 'all' ? 'active' : ''}`}>
                  {t('adultUi.all')} ({students.length})
                </button>
                <button type="button" onClick={() => setFilter('attention')} className={`tab-btn text-sm ${filter === 'attention' ? 'active' : ''}`}>
                  ⚠️ {t('adultUi.needAttention')} ({attention.length})
                </button>
              </div>
            </div>
            {shown.length === 0 ? (
              <p className="card p-6 text-center text-slate-600 font-semibold">🎉 {t('adultUi.allActive')}</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {shown.map(student => (
                  <LearnerCard
                    key={student.id}
                    learner={student}
                    totalLessons={totalLessons}
                    fallbackIcon="🧑‍🎓"
                    onViewProgress={() => viewStudentProgress(student)}
                    onRemove={() => removeStudent(student)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default TeacherDashboard;
