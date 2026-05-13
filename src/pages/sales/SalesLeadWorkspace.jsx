import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSales } from '../../context/SalesContext';
import {
    ArrowLeft, Phone, MessageSquare, Calendar, Edit3, TrendingUp,
    X, Check, Mic, Volume2, Send, FileText, Play, Pause, Download,
    BrainCircuit, Clock, Star, Activity, Users, ChevronRight,
    Zap, Target, Heart, BarChart3, BookOpen, CheckCircle,
    AlertCircle, Info, PlusCircle, RefreshCw, Award, Mail,
    MapPin, ExternalLink, PhoneOff, Coffee
} from 'lucide-react';
import api from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import {
    CALL_RESULT,
    CALL_RESULT_DETAIL,
    WHATSAPP_REPLY_STATE,
    WHATSAPP_NO_REPLY_DETAIL,
    VOICE_SILENCE_MS,
    WHATSAPP_SILENCE_MS,
    isWithinCallActiveWindow,
    callWindowLabel,
} from '../../utils/salesBotFlow';
import { isPersistableLeadId } from '../../utils/salesActivityHydrate';
import { speechRecognitionLangForLocale } from '../../utils/localeOptions';
import { playNotificationSound } from '../../utils/notificationSound';
import { useProjects } from '../../hooks/useProjects';

/* ─── Status config ─────────────────────────────────────────── */
const STATUS_CONFIG = {
    New: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    Contacted: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' },
    Hot: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    Warm: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
    Cold: { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-200' },
    'Follow-up Scheduled': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
    Converted: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
    Won: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
    Closed: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
    Lost: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' },
};

const STATUSES = ['New', 'Contacted', 'Hot', 'Warm', 'Cold', 'Follow-up Scheduled', 'Converted', 'Closed', 'Lost'];

const TIMELINE_ICONS = {
    capture: { icon: Zap, color: 'bg-blue-100 text-blue-600' },
    ai_action: { icon: BrainCircuit, color: 'bg-purple-100 text-purple-600' },
    call: { icon: Phone, color: 'bg-indigo-100 text-indigo-600' },
    whatsapp: { icon: MessageSquare, color: 'bg-green-100 text-green-600' },
    meeting: { icon: Calendar, color: 'bg-orange-100 text-orange-600' },
    note: { icon: Edit3, color: 'bg-gray-100 text-gray-600' },
    converted: { icon: Award, color: 'bg-emerald-100 text-emerald-600' },
    default: { icon: Activity, color: 'bg-gray-100 text-gray-500' },
};

const AGENTS = ['AI Agent', 'Alex Rep', 'Sarah Closer', 'Mike Seller', 'John Doe', 'Jane Smith'];

const VOICE_LANGUAGES = [
    { code: 'auto', label: 'Auto-detect (match caller)', flag: '\u{1F310}' },
    { code: 'hing', label: 'Hinglish (Hindi + English)', flag: '\u{1F1EE}\u{1F1F3}' },
    { code: 'hi', label: 'Hindi', flag: '\u{1F1EE}\u{1F1F3}' },
    { code: 'en', label: 'English', flag: '\u{1F1EC}\u{1F1E7}' },
    { code: 'mr', label: 'Marathi', flag: '\u{1F1EE}\u{1F1F3}' },
    { code: 'ta', label: 'Tamil', flag: '\u{1F1EE}\u{1F1F3}' },
    { code: 'te', label: 'Telugu', flag: '\u{1F1EE}\u{1F1F3}' },
    { code: 'kn', label: 'Kannada', flag: '\u{1F1EE}\u{1F1F3}' },
    { code: 'ml', label: 'Malayalam', flag: '\u{1F1EE}\u{1F1F3}' },
    { code: 'gu', label: 'Gujarati', flag: '\u{1F1EE}\u{1F1F3}' },
    { code: 'bn', label: 'Bengali', flag: '\u{1F1EE}\u{1F1F3}' },
    { code: 'pa', label: 'Punjabi', flag: '\u{1F1EE}\u{1F1F3}' },
    { code: 'ur', label: 'Urdu', flag: '\u{1F1F5}\u{1F1F0}' },
    { code: 'ar', label: 'Arabic', flag: '\u{1F1E6}\u{1F1EA}' },
    { code: 'es', label: 'Spanish', flag: '\u{1F1EA}\u{1F1F8}' },
    { code: 'fr', label: 'French', flag: '\u{1F1EB}\u{1F1F7}' },
    { code: 'de', label: 'German', flag: '\u{1F1E9}\u{1F1EA}' },
    { code: 'ja', label: 'Japanese', flag: '\u{1F1EF}\u{1F1F5}' },
    { code: 'ko', label: 'Korean', flag: '\u{1F1F0}\u{1F1F7}' },
    { code: 'zh', label: 'Chinese (Mandarin)', flag: '\u{1F1E8}\u{1F1F3}' },
    { code: 'pt', label: 'Portuguese', flag: '\u{1F1E7}\u{1F1F7}' },
    { code: 'ru', label: 'Russian', flag: '\u{1F1F7}\u{1F1FA}' },
];

/** Map post-call AI tier to CRM `stage` + `ai_score` (backend snake_case). */
function mapVoiceTierToCrmPatch(tier, suggestedScore) {
    const t = String(tier || '').trim();
    const score = Number(suggestedScore);
    const sc = Number.isFinite(score) ? Math.min(100, Math.max(0, Math.round(score))) : null;
    if (t === 'Hot') return { stage: 'proposal', ai_score: sc ?? 85 };
    if (t === 'Warm') return { stage: 'qualified', ai_score: sc ?? 60 };
    if (t === 'Cold') return { stage: 'new', ai_score: sc ?? 35 };
    return null;
}

/** Merge org project id + display name into lead.metadata (preserves other keys). */
function buildLeadProjectMetadata(lead, projectId, projectList) {
    const prev = lead?.rawDeal?.metadata && typeof lead.rawDeal.metadata === 'object' ? { ...lead.rawDeal.metadata } : {};
    if (!projectId) {
        const next = { ...prev };
        delete next.projectId;
        delete next.projectName;
        return next;
    }
    const proj = projectList.find((p) => p.id === projectId);
    return {
        ...prev,
        projectId,
        projectName: proj?.name || prev.projectName || null,
    };
}

/** Intent tier for playbook copy: matches dashboard intent (scoreLabel), else explicit pipeline status. */
function playbookIntentTier(scoreLabel, status) {
    const sl = String(scoreLabel || '').trim();
    if (sl === 'Hot' || sl === 'Warm' || sl === 'Cold') return sl;
    const st = String(status || '').trim();
    if (st === 'Hot' || st === 'Warm' || st === 'Cold') return st;
    return '';
}

/** Default Context / Recommendation when API has none — differs by Hot vs Warm vs Cold (product playbook). */
function aiPlaybookDefaults(scoreLabel, status) {
    const tier = playbookIntentTier(scoreLabel, status);
    if (tier === 'Hot') {
        return {
            context:
                'High-intent lead—use priority handling. Notify the assigned owner immediately, push for a call or meeting the same day, and confirm date and time. For a visit or in-person meeting, send the exact location or join link right away.',
            recommendation:
                'Same day: lock the slot, share location or calendar link, and keep the owner in the loop if anything slips.',
        };
    }
    if (tier === 'Warm') {
        return {
            context:
                'Warm lead—run the follow-up flow. Plan WhatsApp on day 1, 3, and 5 with reminders (same day +1 hour, +1 day). Call the next day around 11:00 or 18:30. If you convert to a meeting, track visit outcome: proceed when done, reschedule for the next day on no-show.',
            recommendation:
                'Turn interest into a concrete next step (time + channel) before intent cools; schedule the meeting and set visit status.',
        };
    }
    if (tier === 'Cold') {
        return {
            context:
                'Nurture segment—prioritise campaign flow over aggressive one-to-one chasing. Keep rhythm with a weekly campaign broadcast and only escalate when they reply or show stronger signals.',
            recommendation:
                'Keep this lead on the weekly broadcast list; avoid same-day hard pushes unless they engage.',
        };
    }
    return {
        context: 'AI is analysing lead behaviour.',
        recommendation: 'No recommendation yet.',
    };
}

/** Strip common AI email-style placeholders from WhatsApp drafts */
function sanitizeWhatsappAiReply(text) {
    let s = String(text || '');
    s = s.replace(/\s*\[Your Name\]\s*/gi, ' ');
    s = s.replace(/\s*\[(?:Your\s+)?Name\]\s*/gi, ' ');
    s = s.replace(/\bBest regards,\s*$/gim, '');
    s = s.replace(/\s{2,}/g, ' ').trim();
    return s;
}

/** Keeps SpeechSynthesis in the same user-activation chain as the tap (needed after await fetch). */
/** Map WhatsApp UI history to chat roles for /ai/chat */
function buildWhatsappChatHistory(history) {
    const out = [];
    for (const m of history || []) {
        const text = String(m?.text || '').trim();
        if (!text) continue;
        const role = m.sender === 'AI' ? 'assistant' : 'user';
        out.push({ role, content: text.slice(0, 8000) });
    }
    return out.slice(-40);
}

/** Mute AI TTS output without canceling (pause + volume). `utteranceRef` is { current: SpeechSynthesisUtterance | null } */
function applySpeakerOutputMuteState(muted, utteranceRef, sarvamAudioRef) {
    if (typeof window === 'undefined') return;
    const syn = window.speechSynthesis;
    const a = sarvamAudioRef?.current;
    if (a && typeof a.volume === 'number') {
        a.volume = muted ? 0 : 1;
    }
    if (!syn) return;
    const u = utteranceRef?.current;
    if (muted) {
        if (u && typeof u.volume === 'number') {
            u.volume = 0;
        }
        if (typeof syn.pause === 'function') {
            try {
                if (syn.speaking && !syn.paused) syn.pause();
            } catch (_) {
                /* ignore */
            }
        }
    } else {
        if (typeof syn.resume === 'function') {
            try {
                if (syn.paused) syn.resume();
            } catch (_) {
                /* ignore */
            }
        }
        if (u && typeof u.volume === 'number') {
            u.volume = 1;
        }
    }
}

function decodeBase64ToBlob(b64, mime) {
    if (typeof window === 'undefined' || typeof atob !== 'function') return null;
    try {
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
        return new Blob([bytes], { type: mime || 'audio/wav' });
    } catch (_) {
        return null;
    }
}

/** Minimal silent WAV — unlocks Safari/iOS `<audio>` after later async work (POST /voice/session/start). */
const SILENT_WAV_DATA_URL =
    'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

/** iPhones/iPads: parallel MediaRecorder + silence-RMS mic capture breaks; use Web Speech for STT. */
function shouldAvoidSarvamMicSegmentCapture() {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/i.test(ua)) return true;
    try {
        if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;
    } catch (_) {
        /* ignore */
    }
    return false;
}

function primeSpeechSynthesisFromUserGesture() {
    if (typeof window === 'undefined') return;
    try {
        const a = new Audio();
        a.src = SILENT_WAV_DATA_URL;
        a.volume = 0.02;
        const p = a.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (_) {
        /* ignore */
    }
    if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance === 'undefined') {
        return;
    }
    try {
        window.speechSynthesis.resume();
        const u = new window.SpeechSynthesisUtterance('\u00A0');
        u.volume = 0;
        window.speechSynthesis.speak(u);
    } catch (_) {
        /* ignore */
    }
}

function resolveHourMinute(hour, minute, ampm) {
    let hh = Number(hour || 0);
    const mm = Number(minute || 0);
    const ap = String(ampm || '').toLowerCase();
    if (ap === 'pm' && hh < 12) hh += 12;
    if (ap === 'am' && hh === 12) hh = 0;
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
    return { hh, mm };
}

function parseCallRequestScheduleAt(text) {
    const t = String(text || '').toLowerCase();
    if (!/(call|phone call|ring|voice call)/i.test(t)) return null;
    const now = new Date();
    const inHours = t.match(/\b(?:in|after)\s+(\d{1,2})\s*(hour|hours|hr|hrs)\b/i);
    if (inHours) {
        const n = Number(inHours[1] || 1);
        if (Number.isFinite(n) && n > 0) return new Date(now.getTime() + n * 3600000).toISOString();
    }
    const inMins = t.match(/\b(?:in|after)\s+(\d{1,3})\s*(minute|minutes|min|mins)\b/i);
    if (inMins) {
        const n = Number(inMins[1] || 1);
        if (Number.isFinite(n) && n > 0) return new Date(now.getTime() + n * 60000).toISOString();
    }
    const dayOffset = /\btomorrow\b/i.test(t) ? 1 : 0;
    const tm = t.match(/\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
    if (tm) {
        const hm = resolveHourMinute(tm[1], tm[2] || 0, tm[3] || '');
        if (hm) {
            const d = new Date(now);
            d.setDate(d.getDate() + dayOffset);
            d.setHours(hm.hh, hm.mm, 0, 0);
            if (dayOffset === 0 && d.getTime() < now.getTime()) d.setDate(d.getDate() + 1);
            return d.toISOString();
        }
    }
    return null;
}

function getZonedParts(dateInput, timeZone = 'Asia/Kolkata') {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(d);
    return parts.reduce((acc, p) => {
        if (p.type !== 'literal') acc[p.type] = Number(p.value);
        return acc;
    }, {});
}

function parseWindowHourMinute(value, fallbackHour) {
    const m = String(value || '').trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (!m) return { hh: fallbackHour, mm: 0 };
    return { hh: Number(m[1]), mm: Number(m[2]) };
}

function isScheduleWithinCallWindow(scheduleAt, timeZone = 'Asia/Kolkata', windowStart = '09:00', windowEnd = '21:00') {
    const z = getZonedParts(scheduleAt, timeZone);
    const hh = Number(z.hour || 0);
    const mm = Number(z.minute || 0);
    const nowTotal = hh * 60 + mm;
    const { hh: startH, mm: startM } = parseWindowHourMinute(windowStart, 9);
    const { hh: endH, mm: endM } = parseWindowHourMinute(windowEnd, 21);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;
    if (startTotal < endTotal) return nowTotal >= startTotal && nowTotal < endTotal;
    if (startTotal > endTotal) return nowTotal >= startTotal || nowTotal < endTotal;
    return true;
}

function nextCallWindowSuggestion(scheduleAt, timeZone = 'Asia/Kolkata') {
    const z = getZonedParts(scheduleAt, timeZone);
    const base = new Date(scheduleAt);
    const hh = Number(z.hour || 0);
    if (hh < CALL_WINDOW_START_HOUR) {
        base.setHours(CALL_WINDOW_START_HOUR, 0, 0, 0);
        return base;
    }
    base.setDate(base.getDate() + 1);
    base.setHours(CALL_WINDOW_START_HOUR, 0, 0, 0);
    return base;
}

/* ─── Small Components ───────────────────────────────────────── */
const InfoRow = ({ label, value, icon: Icon }) => (
    <div className="flex items-start justify-between gap-2 py-2 border-b border-gray-50 last:border-0">
        <div className="flex items-center gap-1.5 shrink-0">
            {Icon && <Icon size={13} className="text-gray-400" />}
            <span className="text-xs text-gray-400 font-medium">{label}</span>
        </div>
        <span className="text-xs font-semibold text-gray-800 text-right">{value || '—'}</span>
    </div>
);

const SectionCard = ({ title, icon: Icon, iconColor, children, className = '' }) => (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden ${className}`}>
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
            {Icon && <Icon size={15} className={iconColor || 'text-blue-600'} />}
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">{title}</h2>
        </div>
        <div className="p-5">{children}</div>
    </div>
);

/* ─── Main Component ─────────────────────────────────────────── */
const SalesLeadWorkspace = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const {
        leads,
        fetchLeads,
        updateLeadStatus,
        addActionToLead,
        refreshLeadActivities,
        assignLead,
        scheduleAutomationHandshake,
        getLeadAutomationJobs,
        updateAutomationJobStatus,
    } = useSales();
    const { showToast } = useToast();
    const { projects } = useProjects();

    const lead = useMemo(() => leads.find(l => l.id === id), [leads, id]);

    const aiPlaybook = useMemo(
        () => aiPlaybookDefaults(lead?.scoreLabel, lead?.status),
        [lead?.scoreLabel, lead?.status, lead?.id]
    );

    // Modal
    const [modal, setModal] = useState(null);
    const [playingId, setPlayingId] = useState(null);
    const [transcriptId, setTranscriptId] = useState(null);
    const [activeTab, setActiveTab] = useState('timeline');

    // Modal form state
    const [waText, setWaText] = useState('');
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');
    const [noteText, setNoteText] = useState('');
    const [automationJobs, setAutomationJobs] = useState([]);
    const [creatingAutomation, setCreatingAutomation] = useState(false);
    const [cancellingAutomationId, setCancellingAutomationId] = useState(null);
    const [confirmingChatJobId, setConfirmingChatJobId] = useState(null);
    const [incomingCallJob, setIncomingCallJob] = useState(null);
    const [incomingCallSecondsLeft, setIncomingCallSecondsLeft] = useState(0);
    const [startingLiveCall, setStartingLiveCall] = useState(false);
    const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
    const [isCallActive, setIsCallActive] = useState(false);
    const [voiceSession, setVoiceSession] = useState(null);
    const [aiControlMode, setAiControlMode] = useState('ai');
    const [complianceEvents, setComplianceEvents] = useState([]);
    /** Mirrors session start `voice_stt.provider` for call UI hint */
    const [inboundSttMode, setInboundSttMode] = useState('browser');
    const [voiceProjectId, setVoiceProjectId] = useState('');
    const [voiceAgentName, setVoiceAgentName] = useState('SalesPal AI');
    const [voiceLocale, setVoiceLocale] = useState('auto');
    const [browserVoices, setBrowserVoices] = useState([]);
    const [salesCallWindow, setSalesCallWindow] = useState({ start: '09:00', end: '21:00' });

    // Hydrate persisted lead history on page load / lead switch.
    useEffect(() => {
        if (!lead?.id || !isPersistableLeadId(lead.id)) return;
        refreshLeadActivities(lead.id);
    }, [lead?.id, refreshLeadActivities]);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return undefined;
        const load = () => {
            try {
                setBrowserVoices(window.speechSynthesis.getVoices().filter(Boolean));
            } catch (_) {
                setBrowserVoices([]);
            }
        };
        load();
        window.speechSynthesis.onvoiceschanged = load;
        return () => {
            if (window.speechSynthesis.onvoiceschanged === load) {
                window.speechSynthesis.onvoiceschanged = null;
            }
        };
    }, []);

    useEffect(() => {
        let mounted = true;
        const loadSalesSettings = async () => {
            try {
                const settings = await api.get('/users/me/settings');
                const sales = settings?.sales && typeof settings.sales === 'object' ? settings.sales : {};
                const start = String(sales.callStart || '09:00').trim();
                const end = String(sales.callEnd || '21:00').trim();
                if (mounted) setSalesCallWindow({ start, end });
            } catch (_) {
                if (mounted) setSalesCallWindow({ start: '09:00', end: '21:00' });
            }
        };
        loadSalesSettings();
        return () => {
            mounted = false;
        };
    }, []);

    const [ttsVoiceUri, setTtsVoiceUri] = useState('');
    const [persistVoiceProjectToLead, setPersistVoiceProjectToLead] = useState(true);
    const [syncIntentFromVoiceCall, setSyncIntentFromVoiceCall] = useState(true);
    const [savingLeadProject, setSavingLeadProject] = useState(false);
    const speechRef = useRef(null);
    const sarvamAudioRef = useRef(null);
    /** 'browser' | 'sarvam' — set from POST /ai/voice/session/start response */
    const voicePlaybackProviderRef = useRef('browser');
    /** True when backend config explicitly requires Sarvam TTS (no browser fallback). */
    const sarvamTtsRequiredRef = useRef(false);
    /** 'browser' | 'sarvam' — inbound STT via Web Speech API vs Sarvam REST */
    const voiceSttProviderRef = useRef('browser');
    const sarvamSttAbortRef = useRef(false);
    const sarvamListenLoopRunningRef = useRef(false);
    const sarvamSttRafRef = useRef(null);
    const sttAudioContextRef = useRef(null);
    const sttAnalyserNodeRef = useRef(null);
    const sttMediaSourceNodeRef = useRef(null);
    const sttSegRecorderRef = useRef(null);
    const sttScratchAudioRef = useRef(null);
    const voiceSessionRef = useRef(null);
    const liveCallTranscriptRef = useRef([]);
    const voiceTtsOptsRef = useRef({ uri: '', rate: 0.92, pitch: 1 });
    /** Live volume for current utterance (mute speaker must not cancel speech / onEnd) */
    const isSpeakerMutedRef = useRef(false);
    const recognitionRef = useRef(null);
    /** Synchronous guard — state updates lag behind recognition.onend; prevents restart loops after End Call */
    const callActiveRef = useRef(false);
    const micMutedRef = useRef(false);
    const listenRestartTimeoutRef = useRef(null);
    /** Prevents double /ai/voice/session/start (double-click, Strict Mode, or rapid taps) */
    const voiceSessionStartLockRef = useRef(false);
    /** User closed modal during connect — ignore late API response */
    const voiceCallDismissedRef = useRef(false);
    /** True when Tata PSTN call is handling audio via server-side Voice Bot WebSocket streaming */
    const pstnStreamingActiveRef = useRef(false);
    /** Stops duplicate onresult bursts from firing multiple /voice/session/turn requests */
    const lastVoiceDupRef = useRef({ text: '', at: 0 });
    /** Mic only after AI finishes speaking (opener or reply); blocks talking over the lead */
    const voiceMicAllowedRef = useRef(false);
    const [voiceMicAllowed, setVoiceMicAllowed] = useState(false);
    /** True while waiting on /voice/session/turn or TTS for that turn */
    const aiVoiceBusyRef = useRef(false);
    const setAllowVoiceMic = (v) => {
        if (v && pstnStreamingActiveRef.current) return;
        voiceMicAllowedRef.current = v;
        setVoiceMicAllowed(v);
    };
    const waMessagesEndRef = useRef(null);
    const [isListening, setIsListening] = useState(false);
    const [lastHeardText, setLastHeardText] = useState('');
    const [isProcessingTurn, setIsProcessingTurn] = useState(false);
    const [isWaAiTyping, setIsWaAiTyping] = useState(false);
    const [liveCallTranscript, setLiveCallTranscript] = useState([]);
    const [switchingControlMode, setSwitchingControlMode] = useState(false);

    const workspaceLeadProjectValue = String(
        lead?.projectId ||
            lead?.project_id ||
            lead?.rawDeal?.metadata?.projectId ||
            lead?.rawDeal?.metadata?.project_id ||
            lead?.metadata?.projectId ||
            lead?.metadata?.project_id ||
            ''
    );

    const saveWorkspaceLeadProject = useCallback(
        async (nextId) => {
            if (!lead?.id || !isPersistableLeadId(lead.id)) return;
            setSavingLeadProject(true);
            try {
                const metadata = buildLeadProjectMetadata(lead, nextId || '', projects);
                await api.put(`/sales/${lead.id}`, { metadata });
                await fetchLeads();
                showToast({
                    title: 'Project saved',
                    description: nextId ? 'This lead is linked to the selected project.' : 'Project link removed from the lead.',
                    variant: 'success',
                });
            } catch (e) {
                showToast({
                    title: 'Could not save project',
                    description: e?.message || 'Try again.',
                    variant: 'error',
                });
            } finally {
                setSavingLeadProject(false);
            }
        },
        [lead, projects, fetchLeads, showToast]
    );

    useEffect(() => {
        voiceSessionRef.current = voiceSession;
    }, [voiceSession]);

    useEffect(() => {
        liveCallTranscriptRef.current = liveCallTranscript;
    }, [liveCallTranscript]);

    useEffect(() => {
        const loc = String(lead?.preferredLocale || 'en').toLowerCase();
        const rate = /^(hi|hing|mr|ta|te|kn|ml|gu|pa|bn)/.test(loc) ? 0.88 : 0.92;
        /** `__default__` = sentinel for “user explicitly chose browser default voice” vs empty/unset */
        const uri = ttsVoiceUri === '__default__' ? '' : String(ttsVoiceUri || '').trim();
        voiceTtsOptsRef.current = { uri, rate, pitch: 1 };
    }, [ttsVoiceUri, lead?.preferredLocale]);

    const waTypingTimeoutRef = useRef(null);
    const waNoReplyTimerRef = useRef(null);
    const callNoAnswerTimerRef = useRef(null);
    const hasLoggedVoiceConnectedRef = useRef(false);
    const isProcessingTurnRef = useRef(false);
    const callStartedAtRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordingChunksRef = useRef([]);
    const recordingStreamRef = useRef(null);
    const recordingUrlRef = useRef(null);
    const playingAudioRef = useRef(null);
    const callRingTimerRef = useRef(null);
    const incomingCallTimeoutRef = useRef(null);
    const activeIncomingCallJobIdRef = useRef(null);
    const seenDispatchedCallJobsRef = useRef(new Set());
    const seenDispatchedChatJobsRef = useRef(new Set());
    /** Parsed from GET /integrations/readiness (calling.* only; ignores Google Ads blockers). */
    const [aiReadiness, setAiReadiness] = useState({
        loading: true,
        /** /ai/chat — needs GOOGLE_GENERATIVE_AI_API_KEY on backend */
        chatReady: false,
        /** Voice session — needs GOOGLE_GENERATIVE_AI_API_KEY + DB tables ai_voice_sessions / ai_voice_turns */
        voiceReady: false,
        issuesChat: [],
        issuesVoice: [],
    });

    const openModal = (type) => {
        setWaText(''); setScheduleDate(''); setScheduleTime(''); setNoteText('');
        if (type === 'call') {
            voiceCallDismissedRef.current = false;
            setInboundSttMode('browser');
            setAllowVoiceMic(false);
            /** Require an explicit TTS choice after opening (user must pick default or a listed voice before starting). */
            setTtsVoiceUri('');
            const metaPid = lead?.projectId || lead?.rawDeal?.metadata?.projectId || lead?.project_id || '';
            const byName = projects.find(
                (p) => String(p.name || '').trim().toLowerCase() === String(lead?.project || '').trim().toLowerCase()
            );
            const inferredPid = metaPid || (byName ? byName.id : '');
            setVoiceProjectId((prev) => prev || inferredPid || '');
            setVoiceAgentName((prev) => prev || 'SalesPal AI');
        }
        setModal(type);
        if (type !== 'call') {
            setIsCallActive(false);
        }
    };

    /** Open Call / WhatsApp / Schedule / Note when arriving from leads table (`navigate(..., { state: { openModal } })`) */
    useEffect(() => {
        const m = location.state?.openModal;
        if (!lead || !m) return;
        if (!['call', 'whatsapp', 'schedule', 'note'].includes(m)) return;
        openModal(m);
        navigate(`/sales/leads/${id}`, { replace: true, state: {} });
    }, [lead, id, navigate, location.state?.openModal]);

    const clearPendingListenRestart = () => {
        if (listenRestartTimeoutRef.current != null) {
            clearTimeout(listenRestartTimeoutRef.current);
            listenRestartTimeoutRef.current = null;
        }
    };

    const clearWaTypingTimer = () => {
        if (waTypingTimeoutRef.current != null) {
            clearTimeout(waTypingTimeoutRef.current);
            waTypingTimeoutRef.current = null;
        }
    };

    const clearWaNoReplyTimer = () => {
        if (waNoReplyTimerRef.current != null) {
            clearTimeout(waNoReplyTimerRef.current);
            waNoReplyTimerRef.current = null;
        }
    };

    const clearCallNoAnswerTimer = () => {
        if (callNoAnswerTimerRef.current != null) {
            clearTimeout(callNoAnswerTimerRef.current);
            callNoAnswerTimerRef.current = null;
        }
    };

    const clearIncomingCallTimeout = () => {
        if (incomingCallTimeoutRef.current != null) {
            clearInterval(incomingCallTimeoutRef.current);
            incomingCallTimeoutRef.current = null;
        }
    };

    const stopIncomingRing = () => {
        if (callRingTimerRef.current != null) {
            clearInterval(callRingTimerRef.current);
            callRingTimerRef.current = null;
        }
    };

    const startIncomingRing = () => {
        stopIncomingRing();
        playNotificationSound();
        callRingTimerRef.current = setInterval(() => {
            playNotificationSound();
        }, 2500);
    };

    const startIncomingCallCountdown = () => {
        clearIncomingCallTimeout();
        setIncomingCallSecondsLeft(30);
        incomingCallTimeoutRef.current = setInterval(() => {
            setIncomingCallSecondsLeft((prev) => {
                const next = prev - 1;
                if (next <= 0) {
                    clearIncomingCallTimeout();
                    stopIncomingRing();
                    if (incomingCallJob && !isCallActive) {
                        dismissIncomingCall('missed');
                    }
                    return 0;
                }
                return next;
            });
        }, 1000);
    };

    const dismissIncomingCall = async (kind = 'declined') => {
        const jobId = incomingCallJob?.id;
        stopIncomingRing();
        clearIncomingCallTimeout();
        setIncomingCallSecondsLeft(0);
        if (jobId) {
            try {
                await updateAutomationJobStatus(jobId, 'cancelled');
            } catch (_) {
                // non-blocking
            }
        }
        if (incomingCallJob) {
            if (kind === 'missed') {
                addActionToLead(
                    lead.id,
                    'call',
                    'Incoming scheduled call missed',
                    'Lead did not answer scheduled incoming bot call in time.',
                    { outcome: 'No Answer', duration: '0m 00s' }
                );
            } else {
                addActionToLead(
                    lead.id,
                    'call',
                    'Incoming scheduled call declined',
                    'User declined scheduled incoming bot call.',
                    { outcome: 'Declined', duration: '0m 00s' }
                );
            }
        }
        setIncomingCallJob(null);
        setModal(null);
    };

    const pushLiveTranscript = (speaker, text, meta = null) => {
        const line = String(text || '').trim();
        if (!line) return;
        const sourceLabel = meta?.sourceLabel ? String(meta.sourceLabel) : '';
        setLiveCallTranscript((prev) => [...prev, { speaker, text: line, sourceLabel }]);
    };

    const startCallRecording = async () => {
        if (pstnStreamingActiveRef.current) return;
        if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia || typeof window.MediaRecorder === 'undefined') {
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new window.MediaRecorder(stream);
            recordingChunksRef.current = [];
            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) recordingChunksRef.current.push(event.data);
            };
            recorder.start();
            mediaRecorderRef.current = recorder;
            recordingStreamRef.current = stream;
        } catch (err) {
            showToast({
                title: 'Recording unavailable',
                description: err?.message || 'Microphone recording could not be started.',
                variant: 'warning',
            });
        }
    };

    const stopCallRecording = async () => {
        return new Promise((resolve) => {
            const recorder = mediaRecorderRef.current;
            if (!recorder) {
                resolve(recordingUrlRef.current || null);
                return;
            }

            const finalize = () => {
                try {
                    const blob = new Blob(recordingChunksRef.current || [], { type: 'audio/webm' });
                    const url = blob.size > 0 ? URL.createObjectURL(blob) : null;
                    recordingUrlRef.current = url;
                    resolve(url);
                } catch (_) {
                    resolve(null);
                }
            };

            recorder.onstop = finalize;
            try {
                recorder.stop();
            } catch (_) {
                finalize();
            }

            if (recordingStreamRef.current) {
                recordingStreamRef.current.getTracks().forEach((t) => t.stop());
                recordingStreamRef.current = null;
            }
            mediaRecorderRef.current = null;
        });
    };

    const handlePlayRecording = (call) => {
        if (!call?.recordingUrl) {
            setPlayingId(playingId === call.id ? null : call.id);
            return;
        }
        if (playingAudioRef.current && playingId === call.id) {
            playingAudioRef.current.pause();
            playingAudioRef.current = null;
            setPlayingId(null);
            return;
        }
        if (playingAudioRef.current) {
            playingAudioRef.current.pause();
            playingAudioRef.current = null;
        }
        const audio = new Audio(call.recordingUrl);
        playingAudioRef.current = audio;
        setPlayingId(call.id);
        audio.onended = () => {
            if (playingAudioRef.current === audio) playingAudioRef.current = null;
            setPlayingId(null);
        };
        audio.play().catch(() => setPlayingId(null));
    };

    const stopSpeaking = () => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        const a = sarvamAudioRef.current;
        if (a) {
            a.onended = null;
            a.onerror = null;
            try {
                a.pause();
            } catch (_) {
                /* ignore */
            }
            if (a.src && String(a.src).startsWith('blob:')) {
                try {
                    URL.revokeObjectURL(a.src);
                } catch (_) {
                    /* ignore */
                }
            }
            sarvamAudioRef.current = null;
        }
        speechRef.current = null;
    };

    const speakText = (text, onEnd, engineOpts = {}) => {
        if (pstnStreamingActiveRef.current) {
            if (typeof onEnd === 'function') onEnd();
            return;
        }
        const forceBrowser = engineOpts.forceBrowser === true;
        if (callActiveRef.current) clearCallNoAnswerTimer();
        if (!text) {
            if (typeof onEnd === 'function') onEnd();
            return;
        }
        const done = () => {
            if (typeof onEnd === 'function') onEnd();
        };
        const useSarvam = !forceBrowser && voicePlaybackProviderRef.current === 'sarvam';
        if (useSarvam) {
            void (async () => {
                try {
                    stopSpeaking();
                    const locale = String(lead?.preferredLocale || 'hing').trim() || 'hing';
                    const r = await api.post('/ai/voice/tts', { text, locale });
                    const b64 = r?.audio_base64;
                    const mime = r?.mime_type || 'audio/wav';
                    if (!b64) {
                        if (sarvamTtsRequiredRef.current) {
                            showToast({
                                title: 'Sarvam TTS returned empty audio',
                                description: 'Sarvam-only mode is active, so browser fallback is blocked.',
                                variant: 'error',
                            });
                            done();
                            return;
                        }
                        speakText(text, onEnd, { forceBrowser: true });
                        return;
                    }
                    const blob = decodeBase64ToBlob(b64, mime);
                    if (!blob) {
                        if (sarvamTtsRequiredRef.current) {
                            showToast({
                                title: 'Sarvam audio decode failed',
                                description: 'Sarvam-only mode is active, so browser fallback is blocked.',
                                variant: 'error',
                            });
                            done();
                            return;
                        }
                        speakText(text, onEnd, { forceBrowser: true });
                        return;
                    }
                    const url = URL.createObjectURL(blob);
                    const audio = new Audio(url);
                    sarvamAudioRef.current = audio;
                    audio.volume = isSpeakerMutedRef.current ? 0 : 1;
                    const cleanup = () => {
                        if (sarvamAudioRef.current === audio) {
                            sarvamAudioRef.current = null;
                        }
                        try {
                            URL.revokeObjectURL(url);
                        } catch (_) {
                            /* ignore */
                        }
                    };
                    audio.onended = () => {
                        cleanup();
                        done();
                    };
                    audio.onerror = () => {
                        cleanup();
                        if (sarvamTtsRequiredRef.current) {
                            showToast({
                                title: 'Sarvam playback failed',
                                description: 'Sarvam-only mode is active, so browser fallback is blocked.',
                                variant: 'error',
                            });
                            done();
                            return;
                        }
                        speakText(text, onEnd, { forceBrowser: true });
                    };
                    try {
                        await audio.play();
                    } catch (_) {
                        cleanup();
                        if (sarvamTtsRequiredRef.current) {
                            showToast({
                                title: 'Sarvam audio could not play',
                                description: 'Sarvam-only mode is active, so browser fallback is blocked.',
                                variant: 'error',
                            });
                            done();
                            return;
                        }
                        speakText(text, onEnd, { forceBrowser: true });
                    }
                } catch (e) {
                    console.warn('Sarvam TTS failed:', e?.message || e);
                    if (sarvamTtsRequiredRef.current) {
                        showToast({
                            title: 'Sarvam TTS failed',
                            description: e?.message || 'Sarvam synthesis failed in Sarvam-only mode.',
                            variant: 'error',
                        });
                        done();
                        return;
                    }
                    speakText(text, onEnd, { forceBrowser: true });
                }
            })();
            return;
        }
        if (typeof window === 'undefined' || !window.speechSynthesis || typeof window.SpeechSynthesisUtterance === 'undefined') {
            done();
            return;
        }
        stopSpeaking();
        const utterance = new window.SpeechSynthesisUtterance(text);
        utterance.lang = speechRecognitionLangForLocale(lead?.preferredLocale || 'hing');
        const opts = voiceTtsOptsRef.current || { uri: '', rate: 0.92, pitch: 1 };
        utterance.rate = typeof opts.rate === 'number' ? opts.rate : 0.92;
        utterance.pitch = typeof opts.pitch === 'number' ? opts.pitch : 1;
        utterance.volume = isSpeakerMutedRef.current ? 0 : 1;
        if (opts.uri && window.speechSynthesis.getVoices) {
            const v = window.speechSynthesis.getVoices().find((x) => x.voiceURI === opts.uri);
            if (v) utterance.voice = v;
        }
        utterance.onstart = () => {
            applySpeakerOutputMuteState(isSpeakerMutedRef.current, speechRef, sarvamAudioRef);
        };
        utterance.onend = () => {
            speechRef.current = null;
            done();
        };
        utterance.onerror = () => {
            speechRef.current = null;
            done();
        };
        speechRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    };

    const endLiveAICall = async (opts = {}) => {
        const reason = opts.reason || 'user_end';
        const conversationId = voiceSessionRef.current?.conversationId || null;
        const transcriptSnapshot = Array.isArray(liveCallTranscriptRef.current)
            ? [...liveCallTranscriptRef.current]
            : [];
        voiceSessionStartLockRef.current = false;
        lastVoiceDupRef.current = { text: '', at: 0 };
        aiVoiceBusyRef.current = false;
        pstnStreamingActiveRef.current = false;
        setAllowVoiceMic(false);
        clearPendingListenRestart();
        clearCallNoAnswerTimer();
        hasLoggedVoiceConnectedRef.current = false;
        callActiveRef.current = false;
        setIsProcessingTurn(false);
        stopListening();
        teardownSttAudio(true);
        stopSpeaking();
        voicePlaybackProviderRef.current = 'browser';
        voiceSttProviderRef.current = 'browser';
        setInboundSttMode('browser');
        setIsCallActive(false);
        setVoiceSession(null);
        setComplianceEvents([]);
        const recordingUrl = await stopCallRecording();
        const startedAt = callStartedAtRef.current || Date.now();
        const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        const mm = Math.floor(seconds / 60);
        const ss = String(seconds % 60).padStart(2, '0');
        const duration = `${mm}m ${ss}s`;

        let actionTitle = 'AI Voice Call Completed';
        let detailText = 'Call ended by user.';
        let outcomeLabel = 'Completed';
        if (reason === 'no_answer') {
            actionTitle = `Call result: ${CALL_RESULT.NO_ANSWER}`;
            detailText = CALL_RESULT_DETAIL[CALL_RESULT.NO_ANSWER];
            outcomeLabel = CALL_RESULT.NO_ANSWER;
        } else if (reason === 'busy') {
            actionTitle = `Call result: ${CALL_RESULT.BUSY}`;
            detailText = CALL_RESULT_DETAIL[CALL_RESULT.BUSY];
            outcomeLabel = CALL_RESULT.BUSY;
        } else if (reason === 'wrong_number') {
            actionTitle = `Call result: ${CALL_RESULT.WRONG_NUMBER}`;
            detailText = CALL_RESULT_DETAIL[CALL_RESULT.WRONG_NUMBER];
            outcomeLabel = CALL_RESULT.WRONG_NUMBER;
        }

        addActionToLead(lead.id, 'call', actionTitle, detailText, {
            outcome: outcomeLabel,
            duration,
            recording: recordingUrl ? `Call_${String(lead.id).slice(0, 6)}_${Date.now()}.webm` : null,
            recordingUrl,
            transcript: transcriptSnapshot,
        });
        setLiveCallTranscript([]);
        liveCallTranscriptRef.current = [];
        callStartedAtRef.current = null;

        if (conversationId && aiReadiness.voiceReady) {
            try {
                const sum = await api.post('/ai/voice/session/summary', { conversationId });
                const js = sum?.summary_json;
                if (js && typeof js.summary === 'string' && js.summary.trim()) {
                    const tier = String(js.suggested_intent_tier || '').trim();
                    const lines = [
                        js.summary.trim(),
                        js.next_action ? `Next step: ${js.next_action}` : '',
                        js.intent_rationale ? `Intent (${tier || '—'}): ${js.intent_rationale}` : '',
                    ].filter(Boolean);
                    addActionToLead(lead.id, 'ai_action', 'Call summary & intent', lines.join('\n'), {
                        sentiment: js.sentiment,
                        outcome: js.outcome,
                        suggested_intent_tier: tier || undefined,
                        suggested_ai_score: js.suggested_ai_score,
                    });
                    const patch = mapVoiceTierToCrmPatch(js.suggested_intent_tier, js.suggested_ai_score);
                    if (
                        syncIntentFromVoiceCall &&
                        patch &&
                        lead?.id &&
                        isPersistableLeadId(lead.id) &&
                        transcriptSnapshot.length >= 2
                    ) {
                        await api.put(`/sales/${lead.id}`, patch);
                        await fetchLeads();
                        showToast({
                            title: 'Lead synced from call',
                            description: `AI classified this call as ${tier || 'Warm'}; pipeline and score were updated.`,
                            variant: 'success',
                        });
                    }
                }
            } catch (e) {
                console.warn('Voice session summary:', e?.message || e);
            }
        }
        const activeIncomingJobId = activeIncomingCallJobIdRef.current;
        if (activeIncomingJobId) {
            try {
                await updateAutomationJobStatus(activeIncomingJobId, 'completed');
            } catch (_) {
                // non-blocking
            }
            activeIncomingCallJobIdRef.current = null;
        }
        clearIncomingCallTimeout();
        setIncomingCallSecondsLeft(0);
        setIncomingCallJob(null);
        setModal(null);
    };

    const scheduleCallNoAnswerTimer = () => {
        clearCallNoAnswerTimer();
        if (!callActiveRef.current || micMutedRef.current) return;
        callNoAnswerTimerRef.current = setTimeout(() => {
            callNoAnswerTimerRef.current = null;
            if (!callActiveRef.current) return;
            endLiveAICall({ reason: 'no_answer' });
        }, VOICE_SILENCE_MS);
    };

    const scheduleWaNoReplyTimer = () => {
        clearWaNoReplyTimer();
        if (!lead?.id) return;
        waNoReplyTimerRef.current = setTimeout(() => {
            waNoReplyTimerRef.current = null;
            addActionToLead(
                lead.id,
                'ai_action',
                `WhatsApp user reply: ${WHATSAPP_REPLY_STATE.NO} (30s)`,
                WHATSAPP_NO_REPLY_DETAIL,
                {}
            );
            showToast({
                title: 'No reply from lead',
                description: WHATSAPP_NO_REPLY_DETAIL,
                variant: 'default',
            });
        }, WHATSAPP_SILENCE_MS);
    };

    const teardownSttAudio = (hard) => {
        if (hard) sarvamSttAbortRef.current = true;
        if (sarvamSttRafRef.current != null) {
            cancelAnimationFrame(sarvamSttRafRef.current);
            sarvamSttRafRef.current = null;
        }
        try {
            const seg = sttSegRecorderRef.current;
            if (seg && seg.state !== 'inactive') seg.stop();
        } catch (_) {
            /* no-op */
        }
        sttSegRecorderRef.current = null;
        try {
            sttMediaSourceNodeRef.current?.disconnect();
        } catch (_) {
            /* no-op */
        }
        sttMediaSourceNodeRef.current = null;
        if (!hard) return;
        try {
            sttAnalyserNodeRef.current?.disconnect();
        } catch (_) {
            /* no-op */
        }
        sttAnalyserNodeRef.current = null;
        const ctx = sttAudioContextRef.current;
        if (ctx && ctx.state !== 'closed') {
            ctx.close().catch(() => {});
        }
        sttAudioContextRef.current = null;
        sttScratchAudioRef.current = null;
    };

    const stopListening = () => {
        clearPendingListenRestart();
        sarvamSttAbortRef.current = true;
        if (sarvamSttRafRef.current != null) {
            cancelAnimationFrame(sarvamSttRafRef.current);
            sarvamSttRafRef.current = null;
        }
        try {
            const seg = sttSegRecorderRef.current;
            if (seg && seg.state !== 'inactive') seg.stop();
        } catch (_) {
            /* no-op */
        }
        sttSegRecorderRef.current = null;
        try {
            if (recognitionRef.current) {
                recognitionRef.current.onresult = null;
                recognitionRef.current.onerror = null;
                recognitionRef.current.onend = null;
                recognitionRef.current.stop();
            }
        } catch (_) {
            // no-op
        } finally {
            recognitionRef.current = null;
            setIsListening(false);
        }
    };

    const handleVoiceTurn = async (heardText) => {
        const text = String(heardText || '').trim();
        if (!text || !voiceSession?.conversationId || isProcessingTurn) return;
        if (aiControlMode === 'human') return;
        if (!callActiveRef.current) return;
        if (micMutedRef.current) return;
        const now = Date.now();
        if (text === lastVoiceDupRef.current.text && now - lastVoiceDupRef.current.at < 1200) {
            return;
        }
        lastVoiceDupRef.current = { text, at: now };

        clearCallNoAnswerTimer();
        if (!hasLoggedVoiceConnectedRef.current) {
            hasLoggedVoiceConnectedRef.current = true;
            addActionToLead(
                lead.id,
                'ai_action',
                `Call result: ${CALL_RESULT.CONNECTED}`,
                CALL_RESULT_DETAIL[CALL_RESULT.CONNECTED],
                {}
            );
        }

        aiVoiceBusyRef.current = true;
        setAllowVoiceMic(false);
        stopListening();
        setIsProcessingTurn(true);
        try {
            addActionToLead(lead.id, 'call', 'Lead Spoke', text, { outcome: 'In conversation' });
            pushLiveTranscript('Lead', text);
            const turn = await api.post('/ai/voice/session/turn', {
                brandId: voiceSession.brandId,
                leadId: voiceSession.leadId,
                conversationId: voiceSession.conversationId,
                text,
            });
            const nextMode = String(turn?.control_mode || 'ai').toLowerCase() === 'human' ? 'human' : 'ai';
            setAiControlMode(nextMode);
            await refreshComplianceEvents();

            const reply = turn?.assistant_reply ? String(turn.assistant_reply).trim() : '';
            if (nextMode === 'human') {
                stopListening();
                setAllowVoiceMic(false);
                aiVoiceBusyRef.current = false;
                setIsProcessingTurn(false);
                showToast({
                    title: 'Human takeover active',
                    description: 'AI is paused for this conversation. Human agent controls the interaction now.',
                    variant: 'warning',
                });
                return;
            }
            if (reply && callActiveRef.current) {
                addActionToLead(lead.id, 'call', 'AI Voice Reply', reply, { outcome: 'Responded' });
                pushLiveTranscript('AI', reply, { sourceLabel: turn?.fact_source?.label || '' });
                speakText(reply, () => {
                    aiVoiceBusyRef.current = false;
                    if (callActiveRef.current) {
                        setAllowVoiceMic(true);
                        scheduleCallNoAnswerTimer();
                    }
                    setIsProcessingTurn(false);
                });
            } else {
                aiVoiceBusyRef.current = false;
                if (callActiveRef.current) setAllowVoiceMic(true);
                setIsProcessingTurn(false);
            }
        } catch (err) {
            aiVoiceBusyRef.current = false;
            if (callActiveRef.current) setAllowVoiceMic(true);
            setIsProcessingTurn(false);
            addActionToLead(lead.id, 'call', 'AI Voice Turn Failed', err?.message || 'Could not process voice turn.');
            showToast({
                title: 'Voice turn failed',
                description: err?.message || 'Could not process your speech input.',
                variant: 'error',
            });
        }
    };

    const switchConversationControlMode = async (mode) => {
        const next = String(mode || 'ai').toLowerCase() === 'human' ? 'human' : 'ai';
        if (!voiceSession?.conversationId) return;
        setSwitchingControlMode(true);
        try {
            const out = await api.post('/ai/voice/session/takeover', {
                conversationId: voiceSession.conversationId,
                mode: next,
            });
            const resolved = String(out?.control_mode || next).toLowerCase() === 'human' ? 'human' : 'ai';
            setAiControlMode(resolved);
            await refreshComplianceEvents();
            if (resolved === 'human') {
                stopListening();
                setAllowVoiceMic(false);
            } else if (callActiveRef.current) {
                setAllowVoiceMic(true);
            }
            showToast({
                title: resolved === 'human' ? 'Human takeover enabled' : 'AI resumed',
                description:
                    resolved === 'human'
                        ? 'AI responses are paused for this conversation.'
                        : 'AI assistant can respond again in this conversation.',
                variant: resolved === 'human' ? 'warning' : 'success',
            });
        } catch (err) {
            showToast({
                title: 'Could not change control mode',
                description: err?.message || 'Try again.',
                variant: 'error',
            });
        } finally {
            setSwitchingControlMode(false);
        }
    };

    const refreshComplianceEvents = useCallback(async () => {
        const cid = voiceSessionRef.current?.conversationId;
        if (!cid) {
            setComplianceEvents([]);
            return;
        }
        try {
            const out = await api.get(`/ai/voice/session/actions?conversationId=${encodeURIComponent(cid)}`);
            const events = Array.isArray(out?.events) ? out.events : [];
            setComplianceEvents(events);
        } catch (_) {
            // keep UI resilient
        }
    }, []);

    const parseCompliancePayload = (payload) => {
        if (!payload) return {};
        if (typeof payload === 'object') return payload;
        if (typeof payload !== 'string') return {};
        try {
            return JSON.parse(payload);
        } catch (_) {
            return {};
        }
    };

    const toTitleCaseWords = (text) =>
        String(text || '')
            .split(/\s+/)
            .filter(Boolean)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

    const describeComplianceEvent = (event) => {
        const kind = String(event?.action_type || '').toLowerCase();
        const payload = parseCompliancePayload(event?.payload);
        const mode = String(payload?.compliance?.mode || payload?.mode || '').toLowerCase();
        const rawReason = String(payload?.compliance?.reason || payload?.reason || '').trim();
        const reason = rawReason ? toTitleCaseWords(rawReason.replace(/_/g, ' ')) : '';

        if (kind.includes('takeover')) return { label: 'Human Takeover', tone: 'warn', reason };
        if (kind.includes('hard_block') || kind.includes('realtime_compliance_block') || mode === 'hard_block') {
            return { label: 'Hard Block', tone: 'danger', reason };
        }
        if (mode === 'serious_incident') return { label: 'Serious Incident', tone: 'warn', reason };
        if (mode === 'soft_low_intent') return { label: 'Soft Low Intent', tone: 'ok', reason };
        if (kind.includes('incident')) return { label: 'Compliance Incident', tone: 'warn', reason };
        return { label: event?.action_type || 'Compliance Event', tone: 'ok', reason };
    };

    const moderateRealtimeUtterance = async (text) => {
        const t = String(text || '').trim();
        if (!t || !voiceSession?.conversationId) return { blockNow: false };
        try {
            const out = await api.post('/ai/voice/session/realtime-moderate', {
                conversationId: voiceSession.conversationId,
                text: t,
            });
            if (out?.block_now) {
                setAiControlMode('human');
                stopListening();
                setAllowVoiceMic(false);
                await refreshComplianceEvents();
                showToast({
                    title: 'Compliance kill-switch triggered',
                    description:
                        out?.compliance?.reason === 'user_opt_out'
                            ? 'Lead asked to stop. AI is paused and conversation moved to human control.'
                            : 'Hard compliance event detected. AI paused; human takeover enabled.',
                    variant: 'error',
                });
                return { blockNow: true, compliance: out?.compliance || null };
            }
            return { blockNow: false, compliance: out?.compliance || null };
        } catch (_) {
            return { blockNow: false };
        }
    };

    const pickSttRecorderMimeType = () => {
        try {
            const list = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
            for (const t of list) {
                if (window.MediaRecorder?.isTypeSupported?.(t)) return t;
            }
        } catch (_) {
            /* no-op */
        }
        return '';
    };

    const rmsFromAnalyser = (analyser) => {
        const n = analyser.fftSize;
        let buf = sttScratchAudioRef.current;
        if (!buf || buf.length !== n) {
            buf = new Float32Array(n);
            sttScratchAudioRef.current = buf;
        }
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < n; i += 1) {
            const v = buf[i];
            sum += v * v;
        }
        return Math.sqrt(sum / n);
    };

    const ensureSttAnalyserAttached = async (stream) => {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) throw new Error('AudioContext not available');
        if (!sttAudioContextRef.current || sttAudioContextRef.current.state === 'closed') {
            sttAudioContextRef.current = new AC();
            sttAnalyserNodeRef.current = sttAudioContextRef.current.createAnalyser();
            sttAnalyserNodeRef.current.fftSize = 2048;
            sttAnalyserNodeRef.current.smoothingTimeConstant = 0.45;
        }
        const ctx = sttAudioContextRef.current;
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }
        const analyser = sttAnalyserNodeRef.current;
        try {
            sttMediaSourceNodeRef.current?.disconnect();
        } catch (_) {
            /* no-op */
        }
        const src = ctx.createMediaStreamSource(stream);
        sttMediaSourceNodeRef.current = src;
        src.connect(analyser);
        return analyser;
    };

    const captureSarvamUtteranceBlob = async (stream) => {
        const THRESH = 0.02;
        const SILENCE_MS = 850;
        const MAX_UTT_MS = 26000;
        const MAX_WAIT_MS = 75000;
        const consecNeed = 3;

        if (sarvamSttAbortRef.current) return null;

        let analyser;
        try {
            analyser = await ensureSttAnalyserAttached(stream);
        } catch (e) {
            showToast({
                title: 'Audio analyzer failed',
                description: e?.message || 'Could not process microphone audio.',
                variant: 'warning',
            });
            return null;
        }

        const waited = await new Promise((resolve) => {
            let consec = 0;
            const waitStart = performance.now();
            const tick = () => {
                if (sarvamSttAbortRef.current || !callActiveRef.current || micMutedRef.current || !voiceMicAllowedRef.current) {
                    sarvamSttRafRef.current = null;
                    return resolve(false);
                }
                const rms = rmsFromAnalyser(analyser);
                const now = performance.now();
                if (now - waitStart > MAX_WAIT_MS) {
                    sarvamSttRafRef.current = null;
                    return resolve(false);
                }
                if (rms >= THRESH) {
                    consec += 1;
                    if (consec >= consecNeed) {
                        sarvamSttRafRef.current = null;
                        return resolve(true);
                    }
                } else {
                    consec = 0;
                }
                sarvamSttRafRef.current = requestAnimationFrame(tick);
            };
            sarvamSttRafRef.current = requestAnimationFrame(tick);
        });

        if (!waited || sarvamSttAbortRef.current) return null;

        const mimeChoice = pickSttRecorderMimeType();
        let rec;
        try {
            rec = mimeChoice ? new window.MediaRecorder(stream, { mimeType: mimeChoice }) : new window.MediaRecorder(stream);
        } catch (_) {
            rec = new window.MediaRecorder(stream);
        }
        const chunks = [];
        rec.ondataavailable = (ev) => {
            if (ev.data && ev.data.size > 0) chunks.push(ev.data);
        };
        sttSegRecorderRef.current = rec;

        try {
            rec.start(140);
        } catch (_) {
            try {
                rec.start();
            } catch (_2) {
                sttSegRecorderRef.current = null;
                return null;
            }
        }

        const utterBegin = performance.now();
        let lastLoud = utterBegin;

        await new Promise((resolve) => {
            const tick = () => {
                if (sarvamSttAbortRef.current || !callActiveRef.current || micMutedRef.current || !voiceMicAllowedRef.current) {
                    sarvamSttRafRef.current = null;
                    return resolve();
                }
                const now = performance.now();
                const rms = rmsFromAnalyser(analyser);
                if (rms >= THRESH) lastLoud = now;

                const pastSilence = now - lastLoud >= SILENCE_MS;
                const pastMax = now - utterBegin >= MAX_UTT_MS;
                if (pastSilence || pastMax) {
                    sarvamSttRafRef.current = null;
                    return resolve();
                }
                sarvamSttRafRef.current = requestAnimationFrame(tick);
            };
            sarvamSttRafRef.current = requestAnimationFrame(tick);
        });

        await new Promise((resolve) => {
            const finalize = () => resolve();
            rec.onstop = () => finalize();
            try {
                if (rec.state !== 'inactive') rec.stop();
                else finalize();
            } catch (_) {
                finalize();
            }
        });
        sttSegRecorderRef.current = null;

        const blobType =
            mimeChoice ||
            (typeof chunks[0]?.type === 'string' && chunks[0].type) ||
            rec.mimeType ||
            'audio/webm';
        const blob = new Blob(chunks, { type: blobType });
        return blob.size > 0 ? blob : null;
    };

    const runSarvamListenLoop = async () => {
        const stream = recordingStreamRef.current;
        const live = Boolean(stream?.getAudioTracks?.().some?.((t) => t.readyState === 'live'));
        if (!live) {
            showToast({
                title: 'Microphone not ready',
                description: 'Sarvam speech-to-text needs the live call microphone. Grant access and restart the AI call.',
                variant: 'warning',
            });
            return;
        }

        sarvamSttAbortRef.current = false;
        sarvamListenLoopRunningRef.current = true;

        try {
            while (
                callActiveRef.current &&
                voiceSttProviderRef.current === 'sarvam' &&
                !sarvamSttAbortRef.current
            ) {
                if (!voiceMicAllowedRef.current || micMutedRef.current || aiVoiceBusyRef.current) {
                    await new Promise((r) => setTimeout(r, 120));
                    continue;
                }

                setIsListening(true);
                const blob = await captureSarvamUtteranceBlob(stream);
                if (sarvamSttAbortRef.current) break;
                if (!callActiveRef.current || !voiceMicAllowedRef.current) break;

                if (!blob || blob.size < 1400) {
                    await new Promise((r) => setTimeout(r, 50));
                    continue;
                }

                setIsListening(false);
                let text = '';
                try {
                    const fd = new FormData();
                    fd.append('locale', String(lead?.preferredLocale || 'hing'));
                    let ext = 'webm';
                    const tlow = String(blob.type || '').toLowerCase();
                    if (tlow.includes('ogg')) ext = 'ogg';
                    fd.append('audio', blob, `utterance.${ext}`);
                    const data = await api.post('/ai/voice/stt', fd);
                    text = String(data?.text || '').trim();
                } catch (e) {
                    showToast({
                        title: 'Sarvam speech-to-text failed',
                        description: e?.message || 'Could not transcribe audio.',
                        variant: 'error',
                    });
                    await new Promise((r) => setTimeout(r, 350));
                    continue;
                }

                if (sarvamSttAbortRef.current) break;
                if (text) {
                    setLastHeardText(text);
                    const moderation = await moderateRealtimeUtterance(text);
                    if (moderation?.blockNow) continue;
                    await handleVoiceTurn(text);
                }
            }
        } finally {
            sarvamListenLoopRunningRef.current = false;
            setIsListening(false);
        }
    };

    const startListening = async () => {
        if (isMicMuted || !callActiveRef.current || !voiceMicAllowedRef.current) return;
        if (typeof window === 'undefined') return;

        const useSegmentSarvamStt =
            voiceSttProviderRef.current === 'sarvam' && !shouldAvoidSarvamMicSegmentCapture();
        if (useSegmentSarvamStt) {
            if (sarvamListenLoopRunningRef.current) return;
            sarvamSttAbortRef.current = false;
            void runSarvamListenLoop();
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            showToast({
                title: 'Speech recognition not supported',
                description: 'This browser does not support live voice capture. Use Chrome/Edge for best results.',
                variant: 'warning',
            });
            return;
        }

        if (recognitionRef.current) {
            const prev = recognitionRef.current;
            prev.onresult = null;
            prev.onerror = null;
            prev.onend = null;
            try {
                prev.stop();
            } catch (_) {
                /* ignore */
            }
            recognitionRef.current = null;
        }
        clearPendingListenRestart();
        setIsListening(false);

        try {
            const recognition = new SpeechRecognition();
            recognition.lang = speechRecognitionLangForLocale(lead?.preferredLocale || 'en');
            recognition.interimResults = false;
            recognition.continuous = false;
            recognition.maxAlternatives = 1;

            recognition.onresult = async (event) => {
                if (micMutedRef.current) return;
                const result = event.results?.[event.resultIndex];
                const transcript = result?.[0]?.transcript?.trim() || '';
                if (!transcript) return;
                setLastHeardText(transcript);
                const moderation = await moderateRealtimeUtterance(transcript);
                if (moderation?.blockNow) return;
                await handleVoiceTurn(transcript);
            };

            recognition.onerror = () => {
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
                if (!callActiveRef.current || micMutedRef.current) return;
                if (!voiceMicAllowedRef.current || aiVoiceBusyRef.current) return;
                clearPendingListenRestart();
                listenRestartTimeoutRef.current = setTimeout(() => {
                    listenRestartTimeoutRef.current = null;
                    if (
                        callActiveRef.current &&
                        !micMutedRef.current &&
                        voiceMicAllowedRef.current &&
                        !aiVoiceBusyRef.current
                    ) {
                        startListening();
                    }
                }, 350);
            };

            recognitionRef.current = recognition;
            recognition.start();
            setIsListening(true);
        } catch (err) {
            setIsListening(false);
            showToast({
                title: 'Mic access issue',
                description: err?.message || 'Could not start microphone listening.',
                variant: 'error',
            });
        }
    };

    const startLiveAICall = async () => {
        if (voiceSessionStartLockRef.current || isCallActive || callActiveRef.current || startingLiveCall) {
            return;
        }
        if (!aiReadiness.voiceReady) {
            showToast({
                title: 'Voice AI is not ready',
                description: aiReadiness.issuesVoice[0] || 'Set GOOGLE_GENERATIVE_AI_API_KEY and run DB migrations for voice tables.',
                variant: 'warning',
            });
            return;
        }
        if (!isWithinCallActiveWindow(lead.timezone, salesCallWindow.start, salesCallWindow.end)) {
            showToast({
                title: 'Outside calling hours',
                description: callWindowLabel(lead.timezone, salesCallWindow.start, salesCallWindow.end),
                variant: 'warning',
            });
            return;
        }
        const projectIdForCall = String(voiceProjectId || '').trim();
        if (!projectIdForCall) {
            showToast({
                title: 'Select a project',
                description: 'Choose which listing the bot should discuss on this call (Project Brain above).',
                variant: 'warning',
            });
            return;
        }
        const agentTrim = String(voiceAgentName || '').trim();
        if (agentTrim.length < 2) {
            showToast({
                title: 'Agent name required',
                description: 'Enter how the AI should introduce itself (at least 2 characters).',
                variant: 'warning',
            });
            return;
        }
        voiceSessionStartLockRef.current = true;
        voiceCallDismissedRef.current = false;
        primeSpeechSynthesisFromUserGesture();
        setStartingLiveCall(true);
        try {
            if (
                persistVoiceProjectToLead &&
                projectIdForCall &&
                lead?.id &&
                isPersistableLeadId(lead.id)
            ) {
                try {
                    const metadata = buildLeadProjectMetadata(lead, projectIdForCall, projects);
                    await api.put(`/sales/${lead.id}`, { metadata });
                    await fetchLeads();
                } catch (e) {
                    showToast({
                        title: 'Could not save project on lead',
                        description: e?.message || 'Call will still use the selected project for this session.',
                        variant: 'warning',
                    });
                }
            }
            const waCommLocal = (lead.communications || []).find((c) => c.type === 'whatsapp');
            const history = (waCommLocal?.history || []).slice(-8);
            const openerContext = history.map((m) => `${m.sender}: ${m.text}`).join('\n');
            const mirrorSpokenLanguage = voiceLocale === 'auto';
            const openerLocale = String(lead.preferredLocale || 'hing').toLowerCase();
            const localeForSession = mirrorSpokenLanguage ? 'hing' : voiceLocale;
            const response = await api.post('/ai/voice/session/start', {
                leadId: lead.id,
                phone: lead.phone,
                name: lead.name,
                locale: localeForSession,
                mirrorSpokenLanguage,
                openerLocale,
                openerContext,
                projectId: projectIdForCall,
                agentName: agentTrim,
            });
            const telephony = response?.telephony || null;
            if (voiceCallDismissedRef.current) {
                return;
            }
            sarvamTtsRequiredRef.current = Boolean(response?.voice_tts?.enforce_only);
            if (sarvamTtsRequiredRef.current && response?.voice_tts?.provider !== 'sarvam') {
                showToast({
                    title: 'Sarvam-only mode is enabled',
                    description:
                        response?.voice_tts?.unavailable_reason ||
                        'Sarvam is required but not available. Check SARVAM_API_SUBSCRIPTION_KEY and restart backend.',
                    variant: 'error',
                });
                return;
            }
            voicePlaybackProviderRef.current =
                response?.voice_tts?.provider === 'sarvam' ? 'sarvam' : 'browser';
            voiceSttProviderRef.current = response?.voice_stt?.provider === 'sarvam' ? 'sarvam' : 'browser';
            setInboundSttMode(voiceSttProviderRef.current);
            setVoiceSession({
                brandId: response?.brand_id,
                leadId: response?.lead_id,
                conversationId: response?.conversation_id,
            });
            setAiControlMode(String(response?.control_mode || 'ai').toLowerCase() === 'human' ? 'human' : 'ai');
            await refreshComplianceEvents();
            callActiveRef.current = true;
            setIsCallActive(true);
            hasLoggedVoiceConnectedRef.current = false;
            setLiveCallTranscript([]);
            liveCallTranscriptRef.current = [];
            callStartedAtRef.current = Date.now();
            recordingUrlRef.current = null;
            await startCallRecording();
            stopIncomingRing();
            clearIncomingCallTimeout();
            setIncomingCallSecondsLeft(0);
            if (incomingCallJob?.id) {
                activeIncomingCallJobIdRef.current = incomingCallJob.id;
                try {
                    await updateAutomationJobStatus(incomingCallJob.id, 'completed');
                } catch (_) {
                    // non-blocking
                }
            } else {
                activeIncomingCallJobIdRef.current = null;
            }
            setIncomingCallJob(null);
            setAllowVoiceMic(false);

            const isPstnStreaming = Boolean(telephony?.enabled && telephony?.accepted && telephony?.voiceBotStreaming);
            pstnStreamingActiveRef.current = isPstnStreaming;

            const opener = response?.assistant_reply ? String(response.assistant_reply).trim() : '';

            if (isPstnStreaming) {
                if (opener) {
                    pushLiveTranscript('AI', opener, {
                        sourceLabel: projectIdForCall ? 'Project Knowledge (selected)' : '',
                    });
                }
                pushLiveTranscript('System', 'Tata PSTN call connected — the AI bot is handling the conversation on the phone with Brain Drive project knowledge. Browser mic/speaker are not needed.', {});
            } else {
                if (opener) {
                    pushLiveTranscript('AI', opener, {
                        sourceLabel: projectIdForCall ? 'Project Knowledge (selected)' : '',
                    });
                    speakText(opener, () => {
                        if (callActiveRef.current && !voiceCallDismissedRef.current) {
                            setAllowVoiceMic(true);
                            scheduleCallNoAnswerTimer();
                        }
                    });
                } else {
                    setAllowVoiceMic(true);
                    scheduleCallNoAnswerTimer();
                }
            }

            addActionToLead(
                lead.id,
                'call',
                isPstnStreaming ? 'AI Voice Call (PSTN Streaming)' : 'AI Voice Call Started',
                response?.assistant_reply || 'AI call started for this lead.',
                {
                    outcome: isPstnStreaming ? 'PSTN Streaming' : 'Queued',
                    duration: '0m 00s',
                    telephony,
                    provider: telephony?.provider || null,
                    providerCallId: telephony?.providerCallId || null,
                    voiceBotStreaming: isPstnStreaming,
                }
            );
            if (telephony?.enabled && telephony?.accepted) {
                showToast({
                    title: 'Call Connected Successfully',
                    description: `The AI bot is now speaking with ${lead.name} on the phone about ${projects.find(p => p.id === projectIdForCall)?.name || 'the selected project'} using Brain Drive knowledge.`,
                    variant: 'success',
                });
            } else if (!telephony?.enabled) {
                showToast({
                    title: 'Telephony disabled',
                    description: 'Tata telephony is not enabled. Please enable TATA_CALL_ENABLED=true in backend .env.',
                    variant: 'error',
                });
                callActiveRef.current = false;
                setIsCallActive(false);
                setModal(null);
            } else if (telephony?.enabled && !telephony?.accepted) {
                showToast({
                    title: 'Call could not be placed',
                    description: String(telephony?.reason || telephony?.message || 'Tata rejected the call request. Please check the phone number and try again.'),
                    variant: 'error',
                });
                callActiveRef.current = false;
                setIsCallActive(false);
                setModal(null);
            }
        } catch (err) {
            if (!voiceCallDismissedRef.current) {
                callActiveRef.current = false;
                addActionToLead(
                    lead.id,
                    'call',
                    'AI Voice Call Failed',
                    err?.message || 'Could not start AI voice call.'
                );
                showToast({
                    title: 'Call failed',
                    description: err?.message || 'Could not start AI voice call.',
                    variant: 'error',
                });
                setModal(null);
            }
        } finally {
            voiceSessionStartLockRef.current = false;
            setStartingLiveCall(false);
        }
    };

    const sendAIAssistedWhatsApp = async (rawText) => {
        const text = String(rawText || '').trim();
        if (!text) return;
        clearWaNoReplyTimer();
        if (!aiReadiness.chatReady) {
            showToast({
                title: 'WhatsApp AI is not ready',
                description: aiReadiness.issuesChat[0] || 'Set GOOGLE_GENERATIVE_AI_API_KEY on the backend and restart the server.',
                variant: 'warning',
            });
            return;
        }
        setSendingWhatsApp(true);
        try {
            const waCommLocal = (lead.communications || []).find(c => c.type === 'whatsapp');
            const priorHistory = buildWhatsappChatHistory(waCommLocal?.history || []);
            const sentResult = await addActionToLead(lead.id, 'whatsapp', 'WhatsApp sent', text, { sender: 'SalesRep' });
            if (sentResult && sentResult.ok === false) {
                showToast({
                    title: 'Message not saved',
                    description: 'Could not persist this WhatsApp message. Please retry.',
                    variant: 'error',
                });
                return;
            }

            const inferredCallScheduleAt = parseCallRequestScheduleAt(text);
            if (
                inferredCallScheduleAt &&
                !isScheduleWithinCallWindow(
                    inferredCallScheduleAt,
                    lead.timezone || 'Asia/Kolkata',
                    salesCallWindow.start,
                    salesCallWindow.end
                )
            ) {
                showToast({
                    title: 'Call request saved',
                    description: `Requested time is outside call window (${salesCallWindow.start}-${salesCallWindow.end}). Shared guidance in timeline.`,
                    variant: 'warning',
                });
                await refreshLeadActivities(lead.id);
                setWaText('');
                return;
            }
            if (inferredCallScheduleAt) {
                const tz = lead.timezone || 'Asia/Kolkata';
                const scheduledLabel = new Date(inferredCallScheduleAt).toLocaleString('en-US', {
                    timeZone: tz,
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                });
                const confirmMsg = `Done. I have scheduled your call for ${scheduledLabel} (${tz}).`;
                await addActionToLead(lead.id, 'whatsapp', 'AI WhatsApp follow-up', confirmMsg, { sender: 'AI' });
                await refreshLeadActivities(lead.id);
                setWaText('');
                scheduleWaNoReplyTimer();
                return;
            }

            const ai = await api.post('/ai/chat', {
                context: 'whatsapp',
                history: priorHistory,
                leadPreferredLocale: lead.preferredLocale || 'hing',
                leadTimezone: lead.timezone || undefined,
                message: `Lead name: ${lead.name}\n\nTheir latest message (your reply must be ONLY in the same language(s) and script they used — any language worldwide; mirror them exactly, do not switch to English or another language):\n${text}\n\nWrite one concise WhatsApp reply as the sales rep (no email-style sign-off). One message only.`,
            });
            const aiReply = ai?.response ? sanitizeWhatsappAiReply(ai.response) : null;
            if (aiReply) {
                setIsWaAiTyping(true);
                clearWaTypingTimer();
                const delay = Math.min(7000, Math.max(900, aiReply.length * 22));
                waTypingTimeoutRef.current = setTimeout(() => {
                    addActionToLead(lead.id, 'whatsapp', 'AI WhatsApp follow-up', aiReply, { sender: 'AI' });
                    setIsWaAiTyping(false);
                    waTypingTimeoutRef.current = null;
                    scheduleWaNoReplyTimer();
                }, delay);
                if (ai?.fallback) {
                    showToast({
                        title: 'AI fallback used',
                        description: 'Primary AI service is unavailable. Using fallback response.',
                        variant: 'warning',
                    });
                }
            }
            setWaText('');
        } catch (err) {
            const fallbackReply = `Thanks for your message, ${lead.name.split(' ')[0] || 'there'}. Our team is reviewing this and will reply shortly.`;
            setIsWaAiTyping(true);
            clearWaTypingTimer();
            waTypingTimeoutRef.current = setTimeout(() => {
                addActionToLead(lead.id, 'whatsapp', 'AI WhatsApp follow-up', fallbackReply, { sender: 'AI' });
                setIsWaAiTyping(false);
                waTypingTimeoutRef.current = null;
                scheduleWaNoReplyTimer();
            }, Math.min(4000, Math.max(900, fallbackReply.length * 20)));
            addActionToLead(lead.id, 'whatsapp', 'WhatsApp AI fallback', err?.message || 'AI service unavailable');
            showToast({
                title: 'AI chat unavailable',
                description: 'Sent a fallback reply so the conversation can continue.',
                variant: 'warning',
            });
        } finally {
            setSendingWhatsApp(false);
        }
    };

    useEffect(() => {
        isSpeakerMutedRef.current = isSpeakerMuted;
        applySpeakerOutputMuteState(isSpeakerMuted, speechRef, sarvamAudioRef);
    }, [isSpeakerMuted]);

    useEffect(() => {
        isProcessingTurnRef.current = isProcessingTurn;
    }, [isProcessingTurn]);

    useEffect(() => {
        if (isMicMuted) clearCallNoAnswerTimer();
    }, [isMicMuted]);

    useEffect(() => {
        if (modal !== 'whatsapp') clearWaNoReplyTimer();
    }, [modal]);

    useEffect(() => {
        if (isCallActive || modal !== 'call') {
            stopIncomingRing();
        }
    }, [isCallActive, modal]);

    useEffect(() => {
        return () => {
            clearWaTypingTimer();
            clearCallNoAnswerTimer();
            clearWaNoReplyTimer();
            stopIncomingRing();
            stopListening();
            teardownSttAudio(true);
            stopSpeaking();
            if (playingAudioRef.current) {
                playingAudioRef.current.pause();
                playingAudioRef.current = null;
            }
            if (recordingStreamRef.current) {
                recordingStreamRef.current.getTracks().forEach((t) => t.stop());
                recordingStreamRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!lead?.id) return;
        refreshLeadActivities(lead.id);
    }, [lead?.id, refreshLeadActivities]);

    useEffect(() => {
        const loadReadiness = async () => {
            try {
                const data = await api.get('/integrations/readiness');
                const calling = data?.calling || {};
                const c = calling.checks || {};
                const chatReady = Boolean(c.aiApiConfigured);
                const voiceReady = Boolean(calling.ready);
                const issuesChat = [];
                const issuesVoice = [];
                if (!c.aiApiConfigured) {
                    issuesChat.push('Set GOOGLE_GENERATIVE_AI_API_KEY in backend .env and restart the API server.');
                    issuesVoice.push('Set GOOGLE_GENERATIVE_AI_API_KEY in backend .env and restart the API server.');
                }
                if (!c.voiceTablesPresent) {
                    issuesVoice.push('Run DB migrations so tables ai_voice_sessions and ai_voice_turns exist.');
                }
                setAiReadiness({
                    loading: false,
                    chatReady,
                    voiceReady,
                    issuesChat,
                    issuesVoice,
                });
            } catch (err) {
                setAiReadiness({
                    loading: false,
                    chatReady: false,
                    voiceReady: false,
                    issuesChat: [err?.message || 'Could not verify AI readiness.'],
                    issuesVoice: [err?.message || 'Could not verify AI readiness.'],
                });
            }
        };
        loadReadiness();
    }, []);

    useEffect(() => {
        micMutedRef.current = isMicMuted;
        if (isMicMuted) stopListening();
    }, [isMicMuted]);

    useEffect(() => {
        if (!isCallActive || isMicMuted || !voiceMicAllowed) {
            stopListening();
            return;
        }
        startListening();
    }, [isCallActive, isMicMuted, voiceMicAllowed]);

    useLayoutEffect(() => {
        if (modal !== 'whatsapp' || !lead) return;
        waMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [modal, lead, sendingWhatsApp, isWaAiTyping]);

    useEffect(() => {
        if (!lead?.id) return;
        let mounted = true;
        const loadJobs = async () => {
            try {
                const rows = await getLeadAutomationJobs(lead.id);
                if (!mounted) return;
                const list = Array.isArray(rows) ? rows : [];
                setAutomationJobs(list);
                const dueCall = list.find(
                    (j) =>
                        j.status === 'dispatched' &&
                        j.target_channel === 'call' &&
                        !seenDispatchedCallJobsRef.current.has(j.id)
                );
                const dueChat = list.find(
                    (j) =>
                        j.status === 'dispatched' &&
                        j.target_channel === 'whatsapp' &&
                        !seenDispatchedChatJobsRef.current.has(j.id)
                );
                if (dueCall && !isCallActive && !startingLiveCall) {
                    seenDispatchedCallJobsRef.current.add(dueCall.id);
                    setIncomingCallJob(dueCall);
                    startIncomingRing();
                    startIncomingCallCountdown();
                    showToast({
                        title: 'Incoming scheduled bot call',
                        description: 'Call time reached. Tap the green button to let the bot start speaking.',
                        variant: 'info',
                    });
                }
                if (dueChat) {
                    seenDispatchedChatJobsRef.current.add(dueChat.id);
                    await refreshLeadActivities(lead.id);
                    showToast({
                        title: 'Scheduled bot chat delivered',
                        description: 'Bot chat has been sent. Open WhatsApp and confirm to close reservation.',
                        variant: 'info',
                    });
                }
            } catch (_) {
                if (!mounted) return;
                setAutomationJobs([]);
            }
        };
        loadJobs();
        const interval = setInterval(loadJobs, 30000);
        return () => {
            mounted = false;
            clearInterval(interval);
            stopIncomingRing();
            clearIncomingCallTimeout();
        };
    }, [lead?.id, getLeadAutomationJobs, isCallActive, startingLiveCall, refreshLeadActivities]);

    if (!lead) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-gray-400">
                <AlertCircle size={48} className="text-gray-200" />
                <p className="font-medium text-gray-500">Lead not found</p>
                <button onClick={() => navigate('/sales/leads')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
                    Back to Leads
                </button>
            </div>
        );
    }

    const statusCfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.New;
    const calls = (lead.communications || []).filter(c => c.type === 'call');
    const waComm = (lead.communications || []).find(c => c.type === 'whatsapp');
    const waHistory = waComm?.history || [];
    const callAllowedNow = isWithinCallActiveWindow(lead.timezone, salesCallWindow.start, salesCallWindow.end);
    const agentNameReady = String(voiceAgentName || '').trim().length >= 2;
    const projectSelectedReady = Boolean(String(voiceProjectId || '').trim());
    const ttsChosenReady = Boolean(String(ttsVoiceUri || '').trim());
    const voiceCallSetupComplete = projectSelectedReady && agentNameReady;

    /* ── Score colour helpers ── */
    const scoreColor = (s) => s >= 80 ? 'text-red-600' : s >= 50 ? 'text-orange-500' : 'text-sky-500';
    const scoreBar = (s) => s >= 80 ? 'bg-red-500' : s >= 50 ? 'bg-orange-400' : 'bg-sky-400';
    const pendingAutomationJobs = automationJobs.filter((j) => j.status === 'pending');
    const dispatchedChatJobs = automationJobs
        .filter((j) => j.status === 'dispatched' && j.target_channel === 'whatsapp')
        .sort((a, b) => new Date(b.schedule_at).getTime() - new Date(a.schedule_at).getTime());

    const scheduleHandshake = async ({ sourceChannel, targetChannel, when, messageTemplate }) => {
        if (!lead?.id) return;
        try {
            setCreatingAutomation(true);
            const job = await scheduleAutomationHandshake(lead.id, {
                sourceChannel,
                targetChannel,
                scheduleAt: when,
                payload: {
                    messageTemplate: messageTemplate || '',
                    leadName: lead.name,
                },
            });
            if (job?.id) {
                setAutomationJobs((prev) => [job, ...prev]);
            } else {
                const refreshed = await getLeadAutomationJobs(lead.id);
                setAutomationJobs(Array.isArray(refreshed) ? refreshed : []);
            }
            showToast({
                title: 'Automation scheduled',
                description: `Bot will continue on ${targetChannel} at ${new Date(when).toLocaleString()}.`,
                variant: 'success',
            });
        } catch (err) {
            showToast({
                title: 'Could not schedule automation',
                description: err?.message || 'Please try again.',
                variant: 'warning',
            });
        } finally {
            setCreatingAutomation(false);
        }
    };

    const cancelBookedCallReservation = async (job) => {
        if (!job?.id || !lead?.id) return;
        try {
            setCancellingAutomationId(job.id);
            await updateAutomationJobStatus(job.id, 'cancelled');
            setAutomationJobs((prev) => prev.map((row) => (row.id === job.id ? { ...row, status: 'cancelled' } : row)));
            if (incomingCallJob?.id === job.id) {
                setIncomingCallJob(null);
                stopIncomingRing();
                clearIncomingCallTimeout();
                setIncomingCallSecondsLeft(0);
            }
            showToast({
                title: 'Call reservation cancelled',
                description: 'The bot will not call at the scheduled time.',
                variant: 'success',
            });
        } catch (err) {
            showToast({
                title: 'Could not cancel reservation',
                description: err?.message || 'Please try again.',
                variant: 'warning',
            });
        } finally {
            setCancellingAutomationId(null);
        }
    };

    const confirmBotScheduledChat = async (job) => {
        if (!job?.id || !lead?.id) return;
        try {
            setConfirmingChatJobId(job.id);
            await updateAutomationJobStatus(job.id, 'cancelled');
            setAutomationJobs((prev) => prev.map((row) => (row.id === job.id ? { ...row, status: 'cancelled' } : row)));
            await refreshLeadActivities(lead.id);
            showToast({
                title: 'Chat reservation closed',
                description: 'Scheduled bot chat is confirmed and closed.',
                variant: 'success',
            });
        } catch (err) {
            showToast({
                title: 'Could not confirm chat',
                description: err?.message || 'Please try again.',
                variant: 'warning',
            });
        } finally {
            setConfirmingChatJobId(null);
        }
    };

    /* ────────────────────────── MODAL ────────────────────────── */
    const renderModal = () => {
        if (!modal) return null;
        return (
            <AnimatePresence>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[80] overflow-y-auto overscroll-y-contain bg-gray-900/60 backdrop-blur-sm [scrollbar-gutter:stable]"
                    onClick={() => {
                        if (modal === 'call' && (isCallActive || startingLiveCall)) return;
                        setModal(null);
                    }}>
                    <div
                        className="min-h-[100dvh] w-full flex items-center justify-center box-border px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6"
                        onClick={() => {
                            if (modal === 'call' && (isCallActive || startingLiveCall)) return;
                            setModal(null);
                        }}
                    >
                    <motion.div
                        initial={{ scale: 0.95, y: 16, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.95, y: 16, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                        onClick={e => e.stopPropagation()}
                        className={`bg-white rounded-2xl shadow-2xl w-full overflow-hidden ${
                            modal === 'whatsapp' ? 'max-w-md' : modal === 'call' ? 'max-w-lg flex flex-col min-h-0 max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2.5rem))]' : 'max-w-sm'
                        }`}
                    >
                        {/* CALL */}
                        {modal === 'call' && (
                            <div className="relative flex flex-1 min-h-0 flex-col overflow-hidden bg-gradient-to-b from-blue-900 to-blue-950 text-white">
                                <button
                                    type="button"
                                    aria-label="Close call dialog"
                                    onClick={() => {
                                        if (startingLiveCall && !isCallActive) {
                                            voiceCallDismissedRef.current = true;
                                            voiceSessionStartLockRef.current = false;
                                            setStartingLiveCall(false);
                                        }
                                        setModal(null);
                                    }}
                                    className="absolute top-3 right-3 z-30 text-white/50 hover:text-white bg-white/10 p-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:top-4 sm:right-4"
                                >
                                    <X size={16} />
                                </button>
                                <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y [scrollbar-width:thin]">
                                    <div className="px-4 pb-4 pt-14 sm:px-8 sm:pb-6 sm:pt-16">
                                        {!callAllowedNow && !isCallActive && (
                                            <div className="mb-3 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-100 text-xs px-3 py-2 text-left leading-snug">
                                                Calls are only active 9:00 AM \u2013 9:00 PM in the lead&apos;s timezone.{' '}
                                                {callWindowLabel(lead.timezone, salesCallWindow.start, salesCallWindow.end)}
                                            </div>
                                        )}
                                        <div className="flex flex-col items-center text-center">
                                            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mb-5 relative">
                                                <div className={`absolute inset-0 rounded-full border-4 ${startingLiveCall ? 'border-emerald-400/40 animate-ping' : isCallActive ? 'border-emerald-400/30' : 'border-white/20'}`} />
                                                <Phone size={36} className="text-white relative z-10" />
                                            </div>
                                            <h3 className="text-2xl font-bold">{lead.name}</h3>
                                            <p className="text-blue-200 text-sm mt-1 font-medium tracking-widest">{lead.phone}</p>
                                            <p className="text-blue-200/70 text-[10px] mt-1 px-2 max-w-xs">{callWindowLabel(lead.timezone, salesCallWindow.start, salesCallWindow.end)}</p>

                                            {isCallActive ? (
                                                <div className="mt-6 w-full max-w-sm flex flex-col items-center gap-4">
                                                    <div className="w-full rounded-xl bg-emerald-500/15 border border-emerald-400/30 p-4 text-left">
                                                        <div className="flex items-center gap-2.5 mb-3">
                                                            <div className="w-8 h-8 rounded-full bg-emerald-500/25 flex items-center justify-center shrink-0">
                                                                <Phone size={16} className="text-emerald-300" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-semibold text-emerald-100">Call Connected Successfully</p>
                                                                <p className="text-[10px] text-emerald-200/70 mt-0.5">via Tata Smartflo Voice Bot</p>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2 text-xs text-blue-100/90 leading-relaxed">
                                                            <p>The AI bot is now speaking with <span className="font-semibold text-white">{lead.name}</span> on the phone.</p>
                                                            <p>The bot is discussing <span className="font-semibold text-emerald-200">{projects.find(p => p.id === voiceProjectId)?.name || 'the selected project'}</span> using Brain Drive knowledge.</p>
                                                            <p className="text-blue-100/60 text-[10px]">The entire conversation is handled server-side. No browser mic or speaker needed.</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-emerald-300 text-sm font-semibold">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                                        Call in progress
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="mt-4 w-full max-w-sm rounded-xl bg-white/10 border border-white/10 p-3 text-left">
                                                    <label className="block text-[10px] uppercase tracking-wide text-blue-100/80 mb-1.5">Project Brain</label>
                                                    <select
                                                        value={voiceProjectId}
                                                        onChange={(e) => setVoiceProjectId(e.target.value)}
                                                        className="w-full bg-blue-950/70 border border-white/20 rounded-md px-2.5 py-2 text-xs text-white outline-none focus:border-emerald-300"
                                                    >
                                                        <option value="">No project selected</option>
                                                        {projects.map((p) => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <label className="block text-[10px] uppercase tracking-wide text-blue-100/80 mb-1.5 mt-3">Agent preset</label>
                                                    <select
                                                        value={AGENTS.includes(voiceAgentName) ? voiceAgentName : ''}
                                                        onChange={(e) => {
                                                            const v = e.target.value;
                                                            if (v) setVoiceAgentName(v);
                                                        }}
                                                        className="w-full bg-blue-950/70 border border-white/20 rounded-md px-2.5 py-2 text-xs text-white outline-none focus:border-emerald-300 mb-2"
                                                    >
                                                        <option value="">Custom name below\u2026</option>
                                                        {AGENTS.map((a) => (
                                                            <option key={a} value={a}>
                                                                {a}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <label className="block text-[10px] uppercase tracking-wide text-blue-100/80 mb-1.5">Agent name (on call)</label>
                                                    <input
                                                        type="text"
                                                        value={voiceAgentName}
                                                        onChange={(e) => setVoiceAgentName(String(e.target.value || '').slice(0, 40))}
                                                        placeholder="SalesPal AI"
                                                        maxLength={40}
                                                        className="w-full bg-blue-950/70 border border-white/20 rounded-md px-2.5 py-2 text-xs text-white placeholder:text-blue-100/50 outline-none focus:border-emerald-300"
                                                    />
                                                    <label className="block text-[10px] uppercase tracking-wide text-blue-100/80 mb-1.5 mt-3">Call Language</label>
                                                    <select
                                                        value={voiceLocale}
                                                        onChange={(e) => setVoiceLocale(e.target.value)}
                                                        className="w-full bg-blue-950/70 border border-white/20 rounded-md px-2.5 py-2 text-xs text-white outline-none focus:border-emerald-300"
                                                    >
                                                        {VOICE_LANGUAGES.map((lang) => (
                                                            <option key={lang.code} value={lang.code}>
                                                                {lang.flag} {lang.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <p className="mt-1 text-[10px] text-blue-100/50">
                                                        Auto: opener uses the lead&apos;s profile language; listening uses auto-detect, then replies match what you say. Fixed languages pin STT/TTS. Sales → Settings → AI Behavior controls scheduled automation the same way.
                                                    </p>
                                                    <label className="mt-3 flex items-start gap-2.5 cursor-pointer text-left">
                                                        <input
                                                            type="checkbox"
                                                            checked={persistVoiceProjectToLead}
                                                            onChange={(e) => setPersistVoiceProjectToLead(e.target.checked)}
                                                            className="mt-0.5 rounded border-white/30 bg-blue-950/70 text-emerald-500 focus:ring-emerald-400"
                                                        />
                                                        <span className="text-[10px] text-blue-100/90 leading-snug">
                                                            Save selected project to this lead before the call starts (updates CRM metadata: projectId + name).
                                                        </span>
                                                    </label>
                                                    <label className="mt-2 flex items-start gap-2.5 cursor-pointer text-left">
                                                        <input
                                                            type="checkbox"
                                                            checked={syncIntentFromVoiceCall}
                                                            onChange={(e) => setSyncIntentFromVoiceCall(e.target.checked)}
                                                            className="mt-0.5 rounded border-white/30 bg-blue-950/70 text-emerald-500 focus:ring-emerald-400"
                                                        />
                                                        <span className="text-[10px] text-blue-100/90 leading-snug">
                                                            After the call, update lead stage &amp; AI score from the call summary (Hot / Warm / Cold). Turn off for tests or practice calls.
                                                        </span>
                                                    </label>
                                                    <p className="mt-2 text-[10px] text-blue-100/60">
                                                        CRM notes and current intent are always sent to the bot; project facts use Brain Drive knowledge.
                                                    </p>
                                                </div>
                                            )}

                                            {!isCallActive && (
                                                <div className="flex items-center gap-2 mt-6 bg-white/10 border border-white/10 px-4 py-2 rounded-full text-emerald-300 text-sm font-semibold max-w-[90%] flex-wrap justify-center">
                                                    <span className={`w-2 h-2 rounded-full shrink-0 ${startingLiveCall ? 'bg-amber-400 animate-pulse' : 'bg-slate-300'}`} />
                                                    {startingLiveCall
                                                        ? 'Connecting to Tata\u2026'
                                                        : incomingCallJob
                                                            ? 'Incoming \u2014 choose project / agent, then tap the call button'
                                                            : 'Ready \u2014 configure project / agent above, then press call'}
                                                </div>
                                            )}
                                            {!isCallActive && incomingCallJob && (
                                                <div className="mt-3 text-[11px] text-amber-100 bg-amber-500/20 border border-amber-300/40 rounded px-3 py-1.5">
                                                    Scheduled time reached: {new Date(incomingCallJob.schedule_at).toLocaleString()}.
                                                    {incomingCallSecondsLeft > 0 ? ` Answer in ${incomingCallSecondsLeft}s` : ''}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="shrink-0 border-t border-white/10 bg-blue-950/90 backdrop-blur-md px-4 sm:px-8 pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={isCallActive ? () => { endLiveAICall(); setModal(null); } : startLiveAICall}
                                        disabled={startingLiveCall || (!isCallActive && (!callAllowedNow || !voiceCallSetupComplete))}
                                        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                                            isCallActive
                                                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
                                                : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'
                                        }`}
                                        title={
                                            isCallActive
                                                ? 'End call'
                                                : !callAllowedNow
                                                  ? callWindowLabel(lead.timezone, salesCallWindow.start, salesCallWindow.end)
                                                  : !voiceCallSetupComplete
                                                    ? 'Select project and agent name first'
                                                    : 'Place call via Tata (bot speaks on the phone)'
                                        }
                                    >
                                        <Phone size={26} className={isCallActive ? 'rotate-[135deg]' : ''} />
                                    </button>
                                    <p className="text-xs text-white/60 pb-1">
                                        {isCallActive ? 'End Call' : 'Place Call'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* WHATSAPP */}
                        {modal === 'whatsapp' && (
                            <div className="flex flex-col max-h-[min(90dvh,720px)] min-h-0" style={{ minHeight: 400 }}>
                                <div className="bg-[#075E54] text-white p-4 flex items-center gap-3 shrink-0">
                                    <button type="button" onClick={() => setModal(null)} className="text-white/70 hover:text-white"><X size={20} /></button>
                                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg shrink-0">{lead.name[0]}</div>
                                    <div>
                                        <p className="font-bold text-sm">{lead.name}</p>
                                        <p className="text-xs text-white/60">{lead.phone} · Active 24/7</p>
                                    </div>
                                </div>
                                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-[#ECE5DD] p-4 flex flex-col gap-2">
                                    {dispatchedChatJobs.length > 0 && (
                                        <div className="self-stretch rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 mb-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-[11px] text-emerald-800 font-medium">
                                                    Scheduled bot chat delivered at {new Date(dispatchedChatJobs[0].schedule_at).toLocaleString()}.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => confirmBotScheduledChat(dispatchedChatJobs[0])}
                                                    disabled={confirmingChatJobId === dispatchedChatJobs[0].id}
                                                    className="shrink-0 px-2 py-1 rounded bg-emerald-600 text-white text-[10px] font-semibold hover:bg-emerald-700 disabled:opacity-60"
                                                >
                                                    {confirmingChatJobId === dispatchedChatJobs[0].id ? 'Closing…' : 'Confirm'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {waHistory.length > 0 ? waHistory.map(msg => (
                                        <div key={msg.id} className={`max-w-[80%] ${msg.sender === 'AI' ? 'self-start bg-white rounded-tl-none' : 'self-end bg-[#DCF8C6] rounded-tr-none'} p-2.5 rounded-xl shadow-sm text-sm text-gray-800`}>
                                            {msg.attachment && <p className="text-xs font-semibold text-blue-600 mb-1">📎 {msg.attachment}</p>}
                                            <p>{msg.text}</p>
                                            <p className="text-[10px] text-gray-400 text-right mt-0.5">{msg.time}</p>
                                        </div>
                                    )) : (
                                        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm min-h-[120px]">Start a new conversation</div>
                                    )}
                                    {isWaAiTyping && (
                                        <div className="max-w-[80%] self-start bg-white rounded-tl-none p-2.5 rounded-xl shadow-sm text-sm text-gray-700 border border-gray-100">
                                            <p className="text-[11px] text-gray-500">SalesPal team is writing...</p>
                                        </div>
                                    )}
                                    <div ref={waMessagesEndRef} className="h-px w-full shrink-0" aria-hidden />
                                </div>
                                <div className="p-3 bg-gray-100 border-t border-gray-200 flex items-center gap-2">
                                    <div className="flex-1 bg-white flex items-center rounded-full px-3 py-2 shadow-sm border border-gray-200">
                                        <input type="text" value={waText} onChange={e => setWaText(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter' && waText.trim()) sendAIAssistedWhatsApp(waText); }}
                                            placeholder="Type a message..." className="flex-1 text-sm bg-transparent outline-none" />
                                    </div>
                                    <button onClick={() => sendAIAssistedWhatsApp(waText)}
                                        disabled={sendingWhatsApp}
                                        className="w-10 h-10 bg-[#128C7E] hover:bg-[#075E54] text-white rounded-full flex items-center justify-center shadow-sm transition-colors">
                                        <Send size={15} className="ml-0.5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* SCHEDULE */}
                        {modal === 'schedule' && (
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2"><Calendar size={18} className="text-indigo-500" /> Schedule Follow-up</h3>
                                    <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
                                </div>
                                <p className="text-sm text-gray-500 mb-4">For <span className="font-semibold text-gray-800">{lead.name}</span></p>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Date</label>
                                        <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                                            className="w-full p-3 border border-gray-200 rounded-lg text-sm bg-gray-50 outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Time Slot</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM', '06:00 PM', '08:00 PM'].map(t => (
                                                <button key={t} onClick={() => setScheduleTime(t)}
                                                    className={`py-2 text-xs font-semibold rounded-lg border transition-all ${scheduleTime === t ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50/50'}`}>
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { if (scheduleDate) addActionToLead(lead.id, 'meeting', 'Follow-up Scheduled', `Meeting on ${scheduleDate}${scheduleTime ? ' at ' + scheduleTime : ''}.`, { date: scheduleDate, time: scheduleTime }); setModal(null); }}
                                        className="w-full py-2.5 mt-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                                        <Check size={15} /> Confirm Follow-up
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* NOTE */}
                        {modal === 'note' && (
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2"><Edit3 size={16} className="text-gray-500" /> Add Note</h3>
                                    <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
                                </div>
                                <div className="space-y-3">
                                    <textarea rows="5" value={noteText} onChange={e => setNoteText(e.target.value)}
                                        placeholder={`Notes for ${lead.name}...`}
                                        className="w-full p-3 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
                                    <button onClick={() => { if (noteText.trim()) addActionToLead(lead.id, 'note', 'Note Added', noteText.trim()); setModal(null); }}
                                        className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg text-sm transition-colors">
                                        Save Note
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* TRANSCRIPT */}
                        {modal === 'transcript' && transcriptId !== null && (() => {
                            const call = calls.find(c => c.id === transcriptId);
                            return (
                                <div className="flex flex-col max-h-[85vh]">
                                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                                        <h3 className="font-bold text-gray-900 flex items-center gap-2"><BookOpen size={16} className="text-blue-600" /> Call Transcript</h3>
                                        <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                                        {(call?.transcript || []).map((line, i) => (
                                            <div key={i} className={`flex gap-3 ${line.speaker === 'AI' ? 'flex-row' : line.speaker === 'Lead' ? 'flex-row-reverse' : 'justify-center'}`}>
                                                {line.speaker !== 'System' && (
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${line.speaker === 'AI' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                        {line.speaker[0]}
                                                    </div>
                                                )}
                                                <div className={`max-w-[80%] ${line.speaker === 'System' ? 'w-full text-center' : ''}`}>
                                                    {line.speaker !== 'System' && <p className="text-[10px] font-bold text-gray-400 mb-1">{line.speaker}</p>}
                                                    <div className={`p-3 rounded-xl text-sm ${line.speaker === 'AI' ? 'bg-white border border-gray-200 text-gray-800' : line.speaker === 'System' ? 'bg-yellow-50 border border-yellow-100 text-yellow-700 text-xs text-center rounded-lg' : 'bg-blue-600 text-white'}`}>
                                                        {line.text}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {(!call?.transcript?.length) && <p className="text-center text-gray-400 text-sm py-8">No transcript available</p>}
                                    </div>
                                </div>
                            );
                        })()}
                    </motion.div>
                    </div>
                </motion.div>
            </AnimatePresence>
        );
    };

    const renderIncomingCallOverlay = () => {
        if (!incomingCallJob || isCallActive || startingLiveCall) return null;
        return (
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[95] overflow-y-auto overscroll-y-contain bg-gray-950/85 backdrop-blur-sm [scrollbar-gutter:stable]"
                >
                    <div className="min-h-[100dvh] w-full flex items-center justify-center box-border px-4 py-6 sm:px-6 sm:py-8 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                    <motion.div
                        initial={{ scale: 0.96, y: 12, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.96, y: 12, opacity: 0 }}
                        className="w-full max-w-md max-h-[min(88dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))] overflow-y-auto overscroll-y-contain [scrollbar-width:thin] rounded-3xl border border-white/10 bg-gradient-to-b from-blue-900 to-blue-950 text-white p-6 sm:p-7 shadow-2xl text-center my-auto"
                    >
                        <div className="w-24 h-24 rounded-full mx-auto bg-white/10 flex items-center justify-center relative mb-5">
                            <div className="absolute inset-0 rounded-full border-4 border-emerald-400/40 animate-ping" />
                            <Phone size={34} />
                        </div>
                        <p className="text-xs uppercase tracking-[0.2em] text-emerald-200 font-semibold">Incoming Scheduled Bot Call</p>
                        <h3 className="mt-2 text-2xl font-bold">{lead.name}</h3>
                        <p className="text-blue-200 text-sm mt-1">{lead.phone}</p>
                        <p className="text-blue-100/90 text-xs mt-3">
                            Scheduled time reached: {new Date(incomingCallJob.schedule_at).toLocaleString()}
                        </p>
                        <p className="text-amber-200 text-xs mt-1">Answer in {Math.max(0, incomingCallSecondsLeft)}s</p>
                        <p className="text-blue-100/80 text-[11px] mt-3 px-1 leading-snug">
                            The line is not dialed until you open the call panel, set project / agent / browser voice, then
                            press the green button at the bottom.
                        </p>

                        <div className="mt-7 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => dismissIncomingCall('declined')}
                                className="w-full py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold"
                            >
                                Decline
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    openModal('call');
                                }}
                                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold"
                            >
                                Open call setup
                            </button>
                        </div>
                    </motion.div>
                    </div>
                </motion.div>
            </AnimatePresence>
        );
    };

    /* ──────────────────────── RENDER ──────────────────────────── */
    return (
        <div className="font-sans text-gray-900 pb-16">
            {renderModal()}
            {renderIncomingCallOverlay()}

            {/* ─── Back + Header ─── */}
            <div className="mb-5">
                <button onClick={() => navigate('/sales/leads')}
                    className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-700 font-medium mb-3 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 rounded-md px-1 py-1">
                    <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
                    Back to Leads
                </button>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-md shrink-0">
                            {lead.name[0]}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{lead.name}</h1>
                                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                                    {lead.status === 'Won' ? 'Converted' : lead.status}
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-600 mt-0.5 break-words">{lead.phone} · {lead.source} · {lead.project}</p>
                            <div className="mt-2">
                                {(() => {
                                    const { loading, chatReady, voiceReady, issuesChat, issuesVoice } = aiReadiness;
                                    const allGreen = !loading && chatReady && voiceReady;
                                    const partial = !loading && chatReady && !voiceReady;
                                    const badgeClass = loading
                                        ? 'bg-gray-50 text-gray-600 border-gray-200'
                                        : allGreen
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-amber-50 text-amber-700 border-amber-200';
                                    const dotClass = loading ? 'bg-gray-400' : allGreen ? 'bg-emerald-500' : 'bg-amber-500';
                                    const label = loading
                                        ? 'Checking AI readiness...'
                                        : allGreen
                                            ? 'AI Ready'
                                            : partial
                                                ? 'Chat ready · run voice DB migration'
                                                : 'AI Setup Required';
                                    const tip = loading
                                        ? ''
                                        : allGreen
                                            ? 'WhatsApp AI and voice calls can use the configured API.'
                                            : [...issuesChat, ...issuesVoice].filter(Boolean).join(' | ');
                                    return (
                                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${badgeClass}`} title={tip || label}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                                            {label}
                                        </span>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => openModal('call')}
                            disabled={!aiReadiness.voiceReady}
                            className="min-h-11 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 text-xs sm:text-sm shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60">
                            <Phone size={14} /> Call
                        </button>
                        <button onClick={() => openModal('whatsapp')}
                            disabled={!aiReadiness.chatReady}
                            className="min-h-11 px-3 sm:px-4 py-2 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-lg font-semibold flex items-center gap-2 text-xs sm:text-sm shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#25D366] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/60">
                            <MessageSquare size={14} /> WhatsApp
                        </button>
                        <button onClick={() => openModal('schedule')}
                            className="min-h-11 px-3 sm:px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-semibold flex items-center gap-2 text-xs sm:text-sm hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60">
                            <Calendar size={14} /> Schedule
                        </button>
                        <button onClick={() => openModal('note')}
                            className="min-h-11 px-3 sm:px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-semibold flex items-center gap-2 text-xs sm:text-sm hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60">
                            <Edit3 size={14} /> Note
                        </button>
                        {lead.status !== 'Won' && lead.status !== 'Converted' && (
                            <button onClick={() => { updateLeadStatus(lead.id, 'Won'); addActionToLead(lead.id, 'ai_action', 'Lead Converted', 'Marked as Converted manually.'); }}
                                className="min-h-11 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-2 text-xs sm:text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60">
                                <TrendingUp size={14} /> Mark Converted
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <SectionCard title="Bot Call-Chat Handshake" icon={RefreshCw} iconColor="text-indigo-600" className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                        type="button"
                        onClick={() => scheduleHandshake({
                            sourceChannel: 'whatsapp',
                            targetChannel: 'call',
                            when: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                        })}
                        disabled={creatingAutomation}
                        className="min-h-11 px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 disabled:opacity-60"
                    >
                        Chat → Call in 1 hour
                    </button>
                    <button
                        type="button"
                        onClick={() => scheduleHandshake({
                            sourceChannel: 'call',
                            targetChannel: 'whatsapp',
                            when: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                            messageTemplate: `Hi ${lead.name.split(' ')[0]}, continuing from our call. Let's continue here.`,
                        })}
                        disabled={creatingAutomation}
                        className="min-h-11 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 disabled:opacity-60"
                    >
                        Call → Chat in 5 min
                    </button>
                    <button
                        type="button"
                        onClick={() => scheduleHandshake({
                            sourceChannel: 'whatsapp',
                            targetChannel: 'call',
                            when: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                        })}
                        disabled={creatingAutomation}
                        className="min-h-11 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100 disabled:opacity-60"
                    >
                        Schedule call tomorrow
                    </button>
                </div>
                <div className="mt-3">
                    {pendingAutomationJobs.length > 0 ? (
                        <div className="space-y-1.5">
                            {pendingAutomationJobs.slice(0, 4).map((job) => (
                                <div key={job.id} className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 flex items-center justify-between gap-2">
                                    <span className="truncate">
                                        {job.source_channel} → {job.target_channel} at {new Date(job.schedule_at).toLocaleString()}
                                    </span>
                                    {job.target_channel === 'call' ? (
                                        <button
                                            type="button"
                                            onClick={() => cancelBookedCallReservation(job)}
                                            disabled={cancellingAutomationId === job.id}
                                            className="shrink-0 px-2 py-1 rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-60"
                                        >
                                            {cancellingAutomationId === job.id ? 'Cancelling…' : 'Cancel'}
                                        </button>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400">No pending bot automation jobs for this lead.</p>
                    )}
                </div>
            </SectionCard>

            {/* ─── AI Score Cards ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <div className="bg-white border border-gray-100 rounded-[1rem] p-5 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-1">
                        <span className={`text-2xl font-semibold tracking-tight leading-tight ${scoreColor(lead.aiScore || 0)}`}>{lead.aiScore ?? '—'}</span>
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${scoreBar(lead.aiScore || 0)}`} style={{ width: `${lead.aiScore || 0}%` }} />
                        </div>
                    </div>
                    <p className="text-[13px] text-gray-500">AI Lead Score</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-[1rem] p-5 shadow-sm flex flex-col justify-center">
                    <h3 className="text-2xl font-semibold tracking-tight leading-tight text-indigo-600 mb-1">{lead.dealProbability ? `${lead.dealProbability}%` : '—'}</h3>
                    <p className="text-[13px] text-gray-500">Deal Probability</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-[1rem] p-5 shadow-sm flex flex-col justify-center">
                    <h3 className={`text-2xl font-semibold tracking-tight leading-tight mb-1 ${lead.scoreLabel === 'Hot' ? 'text-red-600' : lead.scoreLabel === 'Warm' ? 'text-orange-500' : 'text-sky-500'}`}>
                        {lead.scoreLabel || 'Warm'}
                    </h3>
                    <p className="text-[13px] text-gray-500">Intent Level</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-[1rem] p-5 shadow-sm flex flex-col justify-center">
                    <h3 className="text-2xl font-semibold tracking-tight leading-tight text-gray-900 mb-1">{(lead.timeline || []).length}</h3>
                    <p className="text-[13px] text-gray-500">Interactions</p>
                </div>
            </div>

            {/* ─── Main Layout ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* ── LEFT COLUMN ── */}
                <div className="lg:col-span-1 space-y-4">

                    {/* Lead Profile */}
                    <SectionCard title="Lead Profile" icon={Users} iconColor="text-blue-600">
                        {/* Status Selector */}
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs text-gray-500 font-medium">Status</span>
                            <select value={lead.status} onChange={e => updateLeadStatus(lead.id, e.target.value)}
                                className={`text-xs font-semibold rounded-md px-2.5 py-1 border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                                {STATUSES.map(s => <option key={s} value={s}>{s === 'Won' ? 'Converted' : s}</option>)}
                            </select>
                        </div>
                        <div className="space-y-0">
                            <InfoRow label="Phone" value={lead.phone} icon={Phone} />
                            <InfoRow label="Email" value={lead.email} icon={Mail} />
                            <InfoRow label="Source" value={lead.source} icon={ExternalLink} />
                            <InfoRow label="Campaign" value={lead.campaign} icon={Target} />
                            <div className="flex items-start justify-between gap-2 py-2 border-b border-gray-50 last:border-0">
                                <div className="flex items-center gap-1.5 shrink-0 min-w-0">
                                    <BookOpen size={13} className="text-gray-400 shrink-0" />
                                    <span className="text-xs text-gray-400 font-medium">Project</span>
                                </div>
                                <select
                                    value={workspaceLeadProjectValue}
                                    onChange={(e) => saveWorkspaceLeadProject(e.target.value)}
                                    disabled={!isPersistableLeadId(lead?.id) || savingLeadProject}
                                    className="max-w-[58%] text-xs font-semibold text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer disabled:opacity-50"
                                >
                                    <option value="">Not linked</option>
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <InfoRow label="Location" value={lead.location} icon={MapPin} />
                        </div>
                        {/* Assign */}
                        <div className="mt-4 pt-3 border-t border-gray-100">
                            <label className="text-xs text-gray-400 font-medium block mb-1.5">Assigned Owner</label>
                            <select value={lead.assignedTo || ''} onChange={e => assignLead(lead.id, e.target.value)}
                                className="w-full text-xs font-semibold text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer">
                                <option value="" disabled>Select agent</option>
                                {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-3">Created: {new Date(lead.createdDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </SectionCard>

                    {/* AI Insights */}
                    <SectionCard title="AI Intelligence" icon={BrainCircuit} iconColor="text-purple-600">
                        <div className="space-y-3">
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wide mb-1">Context</p>
                                <p className="text-sm text-blue-900 leading-relaxed">{lead.insight || aiPlaybook.context}</p>
                            </div>
                            <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wide mb-1">Recommendation</p>
                                <p className="text-sm text-purple-900 leading-relaxed">{lead.recommendation || aiPlaybook.recommendation}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                                <div className="flex flex-col gap-1 bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">Sentiment</p>
                                    <p className="text-sm font-bold text-emerald-800">Positive</p>
                                </div>
                                <div className="flex flex-col gap-1 bg-orange-50 border border-orange-100 rounded-lg p-3">
                                    <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wide">Priority</p>
                                    <p className="text-sm font-bold text-orange-800">{lead.scoreLabel || 'Normal'}</p>
                                </div>
                            </div>
                        </div>
                    </SectionCard>

                    {/* Follow-ups */}
                    <SectionCard title="Follow-ups" icon={Calendar} iconColor="text-orange-500">
                        <div className="space-y-2 mb-3">
                            {(lead.followups || []).length > 0 ? (lead.followups || []).map(fu => (
                                <div key={fu.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50 hover:border-orange-200 transition-colors">
                                    <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${fu.status === 'Pending' ? 'bg-orange-400' : 'bg-emerald-500'}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate">{fu.task}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{fu.time}</p>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${fu.status === 'Pending' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>{fu.status}</span>
                                </div>
                            )) : (
                                <p className="text-sm text-gray-400 text-center py-4">No follow-ups scheduled</p>
                            )}
                        </div>
                        <button onClick={() => openModal('schedule')}
                            className="w-full py-2 border border-dashed border-indigo-300 text-indigo-600 text-sm font-semibold rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
                            <PlusCircle size={15} /> Schedule Follow-up
                        </button>
                    </SectionCard>
                </div>

                {/* ── RIGHT COLUMN ── */}
                <div className="lg:col-span-2 space-y-4">

                    {/* Tabs */}
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl" role="tablist" aria-label="Lead workspace tabs">
                        {[
                            { key: 'timeline', label: 'Timeline', icon: Activity },
                            { key: 'calls', label: `Calls (${calls.length})`, icon: Phone },
                            { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
                        ].map(tab => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                role="tab"
                                aria-selected={activeTab === tab.key}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 ${activeTab === tab.key ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
                                <tab.icon size={14} /> {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* ── TIMELINE TAB ── */}
                    {activeTab === 'timeline' && (
                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
                                <Activity size={15} className="text-blue-600" />
                                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Activity Timeline</h2>
                                <span className="ml-auto text-xs text-gray-400">{(lead.timeline || []).length} events</span>
                            </div>
                            <div className="p-5">
                                {(lead.timeline || []).length > 0 ? (
                                    <div className="relative">
                                        <div className="absolute left-4 top-2 bottom-2 w-px bg-gray-100" />
                                        <div className="space-y-4">
                                            {(lead.timeline || []).map((event, idx) => {
                                                const cfg = TIMELINE_ICONS[event.type] || TIMELINE_ICONS.default;
                                                const Ico = cfg.icon;
                                                return (
                                                    <motion.div key={event.id || idx}
                                                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: idx * 0.04 }}
                                                        className="flex gap-4 relative">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${cfg.color}`}>
                                                            <Ico size={14} />
                                                        </div>
                                                        <div className="flex-1 min-w-0 bg-gray-50 rounded-lg p-3 hover:bg-gray-100/70 transition-colors">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <p className="text-sm font-semibold text-gray-800 truncate">{event.action}</p>
                                                                <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">{event.time}</span>
                                                            </div>
                                                            {event.detail && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{event.detail}</p>}
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-gray-400">
                                        <Activity size={36} className="text-gray-200 mx-auto mb-3" />
                                        <p className="text-sm">No activity yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── CALLS TAB ── */}
                    {activeTab === 'calls' && (
                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
                                <Phone size={15} className="text-indigo-600" />
                                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Call History</h2>
                            </div>
                            <div className="p-5 space-y-4">
                                {calls.length > 0 ? calls.map(call => (
                                    <div key={call.id} className="border border-gray-200 rounded-xl overflow-hidden hover:border-indigo-200 transition-colors">
                                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${call.outcome === 'Qualified' ? 'bg-emerald-100 text-emerald-600' : call.outcome === 'No Answer' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'}`}>
                                                    <Phone size={14} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800">{call.outcome || 'Unknown'}</p>
                                                    <p className="text-xs text-gray-400">{call.time} · {call.duration}</p>
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${call.outcome === 'Qualified' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{call.outcome}</span>
                                        </div>
                                        {call.recording && (
                                            <div className="px-4 py-3 bg-indigo-50/60 border-b border-gray-100 flex items-center gap-3">
                                                <button onClick={() => handlePlayRecording(call)}
                                                    className="w-8 h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shrink-0 transition-colors shadow-sm">
                                                    {playingId === call.id ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                                                </button>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs font-semibold text-indigo-700">{call.recording}</span>
                                                        <span className="text-[10px] text-indigo-400">{call.duration}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                                                        <motion.div animate={{ width: playingId === call.id ? '45%' : '0%' }}
                                                            transition={{ duration: playingId === call.id ? 2 : 0 }}
                                                            className="h-full bg-indigo-600 rounded-full" />
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        if (!call.recordingUrl) return;
                                                        const a = document.createElement('a');
                                                        a.href = call.recordingUrl;
                                                        a.download = call.recording || `call_recording_${call.id}.webm`;
                                                        a.click();
                                                    }}
                                                    className="p-1.5 text-indigo-500 hover:text-indigo-700 rounded hover:bg-indigo-100 transition-colors"
                                                >
                                                    <Download size={14} />
                                                </button>
                                            </div>
                                        )}
                                        <div className="px-4 py-3">
                                            {call.sentiment > 0 && (
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Star size={12} className="text-yellow-400" />
                                                    <p className="text-xs text-gray-500">Sentiment score: <span className="font-bold text-emerald-600">{call.sentiment}%</span></p>
                                                </div>
                                            )}
                                            {(call.transcript || []).length > 0 && (
                                                <div className="bg-gray-50 rounded-lg p-3 space-y-2 max-h-28 overflow-hidden relative">
                                                    {call.transcript.slice(0, 2).map((line, i) => (
                                                        <div key={i} className="flex gap-2">
                                                            <span className={`text-[10px] font-bold shrink-0 mt-0.5 ${line.speaker === 'AI' ? 'text-blue-500' : 'text-gray-500'}`}>{line.speaker}:</span>
                                                            <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{line.text}</p>
                                                        </div>
                                                    ))}
                                                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50" />
                                                </div>
                                            )}
                                            <button onClick={() => { setTranscriptId(call.id); setModal('transcript'); }}
                                                className="mt-2.5 w-full py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                                                <BookOpen size={13} /> View Full Transcript
                                            </button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-12 text-gray-400">
                                        <Phone size={36} className="text-gray-200 mx-auto mb-3" />
                                        <p className="text-sm">No calls recorded yet</p>
                                        <button onClick={() => openModal('call')} className="mt-3 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                                            Make a Call
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── WHATSAPP TAB ── */}
                    {activeTab === 'whatsapp' && (
                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col" style={{ minHeight: 420 }}>
                            <div className="bg-[#075E54] text-white p-4 flex items-center gap-3">
                                <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center font-bold text-base shrink-0">{lead.name[0]}</div>
                                <div className="flex-1">
                                    <p className="font-bold text-sm">{lead.name}</p>
                                    <p className="text-xs text-white/60">{lead.phone}</p>
                                </div>
                                <button onClick={() => openModal('whatsapp')}
                                    className="text-xs font-semibold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                                    <Send size={12} /> New Message
                                </button>
                            </div>
                            <div className="flex-1 bg-[#ECE5DD] p-4 overflow-y-auto min-h-[260px] flex flex-col gap-3">
                                {waHistory.length > 0 ? waHistory.map(msg => (
                                    <div key={msg.id} className={`max-w-[78%] ${msg.sender === 'AI' ? 'self-start' : 'self-end'}`}>
                                        <p className={`text-[10px] font-semibold mb-0.5 ${msg.sender === 'AI' ? 'text-indigo-600' : 'text-right text-green-700'}`}>
                                            {msg.sender === 'SalesRep' ? 'You' : msg.sender}
                                        </p>
                                        <div className={`p-2.5 rounded-xl shadow-sm text-sm ${msg.sender === 'AI' ? 'bg-white text-gray-800 rounded-tl-none' : 'bg-[#DCF8C6] text-gray-800 rounded-tr-none'}`}>
                                            {msg.attachment && (
                                                <div className="flex items-center gap-2 mb-2 bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-lg">
                                                    <FileText size={13} className="text-blue-500 shrink-0" />
                                                    <span className="text-xs font-semibold text-blue-700">{msg.attachment}</span>
                                                    <Download size={12} className="text-blue-400 ml-auto cursor-pointer" />
                                                </div>
                                            )}
                                            <p>{msg.text}</p>
                                            <p className="text-[10px] text-gray-400 text-right mt-0.5">{msg.time}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">No messages yet</div>
                                )}
                                {isWaAiTyping && (
                                    <div className="max-w-[78%] self-start">
                                        <p className="text-[10px] font-semibold mb-0.5 text-indigo-600">AI</p>
                                        <div className="p-2.5 rounded-xl shadow-sm text-sm bg-white text-gray-700 rounded-tl-none border border-gray-100">
                                            SalesPal team is writing...
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="p-3 bg-gray-100 border-t border-gray-200 flex items-center gap-2">
                                <div className="flex-1 bg-white flex items-center rounded-full px-3 py-2 shadow-sm border border-gray-200">
                                    <input type="text" value={waText} onChange={e => setWaText(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && waText.trim()) sendAIAssistedWhatsApp(waText); }}
                                        placeholder="Type a reply..." className="flex-1 text-sm bg-transparent outline-none" />
                                </div>
                                <button onClick={() => sendAIAssistedWhatsApp(waText)}
                                    disabled={sendingWhatsApp}
                                    className="w-10 h-10 bg-[#128C7E] hover:bg-[#075E54] text-white rounded-full flex items-center justify-center shadow-sm transition-colors">
                                    <Send size={15} className="ml-0.5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── AI RECOMMENDATIONS ── */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <BrainCircuit size={16} className="text-blue-600" />
                            <h2 className="text-sm font-bold text-blue-900 uppercase tracking-wide">AI Recommendations</h2>
                        </div>
                        <div className="space-y-3">
                            {[
                                { title: 'High Intent Detected', desc: lead.insight || 'Customer is showing strong purchase signals.', action: 'Call Now', type: 'call', urgent: true },
                                { title: 'Send Price Sheet', desc: 'Customer enquired about pricing. Send detailed quote.', action: 'Send WhatsApp', type: 'whatsapp', urgent: false },
                                { title: 'Book Site Visit', desc: 'Right time to invite for a site visit or product demo.', action: 'Schedule', type: 'schedule', urgent: false },
                            ].map((rec, i) => (
                                <div key={i} className="bg-white border border-blue-100 rounded-xl p-4 flex gap-3 items-start hover:border-blue-200 transition-colors">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${rec.urgent ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {rec.urgent ? <Zap size={15} /> : <Info size={15} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900">{rec.title}</p>
                                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{rec.desc}</p>
                                    </div>
                                    <button onClick={() => openModal(rec.type)}
                                        className="shrink-0 text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                                        {rec.action}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesLeadWorkspace;
