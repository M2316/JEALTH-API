import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ChatController } from '../chat.controller';
import { ChatService } from '../chat.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

describe('ChatController (integration)', () => {
  let app: INestApplication;
  const processMock = jest.fn();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [{ provide: ChatService, useValue: { processMessage: processMock } }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    processMock.mockReset();
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
      });
    expect(res.status).toBeLessThan(300);
    expect(res.body.reply).toBe('ok');
  });

  it('rejects when messages array exceeds 20', async () => {
    const messages = Array.from({ length: 21 }, () => ({ role: 'user', content: 'x' }));
    await request(app.getHttpServer())
      .post('/chat/workout')
      .send({ date: '2026-04-18', messages })
      .expect(400);
  });

  it('rejects when date is missing', async () => {
    await request(app.getHttpServer())
      .post('/chat/workout')
      .send({ messages: [] })
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

  it('GET /chat/health still returns { ok: true }', async () => {
    const res = await request(app.getHttpServer()).get('/chat/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
