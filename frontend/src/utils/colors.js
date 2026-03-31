/**
 * Semantic mapping of zones to Tailwind color families.
 *
 * Dark mode philosophy: keep colors FUNCTIONAL but MUTED.
 * Use slate-tinted backgrounds (not pure black) and desaturated
 * text → no neon, no vibrant -300/-400 shades on dark bg.
 */
const ZONE_STYLES = {
    'Almacén': {
        border: 'border-zone-warehouse dark:border-zone-warehouse',
        bg: 'bg-white dark:bg-slate-800/80',
        text: 'text-zone-warehouse dark:text-zone-warehouse-light',
        badgeBg: 'bg-zone-warehouse-light/20 dark:bg-zone-warehouse-dark/50',
        badgeText: 'text-zone-warehouse dark:text-zone-warehouse-light',
    },
    'Mostrador': {
        border: 'border-zone-counter dark:border-zone-counter',
        bg: 'bg-white dark:bg-slate-800/80',
        text: 'text-zone-counter dark:text-zone-counter-light',
        badgeBg: 'bg-zone-counter-light/20 dark:bg-zone-counter-dark/50',
        badgeText: 'text-zone-counter dark:text-zone-counter-light',
    },
    'Oficina': {
        border: 'border-zone-office dark:border-zone-office',
        bg: 'bg-white dark:bg-slate-800/80',
        text: 'text-zone-office dark:text-zone-office-light',
        badgeBg: 'bg-zone-office-light/20 dark:bg-zone-office-dark/50',
        badgeText: 'text-zone-office dark:text-zone-office-light',
    },
    'Reparto': {
        border: 'border-zone-logistics dark:border-zone-logistics',
        bg: 'bg-white dark:bg-slate-800/80',
        text: 'text-zone-logistics dark:text-zone-logistics-light',
        badgeBg: 'bg-zone-logistics-light/20 dark:bg-zone-logistics-dark/50',
        badgeText: 'text-zone-logistics dark:text-zone-logistics-light',
    },
    'Neumáticos': {
        border: 'border-zone-tire dark:border-zone-tire',
        bg: 'bg-white dark:bg-slate-800/80',
        text: 'text-zone-tire dark:text-zone-tire-light',
        badgeBg: 'bg-zone-tire-light/20 dark:bg-zone-tire-dark/50',
        badgeText: 'text-zone-tire dark:text-zone-tire-light',
    },
    'Call Center': {
        border: 'border-zone-call dark:border-zone-call',
        bg: 'bg-white dark:bg-slate-800/80',
        text: 'text-zone-call dark:text-zone-call-light',
        badgeBg: 'bg-zone-call-light/20 dark:bg-zone-call-dark/50',
        badgeText: 'text-zone-call dark:text-zone-call-light',
    },
    'Comercial': {
        border: 'border-zone-sales dark:border-zone-sales',
        bg: 'bg-white dark:bg-slate-800/80',
        text: 'text-zone-sales dark:text-zone-sales-light',
        badgeBg: 'bg-zone-sales-light/20 dark:bg-zone-sales-dark/50',
        badgeText: 'text-zone-sales dark:text-zone-sales-light',
    }
};

/**
 * Returns Tailwind classes for shift cards based on zone/status.
 * Mapping explicit full class names to avoid Tailwind JIT compiler purging dynamically constructed ones.
 */
export const getShiftColors = (zoneName, isOvertime, type) => {
    // ── Status priorities ─────────────────────────────────────────
    if (type === 'MEDICAL') {
        return {
            border: 'border-purple-400 dark:border-purple-600',
            bg: 'bg-purple-50 dark:bg-slate-800/80',
            text: 'text-purple-700 dark:text-purple-300',
            badgeBg: 'bg-purple-100 dark:bg-purple-900/40',
            badgeText: 'text-purple-700 dark:text-purple-300',
        };
    }

    if (type === 'VACATION' || type === 'OFF') {
        return {
            border: 'border-teal-400 dark:border-teal-600',
            bg: 'bg-teal-50 dark:bg-slate-800/80',
            text: 'text-teal-700 dark:text-teal-300',
            badgeBg: 'bg-teal-100 dark:bg-teal-900/40',
            badgeText: 'text-teal-700 dark:text-teal-300',
        };
    }

    if (isOvertime) {
        return {
            border: 'border-amber-400 dark:border-amber-600',
            bg: 'bg-amber-50 dark:bg-slate-800/80',
            text: 'text-amber-700 dark:text-amber-300',
            badgeBg: 'bg-amber-100 dark:bg-amber-900/40',
            badgeText: 'text-amber-700 dark:text-amber-300',
        };
    }

    // ── Default zone colors ───────────────────────────────────────
    // Fallback if not found
    return ZONE_STYLES[zoneName] || {
        border: 'border-gray-400 dark:border-gray-500',
        bg: 'bg-white dark:bg-slate-800/80',
        text: 'text-gray-700 dark:text-gray-300',
        badgeBg: 'bg-gray-100 dark:bg-gray-700',
        badgeText: 'text-gray-700 dark:text-gray-300',
    };
};
