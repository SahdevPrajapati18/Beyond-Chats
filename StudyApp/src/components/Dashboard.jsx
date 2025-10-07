import { useState } from 'react';
import ProgressPanel from './ProgressPanel';

export default function Dashboard({ onSwitchPanel }) {
  return (
    <div className="h-full">
      <ProgressPanel />
    </div>
  );
}


