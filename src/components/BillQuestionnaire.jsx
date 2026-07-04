import { useState } from 'react'

const QUESTIONS = [
  {
    key: 'heatingFuelType',
    label: 'What fuel heats your home?',
    options: [
      { value: 'gas', label: 'Gas' },
      { value: 'electricity', label: 'Electricity' },
    ],
  },
  {
    key: 'occupants',
    label: 'How many people live in the property?',
    options: [
      { value: '1', label: '1' },
      { value: '2', label: '2' },
      { value: '3+', label: '3+' },
    ],
  },
  {
    key: 'presence',
    label: 'How much time do you spend at home?',
    options: [
      { value: 'office', label: 'Mostly in the office' },
      { value: 'hybrid', label: 'Hybrid' },
      { value: 'wfh', label: 'Work from home' },
    ],
  },
  {
    key: 'temperaturePreference',
    label: 'What temperature do you prefer?',
    options: [
      { value: 'cool', label: 'Cool' },
      { value: 'average', label: 'Average' },
      { value: 'warm', label: 'Warm' },
    ],
  },
  {
    key: 'roomsHeated',
    label: 'How many rooms do you heat?',
    options: [
      { value: 'whole_house', label: 'The whole house' },
      { value: 'rooms_i_use', label: 'Mainly the rooms I use' },
      { value: 'one_or_two_rooms', label: 'Just one or two rooms' },
    ],
  },
  {
    key: 'showerFrequency',
    label: 'How often do you shower?',
    options: [
      { value: 'few', label: 'A few times a week' },
      { value: 'average', label: 'About once a day' },
      { value: 'many', label: 'More than once a day' },
    ],
  },
]

const DEFAULT_ANSWERS = {
  heatingFuelType: 'gas',
  occupants: '2',
  presence: 'hybrid',
  temperaturePreference: 'average',
  roomsHeated: 'whole_house',
  showerFrequency: 'average',
}

export default function BillQuestionnaire({ onSubmit }) {
  const [answers, setAnswers] = useState(DEFAULT_ANSWERS)

  function handleChange(key, value) {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit({
      ...answers,
      occupants: answers.occupants === '3+' ? '3+' : Number(answers.occupants),
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-black/20"
    >
      <h3 className="text-lg font-semibold text-white">Personalize your bill estimate</h3>
      <p className="mt-1 text-sm text-slate-400">
        Answer these six questions about how you actually use the property.
      </p>

      <div className="mt-6 space-y-5">
        {QUESTIONS.map((question) => (
          <div key={question.key}>
            <label className="block text-sm font-medium text-slate-300">{question.label}</label>
            <select
              value={answers[question.key]}
              onChange={(e) => handleChange(question.key, e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              {question.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <button
        type="submit"
        className="mt-6 w-full rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
      >
        Estimate my bill
      </button>
    </form>
  )
}
