import { loadFont as loadDMSans } from '@remotion/google-fonts/DMSans'
import { loadFont as loadInstrumentSerif } from '@remotion/google-fonts/InstrumentSerif'
import { loadFont as loadJetBrainsMono } from '@remotion/google-fonts/JetBrainsMono'

// Load fonts - Morfeo Academy brand
const { fontFamily: dmSans } = loadDMSans()
const { fontFamily: instrumentSerif } = loadInstrumentSerif()
const { fontFamily: jetBrainsMono } = loadJetBrainsMono()

// Morfeo Academy Brand Colors & Styles
export const colors = {
  lime: '#cdff3d',
  black: '#050508', // Morfeo's actual black
  darkGray: '#111111',
  white: '#FFFFFF',
  gray: '#888888',
}

export const fonts = {
  heading: `${instrumentSerif}, serif`, // Títulos
  body: `${dmSans}, sans-serif`, // Cuerpo
  mono: `${jetBrainsMono}, monospace`, // Código
}
