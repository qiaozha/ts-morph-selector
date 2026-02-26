# AI Assistant Usage Guide for TS-Morph Selector

This guide is designed for AI assistants and automated code analysis systems that need to extract, analyze, or understand TypeScript code structures.

## Overview

TS-Morph Selector provides a SQL-like query language to extract specific code patterns from TypeScript projects. This is particularly useful for AI assistants performing:

- **Code analysis and understanding**
- **Refactoring assistance**
- **Documentation generation**
- **Code review and quality checks**
- **Dependency analysis**
- **Code pattern extraction**

## Quick Start for AI Systems

### 1. Setup

```typescript
import { Project } from 'ts-morph';
import { TsMorphSelector } from 'ts-morph-selector';

// Initialize with the user's project
const project = new Project({
  tsConfigFilePath: './tsconfig.json',
});

const selector = new TsMorphSelector(project);
```

### 2. Basic Query Patterns

Use SQL-like syntax to extract code:

```typescript
// Get all interfaces
const interfaces = selector.query<InterfaceDeclaration>(
  'SELECT * FROM InterfaceDeclaration'
);

// Get specific function
const func = selector.query<FunctionDeclaration>(
  "SELECT * FROM FunctionDeclaration WHERE name = 'processUser'"
);

// Get classes matching pattern
const services = selector.query<ClassDeclaration>(
  "SELECT * FROM ClassDeclaration WHERE name LIKE '%Service'"
);
```

## Common AI Use Cases

### Use Case 1: Understanding API Structure

**User Request**: "Show me all the API endpoints in this project"

**AI Response Pattern**:
```typescript
// Step 1: Find all functions (potential endpoints)
const functions = selector.query<FunctionDeclaration>(
  'SELECT * FROM FunctionDeclaration'
);

// Step 2: Analyze each function
functions.nodes.forEach(func => {
  const name = func.getName();
  const params = func.getParameters().map(p => ({
    name: p.getName(),
    type: p.getType().getText()
  }));
  const returnType = func.getReturnType().getText();
  
  // Present to user
  console.log(`Endpoint: ${name}`);
  console.log(`  Parameters: ${JSON.stringify(params, null, 2)}`);
  console.log(`  Returns: ${returnType}`);
});
```

### Use Case 2: Finding Code to Modify

**User Request**: "Find all classes that use the User interface"

**AI Response Pattern**:
```typescript
import { Node, Type } from 'ts-morph';

// Helper to check if a class uses an interface
function classUsesInterface(classDecl: ClassDeclaration, interfaceName: string): boolean {
  // Check constructor parameters
  const constructor = classDecl.getConstructors()[0];
  if (constructor) {
    for (const param of constructor.getParameters()) {
      const type = param.getType();
      if (typeReferencesInterface(type, interfaceName)) {
        return true;
      }
    }
  }
  
  // Check properties
  for (const prop of classDecl.getProperties()) {
    const type = prop.getType();
    if (typeReferencesInterface(type, interfaceName)) {
      return true;
    }
  }
  
  // Check method parameters and returns
  for (const method of classDecl.getMethods()) {
    for (const param of method.getParameters()) {
      if (typeReferencesInterface(param.getType(), interfaceName)) {
        return true;
      }
    }
    if (typeReferencesInterface(method.getReturnType(), interfaceName)) {
      return true;
    }
  }
  
  return false;
}

function typeReferencesInterface(type: Type, interfaceName: string): boolean {
  const symbol = type.getSymbol();
  if (symbol) {
    const declarations = symbol.getDeclarations();
    for (const decl of declarations) {
      if (Node.isInterfaceDeclaration(decl) && decl.getName() === interfaceName) {
        return true;
      }
    }
  }
  return false;
}

// Query and filter
const allClasses = selector.query<ClassDeclaration>('SELECT * FROM ClassDeclaration');
const classesUsingUser = allClasses.nodes.filter(cls => 
  classUsesInterface(cls, 'User')
);

// Present results
console.log(`Found ${classesUsingUser.length} classes using User interface:`);
classesUsingUser.forEach(cls => {
  console.log(`  - ${cls.getName()} in ${cls.getSourceFile().getBaseName()}`);
});
```

### Use Case 3: Refactoring Impact Analysis

**User Request**: "If I change the User interface, what will be affected?"

**AI Response Pattern**:
```typescript
// Step 1: Get interface with references
const userInterface = selector.query<InterfaceDeclaration>(
  "SELECT * FROM InterfaceDeclaration WHERE name = 'User' WITH REFERENCES"
);

if (userInterface.nodes.length === 0) {
  console.log("Interface 'User' not found");
} else {
  const iface = userInterface.nodes[0];
  const refs = userInterface.references?.get(iface) || [];
  
  // Step 2: Analyze impact
  const impactedFiles = new Set<string>();
  const impactedFunctions = new Set<string>();
  const impactedClasses = new Set<string>();
  
  refs.forEach(ref => {
    const sourceFile = ref.getSourceFile();
    impactedFiles.add(sourceFile.getFilePath());
    
    // Find what contains this reference
    let parent = ref.getParent();
    while (parent) {
      if (Node.isFunctionDeclaration(parent)) {
        impactedFunctions.add(parent.getName() || 'anonymous');
        break;
      } else if (Node.isClassDeclaration(parent)) {
        impactedClasses.add(parent.getName() || 'anonymous');
        break;
      }
      parent = parent.getParent();
    }
  });
  
  // Step 3: Present comprehensive impact
  console.log(`\nImpact Analysis for changing "User" interface:`);
  console.log(`\n📊 Summary:`);
  console.log(`  - ${refs.length} direct references`);
  console.log(`  - ${impactedFiles.size} files affected`);
  console.log(`  - ${impactedFunctions.size} functions impacted`);
  console.log(`  - ${impactedClasses.size} classes impacted`);
  
  console.log(`\n📁 Affected Files:`);
  Array.from(impactedFiles).forEach(file => {
    console.log(`  - ${file}`);
  });
  
  if (impactedFunctions.size > 0) {
    console.log(`\n⚙️  Affected Functions:`);
    Array.from(impactedFunctions).forEach(func => {
      console.log(`  - ${func}()`);
    });
  }
  
  if (impactedClasses.size > 0) {
    console.log(`\n🏗️  Affected Classes:`);
    Array.from(impactedClasses).forEach(cls => {
      console.log(`  - ${cls}`);
    });
  }
}
```

### Use Case 4: Code Documentation Generation

**User Request**: "Generate documentation for all exported functions"

**AI Response Pattern**:
```typescript
// Get all functions
const functions = selector.query<FunctionDeclaration>(
  'SELECT * FROM FunctionDeclaration'
);

// Filter exported and generate docs
const exported = functions.nodes.filter(f => f.isExported());

console.log('# API Documentation\n');

exported.forEach(func => {
  const name = func.getName() || 'anonymous';
  const params = func.getParameters();
  const returnType = func.getReturnType().getText();
  const jsDocs = func.getJsDocs();
  
  console.log(`## ${name}\n`);
  
  // Show description from JSDoc if available
  if (jsDocs.length > 0) {
    const description = jsDocs[0].getDescription();
    console.log(`${description}\n`);
  }
  
  // Show signature
  console.log('```typescript');
  console.log(`function ${name}(`);
  params.forEach((param, idx) => {
    const paramName = param.getName();
    const paramType = param.getType().getText();
    const optional = param.isOptional() ? '?' : '';
    const comma = idx < params.length - 1 ? ',' : '';
    console.log(`  ${paramName}${optional}: ${paramType}${comma}`);
  });
  console.log(`): ${returnType}`);
  console.log('```\n');
  
  // Show parameters details
  if (params.length > 0) {
    console.log('**Parameters:**\n');
    params.forEach(param => {
      console.log(`- \`${param.getName()}\`: ${param.getType().getText()}`);
    });
    console.log();
  }
  
  // Show return type
  console.log(`**Returns:** \`${returnType}\`\n`);
  console.log('---\n');
});
```

### Use Case 5: Finding Unused Code

**User Request**: "Find interfaces that aren't being used anywhere"

**AI Response Pattern**:
```typescript
// Get all interfaces with their references
const interfaces = selector.query<InterfaceDeclaration>(
  'SELECT * FROM InterfaceDeclaration WITH REFERENCES'
);

const unused: string[] = [];
const used: Array<{ name: string; count: number }> = [];

interfaces.nodes.forEach(iface => {
  const name = iface.getName();
  const refs = interfaces.references?.get(iface) || [];
  
  // Exclude self-references (the declaration itself)
  const externalRefs = refs.filter(ref => !ref.getText().includes(`interface ${name}`));
  
  if (externalRefs.length === 0) {
    unused.push(name);
  } else {
    used.push({ name, count: externalRefs.length });
  }
});

console.log('\n📊 Interface Usage Analysis:\n');

if (unused.length > 0) {
  console.log(`⚠️  Unused Interfaces (${unused.length}):`);
  unused.forEach(name => {
    console.log(`  - ${name}`);
  });
  console.log();
}

console.log(`✅ Used Interfaces (${used.length}):`);
used.sort((a, b) => b.count - a.count);
used.slice(0, 10).forEach(({ name, count }) => {
  console.log(`  - ${name}: ${count} reference(s)`);
});

if (used.length > 10) {
  console.log(`  ... and ${used.length - 10} more`);
}
```

### Use Case 6: Extract Code Patterns

**User Request**: "Show me all async functions that return specific types"

**AI Response Pattern**:
```typescript
// Get all functions
const allFunctions = selector.query<FunctionDeclaration>(
  'SELECT * FROM FunctionDeclaration'
);

// Filter for async functions
const asyncFunctions = allFunctions.nodes.filter(f => f.isAsync());

console.log(`\nFound ${asyncFunctions.length} async functions:\n`);

asyncFunctions.forEach(func => {
  const name = func.getName() || 'anonymous';
  const returnType = func.getReturnType().getText();
  const params = func.getParameters();
  
  console.log(`async function ${name}(`);
  params.forEach((p, idx) => {
    const comma = idx < params.length - 1 ? ',' : '';
    console.log(`  ${p.getName()}: ${p.getType().getText()}${comma}`);
  });
  console.log(`): ${returnType}`);
  console.log(`  Location: ${func.getSourceFile().getBaseName()}:${func.getStartLineNumber()}`);
  console.log();
});

// Categorize by return type pattern
const returnTypeCategories = new Map<string, string[]>();

asyncFunctions.forEach(func => {
  const returnType = func.getReturnType().getText();
  const category = returnType.includes('Promise') ? 'Promise-based' : 'Other';
  
  if (!returnTypeCategories.has(category)) {
    returnTypeCategories.set(category, []);
  }
  returnTypeCategories.get(category)!.push(func.getName() || 'anonymous');
});

console.log('\n📊 Async Functions by Return Type:\n');
for (const [category, funcs] of returnTypeCategories) {
  console.log(`${category}: ${funcs.length} function(s)`);
  funcs.forEach(name => console.log(`  - ${name}()`));
  console.log();
}
```

## AI Query Templates

### Template 1: "Find X that does Y"

```typescript
// Pattern: Find [NodeType] WHERE [condition]
const result = selector.query<NodeType>(
  `SELECT * FROM ${NodeType} WHERE ${property} ${operator} '${value}'`
);

// Process results based on user intent
result.nodes.forEach(node => {
  // Extract relevant information
  // Present to user in natural language
});
```

### Template 2: "What uses X?"

```typescript
// Pattern: Find references to specific element
const element = selector.query<NodeType>(
  `SELECT * FROM ${NodeType} WHERE name = '${elementName}' WITH REFERENCES`
);

if (element.nodes.length > 0) {
  const refs = element.references?.get(element.nodes[0]) || [];
  
  // Group by file or context
  const byFile = new Map<string, number>();
  refs.forEach(ref => {
    const file = ref.getSourceFile().getBaseName();
    byFile.set(file, (byFile.get(file) || 0) + 1);
  });
  
  // Present organized results
}
```

### Template 3: "Show me all X that contain Y"

```typescript
// Pattern: Query all, then filter by content
const all = selector.query<NodeType>('SELECT * FROM ${NodeType}');

const matching = all.nodes.filter(node => {
  // Check if node contains the pattern
  const text = node.getText();
  return text.includes(pattern) || /* other condition */;
});

// Present matches with context
```

## Best Practices for AI Assistants

### 1. Always Validate Queries

```typescript
// Check if query is valid before executing
const validation = selector.validate(queryString);
if (!validation.valid) {
  console.log(`Query error: ${validation.error}`);
  // Suggest correction to user
  return;
}
```

### 2. Handle Empty Results Gracefully

```typescript
const result = selector.query<InterfaceDeclaration>(
  "SELECT * FROM InterfaceDeclaration WHERE name = 'NonExistent'"
);

if (result.nodes.length === 0) {
  console.log("❌ No interfaces found matching 'NonExistent'");
  console.log("💡 Suggestion: Try browsing all interfaces with:");
  console.log("   SELECT * FROM InterfaceDeclaration");
  return;
}
```

### 3. Provide Context with Results

```typescript
result.nodes.forEach(node => {
  const location = `${node.getSourceFile().getFilePath()}:${node.getStartLineNumber()}`;
  console.log(`Found in: ${location}`);
  console.log(`\n\`\`\`typescript\n${node.getText()}\n\`\`\`\n`);
});
```

### 4. Limit Large Results

```typescript
// Use maxResults to avoid overwhelming output
const selector = new TsMorphSelector(project, { maxResults: 10 });

const result = selector.query<FunctionDeclaration>(
  'SELECT * FROM FunctionDeclaration'
);

if (result.nodes.length === 10) {
  console.log('\n⚠️  Showing first 10 results. Use filters to narrow down.');
}
```

### 5. Suggest Refinements

```typescript
const result = selector.query<ClassDeclaration>(
  'SELECT * FROM ClassDeclaration'
);

if (result.nodes.length > 50) {
  console.log(`\n📊 Found ${result.nodes.length} classes.`);
  console.log('💡 Too many results! Try refining with:');
  console.log(`  - WHERE name LIKE '%Service'  (for services)`);
  console.log(`  - WHERE name LIKE 'Test%'     (for test classes)`);
  console.log(`  - WHERE name IN ('A', 'B')    (specific names)`);
}
```

## Complex Query Patterns

### Pattern: Find Functions Called by Another Function

```typescript
function getFunctionCalls(func: FunctionDeclaration): string[] {
  const calls: string[] = [];
  
  func.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
    const expr = call.getExpression();
    if (Node.isIdentifier(expr)) {
      calls.push(expr.getText());
    }
  });
  
  return calls;
}

// Usage
const mainFunc = selector.query<FunctionDeclaration>(
  "SELECT * FROM FunctionDeclaration WHERE name = 'main'"
).nodes[0];

const calls = getFunctionCalls(mainFunc);
console.log(`Function 'main' calls: ${calls.join(', ')}`);
```

### Pattern: Build Full Dependency Graph

```typescript
interface DependencyGraph {
  interfaces: Map<string, string[]>;  // interface -> used by
  functions: Map<string, string[]>;   // function -> used interfaces
}

function buildDependencyGraph(selector: TsMorphSelector): DependencyGraph {
  const graph: DependencyGraph = {
    interfaces: new Map(),
    functions: new Map()
  };
  
  // Get all functions with their interface dependencies
  const functions = selector.query<FunctionDeclaration>(
    'SELECT * FROM FunctionDeclaration'
  );
  
  functions.nodes.forEach(func => {
    const funcName = func.getName() || 'anonymous';
    const interfaces = new Set<string>();
    
    // Extract interfaces from parameters and return type
    func.getParameters().forEach(param => {
      const type = param.getType();
      const symbol = type.getSymbol();
      if (symbol) {
        symbol.getDeclarations().forEach(decl => {
          if (Node.isInterfaceDeclaration(decl)) {
            const ifaceName = decl.getName();
            interfaces.add(ifaceName);
            
            // Update reverse mapping
            if (!graph.interfaces.has(ifaceName)) {
              graph.interfaces.set(ifaceName, []);
            }
            graph.interfaces.get(ifaceName)!.push(funcName);
          }
        });
      }
    });
    
    graph.functions.set(funcName, Array.from(interfaces));
  });
  
  return graph;
}

// Usage
const graph = buildDependencyGraph(selector);

console.log('\n🔗 Dependency Graph:\n');
console.log('Functions → Interfaces:');
for (const [func, interfaces] of graph.functions) {
  if (interfaces.length > 0) {
    console.log(`  ${func} uses: ${interfaces.join(', ')}`);
  }
}

console.log('\nInterfaces → Used By:');
for (const [iface, functions] of graph.interfaces) {
  console.log(`  ${iface} used by: ${functions.join(', ')}`);
}
```

## Response Templates for Common Requests

### "Show me all..."

```typescript
const result = selector.query<NodeType>('SELECT * FROM NodeType');

console.log(`\nFound ${result.nodes.length} ${nodeTypeName}(s):\n`);

if (result.nodes.length === 0) {
  console.log('No results found.');
} else if (result.nodes.length <= 10) {
  // Show all
  result.nodes.forEach((node, idx) => {
    console.log(`${idx + 1}. ${node.getName()}`);
  });
} else {
  // Show summary
  result.nodes.slice(0, 5).forEach((node, idx) => {
    console.log(`${idx + 1}. ${node.getName()}`);
  });
  console.log(`... and ${result.nodes.length - 5} more`);
}
```

### "What depends on..."

```typescript
const element = selector.query<NodeType>(
  `SELECT * FROM NodeType WHERE name = '${name}' WITH REFERENCES`
);

if (element.nodes.length === 0) {
  console.log(`Element '${name}' not found.`);
} else {
  const refs = element.references?.get(element.nodes[0]) || [];
  
  console.log(`\n'${name}' is used in ${refs.length} place(s):\n`);
  
  // Group by file
  const byFile = new Map<string, number>();
  refs.forEach(ref => {
    const file = ref.getSourceFile().getBaseName();
    byFile.set(file, (byFile.get(file) || 0) + 1);
  });
  
  for (const [file, count] of byFile) {
    console.log(`  📄 ${file}: ${count} reference(s)`);
  }
}
```

### "Help me refactor..."

```typescript
console.log(`\n🔍 Refactoring Analysis for '${elementName}':\n`);

// 1. Find the element
const element = selector.query<NodeType>(
  `SELECT * FROM NodeType WHERE name = '${elementName}' WITH REFERENCES`
);

if (element.nodes.length === 0) {
  console.log('❌ Element not found.');
  return;
}

// 2. Analyze impact
const refs = element.references?.get(element.nodes[0]) || [];
const files = new Set(refs.map(r => r.getSourceFile().getFilePath()));

console.log(`📊 Impact Summary:`);
console.log(`  - ${refs.length} total references`);
console.log(`  - ${files.size} files affected`);

// 3. Show details
console.log(`\n📝 Refactoring Steps:`);
console.log(`  1. Update definition in ${element.nodes[0].getSourceFile().getBaseName()}`);
console.log(`  2. Update ${refs.length} reference(s) across ${files.size} file(s)`);
console.log(`  3. Run tests to verify changes`);

// 4. Show affected locations
console.log(`\n📍 Affected Locations:`);
refs.slice(0, 5).forEach(ref => {
  const file = ref.getSourceFile().getBaseName();
  const line = ref.getStartLineNumber();
  console.log(`  - ${file}:${line}`);
});

if (refs.length > 5) {
  console.log(`  ... and ${refs.length - 5} more locations`);
}
```

## Error Handling

```typescript
try {
  const result = selector.query<NodeType>(queryString);
  
  if (result.nodes.length === 0) {
    console.log('No results found. Suggestions:');
    console.log('  - Check spelling');
    console.log('  - Try broader search (remove WHERE clause)');
    console.log('  - Use LIKE with % wildcard');
  }
  
} catch (error) {
  console.error('Query failed:', error.message);
  
  // Provide helpful guidance
  console.log('\n💡 Query syntax:');
  console.log('  SELECT * FROM NodeType [WHERE conditions] [WITH REFERENCES]');
  console.log('\nExamples:');
  console.log('  SELECT * FROM InterfaceDeclaration');
  console.log('  SELECT * FROM ClassDeclaration WHERE name LIKE "%Service"');
}
```

## Performance Considerations

For large codebases, use these strategies:

1. **Limit scope**: Query specific files or folders
2. **Use maxResults**: Prevent overwhelming output
3. **Cache results**: Store frequently accessed queries
4. **Progressive disclosure**: Show summary first, details on request

```typescript
// Example: Progressive disclosure
const result = selector.query<InterfaceDeclaration>(
  'SELECT * FROM InterfaceDeclaration'
);

console.log(`Found ${result.nodes.length} interfaces.`);

if (result.nodes.length > 20) {
  console.log('\nShowing names only (use "show details" for more):');
  result.nodes.forEach(node => console.log(`  - ${node.getName()}`));
} else {
  // Show full details for smaller results
  result.nodes.forEach(node => {
    console.log(`\nInterface: ${node.getName()}`);
    console.log(`Properties: ${node.getProperties().length}`);
    // ... more details
  });
}
```

## Summary

This tool enables AI assistants to:

✅ Quickly locate specific code patterns  
✅ Understand code structure and relationships  
✅ Analyze refactoring impact  
✅ Generate accurate documentation  
✅ Provide contextual code insights  
✅ Suggest improvements based on patterns  

Always combine query results with natural language explanations to help users understand the findings.
