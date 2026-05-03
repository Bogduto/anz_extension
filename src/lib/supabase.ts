import { createClient } from "@supabase/supabase-js";
import { PayloadDTO } from "../api/dto/payloadDTO";

export const SUPABASE_SCHEMA_NAME = process.env.SUPABASE_SCHEMA_NAME || "itallo";

export const SUPABASE_URL = process.env.SUPABASE_URL || "https://oygjfacifeejqzyrrloy.supabase.co";
export const SUPABASE_KEY = process.env.SUPABASE_KEY || "sb_publishable_fWVQDP_7qlubntYpobF80Q_ZCrEnzwh";
export const SUPABASE_AUTH_PROVIDER = process.env.SUPABASE_AUTH_PROVIDER || "github";
export const SCHEMA_NAME = process.env.SUPABASE_SCHEMA_NAME || "itallo"

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function insertActivity(payload: PayloadDTO): Promise<number> {
    const { error, data } = await supabase.schema(SUPABASE_SCHEMA_NAME).rpc('flush_activity', payload);

    console.log("insertActivity payload:", payload, "response:", data, "error:", error);

    if (error) throw new Error(error.message);

    return data.activity_id;
}

export async function getUserId() {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (!user || error) {
        throw new Error("User not logged in");
    }

    const userId = user.id;

    return userId;
}