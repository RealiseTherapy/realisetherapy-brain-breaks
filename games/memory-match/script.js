// Game state
let gameState = {
    cards: [],
    flipped: [],
    matched: [],
    moves: 0,
    hintCount: 3,
    isProcessing: false,
    difficulty: 'medium',
    teams: [],
    currentTeamIndex: 0,
    teamScores: {}
};

// Emoji sets for different themes
const emojiSets = {
    animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔'],
    nature: ['🌻', '🌹', '🌺', '🌸', '🌼', '🌷', '🌲', '🌳', '🌴', '🌱', '🍀', '🌾', '🌿', '☘️', '🍃', '🍂'],
    food: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥥', '🥑', '🍕', '🍪', '🍰'],
    sports: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🏒', '🏑', '⛳', '🎿', '🏂']
};

const teamColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E2', '#F8B88B', '#85E7D7'
];

const difficultySettings = {
    easy: 8,
    medium: 12,
    hard: 16
};

// Initialize team setup screen
function initSetupScreen() {
    updateTeamDisplay();
    
    document.getElementById('decreaseTeamsBtn').addEventListener('click', decreaseTeams);
    document.getElementById('increaseTeamsBtn').addEventListener('click', increaseTeams);
    document.getElementById('startGameBtn').addEventListener('click', startGame);
}

// Update team count display
function updateTeamDisplay() {
    const teamCount = parseInt(document.getElementById('teamCount').textContent);
    gameState.teams = [];
    gameState.teamScores = {};

    for (let i = 1; i <= teamCount; i++) {
        const teamName = `Team ${i}`;
        gameState.teams.push(teamName);
        gameState.teamScores[teamName] = 0;
    }

    // Render team list
    const teamList = document.getElementById('teamList');
    teamList.innerHTML = '';
    
    gameState.teams.forEach((team, index) => {
        const teamItem = document.createElement('div');
        teamItem.className = 'team-item';
        teamItem.textContent = team;
        teamItem.style.borderLeftColor = teamColors[index % teamColors.length];
        teamList.appendChild(teamItem);
    });

    // Update button states
    document.getElementById('decreaseTeamsBtn').disabled = gameState.teams.length <= 1;
    document.getElementById('increaseTeamsBtn').disabled = gameState.teams.length >= 10;
}

// Decrease number of teams
function decreaseTeams() {
    const teamCountEl = document.getElementById('teamCount');
    const currentCount = parseInt(teamCountEl.textContent);
    if (currentCount > 1) {
        teamCountEl.textContent = currentCount - 1;
        updateTeamDisplay();
    }
}

// Increase number of teams
function increaseTeams() {
    const teamCountEl = document.getElementById('teamCount');
    const currentCount = parseInt(teamCountEl.textContent);
    if (currentCount < 10) {
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
    gameState.hintCount = 3;
    gameState.isProcessing = false;

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
    document.getElementById('gameScreen').style.display = 'block';

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
            card.textContent = '❓';
        }

        if (gameState.matched.includes(index)) {
            card.classList.add('matched');
            card.disabled = true;
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
    let maxScore = Math.max(...Object.values(gameState.teamScores));
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
        }

        card.innerHTML = `
            <div class="team-name">${team}</div>
            <div class="team-score">${gameState.teamScores[team]}</div>
        `;
        card.style.borderColor = teamColors[index % teamColors.length];
        scoreboard.appendChild(card);
    });

    // Update current team indicator
    const indicator = document.getElementById('currentTeamIndicator');
    const currentTeam = gameState.teams[gameState.currentTeamIndex];
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

// Show a hint
function showHint() {
    if (gameState.hintCount <= 0) {
        alert('No more hints available!');
        return;
    }

    // Find an unmatched card and flip it temporarily
    const unmatchedCards = gameState.cards
        .map((_, i) => i)
        .filter(i => !gameState.matched.includes(i) && !gameState.flipped.includes(i));

    if (unmatchedCards.length > 0) {
        const hintIndex = unmatchedCards[Math.floor(Math.random() * unmatchedCards.length)];
        gameState.flipped.push(hintIndex);
        gameState.hintCount--;
        document.getElementById('hintBtn').textContent = `Hint (${gameState.hintCount} left)`;
        document.getElementById('hintBtn').disabled = gameState.hintCount <= 0;
        renderBoard();

        setTimeout(() => {
            gameState.flipped = gameState.flipped.filter(i => i !== hintIndex);
            renderBoard();
        }, 1000);
    }
}

// Reset to setup screen
function resetToSetup() {
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('setupScreen').style.display = 'flex';
}

// Event Listeners
document.getElementById('resetBtn').addEventListener('click', resetToSetup);
document.getElementById('hintBtn').addEventListener('click', showHint);

// Initialize on page load
window.addEventListener('load', initSetupScreen);
