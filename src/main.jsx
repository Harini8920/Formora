import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity, ArrowDown, ArrowLeft, ArrowRight, BarChart3, Bell, BookOpen, Check,
  CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clipboard,
  Clock3, Copy, Download, Eye, FileText, Filter, Folder, Globe2, GripVertical,
  Home, Image, LayoutGrid, Link2, ListChecks, LogOut, Menu, Moon, MoreHorizontal,
  Plus, Search, Settings, Share2, ShieldCheck, Sparkles, Sun, Trash2, Type,
  UploadCloud, Users, WandSparkles, X, CircleDot, CalendarDays, Star, Hash,
  Mail, AlignLeft, ChevronUp, Save, LockKeyhole
} from 'lucide-react';
import './style.css';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = envUrl && envKey ? createClient(envUrl, envKey) : null;
const uid = () => Math.random().toString(36).slice(2, 10);
const starterQuestions = () => [
  { id: uid(), type: 'short', title: 'What should we call you?', required: true, description: '' },
  { id: uid(), type: 'email', title: 'Your email address', required: true, description: '' },
  { id: uid(), type: 'choice', title: 'What are you most interested in?', required: true, options: ['Design & creativity', 'Technology', 'Business', 'Something else'] }
];
const templates = [
  { name: 'Event registration', category: 'Events', icon: CalendarDays, color: 'violet', description: 'Collect attendee details and preferences.' },
  { name: 'Customer feedback', category: 'Feedback', icon: Star, color: 'amber', description: 'Learn what your customers really think.' },
  { name: 'Contact form', category: 'General', icon: Mail, color: 'blue', description: 'Make it easy for people to reach you.' },
  { name: 'Course evaluation', category: 'Education', icon: BookOpen, color: 'green', description: 'Gather useful feedback after a session.' }
];
const blankForm = (title = 'Untitled form') => ({ id: uid(), title, description: 'Add a short description to help people understand this form.', questions: [], created_at: new Date().toISOString(), responses: 0, published: false, theme: 'violet' });
const questionTypes = [
  { type: 'short', label: 'Short answer', icon: Type },
  { type: 'paragraph', label: 'Paragraph', icon: AlignLeft },
  { type: 'choice', label: 'Multiple choice', icon: CircleDot },
  { type: 'checkbox', label: 'Checkboxes', icon: ListChecks },
  { type: 'dropdown', label: 'Dropdown', icon: ChevronDown },
  { type: 'rating', label: 'Rating scale', icon: Star },
  { type: 'date', label: 'Date', icon: CalendarDays },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'email', label: 'Email', icon: Mail }
];

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('formora-theme') || 'dark');
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [forms, setForms] = useState([]);
  const [responses, setResponses] = useState({});
  const [view, setView] = useState('home');
  const [activeForm, setActiveForm] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All forms');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preview, setPreview] = useState(false);
  const [publicForm, setPublicForm] = useState(null);
  const [publicAnswers, setPublicAnswers] = useState({});
  const [publicSubmitted, setPublicSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedResponses, setSelectedResponses] = useState('all');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('formora-theme', theme);
  }, [theme]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const publicId = params.get('form');
    if (publicId) loadPublicForm(publicId);
    if (!supabase) { setAuthReady(true); loadLocalForms(); return; }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
      setAuthReady(true);
      if (data.session?.user) loadCloudForms(data.session.user.id);
      else loadLocalForms();
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) loadCloudForms(session.user.id);
      else loadLocalForms();
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const notify = (message) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
  const loadLocalForms = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('formora-forms') || '[]');
      setForms(stored);
      setResponses(JSON.parse(localStorage.getItem('formora-responses') || '{}'));
    } catch { setForms([]); }
  };
  const saveLocal = (nextForms, nextResponses = responses) => {
    localStorage.setItem('formora-forms', JSON.stringify(nextForms));
    localStorage.setItem('formora-responses', JSON.stringify(nextResponses));
  };
  async function loadCloudForms(userId) {
    const { data, error } = await supabase.from('forms').select('*').eq('owner_id', userId).order('updated_at', { ascending: false });
    if (error) { notify('Could not load cloud forms. Check Supabase setup.'); loadLocalForms(); return; }
    const mapped = (data || []).map(row => ({ ...row.content, id: row.id, title: row.title, published: row.published, created_at: row.created_at }));
    setForms(mapped);
    const ids = mapped.map(f => f.id);
    if (ids.length) {
      const { data: rs } = await supabase.from('responses').select('*').in('form_id', ids).order('created_at', { ascending: false });
      const grouped = {};
      (rs || []).forEach(r => { (grouped[r.form_id] ||= []).push({ id: r.id, answers: r.answers, created_at: r.created_at }); });
      setResponses(grouped);
    } else setResponses({});
  }
  async function persistForm(form, nextForms) {
    setForms(nextForms);
    if (!supabase || !user) { saveLocal(nextForms); return; }
    setSaving(true);
    const row = { id: form.id, owner_id: user.id, title: form.title, description: form.description || '', published: !!form.published, content: form, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('forms').upsert(row);
    setSaving(false);
    if (error) notify('Save failed: check the Supabase SQL setup.');
  }
  const updateActive = (patch) => {
    const updated = { ...activeForm, ...patch };
    setActiveForm(updated);
    persistForm(updated, forms.map(f => f.id === updated.id ? updated : f));
  };
  const createForm = (template = null) => {
    let form = blankForm(template ? template.name : 'Untitled form');
    if (template) {
      form.description = template.description;
      form.questions = template.category === 'Events' ? [
        { id: uid(), type: 'short', title: 'Full name', required: true },
        { id: uid(), type: 'email', title: 'Email address', required: true },
        { id: uid(), type: 'choice', title: 'Which session will you attend?', required: true, options: ['Morning', 'Afternoon', 'Evening'] }
      ] : template.category === 'Feedback' ? [
        { id: uid(), type: 'rating', title: 'How was your experience?', required: true },
        { id: uid(), type: 'paragraph', title: 'What could we improve?', required: false }
      ] : starterQuestions();
    }
    const next = [form, ...forms];
    setActiveForm(form); setForms(next); persistForm(form, next); setView('editor'); setShowTemplates(false); setPreview(false);
  };
  const openForm = (form) => { setActiveForm(JSON.parse(JSON.stringify(form))); setView('editor'); setPreview(false); };
  const deleteForm = async (id) => {
    const next = forms.filter(f => f.id !== id);
    setForms(next); saveLocal(next);
    if (supabase && user) await supabase.from('forms').delete().eq('id', id);
    setView('home'); setActiveForm(null); notify('Form moved to trash');
  };
  const duplicateForm = (form) => {
    const copy = { ...JSON.parse(JSON.stringify(form)), id: uid(), title: `${form.title} (copy)`, created_at: new Date().toISOString(), published: false };
    const next = [copy, ...forms]; setForms(next); persistForm(copy, next); notify('Form duplicated');
  };
  const addQuestion = (type = 'short') => {
    if (!activeForm) return;
    const q = { id: uid(), type, title: type === 'email' ? 'Email address' : 'Untitled question', description: '', required: false };
    if (['choice', 'checkbox', 'dropdown'].includes(type)) q.options = ['Option 1', 'Option 2', 'Option 3'];
    updateActive({ questions: [...(activeForm.questions || []), q] });
  };
  const updateQuestion = (id, patch) => updateActive({ questions: activeForm.questions.map(q => q.id === id ? { ...q, ...patch } : q) });
  const removeQuestion = (id) => updateActive({ questions: activeForm.questions.filter(q => q.id !== id) });
  const moveQuestion = (id, direction) => {
    const qs = [...activeForm.questions], i = qs.findIndex(q => q.id === id), j = i + direction;
    if (j < 0 || j >= qs.length) return;
    [qs[i], qs[j]] = [qs[j], qs[i]]; updateActive({ questions: qs });
  };
  const publishForm = () => {
    const updated = { ...activeForm, published: !activeForm.published };
    updateActive(updated); notify(updated.published ? 'Your form is live!' : 'Form unpublished');
  };
  const shareForm = async () => {
    const url = `${location.origin}${location.pathname}?form=${activeForm.id}`;
    try { await navigator.clipboard.writeText(url); notify('Share link copied'); }
    catch { window.prompt('Copy your form link:', url); }
  };
  const submitPublic = async (event) => {
    event.preventDefault();
    const missing = publicForm.questions.find(q => q.required && (publicAnswers[q.id] === undefined || publicAnswers[q.id] === '' || (Array.isArray(publicAnswers[q.id]) && !publicAnswers[q.id].length)));
    if (missing) { notify(`Please answer: ${missing.title}`); return; }
    const submission = { id: uid(), answers: publicAnswers, created_at: new Date().toISOString() };
    if (supabase) {
      const { error } = await supabase.from('responses').insert({ form_id: publicForm.id, answers: publicAnswers });
      if (error) { notify('Submission could not be saved. Check form policies.'); return; }
    } else {
      const stored = JSON.parse(localStorage.getItem('formora-responses') || '{}');
      stored[publicForm.id] = [...(stored[publicForm.id] || []), submission];
      localStorage.setItem('formora-responses', JSON.stringify(stored));
    }
    setPublicSubmitted(true);
  };
  async function loadPublicForm(id) {
    if (supabase) {
      const { data } = await supabase.from('forms').select('id,title,description,content,published').eq('id', id).eq('published', true).maybeSingle();
      if (data) { setPublicForm({ ...data.content, id: data.id, title: data.title, description: data.description, published: true }); return; }
    }
    const local = JSON.parse(localStorage.getItem('formora-forms') || '[]').find(f => f.id === id && f.published);
    if (local) setPublicForm(local);
  }
  const signIn = async (event) => {
    event.preventDefault(); setAuthMessage('');
    if (!supabase) { setAuthMessage('Connect Supabase using your .env file to enable accounts. Local demo mode is active.'); return; }
    const result = authMode === 'signup'
      ? await supabase.auth.signUp({ email: authEmail, password: authPassword })
      : await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
    if (result.error) setAuthMessage(result.error.message);
    else if (authMode === 'signup') setAuthMessage('Check your email to confirm your account, then sign in.');
    else { setUser(result.data.user); setView('home'); }
  };
  const signOut = async () => { if (supabase) await supabase.auth.signOut(); setUser(null); loadLocalForms(); notify('Signed out'); };
  const exportCSV = (form) => {
    const list = responses[form.id] || [];
    const qs = form.questions || [];
    const csvCell = v => `"${String(v ?? '').replaceAll('"', '""')}"`;
    const rows = [['Submitted at', ...qs.map(q => q.title)], ...list.map(r => [r.created_at, ...qs.map(q => Array.isArray(r.answers?.[q.id]) ? r.answers[q.id].join('; ') : r.answers?.[q.id] ?? '')])];
    const csv = rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })); a.download = `${form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-responses.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  const filteredForms = useMemo(() => forms.filter(f => f.title.toLowerCase().includes(search.toLowerCase()) && (filter === 'All forms' || (filter === 'Published' ? f.published : !f.published))), [forms, search, filter]);
  const totalResponses = Object.values(responses).reduce((sum, list) => sum + (list?.length || 0), 0);
  const pageTitle = view === 'home' ? 'Your workspace' : view === 'editor' ? (preview ? 'Preview form' : 'Form studio') : view === 'responses' ? 'Responses' : view === 'analytics' ? 'Analytics' : 'Settings';

  if (new URLSearchParams(location.search).has('form')) return <PublicForm form={publicForm} answers={publicAnswers} setAnswers={setPublicAnswers} submitted={publicSubmitted} onSubmit={submitPublic} theme={theme} toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />;
  if (!authReady) return <div className="loading-screen"><div className="brand-mark"><Sparkles size={23}/></div><p>Preparing your workspace…</p></div>;

  return (
    <div className="app-shell">
      <AnimatePresence>{sidebarOpen && <motion.div className="mobile-scrim" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setSidebarOpen(false)} />}</AnimatePresence>
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row"><div className="brand-mark"><Sparkles size={21}/></div><span className="brand-name">formora<span className="brand-dot">.</span></span><button className="icon-button sidebar-close" onClick={() => setSidebarOpen(false)}><X size={18}/></button></div>
        <button className="workspace-select"><div className="workspace-avatar">F</div><span><strong>Personal workspace</strong><small>{user?.email || 'Your creative space'}</small></span><ChevronDown size={15}/></button>
        <button className="primary-button create-button" onClick={() => setShowTemplates(true)}><Plus size={18}/> Create a form <span className="shortcut">⌘ K</span></button>
        <div className="nav-label">WORKSPACE</div>
        <nav className="side-nav">
          <button className={view === 'home' ? 'active' : ''} onClick={() => {setView('home');setSidebarOpen(false)}}><Home size={18}/> Overview</button>
          <button className={view === 'responses' ? 'active' : ''} onClick={() => {setView('responses');setSidebarOpen(false)}}><Clipboard size={18}/> Responses <span className="nav-count">{totalResponses}</span></button>
          <button className={view === 'analytics' ? 'active' : ''} onClick={() => {setView('analytics');setSidebarOpen(false)}}><BarChart3 size={18}/> Analytics</button>
        </nav>
        <div className="nav-label nav-label-spaced">ORGANIZE</div>
        <nav className="side-nav">
          <button onClick={() => {setFilter('All forms');setView('home')}}><Folder size={18}/> All forms <span className="nav-count">{forms.length}</span></button>
          <button onClick={() => {setFilter('Published');setView('home')}}><Globe2 size={18}/> Published</button>
          <button onClick={() => {setFilter('Drafts');setView('home')}}><FileText size={18}/> Drafts</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="upgrade-card"><div className="upgrade-spark"><Sparkles size={16}/></div><strong>Make it yours</strong><p>Beautiful forms begin with a little inspiration.</p><button onClick={() => setShowTemplates(true)}>Explore templates <ArrowRight size={14}/></button><div className="upgrade-orb orb-one"/><div className="upgrade-orb orb-two"/></div>
          <button className="profile-row" onClick={() => user ? signOut() : (setAuthMode('signin'), setView('settings'))}><div className="profile-avatar">{user?.email?.[0]?.toUpperCase() || 'G'}</div><span><strong>{user?.email || 'Guest workspace'}</strong><small>{user ? 'Click to sign out' : 'Local demo mode'}</small></span><MoreHorizontal size={18}/></button>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)}><Menu size={20}/></button><div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14}/><strong>{pageTitle}</strong></div></div><div className="topbar-actions"><div className="search-box"><Search size={16}/><input placeholder="Search anything..." value={search} onChange={e => setSearch(e.target.value)}/><kbd>⌘ K</kbd></div><button className="icon-button" title="Help" onClick={() => notify('Tip: create a form, add questions, then publish to share it.')}><CircleHelp size={18}/></button><button className="icon-button theme-toggle" title="Toggle theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button><button className="top-avatar" onClick={() => setShowSettings(true)}>{user?.email?.[0]?.toUpperCase() || 'G'}</button></div></header>
        <AnimatePresence mode="wait">
          {view === 'home' && <motion.section key="home" className="page-content" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:.2}}>
            <div className="welcome-row"><div><div className="eyebrow"><span className="live-dot"/> YOUR IDEAS, IN FORM</div><h1>Make space for <span className="gradient-text">good questions.</span></h1><p className="page-subtitle">Create thoughtful forms and turn every response into a little more clarity.</p></div><button className="primary-button" onClick={() => setShowTemplates(true)}><Plus size={17}/> New form</button></div>
            <div className="stats-grid">
              <StatCard icon={FileText} label="Total forms" value={forms.length} note="Across your workspace" color="violet" />
              <StatCard icon={Activity} label="Total responses" value={totalResponses} note="Every voice counts" color="blue" />
              <StatCard icon={Globe2} label="Published forms" value={forms.filter(f=>f.published).length} note="Out in the world" color="green" />
              <StatCard icon={Clock3} label="Drafts" value={forms.filter(f=>!f.published).length} note="Ideas in progress" color="amber" />
            </div>
            <div className="section-heading"><div><h2>Your forms <span className="count-pill">{filteredForms.length}</span></h2><p>All the little things you're building.</p></div><div className="section-tools"><button className="select-button" onClick={() => setFilter(filter === 'All forms' ? 'Published' : filter === 'Published' ? 'Drafts' : 'All forms')}><Filter size={15}/>{filter}<ChevronDown size={14}/></button><button className="icon-button view-toggle"><LayoutGrid size={17}/></button></div></div>
            {filteredForms.length ? <div className="forms-grid">{filteredForms.map((form, i) => <FormCard key={form.id} form={form} count={(responses[form.id]||[]).length} index={i} onOpen={() => openForm(form)} onDuplicate={() => duplicateForm(form)} onDelete={() => deleteForm(form.id)} onShare={() => {setActiveForm(form); navigator.clipboard?.writeText(`${location.origin}${location.pathname}?form=${form.id}`).then(()=>notify('Share link copied')).catch(()=>notify('Open the form studio to copy its link'));}} />)}</div> :
              <motion.div className="empty-state" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}><div className="empty-illustration"><div className="empty-paper"><span/><span/><span/><i/></div><div className="empty-star"><Sparkles size={22}/></div></div><h3>{search ? 'No forms found' : 'Your next great form starts here'}</h3><p>{search ? 'Try another search or clear your filters.' : 'Start with a blank canvas or choose a template to get moving.'}</p><button className="primary-button" onClick={() => setShowTemplates(true)}><Plus size={17}/> Create your first form</button></motion.div>}
            <div className="bottom-note"><div className="note-icon"><ShieldCheck size={17}/></div><span><strong>Your work, your space.</strong> {supabase ? 'Your forms are connected to your Supabase workspace.' : 'Demo mode stores forms in this browser. Connect Supabase for cloud sync and accounts.'}</span><button onClick={() => setShowSettings(true)}>Configure <ArrowRight size={14}/></button></div>
          </motion.section>}
          {view === 'editor' && activeForm && <motion.section key="editor" className="page-content editor-page" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
            <div className="editor-top"><button className="back-link" onClick={() => {setView('home');setActiveForm(null)}}><ArrowLeft size={16}/> All forms</button><div className="editor-top-actions"><span className={`save-status ${saving?'saving':''}`}><span/>{saving?'Saving…':'All changes saved'}</span><button className="secondary-button" onClick={() => setPreview(!preview)}><Eye size={16}/>{preview?'Edit form':'Preview'}</button><button className="primary-button" onClick={activeForm.published ? shareForm : publishForm}>{activeForm.published ? <><Share2 size={16}/> Share form</> : <><Globe2 size={16}/> Publish form</>}</button></div></div>
            {preview ? <PublicForm form={activeForm} answers={publicAnswers} setAnswers={setPublicAnswers} submitted={false} onSubmit={e=>{e.preventDefault();notify('Preview only — publish the form to collect responses.')}} theme={theme} toggleTheme={()=>setTheme(theme==='dark'?'light':'dark')} isPreview /> :
            <div className="studio-layout"><div className="studio-main"><div className="studio-cover"><div className="cover-decoration decor-a"/><div className="cover-decoration decor-b"/><div className="cover-content"><span className="cover-tag"><Sparkles size={13}/> FORM STUDIO</span><p>Your canvas, your rules.</p><span className="cover-small">A good question can change everything.</span></div></div>
              <div className="form-meta-card"><input className="form-title-input" value={activeForm.title} onChange={e=>updateActive({title:e.target.value})} aria-label="Form title" placeholder="Untitled form"/><textarea className="form-desc-input" value={activeForm.description||''} onChange={e=>updateActive({description:e.target.value})} placeholder="Add a description..." rows={2}/><div className="meta-footer"><span><LockKeyhole size={13}/> Only you can edit</span><span>{activeForm.questions.length} questions</span></div></div>
              <div className="question-list">{activeForm.questions.map((q,i)=><QuestionEditor key={q.id} q={q} index={i} total={activeForm.questions.length} update={patch=>updateQuestion(q.id,patch)} remove={()=>removeQuestion(q.id)} move={d=>moveQuestion(q.id,d)} />)}</div>
              <button className="add-question-button" onClick={()=>addQuestion('short')}><span><Plus size={18}/></span> Add a question <kbd>⌘ ⇧ A</kbd></button>
              <div className="studio-footnote"><ShieldCheck size={15}/> Your changes save automatically as you create.</div>
            </div><aside className="builder-panel"><div className="panel-title"><div><h3>Build your form</h3><p>Make it yours, one question at a time.</p></div><WandSparkles size={19}/></div><div className="panel-section-label">ADD A QUESTION</div><div className="question-type-grid">{questionTypes.map(t=><button key={t.type} onClick={()=>addQuestion(t.type)}><t.icon size={17}/><span>{t.label}</span><Plus size={13} className="type-plus"/></button>)}</div><div className="panel-divider"/><div className="panel-section-label">FORM SETTINGS</div><label className="setting-line"><span><Image size={16}/> Cover artwork</span><button className="text-action" onClick={()=>notify('Cover artwork customization is coming next.')} >Customize</button></label><label className="setting-line"><span><PaletteIcon/> Accent color</span><select value={activeForm.theme||'violet'} onChange={e=>updateActive({theme:e.target.value})}><option value="violet">Violet</option><option value="blue">Ocean blue</option><option value="green">Mint</option><option value="amber">Sunshine</option></select></label><label className="setting-line"><span><ShieldCheck size={16}/> Collect emails</span><input type="checkbox" checked={!!activeForm.collectEmail} onChange={e=>updateActive({collectEmail:e.target.checked})}/></label><label className="setting-line"><span><Users size={16}/> Limit to one response</span><input type="checkbox" checked={!!activeForm.oneResponse} onChange={e=>updateActive({oneResponse:e.target.checked})}/></label><div className="panel-divider"/><div className="panel-help"><div><CircleHelp size={17}/><strong>Need a little help?</strong></div><p>Keep questions clear, make required fields intentional, and preview before publishing.</p><button onClick={()=>setPreview(true)}>Preview your form <ArrowRight size={14}/></button></div></aside></div>}
          </motion.section>}
          {view === 'responses' && <motion.section key="responses" className="page-content" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}><div className="welcome-row"><div><div className="eyebrow"><span className="live-dot"/> LISTEN CLOSELY</div><h1>Every response <span className="gradient-text">matters.</span></h1><p className="page-subtitle">All the feedback, signups, and ideas people have shared with you.</p></div></div>{forms.filter(f=>(responses[f.id]||[]).length).length ? <div className="response-form-list">{forms.filter(f=>(responses[f.id]||[]).length).map(f=><div className="response-form-row" key={f.id}><div className="form-icon"><FileText size={19}/></div><div className="response-form-info"><strong>{f.title}</strong><span>{(responses[f.id]||[]).length} responses · Updated {new Date(f.created_at).toLocaleDateString()}</span></div><button className="secondary-button" onClick={()=>{setActiveForm(f);setView('responses-detail')}}>View responses <ArrowRight size={15}/></button><button className="icon-button" onClick={()=>exportCSV(f)} title="Export CSV"><Download size={17}/></button></div>)}</div> : <div className="empty-state compact"><div className="empty-icon"><Clipboard size={28}/></div><h3>No responses just yet</h3><p>Publish one of your forms and share its link to start collecting responses.</p><button className="secondary-button" onClick={()=>setView('home')}>Explore your forms <ArrowRight size={15}/></button></div>}</motion.section>}
          {view === 'responses-detail' && activeForm && <motion.section key="responses-detail" className="page-content" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}><button className="back-link" onClick={()=>setView('responses')}><ArrowLeft size={16}/> All responses</button><div className="welcome-row"><div><h1>{activeForm.title}</h1><p className="page-subtitle">{(responses[activeForm.id]||[]).length} total submissions</p></div><button className="secondary-button" onClick={()=>exportCSV(activeForm)}><Download size={16}/> Export CSV</button></div><div className="responses-table"><div className="response-table-head"><span>Submission</span><span>Answers</span><span>Submitted</span></div>{(responses[activeForm.id]||[]).map((r,i)=><div className="response-table-row" key={r.id||i}><strong>#{String(i+1).padStart(3,'0')}</strong><div>{activeForm.questions.map(q=><p key={q.id}><small>{q.title}</small><span>{Array.isArray(r.answers?.[q.id])?r.answers[q.id].join(', '):r.answers?.[q.id]||'—'}</span></p>)}</div><span className="muted-text">{new Date(r.created_at).toLocaleString()}</span></div>)}</div></motion.section>}
          {view === 'analytics' && <motion.section key="analytics" className="page-content" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}><div className="welcome-row"><div><div className="eyebrow"><span className="live-dot"/> THE BIG PICTURE</div><h1>Small signals. <span className="gradient-text">Big insights.</span></h1><p className="page-subtitle">A simple look at how your forms are doing.</p></div></div><div className="stats-grid"><StatCard icon={FileText} label="Forms created" value={forms.length} note="Total in workspace" color="violet"/><StatCard icon={Activity} label="Submissions" value={totalResponses} note="All collected responses" color="blue"/><StatCard icon={Globe2} label="Live forms" value={forms.filter(f=>f.published).length} note="Available to respondents" color="green"/><StatCard icon={Users} label="Avg. responses / form" value={forms.length ? (totalResponses/forms.length).toFixed(1) : '0'} note="Across all forms" color="amber"/></div><div className="analytics-panel"><div className="section-heading"><div><h2>Form performance</h2><p>Response activity for each form.</p></div></div>{forms.length ? forms.map(f=>{const count=(responses[f.id]||[]).length;const max=Math.max(1,...forms.map(x=>(responses[x.id]||[]).length));return <div className="performance-row" key={f.id}><div className="performance-label"><span>{f.title}</span><strong>{count}</strong></div><div className="bar-track"><motion.div className="bar-fill" initial={{width:0}} animate={{width:`${count/max*100}%`}} transition={{duration:.7}}/></div></div>}) : <p className="muted-text">Create your first form to see performance here.</p>}</div></motion.section>}
          {view === 'settings' && <motion.section key="settings" className="page-content" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}><div className="welcome-row"><div><h1>Your space, <span className="gradient-text">your way.</span></h1><p className="page-subtitle">Account, appearance, and connection settings.</p></div></div><div className="settings-card"><div className="settings-icon"><Sun size={20}/></div><div className="settings-copy"><strong>Appearance</strong><p>Choose the look that feels right to you.</p></div><button className="secondary-button" onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?<Sun size={16}/>:<Moon size={16}/>} Switch to {theme==='dark'?'light':'dark'}</button></div><div className="settings-card"><div className="settings-icon"><ShieldCheck size={20}/></div><div className="settings-copy"><strong>Cloud connection</strong><p>{supabase ? 'Supabase client configured. Sign in to sync forms to the cloud.' : 'Not configured. Add your Supabase project URL and publishable/anon key to .env.'}</p></div><span className={`connection-status ${supabase?'connected':''}`}><span/>{supabase?'Configured':'Local mode'}</span></div><div className="settings-card"><div className="settings-icon"><Users size={20}/></div><div className="settings-copy"><strong>{user?'Account':'Sign in or create an account'}</strong><p>{user ? user.email : 'Sign in to keep your forms available across devices.'}</p></div><button className="secondary-button" onClick={()=>{setAuthMode('signin');setAuthMessage('');setShowSettings(false);setAuthEmail(user?.email||'');setView('auth')}}>{user?'Account options':'Continue'} <ArrowRight size={15}/></button></div><div className="settings-card"><div className="settings-icon"><Download size={20}/></div><div className="settings-copy"><strong>Export responses</strong><p>Download response data as CSV from the Responses section.</p></div><button className="secondary-button" onClick={()=>setView('responses')}>View responses <ArrowRight size={15}/></button></div></motion.section>}
          {view === 'auth' && <motion.section key="auth" className="page-content auth-page" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}><div className="auth-card"><div className="auth-logo"><div className="brand-mark"><Sparkles size={21}/></div><span className="brand-name">formora<span className="brand-dot">.</span></span></div><h1>{authMode==='signin'?'Welcome back.':'Make room for good questions.'}</h1><p>{authMode==='signin'?'Sign in to pick up where you left off.':'Create your workspace and start building.'}</p><form onSubmit={signIn} className="auth-form"><label>Email address<input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="you@example.com" required/></label><label>Password<input type="password" minLength={6} value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="At least 6 characters" required/></label>{authMessage && <div className="auth-message">{authMessage}</div>}<button className="primary-button full-button" type="submit">{authMode==='signin'?'Sign in':'Create account'} <ArrowRight size={16}/></button></form><div className="auth-switch">{authMode==='signin'?'New to Formora?':'Already have an account?'} <button onClick={()=>{setAuthMode(authMode==='signin'?'signup':'signin');setAuthMessage('')}}>{authMode==='signin'?'Create an account':'Sign in'}</button></div><button className="back-link auth-back" onClick={()=>setView('home')}><ArrowLeft size={15}/> Back to workspace</button></div></motion.section>}
        </AnimatePresence>
      </main>
      <AnimatePresence>{showTemplates && <TemplateModal onClose={()=>setShowTemplates(false)} onBlank={()=>createForm()} onSelect={t=>createForm(t)}/>}</AnimatePresence>
      <AnimatePresence>{showSettings && <motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setShowSettings(false)}><motion.div className="settings-modal" initial={{opacity:0,y:16,scale:.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:10}} onClick={e=>e.stopPropagation()}><div className="modal-heading"><div><h2>Quick settings</h2><p>Your workspace at a glance.</p></div><button className="icon-button" onClick={()=>setShowSettings(false)}><X size={18}/></button></div><div className="settings-card"><div className="settings-icon"><Sun size={20}/></div><div className="settings-copy"><strong>Appearance</strong><p>Switch between light and dark mode.</p></div><button className="secondary-button" onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?'Light mode':'Dark mode'}</button></div><div className="settings-card"><div className="settings-icon"><ShieldCheck size={20}/></div><div className="settings-copy"><strong>Supabase</strong><p>{supabase?'Connected client':'Add .env values to enable cloud features.'}</p></div></div><button className="primary-button full-button" onClick={()=>{setShowSettings(false);setView('settings')}}>All settings <ArrowRight size={15}/></button></motion.div></motion.div>}</AnimatePresence>
      <AnimatePresence>{toast && <motion.div className="toast" initial={{opacity:0,y:16,scale:.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:8}}><CheckCircle2 size={17}/>{toast}</motion.div>}</AnimatePresence>
    </div>
  );
}
function PaletteIcon(){return <span className="palette-dot"><i/><i/><i/></span>}
function StatCard({icon:Icon,label,value,note,color}) { return <motion.div className="stat-card" whileHover={{y:-3}} transition={{duration:.18}}><div className={`stat-icon ${color}`}><Icon size={19}/></div><span className="stat-label">{label}</span><div className="stat-value">{value}</div><span className="stat-note"><span className="note-dot"/> {note}</span><div className={`stat-glow ${color}`}/></motion.div>; }
function FormCard({form,count,index,onOpen,onDuplicate,onDelete,onShare}) {
  const colors = {violet:'form-preview-violet',blue:'form-preview-blue',green:'form-preview-green',amber:'form-preview-amber'};
  return <motion.article className="form-card" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:Math.min(index*.045,.25)}} whileHover={{y:-4}}><button className="form-preview" onClick={onOpen}><div className={`preview-art ${colors[form.theme]||colors.violet}`}><div className="preview-window"><div className="preview-window-top"><i/><i/><i/></div><div className="preview-line long"/><div className="preview-line medium"/><div className="preview-input"/><div className="preview-line short"/><div className="preview-options"><i/><span/><i/><span/></div><div className="preview-submit"/></div><div className="preview-orbit orbit-a"/><div className="preview-orbit orbit-b"/><span className="preview-spark"><Sparkles size={17}/></span></div></button><div className="form-card-body"><div className="form-card-title-row"><div><h3 title={form.title}>{form.title || 'Untitled form'}</h3><p>{form.description || 'No description added yet.'}</p></div><div className="more-wrap"><button className="icon-button more-button" onClick={e=>{e.stopPropagation();onDuplicate()}} title="Duplicate form"><Copy size={16}/></button></div></div><div className="form-card-meta"><span className={`status-pill ${form.published?'published':''}`}><i/>{form.published?'Published':'Draft'}</span><span><ListChecks size={14}/>{form.questions?.length||0} questions</span><span><Activity size={14}/>{count} responses</span></div><div className="form-card-footer"><span><Clock3 size={13}/> {new Date(form.created_at||Date.now()).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</span><div><button className="icon-button" title="Share link" onClick={onShare}><Share2 size={15}/></button><button className="icon-button danger-hover" title="Delete form" onClick={onDelete}><Trash2 size={15}/></button><button className="open-form-button" onClick={onOpen}>Open <ArrowRight size={14}/></button></div></div></div></motion.article>;
}
function TemplateModal({onClose,onBlank,onSelect}) {
  return <motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}><motion.div className="template-modal" initial={{opacity:0,y:22,scale:.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:12,scale:.98}} onClick={e=>e.stopPropagation()}><div className="modal-heading"><div><div className="eyebrow"><Sparkles size={13}/> LET'S MAKE SOMETHING</div><h2>Start with a little <span className="gradient-text">inspiration.</span></h2><p>Pick a starting point. You can make it yours from there.</p></div><button className="icon-button" onClick={onClose}><X size={19}/></button></div><button className="blank-template" onClick={onBlank}><div className="blank-icon"><Plus size={23}/></div><div><strong>Start from scratch</strong><p>A fresh canvas for whatever you're dreaming up.</p></div><ArrowRight size={18}/></button><div className="template-grid">{templates.map(t=><button className="template-option" key={t.name} onClick={()=>onSelect(t)}><div className={`template-art ${t.color}`}><div className="template-paper"><div/><div/><div/><i/></div><div className="template-art-icon"><t.icon size={19}/></div></div><div className="template-option-copy"><span>{t.category}</span><strong>{t.name}</strong><p>{t.description}</p></div><ArrowRight className="template-arrow" size={16}/></button>)}</div><div className="modal-footer-note"><ShieldCheck size={15}/> Your forms are private until you choose to publish.</div></motion.div></motion.div>;
}
function QuestionEditor({q,index,total,update,remove,move}) {
  const typeInfo=questionTypes.find(t=>t.type===q.type)||questionTypes[0], Icon=typeInfo.icon;
  const [showDescription,setShowDescription]=useState(!!q.description);
  return <motion.div className="question-card" layout initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}><div className="question-card-top"><div className="drag-handle"><GripVertical size={16}/></div><span className="question-number">{String(index+1).padStart(2,'0')}</span><span className="question-type-badge"><Icon size={13}/>{typeInfo.label}</span><div className="question-actions"><button className="icon-button" title="Move up" disabled={index===0} onClick={()=>move(-1)}><ChevronUp size={16}/></button><button className="icon-button" title="Move down" disabled={index===total-1} onClick={()=>move(1)}><ChevronDown size={16}/></button><button className="icon-button danger-hover" title="Delete question" onClick={remove}><Trash2 size={15}/></button></div></div><input className="question-title-input" value={q.title} onChange={e=>update({title:e.target.value})} placeholder="Write your question here"/>{showDescription && <textarea className="question-description-input" rows={2} value={q.description||''} onChange={e=>update({description:e.target.value})} placeholder="Add helpful details (optional)"/>}<div className="question-answer-preview"><AnswerPreview q={q}/></div><div className="question-card-footer"><button className="subtle-action" onClick={()=>setShowDescription(!showDescription)}><AlignLeft size={14}/>{showDescription?'Hide description':'Add description'}</button><span className="footer-separator"/><label className="required-toggle">Required <input type="checkbox" checked={!!q.required} onChange={e=>update({required:e.target.checked})}/><span className="toggle-track"/></label></div></motion.div>;
}
function AnswerPreview({q,answer,setAnswer,interactive=false}) {
  if(['choice','checkbox','dropdown'].includes(q.type)) return <div className="option-editor">{(q.options||[]).map((o,i)=><div className="option-edit-row" key={i}>{q.type==='choice'?<CircleDot size={16}/>:q.type==='checkbox'?<span className="fake-checkbox"/>:<span className="option-index">{i+1}</span>}<input value={o} readOnly={!interactive} onChange={e=>setAnswer(q.options.map((x,j)=>i===j?e.target.value:x))}/>{interactive&&<button onClick={()=>setAnswer(q.options.filter((_,j)=>j!==i))}><X size={13}/></button>}</div>)}{interactive&&<button className="add-option" onClick={()=>setAnswer([...(q.options||[]),`Option ${(q.options||[]).length+1}`])}><Plus size={14}/> Add option</button>}</div>;
  if(q.type==='paragraph') return <div className="answer-placeholder paragraph-placeholder">Long answer text <span>................................................................</span></div>;
  if(q.type==='rating') return <div className="rating-preview">{[1,2,3,4,5].map(n=><span key={n}>{n}</span>)}</div>;
  if(q.type==='date') return <div className="answer-placeholder">MM / DD / YYYY <CalendarDays size={15}/></div>;
  return <div className="answer-placeholder">{q.type==='email'?'name@example.com':q.type==='number'?'Enter a number':'Your answer'} <span>................................................................</span></div>;
}
function PublicForm({form,answers,setAnswers,submitted,onSubmit,theme,toggleTheme,isPreview=false}) {
  const [localDone,setLocalDone]=useState(false);
  if(!form) return <div className="public-shell"><div className="public-loading"><div className="brand-mark"><Sparkles size={22}/></div><h2>Finding your form…</h2><p>If this takes a while, check that the form is published and the share link is correct.</p><button className="secondary-button" onClick={()=>location.href=location.pathname}>Go to Formora</button></div></div>;
  if(submitted||localDone) return <div className="public-shell"><div className="public-topbar"><div className="brand-mini"><div className="brand-mark"><Sparkles size={17}/></div><span>formora<span className="brand-dot">.</span></span></div><button className="icon-button" onClick={toggleTheme}>{theme==='dark'?<Sun size={17}/>:<Moon size={17}/>}</button></div><motion.div className="public-success" initial={{opacity:0,y:15}} animate={{opacity:1,y:0}}><div className="success-icon"><Check size={29}/></div><div className="eyebrow"><span className="live-dot"/> RESPONSE RECEIVED</div><h1>That's a wrap.<br/><span className="gradient-text">Thank you.</span></h1><p>Your response has been recorded. Thanks for taking a moment to share.</p><div className="success-confetti"><i/><i/><i/><i/><i/><i/></div><span className="success-brand">Made thoughtfully with Formora</span></motion.div></div>;
  return <div className={`public-shell public-theme-${form.theme||'violet'}`}><div className="public-topbar"><div className="brand-mini"><div className="brand-mark"><Sparkles size={17}/></div><span>formora<span className="brand-dot">.</span></span></div><div className="public-top-actions"><span><LockKeyhole size={13}/> Secure form</span><button className="icon-button" onClick={toggleTheme} title="Toggle theme">{theme==='dark'?<Sun size={17}/>:<Moon size={17}/>}</button></div></div><motion.main className="public-form-wrap" initial={{opacity:0,y:14}} animate={{opacity:1,y:0}}><div className="public-cover"><div className="cover-decoration decor-a"/><div className="cover-decoration decor-b"/><div className="public-cover-text"><span className="cover-tag"><Sparkles size={13}/> A FORMORA FORM</span><h1>{form.title}</h1><p>{form.description}</p></div></div><div className="public-progress"><div><span>YOUR RESPONSE</span><strong>{form.questions.length ? Math.round(Object.keys(answers||{}).filter(k=>answers[k]!==''&&answers[k]!==undefined).length/form.questions.length*100):0}% complete</strong></div><div className="progress-track"><motion.div animate={{width:`${form.questions.length?Object.keys(answers||{}).filter(k=>answers[k]!==''&&answers[k]!==undefined).length/form.questions.length*100:0}%`}}/></div></div><form onSubmit={e=>{if(isPreview){onSubmit(e);setLocalDone(true)}else onSubmit(e)}} className="public-question-list">{(form.questions||[]).map((q,i)=><motion.div className="public-question" key={q.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:Math.min(i*.04,.3)}}><div className="public-question-heading"><span className="public-q-number">{String(i+1).padStart(2,'0')}</span><label>{q.title||'Untitled question'} {q.required&&<i>*</i>}</label></div>{q.description&&<p className="public-q-desc">{q.description}</p>}<PublicAnswer q={q} value={answers?.[q.id]} onChange={v=>setAnswers({...answers,[q.id]:v})}/></motion.div>)}<div className="public-submit-row"><span><LockKeyhole size={13}/> Your answers are kept private.</span><button type="submit" className="primary-button">Submit response <ArrowRight size={16}/></button></div></form><footer className="public-footer">Thoughtfully made with <Sparkles size={13}/> <strong>formora</strong></footer></motion.main></div>;
}
function PublicAnswer({q,value,onChange}) {
  if(['choice','checkbox'].includes(q.type)) return <div className="public-options">{(q.options||[]).map((o,i)=><label className={`public-option ${q.type==='checkbox'?(value||[]).includes(o):value===o?'selected':''}`} key={i}><input type={q.type==='choice'?'radio':'checkbox'} name={q.id} checked={q.type==='checkbox'?(value||[]).includes(o):value===o} onChange={()=>onChange(q.type==='checkbox'?((value||[]).includes(o)?value.filter(x=>x!==o):[...(value||[]),o]):o)}/><span className="public-option-control"/><span>{o}</span>{(q.type==='checkbox'?(value||[]).includes(o):value===o)&&<Check size={15} className="option-check"/>}</label>)}</div>;
  if(q.type==='dropdown') return <select className="public-input" value={value||''} onChange={e=>onChange(e.target.value)}><option value="">Choose an option…</option>{(q.options||[]).map(o=><option key={o}>{o}</option>)}</select>;
  if(q.type==='rating') return <div className="public-rating">{[1,2,3,4,5].map(n=><button type="button" className={value>=n?'chosen':''} key={n} onClick={()=>onChange(n)}>{n}</button>}</div>;
  if(q.type==='date') return <input className="public-input" type="date" value={value||''} onChange={e=>onChange(e.target.value)}/>;
  if(q.type==='number') return <input className="public-input" type="number" value={value||''} onChange={e=>onChange(e.target.value)} placeholder="Enter a number"/>;
  if(q.type==='email') return <input className="public-input" type="email" value={value||''} onChange={e=>onChange(e.target.value)} placeholder="name@example.com" required={q.required}/>;
  if(q.type==='paragraph') return <textarea className="public-input public-textarea" value={value||''} onChange={e=>onChange(e.target.value)} placeholder="Write your answer here…" rows={4} required={q.required}/>;
  return <input className="public-input" value={value||''} onChange={e=>onChange(e.target.value)} placeholder="Type your answer here…" required={q.required}/>;
}
createRoot(document.getElementById('root')).render(<App/>);
