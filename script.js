// Game State Variables
let solvedGrid = [];
let initialGrid = [];
let currentGrid = [];
let notesGrid = []; // 81 arrays containing pencil notes for each cell
let selectedCellIndex = null;
let notesMode = false;
let mistakes = 0;
const maxMistakes = 3;
let secondsElapsed = 0;
let timerInterval = null;
let historyStack = [];
let redoStack = [];

// DOM Elements
const boardEl = document.getElementById('sudoku-board');
const difficultySelect = document.getElementById('difficulty-select');
const timerDisplay = document.getElementById('timer-display');
const mistakesDisplay = document.getElementById('mistakes-display');
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');
const notesBtn = document.getElementById('notes-btn');
const eraseBtn = document.getElementById('erase-btn');
const hintBtn = document.getElementById('hint-btn');
const restartBtn = document.getElementById('restart-btn');
const newGameBtn = document.getElementById('new-game-btn');
const themeToggleBtn = document.getElementById('theme-toggle');
const numberKeys = document.querySelectorAll('.key-btn');

// Modals
const victoryModal = document.getElementById('victory-modal');
const gameoverModal = document.getElementById('gameover-modal');
const modalDifficulty = document.getElementById('modal-difficulty');
const modalTime = document.getElementById('modal-time');
const modalMistakes = document.getElementById('modal-mistakes');
const modalNewGameBtn = document.getElementById('modal-new-game-btn');
const modalRetryBtn = document.getElementById('modal-retry-btn');

// --- Themes ---
function initTheme() {
  const savedTheme = localStorage.getItem('sudoku-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('sudoku-theme', newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const sunIcon = themeToggleBtn.querySelector('.sun-icon');
  const moonIcon = themeToggleBtn.querySelector('.moon-icon');
  if (theme === 'dark') {
    sunIcon.classList.remove('hidden');
    moonIcon.classList.add('hidden');
  } else {
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
  }
}

// --- Sudoku Generation & Solver Algorithms ---

// Helper to shuffle an array
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Check if placement is valid in grid
function isValidPlacement(grid, row, col, num) {
  // Row Check
  for (let c = 0; c < 9; c++) {
    if (grid[row][c] === num && c !== col) return false;
  }
  // Col Check
  for (let r = 0; r < 9; r++) {
    if (grid[r][col] === num && r !== row) return false;
  }
  // 3x3 Box Check
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (grid[startRow + r][startCol + c] === num && (startRow + r !== row || startCol + c !== col)) {
        return false;
      }
    }
  }
  return true;
}

// Backtracking solver
function solveSudoku(grid) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === 0) {
        // Try numbers 1 to 9 in random order for variety
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (let num of nums) {
          if (isValidPlacement(grid, r, c, num)) {
            grid[r][c] = num;
            if (solveSudoku(grid)) return true;
            grid[r][c] = 0;
          }
        }
        return false; // Backtrack
      }
    }
  }
  return true; // Solved
}

// Count solutions helper to ensure uniqueness
function countSolutions(grid, limit = 2) {
  let count = 0;

  function findEmptyCell(g) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (g[r][c] === 0) return [r, c];
      }
    }
    return null;
  }

  function backtrack(g) {
    if (count >= limit) return;
    const empty = findEmptyCell(g);
    if (!empty) {
      count++;
      return;
    }
    const [r, c] = empty;
    for (let val = 1; val <= 9; val++) {
      if (isValidPlacement(g, r, c, val)) {
        g[r][c] = val;
        backtrack(g);
        g[r][c] = 0;
      }
    }
  }

  backtrack(grid);
  return count;
}

// Fill diagonal blocks of the board (independent of each other)
function fillDiagonals(grid) {
  for (let box = 0; box < 9; box += 4) {
    const startRow = Math.floor(box / 3) * 3;
    const startCol = (box % 3) * 3;
    const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    let idx = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        grid[startRow + r][startCol + c] = nums[idx++];
      }
    }
  }
}

// Generate the fully solved grid and starting puzzle grid
function generateGrid(difficulty) {
  // 1. Create empty grid
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
  
  // 2. Fill diagonal subgrids
  fillDiagonals(grid);
  
  // 3. Solve the grid to get a complete valid configuration
  solveSudoku(grid);
  
  // Save the solved state
  solvedGrid = grid.map(row => [...row]);
  
  // 4. Determine how many clues to remove
  let targetEmpty;
  if (difficulty === 'easy') {
    targetEmpty = 36 + Math.floor(Math.random() * 5); // 36-40 empty (41-45 clues left)
  } else if (difficulty === 'medium') {
    targetEmpty = 45 + Math.floor(Math.random() * 5); // 45-49 empty (32-36 clues left)
  } else {
    targetEmpty = 52 + Math.floor(Math.random() * 5); // 52-56 empty (25-29 clues left)
  }

  // Create copies
  const startingGrid = grid.map(row => [...row]);
  
  // Create list of all cells (0-80) and shuffle them
  const cellPositions = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      cellPositions.push([r, c]);
    }
  }
  shuffle(cellPositions);

  let removedCount = 0;
  // Try to remove cells while maintaining a unique solution
  for (let pos of cellPositions) {
    if (removedCount >= targetEmpty) break;
    const [r, c] = pos;
    const tempVal = startingGrid[r][c];
    startingGrid[r][c] = 0;

    // Test uniqueness
    const tempCopy = startingGrid.map(row => [...row]);
    if (countSolutions(tempCopy, 2) === 1) {
      removedCount++;
    } else {
      // Put the value back if it results in non-unique solution
      startingGrid[r][c] = tempVal;
    }
  }

  initialGrid = startingGrid.map(row => [...row]);
  currentGrid = startingGrid.map(row => [...row]);
}

// --- History Undo/Redo ---

function saveStateToHistory() {
  // Take deep copy of currentGrid and notesGrid
  historyStack.push({
    currentGrid: currentGrid.map(row => [...row]),
    notesGrid: notesGrid.map(notes => [...notes])
  });
  // Clear redo stack on any new move
  redoStack = [];
  updateHistoryButtons();
}

function undo() {
  if (historyStack.length === 0) return;
  
  // Save current state to redo stack
  redoStack.push({
    currentGrid: currentGrid.map(row => [...row]),
    notesGrid: notesGrid.map(notes => [...notes])
  });
  
  const prevState = historyStack.pop();
  currentGrid = prevState.currentGrid;
  notesGrid = prevState.notesGrid;
  
  updateHistoryButtons();
  renderBoard();
  highlightCells();
}

function redo() {
  if (redoStack.length === 0) return;
  
  // Save current state to history stack
  historyStack.push({
    currentGrid: currentGrid.map(row => [...row]),
    notesGrid: notesGrid.map(notes => [...notes])
  });
  
  const nextState = redoStack.pop();
  currentGrid = nextState.currentGrid;
  notesGrid = nextState.notesGrid;
  
  updateHistoryButtons();
  renderBoard();
  highlightCells();
}

function updateHistoryButtons() {
  undoBtn.disabled = historyStack.length === 0;
  redoBtn.disabled = redoStack.length === 0;
}

// --- Timer ---

function startTimer() {
  clearInterval(timerInterval);
  secondsElapsed = 0;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    secondsElapsed++;
    updateTimerDisplay();
  }, 1000);
}

function updateTimerDisplay() {
  const minutes = Math.floor(secondsElapsed / 60);
  const seconds = secondsElapsed % 60;
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');
  timerDisplay.textContent = `${formattedMinutes}:${formattedSeconds}`;
}

function stopTimer() {
  clearInterval(timerInterval);
}

// --- Game Control Actions ---

function initGame() {
  stopTimer();
  
  // Reset states
  mistakes = 0;
  updateMistakesDisplay();
  selectedCellIndex = null;
  notesMode = false;
  notesBtn.classList.remove('active');
  notesBtn.querySelector('span').textContent = "Notes: Off";
  historyStack = [];
  redoStack = [];
  updateHistoryButtons();
  
  // Clear notes grid
  notesGrid = Array.from({ length: 81 }, () => []);

  // Generate Board
  const difficulty = difficultySelect.value;
  generateGrid(difficulty);
  
  // Build and render HTML
  buildBoardUI();
  renderBoard();
  startTimer();
  
  // Hide modals
  victoryModal.classList.add('hidden');
  gameoverModal.classList.add('hidden');
}

function restartGame() {
  // Revert back to the starting puzzle grid for the current game
  saveStateToHistory();
  currentGrid = initialGrid.map(row => [...row]);
  notesGrid = Array.from({ length: 81 }, () => []);
  mistakes = 0;
  updateMistakesDisplay();
  
  renderBoard();
  if (selectedCellIndex !== null) {
    highlightCells();
  }
}

function updateMistakesDisplay() {
  mistakesDisplay.textContent = `${mistakes} / ${maxMistakes}`;
  if (mistakes > 0) {
    mistakesDisplay.parentElement.style.borderColor = 'var(--cell-error-text)';
  } else {
    mistakesDisplay.parentElement.style.borderColor = 'var(--border-color)';
  }
}

// --- Render & Build UI ---

function buildBoardUI() {
  boardEl.innerHTML = '';
  for (let i = 0; i < 81; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.setAttribute('data-index', i);
    cell.setAttribute('tabindex', '0');
    
    // Value display container
    const valueDisplay = document.createElement('span');
    valueDisplay.classList.add('value-display');
    cell.appendChild(valueDisplay);

    // Notes display container
    const notesGridEl = document.createElement('div');
    notesGridEl.classList.add('notes-grid');
    for (let n = 1; n <= 9; n++) {
      const noteSpan = document.createElement('span');
      noteSpan.classList.add('note');
      noteSpan.setAttribute('data-note', n);
      notesGridEl.appendChild(noteSpan);
    }
    cell.appendChild(notesGridEl);

    // Event listeners
    cell.addEventListener('click', () => selectCell(i));
    cell.addEventListener('focus', () => selectCell(i));
    
    boardEl.appendChild(cell);
  }
}

function renderBoard() {
  const cells = boardEl.querySelectorAll('.cell');
  cells.forEach((cell, idx) => {
    const row = Math.floor(idx / 9);
    const col = idx % 9;
    const value = currentGrid[row][col];
    const originalVal = initialGrid[row][col];
    
    const valueDisplay = cell.querySelector('.value-display');
    const notesGridEl = cell.querySelector('.notes-grid');
    
    // Reset classes
    cell.classList.remove('given', 'user-filled', 'error');

    if (value !== 0) {
      valueDisplay.textContent = value;
      valueDisplay.classList.remove('hidden');
      notesGridEl.classList.add('hidden');
      
      if (originalVal !== 0) {
        cell.classList.add('given');
      } else {
        cell.classList.add('user-filled');
        // If it is incorrect compared to solved grid, mark it error
        if (value !== solvedGrid[row][col]) {
          cell.classList.add('error');
        }
      }
    } else {
      valueDisplay.textContent = '';
      valueDisplay.classList.add('hidden');
      notesGridEl.classList.remove('hidden');
      
      // Render notes
      const noteSpans = cell.querySelectorAll('.note');
      const activeNotes = notesGrid[idx];
      noteSpans.forEach((span, noteIdx) => {
        const num = noteIdx + 1;
        if (activeNotes.includes(num)) {
          span.textContent = num;
        } else {
          span.textContent = '';
        }
      });
    }
  });
}

function selectCell(index) {
  selectedCellIndex = index;
  highlightCells();
}

function highlightCells() {
  if (selectedCellIndex === null) return;
  
  const cells = boardEl.querySelectorAll('.cell');
  const targetRow = Math.floor(selectedCellIndex / 9);
  const targetCol = selectedCellIndex % 9;
  const targetBoxRow = Math.floor(targetRow / 3) * 3;
  const targetBoxCol = Math.floor(targetCol / 3) * 3;
  const targetValue = currentGrid[targetRow][targetCol];
  
  cells.forEach((cell, idx) => {
    cell.classList.remove('selected', 'highlighted', 'match-number');
    
    const row = Math.floor(idx / 9);
    const col = idx % 9;
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    const value = currentGrid[row][col];
    
    if (idx === selectedCellIndex) {
      cell.classList.add('selected');
    } else if (row === targetRow || col === targetCol || (boxRow === targetBoxRow && boxCol === targetBoxCol)) {
      cell.classList.add('highlighted');
    }
    
    if (targetValue !== 0 && value === targetValue && idx !== selectedCellIndex) {
      cell.classList.add('match-number');
    }
  });
}

// --- Gameplay Actions (Number input & erase) ---

function inputNumber(number) {
  if (selectedCellIndex === null) return;
  
  const row = Math.floor(selectedCellIndex / 9);
  const col = selectedCellIndex % 9;
  
  // Prevent editing given clues
  if (initialGrid[row][col] !== 0) return;
  
  saveStateToHistory();
  
  if (notesMode) {
    // Pencil notes mode
    // Toggle the number inside notes grid
    const cellNotes = notesGrid[selectedCellIndex];
    const index = cellNotes.indexOf(number);
    if (index > -1) {
      cellNotes.splice(index, 1);
    } else {
      // Clear main value first if any
      currentGrid[row][col] = 0;
      cellNotes.push(number);
      cellNotes.sort();
    }
  } else {
    // Normal mode: enter value
    const prevVal = currentGrid[row][col];
    
    // Clear pencil notes
    notesGrid[selectedCellIndex] = [];
    
    if (prevVal === number) {
      // Toggle off if clicking the same number
      currentGrid[row][col] = 0;
    } else {
      currentGrid[row][col] = number;
      
      // Validation check
      if (number !== solvedGrid[row][col]) {
        mistakes++;
        updateMistakesDisplay();
        
        // Trigger shake effect on current cell
        const activeCell = boardEl.querySelector(`[data-index="${selectedCellIndex}"]`);
        if (activeCell) {
          activeCell.classList.add('error');
          activeCell.style.animation = 'none';
          activeCell.offsetHeight; // Trigger reflow to restart animation
          activeCell.style.animation = null;
        }

        if (mistakes >= maxMistakes) {
          endGame(false);
        }
      }
    }
  }
  
  renderBoard();
  highlightCells();
  checkWinCondition();
}

function eraseCell() {
  if (selectedCellIndex === null) return;
  
  const row = Math.floor(selectedCellIndex / 9);
  const col = selectedCellIndex % 9;
  
  if (initialGrid[row][col] !== 0) return; // Cannot delete given values
  
  if (currentGrid[row][col] === 0 && notesGrid[selectedCellIndex].length === 0) return;
  
  saveStateToHistory();
  
  currentGrid[row][col] = 0;
  notesGrid[selectedCellIndex] = [];
  
  renderBoard();
  highlightCells();
}

function getHint() {
  if (selectedCellIndex === null) return;
  
  const row = Math.floor(selectedCellIndex / 9);
  const col = selectedCellIndex % 9;
  
  // Can't give a hint on starting values or cells already correct
  if (initialGrid[row][col] !== 0) return;
  if (currentGrid[row][col] === solvedGrid[row][col]) return;
  
  saveStateToHistory();
  
  currentGrid[row][col] = solvedGrid[row][col];
  notesGrid[selectedCellIndex] = [];
  
  renderBoard();
  highlightCells();
  checkWinCondition();
}

function toggleNotesMode() {
  notesMode = !notesMode;
  if (notesMode) {
    notesBtn.classList.add('active');
    notesBtn.querySelector('span').textContent = "Notes: On";
  } else {
    notesBtn.classList.remove('active');
    notesBtn.querySelector('span').textContent = "Notes: Off";
  }
}

// --- Keyboard Navigation & Filtering ---

function handleKeyDown(e) {
  // 1. Block letters (No alphabets allowed)
  if (e.key.match(/^[a-zA-Z]$/) && !e.ctrlKey) {
    e.preventDefault();
    // Special toggles
    if (e.key.toLowerCase() === 'n') {
      toggleNotesMode();
    }
    return;
  }

  if (selectedCellIndex === null) return;
  
  const row = Math.floor(selectedCellIndex / 9);
  const col = selectedCellIndex % 9;

  // Arrow keys navigation
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (row > 0) focusCell(selectedCellIndex - 9);
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (row < 8) focusCell(selectedCellIndex + 9);
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    if (col > 0) focusCell(selectedCellIndex - 1);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    if (col < 8) focusCell(selectedCellIndex + 1);
  }
  // Digits input
  else if (e.key >= '1' && e.key <= '9') {
    e.preventDefault();
    inputNumber(parseInt(e.key));
  }
  // Erase triggers
  else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
    e.preventDefault();
    eraseCell();
  }
  // Undo/Redo shortcuts (Ctrl+Z, Ctrl+Y)
  else if (e.ctrlKey && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    undo();
  }
  else if (e.ctrlKey && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    redo();
  }
}

function focusCell(index) {
  selectedCellIndex = index;
  const cells = boardEl.querySelectorAll('.cell');
  if (cells[index]) {
    cells[index].focus();
  }
}

// --- Game State Checks & End Game ---

function checkWinCondition() {
  // The board is solved if currentGrid matches solvedGrid in all positions
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (currentGrid[r][c] !== solvedGrid[r][c]) {
        return false;
      }
    }
  }
  endGame(true);
}

function endGame(won) {
  stopTimer();
  selectedCellIndex = null;
  
  if (won) {
    // Populate stats in victory modal
    const difficultyStr = difficultySelect.value.charAt(0).toUpperCase() + difficultySelect.value.slice(1);
    modalDifficulty.textContent = difficultyStr;
    modalTime.textContent = timerDisplay.textContent;
    modalMistakes.textContent = `${mistakes} / ${maxMistakes}`;
    victoryModal.classList.remove('hidden');
  } else {
    gameoverModal.classList.remove('hidden');
  }
}

// --- Event Listeners Registration ---

function registerEvents() {
  // Theme Toggle
  themeToggleBtn.addEventListener('click', toggleTheme);
  
  // Difficulty Select
  difficultySelect.addEventListener('change', () => {
    initGame();
  });
  
  // Navigation & Control Panel
  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);
  notesBtn.addEventListener('click', toggleNotesMode);
  eraseBtn.addEventListener('click', eraseCell);
  hintBtn.addEventListener('click', getHint);
  
  // Game Actions
  restartBtn.addEventListener('click', restartGame);
  newGameBtn.addEventListener('click', initGame);
  
  // Modal buttons
  modalNewGameBtn.addEventListener('click', initGame);
  modalRetryBtn.addEventListener('click', initGame);
  
  // Keypad clicks
  numberKeys.forEach(key => {
    key.addEventListener('click', () => {
      const val = parseInt(key.getAttribute('data-value'));
      inputNumber(val);
    });
  });

  // Global Keyboard listener for board interaction
  document.addEventListener('keydown', handleKeyDown);
}

// --- Initialization ---

window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  registerEvents();
  initGame();
});
