# Quick Start Guide

## Installation

```bash
npm install ts-morph-selector ts-morph
```

## Basic Usage

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
const interfaces = selector.query<InterfaceDeclaration>('SELECT * FROM InterfaceDeclaration');
console.log(`Found ${interfaces.nodes.length} interfaces`);

// Query with WHERE clause
const user = selector.query<InterfaceDeclaration>(
    "SELECT * FROM InterfaceDeclaration WHERE name = 'User'",
);

// Query with pattern matching
const services = selector.query<ClassDeclaration>(
    "SELECT * FROM ClassDeclaration WHERE name LIKE '%Service'",
);

// Query with references
const result = selector.query<InterfaceDeclaration>(
    "SELECT * FROM InterfaceDeclaration WHERE name = 'User' WITH REFERENCES",
);
```

## Query Syntax Examples

### Find all classes

```sql
SELECT * FROM ClassDeclaration
```

### Find specific interface by name

```sql
SELECT * FROM InterfaceDeclaration WHERE name = 'User'
```

### Find functions starting with 'test'

```sql
SELECT * FROM FunctionDeclaration WHERE name LIKE 'test%'
```

### Find classes with 'Service' suffix

```sql
SELECT * FROM ClassDeclaration WHERE name LIKE '%Service'
```

### Find multiple specific classes

```sql
SELECT * FROM ClassDeclaration WHERE name IN ('UserService', 'ProductService')
```

### Find class with all references

```sql
SELECT * FROM ClassDeclaration WHERE name = 'MyClass' WITH REFERENCES
```

### Exclude specific items

```sql
SELECT * FROM FunctionDeclaration WHERE name NOT IN ('deprecated', 'legacy')
```

### Multiple conditions

```sql
SELECT * FROM ClassDeclaration WHERE name LIKE '%Service' AND name != 'BaseService'
```

## Supported Node Types

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

## Working with Results

```typescript
import { InterfaceDeclaration } from 'ts-morph';

const result = selector.query<InterfaceDeclaration>('SELECT * FROM InterfaceDeclaration');

result.nodes.forEach((iface) => {
    console.log(`Interface: ${iface.getName()}`);

    // Get properties
    const properties = iface.getProperties();
    console.log(`  Properties: ${properties.length}`);

    // Get source file
    const sourceFile = iface.getSourceFile();
    console.log(`  File: ${sourceFile.getFilePath()}`);
});
```

## Run Examples

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run basic example
npm run example

# Run advanced examples
npm run example:advanced

# Query interfaces with property type references
npm run example:property-types

# Query function interface dependencies
npm run example:function-refs

# Run tests
npm test
```

## Advanced Topics

### Query Interface with Property Type References

When querying interfaces, `WITH REFERENCES` only includes references to the interface itself. To include references to property types:

```typescript
function getInterfaceWithPropertyTypeRefs(interfaceName: string, selector: TsMorphSelector) {
    const result = selector.query<InterfaceDeclaration>(
        `SELECT * FROM InterfaceDeclaration WHERE name = '${interfaceName}' WITH REFERENCES`,
    );

    // Then analyze property types
    const iface = result.nodes[0];
    iface.getProperties().forEach((prop) => {
        const typeSymbol = prop.getType().getSymbol();
        // Find references to this type...
    });
}
```

See [docs/interface-property-types.md](docs/interface-property-types.md) for complete guide.

### Query Function Interface Dependencies

Find all interfaces referenced in a function's parameters and return type:

```typescript
import { FunctionDeclaration, Type, Node } from 'ts-morph';

function getReferencedInterfaces(func: FunctionDeclaration): Set<string> {
    const interfaces = new Set<string>();

    const extractInterfaces = (type: Type): void => {
        const symbol = type.getSymbol();
        if (symbol) {
            symbol.getDeclarations().forEach((decl) => {
                if (Node.isInterfaceDeclaration(decl)) {
                    interfaces.add(decl.getName());
                }
            });
        }

        if (type.isUnion()) type.getUnionTypes().forEach(extractInterfaces);
        if (type.isArray()) {
            const el = type.getArrayElementType();
            if (el) extractInterfaces(el);
        }
    };

    // Extract from parameters and return type
    func.getParameters().forEach((p) => extractInterfaces(p.getType()));
    extractInterfaces(func.getReturnType());

    return interfaces;
}

// Usage
const func = selector.query<FunctionDeclaration>(
    "SELECT * FROM FunctionDeclaration WHERE name = 'createUser'",
).nodes[0];

const interfaces = getReferencedInterfaces(func);
console.log(`Interfaces: ${Array.from(interfaces).join(', ')}`);
```

See [docs/function-interface-dependencies.md](docs/function-interface-dependencies.md) for complete guide.

## Quick References

- [Interface Property Types Quick Ref](docs/PROPERTY_TYPES_QUICK_REF.md)
- [Function Interface Refs Quick Ref](docs/FUNCTION_REFS_QUICK_REF.md)
