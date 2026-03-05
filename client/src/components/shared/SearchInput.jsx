import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'

export default function SearchInput({ value, onChange, placeholder = 'חיפוש...' }) {
  const [localValue, setLocalValue] = useState(value || '')
  const timerRef = useRef(null)

  useEffect(() => {
    setLocalValue(value || '')
  }, [value])

  const handleChange = (e) => {
    const val = e.target.value
    setLocalValue(val)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      onChange(val)
    }, 300)
  }

  const handleClear = () => {
    setLocalValue('')
    onChange('')
  }

  return (
    <div className="relative">
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-3 pr-9 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150"
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-all duration-150"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
