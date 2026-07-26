// ============================================================
// SOLO LEAGUE RPG — Supabase connection
// Every page that needs login or character data loads this file
// (after the Supabase library itself, see the <script> tags in
// login.html for the exact order).
// ============================================================

const SUPABASE_URL = "https://zfrqvvoeedsdhqwztyvm.supabase.co";
const SUPABASE_KEY = "sb_publishable_Lxgr-nPDZZHcmfb-be_emA_n2pPZhp5";

// This "sb" object is what every page uses to talk to
// your database and handle login/signup.
// (Named "sb" instead of "supabase" because the Supabase library
// itself already uses the name "supabase" globally — reusing it
// causes a "already declared" error.)
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
