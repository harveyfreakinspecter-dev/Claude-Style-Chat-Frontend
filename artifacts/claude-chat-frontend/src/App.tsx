import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ArrowUp,
  Asterisk,
  Check,
  ChevronDown,
  CircleDot,
  Clock3,
  Copy,
  FileText,
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
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

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

const queryClient = new QueryClient();

const models: Record<ModelKey, { name: string; detail: string }> = {
  clarity: { name: 'Clarity', detail: 'Thoughtful & balanced' },
  depth: { name: 'Depth', detail: 'Long-form reasoning' },
  quick: { name: 'Quick', detail: 'Fast & direct' },
};

const contexts: Record<ContextKey, { name: string; detail: string }> = {
  focused: { name: 'Focused', detail: 'This conversation only' },
  balanced: { name: 'Balanced', detail: 'Conversation + saved notes' },
  open: { name: 'Open context', detail: 'Everything in your space' },
};

const startingConversations: Conversation[] = [
  {
    id: 'week',
    title: 'A clearer week',
    preview: 'The shape of a week that leaves room...',
    date: 'Today',
    messages: [
      {
        id: 'week-1',
        role: 'user',
        content: 'I want to plan a clearer week without packing every hour. What should I think about first?',
        time: '9:41 AM',
      },
      {
        id: 'week-2',
        role: 'assistant',
        content:
          'Start with the shape of the week, not the list of tasks.\n\nChoose one thing you want the week to make possible. Then protect two or three stretches of unclaimed time around it. The useful constraint is not “how much can fit?” but “what deserves my best attention?”\n\nFrom there, give each day a small center of gravity: one meaningful move, one practical maintenance task, and enough space for the day to surprise you.',
        time: '9:42 AM',
      },
    ],
  },
  {
    id: 'ambition',
    title: 'The right amount of ambition',
    preview: 'A note on building with patience...',
    date: 'Today',
    messages: [
      {
        id: 'ambition-1',
        role: 'user',
        content: 'How do I tell the difference between patience and avoidance?',
        time: '8:18 AM',
      },
      {
        id: 'ambition-2',
        role: 'assistant',
        content: 'Patience keeps you in contact with the work. Avoidance helps you feel temporarily free of it. Look for the smallest honest next step.',
        time: '8:19 AM',
      },
    ],
  },
  {
    id: 'reading',
    title: 'Reading list for spring',
    preview: 'Books that ask better questions...',
    date: 'Yesterday',
    messages: [
      {
        id: 'reading-1',
        role: 'user',
        content: 'I want a reading list with more essays and fewer obligations.',
        time: '4:05 PM',
      },
    ],
  },
  {
    id: 'rhythm',
    title: 'Notes on a new rhythm',
    preview: 'What I am learning about mornings...',
    date: 'Mar 18',
    messages: [
      {
        id: 'rhythm-1',
        role: 'user',
        content: 'Help me notice what is working in my morning routine.',
        time: '11:27 AM',
      },
    ],
  },
];

function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function AssistantMark({ small = false }: { small?: boolean }) {
  return (
    <div className={small ? 'assistant-mark assistant-mark-small' : 'assistant-mark'} aria-hidden="true">
      <Asterisk size={small ? 13 : 17} strokeWidth={1.7} />
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
  const [activeId, setActiveId] = useState('week');
  const [draft, setDraft] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [conversations, setConversations] = useState(startingConversations);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeConversation = conversations.find((conversation) => conversation.id === activeId) ?? conversations[0];

  useEffect(() => {
    return () => {
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    };
  }, []);

  const updateConversation = (id: string, update: (conversation: Conversation) => Conversation) => {
    setConversations((items) => items.map((conversation) => (conversation.id === id ? update(conversation) : conversation)));
  };

  const chooseConversation = (id: string) => {
    setActiveId(id);
    setPending(false);
    setDraft('');
    if (window.innerWidth < 768) setRailOpen(false);
  };

  const createConversation = () => {
    const fresh: Conversation = {
      id: makeId('conversation'),
      title: 'Untitled conversation',
      preview: 'A fresh page for your thoughts...',
      date: 'Just now',
      messages: [],
    };
    setConversations((items) => [fresh, ...items]);
    setActiveId(fresh.id);
    setDraft('');
    setPending(false);
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
          ? 'A useful place to begin: name what matters, then make the next step smaller than your resistance.'
          : model === 'depth'
            ? 'Let’s stay with the question for a moment. The clearest next move is usually not a complete plan, but a small decision that changes what becomes possible after it. What would you be willing to make visible today?'
            : 'Let’s make this lighter. Name the part that feels most alive or most stuck, and we can give it a little shape without needing to solve everything at once.';
      updateConversation(conversationId, (conversation) => ({
        ...conversation,
        preview: reply.slice(0, 48) + '...',
        messages: [...conversation.messages, { id: makeId('assistant'), role: 'assistant', content: reply, time: formatTime() }],
      }));
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

  const grouped = {
    Today: conversations.filter((item) => item.date === 'Today' || item.date === 'Just now'),
    Earlier: conversations.filter((item) => item.date !== 'Today' && item.date !== 'Just now'),
  };

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
              <span className="brand-mark"><CircleDot size={17} strokeWidth={1.8} /></span>
              <span>stillroom</span>
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
              <input data-testid="input-search-conversations" aria-label="Search conversations" placeholder="Search your thinking" />
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

          <div className="border-t border-[hsl(var(--sidebar-border))] p-3">
            <button type="button" data-testid="button-account" onClick={() => setProfileOpen((value) => !value)} className="account-button">
              <span className="avatar">AM</span>
              <span className="min-w-0 flex-1 text-left">
                <span className="account-name">Alex Morgan</span>
                <span className="account-plan">Personal space</span>
              </span>
              <MoreHorizontal size={16} />
            </button>
            {profileOpen && (
              <div className="profile-popover">
                <button type="button" data-testid="button-settings" onClick={() => setProfileOpen(false)}><Settings2 size={15} /> Settings</button>
                <button type="button" data-testid="button-help" onClick={() => setProfileOpen(false)}><Clock3 size={15} /> Your activity</button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <section className="relative flex min-w-0 flex-1 flex-col">
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

        <div className="scroll-soft flex min-h-0 flex-1 flex-col overflow-y-auto">
          {activeConversation.messages.length === 0 ? (
            <div className="empty-state message-enter">
              <div className="empty-orbit"><AssistantMark /></div>
              <div className="eyebrow">A little room to think</div>
              <h2>What are you carrying today?</h2>
              <p>Start with a question, a half-formed idea, or something you want to make a little clearer.</p>
              <div className="suggestion-row">
                {['Help me find the first step', 'Make sense of this idea', 'Give me a gentler plan'].map((suggestion) => (
                  <button
                    type="button"
                    key={suggestion}
                    data-testid={`button-suggestion-${suggestion.toLowerCase().replaceAll(' ', '-')}`}
                    onClick={() => { setDraft(suggestion); }}
                    className="suggestion-chip"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
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
                      <span>{message.role === 'assistant' ? 'stillroom' : 'You'}</span>
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
                        <button type="button" data-testid={`button-retry-message-${message.id}`} onClick={() => setDraft('Could you say that another way?')} aria-label="Ask for another response"><RotateCcw size={14} /></button>
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

        <div className="composer-wrap">
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
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              data-testid="input-message-composer"
              aria-label="Message"
              placeholder="Write what is on your mind..."
              rows={1}
            />
            <div className="composer-footer">
              <div className="flex items-center gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  data-testid="input-attachment"
                  className="hidden"
                  onChange={(event) => setAttachedFile(event.target.files?.[0] ?? null)}
                />
                <button type="button" data-testid="button-attach-file" onClick={() => fileInputRef.current?.click()} className="composer-tool" aria-label="Attach a file">
                  <Paperclip size={17} />
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
          <div className="composer-disclaimer"><span className="status-dot" /> Your conversations stay in this space</div>
        </div>
      </section>
    </main>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
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
