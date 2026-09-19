import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Camera,
  Sparkles,
  Heart,
  Globe,
  Save,
  Check,
  ShieldCheck,
  Image as ImageIcon,
  Upload,
  BookOpen,
  Tag,
  Plus,
} from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { getCustomGenres } from '../utils/genreManager';

// Preset artistic avatars for readers and authors
const PRESET_AVATARS = [
  {
    name: 'Hoa Anh Đào',
    url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?q=80&w=300&auto=format&fit=crop',
  },
  {
    name: 'Mèo Lười Đọc Sách',
    url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=300&auto=format&fit=crop',
  },
  {
    name: 'Tách Trà Chiều',
    url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=300&auto=format&fit=crop',
  },
  {
    name: 'Góc Ban Công Nắng',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=300&auto=format&fit=crop',
  },
  {
    name: 'Ánh Trăng Đêm',
    url: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?q=80&w=300&auto=format&fit=crop',
  },
  {
    name: 'Hoa Tulip Hồng',
    url: 'https://images.unsplash.com/photo-1520763185298-1b434c919102?q=80&w=300&auto=format&fit=crop',
  },
  {
    name: 'Bầu Trời Hoàng Hôn',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=300&auto=format&fit=crop',
  },
  {
    name: 'Cuốn Sách Cũ',
    url: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?q=80&w=300&auto=format&fit=crop',
  },
];

const FAVORITE_GENRE_OPTIONS = [
  'Ngọt sủng',
  'Thanh xuân vườn trường',
  'Đô thị tình duyên',
  'Chữa lành',
  '1v1',
  'HE (Happy Ending)',
  'Cưới trước yêu sau',
  'Gương vỡ lại lành',
  'Hài hước',
  'Nhẹ nhàng sâu lắng',
];

export const ProfileEditModal: React.FC = () => {
  const { user, isProfileModalOpen, closeProfileModal, updateUserProfileData } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [bio, setBio] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['Ngọt sủng']);
  const [availableGenres, setAvailableGenres] = useState<string[]>(FAVORITE_GENRE_OPTIONS);
  const [newGenreInput, setNewGenreInput] = useState('');
  const [websiteOrSocial, setWebsiteOrSocial] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [avatarTab, setAvatarTab] = useState<'presets' | 'custom' | 'upload'>('presets');
  const [customAvatarInput, setCustomAvatarInput] = useState('');

  // Populate initial values from current user
  useEffect(() => {
    if (user && isProfileModalOpen) {
      setDisplayName(user.displayName || '');
      setPhotoURL(user.photoURL || '');
      setCustomAvatarInput(user.photoURL || '');
      setBio(user.bio || '');

      // Parse favorite genres (can be comma-separated)
      const userGenres = user.favoriteGenre
        ? user.favoriteGenre
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : ['Ngọt sủng'];
      setSelectedGenres(userGenres);

      // Merge dynamic custom genres from site with favorite presets and user genres
      try {
        const siteGenres = getCustomGenres().filter(
          (g) => !g.toLowerCase().includes('tất cả các thể loại') && !g.toLowerCase().includes('tất cả thể loại')
        );
        const mergedSet = new Set([...FAVORITE_GENRE_OPTIONS, ...siteGenres, ...userGenres]);
        setAvailableGenres(Array.from(mergedSet));
      } catch {
        const mergedSet = new Set([...FAVORITE_GENRE_OPTIONS, ...userGenres]);
        setAvailableGenres(Array.from(mergedSet));
      }

      setWebsiteOrSocial(user.websiteOrSocial || '');
      setNewGenreInput('');
      setSavedSuccess(false);
    }
  }, [user, isProfileModalOpen]);

  if (!isProfileModalOpen || !user) return null;

  const handleAddCustomGenre = () => {
    const trimmed = newGenreInput.trim();
    if (!trimmed) return;

    // Add to available genres if not present
    if (!availableGenres.some((g) => g.toLowerCase() === trimmed.toLowerCase())) {
      setAvailableGenres((prev) => [...prev, trimmed]);
    }

    // Add to selected genres if not present
    if (!selectedGenres.some((g) => g.toLowerCase() === trimmed.toLowerCase())) {
      setSelectedGenres((prev) => [...prev, trimmed]);
    }

    setNewGenreInput('');
  };

  const handleToggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      // Gỡ bỏ thể loại đã chọn
      setSelectedGenres((prev) => prev.filter((g) => g !== genre));
    } else {
      // Thêm thể loại vào danh sách chọn
      setSelectedGenres((prev) => [...prev, genre]);
    }
  };

  const handleRemoveGenre = (genre: string) => {
    setSelectedGenres((prev) => prev.filter((g) => g !== genre));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Vui lòng chọn ảnh có kích thước dưới 2MB để tải nhanh.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPhotoURL(reader.result);
          setCustomAvatarInput(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      alert('Vui lòng nhập tên hiển thị.');
      return;
    }

    setIsSaving(true);
    try {
      await updateUserProfileData({
        displayName: displayName.trim(),
        photoURL: photoURL || null,
        bio: bio.trim(),
        favoriteGenre: selectedGenres.join(', '),
        websiteOrSocial: websiteOrSocial.trim(),
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        closeProfileModal();
      }, 1200);
    } catch (err) {
      console.error('Save profile error:', err);
      alert('Không thể lưu hồ sơ. Vui lòng thử lại sau.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="profile-edit-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeProfileModal();
      }}
    >
      <div
        id="profile-edit-modal-card"
        className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-pink-200/90 dark:border-stone-700 overflow-hidden animate-in zoom-in-95 duration-200 my-auto"
      >
        {/* Header */}
        <div className="relative px-5 py-4 bg-gradient-to-r from-pink-100/90 via-rose-50/70 to-amber-50/80 dark:from-stone-850 dark:via-stone-900 dark:to-stone-850 border-b border-pink-100 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-pink-500 text-white flex items-center justify-center shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base sm:text-lg font-bold text-stone-800 dark:text-stone-100 leading-tight">
                Chỉnh sửa Hồ sơ cá nhân
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Đổi ảnh đại diện, bút danh và lời giới thiệu của bạn
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-profile-modal-btn"
            onClick={closeProfileModal}
            className="w-8 h-8 rounded-full bg-white/80 dark:bg-stone-800 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-white dark:hover:bg-stone-700 flex items-center justify-center transition-colors cursor-pointer border border-stone-200/80 dark:border-stone-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-5 space-y-5 max-h-[82vh] overflow-y-auto custom-scrollbar">
          {/* Top Avatar Preview & Identity Badge */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-pink-50/50 dark:bg-stone-850 border border-pink-100 dark:border-stone-800">
            <div className="relative group shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full ring-4 ring-pink-300/80 dark:ring-pink-700 overflow-hidden bg-pink-100 dark:bg-stone-800 flex items-center justify-center shadow-md">
                {photoURL ? (
                  <img
                    src={photoURL}
                    alt={displayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User className="w-10 h-10 text-pink-400" />
                )}
              </div>
              <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-xs">
                <Camera className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="text-center sm:text-left min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mb-1">
                <span className="font-serif text-base sm:text-lg font-bold text-stone-800 dark:text-stone-100 truncate">
                  {displayName || 'Độc giả'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500 text-white font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{user.roleTitle || user.roleBadge}</span>
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-mono truncate">
                {user.email || `Tài khoản bạn đọc (${user.uid.slice(0, 10)}...)`}
              </p>
              {bio && (
                <p className="text-xs italic text-stone-600 dark:text-stone-300 mt-1 line-clamp-2 bg-white/70 dark:bg-stone-900/60 p-1.5 rounded-lg border border-pink-100/60 dark:border-stone-800">
                  "{bio}"
                </p>
              )}
            </div>
          </div>

          {/* Avatar Chooser Section */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
              Chọn hoặc Tải ảnh đại diện (Avatar)
            </label>

            {/* Avatar Tab Selector */}
            <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
              <button
                type="button"
                onClick={() => setAvatarTab('presets')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  avatarTab === 'presets'
                    ? 'bg-white dark:bg-stone-700 text-pink-600 dark:text-pink-300 shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Mẫu có sẵn</span>
              </button>
              <button
                type="button"
                onClick={() => setAvatarTab('upload')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  avatarTab === 'upload'
                    ? 'bg-white dark:bg-stone-700 text-pink-600 dark:text-pink-300 shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Tải ảnh lên</span>
              </button>
              <button
                type="button"
                onClick={() => setAvatarTab('custom')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  avatarTab === 'custom'
                    ? 'bg-white dark:bg-stone-700 text-pink-600 dark:text-pink-300 shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Dán link ảnh</span>
              </button>
            </div>

            {/* Tab 1: Preset Avatars */}
            {avatarTab === 'presets' && (
              <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 pt-1">
                {PRESET_AVATARS.map((item, idx) => {
                  const isSelected = photoURL === item.url;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPhotoURL(item.url)}
                      className={`group relative flex flex-col items-center p-1.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/60 ring-2 ring-pink-400'
                          : 'border-stone-200 dark:border-stone-700 hover:border-pink-300 bg-white dark:bg-stone-850'
                      }`}
                    >
                      <div className="w-11 h-11 rounded-full overflow-hidden mb-1">
                        <img
                          src={item.url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <span className="text-[10px] text-stone-600 dark:text-stone-300 truncate w-full text-center">
                        {item.name}
                      </span>
                      {isSelected && (
                        <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-pink-500 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Tab 2: Upload Image */}
            {avatarTab === 'upload' && (
              <div className="p-4 rounded-xl border-2 border-dashed border-pink-200 dark:border-stone-700 bg-pink-50/30 dark:bg-stone-850/50 text-center space-y-2">
                <Upload className="w-6 h-6 mx-auto text-pink-400" />
                <p className="text-xs text-stone-600 dark:text-stone-300">
                  Chọn ảnh từ máy tính hoặc điện thoại của bạn (JPG, PNG, WebP)
                </p>
                <input
                  type="file"
                  id="avatar-file-input"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="text-xs text-stone-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-pink-500 file:text-white hover:file:bg-pink-600 cursor-pointer"
                />
              </div>
            )}

            {/* Tab 3: Paste Image URL */}
            {avatarTab === 'custom' && (
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... hoặc link ảnh bất kỳ"
                  value={customAvatarInput}
                  onChange={(e) => setCustomAvatarInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-800 dark:text-stone-100 focus:outline-hidden focus:border-pink-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customAvatarInput.trim()) {
                      setPhotoURL(customAvatarInput.trim());
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold cursor-pointer shrink-0"
                >
                  Áp dụng
                </button>
              </div>
            )}
          </div>

          {/* Display Name Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="profile-display-name"
              className="block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300"
            >
              Tên hiển thị / Bút danh / Biệt hiệu <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="profile-display-name"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="VD: Mellifluous, Bé Mèo Thích Đọc Truyện..."
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-800 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-pink-400"
            />
            <p className="text-[11px] text-stone-400">
              Tên này sẽ hiển thị ở thanh Menu, khung bình luận và hòm thư bạn đọc.
            </p>
          </div>

          {/* Bio Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="profile-bio"
              className="block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300 flex items-center justify-between"
            >
              <span>Giới thiệu ngắn (Bio)</span>
              <span className="text-[10px] text-stone-400 font-normal">Tùy chọn</span>
            </label>
            <textarea
              id="profile-bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Chia sẻ vài dòng về gu đọc truyện, châm ngôn hoặc lời chào gửi đến mọi người..."
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-800 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-pink-400 resize-none"
            />
          </div>

          {/* Favorite Genre selector (Multi-select, Self-add, and Remove) */}
          <div className="space-y-2 p-3 rounded-2xl bg-stone-50/70 dark:bg-stone-850/60 border border-stone-200/80 dark:border-stone-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                <span>Thể loại yêu thích nhất</span>
              </label>
              {selectedGenres.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedGenres([])}
                  className="text-[11px] text-stone-400 hover:text-rose-500 transition-colors cursor-pointer"
                  title="Gỡ bỏ toàn bộ thể loại đã chọn"
                >
                  Gỡ bỏ tất cả
                </button>
              )}
            </div>

            {/* 1. Selected Genres Badges with "✕" Remove button */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-pink-100 dark:border-stone-800 min-h-[44px]">
              <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 font-medium mb-1.5">
                <span>
                  Đã chọn ({selectedGenres.length}):
                </span>
                <span className="text-[10px] text-pink-600 dark:text-pink-400 italic">
                  Nhấp ✕ để gỡ bỏ thể loại
                </span>
              </div>

              {selectedGenres.length === 0 ? (
                <p className="text-xs text-stone-400 dark:text-stone-500 italic py-0.5">
                  Chưa chọn thể loại nào. Hãy nhấp gợi ý bên dưới hoặc tự thêm thể loại bạn yêu thích.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {selectedGenres.map((g) => (
                    <span
                      key={g}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-2xs animate-in zoom-in-95 duration-150"
                    >
                      <span>{g}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveGenre(g)}
                        className="w-4 h-4 rounded-full hover:bg-black/20 flex items-center justify-center cursor-pointer transition-colors"
                        title={`Gỡ bỏ ${g}`}
                        aria-label={`Gỡ bỏ ${g}`}
                      >
                        <X className="w-2.5 h-2.5 stroke-[3]" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Self-Add Other Genres Input */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <div className="relative flex-1">
                <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                <input
                  type="text"
                  value={newGenreInput}
                  onChange={(e) => setNewGenreInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomGenre();
                    }
                  }}
                  placeholder="Tự thêm thể loại khác (VD: Xuyên không, Trọng sinh, Điền văn...)"
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-pink-400"
                />
              </div>
              <button
                type="button"
                onClick={handleAddCustomGenre}
                disabled={!newGenreInput.trim()}
                className="px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shrink-0 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm</span>
              </button>
            </div>

            {/* 3. Popular Genre Suggestions (Click to toggle) */}
            <div className="space-y-1 pt-0.5">
              <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                Gợi ý thể loại phổ biến (chạm để chọn / bỏ chọn):
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar p-0.5">
                {availableGenres.map((g) => {
                  const isSelected = selectedGenres.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => handleToggleGenre(g)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-pink-100 text-pink-800 dark:bg-pink-950/80 dark:text-pink-200 border border-pink-300 dark:border-pink-800 font-semibold shadow-2xs'
                          : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200/80 dark:border-stone-700 hover:bg-pink-50 hover:text-pink-600 hover:border-pink-200'
                      }`}
                    >
                      {isSelected ? (
                        <Check className="w-3 h-3 text-pink-600 dark:text-pink-400 stroke-[2.5]" />
                      ) : (
                        <Plus className="w-3 h-3 text-stone-400" />
                      )}
                      <span>{g}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Social or Website Link */}
          <div className="space-y-1.5">
            <label
              htmlFor="profile-social"
              className="block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300 flex items-center gap-1"
            >
              <Globe className="w-3.5 h-3.5 text-sky-500" />
              <span>Liên kết mạng xã hội / Blog cá nhân</span>
            </label>
            <input
              type="text"
              id="profile-social"
              value={websiteOrSocial}
              onChange={(e) => setWebsiteOrSocial(e.target.value)}
              placeholder="VD: facebook.com/..., wattpad.com/user/..., blog cá nhân"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-800 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-pink-400"
            />
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex items-center gap-2 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={closeProfileModal}
              className="flex-1 py-2.5 px-4 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-xs sm:text-sm font-medium hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className={`flex-2 py-2.5 px-4 rounded-xl text-white text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                savedSuccess
                  ? 'bg-emerald-500'
                  : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600'
              } disabled:opacity-50`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Đã cập nhật hồ sơ thành công!</span>
                </>
              ) : isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Lưu thay đổi hồ sơ</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
