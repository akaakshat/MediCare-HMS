import React, { useEffect, useMemo, useState } from 'react';
import { Bot, SendHorizonal, RefreshCw, ShieldCheck, Sparkles, X } from 'lucide-react';
import { ApiClient } from '../../utils/api';
import { getSuggestedQuestions, getSupportResponse } from '../../utils/supportAssistant';

interface ITSupportAssistantProps {
  role?: string;
  permissions?: string[];
  features?: string[];
  currentModule?: string;
  userName?: string;
}

export const ITSupportAssistant: React.FC<ITSupportAssistantProps> = ({
  role = '',
  permissions = [],
  features = [],
  currentModule = 'dashboard',
  userName = 'there',
}) => {
  const effectivePermissions = useMemo(
    () => [...permissions, ...features].filter(Boolean),
    [permissions, features]
  );

  const [articles, setArticles] = useState<any[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const loadArticles = async () => {
      try {
        setLoadingArticles(true);
        const response = await ApiClient.get('/support-articles');
        if (response?.success) {
          setArticles(response.articles || []);
        }
      } catch (error) {
        console.error('Unable to load support articles', error);
      } finally {
        setLoadingArticles(false);
      }
    };

    void loadArticles();
  }, []);

  const context = useMemo(
    () => ({ role, effectivePermissions, currentModule, articles }),
    [role, effectivePermissions, currentModule, articles]
  );

  const suggestions = useMemo(() => getSuggestedQuestions(context), [context]);
  const [messages, setMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string; response?: any }>>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Welcome to IT support. I can help with login, permissions, appointments, patient records, EMR, and billing based on your access.',
      response: {
        id: 'welcome',
        title: 'How can I help?',
        answer: 'Tell me what you are trying to do, and I’ll guide you to the right next step for your role and access level.',
        steps: ['Describe the issue briefly', 'Choose a quick-help topic', 'Follow the suggested steps'],
      },
    },
  ]);
  const [draft, setDraft] = useState('');

  const resetChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Welcome to IT support. I can help with login, permissions, appointments, patient records, EMR, and billing based on your access.',
        response: {
          id: 'welcome',
          title: 'How can I help?',
          answer: 'Tell me what you are trying to do, and I’ll guide you to the right next step for your role and access level.',
          steps: ['Describe the issue briefly', 'Choose a quick-help topic', 'Follow the suggested steps'],
        },
      },
    ]);
    setDraft('');
  };

  const handleAsk = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;

    const response = getSupportResponse(trimmed, context);
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', content: trimmed },
      { id: `assistant-${Date.now() + 1}`, role: 'assistant', content: response.answer, response },
    ]);
    setDraft('');

    try {
      const aiResponse = await ApiClient.post('/support-assistant/ask', {
        question: trimmed,
        context: { role, effectivePermissions, currentModule },
        articles,
      });

      if (aiResponse?.success && aiResponse?.message && aiResponse.source === 'ai') {
        setMessages((prev) => [
          ...prev,
          { id: `assistant-ai-${Date.now() + 2}`, role: 'assistant', content: aiResponse.message, response: { title: 'AI Help', answer: aiResponse.message, steps: [] } },
        ]);
      }
    } catch (error) {
      console.error('AI support request failed', error);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    handleAsk(draft);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-600/30 transition hover:scale-105"
        aria-label="Open support assistant"
      >
        <Bot className="h-7 w-7" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[60] bg-black/35 backdrop-blur-sm">
          <div className="flex h-full justify-end">
            <div className="flex h-full w-full max-w-[430px] flex-col overflow-hidden rounded-l-3xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-4 text-white">
                <div>
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">IT Support</h3>
                  </div>
                  <p className="mt-1 text-sm text-blue-50">Hello {userName}, I’m here to help.</p>
                </div>
                <button type="button" onClick={() => setIsOpen(false)} className="rounded-full p-2 text-white hover:bg-white/20" aria-label="Close support assistant">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
                <div className="rounded-2xl border border-blue-100 bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-sm font-semibold">Live guidance</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">Ask about access, appointments, EMR, billing, or login and I’ll guide you.</p>
                </div>

                <div className="mt-4 space-y-3">
                  {messages.map((message) => (
                    <div key={message.id} className={`rounded-2xl px-3 py-3 ${message.role === 'user' ? 'ml-6 bg-slate-900 text-slate-100' : 'mr-6 border border-slate-200 bg-white text-slate-700'}`}>
                      <div className="text-[11px] uppercase tracking-wide text-slate-400">
                        {message.role === 'user' ? 'You' : 'Support'}
                      </div>
                      {message.role === 'assistant' ? (
                        <div>
                          <div className="mt-1 font-semibold text-slate-900">{message.response?.title || 'Support reply'}</div>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{message.content}</p>
                          {message.response?.steps?.length ? (
                            <ul className="mt-2 space-y-1 text-sm text-slate-600">
                              {message.response.steps.map((step: string, index: number) => (
                                <li key={`${message.id}-${index}`} className="flex gap-2">
                                  <span className="text-emerald-500">•</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-slate-200">{message.content}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">{messages.length > 1 ? 'Conversation' : 'Quick help'}</p>
                  <button type="button" onClick={resetChat} className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reset
                  </button>
                </div>
                {messages.length <= 1 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {loadingArticles ? (
                      <span className="text-sm text-gray-500">Loading help topics...</span>
                    ) : suggestions.length > 0 ? (
                      suggestions.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleAsk(item.title)}
                          className="rounded-full bg-blue-50 px-3 py-2 text-sm text-blue-700 transition hover:bg-blue-100"
                        >
                          {item.title}
                        </button>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">No topics available yet.</span>
                    )}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Ask about access, appointments, EMR, billing..."
                    className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <button type="submit" className="inline-flex items-center rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                    <SendHorizonal className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
