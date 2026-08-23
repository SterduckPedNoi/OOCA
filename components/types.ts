export interface Appointment {
  id: string | number;
  patientName: string;
  appointmentAt: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}
