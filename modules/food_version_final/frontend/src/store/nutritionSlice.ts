import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '../services/api'

export const fetchTodayLogs = createAsyncThunk('nutrition/today', async () => {
  const { data } = await api.get('/nutrition/logs/today')
  return data
})

export const fetchGoals = createAsyncThunk('nutrition/goals', async () => {
  const { data } = await api.get('/nutrition/goals')
  return data
})

export const fetchTrafficLight = createAsyncThunk('nutrition/trafficLight', async () => {
  const { data } = await api.get('/nutrition/traffic-light')
  return data
})

export const addFoodLog = createAsyncThunk('nutrition/addLog', async (dto: any) => {
  const { data } = await api.post('/nutrition/logs', dto)
  return data
})

export const deleteFoodLog = createAsyncThunk('nutrition/deleteLog', async (id: string) => {
  await api.delete(`/nutrition/logs/${id}`)
  return id
})

const nutritionSlice = createSlice({
  name: 'nutrition',
  initialState: {
    todayLogs: null as any,
    goals: null as any,
    trafficLight: null as any,
    loading: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTodayLogs.fulfilled, (s, a) => { s.todayLogs = a.payload; s.loading = false })
      .addCase(fetchTodayLogs.pending, (s) => { s.loading = true })
      .addCase(fetchGoals.fulfilled, (s, a) => { s.goals = a.payload })
      .addCase(fetchTrafficLight.fulfilled, (s, a) => { s.trafficLight = a.payload })
      .addCase(addFoodLog.fulfilled, (s) => { s.loading = false })
      .addCase(deleteFoodLog.fulfilled, (s) => { s.loading = false })
  },
})

export default nutritionSlice.reducer
