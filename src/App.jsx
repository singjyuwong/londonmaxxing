import { useEffect, useRef, useState } from "react";
import {
  Thermometer,
  ArrowRight,
  ChevronLeft,
  Wallet,
  Receipt,
  Flame,
  Droplet,
  Lightbulb,
  Leaf,
  MapPin,
} from "lucide-react";
import InsightBox from "./InsightBox.jsx";
import {
  fetchCertificate,
  formatAddress,
  formatCertificateAddress,
  formatCurrency,
  searchByPostcode,
} from "./api/epc";
import { computeBill } from "./bills";

const WEEKDAY_OPTIONS = [
  { value: "home", label: "Full time at home" },
  { value: "hybrid", label: "Hybrid" },
  { value: "away", label: "Mostly away from home" },
];
const HEATING_FUEL_OPTIONS = [
  { value: "gas", label: "Gas" },
  { value: "electricity", label: "Electricity" },
];
const HEATING_SCOPE_OPTIONS = [
  { value: "whole", label: "Whole home" },
  { value: "rooms", label: "Just the rooms I use" },
];
const TEMP_TIERS = [
  { key: "cool", label: "Cool", range: "< 18°C" },
  { key: "average", label: "Average", range: "19–22°C" },
  { key: "warm", label: "Warm", range: "22–24°C" },
];
const SHOWER_TIERS = [
  { key: "few", label: "Few", range: "< 4 / week" },
  { key: "average", label: "Average", range: "5–7 / week" },
  { key: "frequent", label: "Frequent", range: "7+ / week" },
];
const RECENT_POSTCODES_KEY = 'recentPostcodes';
const MAX_RECENT_POSTCODES = 5;

function loadRecentPostcodes() {
  try {
    const raw = localStorage.getItem(RECENT_POSTCODES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecentPostcode(postcode) {
  try {
    const existing = loadRecentPostcodes().filter((p) => p !== postcode);
    const updated = [postcode, ...existing].slice(0, MAX_RECENT_POSTCODES);
    localStorage.setItem(RECENT_POSTCODES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return loadRecentPostcodes();
  }
}

const LOADING_MESSAGES = [
  "Fetching your energy certificate…",
  "Working out your personalized heating cost…",
  "Working out your hot water and lighting cost…",
  "Finalizing your bill estimate…",
];

// Maps the on-screen questionnaire answers to the BillFactors shape expected
// by computeBill (src/bills.ts) — that's where the actual estimation logic lives.
function toBillFactors({
  numPeople,
  weekdayLocation,
  heatingFuel,
  tempTier,
  heatingScope,
  showerTier,
}) {
  const occupants = numPeople >= 3 ? "3+" : numPeople;
  const presence = { home: "wfh", hybrid: "hybrid", away: "office" }[
    weekdayLocation
  ];
  const roomsHeated = heatingScope === "rooms" ? "rooms_i_use" : "whole_house";
  const showerFrequency =
    SHOWER_TIERS[showerTier].key === "frequent"
      ? "many"
      : SHOWER_TIERS[showerTier].key;

  return {
    heatingFuelType: heatingFuel,
    occupants,
    presence,
    temperaturePreference: TEMP_TIERS[tempTier].key,
    roomsHeated,
    showerFrequency,
  };
}

function EnergyBand({ band }) {
  return (
    <span className="pill-dark text-sm font-bold w-9 h-9 rounded-lg flex items-center justify-center">
      {band ?? "?"}
    </span>
  );
}

export default function App() {
  const [screen, setScreen] = useState("screen-1");
  const [postcode, setPostcode] = useState("");
  const [addressOptions, setAddressOptions] = useState([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [recentPostcodes, setRecentPostcodes] = useState(loadRecentPostcodes);
  const [showPostcodeHistory, setShowPostcodeHistory] = useState(false);
  const [certificate, setCertificate] = useState(null);
  const [certificateLoading, setCertificateLoading] = useState(false);
  const [certificateError, setCertificateError] = useState(null);
  const [numPeople, setNumPeople] = useState(2);
  const [weekdayLocation, setWeekdayLocation] = useState("hybrid");
  const [heatingFuel, setHeatingFuel] = useState("gas");
  const [tempTier, setTempTier] = useState(1);
  const [heatingScope, setHeatingScope] = useState(null);
  const [showerTier, setShowerTier] = useState(1);
  const [loadingStep, setLoadingStep] = useState(0);
  const [billBreakdown, setBillBreakdown] = useState(null);
  const [billFactors, setBillFactors] = useState(null);
  const analysisTimer = useRef(null);
  const poweredByRef = useRef(null);

  useEffect(() => {
    const trimmed = postcode.trim();
    if (trimmed.length < 5 || selectedProperty) {
      setAddressOptions([]);
      return;
    }

    let cancelled = false;
    setAddressLoading(true);
    setAddressError(null);

    const timeout = setTimeout(async () => {
      try {
        const data = await searchByPostcode(trimmed);
        if (cancelled) return;
        const sorted = [...data].sort(
          (a, b) => new Date(b.registrationDate) - new Date(a.registrationDate),
        );
        setAddressOptions(sorted);
      } catch (err) {
        if (cancelled) return;
        setAddressOptions([]);
        setAddressError(
          err.message || "Something went wrong looking up that postcode.",
        );
      } finally {
        if (!cancelled) setAddressLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [postcode, selectedProperty]);

  async function selectAddress(property) {
    setSelectedProperty(property);
    setAddressOptions([]);
    setCertificate(null);
    setCertificateError(null);
    setCertificateLoading(true);

    const trimmed = postcode.trim();
    if (trimmed) setRecentPostcodes(saveRecentPostcode(trimmed));

    try {
      const data = await fetchCertificate(property.certificateNumber);
      setCertificate(data);
    } catch (err) {
      setCertificateError(err.message || "Failed to load certificate data.");
    } finally {
      setCertificateLoading(false);
    }
  }

  function changeAddress() {
    setSelectedProperty(null);
    setCertificate(null);
    setCertificateError(null);
    setBillBreakdown(null);
  }

  function startAnalysis() {
    setScreen("screen-3");
    setLoadingStep(0);

    const factors = toBillFactors({
      numPeople,
      weekdayLocation,
      heatingFuel,
      tempTier,
      heatingScope,
      showerTier,
    });
    const breakdown = computeBill({
      heatingCostCurrent: certificate.heating_cost_current?.value ?? 0,
      hotWaterCostCurrent: certificate.hot_water_cost_current?.value ?? 0,
      lightingCostCurrent: certificate.lighting_cost_current?.value ?? 0,
      factors,
    });
    setBillBreakdown(breakdown);
    setBillFactors(factors);

    let step = 0;
    analysisTimer.current = setInterval(() => {
      step++;
      if (step < LOADING_MESSAGES.length) {
        setLoadingStep(step);
      } else {
        clearInterval(analysisTimer.current);
        setScreen("screen-4");
      }
    }, 900);
  }

  function backToQuestions() {
    clearInterval(analysisTimer.current);
    setScreen("screen-2");
  }

  const improvements = certificate?.suggested_improvements ?? [];
  const costs = certificate
    ? [
        {
          key: "heating",
          label: "Heating Cost",
          icon: Flame,
          current: certificate.heating_cost_current,
          potential: certificate.heating_cost_potential,
        },
        {
          key: "hotWater",
          label: "Hot Water Cost",
          icon: Droplet,
          current: certificate.hot_water_cost_current,
          potential: certificate.hot_water_cost_potential,
        },
        {
          key: "lighting",
          label: "Lighting Cost",
          icon: Lightbulb,
          current: certificate.lighting_cost_current,
          potential: certificate.lighting_cost_potential,
        },
      ]
    : [];
  const fabric = certificate
    ? [
        ...(certificate.walls ?? []).map((w) => ({
          label: "Walls",
          value: w.description,
        })),
        ...(certificate.roofs ?? []).map((r) => ({
          label: "Roof",
          value: r.description,
        })),
        ...(certificate.floors ?? []).map((f) => ({
          label: "Floors",
          value: f.description,
        })),
        ...(certificate.main_heating ?? []).map((m) => ({
          label: "Main heating",
          value: m.description,
        })),
        ...(certificate.main_heating_controls ?? []).map((m) => ({
          label: "Main heating controls",
          value: m.description,
        })),
      ]
    : [];

  return (
    <>
      <nav className="top-nav">
        <span className="top-nav-brand">calrion</span>
      </nav>
      <div className="py-6 px-24">
      <div className="app-shell">
        {screen === 'screen-1' && (
          <section className="fade-in relative">
            {/* Background hero image, enlarged, sits behind the text */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
              <div
                className="absolute inset-0 bg-contain bg-right bg-no-repeat"
                style={{ backgroundImage: 'url(/hero-building.png)', transform: 'scale(1.08)' }}
              />
            </div>
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
                        setPostcode(e.target.value.toUpperCase());
                        setSelectedProperty(null);
                      }}
                      onFocus={() => setShowPostcodeHistory(true)}
                      onBlur={() => setTimeout(() => setShowPostcodeHistory(false), 150)}
                      className="w-full border-none rounded-xl px-2 py-3 text-slate-800 text-sm focus:outline-none"
                      autoComplete="postal-code"
                    />
                  </div>

                  {addressLoading && (
                    <p className="mt-2 text-xs text-slate-400">Looking up addresses…</p>
                  )}
                  {addressError && (
                    <p className="mt-2 text-xs text-red-500">{addressError}</p>
                  )}

                  {showPostcodeHistory && addressOptions.length === 0 && !selectedProperty && recentPostcodes.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-ink rounded-2xl p-2 shadow-xl z-20">
                      <p className="text-xs text-slate-400 px-2 py-1">Recently searched</p>
                      <div className="flex flex-col gap-1">
                        {recentPostcodes.map((p) => (
                          <button
                            key={p}
                            onClick={() => {
                              setPostcode(p);
                              setSelectedProperty(null);
                              setShowPostcodeHistory(false);
                            }}
                            className="text-left px-3 py-2.5 rounded-xl text-sm font-medium transition hover:bg-slate-100"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {addressOptions.length > 0 && !selectedProperty && (
                    <div className="addr-scroll absolute top-full left-0 right-0 mt-2 bg-white border-2 border-ink rounded-2xl p-2 shadow-xl z-20 max-h-60 overflow-y-auto">
                      <p className="text-xs text-slate-400 px-2 py-1">Select your address</p>
                      <div className="flex flex-col gap-1">
                        {addressOptions.map((property) => (
                          <button
                            key={property.certificateNumber}
                            onClick={() => selectAddress(property)}
                            className="text-left px-3 py-2.5 rounded-xl text-sm font-medium transition hover:bg-slate-100"
                          >
                            {formatAddress(property)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {selectedProperty && (
                    <div className="flex items-center gap-2 mt-3 text-sm">
                      <span className="text-slate-500">
                        Selected:{" "}
                        <span className="font-semibold text-ink">
                          {formatAddress(selectedProperty)}
                        </span>
                      </span>
                      <button
                        onClick={changeAddress}
                        className="text-orange-accent text-xs font-semibold hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  )}

                  {certificateError && (
                    <p className="mt-3 text-sm text-red-500">
                      {certificateError}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-4 flex-wrap">
                    <button
                      onClick={() => certificate && setScreen("screen-2")}
                      disabled={!certificate || certificateLoading}
                      className={
                        "pill-dark font-semibold px-8 py-3.5 transition inline-flex items-center gap-2 w-max " +
                        (certificate && !certificateLoading
                          ? "hover:opacity-90"
                          : "opacity-40 cursor-not-allowed")
                      }
                    >
                      {certificateLoading ? (
                        "Loading certificate…"
                      ) : (
                        <>
                          Analyze This Home <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                    <button
                      onClick={() =>
                        poweredByRef.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        })
                      }
                      className="font-semibold px-8 py-3.5 rounded-full border-2 border-ink text-ink hover:bg-ink hover:text-white transition inline-flex items-center gap-2 w-max"
                    >
                      See How It Works
                    </button>
                  </div>
                  <div ref={poweredByRef} />
                </div>

                {/* RIGHT: spacer, image lives in the section background */}
                <div className="min-h-[75vh]" />
              </div>
            </section>
          )}

          {screen === "screen-2" && certificate && (
            <section className="fade-in">
              <div className="py-10">
                <button
                  onClick={() => setScreen("screen-1")}
                  className="text-slate-400 text-sm flex items-center gap-1 mb-4 hover:text-slate-600"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>

                <div className="grid md:grid-cols-2 gap-[60px] items-start">
                {/* LEFT: certificate summary + CTA */}
                <div>
                <h2 className="text-2xl font-black text-ink tracking-tight mb-1">
                  HERE'S WHAT WE FOUND
                </h2>
                <p className="text-slate-500 text-sm mb-6">
                  Auto-fetched from the EPC Register
                </p>

                <div className="border-2 border-[#3D2418] rounded-2xl p-5 mb-6 bg-[#FDF8F2]">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="font-bold text-ink">
                        {formatCertificateAddress(certificate)}
                      </div>
                      <div className="text-xs text-slate-400">
                        {certificate.dwelling_type}
                        {certificate.total_floor_area
                          ? ` · ${certificate.total_floor_area} m²`
                          : ""}
                        {certificate.registration_date
                          ? ` · Registered ${certificate.registration_date}`
                          : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <div className="flex flex-col items-center">
                        <EnergyBand
                          band={certificate.current_energy_efficiency_band}
                        />
                        <span className="text-[10px] text-slate-400 mt-1 whitespace-nowrap">
                          Current {certificate.energy_rating_current}/100
                        </span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                      <div className="flex flex-col items-center">
                        <EnergyBand
                          band={certificate.potential_energy_efficiency_band}
                        />
                        <span className="text-[10px] text-slate-400 mt-1 whitespace-nowrap">
                          Potential {certificate.energy_rating_potential}/100
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3 text-sm mb-4">
                    {costs.map((c) => (
                      <div key={c.key} className="border border-[#FD4604]/40 rounded-lg p-3">
                        <div className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                          <c.icon className="w-3 h-3" />
                          {c.label}
                        </div>
                        <div className="font-medium">
                          {formatCurrency(c.current)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {c.potential
                            ? `Could be ${formatCurrency(c.potential)}`
                            : ""}
                        </div>
                      </div>
                    ))}
                    <div className="border border-[#FD4604]/40 rounded-lg p-3">
                      <div className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                        <Leaf className="w-3 h-3" />
                        CO₂ Emissions
                      </div>
                      <div className="font-medium">
                        {certificate.co2_emissions_current?.value != null
                          ? `${certificate.co2_emissions_current.value} ${certificate.co2_emissions_current.quantity ?? "tonnes/year"}`
                          : "—"}
                      </div>
                    </div>
                  </div>

                  {fabric.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                      {fabric.map((f, i) => (
                        <div
                          key={`${f.label}-${i}`}
                          className="border border-slate-200 rounded-lg p-3"
                        >
                          <div className="text-slate-400 text-xs mb-1">
                            {f.label}
                          </div>
                          <div className="font-medium">{f.value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-sm text-slate-600 mb-4 space-y-1">
                    {certificate.lighting?.description && (
                      <div>
                        <span className="font-medium text-ink">Lighting:</span>{" "}
                        {certificate.lighting.description}
                      </div>
                    )}
                    {certificate.hot_water?.description && (
                      <div>
                        <span className="font-medium text-ink">Hot water:</span>{" "}
                        {certificate.hot_water.description}
                      </div>
                    )}
                  </div>

                  {improvements.length > 0 && (
                    <>
                      <div className="text-xs font-semibold text-slate-400 mb-2">
                        SUGGESTED IMPROVEMENTS
                      </div>
                      <div className="space-y-2">
                        {improvements.map((imp) => (
                          <div
                            key={imp.sequence}
                            className="border-2 border-slate-100 rounded-xl p-3 flex items-center justify-between gap-3 text-sm"
                          >
                            <div>
                              <span className="font-medium text-ink">
                                {imp.sequence}. {imp.improvement_type}
                              </span>
                              {imp.indicative_cost && (
                                <span className="text-slate-400 text-xs">
                                  {" "}
                                  ({imp.indicative_cost})
                                </span>
                              )}
                            </div>
                            {imp.typical_saving && (
                              <span className="text-teal-accent font-semibold text-xs whitespace-nowrap">
                                Save {formatCurrency(imp.typical_saving)}/yr
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={startAnalysis}
                  className="pill-dark font-semibold px-10 py-3.5 hover:opacity-90 transition"
                >
                  See My Estimate
                </button>
                </div>

                {/* RIGHT: questions list */}
                <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-5 bg-orange-accent rounded-full" />
                  <h3 className="font-bold text-sm text-ink">
                    Q1 · HOW MANY PEOPLE LIVE HERE?
                  </h3>
                  <span className="text-[10px] font-semibold text-orange-accent">
                    REQUIRED
                  </span>
                </div>
                <div className="border-2 border-[#3D2418] rounded-2xl p-5 mb-6 bg-[#FDF8F2]">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={numPeople}
                    onChange={(e) =>
                      setNumPeople(Math.max(1, Number(e.target.value)))
                    }
                    className="w-24 border-2 border-slate-200 rounded-xl px-4 py-2 text-lg font-bold text-ink focus:outline-none focus:border-orange-accent"
                  />
                  <p className="text-xs text-slate-400 mt-3">
                    Household size affects how much heat and hot water you'll
                    typically use.
                  </p>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-5 bg-orange-accent rounded-full" />
                  <h3 className="font-bold text-sm text-ink">
                    Q2 · WHERE ARE YOU ON WEEKDAYS?
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-400">
                    OPTIONAL
                  </span>
                </div>
                <div className="border-2 border-[#3D2418] rounded-2xl p-5 mb-6 bg-[#FDF8F2]">
                  <div className="grid grid-cols-3 gap-2">
                    {WEEKDAY_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        onClick={() => setWeekdayLocation(o.value)}
                        className={
                          "px-3 py-3 rounded-xl border-2 text-sm text-center font-medium " +
                          (weekdayLocation === o.value
                            ? "bg-orange-accent text-white border-orange-accent"
                            : "border-slate-200")
                        }
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-3">
                    Occupancy pattern affects when your home needs to be heated.
                  </p>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-5 bg-orange-accent rounded-full" />
                  <h3 className="font-bold text-sm text-ink">
                    Q3 · GAS / ELECTRICITY FOR HEATING?
                  </h3>
                  <span className="text-[10px] font-semibold text-orange-accent">
                    REQUIRED
                  </span>
                </div>
                <div className="border-2 border-[#3D2418] rounded-2xl p-5 mb-6 bg-[#FDF8F2]">
                  <div className="grid grid-cols-2 gap-2">
                    {HEATING_FUEL_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        onClick={() => setHeatingFuel(o.value)}
                        className={
                          "px-3 py-3 rounded-xl border-2 text-sm text-center font-medium " +
                          (heatingFuel === o.value
                            ? "bg-orange-accent text-white border-orange-accent"
                            : "border-slate-200")
                        }
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-3">
                    Fuel type changes the unit cost we use to estimate your
                    heating bill.
                  </p>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-5 bg-orange-accent rounded-full" />
                  <h3 className="font-bold text-sm text-ink">
                    Q4 · WHAT'S YOUR COMFORTABLE TEMPERATURE?
                  </h3>
                  <span className="text-[10px] font-semibold text-orange-accent">
                    REQUIRED
                  </span>
                </div>
                <div className="border-2 border-[#3D2418] rounded-2xl p-5 mb-6 bg-[#FDF8F2]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-400">16°C</span>
                    <span className="text-2xl font-black text-orange-accent">
                      {TEMP_TIERS[tempTier].label.toUpperCase()}
                      <span className="text-sm text-slate-400 font-medium">
                        {" "}
                        ({TEMP_TIERS[tempTier].range})
                      </span>
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
                  <p className="text-xs text-slate-400 mt-3">
                    This is the temperature band we'll use to estimate your
                    comfort cost.
                  </p>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-5 bg-orange-accent rounded-full" />
                  <h3 className="font-bold text-sm text-ink">
                    Q5 · DO YOU HEAT THE WHOLE HOME OR JUST THE ROOMS YOU USE?
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-400">
                    OPTIONAL
                  </span>
                </div>
                <div className="border-2 border-[#3D2418] rounded-2xl p-5 mb-6 bg-[#FDF8F2]">
                  <div className="grid grid-cols-2 gap-2">
                    {HEATING_SCOPE_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        onClick={() =>
                          setHeatingScope(
                            heatingScope === o.value ? null : o.value,
                          )
                        }
                        className={
                          "px-3 py-3 rounded-xl border-2 text-sm text-center font-medium " +
                          (heatingScope === o.value
                            ? "bg-orange-accent text-white border-orange-accent"
                            : "border-slate-200")
                        }
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-3">
                    Heating pattern affects how much of the home's floor area we
                    factor into your bill.
                  </p>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-5 bg-orange-accent rounded-full" />
                  <h3 className="font-bold text-sm text-ink">
                    Q6 · HOW MANY DAYS A WEEK DO YOU SHOWER AT HOME?
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-400">
                    OPTIONAL
                  </span>
                </div>
                <div className="border-2 border-[#3D2418] rounded-2xl p-5 mb-6 bg-[#FDF8F2]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-400">0</span>
                    <span className="text-2xl font-black text-orange-accent">
                      {SHOWER_TIERS[showerTier].label.toUpperCase()}
                      <span className="text-sm text-slate-400 font-medium">
                        {" "}
                        ({SHOWER_TIERS[showerTier].range})
                      </span>
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
                  <p className="text-xs text-slate-400 mt-3">
                    Hot water use affects your total annual bills estimate.
                  </p>
                </div>
                </div>
                </div>
              </div>
            </section>
          )}

          {screen === "screen-3" && (
            <section className="fade-in">
              <div className="pt-10 pb-32 text-center">
                <button
                  onClick={backToQuestions}
                  className="text-slate-400 text-sm flex items-center gap-1 mb-16 hover:text-slate-600"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <div className="w-16 h-16 mx-auto mb-6 rounded-full border-4 border-orange-accent border-t-transparent animate-spin" />
                <div className="font-bold text-ink mb-2">
                  {LOADING_MESSAGES[loadingStep]}
                </div>
                <div className="text-slate-400 text-sm mb-6">
                  Usually takes a few seconds
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="progress-bar-inner bg-orange-accent h-2 rounded-full"
                    style={{ width: `${15 + loadingStep * 28}%` }}
                  />
                </div>
              </div>
            </section>
          )}

          {screen === "screen-4" && certificate && billBreakdown && (
            <section className="fade-in">
              <div className="py-10">
                <button
                  onClick={backToQuestions}
                  className="text-slate-400 text-sm flex items-center gap-1 mb-4 hover:text-slate-600"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-2xl font-black text-ink tracking-tight">
                    {formatCertificateAddress(certificate)
                      .split(",")[0]
                      .toUpperCase()}{" "}
                    — BILL ESTIMATE
                  </h2>
                  <span className="pill-dark text-xs font-semibold px-2.5 py-1 shrink-0 ml-3">
                    EPC {certificate.current_energy_efficiency_band ?? "?"}
                  </span>
                </div>
                <p className="text-slate-400 text-xs mb-6">
                  Based on your EPC certificate, personalized using your answers
                  above.
                </p>

                <div className="grid md:grid-cols-5 gap-10 items-start">
                  <div className="md:col-span-3">
                    <h3 className="font-bold text-ink mb-3 flex items-center gap-2">
                      <Thermometer className="w-4 h-4 text-orange-accent" />
                      YOUR COMFORT SETTINGS
                    </h3>
                    <div className="border-2 border-[#3D2418] rounded-2xl p-5 mb-8 bg-[#FDF8F2]">
                      <div className="text-sm text-slate-600">
                        Keeping this home at your comfortable{" "}
                        <span className="font-bold text-ink">
                          {TEMP_TIERS[tempTier].label.toLowerCase()}
                        </span>{" "}
                        temperature (
                        <span className="font-bold text-ink">
                          {TEMP_TIERS[tempTier].range}
                        </span>
                        ), heating{" "}
                        <span className="font-bold text-ink">
                          {heatingScope === "rooms"
                            ? "just the rooms you use"
                            : "the whole home"}
                        </span>
                        , factors into the estimate below.
                      </div>
                    </div>

                    <h3 className="font-bold text-ink mb-3 flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-orange-accent" />
                      PERSONALIZED BILL BREAKDOWN
                    </h3>
                    <div className="border-2 border-[#3D2418] rounded-2xl p-5 mb-6 bg-[#FDF8F2] space-y-2">
                      {[
                        {
                          label: "Heating",
                          current: certificate.heating_cost_current?.value ?? 0,
                          estimated: billBreakdown.heating,
                        },
                        {
                          label: "Hot water",
                          current: certificate.hot_water_cost_current?.value ?? 0,
                          estimated: billBreakdown.hotWater,
                        },
                        {
                          label: "Lighting",
                          current: certificate.lighting_cost_current?.value ?? 0,
                          estimated: billBreakdown.lighting,
                        },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between border border-slate-200 rounded-lg px-4 py-3"
                        >
                          <span className="text-sm text-slate-600">
                            {row.label}
                          </span>
                          <span className="text-sm text-slate-400">
                            £{row.current.toLocaleString("en-GB")}{" "}
                            <span className="mx-1">→</span>
                            <span className="font-semibold text-ink">
                              £{Math.round(row.estimated).toLocaleString("en-GB")}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <h3 className="font-bold text-ink mb-3 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-orange-accent" />
                      TOTAL ANNUAL BILLS ESTIMATE
                    </h3>
                    <div className="border-2 border-[#3D2418] rounded-2xl p-5 bg-[#FDF8F2]">
                      <div className="text-3xl font-black text-ink">
                        £{Math.round(billBreakdown.total).toLocaleString("en-GB")}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Personalized to how you actually use this home
                      </div>
                    </div>
                  </div>
                </div>

                <InsightBox
                  certificate={certificate}
                  billBreakdown={billBreakdown}
                  factors={billFactors}
                />
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
