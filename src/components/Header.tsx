import './Header.css'

type Props = {
  title: string
  subtitle: string
  stepNumber: number
  totalSteps: number
  onBack?: () => void
}

function Header({ title, subtitle, stepNumber, totalSteps, onBack }: Props) {
  return (
    <header className="header">
      {onBack ? (
        <button type="button" className="header-back" onClick={onBack} aria-label="Terug">
          ←
        </button>
      ) : (
        <div className="header-logo" aria-hidden="true" />
      )}
      <div>
        <h1 className="header-title">{title}</h1>
        <p className="header-subtitle">
          {stepNumber} van {totalSteps} · {subtitle}
        </p>
      </div>
    </header>
  )
}

export default Header
