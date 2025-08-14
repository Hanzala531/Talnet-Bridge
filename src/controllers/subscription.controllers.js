import stripe from "../config/stripe.config.js";
import { Subscription } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Helper to compute billing end/next dates
function computeBillingDates(cycle) {
  const start = new Date();
  const next = new Date(start);
  switch (cycle) {
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 1);
  }
  return { startDate: start, endDate: next, nextBillingDate: next };
}

// Create Stripe Checkout session and a pending subscription record
const createSubscription = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const {
    planName,
    billingCycle = "monthly",
    currency = "PKR",
    price,
    priceId,
  } = req.body;

  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  if (!planName)
    return res.status(400).json({ message: "planName is required" });
  if (!priceId && !price)
    return res
      .status(400)
      .json({ message: "Provide priceId (Stripe) or numeric price" });

  const origin =
    req.headers.origin ||
    process.env.FRONTEND_URL ||
    process.env.BASE_URL ||
    `http://localhost:${process.env.PORT || 4000}`;

  // Ensure there is a pending or active subscription uniqueness per user
  let existing = await Subscription.findOne({ userId });
  if (!existing) {
    existing = await Subscription.create({
      userId,
      plan: { name: planName, price: price || 0, currency, billingCycle },
      status: "pending",
      billing: {
        startDate: new Date(),
        endDate: new Date(),
        nextBillingDate: new Date(),
        lastBillingDate: null,
        autoRenew: true,
      },
      payments: [],
    });
  } else {
    // Update plan and set pending if changing
    existing.plan = {
      name: planName,
      price: price || existing.plan.price || 0,
      currency,
      billingCycle,
    };
    existing.status = "pending";
    await existing.save();
  }

  let session;
  if (priceId) {
    // Recurring via predefined Price ID
    session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscription/cancelled`,
      customer_email: req.user?.email,
      metadata: { userId: String(userId), planName },
    });
  } else {
    // One-time payment fallback (non-recurring) using amount
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: { name: `${planName} subscription` },
            unit_amount: Math.round(Number(price) * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscription/cancelled`,
      customer_email: req.user?.email,
      metadata: { userId: String(userId), planName },
    });
  }

  // Track pending payment
  await Subscription.findByIdAndUpdate(existing._id, {
    $push: {
      payments: {
        amount: price || 0,
        currency,
        transactionId: session.id,
        status: "pending",
      },
    },
  });

  return res
    .status(201)
    .json({ checkoutUrl: session.url, sessionId: session.id });
});

// Confirm subscription after checkout success (no webhook needed)
const confirmSubscription = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { sessionId } = req.body;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  if (!sessionId)
    return res.status(400).json({ message: "sessionId is required" });

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });
  if (
    !session ||
    (session.status !== "complete" && session.payment_status !== "paid")
  ) {
    return res.status(400).json({ message: "Payment not completed yet" });
  }

  const sub = await Subscription.findOne({ userId });
  if (!sub)
    return res.status(404).json({ message: "Subscription record not found" });

  const { startDate, endDate, nextBillingDate } = computeBillingDates(
    sub.plan?.billingCycle || "monthly"
  );
  sub.status = "active";
  sub.billing = {
    startDate,
    endDate,
    nextBillingDate,
    lastBillingDate: new Date(),
    autoRenew: true,
  };
  // Mark last pending payment as completed
  if (sub.payments?.length) {
    sub.payments[sub.payments.length - 1].status = "completed";
    sub.payments[sub.payments.length - 1].paymentDate = new Date();
    sub.payments[sub.payments.length - 1].transactionId = session.id;
    sub.payments[sub.payments.length - 1].paymentMethod = "stripe";
  }
  await sub.save();

  return res
    .status(200)
    .json({ message: "Subscription activated", subscription: sub });
});

// Get current user's subscription
const getMySubscription = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const sub = await Subscription.findOne({ userId });
  if (!sub) return res.status(404).json({ message: "No subscription found" });
  return res.status(200).json({ subscription: sub });
});

// Cancel current user's subscription (local record)
const cancelMySubscription = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const sub = await Subscription.findOne({ userId });
  if (!sub) return res.status(404).json({ message: "No subscription found" });

  sub.status = "cancelled";
  sub.cancellation = {
    cancelledAt: new Date(),
    cancelledBy: userId,
    reason: req.body?.reason || "user_cancelled",
  };
  await sub.save();
  return res
    .status(200)
    .json({ message: "Subscription cancelled", subscription: sub });
});

// Update plan (no payment logic here; front-end should re-create checkout for proration if needed)
const updateMyPlan = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const {
    planName,
    price,
    currency = "PKR",
    billingCycle = "monthly",
  } = req.body;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  if (!planName || !price)
    return res.status(400).json({ message: "planName and price are required" });
  const sub = await Subscription.findOne({ userId });
  if (!sub) return res.status(404).json({ message: "No subscription found" });

  sub.plan = { name: planName, price, currency, billingCycle };
  await sub.save();
  return res.status(200).json({ message: "Plan updated", subscription: sub });
});

export {
  createSubscription,
  confirmSubscription,
  getMySubscription,
  cancelMySubscription,
  updateMyPlan,
};
