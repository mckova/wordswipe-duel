
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Gamepad2, Zap, Calendar } from "lucide-react";

const tutorialSteps = [
  {
    id: 1,
    icon: Gamepad2,
    title: "Drag Letters to Form Words",
    description: "Swipe your finger across adjacent tiles to create valid English words. Longer words earn more points!",
    illustration: "✍️"
  },
  {
    id: 2,
    icon: Zap,
    title: "Use Powerful Power-ups",
    description: "Freeze time, get word hints, double your score, or swap the board. Use crystals to buy power-ups in the shop!",
    illustration: "⚡"
  },
  {
    id: 3,
    icon: Calendar,
    title: "Complete Daily Challenges",
    description: "Find the mystery word each day to earn special rewards. Build your login streak for bonus crystals!",
    illustration: "🎯"
  }
];

export default function OnboardingTutorial({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const currentTutorial = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      onComplete(dontShowAgain);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const IconComponent = currentTutorial.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-900/95 via-blue-900/95 to-indigo-900/95 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white w-11/12 max-w-md p-8 rounded-3xl shadow-2xl text-center relative overflow-hidden"
      >
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500" />
        
        {/* Step indicator */}
        <div className="flex justify-center gap-2 mb-6">
          {tutorialSteps.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-8 rounded-full transition-all duration-300 ${
                index === currentStep 
                  ? 'bg-purple-600' 
                  : index < currentStep 
                    ? 'bg-green-400' 
                    : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            {/* Illustration */}
            <div className="text-8xl mb-4">{currentTutorial.illustration}</div>
            
            {/* Icon and Title */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-purple-100 rounded-2xl">
                <IconComponent className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">{currentTutorial.title}</h2>
            </div>
            
            {/* Description */}
            <p className="text-gray-600 leading-relaxed px-2">
              {currentTutorial.description}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button
            onClick={handlePrevious}
            variant="outline"
            disabled={isFirstStep}
            className="flex items-center gap-2 rounded-2xl px-4 py-2 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <span className="text-sm text-gray-500 font-medium">
            {currentStep + 1} of {tutorialSteps.length}
          </span>

          <Button
            onClick={handleNext}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl px-6 py-2 font-bold"
          >
            {isLastStep ? "Let's Play!" : "Next"}
            {!isLastStep && <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>

        {/* Don't show again checkbox - only on last step */}
        {isLastStep && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 text-sm text-gray-600"
          >
            <input
              type="checkbox"
              id="dontShowAgain"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
            />
            <label htmlFor="dontShowAgain" className="cursor-pointer">
              Don't show this tutorial again
            </label>
          </motion.div>
        )}

        {/* Skip button - only on first steps */}
        {!isLastStep && (
          <button
            onClick={() => onComplete(true)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-sm font-medium"
          >
            Skip
          </button>
        )}
      </motion.div>
    </div>
  );
}
