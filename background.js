const DEFAULTS = {
  workDuration: 25 * 60,
  breakDuration: 5 * 60,
  sessionType: "work", // "work" or "break"
  timerRunning: false,
  timerStart: null,
  timerRemaining: 25 * 60,
  theme: "system", // "light", "dark", "system"
  stats: {
    todayDate: null,
    todaySessions: 0,
    todayTime: 0,
    totalSessions: 0,
    totalTime: 0,
    streak: 0,
    lastSessionDate: null
  }
};

function getTodayDateStr() {
  return new Date().toISOString().slice(0, 10);
}

function loadState(cb) {
  chrome.storage.local.get(null, (data) => {
    const state = { ...DEFAULTS, ...data };
    state.stats = { ...DEFAULTS.stats, ...data.stats };
    cb(state);
  });
}

function saveState(state) {
  chrome.storage.local.set(state);
}

function startTimer(state, sendResponse) {
  if (!state.timerRunning) {
    state.timerRunning = true;
    state.timerStart = Date.now();
    chrome.alarms.create("pomodoroTimer", { delayInMinutes: state.timerRemaining / 60 });
    saveState(state);
  }
  sendResponse && sendResponse({ success: true });
}

function pauseTimer(state, sendResponse) {
  if (state.timerRunning) {
    const elapsed = Math.floor((Date.now() - state.timerStart) / 1000);
    state.timerRemaining = Math.max(state.timerRemaining - elapsed, 0);
    state.timerRunning = false;
    state.timerStart = null;
    chrome.alarms.clear("pomodoroTimer");
    saveState(state);
  }
  sendResponse && sendResponse({ success: true });
}

function resumeTimer(state, sendResponse) {
  if (!state.timerRunning && state.timerRemaining > 0) {
    state.timerRunning = true;
    state.timerStart = Date.now();
    chrome.alarms.create("pomodoroTimer", { delayInMinutes: state.timerRemaining / 60 });
    saveState(state);
  }
  sendResponse && sendResponse({ success: true });
}

function resetTimer(state, sendResponse) {
  state.timerRunning = false;
  state.timerStart = null;
  state.timerRemaining = state.sessionType === "work" ? state.workDuration : state.breakDuration;
  chrome.alarms.clear("pomodoroTimer");
  saveState(state);
  sendResponse && sendResponse({ success: true });
}

function completeSession(state) {
  // Update stats
  const today = getTodayDateStr();
  if (state.sessionType === "work") {
    // Update streak
    if (state.stats.todayDate !== today) {
      // New day
      if (
        state.stats.lastSessionDate &&
        new Date(today) - new Date(state.stats.lastSessionDate) === 86400000
      ) {
        state.stats.streak += 1;
      } else {
        state.stats.streak = 1;
      }
      state.stats.todaySessions = 1;
      state.stats.todayTime = state.workDuration;
      state.stats.todayDate = today;
    } else {
      state.stats.todaySessions += 1;
      state.stats.todayTime += state.workDuration;
    }
    state.stats.totalSessions += 1;
    state.stats.totalTime += state.workDuration;
    state.stats.lastSessionDate = today;
  }
  // Switch session
  state.sessionType = state.sessionType === "work" ? "break" : "work";
  state.timerRemaining = state.sessionType === "work" ? state.workDuration : state.breakDuration;
  state.timerRunning = false;
  state.timerStart = null;
  chrome.alarms.clear("pomodoroTimer");
  saveState(state);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  loadState((state) => {
    switch (msg.command) {
      case "getState":
        // Calculate remaining time if running
        if (state.timerRunning && state.timerStart) {
          const elapsed = Math.floor((Date.now() - state.timerStart) / 1000);
          state.timerRemaining = Math.max(
            (state.timerRemaining || (state.sessionType === "work" ? state.workDuration : state.breakDuration)) - elapsed,
            0
          );
          if (state.timerRemaining === 0) {
            completeSession(state);
          }
        }
        sendResponse(state);
        break;
      case "start":
        startTimer(state, sendResponse);
        break;
      case "pause":
        pauseTimer(state, sendResponse);
        break;
      case "resume":
        resumeTimer(state, sendResponse);
        break;
      case "reset":
        resetTimer(state, sendResponse);
        break;
      case "adjustTime":
        if (msg.type === "work") {
          state.workDuration = Math.max(5 * 60, state.workDuration + msg.amount * 60);
          if (state.sessionType === "work" && !state.timerRunning) {
            state.timerRemaining = state.workDuration;
          }
        } else if (msg.type === "break") {
          state.breakDuration = Math.max(1 * 60, state.breakDuration + msg.amount * 60);
          if (state.sessionType === "break" && !state.timerRunning) {
            state.timerRemaining = state.breakDuration;
          }
        }
        saveState(state);
        sendResponse({ success: true });
        break;
      case "setTheme":
        state.theme = msg.theme;
        saveState(state);
        sendResponse({ success: true });
        break;
      default:
        sendResponse({ success: false });
    }
  });
  return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "pomodoroTimer") {
    loadState((state) => {
      completeSession(state);
      // already updated state, so now session type is switched
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon128.png",
        title: "Pomodoro Complete!",
        message: state.sessionType === "work"
          ? "Back to work! 💪"
          : "Break time! 🎉",
        priority: 2
      });
    });
  }
});
