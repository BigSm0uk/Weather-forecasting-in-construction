"use client"

import { useEffect, useRef, useState } from "react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Loader2, Upload, Trash2, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAppStore } from "@/lib/store"
import { ScheduleReport, ScheduleResponse } from "@/components/ScheduleReport"
import { toast } from "sonner"

const API_BASE = "http://localhost:8000/api/v1"
const STORAGE_KEY = "schedule-reports"

interface SavedReport {
  id: string
  name: string
  createdAt: string
  data: ScheduleResponse
}

function loadReports(): SavedReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveReports(reports: SavedReport[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports))
}

export default function ScheduleAnalyzerPage() {
  const { regions, fetchRegions, selectedRegionId, setSelectedRegionId } =
    useAppStore()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<ScheduleResponse | null>(null)
  const [savedReports, setSavedReports] = useState<SavedReport[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchRegions()
    setSavedReports(loadReports())
  }, [fetchRegions])

  const handleAnalyze = async () => {
    if (!selectedRegionId) {
      toast.error("Выберите регион")
      return
    }
    if (!file) {
      toast.error("Выберите CSV-файл")
      return
    }
    setLoading(true)
    setReport(null)
    try {
      const formData = new FormData()
      formData.append("region_id", selectedRegionId)
      formData.append("file", file)

      const res = await fetch(`${API_BASE}/schedule/analyze`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Ошибка ${res.status}`)
      }
      const data: ScheduleResponse = await res.json()
      setReport(data)

      const now = new Date()
      const newReport: SavedReport = {
        id: crypto.randomUUID(),
        name: `Анализ от ${format(now, "dd.MM.yyyy HH:mm", { locale: ru })}`,
        createdAt: now.toISOString(),
        data,
      }
      const updated = [newReport, ...savedReports]
      setSavedReports(updated)
      saveReports(updated)

      if (data.warnings?.length) {
        toast.warning("Анализ завершен с предупреждениями")
      } else {
        toast.success("Анализ завершен")
      }
    } catch (e: any) {
      console.error(e)
      toast.error(e.message || "Не удалось выполнить анализ")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (id: string) => {
    const updated = savedReports.filter((r) => r.id !== id)
    setSavedReports(updated)
    saveReports(updated)
  }

  const handleOpen = (saved: SavedReport) => {
    setReport(saved.data)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Анализ графика работ
        </h1>
        <p className="mt-1 text-muted-foreground">
          Загрузите CSV график строительных работ и оцените, какие задачи
          попадают на дни с неблагоприятной погодой.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Параметры</CardTitle>
          <CardDescription>
            Колонки CSV: <code>Task Name, Work Type ID, Start Date, End Date</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Регион</label>
            <Select
              value={selectedRegionId || undefined}
              onValueChange={(val) => setSelectedRegionId(val)}
            >
              <SelectTrigger className="w-62.5">
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
            <label className="text-sm font-medium">CSV-файл</label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {file ? "Заменить файл" : "Выбрать файл"}
              </Button>
              {file && (
                <span className="max-w-70 truncate text-sm text-muted-foreground">
                  {file.name}
                </span>
              )}
            </div>
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={loading || !selectedRegionId || !file}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Анализировать
          </Button>
        </CardContent>
      </Card>

      {savedReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Сохранённые отчёты</CardTitle>
            <CardDescription>
              {savedReports.length} {savedReports.length === 1 ? "отчёт" : savedReports.length < 5 ? "отчёта" : "отчётов"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedReports.map((saved) => (
                <div
                  key={saved.id}
                  className="flex items-center justify-between rounded-md border px-4 py-2"
                >
                  <button
                    className="flex items-center gap-2 text-sm font-medium hover:underline text-left"
                    onClick={() => handleOpen(saved)}
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {saved.name}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(saved.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Выполняется анализ погодных рисков...
          </CardContent>
        </Card>
      )}

      {report && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>Отчет по графику</CardTitle>
            <CardDescription>
              Период: {report.min_date} — {report.max_date}. Задач:{" "}
              {report.tasks.length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {report.tasks.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Нет задач для отображения. Проверьте предупреждения выше.
              </div>
            ) : (
              <ScheduleReport data={report} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
