import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { CalendarIcon, ClockIcon, CurrencyDollarIcon, PhoneIcon } from '@heroicons/react/24/outline';
import api from '../lib/api';

const STATUS_COLUMNS = [
  { id: 'SCHEDULED', label: 'Scheduled', color: 'cyan' },
  { id: 'CONFIRMED', label: 'Confirmed', color: 'green' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'purple' },
  { id: 'COMPLETED', label: 'Completed', color: 'gray' },
  { id: 'CANCELLED', label: 'Cancelled', color: 'red' },
];

export default function Appointments() {
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const response = await api.get('/business/appointments');
      return response.data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ appointmentId, newStatus }) => {
      const response = await api.put(`/business/appointments/${appointmentId}`, {
        status: newStatus,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const appointmentId = result.draggableId;
    const newStatus = result.destination.droppableId;

    updateStatusMutation.mutate({ appointmentId, newStatus });
  };

  const groupedAppointments = STATUS_COLUMNS.reduce((acc, column) => {
    acc[column.id] = data?.appointments?.filter((apt) => apt.status === column.id) || [];
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Appointments</h1>
          <p className="text-zinc-400 text-sm">Manage your appointments with drag-and-drop</p>
        </div>
        <button className="btn-primary">
          + New Appointment
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {STATUS_COLUMNS.map((column) => (
              <Droppable key={column.id} droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`bg-zinc-900 rounded-xl p-4 min-h-[600px] transition-colors border border-zinc-800 ${
                      snapshot.isDraggingOver ? 'bg-zinc-800' : ''
                    }`}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full bg-${column.color}-500`}
                          style={{
                            backgroundColor:
                              column.color === 'cyan' ? '#06b6d4' :
                              column.color === 'green' ? '#10b981' :
                              column.color === 'purple' ? '#8b5cf6' :
                              column.color === 'gray' ? '#6b7280' :
                              '#ef4444'
                          }}
                        />
                        <h3 className="font-display font-semibold text-white text-sm">
                          {column.label}
                        </h3>
                        <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
                          {groupedAppointments[column.id]?.length || 0}
                        </span>
                      </div>
                    </div>

                    {/* Appointment Cards */}
                    <div className="space-y-3">
                      {groupedAppointments[column.id]?.map((appointment, index) => (
                        <Draggable
                          key={appointment.id}
                          draggableId={appointment.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => setSelectedAppointment(appointment)}
                              className={`bg-zinc-900 rounded-lg p-4 shadow-sm border border-zinc-800 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300 cursor-pointer ${
                                snapshot.isDragging ? 'shadow-lg ring-2 ring-green-500 rotate-2' : ''
                              }`}
                            >
                              {/* Customer Name */}
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-semibold text-white text-sm">
                                  {appointment.customer?.name || 'Unknown Customer'}
                                </h4>
                              </div>

                              {/* Service Type */}
                              {appointment.serviceType && (
                                <p className="text-xs text-zinc-400 mb-2">
                                  {appointment.serviceType}
                                </p>
                              )}

                              {/* Date & Time */}
                              <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-2">
                                <CalendarIcon className="w-3.5 h-3.5" />
                                <span>{new Date(appointment.scheduledTime).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-3">
                                <ClockIcon className="w-3.5 h-3.5" />
                                <span>{new Date(appointment.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="mx-1">·</span>
                                <span>{appointment.duration || 30} min</span>
                              </div>

                              {/* Price */}
                              {appointment.price && (
                                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                                  <span className="text-xs font-semibold text-white">
                                    ${appointment.price}
                                  </span>
                                </div>
                              )}

                              {/* Phone */}
                              {appointment.customer?.phone && (
                                <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-2">
                                  <PhoneIcon className="w-3.5 h-3.5" />
                                  {appointment.customer.phone}
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>

                    {/* Empty State */}
                    {groupedAppointments[column.id]?.length === 0 && (
                      <div className="text-center py-8 text-zinc-500 text-sm">
                        No appointments
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      )}

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setSelectedAppointment(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden border border-zinc-800">
              {/* Modal Header */}
              <div className="p-6 border-b border-zinc-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-display font-semibold text-white">
                    Appointment Details
                  </h3>
                  <button
                    onClick={() => setSelectedAppointment(null)}
                    className="text-zinc-400 hover:text-zinc-300 transition-colors"
                  >
                    <span className="text-2xl">×</span>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
                <div>
                  <p className="text-sm font-medium text-zinc-400">Customer</p>
                  <p className="text-white text-lg">
                    {selectedAppointment.customer?.name || 'Unknown'}
                  </p>
                  {selectedAppointment.customer?.phone && (
                    <p className="text-sm text-zinc-400">
                      {selectedAppointment.customer.phone}
                    </p>
                  )}
                  {selectedAppointment.customer?.email && (
                    <p className="text-sm text-zinc-400">
                      {selectedAppointment.customer.email}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium text-zinc-400">Service</p>
                  <p className="text-white">
                    {selectedAppointment.serviceType || 'N/A'}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-zinc-400">Date & Time</p>
                  <p className="text-white">
                    {new Date(selectedAppointment.scheduledTime).toLocaleString()}
                  </p>
                  <p className="text-sm text-zinc-400">
                    Duration: {selectedAppointment.duration || 30} minutes
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-zinc-400">Status</p>
                  <span
                    className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                      selectedAppointment.status === 'CONFIRMED'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : selectedAppointment.status === 'SCHEDULED'
                        ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400'
                        : selectedAppointment.status === 'IN_PROGRESS'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                        : selectedAppointment.status === 'COMPLETED'
                        ? 'bg-zinc-800 text-zinc-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {selectedAppointment.status}
                  </span>
                </div>

                {selectedAppointment.price && (
                  <div>
                    <p className="text-sm font-medium text-zinc-400">Price</p>
                    <p className="text-white text-lg font-semibold">
                      ${selectedAppointment.price}
                    </p>
                  </div>
                )}

                {selectedAppointment.notes && (
                  <div>
                    <p className="text-sm font-medium text-zinc-400">Notes</p>
                    <p className="text-white whitespace-pre-wrap">
                      {selectedAppointment.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-zinc-800 flex gap-3">
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800/50 transition-colors"
                >
                  Close
                </button>
                <button className="flex-1 btn-primary">
                  Edit Appointment
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
