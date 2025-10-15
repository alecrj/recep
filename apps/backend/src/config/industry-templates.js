/**
 * Industry Templates - Pre-built configurations for different business types
 * Makes setup instant for common industries
 */

const INDUSTRY_TEMPLATES = {
  hvac: {
    name: 'HVAC',
    displayName: 'HVAC & Air Conditioning',
    greetingMessage: 'Thank you for calling {businessName}. How can I help you with your heating, cooling, or air quality needs today?',
    services: [
      {
        name: 'AC Repair',
        priceMin: 150,
        priceMax: 500,
        duration: 90,
        emergency: true,
      },
      {
        name: 'Furnace Repair',
        priceMin: 200,
        priceMax: 600,
        duration: 90,
        emergency: true,
      },
      {
        name: 'AC Installation',
        priceMin: 3000,
        priceMax: 8000,
        duration: 480, // 8 hours
        emergency: false,
      },
      {
        name: 'Furnace Installation',
        priceMin: 2500,
        priceMax: 6000,
        duration: 480,
        emergency: false,
      },
      {
        name: 'HVAC Maintenance',
        priceMin: 99,
        priceMax: 199,
        duration: 60,
        emergency: false,
      },
      {
        name: 'Air Quality Assessment',
        priceMin: 150,
        priceMax: 300,
        duration: 60,
        emergency: false,
      },
      {
        name: 'Emergency Service',
        priceMin: 200,
        priceMax: 800,
        duration: 120,
        emergency: true,
      },
    ],
    emergencyKeywords: [
      'emergency',
      'urgent',
      'not cooling',
      'no heat',
      'no air',
      'broken down',
      'not working',
      'leaking water',
      'strange smell',
      'burning smell',
      'carbon monoxide',
    ],
    faqs: [
      {
        question: 'What are your hours?',
        answer: 'We\'re available {hours}. For emergencies, we offer 24/7 emergency service.',
      },
      {
        question: 'Do you offer emergency service?',
        answer: 'Yes! We offer 24/7 emergency HVAC service. Emergency calls are prioritized and we typically arrive within 2 hours.',
      },
      {
        question: 'How much does AC repair cost?',
        answer: 'AC repair typically ranges from $150 to $500 depending on the issue. We\'ll provide a detailed estimate after diagnosing the problem.',
      },
      {
        question: 'Do you do free estimates?',
        answer: 'Yes, we provide free estimates for installation and replacement projects. Service calls have a diagnostic fee that applies to the repair.',
      },
      {
        question: 'Are you licensed and insured?',
        answer: 'Yes, we are fully licensed, bonded, and insured. All our technicians are certified HVAC professionals.',
      },
    ],
    businessHoursStart: '08:00',
    businessHoursEnd: '18:00',
    appointmentDuration: 90,
  },

  plumbing: {
    name: 'plumbing',
    displayName: 'Plumbing Services',
    greetingMessage: 'Thank you for calling {businessName}. How can I help you with your plumbing needs today?',
    services: [
      {
        name: 'Drain Cleaning',
        priceMin: 150,
        priceMax: 400,
        duration: 60,
        emergency: false,
      },
      {
        name: 'Leak Repair',
        priceMin: 100,
        priceMax: 500,
        duration: 90,
        emergency: true,
      },
      {
        name: 'Water Heater Repair',
        priceMin: 200,
        priceMax: 600,
        duration: 120,
        emergency: true,
      },
      {
        name: 'Toilet Repair',
        priceMin: 150,
        priceMax: 350,
        duration: 60,
        emergency: false,
      },
      {
        name: 'Emergency Plumbing',
        priceMin: 250,
        priceMax: 800,
        duration: 120,
        emergency: true,
      },
    ],
    emergencyKeywords: [
      'emergency',
      'flooding',
      'leak',
      'burst pipe',
      'no water',
      'no hot water',
      'overflowing',
      'sewage backup',
    ],
    faqs: [
      {
        question: 'Do you offer 24/7 emergency service?',
        answer: 'Yes! We provide 24/7 emergency plumbing service for urgent situations like floods, burst pipes, and major leaks.',
      },
      {
        question: 'How much does plumbing repair cost?',
        answer: 'Plumbing repairs typically range from $100 to $500 depending on the issue. We provide upfront pricing after diagnosing the problem.',
      },
    ],
    businessHoursStart: '08:00',
    businessHoursEnd: '17:00',
    appointmentDuration: 90,
  },

  electrical: {
    name: 'electrical',
    displayName: 'Electrical Services',
    greetingMessage: 'Thank you for calling {businessName}. How can I help you with your electrical needs today?',
    services: [
      {
        name: 'Electrical Repair',
        priceMin: 150,
        priceMax: 500,
        duration: 90,
        emergency: false,
      },
      {
        name: 'Panel Upgrade',
        priceMin: 1500,
        priceMax: 3500,
        duration: 480,
        emergency: false,
      },
      {
        name: 'Outlet Installation',
        priceMin: 100,
        priceMax: 300,
        duration: 60,
        emergency: false,
      },
      {
        name: 'Emergency Electrical',
        priceMin: 250,
        priceMax: 800,
        duration: 120,
        emergency: true,
      },
    ],
    emergencyKeywords: [
      'emergency',
      'no power',
      'sparking',
      'burning smell',
      'smoke',
      'electrical fire',
      'shock',
    ],
    faqs: [],
    businessHoursStart: '08:00',
    businessHoursEnd: '17:00',
    appointmentDuration: 90,
  },

  general: {
    name: 'general',
    displayName: 'General Service Business',
    greetingMessage: 'Thank you for calling {businessName}. How can I help you today?',
    services: [
      {
        name: 'Standard Service',
        priceMin: 100,
        priceMax: 300,
        duration: 60,
        emergency: false,
      },
      {
        name: 'Consultation',
        priceMin: 50,
        priceMax: 150,
        duration: 30,
        emergency: false,
      },
    ],
    emergencyKeywords: ['emergency', 'urgent'],
    faqs: [],
    businessHoursStart: '09:00',
    businessHoursEnd: '17:00',
    appointmentDuration: 60,
  },
};

/**
 * Get template by industry name
 */
function getIndustryTemplate(industry) {
  return INDUSTRY_TEMPLATES[industry] || INDUSTRY_TEMPLATES.general;
}

/**
 * Apply template to business config
 */
function applyIndustryTemplate(industry, businessName) {
  const template = getIndustryTemplate(industry);

  return {
    industry: template.name,
    greetingMessage: template.greetingMessage.replace('{businessName}', businessName),
    services: template.services,
    emergencyKeywords: template.emergencyKeywords,
    faqs: template.faqs.map(faq => ({
      ...faq,
      answer: faq.answer.replace('{hours}', 'Monday-Friday 8am-6pm'),
    })),
    businessHoursStart: template.businessHoursStart,
    businessHoursEnd: template.businessHoursEnd,
    appointmentDuration: template.appointmentDuration,
  };
}

/**
 * Get all available industries
 */
function getAvailableIndustries() {
  return Object.entries(INDUSTRY_TEMPLATES).map(([key, template]) => ({
    value: key,
    label: template.displayName,
  }));
}

module.exports = {
  INDUSTRY_TEMPLATES,
  getIndustryTemplate,
  applyIndustryTemplate,
  getAvailableIndustries,
};
