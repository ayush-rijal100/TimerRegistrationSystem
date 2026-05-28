// Central place for AI memory limits.
// We keep these small for a Discord bot MVP so LLM calls stay fast and predictable.
export const MAX_STORED_MESSAGES_PER_USER = 20;
export const MAX_INTENT_HISTORY_MESSAGES = 10;
export const MAX_FALLBACK_HISTORY_MESSAGES = 20;
