export interface SourceItem {
  id: number;
  title: string;
  url: string;
  snippet: string;
  domain: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl?: string; // base64 data url for preview
  base64Data?: string; // raw base64 data
  mimeType: string;
  textContent?: string; // extracted text content for text/code/csv/json files
  isImage: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  attachments?: FileAttachment[];
  sources?: SourceItem[];
  reasoningSteps?: string[];
  resolvedQuery?: string;
  searchedWeb?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  lastEntity?: string | null;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  birthYear: number | string;
  interests?: string[]; // Foydalanuvchining qiziqishlari (e.g. IT, Futbol, Biznes, Fizika)
  favoriteTopics?: string[]; // Yoqtirgan mavzulari
  bio?: string; // Qisqa ma'lumot
  learnedPreferences?: string[]; // AI muloqot davomida aniqlab eslab qolgan shaxsiy qiziqishlar
}

export interface IntentInfo {
  needsWeb: boolean;
  reason: string;
  keywords: string[];
}

export interface PythonFileItem {
  filename: string;
  path: string;
  category: 'Backend' | 'Agent Core' | 'Web Search' | 'Database' | 'Frontend' | 'Config';
  description: string;
  content: string;
}

export interface LocalModelInfo {
  name: string;
  tag: string;
  size: string;
  ramNeeded: string;
  speed: string;
  uzbekQuality: string;
  useCase: string;
  installCommand: string;
  recommended: boolean;
}
