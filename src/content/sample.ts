import type { LocationId } from './world';

/**
 * Authored text for the Stage 3 interaction sample. Placeholder story content pending the
 * full quest review; it follows the settled story decisions (last night's storm, Clover's
 * washed-away kettle, Bertram at the trail lodge).
 *
 * Text may use {rabbit} and {badger}: the resident's name once met, otherwise "the rabbit".
 */
export interface Passage { first: string; again: string }

export type SampleAction =
  | { id: string; label: string; kind: 'travel'; to: LocationId; labelAgain?: string }
  | { id: string; label: string; kind: 'local'; text: string }
  | { id: string; label: string; kind: 'talk'; resident: string };

export interface DialogueNode {
  text: string;
  gesture?: boolean;
  options: { label: string; next?: string }[];
}

export const passages: Record<LocationId, Passage> = {
  campfire: {
    first:
      'You wake beside a campfire that has burned down to a sulky glow. Your coat is damp, your map is gone, and you have no idea how you got here. Beyond the trees the afternoon is turning gold, and a well-worn path winds away between the ferns.',
    again: 'The campfire is where you left it, still sulking quietly to itself. The path back to the Village Oak winds off between the ferns.',
  },
  'village-oak': {
    first:
      'The path opens into a clearing around an enormous oak. Someone has set a round green door into its roots, with a lit window above. A rabbit in an apron is fussing over a table of teacups, and a badger leaning on a staff seems to be in no hurry at all.',
    again: 'The great oak stands over its clearing, its round window glowing. {rabbit} is still arranging cups, and {badger} has not moved an inch.',
  },
};

export const actions: Record<LocationId, SampleAction[]> = {
  campfire: [
    { id: 'campfire.follow-path', label: 'Follow the path between the ferns', labelAgain: 'Walk back to the Village Oak', kind: 'travel', to: 'village-oak' },
    { id: 'campfire.warm-hands', label: 'Warm your hands at the embers', kind: 'local', text: 'You hold your hands to the embers. The fire gives a small, determined crackle, as if to say it is doing its best.' },
  ],
  'village-oak': [
    { id: 'oak.talk-rabbit', label: 'Talk to {rabbit}', kind: 'talk', resident: 'rabbit' },
    { id: 'oak.talk-badger', label: 'Talk to {badger}', kind: 'talk', resident: 'badger' },
    { id: 'oak.to-campfire', label: 'Go back to the campfire', kind: 'travel', to: 'campfire' },
  ],
};

export const dialogue: Record<string, Record<string, DialogueNode>> = {
  rabbit: {
    start: {
      text: 'Oh! Hello, hello. A visitor, and here I am with cups out and no kettle to fill them. Clover Thimblewick. Do sit, if you can find a stool that isn\'t wobbly.',
      gesture: true,
      options: [
        { label: 'What happened to your kettle?', next: 'kettle' },
        { label: 'Do you know the way out of the woods?', next: 'way' },
        { label: 'I\'ll let you get on.' },
      ],
    },
    kettle: {
      text: 'Last night\'s storm picked it clean off the table. I watched it go bowling off toward the stream, lid and all. I\'ve kept laying out cups ever since, out of sheer stubbornness.',
      options: [
        { label: 'Do you know the way out of the woods?', next: 'way' },
        { label: 'I hope it turns up.' },
      ],
    },
    way: {
      text: 'Out? Oh, I wouldn\'t know the first thing about roads. Bertram\'s the one for that. He keeps the trail lodge, and he knows every path that ever was, and a few that weren\'t.',
      options: [{ label: 'Thank you, Clover.' }],
    },
  },
  badger: {
    start: {
      text: 'Afternoon. Bertram Holloway, of the trail lodge. You\'ll be the one who slept by the old campfire. Lost, I\'d wager.',
      options: [
        { label: 'I\'m trying to get home.', next: 'home' },
        { label: 'Just passing through.' },
      ],
    },
    home: {
      text: 'Hm. The storm\'s made a proper muddle of the old trail. Come up to the lodge when you\'ve a moment, and we\'ll see what can be done.',
      gesture: true,
      options: [{ label: 'I\'ll do that. Thank you.' }],
    },
  },
};

export const residentNames: Record<string, { met: string; unmet: string }> = {
  rabbit: { met: 'Clover', unmet: 'the rabbit' },
  badger: { met: 'Bertram', unmet: 'the badger' },
};
