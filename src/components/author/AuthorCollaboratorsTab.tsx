import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Trash2,
  Edit,
  Mail,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Crown,
} from 'lucide-react';
import { useAuth, AUTHOR_EMAILS } from '../../lib/authContext';
import { CollaboratorItem } from '../../types';

interface AuthorCollaboratorsTabProps {
  onFeedback: (type: 'success' | 'error', text: string) => void;
}

const ROLE_PRESETS: Record<CollaboratorItem['role'], string> = {
  admin: 'Quản trị viên',
  moderator: 'Kiểm duyệt viên',
  collaborator: 'Cộng tác viên',
  author: 'Quản trị viên',
  editor: 'Kiểm duyệt viên',
};

export const AuthorCollaboratorsTab: React.FC<AuthorCollaboratorsTabProps> = ({
  onFeedback,
}) => {
  const {
    user,
    collaboratorsList,
    addCollaboratorByEmail,
    removeCollaborator,
    updateCollaboratorRoleByAdmin,
  } = useAuth();

  const [newEmail, setNewEmail] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<CollaboratorItem['role']>('collaborator');
  const [newRoleTitle, setNewRoleTitle] = useState('Cộng tác viên');
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCollabId, setEditingCollabId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<CollaboratorItem['role']>('collaborator');
  const [editRoleTitle, setEditRoleTitle] = useState('');
  const [collabToDelete, setCollabToDelete] = useState<CollaboratorItem | null>(null);

  const handleRoleChange = (role: CollaboratorItem['role']) => {
    setNewRole(role);
    setNewRoleTitle(ROLE_PRESETS[role] || 'Cộng tác viên');
  };

  const handleStartEdit = (collab: CollaboratorItem) => {
    setEditingCollabId(collab.id);
    setEditRole(collab.role);
    setEditRoleTitle(collab.roleTitle || ROLE_PRESETS[collab.role] || 'Cộng tác viên');
  };

  // Handle Add Collaborator
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newEmail.toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      onFeedback('error', 'Vui lòng nhập địa chỉ Gmail hợp lệ.');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalRoleTitle = newRoleTitle.trim() || ROLE_PRESETS[newRole] || 'Cộng tác viên';
      await addCollaboratorByEmail(
        cleanEmail,
        newDisplayName.trim(),
        newRole,
        finalRoleTitle,
        newNote.trim()
      );
      onFeedback(
        'success',
        `Đã thêm thành công tài khoản "${cleanEmail}" với danh hiệu "${finalRoleTitle}"!`
      );
      setNewEmail('');
      setNewDisplayName('');
      setNewRoleTitle(ROLE_PRESETS['collaborator']);
      setNewRole('collaborator');
      setNewNote('');
    } catch (err) {
      console.error('Add collaborator error:', err);
      onFeedback('error', 'Không thể thêm cộng sự. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Role Update
  const handleUpdateRole = async (collabId: string) => {
    try {
      const finalTitle = editRoleTitle.trim() || ROLE_PRESETS[editRole] || 'Cộng tác viên';
      await updateCollaboratorRoleByAdmin(collabId, editRole, finalTitle);
      onFeedback('success', `Đã cập nhật danh hiệu "${finalTitle}" cho cộng sự thành công!`);
      setEditingCollabId(null);
    } catch {
      onFeedback('error', 'Không thể cập nhật vai trò.');
    }
  };

  // Handle Delete Collaborator
  const handleDelete = async (collabId: string) => {
    try {
      await removeCollaborator(collabId);
      onFeedback('success', 'Đã thu hồi quyền quản trị của tài khoản.');
      setCollabToDelete(null);
    } catch {
      onFeedback('error', 'Không thể thu hồi quyền.');
    }
  };

  return (
    <div id="author-collaborators-tab" className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Top Banner Guide */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-pink-50 via-rose-50/50 to-amber-50/60 dark:from-stone-850 dark:via-stone-900 dark:to-stone-850 border border-pink-200/90 dark:border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-pink-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-base sm:text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
              <span>Quản lý Quản trị viên, Kiểm duyệt viên & Cộng tác viên</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 font-sans font-semibold">
                Phân quyền & Danh hiệu linh hoạt
              </span>
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
              Hệ thống hỗ trợ 3 nhóm chức danh chính: <strong>Quản trị viên</strong>, <strong>Kiểm duyệt viên</strong> và <strong>Cộng tác viên</strong>. Bạn và các cộng sự có thể tự do điều chỉnh danh hiệu hiển thị (VD: <em>Dịch giả chính, Trưởng ban biên tập, Quản trị viên</em>) cho từng thành viên.
            </p>
          </div>
        </div>
      </div>

      {/* Form: Add New Collaborator */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 shadow-xs">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-stone-100 dark:border-stone-800">
          <UserPlus className="w-4 h-4 text-pink-500" />
          <h4 className="font-serif text-sm sm:text-base font-bold text-stone-800 dark:text-stone-100">
            Thêm tài khoản Gmail mới & Trao danh hiệu
          </h4>
        </div>

        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Gmail Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="collab-email-input"
                className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider"
              >
                Địa chỉ Gmail <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="email"
                  id="collab-email-input"
                  required
                  placeholder="vidu: congtacvien01@gmail.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-pink-400"
                />
              </div>
            </div>

            {/* Display Name Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="collab-name-input"
                className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider"
              >
                Tên hiển thị / Biệt danh
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="text"
                  id="collab-name-input"
                  placeholder="VD: Mai Anh, Linh Nguyễn, Tiểu Vi..."
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-pink-400"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Role Select */}
            <div className="space-y-1.5">
              <label
                htmlFor="collab-role-select"
                className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider"
              >
                Nhóm chức vị <span className="text-rose-500">*</span>
              </label>
              <select
                id="collab-role-select"
                value={newRole}
                onChange={(e) => handleRoleChange(e.target.value as CollaboratorItem['role'])}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-pink-400 font-medium"
              >
                <option value="admin">👑 Quản trị viên (Toàn quyền quản trị & phân quyền)</option>
                <option value="moderator">🛡️ Kiểm duyệt viên (Duyệt thư, soát lỗi, kiểm duyệt)</option>
                <option value="collaborator">🌸 Cộng tác viên (Đăng & hỗ trợ biên tập nội dung)</option>
              </select>
            </div>

            {/* Custom Role Title Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="collab-role-title-input"
                className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider"
              >
                Danh hiệu hiển thị (Tùy chỉnh) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="collab-role-title-input"
                required
                placeholder="VD: Quản trị viên, Kiểm duyệt viên, Cộng tác viên..."
                value={newRoleTitle}
                onChange={(e) => setNewRoleTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-pink-400 font-medium"
              />
            </div>

            {/* Note / Message */}
            <div className="space-y-1.5">
              <label
                htmlFor="collab-note-input"
                className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider"
              >
                Ghi chú nội bộ
              </label>
              <input
                type="text"
                id="collab-note-input"
                placeholder="VD: Phụ trách duyệt hòm thư, soát chương..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-pink-400"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang thêm...' : 'Cấp quyền & Lưu danh hiệu'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* List of Collaborators */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <h4 className="font-serif text-sm sm:text-base font-bold text-stone-800 dark:text-stone-100">
              Danh sách Quản trị viên, Kiểm duyệt viên & Cộng tác viên ({collaboratorsList.length})
            </h4>
          </div>
          <span className="text-[11px] text-stone-400 font-mono">Đồng bộ tự động thời gian thực</span>
        </div>

        {/* Dynamic Collaborators List */}
        <div className="space-y-2.5">
          {collaboratorsList.map((collab) => {
            const isEditing = editingCollabId === collab.id;

            return (
              <div
                key={collab.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200/90 dark:border-stone-800 hover:border-pink-300 transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-stone-800 text-pink-600 dark:text-pink-400 flex items-center justify-center font-bold text-sm shrink-0 border border-pink-200 dark:border-stone-700">
                    {collab.displayName ? collab.displayName[0].toUpperCase() : 'C'}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="font-serif text-sm font-bold text-stone-800 dark:text-stone-100 truncate">
                        {collab.displayName || collab.email}
                      </span>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                          collab.role === 'admin'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                            : collab.role === 'moderator'
                            ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {collab.roleTitle || ROLE_PRESETS[collab.role] || 'Cộng tác viên'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400 font-mono">
                      <span className="flex items-center gap-1 text-pink-600 dark:text-pink-400">
                        <Mail className="w-3 h-3" />
                        <span>{collab.email}</span>
                      </span>
                      {collab.note && (
                        <>
                          <span>•</span>
                          <span className="italic font-sans text-stone-600 dark:text-stone-300">
                            "{collab.note}"
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions & Role Edit */}
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {isEditing ? (
                    <div className="flex flex-wrap items-center gap-1.5 bg-stone-50 dark:bg-stone-800 p-2 rounded-xl border border-stone-200 dark:border-stone-700">
                      <select
                        value={editRole}
                        onChange={(e) => {
                          const r = e.target.value as CollaboratorItem['role'];
                          setEditRole(r);
                          if (!editRoleTitle || Object.values(ROLE_PRESETS).includes(editRoleTitle)) {
                            setEditRoleTitle(ROLE_PRESETS[r] || 'Cộng tác viên');
                          }
                        }}
                        className="px-2 py-1 text-xs rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 font-medium"
                      >
                        <option value="admin">Quản trị viên</option>
                        <option value="moderator">Kiểm duyệt viên</option>
                        <option value="collaborator">Cộng tác viên</option>
                      </select>

                      <input
                        type="text"
                        value={editRoleTitle}
                        onChange={(e) => setEditRoleTitle(e.target.value)}
                        placeholder="Danh hiệu tùy chỉnh"
                        className="w-36 px-2 py-1 text-xs rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100"
                      />

                      <button
                        type="button"
                        onClick={() => handleUpdateRole(collab.id)}
                        className="px-2.5 py-1 rounded-lg text-xs bg-emerald-500 text-white font-bold cursor-pointer hover:bg-emerald-600"
                      >
                        Lưu
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCollabId(null)}
                        className="px-2 py-1 rounded-lg text-xs text-stone-500 hover:bg-stone-200 cursor-pointer"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartEdit(collab)}
                      className="p-2 rounded-xl text-stone-500 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                      title="Chỉnh sửa vai trò & danh hiệu"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}

                  {collabToDelete?.id === collab.id ? (
                    <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 p-1.5 rounded-xl border border-rose-200">
                      <button
                        type="button"
                        onClick={() => handleDelete(collab.id)}
                        className="px-2 py-1 rounded text-xs font-bold bg-rose-500 text-white cursor-pointer hover:bg-rose-600"
                      >
                        Xác nhận xóa
                      </button>
                      <button
                        type="button"
                        onClick={() => setCollabToDelete(null)}
                        className="px-1.5 py-1 rounded text-xs text-stone-500 hover:bg-stone-200 cursor-pointer"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCollabToDelete(collab)}
                      className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                      title="Thu hồi quyền"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Initial Core Authors List */}
        <div className="mt-4 p-4 rounded-2xl bg-stone-50/80 dark:bg-stone-850/60 border border-stone-200 dark:border-stone-800 space-y-3">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" />
            <h5 className="font-serif text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
              Danh sách Thành viên Sáng lập & Quản trị Hệ thống ({AUTHOR_EMAILS.length})
            </h5>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {AUTHOR_EMAILS.map((email) => {
              const matchedInCollabs = collaboratorsList.find((c) => c.email.toLowerCase() === email.toLowerCase());
              const isMain =
                email === 'cuncondangiu07@gmail.com' ||
                email === 'meomeoxinhxinh07@gmail.com' ||
                email === 'nhatlinhpham010194@gmail.com' ||
                email === 'maianhpham927@gmail.com' ||
                email === 'mellifluous740@gmail.com';

              const roleDisplay = matchedInCollabs?.roleTitle || (isMain ? 'Quản trị viên' : 'Cộng tác viên');

              return (
                <div
                  key={email}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-mono text-stone-800 dark:text-stone-200 truncate block text-[11px]">
                      {email}
                    </span>
                    <span className="text-[10px] text-pink-600 dark:text-pink-400 font-medium">
                      {roleDisplay}
                    </span>
                  </div>
                  <Shield className={`w-3.5 h-3.5 shrink-0 ${isMain ? 'text-purple-500' : 'text-emerald-500'}`} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
