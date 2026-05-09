"use client"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

export default function DataDashboard() {
  const { regions, fetchRegions, selectedRegionId, setSelectedRegionId } =
    useAppStore()
  const [date, setDate] = useState<Date>(new Date())
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchRegions()
  }, [fetchRegions])

  useEffect(() => {
    if (selectedRegionId && date) {
      fetchForecast()
    }
  }, [selectedRegionId, date])

  const fetchForecast = async () => {
    setLoading(true)
    try {
      const formattedDate = format(date, "yyyy-MM-dd")
      const res = await fetch(
        `http://localhost:8000/api/v1/forecast?region_id=${selectedRegionId}&target_date=${formattedDate}`
      )
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(
            "Модели для этого региона еще не обучены (или не активны). Повторите попытку позже или обучите модели на странице Управления моделями."
          )
        }
        throw new Error("Failed fetching")
      }
      const result = await res.json()

      // Transform data for charts
      const chartData = result.map((item: any) => ({
        hour: `${item.hour}:00`,
        temperature: item.temperature.value,
        wind: item.wind_speed.value,
        rain: item.precipitation.value,
      }))
      setData(chartData)
    } catch (e: any) {
      console.error(e)
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  const chartConfig = {
    temperature: {
      label: "Температура (°C)",
      color: "#ff7300",
    },
    wind: {
      label: "Ветер (м/с)",
      color: "#3b82f6",
    },
    rain: {
      label: "Осадки (мм)",
      color: "#8b5cf6",
    },
  } satisfies ChartConfig

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Дашборд данных</h1>
        <p className="mt-1 text-muted-foreground">
          Отображение сырых предсказаний моделей по часам
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
                  onSelect={(d) => d && setDate(d)}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button
            onClick={fetchForecast}
            disabled={loading || !selectedRegionId}
          >
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
      ) : data.length === 0 && !loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Нет данных для отображения на выбранную дату
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="col-span-1 xl:col-span-2">
            <CardHeader>
              <CardTitle>Температура (°C)</CardTitle>
              <CardDescription>
                Прогноз температуры по часам (24 часа)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ChartContainer
                  config={{ temperature: chartConfig.temperature }}
                  className="h-full w-full"
                >
                  <AreaChart
                    data={data}
                    margin={{
                      left: 12,
                      right: 12,
                      top: 10,
                      bottom: 10,
                    }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="hour"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      domain={[0, "auto"]}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent />}
                    />
                    <Area
                      baseValue={0}
                      dataKey="temperature"
                      type="natural"
                      fill="var(--color-temperature)"
                      fillOpacity={0.2}
                      stroke="var(--color-temperature)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ветер (м/с)</CardTitle>
              <CardDescription>Скорость ветра по часам</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ChartContainer
                  config={{ wind: chartConfig.wind }}
                  className="h-full w-full"
                >
                  <AreaChart
                    data={data}
                    margin={{ left: 12, right: 12, top: 10 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="hour"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={40}
                      domain={[0, "dataMax + 2"]}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent />}
                    />
                    <Area
                      dataKey="wind"
                      type="monotone"
                      fill="var(--color-wind)"
                      fillOpacity={0.2}
                      stroke="var(--color-wind)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Осадки (мм/ч)</CardTitle>
              <CardDescription>Уровень осадков по часам</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ChartContainer
                  config={{ rain: chartConfig.rain }}
                  className="h-full w-full"
                >
                  <AreaChart
                    data={data}
                    margin={{ left: 12, right: 12, top: 10 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="hour"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={40}
                      domain={[0, "dataMax + 1"]}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent />}
                    />
                    <Area
                      dataKey="rain"
                      type="step"
                      fill="var(--color-rain)"
                      fillOpacity={0.2}
                      stroke="var(--color-rain)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
