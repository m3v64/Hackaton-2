import { useState } from 'react'
import Header from './components/Header'
import { STEPS, type Step } from './steps'
import './App.css'

function App() {
  const [step, setStep] = useState<Step>('bestemming')

  const index = STEPS.findIndex((s) => s.id === step)
  const current = STEPS[index]
  const canGoBack = step === 'schatting' || step === 'beeindigen'

  return (
    <div className="app">
      <Header
        title={current.title}
        subtitle={current.subtitle}
        stepNumber={index + 1}
        totalSteps={STEPS.length}
        onBack={canGoBack ? () => setStep(STEPS[index - 1].id) : undefined}
      />
      <main className="app-content">
        <p>Scherm: {current.title}</p>
      </main>
      <footer className="app-footer">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setStep(STEPS[(index + 1) % STEPS.length].id)}
        >
          Volgende
        </button>
      </footer>
    </div>
  )
}

export default App
