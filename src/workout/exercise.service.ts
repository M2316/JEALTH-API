import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Exercise } from './entities/exercise.entity';
import { MuscleGroup } from './entities/muscle-group.entity';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { customSlug, cloneSlug } from './seed/slug.util';

export type FindAllFilters = {
  search?: string;
  scope?: 'all' | 'default' | 'mine';
  category?: string;
  muscleGroup?: string;
};

@Injectable()
export class ExerciseService {
  constructor(
    @InjectRepository(Exercise)
    private readonly exerciseRepo: Repository<Exercise>,
    @InjectRepository(MuscleGroup)
    private readonly muscleGroupRepo: Repository<MuscleGroup>,
  ) {}

  async create(dto: CreateExerciseDto, userId: string): Promise<Exercise> {
    const muscleGroups = await this.muscleGroupRepo.findBy({
      id: In(dto.muscleGroupIds),
    });
    const exercise = this.exerciseRepo.create({
      slug: customSlug(),
      name: dto.name,
      equipment: dto.equipment,
      description: dto.description ?? null,
      category: dto.category ?? null,
      difficulty: dto.difficulty ?? null,
      isDefault: false,
      createdBy: { id: userId } as any,
      muscleGroups,
    });
    return this.exerciseRepo.save(exercise);
  }

  async findAll(filters: FindAllFilters, userId: string): Promise<Exercise[]> {
    const qb = this.exerciseRepo
      .createQueryBuilder('exercise')
      .leftJoinAndSelect('exercise.muscleGroups', 'mg')
      .leftJoinAndSelect('exercise.createdBy', 'creator');

    if (filters.search) {
      qb.andWhere('exercise.name ILIKE :search', {
        search: `%${filters.search}%`,
      });
    }
    if (filters.scope === 'default') {
      qb.andWhere('exercise.isDefault = :isDefault', { isDefault: true });
    } else if (filters.scope === 'mine') {
      qb.andWhere('exercise.createdById = :userId', { userId });
    }
    if (filters.category) {
      qb.andWhere('exercise.category = :category', {
        category: filters.category,
      });
    }
    if (filters.muscleGroup) {
      qb.andWhere('mg.id = :muscleGroupId', {
        muscleGroupId: filters.muscleGroup,
      });
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Exercise> {
    const exercise = await this.exerciseRepo.findOne({
      where: { id },
      relations: ['muscleGroups', 'createdBy'],
    });
    if (!exercise) throw new NotFoundException('Exercise not found');
    return exercise;
  }

  async findAllMuscleGroups(): Promise<MuscleGroup[]> {
    return this.muscleGroupRepo.find();
  }

  private assertWritable(exercise: Exercise, userId: string): void {
    if (exercise.isDefault) {
      throw new ForbiddenException('기본 운동은 수정/삭제할 수 없습니다.');
    }
    if (!exercise.createdBy || exercise.createdBy.id !== userId) {
      throw new ForbiddenException('본인이 생성한 운동만 수정/삭제할 수 있습니다.');
    }
  }

  async update(
    id: string,
    dto: UpdateExerciseDto,
    userId: string,
  ): Promise<Exercise> {
    const exercise = await this.findOne(id);
    this.assertWritable(exercise, userId);
    if (dto.name !== undefined) exercise.name = dto.name;
    if (dto.equipment !== undefined) exercise.equipment = dto.equipment;
    if (dto.description !== undefined) exercise.description = dto.description;
    if (dto.category !== undefined) exercise.category = dto.category;
    if (dto.difficulty !== undefined) exercise.difficulty = dto.difficulty;
    if (dto.muscleGroupIds) {
      exercise.muscleGroups = await this.muscleGroupRepo.findBy({
        id: In(dto.muscleGroupIds),
      });
    }
    return this.exerciseRepo.save(exercise);
  }

  async remove(id: string, userId: string): Promise<void> {
    const exercise = await this.findOne(id);
    this.assertWritable(exercise, userId);
    await this.exerciseRepo.remove(exercise);
  }

  async clone(id: string, userId: string): Promise<Exercise> {
    const origin = await this.findOne(id);
    const copy = this.exerciseRepo.create({
      slug: cloneSlug(origin.slug),
      name: origin.name,
      equipment: origin.equipment,
      description: origin.description,
      category: origin.category,
      difficulty: origin.difficulty,
      isDefault: false,
      imageUrl: null as any,
      createdBy: { id: userId } as any,
      muscleGroups: origin.muscleGroups,
    });
    return this.exerciseRepo.save(copy);
  }

  async updateImageUrl(
    id: string,
    imageUrl: string,
    userId: string,
  ): Promise<Exercise> {
    const exercise = await this.findOne(id);
    this.assertWritable(exercise, userId);
    exercise.imageUrl = imageUrl;
    return this.exerciseRepo.save(exercise);
  }
}
