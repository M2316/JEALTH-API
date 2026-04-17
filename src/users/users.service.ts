import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const user = this.usersRepo.create({
      ...dto,
      password: await bcrypt.hash(dto.password, 10),
    });
    return this.usersRepo.save(user);
  }

  findAll(): Promise<User[]> {
    return this.usersRepo.find();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepo.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOneBy({ email });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }
    Object.assign(user, dto);
    return this.usersRepo.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepo.remove(user);
  }

  async setResetToken(id: string, token: string, expiry: Date): Promise<void> {
    await this.usersRepo.update(id, {
      resetToken: token,
      resetTokenExpiry: expiry,
    });
  }

  findByResetToken(token: string): Promise<User | null> {
    return this.usersRepo.findOneBy({ resetToken: token });
  }

  async updatePassword(id: string, password: string): Promise<void> {
    await this.usersRepo.update(id, {
      password: await bcrypt.hash(password, 10),
    });
  }

  async clearResetToken(id: string): Promise<void> {
    await this.usersRepo.update(id, {
      resetToken: null,
      resetTokenExpiry: null,
    });
  }
}
