import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from './user.entity'

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}
  findAll() {
    return this.repo.find()
  }
  create(data: Partial<User>) {
    const entity = this.repo.create(data)
    return this.repo.save(entity)
  }
}
