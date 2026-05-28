import { createClient } from "@supabase/supabase-js";
import { PayloadDTO } from "../api/dto/payloadDTO";

export const SUPABASE_URL = process.env.SUPABASE_URL!;
export const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!;
export const SUPABASE_AUTH_PROVIDER = process.env.SUPABASE_AUTH_PROVIDER!;
export const SUPABASE_SCHEMA_NAME = process.env.SUPABASE_SCHEMA_NAME!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function insertActivity(payload: PayloadDTO): Promise<number> {
    const { error, data } = await supabase.schema(SUPABASE_SCHEMA_NAME).rpc('flush_activity', payload);

    console.log("insertActivity payload:", payload, "response:", data, "error:", error);

    if (error) throw new Error(error.message);

    return data.activity_id;
}

export const logoutFromSupabase = async () => {
    const { error } = await supabase.auth.signOut();    
    if (error) {
        console.error("Error during logout:", error);
        throw new Error("An error occurred while logging out. Please try again.");
    }
};

export async function getUserId() {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (!user || error) {
        throw new Error("User not logged in");
    }

    const userId = user.id;

    return userId;
}