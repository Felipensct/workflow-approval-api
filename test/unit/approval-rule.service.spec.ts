import { ApprovalRuleService } from '../../src/domain/services/approval-rule.service';

describe('ApprovalRuleService', () => {
  let service: ApprovalRuleService;

  beforeEach(() => {
    service = new ApprovalRuleService();
  });

  describe('ALL', () => {
    it('retorna approved quando todos aprovam e nenhum rejeita', () => {
      expect(service.resolve('ALL', 3, ['approve', 'approve', 'approve'])).toBe('approved');
      expect(service.resolve('ALL', 1, ['approve'])).toBe('approved');
    });

    it('retorna rejected quando qualquer um rejeita', () => {
      expect(service.resolve('ALL', 3, ['approve', 'reject', 'approve'])).toBe('rejected');
      expect(service.resolve('ALL', 3, ['reject', 'reject', 'reject'])).toBe('rejected');
      expect(service.resolve('ALL', 1, ['reject'])).toBe('rejected');
    });

    it('retorna null quando ainda faltam votos (todos devem aprovar)', () => {
      expect(service.resolve('ALL', 3, ['approve', 'approve'])).toBe(null);
      expect(service.resolve('ALL', 3, [])).toBe(null);
    });
  });

  describe('ANY', () => {
    it('retorna approved quando pelo menos um aprova', () => {
      expect(service.resolve('ANY', 3, ['approve'])).toBe('approved');
      expect(service.resolve('ANY', 3, ['reject', 'approve', 'reject'])).toBe('approved');
      expect(service.resolve('ANY', 1, ['approve'])).toBe('approved');
    });

    it('retorna rejected quando todos votaram e todos rejeitaram', () => {
      expect(service.resolve('ANY', 3, ['reject', 'reject', 'reject'])).toBe('rejected');
      expect(service.resolve('ANY', 1, ['reject'])).toBe('rejected');
    });

    it('retorna null quando ainda não há nenhum approve e faltam votos', () => {
      expect(service.resolve('ANY', 3, [])).toBe(null);
      expect(service.resolve('ANY', 3, ['reject', 'reject'])).toBe(null);
    });
  });

  describe('QUORUM', () => {
    const quorum = (total: number) => Math.floor(total / 2) + 1;

    it('retorna approved quando aprovações >= quorum (floor(total/2)+1)', () => {
      expect(service.resolve('QUORUM', 5, ['approve', 'approve', 'approve'])).toBe('approved');
      expect(service.resolve('QUORUM', 5, ['approve', 'approve', 'approve', 'reject', 'reject'])).toBe('approved');
      expect(service.resolve('QUORUM', 4, ['approve', 'approve', 'approve'])).toBe('approved');
      expect(service.resolve('QUORUM', 1, ['approve'])).toBe('approved');
    });

    it('retorna rejected quando rejeições tornam quorum impossível', () => {
      const total = 5;
      const q = quorum(5);
      expect(total - 3).toBe(2);
      expect(q).toBe(3);
      expect(service.resolve('QUORUM', 5, ['reject', 'reject', 'reject'])).toBe('rejected');
      expect(service.resolve('QUORUM', 5, ['approve', 'reject', 'reject', 'reject'])).toBe('rejected');
    });

    it('retorna rejected quando todos votaram e aprovações < quorum', () => {
      expect(service.resolve('QUORUM', 5, ['approve', 'approve', 'reject', 'reject', 'reject'])).toBe('rejected');
      expect(service.resolve('QUORUM', 4, ['approve', 'reject', 'reject', 'reject'])).toBe('rejected');
    });

    it('retorna null quando ainda não atingiu quorum nem rejeição definitiva', () => {
      expect(service.resolve('QUORUM', 5, ['approve', 'approve'])).toBe(null);
      expect(service.resolve('QUORUM', 5, ['approve', 'reject'])).toBe(null);
      expect(service.resolve('QUORUM', 5, [])).toBe(null);
    });
  });
});
