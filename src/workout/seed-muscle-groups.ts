import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MuscleGroup } from './entities/muscle-group.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(MuscleGroup)
    private readonly muscleGroupRepo: Repository<MuscleGroup>,
  ) {}

  async onModuleInit() {
    const groups = [
      { name: 'chest', nameKo: '가슴' },
      { name: 'back', nameKo: '등' },
      { name: 'shoulders', nameKo: '어깨' },
      { name: 'arms', nameKo: '팔' },
      { name: 'legs', nameKo: '하체' },
      { name: 'core', nameKo: '코어' },
    ];
    for (const group of groups) {
      await this.muscleGroupRepo.upsert(group, ['name']);
    }
  }
}
