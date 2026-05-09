import { create } from 'zustand'

export interface Region {
  id: string
  name: string
  latitude: number
  longitude: number
  models?: any[] // добавляем поле для метрик моделей
}

export interface ClimaticGroup {
  id: number
  name: string
}

export interface WorkReference {
  id: number
  name: string
  temp_min: number
  temp_max: number
  wind_max: number
  rain_max: number
  normative?: string
  critical_factors?: any
  groups: ClimaticGroup[]
}

export type WorkReferenceInput = Omit<WorkReference, 'id' | 'groups'> & {
  group_ids: number[]
}

interface AppState {
  regions: Region[]
  selectedRegionId: string | null
  setRegions: (regions: Region[]) => void
  setSelectedRegionId: (id: string | null) => void
  fetchRegions: () => Promise<void>

  works: WorkReference[]
  fetchWorks: () => Promise<void>
  addWork: (work: WorkReferenceInput) => Promise<void>
  deleteWork: (id: number) => Promise<void>
  updateWork: (id: number, work: WorkReferenceInput) => Promise<void>

  groups: ClimaticGroup[]
  fetchGroups: () => Promise<void>
}

const API_BASE = 'http://localhost:8000/api/v1'

export const useAppStore = create<AppState>((set, get) => ({
  regions: [],
  selectedRegionId: null,
  setRegions: (regions) => set({ regions }),
  setSelectedRegionId: (id) => set({ selectedRegionId: id }),
  fetchRegions: async () => {
    try {
      const response = await fetch(`${API_BASE}/regions/`)
      if (!response.ok) throw new Error('Failed to fetch regions')
      const data = await response.json()
      const patch: Partial<AppState> = { regions: data }
      if (data.length === 1 && !get().selectedRegionId) {
        patch.selectedRegionId = data[0].id
      }
      set(patch)
    } catch (error) {
      console.error('Error fetching regions:', error)
    }
  },

  works: [],
  fetchWorks: async () => {
    try {
      const response = await fetch(`${API_BASE}/reference/works/`)
      if (!response.ok) throw new Error('Failed to fetch works')
      const data = await response.json()
      set({ works: data })
    } catch (error) {
      console.error('Error fetching works:', error)
    }
  },
  addWork: async (work) => {
    try {
      const response = await fetch(`${API_BASE}/reference/works/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(work)
      })
      if (!response.ok) throw new Error('Failed to add work')
      const newWork = await response.json()
      set({ works: [...get().works, newWork] })
    } catch (error) {
      console.error('Error adding work:', error)
      throw error
    }
  },
  deleteWork: async (id) => {
    try {
      const response = await fetch(`${API_BASE}/reference/works/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete work')
      set({ works: get().works.filter(w => w.id !== id) })
    } catch (error) {
      console.error('Error deleting work:', error)
      throw error
    }
  },
  updateWork: async (id, work) => {
    try {
      const response = await fetch(`${API_BASE}/reference/works/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(work)
      })
      if (!response.ok) throw new Error('Failed to update work')
      const updatedWork = await response.json()
      set({ works: get().works.map(w => w.id === id ? updatedWork : w) })
    } catch (error) {
      console.error('Error updating work:', error)
      throw error
    }
  },

  groups: [],
  fetchGroups: async () => {
    try {
      const response = await fetch(`${API_BASE}/reference/works/groups/`)
      if (!response.ok) throw new Error('Failed to fetch groups')
      const data = await response.json()
      set({ groups: data })
    } catch (error) {
      console.error('Error fetching groups:', error)
    }
  }
}))
