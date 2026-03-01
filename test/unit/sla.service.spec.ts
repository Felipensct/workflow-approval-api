import { SlaService } from '../../src/domain/services/sla.service';

describe('SlaService', () => {
  let service: SlaService;

  beforeEach(() => {
    service = new SlaService();
  });

  describe('calculateDeadline', () => {
    it('adiciona horas ao momento de referência', () => {
      const from = new Date('2026-02-28T10:00:00.000Z');
      const deadline = service.calculateDeadline(from, 24);
      expect(deadline.toISOString()).toBe('2026-03-01T10:00:00.000Z');
    });

    it('respeita zero horas (mesmo instante)', () => {
      const from = new Date('2026-02-28T12:00:00.000Z');
      const deadline = service.calculateDeadline(from, 0);
      expect(deadline.getTime()).toBe(from.getTime());
    });

    it('soma 48 horas corretamente', () => {
      const from = new Date('2026-02-28T00:00:00.000Z');
      const deadline = service.calculateDeadline(from, 48);
      expect(deadline.toISOString()).toBe('2026-03-02T00:00:00.000Z');
    });
  });

  describe('isBreached', () => {
    it('retorna true quando now >= deadline', () => {
      const deadline = new Date('2026-02-28T12:00:00.000Z');
      const now = new Date('2026-02-28T12:00:00.000Z');
      expect(service.isBreached(deadline, now)).toBe(true);
    });

    it('retorna true quando now > deadline', () => {
      const deadline = new Date('2026-02-28T12:00:00.000Z');
      const now = new Date('2026-02-28T13:00:00.000Z');
      expect(service.isBreached(deadline, now)).toBe(true);
    });

    it('retorna false quando now < deadline', () => {
      const deadline = new Date('2026-02-28T12:00:00.000Z');
      const now = new Date('2026-02-28T11:00:00.000Z');
      expect(service.isBreached(deadline, now)).toBe(false);
    });
  });
});
