import { useMemo, useState } from 'react';

const statusStyles = {
  available: 'bg-mint-400 hover:bg-mint-500 cursor-pointer',
  booked: 'bg-brand-400 cursor-not-allowed opacity-70',
  busy: 'bg-coral-500 cursor-not-allowed opacity-70',
  selected: 'bg-ink cursor-pointer ring-2 ring-offset-2 ring-ink',
};

const dayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' });
const timeFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

export default function CalendarPicker({ slots, onSelect }) {
  const [selectedId, setSelectedId] = useState(null);

  // Regroupe les créneaux par jour pour construire une grille type "maquette"
  const byDay = useMemo(() => {
    const map = new Map();
    for (const slot of slots) {
      const key = new Date(slot.start_time).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(slot);
    }
    return Array.from(map.entries()).slice(0, 5); // 5 prochains jours, comme la maquette (Mon-Fri)
  }, [slots]);

  function handleClick(slot) {
    if (slot.status !== 'available') return;
    setSelectedId(slot.id);
    onSelect?.(slot);
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-black/15 p-8 text-center text-sm text-ink/50">
        Aucun créneau disponible pour le moment.
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {byDay.map(([day, daySlots]) => (
          <div key={day} className="min-w-0">
            <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-ink/50">
              {dayFormatter.format(new Date(day))}
            </p>
            <div className="flex flex-col gap-1.5">
              {daySlots.map((slot) => {
                const isSelected = selectedId === slot.id;
                const style = isSelected ? statusStyles.selected : statusStyles[slot.status];
                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={slot.status !== 'available'}
                    onClick={() => handleClick(slot)}
                    title={`${timeFormatter.format(new Date(slot.start_time))} - ${slot.status}`}
                    className={`h-9 w-full rounded-md text-xs font-medium text-white transition ${style}`}
                  >
                    {timeFormatter.format(new Date(slot.start_time))}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-center gap-6 text-sm text-ink/60">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-mint-400" /> Disponible
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-brand-400" /> Réservé
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-coral-500" /> Occupé
        </span>
      </div>
    </div>
  );
}
