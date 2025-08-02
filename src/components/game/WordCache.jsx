// Word Cache utility for managing user's word history (for new word bonus only)
export class WordCache {
  constructor() {
    this.cache = new Set();
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem('wordHistory');
      if (stored) {
        const words = JSON.parse(stored);
        this.cache = new Set(words);
      }
    } catch (error) {
      console.error('Error loading word cache:', error);
      this.cache = new Set();
    }
  }

  saveToStorage() {
    try {
      const words = Array.from(this.cache);
      localStorage.setItem('wordHistory', JSON.stringify(words));
    } catch (error) {
      console.error('Error saving word cache:', error);
    }
  }

  isNewWord(word) {
    return !this.cache.has(word.toLowerCase());
  }

  addWord(word) {
    const lowerWord = word.toLowerCase();
    const wasNew = !this.cache.has(lowerWord);
    this.cache.add(lowerWord);
    this.saveToStorage();
    return wasNew;
  }

  getSize() {
    return this.cache.size;
  }
}

// Singleton instance
export const wordCache = new WordCache();