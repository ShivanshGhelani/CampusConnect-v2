import { describe, it, expect } from 'vitest';
import {
  generateBoilerplate,
  generateCompleteHTML,
  getProtectedBoilerplate,
  getAvailableFrameworks,
  getAvailableOrientations,
  getA4Dimensions
} from './boilerplateTemplates.js';

describe('Boilerplate Templates', () => {
  describe('generateBoilerplate', () => {
    it('should generate Tailwind CSS portrait boilerplate', () => {
      const result = generateBoilerplate('tailwind', 'portrait');
      
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('https://cdn.tailwindcss.com');
      expect(result).toContain('size: A4 portrait');
      expect(result).toContain('width: 210mm');
      expect(result).toContain('min-height: 297mm');
      expect(result).toContain('<body>');
    });

    it('should generate Tailwind CSS landscape boilerplate', () => {
      const result = generateBoilerplate('tailwind', 'landscape');
      
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('https://cdn.tailwindcss.com');
      expect(result).toContain('size: A4 landscape');
      expect(result).toContain('width: 297mm');
      expect(result).toContain('min-height: 210mm');
      expect(result).toContain('<body>');
    });

    it('should generate Bootstrap portrait boilerplate', () => {
      const result = generateBoilerplate('bootstrap', 'portrait');
      
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('bootstrap@5.3.0/dist/css/bootstrap.min.css');
      expect(result).toContain('bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js');
      expect(result).toContain('size: A4 portrait');
      expect(result).toContain('width: 210mm');
      expect(result).toContain('min-height: 297mm');
      expect(result).toContain('<body>');
    });

    it('should generate Bootstrap landscape boilerplate', () => {
      const result = generateBoilerplate('bootstrap', 'landscape');
      
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('bootstrap@5.3.0/dist/css/bootstrap.min.css');
      expect(result).toContain('bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js');
      expect(result).toContain('size: A4 landscape');
      expect(result).toContain('width: 297mm');
      expect(result).toContain('min-height: 210mm');
      expect(result).toContain('<body>');
    });

    it('should throw error for invalid framework', () => {
      expect(() => generateBoilerplate('invalid', 'portrait')).toThrow('Invalid framework');
    });

    it('should throw error for invalid orientation', () => {
      expect(() => generateBoilerplate('tailwind', 'invalid')).toThrow('Invalid orientation');
    });
  });

  describe('generateCompleteHTML', () => {
    it('should generate complete HTML with user content', () => {
      const userContent = '<h1>Hello World</h1>';
      const result = generateCompleteHTML('tailwind', 'portrait', userContent);
      
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<h1>Hello World</h1>');
      expect(result).toContain('</body>');
      expect(result).toContain('</html>');
    });

    it('should generate complete HTML without user content', () => {
      const result = generateCompleteHTML('bootstrap', 'landscape');
      
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('</body>');
      expect(result).toContain('</html>');
    });
  });

  describe('getProtectedBoilerplate', () => {
    it('should return the same as generateBoilerplate', () => {
      const framework = 'tailwind';
      const orientation = 'portrait';
      
      const boilerplate = generateBoilerplate(framework, orientation);
      const protected = getProtectedBoilerplate(framework, orientation);
      
      expect(protected).toBe(boilerplate);
    });
  });

  describe('getAvailableFrameworks', () => {
    it('should return array of available frameworks', () => {
      const frameworks = getAvailableFrameworks();
      
      expect(frameworks).toEqual(['tailwind', 'bootstrap']);
      expect(Array.isArray(frameworks)).toBe(true);
    });
  });

  describe('getAvailableOrientations', () => {
    it('should return array of available orientations', () => {
      const orientations = getAvailableOrientations();
      
      expect(orientations).toEqual(['portrait', 'landscape']);
      expect(Array.isArray(orientations)).toBe(true);
    });
  });

  describe('getA4Dimensions', () => {
    it('should return correct portrait dimensions', () => {
      const dimensions = getA4Dimensions('portrait');
      
      expect(dimensions).toEqual({ width: '210mm', height: '297mm' });
    });

    it('should return correct landscape dimensions', () => {
      const dimensions = getA4Dimensions('landscape');
      
      expect(dimensions).toEqual({ width: '297mm', height: '210mm' });
    });

    it('should throw error for invalid orientation', () => {
      expect(() => getA4Dimensions('invalid')).toThrow('Invalid orientation');
    });
  });
});