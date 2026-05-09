"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ClimaticGroup,
  useAppStore,
  WorkReference,
  WorkReferenceInput,
} from "@/lib/store"
import { ChevronDown, Edit2, Plus, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

const NO_GROUP_KEY = "__no_group__"
const NO_GROUP_LABEL = "Независящие от погоды"

const emptyForm: WorkReferenceInput = {
  name: "",
  temp_min: -30,
  temp_max: 40,
  wind_max: 15,
  rain_max: 5,
  normative: "",
  group_ids: [],
}

export default function ReferencesPage() {
  const {
    works,
    fetchWorks,
    addWork,
    updateWork,
    deleteWork,
    groups,
    fetchGroups,
  } = useAppStore()
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<WorkReferenceInput>(emptyForm)

  useEffect(() => {
    fetchWorks()
    fetchGroups()
  }, [fetchWorks, fetchGroups])

  // Группировка работ: по каждой группе + отдельная секция «Без группы»
  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; works: WorkReference[] }>()
    for (const g of groups) {
      map.set(String(g.id), { label: g.name, works: [] })
    }
    map.set(NO_GROUP_KEY, { label: NO_GROUP_LABEL, works: [] })

    for (const w of works) {
      if (!w.groups || w.groups.length === 0) {
        map.get(NO_GROUP_KEY)!.works.push(w)
      } else {
        for (const g of w.groups) {
          const bucket = map.get(String(g.id))
          if (bucket) bucket.works.push(w)
        }
      }
    }
    return Array.from(map.entries()).map(([key, val]) => ({ key, ...val }))
  }, [works, groups])

  const handleOpenEdit = (work: WorkReference) => {
    setEditingId(work.id)
    setFormData({
      name: work.name,
      temp_min: work.temp_min,
      temp_max: work.temp_max,
      wind_max: work.wind_max,
      rain_max: work.rain_max,
      normative: work.normative || "",
      group_ids: (work.groups || []).map((g) => g.id),
    })
    setIsOpen(true)
  }

  const handleOpenAdd = () => {
    setEditingId(null)
    setFormData(emptyForm)
    setIsOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editingId) {
        await updateWork(editingId, formData)
      } else {
        await addWork(formData)
      }
      setIsOpen(false)
    } catch (error) {
      console.error("Save failed", error)
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm("Удалить этот вид работ?")) {
      try {
        await deleteWork(id)
      } catch (error) {
        console.error("Delete failed", error)
      }
    }
  }

  const toggleGroup = (gid: number) => {
    setFormData((fd) => ({
      ...fd,
      group_ids: fd.group_ids.includes(gid)
        ? fd.group_ids.filter((x) => x !== gid)
        : [...fd.group_ids, gid],
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Справочник работ
          </h1>
          <p className="mt-1 text-muted-foreground">
            Управление допустимыми погодными условиями для различных видов
            строительных процессов
          </p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="mr-2 h-4 w-4" /> Добавить работу
        </Button>
      </div>

      <div className="space-y-3">
        {grouped.map((group) => (
          <details
            key={group.key}
            open
            className="group overflow-hidden rounded-lg border bg-card"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-2">
                <ChevronDown className="h-4 w-4 -rotate-90 transition-transform group-open:rotate-0" />
                <span className="font-semibold">{group.label}</span>
                <span className="text-xs text-muted-foreground">
                  ({group.works.length})
                </span>
              </div>
            </summary>
            <Card className="rounded-none border-0 border-t p-0 shadow-none">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название работ</TableHead>
                      <TableHead>Температура (°C)</TableHead>
                      <TableHead>Ветер (м/с)</TableHead>
                      <TableHead>Осадки (мм/ч)</TableHead>
                      <TableHead>Норматив</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.works.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-6 text-center text-sm text-muted-foreground"
                        >
                          В этой группе работ нет.
                        </TableCell>
                      </TableRow>
                    ) : (
                      group.works.map((w) => (
                        <TableRow key={w.id}>
                          <TableCell className="font-medium">
                            {w.name}
                          </TableCell>
                          <TableCell>
                            {w.temp_min} ... {w.temp_max}
                          </TableCell>
                          <TableCell>до {w.wind_max}</TableCell>
                          <TableCell>до {w.rain_max}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {w.normative || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEdit(w)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDelete(w.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </details>
        ))}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Редактировать работу" : "Добавить новую работу"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Название работ</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="temp_min">Мин. темп. (°C)</Label>
                <Input
                  id="temp_min"
                  type="number"
                  value={formData.temp_min}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      temp_min: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="temp_max">Макс. темп. (°C)</Label>
                <Input
                  id="temp_max"
                  type="number"
                  value={formData.temp_max}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      temp_max: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="wind_max">Макс. ветер (м/с)</Label>
                <Input
                  id="wind_max"
                  type="number"
                  value={formData.wind_max}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      wind_max: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rain_max">Осадки (мм/ч)</Label>
                <Input
                  id="rain_max"
                  type="number"
                  value={formData.rain_max}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rain_max: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="normative">СНиП / Норматив (опционально)</Label>
              <Input
                id="normative"
                value={formData.normative}
                onChange={(e) =>
                  setFormData({ ...formData, normative: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>Климатические группы</Label>
              <div className="flex max-h-44 flex-col gap-2 overflow-y-auto rounded-md border p-3">
                {groups.length === 0 ? (
                  <span className="text-sm text-muted-foreground">
                    Группы не загружены
                  </span>
                ) : (
                  groups.map((g: ClimaticGroup) => {
                    const checked = formData.group_ids.includes(g.id)
                    return (
                      <label
                        key={g.id}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleGroup(g.id)}
                          className="h-4 w-4 accent-primary"
                        />
                        {g.name}
                      </label>
                    )
                  })
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Можно выбрать несколько групп или ни одной (для работ, не
                зависящих от погоды).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={!formData.name}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
