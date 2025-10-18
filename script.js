const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');

let maze, rows, cols, cellSize, offsetX, offsetY;
const mazeSize = 100; // Hell level difficulty

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

    draw();
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
    ctx.fillStyle = 'gold';
    ctx.fillRect(offsetX + (cols - 1) * cellSize, offsetY + (rows - 2) * cellSize, cellSize, cellSize);

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

    // Set the exit
    maze[rows - 2][cols - 1] = 0;

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

function handleMouseDown(e) {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
}

function handleMouseMove(e) {
    if (!isDragging) return;
    let dx = e.clientX - lastX;
    let dy = e.clientY - lastY;

    // Check for collisions before moving
    if (!checkCollision(dx, dy)) {
        offsetX += dx;
        offsetY += dy;
        draw();
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

    if (!checkCollision(dx, dy)) {
        offsetX += dx;
        offsetY += dy;
        draw();
    }

    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
}

function handleTouchEnd() {
    isDragging = false;
    checkWin();
}

function checkCollision(dx, dy) {
    const playerRadius = cellSize / 4; // A smaller radius for easier movement
    const playerX = canvas.width / 2 - offsetX;
    const playerY = canvas.height / 2 - offsetY;

    const newPlayerX = playerX - dx;
    const newPlayerY = playerY - dy;

    const gridX = Math.floor(newPlayerX / cellSize);
    const gridY = Math.floor(newPlayerY / cellSize);

    for (let y = gridY - 1; y <= gridY + 1; y++) {
        for (let x = gridX - 1; x <= gridX + 1; x++) {
            if (x >= 0 && x < cols && y >= 0 && y < rows && maze[y][x] === 1) {
                // Check for collision with the wall
                const wallX = x * cellSize + cellSize / 2;
                const wallY = y * cellSize + cellSize / 2;

                const distX = Math.abs(newPlayerX - wallX) - cellSize / 2;
                const distY = Math.abs(newPlayerY - wallY) - cellSize / 2;

                if (distX < playerRadius && distY < playerRadius) {
                    return true; // Collision detected
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
    const playerX = canvas.width / 2 - offsetX;
    const playerY = canvas.height / 2 - offsetY;

    const exitX = (cols - 1) * cellSize;
    const exitY = (rows - 2) * cellSize;

    if (
        playerX > exitX &&
        playerX < exitX + cellSize &&
        playerY > exitY &&
        playerY < exitY + cellSize
    ) {
        // A short delay to allow the player to see they've reached the exit
        setTimeout(() => {
            alert('You escaped the hell maze!');
            setup();
        }, 100);
    }
}

setup();
