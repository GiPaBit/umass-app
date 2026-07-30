import { useEffect, useRef, useState } from 'react';
import { Button, Sheet } from '../components/ui.jsx';
import { compressImage, makeQuickEvent, parsePastedText, saveQuickEvent } from '../lib/quickEvents.js';

/**
 * Quick Add: paste a flyer caption (or attach the flyer photo) and the details
 * are pre-filled, then confirmed by hand before saving. Everything stays local.
 */
export function QuickAddSheet({ open, existing, onClose }) {
  const [form, setForm] = useState(blank());
  const [pasted, setPasted] = useState('');
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setPasted('');
    setForm(existing ? fromEvent(existing) : blank());
  }, [open, existing]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function applyPaste(text) {
    setPasted(text);
    if (!text.trim()) return;
    const parsed = parsePastedText(text);
    setForm((f) => ({
      ...f,
      title: parsed.title || f.title,
      date: parsed.date || f.date,
      time: parsed.time || f.time,
      location: parsed.location || f.location,
      notes: f.notes || parsed.notes,
    }));
  }

  async function onPickImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      setForm((f) => ({ ...f, imageDataUrl: dataUrl }));
    } catch (err) {
      setError(err.message);
    }
  }

  function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return setError('Give it a name so you can find it later.');
    if (!form.date) return setError('Pick a date.');

    // A time is optional — without one the event is treated as all-day.
    const start = form.time ? `${form.date}T${form.time}` : form.date;

    try {
      const event = makeQuickEvent({ ...form, start });
      saveQuickEvent(existing ? { ...event, id: existing.id, createdAt: existing.createdAt } : event);
      onClose();
    } catch (err) {
      setError(
        /quota/i.test(err?.name || err?.message || '')
          ? 'Out of local storage — remove an event with a photo and try again.'
          : err.message,
      );
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={existing ? 'Edit Event' : 'Quick Add'}
      action={
        <button
          type="submit"
          form="quick-add-form"
          className="ios-press-scale text-[17px] font-semibold text-ios-blue"
        >
          Save
        </button>
      }
    >
      <form id="quick-add-form" onSubmit={submit} className="px-4 pt-4">
        <label className="block">
          <span className="px-1 text-[13px] font-medium text-label-2">
            Paste a caption or flyer text
          </span>
          <textarea
            value={pasted}
            onChange={(e) => applyPaste(e.target.value)}
            rows={3}
            placeholder={'e.g. "Rooftop party @ Puffton — Aug 14, 10pm, byob"'}
            className="mt-1.5 w-full resize-none rounded-[12px] bg-card px-3.5 py-3 text-[16px] text-label placeholder:text-label-3 focus:outline-none"
          />
          <span className="px-1 text-[12px] text-label-3">
            Details below get filled in automatically — check them before saving.
          </span>
        </label>

        <div className="mt-5 overflow-hidden rounded-[16px] bg-card">
          <Field label="Name">
            <input
              value={form.title}
              onChange={set('title')}
              placeholder="Event name"
              className="w-full bg-transparent text-[17px] text-label placeholder:text-label-3 focus:outline-none"
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              value={form.date}
              onChange={set('date')}
              className="w-full bg-transparent text-[17px] text-label focus:outline-none"
            />
          </Field>
          <Field label="Time">
            <input
              type="time"
              value={form.time}
              onChange={set('time')}
              className="w-full bg-transparent text-[17px] text-label focus:outline-none"
            />
          </Field>
          <Field label="Where">
            <input
              value={form.location}
              onChange={set('location')}
              placeholder="Optional"
              className="w-full bg-transparent text-[17px] text-label placeholder:text-label-3 focus:outline-none"
            />
          </Field>
          <Field label="Link" last>
            <input
              value={form.url}
              onChange={set('url')}
              inputMode="url"
              placeholder="Optional"
              className="w-full bg-transparent text-[17px] text-label placeholder:text-label-3 focus:outline-none"
            />
          </Field>
        </div>

        <div className="mt-5 overflow-hidden rounded-[16px] bg-card p-3.5">
          <textarea
            value={form.notes}
            onChange={set('notes')}
            rows={3}
            placeholder="Notes"
            className="w-full resize-none bg-transparent text-[16px] text-label placeholder:text-label-3 focus:outline-none"
          />
        </div>

        <div className="mt-5">
          {form.imageDataUrl ? (
            <div className="relative">
              <img src={form.imageDataUrl} alt="" className="w-full rounded-[16px] object-cover" />
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, imageDataUrl: null }))}
                className="ios-press-scale absolute top-2 right-2 rounded-full bg-black/60 px-3 py-1 text-[13px] font-medium text-white"
              >
                Remove
              </button>
            </div>
          ) : (
            <Button variant="gray" className="w-full" onClick={() => fileRef.current?.click()}>
              Add flyer photo
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onPickImage}
            className="hidden"
          />
        </div>

        {error && <p className="mt-4 text-center text-[14px] text-ios-red">{error}</p>}

        <div className="py-6">
          <Button type="submit" className="w-full">
            {existing ? 'Save changes' : 'Add to Events'}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

function Field({ label, children, last }) {
  return (
    <div
      style={{ '--sep-inset': '16px' }}
      className={`relative flex items-center gap-3 px-4 py-[11px] ${last ? '' : 'ios-separator'}`}
    >
      <span className="w-[64px] shrink-0 text-[15px] text-label-2">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function blank() {
  return { title: '', date: '', time: '', location: '', notes: '', url: '', imageDataUrl: null };
}

function fromEvent(event) {
  const start = event.start || '';
  const [date, time] = start.includes('T') ? start.split('T') : [start, ''];
  return {
    title: event.title || '',
    date: date || '',
    time: (time || '').slice(0, 5),
    location: event.location || '',
    notes: event.description || '',
    url: event.url || '',
    imageDataUrl: event.imageUrl || null,
  };
}
