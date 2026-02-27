import {
  Node,
  Project,
  InterfaceDeclaration,
  ClassDeclaration,
  FunctionDeclaration,
  MethodDeclaration,
  PropertyDeclaration,
  PropertySignature,
  VariableDeclaration,
  TypeAliasDeclaration,
  EnumDeclaration,
  ImportDeclaration,
  ExportDeclaration,
  SourceFile,
  SyntaxKind
} from 'ts-morph';
import { ParsedQuery, QueryResult, WhereCondition, QueryOperator, NodeType, SelectorOptions } from './types';
import { minimatch } from 'minimatch';

/**
 * Executes parsed queries against a ts-morph Project
 */
export class QueryExecutor {
  constructor(private project: Project, private options: SelectorOptions = {}) {}
  
  /**
   * Execute a parsed query and return matching nodes
   */
  execute<T extends Node = Node>(query: ParsedQuery): QueryResult<T> {
    const allSourceFiles = this.project.getSourceFiles();
    const sourceFiles = this.filterSourceFiles(allSourceFiles);
    
    // Special case: if querying for SourceFile nodes
    if (query.nodeType === 'SourceFile') {
      const filteredNodes = query.where
        ? sourceFiles.filter(node => this.matchesWhereConditions(node, query.where!))
        : sourceFiles;
      
      return {
        nodes: filteredNodes as unknown as T[],
        references: undefined
      };
    }
    
    const allNodes: Node[] = [];
    
    // Collect nodes based on node type
    for (const sourceFile of sourceFiles) {
      const nodes = this.getNodesByType(sourceFile, query.nodeType);
      allNodes.push(...nodes);
    }
    
    // Filter nodes based on WHERE conditions
    let filteredNodes = query.where
      ? allNodes.filter(node => this.matchesWhereConditions(node, query.where!))
      : allNodes;
    
    // Get references if requested
    const references = query.withReferences
      ? this.getReferences(filteredNodes)
      : undefined;
    
    return {
      nodes: filteredNodes as T[],
      references: references as Map<T, Node[]> | undefined
    };
  }
  
  /**
   * Filter source files based on file patterns
   */
  private filterSourceFiles(sourceFiles: SourceFile[]): SourceFile[] {
    if (!this.options.filePattern) {
      return sourceFiles;
    }
    
    const patterns = Array.isArray(this.options.filePattern)
      ? this.options.filePattern
      : [this.options.filePattern];
    
    return sourceFiles.filter(sourceFile => {
      const filePath = sourceFile.getFilePath().replace(/\\/g, '/');
      return patterns.some(pattern => minimatch(filePath, pattern, { matchBase: true }));
    });
  }
  
  /**
   * Get nodes of a specific type from a source file
   */
  private getNodesByType(sourceFile: SourceFile, nodeType: NodeType): Node[] {
    if (nodeType === '*') {
      return sourceFile.getDescendants();
    }
    
    const methodMap: { [key in NodeType]?: () => any[] } = {
      'InterfaceDeclaration': () => sourceFile.getInterfaces(),
      'ClassDeclaration': () => sourceFile.getClasses(),
      'FunctionDeclaration': () => sourceFile.getFunctions(),
      'TypeAliasDeclaration': () => sourceFile.getTypeAliases(),
      'EnumDeclaration': () => sourceFile.getEnums(),
      'ImportDeclaration': () => sourceFile.getImportDeclarations(),
      'ExportDeclaration': () => sourceFile.getExportDeclarations(),
      'VariableDeclaration': () => {
        const declarations: VariableDeclaration[] = [];
        for (const statement of sourceFile.getVariableStatements()) {
          declarations.push(...statement.getDeclarations());
        }
        return declarations;
      },
      'MethodDeclaration': () => {
        const methods: MethodDeclaration[] = [];
        for (const cls of sourceFile.getClasses()) {
          methods.push(...cls.getMethods());
        }
        return methods;
      },
      'PropertyDeclaration': () => {
        const properties: (PropertyDeclaration | PropertySignature)[] = [];
        for (const cls of sourceFile.getClasses()) {
          properties.push(...cls.getProperties());
        }
        for (const iface of sourceFile.getInterfaces()) {
          properties.push(...iface.getProperties());
        }
        return properties;
      }
    };
    
    const method = methodMap[nodeType];
    return method ? method() : [];
  }
  
  /**
   * Check if a node matches all WHERE conditions
   */
  private matchesWhereConditions(node: Node, conditions: WhereCondition[]): boolean {
    return conditions.every(condition => this.matchesCondition(node, condition));
  }
  
  /**
   * Check if a node matches a single condition
   */
  private matchesCondition(node: Node, condition: WhereCondition): boolean {
    const value = this.getPropertyValue(node, condition.property);
    
    if (value === null || value === undefined) {
      return false;
    }
    
    switch (condition.operator) {
      case QueryOperator.EQUALS:
        return value === condition.value;
      
      case QueryOperator.NOT_EQUALS:
        return value !== condition.value;
      
      case QueryOperator.LIKE:
        return this.matchesPattern(value, condition.value as string);
      
      case QueryOperator.NOT_LIKE:
        return !this.matchesPattern(value, condition.value as string);
      
      case QueryOperator.IN:
        return Array.isArray(condition.value) && condition.value.includes(value);
      
      case QueryOperator.NOT_IN:
        return Array.isArray(condition.value) && !condition.value.includes(value);
      
      default:
        return false;
    }
  }
  
  /**
   * Get the value of a property from a node
   */
  private getPropertyValue(node: Node, property: string): string | null {
    switch (property) {
      case 'name':
        if ('getName' in node && typeof (node as any).getName === 'function') {
          return (node as any).getName() || null;
        }
        return null;
      
      case 'kind':
        return node.getKindName();
      
      case 'text':
        return node.getText();
      
      case 'modifier':
        if ('getModifiers' in node && typeof (node as any).getModifiers === 'function') {
          const modifiers = (node as any).getModifiers();
          return modifiers.map((m: Node) => m.getText()).join(' ');
        }
        return null;
      
      case 'path':
        if ('getFilePath' in node && typeof (node as any).getFilePath === 'function') {
          return (node as any).getFilePath() || null;
        }
        return node.getSourceFile()?.getFilePath() || null;
      
      case 'baseName':
        if ('getBaseName' in node && typeof (node as any).getBaseName === 'function') {
          return (node as any).getBaseName() || null;
        }
        return node.getSourceFile()?.getBaseName() || null;
      
      case 'extension':
        if ('getExtension' in node && typeof (node as any).getExtension === 'function') {
          return (node as any).getExtension() || null;
        }
        return node.getSourceFile()?.getExtension() || null;
      
      default:
        return null;
    }
  }
  
  /**
   * Check if a string matches a LIKE pattern (SQL-style)
   * Supports % (any characters) and _ (single character)
   */
  private matchesPattern(value: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
      .replace(/%/g, '.*')  // % matches any characters
      .replace(/_/g, '.');  // _ matches single character
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(value);
  }
  
  /**
   * Get all references for a list of nodes
   */
  private getReferences(nodes: Node[]): Map<Node, Node[]> {
    const referencesMap = new Map<Node, Node[]>();
    
    for (const node of nodes) {
      const references: Node[] = [];
      
      // Try to find references if the node has a name
      if ('findReferences' in node && typeof (node as any).findReferences === 'function') {
        const refEntries = (node as any).findReferences();
        
        for (const refEntry of refEntries) {
          for (const ref of refEntry.getReferences()) {
            const refNode = ref.getNode();
            if (refNode) {
              references.push(refNode);
            }
          }
        }
      } else if ('findReferencesAsNodes' in node && typeof (node as any).findReferencesAsNodes === 'function') {
        const refNodes = (node as any).findReferencesAsNodes();
        references.push(...refNodes);
      }
      
      if (references.length > 0) {
        referencesMap.set(node, references);
      }
    }
    
    return referencesMap;
  }
}
