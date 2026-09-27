// The Time Receipt, deployed on its own. The only file you need to edit before deploying.
// (A copy of the Vault's config.js, trimmed to what this app uses.)
window.VAULT_CONFIG = {
  handle: '@null_grind',
  bio: 'PhD student. I automate the busywork so I leave at 5.',

  // This app's live address, no trailing slash (e.g. 'receipt.example.com'). Printed on the share
  // card and in the share caption. Empty = uses the current address.
  siteUrl: '',

  // The System Vault's live address, no trailing slash (e.g. 'https://vault.example.com').
  // Used for "More free systems", the Leverage Audit and the Citation Checker links.
  // Empty = those links are hidden, so a standalone deploy never shows a broken link.
  vaultUrl: '',

  // Leave a link empty to hide it.
  socials: {
    instagram: '',
    tiktok: '',
    youtube: '',
    linkedin: '',
  },

  // Email capture for kills #2+. While provider is 'none' every kill is open (no gate).
  email: {
    provider: 'none', // 'none' | 'kit' | 'custom'
    // provider 'kit': the Kit form ID is the number in the form's embed URL.
    kitForms: {
      default: '',
      receipt: '',
    },
    // true = also save the role picked and the traffic source (create Kit custom fields 'role' and 'source').
    kitCustomFields: false,
    // provider 'custom': any service that accepts a plain HTML form POST.
    action: '',
    emailField: 'email',
  },
};
