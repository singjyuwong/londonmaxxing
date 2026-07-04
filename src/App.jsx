import { useState } from 'react'
import { fetchCertificate, formatAddress, searchByPostcode } from './api/epc'
import CertificateDetails from './components/CertificateDetails'
import BillQuestionnaire from './components/BillQuestionnaire'
import BillEstimate from './components/BillEstimate'
import { computeBill } from './bills'

const BAND_COLORS = {
  A: 'bg-emerald-500',
  B: 'bg-lime-500',
  C: 'bg-yellow-400 text-yellow-950',
  D: 'bg-amber-500 text-amber-950',
  E: 'bg-orange-500',
  F: 'bg-red-500',
  G: 'bg-rose-600',
}

function EnergyBand({ band }) {
  const color = BAND_COLORS[band] ?? 'bg-slate-500'

  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold ${color}`}
    >
      {band ?? '?'}
    </span>
  )
}

export default function App() {
  const [postcode, setPostcode] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [certificate, setCertificate] = useState(null)
  const [loading, setLoading] = useState(false)
  const [certificateLoading, setCertificateLoading] = useState(false)
  const [error, setError] = useState(null)
  const [certificateError, setCertificateError] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [billBreakdown, setBillBreakdown] = useState(null)

  function clearSelection() {
    setSelected(null)
    setCertificate(null)
    setCertificateError(null)
    setBillBreakdown(null)
  }

  function handleQuestionnaireSubmit(factors) {
    setBillBreakdown(
      computeBill({
        heatingCostCurrent: certificate.heating_cost_current?.value ?? 0,
        hotWaterCostCurrent: certificate.hot_water_cost_current?.value ?? 0,
        lightingCostCurrent: certificate.lighting_cost_current?.value ?? 0,
        factors,
      }),
    )
  }

  async function handleSelect(property) {
    setSelected(property)
    setCertificate(null)
    setCertificateError(null)
    setBillBreakdown(null)
    setCertificateLoading(true)

    try {
      const data = await fetchCertificate(property.certificateNumber)
      setCertificate(data)
    } catch (err) {
      setCertificateError(err.message || 'Failed to load certificate data.')
    } finally {
      setCertificateLoading(false)
    }
  }

  async function handleSearch(event) {
    event.preventDefault()
    const trimmed = postcode.trim()

    if (!trimmed) {
      setError('Please enter a UK postcode.')
      return
    }

    setLoading(true)
    setError(null)
    clearSelection()
    setHasSearched(true)

    try {
      const data = await searchByPostcode(trimmed)
      const sorted = [...data].sort(
        (a, b) => new Date(b.registrationDate) - new Date(a.registrationDate),
      )
      setResults(sorted)
    } catch (err) {
      setResults([])
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <header className="mb-10 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">
            London Maxxing
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Find your energy certificate
          </h1>
          <p className="mt-3 text-slate-400">
            Enter your UK postcode to look up addresses and EPC certificate numbers.
          </p>
        </header>

        <form
          onSubmit={handleSearch}
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-black/20"
        >
          <label htmlFor="postcode" className="block text-sm font-medium text-slate-300">
            UK postcode
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="postcode"
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value.toUpperCase())}
              placeholder="e.g. SW19 7LE"
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-lg tracking-wide text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              autoComplete="postal-code"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
            {error}
          </div>
        )}

        {hasSearched && !loading && !error && results.length === 0 && (
          <p className="mt-8 text-center text-slate-400">
            No energy certificates found for this postcode.
          </p>
        )}

        {results.length > 0 && (
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {results.length} {results.length === 1 ? 'property' : 'properties'} found
              </h2>
              {selected && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-sm text-slate-400 hover:text-slate-200"
                >
                  Clear selection
                </button>
              )}
            </div>

            <label htmlFor="property-select" className="sr-only">
              Choose an address
            </label>
            <select
              id="property-select"
              value={selected?.certificateNumber ?? ''}
              disabled={certificateLoading}
              onChange={(e) => {
                const property = results.find((r) => r.certificateNumber === e.target.value)
                if (property) handleSelect(property)
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-wait disabled:opacity-60"
            >
              <option value="" disabled>
                Select an address…
              </option>
              {results.map((property) => (
                <option key={property.certificateNumber} value={property.certificateNumber}>
                  {formatAddress(property)} ({property.certificateNumber})
                </option>
              ))}
            </select>

            {selected && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                <EnergyBand band={selected.currentEnergyEfficiencyBand} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug text-white">{formatAddress(selected)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Registered {selected.registrationDate}
                    {selected.council ? ` · ${selected.council}` : ''}
                  </p>
                </div>
                {certificateLoading && <span className="shrink-0 text-xs text-emerald-300">Loading…</span>}
              </div>
            )}
          </section>
        )}

        {certificateError && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
            {certificateError}
          </div>
        )}

        {certificate && <CertificateDetails certificate={certificate} />}

        {certificate && <BillQuestionnaire onSubmit={handleQuestionnaireSubmit} />}

        {billBreakdown && (
          <BillEstimate
            current={{
              heating: certificate.heating_cost_current?.value ?? 0,
              hotWater: certificate.hot_water_cost_current?.value ?? 0,
              lighting: certificate.lighting_cost_current?.value ?? 0,
            }}
            breakdown={billBreakdown}
          />
        )}
      </div>
    </div>
  )
}
