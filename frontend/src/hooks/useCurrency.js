import { useState, useEffect } from 'react'

const PPP_RATES = {
  // Purchasing Power Parity (PPP) approximations for round, attractive numbers
  // Key: Country Code (ISO 3166-1 alpha-2)
  'IN': { code: 'INR', symbol: '₹', rate: 80, isPpp: true }, // E.g., $15 * 80 = 1200 -> approx 999
  'GB': { code: 'GBP', symbol: '£', rate: 0.8, isPpp: true },
  'EU': { code: 'EUR', symbol: '€', rate: 0.9, isPpp: true },
  // Default is USD
}

export function useCurrency() {
  const [currency, setCurrency] = useState({ code: 'USD', symbol: '$', rate: 1, isPpp: false })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check local storage first to prevent API spam
    const cached = localStorage.getItem('codeva_currency')
    if (cached) {
      try {
        setCurrency(JSON.parse(cached))
        setLoading(false)
        return
      } catch (e) {}
    }

    const fetchLocation = async () => {
      try {
        // Use a free IP API to get country code
        const response = await fetch('https://ipapi.co/json/')
        const data = await response.json()
        
        if (data.country_code && PPP_RATES[data.country_code]) {
          const config = PPP_RATES[data.country_code]
          setCurrency(config)
          localStorage.setItem('codeva_currency', JSON.stringify(config))
        } else {
          // Fallback or unsupported country, default to USD
          const usdConfig = { code: 'USD', symbol: '$', rate: 1, isPpp: false }
          setCurrency(usdConfig)
          localStorage.setItem('codeva_currency', JSON.stringify(usdConfig))
        }
      } catch (error) {
        console.error('Failed to detect currency from IP', error)
      } finally {
        setLoading(false)
      }
    }
    fetchLocation()
  }, [])

  // Formats a base USD price to the local currency using PPP rules
  const formatPrice = (usdAmount, isMonthly = true) => {
    if (currency.code === 'USD') return `${currency.symbol}${usdAmount}`
    
    // Custom PPP logic for specific countries to make prices look "nice"
    if (currency.code === 'INR') {
      if (usdAmount === 0) return '₹0'
      if (usdAmount === 15) return '₹999' // Pro Yearly
      if (usdAmount === 18) return '₹1299' // Pro Monthly
      if (usdAmount === 20) return '₹1499' // Team Standard Yearly
      if (usdAmount === 25) return '₹1999' // Team Standard Monthly
      if (usdAmount === 90) return '₹6999' // Max Yearly
      if (usdAmount === 100) return '₹7999' // Max / Team Premium Yearly
      if (usdAmount === 125) return '₹9999' // Team Premium Monthly
      // Fallback multiplier for unmapped prices
      return `₹${Math.round((usdAmount * 82) / 100) * 100 - 1}`
    }

    // Default conversion
    const converted = usdAmount * currency.rate
    return `${currency.symbol}${Math.round(converted)}`
  }

  return { currency, formatPrice, loading }
}
