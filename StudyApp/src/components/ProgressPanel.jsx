import { useState, useEffect } from 'react';
import { getProgress, resetProgress } from '../utils/progress';

export default function ProgressPanel() {
  const [progress, setProgress] = useState(getProgress());

  useEffect(() => {
    const handleStorageChange = () => {
      setProgress(getProgress());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset your progress?')) {
      resetProgress();
      setProgress(getProgress());
    }
  };

  const { totals, topics } = progress;
  const sortedTopics = Object.entries(topics).sort(([, a], [, b]) => b.seen - a.seen);

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-4 h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Progress</h2>
        <button 
          onClick={handleReset}
          className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400"
        >
          Reset Progress
        </button>
      </div>

      {totals.attempts > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totals.attempts}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Attempts</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{((totals.correct / totals.questions) * 100).toFixed(0)}%</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Avg. Score</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{totals.questions}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Questions</div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Topics Breakdown</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {sortedTopics.map(([topic, data]) => (
                <div key={topic}>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate" title={topic}>{topic}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-300">{data.correct}/{data.seen}</p>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{ width: `${(data.correct / data.seen) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-sm text-gray-500 dark:text-gray-400">Complete a quiz to see your progress here.</p>
        </div>
      )}
    </div>
  );
}
