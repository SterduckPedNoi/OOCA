'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface Appointment {
  id: string | number;
  patientName: string;
  appointmentAt: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt?: string;
}

interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

// รายการช่วงเวลามาตรฐาน (30 นาที) แบ่งเป็นช่วงเช้าและบ่าย
const MORNING_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
const AFTERNOON_SLOTS = ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

export default function AppointmentApp() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]); // สำหรับคำนวณ Slot ว่างเสมอ
  const [loading, setLoading] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<string>('');

  // ฟอร์มสร้างนัดหมาย
  const [patientName, setPatientName] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [timeMode, setTimeMode] = useState<'slot' | 'custom'>('slot');
  const [selectedSlot, setSelectedSlot] = useState<string>('09:00');
  const [customHour, setCustomHour] = useState<string>('09');
  const [customMinute, setCustomMinute] = useState<string>('00');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Custom Calendar State
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-11

  // การแจ้งเตือน Toast Box
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Modal ยืนยันการลบ
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; appointment: Appointment | null }>({
    isOpen: false,
    appointment: null,
  });

  // วันที่ปัจจุบันในรูปแบบ YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Helper สำหรับเพิ่ม Toast แจ้งเตือน
  const showToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // ดึงข้อมูลนัดหมายทั้งหมด (สำหรับตรวจสอบการชนกันของเวลา)
  const fetchAllAppointments = async () => {
    try {
      const response = await fetch('http://localhost:3001/appointments');
      if (response.ok) {
        const data: Appointment[] = await response.json();
        setAllAppointments(data);
      }
    } catch (error) {
      console.error('Failed to fetch all appointments for validation:', error);
    }
  };

  // ดึงข้อมูลตามฟิลเตอร์
  const fetchAppointments = async (status: string = '') => {
    setLoading(true);
    try {
      const query = status ? `?status=${status}` : '';
      const response = await fetch(`http://localhost:3001/appointments${query}`);
      if (response.ok) {
        const data: Appointment[] = await response.json();
        setAppointments(data);
      } else {
        showToast('error', 'ดึงข้อมูลไม่สำเร็จ', 'ไม่สามารถโหลดรายการนัดหมายได้');
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      showToast('error', 'การเชื่อมต่อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ Backend (Port 3001)');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments(filterStatus);
    fetchAllAppointments();
  }, [filterStatus]);

  // ตั้งค่าวันที่เริ่มต้นเป็นวันพรุ่งนี้
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tmStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    setSelectedDate(tmStr);
    setCurrentYear(tomorrow.getFullYear());
    setCurrentMonth(tomorrow.getMonth());
  }, []);

  // ฟังก์ชันตรวจสอบว่าช่วงเวลาดังกล่าวถูกจองแล้ว หรือเป็นเวลาที่ผ่านไปแล้วหรือไม่
  const checkSlotBookingStatus = (dateStr: string, timeStr: string) => {
    if (!dateStr || !timeStr) return { isBooked: false, isPast: false, status: null };

    const slotDateTime = new Date(`${dateStr}T${timeStr}:00`);
    const targetTime = slotDateTime.getTime();
    const now = new Date().getTime();

    // 1. ตรวจสอบว่าช่วงเวลานี้ผ่านไปแล้วหรือไม่
    const isPast = targetTime <= now;

    const thirtyMinutes = 30 * 60 * 1000;

    // 2. ตรวจสอบว่าถูกจองแล้วหรือไม่ (Pending หรือ Confirmed จะจองไม่ได้, Cancelled ถือว่าว่าง)
    const matchedAppt = allAppointments.find((appt) => {
      if (appt.status === 'cancelled') return false;
      const apptTime = new Date(appt.appointmentAt).getTime();
      return Math.abs(targetTime - apptTime) < thirtyMinutes;
    });

    if (matchedAppt) {
      return {
        isBooked: true,
        isPast,
        status: matchedAppt.status, // 'pending' | 'confirmed'
        patientName: matchedAppt.patientName,
      };
    }

    return { isBooked: false, isPast, status: null };
  };

  // เวลาที่เลือกปัจจุบัน
  const currentEffectiveTime = timeMode === 'slot' ? selectedSlot : `${customHour}:${customMinute}`;

  // ตรวจสอบว่าเวลาที่เลือกในปัจจุบันว่างหรือไม่ และผ่านไปแล้วหรือไม่
  const currentSlotStatus = useMemo(() => {
    return checkSlotBookingStatus(selectedDate, currentEffectiveTime);
  }, [selectedDate, currentEffectiveTime, allAppointments]);

  // สร้างการนัดหมาย
  const handleCreateAppointment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!patientName.trim()) {
      showToast('warning', 'ข้อมูลไม่ครบถ้วน', 'กรุณาระบุชื่อผู้ป่วย');
      return;
    }

    if (!selectedDate || !currentEffectiveTime) {
      showToast('warning', 'ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกวันและเวลาที่นัดหมาย');
      return;
    }

    // ตรวจสอบว่าเวลาถูกจองไปแล้วหรือไม่
    if (currentSlotStatus.isBooked) {
      showToast(
        'error',
        'เวลาดังกล่าวถูกจองแล้ว',
        `ช่วงเวลานี้มีนัดหมายสถานะ "${currentSlotStatus.status === 'confirmed' ? 'ยืนยันแล้ว' : 'รอยืนยัน'}" อยู่แล้ว กรุณาเลือกช่วงเวลาอื่น`
      );
      return;
    }

    const combinedDateTime = `${selectedDate}T${currentEffectiveTime}:00`;
    const appointmentDate = new Date(combinedDateTime);

    if (appointmentDate <= new Date()) {
      showToast('warning', 'เวลาไม่ถูกต้อง', 'วันและเวลาที่นัดหมายต้องเป็นเวลาในอนาคตเท่านั้น');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:3001/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: patientName.trim(),
          appointmentAt: combinedDateTime,
        }),
      });

      const resData = await response.json();

      if (response.status === 201) {
        showToast('success', 'บันทึกสำเร็จ!', `สร้างนัดหมายของคุณ ${patientName} เรียบร้อยแล้ว`);
        setPatientName('');
        fetchAppointments(filterStatus);
        fetchAllAppointments();
      } else if (response.status === 409) {
        showToast(
          'error',
          'เวลาซ้ำซ้อน (409 Conflict)',
          'ช่วงเวลานี้มีผู้อื่นนัดหมายไว้แล้ว (ระยะห่างน้อยกว่า 30 นาที) กรุณาเลือกช่วงเวลาอื่น'
        );
      } else {
        showToast('error', 'บันทึกไม่สำเร็จ', resData.error || 'เกิดข้อผิดพลาดในการสร้างนัดหมาย');
      }
    } catch (error) {
      showToast('error', 'การเชื่อมต่อผิดพลาด', 'ไม่สามารถส่งข้อมูลไปยังเซิร์ฟเวอร์ได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  // อัปเดตสถานะ (ยืนยัน / ยกเลิก)
  const handleUpdateStatus = async (id: string | number, newStatus: 'confirmed' | 'cancelled') => {
    try {
      const response = await fetch(`http://localhost:3001/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const statusText = newStatus === 'confirmed' ? 'ยืนยันนัดหมายเรียบร้อย' : 'ยกเลิกนัดหมายเรียบร้อย (ช่วงเวลานี้จะกลับมาว่างให้จองได้)';
        showToast(newStatus === 'confirmed' ? 'success' : 'info', 'อัปเดตสถานะสำเร็จ', statusText);
        fetchAppointments(filterStatus);
        fetchAllAppointments();
      } else {
        const errData = await response.json();
        showToast('error', 'เกิดข้อผิดพลาด', errData.error || 'ไม่สามารถอัปเดตสถานะได้');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      showToast('error', 'การเชื่อมต่อผิดพลาด', 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้');
    }
  };

  // ลบข้อมูลการนัดหมาย
  const confirmDeleteAppointment = async () => {
    if (!deleteModal.appointment) return;
    const { id, patientName } = deleteModal.appointment;

    try {
      const response = await fetch(`http://localhost:3001/appointments/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showToast('success', 'ลบข้อมูลสำเร็จ', `ลบรายการนัดหมายของคุณ ${patientName} เรียบร้อยแล้ว`);
        fetchAppointments(filterStatus);
        fetchAllAppointments();
      } else {
        const errData = await response.json();
        showToast('error', 'ลบไม่สำเร็จ', errData.error || 'ไม่สามารถลบรายการนัดหมายได้');
      }
    } catch (error) {
      console.error('Failed to delete appointment:', error);
      showToast('error', 'การเชื่อมต่อผิดพลาด', 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้');
    } finally {
      setDeleteModal({ isOpen: false, appointment: null });
    }
  };

  // ปฏิทิน: เปลี่ยนเดือน
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // สร้าง Array วันของเดือนสำหรับปฏิทิน
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 (Sun) - 6 (Sat)
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const days: Array<{ day: number | null; dateStr: string | null; isPast: boolean; isToday: boolean }> = [];

    // ช่องว่างก่อนวันแรกของเดือน
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null, dateStr: null, isPast: true, isToday: false });
    }

    // วันในเดือน
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isPast = dateStr < todayStr;
      const isToday = dateStr === todayStr;
      days.push({ day: d, dateStr, isPast, isToday });
    }

    return days;
  }, [currentYear, currentMonth, todayStr]);

  // คำนวณสถิติ
  const stats = {
    total: appointments.length,
    pending: appointments.filter((a) => a.status === 'pending').length,
    confirmed: appointments.filter((a) => a.status === 'confirmed').length,
    cancelled: appointments.filter((a) => a.status === 'cancelled').length,
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      {/* ================= TOAST NOTIFICATION BOX CONTAINER ================= */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto transform transition-all duration-300 ease-out flex items-start gap-3.5 p-4 rounded-2xl shadow-xl border backdrop-blur-md ${toast.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-300 text-emerald-950 shadow-emerald-500/10'
                : toast.type === 'error'
                  ? 'bg-rose-50/95 border-rose-300 text-rose-950 shadow-rose-500/10'
                  : toast.type === 'warning'
                    ? 'bg-amber-50/95 border-amber-300 text-amber-950 shadow-amber-500/10'
                    : 'bg-blue-50/95 border-blue-300 text-blue-950 shadow-blue-500/10'
              }`}
          >
            {/* Icon */}
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && (
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              {toast.type === 'error' && (
                <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
              {toast.type === 'warning' && (
                <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              )}
              {toast.type === 'info' && (
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-1">
              <h4 className="font-bold text-sm tracking-tight">{toast.title}</h4>
              <p className="text-xs leading-relaxed opacity-90 mt-0.5 font-medium">{toast.message}</p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-1.5 rounded-lg hover:bg-black/5 text-slate-400 hover:text-slate-700 transition"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 transform transition-all scale-100">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 mx-auto">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-center text-slate-900">ยืนยันการลบข้อมูลนัดหมาย?</h3>
            <p className="text-sm text-slate-500 text-center mt-2">
              คุณแน่ใจหรือไม่ว่าต้องการลบรายการนัดหมายของ{' '}
              <span className="font-semibold text-slate-800">"{deleteModal.appointment?.patientName}"</span>{' '}
              (ข้อมูลจะถูกลบออกจากฐานข้อมูลถาวร)
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteModal({ isOpen: false, appointment: null })}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDeleteAppointment}
                className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-rose-600/25 transition"
              >
                ลบข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MAIN CONTAINER ================= */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Top Header */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/25">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Mini Appointment App</h1>
              <p className="text-sm text-slate-500 mt-0.5">ระบบจัดการนัดหมายผู้ป่วยและจัดตารางเวลา</p>
            </div>
          </div>

          {/* Quick Stats Pills: Cancelled=Red, Pending=Yellow, Confirmed=Green */}
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 shadow-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
              ทั้งหมด: <span className="text-slate-900 font-extrabold">{stats.total}</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 shadow-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              รอยืนยัน: <span className="font-extrabold">{stats.pending}</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              ยืนยันแล้ว: <span className="font-extrabold">{stats.confirmed}</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 shadow-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              ยกเลิก: <span className="font-extrabold">{stats.cancelled}</span>
            </div>
          </div>
        </header>

        {/* Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ================= LEFT COLUMN: BOOKING FORM ================= */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-7 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500"></div>

              <div className="flex items-center gap-2.5 mb-6">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-slate-900">เพิ่มการนัดหมายใหม่</h2>
              </div>

              <form onSubmit={handleCreateAppointment} className="space-y-6">

                {/* 1. Patient Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    ชื่อผู้ป่วย <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="ระบุชื่อ-นามสกุล เช่น สมชาย ใจดี"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      required
                    />
                  </div>
                </div>

                {/* 2. CUSTOM INLINE CALENDAR (แทนที่ Input เดิมที่ไม่สวย) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      เลือกวันที่ <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
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
                  <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl">
                    {/* Month / Year Header with Controls & Go To Today Button */}
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-slate-800">
                          {THAI_MONTHS[currentMonth]} {currentYear + 543}
                        </h4>
                        {(currentYear !== today.getFullYear() || currentMonth !== today.getMonth() || selectedDate !== todayStr) && (
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date();
                              setCurrentYear(d.getFullYear());
                              setCurrentMonth(d.getMonth());
                              setSelectedDate(todayStr);
                            }}
                            title="คลิกเพื่อกลับมาเดือน/วันที่ปัจจุบัน"
                            className="px-2 py-0.5 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition shadow-xs flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Today
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={prevMonth}
                          className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition"
                          aria-label="Previous Month"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={nextMonth}
                          className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition"
                          aria-label="Next Month"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Day-of-Week Headers */}
                    <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                      {WEEKDAYS.map((wd, idx) => (
                        <div
                          key={wd}
                          className={`text-[11px] font-extrabold py-1 ${idx === 0 ? 'text-rose-500' : idx === 6 ? 'text-blue-500' : 'text-slate-400'
                            }`}
                        >
                          {wd}
                        </div>
                      ))}
                    </div>

                    {/* Date Grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((item, idx) => {
                        if (!item.day || !item.dateStr) {
                          return <div key={`empty-${idx}`} className="h-8" />;
                        }

                        const isSelected = selectedDate === item.dateStr;
                        const isPast = item.isPast;

                        return (
                          <button
                            key={item.dateStr}
                            type="button"
                            disabled={isPast}
                            onClick={() => setSelectedDate(item.dateStr!)}
                            className={`h-8 rounded-xl text-xs font-bold flex items-center justify-center transition-all relative ${isSelected
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105'
                                : item.isToday
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                                  : isPast
                                    ? 'text-slate-300 cursor-not-allowed'
                                    : 'text-slate-700 hover:bg-slate-200 hover:text-slate-900 bg-white border border-slate-100'
                              }`}
                          >
                            {item.day}
                            {item.isToday && !isSelected && (
                              <span className="absolute bottom-1 w-1 h-1 bg-blue-500 rounded-full"></span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 3. TIME SELECTION (พร้อมระบบตรวจจับว่าเวลาถูกจองแล้วหรือไม่) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      เลือกเวลา <span className="text-rose-500">*</span>
                    </label>

                    {/* Mode Toggle */}
                    <div className="inline-flex p-0.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setTimeMode('slot')}
                        className={`px-2.5 py-1 rounded-lg transition ${timeMode === 'slot' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                          }`}
                      >
                        รอบมาตรฐาน
                      </button>
                      <button
                        type="button"
                        onClick={() => setTimeMode('custom')}
                        className={`px-2.5 py-1 rounded-lg transition ${timeMode === 'custom' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                          }`}
                      >
                        กำหนดเวลาเอง
                      </button>
                    </div>
                  </div>

                  {/* Mode 1: Standard Time Slots */}
                  {timeMode === 'slot' ? (
                    <div className="space-y-3 p-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl">
                      {/* Morning */}
                      <div>
                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                          ☀️ ช่วงเช้า (09:00 - 11:30)
                        </span>
                        <div className="grid grid-cols-3 gap-1.5">
                          {MORNING_SLOTS.map((slot) => {
                            const { isBooked, isPast, status } = checkSlotBookingStatus(selectedDate, slot);
                            const isDisabled = isBooked || isPast;
                            const isSelected = selectedSlot === slot && !isDisabled;

                            return (
                              <button
                                key={slot}
                                type="button"
                                disabled={isDisabled}
                                onClick={() => setSelectedSlot(slot)}
                                className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all flex flex-col items-center justify-center relative ${
                                  isPast
                                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                                    : isBooked
                                    ? 'bg-rose-50/80 text-rose-400 border-rose-200 cursor-not-allowed opacity-75'
                                    : isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-[1.02]'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/40'
                                }`}
                              >
                                <span className={isPast ? 'line-through' : ''}>{slot} น.</span>
                                {isPast ? (
                                  <span className="text-[9px] font-medium text-slate-400">
                                    ผ่านไปแล้ว
                                  </span>
                                ) : isBooked ? (
                                  <span className="text-[9px] font-semibold text-rose-500">
                                    {status === 'confirmed' ? 'ยืนยันแล้ว' : 'รอยืนยัน'}
                                  </span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Afternoon */}
                      <div>
                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                          ⛅ ช่วงบ่าย (13:00 - 17:00)
                        </span>
                        <div className="grid grid-cols-3 gap-1.5">
                          {AFTERNOON_SLOTS.map((slot) => {
                            const { isBooked, isPast, status } = checkSlotBookingStatus(selectedDate, slot);
                            const isDisabled = isBooked || isPast;
                            const isSelected = selectedSlot === slot && !isDisabled;

                            return (
                              <button
                                key={slot}
                                type="button"
                                disabled={isDisabled}
                                onClick={() => setSelectedSlot(slot)}
                                className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all flex flex-col items-center justify-center relative ${
                                  isPast
                                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                                    : isBooked
                                    ? 'bg-rose-50/80 text-rose-400 border-rose-200 cursor-not-allowed opacity-75'
                                    : isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-[1.02]'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/40'
                                }`}
                              >
                                <span className={isPast ? 'line-through' : ''}>{slot} น.</span>
                                {isPast ? (
                                  <span className="text-[9px] font-medium text-slate-400">
                                    ผ่านไปแล้ว
                                  </span>
                                ) : isBooked ? (
                                  <span className="text-[9px] font-semibold text-rose-500">
                                    {status === 'confirmed' ? 'ยืนยันแล้ว' : 'รอยืนยัน'}
                                  </span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* คำอธิบายสัญลักษณ์ */}
                      <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between text-[11px] text-slate-500 px-1 font-medium gap-2">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> เวลาว่าง
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span> จองแล้ว
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> ผ่านไปแล้ว
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Mode 2: Custom Digital Scrollable Time Picker (แทนที่ select dropdown เดิม) */
                    <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3.5">
                      {/* Digital Time Display Banner */}
                      <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-xs">
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          เวลาที่เลือก
                        </span>
                        <span className="text-lg font-black text-blue-700 font-mono tracking-wider">
                          {customHour} : {customMinute} น.
                        </span>
                      </div>

                      {/* Dual Scrollable Columns */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Hour Column */}
                        <div>
                          <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5 text-center">
                            ชั่วโมง (00 - 23)
                          </label>
                          <div className="h-44 overflow-y-auto p-1.5 bg-white border border-slate-200 rounded-xl space-y-1 shadow-inner scrollbar-thin">
                            {HOURS.map((h) => {
                              const now = new Date();
                              const isToday = selectedDate === todayStr;
                              const isHourPast = isToday && parseInt(h, 10) < now.getHours();
                              const isSelected = customHour === h && !isHourPast;

                              return (
                                <button
                                  key={h}
                                  type="button"
                                  disabled={isHourPast}
                                  onClick={() => setCustomHour(h)}
                                  className={`w-full py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                                    isHourPast
                                      ? 'bg-slate-100 text-slate-300 cursor-not-allowed line-through opacity-50'
                                      : isSelected
                                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 scale-[1.02]'
                                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                                  }`}
                                >
                                  {h} : 00 น.
                                  {isHourPast && <span className="text-[9px] ml-1 font-normal">(ผ่านไปแล้ว)</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Minute Column */}
                        <div>
                          <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5 text-center">
                            นาที (Minutes)
                          </label>
                          <div className="h-44 overflow-y-auto p-1.5 bg-white border border-slate-200 rounded-xl space-y-1 shadow-inner scrollbar-thin">
                            {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) => {
                              const { isBooked, isPast, status } = checkSlotBookingStatus(selectedDate, `${customHour}:${m}`);
                              const isDisabled = isBooked || isPast;
                              const isSelected = customMinute === m && !isDisabled;

                              return (
                                <button
                                  key={m}
                                  type="button"
                                  disabled={isDisabled}
                                  onClick={() => setCustomMinute(m)}
                                  className={`w-full py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-between px-2.5 ${
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

                      {/* คำอธิบายสัญลักษณ์ */}
                      <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between text-[11px] text-slate-500 px-1 font-medium gap-2">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> ว่าง
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span> จองแล้ว
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> ผ่านไปแล้ว
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Alert (ถ้าเวลาที่เลือกไม่ว่าง หรือเป็นเวลาที่ผ่านไปแล้ว) */}
                {currentSlotStatus.isPast ? (
                  <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-300 text-slate-700 text-xs flex items-center gap-2.5 animate-fade-in">
                    <svg className="w-5 h-5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <span className="font-bold">เวลาผ่านไปแล้ว:</span> ไม่สามารถนัดหมายย้อนหลังได้ กรุณาเลือกช่วงเวลาในอนาคต
                    </div>
                  </div>
                ) : currentSlotStatus.isBooked ? (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2.5 animate-fade-in">
                    <svg className="w-5 h-5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <span className="font-bold">เวลานี้ไม่ว่าง:</span> มีการนัดหมายสถานะ{' '}
                      <span className="font-bold">{currentSlotStatus.status === 'confirmed' ? 'ยืนยันแล้ว' : 'รอยืนยัน'}</span>{' '}
                      อยู่แล้ว กรุณาเลือกช่วงเวลาอื่น
                    </div>
                  </div>
                ) : null}

                {/* Selected Slot Summary Preview */}
                {selectedDate && !currentSlotStatus.isBooked && !currentSlotStatus.isPast && (
                  <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-4 text-xs text-blue-950 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-bold text-sm text-blue-900">สรุปเวลานัดหมาย</div>
                      <div className="text-slate-600 mt-0.5 font-medium">
                        {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('th-TH', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}{' '}
                        เวลา <span className="font-bold text-blue-700">{currentEffectiveTime} น.</span> (30 นาที)
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || currentSlotStatus.isBooked || currentSlotStatus.isPast}
                  className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 ${
                    isSubmitting || currentSlotStatus.isBooked || currentSlotStatus.isPast
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/30'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      กำลังบันทึก...
                    </>
                  ) : currentSlotStatus.isPast ? (
                    'ช่วงเวลานี้ผ่านไปแล้ว'
                  ) : currentSlotStatus.isBooked ? (
                    'ช่วงเวลานี้ถูกจองแล้ว'
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      ยืนยันสร้างการนัดหมาย
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: APPOINTMENTS LIST ================= */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-7">

              {/* Header & Filter Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-5 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">รายการนัดหมาย</h2>
                  <p className="text-xs text-slate-500 mt-0.5">สามารถยืนยัน ยกเลิก หรือลบข้อมูลนัดหมายได้</p>
                </div>

                {/* Filter Tabs with matching colors */}
                <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
                  <button
                    onClick={() => setFilterStatus('')}
                    className={`px-3 py-1.5 rounded-xl transition ${filterStatus === '' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                      }`}
                  >
                    ทั้งหมด
                  </button>
                  <button
                    onClick={() => setFilterStatus('pending')}
                    className={`px-3 py-1.5 rounded-xl transition ${filterStatus === 'pending'
                        ? 'bg-white text-amber-800 shadow-sm border border-amber-200'
                        : 'text-slate-500 hover:text-slate-900'
                      }`}
                  >
                    รอยืนยัน
                  </button>
                  <button
                    onClick={() => setFilterStatus('confirmed')}
                    className={`px-3 py-1.5 rounded-xl transition ${filterStatus === 'confirmed'
                        ? 'bg-white text-emerald-800 shadow-sm border border-emerald-200'
                        : 'text-slate-500 hover:text-slate-900'
                      }`}
                  >
                    ยืนยันแล้ว
                  </button>
                  <button
                    onClick={() => setFilterStatus('cancelled')}
                    className={`px-3 py-1.5 rounded-xl transition ${filterStatus === 'cancelled'
                        ? 'bg-white text-rose-800 shadow-sm border border-rose-200'
                        : 'text-slate-500 hover:text-slate-900'
                      }`}
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>

              {/* List Content */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                  <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm font-medium">กำลังโหลดข้อมูลนัดหมาย...</span>
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-16 px-4 bg-slate-50/70 rounded-2xl border-2 border-dashed border-slate-200">
                  <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-slate-700 text-base">ไม่พบรายการนัดหมาย</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    {filterStatus
                      ? `ไม่มีนัดหมายในสถานะที่เลือก ลองเลือกดูหมวดอื่นหรือสร้างนัดหมายใหม่`
                      : 'ยังไม่มีข้อมูลการนัดหมายในระบบ เริ่มต้นสร้างนัดหมายแรกได้ที่ฟอร์มด้านซ้าย'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {appointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="group bg-white hover:bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 sm:p-5 transition duration-200 shadow-sm hover:shadow hover:border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      {/* Left info */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <h3 className="font-bold text-slate-900 text-base">{appt.patientName}</h3>

                          {/* Status Badge: Cancelled=RED, Pending=YELLOW, Confirmed=GREEN */}
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${appt.status === 'confirmed'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : appt.status === 'cancelled'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${appt.status === 'confirmed'
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
                                : 'รอยืนยัน'}
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

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {/* Status Change Buttons for Pending */}
                        {appt.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(appt.id, 'confirmed')}
                              title="ยืนยันการนัดหมาย"
                              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 text-xs font-bold rounded-xl transition duration-150 flex items-center gap-1.5 shadow-sm"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              ยืนยัน
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                              title="ยกเลิกการนัดหมาย"
                              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 text-xs font-bold rounded-xl transition duration-150 flex items-center gap-1.5 shadow-sm"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              ยกเลิก
                            </button>
                          </>
                        )}

                        {/* Delete Button (Available for all appointments) */}
                        <button
                          onClick={() => setDeleteModal({ isOpen: true, appointment: appt })}
                          title="ลบข้อมูลการนัดหมาย"
                          className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-transparent hover:border-rose-200"
                          aria-label="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}