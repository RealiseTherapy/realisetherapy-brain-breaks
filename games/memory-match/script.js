// Game state
let gameState = {
    cards: [],
    flipped: [],
    matched: [],
    moves: 0,
    isProcessing: false,
    difficulty: 'easy',
    teams: [],
    currentTeamIndex: 0,
    teamScores: {},
    cardTeams: {} // Track which team found each card
};

// Emoji sets for different themes
const emojiSets = {
    animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔'],
    nature: ['🌻', '🌹', '🌺', '🌸', '🌼', '🌷', '🌲', '🌳', '🌴', '🌱', '🍀', '🌾', '🌿', '☘️', '🍃', '🍂'],
    food: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥥', '🥑', '🍕', '🍪', '🍰'],
    sports: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🏒', '🏑', '⛳', '🎿', '🏂']
};

const teamColors = [
    '#D62828', // red
    '#2563EB', // blue
    '#16A34A', // green
    '#FACC15', // yellow
    '#9333EA', // purple
    '#F97316', // orange
    '#14B8A6', // teal
    '#7F1D1D'  // maroon
];

const teamNames = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Teal', 'Maroon'];

// Each team has its own match sound (synthesised, no audio files needed)
const teamSounds = [
    { type: 'sine',     notes: [523, 659, 784],       step: 0.12, volume: 0.25 }, // Team 1: bright rising arpeggio
    { type: 'triangle', notes: [440, 554],            step: 0.18, volume: 0.14 }, // Team 2: softened pleasant two-tone
    { type: 'triangle', notes: [659, 784, 988, 1318], step: 0.09, volume: 0.25 }, // Team 3: fast sparkle
    { type: 'sawtooth', notes: [330, 440, 330, 440],  step: 0.12, volume: 0.08 }, // Team 4: buzzy wobble
    { type: 'sine',     notes: [880, 1175],           step: 0.20, volume: 0.25 }, // Team 5: bell ding
    { type: 'square',   notes: [262, 330, 392, 523],  step: 0.10, volume: 0.10 }, // Team 6: arcade climb
    { type: 'triangle', notes: [988, 784, 988],       step: 0.14, volume: 0.25 }, // Team 7: playful bounce
    { type: 'sawtooth', notes: [196, 147],            step: 0.22, volume: 0.08 }  // Team 8: deep drop
];

let audioCtx = null;

function playTeamSound(teamIndex) {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        if (!audioCtx) audioCtx = new AudioContextClass();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const sound = teamSounds[teamIndex % teamSounds.length];
        const start = audioCtx.currentTime + 0.02;

        sound.notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            const t = start + i * sound.step;
            const dur = sound.step * 1.6;

            osc.type = sound.type;
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(sound.volume, t + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(t);
            osc.stop(t + dur + 0.02);
        });
    } catch (e) {
        // Sound is a bonus; never break the game if audio fails
    }
}

// Subtle pop sound when a card is clicked/flipped
function playCardFlipSound() {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        if (!audioCtx) audioCtx = new AudioContextClass();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const now = audioCtx.currentTime + 0.001;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(680, now);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.06);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.045, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
    } catch (e) {
        // No-op if audio isn't available
    }
}

// Float matched cards up, then fly them into the scoring team's score box
function flyCardsToScore(indices, teamIndex) {
    const board = document.getElementById('gameBoard');
    const scoreboard = document.getElementById('scoreboard');
    const target = scoreboard.children[teamIndex];
    const animations = [];

    if (!target || !board || typeof Element.prototype.animate !== 'function') {
        return Promise.resolve();
    }

    const targetRect = target.getBoundingClientRect();
    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;

    indices.forEach(index => {
        const original = board.children[index];
        if (!original) return;

        const rect = original.getBoundingClientRect();
        const clone = original.cloneNode(true);
        clone.style.position = 'fixed';
        clone.style.left = rect.left + 'px';
        clone.style.top = rect.top + 'px';
        clone.style.width = rect.width + 'px';
        clone.style.height = rect.height + 'px';
        clone.style.margin = '0';
        clone.style.zIndex = '1000';
        clone.style.pointerEvents = 'none';
        clone.style.transition = 'none';
        clone.style.backgroundColor = teamColors[teamIndex % teamColors.length];
        clone.style.backgroundImage = 'none';
        document.body.appendChild(clone);

        original.style.visibility = 'hidden';

        const dx = targetX - (rect.left + rect.width / 2);
        const dy = targetY - (rect.top + rect.height / 2);

        const anim = clone.animate([
            { transform: 'translate(0px, 0px) scale(1)', opacity: 1, offset: 0 },
            { transform: 'translate(0px, -30px) scale(1.15)', opacity: 1, offset: 0.35 },
            { transform: `translate(${dx}px, ${dy}px) scale(0.2)`, opacity: 0, offset: 1 }
        ], {
            duration: 900,
            easing: 'ease-in-out',
            fill: 'forwards'
        });

        animations.push(anim.finished.catch(() => {}).then(() => clone.remove()));
    });

    return Promise.all(animations);
}

const difficultySettings = {
    easy: 8,
    medium: 12,
    hard: 16
};

// Initialize team setup screen
function initSetupScreen() {
    const difficultySelect = document.getElementById('difficulty');
    if (difficultySelect) {
        difficultySelect.value = 'easy';
    }
    
    updateTeamDisplay();
    
    document.getElementById('decreaseTeamsBtn').addEventListener('click', decreaseTeams);
    document.getElementById('increaseTeamsBtn').addEventListener('click', increaseTeams);
    document.getElementById('startGameBtn').addEventListener('click', startGame);
}

// Update team count display
function updateTeamDisplay() {
    const teamCountEl = document.getElementById('teamCount');
    const teamCount = parseInt(teamCountEl ? teamCountEl.textContent : '2', 10) || 2;
    gameState.teams = [];
    gameState.teamScores = {};

    for (let i = 0; i < teamCount; i++) {
        const teamName = teamNames[i];
        gameState.teams.push(teamName);
        gameState.teamScores[teamName] = 0;
    }

    const teamList = document.getElementById('teamList');
    if (teamList) {
        teamList.innerHTML = '';
    }
    
    gameState.teams.forEach((team, index) => {
        const teamItem = document.createElement('div');
        teamItem.className = 'team-item';
        teamItem.textContent = team;
        teamItem.style.borderLeftColor = teamColors[index % teamColors.length];
        if (teamList) teamList.appendChild(teamItem);
    });

    const decreaseBtn = document.getElementById('decreaseTeamsBtn');
    const increaseBtn = document.getElementById('increaseTeamsBtn');
    if (decreaseBtn) decreaseBtn.disabled = gameState.teams.length <= 1;
    if (increaseBtn) increaseBtn.disabled = gameState.teams.length >= 8;
}

function decreaseTeams() {
    const teamCountEl = document.getElementById('teamCount');
    const currentCount = parseInt(teamCountEl.textContent, 10) || 2;
    if (currentCount > 1) {
        teamCountEl.textContent = currentCount - 1;
        updateTeamDisplay();
    }
}

function increaseTeams() {
    const teamCountEl = document.getElementById('teamCount');
    const currentCount = parseInt(teamCountEl.textContent, 10) || 2;
    if (currentCount < 8) {
        teamCountEl.textContent = currentCount + 1;
        updateTeamDisplay();
    }
}

function startGame() {
    gameState.difficulty = document.getElementById('difficulty').value;
    gameState.currentTeamIndex = 0;
    gameState.moves = 0;
    gameState.flipped = [];
    gameState.matched = [];
    gameState.isProcessing = false;
    gameState.cardTeams = {};
    gameState.teams = gameState.teams.length ? gameState.teams : teamNames.slice(0, 2);

    gameState.teams.forEach(team => {
        gameState.teamScores[team] = 0;
    });

    const pairCount = difficultySettings[gameState.difficulty];
    const emojiSet = Object.values(emojiSets)[Math.floor(Math.random() * Object.keys(emojiSets).length)];
    const selectedEmojis = emojiSet.slice(0, pairCount);
    gameState.cards = [...selectedEmojis, ...selectedEmojis].sort(() => Math.random() - 0.5);

    document.getElementById('setupScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'flex';

    renderBoard();
    updateScoreboard();
    updateGameInfo();
}

function renderBoard() {
    const board = document.getElementById('gameBoard');
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${Math.ceil(Math.sqrt(gameState.cards.length))}, 1fr)`;

    gameState.cards.forEach((emoji, index) => {
        const card = document.createElement('button');
        card.className = 'card';
        card.dataset.index = index;

        if (gameState.matched.includes(index)) {
            // Matched cards have flown into their team's score; keep the empty slot
            card.textContent = emoji;
            card.classList.add('matched');
            card.disabled = true;
            card.style.visibility = 'hidden';
        } else if (gameState.flipped.includes(index)) {
            card.textContent = emoji;
            card.classList.add('flipped');
        } else {
            card.textContent = index + 1;
        }

        card.addEventListener('click', () => flipCard(index));
        board.appendChild(card);
    });
}

function flipCard(index) {
    if (gameState.flipped.includes(index) || gameState.matched.includes(index) || gameState.isProcessing) {
        return;
    }

    playCardFlipSound();

    gameState.flipped.push(index);
    renderBoard();

    if (gameState.flipped.length === 2) {
        gameState.isProcessing = true;
        checkMatch();
    }
}

function finishTurn(wasMatch) {
    // Increment moves once per completed guess pair
    gameState.moves++;

    // Only rotate to next team when guess is incorrect.
    // If it was a match, current team gets another turn.
    if (!wasMatch) {
        gameState.currentTeamIndex = (gameState.currentTeamIndex + 1) % gameState.teams.length;
    }

    gameState.flipped = [];
    gameState.isProcessing = false;
    updateGameInfo();
    updateScoreboard();
    renderBoard();

    if (gameState.cards.length && gameState.matched.length === gameState.cards.length) {
        setTimeout(announceWinner, 300);
    }
}

function checkMatch() {
    const [first, second] = gameState.flipped;
    const isMatch = gameState.cards[first] === gameState.cards[second];

    setTimeout(() => {
        if (isMatch) {
            const teamIndex = gameState.currentTeamIndex;
            const currentTeam = gameState.teams[teamIndex];

            gameState.matched.push(first, second);
            gameState.teamScores[currentTeam]++;
            gameState.cardTeams[first] = teamIndex;
            gameState.cardTeams[second] = teamIndex;

            // This team's own sound, plus cards float up into their score
            playTeamSound(teamIndex);
            flyCardsToScore([first, second], teamIndex).then(() => finishTurn(true));
        } else {
            finishTurn(false);
        }
    }, 1000);
}

function announceWinner() {
    if (!gameState.teams.length) return;

    const standings = gameState.teams
        .map((team, index) => ({ team, score: gameState.teamScores[team], index }))
        .sort((a, b) => b.score - a.score || a.index - b.index);
    const highestScore = standings[0].score;
    const winnerCount = standings.filter(team => team.score === highestScore).length;
    const podiumTitle = document.getElementById('podiumTitle');
    const podiumSubtitle = document.getElementById('podiumSubtitle');
    const podiumResults = document.getElementById('podiumResults');

    podiumTitle.textContent = winnerCount > 1 ? "It's a tie!" : `${standings[0].team} wins!`;
    podiumSubtitle.textContent = `Final scores · ${gameState.moves} total moves`;
    podiumResults.innerHTML = '';

    let place = 0;
    standings.forEach((result, index) => {
        if (index === 0 || result.score < standings[index - 1].score) {
            place = index + 1;
        }

        const row = document.createElement('li');
        row.className = 'podium-result';
        if (result.score === highestScore) row.classList.add('podium-winner');

        const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : place === 3 ? '🥉' : '';
        const placeLabel = place === 1 ? '1st' : place === 2 ? '2nd' : place === 3 ? '3rd' : `${place}th`;
        row.innerHTML = `
            <span class="podium-place">${medal || placeLabel}</span>
            <span class="podium-team">${result.team}${result.score === highestScore ? '<span class="podium-winner-label">Winner</span>' : ''}</span>
            <span class="podium-points">${result.score} ${result.score === 1 ? 'point' : 'points'}</span>
        `;
        podiumResults.appendChild(row);
    });

    document.getElementById('podiumScreen').hidden = false;
    showPodiumConfetti();
}

function showPodiumConfetti() {
    const confetti = document.getElementById('podiumConfetti');
    const colors = ['#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#ffffff', '#9b5de5'];
    confetti.innerHTML = '';

    for (let i = 0; i < 70; i++) {
        const piece = document.createElement('span');
        piece.className = 'confetti-piece';
        piece.style.left = `${Math.random() * 100}%`;
        piece.style.setProperty('--confetti-color', colors[i % colors.length]);
        piece.style.setProperty('--confetti-drift', `${Math.random() * 180 - 90}px`);
        piece.style.animationDelay = `${Math.random() * 1.8}s`;
        piece.style.animationDuration = `${2.8 + Math.random() * 2.2}s`;
        piece.addEventListener('animationend', () => piece.remove(), { once: true });
        confetti.appendChild(piece);
    }
}

function updateScoreboard() {
    const scoreboard = document.getElementById('scoreboard');
    scoreboard.innerHTML = '';

    gameState.teams.forEach((team, index) => {
        const color = teamColors[index % teamColors.length];
        const card = document.createElement('div');
        card.className = 'team-score-card';
        if (index === gameState.currentTeamIndex) {
            card.classList.add('active');
        }

        card.innerHTML = `
            <div class="team-name">${team}</div>
            <div class="team-score">${gameState.teamScores[team]}</div>
        `;
        // Styling (filled vs. white) is handled in CSS via --team-color
        card.style.setProperty('--team-color', color);
        scoreboard.appendChild(card);
    });

    const indicator = document.getElementById('currentTeamIndicator');
    const currentTeam = gameState.teams[gameState.currentTeamIndex];
    if (!currentTeam) {
        indicator.innerHTML = '';
        return;
    }

    indicator.innerHTML = `
        <div class="current-team-text">Current Team</div>
        <div class="current-team-name" style="color: ${teamColors[gameState.currentTeamIndex % teamColors.length]}">${currentTeam}</div>
    `;
}

function updateGameInfo() {
    document.getElementById('moves').textContent = gameState.moves;
    document.getElementById('matches').textContent = gameState.matched.length / 2;
}

function resetToSetup() {
    document.getElementById('podiumScreen').hidden = true;
    document.getElementById('podiumConfetti').innerHTML = '';
    const gameScreen = document.getElementById('gameScreen');
    const setupScreen = document.getElementById('setupScreen');
    if (gameScreen) gameScreen.style.display = 'none';
    if (setupScreen) setupScreen.style.display = 'flex';
    gameState.flipped = [];
    gameState.matched = [];
    gameState.cards = [];
    gameState.moves = 0;
    gameState.isProcessing = false;
    gameState.cardTeams = {};
    updateGameInfo();
}

document.getElementById('resetBtn').addEventListener('click', resetToSetup);
document.getElementById('playAgainBtn').addEventListener('click', resetToSetup);
window.addEventListener('load', initSetupScreen);
