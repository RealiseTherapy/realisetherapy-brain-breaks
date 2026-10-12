const MAX_MINUTES = 180;
let totalSeconds = 300;
let remaining = totalSeconds;
let interval = null;
let endTime = 0;
let audioCtx = null;

const timeEl = document.getElementById('time');
const ringEl = document.getElementById('ring');
const messageEl = document.getElementById('message');
const startBtn = document.getElementById('startBtn');
const customInput = document.getElementById('customMinutes');

function render() {
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    timeEl.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    ringEl.style.setProperty('--progress', (remaining / totalSeconds * 100) + '%');
}

function setMinutes(minutes) {
    stop();
    totalSeconds = Math.round(minutes * 60);
    remaining = totalSeconds;
    ringEl.classList.remove('done');
    messageEl.textContent = '';
    startBtn.textContent = '▶ Start';
    render();
}

function stop() {
    clearInterval(interval);
    interval = null;
}

// Short repeated beeps generated with the Web Audio API (no external assets)
function playAlert() {
    try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        for (let i = 0; i < 3; i++) {
            const t = audioCtx.currentTime + i * 0.6;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(0.5, t + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
            osc.connect(gain).connect(audioCtx.destination);
            osc.start(t);
            osc.stop(t + 0.5);
        }
    } catch (e) { /* audio unavailable */ }
}

function tick() {
    remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    render();
    if (remaining === 0) {
        stop();
        ringEl.classList.add('done');
        messageEl.textContent = "Time's up!";
        startBtn.textContent = '▶ Start';
        playAlert();
    }
}

function start() {
    if (interval) {
        stop();
        startBtn.textContent = '▶ Resume';
        return;
    }
    if (remaining === 0) setMinutes(totalSeconds / 60);
    // Create/unlock audio on a user gesture so the alert can play automatically later
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    endTime = Date.now() + remaining * 1000;
    interval = setInterval(tick, 250);
    startBtn.textContent = '⏸ Pause';
}

document.querySelectorAll('.preset').forEach(btn => {
    btn.addEventListener('click', () => setMinutes(Number(btn.dataset.minutes)));
});
document.getElementById('customBtn').addEventListener('click', () => {
    const v = parseFloat(customInput.value);
    if (v > 0 && v <= MAX_MINUTES) setMinutes(v);
});
customInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('customBtn').click();
});
startBtn.addEventListener('click', start);
document.getElementById('resetBtn').addEventListener('click', () => setMinutes(totalSeconds / 60));

render();
