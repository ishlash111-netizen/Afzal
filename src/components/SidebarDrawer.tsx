import React from 'react';
import { 
  X, 
  Plus, 
  MessageSquare, 
  Trash2, 
  User, 
  LogOut, 
  Sparkles, 
  ShieldCheck, 
  Award,
  Heart
} from 'lucide-react';
import { ChatSession, UserProfile } from '../types';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  user: UserProfile | null;
  onLogout: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  user,
  onLogout,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="relative w-full max-w-xs sm:max-w-sm bg-white text-slate-900 shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-left duration-200">
        
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
              U
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">UZUNITED AI</h3>
              <p className="text-[11px] text-slate-500">Suhbatlar tarixi</p>
            </div>
          </div>
          <button
            id="btn-close-sidebar"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4 border-b border-slate-100">
          <button
            id="btn-new-chat-drawer"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Yangi chat yaratish</span>
          </button>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Mening suhbatlarim ({sessions.length})
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-8 px-4 text-slate-400 text-xs">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
              <p>Hali saqlangan suhbatlar yo'q.</p>
              <p className="text-[10px] text-slate-400 mt-1">Yangi savol yozsangiz avtomatik saqlanadi.</p>
            </div>
          ) : (
            sessions.map((sess) => {
              const isActive = sess.id === currentSessionId;
              return (
                <div
                  key={sess.id}
                  className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-blue-900 font-medium border border-blue-200'
                      : 'text-slate-700 hover:bg-slate-100/80 border border-transparent'
                  }`}
                  onClick={() => {
                    onSelectSession(sess.id);
                    onClose();
                  }}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden flex-1 pr-2">
                    <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="truncate font-medium">{sess.title || "Yangi suhbat"}</span>
                  </div>

                  {/* Individual Delete Button (bittalab o'chirish) */}
                  <button
                    id={`btn-delete-session-${sess.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(sess.id);
                    }}
                    title="Ushbu chatni o'chirish"
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-80 group-hover:opacity-100 transition-all shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Creator Attribution (Foydalanuvchi talabi bo'yicha) */}
        <div className="p-3 mx-3 mb-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl">
          <div className="flex items-center gap-2 text-blue-700 text-xs font-bold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tizim yaratuvchilari:</span>
          </div>
          <p className="text-xs text-slate-800 font-semibold leading-snug">
            Ushbu AI ni <span className="text-blue-600 font-bold">Afzalbek Nematov</span> va <span className="text-indigo-600 font-bold">Ozodbek Shohobiddinovlar</span> yaratishgan.
          </p>
        </div>

        {/* User Account / Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {user?.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 truncate">
                {user ? `${user.firstName} ${user.lastName}` : 'Foydalanuvchi'}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {user?.email || 'Tizimda faol'}
              </p>
            </div>
          </div>

          <button
            id="btn-logout"
            onClick={onLogout}
            title="Chiqish"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
