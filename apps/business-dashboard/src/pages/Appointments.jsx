import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
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
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Appointments</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your appointments with drag-and-drop</p>
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
                    className={`bg-gray-50 dark:bg-gray-900 rounded-xl p-4 min-h-[600px] transition-colors ${
                      snapshot.isDraggingOver ? 'bg-gray-100 dark:bg-gray-800' : ''
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
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                          {column.label}
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full">
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
                              className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all cursor-pointer ${
                                snapshot.isDragging ? 'shadow-lg ring-2 ring-green-500 rotate-2' : ''
                              }`}
                            >
                              {/* Customer Name */}
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                                  {appointment.customer?.name || 'Unknown Customer'}
                                </h4>
                              </div>

                              {/* Service Type */}
                              {appointment.serviceType && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                  {appointment.serviceType}
                                </p>
                              )}

                              {/* Date & Time */}
                              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
                                <span>📅</span>
                                <span>{new Date(appointment.scheduledTime).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
                                <span>🕐</span>
                                <span>{new Date(appointment.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="mx-1">·</span>
                                <span>{appointment.duration || 30} min</span>
                              </div>

                              {/* Price */}
                              {appointment.price && (
                                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                                  <span className="text-xs font-semibold text-gray-900 dark:text-white">
                                    ${appointment.price}
                                  </span>
                                </div>
                              )}

                              {/* Phone */}
                              {appointment.customer?.phone && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                  📞 {appointment.customer.phone}
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
                      <div className="text-center py-8 text-gray-400 dark:text-gray-600 text-sm">
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Appointment Details
                  </h3>
                  <button
                    onClick={() => setSelectedAppointment(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <span className="text-2xl">×</span>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer</p>
                  <p className="text-gray-900 dark:text-white text-lg">
                    {selectedAppointment.customer?.name || 'Unknown'}
                  </p>
                  {selectedAppointment.customer?.phone && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedAppointment.customer.phone}
                    </p>
                  )}
                  {selectedAppointment.customer?.email && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedAppointment.customer.email}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Service</p>
                  <p className="text-gray-900 dark:text-white">
                    {selectedAppointment.serviceType || 'N/A'}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Date & Time</p>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(selectedAppointment.scheduledTime).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Duration: {selectedAppointment.duration || 30} minutes
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</p>
                  <span
                    className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                      selectedAppointment.status === 'CONFIRMED'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : selectedAppointment.status === 'SCHEDULED'
                        ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400'
                        : selectedAppointment.status === 'IN_PROGRESS'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                        : selectedAppointment.status === 'COMPLETED'
                        ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {selectedAppointment.status}
                  </span>
                </div>

                {selectedAppointment.price && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Price</p>
                    <p className="text-gray-900 dark:text-white text-lg font-semibold">
                      ${selectedAppointment.price}
                    </p>
                  </div>
                )}

                {selectedAppointment.notes && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</p>
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                      {selectedAppointment.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
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
