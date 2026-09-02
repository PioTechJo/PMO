
import React, { useState } from 'react';
import { User, Project, Issue, Language } from '../types';
import { inviteUser } from '../services/api';

interface TeamProps {
  allUsers: User[];
  allProjects: Project[];
  allIssues: Issue[];
  language: Language;
  currentUser?: User;
  onUserInvited?: () => void;
}

const translations = {
  ar: {
    title: "الفريق",
    subtitle: "كل المستخدمين بالنظام، مبوّبين حسب النوع.",
    inviteUser: "دعوة مستخدم جديد",
    inviteTitle: "دعوة مستخدم جديد",
    name: "الاسم الكامل",
    email: "البريد الإلكتروني",
    type: "نوع المستخدم",
    department: "القسم (اختياري)",
    typePM: "مدير مشروع (PM)",
    typePS: "خدمات احترافية (PS)",
    typeStaff: "موظف (Staff)",
    typeClient: "عميل (Client)",
    typeManager: "Manager (صلاحية كاملة على كل النظام)",
    typeTasksAdmin: "Tasks Admin (كل المهام بس، بدون مشاريع أو مدفوعات)",
    typeTopManagement: "Top Management (لوحة المتابعة والنظرة العامة والتقارير فقط)",
    cancel: "إلغاء",
    send: "إرسال الدعوة",
    sending: "جارٍ الإرسال...",
    success: "تم إنشاء الحساب وإرسال كلمة المرور المؤقتة إلى",
    close: "إغلاق",
    managedProjects: "مشاريع مدارة",
    assignedTasks: "مهام مسندة",
    noUsers: "لا يوجد مستخدمون بهذا النوع",
    colName: "الاسم",
    colDepartment: "القسم",
    colMetric: "المؤشر",
    groupPM: "مديرو المشاريع",
    groupPS: "الخدمات الاحترافية",
    groupStaff: "الموظفون",
    groupClient: "العملاء",
    groupTopManagement: "الإدارة العليا",
    groupOther: "أخرى",
  },
  en: {
    title: "Team",
    subtitle: "Every user in the system, grouped by type.",
    inviteUser: "Invite New User",
    inviteTitle: "Invite a New User",
    name: "Full Name",
    email: "Email Address",
    type: "User Type",
    department: "Department (optional)",
    typePM: "Project Manager (PM)",
    typePS: "Professional Services (PS)",
    typeStaff: "Staff",
    typeClient: "Client",
    typeManager: "Manager (full access to everything)",
    typeTasksAdmin: "Tasks Admin (all tasks only, no projects or payments)",
    typeTopManagement: "Top Management (Dashboard, Overview & Reports only)",
    cancel: "Cancel",
    send: "Send Invite",
    sending: "Sending...",
    success: "Account created and temporary password emailed to",
    close: "Close",
    managedProjects: "Managed Projects",
    assignedTasks: "Assigned Tasks",
    noUsers: "No users of this type yet",
    colName: "Name",
    colDepartment: "Department",
    colMetric: "Metric",
    groupPM: "Project Managers",
    groupPS: "Professional Services",
    groupStaff: "Staff",
    groupClient: "Clients",
    groupTopManagement: "Top Management",
    groupOther: "Other",
  }
};

const TYPE_GROUPS: { key: string; typeValue: string }[] = [
  { key: 'groupPM', typeValue: 'PM' },
  { key: 'groupPS', typeValue: 'PS' },
  { key: 'groupStaff', typeValue: 'Staff' },
  { key: 'groupClient', typeValue: 'Client' },
  { key: 'groupTopManagement', typeValue: 'TopManagement' },
];

const InviteUserModal: React.FC<{ language: Language; onClose: () => void; onInvited: () => void }> = ({ language, onClose, onInvited }) => {
  const t = translations[language];
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState('PM');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successEmail, setSuccessEmail] = useState('');

  const inputClasses = "w-full p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 dark:text-white transition-all";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    setLoading(true);
    setError('');
    try {
      await inviteUser({ email, name, type, department: department || null });
      setSuccessEmail(email);
      onInvited();
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-8" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {successEmail ? (
          <div className="text-center space-y-4">
            <p className="text-emerald-600 dark:text-emerald-400 font-bold">{t.success} {successEmail}</p>
            <button onClick={onClose} className="w-full px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:opacity-90 transition-opacity">
              {t.close}
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-black text-slate-800 dark:text-white mb-6">{t.inviteTitle}</h2>
            {error && <p className="mb-4 text-red-600 dark:text-red-400 text-sm text-center bg-red-100 dark:bg-red-500/20 p-3 rounded-lg">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.name}</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClasses} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.email}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClasses} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.type}</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className={inputClasses}>
                  <option value="PM">{t.typePM}</option>
                  <option value="PS">{t.typePS}</option>
                  <option value="Staff">{t.typeStaff}</option>
                  <option value="Client">{t.typeClient}</option>
                  <option value="Manager">{t.typeManager}</option>
                  <option value="TasksAdmin">{t.typeTasksAdmin}</option>
                  <option value="TopManagement">{t.typeTopManagement}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.department}</label>
                <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClasses} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="flex-1 px-5 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:opacity-90 transition-opacity">
                  {t.cancel}
                </button>
                <button type="submit" disabled={loading} className="flex-1 px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                  {loading ? t.sending : t.send}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

const UserListSection: React.FC<{
  title: string;
  users: User[];
  metricLabel: string;
  getMetric: (user: User) => number;
  t: typeof translations['en'];
}> = ({ title, users, metricLabel, getMetric, t }) => (
  <div className="space-y-3">
    <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">
      {title} <span className="opacity-50">({users.length})</span>
    </h2>
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
      {users.length === 0 ? (
        <div className="py-8 text-center opacity-30 italic text-sm">{t.noUsers}</div>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.colName}</th>
              <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.colDepartment}</th>
              <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{metricLabel}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}&background=8b5cf6&color=f5f3ff`}
                      alt={user.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="text-sm font-bold text-slate-800 dark:text-white">{user.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400">{user.department || '—'}</td>
                <td className="px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 text-right">{getMetric(user)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
);

const Team: React.FC<TeamProps> = ({ allUsers, allProjects, allIssues, language, currentUser, onUserInvited }) => {
  const t = translations[language];
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const isManager = currentUser?.type === 'Manager';

  const knownTypes = new Set(TYPE_GROUPS.map(g => g.typeValue));
  const otherUsers = allUsers.filter(u => !knownTypes.has(u.type || ''));

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t.subtitle}</p>
        </div>
        {isManager && (
          <button
            onClick={() => setIsInviteOpen(true)}
            className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-violet-500/20"
          >
            + {t.inviteUser}
          </button>
        )}
      </div>

      {TYPE_GROUPS.filter(group => group.typeValue !== 'PM' || isManager).map(group => {
        const groupUsers = allUsers.filter(u => u.type === group.typeValue);
        const isPM = group.typeValue === 'PM';
        return (
          <UserListSection
            key={group.typeValue}
            title={t[group.key as keyof typeof t] as string}
            users={groupUsers}
            metricLabel={isPM ? t.managedProjects : t.assignedTasks}
            getMetric={(user) => isPM
              ? allProjects.filter(p => p.projectManagerId === user.id).length
              : allIssues.filter(i => i.assigneeId === user.id).length}
            t={t}
          />
        );
      })}

      {otherUsers.length > 0 && (
        <UserListSection
          title={t.groupOther}
          users={otherUsers}
          metricLabel={t.assignedTasks}
          getMetric={(user) => allIssues.filter(i => i.assigneeId === user.id).length}
          t={t}
        />
      )}

      {isInviteOpen && (
        <InviteUserModal
          language={language}
          onClose={() => setIsInviteOpen(false)}
          onInvited={() => onUserInvited?.()}
        />
      )}
    </div>
  );
};

export default Team;
