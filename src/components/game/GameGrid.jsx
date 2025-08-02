import React from "react";
import { motion } from "framer-motion";

// Skeleton Grid Component - רק אם באמת אין לוח
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-5 gap-1 sm:gap-2 p-2 sm:p-3 bg-white/50 backdrop-blur-sm rounded-3xl shadow-2xl w-full max-w-[320px] sm:max-w-sm mx-auto">
      {Array.from({ length: 25 }).map((_, index) => (
        <div
          key={index}
          className="aspect-square rounded-lg sm:rounded-xl bg-gray-300 animate-pulse shadow-md min-h-[48px] min-w-[48px]"
        />
      ))}
    </div>
  );
}

export default function GameGrid({ grid, selectedCells, onCellSelect, isLoading = false }) {
  const isSelected = (row, col) => {
    return selectedCells.some(cell => cell.row === row && cell.col === col);
  };

  const getCellIndex = (row, col) => {
    return selectedCells.findIndex(cell => cell.row === row && cell.col === col);
  };

  // הראה skeleton רק אם באמת אין לוח או שמפורשות נאמר שטוען
  if (isLoading || !grid || grid.length === 0 || !Array.isArray(grid[0])) {
    return <SkeletonGrid />;
  }

  return (
    <div className="grid grid-cols-5 gap-1 sm:gap-2 p-2 sm:p-3 bg-white/50 backdrop-blur-sm rounded-3xl shadow-2xl w-full max-w-[320px] sm:max-w-sm mx-auto">
      {grid.map((row, rowIndex) =>
        row.map((letter, colIndex) => {
          const selected = isSelected(rowIndex, colIndex);
          const cellIndex = getCellIndex(rowIndex, colIndex);
          
          return (
            <motion.button
              key={`${rowIndex}-${colIndex}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: (rowIndex * 5 + colIndex) * 0.02 }} // אנימציה מדורגת יפה
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCellSelect(rowIndex, colIndex);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCellSelect(rowIndex, colIndex);
              }}
              className={`
                relative aspect-square rounded-lg sm:rounded-xl font-bold 
                transition-all duration-200 flex items-center justify-center 
                touch-manipulation active:scale-95 cursor-pointer
                text-base sm:text-lg md:text-xl
                min-h-[48px] min-w-[48px] sm:min-h-[52px] sm:min-w-[52px]
                ${selected
                  ? 'bg-purple-600 text-white shadow-lg transform scale-105 z-10'
                  : 'bg-white/90 text-purple-800 hover:bg-purple-100 shadow-md hover:shadow-lg active:bg-purple-200'
                }
              `}
              style={{ 
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
                touchAction: 'manipulation'
              }}
              whileHover={{ scale: selected ? 1.05 : 1.02 }}
              whileTap={{ scale: 0.95 }}
            >
              {letter}
              
              {selected && (
                <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-black text-purple-800 shadow-md">
                  {cellIndex + 1}
                </div>
              )}
            </motion.button>
          );
        })
      )}
    </div>
  );
}