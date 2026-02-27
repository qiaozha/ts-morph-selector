import { Project, InterfaceDeclaration, ClassDeclaration, FunctionDeclaration, TypeAliasDeclaration, SourceFile } from 'ts-morph';
import { TsMorphSelector } from '../src/index';

describe('TsMorphSelector', () => {
  let project: Project;
  let selector: TsMorphSelector;
  
  beforeEach(() => {
    project = new Project({
      useInMemoryFileSystem: true,
    });
    
    // Add test source file
    project.createSourceFile('test.ts', `
      export interface User {
        id: number;
        name: string;
      }
      
      export interface Product {
        id: number;
        title: string;
      }
      
      export class UserService {
        getUser(id: number): User {
          return {} as User;
        }
      }
      
      export class TestService {
        test(): void {}
      }
      
      export function getUserById(id: number): User {
        return {} as User;
      }
      
      export function testFunction() {}
      
      export type UserId = number;
    `);
    
    selector = new TsMorphSelector(project);
  });
  
  describe('query', () => {
    it('should find all interfaces', () => {
      const result = selector.query<InterfaceDeclaration>('SELECT * FROM InterfaceDeclaration');
      expect(result.nodes).toHaveLength(2);
    });
    
    it('should find interface by exact name', () => {
      const result = selector.query<InterfaceDeclaration>("SELECT * FROM InterfaceDeclaration WHERE name = 'User'");
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].getName()).toBe('User');
    });
    
    it('should find classes', () => {
      const result = selector.query<ClassDeclaration>('SELECT * FROM ClassDeclaration');
      expect(result.nodes).toHaveLength(2);
    });
    
    it('should find classes by pattern', () => {
      const result = selector.query<ClassDeclaration>("SELECT * FROM ClassDeclaration WHERE name LIKE '%Service'");
      expect(result.nodes).toHaveLength(2);
    });
    
    it('should find functions', () => {
      const result = selector.query<FunctionDeclaration>('SELECT * FROM FunctionDeclaration');
      expect(result.nodes).toHaveLength(2);
    });
    
    it('should find functions by pattern', () => {
      const result = selector.query<FunctionDeclaration>("SELECT * FROM FunctionDeclaration WHERE name LIKE 'test%'");
      expect(result.nodes).toHaveLength(1);
    });
    
    it('should find type aliases', () => {
      const result = selector.query<TypeAliasDeclaration>('SELECT * FROM TypeAliasDeclaration');
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].getName()).toBe('UserId');
    });
    
    it('should find nodes using IN operator', () => {
      const result = selector.query<ClassDeclaration>("SELECT * FROM ClassDeclaration WHERE name IN ('UserService', 'TestService')");
      expect(result.nodes).toHaveLength(2);
    });
    
    it('should exclude nodes using NOT IN operator', () => {
      const result = selector.query<ClassDeclaration>("SELECT * FROM ClassDeclaration WHERE name NOT IN ('TestService')");
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].getName()).toBe('UserService');
    });
    
    it('should handle WITH REFERENCES', () => {
      const result = selector.query<InterfaceDeclaration>("SELECT * FROM InterfaceDeclaration WHERE name = 'User' WITH REFERENCES");
      expect(result.nodes).toHaveLength(1);
      expect(result.references).toBeDefined();
    });
    
    it('should respect maxResults option', () => {
      const limitedSelector = new TsMorphSelector(project, { maxResults: 1 });
      const result = limitedSelector.query<InterfaceDeclaration>('SELECT * FROM InterfaceDeclaration');
      expect(result.nodes).toHaveLength(1);
    });
  });
  
  describe('SourceFile queries', () => {
    beforeEach(() => {
      // Add more test files
      project.createSourceFile('services/user.service.ts', `
        export class UserService {}
      `);
      
      project.createSourceFile('services/product.service.ts', `
        export class ProductService {}
      `);
      
      project.createSourceFile('models/user.model.ts', `
        export interface UserModel {
          id: number;
        }
      `);
    });
    
    it('should query all SourceFiles', () => {
      const result = selector.query<SourceFile>('SELECT * FROM SourceFile');
      expect(result.nodes.length).toBeGreaterThan(0);
      expect(result.nodes.every(node => node.getKindName() === 'SourceFile')).toBe(true);
    });
    
    it('should filter SourceFiles by baseName', () => {
      const result = selector.query<SourceFile>("SELECT * FROM SourceFile WHERE baseName = 'test.ts'");
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].getBaseName()).toBe('test.ts');
    });
    
    it('should filter SourceFiles by baseName pattern', () => {
      const result = selector.query<SourceFile>("SELECT * FROM SourceFile WHERE baseName LIKE '%.service.ts'");
      expect(result.nodes.length).toBeGreaterThanOrEqual(2);
      expect(result.nodes.every(node => node.getBaseName().endsWith('.service.ts'))).toBe(true);
    });
    
    it('should filter SourceFiles by path pattern', () => {
      const result = selector.query<SourceFile>("SELECT * FROM SourceFile WHERE path LIKE '%services%'");
      expect(result.nodes.length).toBeGreaterThanOrEqual(2);
      expect(result.nodes.every(node => node.getFilePath().includes('services'))).toBe(true);
    });
    
    it('should filter SourceFiles by extension', () => {
      const result = selector.query<SourceFile>("SELECT * FROM SourceFile WHERE extension = '.ts'");
      expect(result.nodes.length).toBeGreaterThan(0);
      expect(result.nodes.every(node => node.getExtension() === '.ts')).toBe(true);
    });
    
    it('should filter SourceFiles by multiple conditions', () => {
      const result = selector.query<SourceFile>("SELECT * FROM SourceFile WHERE baseName LIKE '%.model.ts'");
      expect(result.nodes.length).toBeGreaterThanOrEqual(1);
      expect(result.nodes.every(node => node.getBaseName().endsWith('.model.ts'))).toBe(true);
    });
    
    it('should use IN operator with baseName', () => {
      const result = selector.query<SourceFile>("SELECT * FROM SourceFile WHERE baseName IN ('test.ts', 'user.model.ts')");
      expect(result.nodes.length).toBeGreaterThanOrEqual(1);
      expect(result.nodes.every(node => 
        ['test.ts', 'user.model.ts'].includes(node.getBaseName())
      )).toBe(true);
    });
  });
  
  describe('validate', () => {
    it('should validate correct query', () => {
      const result = selector.validate('SELECT * FROM InterfaceDeclaration');
      expect(result.valid).toBe(true);
    });
    
    it('should invalidate incorrect query', () => {
      const result = selector.validate('INVALID QUERY');
      expect(result.valid).toBe(false);
    });
  });
  
  describe('getProject', () => {
    it('should return the project', () => {
      expect(selector.getProject()).toBe(project);
    });
  });
});
