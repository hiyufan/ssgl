import { describe, it, expect } from 'vitest';
import { formatDate, getInitials, getStatusColor, getStatusLabel } from './utils';

describe('formatDate', () => {
  it('formats a date string to zh-CN format', () => {
    const result = formatDate('2026-06-15');
    expect(result).toContain('2026');
    expect(result).toContain('06');
    expect(result).toContain('15');
  });

  it('formats a Date object', () => {
    const d = new Date('2026-01-01');
    const result = formatDate(d);
    expect(result).toContain('2026');
  });
});

describe('getInitials', () => {
  it('returns the first character uppercased', () => {
    expect(getInitials('hello')).toBe('H');
    expect(getInitials('张三')).toBe('张');
    expect(getInitials('')).toBe('');
  });
});

describe('getStatusColor', () => {
  it('returns correct colors for known statuses', () => {
    expect(getStatusColor('ongoing')).toContain('blue');
    expect(getStatusColor('published')).toContain('green');
    expect(getStatusColor('draft')).toContain('gray');
    expect(getStatusColor('completed')).toContain('purple');
    expect(getStatusColor('cancelled')).toContain('red');
  });

  it('returns default color for unknown status', () => {
    expect(getStatusColor('unknown')).toContain('gray');
  });
});

describe('getStatusLabel', () => {
  it('returns Chinese labels for known statuses', () => {
    expect(getStatusLabel('ongoing')).toBe('进行中');
    expect(getStatusLabel('published')).toBe('报名中');
    expect(getStatusLabel('draft')).toBe('草稿');
    expect(getStatusLabel('completed')).toBe('已完成');
    expect(getStatusLabel('approved')).toBe('已通过');
    expect(getStatusLabel('rejected')).toBe('已驳回');
  });

  it('returns the status string itself for unknown statuses', () => {
    expect(getStatusLabel('custom_status')).toBe('custom_status');
  });
});
