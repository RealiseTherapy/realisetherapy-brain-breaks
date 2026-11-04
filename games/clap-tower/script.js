const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const $ = id => document.getElementById(id);
let W, H;
function resize() {
    W = cv.width = cv.clientWidth;
    H = cv.height = cv.clientHeight;
}
addEventListener('resize', resize);
resize();

const BLOCK_H = 36;
let tower = null, cur = null, falling = [], score = 0, camY = 0, speed = 220, state = 'menu';
let best = +localStorage.getItem('clapTowerBest') || 0;
$('best').textContent = best;

// ---- rhythm: 4/4, ideal clap on beat 1 of each bar ----
// Timing uses the Web Audio clock (sample-accurate) rather than <audio>.currentTime.
const BPM = 100, BEAT = 60 / BPM, BAR = 4 * BEAT; // must match the track's tempo
const FIRST_BEAT = 0.035; // first beat sits ~35 ms into beat.mp3
let audioCtx = null, musicBuf = null, musicSrc = null, loopLen = 0, T0 = 0, musicReady = false;
const getCtx = () => audioCtx || (audioCtx = new (window.AudioContext || window.webkitAudioContext)());

$('offset').value = localStorage.getItem('clapTowerNudge') || 0;
$('offset').onchange = () => localStorage.setItem('clapTowerNudge', $('offset').value);
const nudge = () => (+$('offset').value || 0) / 1000;

// Time (s) relative to the first downbeat, matched to what the audience actually hears.
function songTime() {
    if (!audioCtx) return 0;
    const lat = (audioCtx.outputLatency || 0) + (audioCtx.baseLatency || 0);
    return audioCtx.currentTime - lat - T0 - nudge();
}
const nextDown = t => Math.ceil(t / BAR - 1e-9) * BAR;

async function loadTrack(data, name) {
    try {
        musicBuf = await getCtx().decodeAudioData(data);
    } catch (e) {
        $('trackStatus').textContent = 'Could not read that audio file.';
        return;
    }
    // Loop on a whole number of bars so the beat never drifts
    const bars = Math.max(1, Math.round(musicBuf.duration / BAR));
    loopLen = bars * BAR <= musicBuf.duration ? bars * BAR : musicBuf.duration;
    musicReady = true;
    $('trackStatus').textContent = 'Backing track: ' + name + ' (' + bars + ' bars) – clap on beat 1!';
}
$('track').onchange = async e => {
    const f = e.target.files[0];
    if (f) loadTrack(await f.arrayBuffer(), f.name);
};
// Auto-load games/clap-tower/beat.mp3 if it has been added to the repo
fetch('beat.mp3').then(r => r.ok ? r.arrayBuffer() : Promise.reject()).then(d => loadTrack(d, 'beat.mp3')).catch(() => {});

function stopMusic() {
    if (musicSrc) { try { musicSrc.stop(); } catch (e) {} musicSrc = null; }
}

function startMusic() {
    const c = getCtx();
    T0 = c.currentTime + 4 * BEAT + 0.15; // beat 1 of the first bar; music starts FIRST_BEAT early
    for (let k = 0; k < 4; k++) {
        const o = c.createOscillator(), g = c.createGain(), t = T0 - (4 - k) * BEAT;
        o.frequency.value = k === 3 ? 1320 : 880;
        g.gain.setValueAtTime(0.25, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        o.connect(g).connect(c.destination);
        o.start(t); o.stop(t + 0.15);
    }
    musicSrc = c.createBufferSource();
    musicSrc.buffer = musicBuf;
    musicSrc.loop = true;
    musicSrc.loopStart = 0;
    musicSrc.loopEnd = loopLen;
    musicSrc.connect(c.destination);
    musicSrc.start(T0 - FIRST_BEAT);
}

const hue = n => (n * 28) % 360;

function reset() {
    resize();
    const w = Math.min(260, W * 0.4);
    tower = [{ x: W / 2 - w / 2, w, i: 0 }];
    falling = []; score = 0; camY = 0; speed = 220;
    $('score').textContent = 0;
    spawn();
}

function spawn() {
    const top = tower[tower.length - 1];
    const w = 70 + Math.random() * Math.min(260, W * 0.45); // varied lengths
    cur = { x: W, w, i: top.i + 1 };
    if (musicReady) {
        // aim to be centred on the tower exactly on a downbeat, arriving from the right edge
        const t = songTime();
        cur.cx = W / 2 - w / 2; // block centre reaches page centre on the downbeat
        cur.target = nextDown(Math.max(0, t + (W - cur.cx) / speed));
        cur.x = cur.cx + (cur.target - t) * speed;
    }
}

function drop() {
    if (state !== 'play' || !cur || cur.x >= W) return; // ignore claps while no block is on screen
    const top = tower[tower.length - 1];
    const left = Math.max(cur.x, top.x), right = Math.min(cur.x + cur.w, top.x + top.w);
    if (right - left <= 0) {
        falling.push({ x: cur.x, w: cur.w, i: cur.i, y: 0, vy: 0 });
        cur = null;
        return gameOver();
    }
    if (cur.x < left) falling.push({ x: cur.x, w: left - cur.x, i: cur.i, y: 0, vy: 0 });
    if (cur.x + cur.w > right) falling.push({ x: right, w: cur.x + cur.w - right, i: cur.i, y: 0, vy: 0 });
    tower.push({ x: left, w: right - left, i: cur.i });
    score = tower.length - 1;
    $('score').textContent = score;
    speed = Math.min(220 + score * 12, 700);
    if (right - left < 4) { cur = null; return gameOver(); }
    spawn();
}

function gameOver() {
    state = 'over';
    stopMusic();
    if (score > best) {
        best = score;
        localStorage.setItem('clapTowerBest', best);
        $('best').textContent = best;
    }
    $('title').textContent = 'Tower height: ' + score;
    $('msg').textContent = score > 0 && score >= best ? 'New best! 🎉' : 'Nice try!';
    $('start').textContent = '▶ Play again';
    $('start').hidden = !micOn;
    $('enableMic').hidden = micOn;
    $('startNoMic').hidden = micOn;
    $('overlay').classList.remove('hide');
}

async function begin() {
    await getCtx().resume();
    $('overlay').classList.add('hide');
    stopMusic();
    env = 0;
    if (musicReady) startMusic();
    reset();
    state = 'play';
}

// ---- microphone ----
let analyser = null, buf = null, micOn = false, lastClap = 0, baseline = 0.01, env = 0;

function setStatus(t) { $('micStatus').textContent = t; }

async function initMic() {
    if (micOn) {
        if (audioCtx.state !== 'running') await audioCtx.resume();
        return true;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus(location.protocol === 'file:'
            ? 'Microphones are blocked when a page is opened as a local file. Open it from the website (https) instead.'
            : 'This browser or page can\'t use the microphone (it needs https).');
        return false;
    }
    // Created inside the click handler so the browser lets audio run
    getCtx();
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false }
        });
        await audioCtx.resume();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024;
        audioCtx.createMediaStreamSource(stream).connect(analyser);
        buf = new Float32Array(analyser.fftSize);
        micOn = true;
        return true;
    } catch (e) {
        const msgs = {
            NotAllowedError: 'Microphone access was blocked. Click the 🔒 icon in the address bar, allow the microphone, then try again.',
            NotFoundError: 'No microphone found. Plug one in and try again.',
            NotReadableError: 'The microphone is being used by another app.'
        };
        setStatus(msgs[e.name] || 'Could not start the microphone: ' + e.message);
        return false;
    }
}

function threshold() { return 0.55 - $('sens').value * 0.0053; } // higher sensitivity = lower threshold

function pollMic(now) {
    if (!micOn) return;
    analyser.getFloatTimeDomainData(buf);
    let peak = 0;
    for (const v of buf) peak = Math.max(peak, Math.abs(v));
    const t = threshold();
    $('level').style.width = Math.min(100, peak * 100) + '%';
    $('thr').style.left = Math.min(100, t * 100) + '%';
    // Clap = a spike clearly above the recent loudest level (which includes the music),
    // so the learned music level is never mistaken for a clap.
    const isClap = peak > t && peak > env * 1.6 && peak > baseline * 3 && now - lastClap > 350;
    if (isClap) {
        lastClap = now;
        drop();
    } else {
        env = Math.max(peak, env * 0.995);
    }
    baseline = baseline * 0.98 + peak * 0.02;
}

$('enableMic').onclick = async () => {
    setStatus('');
    if (await initMic()) {
        setStatus('Microphone ready ✔ – press Start when the class is ready.');
        $('enableMic').hidden = true;
        $('startNoMic').hidden = true;
        $('start').hidden = false;
    } else {
        $('startNoMic').hidden = false;
    }
};
$('start').onclick = begin;
$('startNoMic').onclick = () => begin();
addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); drop(); } });
cv.addEventListener('pointerdown', drop);

// ---- loop ----
let prev = performance.now();
function frame(now) {
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    pollMic(now);
    if (state === 'play' && cur) {
        if (cur.target !== undefined) {
            const t = songTime();
            if (cur.cx + (cur.target - t) * speed + cur.w < 0) cur.target += BAR; // missed: wait for next bar
            cur.x = cur.cx + (cur.target - t) * speed;
        } else {
            cur.x -= speed * dt;
            if (cur.x + cur.w < 0) cur.x = W;
        }
    }
    updateBeats();
    for (const f of falling) { f.vy += 1800 * dt; f.y += f.vy * dt; }
    falling = falling.filter(f => f.y < H * 2);
    if (tower) {
        const targetCam = Math.max(0, (tower.length - 6) * BLOCK_H);
        camY += (targetCam - camY) * Math.min(1, dt * 5);
    }
    draw();
    requestAnimationFrame(frame);
}

function updateBeats() {
    const dots = $('beats').children;
    let beat = -1;
    if (state === 'play' && musicReady) {
        const st = songTime();
        if (st >= 0) beat = Math.floor((st % BAR) / BEAT);
    }
    for (let i = 0; i < 4; i++) dots[i].classList.toggle('on', i === beat);
}

function block(x, y, w, i, a = 1) {
    ctx.globalAlpha = a;
    ctx.fillStyle = `hsl(${hue(i)},70%,55%)`;
    ctx.fillRect(x, y, w, BLOCK_H - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x, y, w, 6);
    ctx.globalAlpha = 1;
}

function draw() {
    ctx.fillStyle = '#12172b';
    ctx.fillRect(0, 0, W, H);
    if (!tower) return;
    const baseY = H - 60 + camY;
    ctx.fillStyle = '#2b3358';
    ctx.fillRect(0, H - 24 + camY, W, 200);
    for (const b of tower) block(b.x, baseY - b.i * BLOCK_H, b.w, b.i);
    for (const f of falling) block(f.x, baseY - f.i * BLOCK_H + f.y, f.w, f.i, 0.8);
    if (state === 'play' && musicReady) {
        const st = songTime();
        if (st < 0 && st >= -4 * BEAT) {
            const n = Math.ceil(-st / BEAT), frac = 1 - ((-st) % BEAT) / BEAT;
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.font = 'bold ' + Math.round(H * 0.3 * (1 + 0.25 * (1 - frac))) + 'px Arial';
            ctx.fillText(n, W / 2, H * 0.42);
        }
    }
    if (cur) {
        block(cur.x, baseY - cur.i * BLOCK_H, cur.w, cur.i);
        const t = tower[tower.length - 1];
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(t.x, 0); ctx.lineTo(t.x, H);
        ctx.moveTo(t.x + t.w, 0); ctx.lineTo(t.x + t.w, H);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}
requestAnimationFrame(frame);
