import { Appointment } from './types';

interface AppointmentCardProps {
  appt: Appointment;
  onUpdateStatus: (id: string | number, newStatus: 'pending' | 'confirmed' | 'cancelled') => void;
  onDeleteClick: (appointment: Appointment) => void;
}

export default function AppointmentCard({ appt, onUpdateStatus, onDeleteClick }: AppointmentCardProps) {
  return (
    <div
      className={`group bg-white hover:bg-slate-50/90 border rounded-2xl p-4 sm:p-5 transition duration-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
        appt.status === 'pending' ? 'border-amber-200/90 bg-amber-50/20' : 'border-slate-200/90'
      }`}
    >
      <div className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
            #{appt.id}
          </span>
          <h3 className="font-bold text-slate-900 text-base">{appt.patientName}</h3>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              appt.status === 'confirmed'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : appt.status === 'cancelled'
                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                : 'bg-amber-100 text-amber-800 border border-amber-200 shadow-xs'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                appt.status === 'confirmed'
                  ? 'bg-emerald-500'
                  : appt.status === 'cancelled'
                  ? 'bg-rose-500'
                  : 'bg-amber-500'
              }`}
            ></span>
            {appt.status === 'confirmed'
              ? 'ยืนยันแล้ว'
              : appt.status === 'cancelled'
              ? 'ยกเลิก'
              : 'รอยืนยัน (Pending)'}
          </span>
        </div>

        {/* Appointment DateTime info */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {new Date(appt.appointmentAt).toLocaleDateString('th-TH', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
          <span className="flex items-center gap-1 font-bold text-slate-700">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {new Date(appt.appointmentAt).toLocaleTimeString('th-TH', {
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            น.
          </span>
        </div>
      </div>

      {/* Staff Full Action Controls */}
      <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
        {/* Pending: Staff can Confirm or Cancel */}
        {appt.status === 'pending' && (
          <>
            <button
              onClick={() => onUpdateStatus(appt.id, 'confirmed')}
              title="อนุมัติและยืนยันนัดหมายนี้"
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition duration-150 flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              ยืนยันนัดหมาย
            </button>
            <button
              onClick={() => onUpdateStatus(appt.id, 'cancelled')}
              title="ปฏิเสธ/ยกเลิกนัดหมายนี้"
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 text-xs font-bold rounded-xl transition duration-150 flex items-center gap-1.5 shadow-xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              ปฏิเสธ / ยกเลิก
            </button>
          </>
        )}

        {/* Confirmed: Staff can Cancel if needed */}
        {appt.status === 'confirmed' && (
          <button
            onClick={() => onUpdateStatus(appt.id, 'cancelled')}
            title="ยกเลิกนัดหมายนี้"
            className="px-3 py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 border border-slate-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            ยกเลิกนัดหมาย
          </button>
        )}

        {/* Cancelled: Staff can Reopen to Pending */}
        {appt.status === 'cancelled' && (
          <button
            onClick={() => onUpdateStatus(appt.id, 'pending')}
            title="เปลี่ยนกลับเป็นรอยืนยันอีกครั้ง"
            className="px-3 py-2 bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5 border border-slate-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            กู้คืนเป็นรอยืนยัน
          </button>
        )}

        {/* Delete Button */}
        <button
          onClick={() => onDeleteClick(appt)}
          title="ลบข้อมูลออกจากฐานข้อมูลถาวร"
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-transparent hover:border-rose-200"
          aria-label="Delete"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
