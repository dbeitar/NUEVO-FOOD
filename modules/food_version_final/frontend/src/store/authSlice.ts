import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { api } from '../services/api'

interface AuthState {
  user: any | null
  accessToken: string | null
  subscription: any | null
  loading: boolean
  error: string | null
}

const initialState: AuthState = {
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  accessToken: localStorage.getItem('token'),
  subscription: JSON.parse(localStorage.getItem('subscription') || 'null'),
  loading: false,
  error: null,
}

export const login = createAsyncThunk('auth/login', async (dto: { email: string; password: string }, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', dto)
    return data
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Error al iniciar sesión')
  }
})

export const register = createAsyncThunk('auth/register', async (dto: any, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/register', dto)
    return data
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Error al registrarse')
  }
})

export const getMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/auth/me')
    return data
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message)
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null
      state.accessToken = null
      state.subscription = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('subscription')
    },
    setToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload
      localStorage.setItem('token', action.payload)
    },
  },
  extraReducers: (builder) => {
    const handleAuth = (state: AuthState, action: PayloadAction<any>) => {
      state.loading = false
      state.error = null
      state.user = action.payload.user
      state.accessToken = action.payload.accessToken
      state.subscription = action.payload.subscription
      localStorage.setItem('token', action.payload.accessToken)
      localStorage.setItem('user', JSON.stringify(action.payload.user))
      localStorage.setItem('subscription', JSON.stringify(action.payload.subscription))
    }
    builder
      .addCase(login.pending, (s) => { s.loading = true; s.error = null })
      .addCase(login.fulfilled, handleAuth)
      .addCase(login.rejected, (s, a) => { s.loading = false; s.error = a.payload as string })
      .addCase(register.pending, (s) => { s.loading = true; s.error = null })
      .addCase(register.fulfilled, handleAuth)
      .addCase(register.rejected, (s, a) => { s.loading = false; s.error = a.payload as string })
      .addCase(getMe.fulfilled, (s, a) => {
        if (a.payload) {
          s.user = a.payload
          if (a.payload.subscription !== undefined) {
            s.subscription = a.payload.subscription
            localStorage.setItem('subscription', JSON.stringify(a.payload.subscription))
          }
        }
      })
  },
})

export const { logout, setToken } = authSlice.actions
export default authSlice.reducer
