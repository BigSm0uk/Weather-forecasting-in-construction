"use client"

import { useState } from "react"
import { format, parseISO, eachDayOfInterval } from "date-fns"
import { ru } from "date-fns/locale"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react"

export interface HourDetail {
  hour: number
  temperature: number
  wind_speed: number
  precipitation: number
  status: "low" | "moderate" | "high"
  reasons: string[]
}

export interface ScheduleDay {
  date: string
  status: "low" | "moderate" | "high"
  reasons: string[]
  hours?: HourDetail[]
}

export interface ScheduleTask {
  task_name: string
  work_id: number
  work_name: string
  start_date: string
  end_date: string
  days: ScheduleDay[]
}

export interface ScheduleResponse {
  region_id: string
  min_date: string
  max_date: string
  tasks: ScheduleTask[]
  warnings: string[]
}

const STATUS_BG: Record<string, string> = {
  low: "bg-emerald-500 hover:bg-emerald-600",
  moderate: "bg-amber-400 hover:bg-amber-500",
  high: "bg-red-500 hover:bg-red-600",
}

const STATUS_BG_FLAT: Record<string, string> = {
  low: "bg-emerald-500",
  moderate: "bg-amber-400",
  high: "bg-red-500",
}

const STATUS_TEXT: Record<string, string> = {
  low: "text-emerald-600",
  moderate: "text-amber-600",
  high: "text-red-600",
}

const STATUS_LABEL: Record<string, string> = {
  low: "Подходит для работ",
  moderate: "Пограничные условия",
  high: "Работы запрещены",
}

function StatusIcon({ status }: { status: string }) {
  if (status === "low") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
  if (status === "moderate") return <AlertTriangle className="h-4 w-4 text-amber-500" />
  if (status === "high") return <AlertCircle className="h-4 w-4 text-red-500" />
  return null
}

export function ScheduleReport({ data }: { data: ScheduleResponse }) {
  const [selectedDay, setSelectedDay] = useState<{ day: ScheduleDay; task: ScheduleTask } | null>(null)

  const days = eachDayOfInterval({
    start: parseISO(data.min_date),
    end: parseISO(data.max_date),
  })

  return (
    <div className="space-y-4">
      {data.warnings.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="mb-1 font-semibold">Предупреждения парсинга:</div>
          <ul className="list-disc space-y-0.5 pl-5">
            {data.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto pb-2">
        <div style={{ minWidth: `${260 + days.length * 40}px` }}>
          <div className="flex items-stretch gap-2">
            <div className="w-64 shrink-0 pr-2" />
            <div className="flex flex-1 gap-1">
              {days.map((d) => (
                <div
                  key={d.toISOString()}
                  className="flex flex-1 flex-col items-center justify-center text-center text-[10px] font-medium text-muted-foreground"
                  title={format(d, "PPP", { locale: ru })}
                >
                  <div>{format(d, "d", { locale: ru })}</div>
                  <div className="text-muted-foreground/70">
                    {format(d, "MMM", { locale: ru })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-2 space-y-2">
            {data.tasks.map((task) => {
              const dayMap = new Map(task.days.map((d) => [d.date, d]))
              return (
                <div
                  key={`${task.task_name}-${task.work_id}-${task.start_date}`}
                  className="flex items-stretch gap-2"
                >
                  <div className="w-64 shrink-0 pr-2">
                    <div className="truncate text-sm font-medium" title={task.task_name}>
                      {task.task_name}
                    </div>
                    <div
                      className="truncate text-xs text-muted-foreground"
                      title={task.work_name}
                    >
                      {task.work_name}
                    </div>
                  </div>

                  <div className="flex flex-1 gap-1">
                    {days.map((d) => {
                      const iso = format(d, "yyyy-MM-dd")
                      const day = dayMap.get(iso)
                      if (!day) {
                        return (
                          <div
                            key={iso}
                            className="h-10 flex-1 rounded-sm bg-muted/40"
                          />
                        )
                      }
                      return (
                        <div
                          key={iso}
                          className={cn(
                            "h-10 flex-1 cursor-pointer rounded-sm border border-background/20 transition-colors",
                            STATUS_BG[day.status]
                          )}
                          title={
                            day.reasons.length
                              ? day.reasons.join("; ")
                              : "Условия благоприятные"
                          }
                          onClick={() => setSelectedDay({ day, task })}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex gap-6 border-t pt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-sm bg-emerald-500" /> Работы разрешены
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-sm bg-amber-400" /> Пограничные условия
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-sm bg-red-500" /> Работы запрещены
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="sm:max-w-[90vw] max-h-[80vh] overflow-y-auto">
          {selectedDay && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <StatusIcon status={selectedDay.day.status} />
                  {format(parseISO(selectedDay.day.date), "PPP", { locale: ru })}
                </DialogTitle>
                <div className="text-sm text-muted-foreground">
                  {selectedDay.task.task_name} — {selectedDay.task.work_name}
                </div>
                <div className="text-sm">
                  <span className={cn("font-medium", STATUS_TEXT[selectedDay.day.status])}>
                    {STATUS_LABEL[selectedDay.day.status]}
                  </span>
                </div>
              </DialogHeader>

              {selectedDay.day.hours && selectedDay.day.hours.length > 0 ? (
                <div className="mt-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-3 font-medium">Час</th>
                        <th className="pb-2 pr-3 font-medium">t°C</th>
                        <th className="pb-2 pr-3 font-medium">Ветер м/с</th>
                        <th className="pb-2 pr-3 font-medium">Осадки мм</th>
                        <th className="pb-2 pr-3 font-medium">Статус</th>
                        <th className="pb-2 font-medium">Причины</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDay.day.hours.map((h) => (
                        <tr key={h.hour} className="border-b border-muted/50">
                          <td className="py-1.5 pr-3 font-mono text-xs">
                            {String(h.hour).padStart(2, "0")}:00
                          </td>
                          <td className="py-1.5 pr-3">{h.temperature.toFixed(1)}</td>
                          <td className="py-1.5 pr-3">{h.wind_speed.toFixed(1)}</td>
                          <td className="py-1.5 pr-3">{h.precipitation.toFixed(1)}</td>
                          <td className="py-1.5 pr-3">
                            <div className={cn("h-5 w-5 rounded-sm", STATUS_BG_FLAT[h.status])} />
                          </td>
                          <td className="py-1.5 text-xs text-muted-foreground">
                            {h.reasons.length > 0 ? h.reasons.join("; ") : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                selectedDay.day.reasons.length > 0 && (
                  <div className="mt-4 text-sm">
                    <span className="mb-1 block text-muted-foreground">Причины:</span>
                    <ul className="list-disc space-y-1 pl-4">
                      {selectedDay.day.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
