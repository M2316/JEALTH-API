import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class StatsService {
  constructor(private readonly dataSource: DataSource) {}

  async getVolumeByPeriod(
    userId: string,
    start: string,
    end: string,
  ): Promise<{ date: string; volume: number }[]> {
    const rows = await this.dataSource.query(
      `SELECT wr.date, SUM(ws.weight * ws.reps) as volume
       FROM workout_routines wr
       JOIN workout_exercises we ON we."routineId" = wr.id
       JOIN workout_sets ws ON ws."workoutExerciseId" = we.id
       WHERE wr."userId" = $1 AND wr.date BETWEEN $2 AND $3
       GROUP BY wr.date
       ORDER BY wr.date`,
      [userId, start, end],
    );
    return rows.map((r: any) => ({ date: r.date, volume: Number(r.volume) }));
  }

  async getPersonalRecords(
    userId: string,
    exerciseId?: string,
  ): Promise<{ name: string; maxWeight: number; date: string }[]> {
    let query = `
      SELECT e.name, MAX(CAST(ws.weight AS float)) as "maxWeight", wr.date
      FROM workout_routines wr
      JOIN workout_exercises we ON we."routineId" = wr.id
      JOIN workout_sets ws ON ws."workoutExerciseId" = we.id
      JOIN exercises e ON we."exerciseId" = e.id
      WHERE wr."userId" = $1
    `;
    const params: any[] = [userId];
    if (exerciseId) {
      params.push(exerciseId);
      query += ` AND e.id = $${params.length}`;
    }
    query += ` GROUP BY e.id, e.name, wr.date ORDER BY "maxWeight" DESC`;
    const rows = await this.dataSource.query(query, params);
    return rows.map((r: any) => ({
      name: r.name,
      maxWeight: Number(r.maxWeight),
      date: r.date,
    }));
  }

  async getMuscleGroupBreakdown(
    userId: string,
    start: string,
    end: string,
  ): Promise<{ nameKo: string; setCount: number }[]> {
    const rows = await this.dataSource.query(
      `SELECT mg."nameKo", COUNT(ws.id) as "setCount"
       FROM workout_routines wr
       JOIN workout_exercises we ON we."routineId" = wr.id
       JOIN workout_sets ws ON ws."workoutExerciseId" = we.id
       JOIN exercises e ON we."exerciseId" = e.id
       JOIN exercise_muscle_groups emg ON emg."exercisesId" = e.id
       JOIN muscle_groups mg ON emg."muscleGroupsId" = mg.id
       WHERE wr."userId" = $1 AND wr.date BETWEEN $2 AND $3
       GROUP BY mg.id, mg."nameKo"`,
      [userId, start, end],
    );
    return rows.map((r: any) => ({
      nameKo: r.nameKo,
      setCount: Number(r.setCount),
    }));
  }
}
