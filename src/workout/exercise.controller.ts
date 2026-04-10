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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import { mkdirSync } from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExerciseService } from './exercise.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';

// Ensure upload directory exists
mkdirSync('./uploads/exercises', { recursive: true });

@ApiTags('Exercises')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exercises')
export class ExerciseController {
  constructor(private readonly exerciseService: ExerciseService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.exerciseService.findAll(search);
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

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExerciseDto) {
    return this.exerciseService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.exerciseService.remove(id);
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
  ) {
    const imageUrl = `/uploads/exercises/${file.filename}`;
    return this.exerciseService.updateImageUrl(id, imageUrl);
  }
}
