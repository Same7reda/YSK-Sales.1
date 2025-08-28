import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

export interface TourStep {
  selector: string;
  title: string;
  content: string;
  before?: () => void;
}

interface GuidedTourProps {
  steps: TourStep[];
  onFinish: (dontShowAgain: boolean) => void;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({ steps, onFinish }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<Element | null>(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const currentStep = steps[stepIndex];

  useEffect(() => {
    if (currentStep?.before) {
      currentStep.before();
    }
    
    const timer = setTimeout(() => {
        const element = document.querySelector(currentStep?.selector);
        setHighlightedElement(element);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
    }, 150);

    return () => clearTimeout(timer);
  }, [stepIndex, steps]);

  useEffect(() => {
    if (highlightedElement) {
      const rect = highlightedElement.getBoundingClientRect();
      const popoverWidth = 300;
      let top = rect.bottom + 10;
      let left = rect.left + rect.width / 2;
      
      const popoverHeight = popoverRef.current?.offsetHeight || 200;
      if (top + popoverHeight > window.innerHeight) {
          top = rect.top - popoverHeight - 10;
      }
      if (left - popoverWidth / 2 < 10) {
        left = popoverWidth / 2 + 10;
      }
      if (left + popoverWidth / 2 > window.innerWidth - 10) {
        left = window.innerWidth - popoverWidth / 2 - 10;
      }

      setPopoverPosition({ top, left });
    }
  }, [highlightedElement, popoverRef.current?.offsetHeight]);
  
  const handleFinish = () => {
      onFinish(dontShowAgain);
  };

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    }
  };

  if (!currentStep) return null;

  const rect = highlightedElement?.getBoundingClientRect();

  const popoverStyle: React.CSSProperties = {
      position: 'fixed',
      top: `${popoverPosition.top}px`,
      left: `${popoverPosition.left}px`,
      transform: 'translateX(-50%)',
      width: '300px',
      zIndex: 10001,
      opacity: highlightedElement ? 1 : 0,
  };

  return ReactDOM.createPortal(
    <>
      <div className="tour-backdrop" onClick={handleFinish} />
      {highlightedElement && rect && (
        <div
            className="tour-spotlight"
            style={{
            width: `${rect.width + 10}px`,
            height: `${rect.height + 10}px`,
            top: `${rect.top - 5}px`,
            left: `${rect.left - 5}px`,
            }}
        />
      )}
      <div ref={popoverRef} className="tour-popover" style={popoverStyle}>
        <div className="p-4 bg-white rounded-lg shadow-xl relative">
          <button onClick={handleFinish} className="absolute top-2 left-2 text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          <h3 className="font-bold text-lg mb-2">{currentStep.title}</h3>
          <p className="text-sm text-gray-600 mb-4">{currentStep.content}</p>
          <div className="flex justify-between items-center">
             <span className="text-sm text-gray-500">{stepIndex + 1} / {steps.length}</span>
            <div>
              {stepIndex > 0 && <button onClick={handlePrev} className="text-sm font-semibold px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 mx-2">السابق</button>}
              <button onClick={handleNext} className="text-sm font-semibold px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">
                {stepIndex === steps.length - 1 ? 'إنهاء' : 'التالي'}
              </button>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={dontShowAgain} onChange={(e) => setDontShowAgain(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span>لا تظهر هذه الجولة مرة أخرى</span>
              </label>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};
