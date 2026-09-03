import React, { useState } from 'react';
import { X, User, Mail, Calendar, LogOut, Sparkles, ShieldCheck, Heart, Plus, Trash2, Brain } from 'lucide-react';
import { UserProfile } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onUpdateUser?: (updated: UserProfile) => void;
  onLogout: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  onLogout,
}) => {
  const [newInterest, setNewInterest] = useState('');

  if (!isOpen) return null;

  const handleAddInterest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInterest.trim() || !user || !onUpdateUser) return;
    const current = user.interests || [];
    if (!current.includes(newInterest.trim())) {
      const updated: UserProfile = {
        ...user,
        interests: [...current, newInterest.trim()],
      };
      onUpdateUser(updated);
    }
    setNewInterest('');
  };

  const handleRemoveInterest = (interestToRemove: string) => {
    if (!user || !onUpdateUser) return;
    const current = user.interests || [];
    const updated: UserProfile = {
      ...user,
      interests: current.filter(i => i !== interestToRemove),
    };
    onUpdateUser(updated);
  };

  const handleRemoveLearnedPref = (prefToRemove: string) => {
    if (!user || !onUpdateUser) return;
    const current = user.learnedPreferences || [];
    const updated: UserProfile = {
      ...user,
      learnedPreferences: current.filter(p => p !== prefToRemove),
    };
    onUpdateUser(updated);
  };

  const defaultSuggestedInterests = [
    "💻 IT va Dasturlash",
    "🚀 Startaplar va Biznes",
    "🧠 Sun'iy intellekt",
    "🌌 Koinot va Fan",
    "📚 Kitoblar va Falsafa",
    "🌍 Dunyo yangiliklari"
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5" />
            <h3 className="font-bold text-sm">Foydalanuvchi Profili va AI Xotirasi</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Avatar and name */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-teal-400 text-white flex items-center justify-center text-2xl font-black shadow-md mb-2">
              {user?.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
            </div>
            <h4 className="font-bold text-slate-900 text-base">
              {user ? `${user.firstName} ${user.lastName}` : 'Foydalanuvchi'}
            </h4>
            <span className="text-xs text-slate-500">{user?.email || 'foydalanuvchi@ai.uz'}</span>
          </div>

          {/* User Details */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-500" />
                To'liq ism:
              </span>
              <span className="font-semibold text-slate-800">
                {user ? `${user.firstName} ${user.lastName}` : '-'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-500" />
                Email:
              </span>
              <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                {user?.email || '-'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                Tug'ilgan yil:
              </span>
              <span className="font-semibold text-slate-800">
                {user?.birthYear ? `${user.birthYear}-yil` : '-'}
              </span>
            </div>
          </div>

          {/* AI Memory & Learned Preferences */}
          <div className="p-3.5 bg-gradient-to-br from-indigo-50/70 to-blue-50/70 border border-indigo-100/90 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-900">
              <Brain className="w-4 h-4 text-indigo-600" />
              <span>AI Eslab Qolgan Qiziqishlaringiz:</span>
            </div>

            {/* Tags / Preferences list */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(user?.learnedPreferences && user.learnedPreferences.length > 0) || (user?.interests && user.interests.length > 0) ? (
                <>
                  {user?.interests?.map((item, idx) => (
                    <span 
                      key={`int-${idx}`} 
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-indigo-200 text-indigo-800 text-[11px] font-semibold rounded-full shadow-2xs"
                    >
                      {item}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveInterest(item)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {user?.learnedPreferences?.map((pref, idx) => (
                    <span 
                      key={`pref-${idx}`} 
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold rounded-full shadow-2xs"
                      title="Suhbat davomida AI tomonidan avtomatik eslab qolingan"
                    >
                      ✨ {pref}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveLearnedPref(pref)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </>
              ) : (
                <p className="text-[11px] text-slate-500 italic py-1">
                  Hali qiziqishlar kiritilmagan. Savol berganingizda UZUNITED AI sizning qiziqishlaringizni avtomatik eslab qoladi!
                </p>
              )}
            </div>

            {/* Quick add interest */}
            {onUpdateUser && (
              <form onSubmit={handleAddInterest} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  placeholder="Yangi qiziqish qo'shish..."
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Qo'shish
                </button>
              </form>
            )}

            {/* Suggested quick chips */}
            <div className="pt-1">
              <span className="text-[10px] text-slate-400 font-medium block mb-1">Tavsiya etilgan qiziqishlar:</span>
              <div className="flex flex-wrap gap-1">
                {defaultSuggestedInterests.map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (!user || !onUpdateUser) return;
                      const current = user.interests || [];
                      if (!current.includes(sug)) {
                        onUpdateUser({ ...user, interests: [...current, sug] });
                      }
                    }}
                    className="text-[10px] px-2 py-0.5 bg-white/80 hover:bg-white text-slate-600 hover:text-indigo-600 border border-slate-200 rounded-md transition-colors"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Creator Attribution */}
          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl text-xs">
            <div className="flex items-center gap-1.5 font-bold text-blue-700 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>AI Yaratuvchilari:</span>
            </div>
            <p className="text-slate-700 font-medium leading-relaxed">
              Ushbu AI ni <strong className="text-blue-600">Afzalbek Nematov</strong> va <strong className="text-indigo-600">Ozodbek Shohobiddinovlar</strong> yaratishgan.
            </p>
          </div>

          {/* Logout Button */}
          <button
            id="btn-profile-logout"
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Profildan chiqish</span>
          </button>
        </div>

      </div>
    </div>
  );
};
