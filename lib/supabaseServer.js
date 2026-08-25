import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const kho = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (ten) => kho.get(ten)?.value,
        set: (ten, gt, tuyChon) => { try { kho.set({ name: ten, value: gt, ...tuyChon }); } catch {} },
        remove: (ten, tuyChon) => { try { kho.set({ name: ten, value: "", ...tuyChon }); } catch {} },
      },
    }
  );
}
