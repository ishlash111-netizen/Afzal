import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ChatInterface } from './components/ChatInterface';
import { SidebarDrawer } from './components/SidebarDrawer';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { ChatMessage, ChatSession, UserProfile, FileAttachment } from './types';
import { generateClientResponse } from './utils/clientAiEngine';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('uzunited_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(!user);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('UzLLM v3.5 Pro');
  const [tokenCount, setTokenCount] = useState(842);

  const [sessionId, setSessionId] = useState<string>('default-uzunited-session');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const savedUser = (() => {
      try {
        const s = localStorage.getItem('uzunited_user');
        return s ? JSON.parse(s) : null;
      } catch {
        return null;
      }
    })();

    const greeting = savedUser?.firstName 
      ? `Assalomu alaykum, **${savedUser.firstName}**! Men **UZUNITED AI** — butun dunyo bilimlari va keng qamrovli tahlilga ega universal sun'iy intellekt assistentiman.\n\n✨ **Ushbu AI ni Afzalbek Nematov va Ozodbek Shohobiddinovlar yaratishgan.**\n\nMen sizning ismingiz va qiziqishlaringizni eslab qolaman. Istalgan savolingizni berishingiz, galereyangizdan rasm yoki hujjat fayllarini tahlil qilish uchun yuklashingiz mumkin!`
      : "Assalomu alaykum! Men **UZUNITED AI** — butun dunyo bilimlari va keng qamrovli tahlilga ega universal sun'iy intellekt assistentiman.\n\n✨ **Ushbu AI ni Afzalbek Nematov va Ozodbek Shohobiddinovlar yaratishgan.**\n\nSiz bilan istalgan mavzuda insondek do'stona va chuqur muloqot qilishga tayyorman. Menga biznes reja, IT loyihalar, ilm-fan, tarix bo'yicha savolingizni bering yoki rasm/fayl yuklang!";

    return [
      {
        id: 'msg-0',
        role: 'assistant',
        content: greeting,
        timestamp: new Date().toISOString(),
      }
    ];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeReasoningSteps, setActiveReasoningSteps] = useState<string[]>([]);

  // Fetch list of all sessions
  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/memory/sessions');
      if (res.ok) {
        const data = await res.json();
        if (data.sessions) {
          setSessions(data.sessions);
        }
      }
    } catch (e) {
      console.warn('Failed to load sessions', e);
    }
  };

  // Initial load
  useEffect(() => {
    fetchSessions();
  }, []);

  // Send message handler supporting attachments
  const handleSendMessage = async (
    text: string, 
    isDeepSearch: boolean, 
    isAiMode = true, 
    attachments: FileAttachment[] = []
  ) => {
    const userMsgId = `msg-${Date.now()}-u`;
    const effectiveContent = text.trim() || (
      attachments.length > 0
        ? (attachments[0].isImage ? "Ushbu rasmni batafsil tahlil qilib bering." : "Ushbu faylni batafsil tahlil qilib bering.")
        : "Salom"
    );

    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: effectiveContent,
      attachments: attachments.length > 0 ? attachments : undefined,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setTokenCount(prev => prev + Math.floor(effectiveContent.length / 3) + 45);

    const steps = [`1. Savol qabul qilindi: "${effectiveContent}"`];
    if (attachments.length > 0) {
      steps.push(`1.1. ${attachments.length} ta rasm/fayl kiritildi: ${attachments.map(a => a.name).join(", ")}`);
    }
    steps.push(`2. Butun dunyo bilimlari va kontekst xotirasi tahlilga tortilmoqda...`);
    setActiveReasoningSteps(steps);

    try {
      const executeRequest = async (isRetry = false): Promise<any> => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 35000);

          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              message: effectiveContent,
              isDeepSearch,
              isAiMode,
              customModel: selectedModel,
              userProfile: user,
              attachments,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error || `Server xatosi (${res.status})`);
          }

          return await res.json();
        } catch (fetchErr: any) {
          if (!isRetry && (fetchErr.name === 'AbortError' || fetchErr.message?.includes('fetch') || fetchErr.name === 'TypeError')) {
            await new Promise(r => setTimeout(r, 600));
            return executeRequest(true);
          }
          throw fetchErr;
        }
      };

      const data = await executeRequest();
      
      if (data.reasoningSteps) {
        setActiveReasoningSteps(data.reasoningSteps);
      }

      if (data.assistantMessage) {
        setMessages(prev => [...prev, data.assistantMessage]);
        setTokenCount(prev => prev + Math.floor((data.assistantMessage.content?.length || 100) / 3));
      }

      // If AI extracted new learned preferences, save them into the user's profile!
      if (data.newLearnedPreferences && data.newLearnedPreferences.length > 0 && user) {
        setUser(prev => {
          if (!prev) return null;
          const existing = prev.learnedPreferences || [];
          const combined = Array.from(new Set([...existing, ...data.newLearnedPreferences]));
          const updated = { ...prev, learnedPreferences: combined };
          localStorage.setItem('uzunited_user', JSON.stringify(updated));
          return updated;
        });
      }

      // Refresh sessions list
      fetchSessions();
    } catch (err: any) {
      console.warn('Chat request handled with client AI engine:', err);
      
      const fallbackResult = generateClientResponse({
        query: effectiveContent,
        user,
        attachments,
        history: messages,
      });

      setActiveReasoningSteps(fallbackResult.reasoningSteps);

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-a`,
        role: 'assistant',
        content: fallbackResult.answer,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Create new chat
  const handleNewChat = async () => {
    try {
      const res = await fetch('/api/memory/new-session', { method: 'POST' });
      const data = await res.json();
      if (data.session) {
        setSessionId(data.session.id);
        setMessages(data.session.messages);
        setActiveReasoningSteps([]);
        fetchSessions();
      }
    } catch (e) {
      const newId = `session-${Date.now()}`;
      setSessionId(newId);
      setMessages([
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: "Assalomu alaykum! Yangi suhbat boshlandi. UZUNITED AI ga istalgan savolingizni berishingiz mumkin.\n\n✨ Ushbu AI ni Afzalbek Nematov va Ozodbek Shohobiddinovlar yaratishgan.",
          timestamp: new Date().toISOString(),
        }
      ]);
      setActiveReasoningSteps([]);
    }
  };

  // Select an existing session
  const handleSelectSession = async (targetId: string) => {
    try {
      const res = await fetch(`/api/memory/sessions/${targetId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          setSessionId(data.session.id);
          setMessages(data.session.messages);
          setActiveReasoningSteps([]);
          return;
        }
      }
    } catch (e) {
      console.warn('Could not fetch session detail', e);
    }
    // Fallback switch ID
    setSessionId(targetId);
  };

  // Delete an individual chat session (bittalab o'chirish)
  const handleDeleteSession = async (targetId: string) => {
    try {
      await fetch(`/api/memory/sessions/${targetId}`, { method: 'DELETE' });
      // Update local sessions list
      setSessions(prev => prev.filter(s => s.id !== targetId));
      // If current session was deleted, start new one
      if (sessionId === targetId) {
        handleNewChat();
      }
    } catch (e) {
      console.warn('Failed to delete session', e);
      setSessions(prev => prev.filter(s => s.id !== targetId));
    }
  };

  // Auth callbacks
  const handleAuthSuccess = (authenticatedUser: UserProfile) => {
    setUser(authenticatedUser);
    setIsAuthModalOpen(false);
  };

  // User profile update
  const handleUpdateUser = (updated: UserProfile) => {
    setUser(updated);
    localStorage.setItem('uzunited_user', JSON.stringify(updated));
  };

  const handleLogout = () => {
    localStorage.removeItem('uzunited_user');
    setUser(null);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc] text-slate-900 overflow-hidden font-sans select-text">
      
      {/* Top Header matching screenshot */}
      <Header
        onOpenMenu={() => setIsSidebarOpen(true)}
        onNewChat={handleNewChat}
        onOpenProfile={() => {
          if (user) {
            setIsProfileModalOpen(true);
          } else {
            setIsAuthModalOpen(true);
          }
        }}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        user={user}
        tokenCount={tokenCount}
      />

      {/* Main Chat Viewport */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          activeReasoningSteps={activeReasoningSteps}
          onNewSession={handleNewChat}
          selectedModel={selectedModel}
          user={user}
          onOpenProfile={() => setIsProfileModalOpen(true)}
        />
      </main>

      {/* Slide-out Sidebar Drawer with Chat History and individual delete buttons */}
      <SidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        currentSessionId={sessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        user={user}
        onLogout={handleLogout}
      />

      {/* Registration & Login Modal on first entrance */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onSuccess={handleAuthSuccess}
      />

      {/* User Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onUpdateUser={handleUpdateUser}
        onLogout={handleLogout}
      />

    </div>
  );
}
