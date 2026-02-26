import { Project, Node } from 'ts-morph';
import { QueryParser } from './parser';
import { QueryExecutor } from './executor';
import { QueryResult, SelectorOptions } from './types';

/**
 * Main selector class for querying ts-morph nodes with SQL-like syntax
 * 
 * @example
 * ```typescript
 * const selector = new TsMorphSelector(project);
 * 
 * // Find all interfaces
 * const result = selector.query('SELECT * FROM InterfaceDeclaration');
 * 
 * // Find specific interface by name
 * const result = selector.query("SELECT * FROM InterfaceDeclaration WHERE name = 'MyInterface'");
 * 
 * // Find functions starting with 'test'
 * const result = selector.query("SELECT * FROM FunctionDeclaration WHERE name LIKE 'test%'");
 * 
 * // Find class with all its references
 * const result = selector.query("SELECT * FROM ClassDeclaration WHERE name = 'MyClass' WITH REFERENCES");
 * ```
 */
export class TsMorphSelector {
  private parser: QueryParser;
  private executor: QueryExecutor;
  
  constructor(
    private project: Project,
    private options: SelectorOptions = {}
  ) {
    this.parser = new QueryParser();
    this.executor = new QueryExecutor(project);
  }
  
  /**
   * Execute a SQL-like query against the project
   * 
   * @param queryString SQL-like query string
   * @returns Query result with matched nodes and optionally their references
   * 
   * @example
   * ```typescript
   * // Basic query
   * const result = selector.query('SELECT * FROM InterfaceDeclaration');
   * 
   * // With WHERE clause
   * const result = selector.query("SELECT * FROM FunctionDeclaration WHERE name = 'myFunction'");
   * 
   * // With references
   * const result = selector.query("SELECT * FROM ClassDeclaration WHERE name = 'MyClass' WITH REFERENCES");
   * ```
   */
  query<T extends Node = Node>(queryString: string): QueryResult<T> {
    const parsedQuery = this.parser.parse(queryString);
    const result = this.executor.execute<T>(parsedQuery);
    
    // Apply max results limit if specified
    if (this.options.maxResults && result.nodes.length > this.options.maxResults) {
      result.nodes = result.nodes.slice(0, this.options.maxResults);
    }
    
    return result;
  }
  
  /**
   * Validate a query string without executing it
   * 
   * @param queryString SQL-like query string to validate
   * @returns Validation result with error message if invalid
   */
  validate(queryString: string): { valid: boolean; error?: string } {
    return this.parser.validate(queryString);
  }
  
  /**
   * Get the underlying ts-morph project
   */
  getProject(): Project {
    return this.project;
  }
}

// Export all types and classes
export * from './types';
export * from './parser';
export * from './executor';
