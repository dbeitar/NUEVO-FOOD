import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  sanitize(user: User) {
    const { passwordHash, ...safe } = user;
    return safe;
  }

  async findById(id: string) {
    const user = await this.userRepo.findOne({ where: { id, isActive: true } });
    return user ? this.sanitize(user) : null;
  }
}
