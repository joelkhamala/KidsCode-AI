import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { teacherAPI, curriculumAPI } from '../services/api';
import { ClassInsights } from '../components/ai/LearnerInsights';
import { LearnerCard, LearnerDetail, activityStatus } from '../components/LearnerCard';
import TeacherApprovalQueue from '../components/TeacherApprovalQueue';
import TeacherSettings from '../components/TeacherSettings';

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
  const [addForm, setAddForm] = useState({ className: '', enrollmentCode: '' });
  const [lookup, setLookup] = useState({ loading: false, children: [], error: '' });
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [adding, setAdding] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [filter, setFilter] = useState('all'); // all | attention
  const [classFilter, setClassFilter] = useState('all');
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [studentsRes, dashboardRes, approvalsRes, notesRes] = await Promise.all([
        teacherAPI.getStudents(),
        teacherAPI.getDashboard(),
        teacherAPI.getApprovalRequests('pending').catch(() => ({ data: { requests: [] } })),
        teacherAPI.getNotifications().catch(() => ({ data: { unread: 0 } })),
      ]);
      setStudents(studentsRes.data.children || []);
      setDashboardData(dashboardRes.data.dashboard);
      setPendingApprovals(approvalsRes.data.requests?.length || 0);
      setUnreadCount(notesRes.data.unread || 0);
    } catch (err) {
      console.error('Failed to load teacher dashboard:', err);
      notify(err.response?.data?.error || t('adultUi.loadFailed'), 'error');
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
      .then((res) => setTotalLessons((res.data.curriculum || []).reduce((s, m) => s + m.lessons.length, 0)))
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

  const downloadReport = async () => {
    if (!selected?.progress?.childId) return;
    setDownloadingReport(true);
    try {
      const res = await teacherAPI.downloadStudentReportCsv(selected.progress.childId);
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `student-${selected.progress.childId}-progress.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      notify(err.response?.data?.error || t('adultUi.actionFailed'), 'error');
    } finally {
      setDownloadingReport(false);
    }
  };

  const lookupStudent = async () => {
    const code = addForm.enrollmentCode.trim();
    if (!code) return;
    setLookup({ loading: true, children: [], error: '' });
    setSelectedStudentId('');
    try {
      const res = await teacherAPI.resolveStudent(code);
      const children = res.data.children || [];
      setLookup({ loading: false, children, error: '' });
      const available = children.find((child) => !child.enrolled);
      if (available) setSelectedStudentId(String(available.id));
    } catch (err) {
      setLookup({
        loading: false,
        children: [],
        error: err.response?.data?.error || t('adultUi.actionFailed'),
      });
    }
  };

  const addStudent = async (e) => {
    e.preventDefault();
    if (!selectedStudentId || !addForm.enrollmentCode.trim()) return;
    setAdding(true);
    try {
      const result = await teacherAPI.enrollStudent(
        selectedStudentId, addForm.className.trim() || undefined, addForm.enrollmentCode.trim());
      notify(result.data.reactivated ? t('adultUi.studentReAdded') : t('adultUi.studentAdded'), 'success');
      setAddForm({ className: addForm.className, enrollmentCode: '' });
      setLookup({ loading: false, children: [], error: '' });
      setSelectedStudentId('');
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

  const attention = useMemo(() => students.filter((s) => activityStatus(s.lastActive, s).attention), [students]);
  const classes = useMemo(
    () => [...new Set(students.map((s) => s.className).filter(Boolean))], [students]);
  const shown = useMemo(() => students.filter((s) => {
    const matchesClass = classFilter === 'all' || s.className === classFilter;
    const matchesAttention = filter !== 'attention' || activityStatus(s.lastActive, s).attention;
    return matchesClass && matchesAttention;
  }), [students, filter, classFilter]);

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
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="form-label" htmlFor="class-name">{t('adultUi.className')}</label>
          <input
            id="class-name"
            type="text"
            className="form-input"
            value={addForm.className}
            onChange={(e) => setAddForm({ ...addForm, className: e.target.value })}
            placeholder={t('adultUi.classPlaceholder')}
            list="teacher-classes"
          />
          <datalist id="teacher-classes">
            {classes.map((name) => <option key={name} value={name} />)}
          </datalist>
        </div>
        <div className="md:col-span-2">
          <label className="form-label" htmlFor="enrollment-code">{t('adultUi.consentCode')}</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="enrollment-code"
              type="text"
              required
              autoComplete="off"
              className="form-input font-bold tracking-widest flex-1"
              value={addForm.enrollmentCode}
              onChange={(e) => {
                setAddForm({ ...addForm, enrollmentCode: e.target.value.trim().toLowerCase() });
                setLookup({ loading: false, children: [], error: '' });
                setSelectedStudentId('');
              }}
              placeholder="92.abcdef123456"
            />
            <button
              type="button"
              className="btn-secondary"
              disabled={lookup.loading || !addForm.enrollmentCode.trim()}
              onClick={lookupStudent}
            >
              {lookup.loading ? t('adultUi.findingChild') : t('adultUi.findChild')}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">{t('adultUi.codeLookupHelp')}</p>
          {lookup.error && <p className="text-sm text-red-600 font-semibold mt-2" role="alert">{lookup.error}</p>}
        </div>
        <div className="md:col-span-2">
          <label className="form-label" htmlFor="student-select">{t('adultUi.studentSelect')}</label>
          <select
            id="student-select"
            className="form-input"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            required
            disabled={lookup.children.length === 0}
          >
            <option value="">{t('adultUi.chooseStudent')}</option>
            {lookup.children.map((child) => (
              <option key={child.id} value={child.id} disabled={child.enrolled}>
                {(child.displayName || child.username) + (child.age ? ` (${child.age})` : '')}
                {child.enrolled ? ` — ${t('adultUi.alreadyEnrolled')}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button type="submit" disabled={adding || !selectedStudentId} className="btn-primary justify-center mt-4">
        {adding ? t('kidHome.gettingReady') : t('adultUi.add')}
      </button>
    </form>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title mb-1">{t('adultUi.hello', { name: currentUser?.firstName || t('adultUi.teacher') })} 👋</h1>
          <p className="text-slate-600 font-semibold">{t('adultUi.teacherSubtitle')}</p>
        </div>
        <button type="button" onClick={() => setShowAdd((v) => !v)} className="btn-primary self-start md:self-auto">
          {showAdd ? '✕ ' + t('ui.close') : '➕ ' + t('adultUi.addStudent')}
        </button>
      </header>

      <nav className="tab-bar" aria-label={t('teacher.dashboard')}>
        <button type="button" onClick={() => setActiveTab('class')} className={`tab-btn ${activeTab === 'class' ? 'active' : ''}`}>
          👥 {t('adultUi.myClass')}
        </button>
        <button type="button" onClick={() => setActiveTab('approvals')} className={`tab-btn ${activeTab === 'approvals' ? 'active' : ''}`}>
          ✅ {t('parent.approvals')}{pendingApprovals > 0 ? ` (${pendingApprovals})` : ''}
        </button>
        <button type="button" onClick={() => setActiveTab('insights')} className={`tab-btn ${activeTab === 'insights' ? 'active' : ''}`}>
          🧠 {t('adultUi.classInsights')}
        </button>
        <button type="button" onClick={() => setActiveTab('settings')} className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}>
          ⚙️ {t('adultUi.settings')}{unreadCount > 0 ? ` (${unreadCount})` : ''}
        </button>
      </nav>

      {activeTab === 'approvals' ? (
        <TeacherApprovalQueue onChange={loadData} />
      ) : activeTab === 'insights' ? (
        <ClassInsights />
      ) : activeTab === 'settings' ? (
        <TeacherSettings onUnreadChange={setUnreadCount} />
      ) : (
        <>
          {showAdd && addPanel}

          {dashboardData && (
            <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-6" aria-label={t('teacher.overview')}>
              <div className="stat-card"><div className="stat-value text-indigo-600">{dashboardData.childCount}</div><div className="text-slate-600 text-xs font-bold mt-1">{t('teacher.studentCount')}</div></div>
              <div className="stat-card"><div className="stat-value text-amber-500">{dashboardData.totalFamilyXP}</div><div className="text-slate-600 text-xs font-bold mt-1">{t('teacher.classXP')}</div></div>
              <div className="stat-card"><div className="stat-value text-green-600">{dashboardData.children.reduce((s, c) => s + c.completedLessons, 0)}</div><div className="text-slate-600 text-xs font-bold mt-1">{t('teacher.totalLessons')}</div></div>
              <div className="stat-card"><div className="stat-value text-purple-600">
                {dashboardData.children.length
                  ? Math.round(dashboardData.children.reduce((s, c) => s + (c.avgScore || 0), 0) / dashboardData.children.length)
                  : 0}%
              </div><div className="text-slate-600 text-xs font-bold mt-1">{t('adultUi.avgScore')}</div></div>
              <div className="stat-card"><div className="stat-value text-orange-500">{attention.length}</div><div className="text-slate-600 text-xs font-bold mt-1">{t('adultUi.needAttention')}</div></div>
            </section>
          )}

          {selected && (
            <LearnerDetail
              progress={selected.progress}
              name={selected.name}
              onClose={() => setSelected(null)}
              onDownloadReport={downloadReport}
              downloadingReport={downloadingReport}
            />
          )}

          <section aria-labelledby="students-title" className="mb-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 id="students-title" className="font-display text-2xl text-slate-800">{t('teacher.students')}</h2>
              <div className="flex flex-wrap gap-2" role="group" aria-label={t('adultUi.filter')}>
                {classes.length > 1 && (
                  <select
                    className="form-input text-sm py-2"
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    aria-label={t('adultUi.classFilter')}
                  >
                    <option value="all">{t('adultUi.allClasses')}</option>
                    {classes.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                )}
                <button type="button" onClick={() => setFilter('all')} className={`tab-btn text-sm ${filter === 'all' ? 'active' : ''}`}>
                  {t('adultUi.all')} ({students.length})
                </button>
                <button type="button" onClick={() => setFilter('attention')} className={`tab-btn text-sm ${filter === 'attention' ? 'active' : ''}`}>
                  ⚠️ {t('adultUi.needAttention')} ({attention.length})
                </button>
              </div>
            </div>
            {students.length === 0 ? (
              <section className="card p-6 md:p-10 text-center">
                <div className="text-6xl mb-3" aria-hidden="true">🏫</div>
                <h3 className="font-display text-2xl text-slate-800 mb-2">{t('adultUi.teacherStartTitle')}</h3>
                <p className="text-slate-600 font-semibold max-w-xl mx-auto">{t('adultUi.teacherStartText')}</p>
              </section>
            ) : shown.length === 0 ? (
              <p className="card p-6 text-center text-slate-600 font-semibold">🎉 {t('adultUi.allActive')}</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {shown.map((student) => (
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
