import { containsBlockedWord } from '../lib/profanityFilter.js';

/** Standalone name input, reused by the first-run questionnaire and Settings' Name section. */
export function NameField({ value, onChange }) {
  const blocked = containsBlockedWord(value);

  return (
    <div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Your name"
        className="w-full rounded-[14px] bg-card px-4 py-3.5 text-[17px] text-label placeholder:text-label-3 focus:outline-none"
      />
      {blocked && (
        <p className="mt-2 px-1 text-[13px] leading-[18px] text-ios-red">
          That name isn't allowed. Try something else.
        </p>
      )}
    </div>
  );
}
