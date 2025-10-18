import { useState } from 'react';
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

export default function ServicesManager({ services: initialServices = [], onChange }) {
  const [services, setServices] = useState(initialServices);
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const emptyService = {
    name: '',
    description: '',
    duration: 60,
    priceMin: '',
    priceMax: '',
  };

  const [currentService, setCurrentService] = useState(emptyService);

  const handleAdd = () => {
    setCurrentService(emptyService);
    setIsAdding(true);
    setEditingIndex(null);
  };

  const handleEdit = (index) => {
    setCurrentService(services[index]);
    setEditingIndex(index);
    setIsAdding(false);
  };

  const handleSave = () => {
    if (!currentService.name.trim()) {
      alert('Service name is required');
      return;
    }

    let updatedServices;
    if (editingIndex !== null) {
      // Editing existing
      updatedServices = services.map((s, i) =>
        i === editingIndex ? currentService : s
      );
    } else {
      // Adding new
      updatedServices = [...services, currentService];
    }

    setServices(updatedServices);
    onChange(updatedServices);
    setCurrentService(emptyService);
    setIsAdding(false);
    setEditingIndex(null);
  };

  const handleCancel = () => {
    setCurrentService(emptyService);
    setIsAdding(false);
    setEditingIndex(null);
  };

  const handleDelete = (index) => {
    if (!confirm('Are you sure you want to delete this service?')) {
      return;
    }
    const updatedServices = services.filter((_, i) => i !== index);
    setServices(updatedServices);
    onChange(updatedServices);
  };

  const formatPrice = (min, max) => {
    if (!min && !max) return 'Price varies';
    if (min && max) return `$${min} - $${max}`;
    if (min) return `From $${min}`;
    if (max) return `Up to $${max}`;
    return 'Price varies';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display font-semibold text-white">
            Services & Products
          </h3>
          <p className="text-sm text-zinc-400 mt-1">
            Tell your AI what services you offer so it can answer customer questions
          </p>
        </div>
        {!isAdding && editingIndex === null && (
          <button
            type="button"
            onClick={handleAdd}
            className="btn-primary flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Add Service
          </button>
        )}
      </div>

      {/* Services List */}
      {services.length > 0 && !isAdding && editingIndex === null && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((service, index) => (
            <div
              key={index}
              className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-white text-lg mb-1">
                    {service.name}
                  </h4>
                  {service.description && (
                    <p className="text-sm text-zinc-400 mb-2">
                      {service.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleEdit(index)}
                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Edit service"
                  >
                    <PencilIcon className="w-4 h-4 text-zinc-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(index)}
                    className="p-2 hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete service"
                  >
                    <TrashIcon className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500">Duration:</span>
                  <span className="text-white font-medium">{service.duration} min</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500">Price:</span>
                  <span className="text-green-400 font-medium">
                    {formatPrice(service.priceMin, service.priceMax)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {services.length === 0 && !isAdding && (
        <div className="text-center py-12 bg-zinc-950 rounded-lg border border-zinc-800 border-dashed">
          <div className="inline-flex p-4 bg-zinc-900 rounded-full mb-4">
            <PlusIcon className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No services added yet</h3>
          <p className="text-sm text-zinc-400 mb-6 max-w-md mx-auto">
            Add the services or products you offer. Your AI receptionist will use this information to answer customer questions and book appointments.
          </p>
          <button
            type="button"
            onClick={handleAdd}
            className="btn-primary inline-flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Add Your First Service
          </button>
        </div>
      )}

      {/* Add/Edit Form */}
      {(isAdding || editingIndex !== null) && (
        <div className="bg-zinc-950 border border-green-500/30 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-white mb-4">
            {editingIndex !== null ? 'Edit Service' : 'Add New Service'}
          </h4>

          <div className="space-y-4">
            {/* Service Name */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Service Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={currentService.name}
                onChange={(e) =>
                  setCurrentService({ ...currentService, name: e.target.value })
                }
                placeholder="e.g., AC Repair, Teeth Cleaning, Oil Change"
                className="w-full px-4 py-2 border border-zinc-800 rounded-lg bg-zinc-900 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Description
              </label>
              <textarea
                value={currentService.description}
                onChange={(e) =>
                  setCurrentService({ ...currentService, description: e.target.value })
                }
                placeholder="Brief description of what's included..."
                rows={3}
                className="w-full px-4 py-2 border border-zinc-800 rounded-lg bg-zinc-900 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Helps AI explain the service to customers
              </p>
            </div>

            {/* Duration and Price */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={currentService.duration}
                  onChange={(e) =>
                    setCurrentService({
                      ...currentService,
                      duration: parseInt(e.target.value) || 0,
                    })
                  }
                  min="15"
                  step="15"
                  className="w-full px-4 py-2 border border-zinc-800 rounded-lg bg-zinc-900 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-zinc-500 mt-1">For appointments</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Min Price ($)
                </label>
                <input
                  type="number"
                  value={currentService.priceMin}
                  onChange={(e) =>
                    setCurrentService({
                      ...currentService,
                      priceMin: e.target.value,
                    })
                  }
                  placeholder="100"
                  min="0"
                  className="w-full px-4 py-2 border border-zinc-800 rounded-lg bg-zinc-900 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-zinc-500 mt-1">Optional</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Max Price ($)
                </label>
                <input
                  type="number"
                  value={currentService.priceMax}
                  onChange={(e) =>
                    setCurrentService({
                      ...currentService,
                      priceMax: e.target.value,
                    })
                  }
                  placeholder="500"
                  min="0"
                  className="w-full px-4 py-2 border border-zinc-800 rounded-lg bg-zinc-900 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-zinc-500 mt-1">Optional</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-zinc-800">
            <button
              type="button"
              onClick={handleSave}
              className="btn-primary"
            >
              {editingIndex !== null ? 'Save Changes' : 'Add Service'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Helper Text */}
      {services.length > 0 && !isAdding && editingIndex === null && (
        <div className="bg-cyan-900/20 border border-cyan-800/30 rounded-lg p-4">
          <p className="text-sm text-cyan-300">
            <span className="font-semibold">💡 Tip:</span> Add all your main services. Your AI receptionist will use this to answer questions like "What services do you offer?" and "How much does X cost?"
          </p>
        </div>
      )}
    </div>
  );
}
