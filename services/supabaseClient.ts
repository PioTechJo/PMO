import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

// A regex to check for any characters outside the ISO-8859-1 range (e.g., Unicode like Arabic).
const NON_ISO_8859_1_REGEX = /[^\u0000-\u00ff]/;

/**
 * Initializes the Supabase client with the provided credentials.
 * @param url The Supabase project URL.
 * @param key The Supabase public anon key.
 * @returns The created Supabase client instance.
 */
export const initSupabase = (url: string, key: string): SupabaseClient => {
    if (!url || !key) {
        throw new Error('Supabase URL and Key are required.');
    }

    // Validate that the key contains only valid characters for an HTTP header.
    if (NON_ISO_8859_1_REGEX.test(key)) {
        throw new Error('Supabase Key contains invalid characters (like Arabic text). Please use the correct key from your Supabase dashboard.');
    }

    supabaseInstance = createClient(url, key);
    return supabaseInstance;
};

/**
 * Returns the singleton instance of the Supabase client.
 * @returns The Supabase client instance, or null if it has not been initialized.
 */
export const getSupabase = (): SupabaseClient | null => {
    return supabaseInstance;
};