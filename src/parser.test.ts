import { QueryParser } from '../src/parser';
import { QueryOperator } from '../src/types';

describe('QueryParser', () => {
  let parser: QueryParser;
  
  beforeEach(() => {
    parser = new QueryParser();
  });
  
  describe('parse', () => {
    it('should parse simple SELECT FROM query', () => {
      const result = parser.parse('SELECT * FROM InterfaceDeclaration');
      expect(result.nodeType).toBe('InterfaceDeclaration');
      expect(result.where).toBeUndefined();
      expect(result.withReferences).toBe(false);
    });
    
    it('should parse query with WHERE clause', () => {
      const result = parser.parse("SELECT * FROM ClassDeclaration WHERE name = 'MyClass'");
      expect(result.nodeType).toBe('ClassDeclaration');
      expect(result.where).toHaveLength(1);
      expect(result.where![0].property).toBe('name');
      expect(result.where![0].operator).toBe(QueryOperator.EQUALS);
      expect(result.where![0].value).toBe('MyClass');
    });
    
    it('should parse query with LIKE operator', () => {
      const result = parser.parse("SELECT * FROM FunctionDeclaration WHERE name LIKE 'test%'");
      expect(result.where![0].operator).toBe(QueryOperator.LIKE);
      expect(result.where![0].value).toBe('test%');
    });
    
    it('should parse query with IN operator', () => {
      const result = parser.parse("SELECT * FROM ClassDeclaration WHERE name IN ('A', 'B', 'C')");
      expect(result.where![0].operator).toBe(QueryOperator.IN);
      expect(result.where![0].value).toEqual(['A', 'B', 'C']);
    });
    
    it('should parse query with WITH REFERENCES', () => {
      const result = parser.parse('SELECT * FROM InterfaceDeclaration WHERE name = "User" WITH REFERENCES');
      expect(result.withReferences).toBe(true);
      expect(result.nodeType).toBe('InterfaceDeclaration');
    });
    
    it('should parse query with multiple WHERE conditions', () => {
      const result = parser.parse("SELECT * FROM ClassDeclaration WHERE name = 'Test' AND kind = 'ClassDeclaration'");
      expect(result.where).toHaveLength(2);
      expect(result.where![0].property).toBe('name');
      expect(result.where![1].property).toBe('kind');
    });
    
    it('should handle NOT LIKE operator', () => {
      const result = parser.parse("SELECT * FROM ClassDeclaration WHERE name NOT LIKE 'Test%'");
      expect(result.where![0].operator).toBe(QueryOperator.NOT_LIKE);
    });
    
    it('should handle NOT IN operator', () => {
      const result = parser.parse("SELECT * FROM ClassDeclaration WHERE name NOT IN ('A', 'B')");
      expect(result.where![0].operator).toBe(QueryOperator.NOT_IN);
    });
    
    it('should throw error for invalid query', () => {
      expect(() => parser.parse('INVALID QUERY')).toThrow();
    });
  });
  
  describe('validate', () => {
    it('should validate correct query', () => {
      const result = parser.validate('SELECT * FROM InterfaceDeclaration');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
    
    it('should invalidate incorrect query', () => {
      const result = parser.validate('INVALID');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
