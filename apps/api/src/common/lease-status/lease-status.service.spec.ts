import { LeaseStatusService } from './lease-status.service';

describe('LeaseStatusService', () => {
  const service = new LeaseStatusService();
  const now = new Date('2026-06-15T00:00:00.000Z');

  describe('deriveEffectiveStatus', () => {
    it('returns active for an active lease with a future endDate', () => {
      const lease = {
        status: 'active' as const,
        endDate: new Date('2026-12-31T00:00:00.000Z'),
      };

      expect(service.deriveEffectiveStatus(lease, now)).toBe('active');
    });

    it('returns expired for an active lease with a past endDate', () => {
      const lease = {
        status: 'active' as const,
        endDate: new Date('2026-01-01T00:00:00.000Z'),
      };

      expect(service.deriveEffectiveStatus(lease, now)).toBe('expired');
    });

    it('returns active for an active lease whose endDate is exactly now (boundary)', () => {
      const lease = { status: 'active' as const, endDate: now };

      expect(service.deriveEffectiveStatus(lease, now)).toBe('active');
    });

    it('passes through draft regardless of endDate', () => {
      const lease = {
        status: 'draft' as const,
        endDate: new Date('2020-01-01T00:00:00.000Z'),
      };

      expect(service.deriveEffectiveStatus(lease, now)).toBe('draft');
    });

    it('passes through terminated regardless of endDate', () => {
      const lease = {
        status: 'terminated' as const,
        endDate: new Date('2030-01-01T00:00:00.000Z'),
      };

      expect(service.deriveEffectiveStatus(lease, now)).toBe('terminated');
    });
  });

  describe('isEffectivelyActive', () => {
    it('is true for an active lease with a future endDate', () => {
      const lease = {
        status: 'active' as const,
        endDate: new Date('2026-12-31T00:00:00.000Z'),
      };

      expect(service.isEffectivelyActive(lease, now)).toBe(true);
    });

    it('is false for an active lease with a past endDate (expired)', () => {
      const lease = {
        status: 'active' as const,
        endDate: new Date('2026-01-01T00:00:00.000Z'),
      };

      expect(service.isEffectivelyActive(lease, now)).toBe(false);
    });

    it('is false for a draft lease', () => {
      const lease = {
        status: 'draft' as const,
        endDate: new Date('2026-12-31T00:00:00.000Z'),
      };

      expect(service.isEffectivelyActive(lease, now)).toBe(false);
    });

    it('is false for a terminated lease', () => {
      const lease = {
        status: 'terminated' as const,
        endDate: new Date('2026-12-31T00:00:00.000Z'),
      };

      expect(service.isEffectivelyActive(lease, now)).toBe(false);
    });
  });
});
