import { useMemo, useState } from 'react'
import SunCalc from 'suncalc'
import {
  Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'

type City = {
  key: 'warsaw' | 'dublin'
  name: string
  country: string
  timezone: string
  latitude: number
  longitude: number
  color: string
}

type SunWeek = {
  week: number
  date: Date
  dateLabel: string
  warsawSunrise: number
  warsawSunset: number
  warsawDaylight: number
  dublinSunrise: number
  dublinSunset: number
  dublinDaylight: number
  warsawSunriseDate: Date
  warsawSunsetDate: Date
  dublinSunriseDate: Date
  dublinSunsetDate: Date
}

const CITIES: City[] = [
  { key: 'warsaw', name: 'Warszawa', country: 'Polska', timezone: 'Europe/Warsaw', latitude: 52.2297, longitude: 21.0122, color: '#f4b860' },
  { key: 'dublin', name: 'Dublin', country: 'Irlandia', timezone: 'Europe/Dublin', latitude: 53.3498, longitude: -6.2603, color: '#55c7b4' },
]

const pad = (n: number) => String(n).padStart(2, '0')

function clockHours(date: Date, timezone?: string) {
  let hours: number
  let minutes: number
  if (timezone) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(date)
    hours = Number(parts.find(p => p.type === 'hour')?.value ?? 0)
    minutes = Number(parts.find(p => p.type === 'minute')?.value ?? 0)
  } else {
    hours = date.getUTCHours()
    minutes = date.getUTCMinutes()
  }
  return hours + minutes / 60
}

function formatTime(date: Date, timezone?: string) {
  return new Intl.DateTimeFormat('pl-PL', {
    timeZone: timezone ?? 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: 'short' }).format(date)
}

function durationText(hours: number) {
  const totalMinutes = Math.round(hours * 60)
  return `${Math.floor(totalMinutes / 60)} h ${pad(totalMinutes % 60)} min`
}

function buildYearWeeks(year: number): SunWeek[] {
  // ISO week 1 contains 4 January. Wednesday is used as a representative day.
  const jan4 = new Date(Date.UTC(year, 0, 4, 12))
  const monday = new Date(jan4)
  const day = (jan4.getUTCDay() + 6) % 7
  monday.setUTCDate(jan4.getUTCDate() - day)
  const weeks: SunWeek[] = []

  for (let week = 1; week <= 53; week++) {
    const date = new Date(monday)
    date.setUTCDate(monday.getUTCDate() + (week - 1) * 7 + 2)
    if (date.getUTCFullYear() > year && week > 1) break

    const dayDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12))
    const ws = SunCalc.getTimes(dayDate, CITIES[0].latitude, CITIES[0].longitude)
    const ds = SunCalc.getTimes(dayDate, CITIES[1].latitude, CITIES[1].longitude)
    const wRise = ws.sunrise
    const wSet = ws.sunset
    const dRise = ds.sunrise
    const dSet = ds.sunset
    const daylight = (rise: Date, set: Date) => (set.getTime() - rise.getTime()) / 3600000

    weeks.push({
      week,
      date: dayDate,
      dateLabel: formatDate(dayDate),
      warsawSunrise: clockHours(wRise, CITIES[0].timezone),
      warsawSunset: clockHours(wSet, CITIES[0].timezone),
      warsawDaylight: daylight(wRise, wSet),
      dublinSunrise: clockHours(dRise, CITIES[1].timezone),
      dublinSunset: clockHours(dSet, CITIES[1].timezone),
      dublinDaylight: daylight(dRise, dSet),
      warsawSunriseDate: wRise,
      warsawSunsetDate: wSet,
      dublinSunriseDate: dRise,
      dublinSunsetDate: dSet,
    })
  }
  return weeks
}

function csvEscape(value: string | number) {
  const text = String(value)
  return `"${text.replaceAll('"', '""')}"`
}

export default function App() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [timeMode, setTimeMode] = useState<'local' | 'utc'>('local')
  const [chartMode, setChartMode] = useState<'events' | 'daylight'>('events')
  const weeks = useMemo(() => buildYearWeeks(year), [year])
  const week = weeks[Math.min(selectedWeek - 1, weeks.length - 1)] ?? weeks[0]

  const data = useMemo(() => weeks.map(item => {
    const utc = timeMode === 'utc'
    return {
      ...item,
      weekLabel: `T${item.week}`,
      wRise: utc ? clockHours(item.warsawSunriseDate) : item.warsawSunrise,
      wSet: utc ? clockHours(item.warsawSunsetDate) : item.warsawSunset,
      dRise: utc ? clockHours(item.dublinSunriseDate) : item.dublinSunrise,
      dSet: utc ? clockHours(item.dublinSunsetDate) : item.dublinSunset,
    }
  }), [weeks, timeMode])

  const selected = data.find(item => item.week === week?.week) ?? data[0]
  const utcFormat = (date: Date, timezone: string) => timeMode === 'utc' ? formatTime(date) + ' UTC' : formatTime(date, timezone)

  const downloadCsv = () => {
    const rows = [
      ['Rok', 'Tydzień ISO', 'Data reprezentatywna', 'Warszawa wschód lokalny', 'Warszawa wschód UTC', 'Warszawa zachód lokalny', 'Warszawa zachód UTC', 'Warszawa długość dnia', 'Dublin wschód lokalny', 'Dublin wschód UTC', 'Dublin zachód lokalny', 'Dublin zachód UTC', 'Dublin długość dnia'],
      ...weeks.map(item => [
        year, item.week, item.date.toISOString().slice(0, 10),
        formatTime(item.warsawSunriseDate, CITIES[0].timezone), formatTime(item.warsawSunriseDate),
        formatTime(item.warsawSunsetDate, CITIES[0].timezone), formatTime(item.warsawSunsetDate), durationText(item.warsawDaylight),
        formatTime(item.dublinSunriseDate, CITIES[1].timezone), formatTime(item.dublinSunriseDate),
        formatTime(item.dublinSunsetDate, CITIES[1].timezone), formatTime(item.dublinSunsetDate), durationText(item.dublinDaylight),
      ]),
    ]
    const csv = '\uFEFF' + rows.map(row => row.map(csvEscape).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `sunlight-warsaw-dublin-${year}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const maxDaylight = Math.max(...weeks.flatMap(item => [item.warsawDaylight, item.dublinDaylight]))
  const dayDifference = week ? week.warsawDaylight - week.dublinDaylight : 0

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Sunlight Calendar — strona główna">
          <span className="brand-mark">☼</span>
          <span>SUNLIGHT<span className="brand-light"> / CALENDAR</span></span>
        </a>
        <div className="topbar-note"><span className="live-dot" /> DANE ASTRONOMICZNE · {year}</div>
      </header>

      <section className="hero">
        <div className="eyebrow">DWA MIASTA · JEDEN RYTM SŁOŃCA</div>
        <h1>Każdy tydzień,<br /><span>dwie perspektywy.</span></h1>
        <p className="hero-copy">Porównaj wschody, zachody i długość dnia w Warszawie oraz Dublinie. Zobacz, jak światło zmienia się w ciągu roku — w czasie lokalnym lub UTC.</p>
        <div className="city-chips">
          {CITIES.map(city => (
            <div className="city-chip" key={city.key}>
              <span className="city-dot" style={{ background: city.color }} />
              <span className="city-name">{city.name}</span>
              <span className="city-zone">{city.timezone}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="control-panel">
        <div className="control-group">
          <label htmlFor="year">ROK</label>
          <select id="year" value={year} onChange={event => { setYear(Number(event.target.value)); setSelectedWeek(1) }}>
            {Array.from({ length: 11 }, (_, i) => currentYear - 5 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="control-group week-control">
          <label htmlFor="week">TYDZIEŃ ROKU</label>
          <div className="week-picker">
            <button aria-label="Poprzedni tydzień" onClick={() => setSelectedWeek(v => Math.max(1, v - 1))} disabled={selectedWeek <= 1}>←</button>
            <select id="week" value={week?.week ?? 1} onChange={event => setSelectedWeek(Number(event.target.value))}>
              {weeks.map(item => <option key={item.week} value={item.week}>Tydzień {item.week} · {item.dateLabel}</option>)}
            </select>
            <button aria-label="Następny tydzień" onClick={() => setSelectedWeek(v => Math.min(weeks.length, v + 1))} disabled={selectedWeek >= weeks.length}>→</button>
          </div>
        </div>
        <div className="control-group time-control">
          <label>CZAS NA WYKRESACH</label>
          <div className="segmented" role="group" aria-label="Format czasu">
            <button className={timeMode === 'local' ? 'active' : ''} onClick={() => setTimeMode('local')}>Lokalny</button>
            <button className={timeMode === 'utc' ? 'active' : ''} onClick={() => setTimeMode('utc')}>UTC</button>
          </div>
        </div>
        <button className="export-button" onClick={downloadCsv}><span>↓</span> Eksport CSV</button>
      </section>

      <section className="summary-grid" aria-label="Podsumowanie wybranego tygodnia">
        <article className="summary-card">
          <div className="summary-heading"><span className="city-dot" style={{ background: CITIES[0].color }} /> WARSZAWA <span className="card-flag">PL</span></div>
          <div className="event-row">
            <div><span className="event-label">↗ Wschód słońca</span><strong>{utcFormat(week.warsawSunriseDate, CITIES[0].timezone)}</strong></div>
            <div><span className="event-label">↘ Zachód słońca</span><strong>{utcFormat(week.warsawSunsetDate, CITIES[0].timezone)}</strong></div>
          </div>
          <div className="daylight-footer"><span>Długość dnia</span><strong>{durationText(week.warsawDaylight)}</strong></div>
        </article>
        <article className="summary-card">
          <div className="summary-heading"><span className="city-dot" style={{ background: CITIES[1].color }} /> DUBLIN <span className="card-flag">IE</span></div>
          <div className="event-row">
            <div><span className="event-label">↗ Wschód słońca</span><strong>{utcFormat(week.dublinSunriseDate, CITIES[1].timezone)}</strong></div>
            <div><span className="event-label">↘ Zachód słońca</span><strong>{utcFormat(week.dublinSunsetDate, CITIES[1].timezone)}</strong></div>
          </div>
          <div className="daylight-footer"><span>Długość dnia</span><strong>{durationText(week.dublinDaylight)}</strong></div>
        </article>
        <article className="difference-card">
          <div className="summary-heading">RÓŻNICA DŁUGOŚCI DNIA</div>
          <div className="difference-value">{Math.abs(Math.round(dayDifference * 60))} <span>min</span></div>
          <p>{Math.abs(dayDifference) < 0.01 ? 'Dzień ma niemal tę samą długość w obu miastach.' : `${dayDifference > 0 ? 'Warszawa' : 'Dublin'} ma dłuższy dzień.`}</p>
          <div className="difference-bar"><span style={{ width: `${Math.min(100, Math.abs(dayDifference) / maxDaylight * 100 * 4)}%` }} /></div>
          <small>{week.date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })} · środa</small>
        </article>
      </section>

      <section className="chart-section">
        <div className="section-heading">
          <div><div className="eyebrow">W RYTMIE ROKU</div><h2>Godziny światła</h2></div>
          <div className="chart-toggle">
            <button className={chartMode === 'events' ? 'active' : ''} onClick={() => setChartMode('events')}>Wschód i zachód</button>
            <button className={chartMode === 'daylight' ? 'active' : ''} onClick={() => setChartMode('daylight')}>Długość dnia</button>
          </div>
        </div>
        <p className="section-copy">{chartMode === 'events' ? `Godziny wschodu i zachodu słońca w każdym tygodniu ${year}. Zaznaczony jest tydzień ${week.week}.` : `Zmiana długości dnia w obu miastach w ciągu ${year} roku.`}</p>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={330}>
            {chartMode === 'events' ? (
              <LineChart data={data} margin={{ top: 12, right: 12, bottom: 2, left: 0 }}>
                <CartesianGrid stroke="#263442" strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="weekLabel" tick={{ fill: '#81909f', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#344250' }} interval={3} />
                <YAxis domain={[0, 24]} ticks={[0, 4, 8, 12, 16, 20, 24]} tickFormatter={v => `${pad(v)}:00`} tick={{ fill: '#81909f', fontSize: 11 }} tickLine={false} axisLine={false} width={54} />
                <Tooltip content={<EventsTooltip timeMode={timeMode} year={year} />} />
                <Legend wrapperStyle={{ color: '#c3ccd5', fontSize: 12, paddingTop: 14 }} />
                <Line name="Warszawa · wschód" dataKey="wRise" stroke="#f4b860" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line name="Warszawa · zachód" dataKey="wSet" stroke="#f4b860" strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 4 }} />
                <Line name="Dublin · wschód" dataKey="dRise" stroke="#55c7b4" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line name="Dublin · zachód" dataKey="dSet" stroke="#55c7b4" strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            ) : (
              <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 2, left: 0 }}>
                <CartesianGrid stroke="#263442" strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="weekLabel" tick={{ fill: '#81909f', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#344250' }} interval={3} />
                <YAxis domain={[0, 24]} ticks={[0, 4, 8, 12, 16, 20, 24]} tickFormatter={v => `${pad(v)} h`} tick={{ fill: '#81909f', fontSize: 11 }} tickLine={false} axisLine={false} width={54} />
                <Tooltip content={<DaylightTooltip />} />
                <Legend wrapperStyle={{ color: '#c3ccd5', fontSize: 12, paddingTop: 14 }} />
                <Area type="monotone" name="Warszawa" dataKey="warsawDaylight" stroke="#f4b860" fill="#f4b860" fillOpacity={0.12} strokeWidth={2.5} activeDot={{ r: 4 }} />
                <Area type="monotone" name="Dublin" dataKey="dublinDaylight" stroke="#55c7b4" fill="#55c7b4" fillOpacity={0.12} strokeWidth={2.5} activeDot={{ r: 4 }} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
        <div className="chart-footnote"><span className="selected-marker" /> Tydzień {week.week} wybrany powyżej · {timeMode === 'local' ? 'godziny lokalne miast' : 'czas uniwersalny UTC'}</div>
      </section>

      <section className="table-section">
        <div className="section-heading table-heading">
          <div><div className="eyebrow">DANE DO WGLĄDU</div><h2>Rok w tabeli</h2></div>
          <span className="table-count">{weeks.length} tygodni · {year}</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>TYDZIEŃ / DATA</th><th><span className="table-city warsaw-text">● WARSZAWA</span><br />Wschód / zachód</th><th><span className="table-city dublin-text">● DUBLIN</span><br />Wschód / zachód</th><th>DŁUGOŚĆ DNIA<br />WAW / DUB</th></tr></thead>
            <tbody>
              {weeks.map(item => (
                <tr key={item.week} className={item.week === week.week ? 'selected-row' : ''} onClick={() => setSelectedWeek(item.week)} tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setSelectedWeek(item.week) }}>
                  <td><strong>T{pad(item.week)}</strong><span className="row-date">{item.dateLabel}</span></td>
                  <td><span className="time-pair">{formatTime(item.warsawSunriseDate, CITIES[0].timezone)} <span>→</span> {formatTime(item.warsawSunsetDate, CITIES[0].timezone)}</span><span className="utc-sub">UTC {formatTime(item.warsawSunriseDate)} → {formatTime(item.warsawSunsetDate)}</span></td>
                  <td><span className="time-pair">{formatTime(item.dublinSunriseDate, CITIES[1].timezone)} <span>→</span> {formatTime(item.dublinSunsetDate, CITIES[1].timezone)}</span><span className="utc-sub">UTC {formatTime(item.dublinSunriseDate)} → {formatTime(item.dublinSunsetDate)}</span></td>
                  <td><strong>{durationText(item.warsawDaylight)}</strong><span className="row-date">{durationText(item.dublinDaylight)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-brand">☼ SUNLIGHT / CALENDAR</div>
        <p>Godziny są szacunkami astronomicznymi obliczanymi dla współrzędnych centrów miast, według biblioteki SunCalc. Rzeczywisty widoczny wschód i zachód może różnić się przez ukształtowanie terenu, przeszkody i warunki atmosferyczne.</p>
        <span>MADE FOR CURIOUS MINDS · {year}</span>
      </footer>
    </main>
  )
}

function EventsTooltip({ active, payload, label, timeMode, year }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string; timeMode: 'local' | 'utc'; year: number }) {
  if (!active || !payload?.length) return null
  return <div className="tooltip"><strong>{label}, {year}</strong>{payload.map((item, i) => <div className="tooltip-row" key={i}><span style={{ background: item.color }} />{item.name}<b>{formatChartTime(item.value)}{timeMode === 'utc' ? ' UTC' : ''}</b></div>)}</div>
}

function DaylightTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return <div className="tooltip"><strong>{label}</strong>{payload.map((item, i) => <div className="tooltip-row" key={i}><span style={{ background: item.color }} />{item.name}<b>{durationText(item.value)}</b></div>)}</div>
}

function formatChartTime(hours: number) {
  const minutes = Math.round(hours * 60)
  return `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`
}
