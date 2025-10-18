const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');

let maze, rows, cols, cellSize, offsetX, offsetY, exit;
const mazeSize = 100; // Hell level difficulty
let startTime, timerInterval;

const timerElement = document.getElementById('timer');

function setup() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    rows = mazeSize;
    cols = mazeSize;
    cellSize = Math.max(10, Math.min(canvas.width, canvas.height) / 20);

    maze = generateMaze(rows, cols);

    // Player's logical position (center of the maze drawing)
    // We move the maze, so the player is always at the center of the canvas
    offsetX = canvas.width / 2 - (cols / 2 * cellSize);
    offsetY = canvas.height / 2 - (rows / 2 * cellSize);

    exit = findFarthestExit(maze, 1, 1, rows, cols);

    targetOffsetX = offsetX;
    targetOffsetY = offsetY;

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    gameLoop();

    startTimer();
}

function startTimer() {
    startTime = Date.now();
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    timerInterval = setInterval(updateTimer, 100);
}

function updateTimer() {
    const elapsedTime = (Date.now() - startTime) / 1000;
    timerElement.textContent = `${elapsedTime.toFixed(1)}s`;
}

function gameLoop() {
    // Smoothly move the maze towards the target offset
    const easing = 0.2; // A higher value gives a more responsive feel
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

    // Draw the maze
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (maze[y][x] === 1) {
                ctx.fillStyle = '#333'; // Wall color
                ctx.fillRect(offsetX + x * cellSize, offsetY + y * cellSize, cellSize, cellSize);
            }
        }
    }

    // Draw the exit
    if (exit) {
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

let isDragging = false;
let lastX, lastY;
let targetOffsetX, targetOffsetY;
let animationFrameId;

function handleMouseDown(e) {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
}

function handleMouseMove(e) {
    if (!isDragging) return;
    let dx = e.clientX - lastX;
    let dy = e.clientY - lastY;

    // Break down the movement into smaller steps to prevent tunneling
    const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (cellSize / 4));
    const stepX = dx / steps;
    const stepY = dy / steps;

    for (let i = 0; i < steps; i++) {
        const proposedTargetX = targetOffsetX + stepX;
        const proposedTargetY = targetOffsetY + stepY;

        if (!checkCollisionAt(proposedTargetX, proposedTargetY)) {
            targetOffsetX = proposedTargetX;
            targetOffsetY = proposedTargetY;
        } else {
            // If a collision occurs, stop further movement
            break;
        }
    }

    lastX = e.clientX;
    lastY = e.clientY;
}

function handleMouseUp() {
    isDragging = false;
    checkWin();
}

function handleTouchStart(e) {
    isDragging = true;
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
}

function handleTouchMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    let dx = e.touches[0].clientX - lastX;
    let dy = e.touches[0].clientY - lastY;

    // Break down the movement into smaller steps to prevent tunneling
    const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (cellSize / 4));
    const stepX = dx / steps;
    const stepY = dy / steps;

    for (let i = 0; i < steps; i++) {
        const proposedTargetX = targetOffsetX + stepX;
        const proposedTargetY = targetOffsetY + stepY;

        if (!checkCollisionAt(proposedTargetX, proposedTargetY)) {
            targetOffsetX = proposedTargetX;
            targetOffsetY = proposedTargetY;
        } else {
            // If a collision occurs, stop further movement
            break;
        }
    }

    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
}

function handleTouchEnd() {
    isDragging = false;
    checkWin();
}

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

canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd);

const resetButton = document.getElementById('resetButton');
resetButton.addEventListener('click', setup);

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
