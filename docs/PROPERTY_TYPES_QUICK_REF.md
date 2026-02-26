# Query Interface with Property Type References - Quick Reference

## Question

**How to query an interface with all its property types' references being included?**

## Answer

The `WITH REFERENCES` clause only includes references to the interface itself, not its property types. Here are three approaches:

### 🎯 Quick Solution (Recommended)

Use this helper function:

```typescript
import { InterfaceDeclaration } from 'ts-morph';
import { TsMorphSelector } from 'ts-morph-selector';

function getInterfaceWithPropertyTypeRefs(interfaceName: string, selector: TsMorphSelector) {
    const result = selector.query<InterfaceDeclaration>(
        `SELECT * FROM InterfaceDeclaration WHERE name = '${interfaceName}' WITH REFERENCES`,
    );

    if (result.nodes.length === 0) return null;

    const iface = result.nodes[0];
    const propertyTypeRefs = new Map<string, number>();

    // Get references for each property type
    iface.getProperties().forEach((prop) => {
        const typeSymbol = prop.getType().getSymbol();

        if (typeSymbol) {
            const declarations = typeSymbol.getDeclarations();
            let totalRefs = 0;

            declarations.forEach((decl) => {
                if ('findReferences' in decl) {
                    const refEntries = (decl as any).findReferences();
                    refEntries.forEach((entry: any) => {
                        totalRefs += entry.getReferences().length;
                    });
                }
            });

            propertyTypeRefs.set(prop.getName(), totalRefs);
        }
    });

    return {
        interface: iface,
        interfaceRefs: result.references?.get(iface)?.length || 0,
        propertyTypeRefs,
    };
}

// Usage
const result = getInterfaceWithPropertyTypeRefs('User', selector);

if (result) {
    console.log(`Interface ${result.interface.getName()}: ${result.interfaceRefs} refs`);

    result.propertyTypeRefs.forEach((refCount, propName) => {
        console.log(`  Property "${propName}" type: ${refCount} refs`);
    });
}
```

### 💡 Simple Two-Step Approach

If you know the property type names:

```typescript
// Step 1: Query the interface
const user = selector.query<InterfaceDeclaration>(
    "SELECT * FROM InterfaceDeclaration WHERE name = 'User' WITH REFERENCES",
);

// Step 2: Query each property type separately
const userProfile = selector.query<InterfaceDeclaration>(
    "SELECT * FROM InterfaceDeclaration WHERE name = 'UserProfile' WITH REFERENCES",
);

const userId = selector.query<TypeAliasDeclaration>(
    "SELECT * FROM TypeAliasDeclaration WHERE name = 'UserId' WITH REFERENCES",
);
```

## Example Output

```
Interface: User
Direct references: 6
Properties:
  - id: UserId (5 references)
  - name: string (0 references)
  - profile: UserProfile (5 references)
  - permissions: Permission[] (4 references)
Total: 20 references (6 + 14 from property types)
```

## Run the Full Example

```bash
npm run example:property-types
```

## Learn More

See [docs/interface-property-types.md](../docs/interface-property-types.md) for:

- Three detailed approaches
- Complete working code
- Use cases and tips
- Performance considerations
