/**
 * Sales bot routing rules (voice + WhatsApp) aligned with product flowcharts.
 * Call window and result strings are centralized here.
 */

export const CALL_RESULT = {
    NO_ANSWER: 'No Answer',
    BUSY: 'Busy',
    WRONG_NUMBER: 'Wrong Number',
    CONNECTED: 'Connected',
};

/** Shown on timeline / comms when the call ends with this result */
export const CALL_RESULT_DETAIL = {
    [CALL_RESULT.NO_ANSWER]: 'Retry 2hr then 6:30 PM then next day',
    [CALL_RESULT.BUSY]: 'Retry next slot',
    [CALL_RESULT.WRONG_NUMBER]: 'Stop — invalid number / call stopped immediately',
    [CALL_RESULT.CONNECTED]: 'Conversation — continuing',
};

export const WHATSAPP_REPLY_STATE = {
    NO: 'No',
    YES: 'Yes',
};

export const WHATSAPP_NO_REPLY_DETAIL = 'Follow-up Day0 Day1 Day3 Day5 Day7';

/** Seconds to wait for lead speech after AI finishes (voice). */
export const VOICE_SILENCE_MS = 30_000;

/** Seconds to wait for user message after AI sends (WhatsApp). */
export const WHATSAPP_SILENCE_MS = 30_000;

/**
 * Call is active 9:00–21:59 in the lead’s IANA timezone (9 AM–9 PM local).
 */
function parseWindowHourMinute(value, fallbackHour) {
    const m = String(value || '').trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (!m) return { hh: fallbackHour, mm: 0 };
    return { hh: Number(m[1]), mm: Number(m[2]) };
}

export function isWithinCallActiveWindow(ianaTimeZone, windowStart = '09:00', windowEnd = '21:00') {
    const tz = ianaTimeZone || 'Asia/Kolkata';
    const { hh: startH, mm: startM } = parseWindowHourMinute(windowStart, 9);
    const { hh: endH, mm: endM } = parseWindowHourMinute(windowEnd, 21);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;
    try {
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: tz,
            hour: 'numeric',
            minute: 'numeric',
            hour12: false,
        }).formatToParts(new Date());
        const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '12', 10);
        const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
        const nowTotal = hour * 60 + minute;
        if (startTotal < endTotal) return nowTotal >= startTotal && nowTotal < endTotal;
        if (startTotal > endTotal) return nowTotal >= startTotal || nowTotal < endTotal;
        return true;
    } catch {
        const d = new Date();
        const nowTotal = d.getHours() * 60 + d.getMinutes();
        if (startTotal < endTotal) return nowTotal >= startTotal && nowTotal < endTotal;
        if (startTotal > endTotal) return nowTotal >= startTotal || nowTotal < endTotal;
        return true;
    }
}

export function callWindowLabel(ianaTimeZone, windowStart = '09:00', windowEnd = '21:00') {
    const tz = ianaTimeZone || 'Asia/Kolkata';
    return `Calls ${windowStart} – ${windowEnd} (${tz}). WhatsApp 24/7.`;
}
