import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://oygjfacifeejqzyrrloy.supabase.co";
export const SUPABASE_KEY = process.env.SUPABASE_KEY ?? "sb_publishable_fWVQDP_7qlubntYpobF80Q_ZCrEnzwh";
export const SUPABASE_AUTH_PROVIDER = process.env.SUPABASE_AUTH_PROVIDER ?? "github";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);