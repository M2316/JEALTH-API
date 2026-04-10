import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WorkoutRoutine } from './entities/workout-routine.entity';
import { WorkoutExercise } from './entities/workout-exercise.entity';
import { WorkoutSet } from './entities/workout-set.entity';
import { Exercise } from './entities/exercise.entity';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';

@Injectable()
export class RoutineService {
  constructor(
    @InjectRepository(WorkoutRoutine)
    private readonly routineRepo: Repository<WorkoutRoutine>,
    @InjectRepository(Exercise)
    private readonly exerciseRepo: Repository<Exercise>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateRoutineDto, userId: string): Promise<WorkoutRoutine> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const routine = queryRunner.manager.create(WorkoutRoutine, {
        user: { id: userId } as any,
        date: dto.date,
        order: dto.order ?? 0,
      });
      const savedRoutine = await queryRunner.manager.save(routine);

      for (let i = 0; i < dto.exercises.length; i++) {
        const exDto = dto.exercises[i];
        const exercise = await this.exerciseRepo.findOneBy({ id: exDto.exerciseId });
        if (!exercise) throw new NotFoundException(`Exercise ${exDto.exerciseId} not found`);

        const workoutExercise = queryRunner.manager.create(WorkoutExercise, {
          routine: savedRoutine,
          exercise,
          order: exDto.order ?? i,
        });
        const savedWe = await queryRunner.manager.save(workoutExercise);

        for (let j = 0; j < exDto.sets.length; j++) {
          const setDto = exDto.sets[j];
          const workoutSet = queryRunner.manager.create(WorkoutSet, {
            workoutExercise: savedWe,
            round: setDto.round ?? j + 1,
            reps: setDto.reps,
            weight: setDto.weight,
            weightUnit: setDto.weightUnit ?? 'kg',
          });
          await queryRunner.manager.save(workoutSet);
        }
      }

      await queryRunner.commitTransaction();
      return this.findOneInternal(savedRoutine.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findByDate(userId: string, date: string): Promise<WorkoutRoutine[]> {
    return this.routineRepo.find({
      where: { user: { id: userId }, date },
      relations: ['exercises', 'exercises.exercise', 'exercises.exercise.muscleGroups', 'exercises.sets'],
      order: { order: 'ASC', exercises: { order: 'ASC', sets: { round: 'ASC' } } },
    });
  }

  async findOne(id: string, userId: string): Promise<WorkoutRoutine> {
    const routine = await this.routineRepo.findOne({
      where: { id, user: { id: userId } },
      relations: ['exercises', 'exercises.exercise', 'exercises.exercise.muscleGroups', 'exercises.sets'],
    });
    if (!routine) throw new NotFoundException('Routine not found');
    return routine;
  }

  private async findOneInternal(id: string): Promise<WorkoutRoutine> {
    const routine = await this.routineRepo.findOne({
      where: { id },
      relations: ['exercises', 'exercises.exercise', 'exercises.exercise.muscleGroups', 'exercises.sets'],
    });
    if (!routine) throw new NotFoundException('Routine not found');
    return routine;
  }

  async update(id: string, dto: UpdateRoutineDto, userId: string): Promise<WorkoutRoutine> {
    const routine = await this.findOne(id, userId);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      if (dto.date !== undefined) routine.date = dto.date;
      if (dto.order !== undefined) routine.order = dto.order;
      await queryRunner.manager.save(routine);

      if (dto.exercises) {
        // Delete old exercises (cascade deletes sets)
        await queryRunner.manager.delete(WorkoutExercise, { routine: { id } });

        for (let i = 0; i < dto.exercises.length; i++) {
          const exDto = dto.exercises[i];
          const exercise = await this.exerciseRepo.findOneBy({ id: exDto.exerciseId });
          if (!exercise) throw new NotFoundException(`Exercise ${exDto.exerciseId} not found`);

          const workoutExercise = queryRunner.manager.create(WorkoutExercise, {
            routine: { id } as any,
            exercise,
            order: exDto.order ?? i,
          });
          const savedWe = await queryRunner.manager.save(workoutExercise);

          for (let j = 0; j < exDto.sets.length; j++) {
            const setDto = exDto.sets[j];
            const workoutSet = queryRunner.manager.create(WorkoutSet, {
              workoutExercise: savedWe,
              round: setDto.round ?? j + 1,
              reps: setDto.reps,
              weight: setDto.weight,
              weightUnit: setDto.weightUnit ?? 'kg',
            });
            await queryRunner.manager.save(workoutSet);
          }
        }
      }

      await queryRunner.commitTransaction();
      return this.findOneInternal(id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    const routine = await this.findOne(id, userId);
    await this.routineRepo.remove(routine);
  }

  async copyRoutine(sourceId: string, targetDate: string, userId: string): Promise<WorkoutRoutine> {
    const source = await this.findOne(sourceId, userId);
    const dto: CreateRoutineDto = {
      date: targetDate,
      order: source.order,
      exercises: source.exercises.map((we) => ({
        exerciseId: we.exercise.id,
        order: we.order,
        sets: we.sets.map((s) => ({
          round: s.round,
          reps: s.reps,
          weight: Number(s.weight),
          weightUnit: s.weightUnit,
        })),
      })),
    };
    return this.create(dto, userId);
  }
}
