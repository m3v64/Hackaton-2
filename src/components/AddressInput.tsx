import { useEffect, useId, useState, type ReactNode } from 'react'
import { searchPlaces, type Place } from '../api/ors'
import './AddressInput.css'

const MIN_QUERY_LENGTH = 3
const DEBOUNCE_MS = 300

type Props = {
  label: string
  icon: ReactNode
  placeholder: string
  value: Place | null
  onChange: (place: Place | null) => void
  action?: ReactNode
}

function AddressInput({ label, icon, placeholder, value, onChange, action }: Props) {
  const inputId = useId()
  const [text, setText] = useState(value?.label ?? '')
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Place[]>([])
  const [error, setError] = useState<string | null>(null)

  // Neem een adres over dat van buitenaf is gezet, bijvoorbeeld de huidige locatie.
  const [syncedValue, setSyncedValue] = useState(value)
  if (value !== syncedValue) {
    setSyncedValue(value)
    if (value) setText(value.label)
  }

  useEffect(() => {
    if (!query) return

    const controller = new AbortController()
    const timer = setTimeout(() => {
      searchPlaces(query, controller.signal)
        .then((places) => {
          setSuggestions(places)
          setError(null)
        })
        .catch((err: Error) => {
          if (err.name !== 'AbortError') setError(err.message)
        })
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  function handleTextChange(newText: string) {
    setText(newText)
    onChange(null)
    const trimmed = newText.trim()
    setQuery(trimmed.length >= MIN_QUERY_LENGTH ? trimmed : '')
    if (trimmed.length < MIN_QUERY_LENGTH) setSuggestions([])
  }

  function handleSelect(place: Place) {
    setText(place.label)
    setQuery('')
    setSuggestions([])
    onChange(place)
  }

  return (
    <div className="address-input">
      <label className="address-input-label" htmlFor={inputId}>
        {label}
      </label>
      <div className="address-input-field">
        <span className="address-input-icon">{icon}</span>
        <input
          id={inputId}
          type="text"
          autoComplete="off"
          placeholder={placeholder}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
        />
        {action}
      </div>
      {suggestions.length > 0 && (
        <ul className="address-input-suggestions">
          {suggestions.map((place) => (
            <li key={`${place.label}-${place.coordinates.join(',')}`}>
              <button type="button" onClick={() => handleSelect(place)}>
                {place.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="address-input-error">{error}</p>}
    </div>
  )
}

export default AddressInput
