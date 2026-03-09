import { Controller, Get } from '@nestjs/common'

@Controller(['', 'health', 'api/health'])
export class HealthController {
  @Get()
  ok() {
    return { status: 'ok' }
  }
}
