import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type TypedClient = SupabaseClient<Database>;

export interface CoupleContext {
  coupleId: string;
  coupleName: string;
  members: { id: string; fullName: string | null; avatarUrl: string | null; email: string }[];
}

/** Returns null when the signed-in user has not created/joined a couple yet. */
export async function getMyCoupleContext(supabase: TypedClient, userId: string): Promise<CoupleContext | null> {
  const { data: membership, error: membershipError } = await supabase
    .from("couple_members")
    .select("couple_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership) return null;

  const [{ data: couple, error: coupleError }, { data: members, error: membersError }] = await Promise.all([
    supabase.from("couples").select("*").eq("id", membership.couple_id).single(),
    supabase
      .from("couple_members")
      .select("user_id, profiles(id, full_name, avatar_url, email)")
      .eq("couple_id", membership.couple_id),
  ]);
  if (coupleError) throw coupleError;
  if (membersError) throw membersError;

  type MemberRow = { user_id: string; profiles: { id: string; full_name: string | null; avatar_url: string | null; email: string } | null };

  return {
    coupleId: couple.id,
    coupleName: couple.name,
    members: (members as MemberRow[])
      .filter((m) => m.profiles)
      .map((m) => ({
        id: m.profiles!.id,
        fullName: m.profiles!.full_name,
        avatarUrl: m.profiles!.avatar_url,
        email: m.profiles!.email,
      })),
  };
}

export async function createCouple(supabase: TypedClient, name?: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_my_couple", { p_name: name });
  if (error) throw error;
  return data;
}

export async function joinCoupleByInvite(supabase: TypedClient, code: string): Promise<string> {
  const { data, error } = await supabase.rpc("redeem_couple_invite", { p_code: code.trim().toUpperCase() });
  if (error) throw error;
  return data;
}

function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (0/O, 1/I)
  let code = "";
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

export async function createCoupleInvite(supabase: TypedClient, coupleId: string, createdBy: string): Promise<{ code: string; expiresAt: string }> {
  const code = generateInviteCode();
  const { data, error } = await supabase
    .from("couple_invites")
    .insert({ couple_id: coupleId, code, created_by: createdBy })
    .select("code, expires_at")
    .single();
  if (error) throw error;
  return { code: data.code, expiresAt: data.expires_at };
}

export async function renameCouple(supabase: TypedClient, coupleId: string, name: string): Promise<void> {
  const { error } = await supabase.from("couples").update({ name }).eq("id", coupleId);
  if (error) throw error;
}
