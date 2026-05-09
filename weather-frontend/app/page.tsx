"use client"
import Link from 'next/link'
import { ArrowRight, Activity, ClipboardList, GitBranch, CalendarRange } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto py-12">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-extrabold tracking-tight">
          Добро пожаловать в <span className="text-primary">StroyPredict AI</span>
        </h1>
        <p className="text-xl text-muted-foreground w-3/4 mx-auto">
          Платформа для предсказания погодных условий и интеллектуальной оценки рисков проведения строительных работ.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 pt-8">
        <Card>
          <CardHeader>
            <Activity className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Дашборд данных</CardTitle>
            <CardDescription>Сырые предсказания моделей погоды по часам</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/data-dashboard">Перейти <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <ClipboardList className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Тепловая карта рисков</CardTitle>
            <CardDescription>Оценка безопасности работ на конкретные часы</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/risk-dashboard">Перейти <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CalendarRange className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Анализ графика работ</CardTitle>
            <CardDescription>Загрузите CSV график и оцените погодные риски по дням</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/schedule-analyzer">Перейти <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <GitBranch className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Справочник работ</CardTitle>
            <CardDescription>Управление пограничными условиями работ</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/references">Перейти <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <GitBranch className="h-8 w-8 mb-2 text-muted-foreground" />
            <CardTitle>Управление моделями</CardTitle>
            <CardDescription>Запуск обучения ML пайплайнов по регионам</CardDescription>
          </CardHeader>
          <CardContent>
             <Button asChild variant="outline" className="w-full">
              <Link href="/models">Перейти <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
