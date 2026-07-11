/* =============================================================================
   Fitness Buddy — Main JavaScript
   Chat · BMI · Calories · Habits · Charts · Profile · Dark Mode
============================================================================= */

"use strict";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const STATE = {
  chatHistory: [],
  userProfile: null,
  habits: [],
  selectedMood: "great",
  waterGlasses: 0,
  theme: "dark",
};

// Chart instances
let progressChartInst = null;
let habitChartInst    = null;
let bmiGaugeInst      = null;
let habitWeekInst     = null;

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initWaterTracker();
  loadProfile();
  loadHabits();
  fetchDailyTip();
  setWelcomeTime();
  setTodayDate();
  initCharts();
  setInterval(updateStatusDot, 30000);
});

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
function showSection(name) {
  // Hide hero if it exists
  const hero = document.getElementById("heroBanner");
  const main = document.getElementById("mainContent");
  if (hero && hero.style.display !== "none") {
    hero.style.display = "none";
    main.style.display = "block";
  }

  // Update active nav link
  document.querySelectorAll(".nav-link").forEach(el => {
    el.classList.toggle("active", el.getAttribute("onclick") === `showSection('${name}')`);
  });

  // Toggle sections
  document.querySelectorAll(".section").forEach(sec => {
    sec.classList.toggle("active-section", sec.id === `section-${name}`);
  });

  // Lazy-load data for certain sections
  if (name === "dashboard") {
    updateDashboard();
  } else if (name === "habits") {
    renderHabitHistory();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------------------------------------------------------------------------
// Theme Toggle
// ---------------------------------------------------------------------------
function initTheme() {
  const saved = localStorage.getItem("fb_theme") || "dark";
  applyTheme(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-bs-theme") || "dark";
  applyTheme(current === "dark" ? "light" : "dark");
}

function applyTheme(theme) {
  STATE.theme = theme;
  document.documentElement.setAttribute("data-bs-theme", theme);
  localStorage.setItem("fb_theme", theme);
  const btn = document.getElementById("themeToggle");
  if (btn) {
    btn.innerHTML = theme === "dark"
      ? '<i class="bi bi-sun-fill"></i>'
      : '<i class="bi bi-moon-stars-fill"></i>';
  }
  // Redraw charts after theme switch
  if (progressChartInst) { refreshCharts(); }
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------
function setWelcomeTime() {
  const el = document.getElementById("welcomeTime");
  if (el) el.textContent = formatTime(new Date());
}

async function sendMessage() {
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  autoResizeTextarea(input);

  appendMessage("user", text);
  STATE.chatHistory.push({ role: "user", content: text });

  // Hide quick prompts after first message
  const qp = document.getElementById("quickPrompts");
  if (qp) qp.style.display = "none";

  const thinkingId = appendThinking();
  const sendBtn    = document.getElementById("sendBtn");
  if (sendBtn) sendBtn.disabled = true;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        profile: STATE.userProfile,
        history: STATE.chatHistory.slice(-12),
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    removeThinking(thinkingId);
    const reply = data.response || "Sorry, I couldn't process that request.";
    appendMessage("bot", reply);
    STATE.chatHistory.push({ role: "assistant", content: reply });
  } catch (err) {
    removeThinking(thinkingId);
    appendMessage("bot", "⚠️ Connection error. Please check your server and try again.");
    console.error("Chat error:", err);
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    input.focus();
  }
}

function sendQuickPrompt(text) {
  document.getElementById("chatInput").value = text;
  sendMessage();
}

function handleChatKey(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
  autoResizeTextarea(e.target);
}

function autoResizeTextarea(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 120) + "px";
}

function appendMessage(role, text) {
  const container = document.getElementById("chatMessages");
  const div       = document.createElement("div");
  div.className   = `chat-msg ${role}`;

  const avatar = `<div class="msg-avatar">${role === "bot" ? '<i class="bi bi-fire"></i>' : "U"}</div>`;
  const renderedText = (typeof marked !== "undefined")
    ? marked.parse(text)
    : text.replace(/\n/g, "<br>");

  div.innerHTML = `
    ${avatar}
    <div class="msg-bubble">
      ${role === "bot" ? "<strong>FitBot</strong>" : ""}
      <div class="msg-text">${renderedText}</div>
      <div class="msg-time">${formatTime(new Date())}</div>
    </div>`;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function appendThinking() {
  const container = document.getElementById("chatMessages");
  const id        = "thinking-" + Date.now();
  const div       = document.createElement("div");
  div.id          = id;
  div.className   = "chat-msg bot";
  div.innerHTML   = `
    <div class="msg-avatar"><i class="bi bi-fire"></i></div>
    <div class="msg-bubble">
      <strong>FitBot</strong>
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeThinking(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------
async function saveProfile(e) {
  e.preventDefault();

  const profile = {
    name:             document.getElementById("profileName").value.trim(),
    age:              parseInt(document.getElementById("profileAge").value),
    gender:           document.getElementById("profileGender").value,
    height:           parseFloat(document.getElementById("profileHeight").value),
    weight:           parseFloat(document.getElementById("profileWeight").value),
    fitness_level:    document.getElementById("profileFitnessLevel").value,
    goal:             document.getElementById("profileGoal").value,
    diet:             document.getElementById("profileDiet").value,
    workout_time:     parseInt(document.getElementById("profileWorkoutTime").value),
    health_conditions:document.getElementById("profileHealth").value.trim() || "None",
  };

  try {
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    if (!res.ok) throw new Error("Save failed");
    STATE.userProfile = profile;
    localStorage.setItem("fb_profile", JSON.stringify(profile));
    showProfileDisplay(profile);
    showToast("✅ Profile saved! FitBot is now personalized for you.", "success");
  } catch (err) {
    showToast("❌ Failed to save profile. Please try again.", "danger");
  }
}

function loadProfile() {
  const saved = localStorage.getItem("fb_profile");
  if (saved) {
    try {
      STATE.userProfile = JSON.parse(saved);
      populateProfileForm(STATE.userProfile);
      showProfileDisplay(STATE.userProfile);
    } catch (_) {}
  }
}

function populateProfileForm(p) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ""; };
  set("profileName",        p.name);
  set("profileAge",         p.age);
  set("profileGender",      p.gender);
  set("profileHeight",      p.height);
  set("profileWeight",      p.weight);
  set("profileFitnessLevel",p.fitness_level);
  set("profileGoal",        p.goal);
  set("profileDiet",        p.diet);
  set("profileWorkoutTime", p.workout_time);
  set("profileHealth",      p.health_conditions !== "None" ? p.health_conditions : "");
}

function showProfileDisplay(p) {
  const grid = document.getElementById("profileGrid");
  const disp = document.getElementById("profileDisplay");
  if (!grid || !disp) return;

  const bmi = calcBMI(p.weight, p.height);

  grid.innerHTML = [
    ["Name",           p.name],
    ["Age",            `${p.age} years`],
    ["Gender",         capitalize(p.gender)],
    ["Height",         `${p.height} cm`],
    ["Weight",         `${p.weight} kg`],
    ["BMI",            `${bmi.val} (${bmi.cat})`],
    ["Fitness Level",  capitalize(p.fitness_level)],
    ["Goal",           capitalize(p.goal)],
    ["Diet",           capitalize(p.diet)],
    ["Workout Time",   `${p.workout_time} min/day`],
    ["Health Issues",  p.health_conditions],
  ].map(([label, val]) => `
    <div class="profile-item">
      <div class="profile-item-label">${label}</div>
      <div class="profile-item-val">${val}</div>
    </div>`).join("");

  const bmidisp = document.getElementById("profileBMIDisplay");
  if (bmidisp) {
    bmidisp.innerHTML = `<strong>Your BMI:</strong> ${bmi.val} — <span style="color:${bmi.color}">${bmi.cat}</span>. ${bmi.advice}`;
  }

  disp.style.display = "block";
}

function clearProfile() {
  localStorage.removeItem("fb_profile");
  STATE.userProfile = null;
  document.getElementById("profileForm").reset();
  const disp = document.getElementById("profileDisplay");
  if (disp) disp.style.display = "none";
  showToast("Profile cleared.", "info");
}

// ---------------------------------------------------------------------------
// BMI Calculator
// ---------------------------------------------------------------------------
function calculateBMI() {
  const weight = parseFloat(document.getElementById("bmiWeight").value);
  const height = parseFloat(document.getElementById("bmiHeight").value);

  if (!weight || !height || weight <= 0 || height <= 0) {
    showToast("Please enter valid weight and height values.", "warning"); return;
  }

  const bmi = calcBMI(weight, height);

  // Show result
  document.getElementById("bmiResult").style.display = "block";
  document.getElementById("bmiValue").textContent    = bmi.val;
  document.getElementById("bmiValue").style.color    = bmi.color;
  document.getElementById("bmiCategory").textContent = bmi.cat;
  document.getElementById("bmiCategory").style.color = bmi.color;
  document.getElementById("bmiAdvice").textContent   = bmi.advice;

  // Update scale marker (0–40+ mapped to 0–100%)
  const pct = Math.min(Math.max(((bmi.val - 15) / 25) * 100, 2), 98);
  document.getElementById("bmiMarker").style.left = pct + "%";

  // Draw gauge
  drawBMIGauge(bmi.val, bmi.color);

  // API call for server-side response
  fetch("/api/bmi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ weight, height }),
  }).catch(console.error);
}

function calcBMI(weight, height) {
  const val = Math.round((weight / ((height / 100) ** 2)) * 10) / 10;
  let cat, color, advice;
  if (val < 18.5) {
    cat = "Underweight"; color = "#3b82f6";
    advice = "Focus on nutrient-dense foods and strength training to gain healthy weight.";
  } else if (val < 25) {
    cat = "Normal Weight"; color = "#22c55e";
    advice = "You're in a healthy range! Maintain with balanced diet and regular exercise.";
  } else if (val < 30) {
    cat = "Overweight"; color = "#f59e0b";
    advice = "Consider increasing physical activity and reducing processed foods.";
  } else {
    cat = "Obese"; color = "#ef4444";
    advice = "Please consult a healthcare provider. Focus on low-impact exercise and diet.";
  }
  return { val, cat, color, advice };
}

function drawBMIGauge(bmi, color) {
  const canvas = document.getElementById("bmiGauge");
  if (!canvas) return;
  if (bmiGaugeInst) { bmiGaugeInst.destroy(); bmiGaugeInst = null; }

  const max = 40;
  const val = Math.min(bmi, max);

  bmiGaugeInst = new Chart(canvas, {
    type: "doughnut",
    data: {
      datasets: [{
        data: [val, max - val],
        backgroundColor: [color, getComputedStyle(document.documentElement).getPropertyValue("--border").trim() || "#2e2e3e"],
        borderWidth: 0,
        circumference: 180,
        rotation: -90,
      }],
    },
    options: {
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      cutout: "75%",
      animation: { animateRotate: true, duration: 800 },
      responsive: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Calorie Calculator
// ---------------------------------------------------------------------------
function calculateCalories() {
  const weight   = parseFloat(document.getElementById("calWeight").value);
  const height   = parseFloat(document.getElementById("calHeight").value);
  const age      = parseInt(document.getElementById("calAge").value);
  const gender   = document.getElementById("calGender").value;
  const activity = document.getElementById("calActivity").value;

  if (!weight || !height || !age) {
    showToast("Please fill in all fields.", "warning"); return;
  }

  fetch("/api/calories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ weight, height, age, gender, activity }),
  })
  .then(r => r.json())
  .then(data => {
    if (data.error) { showToast("Calculation error: " + data.error, "danger"); return; }
    document.getElementById("calResult").style.display         = "block";
    document.getElementById("calMaintenance").textContent      = data.maintenance.toLocaleString();
    document.getElementById("calLoss").textContent             = data.weight_loss.toLocaleString();
    document.getElementById("calGain").textContent             = data.weight_gain.toLocaleString();
    document.getElementById("bmrNote").innerHTML               =
      `<strong>Your BMR:</strong> ${data.bmr.toLocaleString()} kcal/day — the calories your body needs at complete rest.
       Activity multiplier applied: <strong>${activity.replace("_", " ")}</strong>.`;
  })
  .catch(err => showToast("Server error: " + err.message, "danger"));
}

// ---------------------------------------------------------------------------
// Workout Generator
// ---------------------------------------------------------------------------
function generateWorkout() {
  const level      = document.getElementById("workoutLevel").value;
  const goal       = document.getElementById("workoutGoal").value;
  const duration   = document.getElementById("workoutDuration").value;
  const conditions = document.getElementById("workoutConditions").value;

  const profile = {
    fitness_level:     level,
    goal:              goal,
    workout_time:      duration,
    health_conditions: conditions || "None",
  };

  setOutputLoading("workoutResult", "Generating your personalized workout plan...");
  document.getElementById("copyWorkoutBtn").style.display = "none";

  fetch("/api/workout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
  })
  .then(r => r.json())
  .then(data => {
    if (data.error) { setOutputError("workoutResult", data.error); return; }
    renderMarkdownOutput("workoutResult", data.workout);
    document.getElementById("copyWorkoutBtn").style.display = "inline-flex";
    showToast("✅ Workout plan generated!", "success");
  })
  .catch(err => setOutputError("workoutResult", err.message));
}

function quickWorkout(type) {
  const el = document.getElementById("workoutConditions");
  if (el) el.value = "";
  setOutputLoading("workoutResult", `Loading ${type}...`);
  document.getElementById("copyWorkoutBtn").style.display = "none";

  fetch("/api/workout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile: { goal: type, fitness_level: "all levels", workout_time: 30 } }),
  })
  .then(r => r.json())
  .then(data => {
    renderMarkdownOutput("workoutResult", data.workout || data.error);
    document.getElementById("copyWorkoutBtn").style.display = "inline-flex";
  })
  .catch(err => setOutputError("workoutResult", err.message));

  showSection("workout");
}

// ---------------------------------------------------------------------------
// Meal Plan Generator
// ---------------------------------------------------------------------------
function generateMealPlan() {
  const goal     = document.getElementById("mealGoal").value;
  const diet     = document.getElementById("mealDiet").value;
  const calories = parseInt(document.getElementById("mealCalories").value);
  const avoid    = document.getElementById("mealAvoid").value;

  setOutputLoading("mealResult", "Creating your personalized meal plan...");
  document.getElementById("copyMealBtn").style.display = "none";

  fetch("/api/meal-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile: { goal, diet }, target_calories: calories, avoid }),
  })
  .then(r => r.json())
  .then(data => {
    if (data.error) { setOutputError("mealResult", data.error); return; }
    renderMarkdownOutput("mealResult", data.meal_plan);
    document.getElementById("copyMealBtn").style.display = "inline-flex";
    showToast("✅ Meal plan generated!", "success");
  })
  .catch(err => setOutputError("mealResult", err.message));
}

// ---------------------------------------------------------------------------
// Habits
// ---------------------------------------------------------------------------
function setTodayDate() {
  const el = document.getElementById("habitDate");
  if (el) el.value = new Date().toISOString().split("T")[0];
}

function initWaterTracker() {
  const tracker = document.getElementById("waterTracker");
  if (!tracker) return;
  tracker.innerHTML = "";
  for (let i = 1; i <= 10; i++) {
    const btn = document.createElement("div");
    btn.className = "water-glass";
    btn.dataset.glass = i;
    btn.innerHTML = "💧";
    btn.addEventListener("click", () => toggleWater(i));
    tracker.appendChild(btn);
  }
}

function toggleWater(n) {
  if (STATE.waterGlasses === n) {
    STATE.waterGlasses = n - 1;
  } else {
    STATE.waterGlasses = n;
  }
  document.getElementById("waterVal").textContent = STATE.waterGlasses;
  document.querySelectorAll(".water-glass").forEach(el => {
    el.classList.toggle("filled", parseInt(el.dataset.glass) <= STATE.waterGlasses);
  });
}

function selectMood(btn) {
  document.querySelectorAll(".mood-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  STATE.selectedMood = btn.dataset.mood;
}

async function logHabit() {
  const workoutDone = document.querySelector('input[name="workoutDone"]:checked')?.value === "true";
  const sleepHours  = parseFloat(document.getElementById("sleepSlider").value);

  const entry = {
    workout_done:   workoutDone,
    water_glasses:  STATE.waterGlasses,
    sleep_hours:    sleepHours,
    mood:           STATE.selectedMood,
    date:           document.getElementById("habitDate").value,
  };

  try {
    const res = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error("Log failed");
    const data = await res.json();

    // Update local state
    STATE.habits.unshift(data.entry);
    localStorage.setItem("fb_habits", JSON.stringify(STATE.habits));
    renderHabitHistory();
    updateDashboard();
    refreshWeekChart();
    showToast("✅ Habit logged successfully!", "success");

    // Reset water
    STATE.waterGlasses = 0;
    initWaterTracker();
    document.getElementById("waterVal").textContent = "0";
  } catch (err) {
    showToast("❌ Failed to log habit.", "danger");
  }
}

function loadHabits() {
  const saved = localStorage.getItem("fb_habits");
  if (saved) {
    try {
      STATE.habits = JSON.parse(saved);
    } catch (_) { STATE.habits = []; }
  }
}

function renderHabitHistory() {
  const container = document.getElementById("habitHistory");
  if (!container) return;

  if (!STATE.habits.length) {
    container.innerHTML = `<div class="empty-state"><i class="bi bi-journal"></i><p>No habits logged yet. Start logging!</p></div>`;
    return;
  }

  container.innerHTML = STATE.habits.slice(0, 14).map(h => `
    <div class="habit-entry">
      <div class="habit-date">${h.date || "Today"}</div>
      <div class="habit-badges">
        <span class="habit-badge ${h.workout_done ? 'badge-workout-y' : 'badge-workout-n'}">
          ${h.workout_done ? "💪 Workout" : "⚠️ Rest Day"}
        </span>
        <span class="habit-badge badge-water">💧 ${h.water_glasses}g</span>
        <span class="habit-badge badge-sleep">😴 ${h.sleep_hours}h</span>
        <span class="habit-badge badge-mood">${moodEmoji(h.mood)} ${capitalize(h.mood)}</span>
      </div>
    </div>`).join("");
}

function moodEmoji(mood) {
  const map = { great:"😄", good:"😊", neutral:"😐", tired:"😴", bad:"😟" };
  return map[mood] || "😐";
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------
function getChartColors() {
  const isDark = STATE.theme === "dark";
  return {
    grid:    isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)",
    text:    isDark ? "#8b8ba0" : "#6b7280",
    primary: "#e85d04",
    info:    "#38bdf8",
    success: "#22c55e",
    warning: "#fbbf24",
  };
}

function initCharts() {
  initProgressChart();
  initHabitPieChart();
}

function refreshCharts() {
  if (progressChartInst) { progressChartInst.destroy(); progressChartInst = null; }
  if (habitChartInst)    { habitChartInst.destroy();    habitChartInst    = null; }
  if (habitWeekInst)     { habitWeekInst.destroy();     habitWeekInst     = null; }
  initProgressChart();
  initHabitPieChart();
  refreshWeekChart();
}

function initProgressChart() {
  const canvas = document.getElementById("progressChart");
  if (!canvas) return;

  const c   = getChartColors();
  const habits = STATE.habits.slice(0, 7).reverse();
  const labels = habits.length
    ? habits.map(h => h.date ? h.date.slice(5) : "—")
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const water  = habits.length ? habits.map(h => h.water_glasses) : [5,6,7,4,8,6,7];
  const sleep  = habits.length ? habits.map(h => h.sleep_hours)   : [7,6,8,7,6,8,7];

  progressChartInst = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Water (glasses)",
          data: water,
          backgroundColor: `rgba(56,189,248,0.7)`,
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: "Sleep (hours)",
          data: sleep,
          backgroundColor: `rgba(251,191,36,0.7)`,
          borderRadius: 6,
          borderSkipped: false,
          type: "line",
          borderColor: c.warning,
          pointBackgroundColor: c.warning,
          tension: 0.4,
          fill: false,
          yAxisID: "y1",
        },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: c.text, font: { size: 12 } } },
      },
      scales: {
        x: { ticks: { color: c.text }, grid: { color: c.grid } },
        y: {
          ticks: { color: c.text },
          grid:  { color: c.grid },
          title: { display: true, text: "Glasses", color: c.text },
        },
        y1: {
          position: "right",
          ticks: { color: c.text },
          grid:  { drawOnChartArea: false },
          title: { display: true, text: "Hours", color: c.text },
          min: 0, max: 12,
        },
      },
    },
  });
}

function initHabitPieChart() {
  const canvas = document.getElementById("habitChart");
  if (!canvas) return;

  const c          = getChartColors();
  const workouts   = STATE.habits.filter(h => h.workout_done).length || 3;
  const restDays   = Math.max((STATE.habits.length || 7) - workouts, 1);
  const goodSleep  = STATE.habits.filter(h => h.sleep_hours >= 7).length || 4;

  habitChartInst = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Workouts Done", "Rest Days", "Good Sleep"],
      datasets: [{
        data: [workouts, restDays, goodSleep],
        backgroundColor: [c.primary, c.info, c.warning],
        borderWidth: 2,
        borderColor: STATE.theme === "dark" ? "#22222e" : "#ffffff",
      }],
    },
    options: {
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: c.text, font: { size: 11 }, padding: 10, boxWidth: 12 },
        },
      },
      cutout: "60%",
    },
  });
}

function refreshWeekChart() {
  const canvas = document.getElementById("habitWeekChart");
  if (!canvas) return;
  if (habitWeekInst) { habitWeekInst.destroy(); habitWeekInst = null; }

  const c      = getChartColors();
  const recent = STATE.habits.slice(0, 7).reverse();
  const labels = recent.map(h => h.date ? h.date.slice(5) : "—");
  const water  = recent.map(h => h.water_glasses);
  const sleep  = recent.map(h => h.sleep_hours);
  const workout= recent.map(h => h.workout_done ? 1 : 0);

  habitWeekInst = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Water (g)", data: water,   backgroundColor: "rgba(56,189,248,0.7)",  borderRadius: 4 },
        { label: "Sleep (h)", data: sleep,   backgroundColor: "rgba(251,191,36,0.7)",  borderRadius: 4 },
        { label: "Workout",   data: workout, backgroundColor: "rgba(232,93,4,0.8)",    borderRadius: 4 },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: c.text, font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: c.text }, grid: { color: c.grid } },
        y: { ticks: { color: c.text }, grid: { color: c.grid }, beginAtZero: true },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Dashboard update
// ---------------------------------------------------------------------------
function updateDashboard() {
  const habits = STATE.habits;

  // Streak
  let streak = 0;
  for (const h of habits) { if (h.workout_done) streak++; else break; }
  setEl("statStreak",   streak);

  // Total workouts
  setEl("statWorkouts", habits.filter(h => h.workout_done).length);

  // Avg water
  const avgWater = habits.length
    ? (habits.reduce((s, h) => s + (h.water_glasses || 0), 0) / habits.length).toFixed(1)
    : 0;
  setEl("statWater", avgWater);

  // Avg sleep
  const avgSleep = habits.length
    ? (habits.reduce((s, h) => s + (h.sleep_hours || 0), 0) / habits.length).toFixed(1)
    : 0;
  setEl("statSleep", avgSleep);

  // Refresh charts
  if (progressChartInst) { progressChartInst.destroy(); progressChartInst = null; }
  if (habitChartInst)    { habitChartInst.destroy();    habitChartInst    = null; }
  initProgressChart();
  initHabitPieChart();
}

// ---------------------------------------------------------------------------
// Daily Tip
// ---------------------------------------------------------------------------
function fetchDailyTip() {
  fetch("/api/tips")
    .then(r => r.json())
    .then(data => setEl("dailyTip", data.tip || "Stay consistent!"))
    .catch(() => setEl("dailyTip", "💧 Drink a glass of water first thing every morning."));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderMarkdownOutput(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  const rendered = (typeof marked !== "undefined") ? marked.parse(text) : text.replace(/\n/g, "<br>");
  el.innerHTML = `<div class="content-output">${rendered}</div>`;
}

function setOutputLoading(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `
    <div class="output-loading">
      <div class="spinner-sm"></div>
      <span>${msg}</span>
    </div>`;
}

function setOutputError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `<div class="text-danger" style="padding:1rem">⚠️ Error: ${msg}</div>`;
}

function copyToClipboard(id) {
  const el = document.getElementById(id);
  if (!el) return;
  navigator.clipboard.writeText(el.innerText).then(() => showToast("📋 Copied to clipboard!", "info"));
}

function showToast(msg, type = "info") {
  const toast  = document.getElementById("appToast");
  const body   = document.getElementById("toastMessage");
  if (!toast || !body) return;

  const colors = { success: "#22c55e", danger: "#ef4444", warning: "#fbbf24", info: "#38bdf8" };
  body.textContent   = msg;
  body.style.color   = colors[type] || colors.info;
  const t = new bootstrap.Toast(toast, { delay: 3500 });
  t.show();
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function updateStatusDot() {
  fetch("/api/health")
    .then(r => {
      const dot = document.querySelector(".status-dot");
      const txt = document.querySelector(".status-text");
      if (dot) dot.style.background = r.ok ? "#22c55e" : "#ef4444";
      if (txt) txt.textContent = r.ok ? "AI Active" : "Disconnected";
    })
    .catch(() => {
      const dot = document.querySelector(".status-dot");
      if (dot) dot.style.background = "#ef4444";
    });
}
