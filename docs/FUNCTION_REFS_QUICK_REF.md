# Function Interface References - Quick Reference

## Question

**How to query all referenced interfaces that a function declaration has in its parameters list or return type?**

## Quick Answer

Use this helper function to extract all interface dependencies from a function:

```typescript
import { FunctionDeclaration, Type, Node } from 'ts-morph';
import { TsMorphSelector } from 'ts-morph-selector';

function getReferencedInterfaces(func: FunctionDeclaration): Set<string> {
    const interfaces = new Set<string>();

    const extractInterfaces = (type: Type): void => {
        // Check if type is an interface
        const symbol = type.getSymbol();
        if (symbol) {
            const declarations = symbol.getDeclarations();
            for (const decl of declarations) {
                if (Node.isInterfaceDeclaration(decl)) {
                    interfaces.add(decl.getName());
                }
            }
        }

        // Handle union types (e.g., User | null)
        if (type.isUnion()) {
            type.getUnionTypes().forEach(extractInterfaces);
        }

        // Handle array types (e.g., User[])
        if (type.isArray()) {
            const elementType = type.getArrayElementType();
            if (elementType) extractInterfaces(elementType);
        }
    };

    // Extract from parameters
    func.getParameters().forEach((param) => {
        extractInterfaces(param.getType());
    });

    // Extract from return type
    extractInterfaces(func.getReturnType());

    return interfaces;
}

// Usage Example 1: Analyze specific function
const func = selector.query<FunctionDeclaration>(
    "SELECT * FROM FunctionDeclaration WHERE name = 'createUser'",
).nodes[0];

const interfaces = getReferencedInterfaces(func);
console.log(`Interfaces: ${Array.from(interfaces).join(', ')}`);
// Output: Interfaces: CreateUserRequest, User, Address

// Usage Example 2: Find functions using specific interface
const allFunctions = selector.query<FunctionDeclaration>('SELECT * FROM FunctionDeclaration');

const functionsUsingUser = allFunctions.nodes.filter((func) =>
    getReferencedInterfaces(func).has('User'),
);

console.log(`${functionsUsingUser.length} functions use "User" interface`);
```

## Complete Analysis with Details

For more detailed analysis including parameter-level breakdown:

```typescript
function analyzeFunction(func: FunctionDeclaration) {
    const analysis = {
        name: func.getName() || 'anonymous',
        parameters: [] as Array<{ name: string; interfaces: string[] }>,
        returnInterfaces: [] as string[],
        allInterfaces: new Set<string>(),
    };

    const extractInterfaces = (type: Type): string[] => {
        const result: string[] = [];
        const symbol = type.getSymbol();

        if (symbol) {
            symbol.getDeclarations().forEach((decl) => {
                if (Node.isInterfaceDeclaration(decl)) {
                    result.push(decl.getName());
                }
            });
        }

        if (type.isUnion()) {
            type.getUnionTypes().forEach((t) => result.push(...extractInterfaces(t)));
        }

        if (type.isArray()) {
            const el = type.getArrayElementType();
            if (el) result.push(...extractInterfaces(el));
        }

        return result;
    };

    // Analyze parameters
    func.getParameters().forEach((param) => {
        const interfaces = extractInterfaces(param.getType());
        analysis.parameters.push({
            name: param.getName(),
            interfaces,
        });
        interfaces.forEach((i) => analysis.allInterfaces.add(i));
    });

    // Analyze return type
    const returnInterfaces = extractInterfaces(func.getReturnType());
    analysis.returnInterfaces = returnInterfaces;
    returnInterfaces.forEach((i) => analysis.allInterfaces.add(i));

    return analysis;
}

// Usage
const func = selector.query<FunctionDeclaration>(
    "SELECT * FROM FunctionDeclaration WHERE name = 'updateUser'",
).nodes[0];

const details = analyzeFunction(func);
console.log(`Function: ${details.name}`);
console.log(`Parameters using interfaces:`);
details.parameters.forEach((p) => {
    if (p.interfaces.length > 0) {
        console.log(`  ${p.name}: ${p.interfaces.join(', ')}`);
    }
});
console.log(`Return type interfaces: ${details.returnInterfaces.join(', ')}`);
console.log(`Total: ${details.allInterfaces.size} unique interfaces`);
```

## Common Use Cases

### 1. Find all functions using an interface

```typescript
const funcsUsingUser = allFunctions.nodes.filter((f) => getReferencedInterfaces(f).has('User'));
```

### 2. Build dependency graph

```typescript
const graph = new Map();
allFunctions.nodes.forEach((func) => {
    graph.set(func.getName(), getReferencedInterfaces(func));
});
```

### 3. Impact analysis before refactoring

```typescript
const interfaces = getReferencedInterfaces(func);
console.log(`This function depends on ${interfaces.size} interfaces`);
```

## Example Output

For this function:

```typescript
function createUser(request: CreateUserRequest): CreateUserResponse {
    // CreateUserRequest has property: address: Address
    // CreateUserResponse has property: user: User
}
```

Output:

```
Function: createUser
Referenced interfaces: CreateUserRequest, Address, CreateUserResponse, User
  Parameters:
    - request → CreateUserRequest, Address
  Return type:
    - CreateUserResponse, User
```

## Run the Example

```bash
npm run example:function-refs
```

This demonstrates:

- Analyzing specific functions
- Finding all functions using an interface
- Building dependency graphs
- Getting interface details with references
- Complete impact analysis

## Learn More

See [docs/function-interface-dependencies.md](function-interface-dependencies.md) for:

- 5 complete methods with code
- Special cases (nested, arrays, unions)
- Advanced use cases
- Performance tips
