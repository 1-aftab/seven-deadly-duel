const SUPABASE_URL = 'https://yolkcyapijuwujacuowg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Z11bE4bzsi9zSq6PBIW1jg_XcQ-uBlv';

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

window.DF = window.DF || {};

DF.Supabase = supabase;
