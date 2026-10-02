(function () {
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
    mode = nextMode;

    const signup = mode === 'signup';

    const title = $('authTitle');
    const subtitle = $('authSubtitle');
    const submit = $('authSubmit');
    const toggle = $('authToggle');
    const password = $('authPassword');

    if (title) {
      title.textContent = signup
        ? 'Create your account'
        : 'Welcome back';
    }

    if (subtitle) {
      subtitle.textContent = signup
        ? 'Create an account to enter the arena.'
        : 'Sign in to enter the arena.';
    }

    if (submit) {
      submit.textContent = signup
        ? 'CREATE ACCOUNT'
        : 'SIGN IN';
    }

    if (toggle) {
      toggle.textContent = signup
        ? 'I ALREADY HAVE AN ACCOUNT'
        : 'CREATE ACCOUNT';
    }

    if (password) {
      password.autocomplete = signup
        ? 'new-password'
        : 'current-password';
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

  async function handleSubmit() {
    const emailInput = $('authEmail');
    const passwordInput = $('authPassword');

    if (!emailInput || !passwordInput) {
      console.error('DuelForge: Auth inputs were not found.');
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
      setMessage('Please enter your password.', 'error');
      passwordInput.focus();
      return;
    }

    if (password.length < 6) {
      setMessage(
        'Password must be at least 6 characters.',
        'error'
      );
      passwordInput.focus();
      return;
    }

    if (!window.DF || !DF.Supabase) {
      setMessage(
        'Supabase failed to load. Refresh the page and try again.',
        'error'
      );

      console.error(
        'DuelForge: DF.Supabase is missing.'
      );

      return;
    }

    setBusy(true);
    setMessage('');

    try {
      if (mode === 'signup') {

        const result =
          await DF.Supabase.auth.signUp({
            email: email,
            password: password,
            options: {
              emailRedirectTo:
                window.location.origin +
                window.location.pathname
            }
          });

        const data = result.data;
        const error = result.error;

        if (error) {
          throw error;
        }

        if (data && data.session) {

          setMessage(
            'Account created. Entering the arena...',
            'success'
          );

          if (
            typeof window.DuelForgeAuthReady ===
            'function'
          ) {
            window.DuelForgeAuthReady();
          }

        } else {

          setMessage(
            'Account created! Check your email to confirm your account, then sign in.',
            'success'
          );

        }

      } else {

        const result =
          await DF.Supabase.auth.signInWithPassword({
            email: email,
            password: password
          });

        const data = result.data;
        const error = result.error;

        if (error) {
          throw error;
        }

        if (
          data &&
          data.session &&
          typeof window.DuelForgeAuthReady ===
            'function'
        ) {
          setMessage(
            'Signed in. Entering the arena...',
            'success'
          );

          window.DuelForgeAuthReady();
        }

      }

    } catch (error) {

      console.error(
        'DuelForge authentication error:',
        error
      );

      let message =
        error && error.message
          ? error.message
          : String(error);

      setMessage(message, 'error');

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

    if (!window.DF || !DF.Supabase) {

      setMessage(
        'Supabase did not load. Check your internet connection and refresh the page.',
        'error'
      );

      console.error(
        'DuelForge: Supabase is not available.'
      );

      return;
    }

    setMode('signin');

    submit.addEventListener(
      'click',
      handleSubmit
    );

    toggle.addEventListener(
      'click',
      function () {

        setMode(
          mode === 'signin'
            ? 'signup'
            : 'signin'
        );

      }
    );

    if (password) {

      password.addEventListener(
        'keydown',
        function (event) {

          if (event.key === 'Enter') {
            handleSubmit();
          }

        }
      );

    }

    console.log(
      'DuelForge: Authentication initialized.'
    );
  }

  window.DFAuth = {
    setMode: setMode,
    submit: handleSubmit
  };

  if (
    document.readyState === 'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      initAuth
    );

  } else {

    initAuth();

  }

})();
