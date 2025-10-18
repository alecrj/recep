import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CheckIcon } from '@heroicons/react/24/outline';
import api from '../lib/api';

// Load Stripe (use your publishable key)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

const PLANS = {
  STARTER: {
    id: 'STARTER',
    name: 'Starter',
    price: '$299',
    interval: '/month',
    description: 'Perfect for solo contractors',
    features: [
      '1 AI phone number',
      'Unlimited incoming calls',
      'Appointment booking',
      'Message taking',
      'Call transcripts',
      'Google Calendar sync',
      'Email notifications'
    ],
    popular: false
  },
  PROFESSIONAL: {
    id: 'PROFESSIONAL',
    name: 'Professional',
    price: '$799',
    interval: '/month',
    description: 'For growing businesses',
    features: [
      'Everything in Starter',
      'Up to 3 phone numbers',
      'SMS reminders',
      'Advanced analytics',
      'CRM integration',
      'Priority support',
      'Up to 3 team members'
    ],
    popular: true
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: '$1,499',
    interval: '/month',
    description: 'For large businesses',
    features: [
      'Everything in Professional',
      'Unlimited phone numbers',
      'Custom AI training',
      'Full API access',
      'White-label option',
      '24/7 phone support',
      'Dedicated account manager'
    ],
    popular: false
  }
};

function PaymentForm({ formData, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Create payment method
      const { error: paymentError, paymentMethod } = await stripe.createPaymentMethod({
        elements,
        params: {
          billing_details: {
            name: formData.ownerName,
            email: formData.email,
            phone: formData.phone
          }
        }
      });

      if (paymentError) {
        setError(paymentError.message);
        setProcessing(false);
        return;
      }

      // Submit signup to backend
      const response = await api.post('/signup', {
        ...formData,
        paymentMethodId: paymentMethod.id
      });

      if (response.data.success) {
        onSuccess(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-900/20 border border-red-800/30 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-2">
          Payment Information
        </label>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <PaymentElement />
        </div>
        <p className="text-sm text-zinc-500 mt-2">
          💳 Secure payment processing by Stripe
        </p>
      </div>

      <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-4">
        <p className="text-sm text-green-400">
          ✓ 14-day free trial • No credit card charge today • Cancel anytime
        </p>
      </div>

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing ? 'Creating your account...' : 'Start Free Trial →'}
      </button>

      <p className="text-xs text-zinc-500 text-center">
        By signing up, you agree to our Terms of Service and Privacy Policy
      </p>
    </form>
  );
}

export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('PROFESSIONAL');
  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    password: '',
    phone: '',
    industry: 'HVAC',
    plan: 'PROFESSIONAL',
    areaCode: '602'
  });
  const [clientSecret, setClientSecret] = useState(null);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePlanSelect = (planId) => {
    setSelectedPlan(planId);
    setFormData({ ...formData, plan: planId });
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();

    // Validate email
    try {
      const response = await api.post('/signup/check-email', { email: formData.email });
      if (!response.data.available) {
        alert('Email already registered. Please use a different email or login.');
        return;
      }
    } catch (err) {
      console.error('Email check failed:', err);
    }

    setStep(2);
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();

    // Create Stripe payment intent
    try {
      const response = await api.post('/stripe/create-setup-intent');
      setClientSecret(response.data.clientSecret);
      setStep(3);
    } catch (err) {
      alert('Failed to initialize payment. Please try again.');
    }
  };

  const handleSignupSuccess = (data) => {
    // Store token
    localStorage.setItem('token', data.token);

    // Redirect to welcome page
    navigate('/welcome', { state: { signupData: data } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 to-zinc-900">
      {/* Header */}
      <div className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold text-white">Voxi</h1>
          <a href="/login" className="text-sm text-zinc-400 hover:text-white">
            Already have an account? <span className="text-green-400">Sign in →</span>
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          {[
            { num: 1, label: 'Business Info' },
            { num: 2, label: 'Choose Plan' },
            { num: 3, label: 'Payment' }
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                step >= s.num
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-zinc-700 text-zinc-500'
              }`}>
                {step > s.num ? <CheckIcon className="w-6 h-6" /> : s.num}
              </div>
              <span className={`ml-2 text-sm ${step >= s.num ? 'text-white' : 'text-zinc-500'}`}>
                {s.label}
              </span>
              {idx < 2 && (
                <div className={`w-20 h-0.5 mx-4 ${step > s.num ? 'bg-green-500' : 'bg-zinc-700'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Business Information */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-display font-bold text-white mb-2">
                Start Your Free Trial
              </h2>
              <p className="text-zinc-400">Tell us about your business</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
              <form onSubmit={handleStep1Submit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-zinc-800 rounded-lg bg-zinc-950 text-white"
                      placeholder="Bob's HVAC"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      name="ownerName"
                      value={formData.ownerName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-zinc-800 rounded-lg bg-zinc-950 text-white"
                      placeholder="Bob Smith"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                      Industry *
                    </label>
                    <select
                      name="industry"
                      value={formData.industry}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-zinc-800 rounded-lg bg-zinc-950 text-white"
                      required
                    >
                      <option value="HVAC">HVAC</option>
                      <option value="Plumbing">Plumbing</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Roofing">Roofing</option>
                      <option value="Landscaping">Landscaping</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-zinc-800 rounded-lg bg-zinc-950 text-white"
                      placeholder="bob@bobshvac.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-zinc-800 rounded-lg bg-zinc-950 text-white"
                      placeholder="••••••••"
                      minLength={8}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-zinc-800 rounded-lg bg-zinc-950 text-white"
                      placeholder="+1 (602) 555-1234"
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="w-full btn-primary">
                  Continue →
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Step 2: Choose Plan */}
        {step === 2 && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-display font-bold text-white mb-2">
                Choose Your Plan
              </h2>
              <p className="text-zinc-400">14-day free trial • No credit card charge today</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {Object.values(PLANS).map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => handlePlanSelect(plan.id)}
                  className={`relative cursor-pointer rounded-xl border-2 p-6 transition-all ${
                    selectedPlan === plan.id
                      ? 'border-green-500 bg-green-900/10'
                      : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <h3 className="text-xl font-display font-bold text-white mb-1">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-zinc-400 mb-4">{plan.description}</p>
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold text-white">{plan.price}</span>
                      <span className="text-zinc-400 ml-1">{plan.interval}</span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start text-sm">
                        <CheckIcon className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-zinc-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {selectedPlan === plan.id && (
                    <div className="text-center">
                      <div className="w-6 h-6 bg-green-500 rounded-full mx-auto flex items-center justify-center">
                        <CheckIcon className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="max-w-2xl mx-auto flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 px-6 py-3 border border-zinc-700 rounded-lg text-white hover:bg-zinc-800"
              >
                ← Back
              </button>
              <button
                onClick={handleStep2Submit}
                className="flex-1 btn-primary"
              >
                Continue to Payment →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {step === 3 && clientSecret && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-display font-bold text-white mb-2">
                Start Your Free Trial
              </h2>
              <p className="text-zinc-400">No charge for 14 days • Cancel anytime</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
              <div className="mb-6 p-4 bg-zinc-950 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-medium">
                    {PLANS[selectedPlan].name} Plan
                  </span>
                  <span className="text-white font-bold">
                    {PLANS[selectedPlan].price}/month
                  </span>
                </div>
                <p className="text-sm text-zinc-400">
                  Free until {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </p>
              </div>

              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <PaymentForm formData={formData} onSuccess={handleSignupSuccess} />
              </Elements>

              <button
                onClick={() => setStep(2)}
                className="w-full mt-4 px-6 py-3 border border-zinc-700 rounded-lg text-white hover:bg-zinc-800"
              >
                ← Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
