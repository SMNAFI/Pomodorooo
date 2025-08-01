let timerDuration = 1 * 60; // 25 minutes
let timerRunning = false;
let timerStart = null; // timestamp in ms

function getRemainingTime() {
  if (!timerRunning || !timerStart) return timerDuration;
  const elapsed = Math.floor((Date.now() - timerStart) / 1000);
  return Math.max(timerDuration - elapsed, 0);
}

function saveState() {
  chrome.storage.local.set({
    timerDuration,
    timerRunning,
    timerStart
  });
}

function loadState(callback) {
  chrome.storage.local.get(["timerDuration", "timerRunning", "timerStart"], (data) => {
    if (typeof data.timerDuration === "number") timerDuration = data.timerDuration;
    if (typeof data.timerRunning === "boolean") timerRunning = data.timerRunning;
    if (typeof data.timerStart === "number") timerStart = data.timerStart;
    if (callback) callback();
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "start") {
    if (!timerRunning) {
      timerRunning = true;
      timerStart = Date.now();
      chrome.alarms.create("pomodoroTimer", { delayInMinutes: timerDuration / 60 });
      saveState();
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.command === "pause") {
    if (timerRunning) {
      timerDuration = getRemainingTime();
      timerRunning = false;
      timerStart = null;
      chrome.alarms.clear("pomodoroTimer");
      saveState();
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.command === "resume") {
    if (!timerRunning && timerDuration > 0) {
      timerRunning = true;
      timerStart = Date.now();
      chrome.alarms.create("pomodoroTimer", { delayInMinutes: timerDuration / 60 });
      saveState();
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.command === "reset") {
    timerDuration = 1 * 60;
    timerRunning = false;
    timerStart = null;
    chrome.alarms.clear("pomodoroTimer");
    saveState();
    sendResponse({ success: true });
    return true;
  }

  if (message.command === "getStatus") {
    sendResponse({ 
      remainingTime: getRemainingTime(), 
      timerRunning,
      timerDuration,
      timerStart
    });
    return true;
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "pomodoroTimer") {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "Pomodoro Complete!",
      message: "Time to take a break!",
      priority: 2
    });
    timerRunning = false;
    timerDuration = 1 * 60;
    timerStart = null;
    saveState();
  }
});

// Load state on startup
loadState();
