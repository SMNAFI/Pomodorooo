const timerDisplay = document.getElementById('timerDisplay');
const sessionType = document.getElementById('sessionType');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const progressCircle = document.getElementById('progressCircle');
const todaySessionsEl = document.getElementById('todaySessions');
const todayTimeEl = document.getElementById('todayTime');
const streakEl = document.getElementById('streak');
const workTimeEl = document.getElementById('workTime');
const breakTimeEl = document.getElementById('breakTime');
const workMinus = document.getElementById('workMinus');
const workPlus = document.getElementById('workPlus');
const breakMinus = document.getElementById('breakMinus');
const breakPlus = document.getElementById('breakPlus');

let interval = null;

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateDisplay(state) {
  timerDisplay.textContent = formatTime(state.timerRemaining);
  const totalDuration = state.sessionType === "work" ? state.workDuration : state.breakDuration;
  const progress = (totalDuration - state.timerRemaining) / totalDuration;
  const circumference = 2 * Math.PI * 90;
  const offset = circumference - (progress * circumference);
  progressCircle.style.strokeDashoffset = offset;

  sessionType.textContent = state.sessionType === "work" ? "Work Session" : "Break Time";
  workTimeEl.textContent = `${state.workDuration / 60}m`;
  breakTimeEl.textContent = `${state.breakDuration / 60}m`;

  // Only today's stats
  todaySessionsEl.textContent = state.stats.todaySessions || 0;
  todayTimeEl.textContent = state.stats.todayTime
    ? `${Math.floor(state.stats.todayTime / 60)}m`
    : "0m";
  streakEl.textContent = state.stats.streak || 0;

  // Controls
  if (state.timerRunning) {
    playBtn.classList.add('hidden');
    pauseBtn.classList.remove('hidden');
  } else {
    playBtn.classList.remove('hidden');
    pauseBtn.classList.add('hidden');
  }
}

function getStateAndUpdate(cb) {
  chrome.runtime.sendMessage({ command: "getState" }, (state) => {
    updateDisplay(state);
    if (cb) cb(state);
  });
}

function startInterval() {
  if (interval) clearInterval(interval);
  interval = setInterval(() => {
    getStateAndUpdate((state) => {
      if (!state.timerRunning) clearInterval(interval);
    });
  }, 1000);
}

playBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ command: "start" }, () => {
    startInterval();
    getStateAndUpdate();
  });
});

pauseBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ command: "pause" }, () => {
    getStateAndUpdate();
    clearInterval(interval);
  });
});

resetBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ command: "reset" }, () => {
    getStateAndUpdate();
    clearInterval(interval);
  });
});

workMinus.addEventListener("click", () => {
  chrome.runtime.sendMessage({ command: "adjustTime", type: "work", amount: -5 }, () => {
    getStateAndUpdate();
  });
});
workPlus.addEventListener("click", () => {
  chrome.runtime.sendMessage({ command: "adjustTime", type: "work", amount: 5 }, () => {
    getStateAndUpdate();
  });
});
breakMinus.addEventListener("click", () => {
  chrome.runtime.sendMessage({ command: "adjustTime", type: "break", amount: -1 }, () => {
    getStateAndUpdate();
  });
});
breakPlus.addEventListener("click", () => {
  chrome.runtime.sendMessage({ command: "adjustTime", type: "break", amount: 1 }, () => {
    getStateAndUpdate();
  });
});

document.addEventListener("DOMContentLoaded", () => {
  getStateAndUpdate((state) => {
    if (state.timerRunning) startInterval();
  });
});
