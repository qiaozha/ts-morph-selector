import { ParsedQuery, NodeType, QueryOperator, WhereCondition, QueryProperty } from './types';

/**
 * Parses SQL-like query strings into structured query objects
 * 
 * Supported syntax:
 * - SELECT * FROM <NodeType> [WHERE <conditions>] [WITH REFERENCES]
 * - WHERE conditions: name = 'value', name LIKE 'pattern', name IN ('a', 'b')
 */
export class QueryParser {
  /**
   * Parse a SQL-like query string
   * @param query The query string to parse
   * @returns Parsed query object
   */
  parse(query: string): ParsedQuery {
    const normalized = query.trim().replace(/\s+/g, ' ');
    
    // Check for WITH REFERENCES
    const withReferences = /WITH\s+REFERENCES/i.test(normalized);
    const queryWithoutReferences = normalized.replace(/WITH\s+REFERENCES/i, '').trim();
    
    // Extract FROM clause
    const fromMatch = queryWithoutReferences.match(/FROM\s+(\w+)/i);
    if (!fromMatch) {
      throw new Error('Invalid query: missing FROM clause');
    }
    const nodeType = fromMatch[1] as NodeType;
    
    // Extract WHERE clause if present
    const whereMatch = queryWithoutReferences.match(/WHERE\s+(.+?)$/i);
    const whereConditions = whereMatch ? this.parseWhereClause(whereMatch[1]) : undefined;
    
    return {
      nodeType,
      where: whereConditions,
      withReferences
    };
  }
  
  /**
   * Parse WHERE clause into conditions
   */
  private parseWhereClause(whereClause: string): WhereCondition[] {
    const conditions: WhereCondition[] = [];
    
    // Split by AND (simple implementation, doesn't handle OR yet)
    const parts = whereClause.split(/\s+AND\s+/i);
    
    for (const part of parts) {
      const condition = this.parseCondition(part.trim());
      if (condition) {
        conditions.push(condition);
      }
    }
    
    return conditions;
  }
  
  /**
   * Parse a single condition
   */
  private parseCondition(condition: string): WhereCondition | null {
    // Handle IN operator: name IN ('a', 'b', 'c')
    const inMatch = condition.match(/(\w+)\s+(NOT\s+)?IN\s+\((.+?)\)/i);
    if (inMatch) {
      const property = inMatch[1] as QueryProperty;
      const isNot = !!inMatch[2];
      const values = inMatch[3]
        .split(',')
        .map(v => v.trim().replace(/^['"]|['"]$/g, ''));
      
      return {
        property,
        operator: isNot ? QueryOperator.NOT_IN : QueryOperator.IN,
        value: values
      };
    }
    
    // Handle LIKE operator: name LIKE 'pattern%'
    const likeMatch = condition.match(/(\w+)\s+(NOT\s+)?LIKE\s+['"](.+?)['"]/i);
    if (likeMatch) {
      const property = likeMatch[1] as QueryProperty;
      const isNot = !!likeMatch[2];
      const value = likeMatch[3];
      
      return {
        property,
        operator: isNot ? QueryOperator.NOT_LIKE : QueryOperator.LIKE,
        value
      };
    }
    
    // Handle equality operators: name = 'value' or name != 'value'
    const equalityMatch = condition.match(/(\w+)\s*(=|!=)\s*['"](.+?)['"]/i);
    if (equalityMatch) {
      const property = equalityMatch[1] as QueryProperty;
      const operator = equalityMatch[2] === '=' ? QueryOperator.EQUALS : QueryOperator.NOT_EQUALS;
      const value = equalityMatch[3];
      
      return {
        property,
        operator,
        value
      };
    }
    
    return null;
  }
  
  /**
   * Validate if a query string is syntactically correct
   */
  validate(query: string): { valid: boolean; error?: string } {
    try {
      this.parse(query);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
