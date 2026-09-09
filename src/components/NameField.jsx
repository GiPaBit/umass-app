/** Standalone name input, reused by the first-run questionnaire and Settings' Name section. */
export function NameField({ value, onChange }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Your name"
      className="w-full rounded-[14px] bg-card px-4 py-3.5 text-[17px] text-label placeholder:text-label-3 focus:outline-none"
    />
  );
}
