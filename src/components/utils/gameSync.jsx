// Game synchronization utilities for multiplayer

export function generateSharedGrid() {
  const letterWeights = {
    A: 9,  B: 2,  C: 3,  D: 4,  E: 12,
    F: 2,  G: 3,  H: 2,  I: 9,  J: 1,
    K: 1,  L: 4,  M: 2,  N: 6,  O: 8,
    P: 2,  Q: 1,  R: 6,  S: 4,  T: 6,
    U: 4,  V: 2,  W: 2,  X: 1,  Y: 2,
    Z: 1
  };
  
  const letterPool = Object.entries(letterWeights).flatMap(([ltr, w]) => Array(w).fill(ltr));
  
  const grid = [];
  for (let i = 0; i < 5; i++) {
    const row = [];
    for (let j = 0; j < 5; j++) {
      row.push(letterPool[Math.floor(Math.random() * letterPool.length)]);
    }
    grid.push(row);
  }
  return grid;
}

export function createSynchronizedStart(delayMs = 3000) {
  return Date.now() + delayMs;
}