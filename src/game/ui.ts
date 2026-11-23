/**
 * Story HUD: the narrative panel with numbered choices, the travel bar, tools and settings.
 * Plain accessible HTML; every action is a real button reachable by keyboard.
 */
export interface Choice {
  label: string;
  onSelect: () => void;
}

export interface StoryView {
  title: string;
  speaker?: string;
  text: string;
  choices: Choice[];
}

export interface Settings {
  reducedMotion: boolean;
  skipTravel: 'never' | 'revisits' | 'always';
  sound: boolean;
  volume: number; // 0..1
}

const SETTINGS_KEY = 'forest-adventure.settings.v1';

export function loadSettings(): Settings {
  const fallback: Settings = {
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    skipTravel: 'never',
    sound: true,
    volume: 0.7,
  };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* settings are a convenience; play continues without them */
  }
}

export class Hud {
  private story = el('section', 'story');
  private tools = el('div', 'tools');
  private settingsPanel: HTMLElement | null = null;
  private current: Choice[] = [];
  private barFill: HTMLElement | null = null;
  onRecentre: () => void = () => {};
  onSkip: () => void = () => {};
  onSoundChange: () => void = () => {};

  constructor(private root: HTMLElement, readonly settings: Settings, private studiesHref: string) {
    this.story.setAttribute('aria-live', 'polite');
    this.story.setAttribute('aria-label', 'Story');
    const recentre = button('Recentre', () => this.onRecentre(), 'tool');
    recentre.append(kbd('C'));
    const gear = button('Settings', () => this.toggleSettings(), 'tool');
    gear.setAttribute('aria-expanded', 'false');
    this.tools.append(recentre, gear);
    const hint = el('p', 'hint');
    hint.textContent = 'Drag or use the arrow keys to look around · number keys choose';
    root.append(this.story, this.tools, hint);

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'Escape' && this.settingsPanel) this.toggleSettings();
      if (e.key === 'c' || e.key === 'C') this.onRecentre();
      const n = Number(e.key);
      if (n >= 1 && n <= this.current.length) {
        e.preventDefault();
        this.current[n - 1].onSelect();
      }
    });
  }

  show(view: StoryView): void {
    const hadFocus = this.story.contains(document.activeElement);
    this.story.replaceChildren();
    const h = el('h1');
    h.textContent = view.title;
    this.story.append(h);
    if (view.speaker) {
      const s = el('p', 'speaker');
      s.textContent = view.speaker;
      this.story.append(s);
    }
    const p = el('p', 'passage');
    p.textContent = view.text;
    this.story.append(p);
    const list = el('ol', 'choices');
    this.current = view.choices;
    view.choices.forEach((c, i) => {
      const li = el('li');
      const b = button('', () => c.onSelect());
      const k = el('span', 'key');
      k.textContent = String(i + 1);
      const t = el('span');
      t.textContent = c.label;
      b.append(k, t);
      li.append(b);
      list.append(li);
    });
    this.story.append(list);
    this.barFill = null;
    // Keep keyboard users in the flow: if they were in the panel, focus the first new choice.
    if (hadFocus) list.querySelector('button')?.focus();
  }

  showTravel(destination: string): void {
    this.current = [];
    this.story.replaceChildren();
    const h = el('h1');
    h.textContent = `On the path to ${destination}`;
    const row = el('div', 'travelling');
    const bar = el('div', 'bar');
    this.barFill = el('i');
    bar.append(this.barFill);
    const skip = button('Skip', () => this.onSkip());
    skip.setAttribute('aria-keyshortcuts', 'S');
    row.append(bar, skip);
    this.story.append(h, row);
    skip.focus({ preventScroll: true });
  }

  travelProgress(k: number): void {
    if (this.barFill) this.barFill.style.width = `${Math.round(k * 100)}%`;
  }

  private toggleSettings(): void {
    const gear = this.tools.querySelectorAll('button')[1];
    if (this.settingsPanel) {
      this.settingsPanel.remove();
      this.settingsPanel = null;
      gear.setAttribute('aria-expanded', 'false');
      gear.focus();
      return;
    }
    const panel = el('div', 'settings');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Settings');
    const h = el('h2');
    h.textContent = 'Settings';
    const motion = el('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = 'set-reduced-motion';
    cb.checked = this.settings.reducedMotion;
    cb.addEventListener('change', () => { this.settings.reducedMotion = cb.checked; saveSettings(this.settings); });
    motion.append(cb, document.createTextNode('Reduced motion (fade between places)'));
    const skipLabel = el('label');
    const sel = document.createElement('select');
    sel.id = 'set-skip-travel';
    for (const [v, t] of [['never', 'Never'], ['revisits', 'Paths I have walked before'], ['always', 'Always']] as const) {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = t;
      sel.append(o);
    }
    sel.value = this.settings.skipTravel;
    sel.addEventListener('change', () => { this.settings.skipTravel = sel.value as Settings['skipTravel']; saveSettings(this.settings); });
    skipLabel.append(document.createTextNode('Skip journeys: '), sel);
    const sound = el('label');
    const sc = document.createElement('input');
    sc.type = 'checkbox';
    sc.id = 'set-sound';
    sc.checked = this.settings.sound;
    sc.addEventListener('change', () => { this.settings.sound = sc.checked; vol.disabled = !sc.checked; saveSettings(this.settings); this.onSoundChange(); });
    sound.append(sc, document.createTextNode('Ambient sound'));
    const volLabel = el('label');
    const vol = document.createElement('input');
    vol.type = 'range';
    vol.id = 'set-volume';
    vol.min = '0';
    vol.max = '1';
    vol.step = '0.05';
    vol.value = String(this.settings.volume);
    vol.disabled = !this.settings.sound;
    vol.setAttribute('aria-label', 'Volume');
    vol.addEventListener('input', () => { this.settings.volume = Number(vol.value); saveSettings(this.settings); this.onSoundChange(); });
    volLabel.append(document.createTextNode('Volume '), vol);
    const studies = document.createElement('a');
    studies.href = this.studiesHref;
    studies.textContent = 'Open the visual studies';
    panel.append(h, sound, volLabel, motion, skipLabel, studies);
    this.root.append(panel);
    this.settingsPanel = panel;
    gear.setAttribute('aria-expanded', 'true');
    cb.focus();
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

function button(label: string, onClick: () => void, cls?: string): HTMLButtonElement {
  const b = el('button', cls);
  b.type = 'button';
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function kbd(k: string): HTMLElement {
  const e = el('kbd');
  e.textContent = k;
  return e;
}

export function showTitle(root: HTMLElement, onBegin: () => void): void {
  const wrap = el('div', 'title');
  const card = el('div', 'card');
  const h = el('h1');
  h.textContent = 'Forest Adventure';
  const p = el('p');
  p.textContent = 'An interaction sample: one clearing, one path, two neighbours. Best with sound on.';
  const b = button('Begin', () => { wrap.remove(); onBegin(); });
  card.append(h, p, b);
  wrap.append(card);
  root.append(wrap);
  b.focus();
}
