export const translations = {
  en: {
    // Navigation
    home: 'Home',
    myCredits: 'My Credits',
    history: 'History',
    profile: 'Profile',
    
    // Station
    stationDescription: 'Self-service dog wash – water + dryer',
    stationSubtitle: 'Professional dog washing station with water and dryer. Perfect for keeping your furry friend clean and happy!',
    
    // Status
    available: 'Available',
    busy: 'Busy',
    offline: 'Offline',
    
    // Price
    price: 'Price',
    duration: 'Duration',
    minutes: 'minutes',
    
    // Actions
    payNowWithCard: 'Pay Now with Card',
    loginAndUseCredits: 'Login and Use Your Credits',
    
    // How it works
    howItWorks: 'How it works?',
    step1Title: 'Pay or use credits',
    step1Desc: 'Choose your payment method or login to use your credits',
    step2Title: 'Wash your dog',
    step2Desc: 'Use water and soap to clean your pet thoroughly',
    step3Title: 'Dry and finish',
    step3Desc: 'Use the dryer to leave your dog clean and dry',
    
    // Safety
    safetyRecommendations: 'Safety recommendations',
    safety1: 'Always supervise your pet during the wash',
    safety2: 'Check water temperature before starting',
    safety3: 'Keep your dog calm and secured',
    safety4: 'Use the dryer carefully, avoiding eyes and ears',
    
    // Features
    waterSystem: 'Water System',
    adjustablePressure: 'Adjustable pressure',
    petDryer: 'Pet Dryer',
    safeTemperature: 'Safe temperature',
    
    // Auth
    login: 'Login',
    register: 'Register',
    createAccount: 'Create Account',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    fullName: 'Full Name',
    forgotPassword: 'Forgot password?',
    alreadyHaveAccount: 'Already have an account?',
    dontHaveAccount: "Don't have an account?",
    acceptTerms: 'I accept the Terms and Conditions',
    joinToday: 'Join Shower2Pet today',
    
    // Language
    language: 'Language',
    english: 'English',
    italian: 'Italiano',
  },
  it: {
    // Navigation
    home: 'Home',
    myCredits: 'I Miei Crediti',
    history: 'Storico',
    profile: 'Profilo',
    
    // Station
    stationDescription: 'Lavaggio cani self-service – acqua + asciugatura',
    stationSubtitle: 'Stazione professionale per il lavaggio del cane con acqua e asciugatrice. Perfetto per mantenere il tuo amico a quattro zampe pulito e felice!',
    
    // Status
    available: 'Disponibile',
    busy: 'Occupato',
    offline: 'Non disponibile',
    
    // Price
    price: 'Prezzo',
    duration: 'Durata',
    minutes: 'minuti',
    
    // Actions
    payNowWithCard: 'Paga Ora con Carta',
    loginAndUseCredits: 'Accedi e Usa i Tuoi Crediti',
    
    // How it works
    howItWorks: 'Come funziona?',
    step1Title: 'Paga o usa i crediti',
    step1Desc: 'Scegli il metodo di pagamento o accedi per usare i tuoi crediti',
    step2Title: 'Lava il tuo cane',
    step2Desc: 'Usa acqua e sapone per pulire accuratamente il tuo animale',
    step3Title: 'Asciuga e termina',
    step3Desc: "Usa l'asciugatrice per lasciare il tuo cane pulito e asciutto",
    
    // Safety
    safetyRecommendations: 'Raccomandazioni di sicurezza',
    safety1: 'Supervisiona sempre il tuo animale durante il lavaggio',
    safety2: "Controlla la temperatura dell'acqua prima di iniziare",
    safety3: 'Mantieni il tuo cane calmo e sicuro',
    safety4: "Usa l'asciugatrice con attenzione, evitando occhi e orecchie",
    
    // Features
    waterSystem: 'Sistema Acqua',
    adjustablePressure: 'Pressione regolabile',
    petDryer: 'Asciugatrice',
    safeTemperature: 'Temperatura sicura',
    
    // Auth
    login: 'Accedi',
    register: 'Registrati',
    createAccount: 'Crea Account',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Conferma Password',
    fullName: 'Nome Completo',
    forgotPassword: 'Password dimenticata?',
    alreadyHaveAccount: 'Hai già un account?',
    dontHaveAccount: 'Non hai un account?',
    acceptTerms: 'Accetto i Termini e Condizioni',
    joinToday: 'Unisciti a Shower2Pet oggi',
    
    // Language
    language: 'Lingua',
    english: 'English',
    italian: 'Italiano',
  },
};

export type Language = 'en' | 'it';
export type TranslationKey = keyof typeof translations.en;
