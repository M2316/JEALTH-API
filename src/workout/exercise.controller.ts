import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseEnumPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import { mkdirSync } from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExerciseService, FindAllFilters } from './exercise.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { ExerciseCategory } from './enums/exercise-category.enum';

// Ensure upload directory exists
mkdirSync('./uploads/exercises', { recursive: true });

@ApiTags('Exercises')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exercises')
export class ExerciseController {
  constructor(private readonly exerciseService: ExerciseService) {}

  @Get()
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'scope', required: false, enum: ['all', 'default', 'mine'] })
  @ApiQuery({ name: 'category', required: false, enum: ExerciseCategory })
  @ApiQuery({ name: 'muscleGroup', required: false })
  findAll(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('scope') scope?: 'all' | 'default' | 'mine',
    @Query('category', new ParseEnumPipe(ExerciseCategory, { optional: true }))
    category?: ExerciseCategory,
    @Query('muscleGroup') muscleGroup?: string,
  ) {
    const filters: FindAllFilters = { search, scope, category, muscleGroup };
    return this.exerciseService.findAll(filters, req.user.id);
  }

  @Get('muscle-groups')
  findAllMuscleGroups() {
    return this.exerciseService.findAllMuscleGroups();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.exerciseService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateExerciseDto, @Req() req: any) {
    return this.exerciseService.create(dto, req.user.id);
  }

  @Post(':id/clone')
  clone(@Param('id') id: string, @Req() req: any) {
    return this.exerciseService.clone(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExerciseDto,
    @Req() req: any,
  ) {
    return this.exerciseService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.exerciseService.remove(id, req.user.id);
  }

  @Post(':id/image')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { image: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/exercises',
        filename: (_req, file, cb) =>
          cb(null, uuid() + extname(file.originalname)),
      }),
    }),
  )
  uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const imageUrl = `/uploads/exercises/${file.filename}`;
    return this.exerciseService.updateImageUrl(id, imageUrl, req.user.id);
  }
}
