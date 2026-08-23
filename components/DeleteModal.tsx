import { Appointment } from './types';

interface DeleteModalProps {
  isOpen: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteModal({ isOpen, appointment, onClose, onConfirm }: DeleteModalProps) {
  if (!isOpen || !appointment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
        <h3 className="text-lg font-bold text-slate-900">ยืนยันการลบข้อมูล?</h3>
        <p className="text-sm text-slate-500 mt-2">
          ต้องการลบนัดหมายของ <span className="font-bold text-slate-900">&quot;{appointment.patientName}&quot;</span> ออกจากระบบหรือไม่?
        </p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-rose-600/25 transition"
          >
            ลบข้อมูล
          </button>
        </div>
      </div>
    </div>
  );
}
