import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  FileText,
  Folder,
  LifeBuoy,
  CreditCard,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import { SiGoogledrive, SiDropbox } from 'react-icons/si';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter, Link } from 'wouter';
import { SettingsAccount, SettingsBilling, SettingsSupport } from '@/pages/settings';

type Role = 'user' | 'assistant';
type ModelKey = 'clarity' | 'depth' | 'quick';
type ContextKey = 'focused' | 'balanced' | 'open';

type Message = {
  id: string;
  role: Role;
  content: string;
  time: string;
};

type Conversation = {
  id: string;
  title: string;
  preview: string;
  date: string;
  messages: Message[];
};

type UploadedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
};

const queryClient = new QueryClient();

const INTEGRATION_URLS = {
  googleDrive: '/api/integrations/google-drive/connect',
  dropbox: '/api/integrations/dropbox/connect',
};

const models: Record<ModelKey, { name: string; detail: string }> = {
  clarity: { name: 'Summary', detail: 'High-level overview' },
  depth: { name: 'Deep Review', detail: 'Thorough legal analysis' },
  quick: { name: 'Quick Find', detail: 'Fast fact extraction' },
};

const contexts: Record<ContextKey, { name: string; detail: string }> = {
  focused: { name: 'Focused', detail: 'This document only' },
  balanced: { name: 'Matter Context', detail: 'Current case files' },
  open: { name: 'Full Workspace', detail: 'All firm matters' },
};

const quickPrompts = ['Summarize this deposition', 'Find timeline inconsistencies', 'Extract key contract clauses'];

const startingConversations: Conversation[] = [
  {
    id: 'new',
    title: 'New discovery review',
    preview: 'Upload evidence to begin...',
    date: 'Today',
    messages: [],
  },
  {
    id: 'smith-v-jones',
    title: 'Smith v. Jones - Deposition',
    preview: 'Summary of the key contradictions in...',
    date: 'Today',
    messages: [
      {
        id: 'svj-1',
        role: 'user',
        content: 'I need to review the transcript from Dr. Smith\'s deposition. What are the key contradictions regarding the timeline of events on August 4th?',
        time: '9:41 AM',
      },
      {
        id: 'svj-2',
        role: 'assistant',
        content:
          'Based on the deposition transcript, there are three primary inconsistencies regarding August 4th:\n\n1. Morning Arrival: Dr. Smith initially stated he arrived at 8:00 AM, but later mentioned seeing the plaintiff "right as the clinic opened at 9:00 AM."\n2. The Phone Call: He claims he made the referral call before lunch, but the provided phone records show the call was placed at 2:15 PM.\n3. Documentation: Dr. Smith testified he signed off on the charts immediately, but the metadata indicates the files were modified two days later.\n\nWould you like me to pull the specific page and line numbers for these statements?',
        time: '9:42 AM',
      },
    ],
  },
  {
    id: 'audio-evidence',
    title: 'Audio evidence analysis',
    preview: 'Key moments in the recorded call...',
    date: 'Today',
    messages: [
      {
        id: 'ae-1',
        role: 'user',
        content: 'Can you isolate the portion of the 911 call where the background noise changes?',
        time: '8:18 AM',
      },
      {
        id: 'ae-2',
        role: 'assistant',
        content: 'I have analyzed the audio file. At timestamp 02:14, there is a distinct shift in background noise, transitioning from street traffic to what sounds like an enclosed space or vehicle interior. The caller\'s vocal proximity to the microphone also changes at this point.',
        time: '8:19 AM',
      },
    ],
  },
  {
    id: 'contract-review',
    title: 'Vendor agreement review',
    preview: 'Liability clauses in the MSA...',
    date: 'Yesterday',
    messages: [
      {
        id: 'cr-1',
        role: 'user',
        content: 'I need a breakdown of the indemnification and liability clauses in the new Master Services Agreement.',
        time: '4:05 PM',
      },
    ],
  },
  {
    id: 'discovery-request',
    title: 'Opposing counsel request',
    preview: 'Drafting responses to production...',
    date: 'Mar 18',
    messages: [
      {
        id: 'dr-1',
        role: 'user',
        content: 'Help me draft objections to Request for Production #4, which asks for all internal communications over the last 5 years. It is overly broad.',
        time: '11:27 AM',
      },
    ],
  },
];

let globalConversations: Conversation[] = startingConversations;
let globalActiveId = 'new';
let globalUploadedFiles: UploadedFile[] = [];

function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function AssistantMark({ small = false }: { small?: boolean }) {
  return (
    <div className={small ? 'assistant-mark assistant-mark-small' : 'assistant-mark'} aria-hidden="true">
      <Search size={small ? 13 : 17} strokeWidth={2.5} />
    </div>
  );
}

function DiscoveryEZIcon() {
  return (
    <span className="discoveryez-icon" aria-hidden="true">
      <img src="/discoveryez-logo.png" alt="" />
    </span>
  );
}

function QuickPrompts({ onSelect, className = '' }: { onSelect: (prompt: string) => void; className?: string }) {
  return (
    <div className={`suggestion-row ${className}`}>
      {quickPrompts.map((suggestion) => (
        <button
          type="button"
          key={suggestion}
          data-testid={`button-suggestion-${suggestion.toLowerCase().replaceAll(' ', '-')}`}
          onClick={() => onSelect(suggestion)}
          className="suggestion-chip"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}

function Dropdown({
  label,
  icon,
  open,
  onToggle,
  children,
  testId,
}: {
  label: string;
  icon: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  testId: string;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        data-testid={testId}
        onClick={onToggle}
        className={`control-pill ${open ? 'control-pill-active' : ''}`}
        aria-expanded={open}
      >
        {icon}
        <span>{label}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="popover-panel absolute right-0 top-[calc(100%+8px)] z-30 w-64 p-2">
          {children}
        </div>
      )}
    </div>
  );
}

function Home() {
  const [railOpen, setRailOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [model, setModel] = useState<ModelKey>('clarity');
  const [context, setContext] = useState<ContextKey>('focused');
  const [draft, setDraft] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [conversations, setConversations] = useState(globalConversations);
  const [activeId, setActiveId] = useState(globalActiveId);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(globalUploadedFiles);
  const [isFilesOpen, setIsFilesOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const messageScrollRef = useRef<HTMLDivElement>(null);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeConversation = conversations.find((conversation) => conversation.id === activeId) ?? conversations[0];

  useEffect(() => {
    return () => {
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const scrollArea = messageScrollRef.current;
      if (scrollArea && activeConversation.messages.length > 0) {
        scrollArea.scrollTo({ top: scrollArea.scrollHeight, behavior: 'smooth' });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeId, activeConversation.messages.length, pending]);

  useEffect(() => {
    if (activeConversation.messages.length > 0) return undefined;
    const frame = window.requestAnimationFrame(() => composerRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [activeId, activeConversation.messages.length]);

  useEffect(() => {
    globalConversations = conversations;
  }, [conversations]);

  useEffect(() => {
    globalActiveId = activeId;
  }, [activeId]);

  useEffect(() => {
    globalUploadedFiles = uploadedFiles;
  }, [uploadedFiles]);

  const updateConversation = (id: string, update: (conversation: Conversation) => Conversation) => {
    setConversations((items) => items.map((conversation) => (conversation.id === id ? update(conversation) : conversation)));
  };

  const cancelPendingReply = () => {
    if (replyTimerRef.current) {
      clearTimeout(replyTimerRef.current);
      replyTimerRef.current = null;
    }
    setPending(false);
  };

  const chooseConversation = (id: string) => {
    cancelPendingReply();
    setActiveId(id);
    setDraft('');
    setAttachedFile(null);
    setCopied(false);
    if (window.innerWidth < 768) setRailOpen(false);
  };

  const createConversation = () => {
    cancelPendingReply();
    const fresh: Conversation = {
      id: makeId('conversation'),
      title: 'Untitled conversation',
      preview: 'A fresh page for your matter...',
      date: 'Just now',
      messages: [],
    };
    setConversations((items) => [fresh, ...items]);
    setActiveId(fresh.id);
    setDraft('');
    setAttachedFile(null);
    setCopied(false);
    if (window.innerWidth < 768) setRailOpen(false);
  };

  const handleSend = (event?: FormEvent) => {
    event?.preventDefault();
    const messageText = draft.trim();
    if ((!messageText && !attachedFile) || pending) return;
    const attachmentText = attachedFile ? `\n\nAttached: ${attachedFile.name}` : '';
    const userMessage: Message = {
      id: makeId('user'),
      role: 'user',
      content: `${messageText}${attachmentText}`,
      time: formatTime(),
    };
    const conversationId = activeConversation.id;
    updateConversation(conversationId, (conversation) => ({
      ...conversation,
      title: conversation.messages.length === 0 && messageText ? messageText.slice(0, 35) : conversation.title,
      preview: messageText || `Attached ${attachedFile?.name ?? 'a file'}`,
      messages: [...conversation.messages, userMessage],
    }));
    setDraft('');
    setAttachedFile(null);
    setPending(true);
    replyTimerRef.current = setTimeout(() => {
      const reply =
        model === 'quick'
          ? 'I found 3 references to that clause. The most relevant is on page 14, section 2.1.'
          : model === 'depth'
            ? 'Based on a thorough review of the provided files, there are several key liabilities to consider. First, the indemnification clause on page 14 places undue burden on our client. Second, the arbitration venue is not specified, which could lead to jurisdictional issues.'
            : 'I can help with that. To give you the best analysis, would you like me to focus on the financial implications, or the general liability risks?';
      updateConversation(conversationId, (conversation) => ({
        ...conversation,
        preview: reply.slice(0, 48) + '...',
        messages: [...conversation.messages, { id: makeId('assistant'), role: 'assistant', content: reply, time: formatTime() }],
      }));
      replyTimerRef.current = null;
      setPending(false);
    }, 1250);
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const grouped = {
    Today: conversations.filter((item) => item.date === 'Today' || item.date === 'Just now'),
    Earlier: conversations.filter((item) => item.date !== 'Today' && item.date !== 'Just now'),
  };

  const selectPrompt = (prompt: string) => {
    setDraft(prompt);
    window.requestAnimationFrame(() => composerRef.current?.focus());
  };

  const composer = (
    <div className={`composer-wrap ${activeConversation.messages.length > 0 ? 'composer-wrap-settled' : 'composer-wrap-initial'}`}>
      {attachedFile && (
        <div className="attachment-preview message-enter">
          <FileText size={15} />
          <span>{attachedFile.name}</span>
          <button type="button" data-testid="button-remove-attachment" onClick={() => setAttachedFile(null)} aria-label="Remove attachment"><X size={14} /></button>
        </div>
      )}
      <form onSubmit={handleSend} className="composer-glow composer">
        <textarea
          value={draft}
          ref={composerRef}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleComposerKeyDown}
          data-testid="input-message-composer"
          aria-label="Message"
          placeholder="Ask a question about your evidence..."
          rows={1}
        />
        <div className="composer-footer">
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              data-testid="input-attachment"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setAttachedFile(file);
                  const newFile = {
                    id: makeId('file'),
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    uploadedAt: formatTime()
                  };
                  setUploadedFiles(prev => [newFile, ...prev]);
                }
                if (event.target) event.target.value = '';
              }}
            />
            <button type="button" data-testid="button-attach-file" onClick={() => fileInputRef.current?.click()} className="composer-tool" aria-label="Attach a file">
              <Paperclip size={17} />
            </button>
            <button type="button" data-testid="button-view-files" onClick={() => setIsFilesOpen(true)} className="composer-tool" aria-label="View uploaded files">
              <Folder size={17} />
            </button>
            <span className="composer-hint hidden sm:block">Shift + Enter for a new line</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="context-caption hidden lg:inline">{contexts[context].detail}</span>
            <button type="submit" data-testid="button-send-message" disabled={(!draft.trim() && !attachedFile) || pending} className="send-button" aria-label="Send message">
              <ArrowUp size={17} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </form>
      <div className="composer-disclaimer"><span className="status-dot" /> Your case data is encrypted and secure</div>
    </div>
  );

  return (
    <main className="chat-shell noise-layer flex min-h-[100dvh] w-full">
      {railOpen && (
        <button
          type="button"
          data-testid="button-close-rail-overlay"
          aria-label="Close conversation history"
          className="rail-overlay md:hidden"
          onClick={() => setRailOpen(false)}
        />
      )}

      <aside className={`conversation-rail ${railOpen ? 'conversation-rail-open' : 'conversation-rail-closed'}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-5 pb-7 pt-6">
            <button type="button" data-testid="button-brand-home" onClick={createConversation} className="brand-lockup">
              <img src="/discoveryez-logo.png" alt="DiscoveryEZ" />
            </button>
            <button
              type="button"
              data-testid="button-close-rail"
              onClick={() => setRailOpen(false)}
              className="icon-button subtle md:flex hidden"
              aria-label="Collapse conversation history"
            >
              <PanelLeftClose size={17} />
            </button>
            <button
              type="button"
              data-testid="button-close-mobile-rail"
              onClick={() => setRailOpen(false)}
              className="icon-button subtle md:hidden"
              aria-label="Close conversation history"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-3">
            <button type="button" data-testid="button-new-conversation" onClick={createConversation} className="new-conversation-button">
              <Plus size={17} strokeWidth={1.8} />
              <span>New conversation</span>
              <span className="new-shortcut">⌘ N</span>
            </button>
          </div>

          <div className="px-5 pb-4 pt-7">
            <div className="search-field">
              <Search size={15} />
              <input data-testid="input-search-conversations" aria-label="Search conversations" placeholder="Search your case files" />
              <span className="search-shortcut">⌘ K</span>
            </div>
          </div>

          <nav className="scroll-soft min-h-0 flex-1 overflow-y-auto px-3 pb-4" aria-label="Conversation history">
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="mb-7">
                <div className="history-label px-3">{group}</div>
                <div className="space-y-1">
                  {items.map((conversation) => (
                    <button
                      type="button"
                      key={conversation.id}
                      data-testid={`button-conversation-${conversation.id}`}
                      onClick={() => chooseConversation(conversation.id)}
                      className={`conversation-item ${activeConversation.id === conversation.id ? 'conversation-item-active' : ''}`}
                    >
                      <MessageCircle size={15} strokeWidth={1.7} />
                      <span className="min-w-0 flex-1 text-left">
                        <span className="conversation-title">{conversation.title}</span>
                        <span className="conversation-preview">{conversation.preview}</span>
                      </span>
                      {activeConversation.id === conversation.id && <span className="active-indicator" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-[hsl(var(--sidebar-border))] p-3 relative">
            <button type="button" data-testid="button-account" onClick={() => setProfileOpen((value) => !value)} className="account-button">
              <span className="avatar">AM</span>
              <span className="min-w-0 flex-1 text-left">
                <span className="account-name">Alex Morgan</span>
                <span className="account-plan">Firm Workspace</span>
              </span>
              <MoreHorizontal size={16} />
            </button>
            {profileOpen && (
              <div className="profile-popover absolute bottom-[calc(100%-8px)] left-3 right-3 z-30">
                <Link href="/settings/account" data-testid="link-settings-account" onClick={() => setProfileOpen(false)}>
                  <Settings2 size={15} /> Account Settings
                </Link>
                <Link href="/settings/billing" data-testid="link-settings-billing" onClick={() => setProfileOpen(false)}>
                  <CreditCard size={15} /> Billing & usage
                </Link>
                <Link href="/settings/support" data-testid="link-settings-support" onClick={() => setProfileOpen(false)}>
                  <LifeBuoy size={15} /> Support
                </Link>
              </div>
            )}
          </div>
        </div>
      </aside>

      <section className={`relative flex min-w-0 flex-1 flex-col ${activeConversation.messages.length === 0 ? 'conversation-empty' : ''}`}>
        <header className="conversation-header">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              data-testid="button-open-rail"
              onClick={() => setRailOpen(true)}
              className={`icon-button subtle ${railOpen ? 'md:hidden' : ''}`}
              aria-label="Open conversation history"
            >
              {railOpen ? <Menu size={19} /> : <PanelLeftOpen size={18} />}
            </button>
            <div className="min-w-0">
              <div className="eyebrow">Conversation</div>
              <h1 data-testid="text-active-conversation" className="header-title truncate">{activeConversation.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dropdown
              label={models[model].name}
              icon={<Sparkles size={14} />}
              open={modelOpen}
              onToggle={() => { setModelOpen((value) => !value); setContextOpen(false); }}
              testId="button-model-control"
            >
              {(Object.entries(models) as [ModelKey, { name: string; detail: string }][]).map(([key, option]) => (
                <button
                  type="button"
                  key={key}
                  data-testid={`button-model-${key}`}
                  className="popover-option"
                  onClick={() => { setModel(key); setModelOpen(false); }}
                >
                  <span><strong>{option.name}</strong><small>{option.detail}</small></span>
                  {model === key && <Check size={15} />}
                </button>
              ))}
            </Dropdown>
            <Dropdown
              label={contexts[context].name}
              icon={<Settings2 size={14} />}
              open={contextOpen}
              onToggle={() => { setContextOpen((value) => !value); setModelOpen(false); }}
              testId="button-context-control"
            >
              {(Object.entries(contexts) as [ContextKey, { name: string; detail: string }][]).map(([key, option]) => (
                <button
                  type="button"
                  key={key}
                  data-testid={`button-context-${key}`}
                  className="popover-option"
                  onClick={() => { setContext(key); setContextOpen(false); }}
                >
                  <span><strong>{option.name}</strong><small>{option.detail}</small></span>
                  {context === key && <Check size={15} />}
                </button>
              ))}
            </Dropdown>
            <button type="button" data-testid="button-more-conversation" onClick={() => setProfileOpen((value) => !value)} className="icon-button subtle hidden sm:flex" aria-label="Conversation options">
              <MoreHorizontal size={18} />
            </button>
          </div>
        </header>

        <div ref={messageScrollRef} className="scroll-soft flex min-h-0 flex-1 flex-col overflow-y-auto">
          {activeConversation.messages.length === 0 ? (
            <div className="empty-state message-enter">
              <div className="empty-orbit"><DiscoveryEZIcon /></div>
              <div className="eyebrow">Discovery Workspace</div>
              <h2>What are we reviewing today?</h2>
              <p>Upload a legal document, deposition audio, or evidence file to begin analysis.</p>
              {composer}
              <QuickPrompts onSelect={selectPrompt} />
            </div>
          ) : (
            <div className="message-column">
              <div className="conversation-intro message-enter">
                <div className="intro-rule" />
                <span>Today, {activeConversation.messages[0]?.time ?? formatTime()}</span>
                <div className="intro-rule" />
              </div>
              {activeConversation.messages.map((message, index) => (
                <article key={message.id} data-testid={`message-${message.role}-${index}`} className={`message-block message-enter ${message.role === 'user' ? 'message-user' : 'message-assistant'}`}>
                  {message.role === 'assistant' ? <AssistantMark /> : <span className="user-mark">AM</span>}
                  <div className="min-w-0 flex-1">
                    <div className="message-meta">
                      <span>{message.role === 'assistant' ? 'DiscoveryEZ' : 'You'}</span>
                      <span>{message.time}</span>
                    </div>
                    <div className="message-content">
                      {message.content.split('\n').map((line, lineIndex) => (
                        <p key={`${message.id}-${lineIndex}`} className={line ? '' : 'message-spacer'}>{line || '\u00a0'}</p>
                      ))}
                    </div>
                    {message.role === 'assistant' && (
                      <div className="message-actions">
                        <button type="button" data-testid={`button-copy-message-${message.id}`} onClick={() => handleCopy(message.content)} aria-label="Copy response">{copied ? <Check size={14} /> : <Copy size={14} />}</button>
                        <button type="button" data-testid={`button-like-message-${message.id}`} onClick={() => undefined} aria-label="Like response"><ThumbsUp size={14} /></button>
                        <button type="button" data-testid={`button-dislike-message-${message.id}`} onClick={() => undefined} aria-label="Dislike response"><ThumbsDown size={14} /></button>
                        <button type="button" data-testid={`button-retry-message-${message.id}`} onClick={() => setDraft('Could you clarify the legal reasoning?')} aria-label="Ask for another response"><RotateCcw size={14} /></button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
              {pending && (
                <div data-testid="status-assistant-thinking" className="message-block message-assistant message-enter">
                  <AssistantMark />
                  <div className="thinking-bubble">
                    <span className="thinking-dot" /><span className="thinking-dot" /><span className="thinking-dot" />
                    <span className="thinking-label">Thinking through it</span>
                  </div>
                </div>
              )}
              <div className="h-12" />
            </div>
          )}
        </div>

        {activeConversation.messages.length > 0 && (
          <div className="composer-dock">
            <QuickPrompts onSelect={selectPrompt} className="post-message-prompts" />
            {composer}
          </div>
        )}

        {isFilesOpen && (
          <div className="modal-overlay" onClick={() => setIsFilesOpen(false)}>
            <div className="files-modal" onClick={e => e.stopPropagation()}>
              <header className="files-modal-header">
                <h3>Your files</h3>
                <button type="button" onClick={() => setIsFilesOpen(false)} className="icon-button subtle"><X size={18}/></button>
              </header>
              
              <div className="files-modal-content scroll-soft">
                {uploadedFiles.length === 0 ? (
                  <div className="files-empty">
                    <div className="empty-icon"><Folder size={24} /></div>
                    <h4>No files yet</h4>
                    <p>Files you upload in your conversations will appear here for easy access.</p>
                  </div>
                ) : (
                  <ul className="file-list">
                    {uploadedFiles.map(f => (
                      <li key={f.id} className="file-list-item">
                        <div className="file-icon"><FileText size={16} strokeWidth={1.5} /></div>
                        <div className="file-details">
                          <span className="file-name">{f.name}</span>
                          <span className="file-meta">{formatBytes(f.size)} • {f.uploadedAt}</span>
                        </div>
                        <button type="button" onClick={() => removeFile(f.id)} className="icon-button subtle" aria-label="Remove file"><X size={14}/></button>
                      </li>
                    ))}
                  </ul>
                )}
                
                <div className="files-integrations">
                  <div className="integration-label">Connect storage</div>
                  <div className="integration-buttons">
                    <a href={INTEGRATION_URLS.googleDrive} className="integration-btn">
                      <SiGoogledrive size={15} />
                      <span>Google Drive</span>
                    </a>
                    <a href={INTEGRATION_URLS.dropbox} className="integration-btn">
                      <SiDropbox size={15} />
                      <span>Dropbox</span>
                    </a>
                  </div>
                </div>
              </div>
              
              <footer className="files-modal-footer">
                <button type="button" onClick={() => { setIsFilesOpen(false); fileInputRef.current?.click(); }} className="attach-more-btn">
                  <Plus size={15} /> Attach another file
                </button>
              </footer>
            </div>
          </div>
        )}

      </section>
    </main>
  );
}

function RedirectTo({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation(to); }, [to, setLocation]);
  return null;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/settings/account" component={SettingsAccount} />
        <Route path="/settings/billing" component={SettingsBilling} />
        <Route path="/settings/support" component={SettingsSupport} />
        <Route path="/settings" component={() => <RedirectTo to="/settings/account" />} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
