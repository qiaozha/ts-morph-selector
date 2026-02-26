import { Node, SyntaxKind } from 'ts-morph';

/**
 * Query operators for WHERE clause conditions
 */
export enum QueryOperator {
  EQUALS = '=',
  NOT_EQUALS = '!=',
  LIKE = 'LIKE',
  NOT_LIKE = 'NOT LIKE',
  IN = 'IN',
  NOT_IN = 'NOT IN'
}

/**
 * Supported property names for WHERE clause
 */
export type QueryProperty = 'name' | 'kind' | 'text' | 'modifier';

/**
 * A single condition in the WHERE clause
 */
export interface WhereCondition {
  property: QueryProperty;
  operator: QueryOperator;
  value: string | string[];
}

/**
 * Node types that can be queried
 */
export type NodeType =
  | 'InterfaceDeclaration'
  | 'ClassDeclaration'
  | 'FunctionDeclaration'
  | 'MethodDeclaration'
  | 'PropertyDeclaration'
  | 'VariableDeclaration'
  | 'TypeAliasDeclaration'
  | 'EnumDeclaration'
  | 'ImportDeclaration'
  | 'ExportDeclaration'
  | '*';

/**
 * Parsed query structure
 */
export interface ParsedQuery {
  nodeType: NodeType;
  where?: WhereCondition[];
  withReferences: boolean;
}

/**
 * Query result containing matched nodes
 */
export interface QueryResult<T extends Node = Node> {
  nodes: T[];
  references?: Map<T, Node[]>;
}

/**
 * Options for the selector
 */
export interface SelectorOptions {
  /**
   * When true, includes all source files in the project
   */
  includeNodeModules?: boolean;
  
  /**
   * Maximum number of results to return
   */
  maxResults?: number;
}
