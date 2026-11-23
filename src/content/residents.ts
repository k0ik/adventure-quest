/**
 * Resident identities. Names and roles are proposals awaiting creator review.
 * `visual` points at a presentation definition; quest data will reference `id` only.
 */
export interface Resident {
  id: string;
  name: string;
  species: string;
  visual: string;
  occupation: string;
}

export const residents: Record<string, Resident> = {
  rabbit: { id: 'rabbit', name: 'Clover Thimblewick', species: 'rabbit', visual: 'rabbit-clover', occupation: 'tea-room keeper' },
};
