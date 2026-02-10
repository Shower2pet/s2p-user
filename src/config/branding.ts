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
  
  // Credit packs
  creditPacks: [
    {
      id: 'pack-10',
      name: 'Pacchetto Starter',
      price: 10,
      credits: 12,
      bonus: 2,
      description: 'Ottieni 2 crediti bonus',
      stripePriceId: 'price_1SagSVGzJdGfXoSnWCJxvEab',
    },
    {
      id: 'pack-20',
      name: 'Pacchetto Value',
      price: 20,
      credits: 25,
      bonus: 5,
      description: 'Ottieni 5 crediti bonus',
      badge: 'Popolare',
      stripePriceId: 'price_1SahtPGzJdGfXoSnVAXAIzTj',
    },
  ],
};
