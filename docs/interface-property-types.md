# Querying Interfaces with Property Type References

This guide explains how to query an interface and include references to all its property types.

## The Problem

When you query an interface with `WITH REFERENCES`, you get references to the interface itself, but not to the types used in its properties. For example:

```typescript
interface User {
    id: UserId;
    profile: UserProfile;
}

interface UserProfile {
    name: string;
}

type UserId = string;
```

If you query `User` with `WITH REFERENCES`, you'll get places where `User` is used, but not where `UserProfile` or `UserId` are referenced.

## Solutions

### Method 1: Manual Traversal (Most Control)

Query the interface and manually traverse its properties to find type references:

```typescript
import { InterfaceDeclaration, Node } from 'ts-morph';

const userInterface = selector.query<InterfaceDeclaration>(
    "SELECT * FROM InterfaceDeclaration WHERE name = 'User'",
);

if (userInterface.nodes.length > 0) {
    const iface = userInterface.nodes[0];
    const properties = iface.getProperties();
    const propertyTypeReferences = new Map<string, Node[]>();

    for (const prop of properties) {
        const propType = prop.getType();
        const propTypeText = propType.getText();
        const typeSymbol = propType.getSymbol();

        if (typeSymbol) {
            const declarations = typeSymbol.getDeclarations();

            for (const decl of declarations) {
                if (
                    'findReferences' in decl &&
                    typeof (decl as any).findReferences === 'function'
                ) {
                    const refEntries = (decl as any).findReferences();
                    const refs: Node[] = [];

                    for (const refEntry of refEntries) {
                        for (const ref of refEntry.getReferences()) {
                            const refNode = ref.getNode();
                            if (refNode) {
                                refs.push(refNode);
                            }
                        }
                    }

                    if (refs.length > 0) {
                        propertyTypeReferences.set(propTypeText, refs);
                        console.log(`Type "${propTypeText}" has ${refs.length} references`);
                    }
                }
            }
        }
    }
}
```

**Pros:**

- Full control over the process
- Can filter and customize behavior
- Access to all property type information

**Cons:**

- More verbose code
- Need to handle different type scenarios

### Method 2: Two-Step Query (Simpler)

First query the interface, then separately query each property type:

```typescript
// Step 1: Query the interface
const userWithRefs = selector.query<InterfaceDeclaration>(
    "SELECT * FROM InterfaceDeclaration WHERE name = 'User' WITH REFERENCES",
);

// Step 2: Query property types (if you know their names)
const propertyTypeNames = ['UserProfile', 'UserId'];

for (const typeName of propertyTypeNames) {
    // Try as interface
    let ifaceResult = selector.query<InterfaceDeclaration>(
        `SELECT * FROM InterfaceDeclaration WHERE name = '${typeName}' WITH REFERENCES`,
    );

    if (ifaceResult.nodes.length > 0) {
        const refs = ifaceResult.references?.get(ifaceResult.nodes[0]);
        console.log(`${typeName}: ${refs?.length || 0} references`);
    } else {
        // Try as type alias
        const typeResult = selector.query<TypeAliasDeclaration>(
            `SELECT * FROM TypeAliasDeclaration WHERE name = '${typeName}' WITH REFERENCES`,
        );

        if (typeResult.nodes.length > 0) {
            const refs = typeResult.references?.get(typeResult.nodes[0]);
            console.log(`${typeName}: ${refs?.length || 0} references`);
        }
    }
}
```

**Pros:**

- Cleaner, more SQL-like approach
- Easier to understand
- Leverages existing query system

**Cons:**

- Need to know property type names beforehand
- Requires multiple queries
- Must handle both interfaces and type aliases

### Method 3: Helper Function (Recommended)

Create a reusable helper function for complete analysis:

```typescript
function analyzeInterfaceWithPropertyTypes(interfaceName: string, selector: TsMorphSelector) {
    // Query the interface with its references
    const result = selector.query<InterfaceDeclaration>(
        `SELECT * FROM InterfaceDeclaration WHERE name = '${interfaceName}' WITH REFERENCES`,
    );

    if (result.nodes.length === 0) {
        return null;
    }

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

**Output:**

```
Interface: User
Direct references: 6
Properties:
  - id: string (0 refs)
  - name: string (0 refs)
  - profile: UserProfile (5 refs)
  - permissions: Permission[] (4 refs)
Total: 15 references
```

**Pros:**

- Reusable and encapsulated
- Returns structured data
- Easy to integrate into other tools

**Cons:**

- Still somewhat complex internally

## Running the Example

```bash
npm run example:property-types
```

This will demonstrate all three methods with sample code.

## Use Cases

### 1. Refactoring Analysis

Find all usages of an interface and its property types before making breaking changes:

```typescript
const analysis = analyzeInterfaceWithPropertyTypes('User', selector);
console.log(`Total impact: ${analysis.allReferencesCount} references`);
```

### 2. Type Dependency Graph

Build a dependency graph showing which types are used and where:

```typescript
const iface = selector.query<InterfaceDeclaration>("SELECT * FROM InterfaceDeclaration WHERE name = 'User'").nodes[0];
const properties = iface.getProperties();

const graph = properties.map(prop => ({
  property: prop.getName(),
  type: prop.getType().getText(),
  usageCount: /* count references */
}));
```

### 3. Documentation Generation

Generate comprehensive API documentation including usage statistics:

```typescript
const analysis = analyzeInterfaceWithPropertyTypes('User', selector);
// Generate markdown: "User interface (6 direct uses, 15 total uses)"
```

## Tips

1. **Primitive Types**: Built-in types like `string`, `number` will have 0 references through this method
2. **Array Types**: Array types like `Type[]` reference both the element type and Array
3. **Import Paths**: Type references include the full import path in their text representation
4. **Performance**: For large codebases, consider caching results
5. **Type vs Interface**: Remember to check both InterfaceDeclaration and TypeAliasDeclaration

## Related Examples

- [examples/basic.ts](../examples/basic.ts) - Basic query examples
- [examples/advanced.ts](../examples/advanced.ts) - Advanced patterns
- [examples/interface-with-property-types.ts](../examples/interface-with-property-types.ts) - Full working example
