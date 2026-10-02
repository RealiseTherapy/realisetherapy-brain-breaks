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
    // Set default difficulty to easy
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

    // Render team list
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

    // Update button states
    const decreaseBtn = document.getElementById('decreaseTeamsBtn');
    const increaseBtn = document.getElementById('increaseTeamsBtn');
    if (decreaseBtn) decreaseBtn.disabled = gameState.teams.length <= 1;
    if (increaseBtn) increaseBtn.disabled = gameState.teams.length >= 8;
}

// Decrease number of teams
function decreaseTeams() {
    const teamCountEl = document.getElementById('teamCount');
    const currentCount = parseInt(teamCountEl.textContent, 10) || 2;
    if (currentCount > 1) {
        teamCountEl.textContent = currentCount - 1;
        updateTeamDisplay();
    }
}

// Increase number of teams
function increaseTeams() {
    const teamCountEl = document.getElementById('teamCount');
    const currentCount = parseInt(teamCountEl.textContent, 10) || 2;
    if (currentCount < 8) {
        teamCountEl.textContent = currentCount + 1;
        updateTeamDisplay();
    }
}

// Start the game
function startGame() {
    gameState.difficulty = document.getElementById('difficulty').value;
    gameState.currentTeamIndex = 0;
    gameState.moves = 0;
    gameState.flipped = [];
    gameState.matched = [];
    gameState.isProcessing = false;
    gameState.cardTeams = {};
    gameState.teams = gameState.teams.length ? gameState.teams : ['Team 1', 'Team 2'];

    // Reset team scores
    gameState.teams.forEach(team => {
        gameState.teamScores[team] = 0;
    });

    // Generate cards
    const pairCount = difficultySettings[gameState.difficulty];
    const emojiSet = Object.values(emojiSets)[Math.floor(Math.random() * Object.keys(emojiSets).length)];
    const selectedEmojis = emojiSet.slice(0, pairCount);
    gameState.cards = [...selectedEmojis, ...selectedEmojis].sort(() => Math.random() - 0.5);

    // Switch screens
    document.getElementById('setupScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'flex';

    renderBoard();
    updateScoreboard();
    updateGameInfo();
}

// Render the game board
function renderBoard() {
    const board = document.getElementById('gameBoard');
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${Math.ceil(Math.sqrt(gameState.cards.length))}, 1fr)`;

    gameState.cards.forEach((emoji, index) => {
        const card = document.createElement('button');
        card.className = 'card';
        card.dataset.index = index;

        // Show emoji if flipped or matched
        if (gameState.flipped.includes(index) || gameState.matched.includes(index)) {
            card.textContent = emoji;
            card.classList.add('flipped');
        } else {
            // Show card number instead of question mark
            card.textContent = index + 1;
        }

        if (gameState.matched.includes(index)) {
            card.classList.add('matched');
            card.disabled = true;
            
            // Apply the team color that found this card
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

// Flip a card
function flipCard(index) {
    // Prevent flipping if already flipped, matched, or currently processing
    if (gameState.flipped.includes(index) || gameState.matched.includes(index) || gameState.isProcessing) {
        return;
    }

    gameState.flipped.push(index);
    gameState.moves++;
    updateGameInfo();
    renderBoard();

    // Check if we have 2 cards flipped
    if (gameState.flipped.length === 2) {
        gameState.isProcessing = true;
        checkMatch();
    }
}

// Check if two flipped cards match
function checkMatch() {
    const [first, second] = gameState.flipped;
    const isMatch = gameState.cards[first] === gameState.cards[second];

    setTimeout(() => {
        if (isMatch) {
            // Match found! Current team scores
            gameState.matched.push(first, second);
            const currentTeam = gameState.teams[gameState.currentTeamIndex];
            gameState.teamScores[currentTeam]++;
            
            // Track which team found these cards
            gameState.cardTeams[first] = gameState.currentTeamIndex;
            gameState.cardTeams[second] = gameState.currentTeamIndex;

            // Check if game is won
            if (gameState.matched.length === gameState.cards.length) {
                setTimeout(() => {
                    announceWinner();
                }, 300);
            }
        } else {
            // No match, switch to next team
            gameState.currentTeamIndex = (gameState.currentTeamIndex + 1) % gameState.teams.length;
        }

        gameState.flipped = [];
        gameState.isProcessing = false;
        updateGameInfo();
        updateScoreboard();
        renderBoard();
    }, 1000);
}

// Announce the winner
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

// Update scoreboard display
function updateScoreboard() {
    const scoreboard = document.getElementById('scoreboard');
    scoreboard.innerHTML = '';

    gameState.teams.forEach((team, index) => {
        const card = document.createElement('div');
        card.className = 'team-score-card';
        if (index === gameState.currentTeamIndex) {
            card.classList.add('active');
            card.style.backgroundColor = teamColors[index % teamColors.length];
        }

        card.innerHTML = `
            <div class="team-name">${team}</div>
            <div class="team-score">${gameState.teamScores[team]}</div>
        `;
        card.style.borderColor = teamColors[index % teamColors.length];
        card.style.borderWidth = '8px';
        scoreboard.appendChild(card);
    });

    // Update current team indicator
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

// Update game info display
function updateGameInfo() {
    document.getElementById('moves').textContent = gameState.moves;
    document.getElementById('matches').textContent = gameState.matched.length / 2;
}

// Reset to setup screen
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

// Event Listeners
document.getElementById('resetBtn').addEventListener('click', resetToSetup);

// Initialize on page load
window.addEventListener('load', initSetupScreen);
