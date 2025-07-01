import { useState, useEffect } from 'react';
import { 
  CalendarIcon, 
  UserIcon, 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useUser } from '../contexts/UserContext';
import { ApiService } from '../services/api';
import { RealtimeService } from '../services/realtime';
import { WebhookService } from '../services/webhook';
import type { Appointment } from '../lib/supabase';
import toast from 'react-hot-toast';

const APPOINTMENT_TYPES = [
  'Consultation',
  'Sales Meeting',
  'Product Demo',
  'Support Session',
  'Follow-up Call',
  'Technical Review',
  'Strategy Session',
  'Training Session'
];

const APPOINTMENT_STATUSES = [
  { value: 'scheduled', label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  { value: 'completed', label: 'Completed', color: 'bg-gray-100 text-gray-800' },
  { value: 'no_show', label: 'No Show', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'rescheduled', label: 'Rescheduled', color: 'bg-purple-100 text-purple-800' }
];

export default function AppointmentsPage() {
  const { user } = useUser();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    if (user) {
      loadAppointments();
      setupRealtimeSubscriptions();
    }
  }, [user]);

  const loadAppointments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const appointmentsData = await ApiService.getAppointments(user.id);
      setAppointments(appointmentsData);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    if (!user) return;

    const subscription = RealtimeService.subscribeToAppointmentUpdates(
      user.id,
      (updatedAppointment) => {
        setAppointments(prev => 
          prev.map(appointment => 
            appointment.id === updatedAppointment.id ? updatedAppointment : appointment
          )
        );
      },
      (newAppointment) => {
        setAppointments(prev => [newAppointment, ...prev]);
      },
      (appointmentId) => {
        setAppointments(prev => prev.filter(appointment => appointment.id !== appointmentId));
      }
    );

    return () => {
      RealtimeService.unsubscribe(subscription);
    };
  };

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    if (!user) return;
    
    try {
      const updatedAppointment = await ApiService.updateAppointment(appointmentId, { status: newStatus });
      
      // Send appropriate webhook based on status
      if (newStatus === 'cancelled') {
        await WebhookService.appointmentCancelled(updatedAppointment, user.id);
      } else if (newStatus === 'completed') {
        await WebhookService.appointmentCompleted(updatedAppointment, user.id);
      } else {
        await WebhookService.appointmentUpdated(updatedAppointment, user.id);
      }
      
      toast.success(`Appointment ${newStatus}`);
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment');
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to delete this appointment?')) {
      return;
    }

    try {
      await ApiService.deleteAppointment(appointmentId);
      toast.success('Appointment deleted successfully');
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast.error('Failed to delete appointment');
    }
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowEditModal(true);
  };

  const getStatusInfo = (status: string) => {
    return APPOINTMENT_STATUSES.find(s => s.value === status) || APPOINTMENT_STATUSES[0];
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  const filterAppointments = (appointments: Appointment[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    switch (filter) {
      case 'today':
        return appointments.filter(apt => {
          const aptDate = new Date(`${apt.appointment_date}T${apt.appointment_time}`);
          return aptDate >= today && aptDate < tomorrow;
        });
      case 'upcoming':
        return appointments.filter(apt => {
          const aptDate = new Date(`${apt.appointment_date}T${apt.appointment_time}`);
          return aptDate >= now && apt.status !== 'completed' && apt.status !== 'cancelled';
        });
      case 'past':
        return appointments.filter(apt => {
          const aptDate = new Date(`${apt.appointment_date}T${apt.appointment_time}`);
          return aptDate < now || apt.status === 'completed';
        });
      default:
        return appointments;
    }
  };

  const filteredAppointments = filterAppointments(appointments);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Appointments</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage appointments scheduled through your AI agents.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Appointments</option>
            <option value="today">Today</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
          </select>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            New Appointment
          </button>
        </div>
      </div>

      {filteredAppointments.length > 0 ? (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAppointments.map((appointment) => {
                  const dateTime = formatDateTime(`${appointment.appointment_date}T${appointment.appointment_time}`);
                  const statusInfo = getStatusInfo(appointment.status);
                  
                  return (
                    <tr key={appointment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {appointment.customer_name}
                            </div>
                            <div className="text-sm text-gray-500 font-mono">
                              {appointment.customer_phone}
                            </div>
                            {appointment.customer_email && (
                              <div className="text-sm text-gray-500">
                                {appointment.customer_email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {appointment.service_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{dateTime.date}</div>
                        <div className="text-sm text-gray-500">{dateTime.time}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {60} min
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {appointment.status === 'scheduled' && (
                            <button
                              onClick={() => handleStatusChange(appointment.id, 'confirmed')}
                              className="text-green-600 hover:text-green-900"
                              title="Confirm"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEditAppointment(appointment)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          {appointment.status !== 'completed' && (
                            <button
                              onClick={() => handleStatusChange(appointment.id, 'cancelled')}
                              className="text-red-600 hover:text-red-900"
                              title="Cancel"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteAppointment(appointment.id)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Delete"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === 'all' 
              ? 'No appointments have been scheduled yet.' 
              : `No ${filter} appointments found.`
            }
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Schedule Appointment
            </button>
          </div>
        </div>
      )}

      {/* Create Appointment Modal */}
      {showCreateModal && (
        <CreateAppointmentModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadAppointments}
        />
      )}

      {/* Edit Appointment Modal */}
      {showEditModal && selectedAppointment && (
        <EditAppointmentModal
          appointment={selectedAppointment}
          user={user}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAppointment(null);
          }}
          onSuccess={loadAppointments}
        />
      )}
    </div>
  );
}

// Create Appointment Modal Component
function CreateAppointmentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    service_type: 'Consultation',
    appointment_date: '',
    appointment_time: '10:00',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const appointmentData = {
        ...formData,
        profile_id: user.id,
        status: 'scheduled'
      };
      
      const newAppointment = await ApiService.createAppointment(user.id, appointmentData);
      
      // Send webhook notifications to integrated systems
      await WebhookService.appointmentCreated(newAppointment, user.id);
      
      toast.success('Appointment scheduled successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Failed to schedule appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Schedule New Appointment</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Customer Name</label>
              <input
                type="text"
                required
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="tel"
                required
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email (Optional)</label>
              <input
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Appointment Type</label>
              <select
                value={formData.service_type}
                onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {APPOINTMENT_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Date & Time</label>
              <input
                type="datetime-local"
                required
                value={formData.appointment_date}
                onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
              <select
                value={formData.appointment_time}
                onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Location (Optional)</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Office, Zoom, Phone call, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Additional notes about the appointment..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Scheduling...' : 'Schedule Appointment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Edit Appointment Modal Component (similar structure to Create)
function EditAppointmentModal({ 
  appointment, 
  user,
  onClose, 
  onSuccess 
}: { 
  appointment: Appointment; 
  user: any;
  onClose: () => void; 
  onSuccess: () => void 
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: appointment.customer_name,
    customer_phone: appointment.customer_phone,
    customer_email: appointment.customer_email || '',
    service_type: appointment.service_type,
    appointment_date: new Date(`${appointment.appointment_date}T${appointment.appointment_time}`).toISOString().slice(0, 16),
    appointment_time: '60',
    notes: appointment.notes || '',
    status: appointment.status
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const updatedAppointment = await ApiService.updateAppointment(appointment.id, {
        ...formData,
        appointment_date: new Date(formData.appointment_date).toISOString()
      });
      
      // Send webhook notification for appointment update
      if (user) {
        await WebhookService.appointmentUpdated(updatedAppointment, user.id);
      }
      
      toast.success('Appointment updated successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Appointment</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Same form fields as CreateAppointmentModal */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Customer Name</label>
              <input
                type="text"
                required
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {APPOINTMENT_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Date & Time</label>
              <input
                type="datetime-local"
                required
                value={formData.appointment_date}
                onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Appointment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}