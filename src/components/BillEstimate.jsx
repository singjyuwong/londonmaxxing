import { formatCurrency } from '../api/epc'

function Row({ label, current, estimated }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-3">
      <span className="text-sm text-slate-300">{label}</span>
      <span className="text-sm text-slate-500">
        {formatCurrency({ value: current })} <span className="mx-1">→</span>
        <span className="font-semibold text-white">{formatCurrency({ value: estimated })}</span>
      </span>
    </div>
  )
}

export default function BillEstimate({ current, breakdown }) {
  return (
    <section className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
      <p className="text-sm font-medium uppercase tracking-wide text-emerald-400">
        Personalized bill estimate
      </p>

      <div className="mt-4 space-y-2">
        <Row label="Heating" current={current.heating} estimated={breakdown.heating} />
        <Row label="Hot water" current={current.hotWater} estimated={breakdown.hotWater} />
        <Row label="Lighting" current={current.lighting} estimated={breakdown.lighting} />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4">
        <span className="text-sm font-medium text-slate-300">Total</span>
        <span className="text-xl font-bold text-white">{formatCurrency({ value: breakdown.total })}</span>
      </div>
    </section>
  )
}
