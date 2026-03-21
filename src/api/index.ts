import { supabase } from "../lib/supabase";
// SESSION

export async function insertOrGetSession(userId: string, reposUrl: string, title: string): Promise<number> {
    const { data: existing, error: selErr } = await supabase
        .from('session')
        .select('id')
        .eq('repos_id', reposUrl)
        .limit(1);
    if (selErr) throw selErr;
    if (existing?.length) return existing[0].id;


    // FIX IT
    const { data: inserted, error: insErr } = await supabase
        .from('session')
        .insert({ repos_id: reposUrl, user_id: userId, project_title: title })
        .select('id');
    if (insErr) throw insErr;

    return inserted![0].id;
}

// SLICE

export async function insertNewSlice(sessionId: number, start: number, files: string[], langs: string[]): Promise<void> {
    const { error } = await supabase
        .from('slice')
        .insert({ start: start, end: Date.now(), session_id: sessionId, files, langs });
    if (error) throw error;
}