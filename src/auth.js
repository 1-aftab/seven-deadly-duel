(function () {
  'use strict';

  let mode = 'signin';
  let initialized = false;

  function $(id) {
    return document.getElementById(id);
  }

  function setMessage(text, type) {
    const el = $('authMessage');
    if (!el) return;

    el.textContent = text || '';
    el.className = 'message';

    if (type) {
      el.classList.add('auth-' + type);
    }
  }

  function setMode(nextMode) {
    mode = nextMode === 'signup' ? 'signup' : 'signin';

    const signup = mode === 'signup';
    const title = $('authTitle');
    const subtitle = $('authSubtitle');
    const submit = $('authSubmit');
    const toggle = $('authToggle');
    const password = $('authPassword');

    if (title) {
      title.textContent = signup ? 'Create your account' : 'Welcome back';
    }

    if (subtitle) {
      subtitle.textContent = signup
        ? 'Create an account to enter the arena.'
        : 'Sign in to enter the arena.';
    }

    if (submit) {
      submit.textContent = signup ? 'CREATE ACCOUNT' : 'SIGN IN';
      submit.disabled = false;
    }

    if (toggle) {
      toggle.textContent = signup
        ? 'I ALREADY HAVE AN ACCOUNT'
        : 'CREATE ACCOUNT';
      toggle.disabled = false;
    }

    if (password) {
      password.autocomplete = signup ? 'new-password' : 'current-password';
    }

    setMessage('');
  }

  function setBusy(busy) {
    const submit = $('authSubmit');
    const toggle = $('authToggle');
    const email = $('authEmail');
    const password = $('authPassword');

    if (submit) {
      submit.disabled = busy;
      submit.textContent = busy
        ? 'PLEASE WAIT...'
        : (mode === 'signup' ? 'CREATE ACCOUNT' : 'SIGN IN');
    }

    if (toggle) toggle.disabled = busy;
    if (email) email.disabled = busy;
    if (password) password.disabled = busy;
  }

  function supabaseClient() {
    if (
      window.DF &&
      window.DF.Supabase &&
      window.DF.Supabase.auth
    ) {
      return window.DF.Supabase;
    }

    return null;
  }

  async function handleSubmit() {
    const emailInput = $('authEmail');
    const passwordInput = $('authPassword');

    if (!emailInput || !passwordInput) {
      setMessage('Authentication form is missing.', 'error');
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email) {
      setMessage('Please enter your email address.', 'error');
      emailInput.focus();
      return;
    }

    if (!password) {
      setMessage('Please enter a password.', 'error');
      passwordInput.focus();
      return;
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.', 'error');
      passwordInput.focus();
      return;
    }

    const supabase = supabaseClient();

    if (!supabase) {
      setMessage(
        'Supabase is not loaded. Refresh the page. If this keeps happening, check the Supabase setup below.',
        'error'
      );
      console.error(
        'DuelForge: Supabase client is unavailable.',
        window.DF && window.DF.SupabaseError
          ? window.DF.SupabaseError
          : ''
      );
      return;
    }

    setBusy(true);
    setMessage('');

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            emailRedirectTo:
              window.location.origin + window.location.pathname
          }
        });

        if (error) throw error;

        if (data && data.session) {
          setMessage(
            'Account created. Entering the arena...',
            'success'
          );

          if (typeof window.DuelForgeAuthReady === 'function') {
            window.DuelForgeAuthReady();
          }
        } else {
          setMessage(
            'Account created. Check your email to confirm your account, then sign in.',
            'success'
          );
        }
      } else {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email: email,
            password: password
          });

        if (error) throw error;

        if (
          data &&
          data.session &&
          typeof window.DuelForgeAuthReady === 'function'
        ) {
          setMessage('Signed in. Entering the arena...', 'success');
          window.DuelForgeAuthReady();
        }
      }
    } catch (error) {
      console.error('DuelForge authentication error:', error);

      setMessage(
        error && error.message
          ? error.message
          : 'Authentication failed. Please try again.',
        'error'
      );
    } finally {
      setBusy(false);
    }
  }

  function initAuth() {
    if (initialized) return;
    initialized = true;

    const screen = $('authScreen');
    const submit = $('authSubmit');
    const toggle = $('authToggle');
    const password = $('authPassword');

    if (!screen || !submit || !toggle) {
      console.error(
        'DuelForge: Authentication elements are missing from index.html.'
      );
      return;
    }

    /*
      IMPORTANT:
      The mode switch is intentionally initialized WITHOUT requiring
      Supabase. This means the CREATE ACCOUNT button still works even
      if the Supabase network/client has failed to load.
    */
    setMode('signin');

    submit.addEventListener('click', function (event) {
      event.preventDefault();
      handleSubmit();
    });

    toggle.addEventListener('click', function (event) {
      event.preventDefault();
      setMode(mode === 'signin' ? 'signup' : 'signin');
    });

    if (password) {
      password.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          handleSubmit();
        }
      });
    }

    console.log('DuelForge: Authentication initialized.');
  }

  window.DFAuth = {
    setMode: setMode,
    submit: handleSubmit
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
  } else {
    initAuth();
  }
})();
