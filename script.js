
window.onerror = function(message, source, line, column) {
  document.getElementById("app").innerHTML =
    `<div style="padding:24px;font-family:Arial;color:#b91c1c">
      <h2>SAT Journey error</h2>
      <p>${message}</p>
      <p>Line: ${line}</p>
    </div>`;
  return false;
};

const KEY = "satJourneyUserV1";

const SUPABASE_URL = "https://kgvntfhbzuwhspkowbwr.supabase.co";
const SUPABASE_KEY = "sb_publishable_BjyBIUBxs20wE_EBtgZVYA_Rvv6Pb6r";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const questions = [
  {
    subject: "Reading & Writing",
    topic: "Transitions",
    question: "The research team expected the experiment to produce a clear result. ______, the data were more mixed than expected.",
    options: ["For example", "However", "Similarly", "Therefore"],
    answer: 1,
    explanation: "“However” signals a contrast between the expected clear result and the mixed data."
  },
  {
    subject: "Math",
    topic: "Linear equations",
    question: "If 3x + 7 = 25, what is the value of x?",
    options: ["4", "6", "8", "10"],
    answer: 1,
    explanation: "Subtract 7 from both sides to get 3x = 18, then divide by 3. x = 6."
  },
  {
    subject: "Reading & Writing",
    topic: "Grammar",
    question: "Which choice completes the sentence according to Standard English conventions? The collection of maps ______ displayed in the library.",
    options: ["are", "were", "is", "have been"],
    answer: 2,
    explanation: "The subject is singular: “collection.” Therefore, the singular verb “is” is correct."
  },
  {
    subject: "Math",
    topic: "Percent",
    question: "A jacket originally costs $80 and is discounted by 25%. What is the sale price?",
    options: ["$20", "$55", "$60", "$65"],
    answer: 2,
    explanation: "25% of $80 is $20. Subtracting $20 from $80 gives a sale price of $60."
  },
  {
    subject: "Math",
    topic: "Quadratics",
    question: "If x² = 49 and x is positive, what is x?",
    options: ["-49", "-7", "7", "49"],
    answer: 2,
    explanation: "The positive square root of 49 is 7."
  }
];

function defaultUser() {
  return {
    name: "",
    startScore: 980,
    currentScore: 980,
    targetScore: 1400,
    rw: 490,
    math: 490,
    testDate: "",
    weeklyHours: 5,
    answered: 0,
    correct: 0,
    completedPlan: 0,
    streak: 0,
    history: [{label: "Start", score: 980}],
    plan: [
      {title:"Complete a diagnostic practice set", desc:"Answer a mixed set so SAT Journey can identify your strongest and weakest areas.", done:false},
      {title:"Review your weakest Math topic", desc:"Focus on one topic instead of trying to study everything at once.", done:false},
      {title:"Practice Reading & Writing", desc:"Complete 10 questions and review every missed question.", done:false},
      {title:"Do a timed mixed set", desc:"Practice switching between question types under time pressure.", done:false},
      {title:"Review mistakes", desc:"Write down why each missed question was wrong and what clue you missed.", done:false}
    ]
  };
}

function loadUser() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? {...defaultUser(), ...JSON.parse(raw)} : null;
  } catch { return null; }
}
function saveUser() {
  localStorage.setItem(KEY, JSON.stringify(user));

  if (!currentAuthUser || !user) return;

  supabaseClient
    .from("student_journeys")
    .upsert(
      {
        user_id: currentAuthUser.id,
        data: user,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    )
    .then(({ error }) => {
      if (error) {
        console.error("Cloud save failed:", error.message);
      } else {
        console.log("SAT Journey saved to the cloud.");
      }
    });
}
let user = loadUser();
let currentPage = "dashboard";
let qIndex = 0;
let answeredCurrent = false;

let currentAuthUser = null;

function authScreen(message = "") {
  document.getElementById("app").innerHTML = `
    <div style="max-width:420px;margin:60px auto;padding:24px;
                font-family:Arial,sans-serif;">
      <h1>SAT Journey</h1>
      <h2>Welcome back!</h2>
      <p>Sign in to save your SAT progress to your account.</p>

      <form id="loginForm">
        <label for="authEmail">Email</label>
        <input id="authEmail" type="email" required
          autocomplete="email"
          style="display:block;width:100%;box-sizing:border-box;
                 padding:12px;margin:8px 0 16px;">

        <label for="authPassword">Password</label>
        <input id="authPassword" type="password" required
          minlength="6" autocomplete="current-password"
          style="display:block;width:100%;box-sizing:border-box;
                 padding:12px;margin:8px 0 16px;">

        <button type="submit" style="padding:12px;width:100%;">
          Sign in
        </button>
      </form>

      <button id="signupButton"
        style="padding:12px;width:100%;margin-top:12px;">
        Create account
      </button>

      <p id="authMessage" style="margin-top:16px;color:#444;">
        ${message}
      </p>
    </div>
  `;

  document.getElementById("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    const status = document.getElementById("authMessage");

    status.textContent = "Signing in…";

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      status.textContent = error.message;
      return;
    }

    currentAuthUser = data.user;
status.textContent = "Loading your saved SAT Journey…";

const { data: journey, error: loadError } = await supabaseClient
  .from("student_journeys")
  .select("data")
  .eq("user_id", currentAuthUser.id)
  .maybeSingle();

if (loadError) {
  status.textContent = "Couldn't load your saved journey. Please try again.";
  console.error(loadError.message);
  return;
}

if (journey && journey.data) {
  user = journey.data;
  localStorage.setItem(KEY, JSON.stringify(user));
  renderApp();
} else {
  user = null;
  setupScreen();
} });

  document.getElementById("signupButton").addEventListener("click", async () => {
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    const status = document.getElementById("authMessage");

    if (!email || password.length < 6) {
      status.textContent = "Enter your email and a password of at least 6 characters.";
      return;
    }

    status.textContent = "Creating your account…";

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname
      }
    });

    if (error) {
      status.textContent = error.message;
      return;
    }

    if (data.session) {
  currentAuthUser = data.user;
  user = null;
  setupScreen();
} else {
  status.textContent =
    "Check your email for a confirmation link. Then return here and sign in.";
}
});
}
function setupScreen() {
  document.getElementById("app").innerHTML = `
    <main class="setup">
      <section class="setup-card">
        <div class="logo"><div class="logo-mark">S</div><span>SAT Journey</span></div>
        <h1>Build your SAT Journey.</h1>
        <p>Start with your real score and goals. SAT Journey will use your information to organize practice and show your progress.</p>
        <div class="form-grid">
          <div class="field"><label>Your name</label><input id="s-name" placeholder="First name"></div>
          <div class="field"><label>Starting PSAT/SAT score</label><input id="s-start" type="number" min="400" max="1600" value="980"></div>
          <div class="field"><label>Reading & Writing score</label><input id="s-rw" type="number" min="200" max="800" value="490"></div>
          <div class="field"><label>Math score</label><input id="s-math" type="number" min="200" max="800" value="490"></div>
          <div class="field"><label>Target SAT score</label><input id="s-target" type="number" min="400" max="1600" value="1400"></div>
          <div class="field"><label>Weekly study time</label>
            <select id="s-hours"><option value="2">2 hours</option><option value="5" selected>5 hours</option><option value="8">8 hours</option><option value="10">10+ hours</option></select>
          </div>
          <div class="field"><label>SAT test date (optional)</label><input id="s-date" type="date"></div>
        </div>
        <button class="primary full" onclick="createJourney()">Start my SAT Journey</button>
<div class="small-note">Your SAT Journey is saved to your account. This demo does not connect to College Board.</div>      </section>
    </main>`;
}

function createJourney() {
  const start = Number(document.getElementById("s-start").value) || 980;
  const rw = Number(document.getElementById("s-rw").value) || Math.round(start/2);
  const math = Number(document.getElementById("s-math").value) || start-rw;
  user = {
    ...defaultUser(),
    name: document.getElementById("s-name").value.trim() || "Student",
    startScore: start, currentScore: start,
    rw, math,
    targetScore: Number(document.getElementById("s-target").value) || 1400,
    testDate: document.getElementById("s-date").value,
    weeklyHours: Number(document.getElementById("s-hours").value) || 5,
    history: [{label:"Start", score:start}]
  };
  saveUser();
  renderApp();
}

function progressPct() {
  const range = Math.max(1, user.targetScore - user.startScore);
  return Math.max(0, Math.min(100, ((user.currentScore-user.startScore)/range)*100));
}
function accuracy() {
  return user.answered ? Math.round((user.correct/user.answered)*100) : 0;
}
function daysUntil() {
  if (!user.testDate) return null;
  const d = new Date(user.testDate + "T00:00:00");
  return Math.ceil((d - new Date()) / 86400000);
}


function renderApp() {
  document.getElementById("app").innerHTML = `
  <div class="shell">
    <aside class="sidebar">
      <div class="logo"><div class="logo-mark">S</div><span>SAT Journey</span></div>
      <nav class="nav">
        <button class="${currentPage==="dashboard"?"active":""}" onclick="go('dashboard')">▦ <span>Dashboard</span></button>
        <button class="${currentPage==="practice"?"active":""}" onclick="go('practice')">✓ <span>Practice</span></button>
        <button class="${currentPage==="plan"?"active":""}" onclick="go('plan')">☷ <span>Study Plan</span></button>
        <button class="${currentPage==="progress"?"active":""}" onclick="go('progress')">↗ <span>Progress</span></button>
        <button class="${currentPage==="settings"?"active":""}" onclick="go('settings')">⚙ <span>Settings</span></button>
      </nav>
      <div class="sidebar-bottom">
        <button class="nav" style="border:0;background:transparent;color:#64748b" onclick="resetJourney()">Reset journey</button>
        <button class="nav" style="border:0;background:transparent;color:#64748b" onclick="signOut()">Sign out</button>
      </div>
    </aside>
    <main class="main">
      <div class="topbar"><h2>${pageTitle()}</h2><div class="user-pill">${escapeHtml(user.name)}</div></div>
      <section id="dashboard" class="page ${currentPage==="dashboard"?"active":""}">${dashboardHTML()}</section>
      <section id="practice" class="page ${currentPage==="practice"?"active":""}">${practiceHTML()}</section>
      <section id="plan" class="page ${currentPage==="plan"?"active":""}">${planHTML()}</section>
      <section id="progress" class="page ${currentPage==="progress"?"active":""}">${progressHTML()}</section>
      <section id="settings" class="page ${currentPage==="settings"?"active":""}">${settingsHTML()}</section>
    </main>
  </div>`;
}

function pageTitle() {

  return {dashboard:"Dashboard",practice:"Practice",plan:"Study Plan",progress:"Progress",settings:"Settings"}[currentPage];
}
function dashboardHTML() {
  const pct = Math.round(progressPct());
  const days = daysUntil();
  return `
    <div class="hero">
      <div class="eyebrow">${user.streak ? user.streak+"-day study streak" : "Your SAT starting point"}</div>
      <h1>Welcome, ${escapeHtml(user.name)}.</h1>
      <p>You are starting at <strong>${user.startScore}</strong>. Your target is <strong>${user.targetScore}</strong>. Keep building from here.</p>
    </div>
    <div class="cards">
      <div class="card"><h3>Current score</h3><div class="big">${user.currentScore}</div><div class="muted">Starting score: ${user.startScore}</div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><div class="muted">${pct}% of the way from start to target</div></div>
      <div class="card"><h3>Target score</h3><div class="big">${user.targetScore}</div><div class="muted">${Math.max(0,user.targetScore-user.currentScore)} points to go</div><div style="margin-top:14px"><button class="primary" onclick="go('settings')">Edit goal</button></div></div>
      <div class="card"><h3>This Journey</h3><div class="big">${user.answered}</div><div class="muted">Questions answered</div><div style="margin-top:12px"><span class="green"><strong>${accuracy()}%</strong> accuracy</span></div></div>
    </div>
    <div class="section-grid">
      <div class="card">
        <h3>Section scores</h3>
        <div class="score-bars">
          <div class="score-row"><div class="score-row-top"><span>Reading & Writing</span><span>${user.rw}/800</span></div><div class="progress-track"><div class="progress-fill" style="width:${user.rw/8}%"></div></div></div>
          <div class="score-row"><div class="score-row-top"><span>Math</span><span>${user.math}/800</span></div><div class="progress-track"><div class="progress-fill" style="width:${user.math/8}%"></div></div></div>
        </div>
      </div>
      <div class="card">
        <h3>Next best step</h3>
        <div class="big" style="font-size:20px">${nextTask().title}</div>
        <p class="muted">${nextTask().desc}</p>
        <button class="primary" onclick="go('plan')">Open study plan</button>
        ${days !== null ? `<p class="muted" style="margin-top:12px">${days >= 0 ? days+" days until your test date" : "Your test date has passed"}</p>` : ""}
      </div>
    </div>
    <div class="card" style="margin-top:18px"><h3>Score progress</h3>${chartHTML()}</div>`;
}

function chartHTML() {
  const h = user.history.length ? user.history : [{label:"Start",score:user.startScore}];
  const max = 1600;
  return `<div class="chart">${h.map(x=>`<div class="bar-wrap"><div class="bar-score">${x.score}</div><div class="bar" style="height:${Math.max(4,(x.score/max)*175)}px"></div><div class="bar-label">${escapeHtml(x.label)}</div></div>`).join("")}</div>`;
}

function practiceHTML() {
  const q = questions[qIndex % questions.length];
  return `
    <div class="card">
      <div class="practice-head"><div><span class="tag">${q.subject}</span> <span class="tag">${q.topic}</span></div><span class="muted">Question ${(qIndex%questions.length)+1} of ${questions.length}</span></div>
      <div class="question">${q.question}</div>
      <div class="options">${q.options.map((o,i)=>`<button class="option" id="opt-${i}" onclick="answer(${i})">${String.fromCharCode(65+i)}. ${escapeHtml(o)}</button>`).join("")}</div>
      <div id="feedback"></div>
      <div style="margin-top:18px"><button id="next-btn" class="primary hidden" onclick="nextQuestion()">Next question</button></div>
      <p class="small-note">These are original SAT-style practice questions for this prototype, not official College Board questions.</p>
    </div>`;
}

function answer(choice) {
  if (answeredCurrent) return;
  answeredCurrent = true;
  const q = questions[qIndex % questions.length];
  user.answered++;
  if (choice === q.answer) user.correct++;
  document.querySelectorAll(".option").forEach((b,i)=>{
    if (i===q.answer) b.classList.add("correct");
    if (i===choice && choice!==q.answer) b.classList.add("incorrect");
  });
  document.getElementById("feedback").innerHTML = `<div class="explanation"><strong>${choice===q.answer?"Correct!":"Not quite."}</strong> ${q.explanation}</div>`;
  document.getElementById("next-btn").classList.remove("hidden");
  saveUser();
}
function nextQuestion() {
  qIndex++;
  answeredCurrent = false;
  renderApp();
}
function nextTask() { return user.plan.find(x=>!x.done) || {title:"Keep practicing",desc:"You completed your current plan. Add more practice to keep improving."}; }

function planHTML() {
  return `<p class="page-subtitle">A simple starting plan based on the information you entered. Your plan can become more personalized as your practice history grows.</p>
  <div class="plan-list">${user.plan.map((x,i)=>`<label class="plan-item"><input type="checkbox" ${x.done?"checked":""} onchange="togglePlan(${i},this.checked)"><div><strong>${escapeHtml(x.title)}</strong><span>${escapeHtml(x.desc)}</span></div></label>`).join("")}</div>`;
}
function togglePlan(i, checked) {
  user.plan[i].done = checked;
  user.completedPlan = user.plan.filter(x=>x.done).length;
  saveUser(); renderApp();
}
function progressHTML() {
  return `
    <div class="stat-grid">
      <div class="stat"><span class="muted">Current score</span><strong>${user.currentScore}</strong></div>
      <div class="stat"><span class="muted">Questions</span><strong>${user.answered}</strong></div>
      <div class="stat"><span class="muted">Accuracy</span><strong>${accuracy()}%</strong></div>
      <div class="stat"><span class="muted">Plan complete</span><strong>${Math.round(user.completedPlan/user.plan.length*100)}%</strong></div>
    </div>
    <div class="section-grid">
      <div class="card"><h3>Score history</h3>${chartHTML()}</div>
      <div class="card"><h3>Journey summary</h3><p class="muted">Starting score</p><div class="big">${user.startScore}</div><p class="muted">Target score</p><div class="big">${user.targetScore}</div><p class="muted">Current improvement</p><div class="big ${user.currentScore>=user.startScore?"green":""}">${user.currentScore-user.startScore >= 0 ? "+" : ""}${user.currentScore-user.startScore}</div></div>
    </div>`;
}
function settingsHTML() {
  return `<div class="settings">
    <div class="card">
      <h3>Student information</h3>
      <div class="field" style="margin-top:16px"><label>Name</label><input id="e-name" value="${escapeAttr(user.name)}"></div>
      <div class="field" style="margin-top:14px"><label>Target score</label><input id="e-target" type="number" min="400" max="1600" value="${user.targetScore}"></div>
      <div class="field" style="margin-top:14px"><label>Test date</label><input id="e-date" type="date" value="${escapeAttr(user.testDate)}"></div>
      <button class="primary" style="margin-top:18px" onclick="saveSettings()">Save changes</button>
    </div>
    <div class="card">
      <h3>Future connection</h3>
      <p class="muted" style="line-height:1.6">College Board integration is not enabled in this prototype. SAT Journey should only add an automatic score connection if an official student authorization method is available. Never enter a College Board password into SAT Journey.</p>
      <div class="tag">No College Board password collected</div>
    </div>
  </div>`;
}
function saveSettings() {
  user.name = document.getElementById("e-name").value.trim() || "Student";
  user.targetScore = Number(document.getElementById("e-target").value) || user.targetScore;
  user.testDate = document.getElementById("e-date").value;
  saveUser(); renderApp();
}
function go(page) { currentPage=page; answeredCurrent=false; renderApp(); }
async function signOut() {
  await supabaseClient.auth.signOut();
  currentAuthUser = null;
  user = null;
  localStorage.removeItem(KEY);
  authScreen("You've signed out.");
}
function resetJourney() {
  if (confirm("Reset this SAT Journey on this browser?")) { localStorage.removeItem(KEY); user=null; setupScreen(); }
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
function escapeAttr(s) { return escapeHtml(s).replace(/`/g,'&#096;'); }

async function startApp() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    authScreen("Could not check your login. Please refresh and try again.");
    return;
  }

  if (!data.session) {
    currentAuthUser = null;
    user = null;
    authScreen();
    return;
  }

  currentAuthUser = data.session.user;

  const { data: journey, error: loadError } = await supabaseClient
    .from("student_journeys")
    .select("data")
    .eq("user_id", currentAuthUser.id)
    .maybeSingle();

  if (loadError) {
    authScreen("Couldn't load your saved journey. Please refresh and try again.");
    console.error(loadError.message);
    return;
  }

  if (journey && journey.data) {
    user = { ...defaultUser(), ...journey.data };
    localStorage.setItem(KEY, JSON.stringify(user));
    renderApp();
  } else {
    user = null;
    setupScreen();
  }
}

startApp();
