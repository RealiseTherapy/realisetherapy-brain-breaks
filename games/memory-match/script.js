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

    for (let i = 1; i <= teamCount; i++) {
        const teamName = `Team ${i}`;
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
    gameState.teams = gameState.teams.length ? gameState.teams : ['Team 1', 'Team 2'];

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

        if (gameState.flipped.includes(index) || gameState.matched.includes(index)) {
            card.textContent = emoji;
            card.classList.add('flipped');
        } else {
            card.textContent = index + 1;
        }

        if (gameState.matched.includes(index)) {
            card.classList.add('matched');
            card.disabled = true;
            const teamIndex = gameState.cardTeams[index];
            if (teamIndex !== undefined) {
                card.style.backgroundColor = teamColors[teamIndex % teamColors.length];
                card.style.backgroundImage = 'none';
            }
        }

        card.addEventListener('click', () => flipCard(index));
        board.appendChild(card);
    });
}

function flipCard(index) {
    if (gameState.flipped.includes(index) || gameState.matched.includes(index) || gameState.isProcessing) {
        return;
    }

    gameState.flipped.push(index);
    renderBoard();

    if (gameState.flipped.length === 2) {
        gameState.isProcessing = true;
        checkMatch();
    }
}

function checkMatch() {
    const [first, second] = gameState.flipped;
    const isMatch = gameState.cards[first] === gameState.cards[second];

    setTimeout(() => {
        if (isMatch) {
            gameState.matched.push(first, second);
            const currentTeam = gameState.teams[gameState.currentTeamIndex];
            gameState.teamScores[currentTeam]++;
            gameState.cardTeams[first] = gameState.currentTeamIndex;
            gameState.cardTeams[second] = gameState.currentTeamIndex;

            if (gameState.matched.length === gameState.cards.length) {
                setTimeout(() => {
                    announceWinner();
                }, 300);
            }
        }

        // Increment moves once per turn, then rotate to next team
        gameState.moves++;
        gameState.currentTeamIndex = (gameState.currentTeamIndex + 1) % gameState.teams.length;
        gameState.flipped = [];
        gameState.isProcessing = false;
        updateGameInfo();
        updateScoreboard();
        renderBoard();
    }, 1000);
}

function announceWinner() {
    const scores = Object.values(gameState.teamScores);
    if (!scores.length) return;

    let maxScore = Math.max(...scores);
    let winners = Object.entries(gameState.teamScores)
        .filter(([_, score]) => score === maxScore)
        .map(([team, _]) => team);

    let message = '🎉 Game Over! 🎉\n\n';
    
    if (winners.length === 1) {
        message += `${winners[0]} wins! 🏆\n`;
    } else {
        message += `It's a tie between:\n${winners.join(', ')}\n`;
    }

    message += `\nFinal Scores:\n`;
    gameState.teams.forEach(team => {
        message += `${team}: ${gameState.teamScores[team]} pairs\n`;
    });

    message += `\nTotal Moves: ${gameState.moves}`;

    alert(message);
    resetToSetup();
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
window.addEventListener('load', initSetupScreen);
