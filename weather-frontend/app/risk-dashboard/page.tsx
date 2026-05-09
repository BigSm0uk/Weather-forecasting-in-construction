"use client"
import { format } from "date-fns"
import {
  AlertCircle,
  AlertTriangle,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Search,
} from "lucide-react"
import { memo, useCallback, useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"

interface WorkRisk {
  work_id: number
  work_name: string
  status: "low" | "moderate" | "high"
  reasons: string[]
  normative: string | null
}

interface RiskHourData {
  hour: number
  works: WorkRisk[]
}

interface ForecastData {
  hour: number
  temperature: { value: number }
  wind_speed: { value: number }
  precipitation: { value: number }
}

const NO_GROUP_KEY = "__no_group__"
const NO_GROUP_LABEL = "Независящие от погоды"

const STATUS_COLORS: Record<string, string> = {
  low: "bg-emerald-500 hover:bg-emerald-600",
  moderate: "bg-amber-400 hover:bg-amber-500",
  high: "bg-red-500 hover:bg-red-600",
}

function StatusIcon({ status }: { status: string }) {
  if (status === "low")
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
  if (status === "moderate")
    return <AlertTriangle className="h-4 w-4 text-amber-500" />
  if (status === "high") return <AlertCircle className="h-4 w-4 text-red-500" />
  return null
}

const RiskCell = memo(function RiskCell({
  workRisk,
  hour,
}: {
  workRisk: WorkRisk
  hour: number
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "h-10 flex-1 cursor-pointer rounded-sm border border-background/20 transition-colors",
            STATUS_COLORS[workRisk.status] || "bg-gray-200"
          )}
        />
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <StatusIcon status={workRisk.status} />
            <span>
              В {hour}:00 - {workRisk.work_name}
            </span>
          </div>
          <div className="text-sm">
            <span className="mb-1 block text-muted-foreground">Статус:</span>
            {workRisk.status === "low" && (
              <span className="font-medium text-emerald-500">
                Подходит для работ
              </span>
            )}
            {workRisk.status === "moderate" && (
              <span className="font-medium text-amber-500">
                Риск средний (пограничные условия)
              </span>
            )}
            {workRisk.status === "high" && (
              <span className="font-medium text-red-500">Работы запрещены</span>
            )}
          </div>
          {workRisk.reasons.length > 0 && (
            <div className="text-sm">
              <span className="mb-1 block text-muted-foreground">
                Причины/Факторы:
              </span>
              <ul className="list-disc space-y-1 pl-4">
                {workRisk.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {workRisk.normative && (
            <div className="mt-2 border-t pt-2 text-sm">
              <span className="text-muted-foreground">Норматив: </span>
              {workRisk.normative}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
})

const WorkRow = memo(function WorkRow({
  work,
  riskData,
}: {
  work: WorkRisk
  riskData: RiskHourData[]
}) {
  const riskByHour = useMemo(() => {
    const map = new Map<number, WorkRisk>()
    for (const hourData of riskData) {
      const wr = hourData.works.find((w) => w.work_id === work.work_id)
      if (wr) map.set(hourData.hour, wr)
    }
    return map
  }, [riskData, work.work_id])

  return (
    <div className="flex items-stretch gap-4">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-44 shrink-0 truncate text-sm font-medium">
            {work.work_name}
          </div>
        </TooltipTrigger>
        <TooltipContent>{work.work_name}</TooltipContent>
      </Tooltip>
      <div className="flex flex-1 gap-1">
        {riskData.map((hourData) => {
          const workRisk = riskByHour.get(hourData.hour)
          if (!workRisk) {
            return (
              <div
                key={hourData.hour}
                className="h-10 flex-1 rounded-sm bg-muted"
              />
            )
          }
          return (
            <RiskCell
              key={hourData.hour}
              workRisk={workRisk}
              hour={hourData.hour}
            />
          )
        })}
      </div>
    </div>
  )
})

const WeatherRows = memo(function WeatherRows({
  forecastData,
}: {
  forecastData: ForecastData[]
}) {
  return (
    <div className="mb-6 space-y-1">
      <div className="flex items-center gap-4">
        <div className="w-44 shrink-0 text-xs font-semibold tracking-wider text-orange-500 uppercase">
          Температура (°C)
        </div>
        <div className="flex flex-1 gap-1">
          {forecastData.map((f) => (
            <div
              key={f.hour}
              className="flex-1 text-center text-sm font-medium"
            >
              {f.temperature.value.toFixed(1)}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-44 shrink-0 text-xs font-semibold tracking-wider text-blue-500 uppercase">
          Ветер (м/с)
        </div>
        <div className="flex flex-1 gap-1">
          {forecastData.map((f) => (
            <div
              key={f.hour}
              className="flex-1 text-center text-sm font-medium"
            >
              {f.wind_speed.value.toFixed(1)}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-44 shrink-0 text-xs font-semibold tracking-wider text-indigo-500 uppercase">
          Осадки (мм/ч)
        </div>
        <div className="flex flex-1 gap-1">
          {forecastData.map((f) => (
            <div
              key={f.hour}
              className="flex-1 text-center text-sm font-medium"
            >
              {f.precipitation.value.toFixed(1)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})

const GroupSection = memo(function GroupSection({
  group,
  collapsed,
  onToggle,
  riskData,
}: {
  group: { key: string; name: string; works: WorkRisk[] }
  collapsed: boolean
  onToggle: (key: string) => void
  riskData: RiskHourData[]
}) {
  const handleToggle = useCallback(
    () => onToggle(group.key),
    [onToggle, group.key]
  )

  return (
    <div>
      <button
        className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        onClick={handleToggle}
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            collapsed && "-rotate-90"
          )}
        />
        {group.name}
        <span className="text-xs font-normal">({group.works.length})</span>
      </button>
      {!collapsed && (
        <div className="space-y-2">
          {group.works.map((work) => (
            <WorkRow key={work.work_id} work={work} riskData={riskData} />
          ))}
        </div>
      )}
    </div>
  )
})

export default function RiskDashboard() {
  const {
    regions,
    fetchRegions,
    selectedRegionId,
    setSelectedRegionId,
    works,
    fetchWorks,
    groups,
    fetchGroups,
  } = useAppStore()
  const [date, setDate] = useState<Date>(new Date())
  const [riskData, setRiskData] = useState<RiskHourData[]>([])
  const [forecastData, setForecastData] = useState<ForecastData[]>([])
  const [loading, setLoading] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")

  useEffect(() => {
    fetchRegions()
    fetchWorks()
    fetchGroups()
  }, [fetchRegions, fetchWorks, fetchGroups])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchRisks = useCallback(async () => {
    if (!selectedRegionId) return
    setLoading(true)
    try {
      const formattedDate = format(date, "yyyy-MM-dd")

      const [risksRes, forecastRes] = await Promise.all([
        fetch(
          `http://localhost:8000/api/v1/risks?region_id=${selectedRegionId}&target_date=${formattedDate}`
        ),
        fetch(
          `http://localhost:8000/api/v1/forecast?region_id=${selectedRegionId}&target_date=${formattedDate}`
        ),
      ])

      if (!risksRes.ok || !forecastRes.ok) {
        if (risksRes.status === 404 || forecastRes.status === 404) {
          throw new Error(
            "Модели для прогноза еще не обучены (или справочник работ пуст). Повторите попытку позже."
          )
        }
        throw new Error("Failed fetching risks or forecast")
      }

      const [risks, forecast] = await Promise.all([
        risksRes.json(),
        forecastRes.json(),
      ])

      setRiskData(risks)
      setForecastData(forecast)
    } catch (e: any) {
      console.error(e)
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }, [selectedRegionId, date])

  useEffect(() => {
    if (selectedRegionId && date) {
      fetchRisks()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegionId, date])

  const availableWorks = useMemo(
    () => (riskData.length > 0 ? riskData[0].works : []),
    [riskData]
  )

  const workGroupMap = useMemo(() => {
    const map = new Map<number, string[]>()
    for (const w of works) {
      if (!w.groups || w.groups.length === 0) {
        const existing = map.get(w.id) || []
        existing.push(NO_GROUP_KEY)
        map.set(w.id, existing)
      } else {
        for (const g of w.groups) {
          const existing = map.get(w.id) || []
          existing.push(String(g.id))
          map.set(w.id, existing)
        }
      }
    }
    return map
  }, [works])

  const groupedWorks = useMemo(() => {
    const query = debouncedQuery.toLowerCase()
    const filtered = query
      ? availableWorks.filter((aw) =>
          aw.work_name.toLowerCase().includes(query)
        )
      : availableWorks

    const result: { key: string; name: string; works: WorkRisk[] }[] = []

    for (const g of groups) {
      const groupWorks = filtered.filter((aw) =>
        workGroupMap.get(aw.work_id)?.includes(String(g.id))
      )
      if (groupWorks.length > 0 || !query) {
        result.push({ key: String(g.id), name: g.name, works: groupWorks })
      }
    }

    const noGroupWorks = filtered.filter(
      (aw) =>
        workGroupMap.get(aw.work_id)?.includes(NO_GROUP_KEY) ||
        !workGroupMap.has(aw.work_id)
    )
    if (noGroupWorks.length > 0 || !query) {
      result.push({
        key: NO_GROUP_KEY,
        name: NO_GROUP_LABEL,
        works: noGroupWorks,
      })
    }

    if (
      result.length === 1 &&
      result[0].works.length === 0 &&
      availableWorks.length > 0
    ) {
      result[0].works = availableWorks
    }

    return result
  }, [availableWorks, workGroupMap, groups, debouncedQuery])

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value),
    []
  )

  const handleDateSelect = useCallback(
    (d: Date | undefined) => d && setDate(d),
    []
  )

  const hoursHeader = useMemo(
    () =>
      riskData.map((hourData) => (
        <div
          key={hourData.hour}
          className="flex-1 text-center text-xs font-medium text-muted-foreground"
        >
          {hourData.hour}:00
        </div>
      )),
    [riskData]
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Дашборд рисков</h1>
        <p className="mt-1 text-muted-foreground">
          Оценка безопасности проведения работ на основе прогноза погоды
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Регион</label>
            <Select
              value={selectedRegionId || undefined}
              onValueChange={(val) => setSelectedRegionId(val)}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Выберите регион..." />
              </SelectTrigger>
              <SelectContent>
                {regions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Дата</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[250px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Выберите дату</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button onClick={fetchRisks} disabled={loading || !selectedRegionId}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Обновить
          </Button>
        </CardContent>
      </Card>

      {!selectedRegionId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Пожалуйста, выберите регион для просмотра данных
          </CardContent>
        </Card>
      ) : riskData.length === 0 && !loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Нет данных для отображения на выбранную дату
          </CardContent>
        </Card>
      ) : availableWorks.length === 0 && !loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Справочник работ пуст. Перейдите в &quot;Справочник&quot; и добавьте
            виды работ.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Тепловая карта рисков</CardTitle>
            <CardDescription>
              Отображение допустимости проведения работ по часам
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4 max-w-sm">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию работы..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-9"
              />
            </div>
            <div className="overflow-x-auto pb-4">
              <div className="min-w-[800px]">
                <div className="mb-2 ml-48 flex">{hoursHeader}</div>

                <WeatherRows forecastData={forecastData} />

                <div className="space-y-4">
                  {groupedWorks.map((group) => (
                    <GroupSection
                      key={group.key}
                      group={group}
                      collapsed={collapsedGroups.has(group.key)}
                      onToggle={toggleGroup}
                      riskData={riskData}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-6 border-t pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-sm bg-emerald-500" /> Работы
                разрешены
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-sm bg-amber-400" /> Пограничные
                условия
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-sm bg-red-500" /> Работы
                запрещены
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
