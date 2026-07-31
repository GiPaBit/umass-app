import { useState } from 'react';
import { SegmentedControl } from '../ui.jsx';
import { IntramuralTab } from './IntramuralTab.jsx';
import { ClubSportsTab } from './ClubSportsTab.jsx';

const TABS = [
  { value: 'intramural', label: 'Intramural' },
  { value: 'clubs', label: 'Club Sports' },
];

export function SportsSection({ data }) {
  const [tab, setTab] = useState('intramural');
  return (
    <>
      <div className="px-4 pt-1 pb-1">
        <SegmentedControl options={TABS} value={tab} onChange={setTab} />
      </div>
      {tab === 'intramural' && <IntramuralTab data={data} />}
      {tab === 'clubs' && <ClubSportsTab data={data} />}
    </>
  );
}
