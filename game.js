const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreSpan = document.getElementById('score');
const comboSpan = document.getElementById('combo');
const timeSpan = document.getElementById('time');
// const retryButton = document.getElementById('retry-button'); // Removed from top-bar
const startButton = document.getElementById('start-button');
const gameOverlay = document.getElementById('game-overlay');
const infoPanel = document.getElementById('info-panel');

// New overlay elements
const overlayTitle = document.getElementById('overlay-title');
const overlayMessage = document.getElementById('overlay-message');
const overlayRetryButton = document.getElementById('overlay-retry-button');

// Sound elements
const successSound = document.getElementById('success-sound');
const failSound = document.getElementById('fail-sound');
const gameoverSound = document.getElementById('gameover-sound');

// --- Game State ---
const gameState = {
    score: 0,
    combo: 0,
    gameTime: 30,
    farmGrid: [],
    gridSize: 5,
    cellSize: 96,
    firstSelection: null,
    timeSinceLastUpdate: 0,
    updateInterval: 1000,
    currentScreen: 'start', // 'start', 'playing', 'gameOver'
    animationFrameId: null,
};

// --- Game Data ---
const crops = {
    'Turnip': { growthTime: 2, harvestValue: 10, icon: 'T', growthIcon: 't' },
    'Apple': { growthTime: 3, harvestValue: 20, icon: 'A', growthIcon: 'a' },
    'Pumpkin': { growthTime: 4, harvestValue: 30, icon: 'P', growthIcon: 'p' },
};
const cropTypes = Object.keys(crops);

// --- Game Logic ---

function initializeGameState() {
    gameState.score = 0;
    gameState.combo = 0;
    gameState.gameTime = 30;
    gameState.firstSelection = null;
    gameState.farmGrid = [];
    for (let y = 0; y < gameState.gridSize; y++) {
        const row = [];
        for (let x = 0; x < gameState.gridSize; x++) {
            row.push({ crop: null, growth: 0 });
        }
        gameState.farmGrid.push(row);
    }
    for(let i = 0; i < gameState.gridSize * gameState.gridSize - 5; i++) {
        spawnRandomCrop();
    }
}

function startGame() {
    initializeGameState();
    gameState.currentScreen = 'playing';
    lastTime = 0; // Reset time for game loop
}

function spawnRandomCrop() {
    const emptyCells = [];
    for (let y = 0; y < gameState.gridSize; y++) {
        for (let x = 0; x < gameState.gridSize; x++) {
            if (gameState.farmGrid[y][x].crop === null) {
                emptyCells.push({x, y});
            }
        }
    }

    if (emptyCells.length > 0) {
        const {x, y} = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const randomCrop = cropTypes[Math.floor(Math.random() * cropTypes.length)];
        gameState.farmGrid[y][x] = { crop: randomCrop, growth: 0 };
    }
}

function handleCellClick(gridX, gridY) {
    if (gameState.currentScreen !== 'playing') return;

    const cell = gameState.farmGrid[gridY][gridX];
    if (!cell || !cell.crop) return;

    const cropInfo = crops[cell.crop];
    const isMature = cell.growth >= cropInfo.growthTime;

    if (!isMature) {
        pairFail();
        return;
    }

    if (!gameState.firstSelection) {
        gameState.firstSelection = { x: gridX, y: gridY };
    } else {
        const firstCell = gameState.farmGrid[gameState.firstSelection.y][gameState.firstSelection.x];
        if (firstCell.crop === cell.crop && (gameState.firstSelection.x !== gridX || gameState.firstSelection.y !== gridY)) {
            pairSuccess(gridX, gridY);
        } else {
            pairFail();
        }
    }
}

function pairSuccess(x2, y2) {
    const { x: x1, y: y1 } = gameState.firstSelection;
    const cell1 = gameState.farmGrid[y1][x1];
    const cell2 = gameState.farmGrid[y2][x2];
    const cropInfo = crops[cell1.crop];

    gameState.score += cropInfo.harvestValue * (gameState.combo + 1);
    gameState.combo++;

    cell1.crop = null; cell1.growth = 0;
    cell2.crop = null; cell2.growth = 0;

    spawnRandomCrop();
    spawnRandomCrop();

    gameState.firstSelection = null;
    successSound.play();
}

function pairFail() {
    gameState.combo = 0;
    gameState.firstSelection = null;
    failSound.play();
}

function updateGame() {
    if (gameState.currentScreen !== 'playing') return;

    for (const row of gameState.farmGrid) {
        for (const cell of row) {
            if (cell.crop) {
                cell.growth++;
            }
        }
    }
    if (gameState.gameTime > 0) {
        gameState.gameTime--;
    } else {
        gameState.currentScreen = 'gameOver';
        gameoverSound.play();
    }
}

// --- Drawing ---

function drawFarm() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < gameState.gridSize; y++) {
        for (let x = 0; x < gameState.gridSize; x++) {
            const cell = gameState.farmGrid[y][x];
            const posX = x * gameState.cellSize;
            const posY = y * gameState.cellSize;

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;

            if (gameState.firstSelection && gameState.firstSelection.x === x && gameState.firstSelection.y === y) {
                ctx.strokeStyle = '#0000FF';
                ctx.lineWidth = 4;
            }
            ctx.strokeRect(posX, posY, gameState.cellSize, gameState.cellSize);

            if (cell.crop) {
                const cropInfo = crops[cell.crop];
                const isMature = cell.growth >= cropInfo.growthTime;
                const icon = isMature ? cropInfo.icon : cropInfo.growthIcon;

                ctx.fillStyle = '#000000';
                ctx.font = '48px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(icon, posX + gameState.cellSize / 2, posY + gameState.cellSize / 2 + 16);
            }
        }
    }
}

// --- Event Listeners ---

canvas.addEventListener('click', (event) => {
    handleCellClick(Math.floor((event.clientX - canvas.getBoundingClientRect().left) / gameState.cellSize),
                    Math.floor((event.clientY - canvas.getBoundingClientRect().top) / gameState.cellSize));
});

startButton.addEventListener('click', startGame);
overlayRetryButton.addEventListener('click', () => {
    gameState.currentScreen = 'start';
    initializeGameState();
});

// --- Game Loop ---
let lastTime = 0;
function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    if (gameState.currentScreen === 'playing') {
        gameState.timeSinceLastUpdate += deltaTime;
        if (gameState.timeSinceLastUpdate > gameState.updateInterval) {
            gameState.timeSinceLastUpdate = 0;
            updateGame();
        }
        gameOverlay.classList.add('hidden');
        infoPanel.classList.remove('inactive');
    } else if (gameState.currentScreen === 'start') {
        gameOverlay.classList.remove('hidden');
        overlayTitle.textContent = 'Stardew Valley';
        overlayMessage.textContent = '';
        startButton.style.display = 'block';
        overlayRetryButton.style.display = 'none';
        infoPanel.classList.add('inactive');
    } else if (gameState.currentScreen === 'gameOver') {
        gameOverlay.classList.remove('hidden');
        overlayTitle.textContent = 'Game Over';
        overlayMessage.textContent = `Final Score: ${gameState.score}`;
        startButton.style.display = 'none';
        overlayRetryButton.style.display = 'block';
        infoPanel.classList.add('inactive');
    }

    scoreSpan.textContent = gameState.score;
    comboSpan.textContent = gameState.combo;
    timeSpan.textContent = Math.max(0, gameState.gameTime);

    drawFarm();

    gameState.animationFrameId = requestAnimationFrame(gameLoop);
}

// --- Start Game ---
initializeGameState();
gameLoop();