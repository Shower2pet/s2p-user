// Shower2Pet branding configuration
export const branding = {
  appName: 'Shower2Pet',
  appShortName: 'S2P',
  
  // Client co-branding (can be edited from admin dashboard)
  clientName: 'Camping del Sole',
  clientLogoUrl: '/placeholder.svg', // Replace with actual client logo
  
  // Station configuration
  station: {
    name: 'Doccia Bracco',
    description: 'Self-service dog wash – water + dryer',
    pricePerSession: 1.00,
    durationMinutes: 5,
    currency: '€',
    stripePriceId: 'price_1SahdbGzJdGfXoSntBByabU6', // 1 EUR for 5 min session
  },
  
  // Payment configuration
  creditValue: 1, // 1 credit = 1 EUR
  
  // Subscription plans
  subscriptionPlans: [
    {
      id: 'weekly',
      name: 'Weekly Plan',
      price: 10,
      interval: 'week',
      billingCycle: 'Monthly',
      creditsPerWeek: 15,
      description: 'Perfect for regular users',
      badge: 'Best Value',
      stripePriceId: 'price_weekly_placeholder', // Replace with actual Stripe price ID
    },
    {
      id: 'monthly',
      name: 'Monthly Plan',
      price: 35,
      interval: 'month',
      billingCycle: 'Monthly',
      creditsPerMonth: 40,
      description: 'Great savings for frequent use',
      stripePriceId: 'price_monthly_placeholder', // Replace with actual Stripe price ID
    },
  ],
  
  // Credit packs
  creditPacks: [
    {
      id: 'pack-10',
      name: 'Starter Pack',
      price: 10,
      credits: 12,
      bonus: 2,
      description: 'Get 2 bonus credits',
      stripePriceId: 'price_pack10_placeholder', // Replace with actual Stripe price ID
    },
    {
      id: 'pack-20',
      name: 'Value Pack',
      price: 20,
      credits: 25,
      bonus: 5,
      description: 'Get 5 bonus credits',
      badge: 'Popular',
      stripePriceId: 'price_pack20_placeholder', // Replace with actual Stripe price ID
    },
  ],
};
