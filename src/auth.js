(function () {

  const sb = DF.Supabase;

  let signupMode = false;

  const $ = id => document.getElementById(id);


  function showMessage(text, error = false) {

    const el = $('authMessage');

    if (!el) return;

    el.textContent = text;

    el.className = error
      ? 'message auth-error'
      : 'message auth-success';
  }


  function showAuth() {

    show('authScreen');

    $('authPassword').value = '';

  }


  async function showAuthenticated() {

    const {
      data: {
        session
      }
    } = await sb.auth.getSession();

    if (session) {

      /*
       * The player is already logged in.
       *
       * Your existing game will now continue
       * to the gamertag screen.
       */

      if (window.DuelForgeAuthReady) {
        window.DuelForgeAuthReady();
      }

    } else {

      showAuth();

    }
  }


  /* ---------------------------------------------------------
     SIGN IN / SIGN UP BUTTON
     --------------------------------------------------------- */

  $('authSubmit').addEventListener('click', async function () {

    const email =
      $('authEmail').value.trim();

    const password =
      $('authPassword').value;


    if (!email) {

      showMessage(
        'Enter your email address.',
        true
      );

      return;

    }


    if (!password) {

      showMessage(
        'Enter your password.',
        true
      );

      return;

    }


    if (password.length < 6) {

      showMessage(
        'Password must be at least 6 characters.',
        true
      );

      return;

    }


    const button = $('authSubmit');

    button.disabled = true;


    try {

      /* =====================================================
         SIGN UP
         ===================================================== */

      if (signupMode) {

        const {
          data,
          error
        } = await sb.auth.signUp({

          email: email,

          password: password,

          options: {

            emailRedirectTo:
              window.location.origin +
              window.location.pathname

          }

        });


        if (error) {
          throw error;
        }


        /*
         * If email confirmation is enabled,
         * Supabase normally returns no session here.
         */

        if (!data.session) {

          showMessage(
            'Account created! Check your email and confirm your account.'
          );

        } else {

          showMessage(
            'Account created successfully!'
          );

          setTimeout(() => {

            if (window.DuelForgeAuthReady) {
              window.DuelForgeAuthReady();
            }

          }, 500);

        }


      }

      /* =====================================================
         LOGIN
         ===================================================== */

      else {

        const {
          data,
          error
        } = await sb.auth.signInWithPassword({

          email: email,

          password: password

        });


        if (error) {
          throw error;
        }


        if (!data.session) {

          throw new Error(
            'Login succeeded, but no session was returned.'
          );

        }


        showMessage(
          'Signed in successfully!'
        );


        setTimeout(() => {

          if (window.DuelForgeAuthReady) {
            window.DuelForgeAuthReady();
          }

        }, 300);

      }


    } catch (error) {

      console.error(
        'Supabase authentication error:',
        error
      );

      showMessage(
        error.message || 'Authentication failed.',
        true
      );

    } finally {

      button.disabled = false;

    }

  });


  /* ---------------------------------------------------------
     LOGIN <-> SIGN UP
     --------------------------------------------------------- */

  $('authToggle').addEventListener('click', function () {

    signupMode = !signupMode;


    if (signupMode) {

      $('authTitle').textContent =
        'Create your account';

      $('authSubtitle').textContent =
        'Create an account to enter the arena.';

      $('authSubmit').textContent =
        'CREATE ACCOUNT';

      $('authToggle').textContent =
        'I ALREADY HAVE AN ACCOUNT';

      $('authPassword').autocomplete =
        'new-password';

    } else {

      $('authTitle').textContent =
        'Welcome back';

      $('authSubtitle').textContent =
        'Sign in to enter the arena.';

      $('authSubmit').textContent =
        'SIGN IN';

      $('authToggle').textContent =
        'CREATE ACCOUNT';

      $('authPassword').autocomplete =
        'current-password';

    }


    showMessage('');

  });


  /* ---------------------------------------------------------
     AUTH STATE CHANGES
     --------------------------------------------------------- */

  sb.auth.onAuthStateChange(
    function (event, session) {

      console.log(
        'Supabase auth event:',
        event
      );


      if (event === 'SIGNED_OUT') {

        showAuth();

      }

    }
  );


  /* ---------------------------------------------------------
     PUBLIC AUTH API
     --------------------------------------------------------- */

  window.DFAuth = {

    getUser: async function () {

      const {
        data,
        error
      } = await sb.auth.getUser();


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
      } = await sb.auth.getSession();


      if (error) {

        console.error(error);

        return null;

      }


      return data.session;

    },


    logout: async function () {

      const {
        error
      } = await sb.auth.signOut();


      if (error) {

        console.error(
          'Logout error:',
          error
        );

        throw error;

      }

    }

  };


  /*
   * This is called by game.js when the splash screen
   * has finished and authentication is ready.
   */

  window.DuelForgeAuthReady = function () {

    if (window.DuelForgeAuthenticated) {

      return;

    }


    window.DuelForgeAuthenticated = true;


    /*
     * Continue into the game's existing
     * gamertag flow.
     */

    if (state.player.name) {

      show('home');

    } else {

      openName(false);

    }

  };


  /*
   * Initial authentication check.
   */

  showAuthenticated();


})();
