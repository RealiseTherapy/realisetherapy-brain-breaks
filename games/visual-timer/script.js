const state = {
    duration: 0,
    remaining: 0,
    timerId: null,
    running: false,
    endTime: null
};

const timeDisplay = document.getElementById('timeDisplay');
const setTimeDisplay = document.getElementById('setTimeDisplay');
const statusDisplay = document.getElementById('statusDisplay');
const finishMessage = document.getElementById('finishMessage');
const timerSetup = document.getElementById('timerSetup');
const timerStage = document.getElementById('timerStage');
const ringProgress = document.getElementById('ringProgress');
const startPauseBtn = document.getElementById('startPauseBtn');
const resetBtn = document.getElementById('resetBtn');
const customMinutesInput = document.getElementById('customMinutes');
const setCustomBtn = document.getElementById('setCustomBtn');
const presetButtons = document.querySelectorAll('.preset-btn');

const RING_CIRCUMFERENCE = 2 * Math.PI * 92;
ringProgress.style.strokeDasharray = `${RING_CIRCUMFERENCE}`;

function formatTime(seconds) {
    const safeSeconds = Math.max(0, Math.ceil(seconds));
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function setStatus(text) {
    statusDisplay.textContent = text;
}

function updateDisplay() {
    timeDisplay.textContent = formatTime(state.remaining);
    setTimeDisplay.textContent = formatTime(state.duration);

    const progress = state.duration > 0 ? state.remaining / state.duration : 0;
    ringProgress.style.strokeDashoffset = `${RING_CIRCUMFERENCE * (1 - progress)}`;
}

function showTimerStage() {
    timerSetup.hidden = true;
    timerStage.hidden = false;
}

function showSetupStage() {
    timerSetup.hidden = false;
    timerStage.hidden = true;
}

function stopTimer(clearRemaining = false) {
    if (state.timerId) {
        clearInterval(state.timerId);
        state.timerId = null;
    }
    state.running = false;
    state.endTime = null;
    startPauseBtn.textContent = 'Start';
    if (clearRemaining) {
        state.remaining = state.duration;
    }
}

function tick() {
    if (!state.endTime) return;

    state.remaining = Math.max(0, Math.ceil((state.endTime - Date.now()) / 1000));
    updateDisplay();

    if (state.remaining <= 0) {
        stopTimer();
        setStatus('Finished');
        finishMessage.hidden = false;
        timerStage.classList.add('finished');
        presetButtons.forEach(btn => btn.disabled = false);
        customMinutesInput.disabled = false;
        setCustomBtn.disabled = false;
    }
}

function startTimer() {
    if (state.duration <= 0) return;

    finishMessage.hidden = true;
    timerStage.classList.remove('finished');

    state.running = true;
    state.endTime = Date.now() + state.remaining * 1000;
    startPauseBtn.textContent = 'Pause';
    setStatus('Running');
    presetButtons.forEach(btn => btn.disabled = true);
    customMinutesInput.disabled = true;
    setCustomBtn.disabled = true;

    tick();
    state.timerId = setInterval(tick, 250);
}

function pauseTimer() {
    if (state.timerId) {
        clearInterval(state.timerId);
        state.timerId = null;
    }
    state.running = false;
    state.endTime = null;
    startPauseBtn.textContent = 'Start';
    setStatus('Paused');
    presetButtons.forEach(btn => btn.disabled = false);
    customMinutesInput.disabled = false;
    setCustomBtn.disabled = false;
}

function loadMinutes(minutes) {
    const safeMinutes = Math.max(1, Math.min(180, Number(minutes) || 0));
    state.duration = safeMinutes * 60;
    state.remaining = state.duration;
    stopTimer();
    showTimerStage();
    finishMessage.hidden = true;
    setStatus('Ready');
    updateDisplay();
}

function handlePresetClick(event) {
    loadMinutes(event.currentTarget.dataset.minutes);
}

function handleCustomSet() {
    const value = Number(customMinutesInput.value);
    if (!value || value < 1) {
        customMinutesInput.focus();
        return;
    }
    loadMinutes(value);
    customMinutesInput.value = '';
}

function toggleStartPause() {
    if (!state.duration) return;
    if (state.running) {
        pauseTimer();
    } else {
        startTimer();
    }
}

function resetTimer() {
    if (!state.duration) {
        showSetupStage();
        return;
    }
    stopTimer(true);
    finishMessage.hidden = true;
    setStatus('Ready');
    updateDisplay();
}

presetButtons.forEach(btn => btn.addEventListener('click', handlePresetClick));
setCustomBtn.addEventListener('click', handleCustomSet);
startPauseBtn.addEventListener('click', toggleStartPause);
resetBtn.addEventListener('click', resetTimer);
customMinutesInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') handleCustomSet();
});

showSetupStage();
state.remaining = 0;
updateDisplay();
setStatus('Ready');
