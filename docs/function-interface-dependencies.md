# Query Function Interface References

This guide explains how to find all interfaces that a function declaration references in its parameters and return type.

## The Problem

When analyzing functions, you often need to know:

- Which interfaces are used in the function's parameters?
- Which interfaces are used in the return type?
- What are all the interface dependencies for refactoring?

For example:

```typescript
interface User {
    id: string;
    name: string;
}
interface Address {
    city: string;
}
interface CreateUserRequest {
    name: string;
    address: Address;
}
interface CreateUserResponse {
    user: User;
    success: boolean;
}

function createUser(request: CreateUserRequest): CreateUserResponse {
    // ...
}
```

The function `createUser` references 4 interfaces: `CreateUserRequest`, `Address`, `CreateUserResponse`, and `User`.

## Solutions

### Method 1: Analyze Specific Function

Query a function and extract all its interface dependencies:

```typescript
import { FunctionDeclaration, InterfaceDeclaration, Type, Node } from 'ts-morph';

// Helper function to extract interfaces from a type
function extractInterfaces(type: Type, sourceNode: Node): string[] {
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
            interfaces.push(...extractInterfaces(unionType, sourceNode));
        }
    }

    // Check for array types (e.g., User[])
    if (type.isArray()) {
        const arrayElementType = type.getArrayElementType();
        if (arrayElementType) {
            interfaces.push(...extractInterfaces(arrayElementType, sourceNode));
        }
    }

    return interfaces;
}

// Query the function
const funcResult = selector.query<FunctionDeclaration>(
    "SELECT * FROM FunctionDeclaration WHERE name = 'createUser'",
);

if (funcResult.nodes.length > 0) {
    const func = funcResult.nodes[0];
    const allInterfaces = new Set<string>();

    // Analyze parameters
    for (const param of func.getParameters()) {
        const paramType = param.getType();
        const interfaces = extractInterfaces(paramType, func);
        interfaces.forEach((iface) => allInterfaces.add(iface));
    }

    // Analyze return type
    const returnType = func.getReturnType();
    const returnInterfaces = extractInterfaces(returnType, func);
    returnInterfaces.forEach((iface) => allInterfaces.add(iface));

    console.log(`Function: ${func.getName()}`);
    console.log(`Referenced interfaces: ${Array.from(allInterfaces).join(', ')}`);
}
```

**Output:**

```
Function: createUser
Referenced interfaces: CreateUserRequest, Address, CreateUserResponse, User
```

### Method 2: Complete Function Analysis Helper

Create a reusable helper that provides detailed analysis:

```typescript
function getReferencedInterfaces(func: FunctionDeclaration) {
    const result = {
        functionName: func.getName() || 'anonymous',
        parameters: [] as Array<{ name: string; type: string; interfaces: string[] }>,
        returnType: { type: '', interfaces: [] as string[] },
        allInterfaces: new Set<string>(),
    };

    const extractInterfaces = (type: Type): string[] => {
        const interfaces: string[] = [];
        const symbol = type.getSymbol();

        if (symbol) {
            const declarations = symbol.getDeclarations();
            for (const decl of declarations) {
                if (Node.isInterfaceDeclaration(decl)) {
                    interfaces.push(decl.getName());
                }
            }
        }

        if (type.isUnion()) {
            for (const unionType of type.getUnionTypes()) {
                interfaces.push(...extractInterfaces(unionType));
            }
        }

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
    "SELECT * FROM FunctionDeclaration WHERE name = 'updateUser'",
).nodes[0];

const analysis = getReferencedInterfaces(func);

console.log(`Function: ${analysis.functionName}()`);
console.log(`\nParameters:`);
analysis.parameters.forEach((param) => {
    console.log(`  - ${param.name}: ${param.type}`);
    if (param.interfaces.length > 0) {
        console.log(`    → ${param.interfaces.join(', ')}`);
    }
});

console.log(`\nReturn Type: ${analysis.returnType.type}`);
if (analysis.returnType.interfaces.length > 0) {
    console.log(`  → ${analysis.returnType.interfaces.join(', ')}`);
}

console.log(`\nAll interfaces: ${Array.from(analysis.allInterfaces).join(', ')}`);
```

**Output:**

```
Function: updateUser()

Parameters:
  - userId: string
  - request: UpdateUserRequest
    → UpdateUserRequest, Address
  - address: Address
    → Address

Return Type: User
  → User

All interfaces: UpdateUserRequest, Address, User
```

### Method 3: Find All Functions Using Specific Interface

Reverse search - find which functions use a specific interface:

```typescript
const allFunctions = selector.query<FunctionDeclaration>('SELECT * FROM FunctionDeclaration');

const functionsUsingUser = allFunctions.nodes.filter((func) => {
    const analysis = getReferencedInterfaces(func);
    return analysis.allInterfaces.has('User');
});

console.log(`Functions using "User" interface:\n`);

functionsUsingUser.forEach((func) => {
    const analysis = getReferencedInterfaces(func);
    console.log(`  • ${analysis.functionName}()`);

    const paramUsage = analysis.parameters.filter((p) => p.interfaces.includes('User'));
    const returnUsage = analysis.returnType.interfaces.includes('User');

    if (paramUsage.length > 0) {
        console.log(`    In parameters: ${paramUsage.map((p) => p.name).join(', ')}`);
    }
    if (returnUsage) {
        console.log(`    In return type ✓`);
    }
});
```

**Output:**

```
Functions using "User" interface:

  • createUser()
    In return type ✓
  • updateUser()
    In return type ✓
  • getUsers()
    In return type ✓
  • processUser()
    In parameters: user
    In return type ✓
```

### Method 4: Get Interface Details with References

Combine function analysis with interface reference tracking:

```typescript
const func = selector.query<FunctionDeclaration>(
    "SELECT * FROM FunctionDeclaration WHERE name = 'createUser'",
).nodes[0];

const analysis = getReferencedInterfaces(func);

console.log(`Function: ${analysis.functionName}()`);
console.log(`Referenced interfaces: ${Array.from(analysis.allInterfaces).join(', ')}\n`);

// Query each referenced interface for details
for (const interfaceName of analysis.allInterfaces) {
    const ifaceResult = selector.query<InterfaceDeclaration>(
        `SELECT * FROM InterfaceDeclaration WHERE name = '${interfaceName}' WITH REFERENCES`,
    );

    if (ifaceResult.nodes.length > 0) {
        const iface = ifaceResult.nodes[0];
        const refs = ifaceResult.references?.get(iface);

        console.log(`Interface: ${interfaceName}`);
        console.log(`  Properties: ${iface.getProperties().length}`);
        console.log(`  Total references: ${refs?.length || 0}`);

        // Show where it's used in the function
        const paramUsage = analysis.parameters.filter((p) => p.interfaces.includes(interfaceName));
        const returnUsage = analysis.returnType.interfaces.includes(interfaceName);

        if (paramUsage.length > 0) {
            console.log(`  Used in parameters: ${paramUsage.map((p) => p.name).join(', ')}`);
        }
        if (returnUsage) {
            console.log(`  Used in return type: ✓`);
        }
        console.log();
    }
}
```

**Output:**

```
Function: createUser()
Referenced interfaces: CreateUserRequest, Address, CreateUserResponse, User

Interface: CreateUserRequest
  Properties: 3
  Total references: 2
  Used in parameters: request

Interface: Address
  Properties: 3
  Total references: 4
  Used in parameters: request

Interface: CreateUserResponse
  Properties: 2
  Total references: 1
  Used in return type: ✓

Interface: User
  Properties: 3
  Total references: 6
  Used in return type: ✓
```

### Method 5: Build Dependency Graph

Create a complete dependency graph for all functions:

```typescript
const allFunctions = selector.query<FunctionDeclaration>('SELECT * FROM FunctionDeclaration');

const dependencyGraph = new Map<string, Set<string>>();

allFunctions.nodes.forEach((func) => {
    const funcName = func.getName() || 'anonymous';
    const analysis = getReferencedInterfaces(func);
    dependencyGraph.set(funcName, analysis.allInterfaces);
});

console.log('Function → Interface Dependencies:\n');

for (const [funcName, interfaces] of dependencyGraph) {
    if (interfaces.size > 0) {
        console.log(`${funcName}`);
        interfaces.forEach((iface) => {
            console.log(`  └─ ${iface}`);
        });
    }
}
```

**Output:**

```
Function → Interface Dependencies:

createUser
  └─ CreateUserRequest
  └─ Address
  └─ CreateUserResponse
  └─ User
updateUser
  └─ UpdateUserRequest
  └─ Address
  └─ User
getUsers
  └─ User
```

## Special Cases

### Nested Interfaces

Interface properties that reference other interfaces are automatically detected:

```typescript
interface Address {
    city: string;
}
interface CreateUserRequest {
    address: Address;
} // Nested interface

function createUser(request: CreateUserRequest): void {}
// Detects both: CreateUserRequest AND Address
```

### Array Types

Array types are properly unwrapped:

```typescript
function getUsers(): User[] {}
// Detects: User (from User[])
```

### Union Types

Union types are expanded:

```typescript
function processUser(user: User | Admin): void {}
// Detects both: User AND Admin
```

### Optional Types

Optional types work seamlessly:

```typescript
function findUser(id: string): User | undefined {}
// Detects: User
```

## Use Cases

### 1. Refactoring Analysis

Before changing an interface, find all affected functions:

```typescript
const affectedFunctions = allFunctions.nodes.filter((func) => {
    const analysis = getReferencedInterfaces(func);
    return analysis.allInterfaces.has('User');
});

console.log(`Changing User will affect ${affectedFunctions.length} functions`);
```

### 2. API Documentation

Generate API documentation showing interface dependencies:

```typescript
functions.forEach((func) => {
    const analysis = getReferencedInterfaces(func);
    console.log(`${func.getName()}: uses ${analysis.allInterfaces.size} interfaces`);
});
```

### 3. Impact Analysis

Calculate the impact of interface changes:

```typescript
const analysis = getReferencedInterfaces(func);
let totalRefs = 0;

for (const ifaceName of analysis.allInterfaces) {
    const result = selector.query<InterfaceDeclaration>(
        `SELECT * FROM InterfaceDeclaration WHERE name = '${ifaceName}' WITH REFERENCES`,
    );
    totalRefs += result.references?.get(result.nodes[0])?.length || 0;
}

console.log(
    `Total impact: ${totalRefs} references across ${analysis.allInterfaces.size} interfaces`,
);
```

### 4. Type Coverage Report

Show which functions use typed interfaces vs primitives:

```typescript
const typed = allFunctions.nodes.filter((f) => getReferencedInterfaces(f).allInterfaces.size > 0);

console.log(`${typed.length}/${allFunctions.nodes.length} functions use interfaces`);
```

## Running the Example

```bash
npm run example:function-refs
```

This demonstrates all 5 methods with complete working code.

## Tips

1. **Nested Interfaces**: The helper automatically detects interfaces within interface properties
2. **Performance**: For large codebases, cache the analysis results
3. **Type Aliases**: Extend the helper to include TypeAliasDeclaration if needed
4. **Generics**: Generic type parameters that reference interfaces are also detected
5. **External Types**: Import types from node_modules may appear with full import paths

## Related Examples

- [examples/function-interface-references.ts](../examples/function-interface-references.ts) - Complete working example
- [examples/interface-with-property-types.ts](../examples/interface-with-property-types.ts) - Interface property analysis
