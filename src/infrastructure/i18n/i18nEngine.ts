// src/infrastructure/i18n/i18nEngine.ts
import { Dictionary } from './Dictionary';

export type SupportedLanguage = 'pt' | 'en';

// O estado global do idioma
let currentLocale: SupportedLanguage = 'pt';

/**
 * Retorna a string traduzida baseada em uma chave (ex: "header.title")
 */
export function t(key: string): string {
    const keys = key.split('.');
    let value: any = Dictionary[currentLocale];
    
    for (const k of keys) {
        if (value && value[k] !== undefined) {
            value = value[k];
        } else {
            console.warn(`[i18n] Chave de tradução não encontrada: ${key}`);
            return key; // Fallback visual
        }
    }
    return value as string;
}

/**
 * Altera o idioma global, atualiza a tag <html> e traduz o DOM instantaneamente
 */
export function setLocale(locale: SupportedLanguage) {
    currentLocale = locale;
    document.documentElement.lang = locale;

    // Traduz todo o HTML estático que possui o atributo data-i18n
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) {
            // Suporta inputs (placeholder) ou texto interno
            if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
                el.placeholder = t(key);
            } else {
                el.textContent = t(key);
            }
        }
    });

    // Dispara evento global para que Canvas, Gráficos e UI Dinâmica se redesenhem
    window.dispatchEvent(new CustomEvent('luxLocaleChanged', { detail: locale }));
}

export function getLocale(): SupportedLanguage {
    return currentLocale;
}