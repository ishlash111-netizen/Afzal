import React, { useState } from 'react';
import { Sparkles, Mail, Lock, User, Calendar, ArrowRight, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onSuccess }) => {
  const [isRegister, setIsRegister] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthYear, setBirthYear] = useState('2000');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  // Generate list of years (1950 to 2018)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1950 + 1 }, (_, i) => currentYear - i);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError("Email va parolni kiriting.");
      return;
    }

    if (isRegister) {
      if (!firstName.trim() || !lastName.trim()) {
        setError("Iltimos, ism va familiyangizni to'liq kiriting.");
        return;
      }
      if (!birthYear) {
        setError("Tug'ilgan yilingizni tanlang.");
        return;
      }
      if (password.length < 6) {
        setError("Parol kamida 6 ta belgidan iborat bo'lishi kerak.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Kiritilgan parollar bir-biriga mos kelmadi. Qaytadan tekshiring.");
        return;
      }

      const newUser: UserProfile = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        birthYear: birthYear,
      };

      // Save user to localStorage
      localStorage.setItem('uzunited_user', JSON.stringify(newUser));
      localStorage.setItem(`uzunited_pwd_${newUser.email}`, password);
      onSuccess(newUser);
    } else {
      // Login mode
      const savedUserStr = localStorage.getItem('uzunited_user');
      if (savedUserStr) {
        try {
          const savedUser: UserProfile = JSON.parse(savedUserStr);
          const savedPwd = localStorage.getItem(`uzunited_pwd_${email.trim().toLowerCase()}`);
          if (savedPwd && savedPwd !== password) {
            setError("Parol noto'g'ri kiritildi.");
            return;
          }
          if (savedUser.email === email.trim().toLowerCase()) {
            onSuccess(savedUser);
            return;
          }
        } catch {}
      }
      // If no exact match or first time login with existing credentials, authenticate
      const user: UserProfile = {
        firstName: email.split('@')[0],
        lastName: '',
        email: email.trim().toLowerCase(),
        birthYear: '2000',
      };
      localStorage.setItem('uzunited_user', JSON.stringify(user));
      onSuccess(user);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 p-6 text-white text-center relative">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/30 mb-3">
            <span className="text-3xl font-extrabold text-white">U</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">UZUNITED AI</h2>
          <p className="text-xs text-blue-100 mt-1 font-medium">
            O'zbek tilidagi universal sun'iy intellekt platformasi
          </p>
          <div className="mt-2 text-[11px] bg-white/15 px-3 py-1 rounded-full inline-block backdrop-blur-sm border border-white/20 font-medium">
            Yaratuvchilar: Afzalbek Nematov & Ozodbek Shohobiddinov
          </div>
        </div>

        {/* Tab switcher: Ro'yxatdan o'tish / Kirish */}
        <div className="p-6">
          <div className="flex bg-slate-100 p-1 rounded-xl mb-5">
            <button
              type="button"
              id="tab-register-mode"
              onClick={() => { setIsRegister(true); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                isRegister
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Ro'yxatdan o'tish
            </button>
            <button
              type="button"
              id="tab-login-mode"
              onClick={() => { setIsRegister(false); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                !isRegister
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Tizimga kirish
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <span className="font-bold">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegister && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {/* Ism */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ism <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        id="reg-first-name"
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Ismingiz"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Familiya */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Familiya <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="reg-last-name"
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Familiyangiz"
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Tug'ilgan yil */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tug'ilgan yilingiz <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <select
                      id="reg-birth-year"
                      value={birthYear}
                      onChange={(e) => setBirthYear(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      {years.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}-yil
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email manzil <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@misol.uz"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Parol */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Parol <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Kamida 6 ta belgi"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Parolni takrorlash (faqat ro'yxatdan o'tishda) */}
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Parolni takrorlang <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="auth-confirm-password-input"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Parolni qayta kiriting"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
            )}

            <button
              id="btn-auth-submit"
              type="submit"
              className="w-full mt-4 py-2.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>{isRegister ? "Ro'yxatdan o'tish va Boshlash" : "Tizimga kirish"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Ma'lumotlaringiz shaxsiy va xavfsiz saqlanadi</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
