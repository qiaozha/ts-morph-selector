# TS-Morph Selector

A powerful SQL-like query language for [ts-morph](https://github.com/dsherret/ts-morph) that allows you to easily select and query TypeScript AST nodes.

## Features

- 🔍 **SQL-like syntax** - Intuitive query language for selecting AST nodes
- 🎯 **Multiple node types** - Query interfaces, classes, functions, enums, and more
- 🔗 **Reference tracking** - Optionally include all references to selected nodes
- ⚡ **Pattern matching** - Support for LIKE patterns and IN clauses
- 📦 **Type-safe** - Full TypeScript support with type definitions
- 🧪 **Well-tested** - Comprehensive test coverage

## Installation

```bash
npm install ts-morph-selector ts-morph
```

## Quick Start

```typescript
import { Project } from 'ts-morph';
import { TsMorphSelector } from 'ts-morph-selector';

// Create a ts-morph project
const project = new Project({
    tsConfigFilePath: './tsconfig.json',
});

// Create selector instance
const selector = new TsMorphSelector(project);

// Query all interfaces
const result = selector.query('SELECT * FROM InterfaceDeclaration');
console.log(`Found ${result.nodes.length} interfaces`);
```

## Query Syntax

The query syntax is inspired by SQL and follows this pattern:

```sql
SELECT * FROM <NodeType> [WHERE <conditions>] [WITH REFERENCES]
```

### Supported Node Types

- `InterfaceDeclaration` - TypeScript interfaces
- `ClassDeclaration` - Classes
- `FunctionDeclaration` - Functions
- `MethodDeclaration` - Class methods
- `PropertyDeclaration` - Class/interface properties
- `VariableDeclaration` - Variables
- `TypeAliasDeclaration` - Type aliases
- `EnumDeclaration` - Enums
- `ImportDeclaration` - Import statements
- `ExportDeclaration` - Export statements
- `SourceFile` - Source files (for file filtering)
- `*` - All nodes (use with caution)

### WHERE Clause

The WHERE clause supports various conditions:

#### Properties

- `name` - Name of the declaration
- `kind` - Node kind name
- `text` - Full text of the node
- `modifier` - Modifiers (public, private, etc.)
- `path` - Full file path (useful for SourceFile queries)
- `baseName` - File name with extension (useful for SourceFile queries)
- `extension` - File extension (useful for SourceFile queries)

#### Operators

- `=` - Exact match
- `!=` - Not equal
- `LIKE` - Pattern matching (supports `%` for any characters, `_` for single character)
- `NOT LIKE` - Negative pattern matching
- `IN` - Match any value in a list
- `NOT IN` - Exclude values in a list

### WITH REFERENCES

Add `WITH REFERENCES` to include all references (usages) of the selected nodes.

## Examples

### Basic Queries

```typescript
// Find all interfaces
const interfaces = selector.query('SELECT * FROM InterfaceDeclaration');

// Find specific interface by name
const user = selector.query("SELECT * FROM InterfaceDeclaration WHERE name = 'User'");

// Find all classes
const classes = selector.query('SELECT * FROM ClassDeclaration');

// Find all functions
const functions = selector.query('SELECT * FROM FunctionDeclaration');
```

### Pattern Matching

```typescript
// Find functions starting with 'test'
const testFns = selector.query("SELECT * FROM FunctionDeclaration WHERE name LIKE 'test%'");

// Find classes ending with 'Service'
const services = selector.query("SELECT * FROM ClassDeclaration WHERE name LIKE '%Service'");

// Find interfaces NOT starting with 'I'
const nonPrefixed = selector.query("SELECT * FROM InterfaceDeclaration WHERE name NOT LIKE 'I%'");
```

### IN Operator

```typescript
// Find specific classes
const result = selector.query(
    "SELECT * FROM ClassDeclaration WHERE name IN ('UserService', 'ProductService')",
);

// Exclude specific functions
const result = selector.query(
    "SELECT * FROM FunctionDeclaration WHERE name NOT IN ('test', 'deprecated')",
);
```

### Multiple Conditions

```typescript
// Combine multiple WHERE conditions with AND
const result = selector.query(
    "SELECT * FROM ClassDeclaration WHERE name LIKE '%Service' AND name != 'BaseService'",
);
```

### File Filtering

Query source files directly using SQL-like syntax:

```typescript
// Find all source files
const allFiles = selector.query('SELECT * FROM SourceFile');

// Find all service files
const serviceFiles = selector.query("SELECT * FROM SourceFile WHERE baseName LIKE '%.service.ts'");

// Find files in specific directory
const modelFiles = selector.query("SELECT * FROM SourceFile WHERE path LIKE '%/models/%'");

// Find specific files
const configFiles = selector.query(
    "SELECT * FROM SourceFile WHERE baseName IN ('config.ts', 'settings.ts')",
);

// Find TypeScript files (exclude .d.ts)
const tsFiles = selector.query(
    "SELECT * FROM SourceFile WHERE extension = '.ts' AND baseName NOT LIKE '%.d.ts'",
);

// Two-step approach: Get files then work with their contents
const files = selector.query("SELECT * FROM SourceFile WHERE baseName LIKE '%.service.ts'");
files.nodes.forEach((file) => {
    const classes = file.getClasses();
    const interfaces = file.getInterfaces();
    // Work with nodes in each file
});
```

### With References

```typescript
// Find interface and all its usages
const result = selector.query(
    "SELECT * FROM InterfaceDeclaration WHERE name = 'User' WITH REFERENCES",
);

console.log(`Found ${result.nodes.length} node(s)`);

if (result.references) {
    result.nodes.forEach((node) => {
        const refs = result.references!.get(node);
        console.log(`${node.getName()} has ${refs?.length || 0} reference(s)`);

        refs?.forEach((ref) => {
            const sourceFile = ref.getSourceFile().getBaseName();
            const line = ref.getStartLineNumber();
            console.log(`  - ${sourceFile}:${line}`);
        });
    });
}
```

## API Reference

### TsMorphSelector

Main class for executing queries.

```typescript
constructor(project: Project, options?: SelectorOptions)
```

#### Methods

##### `query<T extends Node>(queryString: string): QueryResult<T>`

Execute a SQL-like query and return results.

```typescript
const result = selector.query('SELECT * FROM InterfaceDeclaration');
```

##### `validate(queryString: string): { valid: boolean; error?: string }`

Validate a query string without executing it.

```typescript
const validation = selector.validate('SELECT * FROM InterfaceDeclaration');
if (!validation.valid) {
    console.error(validation.error);
}
```

##### `getProject(): Project`

Get the underlying ts-morph Project instance.

```typescript
const project = selector.getProject();
```

### Types

#### `QueryResult<T>`

```typescript
interface QueryResult<T extends Node = Node> {
    nodes: T[];
    references?: Map<T, Node[]>;
}
```

#### `SelectorOptions`

```typescript
interface SelectorOptions {
    includeNodeModules?: boolean;
    maxResults?: number;
}
```

## Advanced Usage

### Limiting Results

```typescript
const selector = new TsMorphSelector(project, {
    maxResults: 10,
});

const result = selector.query('SELECT * FROM InterfaceDeclaration');
// Will return at most 10 results
```

### Working with Results

```typescript
const result = selector.query('SELECT * FROM ClassDeclaration');

result.nodes.forEach((classNode) => {
    console.log(`Class: ${classNode.getName()}`);

    // Access ts-morph node methods
    const methods = classNode.getMethods();
    console.log(`  Methods: ${methods.length}`);

    const properties = classNode.getProperties();
    console.log(`  Properties: ${properties.length}`);

    // Get source file information
    const sourceFile = classNode.getSourceFile();
    console.log(`  File: ${sourceFile.getFilePath()}`);
});
```

### Filtering Results

```typescript
const result = selector.query('SELECT * FROM FunctionDeclaration');

// Filter exported functions
const exported = result.nodes.filter((fn) => fn.isExported());

// Filter async functions
const asyncFns = result.nodes.filter((fn) => fn.isAsync());

// Get function signatures
result.nodes.forEach((fn) => {
    console.log(fn.getName(), fn.getSignature());
});
```

## Examples Directory

Check out the `examples/` directory for more usage examples:

- `basic.ts` - Basic query examples
- `advanced.ts` - Advanced usage patterns
- `interface-with-property-types.ts` - Query interfaces with property type references
- `function-interface-references.ts` - Find all interfaces a function references

Run examples:

```bash
npm run example                  # Basic examples
npm run example:advanced         # Advanced patterns
npm run example:property-types   # Interface property types
npm run example:function-refs    # Function interface dependencies
```

## Advanced Guides

- **[Complete Advanced Analysis Guide](docs/ADVANCED_ANALYSIS.md)** - Complete guide combining interface and function analysis
- **[AI Assistant Usage Guide](docs/AI_USAGE_GUIDE.md)** - Guide for AI assistants and automated systems to leverage this tool
- [Query Interfaces with Property Type References](docs/interface-property-types.md) - Learn how to include references to all property types when querying interfaces
- [Function Interface Dependencies](docs/function-interface-dependencies.md) - Find all interfaces referenced in function parameters and return types

## Quick References

- [Interface Property Types Quick Ref](docs/PROPERTY_TYPES_QUICK_REF.md)
- [Function Interface Refs Quick Ref](docs/FUNCTION_REFS_QUICK_REF.md)
- [FAQ](docs/FAQ.md) - Frequently asked questions and common patterns

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch
```

## Building

```bash
npm run build
```

## Use Cases

### Code Analysis

Find all classes that implement a specific pattern:

```typescript
const services = selector.query("SELECT * FROM ClassDeclaration WHERE name LIKE '%Service'");
```

### Refactoring

Find all usages of a specific interface:

```typescript
const result = selector.query(
    "SELECT * FROM InterfaceDeclaration WHERE name = 'OldInterface' WITH REFERENCES",
);
```

### Documentation Generation

Extract all exported interfaces and their properties:

```typescript
const interfaces = selector.query('SELECT * FROM InterfaceDeclaration');
const exported = interfaces.nodes.filter((i) => i.isExported());
```

### Testing

Find all test functions:

```typescript
const tests = selector.query("SELECT * FROM FunctionDeclaration WHERE name LIKE 'test%'");
```

## Limitations

- OR conditions in WHERE clauses are not yet supported (only AND)
- Complex nested conditions are not supported
- Queries are case-sensitive for node names

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Related Projects

- [ts-morph](https://github.com/dsherret/ts-morph) - TypeScript Compiler API wrapper
- [TypeScript](https://www.typescriptlang.org/) - TypeScript language

## Author

Built with ❤️ for the TypeScript community
