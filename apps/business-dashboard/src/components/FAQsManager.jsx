import { useState } from 'react';
import { PlusIcon, TrashIcon, PencilIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

export default function FAQsManager({ faqs: initialFaqs = [], onChange }) {
  const [faqs, setFaqs] = useState(initialFaqs);
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const emptyFaq = {
    question: '',
    answer: '',
  };

  const [currentFaq, setCurrentFaq] = useState(emptyFaq);

  const handleAdd = () => {
    setCurrentFaq(emptyFaq);
    setIsAdding(true);
    setEditingIndex(null);
  };

  const handleEdit = (index) => {
    setCurrentFaq(faqs[index]);
    setEditingIndex(index);
    setIsAdding(false);
  };

  const handleSave = () => {
    if (!currentFaq.question.trim() || !currentFaq.answer.trim()) {
      alert('Both question and answer are required');
      return;
    }

    let updatedFaqs;
    if (editingIndex !== null) {
      // Editing existing
      updatedFaqs = faqs.map((faq, i) =>
        i === editingIndex ? currentFaq : faq
      );
    } else {
      // Adding new
      updatedFaqs = [...faqs, currentFaq];
    }

    setFaqs(updatedFaqs);
    onChange(updatedFaqs);
    setCurrentFaq(emptyFaq);
    setIsAdding(false);
    setEditingIndex(null);
  };

  const handleCancel = () => {
    setCurrentFaq(emptyFaq);
    setIsAdding(false);
    setEditingIndex(null);
  };

  const handleDelete = (index) => {
    if (!confirm('Are you sure you want to delete this FAQ?')) {
      return;
    }
    const updatedFaqs = faqs.filter((_, i) => i !== index);
    setFaqs(updatedFaqs);
    onChange(updatedFaqs);
  };

  // Common FAQ templates by industry
  const exampleFaqs = [
    { industry: 'HVAC', question: 'Do you offer emergency service?', answer: 'Yes, we offer 24/7 emergency HVAC service.' },
    { industry: 'HVAC', question: 'What brands do you service?', answer: 'We service all major HVAC brands including Carrier, Trane, Lennox, and more.' },
    { industry: 'Dental', question: 'Do you accept insurance?', answer: 'Yes, we accept most major dental insurance plans.' },
    { industry: 'Dental', question: 'Do you offer payment plans?', answer: 'Yes, we offer flexible payment plans for major procedures.' },
    { industry: 'Plumbing', question: 'What areas do you serve?', answer: 'We serve all of [Your City] and surrounding areas within 30 miles.' },
    { industry: 'Legal', question: 'Do you offer free consultations?', answer: 'Yes, we offer a free 30-minute initial consultation.' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display font-semibold text-white">
            Frequently Asked Questions
          </h3>
          <p className="text-sm text-zinc-400 mt-1">
            Teach your AI how to answer common customer questions
          </p>
        </div>
        {!isAdding && editingIndex === null && (
          <button
            type="button"
            onClick={handleAdd}
            className="btn-primary flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Add FAQ
          </button>
        )}
      </div>

      {/* FAQs List */}
      {faqs.length > 0 && !isAdding && editingIndex === null && (
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-2">
                    <QuestionMarkCircleIcon className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-white text-base mb-2">
                        {faq.question}
                      </h4>
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleEdit(index)}
                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Edit FAQ"
                  >
                    <PencilIcon className="w-4 h-4 text-zinc-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(index)}
                    className="p-2 hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete FAQ"
                  >
                    <TrashIcon className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {faqs.length === 0 && !isAdding && (
        <div className="text-center py-12 bg-zinc-950 rounded-lg border border-zinc-800 border-dashed">
          <div className="inline-flex p-4 bg-zinc-900 rounded-full mb-4">
            <QuestionMarkCircleIcon className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No FAQs added yet</h3>
          <p className="text-sm text-zinc-400 mb-6 max-w-md mx-auto">
            Add frequently asked questions and answers. Your AI will use these to provide accurate, consistent responses to common customer inquiries.
          </p>
          <button
            type="button"
            onClick={handleAdd}
            className="btn-primary inline-flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Add Your First FAQ
          </button>
        </div>
      )}

      {/* Add/Edit Form */}
      {(isAdding || editingIndex !== null) && (
        <div className="bg-zinc-950 border border-green-500/30 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-white mb-4">
            {editingIndex !== null ? 'Edit FAQ' : 'Add New FAQ'}
          </h4>

          <div className="space-y-4">
            {/* Question */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Question <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={currentFaq.question}
                onChange={(e) =>
                  setCurrentFaq({ ...currentFaq, question: e.target.value })
                }
                placeholder="e.g., What are your business hours?"
                className="w-full px-4 py-2 border border-zinc-800 rounded-lg bg-zinc-900 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Answer */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Answer <span className="text-red-400">*</span>
              </label>
              <textarea
                value={currentFaq.answer}
                onChange={(e) =>
                  setCurrentFaq({ ...currentFaq, answer: e.target.value })
                }
                placeholder="Provide a clear, concise answer that the AI will use..."
                rows={4}
                className="w-full px-4 py-2 border border-zinc-800 rounded-lg bg-zinc-900 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Be specific and accurate - the AI will use this exact answer
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-zinc-800">
            <button
              type="button"
              onClick={handleSave}
              className="btn-primary"
            >
              {editingIndex !== null ? 'Save Changes' : 'Add FAQ'}
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

      {/* Example FAQs */}
      {faqs.length === 0 && !isAdding && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-white mb-3">
            Common FAQ Examples
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {exampleFaqs.map((example, idx) => (
              <div key={idx} className="text-sm">
                <p className="text-xs font-medium text-zinc-400 mb-1">
                  {example.industry}:
                </p>
                <p className="text-cyan-400 mb-1">Q: {example.question}</p>
                <p className="text-zinc-500 text-xs">A: {example.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Helper Text */}
      {faqs.length > 0 && !isAdding && editingIndex === null && (
        <div className="bg-cyan-900/20 border border-cyan-800/30 rounded-lg p-4">
          <p className="text-sm text-cyan-300">
            <span className="font-semibold">💡 Tip:</span> The more FAQs you add, the better your AI can handle customer questions. Include pricing, hours, services, policies, and anything customers commonly ask about.
          </p>
        </div>
      )}
    </div>
  );
}
