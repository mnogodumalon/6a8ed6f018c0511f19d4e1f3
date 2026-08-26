import type { Auftraege, Baudokumentation } from './app';

export type EnrichedAuftraege = Auftraege & {
  kundeName: string;
  monteurName: string;
};

export type EnrichedBaudokumentation = Baudokumentation & {
  auftragName: string;
};
