const SUPABASE_URL = "https://kgvntfhbzuwhspkowbwr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_BjyBIUBxs20wE_EBtgZVYA_Rvv6Pb6r";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const app = document.getElementById("app");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function authScreen(message = "") {
  app.innerHTML = `
    <main class="auth-page">
      <section class="auth-card">
        <div class="logo">SAT Journey</div>
        <h1>Your SAT journey starts here.</h1>
        <p class="muted">Create an account to save your SAT progress.</p>
        <div class="auth-tabs">
          <button class="tab active" id="loginTab">Log in</button>
          <button class="tab" id="signupTab">Create account</button>
        </div>
        <form id="authForm">
          <label>Email</label>
          <input id="email" type="email" required placeholder="you@example.com">
          <label>Password</label>
          <input id="password" type="password" required minlength="6" placeholder="At least 6 characters">
          <div id="profileFields" class="hidden">
            <label>Name</label>
            <input id="name" type="text" placeholder="Your name">
            <label>Starting SAT score</label>
            <input id="startingScore" type="number" min="400" max="1600" step="10" placeholder="980">
            <label>Target SAT score</label>
            <input id="targetScore" type="number" min="400" max="1600" step="10" placeholder="1200">
          </div>
          <button class="primary-button" type="submit" id="authSubmit">Log in</button>
          <p id="authMessage" class="message">${escapeHtml(message)}</p>
        </form>
      </section>
    </main>`;

  let mode = "login";
  const loginTab = document.getElementById("loginTab");
  const signupTab = document.getElementById("signupTab");
  const fields = document.getElementById("profileFields");
  const submit = document.getElementById("authSubmit");
  const msg = document.getElementById("authMessage");

  function setMode(next) {
    mode = next;
    loginTab.classList.toggle("active", mode === "login");
    signupTab.classList.toggle("active", mode === "signup");
    fields.classList.toggle("hidden", mode !== "signup");
    submit.textContent = mode === "login" ? "Log in" : "Create account";
    msg.textContent = "";
  }

  loginTab.onclick = () => setMode("login");
  signupTab.onclick = () => setMode("signup");

  document.getElementById("authForm").onsubmit = async (e) => {
    e.preventDefault();
    submit.disabled = true;
    msg.textContent = "Working...";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (mode === "login") {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) {
        msg.textContent = error.message;
        submit.disabled = false;
        return;
      }
      renderDashboard();
      return;
    }

    const name = document.getElementById("name").value.trim();
    const starting = Number(document.getElementById("startingScore").value);
    const target = Number(document.getElementById("targetScore").value);

    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) {
      msg.textContent = error.message;
      submit.disabled = false;
      return;
    }

    if (!data.user) {
      msg.textContent = "Account created. Check your email to finish signing up.";
      submit.disabled = false;
      return;
    }

    if (!data.session) {
      msg.textContent = "Account created. Check your email to confirm your account, then log in.";
      submit.disabled = false;
      return;
    }

    const { error: profileError } = await supabaseClient.from("profiles").insert({
      id: data.user.id,
      name: name || null,
      starting_score: Number.isFinite(starting) ? starting : null,
      target_score: Number.isFinite(target) ? target : null,
      reading_writing: null,
      math: null
    });

    if (profileError && profileError.code !== "23505") {
      msg.textContent = profileError.message;
      submit.disabled = false;
      return;
    }

    renderDashboard();
  };
}

async function renderDashboard() {
  const { data: userData } = await supabaseClient.auth.getUser();
  const user = userData.user;

  if (!user) {
    authScreen();
    return;
  }

  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    app.innerHTML = `<main class="auth-page"><section class="auth-card">
      <h1>Database connection error</h1>
      <p class="muted">${escapeHtml(error.message)}</p>
      <button class="primary-button" onclick="renderDashboard()">Try again</button>
    </section></main>`;
    return;
  }

  if (!profile) {
    const { error: createError } = await supabaseClient.from("profiles").insert({
      id: user.id,
      name: user.email?.split("@")[0] || "Student"
    });
    if (createError) {
      app.innerHTML = `<main class="auth-page"><section class="auth-card">
        <h1>Profile setup error</h1>
        <p class="muted">${escapeHtml(createError.message)}</p>
      </section></main>`;
      return;
    }
    renderDashboard();
    return;
  }

  app.innerHTML = `
    <div class="site-shell">
      <header class="topbar">
        <div class="logo">SAT Journey</div>
        <button class="secondary-button" id="signOut">Log out</button>
      </header>
      <main class="dashboard">
        <section class="hero">
          <p class="eyebrow">YOUR SAT JOURNEY</p>
          <h1>Welcome${profile.name ? `, ${escapeHtml(profile.name)}` : ""}.</h1>
          <p class="muted">Your account is connected and your profile is saved.</p>
        </section>
        <section class="stats-grid">
          <article class="stat-card"><span>Starting score</span><strong>${profile.starting_score ?? "—"}</strong></article>
          <article class="stat-card"><span>Target score</span><strong>${profile.target_score ?? "—"}</strong></article>
          <article class="stat-card"><span>Reading & Writing</span><strong>${profile.reading_writing ?? "—"}</strong></article>
          <article class="stat-card"><span>Math</span><strong>${profile.math ?? "—"}</strong></article>
        </section>
        <section class="content-card">
          <h2>Next step</h2>
          <p class="muted">The account system is connected. We can now bring back and expand the full SAT practice dashboard.</p>
        </section>
      </main>
    </div>`;

  document.getElementById("signOut").onclick = async () => {
    await supabaseClient.auth.signOut();
    authScreen();
  };
}

supabaseClient.auth.getSession().then(({ data }) => {
  if (data.session) renderDashboard();
  else authScreen();
});
