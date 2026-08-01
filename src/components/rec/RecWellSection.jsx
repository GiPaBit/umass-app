import { useState } from 'react';
import { SegmentedControl } from '../ui.jsx';
import { HoursTab } from './HoursTab.jsx';
import { FitnessTab } from './FitnessTab.jsx';
import { AquaticsTab } from './AquaticsTab.jsx';
import { AdventureTab } from './AdventureTab.jsx';

const TABS = [
  { value: 'hours', label: 'Hours' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'aquatics', label: 'Aquatics' },
];

export function RecWellSection({ data }) {
  const [tab, setTab] = useState('hours');
  return (
    <>
      <div className="sticky top-10 z-[5] bg-bg px-4 pt-1 pb-1">
        <SegmentedControl options={TABS} value={tab} onChange={setTab} />
      </div>
      {tab === 'hours' && <HoursTab data={data} />}
      {tab === 'fitness' && <FitnessTab data={data} />}
      {tab === 'adventure' && <AdventureTab data={data} />}
      {tab === 'aquatics' && <AquaticsTab data={data} />}
    </>
  );
}
