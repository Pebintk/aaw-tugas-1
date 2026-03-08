/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com
 */

import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import '@mdi/font/css/materialdesignicons.css'
import '../styles/layers.css'

// Material You (MD3) purple seed palette
const md3Light = {
  dark: false,
  colors: {
    background:                '#FFFBFE',
    surface:                   '#FFFBFE',
    'surface-container':       '#F3EDF7',
    'surface-container-low':   '#E7E0EC',
    primary:                   '#6750A4',
    'on-primary':              '#FFFFFF',
    secondary:                 '#625B71',
    'secondary-container':     '#E8DEF8',
    'on-secondary-container':  '#1D192B',
    tertiary:                  '#7D5260',
    'on-tertiary':             '#FFFFFF',
    'tertiary-container':      '#FFD8E4',
    error:                     '#B3261E',
    'on-error':                '#FFFFFF',
    'on-background':           '#1C1B1F',
    'on-surface':              '#1C1B1F',
    'on-surface-variant':      '#49454F',
    outline:                   '#79747E',
    'outline-variant':         '#CAC4D0',
    success:                   '#386A20',
    warning:                   '#7C5800',
    info:                      '#00658A',
  },
}

const md3Dark = {
  dark: true,
  colors: {
    background:                '#1C1B1F',
    surface:                   '#1C1B1F',
    'surface-container':       '#211F26',
    'surface-container-low':   '#1D1B20',
    primary:                   '#D0BCFF',
    'on-primary':              '#381E72',
    secondary:                 '#CCC2DC',
    'secondary-container':     '#4A4458',
    'on-secondary-container':  '#E8DEF8',
    tertiary:                  '#EFB8C8',
    'on-tertiary':             '#492532',
    'tertiary-container':      '#633B48',
    error:                     '#F2B8B5',
    'on-error':                '#601410',
    'on-background':           '#E6E1E5',
    'on-surface':              '#E6E1E5',
    'on-surface-variant':      '#CAC4D0',
    outline:                   '#938F99',
    'outline-variant':         '#49454F',
    success:                   '#7EBC55',
    warning:                   '#FFB951',
    info:                      '#5BD5FE',
  },
}

export default createVuetify({
  theme: {
    defaultTheme: 'md3Light',
    themes: { md3Light, md3Dark },
    utilities: false,
  },
  defaults: {
    VBtn: {
      rounded: 'pill',
      elevation: 0,
    },
    VCard: {
      rounded: 'xl',
      elevation: 1,
    },
    VChip: {
      rounded: 'pill',
    },
    VTextField: {
      variant: 'filled',
      rounded: 't-lg',
    },
    VSelect: {
      variant: 'filled',
      rounded: 't-lg',
    },
    VAlert: {
      rounded: 'xl',
    },
    VDialog: {
      rounded: 'xl',
    },
  },
  display: {
    mobileBreakpoint: 'md',
    thresholds: {
      xs: 0,
      sm: 600,
      md: 840,
      lg: 1145,
      xl: 1545,
      xxl: 2138,
    },
  },
})
