import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, ILike } from 'typeorm';
import { Exercise } from './entities/exercise.entity';
import { MuscleGroup } from './entities/muscle-group.entity';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { customSlug, cloneSlug } from './seed/slug.util';

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

  findAll(search?: string): Promise<Exercise[]> {
    return this.exerciseRepo.find({
      relations: ['muscleGroups'],
      ...(search ? { where: { name: ILike(`%${search}%`) } } : {}),
    });
  }

  async findOne(id: string): Promise<Exercise> {
    const exercise = await this.exerciseRepo.findOne({
      where: { id },
      relations: ['muscleGroups'],
    });
    if (!exercise) throw new NotFoundException('Exercise not found');
    return exercise;
  }

  async findAllMuscleGroups(): Promise<MuscleGroup[]> {
    return this.muscleGroupRepo.find();
  }

  async update(id: string, dto: UpdateExerciseDto): Promise<Exercise> {
    const exercise = await this.findOne(id);
    if (dto.name !== undefined) exercise.name = dto.name;
    if (dto.equipment !== undefined) exercise.equipment = dto.equipment;
    if (dto.muscleGroupIds) {
      exercise.muscleGroups = await this.muscleGroupRepo.findBy({
        id: In(dto.muscleGroupIds),
      });
    }
    return this.exerciseRepo.save(exercise);
  }

  async remove(id: string): Promise<void> {
    const exercise = await this.findOne(id);
    await this.exerciseRepo.remove(exercise);
  }

  async updateImageUrl(id: string, imageUrl: string): Promise<Exercise> {
    const exercise = await this.findOne(id);
    exercise.imageUrl = imageUrl;
    return this.exerciseRepo.save(exercise);
  }
}
