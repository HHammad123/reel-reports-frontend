import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2, Lock, CreditCard } from 'lucide-react';

const CheckoutForm = ({ plan, onClose, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);

    // Create a PaymentMethod
    const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });

    if (paymentMethodError) {
      setError(paymentMethodError.message);
      setProcessing(false);
    } else {
      console.log('[PaymentMethod]', paymentMethod);
      // Here you would send the paymentMethod.id to your server
      // await fetch('/api/pay', { method: 'POST', body: JSON.stringify({ paymentMethodId: paymentMethod.id, planId: plan.title }) })

      // Simulate success for demo
      setTimeout(() => {
        setProcessing(false);
        if (onSuccess) onSuccess(paymentMethod);
      }, 1000);
    }
  };

  const cardStyle = {
    style: {
      base: {
        color: "#32325d",
        fontFamily: 'Arial, sans-serif',
        fontSmoothing: "antialiased",
        fontSize: "16px",
        "::placeholder": {
          color: "#aab7c4"
        }
      },
      invalid: {
        color: "#fa755a",
        iconColor: "#fa755a"
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Subscribe to {plan.title}</h3>
            <p className="text-sm text-gray-500">${plan.price} / month</p>
          </div>
          <div className="bg-blue-50 p-2 rounded-full text-[#13008B]">
            <CreditCard size={20} />
          </div>
        </div>

        <div className="p-4 border border-gray-200 rounded-xl bg-white focus-within:border-[#13008B] focus-within:ring-1 focus-within:ring-[#13008B] transition-all">
          <CardElement options={cardStyle} />
        </div>
        {error && <div className="text-red-500 text-sm mt-2 flex items-center gap-1"><span className="font-bold">!</span> {error}</div>}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={processing}
          className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 py-3 bg-[#13008B] text-white rounded-xl font-bold hover:bg-[#0e006b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <Loader2 className="animate-spin h-5 w-5" />
              Processing...
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Pay ${plan.price}
            </>
          )}
        </button>
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
          <Lock size={10} />
          Payments secured by Stripe
        </p>
      </div>
    </form>
  );
};

export default CheckoutForm;
