'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';

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

const MORNING_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
const AFTERNOON_SLOTS = ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES_LIST = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

export default function AppointmentApp() {
  // สลับมุมมอง: 'patient' (ผู้รับบริการ) vs 'staff' (เจ้าหน้าที่คลินิก/แพทย์)
  const [userRole, setUserRole] = useState<'patient' | 'staff'>('patient');

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
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

  // สำหรับ Staff: เปิด/ปิด Modal จองนัดแทนคนไข้ (Walk-in booking)
  const [showStaffBookingModal, setShowStaffBookingModal] = useState<boolean>(false);

  // Custom Calendar State
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-11

  // Toast Notifications
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
  const showToast = useCallback((type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ดึงข้อมูลนัดหมายทั้งหมด
  const fetchAllAppointments = async () => {
    try {
      const response = await fetch('http://localhost:3001/appointments');
      if (response.ok) {
        const data: Appointment[] = await response.json();
        setAllAppointments(data);
      }
    } catch (error) {
      console.error('Failed to fetch all appointments:', error);
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
        showToast('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลรายการนัดหมายได้');
      }
    } catch (error) {
      showToast('error', 'การเชื่อมต่อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ Backend ได้');
    } finally {
      setLoading(false);
    }
  };

  // โหลดข้อมูลเมื่อเปิดหน้าเว็บ
  useEffect(() => {
    fetchAppointments(filterStatus);
    fetchAllAppointments();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
    setCurrentYear(yyyy);
    setCurrentMonth(tomorrow.getMonth());
  }, []);

  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
    fetchAppointments(status);
  };

  // 🚀 HIGH PERFORMANCE: Pre-calculate active booking timestamps
  const activeBookings = useMemo(() => {
    return allAppointments
      .filter((appt) => appt.status !== 'cancelled')
      .map((appt) => ({
        time: new Date(appt.appointmentAt).getTime(),
        patientName: appt.patientName,
        status: appt.status,
      }));
  }, [allAppointments]);

  // 🚀 INSTANT O(1) SLOT MAP: Pre-computes all slots for the selected date at once
  const slotStatusMap = useMemo(() => {
    if (!selectedDate) {
      return new Map<string, { isBooked: boolean; isPast: boolean; status: 'pending' | 'confirmed' | null; patientName: string }>();
    }

    const map = new Map<string, { isBooked: boolean; isPast: boolean; status: 'pending' | 'confirmed' | null; patientName: string }>();
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000;

    // Pre-calculate standard slots + custom hours/minutes
    const allSlotsToCheck = new Set<string>([...MORNING_SLOTS, ...AFTERNOON_SLOTS]);
    for (let h = 0; h < 24; h++) {
      const hh = String(h).padStart(2, '0');
      for (const mm of MINUTES_LIST) {
        allSlotsToCheck.add(`${hh}:${mm}`);
      }
    }

    for (const timeStr of allSlotsToCheck) {
      const targetTime = new Date(`${selectedDate}T${timeStr}:00`).getTime();
      const isPast = targetTime <= now;
      const matched = activeBookings.find((appt) => Math.abs(targetTime - appt.time) < thirtyMinutes);

      if (matched) {
        map.set(timeStr, {
          isBooked: true,
          isPast,
          status: matched.status as 'pending' | 'confirmed',
          patientName: matched.patientName,
        });
      } else {
        map.set(timeStr, {
          isBooked: false,
          isPast,
          status: null,
          patientName: '',
        });
      }
    }

    return map;
  }, [selectedDate, activeBookings]);

  // 🚀 INSTANT HOUR AVAILABILITY MAP: Pre-computes hour full/past statuses
  const hourAvailabilityMap = useMemo(() => {
    const map = new Map<string, { isHourPast: boolean; isFullyBooked: boolean; isHourDisabled: boolean }>();
    const now = new Date();
    const isToday = selectedDate === todayStr;
    const currentHourNum = now.getHours();

    for (const h of HOURS) {
      const isHourPast = isToday && parseInt(h, 10) < currentHourNum;
      const allMinutesUnavailable = MINUTES_LIST.every((m) => {
        const slot = slotStatusMap.get(`${h}:${m}`);
        return slot ? slot.isBooked || slot.isPast : false;
      });
      const isFullyBooked = !isHourPast && allMinutesUnavailable;
      const isHourDisabled = isHourPast || allMinutesUnavailable;

      map.set(h, { isHourPast, isFullyBooked, isHourDisabled });
    }

    return map;
  }, [selectedDate, todayStr, slotStatusMap]);

  // ตรวจสอบสถานะการจองของช่วงเวลา (dateStr: YYYY-MM-DD, timeStr: HH:mm)
  const checkSlotBookingStatus = useCallback(
    (dateStr: string, timeStr: string) => {
      if (!dateStr || !timeStr) return { isBooked: false, isPast: false, status: null, patientName: '' };
      if (dateStr === selectedDate && slotStatusMap.has(timeStr)) {
        return slotStatusMap.get(timeStr)!;
      }

      const slotDateTime = new Date(`${dateStr}T${timeStr}:00`);
      const targetTime = slotDateTime.getTime();
      if (isNaN(targetTime)) return { isBooked: false, isPast: false, status: null, patientName: '' };

      const now = Date.now();
      const isPast = targetTime <= now;
      const thirtyMinutes = 30 * 60 * 1000;

      const matched = activeBookings.find((appt) => Math.abs(targetTime - appt.time) < thirtyMinutes);

      if (matched) {
        return {
          isBooked: true,
          isPast,
          status: matched.status,
          patientName: matched.patientName,
        };
      }

      return { isBooked: false, isPast, status: null, patientName: '' };
    },
    [selectedDate, slotStatusMap, activeBookings]
  );

  // เวลาที่เลือกปัจจุบัน
  const currentEffectiveTime = timeMode === 'slot' ? selectedSlot : `${customHour}:${customMinute}`;

  // ตรวจสอบว่าเวลาที่เลือกในปัจจุบันว่างหรือไม่ และผ่านไปแล้วหรือไม่
  const currentSlotStatus = useMemo(() => {
    return checkSlotBookingStatus(selectedDate, currentEffectiveTime);
  }, [selectedDate, currentEffectiveTime, checkSlotBookingStatus]);

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
        showToast('success', 'ส่งคำขอนัดหมายสำเร็จ!', `สร้างนัดหมายของคุณ ${patientName} เรียบร้อยแล้ว (สถานะ: รอยืนยัน)`);
        setPatientName('');
        setShowStaffBookingModal(false);
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

  // อัปเดตสถานะ (ยืนยัน / ยกเลิก / เปลี่ยนเป็นรอยืนยัน)
  const handleUpdateStatus = async (id: string | number, newStatus: 'pending' | 'confirmed' | 'cancelled') => {
    try {
      const response = await fetch(`http://localhost:3001/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        let statusText = 'อัปเดตสถานะเรียบร้อย';
        if (newStatus === 'confirmed') statusText = 'ยืนยันนัดหมายเรียบร้อยแล้ว ✅';
        else if (newStatus === 'cancelled') statusText = 'ยกเลิกนัดหมายเรียบร้อย (ช่วงเวลานี้จะกลับมาว่างให้จองได้) ❌';
        else if (newStatus === 'pending') statusText = 'เปลี่ยนสถานะกลับเป็นรอยืนยัน ⏳';

        showToast(newStatus === 'confirmed' ? 'success' : 'info', 'อัปเดตสถานะสำเร็จ', statusText);
        fetchAppointments(filterStatus);
        fetchAllAppointments();
      } else {
        const err = await response.json();
        showToast('error', 'อัปเดตไม่สำเร็จ', err.error || 'ไม่สามารถอัปเดตสถานะได้');
      }
    } catch (error) {
      showToast('error', 'ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  // ลบข้อมูลนัดหมาย
  const confirmDeleteAppointment = async () => {
    if (!deleteModal.appointment) return;

    try {
      const response = await fetch(`http://localhost:3001/appointments/${deleteModal.appointment.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showToast('success', 'ลบข้อมูลสำเร็จ', `ลบนัดหมายของ ${deleteModal.appointment.patientName} ออกจากระบบเรียบร้อย`);
        setDeleteModal({ isOpen: false, appointment: null });
        fetchAppointments(filterStatus);
        fetchAllAppointments();
      } else {
        const err = await response.json();
        showToast('error', 'ลบไม่สำเร็จ', err.error || 'เกิดข้อผิดพลาดในการลบข้อมูล');
      }
    } catch (error) {
      showToast('error', 'ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อลบข้อมูลได้');
    }
  };

  // สถิติตัวเลข
  const stats = useMemo(() => {
    const total = allAppointments.length;
    const pending = allAppointments.filter((a) => a.status === 'pending').length;
    const confirmed = allAppointments.filter((a) => a.status === 'confirmed').length;
    const cancelled = allAppointments.filter((a) => a.status === 'cancelled').length;
    return { total, pending, confirmed, cancelled };
  }, [allAppointments]);

  // Calendar Helpers
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    const d = new Date();
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth());
    setSelectedDate(todayStr);
  };

  // Render Calendar Days
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
          onClick={() => setSelectedDate(dateString)}
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

  // Reusable Booking Form
  const renderBookingFormContent = (isModal: boolean = false) => (
    <form onSubmit={handleCreateAppointment} className="space-y-4">
      {/* 1. Patient Name Input (Always at top, perfectly accessible) */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
          ชื่อผู้ป่วย / ผู้รับบริการ <span className="text-rose-500">*</span>
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
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-medium"
            required
          />
        </div>
      </div>

      {/* 2. CUSTOM INLINE CALENDAR */}
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
                onClick={goToToday}
                title="กลับมาวันนี้"
                className="text-[10px] px-2 py-0.5 font-bold rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 transition"
                aria-label="Previous Month"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={nextMonth}
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

      {/* 3. TIME SELECTION */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
            เลือกเวลา (ช่วงละ 30 นาที) <span className="text-rose-500">*</span>
          </label>

          <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold border border-slate-200">
            <button
              type="button"
              onClick={() => setTimeMode('slot')}
              className={`px-2 py-0.5 rounded-md transition ${
                timeMode === 'slot' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              รอบมาตรฐาน
            </button>
            <button
              type="button"
              onClick={() => setTimeMode('custom')}
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
                      onClick={() => setSelectedSlot(slot)}
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
                      onClick={() => setSelectedSlot(slot)}
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
                          setCustomHour(h);
                          const firstFreeMin = MINUTES_LIST.find((m) => {
                            const slot = slotStatusMap.get(`${h}:${m}`);
                            return slot ? !slot.isBooked && !slot.isPast : true;
                          });
                          if (firstFreeMin) setCustomMinute(firstFreeMin);
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
                        onClick={() => setCustomMinute(m)}
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

      {/* Alert if selected slot is past or booked */}
      {currentSlotStatus.isPast ? (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-xs flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>เวลานี้เป็นเวลาในอดีต กรุณาเลือกเวลาที่เป็นอนาคต</span>
        </div>
      ) : currentSlotStatus.isBooked ? (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <span>
            เวลานี้ถูกจองแล้วโดยคุณ <span className="font-bold">{currentSlotStatus.patientName}</span> ({currentSlotStatus.status === 'confirmed' ? 'ยืนยันแล้ว' : 'รอยืนยัน'})
          </span>
        </div>
      ) : (
        /* Summary Box */
        <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-center gap-2.5 text-xs">
          <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-[11px] text-blue-900">สรุปเวลานัดหมาย</div>
            <div className="text-slate-600 font-medium text-xs">
              {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('th-TH', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: '2-digit',
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
        className={`w-full py-3 px-6 rounded-2xl font-bold text-sm text-white shadow-lg transition duration-200 flex items-center justify-center gap-2 ${
          currentSlotStatus.isBooked || currentSlotStatus.isPast
            ? 'bg-slate-400 cursor-not-allowed shadow-none'
            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25 active:scale-[0.98]'
        }`}
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            กำลังบันทึกข้อมูล...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {userRole === 'patient' ? 'ส่งคำขอนัดหมาย' : 'ยืนยันสร้างนัดหมายให้คนไข้'}
          </>
        )}
      </button>
    </form>
  );

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans text-slate-800 antialiased selection:bg-blue-500 selection:text-white pb-16">

      {/* ================= FLOATING TOAST NOTIFICATION CONTAINER ================= */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl shadow-xl border flex items-start gap-3 transform transition-all duration-300 animate-slide-in backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900 shadow-emerald-900/10'
                : toast.type === 'error'
                ? 'bg-rose-50/95 border-rose-200 text-rose-900 shadow-rose-900/10'
                : toast.type === 'warning'
                ? 'bg-amber-50/95 border-amber-200 text-amber-900 shadow-amber-900/10'
                : 'bg-blue-50/95 border-blue-200 text-blue-900 shadow-blue-900/10'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {toast.type === 'success' && (
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              {toast.type === 'error' && (
                <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
              {toast.type === 'warning' && (
                <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01" />
                  </svg>
                </div>
              )}
              {toast.type === 'info' && (
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01" />
                  </svg>
                </div>
              )}
            </div>

            <div className="flex-1">
              <h4 className="font-bold text-sm">{toast.title}</h4>
              <p className="text-xs mt-0.5 leading-relaxed opacity-90">{toast.message}</p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 transition p-1"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">ยืนยันการลบข้อมูล?</h3>
            <p className="text-sm text-slate-500 mt-2">
              ต้องการลบนัดหมายของ <span className="font-bold text-slate-900">"{deleteModal.appointment?.patientName}"</span> ออกจากระบบหรือไม่?
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteModal({ isOpen: false, appointment: null })}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDeleteAppointment}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-rose-600/25 transition"
              >
                ลบข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= FIXED & SCROLLABLE STAFF WALK-IN BOOKING MODAL ================= */}
      {showStaffBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 my-auto overflow-hidden">
            {/* Pinned Modal Header */}
            <div className="shrink-0 flex items-center justify-between p-5 sm:px-6 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">เพิ่มการนัดหมายแทนคนไข้ (Walk-in)</h3>
                  <p className="text-[11px] text-slate-500">กรอกข้อมูลและเลือกเวลาเพื่อสร้างนัดหมายให้คนไข้</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStaffBookingModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Modal Content (ชื่อผู้ป่วย, ปฏิทิน, เลือกเวลา) */}
            <div className="flex-1 overflow-y-auto p-5 sm:px-6 space-y-4 scrollbar-thin">
              {renderBookingFormContent(true)}
            </div>
          </div>
        </div>
      )}

      {/* ================= MAIN CONTAINER ================= */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Top Header & Role Switcher */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5 pb-6 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/25">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Mini Appointment App</h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {userRole === 'patient' ? 'Patient Portal' : 'Staff Console'}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {userRole === 'patient'
                  ? 'ระบบจองคิวนัดหมายปรึกษาแพทย์และติดตามสถานะ'
                  : 'ระบบจัดการคิวนัดหมายและอนุมัติการจองสำหรับคลินิก'}
              </p>
            </div>
          </div>

          {/* Role Switcher Pill Bar */}
          <div className="bg-slate-200/80 p-1.5 rounded-2xl border border-slate-300/80 flex items-center shadow-inner self-start md:self-auto">
            <button
              type="button"
              onClick={() => {
                setUserRole('patient');
                showToast('info', 'สลับมุมมอง', 'เข้าสู่มุมมองผู้รับบริการ (Patient View)');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
                userRole === 'patient'
                  ? 'bg-white text-blue-700 shadow-md shadow-slate-300 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>👤 ผู้รับบริการ</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setUserRole('staff');
                showToast('info', 'สลับมุมมอง', 'เข้าสู่มุมมองเจ้าหน้าที่คลินิก/แพทย์ (Staff Console)');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
                userRole === 'staff'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>🩺 เจ้าหน้าที่/แพทย์</span>
              {stats.pending > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    userRole === 'staff' ? 'bg-amber-400 text-slate-900' : 'bg-amber-500 text-white animate-pulse'
                  }`}
                >
                  {stats.pending}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* ================= VIEW 1: PATIENT VIEW ================= */}
        {userRole === 'patient' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Patient Booking Form */}
            <div className="lg:col-span-6 space-y-6">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-7 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500"></div>

                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">จองเวลานัดหมายใหม่</h2>
                    <p className="text-xs text-slate-500">เลือกวันและเวลาที่สะดวกเพื่อส่งคำขอนัดหมาย</p>
                  </div>
                </div>

                {renderBookingFormContent(false)}
              </div>
            </div>

            {/* Right Column: Patient Appointments Status */}
            <div className="lg:col-span-6 space-y-6">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-7">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">ติดตามสถานะนัดหมาย</h2>
                    <p className="text-xs text-slate-500 mt-0.5">รายการนัดหมายทั้งหมดในระบบ</p>
                  </div>
                  <span className="text-xs font-extrabold px-3 py-1 bg-slate-100 text-slate-700 rounded-xl">
                    {appointments.length} รายการ
                  </span>
                </div>

                {/* Patient Notice */}
                <div className="p-3.5 bg-blue-50/70 border border-blue-200/70 rounded-2xl text-xs text-blue-900 space-y-1 mb-5">
                  <div className="font-bold flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    คำแนะนำสำหรับผู้รับบริการ:
                  </div>
                  <p className="text-slate-600 leading-relaxed pl-5">
                    เมื่อส่งคำขอแล้ว นัดหมายจะอยู่ในสถานะ ⏳ <span className="font-bold text-amber-700">รอยืนยัน</span> เพื่อรอให้เจ้าหน้าที่คลินิกตรวจสอบคิว หากติดธุระสามารถกดยกเลิกนัดได้ตลอดเวลา
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap gap-1.5 mb-4 p-1 bg-slate-100/80 rounded-xl">
                  {[
                    { label: 'ทั้งหมด', value: '' },
                    { label: 'รอยืนยัน', value: 'pending' },
                    { label: 'ยืนยันแล้ว', value: 'confirmed' },
                    { label: 'ยกเลิก', value: 'cancelled' },
                  ].map((tab) => (
                    <button
                      key={tab.label}
                      onClick={() => handleFilterChange(tab.value)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition ${
                        filterStatus === tab.value
                          ? 'bg-white text-blue-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Patient Appointment List */}
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                    <svg className="animate-spin h-7 w-7 text-blue-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-xs font-medium">กำลังโหลดข้อมูลนัดหมาย...</span>
                  </div>
                ) : appointments.length === 0 ? (
                  <div className="text-center py-12 px-4 bg-slate-50/70 rounded-2xl border-2 border-dashed border-slate-200">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-slate-700 text-sm">ไม่พบนัดหมาย</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {filterStatus ? 'ไม่มีนัดหมายในหมวดนี้' : 'เริ่มต้นสร้างคำขอนัดหมายแรกได้ที่ฟอร์มด้านซ้าย'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1 scrollbar-thin">
                    {appointments.map((appt) => (
                      <div
                        key={appt.id}
                        className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200/90 rounded-2xl p-4 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-sm">{appt.patientName}</h3>
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                appt.status === 'confirmed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : appt.status === 'cancelled'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
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
                                ? 'ยกเลิกแล้ว'
                                : 'รอยืนยัน'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
                            <span>
                              📅{' '}
                              {new Date(appt.appointmentAt).toLocaleDateString('th-TH', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: '2-digit',
                              })}
                            </span>
                            <span className="font-bold text-slate-700">
                              ⏰{' '}
                              {new Date(appt.appointmentAt).toLocaleTimeString('th-TH', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              น.
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 pt-0.5">
                            {appt.status === 'pending' && (
                              <span className="text-amber-700">⏳ อยู่ระหว่างรอเจ้าหน้าที่ตรวจสอบคิว</span>
                            )}
                            {appt.status === 'confirmed' && (
                              <span className="text-emerald-700">✅ ยืนยันแล้ว พร้อมเข้าพบแพทย์ตามเวลา</span>
                            )}
                            {appt.status === 'cancelled' && (
                              <span className="text-rose-600">❌ นัดหมายนี้ถูกยกเลิกแล้ว</span>
                            )}
                          </div>
                        </div>

                        {appt.status !== 'cancelled' && (
                          <div className="self-end sm:self-center">
                            <button
                              onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                              title="ขอยกเลิกนัดหมายนี้"
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 text-xs font-bold rounded-xl transition duration-150 flex items-center gap-1 shadow-xs"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              ขอยกเลิกนัด
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= VIEW 2: STAFF / CLINIC CONSOLE ================= */}
        {userRole === 'staff' && (
          <div className="space-y-6">

            {/* Staff KPI Dashboard Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">นัดหมายทั้งหมด</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
                </div>
                <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  📋
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs flex items-center justify-between bg-gradient-to-br from-amber-50/40 to-white">
                <div>
                  <div className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                    รอดำเนินการ
                    {stats.pending > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>}
                  </div>
                  <div className="text-2xl font-black text-amber-900 mt-1">{stats.pending}</div>
                </div>
                <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  ⏳
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs flex items-center justify-between bg-gradient-to-br from-emerald-50/40 to-white">
                <div>
                  <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">ยืนยันแล้ว</div>
                  <div className="text-2xl font-black text-emerald-900 mt-1">{stats.confirmed}</div>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  ✅
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs flex items-center justify-between bg-gradient-to-br from-rose-50/40 to-white">
                <div>
                  <div className="text-xs font-bold text-rose-700 uppercase tracking-wider">ยกเลิกแล้ว</div>
                  <div className="text-2xl font-black text-rose-900 mt-1">{stats.cancelled}</div>
                </div>
                <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  ❌
                </div>
              </div>
            </div>

            {/* Staff Management Console Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <span>จัดการคิวนัดหมาย (Queue Management)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ตรวจสอบ อนุมัติยืนยันคิว หรือยกเลิกนัดหมายของผู้ป่วย
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowStaffBookingModal(true)}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    + จองนัดแทนคนไข้ (Walk-in)
                  </button>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap gap-2 my-5">
                {[
                  { label: 'ทั้งหมด', value: '', count: stats.total },
                  { label: '⏳ รอยืนยัน (Action Needed)', value: 'pending', count: stats.pending },
                  { label: '✅ ยืนยันแล้ว', value: 'confirmed', count: stats.confirmed },
                  { label: '❌ ยกเลิกแล้ว', value: 'cancelled', count: stats.cancelled },
                ].map((tab) => (
                  <button
                    key={tab.label}
                    onClick={() => handleFilterChange(tab.value)}
                    className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                      filterStatus === tab.value
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] ${
                        filterStatus === tab.value ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Appointments List for Staff */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                  <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm font-medium">กำลังโหลดรายการนัดหมาย...</span>
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-16 px-4 bg-slate-50/70 rounded-2xl border-2 border-dashed border-slate-200">
                  <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-slate-700 text-base">ไม่พบรายการนัดหมายในหมวดนี้</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    {filterStatus === 'pending'
                      ? 'ไม่มีคิวที่รอดำเนินการอนุมัติในขณะนี้ ทุกรายการได้รับการจัดการแล้ว 🎉'
                      : 'ไม่มีข้อมูลรายการนัดหมายในสถานะที่เลือก'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {appointments.map((appt) => (
                    <div
                      key={appt.id}
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
                              onClick={() => handleUpdateStatus(appt.id, 'confirmed')}
                              title="อนุมัติและยืนยันนัดหมายนี้"
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition duration-150 flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              ยืนยันนัดหมาย
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
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
                            onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
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
                            onClick={() => handleUpdateStatus(appt.id, 'pending')}
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
                          onClick={() => setDeleteModal({ isOpen: true, appointment: appt })}
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
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}