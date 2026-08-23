import { MORNING_SLOTS, AFTERNOON_SLOTS, HOURS, MINUTES_LIST } from './constants';

interface TimePickerWidgetProps {
  timeMode: 'slot' | 'custom';
  selectedDate: string;
  selectedSlot: string;
  customHour: string;
  customMinute: string;
  onTimeModeChange: (mode: 'slot' | 'custom') => void;
  onSlotSelect: (slot: string) => void;
  onCustomHourChange: (hour: string) => void;
  onCustomMinuteChange: (minute: string) => void;
  checkSlotBookingStatus: (date: string, time: string) => { isBooked: boolean; isPast: boolean; status: 'pending' | 'confirmed' | 'cancelled' | null; patientName: string };
  hourAvailabilityMap: Map<string, { isHourPast: boolean; isFullyBooked: boolean; isHourDisabled: boolean }>;
  slotStatusMap: Map<string, { isBooked: boolean; isPast: boolean; status: 'pending' | 'confirmed' | 'cancelled' | null; patientName: string }>;
}

export default function TimePickerWidget({
  timeMode,
  selectedDate,
  selectedSlot,
  customHour,
  customMinute,
  onTimeModeChange,
  onSlotSelect,
  onCustomHourChange,
  onCustomMinuteChange,
  checkSlotBookingStatus,
  hourAvailabilityMap,
  slotStatusMap,
}: TimePickerWidgetProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
          เลือกเวลา (ช่วงละ 30 นาที) <span className="text-rose-500">*</span>
        </label>

        <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold border border-slate-200">
          <button
            type="button"
            onClick={() => onTimeModeChange('slot')}
            className={`px-2 py-0.5 rounded-md transition ${
              timeMode === 'slot' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            รอบมาตรฐาน
          </button>
          <button
            type="button"
            onClick={() => onTimeModeChange('custom')}
            className={`px-2 py-0.5 rounded-md transition ${
              timeMode === 'custom' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            กำหนดเวลาเอง
          </button>
        </div>
      </div>

      {timeMode === 'slot' ? (
        /* Mode 1: Quick Slots Grid */
        <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-2.5">
          <div>
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
              🌅 ช่วงเช้า (Morning)
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {MORNING_SLOTS.map((slot) => {
                const { isBooked, isPast, status } = checkSlotBookingStatus(selectedDate, slot);
                const isSelected = selectedSlot === slot;
                const isDisabled = isBooked || isPast;

                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => onSlotSelect(slot)}
                    className={`h-[48px] px-1.5 rounded-xl font-bold transition flex flex-col items-center justify-center border ${
                      isPast
                        ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed opacity-50'
                        : isBooked
                        ? 'bg-rose-50/80 text-rose-400 border-rose-200 cursor-not-allowed opacity-75'
                        : isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-[1.02]'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/40'
                    }`}
                  >
                    <span className={`text-xs ${isPast ? 'line-through' : ''}`}>{slot} น.</span>
                    <span
                      className={`text-[9px] leading-tight font-medium ${
                        isPast
                          ? 'text-slate-400 font-normal'
                          : isBooked
                          ? 'text-rose-500 font-semibold'
                          : isSelected
                          ? 'text-blue-100'
                          : 'text-emerald-600'
                      }`}
                    >
                      {isPast
                        ? 'ผ่านไปแล้ว'
                        : isBooked
                        ? status === 'confirmed'
                          ? 'ยืนยันแล้ว'
                          : 'รอยืนยัน'
                        : 'ว่าง'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
              ☀️ ช่วงบ่าย (Afternoon)
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {AFTERNOON_SLOTS.map((slot) => {
                const { isBooked, isPast, status } = checkSlotBookingStatus(selectedDate, slot);
                const isSelected = selectedSlot === slot;
                const isDisabled = isBooked || isPast;

                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => onSlotSelect(slot)}
                    className={`h-[48px] px-1.5 rounded-xl font-bold transition flex flex-col items-center justify-center border ${
                      isPast
                        ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed opacity-50'
                        : isBooked
                        ? 'bg-rose-50/80 text-rose-400 border-rose-200 cursor-not-allowed opacity-75'
                        : isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-[1.02]'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/40'
                    }`}
                  >
                    <span className={`text-xs ${isPast ? 'line-through' : ''}`}>{slot} น.</span>
                    <span
                      className={`text-[9px] leading-tight font-medium ${
                        isPast
                          ? 'text-slate-400 font-normal'
                          : isBooked
                          ? 'text-rose-500 font-semibold'
                          : isSelected
                          ? 'text-blue-100'
                          : 'text-emerald-600'
                      }`}
                    >
                      {isPast
                        ? 'ผ่านไปแล้ว'
                        : isBooked
                        ? status === 'confirmed'
                          ? 'ยืนยันแล้ว'
                          : 'รอยืนยัน'
                        : 'ว่าง'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between text-[10px] text-slate-500 px-1 font-medium gap-2">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span> ว่าง
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span> จองแล้ว
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-300"></span> ผ่านไปแล้ว
            </span>
          </div>
        </div>
      ) : (
        /* Mode 2: Custom Digital Scrollable Time Picker with Hour & Minute auto-disable */
        <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between shadow-xs">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              เวลาที่เลือก
            </span>
            <span className="text-base font-black text-blue-700 font-mono tracking-wider">
              {customHour} : {customMinute} น.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Hour Column */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1 text-center">
                ชั่วโมง (00 - 23)
              </label>
              <div className="h-40 overflow-y-auto p-1 bg-white border border-slate-200 rounded-xl space-y-1 shadow-inner scrollbar-thin">
                {HOURS.map((h) => {
                  const hourInfo = hourAvailabilityMap.get(h) || { isHourPast: false, isFullyBooked: false, isHourDisabled: false };
                  const { isHourPast, isFullyBooked, isHourDisabled } = hourInfo;
                  const isSelected = customHour === h && !isHourDisabled;

                  return (
                    <button
                      key={h}
                      type="button"
                      disabled={isHourDisabled}
                      onClick={() => {
                        onCustomHourChange(h);
                        const firstFreeMin = MINUTES_LIST.find((m) => {
                          const slot = slotStatusMap.get(`${h}:${m}`);
                          return slot ? !slot.isBooked && !slot.isPast : true;
                        });
                        if (firstFreeMin) onCustomMinuteChange(firstFreeMin);
                      }}
                      className={`w-full py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-between px-2 ${
                        isHourPast
                          ? 'bg-slate-100 text-slate-300 cursor-not-allowed line-through opacity-50'
                          : isFullyBooked
                          ? 'bg-rose-50/80 text-rose-400 border border-rose-200 cursor-not-allowed line-through opacity-75'
                          : isSelected
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 scale-[1.02]'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <span className={isHourDisabled ? 'line-through' : ''}>{h} : 00 น.</span>
                      {isHourPast ? (
                        <span className="text-[9px] font-normal text-slate-400">ผ่านแล้ว</span>
                      ) : isFullyBooked ? (
                        <span className="text-[9px] font-bold text-rose-500">เต็มแล้ว</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minute Column */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1 text-center">
                นาที (MINUTES)
              </label>
              <div className="h-40 overflow-y-auto p-1 bg-white border border-slate-200 rounded-xl space-y-1 shadow-inner scrollbar-thin">
                {MINUTES_LIST.map((m) => {
                  const slot = slotStatusMap.get(`${customHour}:${m}`) || { isBooked: false, isPast: false, status: null };
                  const { isBooked, isPast, status } = slot;
                  const isDisabled = isBooked || isPast;
                  const isSelected = customMinute === m && !isDisabled;

                  return (
                    <button
                      key={m}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => onCustomMinuteChange(m)}
                      className={`w-full py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-between px-2 ${
                        isPast
                          ? 'bg-slate-100 text-slate-300 cursor-not-allowed line-through opacity-50'
                          : isBooked
                          ? 'bg-rose-50 text-rose-400 border border-rose-200 cursor-not-allowed opacity-75'
                          : isSelected
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 scale-[1.02]'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <span className={isPast ? 'line-through' : ''}>:{m} นาที</span>
                      {isPast ? (
                        <span className="text-[9px] text-slate-400 font-normal">ผ่านแล้ว</span>
                      ) : isBooked ? (
                        <span className="text-[9px] text-rose-500 font-semibold">
                          {status === 'confirmed' ? 'ยืนยันแล้ว' : 'รอยืนยัน'}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-200/60 flex flex-wrap items-center justify-between text-[10px] text-slate-500 px-1 font-medium gap-2">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span> ว่าง
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span> จองแล้ว
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-300"></span> ผ่านไปแล้ว
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
