import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Save, X, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { ApiClient } from '../../../utils/api';

interface SupportArticle {
  _id: string;
  title: string;
  slug: string;
  keywords: string[];
  roles: string[];
  requiresFeatures: string[];
  answer: string;
  steps: string[];
  module: string;
  isActive: boolean;
}

const ROLE_OPTIONS = ['admin', 'doctor', 'nurse', 'receptionist', 'staff'];
const FEATURE_OPTIONS = [
  'dashboard.view',
  'patients.view',
  'appointments.view',
  'doctors.view',
  'emr.view',
  'pharmacy.view',
  'billing.view',
  'icd.view',
  'reports.view',
  'users.view',
  'settings.view',
];

const emptyArticle = (): SupportArticle => ({
  _id: '',
  title: '',
  slug: '',
  keywords: [],
  roles: [],
  requiresFeatures: [],
  answer: '',
  steps: [''],
  module: 'dashboard',
  isActive: true,
});

const defaultArticleTemplate = (): SupportArticle => ({
  _id: '',
  title: 'How do I access this feature?',
  slug: 'how-do-i-access-this-feature',
  keywords: ['access', 'feature', 'help'],
  roles: ['staff'],
  requiresFeatures: ['dashboard.view'],
  answer: 'You can access this feature from the main navigation once your role and permissions allow it. If you still cannot see it, contact the support team.',
  steps: [
    'Open the relevant module from the sidebar.',
    'Check that your role has access to the feature.',
    'If you still cannot proceed, contact support or your administrator.',
  ],
  module: 'dashboard',
  isActive: true,
});

export const SupportArticleManagement: React.FC = () => {
  const [articles, setArticles] = useState<SupportArticle[]>([]);
  const [editingArticle, setEditingArticle] = useState<SupportArticle | null>(null);
  const [draft, setDraft] = useState<SupportArticle>(emptyArticle());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      setLoading(true);
      const response = await ApiClient.get('/support-articles');
      if (response?.success) {
        setArticles(response.articles || []);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load support articles');
    } finally {
      setLoading(false);
    }
  };

  const startNewArticle = () => {
    setEditingArticle(null);
    setDraft(defaultArticleTemplate());
  };

  const startEditArticle = (article: SupportArticle) => {
    setEditingArticle(article);
    setDraft({ ...article, keywords: [...article.keywords], roles: [...article.roles], requiresFeatures: [...article.requiresFeatures], steps: [...article.steps] });
  };

  const saveArticle = async () => {
    if (!draft.title.trim() || !draft.answer.trim()) {
      toast.error('Title and answer are required');
      return;
    }

    const payload = {
      ...draft,
      slug: draft.slug || draft.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      keywords: draft.keywords.filter(Boolean),
      roles: draft.roles.filter(Boolean),
      requiresFeatures: draft.requiresFeatures.filter(Boolean),
      steps: draft.steps.filter((step) => step && step.trim()),
    };

    try {
      setSaving(true);
      const response = editingArticle?._id
        ? await ApiClient.put(`/support-articles/${editingArticle._id}`, payload)
        : await ApiClient.post('/support-articles', payload);

      if (response?.success) {
        toast.success(editingArticle?._id ? 'Support article updated' : 'Support article created');
        setDraft(emptyArticle());
        setEditingArticle(null);
        await loadArticles();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save support article');
    } finally {
      setSaving(false);
    }
  };

  const deleteArticle = async (article: SupportArticle) => {
    if (!window.confirm(`Delete support article "${article.title}"?`)) return;

    try {
      const response = await ApiClient.delete(`/support-articles/${article._id}`);
      if (response?.success) {
        toast.success('Support article deleted');
        await loadArticles();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete support article');
    }
  };

  const updateListField = (field: 'keywords' | 'roles' | 'requiresFeatures' | 'steps', value: string, index?: number) => {
    const current = [...(draft[field] as string[])];
    if (typeof index === 'number') {
      current[index] = value;
    } else {
      current.push(value);
    }
    setDraft({ ...draft, [field]: current });
  };

  const addDistinctListItem = (field: 'roles' | 'requiresFeatures', value: string) => {
    if (!value) return;
    const current = [...(draft[field] as string[])];
    if (!current.includes(value)) {
      current.push(value);
      setDraft({ ...draft, [field]: current });
    }
  };

  const removeListItem = (field: 'keywords' | 'roles' | 'requiresFeatures' | 'steps', index: number) => {
    const current = [...(draft[field] as string[])];
    current.splice(index, 1);
    setDraft({ ...draft, [field]: current });
  };

  const articleCount = useMemo(() => articles.length, [articles]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Support Articles</h1>
          <p className="mt-1 text-sm text-gray-600">Create and manage help content for the IT support assistant.</p>
        </div>
        <button
          onClick={startNewArticle}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Article
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-800">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Existing articles</h2>
          </div>

          {loading ? (
            <div className="mt-4 text-sm text-gray-500">Loading articles...</div>
          ) : articles.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
              No support articles yet. Create the first one.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {articles.map((article) => (
                <div key={article._id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-900">{article.title}</div>
                      <div className="mt-1 text-sm text-gray-500">{article.module} • {article.roles.join(', ') || 'all roles'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEditArticle(article)} className="rounded p-1.5 text-blue-600 hover:bg-blue-50" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteArticle(article)} className="rounded p-1.5 text-red-600 hover:bg-red-50" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 line-clamp-3">{article.answer}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{editingArticle ? 'Edit article' : 'Create article'}</h2>
            <div className="text-sm text-gray-500">{articleCount} total</div>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
              <input
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="How do I book an appointment?"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Slug</label>
              <input
                value={draft.slug}
                onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="book-appointment"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Module</label>
              <input
                value={draft.module}
                onChange={(event) => setDraft({ ...draft, module: event.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="appointments"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Answer</label>
              <textarea
                value={draft.answer}
                onChange={(event) => setDraft({ ...draft, answer: event.target.value })}
                rows={5}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Write the help response shown to the user."
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Roles</label>
              <div className="space-y-2">
                {draft.roles.map((role, index) => (
                  <div key={`role-${index}`} className="flex gap-2">
                    <select
                      value={role}
                      onChange={(event) => updateListField('roles', event.target.value, index)}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      title={`Role ${index + 1}`}
                      aria-label={`Role ${index + 1}`}
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => removeListItem('roles', index)} className="rounded-lg border border-gray-300 p-2 text-gray-600" title="Remove role"><X className="h-4 w-4" /></button>
                  </div>
                ))}
                <select
                  defaultValue=""
                  onChange={(event) => {
                    addDistinctListItem('roles', event.target.value);
                    event.target.value = '';
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">+ Add role</option>
                  {ROLE_OPTIONS.filter((option) => !draft.roles.includes(option)).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Required features</label>
              <div className="space-y-2">
                {draft.requiresFeatures.map((feature, index) => (
                  <div key={`feature-${index}`} className="flex gap-2">
                    <select
                      value={feature}
                      onChange={(event) => updateListField('requiresFeatures', event.target.value, index)}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      title={`Required feature ${index + 1}`}
                      aria-label={`Required feature ${index + 1}`}
                    >
                      {FEATURE_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => removeListItem('requiresFeatures', index)} className="rounded-lg border border-gray-300 p-2 text-gray-600" title="Remove feature"><X className="h-4 w-4" /></button>
                  </div>
                ))}
                <select
                  defaultValue=""
                  onChange={(event) => {
                    addDistinctListItem('requiresFeatures', event.target.value);
                    event.target.value = '';
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">+ Add feature</option>
                  {FEATURE_OPTIONS.filter((option) => !draft.requiresFeatures.includes(option)).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <h3 className="text-sm font-semibold text-blue-900">Preview</h3>
              <p className="mt-1 text-xs text-blue-700">This is how the article will appear to users in the support assistant.</p>
              <div className="mt-3 rounded-lg border border-blue-200 bg-white p-3 shadow-sm">
                <div className="text-sm font-semibold text-gray-900">{draft.title || 'Untitled article'}</div>
                <div className="mt-2 whitespace-pre-line text-sm text-gray-700">{draft.answer || 'Your article answer will appear here.'}</div>
                {draft.steps.filter(Boolean).length > 0 && (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-600">
                    {draft.steps.filter(Boolean).map((step, index) => (
                      <li key={`preview-step-${index}`}>{step}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                  <span className="rounded-full bg-gray-100 px-2 py-1">Roles: {draft.roles.length > 0 ? draft.roles.join(', ') : 'all'}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-1">Features: {draft.requiresFeatures.length > 0 ? draft.requiresFeatures.join(', ') : 'none'}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Keywords</label>
              <div className="space-y-2">
                {draft.keywords.map((keyword, index) => (
                  <div key={`keyword-${index}`} className="flex gap-2">
                    <input
                      value={keyword}
                      onChange={(event) => updateListField('keywords', event.target.value, index)}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="e.g. appointment"
                      title={`Keyword ${index + 1}`}
                      aria-label={`Keyword ${index + 1}`}
                    />
                    <button type="button" onClick={() => removeListItem('keywords', index)} className="rounded-lg border border-gray-300 p-2 text-gray-600" title="Remove keyword"><X className="h-4 w-4" /></button>
                  </div>
                ))}
                <button onClick={() => updateListField('keywords', '')} className="text-sm text-blue-600">+ Add keyword</button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Steps</label>
              <div className="space-y-2">
                {draft.steps.map((step, index) => (
                  <div key={`step-${index}`} className="flex gap-2">
                    <input
                      value={step}
                      onChange={(event) => updateListField('steps', event.target.value, index)}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="e.g. Open the appointments module"
                      title={`Step ${index + 1}`}
                      aria-label={`Step ${index + 1}`}
                    />
                    <button type="button" onClick={() => removeListItem('steps', index)} className="rounded-lg border border-gray-300 p-2 text-gray-600" title="Remove step"><X className="h-4 w-4" /></button>
                  </div>
                ))}
                <button onClick={() => updateListField('steps', '')} className="text-sm text-blue-600">+ Add step</button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
              />
              Active article
            </label>

            <div className="flex gap-2">
              <button onClick={saveArticle} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:bg-green-400">
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : editingArticle ? 'Update article' : 'Save article'}
              </button>
              <button onClick={() => { setEditingArticle(null); setDraft(emptyArticle()); }} className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
