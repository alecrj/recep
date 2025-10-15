/**
 * HVAC Knowledge Base
 *
 * Everything the AI receptionist needs to know about HVAC services
 */

module.exports = {
  // Service types with natural language variations
  services: {
    AC_REPAIR: {
      name: 'AC Repair',
      keywords: ['air conditioning', 'ac', 'cooling', 'cold air', 'not cooling', 'warm air'],
      urgency: 'standard',
      typicalDuration: 120, // minutes
      priceRange: { min: 150, max: 500 },
      commonIssues: [
        'AC not cooling',
        'AC making noise',
        'AC leaking water',
        'AC won\'t turn on',
        'AC freezing up',
        'AC blowing warm air'
      ]
    },

    HEATING_REPAIR: {
      name: 'Heating Repair',
      keywords: ['heater', 'furnace', 'heat', 'heating', 'not heating', 'cold'],
      urgency: 'standard', // Can escalate to urgent/emergency
      typicalDuration: 120,
      priceRange: { min: 150, max: 600 },
      commonIssues: [
        'No heat',
        'Not heating enough',
        'Furnace making noise',
        'Pilot light out',
        'Furnace won\'t stay on',
        'Strange smell from heater'
      ]
    },

    MAINTENANCE: {
      name: 'Maintenance & Tune-Up',
      keywords: ['maintenance', 'tune-up', 'check-up', 'service', 'inspection'],
      urgency: 'standard',
      typicalDuration: 90,
      priceRange: { min: 89, max: 199 },
      description: 'Regular maintenance keeps your system running efficiently'
    },

    INSTALLATION: {
      name: 'New System Installation',
      keywords: ['install', 'new system', 'replacement', 'new unit'],
      urgency: 'standard',
      typicalDuration: 480, // 8 hours
      priceRange: { min: 3500, max: 12000 },
      description: 'Full HVAC system installation'
    },

    EMERGENCY: {
      name: 'Emergency Service',
      keywords: ['emergency', 'urgent', 'gas smell', 'carbon monoxide', 'flooding'],
      urgency: 'emergency',
      typicalDuration: 60,
      priceRange: { min: 200, max: 800 },
      transferImmediate: true
    },

    THERMOSTAT: {
      name: 'Thermostat Service',
      keywords: ['thermostat', 'temperature', 'control'],
      urgency: 'standard',
      typicalDuration: 60,
      priceRange: { min: 100, max: 350 }
    },

    DUCT_CLEANING: {
      name: 'Duct Cleaning',
      keywords: ['duct', 'air quality', 'cleaning', 'vents'],
      urgency: 'standard',
      typicalDuration: 180,
      priceRange: { min: 300, max: 700 }
    }
  },

  // Emergency detection
  emergencyKeywords: [
    'gas smell',
    'smell gas',
    'carbon monoxide',
    'co detector',
    'flooding',
    'water everywhere',
    'smoke',
    'fire',
    'sparks',
    'burning smell'
  ],

  // Urgency escalation rules
  urgencyRules: {
    noHeatWinter: {
      condition: 'No heat when outdoor temp < 32°F',
      urgency: 'emergency',
      message: 'This is a serious situation. Let me get you connected with someone right away.'
    },
    noACExtreme: {
      condition: 'No AC when outdoor temp > 95°F',
      urgency: 'urgent',
      message: 'I understand this is really uncomfortable. Let me see what we can do today.'
    },
    waterLeak: {
      condition: 'Water leaking',
      urgency: 'urgent',
      message: 'We definitely want to get that taken care of quickly to prevent any damage.'
    }
  },

  // Common customer questions and answers
  faqs: {
    serviceArea: {
      question: 'What areas do you service?',
      answer: 'We service the entire metro area and surrounding communities. If you give me your zip code, I can confirm we cover your area.'
    },

    pricing: {
      question: 'How much does it cost?',
      answer: 'It depends on what we find when our technician gets there, but most {serviceType} runs between ${priceMin} and ${priceMax}. The technician will give you an exact quote before doing any work.'
    },

    sameDay: {
      question: 'Can you come today?',
      answer: 'Let me check our schedule. What time works best for you - morning or afternoon?'
    },

    warranty: {
      question: 'Do you offer a warranty?',
      answer: 'Yes, all our work comes with a satisfaction guarantee. Parts and labor warranties depend on the specific service, and our technician will go over that with you.'
    },

    payment: {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards, debit cards, and checks. We also offer financing options for larger jobs.'
    },

    brands: {
      question: 'Do you service [brand name]?',
      answer: 'Yes, we service all major HVAC brands including Carrier, Trane, Lennox, Goodman, Rheem, and more.'
    },

    availability: {
      question: 'Are you available on weekends?',
      answer: 'Yes, we offer service seven days a week, including evenings and weekends.'
    }
  },

  // Natural conversation responses
  conversationalPhrases: {
    greeting: [
      'Thanks for calling {businessName}, this is {agentName}. How can I help you today?',
      'Good {timeOfDay}! You\'ve reached {businessName}. This is {agentName}, what can I do for you?',
      '{businessName}, {agentName} speaking. What brings you in today?'
    ],

    acknowledgment: [
      'Got it',
      'Okay, perfect',
      'Alright',
      'I understand',
      'Sure thing',
      'Absolutely'
    ],

    empathy: [
      'Oh no, I\'m sorry to hear that',
      'That must be really frustrating',
      'I totally understand',
      'That\'s definitely not fun',
      'I can imagine how uncomfortable that must be'
    ],

    transition: [
      'Let me just pull up our schedule here',
      'Okay, let me see what we have available',
      'Let me get some information from you',
      'Just a couple quick things I need to get from you'
    ],

    confirmation: [
      'Just to make sure I have this right',
      'So just to confirm',
      'Let me repeat that back to you',
      'Okay, so I have'
    ]
  },

  // Info collection flow (natural order)
  collectionFlow: [
    {
      field: 'problemDescription',
      naturalAsk: 'What\'s going on with your system?',
      variations: [
        'What seems to be the problem?',
        'Tell me what\'s happening',
        'What can we help you with?'
      ]
    },
    {
      field: 'urgency',
      assess: true // AI determines, doesn't ask
    },
    {
      field: 'customerName',
      naturalAsk: 'And what\'s your name?',
      variations: [
        'Can I get your name?',
        'Who am I speaking with?',
        'And your name is?'
      ]
    },
    {
      field: 'customerPhone',
      naturalAsk: 'And what\'s the best number to reach you at?',
      variations: [
        'What\'s a good callback number?',
        'And your phone number?',
        'Best number for you?'
      ]
    },
    {
      field: 'customerAddress',
      naturalAsk: 'And where is the property located?',
      variations: [
        'What\'s the service address?',
        'Where would we be coming to?',
        'And the address?'
      ]
    },
    {
      field: 'preferredTime',
      naturalAsk: 'What works better for you - morning or afternoon?',
      variations: [
        'When works best for your schedule?',
        'Do you have a preference on timing?',
        'What time works for you?'
      ]
    }
  ],

  // Seasonal context (AI can reference current season)
  seasonalContext: {
    summer: {
      commonIssues: ['AC not cooling', 'AC running constantly', 'High energy bills'],
      tips: 'Summer is our busy season - the earlier we can get you scheduled, the better'
    },
    winter: {
      commonIssues: ['No heat', 'Furnace not starting', 'Uneven heating'],
      tips: 'We know how important heat is this time of year'
    },
    spring: {
      commonIssues: ['AC tune-up', 'Spring maintenance', 'Getting ready for summer'],
      tips: 'Great time to get your AC checked before the heat arrives'
    },
    fall: {
      commonIssues: ['Furnace tune-up', 'Heating check', 'Getting ready for winter'],
      tips: 'Smart to get your heating checked before winter hits'
    }
  }
};
