import { useRef, useState } from 'react';
import { Thermometer, ArrowRight, ChevronLeft, Wallet, Receipt, Flame, Droplet, Lightbulb, Leaf, MapPin } from 'lucide-react';
import TerraceRow from './TerraceRow.jsx';

const STREET_NAMES = ['Elm Grove', 'Chestnut Road', 'Victoria Terrace', 'Mill Lane', 'Hayday Road'];

// Mock address lookup — stands in for a real postcode/address API in this prototype.
function generateAddressOptions(postcode) {
  const clean = postcode.trim().toUpperCase();
  if (clean.length < 5) return [];
  const seed = clean.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const street = STREET_NAMES[seed % STREET_NAMES.length];
  const startNumber = (seed % 40) + 1;
  return [0, 2, 4, 6, 8].map((offset) => `${startNumber + offset} ${street}, ${clean}`);
}

// Mock EPC Register data — stands in for a real EPC lookup in this prototype.
const MOCK_EPC = {
  propertyType: 'Mid-terrace house',
  floorArea: 105,
  registered: '2025-09-04',
  currentRating: 'C',
  currentScore: 70,
  potentialRating: 'C',
  potentialScore: 79,
  costs: [
    { key: 'heating', label: 'Heating Cost', icon: Flame, current: 868, potential: 672 },
    { key: 'hotWater', label: 'Hot Water Cost', icon: Droplet, current: 248, potential: 249 },
    { key: 'lighting', label: 'Lighting Cost', icon: Lightbulb, current: 65, potential: 65 },
  ],
  co2Emissions: null,
  fabric: [
    { label: 'Walls', value: 'Solid brick, as built, no insulation (assumed)' },
    { label: 'Roof', value: 'Pitched, 125 mm loft insulation' },
    { label: 'Floors', value: 'Suspended, no insulation (assumed)' },
    { label: 'Main heating', value: 'Boiler and radiators, mains gas' },
    { label: 'Main heating controls', value: 'Programmer and room thermostat' },
  ],
  lightingEfficiency: 'Good lighting efficiency',
  hotWaterSource: 'From main system',
  improvements: [
    { label: 'Internal or external wall insulation', costRange: '£7,500 - £11,000', save: 134 },
    { label: 'Floor insulation', costRange: '£5,000 - £10,000', save: 61 },
    { label: 'Solar water heating', costRange: '£8,000 - £10,000', save: 238 },
  ],
};

const WEEKDAY_OPTIONS = [
  { value: 'home', label: 'Full time at home' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'away', label: 'Mostly away from home' },
];
const HEATING_FUEL_OPTIONS = [
  { value: 'gas', label: 'Gas' },
  { value: 'electricity', label: 'Electricity' },
];
const HEATING_SCOPE_OPTIONS = [
  { value: 'whole', label: 'Whole home' },
  { value: 'rooms', label: 'Just the rooms I use' },
];
const TEMP_TIERS = [
  { key: 'cool', label: 'Cool', range: '< 18°C' },
  { key: 'average', label: 'Average', range: '19–22°C' },
  { key: 'warm', label: 'Warm', range: '22–24°C' },
];
const SHOWER_TIERS = [
  { key: 'few', label: 'Few', range: '< 4 / week' },
  { key: 'average', label: 'Average', range: '5–7 / week' },
  { key: 'frequent', label: 'Frequent', range: '7+ / week' },
];
const LOADING_MESSAGES = [
  'Mapping heat gain and loss room by room…',
  'Comparing orientation against your comfort temperature…',
  'Calculating your Living Room comfort cost…',
  'Finalizing your comfort report…',
];

export default function App() {
  const [screen, setScreen] = useState('screen-1');
  const [postcode, setPostcode] = useState('');
  const [selectedAddress, setSelectedAddress] = useState('');
  const [numPeople, setNumPeople] = useState(2);
  const [weekdayLocation, setWeekdayLocation] = useState('hybrid');
  const [heatingFuel, setHeatingFuel] = useState('gas');
  const [tempTier, setTempTier] = useState(1);
  const [heatingScope, setHeatingScope] = useState(null);
  const [showerTier, setShowerTier] = useState(1);
  const [loadingStep, setLoadingStep] = useState(0);
  const analysisTimer = useRef(null);
  const poweredByRef = useRef(null);
  const addressOptions = generateAddressOptions(postcode);

  function startAnalysis() {
    setScreen('screen-3');
    setLoadingStep(0);
    let step = 0;
    analysisTimer.current = setInterval(() => {
      step++;
      if (step < LOADING_MESSAGES.length) {
        setLoadingStep(step);
      } else {
        clearInterval(analysisTimer.current);
        setScreen('screen-4');
      }
    }, 900);
  }

  function backToQuestions() {
    clearInterval(analysisTimer.current);
    setScreen('screen-2');
  }

  return (
    <>
      <nav className="top-nav">
        <span className="top-nav-brand">calrion</span>
      </nav>
      <div className="max-w-6xl mx-auto py-6 px-4">
      <div className="app-shell">
        {screen === 'screen-1' && (
          <section className="fade-in">
            <div className="grid md:grid-cols-2">
              {/* LEFT */}
              <div className="p-10 md:p-14 flex flex-col justify-center min-h-[75vh] translate-y-[20%]">
                <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight text-ink mb-6 whitespace-nowrap">
                  WATT'S THE <span className="highlight-pill">CATCH?</span>
                </h1>
                <div className="relative max-w-md">
                  <div className="border-2 border-ink rounded-2xl p-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
                    <input
                      type="text"
                      placeholder="Enter a postcode, e.g. SE15 4QN"
                      value={postcode}
                      onChange={(e) => {
                        setPostcode(e.target.value);
                        setSelectedAddress('');
                      }}
                      className="w-full border-none rounded-xl px-2 py-3 text-slate-800 text-sm focus:outline-none"
                    />
                  </div>

                  {addressOptions.length > 0 && !selectedAddress && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-ink rounded-2xl p-2 shadow-xl z-20 max-h-60 overflow-y-auto">
                      <p className="text-xs text-slate-400 px-2 py-1">Select your address</p>
                      <div className="flex flex-col gap-1">
                        {addressOptions.map((addr) => (
                          <button
                            key={addr}
                            onClick={() => setSelectedAddress(addr)}
                            className="text-left px-3 py-2.5 rounded-xl text-sm font-medium transition hover:bg-slate-100"
                          >
                            {addr}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {selectedAddress && (
                  <div className="flex items-center gap-2 mt-3 text-sm">
                    <span className="text-slate-500">Selected: <span className="font-semibold text-ink">{selectedAddress}</span></span>
                    <button onClick={() => setSelectedAddress('')} className="text-orange-accent text-xs font-semibold hover:underline">
                      Change
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-3 mt-4 flex-wrap">
                  <button
                    onClick={() => selectedAddress && setScreen('screen-2')}
                    disabled={!selectedAddress}
                    className={
                      'pill-dark font-semibold px-8 py-3.5 transition inline-flex items-center gap-2 w-max ' +
                      (selectedAddress ? 'hover:opacity-90' : 'opacity-40 cursor-not-allowed')
                    }
                  >
                    Analyze This Home <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => poweredByRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                    className="font-semibold px-8 py-3.5 rounded-full border-2 border-ink text-ink hover:bg-ink hover:text-white transition inline-flex items-center gap-2 w-max"
                  >
                    See How It Works
                  </button>
                </div>
                <div ref={poweredByRef} />
              </div>

              {/* RIGHT: interactive building preview — building graphic goes here (SVG placeholder), hotspots retained */}
              <div className="pl-10 md:pl-14 pt-10 md:pt-14 pr-0 flex flex-col justify-between overflow-hidden">
                <div>
                  <TerraceRow />
                </div>
              </div>
            </div>
          </section>
        )}

        {screen === 'screen-2' && (
          <section className="fade-in">
            <div className="max-w-2xl mx-auto px-6 py-10">
              <button onClick={() => setScreen('screen-1')} className="text-slate-400 text-sm flex items-center gap-1 mb-4 hover:text-slate-600">
                <ChevronLeft className="w-4 h-4" />Back
              </button>
              <h2 className="text-2xl font-black text-ink tracking-tight mb-1">HERE'S WHAT WE FOUND</h2>
              <p className="text-slate-500 text-sm mb-6">Auto-fetched from the listing and EPC Register</p>

              <div className="border-2 border-ink rounded-2xl p-5 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="font-bold text-ink">{selectedAddress || '34 Elm Grove, London SE15'}</div>
                    <div className="text-xs text-slate-400">{MOCK_EPC.propertyType} · {MOCK_EPC.floorArea} m² · Registered {MOCK_EPC.registered}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <div className="flex flex-col items-center">
                      <span className="pill-dark text-sm font-bold w-9 h-9 rounded-lg flex items-center justify-center">{MOCK_EPC.currentRating}</span>
                      <span className="text-[10px] text-slate-400 mt-1 whitespace-nowrap">Current {MOCK_EPC.currentScore}/100</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                    <div className="flex flex-col items-center">
                      <span className="pill-dark text-sm font-bold w-9 h-9 rounded-lg flex items-center justify-center">{MOCK_EPC.potentialRating}</span>
                      <span className="text-[10px] text-slate-400 mt-1 whitespace-nowrap">Potential {MOCK_EPC.potentialScore}/100</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 text-sm mb-4">
                  {MOCK_EPC.costs.map((c) => (
                    <div key={c.key} className="bg-slate-50 rounded-lg p-3">
                      <div className="text-slate-400 text-xs mb-1 flex items-center gap-1"><c.icon className="w-3 h-3" />{c.label}</div>
                      <div className="font-medium">£{c.current}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Could be £{c.potential}</div>
                    </div>
                  ))}
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-slate-400 text-xs mb-1 flex items-center gap-1"><Leaf className="w-3 h-3" />CO₂ Emissions</div>
                    <div className="font-medium">{MOCK_EPC.co2Emissions || '—'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  {MOCK_EPC.fabric.map((f) => (
                    <div key={f.label} className="bg-slate-50 rounded-lg p-3">
                      <div className="text-slate-400 text-xs mb-1">{f.label}</div>
                      <div className="font-medium">{f.value}</div>
                    </div>
                  ))}
                </div>

                <div className="text-sm text-slate-600 mb-4 space-y-1">
                  <div><span className="font-medium text-ink">Lighting:</span> {MOCK_EPC.lightingEfficiency}</div>
                  <div><span className="font-medium text-ink">Hot water:</span> {MOCK_EPC.hotWaterSource}</div>
                </div>

                <div className="text-xs font-semibold text-slate-400 mb-2">SUGGESTED IMPROVEMENTS</div>
                <div className="space-y-2">
                  {MOCK_EPC.improvements.map((imp, i) => (
                    <div key={imp.label} className="border-2 border-slate-100 rounded-xl p-3 flex items-center justify-between gap-3 text-sm">
                      <div>
                        <span className="font-medium text-ink">{i + 1}. {imp.label}</span>
                        <span className="text-slate-400 text-xs"> ({imp.costRange})</span>
                      </div>
                      <span className="text-teal-accent font-semibold text-xs whitespace-nowrap">Save £{imp.save}/yr</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-5 bg-orange-accent rounded-full" />
                <h3 className="font-bold text-sm text-ink">Q1 · HOW MANY PEOPLE LIVE HERE?</h3>
                <span className="text-[10px] font-semibold text-orange-accent">REQUIRED</span>
              </div>
              <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 mb-6">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={numPeople}
                  onChange={(e) => setNumPeople(Math.max(1, Number(e.target.value)))}
                  className="w-24 border-2 border-slate-200 rounded-xl px-4 py-2 text-lg font-bold text-ink focus:outline-none focus:border-orange-accent"
                />
                <p className="text-xs text-slate-400 mt-3">Household size affects how much heat and hot water you'll typically use.</p>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-5 bg-orange-accent rounded-full" />
                <h3 className="font-bold text-sm text-ink">Q2 · WHERE ARE YOU ON WEEKDAYS?</h3>
                <span className="text-[10px] font-semibold text-slate-400">OPTIONAL</span>
              </div>
              <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 mb-6">
                <div className="grid grid-cols-3 gap-2">
                  {WEEKDAY_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setWeekdayLocation(o.value)}
                      className={
                        'px-3 py-3 rounded-xl border-2 text-sm text-center font-medium ' +
                        (weekdayLocation === o.value ? 'bg-orange-accent text-white border-orange-accent' : 'border-slate-200')
                      }
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-3">Occupancy pattern affects when your home needs to be heated.</p>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-5 bg-orange-accent rounded-full" />
                <h3 className="font-bold text-sm text-ink">Q3 · GAS / ELECTRICITY FOR HEATING?</h3>
                <span className="text-[10px] font-semibold text-orange-accent">REQUIRED</span>
              </div>
              <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 mb-6">
                <div className="grid grid-cols-2 gap-2">
                  {HEATING_FUEL_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setHeatingFuel(o.value)}
                      className={
                        'px-3 py-3 rounded-xl border-2 text-sm text-center font-medium ' +
                        (heatingFuel === o.value ? 'bg-orange-accent text-white border-orange-accent' : 'border-slate-200')
                      }
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-3">Fuel type changes the unit cost we use to estimate your heating bill.</p>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-5 bg-orange-accent rounded-full" />
                <h3 className="font-bold text-sm text-ink">Q4 · WHAT'S YOUR COMFORTABLE TEMPERATURE?</h3>
                <span className="text-[10px] font-semibold text-orange-accent">REQUIRED</span>
              </div>
              <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-400">16°C</span>
                  <span className="text-2xl font-black text-orange-accent">
                    {TEMP_TIERS[tempTier].label.toUpperCase()}
                    <span className="text-sm text-slate-400 font-medium"> ({TEMP_TIERS[tempTier].range})</span>
                  </span>
                  <span className="text-xs text-slate-400">24°C</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="1"
                  value={tempTier}
                  onChange={(e) => setTempTier(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-1">
                  {TEMP_TIERS.map((t) => (
                    <span key={t.key}>{t.label.toUpperCase()}</span>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-3">This is the temperature band we'll use to estimate your comfort cost.</p>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-5 bg-orange-accent rounded-full" />
                <h3 className="font-bold text-sm text-ink">Q5 · DO YOU HEAT THE WHOLE HOME OR JUST THE ROOMS YOU USE?</h3>
                <span className="text-[10px] font-semibold text-slate-400">OPTIONAL</span>
              </div>
              <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 mb-6">
                <div className="grid grid-cols-2 gap-2">
                  {HEATING_SCOPE_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setHeatingScope(heatingScope === o.value ? null : o.value)}
                      className={
                        'px-3 py-3 rounded-xl border-2 text-sm text-center font-medium ' +
                        (heatingScope === o.value ? 'bg-orange-accent text-white border-orange-accent' : 'border-slate-200')
                      }
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-3">Heating pattern affects how much of the home's floor area we factor into your bill.</p>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-5 bg-orange-accent rounded-full" />
                <h3 className="font-bold text-sm text-ink">Q6 · HOW MANY DAYS A WEEK DO YOU SHOWER AT HOME?</h3>
                <span className="text-[10px] font-semibold text-slate-400">OPTIONAL</span>
              </div>
              <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-400">0</span>
                  <span className="text-2xl font-black text-orange-accent">
                    {SHOWER_TIERS[showerTier].label.toUpperCase()}
                    <span className="text-sm text-slate-400 font-medium"> ({SHOWER_TIERS[showerTier].range})</span>
                  </span>
                  <span className="text-xs text-slate-400">7+</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="1"
                  value={showerTier}
                  onChange={(e) => setShowerTier(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-1">
                  {SHOWER_TIERS.map((t) => (
                    <span key={t.key}>{t.label.toUpperCase()}</span>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-3">Hot water use affects your total annual bills estimate.</p>
              </div>

              <button onClick={startAnalysis} className="w-full pill-dark font-semibold py-3.5 hover:opacity-90 transition">
                See My Estimate
              </button>
            </div>
          </section>
        )}

        {screen === 'screen-3' && (
          <section className="fade-in">
            <div className="max-w-md mx-auto px-6 pt-10 pb-32 text-center">
              <button onClick={backToQuestions} className="text-slate-400 text-sm flex items-center gap-1 mb-16 hover:text-slate-600">
                <ChevronLeft className="w-4 h-4" />Back
              </button>
              <div className="w-16 h-16 mx-auto mb-6 rounded-full border-4 border-orange-accent border-t-transparent animate-spin" />
              <div className="font-bold text-ink mb-2">{LOADING_MESSAGES[loadingStep]}</div>
              <div className="text-slate-400 text-sm mb-6">Usually takes a few seconds</div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="progress-bar-inner bg-orange-accent h-2 rounded-full"
                  style={{ width: `${15 + loadingStep * 28}%` }}
                />
              </div>
            </div>
          </section>
        )}

        {screen === 'screen-4' && (
          <section className="fade-in">
            <div className="max-w-2xl mx-auto px-6 py-10">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-2xl font-black text-ink tracking-tight">{(selectedAddress || '34 Elm Grove').split(',')[0].toUpperCase()} — ROOM COMFORT REPORT</h2>
                <span className="pill-dark text-xs font-semibold px-2.5 py-1 shrink-0 ml-3">EPC D</span>
              </div>
              <p className="text-slate-400 text-xs mb-6">Based on EPC data + orientation + AI reasoning. Internal heatmap not shown — translated into plain language below.</p>

              <h3 className="font-bold text-ink mb-3 flex items-center gap-2"><Thermometer className="w-4 h-4 text-orange-accent" />ROOM TEMPERATURE EXTREMES</h3>
              <div className="space-y-2 mb-8">
                <div className="border-2 border-orange-accent rounded-xl p-4 flex items-center gap-3">
                  <span className="text-xl">🔥</span>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-ink">Bedroom 3 (Loft)</div>
                    <div className="text-xs text-slate-500">Hottest room in summer — north-facing roof holds heat, limited loft insulation</div>
                  </div>
                </div>
                <div className="border-2 border-teal-accent rounded-xl p-4 flex items-center gap-3">
                  <span className="text-xl">❄️</span>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-ink">Bedroom 2</div>
                    <div className="text-xs text-slate-500">Coldest room in winter — north-facing, least solar gain in the house</div>
                  </div>
                </div>
                <div className="border-2 border-slate-200 rounded-xl p-4 flex items-center gap-3">
                  <span className="text-xl">🙂</span>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-ink">Living Room <span className="text-slate-400 font-normal">— your main space</span></div>
                    <div className="text-xs text-slate-500">Moderate swings — south-facing garden gives useful winter solar gain</div>
                  </div>
                </div>
              </div>

              <h3 className="font-bold text-ink mb-3 flex items-center gap-2"><Wallet className="w-4 h-4 text-orange-accent" />YOUR MAIN LIVING SPACE</h3>
              <div className="border-2 border-ink rounded-2xl p-5 mb-6">
                <div className="text-sm text-slate-600 mb-1">
                  To keep the <span className="font-bold text-ink">Living Room</span> at your comfortable{' '}
                  <span className="font-bold text-ink">{TEMP_TIERS[tempTier].label.toLowerCase()}</span> temperature{' '}
                  (<span className="font-bold text-ink">{TEMP_TIERS[tempTier].range}</span>) year-round, you'll pay approximately
                </div>
                <div className="text-3xl font-black text-orange-accent">£310<span className="text-lg text-slate-400 font-medium"> extra / year</span></div>
              </div>

              <h3 className="font-bold text-ink mb-3 flex items-center gap-2"><Receipt className="w-4 h-4 text-orange-accent" />TOTAL ANNUAL BILLS ESTIMATE</h3>
              <div className="bg-slate-50 rounded-2xl p-5">
                <div className="text-3xl font-black text-ink">£1,850<span className="text-lg text-slate-400 font-medium"> – £2,150</span></div>
                <div className="text-xs text-slate-400 mt-1">Whole-home estimate · range reflects estimation confidence</div>
              </div>
            </div>
          </section>
        )}
      </div>
      </div>
    </>
  );
}
