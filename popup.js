const timerDisplay = document.getElementById("timer");
const startBtn = document.getElementById("start");
const pauseBtn = document.getElementById("pause");
const resetBtn = document.getElementById("reset");

// Create resume button
let resumeBtn = document.getElementById("resume");
if (!resumeBtn) {
  resumeBtn = document.createElement("button");
  resumeBtn.id = "resume";
  resumeBtn.textContent = "Resume";
  resumeBtn.style.display = "none";
  resetBtn.parentNode.insertBefore(resumeBtn, resetBtn);
}

let interval = null;
let lastStatus = { remainingTime: 1 * 60, timerRunning: false };

function updateDisplay(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  timerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateButtons(status) {
  if (status.timerRunning) {
    startBtn.style.display = "none";
    pauseBtn.style.display = "";
    resumeBtn.style.display = "none";
    resetBtn.style.display = "";
  } else if (status.remainingTime < status.timerDuration && status.remainingTime > 0) {
    // Paused
    startBtn.style.display = "none";
    pauseBtn.style.display = "none";
    resumeBtn.style.display = "";
    resetBtn.style.display = "";
  } else {
    // Initial state or after reset
    startBtn.style.display = "";
    pauseBtn.style.display = "none";
    resumeBtn.style.display = "none";
    resetBtn.style.display = "none";
  }
}

function getStatusAndUpdate(cb) {
  chrome.runtime.sendMessage({ command: "getStatus" }, (response) => {
    if (response) {
      lastStatus = response;
      updateDisplay(response.remainingTime);
      updateButtons(response);
      if (cb) cb(response);
    }
  });
}

function startInterval() {
  if (interval) clearInterval(interval);
  interval = setInterval(() => {
    getStatusAndUpdate((status) => {
      if (!status.timerRunning) clearInterval(interval);
    });
  }, 1000);
}

startBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ command: "start" }, () => {
    startInterval();
    getStatusAndUpdate();
  });
});

pauseBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ command: "pause" }, () => {
    getStatusAndUpdate();
    clearInterval(interval);
  });
});

resumeBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ command: "resume" }, () => {
    startInterval();
    getStatusAndUpdate();
  });
});

resetBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ command: "reset" }, () => {
    updateDisplay(1 * 60);
    clearInterval(interval);
    getStatusAndUpdate();
  });
});

document.addEventListener("DOMContentLoaded", () => {
  getStatusAndUpdate((status) => {
    if (status.timerRunning) startInterval();
  });
});
