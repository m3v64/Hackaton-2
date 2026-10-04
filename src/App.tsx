import { useState } from 'react'
import type { Place } from './api/ors'
import Header from './components/Header'
import DestinationScreen from './screens/DestinationScreen'
import { STEPS, type Step } from './steps'
import './App.css'

function App() {
  const [step, setStep] = useState<Step>('bestemming')
  const [from, setFrom] = useState<Place | null>(null)
  const [to, setTo] = useState<Place | null>(null)

  const index = STEPS.findIndex((s) => s.id === step)
  const current = STEPS[index]
  const canGoBack = step === 'schatting' || step === 'beeindigen'
  const goToNextStep = () => setStep(STEPS[(index + 1) % STEPS.length].id)

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
          onFromChange={setFrom}
          onToChange={setTo}
          onNext={goToNextStep}
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
