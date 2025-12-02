// Configuration Auth0 pour Valthera TCG

export const AUTH0_CONFIG = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN || '',
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID || '',
  audience: import.meta.env.VITE_AUTH0_AUDIENCE || '',
  redirectUri: typeof window !== 'undefined' ? window.location.origin : '',
};

// =============================================
// LISTE DES ADMINISTRATEURS
// Ajoutez ici les emails des utilisateurs qui doivent avoir les droits admin
// =============================================
export const ADMIN_EMAILS: string[] = [
  'alexandre.bailleu@gmail.com',
];

// Vérifier si un email est admin
export const isAdminEmail = (email: string): boolean => {
  return ADMIN_EMAILS.some(
    adminEmail => adminEmail.toLowerCase() === email.toLowerCase()
  );
};
