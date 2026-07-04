import { formatCertificateAddress, formatCurrency } from '../api/epc'

function EnergyBand({ band }) {
  const colors = {
    A: 'bg-emerald-500',
    B: 'bg-lime-500',
    C: 'bg-yellow-400 text-yellow-950',
    D: 'bg-amber-500 text-amber-950',
    E: 'bg-orange-500',
    F: 'bg-red-500',
    G: 'bg-rose-600',
  }

  return (
    <span
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold ${colors[band] ?? 'bg-slate-500'}`}
    >
      {band ?? '?'}
    </span>
  )
}

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

function ElementList({ title, items }) {
  if (!items?.length) return null

  return (
    <div>
      <h4 className="text-sm font-medium text-slate-300">{title}</h4>
      <ul className="mt-2 space-y-2">
        {items.map((item, index) => (
          <li
            key={`${item.description}-${index}`}
            className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-300"
          >
            {item.description}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function CertificateDetails({ certificate }) {
  const improvements = certificate.suggested_improvements ?? []

  return (
    <section className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-400">
            Energy certificate
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            {formatCertificateAddress(certificate)}
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            {certificate.dwelling_type}
            {certificate.total_floor_area ? ` · ${certificate.total_floor_area} m²` : ''}
            {certificate.registration_date ? ` · Registered ${certificate.registration_date}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center">
            <EnergyBand band={certificate.current_energy_efficiency_band} />
            <p className="mt-1 text-xs text-slate-500">Current</p>
            <p className="text-sm font-semibold">{certificate.energy_rating_current}/100</p>
          </div>
          <div className="text-slate-600">→</div>
          <div className="text-center">
            <EnergyBand band={certificate.potential_energy_efficiency_band} />
            <p className="mt-1 text-xs text-slate-500">Potential</p>
            <p className="text-sm font-semibold">{certificate.energy_rating_potential}/100</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Heating cost"
          value={formatCurrency(certificate.heating_cost_current)}
          sub={
            certificate.heating_cost_potential
              ? `Could be ${formatCurrency(certificate.heating_cost_potential)}`
              : null
          }
        />
        <Stat
          label="Hot water cost"
          value={formatCurrency(certificate.hot_water_cost_current)}
          sub={
            certificate.hot_water_cost_potential
              ? `Could be ${formatCurrency(certificate.hot_water_cost_potential)}`
              : null
          }
        />
        <Stat
          label="Lighting cost"
          value={formatCurrency(certificate.lighting_cost_current)}
          sub={
            certificate.lighting_cost_potential
              ? `Could be ${formatCurrency(certificate.lighting_cost_potential)}`
              : null
          }
        />
        <Stat
          label="CO₂ emissions"
          value={
            certificate.co2_emissions_current?.value != null
              ? `${certificate.co2_emissions_current.value} ${certificate.co2_emissions_current.quantity ?? 'tonnes/year'}`
              : '—'
          }
          sub={
            certificate.co2_emissions_potential?.value != null
              ? `Could be ${certificate.co2_emissions_potential.value} tonnes/year`
              : null
          }
        />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <ElementList title="Walls" items={certificate.walls} />
        <ElementList title="Roofs" items={certificate.roofs} />
        <ElementList title="Floors" items={certificate.floors} />
        <ElementList title="Windows" items={certificate.windows} />
        <ElementList title="Main heating" items={certificate.main_heating} />
        <ElementList title="Main heating controls" items={certificate.main_heating_controls} />
      </div>

      {certificate.lighting?.description && (
        <p className="mt-6 text-sm text-slate-400">
          <span className="font-medium text-slate-300">Lighting:</span>{' '}
          {certificate.lighting.description}
        </p>
      )}

      {certificate.hot_water?.description && (
        <p className="mt-2 text-sm text-slate-400">
          <span className="font-medium text-slate-300">Hot water:</span>{' '}
          {certificate.hot_water.description}
        </p>
      )}

      {improvements.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-slate-300">Suggested improvements</h4>
          <ol className="mt-3 space-y-2">
            {improvements.map((item) => (
              <li
                key={item.sequence}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm"
              >
                <span className="text-slate-300">
                  {item.sequence}. {item.improvement_type}
                  {item.indicative_cost ? ` (${item.indicative_cost})` : ''}
                </span>
                {item.typical_saving && (
                  <span className="text-emerald-400">
                    Save {formatCurrency(item.typical_saving)}/yr
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}
