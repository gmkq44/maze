const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');

let maze, rows, cols, cellSize, offsetX, offsetY, exit;
const mazeSize = 100; // Hell level difficulty
let startTime, timerInterval, timerStarted;

const timerElement = document.getElementById('timer');

function setup() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    rows = mazeSize;
    cols = mazeSize;
    cellSize = Math.max(10, Math.min(canvas.width, canvas.height) / 20);

    maze = generateMaze(rows, cols);

    // Player's logical position is always at the canvas center.
    // We set the initial offset so the maze's starting path (1, 1) is at the center.
    offsetX = canvas.width / 2 - (1.5 * cellSize);
    offsetY = canvas.height / 2 - (1.5 * cellSize);

    exit = findFarthestExit(maze, 1, 1, rows, cols);

    targetOffsetX = offsetX;
    targetOffsetY = offsetY;

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    gameLoop();

    // Reset timer
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    timerStarted = false;
    timerElement.textContent = '0.0s';
}

function startTimer() {
    if (timerStarted) return;
    timerStarted = true;
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 100);
}

function updateTimer() {
    const elapsedTime = (Date.now() - startTime) / 1000;
    timerElement.textContent = `${elapsedTime.toFixed(1)}s`;
}

function gameLoop() {
    let dx = 0;
    let dy = 0;

    if (keysPressed.ArrowUp) dy += moveSpeed;
    if (keysPressed.ArrowDown) dy -= moveSpeed;
    if (keysPressed.ArrowLeft) dx += moveSpeed;
    if (keysPressed.ArrowRight) dx -= moveSpeed;

    if (dx !== 0 || dy !== 0) {
        const proposedTargetX = targetOffsetX + dx;
        const proposedTargetY = targetOffsetY + dy;

        if (!checkCollisionAt(proposedTargetX, proposedTargetY)) {
            targetOffsetX = proposedTargetX;
            targetOffsetY = proposedTargetY;
        } else if (!checkCollisionAt(proposedTargetX, targetOffsetY)) {
            targetOffsetX = proposedTargetX;
        } else if (!checkCollisionAt(targetOffsetX, proposedTargetY)) {
            targetOffsetY = proposedTargetY;
        }
    }

    checkWin(); // Check for win condition continuously

    // Smoothly move the maze towards the target offset
    const easing = 0.2; // Increased easing for a snappier feel
    offsetX += (targetOffsetX - offsetX) * easing;
    offsetY += (targetOffsetY - offsetY) * easing;

    draw();

    animationFrameId = requestAnimationFrame(gameLoop);
}

function findFarthestExit(maze, startX, startY, rows, cols) {
    let queue = [[{ x: startX, y: startY }, 0]];
    let visited = new Set([`${startX},${startY}`]);
    let farthestCell = { x: startX, y: startY };
    let maxDist = 0;

    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];

    while (queue.length > 0) {
        let [{ x, y }, dist] = queue.shift();

        if (dist > maxDist) {
            maxDist = dist;
            farthestCell = { x, y };
        }

        for (const [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;
            const key = `${newX},${newY}`;

            if (
                newX >= 0 && newX < cols &&
                newY >= 0 && newY < rows &&
                maze[newY][newX] === 0 &&
                !visited.has(key)
            ) {
                visited.add(key);
                queue.push([{ x: newX, y: newY }, dist + 1]);
            }
        }
    }

    return farthestCell;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate the visible portion of the maze to avoid drawing off-screen cells
    const startCol = Math.max(0, Math.floor(-offsetX / cellSize));
    const endCol = Math.min(cols, Math.ceil((canvas.width - offsetX) / cellSize));
    const startRow = Math.max(0, Math.floor(-offsetY / cellSize));
    const endRow = Math.min(rows, Math.ceil((canvas.height - offsetY) / cellSize));

    // Draw only the visible maze cells
    for (let y = startRow; y < endRow; y++) {
        for (let x = startCol; x < endCol; x++) {
            if (maze[y][x] === 1) {
                ctx.fillStyle = '#333'; // Wall color
                ctx.fillRect(offsetX + x * cellSize, offsetY + y * cellSize, cellSize, cellSize);
            }
        }
    }

    // Draw the exit (only if it's within the visible area)
    if (exit && exit.x >= startCol && exit.x < endCol && exit.y >= startRow && exit.y < endRow) {
        ctx.fillStyle = 'gold';
        ctx.fillRect(offsetX + exit.x * cellSize, offsetY + exit.y * cellSize, cellSize, cellSize);
    }

    // Draw the player in the center of the canvas
    const playerX = canvas.width / 2;
    const playerY = canvas.height / 2;
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(playerX, playerY, cellSize / 3, 0, Math.PI * 2);
    ctx.fill();
}

function generateMaze(rows, cols) {
    let maze = Array(rows).fill(null).map(() => Array(cols).fill(1));
    let stack = [];
    let startCell = { x: 1, y: 1 };

    maze[startCell.y][startCell.x] = 0;
    stack.push(startCell);

    while (stack.length > 0) {
        let current = stack[stack.length - 1];
        let neighbors = getUnvisitedNeighbors(current, maze, rows, cols);

        if (neighbors.length > 0) {
            let next = neighbors[Math.floor(Math.random() * neighbors.length)];
            let wallX = current.x + (next.x - current.x) / 2;
            let wallY = current.y + (next.y - current.y) / 2;
            maze[wallY][wallX] = 0;
            maze[next.y][next.x] = 0;
            stack.push(next);
        } else {
            stack.pop();
        }
    }

    return maze;
}

function getUnvisitedNeighbors(cell, maze, r, c) {
    let neighbors = [];
    const { x, y } = cell;

    // Check neighbors in a random order
    const directions = [[0, -2], [2, 0], [0, 2], [-2, 0]];
    directions.sort(() => Math.random() - 0.5);

    for (const [dx, dy] of directions) {
        const newX = x + dx;
        const newY = y + dy;

        if (newX > 0 && newX < c - 1 && newY > 0 && newY < r - 1 && maze[newY][newX] === 1) {
            neighbors.push({ x: newX, y: newY });
        }
    }

    return neighbors;
}

let targetOffsetX, targetOffsetY;
let animationFrameId;

const keysPressed = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
};
const moveSpeed = 5; // The speed of maze movement

function checkCollisionAt(proposedOffsetX, proposedOffsetY) {
    const playerRadius = cellSize / 4;
    const playerX = canvas.width / 2 - proposedOffsetX;
    const playerY = canvas.height / 2 - proposedOffsetY;

    const gridX = Math.floor(playerX / cellSize);
    const gridY = Math.floor(playerY / cellSize);

    for (let y = gridY - 1; y <= gridY + 1; y++) {
        for (let x = gridX - 1; x <= gridX + 1; x++) {
            if (x >= 0 && x < cols && y >= 0 && y < rows && maze[y][x] === 1) {
                const wallX = x * cellSize + cellSize / 2;
                const wallY = y * cellSize + cellSize / 2;

                const distX = Math.abs(playerX - wallX) - cellSize / 2;
                const distY = Math.abs(playerY - wallY) - cellSize / 2;

                if (distX < playerRadius && distY < playerRadius) {
                    return true; // Collision
                }
            }
        }
    }
    return false; // No collision
}

const resetButton = document.getElementById('resetButton');
resetButton.addEventListener('click', setup);

// Keyboard controls
window.addEventListener('keydown', (e) => {
    if (e.key in keysPressed) {
        keysPressed[e.key] = true;
        startTimer();
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key in keysPressed) {
        keysPressed[e.key] = false;
    }
});

// On-screen D-pad controls
const dpadButtons = document.querySelectorAll('.dpad-btn');
const keyMap = {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight'
};

dpadButtons.forEach(button => {
    const direction = keyMap[button.id];
    button.addEventListener('mousedown', () => {
        keysPressed[direction] = true;
        startTimer();
    });
    button.addEventListener('mouseup', () => {
        keysPressed[direction] = false;
    });
    button.addEventListener('mouseleave', () => { // In case the user drags off the button
        keysPressed[direction] = false;
    });
    button.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keysPressed[direction] = true;
        startTimer();
    });
    button.addEventListener('touchend', (e) => {
        e.preventDefault();
        keysPressed[direction] = false;
    });
});


function checkWin() {
    if (!exit) return;

    const playerX = canvas.width / 2 - offsetX;
    const playerY = canvas.height / 2 - offsetY;

    const exitPixelX = exit.x * cellSize;
    const exitPixelY = exit.y * cellSize;

    if (
        playerX > exitPixelX &&
        playerX < exitPixelX + cellSize &&
        playerY > exitPixelY &&
        playerY < exitPixelY + cellSize
    ) {
        clearInterval(timerInterval);
        // A short delay to allow the player to see they've reached the exit
        setTimeout(() => {
            const finalTime = (Date.now() - startTime) / 1000;
            alert(`You escaped the hell maze in ${finalTime.toFixed(1)} seconds!`);
            setup();
        }, 100);
    }
}

setup();
