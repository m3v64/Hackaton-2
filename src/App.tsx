import { useState } from 'react'
import type { Place, Route } from './api/ors'
import Header from './components/Header'
import DestinationScreen from './screens/DestinationScreen'
import EstimateScreen from './screens/EstimateScreen'
import RideScreen from './screens/RideScreen'
import { getRideStatus, startRide, type Ride } from './ride'
import { STEPS, type Step } from './steps'
import { useRideClock } from './useRideClock'
import './App.css'

function App() {
  const [step, setStep] = useState<Step>('bestemming')
  const [from, setFrom] = useState<Place | null>(null)
  const [to, setTo] = useState<Place | null>(null)
  const [route, setRoute] = useState<Route | null>(null)
  const [ride, setRide] = useState<Ride | null>(null)

  // De rit loopt alleen door zolang scherm 3 open staat.
  const elapsed = useRideClock(ride, step === 'rit')
  const rideStatus = ride ? getRideStatus(ride, elapsed) : null

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

  function beginRide() {
    if (!route) return
    setRide(startRide(route))
    setStep('rit')
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
          onStart={beginRide}
        />
      ) : step === 'rit' && ride && rideStatus && from && to ? (
        <RideScreen
          from={from}
          to={to}
          route={ride.route.coordinates}
          status={rideStatus}
          onEndRide={() => setStep('beeindigen')}
          onArrived={() => setStep('overzicht')}
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
