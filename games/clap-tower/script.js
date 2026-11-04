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

// ---- rhythm: 110 BPM in 4/4, ideal clap on beat 1 of each bar ----
const BPM = 110, BAR = 4 * 60 / BPM;
const music = new Audio();
music.loop = true;
let musicReady = false, loops = 0, lastCT = 0;

function songTime() {
    if (music.currentTime < lastCT - 0.5) loops++;
    lastCT = music.currentTime;
    return loops * (music.duration || 0) + music.currentTime;
}
const offsetSec = () => +$('offset').value || 0;
const nextDown = t => offsetSec() + Math.ceil((t - offsetSec()) / BAR - 1e-9) * BAR;

function loadTrack(src, name) {
    music.src = src;
    music.load();
    musicReady = true;
    $('trackStatus').textContent = 'Backing track: ' + name + ' (clap on beat 1!)';
}
$('track').onchange = e => {
    const f = e.target.files[0];
    if (f) loadTrack(URL.createObjectURL(f), f.name);
};
// Auto-load games/clap-tower/beat.mp3 if it has been added to the repo
fetch('beat.mp3', { method: 'HEAD' }).then(r => { if (r.ok) loadTrack('beat.mp3', 'beat.mp3'); }).catch(() => {});

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
        cur.cx = top.x + top.w / 2 - w / 2;
        // first block waits until one full loop of the track has played
        const earliest = Math.max(t + (W - cur.cx) / speed, top.i === 0 ? (music.duration || 0) : 0);
        cur.target = nextDown(earliest);
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
    music.pause();
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

function begin() {
    $('overlay').classList.add('hide');
    music.pause();
    music.currentTime = 0; loops = 0; lastCT = 0; env = 0;
    reset();
    state = 'play';
    if (musicReady) music.play().catch(() => {});
}

// ---- microphone ----
let audioCtx = null, analyser = null, buf = null, micOn = false, lastClap = 0, baseline = 0.01, env = 0;

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
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
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
        const p = (((songTime() - offsetSec()) % BAR) + BAR) % BAR;
        beat = Math.floor(p / (BAR / 4));
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
    if (cur && cur.target !== undefined && tower.length === 1 && cur.target - songTime() > 0.05 && cur.x > W) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🎧 Listen to the beat… clap on 1!', W / 2, H / 3);
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
