// Game state
let gameState = {
    cards: [],
    flipped: [],
    matched: [],
    moves: 0,
    score: 0,
    hintCount: 3,
    isProcessing: false,
    difficulty: 'medium'
};

// Emoji sets for different themes
const emojiSets = {
    animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔'],
    nature: ['🌻', '🌹', '🌺', '🌸', '🌼', '🌷', '🌲', '🌳', '🌴', '🌱', '🍀', '🌾', '🌿', '☘️', '🍃', '🍂'],
    food: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥥', '🥑', '🍕', '🍪', '🍰'],
    sports: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🏒', '🏑', '⛳', '🎿', '🏂']
};

const difficultySettings = {
    easy: 8,
    medium: 12,
    hard: 16
};

// Initialize game
function init() {
    gameState.difficulty = document.getElementById('difficulty').value;
    const pairCount = difficultySettings[gameState.difficulty];
    
    gameState.cards = [];
    gameState.flipped = [];
    gameState.matched = [];
    gameState.moves = 0;
    gameState.score = 0;
    gameState.hintCount = 3;
    gameState.isProcessing = false;

    // Generate card pairs with random emoji set
    const emojiSet = Object.values(emojiSets)[Math.floor(Math.random() * Object.keys(emojiSets).length)];
    const selectedEmojis = emojiSet.slice(0, pairCount);
    
    gameState.cards = [...selectedEmojis, ...selectedEmojis].sort(() => Math.random() - 0.5);

    updateStats();
    renderBoard();
    updateHintButton();
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
    updateStats();
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
            // Match found!
            gameState.matched.push(first, second);
            gameState.score += 10;

            // Check if game is won
            if (gameState.matched.length === gameState.cards.length) {
                setTimeout(() => {
                    alert(`🎉 You won!\n\nScore: ${gameState.score}\nMoves: ${gameState.moves}\n\nWell done! 👏`);
                }, 300);
            }
        }

        gameState.flipped = [];
        gameState.isProcessing = false;
        updateStats();
        renderBoard();
    }, 1000);
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
        updateHintButton();
        renderBoard();

        setTimeout(() => {
            gameState.flipped = gameState.flipped.filter(i => i !== hintIndex);
            renderBoard();
        }, 1000);
    }
}

// Update statistics display
function updateStats() {
    document.getElementById('moves').textContent = gameState.moves;
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('matches').textContent = gameState.matched.length / 2;
}

// Update hint button text
function updateHintButton() {
    const hintBtn = document.getElementById('hintBtn');
    hintBtn.textContent = `Hint (${gameState.hintCount} left)`;
    hintBtn.disabled = gameState.hintCount <= 0;
}

// Event Listeners
document.getElementById('resetBtn').addEventListener('click', init);
document.getElementById('hintBtn').addEventListener('click', showHint);
document.getElementById('difficulty').addEventListener('change', init);

// Initialize on page load
window.addEventListener('load', init);
