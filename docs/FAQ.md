# TS-Morph Selector: FAQ & Common Patterns

## Frequently Asked Questions

### Q1: How do I query an interface with all its property types' references included?

**Short Answer:**

```typescript
const analysis = analyzeInterfaceWithPropertyTypes('User', selector);
// Returns: interface + all property type references
```

**Use this helper:**

```typescript
function analyzeInterfaceWithPropertyTypes(interfaceName: string, selector: TsMorphSelector) {
    const result = selector.query<InterfaceDeclaration>(
        `SELECT * FROM InterfaceDeclaration WHERE name = '${interfaceName}' WITH REFERENCES`,
    );

    if (result.nodes.length === 0) return null;

    const iface = result.nodes[0];
    const properties = iface.getProperties();

    // For each property, find its type's references
    properties.forEach((prop) => {
        const typeSymbol = prop.getType().getSymbol();
        if (typeSymbol) {
            typeSymbol.getDeclarations().forEach((decl) => {
                if ('findReferences' in decl) {
                    // Count references to this type
                }
            });
        }
    });

    return analysis;
}
```

**Full Guide:** [docs/interface-property-types.md](interface-property-types.md)  
**Quick Ref:** [docs/PROPERTY_TYPES_QUICK_REF.md](PROPERTY_TYPES_QUICK_REF.md)  
**Example:** `npm run example:property-types`

---

### Q2: How do I query all referenced interfaces that a function declaration has in its parameters list or return type?

**Short Answer:**

```typescript
const interfaces = getReferencedInterfaces(func);
// Returns: Set of all interface names used in function
```

**Use this helper:**

```typescript
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

        // Handle unions, arrays, etc.
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
```

**Full Guide:** [docs/function-interface-dependencies.md](function-interface-dependencies.md)  
**Quick Ref:** [docs/FUNCTION_REFS_QUICK_REF.md](FUNCTION_REFS_QUICK_REF.md)  
**Example:** `npm run example:function-refs`

---

### Q3: How do I combine both to analyze an entire API?

**Answer:**

```typescript
// 1. Get all functions
const functions = selector.query<FunctionDeclaration>('SELECT * FROM FunctionDeclaration');

// 2. For each function, get interface dependencies
functions.nodes.forEach((func) => {
    const funcAnalysis = getReferencedInterfaces(func);

    // 3. For each interface, analyze its property types
    funcAnalysis.allInterfaces.forEach((ifaceName) => {
        const ifaceAnalysis = analyzeInterfaceWithPropertyTypes(ifaceName, selector);
        // Now you have complete dependency information
    });
});
```

**Full Guide:** [docs/ADVANCED_ANALYSIS.md](ADVANCED_ANALYSIS.md)

---

## Common Patterns

### Pattern 1: Find Functions Using Specific Interface

```typescript
const allFunctions = selector.query<FunctionDeclaration>('SELECT * FROM FunctionDeclaration');

const functionsUsingUser = allFunctions.nodes.filter((func) => {
    const analysis = getReferencedInterfaces(func);
    return analysis.allInterfaces.has('User');
});

console.log(`${functionsUsingUser.length} functions use "User" interface`);
```

### Pattern 2: Impact Analysis Before Refactoring

```typescript
// Analyze interface
const ifaceAnalysis = analyzeInterfaceWithPropertyTypes('User', selector);

// Find affected functions
const affectedFunctions = allFunctions.nodes.filter((f) =>
    getReferencedInterfaces(f).allInterfaces.has('User'),
);

console.log(`Changing "User" will affect:`);
console.log(`  - ${ifaceAnalysis.allReferencesCount} total references`);
console.log(`  - ${affectedFunctions.length} functions`);
```

### Pattern 3: Build Dependency Graph

```typescript
const graph = new Map<string, Set<string>>();

allFunctions.nodes.forEach((func) => {
    const analysis = getReferencedInterfaces(func);
    graph.set(func.getName()!, analysis.allInterfaces);
});

// Visualize or export
for (const [funcName, interfaces] of graph) {
    console.log(`${funcName} → ${Array.from(interfaces).join(', ')}`);
}
```

### Pattern 4: Find Nested Interface Dependencies

```typescript
const analysis = analyzeInterfaceWithPropertyTypes('CreateUserRequest', selector);

// Find properties that use other interfaces
const nestedInterfaces = analysis.properties.filter((p) => p.typeReferences > 0);

console.log('Properties with interface types:');
nestedInterfaces.forEach((p) => {
    console.log(`  ${p.name}: ${p.type} (${p.typeReferences} refs)`);
});
```

### Pattern 5: Validate API Consistency

```typescript
// Ensure all functions use typed interfaces
const allFunctions = selector.query<FunctionDeclaration>('SELECT * FROM FunctionDeclaration');

const untyped = allFunctions.nodes.filter((func) => {
    const analysis = getReferencedInterfaces(func);
    return analysis.allInterfaces.size === 0;
});

if (untyped.length > 0) {
    console.warn(`${untyped.length} functions don't use interface types`);
    untyped.forEach((f) => console.warn(`  - ${f.getName()}`));
}
```

---

## Quick Reference

| Task                     | Command                          | Documentation                                                            |
| ------------------------ | -------------------------------- | ------------------------------------------------------------------------ |
| Basic queries            | `npm run example`                | [README.md](../README.md)                                                |
| Interface property types | `npm run example:property-types` | [interface-property-types.md](interface-property-types.md)               |
| Function interface refs  | `npm run example:function-refs`  | [function-interface-dependencies.md](function-interface-dependencies.md) |
| Complete analysis        | See examples                     | [ADVANCED_ANALYSIS.md](ADVANCED_ANALYSIS.md)                             |

---

## Special Cases Handled

✅ **Nested Interfaces** - Interfaces within interface properties  
✅ **Array Types** - `User[]` → extracts `User`  
✅ **Union Types** - `User | Admin` → extracts both  
✅ **Optional Types** - `User | undefined` → extracts `User`  
✅ **Generic Types** - Type parameters referencing interfaces  
✅ **Import Paths** - Handles fully qualified import paths

---

## Troubleshooting

### "Property 'getName' does not exist on type 'Node'"

**Solution:** Use proper type annotations:

```typescript
const result = selector.query<InterfaceDeclaration>('SELECT * FROM InterfaceDeclaration');
// Not: const result = selector.query('SELECT * FROM InterfaceDeclaration');
```

### "Cannot find references for primitive types"

**Expected behavior:** Primitive types like `string`, `number` don't have findable references through this method.

### "Getting references from node_modules"

**Solution:** Filter by source file location:

```typescript
const refs = allRefs.filter((ref) => !ref.getSourceFile().getFilePath().includes('node_modules'));
```

---

## Performance Tips

1. **Cache Results** - Store analysis results for frequently accessed items
2. **Limit Scope** - Query specific files/folders instead of entire project
3. **Batch Operations** - Analyze multiple items in one pass
4. **Use maxResults** - Limit results when doing exploratory queries

```typescript
const selector = new TsMorphSelector(project, { maxResults: 100 });
```

---

## Next Steps

1. **Read the basics**: [README.md](../README.md)
2. **Try examples**: Run `npm run example` through `npm run example:function-refs`
3. **Read full guides**: Check [docs/](.) folder for detailed documentation
4. **Build something**: Use these patterns in your own code analysis tools

## Contributing

Found a common pattern not covered here? [Open an issue](https://github.com/your-repo/issues) or submit a PR!
