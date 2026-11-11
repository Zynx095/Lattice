/**
 * BRANDING. Change these values to rename the whole product.
 * Nothing else in the codebase hardcodes the app name or the record noun.
 */
export const appConfig = {
  /** Product name shown in the sidebar, browser tab and command palette. */
  name: 'Lattice',
  /** One short line under the name. */
  tagline: 'Campus Intelligence',
  /** Used for the HTML meta description. */
  description: 'An AI-powered university campus helpdesk grounded in supplied university information.',

  /**
   * What one row of the main dataset is called. Used in buttons, empty states
   * and toasts ("New record", "Record deleted").
   */
  entity: { singular: 'record', plural: 'records' },

  /** Prefix for every localStorage key. Change it to start from clean data. */
  storagePrefix: 'lattice',

  /** Profile used until the person edits it in Settings. No authentication. */
  defaultUser: { name: 'Alex Morgan', email: 'alex@example.com', role: 'Workspace owner' },

  /** Base URL of the optional Express backend in /server. */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
} as const

/** "record" -> "Record" */
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
