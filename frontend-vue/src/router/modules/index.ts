import { AppRouteRecord } from '@/types/router'
import { ssglRoutes } from './ssgl'
import { resultRoutes } from './result'
import { exceptionRoutes } from './exception'

export const routeModules: AppRouteRecord[] = [
  ...ssglRoutes,
  resultRoutes,
  exceptionRoutes
]
