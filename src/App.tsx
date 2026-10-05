import { useState } from 'react'
import type { Place, Route } from './api/ors'
import Header from './components/Header'
import DestinationScreen from './screens/DestinationScreen'
import EstimateScreen from './screens/EstimateScreen'
import { STEPS, type Step } from './steps'
import './App.css'

function App() {
  const [step, setStep] = useState<Step>('bestemming')
  const [from, setFrom] = useState<Place | null>(null)
  const [to, setTo] = useState<Place | null>(null)
  const [route, setRoute] = useState<Route | null>(null)

  const index = STEPS.findIndex((s) => s.id === step)
  const current = STEPS[index]
  const canGoBack = step === 'schatting' || step === 'beeindigen'
  const goToNextStep = () => setStep(STEPS[(index + 1) % STEPS.length].id)

  // Een ander adres betekent een andere route; die wordt op scherm 2 opnieuw berekend.
  function changeFrom(place: Place | null) {
    setFrom(place)
    setRoute(null)
  }

  function changeTo(place: Place | null) {
    setTo(place)
    setRoute(null)
  }

  return (
    <div className="app">
      <Header
        title={current.title}
        subtitle={current.subtitle}
        stepNumber={index + 1}
        totalSteps={STEPS.length}
        onBack={canGoBack ? () => setStep(STEPS[index - 1].id) : undefined}
      />
      {step === 'bestemming' ? (
        <DestinationScreen
          from={from}
          to={to}
          onFromChange={changeFrom}
          onToChange={changeTo}
          onNext={goToNextStep}
        />
      ) : step === 'schatting' && from && to ? (
        <EstimateScreen
          from={from}
          to={to}
          route={route}
          onRouteLoaded={setRoute}
          onStart={goToNextStep}
        />
      ) : (
        <>
          <main className="app-content">
            <p>Scherm: {current.title}</p>
          </main>
          <footer className="app-footer">
            <button type="button" className="btn btn-primary" onClick={goToNextStep}>
              Volgende
            </button>
          </footer>
        </>
      )}
    </div>
  )
}

export default App
