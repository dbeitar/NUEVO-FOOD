// store.ts
import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import nutritionReducer from './nutritionSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    nutrition: nutritionReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
