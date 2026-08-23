import { THAI_MONTHS, WEEKDAYS } from './constants';

interface CalendarWidgetProps {
  currentYear: number;
  currentMonth: number;
  selectedDate: string;
  todayStr: string;
  onDateSelect: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToToday: () => void;
}

export default function CalendarWidget({
  currentYear,
  currentMonth,
  selectedDate,
  todayStr,
  onDateSelect,
  onPrevMonth,
  onNextMonth,
  onGoToToday,
}: CalendarWidgetProps) {
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const renderCalendarDays = () => {
    const totalDays = daysInMonth(currentYear, currentMonth);
    const startDay = firstDayOfMonth(currentYear, currentMonth);
    const days = [];

    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-full"></div>);
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isSelected = selectedDate === dateString;
      const isTodayDate = todayStr === dateString;
      const isPastDate = dateString < todayStr;

      days.push(
        <button
          key={d}
          type="button"
          disabled={isPastDate}
          onClick={() => onDateSelect(dateString)}
          className={`h-8 w-full rounded-xl text-xs font-bold transition flex items-center justify-center relative ${
            isPastDate
              ? 'text-slate-300 cursor-not-allowed line-through'
              : isSelected
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105 z-10'
              : isTodayDate
              ? 'bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          {d}
          {isTodayDate && !isSelected && (
            <span className="absolute bottom-1 w-1 h-1 bg-blue-600 rounded-full"></span>
          )}
        </button>
      );
    }
    return days;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
          เลือกวันที่ <span className="text-rose-500">*</span>
        </label>
        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
          {selectedDate
            ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('th-TH', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: '2-digit',
              })
            : 'ยังไม่ได้เลือก'}
        </span>
      </div>

      {/* Calendar Widget Card */}
      <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-2xl">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-800 text-xs sm:text-sm">
              {THAI_MONTHS[currentMonth]} {currentYear + 543}
            </span>
            <button
              type="button"
              onClick={onGoToToday}
              title="กลับมาวันนี้"
              className="text-[10px] px-2 py-0.5 font-bold rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPrevMonth}
              className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 transition"
              aria-label="Previous Month"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onNextMonth}
              className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 transition"
              aria-label="Next Month"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {WEEKDAYS.map((w, idx) => (
            <span
              key={w}
              className={`text-[10px] font-bold ${
                idx === 0 ? 'text-rose-500' : idx === 6 ? 'text-blue-500' : 'text-slate-400'
              }`}
            >
              {w}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">{renderCalendarDays()}</div>
      </div>
    </div>
  );
}
