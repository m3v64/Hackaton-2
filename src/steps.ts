export type Step = 'bestemming' | 'schatting' | 'rit' | 'beeindigen' | 'overzicht'

export const STEPS: { id: Step; title: string; subtitle: string }[] = [
  { id: 'bestemming', title: 'TaxiPrijs', subtitle: 'Bestemming' },
  { id: 'schatting', title: 'Prijsschatting', subtitle: 'Voor vertrek' },
  { id: 'rit', title: 'Rit volgen', subtitle: 'Onderweg' },
  { id: 'beeindigen', title: 'Rit beëindigen', subtitle: 'Bevestiging' },
  { id: 'overzicht', title: 'Ritoverzicht', subtitle: 'Aangekomen' },
]
