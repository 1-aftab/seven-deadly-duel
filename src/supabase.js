(function () {
  'use strict';

  window.DF = window.DF || {};

  const SUPABASE_URL = 'https://yolkcyapijuwujacuowg.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Z11bE4bzsi9zSq6PBIW1jg_XcQ-uBlv';

  if (
    !window.supabase ||
    typeof window.supabase.createClient !== 'function'
  ) {
    window.DF.Supabase = null;
    window.DF.SupabaseError =
      'The Supabase JavaScript library did not load.';
    console.error('DuelForge: Supabase JavaScript library did not load.');
    return;
  }

  try {
    window.DF.Supabase = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

    window.DF.SupabaseError = '';
    console.log('DuelForge: Supabase client initialized.');
  } catch (error) {
    window.DF.Supabase = null;
    window.DF.SupabaseError =
      error && error.message
        ? error.message
        : String(error);

    console.error(
      'DuelForge: Supabase client initialization failed.',
      error
    );
  }
})();
