import { Controller, Get, Post, Body } from '@nestjs/common'
import { UsersService } from './users.service'
import { User } from './user.entity'

@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}
  @Get()
  findAll(): Promise<User[]> {
    return this.service.findAll()
  }
  @Post()
  create(@Body() data: Partial<User>) {
    return this.service.create(data)
  }
}
