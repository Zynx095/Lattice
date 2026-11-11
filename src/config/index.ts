/**
 * SINGLE CONFIGURATION ENTRY POINT.
 *
 *   app.config.ts         name, tagline, record noun, default user, API base URL
 *   modules.config.ts     which modules are on, their paths, titles, descriptions
 *   navigation.config.ts  sidebar groups and icons
 *   dashboard.config.ts   overview metrics and quick actions
 *   theme.config.ts       accent presets, chart colours, 3D background
 *   ai.config.ts          every prompt sent to the AI service
 *
 * Import from '@/config' everywhere.
 */
export * from './app.config'
export * from './modules.config'
export * from './navigation.config'
export * from './theme.config'
export * from './ai.config'
export * from './dashboard.config'
