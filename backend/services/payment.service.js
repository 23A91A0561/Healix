import Stripe from 'stripe';
import crypto from 'crypto';
import Payment from '../models/Payment.js';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';

export async function createPayment({ user, amount, purpose, metadata = {} }) {
  const payment = await Payment.create({ user, amount, purpose, metadata });
  if (!stripe) return { payment, clientSecret: `mock_${payment._id}` };
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'inr',
    metadata: { paymentId: String(payment._id), purpose }
  });
  payment.providerPaymentId = intent.id;
  await payment.save();
  return { payment, clientSecret: intent.client_secret };
}

async function createRazorpayOrder({ amount, currency = 'INR', receipt, notes = {} }) {
  if (!razorpayKeyId || !razorpayKeySecret) {
    return {
      id: `mock_order_${Date.now()}`,
      amount: Math.round(amount * 100),
      currency,
      receipt,
      status: 'created'
    };
  }

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: Math.round(amount * 100),
      currency,
      receipt,
      notes
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.description || 'Unable to create Razorpay order';
    const err = new Error(message);
    err.statusCode = response.status;
    throw err;
  }

  return data;
}

export async function createRazorpayPayment({ user, amount, purpose, metadata = {}, currency = 'INR' }) {
  const payment = await Payment.create({
    user,
    amount,
    purpose,
    currency,
    provider: 'razorpay',
    metadata
  });

  const order = await createRazorpayOrder({
    amount,
    currency,
    receipt: String(payment._id).slice(0, 40),
    notes: {
      paymentId: String(payment._id),
      purpose,
      ...metadata
    }
  });

  payment.providerOrderId = order.id;
  payment.metadata = { ...metadata, razorpayOrder: order };
  await payment.save();

  return {
    payment,
    order,
    checkout: {
      keyId: razorpayKeyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency || currency
    }
  };
}

export function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  if (!razorpayKeySecret) return true;
  const expected = crypto
    .createHmac('sha256', razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
}
