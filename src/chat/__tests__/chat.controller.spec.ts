import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ChatController } from '../chat.controller';
import { ChatService } from '../chat.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

describe('ChatController (integration)', () => {
  let app: INestApplication;
  const processMock = jest.fn();
  const approveNewExerciseMock = jest.fn();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: {
            processMessage: processMock,
            approveNewExercise: approveNewExerciseMock,
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: 'user-1' };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    processMock.mockReset();
    approveNewExerciseMock.mockReset();
  });

  it('POST /chat/workout returns processed response', async () => {
    processMock.mockResolvedValue({
      reply: 'ok',
      confidence: 'high',
      draft: { exercises: [] },
    });
    const res = await request(app.getHttpServer())
      .post('/chat/workout')
      .send({
        date: '2026-04-18',
        messages: [{ role: 'user', content: '안녕' }],
      })
      .expect(200);
    expect(res.body.reply).toBe('ok');
  });

  it('rejects empty messages array', async () => {
    await request(app.getHttpServer())
      .post('/chat/workout')
      .send({ date: '2026-04-18', messages: [] })
      .expect(400);
  });

  it('rejects empty content', async () => {
    await request(app.getHttpServer())
      .post('/chat/workout')
      .send({ date: '2026-04-18', messages: [{ role: 'user', content: '' }] })
      .expect(400);
  });

  it('rejects when messages array exceeds 20', async () => {
    const messages = Array.from({ length: 21 }, () => ({
      role: 'user',
      content: 'x',
    }));
    await request(app.getHttpServer())
      .post('/chat/workout')
      .send({ date: '2026-04-18', messages })
      .expect(400);
  });

  it('rejects when date is missing', async () => {
    await request(app.getHttpServer())
      .post('/chat/workout')
      .send({ messages: [{ role: 'user', content: 'x' }] })
      .expect(400);
  });

  it('rejects invalid role value', async () => {
    await request(app.getHttpServer())
      .post('/chat/workout')
      .send({
        date: '2026-04-18',
        messages: [{ role: 'system', content: 'x' }],
      })
      .expect(400);
  });

  it('POST /chat/workout/approve-new-exercise passes body and user to service', async () => {
    approveNewExerciseMock.mockResolvedValue({
      exercise: { id: 'ex' },
      routine: { id: 'r' },
    });
    const body = {
      date: '2026-04-19',
      name: '스쿼트',
      muscleGroupIds: ['11111111-1111-4111-8111-111111111111'],
      sets: [{ round: 1, reps: 1, weight: 1, weightUnit: 'kg' }],
    };
    const res = await request(app.getHttpServer())
      .post('/chat/workout/approve-new-exercise')
      .send(body)
      .expect(200);
    expect(res.body).toEqual({
      exercise: { id: 'ex' },
      routine: { id: 'r' },
    });
    expect(approveNewExerciseMock).toHaveBeenCalledWith(body, 'user-1');
  });

  it('GET /chat/health still returns { ok: true }', async () => {
    const res = await request(app.getHttpServer()).get('/chat/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
