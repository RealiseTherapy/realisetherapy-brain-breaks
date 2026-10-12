const state = {
    duration: 0,
    remaining: 0,
    timerId: null,
    running: false,
    endTime: null
};

let audioCtx = null;

function getAudioContext() {
    try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) {
        audioCtx = null;
    }
    return audioCtx;
}

// Three short beeps generated with the Web Audio API (no external assets)
function playAlert() {
    const ctx = getAudioContext();
    if (!ctx) return;
    for (let i = 0; i < 3; i++) {
        const t = ctx.currentTime + i * 0.6;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.5, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.5);
    }
}

const timeDisplay = document.getElementById('timeDisplay');
const finishMessage = document.getElementById('finishMessage');
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

function updateDisplay() {
    timeDisplay.textContent = formatTime(state.remaining);

    const progress = state.duration > 0 ? state.remaining / state.duration : 0;
    ringProgress.style.strokeDashoffset = `${RING_CIRCUMFERENCE * progress}`;
}

function stopTimer(clearRemaining = false) {
    if (state.timerId) {
        clearInterval(state.timerId);
        state.timerId = null;
    }
    state.running = false;
    state.endTime = null;
    startPauseBtn.textContent = 'Pause';
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
        startPauseBtn.disabled = true;
        finishMessage.hidden = false;
        timerStage.classList.add('finished');
        playAlert();
    }
}

function startTimer() {
    if (state.duration <= 0) return;

    // Unlock audio on a user gesture so the alert can play automatically later
    getAudioContext();

    finishMessage.hidden = true;
    timerStage.classList.remove('finished');

    state.running = true;
    state.endTime = Date.now() + state.remaining * 1000;
    startPauseBtn.textContent = 'Pause';
    startPauseBtn.disabled = false;

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
    startPauseBtn.textContent = 'Resume';
}

function loadMinutes(minutes) {
    const safeMinutes = Math.max(1, Math.min(180, Number(minutes) || 0));
    state.duration = safeMinutes * 60;
    state.remaining = state.duration;
    stopTimer();
    finishMessage.hidden = true;
    updateDisplay();
    startTimer();
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
    stopTimer(true);
    timerStage.classList.remove('finished');
    finishMessage.hidden = true;
    startPauseBtn.disabled = true;
    updateDisplay();
}

presetButtons.forEach(btn => btn.addEventListener('click', handlePresetClick));
setCustomBtn.addEventListener('click', handleCustomSet);
startPauseBtn.addEventListener('click', toggleStartPause);
resetBtn.addEventListener('click', resetTimer);
customMinutesInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') handleCustomSet();
});

updateDisplay();
