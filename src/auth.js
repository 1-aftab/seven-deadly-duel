/* =========================================================
   DUELFORGE AUTHENTICATION
   ========================================================= */

window.DFAuth = {

  mode: 'signin',

  setMessage: function (text, type = '') {
    const el = document.getElementById('authMessage');

    if (!el) return;

    el.textContent = text;
    el.className = 'message';

    if (type) {
      el.classList.add('auth-' + type);
    }
  },


  setMode: function (mode) {

    this.mode = mode;

    const title = document.getElementById('authTitle');
    const subtitle = document.getElementById('authSubtitle');
    const submit = document.getElementById('authSubmit');
    const toggle = document.getElementById('authToggle');
    const password = document.getElementById('authPassword');

    if (!title || !subtitle || !submit || !toggle) return;

    this.setMessage('');

    if (mode === 'signup') {

      title.textContent = 'Create account';

      subtitle.textContent =
        'Create your DuelForge account.';

      submit.textContent =
        'CREATE ACCOUNT';

      toggle.textContent =
        'I ALREADY HAVE AN ACCOUNT';

      password.autocomplete = 'new-password';

    } else {

      title.textContent = 'Welcome back';

      subtitle.textContent =
        'Sign in to enter the arena.';

      submit.textContent =
        'SIGN IN';

      toggle.textContent =
        'CREATE ACCOUNT';

      password.autocomplete = 'current-password';
    }
  },


  submit: async function () {

    const email =
      document.getElementById('authEmail').value.trim();

    const password =
      document.getElementById('authPassword').value;

    const button =
      document.getElementById('authSubmit');

    if (!email) {

      this.setMessage(
        'Please enter your email.',
        'error'
      );

      return;
    }

    if (!password || password.length < 6) {

      this.setMessage(
        'Password must be at least 6 characters.',
        'error'
      );

      return;
    }

    button.disabled = true;

    this.setMessage(
      this.mode === 'signup'
        ? 'Creating account...'
        : 'Signing in...'
    );

    try {

      let result;

      if (this.mode === 'signup') {

        result =
          await DF.Supabase.auth.signUp({
            email: email,
            password: password
          });

      } else {

        result =
          await DF.Supabase.auth.signInWithPassword({
            email: email,
            password: password
          });
      }


      if (result.error) {
        throw result.error;
      }


      if (this.mode === 'signup') {

        if (result.data.session) {

          this.setMessage(
            'Account created!',
            'success'
          );

          if (window.DuelForgeAuthReady) {
            window.DuelForgeAuthReady();
          }

        } else {

          this.setMessage(
            'Account created. Check your email to confirm your account.',
            'success'
          );

        }

      } else {

        this.setMessage(
          'Signed in!',
          'success'
        );

        if (window.DuelForgeAuthReady) {
          window.DuelForgeAuthReady();
        }

      }

    } catch (error) {

      console.error('DuelForge auth error:', error);

      this.setMessage(
        error.message || 'Authentication failed.',
        'error'
      );

    } finally {

      button.disabled = false;

    }
  },


  getUser: async function () {

    const {
      data,
      error
    } = await DF.Supabase.auth.getUser();

    if (error) {
      console.error(error);
      return null;
    }

    return data.user;
  },


  getSession: async function () {

    const {
      data,
      error
    } = await DF.Supabase.auth.getSession();

    if (error) {
      console.error(error);
      return null;
    }

    return data.session;
  },


  logout: async function () {

    const {
      error
    } = await DF.Supabase.auth.signOut();

    if (error) {
      console.error(error);
      return;
    }

    location.reload();
  },


  init: function () {

    const submit =
      document.getElementById('authSubmit');

    const toggle =
      document.getElementById('authToggle');

    if (submit) {

      submit.addEventListener(
        'click',
        () => this.submit()
      );

    }


    if (toggle) {

      toggle.addEventListener(
        'click',
        () => {

          this.setMode(
            this.mode === 'signin'
              ? 'signup'
              : 'signin'
          );

        }
      );

    }


    const email =
      document.getElementById('authEmail');

    const password =
      document.getElementById('authPassword');

    if (email) {

      email.addEventListener(
        'keydown',
        e => {

          if (e.key === 'Enter') {
            this.submit();
          }

        }
      );

    }


    if (password) {

      password.addEventListener(
        'keydown',
        e => {

          if (e.key === 'Enter') {
            this.submit();
          }

        }
      );

    }

    this.setMode('signin');

  }

};


/* Wait until the page has loaded before
   connecting the auth buttons. */

window.addEventListener(
  'DOMContentLoaded',
  () => {

    if (
      window.DF &&
      DF.Supabase
    ) {

      DFAuth.init();

    } else {

      console.error(
        'DuelForge: Supabase is not available.'
      );

    }

  }
);
