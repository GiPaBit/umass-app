import { useState } from 'react';
import { Screen } from '../components/Screen.jsx';
import {
  ErrorState,
  FailureNotice,
  ListGroup,
  LoadingState,
  Row,
  SectionHeader,
  SegmentedControl,
  StatusPill,
  StaleNotice,
} from '../components/ui.jsx';
import { getRec } from '../lib/api.js';
import { useAsync } from '../hooks/useAsync.js';

const TABS = [
  { value: 'facilities', label: 'Hours' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'intramurals', label: 'Intramurals' },
  { value: 'clubs', label: 'Clubs' },
];

export function RecScreen() {
  const { data, error, loading, refresh } = useAsync(getRec);
  const [tab, setTab] = useState('facilities');

  const openNow = data?.facilities.filter((f) => f.status.state === 'open').length ?? 0;

  return (
    <Screen
      title="Rec & Sports"
      subtitle={data ? `${openNow} facilit${openNow === 1 ? 'y' : 'ies'} open` : undefined}
      onRefresh={refresh}
    >
      <div className="px-4 pt-1 pb-1">
        <SegmentedControl options={TABS} value={tab} onChange={setTab} />
      </div>

      {loading && !data && <LoadingState label="Checking RecWell…" />}
      {error && !data && <ErrorState error={error} what="Rec info" onRetry={refresh} />}

      {data && (
        <>
          <StaleNotice data={data} />
          <FailureNotice failures={data.failures} />

          {tab === 'facilities' && <Facilities data={data} />}
          {tab === 'fitness' && (
            <InfoSections
              info={data.fitness}
              title="Fitness & Group Exercise"
              linkLabel="Open class schedule"
              linkUrl={data.fitness.scheduleUrl}
            />
          )}
          {tab === 'intramurals' && <Intramurals info={data.intramurals} />}
          {tab === 'clubs' && (
            <InfoSections info={data.clubSports} title="Club Sports" linkLabel="Open club sports page" />
          )}
        </>
      )}
    </Screen>
  );
}

/* -------------------------------------------------------------------------- */

function Facilities({ data }) {
  return (
    <>
      {data.notices?.length > 0 && (
        <div className="mx-4 mt-3 rounded-[12px] bg-ios-orange/12 px-4 py-3">
          <div className="text-[13px] font-semibold text-ios-orange">Notices</div>
          {data.notices.map((n, i) => (
            <p key={i} className="mt-1 text-[13px] leading-[17px] text-label-2">
              {n}
            </p>
          ))}
        </div>
      )}

      <SectionHeader>Today</SectionHeader>
      <ListGroup>
        {data.facilities.map((f, i) => (
          <Row key={f.name} last={i === data.facilities.length - 1} trailing={<StatusPill state={f.status.state} />}>
            <div className="text-[17px] leading-[22px] text-label">{f.name}</div>
            <div className="mt-0.5 text-[13px] leading-[17px] text-label-2">
              {f.today?.hoursText || f.note || 'Hours unavailable'}
            </div>
          </Row>
        ))}
      </ListGroup>

      <SectionHeader>Full Week</SectionHeader>
      {data.facilities
        .filter((f) => f.schedule.length > 0)
        .map((f) => (
          <div key={f.name} className="mx-4 mb-3 overflow-hidden rounded-[16px] bg-card">
            <div className="px-4 pt-3 pb-1 text-[15px] font-semibold text-label">{f.name}</div>
            <div className="px-4 pb-3">
              {f.schedule.map((entry, i) => (
                <div key={i} className="flex justify-between gap-3 py-[3px]">
                  <span className="text-[14px] text-label-2">{entry.dayLabel}</span>
                  <span className="text-right text-[14px] text-label">{entry.timeText}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
    </>
  );
}

function Intramurals({ info }) {
  return (
    <>
      <div className="mx-4 mt-3 rounded-[16px] bg-card p-4">
        <div className="text-[17px] font-semibold text-label">Registration & Schedules</div>
        <p className="mt-1.5 text-[14px] leading-[19px] text-label-2">{info.registrationNote}</p>
        <a
          href={info.registrationUrl}
          target="_blank"
          rel="noreferrer"
          className="ios-press-scale mt-3 inline-block rounded-[12px] bg-ios-blue px-4 py-[10px] text-[16px] font-medium text-white"
        >
          Open IMLeagues
        </a>
      </div>

      <SectionSections sections={info.sections} />

      <FooterLink url={info.url} label="Open RecWell intramurals page" />
    </>
  );
}

function InfoSections({ info, title, linkLabel, linkUrl }) {
  return (
    <>
      <SectionHeader>{title}</SectionHeader>
      <SectionSections sections={info.sections} />
      <FooterLink url={linkUrl || info.url} label={linkLabel} />
    </>
  );
}

/** Render RecWell's own headings + prose as readable cards. */
function SectionSections({ sections }) {
  const meaningful = (sections || []).filter((s) => s.lines.length > 0);
  if (!meaningful.length) {
    return (
      <p className="px-5 py-6 text-center text-[15px] text-label-2">
        Nothing published here right now.
      </p>
    );
  }

  return (
    <>
      {meaningful.map((section, i) => (
        <div key={`${section.heading}-${i}`} className="mx-4 mt-3 overflow-hidden rounded-[16px] bg-card p-4">
          <div className="text-[16px] font-semibold text-label">{section.heading}</div>
          {section.lines.slice(0, 8).map((line, j) => (
            <p key={j} className="mt-1.5 text-[14px] leading-[19px] text-label-2">
              {line}
            </p>
          ))}
          {section.links.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {section.links.slice(0, 4).map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="ios-press-scale rounded-[8px] bg-fill px-3 py-[6px] text-[13px] font-medium text-ios-blue"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

function FooterLink({ url, label }) {
  if (!url) return null;
  return (
    <div className="px-4 pt-4">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="ios-press-scale block rounded-[12px] bg-fill px-4 py-[11px] text-center text-[16px] font-medium text-ios-blue"
      >
        {label}
      </a>
    </div>
  );
}
