"use client"
import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { useAppStore, Region } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner' //shadcn toast component is often implemented via sonner or toast

export default function ModelsPage() {
  const { regions, fetchRegions } = useAppStore()
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    latitude: 55.7558,
    longitude: 37.6173
  })

  useEffect(() => {
    fetchRegions()
  }, [fetchRegions])



  const handleCreateAndTrain = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/regions/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (!res.ok) throw new Error('Ошибка создания модели')
      toast.success(`Модель для региона ${formData.name} успешно создана и отправлена на обучение!`)
      setIsOpen(false)
      fetchRegions()
      setFormData({ id: '', name: '', latitude: 55.7558, longitude: 37.6173 })
    } catch (error) {
      console.error(error)
      toast.error('Произошла ошибка при создании модели.')
    }
  }

  const handleRetrain = async (region: Region) => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/regions/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: region.id,
          name: region.name,
          latitude: region.latitude,
          longitude: region.longitude,
          incremental: true,
        })
      })
      if (!res.ok) throw new Error('Ошибка дообучения модели')
      toast.success(`Дообучение модели для региона ${region.name} запущено!`)
      fetchRegions()
    } catch (error) {
      console.error(error)
      toast.error('Произошла ошибка при дообучении модели.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Управление моделями</h1>
          <p className="text-muted-foreground mt-1">
            Запуск ML пайплайнов переобучения моделей предсказания погоды для конкретных регионов
          </p>
        </div>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Создать модель
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Текущие регионы и статусы моделей</CardTitle>
          <CardDescription>Ниже представлены актуальные метрики обученных моделей для регионов.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Региона</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Метрики Температуры</TableHead>
                <TableHead>Метрики Ветра</TableHead>
                <TableHead>Метрики Осадков</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Нет доступных регионов.
                  </TableCell>
                </TableRow>
              ) : regions.map((r) => {
                const tempModel = r.models?.find(m => m.target_type === 'temperature' && m.is_default)
                const windModel = r.models?.find(m => m.target_type === 'wind' && m.is_default)
                const rainModel = r.models?.find(m => m.target_type === 'rain' && m.is_default)
                
                const renderMetrics = (m: any) => {
                  if (!m) return <span className="text-muted-foreground text-xs">Нет данных</span>
                  return (
                    <div className="text-xs text-muted-foreground">
                      <div className="font-medium text-foreground">R²: {(m.r2_score ?? 0).toFixed(3)}</div>
                      <div>MAE: {(m.mae ?? 0).toFixed(2)}</div>
                      <div>RMSE: {(m.rmse ?? 0).toFixed(2)}</div>
                    </div>
                  )
                }
                
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.id}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{renderMetrics(tempModel)}</TableCell>
                    <TableCell>{renderMetrics(windModel)}</TableCell>
                    <TableCell>{renderMetrics(rainModel)}</TableCell>
                    <TableCell className="text-right">
                      {(r.models?.length ?? 0) > 0 ? (
                        <Button size="sm" variant="outline" onClick={() => handleRetrain(r)}>
                          Дообучить
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Создать новую модель региона</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="id">ID региона (eng, например: msk)</Label>
              <Input 
                id="id" 
                value={formData.id} 
                onChange={(e) => setFormData({...formData, id: e.target.value})} 
                placeholder="msk"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Название региона</Label>
              <Input 
                id="name" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                placeholder="Москва"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="latitude">Широта (Lat)</Label>
                <Input 
                  id="latitude" 
                  type="number"
                  step="0.000001"
                  value={formData.latitude} 
                  onChange={(e) => setFormData({...formData, latitude: Number(e.target.value)})} 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="longitude">Долгота (Lng)</Label>
                <Input 
                  id="longitude" 
                  type="number"
                  step="0.000001"
                  value={formData.longitude} 
                  onChange={(e) => setFormData({...formData, longitude: Number(e.target.value)})} 
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Отмена</Button>
            <Button onClick={handleCreateAndTrain} disabled={!formData.id || !formData.name}>Создать и обучить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
