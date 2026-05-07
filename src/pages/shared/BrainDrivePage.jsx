import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    BrainCircuit,
    FileText,
    Globe,
    HardDrive,
    FileUp,
    RefreshCw,
    FolderOpen,
    Sparkles,
} from 'lucide-react';
import { useMarketing } from '../../context/MarketingContext';
import { useToast } from '../../components/ui/Toast';

const STORAGE_KEY = 'brainDrive:selectedProjectId';

const SOURCE_LABELS = {
    plain_text: 'Text',
    pdf: 'PDF',
    drive_link: 'Drive / link',
    webpage: 'Web page',
    website: 'Website',
    business_description: 'Business description',
    logo: 'Logo',
};

function formatSourceLabel(type) {
    return SOURCE_LABELS[type] || type || '—';
}

/**
 * Brain Drive — shared project knowledge hub for Sales, Post-Sales, Support, and Marketing.
 * Ingests into `project_knowledge` so voice AI and other flows can retrieve project facts.
 */
const BrainDrivePage = () => {
    const location = useLocation();
    const { showToast } = useToast();
    const {
        selectedProjectId,
        projects,
        projectsLoading,
        selectProject,
        ingestProjectKnowledge,
        listBrainDrive,
        refetchProjects,
    } = useMarketing();

    const moduleName = useMemo(() => {
        if (location.pathname.startsWith('/marketing')) return 'Marketing';
        if (location.pathname.startsWith('/post-sales')) return 'Post Sales';
        if (location.pathname.startsWith('/support')) return 'Support';
        return 'Sales';
    }, [location.pathname]);

    const selectedProject = useMemo(
        () => projects.find((p) => p.id === selectedProjectId) || null,
        [projects, selectedProjectId]
    );

    const [sources, setSources] = useState([]);
    const [loadingSources, setLoadingSources] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const hydratedStorageRef = useRef(false);

    const [textTitle, setTextTitle] = useState('');
    const [textBody, setTextBody] = useState('');
    const [webpageUrl, setWebpageUrl] = useState('');
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [driveUrl, setDriveUrl] = useState('');
    const [driveNotes, setDriveNotes] = useState('');
    const [pdfFile, setPdfFile] = useState(null);

    const persistProjectChoice = useCallback((projectId) => {
        try {
            if (projectId) sessionStorage.setItem(STORAGE_KEY, projectId);
            else sessionStorage.removeItem(STORAGE_KEY);
        } catch (_) {
            /* ignore */
        }
    }, []);

    const onProjectSelectChange = useCallback(
        (e) => {
            const v = String(e.target.value || '').trim();
            const next = v || null;
            selectProject(next);
            persistProjectChoice(next);
        },
        [selectProject, persistProjectChoice]
    );

    /** Restore last Brain Drive project when landing with "All Projects" still selected */
    useEffect(() => {
        if (hydratedStorageRef.current) return;
        if (selectedProjectId) {
            hydratedStorageRef.current = true;
            return;
        }
        if (projectsLoading || !projects.length) return;
        try {
            const saved = sessionStorage.getItem(STORAGE_KEY);
            if (saved && projects.some((p) => p.id === saved)) {
                selectProject(saved);
            }
        } catch (_) {
            /* ignore */
        }
        hydratedStorageRef.current = true;
    }, [projects, projectsLoading, selectedProjectId, selectProject]);

    const loadSources = useCallback(async () => {
        if (!selectedProjectId) {
            setSources([]);
            return;
        }
        setLoadingSources(true);
        try {
            const { data, error } = await listBrainDrive(selectedProjectId);
            if (error) throw new Error(error);
            setSources(data?.sources || []);
        } catch (e) {
            setSources([]);
            showToast({
                title: 'Could not load Brain Drive',
                description: e?.message || 'Try again.',
                variant: 'warning',
            });
        } finally {
            setLoadingSources(false);
        }
    }, [selectedProjectId, listBrainDrive, showToast]);

    useEffect(() => {
        void loadSources();
    }, [loadSources]);

    const runIngest = async (ingestData, successTitle) => {
        if (!selectedProjectId) return;
        setSubmitting(true);
        try {
            const { data, error } = await ingestProjectKnowledge(selectedProjectId, ingestData);
            if (error) throw new Error(error);
            showToast({
                title: successTitle,
                description: `Added ${data?.insertedChunks ?? 0} searchable chunk(s) to this project.`,
                variant: 'success',
            });
            await refetchProjects();
            await loadSources();
        } catch (e) {
            showToast({
                title: 'Ingest failed',
                description: e?.message || 'Check inputs and try again.',
                variant: 'error',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const onSubmitText = (e) => {
        e.preventDefault();
        const body = textBody.trim();
        if (!body) {
            showToast({ title: 'Add some text', description: 'Paste or type document content.', variant: 'warning' });
            return;
        }
        void runIngest({ textBody: body, textTitle: textTitle.trim() || undefined }, 'Text saved to Brain Drive');
        setTextBody('');
        setTextTitle('');
    };

    const onSubmitWebpage = (e) => {
        e.preventDefault();
        const url = webpageUrl.trim();
        if (!url) {
            showToast({ title: 'URL required', description: 'Enter a public web page URL.', variant: 'warning' });
            return;
        }
        void runIngest({ webpageUrl: url }, 'Web page ingested');
        setWebpageUrl('');
    };

    const onSubmitWebsite = (e) => {
        e.preventDefault();
        const url = websiteUrl.trim();
        if (!url) {
            showToast({ title: 'URL required', description: 'Enter a site URL to scan.', variant: 'warning' });
            return;
        }
        void runIngest({ websiteUrl: url }, 'Website ingested');
        setWebsiteUrl('');
    };

    const onSubmitDrive = (e) => {
        e.preventDefault();
        const url = driveUrl.trim();
        if (!url) {
            showToast({ title: 'Link required', description: 'Paste a Drive or cloud file link.', variant: 'warning' });
            return;
        }
        void runIngest({ driveUrl: url, driveNotes: driveNotes.trim() || undefined }, 'Drive link saved');
        setDriveUrl('');
        setDriveNotes('');
    };

    const onSubmitPdf = (e) => {
        e.preventDefault();
        if (!pdfFile) {
            showToast({ title: 'Choose a PDF', description: 'Select a file to upload.', variant: 'warning' });
            return;
        }
        void runIngest({ pdfFile }, 'PDF ingested');
        setPdfFile(null);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 text-violet-800 border border-violet-100 px-3 py-1 text-xs font-semibold mb-2">
                        <BrainCircuit size={14} />
                        {moduleName}
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Brain Drive</h1>
                    <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                        Full project documents for your team: text, PDF, public web pages, and Drive links. Content is
                        chunked and indexed so Sales voice, WhatsApp-style flows, and other assistants pull facts from{' '}
                        <strong className="text-gray-700">project_knowledge</strong> for the selected listing.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void loadSources()}
                    disabled={!selectedProjectId || loadingSources}
                    className="inline-flex items-center gap-2 self-start rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                    <RefreshCw size={16} className={loadingSources ? 'animate-spin' : ''} />
                    Refresh list
                </button>
            </div>

            <div className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm space-y-3">
                <label htmlFor="brain-drive-project" className="block text-sm font-semibold text-gray-900">
                    Project for this Brain Drive session
                </label>
                <p className="text-xs text-gray-500">
                    Same projects as{' '}
                    <Link to="/marketing/projects" className="text-violet-700 underline font-medium">
                        Marketing → Projects
                    </Link>
                    . Choosing here updates the header project switcher. Voice AI on calls uses Brain Drive chunks for the
                    project you attach to leads.
                </p>
                {projectsLoading ? (
                    <p className="text-sm text-gray-500">Loading projects…</p>
                ) : projects.length === 0 ? (
                    <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        No projects yet.{' '}
                        <Link to="/marketing/projects/new" className="font-semibold underline">
                            Create a project
                        </Link>{' '}
                        under Marketing first.
                    </div>
                ) : (
                    <select
                        id="brain-drive-project"
                        value={selectedProjectId || ''}
                        onChange={onProjectSelectChange}
                        className="w-full max-w-xl rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2.5 text-sm font-medium text-gray-900 outline-none focus:ring-2 focus:ring-violet-400/70"
                    >
                        <option value="">— Select a project —</option>
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name || p.id}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {!selectedProjectId ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 flex gap-3 items-start">
                    <FolderOpen className="shrink-0 mt-0.5" size={18} />
                    <div>
                        <p className="font-semibold">Select a project above</p>
                        <p className="mt-1 text-amber-800/90">
                            Ingest buttons stay disabled until a project is selected. You can also use the{' '}
                            <strong>project switcher</strong> in the top bar (it no longer redirects away from Brain Drive).
                        </p>
                    </div>
                </div>
            ) : (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-900 flex items-center gap-2">
                    <Sparkles size={16} />
                    <span>
                        Active project: <strong>{selectedProject?.name || selectedProjectId}</strong>
                    </span>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
                <form
                    onSubmit={onSubmitText}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4"
                >
                    <div className="flex items-center gap-2 text-gray-900 font-semibold">
                        <FileText size={18} className="text-violet-600" />
                        Text document
                    </div>
                    <p className="text-xs text-gray-500">Paste specs, FAQs, pricing notes, or any plain text.</p>
                    <input
                        type="text"
                        value={textTitle}
                        onChange={(e) => setTextTitle(e.target.value)}
                        placeholder="Title (e.g. Phase 2 brochure copy)"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        disabled={!selectedProjectId || submitting}
                    />
                    <textarea
                        value={textBody}
                        onChange={(e) => setTextBody(e.target.value)}
                        rows={8}
                        placeholder="Full text…"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono leading-relaxed"
                        disabled={!selectedProjectId || submitting}
                    />
                    <button
                        type="submit"
                        disabled={!selectedProjectId || submitting}
                        className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                        Save text to Brain Drive
                    </button>
                </form>

                <form
                    onSubmit={onSubmitPdf}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4"
                >
                    <div className="flex items-center gap-2 text-gray-900 font-semibold">
                        <FileUp size={18} className="text-violet-600" />
                        PDF upload
                    </div>
                    <p className="text-xs text-gray-500">Upload a PDF; text is extracted and indexed (size limits apply on server).</p>
                    <input
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                        disabled={!selectedProjectId || submitting}
                        className="w-full text-sm"
                    />
                    <button
                        type="submit"
                        disabled={!selectedProjectId || submitting || !pdfFile}
                        className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                        Ingest PDF
                    </button>
                </form>

                <form
                    onSubmit={onSubmitWebpage}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4"
                >
                    <div className="flex items-center gap-2 text-gray-900 font-semibold">
                        <Globe size={18} className="text-violet-600" />
                        Web page (URL)
                    </div>
                    <p className="text-xs text-gray-500">
                        We fetch public HTML metadata and visible signals (title, description, contacts when found).
                    </p>
                    <input
                        type="url"
                        value={webpageUrl}
                        onChange={(e) => setWebpageUrl(e.target.value)}
                        placeholder="https://example.com/your-page"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        disabled={!selectedProjectId || submitting}
                    />
                    <button
                        type="submit"
                        disabled={!selectedProjectId || submitting}
                        className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                        Ingest web page
                    </button>
                </form>

                <form
                    onSubmit={onSubmitWebsite}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4"
                >
                    <div className="flex items-center gap-2 text-gray-900 font-semibold">
                        <Globe size={18} className="text-indigo-600" />
                        Website (overview)
                    </div>
                    <p className="text-xs text-gray-500">Same scraper as marketing project ingest — good for home / landing URLs.</p>
                    <input
                        type="url"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://yourcompany.com"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        disabled={!selectedProjectId || submitting}
                    />
                    <button
                        type="submit"
                        disabled={!selectedProjectId || submitting}
                        className="w-full rounded-lg border border-indigo-200 bg-indigo-50 py-2.5 text-sm font-semibold text-indigo-800 hover:bg-indigo-100 disabled:opacity-50"
                    >
                        Ingest website
                    </button>
                </form>

                <form
                    onSubmit={onSubmitDrive}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4 lg:col-span-2"
                >
                    <div className="flex items-center gap-2 text-gray-900 font-semibold">
                        <HardDrive size={18} className="text-violet-600" />
                        Google Drive / cloud link
                    </div>
                    <p className="text-xs text-gray-500">
                        Paste a share link. Private files are not auto-downloaded; add notes so the team knows what to
                        reference when replying.
                    </p>
                    <input
                        type="url"
                        value={driveUrl}
                        onChange={(e) => setDriveUrl(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        disabled={!selectedProjectId || submitting}
                    />
                    <textarea
                        value={driveNotes}
                        onChange={(e) => setDriveNotes(e.target.value)}
                        rows={3}
                        placeholder="What’s in this folder? Key filenames, version, policy…"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        disabled={!selectedProjectId || submitting}
                    />
                    <button
                        type="submit"
                        disabled={!selectedProjectId || submitting}
                        className="w-full max-w-xs rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                        Save Drive reference
                    </button>
                </form>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Indexed sources</h2>
                    <span className="text-xs text-gray-400">{sources.length} row(s)</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-5 py-3 font-semibold">Type</th>
                                <th className="px-5 py-3 font-semibold">Name / URL</th>
                                <th className="px-5 py-3 font-semibold">Chunks</th>
                                <th className="px-5 py-3 font-semibold">Last ingested</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loadingSources ? (
                                <tr>
                                    <td colSpan={4} className="px-5 py-8 text-center text-gray-500">
                                        Loading…
                                    </td>
                                </tr>
                            ) : sources.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-5 py-8 text-center text-gray-500">
                                        No knowledge yet for this project. Add text, PDF, a page URL, or a Drive link
                                        above.
                                    </td>
                                </tr>
                            ) : (
                                sources.map((row, idx) => (
                                    <tr key={`${row.sourceType}-${row.sourceName}-${idx}`} className="hover:bg-gray-50/80">
                                        <td className="px-5 py-3 font-medium text-gray-800 whitespace-nowrap">
                                            {formatSourceLabel(row.sourceType)}
                                        </td>
                                        <td className="px-5 py-3 text-gray-700 max-w-md truncate" title={row.sourceName}>
                                            {row.sourceName || '—'}
                                        </td>
                                        <td className="px-5 py-3 text-gray-600">{row.chunkCount}</td>
                                        <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">
                                            {row.lastIngestedAt
                                                ? new Date(row.lastIngestedAt).toLocaleString(undefined, {
                                                      dateStyle: 'medium',
                                                      timeStyle: 'short',
                                                  })
                                                : '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BrainDrivePage;
