import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.SUPABASE_URL!;
export const SUPABASE_KEY = process.env.SUPABASE_KEY!;
export const SUPABASE_AUTH_PROVIDER = process.env.SUPABASE_AUTH_PROVIDER!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);