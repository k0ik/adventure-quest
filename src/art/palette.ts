/**
 * The shared palette. Every builder takes colours from here so the world stays coherent.
 * Folk-illustration tones: warm ochres, mossy greens, brick red, muted teal, cream.
 * Late-afternoon light warms everything further; keep base colours slightly cool and muted.
 */
export const palette = {
  // Foliage
  leafDeep: '#35592b',
  leaf: '#4f7f2f',
  leafLight: '#7ea83a',
  leafSun: '#a9c04a',
  firDeep: '#2c4433',
  fir: '#3e5b40',

  // Ground
  forestFloor: '#4f5a2b',
  grass: '#5f8a33',
  grassDry: '#97a24a',
  moss: '#6f9a38',
  soil: '#7a5a3c',
  path: '#a88a5f',
  leafLitter: '#b86a33',
  leafLitterGold: '#d1a03e',

  // Wood and stone
  bark: '#7a5236',
  barkLight: '#9a6d47',
  timber: '#8a6240',
  timberDark: '#553a26',
  stone: '#8a8478',
  stoneDark: '#6c675e',
  stoneLight: '#a7a092',

  // Metal and light
  iron: '#3a3632',
  brass: '#c08f3b',
  lampGlow: '#ffc46b',

  // Fur
  furRabbit: '#b99a78',
  furRabbitLight: '#ead9bf',
  furRabbitInner: '#e3a69c',
  eye: '#231b16',
  nose: '#c9767a',

  // Cloth
  clothBrick: '#b0533a',
  clothMustard: '#cf9e3c',
  clothSage: '#8ea37a',
  clothTeal: '#3f6f73',
  clothCream: '#efe3c8',
  clothNavy: '#34445e',
  clothPlum: '#6e4157',

  // Mushrooms and flowers
  capRed: '#b8402f',
  capPale: '#e8dccb',
  stalk: '#efe6d6',
  flowerViolet: '#8a6fb0',

  // Distance haze layers (atmospheric perspective)
  hillNear: '#5f7a5a',
  hillFar: '#9a9ab4',

  // Light
  rimCool: '#7f9be0',

  // Sky
  skyTop: '#8f8fb8',
  skyMid: '#d9b8a6',
  skyHorizon: '#f6c58a',
  sun: '#ffb877',
} as const;

export type PaletteKey = keyof typeof palette;
