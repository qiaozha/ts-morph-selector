# Complete Guide: Advanced Interface and Function Analysis

This document provides complete solutions for two common advanced use cases with ts-morph-selector.

## Table of Contents

1. [Query Interface with Property Type References](#query-interface-with-property-type-references)
2. [Query Function Interface Dependencies](#query-function-interface-dependencies)
3. [Combined Example: Complete API Analysis](#combined-example-complete-api-analysis)

---

## Query Interface with Property Type References

### Problem

`WITH REFERENCES` only includes references to the interface itself, not to the types used in its properties.

### Solution

```typescript
import { InterfaceDeclaration, Type, Node } from 'ts-morph';
import { TsMorphSelector } from 'ts-morph-selector';

function analyzeInterfaceWithPropertyTypes(interfaceName: string, selector: TsMorphSelector) {
    const result = selector.query<InterfaceDeclaration>(
        `SELECT * FROM InterfaceDeclaration WHERE name = '${interfaceName}' WITH REFERENCES`,
    );

    if (result.nodes.length === 0) return null;

    const iface = result.nodes[0];
    const analysis = {
        interface: interfaceName,
        directReferences: result.references?.get(iface)?.length || 0,
        properties: [] as Array<{
            name: string;
            type: string;
            typeReferences: number;
        }>,
        allReferencesCount: 0,
    };

    // Analyze each property
    const properties = iface.getProperties();

    for (const prop of properties) {
        const propType = prop.getType();
        const propTypeText = propType.getText();
        const typeSymbol = propType.getSymbol();

        let typeRefCount = 0;

        if (typeSymbol) {
            const declarations = typeSymbol.getDeclarations();

            for (const decl of declarations) {
                if (
                    'findReferences' in decl &&
                    typeof (decl as any).findReferences === 'function'
                ) {
                    const refEntries = (decl as any).findReferences();

                    for (const refEntry of refEntries) {
                        typeRefCount += refEntry.getReferences().length;
                    }
                }
            }
        }

        analysis.properties.push({
            name: prop.getName(),
            type: propTypeText,
            typeReferences: typeRefCount,
        });

        analysis.allReferencesCount += typeRefCount;
    }

    analysis.allReferencesCount += analysis.directReferences;

    return analysis;
}

// Usage
const analysis = analyzeInterfaceWithPropertyTypes('User', selector);

if (analysis) {
    console.log(`Interface: ${analysis.interface}`);
    console.log(`Direct references: ${analysis.directReferences}`);
    console.log(`Properties:`);

    for (const prop of analysis.properties) {
        console.log(`  - ${prop.name}: ${prop.type} (${prop.typeReferences} refs)`);
    }

    console.log(`Total: ${analysis.allReferencesCount} references`);
}
```

**See:** [docs/interface-property-types.md](interface-property-types.md) for complete guide.

---

## Query Function Interface Dependencies

### Problem

Need to find all interfaces that a function uses in its parameters and return type.

### Solution

```typescript
import { FunctionDeclaration, Type, Node } from 'ts-morph';
import { TsMorphSelector } from 'ts-morph-selector';

function getReferencedInterfaces(func: FunctionDeclaration) {
    const result = {
        functionName: func.getName() || 'anonymous',
        parameters: [] as Array<{ name: string; type: string; interfaces: string[] }>,
        returnType: { type: '', interfaces: [] as string[] },
        allInterfaces: new Set<string>(),
    };

    const extractInterfaces = (type: Type): string[] => {
        const interfaces: string[] = [];

        // Check if this type is an interface
        const symbol = type.getSymbol();
        if (symbol) {
            const declarations = symbol.getDeclarations();
            for (const decl of declarations) {
                if (Node.isInterfaceDeclaration(decl)) {
                    interfaces.push(decl.getName());
                }
            }
        }

        // Check for union types (e.g., User | null)
        if (type.isUnion()) {
            for (const unionType of type.getUnionTypes()) {
                interfaces.push(...extractInterfaces(unionType));
            }
        }

        // Check for array types (e.g., User[])
        if (type.isArray()) {
            const arrayElementType = type.getArrayElementType();
            if (arrayElementType) {
                interfaces.push(...extractInterfaces(arrayElementType));
            }
        }

        return interfaces;
    };

    // Analyze parameters
    for (const param of func.getParameters()) {
        const paramType = param.getType();
        const interfaces = extractInterfaces(paramType);

        result.parameters.push({
            name: param.getName(),
            type: paramType.getText(),
            interfaces,
        });

        interfaces.forEach((iface) => result.allInterfaces.add(iface));
    }

    // Analyze return type
    const returnType = func.getReturnType();
    const returnInterfaces = extractInterfaces(returnType);

    result.returnType = {
        type: returnType.getText(),
        interfaces: returnInterfaces,
    };

    returnInterfaces.forEach((iface) => result.allInterfaces.add(iface));

    return result;
}

// Usage
const func = selector.query<FunctionDeclaration>(
    "SELECT * FROM FunctionDeclaration WHERE name = 'createUser'",
).nodes[0];

const analysis = getReferencedInterfaces(func);

console.log(`Function: ${analysis.functionName}()`);
console.log(`\nParameters:`);
analysis.parameters.forEach((param) => {
    console.log(`  - ${param.name}: ${param.type}`);
    if (param.interfaces.length > 0) {
        console.log(`    Interfaces: ${param.interfaces.join(', ')}`);
    }
});

console.log(`\nReturn Type: ${analysis.returnType.type}`);
if (analysis.returnType.interfaces.length > 0) {
    console.log(`  Interfaces: ${analysis.returnType.interfaces.join(', ')}`);
}

console.log(`\nAll interfaces: ${Array.from(analysis.allInterfaces).join(', ')}`);
```

**See:** [docs/function-interface-dependencies.md](function-interface-dependencies.md) for complete guide.

---

## Combined Example: Complete API Analysis

Here's how to combine both techniques for comprehensive API analysis:

```typescript
import { Project, FunctionDeclaration, InterfaceDeclaration } from 'ts-morph';
import { TsMorphSelector } from 'ts-morph-selector';

const project = new Project({ tsConfigFilePath: './tsconfig.json' });
const selector = new TsMorphSelector(project);

// Step 1: Find all API functions
const apiFunctions = selector.query<FunctionDeclaration>('SELECT * FROM FunctionDeclaration');

console.log('=== Complete API Analysis ===\n');

for (const func of apiFunctions.nodes) {
    const funcAnalysis = getReferencedInterfaces(func);

    console.log(`\n📝 Function: ${funcAnalysis.functionName}()`);
    console.log(`   Uses ${funcAnalysis.allInterfaces.size} interface(s)\n`);

    // Step 2: Analyze each interface used by this function
    for (const interfaceName of funcAnalysis.allInterfaces) {
        const ifaceAnalysis = analyzeInterfaceWithPropertyTypes(interfaceName, selector);

        if (ifaceAnalysis) {
            console.log(`   Interface: ${interfaceName}`);
            console.log(`     Direct references: ${ifaceAnalysis.directReferences}`);
            console.log(`     Properties: ${ifaceAnalysis.properties.length}`);

            // Show which properties use other interfaces
            const nestedInterfaces = ifaceAnalysis.properties.filter((p) => p.typeReferences > 0);

            if (nestedInterfaces.length > 0) {
                console.log(`     Nested interface properties:`);
                nestedInterfaces.forEach((p) => {
                    console.log(`       - ${p.name}: ${p.type} (${p.typeReferences} refs)`);
                });
            }

            console.log(`     Total impact: ${ifaceAnalysis.allReferencesCount} references\n`);
        }
    }

    console.log('   ' + '─'.repeat(60));
}

// Summary statistics
console.log('\n=== Summary ===');
const allInterfaces = new Set<string>();
apiFunctions.nodes.forEach((func) => {
    const analysis = getReferencedInterfaces(func);
    analysis.allInterfaces.forEach((i) => allInterfaces.add(i));
});

console.log(`Total functions analyzed: ${apiFunctions.nodes.length}`);
console.log(`Total unique interfaces used: ${allInterfaces.size}`);
console.log(`Interfaces: ${Array.from(allInterfaces).join(', ')}`);
```

### Example Output

```
=== Complete API Analysis ===

📝 Function: createUser()
   Uses 4 interface(s)

   Interface: CreateUserRequest
     Direct references: 2
     Properties: 3
     Nested interface properties:
       - address: Address (4 refs)
     Total impact: 6 references

   Interface: Address
     Direct references: 4
     Properties: 3
     Total impact: 4 references

   Interface: CreateUserResponse
     Direct references: 1
     Properties: 2
     Nested interface properties:
       - user: User (6 refs)
     Total impact: 7 references

   Interface: User
     Direct references: 6
     Properties: 3
     Total impact: 6 references

   ────────────────────────────────────────────────────────────

=== Summary ===
Total functions analyzed: 5
Total unique interfaces used: 7
Interfaces: User, Address, CreateUserRequest, CreateUserResponse, ...
```

---

## Quick Commands

```bash
# Run interface property types example
npm run example:property-types

# Run function interface references example
npm run example:function-refs

# Build project
npm run build

# Run tests
npm test
```

## Quick Reference Documents

- [Interface Property Types Quick Ref](PROPERTY_TYPES_QUICK_REF.md)
- [Function Interface Refs Quick Ref](FUNCTION_REFS_QUICK_REF.md)

## Use Cases

### 1. Refactoring Impact Analysis

Before changing an interface, see all affected functions and their dependencies:

```typescript
const interfaceAnalysis = analyzeInterfaceWithPropertyTypes('User', selector);
const functionsUsing = allFunctions.nodes.filter((f) =>
    getReferencedInterfaces(f).allInterfaces.has('User'),
);

console.log(`Changing "User" will affect:`);
console.log(`  - ${functionsUsing.length} functions`);
console.log(`  - ${interfaceAnalysis.allReferencesCount} total references`);
```

### 2. API Documentation Generation

Generate comprehensive API docs with full dependency information:

```typescript
apiFunctions.nodes.forEach((func) => {
    const analysis = getReferencedInterfaces(func);
    // Generate markdown: function signature, used interfaces, etc.
});
```

### 3. Dependency Graph Visualization

Build a complete dependency graph:

```typescript
const graph = {
    functions: new Map(),
    interfaces: new Map(),
};

apiFunctions.nodes.forEach((func) => {
    const funcAnalysis = getReferencedInterfaces(func);
    graph.functions.set(func.getName(), funcAnalysis.allInterfaces);

    funcAnalysis.allInterfaces.forEach((ifaceName) => {
        const ifaceAnalysis = analyzeInterfaceWithPropertyTypes(ifaceName, selector);
        graph.interfaces.set(ifaceName, ifaceAnalysis);
    });
});

// Export as JSON, render as diagram, etc.
```

### 4. Breaking Change Detection

Identify potential breaking changes:

```typescript
const analysis = analyzeInterfaceWithPropertyTypes('User', selector);

if (analysis.allReferencesCount > 50) {
    console.warn(`⚠️ "User" has ${analysis.allReferencesCount} references - high impact change!`);
}
```

---

## Learn More

- [README.md](../README.md) - Main documentation
- [QUICKSTART.md](../QUICKSTART.md) - Quick start guide
- [examples/](../examples/) - Complete working examples
